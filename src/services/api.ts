import { createEvent, createSeedOrders, makeOrder } from "../mocks/engine";
import { OrderStatus } from "../types";
import type {
  CreateOrderInput,
  Order,
  OrderEvent,
  PaginatedResponse,
  QueueMetric,
  SystemAlert,
  SystemMetric,
} from "../types";
import { ApiError } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
export const isMockMode = import.meta.env.VITE_USE_MOCK_API !== "false" || !API_BASE_URL;
const STORAGE_KEY = "eventflow.orders.v2";

type AwsOrder = {
  orderId: string;
  customer?: Order["customer"];
  address?: Partial<Order["deliveryAddress"]>;
  deliveryAddress?: Partial<Order["deliveryAddress"]>;
  items?: Array<{
    id?: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice?: number;
    price?: number;
    lineTotal?: number;
    inventory?: number;
    category?: string;
  }>;
  paymentMethod?: Partial<Order["paymentMethod"]>;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  total?: number;
  status?: Order["status"];
  inventoryStatus?: string;
  paymentStatus?: string;
  notificationStatus?: string;
  scenario?: Order["scenario"];
  createdAt?: string;
  updatedAt?: string;
  events?: Order["events"];
};

const processorStatus = (
  status: string | undefined,
  completedValues: string[],
): Order["inventory"]["status"] => {
  if (!status || status === "PENDING") return "PENDING";
  if (status === "FAILED") return "FAILED";
  if (status === "IN_PROGRESS" || status === "PROCESSING") return "IN_PROGRESS";
  if (status === "SKIPPED") return "SKIPPED";
  if (status === "RETRYING") return "RETRYING";
  if (completedValues.includes(status)) return "COMPLETED";
  return "PENDING";
};

const normalizeOrder = (raw: AwsOrder): Order => {
  const address = raw.deliveryAddress ?? raw.address ?? {};

  return {
    id: raw.orderId,
    customer: raw.customer ?? {
      name: "Unknown customer",
      email: "unknown@example.com",
    },
    deliveryAddress: {
      line1: address.line1 ?? "",
      line2: address.line2,
      city: address.city ?? "",
region: address.region ?? "",
      postalCode: address.postalCode ?? "",
      country: address.country ?? "",
    },
    items: (raw.items ?? []).map((item) => ({
      id: item.id ?? item.sku,
      sku: item.sku,
      name: item.name,
      price: item.price ?? item.unitPrice ?? 0,
      inventory: item.inventory ?? 0,
      category: item.category ?? "Order item",
      quantity: item.quantity,
    })),
    paymentMethod: {
      id: raw.paymentMethod?.id ?? "unknown",
      brand: raw.paymentMethod?.brand ?? "Unknown",
      label: raw.paymentMethod?.label ?? "Payment method",
      last4: raw.paymentMethod?.last4 ?? "0000",
      behavior: raw.paymentMethod?.behavior ?? "success",
    },
    subtotal: raw.subtotal ?? 0,
    tax: raw.tax ?? 0,
    shipping: raw.shipping ?? 0,
    total: raw.total ?? 0,
    status: raw.status ?? OrderStatus.PROCESSING,
    inventory: {
      status: processorStatus(raw.inventoryStatus, ["RESERVED", "SUCCESS", "COMPLETED"]),
      attemptCount: 1,
      reservedItems:
        raw.inventoryStatus === "RESERVED"
          ? (raw.items ?? []).map((item) => item.sku)
          : [],
      rejectedItems: [],
    },
    payment: {
      status: processorStatus(raw.paymentStatus, ["SUCCESS", "COMPLETED"]),
      attemptCount: 1,
      authorisedAmount: raw.paymentStatus === "SUCCESS" ? raw.total : undefined,
      paymentMethod: raw.paymentMethod?.label ?? "Payment method",
    },
    notification: {
      status: processorStatus(raw.notificationStatus, ["SENT", "SUCCESS", "COMPLETED"]),
      attemptCount: 1,
      channel: "EMAIL",
      destination: raw.customer?.email ?? "",
    },
    scenario: raw.scenario ?? "success",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    events: raw.events ?? [],
  };
};

const readOrders = (): Order[] => {
  if (typeof localStorage === "undefined") return createSeedOrders();
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const seeded = createSeedOrders();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(stored) as Order[];
  } catch {
    return createSeedOrders();
  }
};

export const saveOrders = (orders: Order[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

const request = async <T>(
  path: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    signal,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      /* Response did not include JSON. */
    }
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
};

export const api = {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    if (!isMockMode) {
      const payload = {
        ...input,
        items: input.items.map((item) => ({
          ...item,
          unitPrice: item.price,
        })),
      };

      const response = await request<AwsOrder | { order: AwsOrder }>(
        "/orders",
        { method: "POST", body: JSON.stringify(payload) },
      );
      return normalizeOrder("order" in response ? response.order : response);
    }
    const order = makeOrder(input);
    saveOrders([order, ...readOrders()]);
    return order;
  },
  async getOrders(signal?: AbortSignal): Promise<PaginatedResponse<Order>> {
    if (!isMockMode) {
      const response = await request<
        PaginatedResponse<Order> | { orders: AwsOrder[]; count: number }
      >("/orders", {}, signal);

      if ("orders" in response) {
        return {
          items: response.orders.map(normalizeOrder),
          page: 1,
          pageSize: response.orders.length,
          total: response.count,
        };
      }

      return response;
    }

    const items = readOrders();
    return { items, page: 1, pageSize: items.length, total: items.length };
  },
  async getOrderById(id: string, signal?: AbortSignal): Promise<Order> {
    if (!isMockMode) {
      const response = await request<AwsOrder | { order: AwsOrder }>(
        `/orders/${id}`,
        {},
        signal,
      );
      return normalizeOrder("order" in response ? response.order : response);
    }

    const order = readOrders().find((item) => item.id === id);
    if (!order) throw new ApiError("Order not found.", 404, "ORDER_NOT_FOUND");
    return order;
  },
  async getOrderEvents(id: string, signal?: AbortSignal): Promise<OrderEvent[]> {
    if (!isMockMode) return request<OrderEvent[]>(`/orders/${id}/events`, {}, signal);
    return (await this.getOrderById(id, signal)).events;
  },
  async cancelOrder(id: string): Promise<Order> {
    if (!isMockMode) return request<Order>(`/orders/${id}/cancel`, { method: "POST" });
    const orders = readOrders();
    const order = orders.find((item) => item.id === id);
    if (!order) throw new ApiError("Order not found.", 404);
    order.status = "CANCELLED" as Order["status"];
    order.inventory.status = "SKIPPED";
    order.payment.status = "SKIPPED";
    order.notification.status = "SKIPPED";
    order.updatedAt = new Date().toISOString();
    order.events.push(
      createEvent(
        order.id,
        order.events[0]?.correlationId ?? `corr-${crypto.randomUUID()}`,
        "ORDER_CANCELLED",
        "Order API",
        "INFO",
        "Order cancelled before all processors completed",
      ),
    );
    saveOrders(orders);
    return order;
  },
  async retryProcessor(id: string): Promise<Order> {
    if (!isMockMode) return request<Order>(`/orders/${id}/retry`, { method: "POST" });
    return this.getOrderById(id);
  },
  async getSystemHealth(): Promise<{ status: "HEALTHY" | "DEGRADED"; uptime: number }> {
    return isMockMode ? { status: "HEALTHY", uptime: 99.98 } : request("/health");
  },
  async getMetrics(): Promise<SystemMetric[]> {
    return Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 3600_000).toISOString(),
      requests: 80 + ((i * 17) % 58),
      errorRate: Number((0.2 + ((i * 7) % 9) / 10).toFixed(1)),
      duration: 110 + ((i * 29) % 80),
      lambdaErrors: i % 5 === 0 ? 2 : 0,
      throttles: i === 7 ? 1 : 0,
      queueDepth: 3 + ((i * 11) % 24),
      capacity: 38 + ((i * 13) % 32),
    }));
  },
  async getAlerts(): Promise<SystemAlert[]> {
    return [
          {
            id: "alert-1",
            severity: "WARNING",
            resource: "payment-queue",
            alert: "Queue depth exceeded 20 messages",
            triggeredAt: new Date(Date.now() - 16 * 60_000).toISOString(),
            status: "OPEN",
          },
          {
            id: "alert-2",
            severity: "CRITICAL",
            resource: "payment-processor",
            alert: "Payment authorization failed",
            triggeredAt: new Date(Date.now() - 42 * 60_000).toISOString(),
            status: "ACKNOWLEDGED",
          },
          {
            id: "alert-3",
            severity: "WARNING",
            resource: "inventory-processor",
            alert: "Inventory reservation rejected",
            triggeredAt: new Date(Date.now() - 68 * 60_000).toISOString(),
            status: "RESOLVED",
          },
          {
            id: "alert-4",
            severity: "CRITICAL",
            resource: "inventory-dlq",
            alert: "Message moved to dead-letter queue",
            triggeredAt: new Date(Date.now() - 95 * 60_000).toISOString(),
            status: "OPEN",
          },
        ];
  },
  async getQueues(): Promise<QueueMetric[]> {
    return [
      {
        name: "Inventory queue",
        available: 4,
        inFlight: 2,
        oldestMessageAgeSeconds: 11,
        dlqMessages: 1,
        consumerStatus: "HEALTHY",
      },
      {
        name: "Payment queue",
        available: 21,
        inFlight: 5,
        oldestMessageAgeSeconds: 47,
        dlqMessages: 2,
        consumerStatus: "DEGRADED",
      },
      {
        name: "Notification queue",
        available: 3,
        inFlight: 1,
        oldestMessageAgeSeconds: 8,
        dlqMessages: 0,
        consumerStatus: "HEALTHY",
      },
      {
        name: "Inventory DLQ",
        available: 1,
        inFlight: 0,
        oldestMessageAgeSeconds: 242,
        dlqMessages: 1,
        consumerStatus: "DEGRADED",
      },
      {
        name: "Payment DLQ",
        available: 2,
        inFlight: 0,
        oldestMessageAgeSeconds: 518,
        dlqMessages: 2,
        consumerStatus: "DEGRADED",
      },
      {
        name: "Notification DLQ",
        available: 0,
        inFlight: 0,
        oldestMessageAgeSeconds: 0,
        dlqMessages: 0,
        consumerStatus: "HEALTHY",
      },
    ];
  },
};
