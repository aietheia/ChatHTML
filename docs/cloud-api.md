# ChatHTML Cloud API Contract

The ChatHTML frontend can run against the local open-source backend or a hosted
Cloud backend. The hosted implementation can be private, but these HTTP shapes
are public so the frontend remains open.

## Runtime Capabilities

`GET /api/settings` may include:

```json
{
  "cloud": {
    "enabled": true,
    "authRequired": true,
    "billingEnabled": true,
    "managedProviderEnabled": true,
    "brandName": "ChatHTML Cloud"
  }
}
```

When `cloud.enabled` is absent or false, the frontend hides Cloud login and
billing surfaces.

## Authentication

```txt
GET  /api/auth/me
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
```

`GET /api/auth/me`, successful login, and successful registration return:

```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "user",
    "balanceUsd": "10.0000",
    "balanceMicros": 10000000
  },
  "auth": {
    "available": true,
    "requiresInvite": false,
    "firstUser": false
  }
}
```

Login and registration accept JSON bodies with `email`, `password`, and optional
`inviteCode`.

## Billing

```txt
POST /api/billing/top-up
```

Request:

```json
{ "amountUsd": "10" }
```

Response:

```json
{
  "ok": true,
  "amountMicros": 10000000,
  "amountUsd": "10.0000",
  "balanceMicros": 10000000,
  "balanceUsd": "10.0000"
}
```

## Managed Provider

When the selected provider has `apiKeySource: "managed"`, the frontend sends the
normal `POST /api/chat` payload with serialized API settings. A hosted backend
should authenticate the request, apply billing, use its server-side provider
credentials, and stream the same NDJSON chat events as the local backend.
