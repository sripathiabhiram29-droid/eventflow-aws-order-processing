import {
  BellRing,
  Check,
  Circle,
  CreditCard,
  PackageCheck,
  RadioTower,
  RotateCw,
} from "lucide-react";
import type { Order, ProcessorStatus } from "../../types";
import { statusLabel } from "../../utils";

const stepClass = (status: ProcessorStatus | "COMPLETED") =>
  status === "COMPLETED"
    ? "complete"
    : status === "FAILED"
      ? "failed"
      : status === "IN_PROGRESS" || status === "RETRYING"
        ? "active"
        : "pending";

export function OrderWorkflow({ order }: { order: Order }) {
  const published = order.events.some((event) => event.type === "ORDER_EVENT_PUBLISHED");
  const steps: {
    label: string;
    detail: string;
    status: ProcessorStatus | "COMPLETED";
    icon: typeof Check;
  }[] = [
    { label: "Order Received", detail: "API Gateway", status: "COMPLETED", icon: Check },
    {
      label: "Event Published",
      detail: "SNS topic",
      status: published ? "COMPLETED" : "PENDING",
      icon: RadioTower,
    },
    {
      label: "Inventory",
      detail: "SQS → Lambda",
      status: order.inventory.status,
      icon: PackageCheck,
    },
    { label: "Payment", detail: "SQS → Lambda", status: order.payment.status, icon: CreditCard },
    {
      label: "Notification",
      detail: "SQS → Lambda",
      status: order.notification.status,
      icon: BellRing,
    },
    {
      label: "Order Completed",
      detail: "Final state",
      status:
        order.status === "COMPLETED"
          ? "COMPLETED"
          : order.status === "FAILED" || order.status === "PARTIALLY_COMPLETED"
            ? "FAILED"
            : "PENDING",
      icon: order.status === "PROCESSING" ? RotateCw : Circle,
    },
  ];
  return (
    <div className="workflow" aria-label="Order processing workflow">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div className={`workflow-step ${stepClass(step.status)}`} key={step.label}>
            <div className="workflow-icon">
              <Icon size={18} />
              {index < steps.length - 1 && <span className="workflow-line" />}
            </div>
            <div>
              <strong>{step.label}</strong>
              <span>{step.detail}</span>
              <em>{statusLabel(step.status)}</em>
            </div>
          </div>
        );
      })}
    </div>
  );
}
