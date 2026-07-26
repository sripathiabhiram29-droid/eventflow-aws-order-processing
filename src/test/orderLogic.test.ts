import { describe, expect, it } from "vitest";
import { products } from "../data/products";
import { OrderStatus } from "../types";
import { calculateOrderTotals, deriveOverallStatus, validateOrderForm } from "../utils";

describe("order business rules", () => {
  it("calculates subtotal, VAT, shipping, and grand total", () => {
    const item = { ...products[0]!, quantity: 2 };
    expect(calculateOrderTotals([item])).toEqual({
      subtotal: 158,
      tax: 31.6,
      shipping: 12.5,
      total: 202.1,
    });
  });

  it("validates required order-entry fields", () => {
    const errors = validateOrderForm({
      customerName: "A",
      email: "invalid",
      phone: "12",
      line1: "",
      city: "",
      region: "",
      postalCode: "",
      country: "",
      items: [],
    });
    expect(errors.customerName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.items).toBeDefined();
  });

  it("derives the overall status from independent processor outcomes", () => {
    expect(deriveOverallStatus("COMPLETED", "COMPLETED", "COMPLETED")).toBe(OrderStatus.COMPLETED);
    expect(deriveOverallStatus("COMPLETED", "FAILED", "COMPLETED")).toBe(
      OrderStatus.PARTIALLY_COMPLETED,
    );
    expect(deriveOverallStatus("FAILED", "FAILED", "SKIPPED")).toBe(OrderStatus.FAILED);
  });
});
