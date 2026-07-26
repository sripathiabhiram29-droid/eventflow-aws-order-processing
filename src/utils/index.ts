import { OrderStatus, type OrderItem, type ProcessorStatus } from "../types";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const formatRelative = (value: string) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const statusLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

export const calculateOrderTotals = (items: OrderItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Number((subtotal * 0.2).toFixed(2));
  const shipping = subtotal >= 250 || subtotal === 0 ? 0 : 12.5;
  return { subtotal, tax, shipping, total: Number((subtotal + tax + shipping).toFixed(2)) };
};

export const deriveOverallStatus = (
  inventory: ProcessorStatus,
  payment: ProcessorStatus,
  notification: ProcessorStatus,
): OrderStatus => {
  const statuses = [inventory, payment, notification];
  if (statuses.every((status) => status === "COMPLETED")) return OrderStatus.COMPLETED;
  if (statuses.every((status) => status === "FAILED" || status === "SKIPPED")) {
    return OrderStatus.FAILED;
  }
  if (
    statuses.some((status) => status === "FAILED") &&
    statuses.some((status) => status === "COMPLETED")
  ) {
    return OrderStatus.PARTIALLY_COMPLETED;
  }
  return OrderStatus.PROCESSING;
};

export const classForStatus = (status: string) => {
  if (["COMPLETED", "SUCCESS", "HEALTHY", "RESOLVED", "AUTHORISED"].includes(status))
    return "success";
  if (["FAILED", "CRITICAL", "UNAVAILABLE", "DECLINED"].includes(status)) return "danger";
  if (["WARNING", "RETRYING", "DEGRADED", "PARTIALLY_COMPLETED"].includes(status)) return "warning";
  if (["PROCESSING", "IN_PROGRESS", "INFO", "RECEIVED", "OPEN"].includes(status)) return "info";
  return "neutral";
};

export interface OrderFormValues {
  customerName: string;
  email: string;
  phone: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  items: OrderItem[];
}

export type ValidationErrors = Partial<Record<keyof OrderFormValues, string>>;

export const validateOrderForm = (values: OrderFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (values.customerName.trim().length < 2)
    errors.customerName = "Enter the customer’s full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Enter a valid email address.";
  if (values.phone && !/^[+\d][\d\s()-]{7,}$/.test(values.phone))
    errors.phone = "Enter a valid phone number.";
  if (!values.line1.trim()) errors.line1 = "Enter the delivery address.";
  if (!values.city.trim()) errors.city = "Enter the city.";
  if (!values.region.trim()) errors.region = "Enter the state or region.";
  if (!values.postalCode.trim()) errors.postalCode = "Enter the postal code.";
  if (!values.country.trim()) errors.country = "Select a country.";
  if (values.items.length === 0) errors.items = "Add at least one item to the order.";
  return errors;
};
