import { ChevronLeft, ChevronRight, FilterX, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from "../components/common/Common";
import { PageHeader } from "../components/common/PageHeader";
import { useEventFlow } from "../hooks/useEventFlow";
import { formatCurrency, formatDateTime, statusLabel } from "../utils";

type SortKey = "createdAt" | "total" | "customer";
const overallStatuses = [
  "ALL",
  "RECEIVED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "PARTIALLY_COMPLETED",
];
const processorStatuses = [
  "ALL",
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
  "RETRYING",
];

export function OrdersPage() {
  const { orders, loading, error, refresh } = useEventFlow();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [inventory, setInventory] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [notification, setNotification] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [descending, setDescending] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 7;
  const filtered = useMemo(
    () =>
      orders
        .filter((order) => {
          const query = search.toLowerCase();
          const matchesSearch =
            !query ||
            [order.id, order.customer.name, order.customer.email].some((value) =>
              value.toLowerCase().includes(query),
            );
          return (
            matchesSearch &&
            (status === "ALL" || order.status === status) &&
            (inventory === "ALL" || order.inventory.status === inventory) &&
            (payment === "ALL" || order.payment.status === payment) &&
            (notification === "ALL" || order.notification.status === notification) &&
            (!dateFrom || order.createdAt >= new Date(dateFrom).toISOString()) &&
            (!dateTo || order.createdAt <= new Date(`${dateTo}T23:59:59`).toISOString()) &&
            (!min || order.total >= Number(min)) &&
            (!max || order.total <= Number(max))
          );
        })
        .sort((a, b) => {
          const av = sort === "customer" ? a.customer.name : a[sort];
          const bv = sort === "customer" ? b.customer.name : b[sort];
          return (
            (typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv))) *
            (descending ? -1 : 1)
          );
        }),
    [
      orders,
      search,
      status,
      inventory,
      payment,
      notification,
      dateFrom,
      dateTo,
      min,
      max,
      sort,
      descending,
    ],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const clear = () => {
    setSearch("");
    setStatus("ALL");
    setInventory("ALL");
    setPayment("ALL");
    setNotification("ALL");
    setDateFrom("");
    setDateTo("");
    setMin("");
    setMax("");
    setPage(1);
  };
  if (loading) return <LoadingSkeleton rows={9} />;
  if (error) return <ErrorState message={error} retry={() => void refresh()} />;
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Order management"
        title="Orders"
        description="Search every order and inspect processor-level outcomes across the event-driven workflow."
        actions={
          <button className="button secondary" onClick={() => void refresh()}>
            <RefreshCw size={16} /> Refresh
          </button>
        }
      />
      <section className="panel filters-panel">
        <div className="filters-primary">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search orders"
              placeholder="Search order ID, customer, or email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <span>Overall status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {overallStatuses.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL" ? "All statuses" : statusLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <button className="button ghost" onClick={clear}>
            <FilterX size={16} /> Clear filters
          </button>
        </div>
        <details>
          <summary>More filters</summary>
          <div className="filters-more">
            <label>
              <span>Inventory</span>
              <select value={inventory} onChange={(e) => setInventory(e.target.value)}>
                {processorStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Payment</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                {processorStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Notification</span>
              <select value={notification} onChange={(e) => setNotification(e.target.value)}>
                {processorStatuses.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>From</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            <label>
              <span>Minimum total</span>
              <input type="number" min="0" value={min} onChange={(e) => setMin(e.target.value)} />
            </label>
            <label>
              <span>Maximum total</span>
              <input type="number" min="0" value={max} onChange={(e) => setMax(e.target.value)} />
            </label>
          </div>
        </details>
      </section>
      <section className="panel table-panel orders-table">
        <div className="table-toolbar">
          <span>{filtered.length} orders</span>
          <label>
            Sort by{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="createdAt">Created</option>
              <option value="total">Total</option>
              <option value="customer">Customer</option>
            </select>
          </label>
          <button className="icon-text-button" onClick={() => setDescending((value) => !value)}>
            {descending ? "Newest first" : "Oldest first"}
          </button>
        </div>
        {!rows.length ? (
          <EmptyState
            title="No matching orders"
            description="Adjust the filters or clear them to see all seeded orders."
          />
        ) : (
          <>
            <div className="table-scroll desktop-order-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Created</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Inventory</th>
                    <th>Payment</th>
                    <th>Notification</th>
                    <th>Overall</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr
                      className="clickable"
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td>
                        <code>{order.id}</code>
                      </td>
                      <td>
                        <strong>{order.customer.name}</strong>
                        <span>{order.customer.email}</span>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>
                        <StatusBadge status={order.inventory.status} />
                      </td>
                      <td>
                        <StatusBadge status={order.payment.status} />
                      </td>
                      <td>
                        <StatusBadge status={order.notification.status} />
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => navigate(`/orders/${order.id}`)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-order-cards">
              {rows.map((order) => (
                <button
                  className="order-card"
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <div>
                    <code>{order.id}</code>
                    <StatusBadge status={order.status} />
                  </div>
                  <strong>{order.customer.name}</strong>
                  <span>
                    {formatDateTime(order.createdAt)} · {order.items.length} item(s)
                  </span>
                  <b>{formatCurrency(order.total)}</b>
                  <div className="processor-mini">
                    <span>
                      I <StatusBadge status={order.inventory.status} />
                    </span>
                    <span>
                      P <StatusBadge status={order.payment.status} />
                    </span>
                    <span>
                      N <StatusBadge status={order.notification.status} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        <div className="pagination">
          <span>
            Page {Math.min(page, pages)} of {pages}
          </span>
          <div>
            <button
              disabled={page <= 1}
              aria-label="Previous page"
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft />
            </button>
            <button
              disabled={page >= pages}
              aria-label="Next page"
              onClick={() => setPage((value) => value + 1)}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
