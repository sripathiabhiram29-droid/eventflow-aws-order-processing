import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventTimeline } from "../components/events/EventTimeline";
import { OrderWorkflow } from "../components/orders/OrderWorkflow";
import { paymentMethods, products } from "../data/products";
import { advanceOrder, makeOrder } from "../mocks/engine";

const order = advanceOrder(
  makeOrder({
    customer: { name: "Ada Lovelace", email: "ada@example.com" },
    deliveryAddress: {
      line1: "10 Engine Way",
      city: "London",
      region: "England",
      postalCode: "N1 1AA",
      country: "United Kingdom",
    },
    items: [{ ...products[1]!, quantity: 1 }],
    paymentMethod: paymentMethods[0]!,
    scenario: "success",
  }),
);

describe("event-driven order components", () => {
  it("renders the complete order workflow", () => {
    render(<OrderWorkflow order={order} />);
    expect(screen.getByText("Order Received")).toBeInTheDocument();
    expect(screen.getByText("Event Published")).toBeInTheDocument();
    expect(screen.getByText("Order Completed")).toBeInTheDocument();
  });

  it("renders event timeline entries", () => {
    render(<EventTimeline events={order.events} />);
    expect(screen.getByText("ORDER_CREATED")).toBeInTheDocument();
    expect(screen.getByText("ORDER_EVENT_PUBLISHED")).toBeInTheDocument();
  });
});
