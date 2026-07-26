import {
  Activity,
  CheckCircle2,
  Database,
  Gauge,
  RadioTower,
  ServerCog,
  ShieldAlert,
  Waypoints,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusBadge } from "../components/common/Common";
import { PageHeader } from "../components/common/PageHeader";
import { useEventFlow } from "../hooks/useEventFlow";
import { formatDateTime } from "../utils";

export function HealthPage() {
  const { metrics, queues, alerts } = useEventFlow();
  const services = [
    ["API Gateway", "HEALTHY", "99.99% requests served", Activity],
    ["Lambda invocations", "HEALTHY", "0 active throttles", ServerCog],
    ["DynamoDB", "HEALTHY", "42% consumed capacity", Database],
    ["SNS topic", "HEALTHY", "100% delivery rate", RadioTower],
    ["SQS queues", "DEGRADED", "Payment depth elevated", Waypoints],
    ["Processors", "HEALTHY", "3 of 3 consuming", Gauge],
    ["Dead-letter queues", "WARNING", "3 messages retained", ShieldAlert],
  ] as const;
  const chart = (dataKey: string, color: string, type: "line" | "area" | "bar" = "line") => (
    <ResponsiveContainer width="100%" height="100%">
      {type === "bar" ? (
        <BarChart data={metrics}>
          <CartesianGrid stroke="#edf0f4" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).getHours().toString().padStart(2, "0")}
            axisLine={false}
            tickLine={false}
          />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(value) => formatDateTime(String(value))} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      ) : type === "area" ? (
        <AreaChart data={metrics}>
          <CartesianGrid stroke="#edf0f4" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).getHours().toString().padStart(2, "0")}
            axisLine={false}
            tickLine={false}
          />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(value) => formatDateTime(String(value))} />
          <Area dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.13} strokeWidth={2} />
        </AreaChart>
      ) : (
        <LineChart data={metrics}>
          <CartesianGrid stroke="#edf0f4" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(value) => new Date(value).getHours().toString().padStart(2, "0")}
            axisLine={false}
            tickLine={false}
          />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(value) => formatDateTime(String(value))} />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
  const telemetryPanels = [
    ["API request count", "requests", "#2474e5", "area"],
    ["API error rate (%)", "errorRate", "#d52b1e", "line"],
    ["Lambda duration (ms)", "duration", "#7c3aed", "line"],
    ["Lambda errors", "lambdaErrors", "#d52b1e", "bar"],
    ["Lambda throttles", "throttles", "#c77700", "bar"],
    ["Queue depth", "queueDepth", "#2474e5", "area"],
    ["Message age / capacity", "capacity", "#16813d", "line"],
    ["DynamoDB capacity (%)", "capacity", "#0d9488", "area"],
  ] as const;
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Reliability operations"
        title="System health"
        description="CloudWatch-style service, queue, and processor telemetry for the simulated EventFlow environment."
      />
      <section className="health-hero">
        <div>
          <span className="health-check">
            <CheckCircle2 />
          </span>
          <div>
            <span>Overall system health</span>
            <h2>Operational with minor degradation</h2>
            <p>
              Core order processing is available. Payment queue depth is above its warning
              threshold.
            </p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Availability</dt>
            <dd>99.98%</dd>
          </div>
          <div>
            <dt>Open alerts</dt>
            <dd>2</dd>
          </div>
          <div>
            <dt>Last checked</dt>
            <dd>Just now</dd>
          </div>
        </dl>
      </section>
      <section className="service-health-grid">
        {services.map(([name, status, detail, Icon]) => (
          <article className="panel" key={name}>
            <span>
              <Icon />
            </span>
            <div>
              <h3>{name}</h3>
              <p>{detail}</p>
            </div>
            <StatusBadge status={status} />
          </article>
        ))}
      </section>
      <section>
        <div className="section-title">
          <span>Message brokers</span>
          <h2>Queue health</h2>
        </div>
        <div className="queue-grid">
          {queues.map((queue) => (
            <article className="panel queue-card" key={queue.name}>
              <div>
                <span className="queue-icon">
                  <Waypoints />
                </span>
                <StatusBadge status={queue.consumerStatus} />
              </div>
              <h3>{queue.name}</h3>
              <dl>
                <div>
                  <dt>Available</dt>
                  <dd>{queue.available}</dd>
                </div>
                <div>
                  <dt>In flight</dt>
                  <dd>{queue.inFlight}</dd>
                </div>
                <div>
                  <dt>Oldest age</dt>
                  <dd>{queue.oldestMessageAgeSeconds}s</dd>
                </div>
                <div>
                  <dt>DLQ count</dt>
                  <dd>{queue.dlqMessages}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
      <section>
        <div className="section-title">
          <span>CloudWatch metrics</span>
          <h2>Operational telemetry</h2>
        </div>
        <div className="telemetry-grid">
          {telemetryPanels.map(([title, key, color, type]) => (
            <article className="panel metric-chart" key={title}>
              <div className="panel-head">
                <h3>{title}</h3>
                <span className="chart-live">
                  <span /> Live
                </span>
              </div>
              <div>{chart(key, color, type)}</div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel table-panel alerts-table">
        <div className="panel-head">
          <div>
            <h2>Alerts</h2>
            <p>Thresholds and anomalies from simulated CloudWatch alarms</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Resource</th>
                <th>Alert</th>
                <th>Triggered</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <StatusBadge status={alert.severity} />
                  </td>
                  <td>
                    <code>{alert.resource}</code>
                  </td>
                  <td>{alert.alert}</td>
                  <td>{formatDateTime(alert.triggeredAt)}</td>
                  <td>
                    <StatusBadge status={alert.status} />
                  </td>
                  <td>
                    <button className="text-link">Investigate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
