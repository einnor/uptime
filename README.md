# Uptime

[![CI](https://github.com/einnor/uptime/actions/workflows/ci.yml/badge.svg)](https://github.com/einnor/uptime/actions/workflows/ci.yml)

A dependency-free Node.js monitoring service: manage HTTP checks through a JSON API, probe endpoints in a background worker, persist results and notify users when a previously observed endpoint changes state.

This is a backend learning project, not a hosted monitoring product. The useful engineering surface is the complete request-to-worker path: routing, session ownership, bounded requests, timeout handling, persistence and state-change notifications.

## Run locally

Requires Node.js 24. There are **no third-party runtime dependencies** and no database or cloud account is required.

```sh
git clone https://github.com/einnor/uptime.git
cd uptime
cp .env.example .env
npm start
```

The API binds to `127.0.0.1:4000` by default. Storage directories are created automatically. The root page links to this documentation; **there is no implemented web dashboard**.

```sh
curl http://127.0.0.1:4000/ping
# {"message":"It lives!"}
```

SMS delivery is disabled until all Twilio variables in `.env.example` are configured. Local monitoring still works without them. Optional TLS requires both `TLS_KEY_PATH` and `TLS_CERT_PATH`; private keys are never shipped with the application.

## A complete API example

The values below are fictional. Use a disposable local password.

```sh
curl -X POST http://127.0.0.1:4000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Demo","lastName":"User","phone":"2025550100","password":"local-example-only","tosAgreement":true}'

curl -X POST http://127.0.0.1:4000/api/tokens \
  -H 'Content-Type: application/json' \
  -d '{"phone":"2025550100","password":"local-example-only"}'
```

Copy the returned token's `id` into `TOKEN`, then register a check against this same local server:

```sh
TOKEN='<id from the previous response>'
curl -X POST http://127.0.0.1:4000/api/checks \
  -H 'Content-Type: application/json' -H "token: $TOKEN" \
  -d '{"protocol":"http","url":"127.0.0.1:4000/ping","method":"get","successCodes":[200],"timeoutSeconds":2}'
```

The worker discovers checks every minute. Use the returned check ID to read its latest persisted state:

```sh
curl 'http://127.0.0.1:4000/api/checks?id=<check-id>' -H "token: $TOKEN"
curl 'http://127.0.0.1:4000/api/users?phone=2025550100' -H "token: $TOKEN"
```

| Resource | Methods | Identification |
| --- | --- | --- |
| `/api/users` | POST, GET, PUT, DELETE | `phone` in query for GET/DELETE; body for writes |
| `/api/tokens` | POST, GET, PUT, DELETE | POST uses phone/password; other operations use token `id` |
| `/api/checks` | POST, GET, PUT, DELETE | `id` in query for GET/DELETE; body for PUT |

Protected user/check operations use the custom `token` request header. Tokens expire after one hour. A user can own up to five checks. Check timeouts range from one to five seconds; methods are `get`, `post`, `put` and `delete`. This is a deliberately small API, with no request-body configuration for the probed endpoint.

## How it works

- `lib/server.js`: built-in HTTP/optional HTTPS, JSON-object parsing and a 64 KiB request-body limit.
- `lib/handlers.js`: user/session/check lifecycle, ownership and expiration checks.
- `lib/data.js`: exclusive creation and atomic file replacement, with validated storage keys.
- `lib/workers.js`: minute-based probes, response draining, timeout cleanup, persisted state and transition alerts. The first observation establishes a baseline without sending an alert.
- `lib/logs.js`: append-only check logs and daily gzip/base64 rotation.

Passwords are salted with scrypt; session identifiers use cryptographic randomness. The refresh removes the original committed data, logs and certificate/key files and replaces embedded service credentials with environment configuration. **Deletion does not remove Git history or revoke credentials: rotate any previously committed credentials that were ever valid.** Historical HMAC password records are not compatible with the new format; recreate disposable legacy accounts rather than copying the old data.

## Verification

```sh
npm test
```

The Node.js test runner exercises the real HTTP user/session/check lifecycle, expired-session rejection, required fields, storage-key validation, password verification, request-size limits, cascading deletion, custom-port probing and timeout cleanup. Tests use isolated temporary storage and local probe servers, not Twilio or external websites. CI runs the same suite on Node.js 24.

## Deliberate limits

Run this on a **trusted local network**, not as a public multi-tenant service. Users choose probe destinations, and this prototype does not implement network-egress/SSRF policy, rate limiting, distributed scheduling, delivery retries or a production account-recovery flow.

Atomic file replacement prevents readers seeing truncated JSON; it does **not** make read-modify-write operations transactional. Concurrent writes can still overwrite each other, and multi-file operations can partially fail. Synchronous password derivation also blocks the event loop. A production evolution would use async derivation, a transactional datastore, a durable work queue, outbound network controls, structured observability and an explicit alert-delivery policy.
