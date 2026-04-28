export class OpenBankingClient {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl
  }

  async _fetch(path, options = {}) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    })
    const data = await res.json()
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data })
    return data
  }

  getBanks() {
    return this._fetch('/api/banks')
  }

  createConsent(bankId, permissions = ['ACCOUNTS_READ', 'TRANSACTIONS_READ', 'PAYMENTS_WRITE']) {
    return this._fetch('/api/connect', {
      method: 'POST',
      body: JSON.stringify({ bankId, permissions })
    })
  }

  getAccounts(consentId) {
    return this._fetch(`/api/accounts?consentId=${consentId}`)
  }

  getTransactions(accountId, consentId) {
    return this._fetch(`/api/accounts/${accountId}/transactions?consentId=${consentId}`)
  }

  initiateTransfer({ consentId, amount, currency = 'CVE', debtorAccount, creditorAccount, creditorName }) {
    return this._fetch('/api/transfers', {
      method: 'POST',
      body: JSON.stringify({ consentId, amount, currency, debtorAccount, creditorAccount, creditorName })
    })
  }

  confirmParty(transferId) {
    return this._fetch(`/api/transfers/${transferId}/confirm-party`, { method: 'PUT' })
  }

  confirmQuote(transferId) {
    return this._fetch(`/api/transfers/${transferId}/confirm-quote`, { method: 'PUT' })
  }
}
