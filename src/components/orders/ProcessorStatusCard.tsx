import { BellRing, CreditCard, PackageCheck, Timer } from "lucide-react";
import type { InventoryResult, NotificationResult, PaymentResult } from "../../types";
import { formatCurrency } from "../../utils";
import { StatusBadge } from "../common/Common";

type Props =
  | { type: "inventory"; result: InventoryResult }
  | { type: "payment"; result: PaymentResult }
  | { type: "notification"; result: NotificationResult };

export function ProcessorStatusCard(props: Props) {
  const { type, result } = props;
  const title =
    type === "inventory"
      ? "Inventory Processor"
      : type === "payment"
        ? "Payment Processor"
        : "Notification Processor";
  const Icon = type === "inventory" ? PackageCheck : type === "payment" ? CreditCard : BellRing;
  return (
    <article className="processor-card">
      <div className="processor-card-head">
        <div>
          <span className="processor-icon">
            <Icon size={19} />
          </span>
          <strong>{title}</strong>
        </div>
        <StatusBadge status={result.status} />
      </div>
      <dl>
        <div>
          <dt>Attempts</dt>
          <dd>{result.attemptCount}</dd>
        </div>
        <div>
          <dt>
            <Timer size={13} /> Duration
          </dt>
          <dd>{result.processingDurationMs ? `${result.processingDurationMs} ms` : "—"}</dd>
        </div>
        {type === "inventory" && (
          <>
            <div>
              <dt>Reservation</dt>
              <dd>{props.result.reservationId ?? "—"}</dd>
            </div>
            <div>
              <dt>Reserved items</dt>
              <dd>{props.result.reservedItems.length}</dd>
            </div>
          </>
        )}
        {type === "payment" && (
          <>
            <div>
              <dt>Transaction</dt>
              <dd>{props.result.transactionId ?? "—"}</dd>
            </div>
            <div>
              <dt>Authorised</dt>
              <dd>
                {props.result.authorisedAmount
                  ? formatCurrency(props.result.authorisedAmount)
                  : "—"}
              </dd>
            </div>
          </>
        )}
        {type === "notification" && (
          <>
            <div>
              <dt>Channel</dt>
              <dd>{props.result.channel}</dd>
            </div>
            <div>
              <dt>Message ID</dt>
              <dd>{props.result.messageId ?? "—"}</dd>
            </div>
          </>
        )}
      </dl>
      {result.errorMessage && <p className="processor-error">{result.errorMessage}</p>}
    </article>
  );
}
