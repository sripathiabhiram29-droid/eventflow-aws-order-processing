import {
  Activity,
  CirclePause,
  CirclePlay,
  Copy,
  Database,
  MessageSquareMore,
  RadioTower,
  RefreshCw,
  Search,
  ServerCog,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard, StatusBadge } from "../components/common/Common";
import { PageHeader } from "../components/common/PageHeader";
import { useEventFlow } from "../hooks/useEventFlow";
import type { OrderEvent } from "../types";
import { formatDateTime, formatRelative } from "../utils";

const eventTypes = [
  "ALL",
  "ORDER_CREATED",
  "ORDER_EVENT_PUBLISHED",
  "INVENTORY_RESERVED",
  "PAYMENT_AUTHORISED",
  "PAYMENT_DECLINED",
  "NOTIFICATION_SENT",
  "PROCESSOR_RETRY_SCHEDULED",
  "MESSAGE_SENT_TO_DLQ",
];
const services = [
  "ALL",
  "Order API",
  "Order Store",
  "SNS",
  "Inventory",
  "Payment",
  "Notification",
  "DLQ",
];

export function EventsPage() {
  const { events, paused, setPaused, refresh, simulateNext } = useEventFlow();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [service, setService] = useState("ALL");
  const [outcome, setOutcome] = useState("ALL");
  const [time, setTime] = useState("24h");
  const [correlation, setCorrelation] = useState("");
  const [autoRefresh, setAutoRefresh] = useState("off");
  const [selected, setSelected] = useState<OrderEvent | null>(null);
  const [flowing, setFlowing] = useState(false);
  useEffect(() => {
    if (paused || autoRefresh === "off") return;
    const interval = window.setInterval(() => void refresh(), Number(autoRefresh) * 1000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, paused, refresh]);
  const filtered = useMemo(() => {
    const referenceTime = Math.max(
      ...events.map((event) => new Date(event.timestamp).getTime()),
      0,
    );
    return events.filter((event) => {
      const query = search.toLowerCase();
      const limit = time === "1h" ? 3600_000 : time === "6h" ? 6 * 3600_000 : 24 * 3600_000;
      return (
        (!query ||
          [event.type, event.orderId, event.message].some((value) =>
            value.toLowerCase().includes(query),
          )) &&
        (type === "ALL" || event.type === type) &&
        (service === "ALL" || event.service === service) &&
        (outcome === "ALL" || event.outcome === outcome) &&
        (!correlation || event.correlationId.toLowerCase().includes(correlation.toLowerCase())) &&
        referenceTime - new Date(event.timestamp).getTime() <= limit
      );
    });
  }, [events, search, type, service, outcome, time, correlation]);
  const generate = () => {
    simulateNext();
    setFlowing(true);
    window.setTimeout(() => setFlowing(false), 1800);
  };
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operational telemetry"
        title="Event monitor"
        description="Observe the event stream as messages fan out through SNS, SQS, and independent Lambda consumers."
        actions={
          <>
            <button className="button secondary" onClick={() => setPaused(!paused)}>
              {paused ? <CirclePlay /> : <CirclePause />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button className="button primary" onClick={generate}>
              <Activity /> Generate event
            </button>
          </>
        }
      />
      <section className="metric-grid five">
        <MetricCard
          label="Events Today"
          value={String(events.length)}
          trend="Across all services"
          icon={<RadioTower />}
        />
        <MetricCard
          label="Successful Events"
          value={String(events.filter((e) => e.outcome === "SUCCESS").length)}
          trend="Stable delivery"
          icon={<Activity />}
        />
        <MetricCard
          label="Failed Events"
          value={String(events.filter((e) => e.outcome === "FAILED").length)}
          trend="Needs review"
          icon={<X />}
        />
        <MetricCard
          label="Retried Events"
          value={String(events.filter((e) => e.outcome === "RETRYING").length)}
          trend="Policy managed"
          icon={<RefreshCw />}
        />
        <MetricCard
          label="DLQ Messages"
          value={String(events.filter((e) => e.type === "MESSAGE_SENT_TO_DLQ").length)}
          trend="Retention: 14 days"
          icon={<MessageSquareMore />}
        />
      </section>
      <section className="panel service-flow-panel">
        <div className="panel-head">
          <div>
            <h2>Service flow</h2>
            <p>SNS fan-out distributes work without coupling processors to order ingestion.</p>
          </div>
          <StatusBadge status={paused ? "PAUSED" : "LIVE"} />
        </div>
        <div className={`service-flow ${flowing ? "flowing" : ""}`}>
          <div className="flow-node">
            <ServerCog />
            <strong>Order API</strong>
            <span>Lambda</span>
          </div>
          <i>→</i>
          <div className="flow-node sns">
            <RadioTower />
            <strong>SNS Topic</strong>
            <span>order-events</span>
          </div>
          <i>→</i>
          <div className="flow-stack">
            <div>SQS Inventory</div>
            <div>SQS Payment</div>
            <div>SQS Notification</div>
          </div>
          <i>→</i>
          <div className="flow-stack lambdas">
            <div>λ Inventory</div>
            <div>λ Payment</div>
            <div>λ Notification</div>
          </div>
          <i>→</i>
          <div className="flow-node">
            <Database />
            <strong>DynamoDB</strong>
            <span>Orders table</span>
          </div>
        </div>
      </section>
      <section className="panel event-monitor">
        <div className="event-controls">
          <label className="search-field">
            <Search />
            <input
              aria-label="Search events"
              placeholder="Search event, order, or message"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            <span>Event type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {eventTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Service</span>
            <select value={service} onChange={(e) => setService(e.target.value)}>
              {services.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Outcome</span>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option>ALL</option>
              <option>SUCCESS</option>
              <option>FAILED</option>
              <option>RETRYING</option>
              <option>INFO</option>
            </select>
          </label>
          <label>
            <span>Time window</span>
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              <option value="1h">Last hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
            </select>
          </label>
          <label>
            <span>Auto-refresh</span>
            <select value={autoRefresh} onChange={(e) => setAutoRefresh(e.target.value)}>
              <option value="off">Off</option>
              <option value="5">5 seconds</option>
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
            </select>
          </label>
          <label>
            <span>Correlation ID</span>
            <input
              value={correlation}
              onChange={(e) => setCorrelation(e.target.value)}
              placeholder="corr-…"
            />
          </label>
        </div>
        <div className="live-feed-head">
          <span className={paused ? "paused-indicator" : "live-indicator"}>
            {paused ? "Paused" : "Live"}
          </span>
          <p>{filtered.length} matching events</p>
        </div>
        <div className="live-event-feed">
          {filtered.slice(0, 28).map((event) => (
            <button key={event.id} onClick={() => setSelected(event)}>
              <span className={`event-outcome-bar ${event.outcome.toLowerCase()}`} />
              <time>{formatRelative(event.timestamp)}</time>
              <div>
                <strong>{event.type}</strong>
                <span>{event.message}</span>
              </div>
              <code>{event.orderId}</code>
              <span>{event.service}</span>
              <StatusBadge status={event.outcome} />
            </button>
          ))}
        </div>
      </section>
      {selected && (
        <aside
          className="payload-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payload-title"
        >
          <div className="drawer-head">
            <div>
              <span>Event payload</span>
              <h2 id="payload-title">{selected.type}</h2>
            </div>
            <button aria-label="Close payload" onClick={() => setSelected(null)}>
              <X />
            </button>
          </div>
          <dl>
            <div>
              <dt>Event ID</dt>
              <dd>{selected.id}</dd>
            </div>
            <div>
              <dt>Order ID</dt>
              <dd>{selected.orderId}</dd>
            </div>
            <div>
              <dt>Correlation ID</dt>
              <dd>{selected.correlationId}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{selected.service}</dd>
            </div>
            <div>
              <dt>Timestamp</dt>
              <dd>{formatDateTime(selected.timestamp)}</dd>
            </div>
            <div>
              <dt>Attempt</dt>
              <dd>{selected.attempt}</dd>
            </div>
          </dl>
          <pre>{JSON.stringify(selected.payload, null, 2)}</pre>
          <button
            className="button secondary"
            onClick={() =>
              void navigator.clipboard.writeText(JSON.stringify(selected.payload, null, 2))
            }
          >
            <Copy /> Copy JSON
          </button>
        </aside>
      )}
      {selected && (
        <button
          className="drawer-scrim"
          aria-label="Close payload"
          onClick={() => setSelected(null)}
        />
      )}
    </div>
  );
}
