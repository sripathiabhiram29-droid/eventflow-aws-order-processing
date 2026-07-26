# EventFlow interview guide

## Thirty-second overview

EventFlow demonstrates an order platform that acknowledges customer requests quickly and moves slow or failure-prone work behind an event boundary. The API writes the order to DynamoDB and publishes `ORDER_CREATED` to SNS. SNS fans out to three SQS queues, and independent Lambdas process inventory, payment, and notification. The UI makes eventual consistency, retries, DLQs, and observability visible.

## Business problem

A synchronous chain couples latency and availability: inventory delays payment, payment delays notification, and any failed call can force the customer to retry the whole request. Traffic spikes reach every dependency at the same time. EventFlow replaces the chain with durable acceptance and independent processing so a degraded service has a contained blast radius.

## Walk the request flow

1. CloudFront serves the React bundle from S3.
2. API Gateway receives the order and applies identity, throttling, and request controls.
3. The Order API Lambda validates input and an idempotency key.
4. DynamoDB stores the initial aggregate.
5. SNS receives a versioned `ORDER_CREATED` event.
6. Three SQS subscriptions receive their own copy.
7. Processor Lambdas consume independently and conditionally write results.
8. The aggregate reaches a terminal state after applicable processors settle.
9. CloudWatch correlates logs, traces, metrics, and alarms.

## Synchronous and asynchronous responsibilities

The synchronous contract owns authentication, validation, deduplication, durable acceptance, and a fast `202` response. It should not wait for inventory, payment, or notification. Async consumers own side effects, retries, compensation/reconciliation, and terminal state. This makes latency predictable but requires a status page or push updates because the system is eventually consistent.

## SNS fan-out and loose coupling

SNS provides publish/subscribe routing. The producer publishes one business event and does not know processor endpoints. A new fraud or analytics subscriber can be added without changing the Order API. Event schemas are versioned contracts; consumers tolerate additive changes and reject incompatible versions safely.

## SQS buffering and back-pressure

SQS separates arrival rate from consumption rate. During a spike, queue depth rises while processors consume at controlled concurrency. This protects downstream inventory databases or notification vendors. Approximate message count and oldest-message age are operational back-pressure indicators tied to SLOs.

## Retry behaviour and dead-letter queues

Transient failures use exponential backoff with jitter and bounded receives. The visibility timeout is longer than Lambda execution, and partial-batch response avoids replaying successful records. After `maxReceiveCount`, the message moves to a processor-specific DLQ. An alarm opens an investigation; replay happens only after the cause is fixed and idempotency is verified.

## Idempotent processing

At-least-once delivery means duplicates are normal. Every event has a stable event ID. A consumer performs a conditional DynamoDB write or checks an idempotency record before a side effect. Payment providers receive the same idempotency key. Replaying a queue message returns the recorded result rather than reserving or charging twice.

## Eventual consistency

Processor updates can arrive in any order. The UI displays explicit pending, processing, retrying, completed, failed, and skipped states instead of presenting a false synchronous success. Final-state derivation must be deterministic and use conditional transitions to avoid races. Reconciliation detects aggregates that never reach a terminal state.

## DynamoDB access patterns

Design around known queries: get an order by ID, list events for an order chronologically, and list recent orders for a customer or operational projection. A single-table option uses `PK=ORDER#{id}`, aggregate `SK=ORDER`, and `SK=EVENT#{timestamp}#{eventId}`. GSIs support customer/time access. Avoid scans; use CloudWatch Logs Insights or a separate search/read model for ad-hoc operations.

## Lambda concurrency and horizontal scaling

SQS event-source mappings scale Lambda polling as depth grows. Each processor has its own maximum concurrency and batch settings, so payment can protect a constrained provider while notifications scale wider. Reserved concurrency preserves account capacity for the ingestion path. Memory tuning often reduces both duration and cost.

## Failure isolation

Separate queues and Lambdas prevent notification failure from consuming inventory or payment capacity. DLQs are also separate so a poison event in one branch does not obscure another. The order aggregate may become `PARTIALLY_COMPLETED`, which triggers a business policy such as refund, release, or manual review.

## CloudWatch observability

Structured logs contain service, order ID, event ID, correlation ID, outcome, attempt, and duration. Dashboards track API count/errors/latency, Lambda duration/errors/throttles, queue depth/age, DLQ count, SNS failures, and DynamoDB throttles. Alarms should map to customer impact. X-Ray or OpenTelemetry trace context travels in message attributes.

## Security controls to add

Cognito/OIDC, API Gateway authorisers, WAF, request validation, TLS, least-privilege IAM, KMS, Secrets Manager, CloudTrail, CSP/security headers, log redaction, dependency/IaC scanning, and protected CI environments. The frontend never receives AWS credentials or accesses DynamoDB/CloudWatch directly. Payment simulation deliberately avoids cardholder data.

## Cost optimisation

Use Lambda and DynamoDB on-demand at uncertain early volume, batch SQS records, tune memory, apply CloudWatch retention, sample traces, compress/cache static assets, and set AWS Budgets. At steady high throughput, evaluate provisioned DynamoDB capacity and savings plans where measurable. Costs scale mainly with requests, duration, storage, observability volume, and data transfer.

## Trade-offs

- More managed components and operational concepts in exchange for isolation and elasticity.
- Eventual consistency in exchange for a short, reliable acceptance path.
- At-least-once delivery in exchange for durable, scalable messaging; consumers carry idempotency complexity.
- DynamoDB speed and operations in exchange for access-pattern-first modelling.
- A dual write from DynamoDB to SNS is simple but can lose publication; a transactional outbox or DynamoDB Streams is more robust.

## Production improvements

Add infrastructure as code, a transactional outbox/Streams publisher, Cognito, schema registry and compatibility tests, WebSocket/SSE status delivery, X-Ray/OpenTelemetry, automated DLQ replay, chaos/load tests, multi-region recovery objectives, a dedicated operational read model, feature flags, SLOs, runbooks, and a deployment pipeline with signed artifacts and progressive rollout.
