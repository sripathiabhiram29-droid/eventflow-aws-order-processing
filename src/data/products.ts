import type { PaymentMethod, Product } from "../types";

export const products: Product[] = [
  {
    id: "prod-keyboard",
    sku: "EF-KB-101",
    name: "Wireless Keyboard",
    price: 79,
    inventory: 42,
    category: "Peripherals",
  },
  {
    id: "prod-dock",
    sku: "EF-DOCK-204",
    name: "USB-C Dock",
    price: 149,
    inventory: 18,
    category: "Connectivity",
  },
  {
    id: "prod-headphones",
    sku: "EF-AUD-310",
    name: "Noise-Cancelling Headphones",
    price: 229,
    inventory: 27,
    category: "Audio",
  },
  {
    id: "prod-webcam",
    sku: "EF-CAM-420",
    name: "4K Webcam",
    price: 119,
    inventory: 31,
    category: "Video",
  },
  {
    id: "prod-ssd",
    sku: "EF-SSD-512",
    name: "Portable SSD",
    price: 139,
    inventory: 55,
    category: "Storage",
  },
  {
    id: "prod-mouse",
    sku: "EF-MSE-610",
    name: "Ergonomic Mouse",
    price: 69,
    inventory: 64,
    category: "Peripherals",
  },
  {
    id: "prod-stand",
    sku: "EF-STN-720",
    name: "Laptop Stand",
    price: 89,
    inventory: 23,
    category: "Workspace",
  },
  {
    id: "prod-mechanical",
    sku: "EF-MKB-880",
    name: "Mechanical Keyboard",
    price: 169,
    inventory: 14,
    category: "Peripherals",
  },
];

export const paymentMethods: PaymentMethod[] = [
  { id: "visa-4242", brand: "Visa", label: "Visa ending 4242", last4: "4242", behavior: "success" },
  {
    id: "mastercard-4444",
    brand: "Mastercard",
    label: "Mastercard ending 4444",
    last4: "4444",
    behavior: "success",
  },
  {
    id: "declined",
    brand: "Visa",
    label: "Simulated declined card",
    last4: "0002",
    behavior: "decline",
  },
  {
    id: "timeout",
    brand: "Mastercard",
    label: "Simulated timeout card",
    last4: "9995",
    behavior: "timeout",
  },
];

export const scenarioOptions = [
  ["success", "Successful order"],
  ["insufficient_inventory", "Insufficient inventory"],
  ["declined_payment", "Declined payment"],
  ["payment_timeout_retry", "Payment timeout, then retry"],
  ["notification_retry", "Notification failure, then retry"],
  ["inventory_failure", "Inventory processor failure"],
  ["dlq", "Message sent to DLQ"],
  ["partial_failure", "Partial processing failure"],
] as const;
