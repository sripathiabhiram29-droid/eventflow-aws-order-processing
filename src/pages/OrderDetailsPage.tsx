import { Ban, RefreshCw, RotateCw, Truck, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ConfirmationModal,
  EmptyState,
  LoadingSkeleton,
  StatusBadge,
} from "../components/common/Common";
import { EventTimeline } from "../components/events/EventTimeline";
import { OrderWorkflow } from "../components/orders/OrderWorkflow";
import { ProcessorStatusCard } from "../components/orders/ProcessorStatusCard";
import { useEventFlow } from "../hooks/useEventFlow";
import { formatCurrency, formatDateTime } from "../utils";

export function OrderDetailsPage() {
  const { orderId } = useParams();
  const { orders, loading, mockMode, refresh, simulateNext, cancelOrder } = useEventFlow();
  const [cancelOpen, setCancelOpen] = useState(false);
  const order = orders.find((item) => item.id === orderId);
  if (loading) return <LoadingSkeleton rows={8} />;
  if (!order)
    return (
      <EmptyState
        title="Order not found"
        description="The order may have been removed or the link is incorrect."
      />
    );
  const eligible = ["RECEIVED", "PROCESSING"].includes(order.status);
  return (
    <div className="page-stack">
      <div className="details-header">
        <div>
          <Link to="/orders" className="back-link">
            ← Back to orders
          </Link>
          <div className="order-title-row">
            <h1>{order.id}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p>
            Created {formatDateTime(order.createdAt)} · Last updated{" "}
            {formatDateTime(order.updatedAt)}
          </p>
        </div>
        <div className="page-actions">
          <button className="button secondary" onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh status
          </button>
          {mockMode && (
            <button className="button primary" onClick={() => simulateNext(order.id)}>
              <RotateCw size={16} /> Simulate next event
            </button>
          )}
          {eligible && (
            <button className="button danger-outline" onClick={() => setCancelOpen(true)}>
              <Ban size={16} /> Cancel order
            </button>
          )}
        </div>
      </div>
      <section className="panel workflow-panel">
        <div className="panel-head">
          <div>
            <h2>Event-driven workflow</h2>
            <p>
              Independent consumers update their own result while the overall order remains
              eventually consistent.
            </p>
          </div>
          <span className="soft-label">
            Correlation: {order.events[0]?.correlationId.slice(-12)}
          </span>
        </div>
        <OrderWorkflow order={order} />
      </section>
      <section className="processor-card-grid">
        <ProcessorStatusCard type="inventory" result={order.inventory} />
        <ProcessorStatusCard type="payment" result={order.payment} />
        <ProcessorStatusCard type="notification" result={order.notification} />
      </section>
      <section className="details-grid">
        <div className="details-main">
          <article className="panel info-panel">
            <div className="panel-head">
              <div>
                <h2>Customer & delivery</h2>
                <p>Information captured by the order API</p>
              </div>
            </div>
            <div className="info-columns">
              <div>
                <span className="info-icon">
                  <UserRound />
                </span>
                <dl>
                  <dt>Customer</dt>
                  <dd>{order.customer.name}</dd>
                  <dt>Email</dt>
                  <dd>{order.customer.email}</dd>
                  <dt>Phone</dt>
                  <dd>{order.customer.phone ?? "Not provided"}</dd>
                </dl>
              </div>
              <div>
                <span className="info-icon">
                  <Truck />
                </span>
                <address>
                  {order.deliveryAddress.line1}
                  <br />
                  {order.deliveryAddress.line2 && (
                    <>
                      {order.deliveryAddress.line2}
                      <br />
                    </>
                  )}
                  {order.deliveryAddress.city}, {order.deliveryAddress.region}
                  <br />
                  {order.deliveryAddress.postalCode}
                  <br />
                  {order.deliveryAddress.country}
                </address>
              </div>
            </div>
          </article>
          <article className="panel table-panel">
            <div className="panel-head">
              <div>
                <h2>Ordered products</h2>
                <p>{order.items.length} product line(s)</p>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Unit price</th>
                    <th>Quantity</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        <code>{item.sku}</code>
                      </td>
                      <td>{formatCurrency(item.price)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>
        <aside className="panel financial-card">
          <h2>Financial summary</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(order.subtotal)}</dd>
            </div>
            <div>
              <dt>VAT</dt>
              <dd>{formatCurrency(order.tax)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{order.shipping ? formatCurrency(order.shipping) : "Free"}</dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>{order.paymentMethod.label}</dd>
            </div>
            <div className="summary-total">
              <dt>Order total</dt>
              <dd>{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </aside>
      </section>
      <section className="panel timeline-panel">
        <div className="panel-head">
          <div>
            <h2>Event timeline</h2>
            <p>{order.events.length} immutable processing records, newest last</p>
          </div>
        </div>
        <EventTimeline events={order.events} />
      </section>
      <ConfirmationModal
        open={cancelOpen}
        title="Cancel this order?"
        description="Cancellation stops future mock processing. Events already emitted remain in the timeline for auditability."
        confirmLabel="Cancel order"
        danger
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          setCancelOpen(false);
          void cancelOrder(order.id);
        }}
      />
    </div>
  );
}
