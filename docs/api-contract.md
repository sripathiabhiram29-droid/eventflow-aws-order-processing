# EventFlow API contract

This is the planned REST contract for the future API Gateway integration. All timestamps are ISO 8601 UTC. Status values are uppercase. Clients send `Content-Type: application/json`, a trace/correlation header, and an idempotency key for state-changing requests.

## Common headers

```http
Content-Type: application/json
X-Correlation-Id: corr-6ab2...
Idempotency-Key: 20770d84-...
```

## Create an order

`POST /orders`

```json
{
  "customer": {
    "name": "Olivia Bennett",
    "email": "olivia@example.com",
    "phone": "+44 7700 900123"
  },
  "deliveryAddress": {
    "line1": "18 Market Street",
    "city": "London",
    "region": "England",
    "postalCode": "EC2A 4BX",
    "country": "United Kingdom"
  },
  "items": [{ "productId": "prod-dock", "sku": "EF-DOCK-204", "quantity": 1, "unitPrice": 149 }],
  "paymentMethodId": "visa-4242"
}
```

Successful acceptance returns `202 Accepted`:

```json
{
  "orderId": "EF-A12BC34D",
  "correlationId": "corr-6ab2...",
  "status": "RECEIVED",
  "createdAt": "2026-07-26T14:18:52.000Z"
}
```

## Query orders

`GET /orders?page=1&pageSize=25&status=PROCESSING&search=olivia&sort=-createdAt`

Response:

```json
{ "items": [], "page": 1, "pageSize": 25, "total": 0 }
```

The backend, not the browser, applies filters once real data volume grows. Supported filters mirror the frontend: overall and processor statuses, date bounds, total bounds, search, sort, and pagination.

## Order aggregate

`GET /orders/{orderId}` returns customer, address, items, money totals in minor units or an explicitly documented decimal representation, overall status, processor results, and timestamps. Processor results include attempts, duration, error code/message, and processor-specific identifiers. Sensitive provider responses are never returned.

## Order events

`GET /orders/{orderId}/events?cursor=...&limit=100`

Each event includes `eventId`, `type`, `schemaVersion`, `service`, `orderId`, `correlationId`, `timestamp`, `attempt`, `status`, `message`, optional safe `errorCode`, and a redacted payload. Cursor pagination prevents unbounded reads.

## Cancellation and retry

- `POST /orders/{orderId}/cancel` uses an idempotency key and returns `202 Accepted`. It can return `409 ORDER_NOT_CANCELLABLE` after an irreversible state.
- `POST /orders/{orderId}/retry` accepts an eligible processor name and returns `202 Accepted`. The backend authorises this operational action and records an audit event.

## Operations endpoints

- `GET /events` supports time, type, service, outcome, order, and correlation filters.
- `GET /health` returns a shallow service health summary and never exposes internals or secrets.
- `GET /metrics` returns pre-aggregated chart data; the browser should not query CloudWatch directly.
- `GET /alerts` returns current and recent alarm projections.

## Error model

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "correlationId": "corr-6ab2...",
  "fieldErrors": { "customer.email": "Enter a valid email address." }
}
```

Use `400` for invalid input, `401/403` for identity/authorisation, `404` for unknown resources, `409` for invalid state or idempotency conflicts, `429` for throttling, and `5xx` for safe generic server failures. Never return stack traces, credentials, internal ARNs, raw payment responses, or customer data in diagnostic messages.

## Client integration

`src/services/api.ts` is the only HTTP boundary. It chooses mock mode when `VITE_USE_MOCK_API=true` or no `VITE_API_BASE_URL` is configured, uses native Fetch, accepts AbortSignals for cancellable reads, checks every response status, and throws typed `ApiError` values.
