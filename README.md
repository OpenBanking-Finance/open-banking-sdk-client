# Open Banking Client SDK (@open-bank/sdk-client) 🚀

A lightweight JavaScript SDK for **FinTechs, Portals, and Third-Party Providers (TPPs)** to easily connect to the Open Banking Hub.

This SDK abstracts the complexities of the Open Banking API, allowing you to quickly build financial applications that fetch bank directories, initiate consent flows, and retrieve account/transaction data.

## 📦 Installation

Since this package is part of the `open-bank` monorepo, you can link it locally or install it via your package manager when published.

```bash
npm install @open-bank/sdk-client
```

## 🛠️ Usage Example

Here is how you can use the SDK in your web application:

```javascript
import { OpenBankingClient } from '@open-bank/sdk-client';

// 1. Initialize the SDK with the Hub URL
const obClient = new OpenBankingClient({
    hubUrl: 'http://127.0.0.1:3000'
});

// 2. Fetch available banks
const banks = await obClient.getBanks();
console.log('Available Banks:', banks);

// 3. Initiate consent (Redirect user to bank)
const { redirect_url } = await obClient.createConsent(banks[0].id);
window.location.href = redirect_url;

// ... After the user returns from the bank with a `consentId` ...

// 4. Fetch accounts using the consentId
const data = await obClient.getAccounts('received_consent_id');
console.log('User Accounts:', data.accounts);

// 5. Fetch transactions for a specific account
const txData = await obClient.getTransactions(data.accounts[0].id, 'received_consent_id');
console.log('Transactions:', txData.transactions);
```

## 🔐 API Reference

- `getBanks()`: Returns an array of registered banks.
- `createConsent(bankId, permissions)`: Starts the authorization flow.
- `getAccounts(consentId)`: Fetches authorized accounts.
- `getTransactions(accountId, consentId)`: Fetches transactions for an account.

## 📄 License
Apache-2.0
