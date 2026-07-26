export enum OrderStatus {
  RECEIVED = "RECEIVED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED",
}

export type ProcessorStatus =
  "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "SKIPPED" | "RETRYING";
export type EventOutcome = "SUCCESS" | "FAILED" | "RETRYING" | "INFO";
export type EventService =
  "Order API" | "Order Store" | "SNS" | "Inventory" | "Payment" | "Notification" | "DLQ";
export type MockScenario =
  | "success"
  | "insufficient_inventory"
  | "declined_payment"
  | "payment_timeout_retry"
  | "notification_retry"
  | "inventory_failure"
  | "dlq"
  | "partial_failure";

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  inventory: number;
  category: string;
}

export interface OrderItem extends Product {
  quantity: number;
}

export interface Customer {
  name: string;
  email: string;
  phone?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  label: string;
  last4: string;
  behavior: "success" | "decline" | "timeout";
}

export interface ProcessorResult {
  status: ProcessorStatus;
  processingDurationMs?: number;
  attemptCount: number;
  errorMessage?: string;
}

export interface InventoryResult extends ProcessorResult {
  reservationId?: string;
  reservedItems: string[];
  rejectedItems: string[];
}

export interface PaymentResult extends ProcessorResult {
  transactionId?: string;
  authorisedAmount?: number;
  paymentMethod: string;
}

export interface NotificationResult extends ProcessorResult {
  channel: "EMAIL" | "SMS";
  destination: string;
  messageId?: string;
}

export interface OrderEvent {
  id: string;
  type: string;
  service: EventService;
  orderId: string;
  correlationId: string;
  timestamp: string;
  attempt: number;
  outcome: EventOutcome;
  message: string;
  errorCode?: string;
  payload: Record<string, unknown>;
}

export interface Order {
  id: string;
  customer: Customer;
  deliveryAddress: Address;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  inventory: InventoryResult;
  payment: PaymentResult;
  notification: NotificationResult;
  scenario: MockScenario;
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
}

export interface CreateOrderInput {
  customer: Customer;
  deliveryAddress: Address;
  items: OrderItem[];
  paymentMethod: PaymentMethod;
  scenario: MockScenario;
}

export interface QueueMetric {
  name: string;
  available: number;
  inFlight: number;
  oldestMessageAgeSeconds: number;
  dlqMessages: number;
  consumerStatus: "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
}

export interface SystemMetric {
  timestamp: string;
  requests: number;
  errorRate: number;
  duration: number;
  lambdaErrors: number;
  throttles: number;
  queueDepth: number;
  capacity: number;
}

export interface SystemAlert {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  resource: string;
  alert: string;
  triggeredAt: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "API_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
  }
}
