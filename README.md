# Open Banking SDK Client

A two-part package for fintech applications to communicate with the Open Banking Hub:

1. **Server adapter** (`src/index.js`) — an Express HTTP proxy that sits between the browser and the Hub, keeping Hub communication server-side
2. **Browser client** (`src/client.js`) — a vanilla JS class that calls the server adapter from the browser using native `fetch`

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Server Adapter API](#server-adapter-api)
- [Browser Client](#browser-client)
- [Full Transfer Flow Example](#full-transfer-flow-example)

---

## Overview

```
Browser (portal) → OpenBankingClient → sdk-client server → Hub → Bank
                       (src/client.js)    (src/index.js)
```

The server adapter exposes `/api/*` endpoints. The browser client class wraps those endpoints so the fintech app never needs to know the Hub's internal URL.

---

## Getting Started

### Requirements

- Node.js v20+
- A running Hub instance

### Run locally

```bash
cd sdk-client
npm install
cp .env.example .env   # fill in your values
npm run dev
```

Server listens at `http://127.0.0.1:4000` by default.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `CLIENT_ADAPTER_PORT` | `4000` | Port the server adapter listens on |
| `HUB_URL` | `http://127.0.0.1:3000` | Internal URL of the Open Banking Hub |

---

## Server Adapter API

All endpoints proxy to the Hub and return its response directly.

---

### `GET /api/banks`

Returns the list of active banks registered in the Hub directory.

**Proxied Hub request:** `GET {HUB_URL}/banks`

**Response `200`**
```json
[
  {
    "id": "alpha-bank-001",
    "name": "MockBank Alpha",
    "authorise_url": "http://localhost:3001/consents/authorise",
    "api_url": "http://localhost:3001",
    "status": "active"
  }
]
```

---

### `POST /api/connect`

Initiates the consent flow for a bank. Returns a redirect URL the fintech must send the user to.

**Request body**
```json
{
  "bankId": "alpha-bank-001",
  "permissions": ["ACCOUNTS_READ", "TRANSACTIONS_READ", "PAYMENTS_WRITE"]
}
```

| Field | Required | Description |
|---|---|---|
| `bankId` | yes | ID of the bank to connect |
| `permissions` | no | Defaults to `["ACCOUNTS_READ", "TRANSACTIONS_READ"]` |

**Proxied Hub request:** `POST {HUB_URL}/consents`
```json
{ "bank_id": "alpha-bank-001", "permissions": [...] }
```

**Response `201`**
```json
{
  "id": "e8a90abf-...",
  "status": "AWAITING_AUTHORISATION",
  "redirect_url": "http://localhost:3001/consents/authorise?consentId=...&redirect_uri=...",
  "bank_id": "alpha-bank-001",
  "permissions": ["ACCOUNTS_READ", "TRANSACTIONS_READ", "PAYMENTS_WRITE"]
}
```

The fintech must redirect the user's browser to `redirect_url`.

---

### `GET /api/accounts?consentId=<id>`

Fetches the user's bank accounts.

**Query params**
| Param | Required | Description |
|---|---|---|
| `consentId` | yes | UUID of an `AUTHORISED` consent |

**Proxied Hub request:** `GET {HUB_URL}/accounts?consentId={consentId}`

**Response `200`**
```json
{
  "accounts": [
    {
      "id": "acc-alpha-001",
      "accountName": "Conta Corrente",
      "accountType": "SAVINGS",
      "balance": 5420.50,
      "currency": "CVE"
    }
  ],
  "bank": "MockBank Alpha"
}
```

| Status | Reason |
|---|---|
| `400` | Missing `consentId` |
| `403` | Consent not authorised |
| `502` | Hub or bank communication failure |

---

### `GET /api/accounts/:accountId/transactions?consentId=<id>`

Fetches transaction history for an account.

**Proxied Hub request:** `GET {HUB_URL}/accounts/{accountId}/transactions?consentId={consentId}`

**Response `200`**
```json
{
  "transactions": [
    { "id": "tx-001", "description": "Grocery Store", "amount": -150.20, "date": "2026-04-22" },
    { "id": "tx-002", "description": "Salary Deposit", "amount": 3500.00, "date": "2026-04-20" }
  ]
}
```

---

### `POST /api/transfers` — Step 1: Initiate

Starts a Mojaloop 3-step transfer. Requires `PAYMENTS_WRITE` in the user's granted permissions.

**Request body**
```json
{
  "consentId": "e8a90abf-...",
  "amount": 1000.00,
  "currency": "CVE",
  "debtorAccount": "acc-alpha-001",
  "creditorAccount": "acc-beta-002",
  "creditorName": "Maria Souza",
  "creditorIdType": "MSISDN"
}
```

| Field | Required | Description |
|---|---|---|
| `consentId` | yes | UUID of an authorised consent |
| `amount` | yes | Transfer amount |
| `currency` | no | Defaults to `CVE` |
| `debtorAccount` | yes | Source account ID |
| `creditorAccount` | yes | Destination account ID or identifier |
| `creditorName` | yes | Recipient display name |
| `creditorIdType` | no | `MSISDN` (default), `ACCOUNT_ID`, or `BUSINESS` |

**Proxied Hub request:** `POST {HUB_URL}/transfers`

**Response `201`**
```json
{
  "id": "f3a1b2c3-...",
  "status": "INITIATED",
  "mojaloop_transfer_id": "MOCK-1714300000-abc12",
  "party_info": {
    "name": "Maria Souza",
    "account": "acc-beta-002",
    "fspId": "mock-bank-fsp"
  }
}
```

---

### `DELETE /api/consents/:id` — Revoke Consent

Revokes an active consent. Only works for consents in `AWAITING_AUTHORISATION` or `AUTHORISED` status.

**Proxied Hub request:** `DELETE {HUB_URL}/consents/{id}`

**Response `200`**
```json
{ "id": "e8a90abf-...", "status": "REVOKED" }
```

---

### `PUT /api/transfers/:id/confirm-party` — Step 2: Confirm Recipient

Confirms the recipient and retrieves the fee quote.

**Proxied Hub request:** `PUT {HUB_URL}/transfers/{id}/confirm-party`

**Response `200`**
```json
{
  "id": "f3a1b2c3-...",
  "status": "PARTY_CONFIRMED",
  "quote_info": {
    "transferAmount": { "amount": "1000.00", "currency": "CVE" },
    "payeeFspFee": { "amount": "10.00", "currency": "CVE" },
    "expiration": "2026-04-28T12:10:00.000Z"
  }
}
```

---

### `PUT /api/transfers/:id/confirm-quote` — Step 3: Execute

Accepts the quote and executes the transfer.

**Proxied Hub request:** `PUT {HUB_URL}/transfers/{id}/confirm-quote`

**Response `200`**
```json
{ "id": "f3a1b2c3-...", "status": "COMPLETED" }
```

---

## Browser Client

`src/client.js` exports `OpenBankingClient`, a class that wraps all server adapter endpoints using the browser's native `fetch`. It is designed to be imported as an ES module in any browser-based fintech application.

### Instantiation

```js
import { OpenBankingClient } from './node_modules/@open-bank/sdk-client/src/client.js'

const client = new OpenBankingClient({ baseUrl: 'http://localhost:4000' })
```

`baseUrl` is the URL of the running sdk-client server adapter.

### Methods

| Method | Description |
|---|---|
| `getBanks()` | `GET /api/banks` |
| `createConsent(bankId, permissions?)` | `POST /api/connect` |
| `getAccounts(consentId)` | `GET /api/accounts?consentId=` |
| `getTransactions(accountId, consentId)` | `GET /api/accounts/:id/transactions?consentId=` |
| `initiateTransfer(params)` | `POST /api/transfers` |
| `confirmParty(transferId)` | `PUT /api/transfers/:id/confirm-party` |
| `confirmQuote(transferId)` | `PUT /api/transfers/:id/confirm-quote` |

All methods return a Promise that resolves to the parsed JSON response. On a non-2xx status, they throw an error with `.status` and `.data` properties.

### Usage example

```js
// 1. List banks
const banks = await client.getBanks()

// 2. Start consent flow
const consent = await client.createConsent('alpha-bank-001')
// → save consent.id to localStorage, redirect user to consent.redirect_url

// 3. After user returns (consentId from URL or storage)
const { accounts } = await client.getAccounts(consentId)

// 4. Get transactions
const { transactions } = await client.getTransactions(accounts[0].id, consentId)
```

---

## Full Transfer Flow Example

```js
// Step 1 — Initiate
const transfer = await client.initiateTransfer({
  consentId,
  amount: 1000,
  currency: 'CVE',
  debtorAccount: 'acc-alpha-001',
  creditorAccount: 'acc-beta-002',
  creditorName: 'Maria Souza'
})
// transfer.id is the Hub transfer ID
// transfer.party_info shows recipient details

// Step 2 — Show recipient to user, then confirm
const party = await client.confirmParty(transfer.id)
// party.quote_info.payeeFspFee shows the fee to display

// Step 3 — User accepts quote
const result = await client.confirmQuote(transfer.id)
// result.status === 'COMPLETED'
```

---

## License

Apache-2.0
