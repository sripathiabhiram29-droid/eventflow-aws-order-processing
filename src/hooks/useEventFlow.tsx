import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, isMockMode, saveOrders } from "../services/api";
import { advanceOrder } from "../mocks/engine";
import type {
  CreateOrderInput,
  Order,
  OrderEvent,
  QueueMetric,
  SystemAlert,
  SystemMetric,
} from "../types";

interface ToastMessage {
  id: string;
  tone: "success" | "error" | "info";
  message: string;
}
interface EventFlowState {
  orders: Order[];
  events: OrderEvent[];
  metrics: SystemMetric[];
  alerts: SystemAlert[];
  queues: QueueMetric[];
  loading: boolean;
  error: string | null;
  paused: boolean;
  mockMode: boolean;
  toasts: ToastMessage[];
  refresh: () => Promise<void>;
  createOrder: (input: CreateOrderInput) => Promise<Order>;
  simulateNext: (id?: string) => void;
  cancelOrder: (id: string) => Promise<void>;
  setPaused: (paused: boolean) => void;
  addToast: (message: string, tone?: ToastMessage["tone"]) => void;
  dismissToast: (id: string) => void;
}

const EventFlowContext = createContext<EventFlowState | null>(null);

export function EventFlowProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [queues, setQueues] = useState<QueueMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<number[]>([]);

  const addToast = useCallback((message: string, tone: ToastMessage["tone"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      4200,
    );
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, metricData, alertData, queueData] = await Promise.all([
        api.getOrders(),
        api.getMetrics(),
        api.getAlerts(),
        api.getQueues(),
      ]);
      setOrders(orderData.items);
      setMetrics(metricData);
      setAlerts(alertData);
      setQueues(queueData);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "EventFlow could not load operational data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeTimers = timers.current;
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(initialLoad);
      activeTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [refresh]);

  const updateOrder = useCallback((id: string) => {
    setOrders((current) => {
      const updated = current.map((order) => (order.id === id ? advanceOrder(order) : order));
      if (isMockMode) saveOrders(updated);
      return updated;
    });
  }, []);

  const simulateNext = useCallback(
    (id?: string) => {
      const target =
        id ?? orders.find((order) => ["RECEIVED", "PROCESSING"].includes(order.status))?.id;
      if (!target) {
        addToast("No active order is waiting for another event.", "info");
        return;
      }
      updateOrder(target);
      addToast(`Generated the next mock event for ${target}.`, "success");
    },
    [addToast, orders, updateOrder],
  );

  const createOrder = useCallback(
    async (input: CreateOrderInput) => {
      const order = await api.createOrder(input);
      setOrders((current) => [order, ...current]);
      addToast(`Order ${order.id} was accepted.`, "success");
      if (import.meta.env.VITE_ENABLE_EVENT_SIMULATION !== "false") {
        timers.current.push(window.setTimeout(() => updateOrder(order.id), 900));
        timers.current.push(window.setTimeout(() => updateOrder(order.id), 2600));
      }
      return order;
    },
    [addToast, updateOrder],
  );

  const cancelOrder = useCallback(
    async (id: string) => {
      await api.cancelOrder(id);
      await refresh();
      addToast(`Order ${id} was cancelled.`, "success");
    },
    [addToast, refresh],
  );

  const events = useMemo(
    () =>
      orders
        .flatMap((order) => order.events ?? [])
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [orders],
  );
  const value = useMemo<EventFlowState>(
    () => ({
      orders,
      events,
      metrics,
      alerts,
      queues,
      loading,
      error,
      paused,
      mockMode: isMockMode,
      toasts,
      refresh,
      createOrder,
      simulateNext,
      cancelOrder,
      setPaused,
      addToast,
      dismissToast: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    }),
    [
      orders,
      events,
      metrics,
      alerts,
      queues,
      loading,
      error,
      paused,
      toasts,
      refresh,
      createOrder,
      simulateNext,
      cancelOrder,
      addToast,
    ],
  );

  return <EventFlowContext.Provider value={value}>{children}</EventFlowContext.Provider>;
}

export function useEventFlow() {
  const context = useContext(EventFlowContext);
  if (!context) throw new Error("useEventFlow must be used inside EventFlowProvider");
  return context;
}
