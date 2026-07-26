import { Activity, Banknote, CheckCircle2, Clock3, PackageOpen, TriangleAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { useEventFlow } from "../hooks/useEventFlow";
import { ErrorState, LoadingSkeleton, MetricCard, StatusBadge } from "../components/common/Common";
import { PageHeader } from "../components/common/PageHeader";
import { formatCurrency, formatDateTime } from "../utils";

const volumeData = [
  { time: "08:00", orders: 18 },
  { time: "09:00", orders: 29 },
  { time: "10:00", orders: 24 },
  { time: "11:00", orders: 41 },
  { time: "12:00", orders: 36 },
  { time: "13:00", orders: 52 },
  { time: "14:00", orders: 47 },
  { time: "15:00", orders: 61 },
];
const COLORS = ["#16813d", "#2474e5", "#d52b1e", "#7b8798"];

export function DashboardPage() {
  const { orders, events, alerts, loading, error, refresh } = useEventFlow();
  if (loading) return <LoadingSkeleton rows={8} />;
  if (error) return <ErrorState message={error} retry={() => void refresh()} />;
  const completed = orders.filter((order) => order.status === "COMPLETED");
  const processing = orders.filter((order) => ["RECEIVED", "PROCESSING"].includes(order.status));
  const failed = orders.filter((order) => ["FAILED", "PARTIALLY_COMPLETED"].includes(order.status));
  const revenue = completed.reduce((sum, order) => sum + order.total, 0);
  const outcomes = [
    { name: "Completed", value: completed.length },
    { name: "Processing", value: processing.length },
    { name: "Failed", value: failed.length },
    { name: "Cancelled", value: orders.filter((order) => order.status === "CANCELLED").length },
  ];
  const processorHealth = [
    { name: "Inventory Processor", depth: 4, rate: "99.4%", latency: "186 ms", status: "HEALTHY" },
    { name: "Payment Processor", depth: 21, rate: "97.8%", latency: "242 ms", status: "DEGRADED" },
    {
      name: "Notification Processor",
      depth: 3,
      rate: "99.8%",
      latency: "148 ms",
      status: "HEALTHY",
    },
  ];
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Live operations"
        title="Order processing at a glance"
        description="Track asynchronous order execution, processor reliability, and event throughput across the platform."
        actions={
          <Link className="button primary" to="/orders/new">
            Create order
          </Link>
        }
      />
      <section className="metric-grid six" aria-label="Key metrics">
        <MetricCard
          label="Total Orders"
          value={orders.length.toLocaleString("en-GB")}
          trend="↑ 12.4% this week"
          icon={<PackageOpen />}
        />
        <MetricCard
          label="Processing"
          value={String(processing.length)}
          trend="Across 3 queues"
          icon={<Activity />}
        />
        <MetricCard
          label="Completed"
          value={String(completed.length)}
          trend="98.2% success rate"
          icon={<CheckCircle2 />}
        />
        <MetricCard
          label="Failed"
          value={String(failed.length)}
          trend="2 need attention"
          icon={<TriangleAlert />}
        />
        <MetricCard
          label="Revenue Processed"
          value={formatCurrency(revenue)}
          trend="Authorised orders"
          icon={<Banknote />}
        />
        <MetricCard
          label="Avg. Processing Time"
          value="1.84s"
          trend="↓ 240ms vs last week"
          icon={<Clock3 />}
        />
      </section>
      <section className="dashboard-grid charts-grid">
        <article className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Order volume</h2>
              <p>Accepted orders by hour</p>
            </div>
            <span className="soft-label">Today</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 12, right: 6, left: -26, bottom: 0 }}>
                <defs>
                  <linearGradient id="orderFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2474e5" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#2474e5" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e9edf3" vertical={false} />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#687487", fontSize: 12 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#687487", fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#2474e5"
                  strokeWidth={2.5}
                  fill="url(#orderFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Processing outcomes</h2>
              <p>Current order distribution</p>
            </div>
          </div>
          <div className="outcomes-chart">
            <ResponsiveContainer width="54%" height={220}>
              <PieChart>
                <Pie
                  data={outcomes}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  {outcomes.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="outcome-legend">
              {outcomes.map((item, index) => (
                <div key={item.name}>
                  <span style={{ background: COLORS[index] }} />
                  <p>
                    {item.name}
                    <strong>{item.value}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
      <section className="dashboard-grid main-grid">
        <article className="panel table-panel">
          <div className="panel-head">
            <div>
              <h2>Recent orders</h2>
              <p>Latest activity across the order pipeline</p>
            </div>
            <Link to="/orders">View all</Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map((order) => (
                  <tr key={order.id}>
                    <td>
                      <code>{order.id}</code>
                    </td>
                    <td>
                      <strong>{order.customer.name}</strong>
                      <span>{order.customer.email}</span>
                    </td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>
                      <Link className="text-link" to={`/orders/${order.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="panel events-panel">
          <div className="panel-head">
            <div>
              <h2>Recent events</h2>
              <p>Latest service activity</p>
            </div>
            <Link to="/events">Monitor</Link>
          </div>
          <div className="compact-feed">
            {events.slice(0, 7).map((event) => (
              <Link to={`/orders/${event.orderId}`} key={event.id}>
                <span className={`feed-dot ${event.outcome.toLowerCase()}`} />
                <div>
                  <strong>{event.type}</strong>
                  <small>
                    {event.service} · {event.orderId}
                  </small>
                </div>
                <time>{formatDateTime(event.timestamp)}</time>
              </Link>
            ))}
          </div>
        </aside>
      </section>
      <section className="dashboard-grid equal-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Processor health</h2>
              <p>SQS consumers and processing performance</p>
            </div>
          </div>
          <div className="processor-list">
            {processorHealth.map((processor) => (
              <div key={processor.name}>
                <div>
                  <strong>{processor.name}</strong>
                  <StatusBadge status={processor.status} />
                </div>
                <dl>
                  <span>
                    <dt>Queue depth</dt>
                    <dd>{processor.depth}</dd>
                  </span>
                  <span>
                    <dt>Success rate</dt>
                    <dd>{processor.rate}</dd>
                  </span>
                  <span>
                    <dt>Avg. latency</dt>
                    <dd>{processor.latency}</dd>
                  </span>
                </dl>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Operational alerts</h2>
              <p>Signals that may require intervention</p>
            </div>
            <Link to="/health">System health</Link>
          </div>
          <div className="alert-list">
            {alerts.map((alert) => (
              <div key={alert.id}>
                <span className={`alert-icon ${alert.severity.toLowerCase()}`}>
                  <TriangleAlert size={16} />
                </span>
                <div>
                  <strong>{alert.alert}</strong>
                  <small>
                    {alert.resource} · {formatDateTime(alert.triggeredAt)}
                  </small>
                </div>
                <StatusBadge status={alert.status} />
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
