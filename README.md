# Open Banking Client Adapter 📲🛡️

The **Open Banking Client Adapter** is a specialized gateway service for FinTech applications and Third-Party Providers (TPPs). It acts as a secure intermediary between your front-end (Web/Mobile) and the Open Banking Hub.

## Why use a Client Adapter?

1.  **Security**: Keeps sensitive Hub communication logic on the server-side.
2.  **Abstraction**: Simplifies complex Hub API calls into clean endpoints for your App.
3.  **Portability**: Allows multiple front-ends (iOS, Android, Web) to use a single unified gateway.

## 📦 Setup

### 1. Install Dependencies
```bash
cd sdk-client
npm install
```

### 2. Configure Environment
Create a `.env` file:
```env
CLIENT_ADAPTER_PORT=4000
HUB_URL=http://your-hub-url:3000
```

### 3. Start the Adapter
```bash
npm start
```

## 🛠️ API Reference (For your App)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/banks` | GET | List available banks from the Hub Directory. |
| `/api/connect` | POST | Initiate a consent flow (Returns a `redirect_url`). |
| `/api/accounts` | GET | Fetch authorized accounts (Requires `consentId`). |
| `/api/accounts/:id/transactions` | GET | Fetch transaction history for an account. |

## 📄 License
Apache-2.0
