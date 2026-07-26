import { describe, expect, it } from "vitest";
import { paymentMethods, products } from "../data/products";
import { advanceOrder, createSeedOrders, makeOrder } from "../mocks/engine";
import type { MockScenario } from "../types";

const input = (scenario: MockScenario) => ({
  customer: { name: "Test Customer", email: "test@example.com" },
  deliveryAddress: {
    line1: "1 Test Street",
    city: "London",
    region: "England",
    postalCode: "EC1A 1BB",
    country: "United Kingdom",
  },
  items: [{ ...products[0]!, quantity: 1 }],
  paymentMethod: paymentMethods[0]!,
  scenario,
});

describe("mock processing engine", () => {
  it("completes every processor in the success scenario", () => {
    const completed = advanceOrder(advanceOrder(makeOrder(input("success"))));
    expect(completed.status).toBe("COMPLETED");
    expect(completed.inventory.status).toBe("COMPLETED");
    expect(completed.events.some((event) => event.type === "ORDER_COMPLETED")).toBe(true);
  });

  it("records a failed payment in the decline scenario", () => {
    const failed = advanceOrder(advanceOrder(makeOrder(input("declined_payment"))));
    expect(failed.payment.status).toBe("FAILED");
    expect(failed.status).toBe("PARTIALLY_COMPLETED");
    expect(failed.events.some((event) => event.type === "PAYMENT_DECLINED")).toBe(true);
  });

  it("keeps every seeded event attached to its owning order", () => {
    expect(
      createSeedOrders().every((order) =>
        order.events.every((event) => event.orderId === order.id),
      ),
    ).toBe(true);
  });
});
