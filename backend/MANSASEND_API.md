# MansaSend API — what MansaRent expects

MansaRent is a **merchant** on MansaSend. MansaSend needs these 5 endpoints.
All amounts are integers in **GNF**. All bodies are JSON.

## Authentication (every request)

```
Authorization: Bearer <MANSASEND_API_KEY>
X-Merchant-Id: <MANSASEND_MERCHANT_ID>
Idempotency-Key: <reference>      (on POSTs — same key twice = return the first result, never charge/pay twice)
```

Errors: any non-2xx status with `{ "error": "message" }`.

---

## 1. Create a checkout — `POST /v1/checkouts`

Request
```json
{
  "amount": 1100000,
  "currency": "GNF",
  "reference": "MR-AB12CD34-9F3E1A",
  "description": "MansaRent · Villa Kipé · 2 nuit(s)",
  "return_url": "https://app.mansarent.../?payment=<bookingId>",
  "callback_url": "https://api.mansarent.../api/payments/callback?ref=...&t=...",
  "customer": { "name": "…", "email": "…", "phone": "…" }
}
```
Response `201`
```json
{ "id": "chk_123", "checkout_url": "https://pay.mansasend.com/chk_123", "status": "pending" }
```
MansaRent sends the guest to `checkout_url`. There the guest pays with Orange Money, MTN MoMo or card. Afterwards, MansaSend redirects the guest to `return_url`.

## 2. Get a checkout — `GET /v1/checkouts/{id}`

```json
{ "id": "chk_123", "status": "succeeded", "amount": 1100000, "method": "om" }
```
- `status`: `pending` | `succeeded` | `failed` | `expired` | `cancelled`
- `method`: `om` | `momo` | `card`

MansaRent always calls this endpoint to confirm a payment. It never trusts the callback body alone.

## 3. Callback (MansaSend → MansaRent)

When a checkout reaches a final status, `POST` to the exact `callback_url` (keep its query string):
```json
{ "id": "chk_123", "status": "succeeded", "amount": 1100000, "method": "om" }
```
Header: `X-MansaSend-Signature: <hex HMAC-SHA256 of the raw body, key = MANSASEND_WEBHOOK_SECRET>`

If MansaRent doesn't answer `200`, retry with backoff (for example 1 min, 5 min, 30 min, then 2 h, for up to 24 h).

## 4. Payout to a host — `POST /v1/payouts`

```json
{ "amount": 985000, "currency": "GNF", "method": "om", "phone": "+224620000000",
  "reference": "<payoutId>", "description": "MansaRent · Villa Kipé" }
```
Response
```json
{ "id": "po_123", "status": "processing" }
```
- `method`: `om` | `momo`
- `status`: `processing` | `succeeded` | `failed` | `rejected`

## 5. Refund a guest — `POST /v1/refunds`

```json
{ "checkout_id": "chk_123", "amount": 1100000, "reference": "<payoutId>", "reason": "Annulé par l'hôte" }
```
Response
```json
{ "id": "rf_123", "status": "succeeded" }
```

---

## Settings in MansaRent (Admin → Integrations → MansaSend)

| Key | Meaning |
|---|---|
| MANSASEND_API_URL | e.g. `https://api.mansasend.com` (a sandbox URL while testing) |
| MANSASEND_MERCHANT_ID | MansaRent's merchant account |
| MANSASEND_API_KEY | secret API key |
| MANSASEND_WEBHOOK_SECRET | used to sign callbacks |
| MANSASEND_PAYOUTS | `on` (default) or `off` = admin sends payouts and refunds by hand |
| PAY_FEE_MOBILE_PCT / PAY_FEE_CARD_PCT / PAY_FEE_PAYOUT_PCT | fees deducted from the host's share |

While the API URL, merchant ID and API key are empty, MansaRent stays in **pay on arrival** mode.
