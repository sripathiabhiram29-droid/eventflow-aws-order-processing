# EventFlow architecture

## Context and goals

EventFlow accepts customer orders quickly while allowing inventory, payment, and notification to execute at different speeds and fail independently. The design optimises for loose coupling, burst absorption, observable eventual consistency, and low operational overhead. It deliberately avoids distributed synchronous orchestration.

## Request and event flow

1. CloudFront serves the React application from S3.
2. The browser posts a validated order to API Gateway.
3. The Order API Lambda validates the contract and idempotency key.
4. A conditional DynamoDB write creates the order in `RECEIVED` state.
5. The Lambda publishes `ORDER_CREATED` with an order ID, correlation ID, schema version, and timestamp to SNS.
6. SNS fans the event out to separate inventory, payment, and notification SQS queues.
7. Each queue invokes its own Lambda consumer according to that processor’s batch size and concurrency policy.
8. Consumers use conditional updates to record processor results and append auditable domain events.
9. The aggregate becomes `COMPLETED`, `FAILED`, or `PARTIALLY_COMPLETED` after applicable processors reach terminal states.
10. Structured logs, metrics, traces, and alarms flow into CloudWatch.

## Synchronous versus asynchronous boundary

The synchronous path owns authentication, validation, request idempotency, the durable order write, and event publication. It should return `202 Accepted` with the order and correlation IDs. Inventory reservation, payment simulation, notification delivery, retries, reconciliation, and final-state derivation are asynchronous. A production system could use a transactional outbox or DynamoDB Streams to close the dual-write gap between persistence and SNS publication.

## SNS fan-out and SQS buffering

SNS is the routing layer: one publication reaches every subscribed workflow branch. SQS is the durability and flow-control layer. Separate queues prevent head-of-line blocking, let each team set retention and redrive policy, and allow processor-specific Lambda concurrency. Queue depth is an explicit back-pressure signal; the API can continue accepting orders while consumers catch up within the agreed SLO.

## Delivery semantics and idempotency

SNS-to-SQS and SQS-to-Lambda provide at-least-once delivery. Every message includes a stable event ID and order ID. Consumers record an idempotency key before causing an irreversible side effect and use conditional DynamoDB writes so duplicate messages return the existing result. A payment processor would additionally use the provider’s idempotency key.

## Failure isolation, retry, and DLQ policy

Transient faults use exponential backoff with jitter. Lambda timeouts remain shorter than SQS visibility timeouts. A bounded `maxReceiveCount` moves repeatedly failing messages to a processor-specific DLQ. DLQ alarms include queue, age, count, event ID, and correlation ID. Replay is a controlled operation after the code or data problem is resolved; it must retain idempotency keys.

## DynamoDB access patterns

An initial single-table model can use `PK=ORDER#{orderId}` with an aggregate at `SK=ORDER` and event records at `SK=EVENT#{timestamp}#{eventId}`. A customer-order GSI can use `GSI1PK=CUSTOMER#{customerId}` and time-sortable keys. Operational event search belongs in CloudWatch Logs Insights or a purpose-built read model rather than a DynamoDB table scan. Conditional expressions protect transitions and idempotent results.

## Scaling and concurrency

API Gateway, SNS, SQS, Lambda, and DynamoDB scale horizontally. Reserved or maximum concurrency per processor protects downstream systems. Batch size and batch window balance latency against request cost. Partial-batch response avoids replaying successful messages when one record in a batch fails. DynamoDB partition-key distribution and on-demand capacity support uneven order traffic.

## Observability

Every log line is structured JSON containing service, environment, order ID, event ID, correlation ID, attempt, latency, and outcome—without personal or payment data. CloudWatch dashboards show request count/errors/latency, Lambda errors/duration/throttles, SNS delivery failures, queue depth/message age, DLQ count, and DynamoDB throttles. X-Ray or OpenTelemetry can connect the synchronous trace to message metadata.

## Security boundary

Production controls include OIDC/Cognito, API Gateway authorisation and validation, WAF, TLS, least-privilege IAM, KMS encryption, Secrets Manager, CloudTrail, private networking only where needed, dependency and IaC scanning, immutable CI deployments, CSP, and log redaction. Payment remains a simulator to avoid cardholder-data scope.

## Trade-offs

- Eventual consistency improves isolation but requires a status-oriented user experience and reconciliation.
- SNS/SQS adds components and cost but makes throughput, failure, and ownership boundaries explicit.
- DynamoDB provides managed scale but rewards known access patterns and discourages ad-hoc relational queries.
- Independent consumers can finish in any order; final-state derivation must be deterministic and race-safe.
- A transactional outbox or DynamoDB Streams improves publish reliability but adds latency and implementation work.
