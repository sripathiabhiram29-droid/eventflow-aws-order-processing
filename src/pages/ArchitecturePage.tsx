import {
  Boxes,
  Cloud,
  Database,
  Eye,
  FunctionSquare,
  Globe2,
  HardDrive,
  RadioTower,
  Route,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";

function ArchitectureNode({
  icon: Icon,
  service,
  label,
  tone = "blue",
  className = "",
}: {
  icon: typeof Cloud;
  service: string;
  label: string;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={`architecture-node ${tone} ${className}`}>
      <span>
        <Icon />
      </span>
      <div>
        <strong>{service}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}
function ArchitectureConnector({ label }: { label?: string }) {
  return (
    <div className="architecture-connector">
      <span>→</span>
      {label && <em>{label}</em>}
    </div>
  );
}

const services = [
  [
    "API Gateway",
    Route,
    "Provides a managed HTTP entry point with throttling and future authorisation controls.",
  ],
  [
    "AWS Lambda",
    FunctionSquare,
    "Runs ingestion and processors independently, scaling with request and queue demand.",
  ],
  [
    "DynamoDB",
    Database,
    "Stores order aggregates with fast key-based access and managed horizontal scale.",
  ],
  [
    "Amazon SNS",
    RadioTower,
    "Publishes one order event and fans it out to every subscribed processor queue.",
  ],
  [
    "Amazon SQS",
    Waypoints,
    "Buffers bursts, isolates consumers, and provides retry plus dead-letter semantics.",
  ],
  [
    "CloudWatch",
    Eye,
    "Centralises metrics, structured logs, traces, dashboards, and operational alarms.",
  ],
  [
    "Amazon S3",
    HardDrive,
    "Hosts the production frontend as low-cost, highly durable static assets.",
  ],
  [
    "CloudFront",
    Globe2,
    "Caches the frontend at edge locations and provides a secure global delivery layer.",
  ],
] as const;
const decisions = [
  [
    "Why SNS for fan-out",
    "The ingestion Lambda publishes once; SNS delivers the same domain event to inventory, payment, and notification without service-to-service calls.",
  ],
  [
    "A queue per processor",
    "Each consumer scales, retries, and fails independently. A slow notification provider cannot block payment or inventory.",
  ],
  [
    "Why SQS before Lambda",
    "Queues absorb traffic spikes, enable back-pressure, and decouple event arrival from available Lambda concurrency.",
  ],
  [
    "Simulated payment",
    "This portfolio demonstrates orchestration safely without collecting sensitive data or introducing payment-provider scope.",
  ],
  [
    "DynamoDB for orders",
    "Known access patterns, variable event throughput, and serverless operations align well with partition-key based storage.",
  ],
  [
    "Idempotency matters",
    "At-least-once delivery means consumers may see the same message twice; idempotency keys prevent duplicate reservations or charges.",
  ],
  [
    "Dead-letter queues",
    "Poison messages are isolated after bounded retries so teams can inspect and replay them without blocking healthy work.",
  ],
  [
    "Horizontal scaling",
    "Queue depth drives concurrent Lambda consumption while every processor can tune scaling limits to protect dependencies.",
  ],
];

export function ArchitecturePage() {
  const processorLanes = [
    ["Inventory", "inventory-queue"],
    ["Payment", "payment-queue"],
    ["Notification", "notification-queue"],
  ] as const;
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Solution design"
        title="Serverless event-driven architecture"
        description="A decoupled AWS design that absorbs bursts, isolates failures, and gives each order processor an independent scaling boundary."
      />
      <section className="panel architecture-panel">
        <div className="architecture-diagram" aria-label="EventFlow AWS reference architecture">
          <div className="arch-ingress">
            <ArchitectureNode
              icon={Boxes}
              service="React Frontend"
              label="EventFlow SPA"
              tone="navy"
            />
            <ArchitectureConnector />
            <div className="arch-edge">
              <ArchitectureNode icon={Globe2} service="CloudFront" label="Edge delivery" />
              <ArchitectureNode icon={HardDrive} service="Amazon S3" label="Static hosting" />
            </div>
            <ArchitectureConnector />
            <ArchitectureNode icon={Route} service="API Gateway" label="REST API" tone="orange" />
            <ArchitectureConnector />
            <ArchitectureNode
              icon={FunctionSquare}
              service="Order API Lambda"
              label="Ingestion"
              tone="orange"
            />
          </div>
          <div className="arch-persist">
            <span className="branch-label">Persist</span>
            <ArchitectureNode
              icon={Database}
              service="DynamoDB"
              label="Orders table"
              tone="green"
            />
            <span className="branch-label">Publish</span>
            <ArchitectureNode
              icon={RadioTower}
              service="SNS Topic"
              label="order-events"
              tone="pink"
            />
          </div>
          <div className="fanout-label">
            <span />
            SNS fan-out
            <span />
          </div>
          <div className="arch-processors">
            {processorLanes.map(([name, queue]) => (
              <div className="processor-lane" key={name}>
                <ArchitectureNode
                  icon={Waypoints}
                  service={`${name} SQS`}
                  label={queue}
                  tone="purple"
                />
                <ArchitectureConnector label="poll" />
                <ArchitectureNode
                  icon={FunctionSquare}
                  service={`${name} Lambda`}
                  label="Processor"
                  tone="orange"
                />
                <ArchitectureConnector label="update" />
                <ArchitectureNode
                  icon={Database}
                  service="DynamoDB"
                  label="Order result"
                  tone="green"
                />
                <div className="dlq-node">
                  <span>↓ failures</span>
                  <ArchitectureNode
                    icon={ShieldCheck}
                    service={`${name} DLQ`}
                    label="Redrive"
                    tone="red"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="observability-rail">
            <Eye />
            <strong>Amazon CloudWatch</strong>
            <span>Logs · Metrics · Traces · Alarms</span>
          </div>
        </div>
      </section>
      <section>
        <div className="section-title">
          <span>Architecture principles</span>
          <h2>How the workflow stays reliable</h2>
        </div>
        <div className="explanation-grid">
          {[
            [
              "API ingestion",
              "API Gateway and Lambda validate the synchronous request and return an order identifier quickly.",
            ],
            [
              "Durable persistence",
              "The order is written before an event is published so its source of truth exists before downstream work begins.",
            ],
            [
              "Event publication",
              "ORDER_CREATED is a stable contract that downstream consumers process without knowing the caller.",
            ],
            [
              "Fan-out",
              "SNS creates one-to-many delivery, avoiding brittle direct calls from the ingestion service.",
            ],
            [
              "Queue-based decoupling",
              "SQS provides buffering, visibility timeouts, retries, and independent consumer throughput.",
            ],
            [
              "Independent processing",
              "Inventory, payment, and notification complete at different times under eventual consistency.",
            ],
            [
              "Failure isolation",
              "One processor can fail or slow down without cascading the fault across the entire request path.",
            ],
            [
              "Retry handling",
              "Transient failures use bounded retries with backoff before a message is considered unprocessable.",
            ],
            [
              "Dead-letter queues",
              "Exhausted messages move to a durable investigation and controlled replay path.",
            ],
            [
              "Observability",
              "Correlation IDs connect API logs, queue metrics, Lambda traces, and order events in CloudWatch.",
            ],
          ].map(([title, copy], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <div className="section-title">
          <span>Managed services</span>
          <h2>AWS services used</h2>
        </div>
        <div className="service-card-grid">
          {services.map(([name, Icon, copy]) => (
            <article className="service-card" key={name}>
              <span>
                <Icon />
              </span>
              <h3>{name}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel decisions-panel">
        <div className="panel-head">
          <div>
            <h2>Architecture decisions</h2>
            <p>The design choices most likely to come up in a technical interview.</p>
          </div>
        </div>
        <div className="decision-grid">
          {decisions.map(([title, copy]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
