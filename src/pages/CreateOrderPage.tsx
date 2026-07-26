import {
  CreditCard,
  LoaderCircle,
  Minus,
  PackagePlus,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmationModal } from "../components/common/Common";
import { PageHeader } from "../components/common/PageHeader";
import { paymentMethods, products, scenarioOptions } from "../data/products";
import { useEventFlow } from "../hooks/useEventFlow";
import type { MockScenario, OrderItem } from "../types";
import {
  calculateOrderTotals,
  formatCurrency,
  validateOrderForm,
  type OrderFormValues,
  type ValidationErrors,
} from "../utils";

const initialValues: OrderFormValues = {
  customerName: "",
  email: "",
  phone: "",
  line1: "",
  city: "",
  region: "",
  postalCode: "",
  country: "United Kingdom",
  items: [],
};

export function CreateOrderPage() {
  const { createOrder, addToast } = useEventFlow();
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [line2, setLine2] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [paymentId, setPaymentId] = useState(paymentMethods[0]?.id ?? "");
  const [scenario, setScenario] = useState<MockScenario>("success");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const totals = useMemo(() => calculateOrderTotals(values.items), [values.items]);
  const update = (field: keyof Omit<OrderFormValues, "items">, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const addItem = () => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setValues((current) => {
      const existing = current.items.find((item) => item.id === product.id);
      const items = existing
        ? current.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: Math.min(item.quantity + 1, item.inventory) }
              : item,
          )
        : [...current.items, { ...product, quantity: 1 }];
      return { ...current, items };
    });
    setErrors((current) => ({ ...current, items: undefined }));
  };
  const changeQuantity = (id: string, quantity: number) =>
    setValues((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.inventory)) }
          : item,
      ),
    }));
  const removeItem = (id: string) =>
    setValues((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
  const requestSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateOrderForm(values);
    setErrors(nextErrors);
    setFailure(null);
    if (Object.keys(nextErrors).length) {
      addToast("Review the highlighted fields before continuing.", "error");
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setConfirmOpen(true);
  };
  const submit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setFailure(null);
    try {
      const payment =
        paymentMethods.find((method) => method.id === paymentId) ?? paymentMethods[0]!;
      const effectiveScenario =
        payment.behavior === "decline"
          ? "declined_payment"
          : payment.behavior === "timeout"
            ? "payment_timeout_retry"
            : scenario;
      const order = await createOrder({
        customer: {
          name: values.customerName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim() || undefined,
        },
        deliveryAddress: {
          line1: values.line1.trim(),
          line2: line2.trim() || undefined,
          city: values.city.trim(),
          region: values.region.trim(),
          postalCode: values.postalCode.trim(),
          country: values.country,
        },
        items: values.items,
        paymentMethod: payment,
        scenario: effectiveScenario,
      });
      navigate(`/orders/${order.id}`, { state: { justCreated: true } });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "The order could not be submitted.";
      setFailure(message);
      addToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const field = (
    name: keyof Omit<OrderFormValues, "items">,
    label: string,
    type = "text",
    optional = false,
  ) => (
    <label className="form-field">
      <span>
        {label}
        {optional && <em>Optional</em>}
      </span>
      <input
        type={type}
        value={values[name]}
        onChange={(event) => update(name, event.target.value)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <small className="field-error" id={`${name}-error`}>
          {errors[name]}
        </small>
      )}
    </label>
  );
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Order intake"
        title="Create a new order"
        description="Submit an order and watch SNS fan it out to independent inventory, payment, and notification processors."
      />
      <form className="order-form" onSubmit={requestSubmit} noValidate>
        <div className="form-main">
          <section className="panel form-section">
            <div className="section-heading">
              <span>
                <UserRound />
              </span>
              <div>
                <h2>Customer information</h2>
                <p>Contact details used by the notification processor.</p>
              </div>
            </div>
            <div className="form-grid two">
              {field("customerName", "Customer name")}
              {field("email", "Email address", "email")}
              {field("phone", "Phone number", "tel", true)}
            </div>
          </section>
          <section className="panel form-section">
            <div className="section-heading">
              <span>
                <PackagePlus />
              </span>
              <div>
                <h2>Delivery information</h2>
                <p>The inventory and delivery destination for this order.</p>
              </div>
            </div>
            <div className="form-grid two">
              {field("line1", "Address line 1")}
              <label className="form-field">
                <span>
                  Address line 2 <em>Optional</em>
                </span>
                <input value={line2} onChange={(event) => setLine2(event.target.value)} />
              </label>
              {field("city", "City")}
              {field("region", "State or region")}
              {field("postalCode", "Postal code")}
              {field("country", "Country")}
            </div>
          </section>
          <section className="panel form-section">
            <div className="section-heading">
              <span>
                <PackagePlus />
              </span>
              <div>
                <h2>Order items</h2>
                <p>Select from the mock cloud-office product catalogue.</p>
              </div>
            </div>
            <div className="product-picker">
              <label>
                <span>Product</span>
                <select value={productId} onChange={(event) => setProductId(event.target.value)}>
                  {products.map((product) => (
                    <option value={product.id} key={product.id}>
                      {product.name} · {product.sku} · {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary" type="button" onClick={addItem}>
                <Plus size={17} /> Add item
              </button>
            </div>
            {errors.items && (
              <p className="field-error" role="alert">
                {errors.items}
              </p>
            )}
            <div className="line-items">
              {values.items.length === 0 ? (
                <div className="empty-items">
                  <PackagePlus />
                  <p>No products added yet.</p>
                </div>
              ) : (
                values.items.map((item: OrderItem) => (
                  <div className="line-item" key={item.id}>
                    <div className="product-glyph">
                      {item.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div className="item-info">
                      <strong>{item.name}</strong>
                      <span>
                        {item.sku} · {item.inventory} available
                      </span>
                    </div>
                    <span>{formatCurrency(item.price)}</span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() => changeQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus />
                      </button>
                      <input
                        aria-label={`${item.name} quantity`}
                        type="number"
                        min="1"
                        max={item.inventory}
                        value={item.quantity}
                        onChange={(event) => changeQuantity(item.id, Number(event.target.value))}
                      />
                      <button
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        onClick={() => changeQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus />
                      </button>
                    </div>
                    <strong>{formatCurrency(item.price * item.quantity)}</strong>
                    <button
                      className="remove-item"
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="panel form-section">
            <div className="section-heading">
              <span>
                <CreditCard />
              </span>
              <div>
                <h2>Payment simulation</h2>
                <p>Choose a tokenised test method. No real payment details are collected.</p>
              </div>
            </div>
            <div className="form-grid two">
              <label className="form-field">
                <span>Payment method</span>
                <select value={paymentId} onChange={(event) => setPaymentId(event.target.value)}>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Mock scenario</span>
                <select
                  value={scenario}
                  onChange={(event) => setScenario(event.target.value as MockScenario)}
                >
                  {scenarioOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="security-note">
              <ShieldCheck />
              <p>
                <strong>Safe simulation</strong>
                <span>
                  Only predefined payment tokens are used; card numbers and CVVs are never requested
                  or stored.
                </span>
              </p>
            </div>
          </section>
        </div>
        <aside className="order-summary panel">
          <h2>Order summary</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div>
              <dt>VAT (20%)</dt>
              <dd>{formatCurrency(totals.tax)}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>{totals.shipping ? formatCurrency(totals.shipping) : "Free"}</dd>
            </div>
            <div className="summary-total">
              <dt>Grand total</dt>
              <dd>{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
          <div className="summary-route">
            <span>On submission</span>
            <ol>
              <li>API accepts the order</li>
              <li>SNS publishes ORDER_CREATED</li>
              <li>Three SQS queues fan out work</li>
            </ol>
          </div>
          {failure && (
            <p className="submit-error" role="alert">
              {failure}
            </p>
          )}
          <button className="button primary submit-order" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <LoaderCircle className="spin" /> Processing…
              </>
            ) : (
              "Review order"
            )}
          </button>
          <small>Submission starts a frontend-only asynchronous simulation.</small>
        </aside>
      </form>
      <ConfirmationModal
        open={confirmOpen}
        title="Submit this order?"
        description={`EventFlow will create a ${formatCurrency(totals.total)} mock order and begin asynchronous processing.`}
        confirmLabel="Submit order"
        onConfirm={() => void submit()}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="confirmation-summary">
          <span>{values.items.length} product line(s)</span>
          <strong>{formatCurrency(totals.total)}</strong>
        </div>
      </ConfirmationModal>
    </div>
  );
}
