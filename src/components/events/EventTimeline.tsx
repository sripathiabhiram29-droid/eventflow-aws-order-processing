import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { OrderEvent } from "../../types";
import { formatDateTime } from "../../utils";
import { CopyButton, EmptyState, StatusBadge } from "../common/Common";

export function EventTimeline({ events }: { events: OrderEvent[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!events.length)
    return (
      <EmptyState
        title="No events yet"
        description="Processing events will appear here as services handle the order."
      />
    );
  return (
    <ol className="event-timeline" aria-label="Order event history">
      {events.map((event) => (
        <li key={event.id} className="timeline-item">
          <span className={`timeline-marker ${event.outcome.toLowerCase()}`} />
          <div className="timeline-card">
            <button
              className="timeline-summary"
              onClick={() => setExpanded(expanded === event.id ? null : event.id)}
              aria-expanded={expanded === event.id}
            >
              <span>
                <strong>{event.type}</strong>
                <small>
                  {event.service} · Attempt {event.attempt}
                </small>
              </span>
              <span className="timeline-meta">
                <StatusBadge status={event.outcome} />
                <time>{formatDateTime(event.timestamp)}</time>
                <ChevronDown className={expanded === event.id ? "rotate" : ""} size={17} />
              </span>
            </button>
            <p>{event.message}</p>
            {expanded === event.id && (
              <div className="payload">
                <div>
                  <span>Event ID</span>
                  <code>{event.id}</code>
                </div>
                <div>
                  <span>Correlation ID</span>
                  <code>{event.correlationId}</code>
                </div>
                {event.errorCode && (
                  <div>
                    <span>Error code</span>
                    <code>{event.errorCode}</code>
                  </div>
                )}
                <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                <CopyButton value={JSON.stringify(event.payload, null, 2)} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
