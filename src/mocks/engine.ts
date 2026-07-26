import { paymentMethods, products } from "../data/products";
import {
  OrderStatus,
  type CreateOrderInput,
  type EventOutcome,
  type EventService,
  type MockScenario,
  type Order,
  type OrderEvent,
  type ProcessorStatus,
} from "../types";
import { calculateOrderTotals, deriveOverallStatus } from "../utils";

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createEvent = (
  orderId: string,
  correlationId: string,
  type: string,
  service: EventService,
  outcome: EventOutcome,
  message: string,
  attempt = 1,
  errorCode?: string,
): OrderEvent => ({
  id: newId("evt"),
  type,
  service,
  orderId,
  correlationId,
  timestamp: new Date().toISOString(),
  attempt,
  outcome,
  message,
  errorCode,
  payload: {
    orderId,
    correlationId,
    type,
    service,
    outcome,
    attempt,
    emittedAt: new Date().toISOString(),
  },
});

export const makeOrder = (input: CreateOrderInput): Order => {
  const id = `EF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const totals = calculateOrderTotals(input.items);
  const correlationId = newId("corr");
  return {
    id,
    ...input,
    ...totals,
    status: OrderStatus.RECEIVED,
    createdAt: now,
    updatedAt: now,
    inventory: { status: "PENDING", attemptCount: 0, reservedItems: [], rejectedItems: [] },
    payment: { status: "PENDING", attemptCount: 0, paymentMethod: input.paymentMethod.label },
    notification: {
      status: "PENDING",
      attemptCount: 0,
      channel: "EMAIL",
      destination: input.customer.email,
    },
    events: [
      createEvent(
        id,
        correlationId,
        "ORDER_CREATED",
        "Order API",
        "SUCCESS",
        "Order accepted by API Gateway",
      ),
    ],
  };
};

interface ScenarioResult {
  inventory: ProcessorStatus;
  payment: ProcessorStatus;
  notification: ProcessorStatus;
  retries?: "payment" | "notification";
  dlq?: boolean;
}

export const scenarioResult = (scenario: MockScenario): ScenarioResult => {
  switch (scenario) {
    case "insufficient_inventory":
      return { inventory: "FAILED", payment: "SKIPPED", notification: "COMPLETED" };
    case "declined_payment":
      return { inventory: "COMPLETED", payment: "FAILED", notification: "COMPLETED" };
    case "payment_timeout_retry":
      return {
        inventory: "COMPLETED",
        payment: "COMPLETED",
        notification: "COMPLETED",
        retries: "payment",
      };
    case "notification_retry":
      return {
        inventory: "COMPLETED",
        payment: "COMPLETED",
        notification: "COMPLETED",
        retries: "notification",
      };
    case "inventory_failure":
      return { inventory: "FAILED", payment: "COMPLETED", notification: "COMPLETED" };
    case "dlq":
      return { inventory: "FAILED", payment: "COMPLETED", notification: "COMPLETED", dlq: true };
    case "partial_failure":
      return { inventory: "COMPLETED", payment: "FAILED", notification: "FAILED" };
    default:
      return { inventory: "COMPLETED", payment: "COMPLETED", notification: "COMPLETED" };
  }
};

const processorEvent = (
  order: Order,
  processor: "inventory" | "payment" | "notification",
  status: ProcessorStatus,
  attempt: number,
) => {
  const correlationId = order.events[0]?.correlationId ?? newId("corr");
  const upper = processor.toUpperCase();
  const service = `${processor.charAt(0).toUpperCase()}${processor.slice(1)}` as EventService;
  if (status === "COMPLETED") {
    const type =
      processor === "inventory"
        ? "INVENTORY_RESERVED"
        : processor === "payment"
          ? "PAYMENT_AUTHORISED"
          : "NOTIFICATION_SENT";
    return createEvent(
      order.id,
      correlationId,
      type,
      service,
      "SUCCESS",
      `${service} processor completed successfully`,
      attempt,
    );
  }
  const type =
    processor === "inventory"
      ? "INVENTORY_REJECTED"
      : processor === "payment"
        ? "PAYMENT_DECLINED"
        : "NOTIFICATION_DELIVERY_FAILED";
  return createEvent(
    order.id,
    correlationId,
    type,
    service,
    "FAILED",
    `${service} processor reported a failure`,
    attempt,
    `${upper}_PROCESSING_ERROR`,
  );
};

export const advanceOrder = (order: Order): Order => {
  if (
    [
      OrderStatus.COMPLETED,
      OrderStatus.FAILED,
      OrderStatus.CANCELLED,
      OrderStatus.PARTIALLY_COMPLETED,
    ].includes(order.status)
  )
    return order;
  const correlationId = order.events[0]?.correlationId ?? newId("corr");
  const result = scenarioResult(order.scenario);
  const next = structuredClone(order);
  const hasPublished = next.events.some((event) => event.type === "ORDER_EVENT_PUBLISHED");
  if (!hasPublished) {
    next.status = OrderStatus.PROCESSING;
    next.events.push(
      createEvent(
        order.id,
        correlationId,
        "ORDER_STORED",
        "Order Store",
        "SUCCESS",
        "Order persisted to DynamoDB",
      ),
      createEvent(
        order.id,
        correlationId,
        "ORDER_EVENT_PUBLISHED",
        "SNS",
        "SUCCESS",
        "ORDER_CREATED published to the SNS topic",
      ),
    );
    next.inventory.status = "IN_PROGRESS";
    next.payment.status = "IN_PROGRESS";
    next.notification.status = "IN_PROGRESS";
  } else {
    if (result.retries) {
      next.events.push(
        createEvent(
          order.id,
          correlationId,
          "PROCESSOR_RETRY_SCHEDULED",
          result.retries === "payment" ? "Payment" : "Notification",
          "RETRYING",
          "Transient failure recovered on the second attempt",
          2,
        ),
      );
    }
    next.inventory = {
      status: result.inventory,
      attemptCount: 1,
      reservationId: result.inventory === "COMPLETED" ? newId("res") : undefined,
      reservedItems: result.inventory === "COMPLETED" ? next.items.map((item) => item.sku) : [],
      rejectedItems: result.inventory === "FAILED" ? [next.items[0]?.sku ?? "UNKNOWN"] : [],
      processingDurationMs: 186,
      errorMessage:
        result.inventory === "FAILED" ? "Inventory reservation could not be completed." : undefined,
    };
    next.payment = {
      status: result.payment,
      attemptCount: result.retries === "payment" ? 2 : result.payment === "SKIPPED" ? 0 : 1,
      paymentMethod: next.paymentMethod.label,
      transactionId: result.payment === "COMPLETED" ? newId("txn") : undefined,
      authorisedAmount: result.payment === "COMPLETED" ? next.total : undefined,
      processingDurationMs: result.retries === "payment" ? 1320 : 242,
      errorMessage: result.payment === "FAILED" ? "The simulated payment was declined." : undefined,
    };
    next.notification = {
      status: result.notification,
      attemptCount: result.retries === "notification" ? 2 : 1,
      channel: "EMAIL",
      destination: next.customer.email,
      messageId: result.notification === "COMPLETED" ? newId("msg") : undefined,
      processingDurationMs: result.retries === "notification" ? 982 : 148,
      errorMessage:
        result.notification === "FAILED"
          ? "Notification provider did not accept the message."
          : undefined,
    };
    next.events.push(
      processorEvent(next, "inventory", result.inventory, 1),
      ...(result.payment === "SKIPPED"
        ? []
        : [processorEvent(next, "payment", result.payment, result.retries === "payment" ? 2 : 1)]),
      processorEvent(
        next,
        "notification",
        result.notification,
        result.retries === "notification" ? 2 : 1,
      ),
    );
    if (result.dlq)
      next.events.push(
        createEvent(
          order.id,
          correlationId,
          "MESSAGE_SENT_TO_DLQ",
          "DLQ",
          "FAILED",
          "Inventory message exhausted its retry policy",
          3,
          "MAX_RECEIVE_COUNT",
        ),
      );
    next.status = deriveOverallStatus(result.inventory, result.payment, result.notification);
    const finalType = next.status === OrderStatus.COMPLETED ? "ORDER_COMPLETED" : "ORDER_FAILED";
    next.events.push(
      createEvent(
        order.id,
        correlationId,
        finalType,
        "Order API",
        next.status === OrderStatus.COMPLETED ? "SUCCESS" : "FAILED",
        `Order reached ${next.status.toLowerCase().replaceAll("_", " ")}`,
      ),
    );
  }
  next.updatedAt = new Date().toISOString();
  return next;
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const createSeedOrders = (): Order[] => {
  const statuses = [
    OrderStatus.COMPLETED,
    OrderStatus.PROCESSING,
    OrderStatus.COMPLETED,
    OrderStatus.FAILED,
    OrderStatus.COMPLETED,
    OrderStatus.PARTIALLY_COMPLETED,
    OrderStatus.RECEIVED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.COMPLETED,
    OrderStatus.PROCESSING,
    OrderStatus.FAILED,
  ];
  const scenarios: MockScenario[] = [
    "success",
    "success",
    "notification_retry",
    "declined_payment",
    "success",
    "partial_failure",
    "success",
    "payment_timeout_retry",
    "success",
    "success",
    "success",
    "dlq",
  ];
  const names = [
    "Olivia Bennett",
    "Noah Williams",
    "Amelia Hughes",
    "Leo Carter",
    "Isla Morgan",
    "Henry Wilson",
    "Maya Patel",
    "Oscar Reed",
    "Ava Thompson",
    "George Clarke",
    "Sophie Turner",
    "Arthur Evans",
  ];
  return names.map((name, index) => {
    const product = products[index % products.length] ?? products[0]!;
    const item = { ...product, quantity: (index % 3) + 1 };
    const base = makeOrder({
      customer: {
        name,
        email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
        phone: "+44 7700 900123",
      },
      deliveryAddress: {
        line1: `${18 + index} Market Street`,
        city: index % 2 ? "Manchester" : "London",
        region: "England",
        postalCode: index % 2 ? "M1 1AE" : "EC2A 4BX",
        country: "United Kingdom",
      },
      items: [item],
      paymentMethod: paymentMethods[index % 2]!,
      scenario: scenarios[index]!,
    });
    base.id = `EF-26${String(9140 + index).padStart(4, "0")}`;
    base.createdAt = ago(12 + index * 47);
    base.updatedAt = ago(8 + index * 43);
    if (statuses[index] === OrderStatus.RECEIVED) {
      base.events = base.events.map((event) => ({ ...event, orderId: base.id }));
      return base;
    }
    let processed = advanceOrder(base);
    if (statuses[index] !== OrderStatus.PROCESSING) processed = advanceOrder(processed);
    processed.status = statuses[index]!;
    if (processed.status === OrderStatus.CANCELLED) {
      processed.inventory.status = "SKIPPED";
      processed.payment.status = "SKIPPED";
      processed.notification.status = "SKIPPED";
      processed.events.push(
        createEvent(
          processed.id,
          processed.events[0]?.correlationId ?? newId("corr"),
          "ORDER_CANCELLED",
          "Order API",
          "INFO",
          "Order cancelled before processing",
        ),
      );
    }
    processed.createdAt = base.createdAt;
    processed.updatedAt = base.updatedAt;
    processed.events = processed.events.map((event, eventIndex) => ({
      ...event,
      orderId: processed.id,
      timestamp: new Date(new Date(base.createdAt).getTime() + eventIndex * 22_000).toISOString(),
    }));
    return processed;
  });
};
