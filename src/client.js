export class OpenBankingClient {
  constructor({ baseUrl }) {
    this.baseUrl = baseUrl
  }

  async _fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`
    const method = options.method || 'GET'
    console.log(`[SDK] Request: ${method} ${url}`)
    
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      })
      
      console.log(`[SDK] Response Status: ${res.status} (${res.ok ? 'OK' : 'Error'})`)
      
      const data = await res.json()
      if (!res.ok) {
        console.error(`[SDK] Request Failed:`, data)
        throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data })
      }
      return data
    } catch (err) {
      if (err.name === 'FetchError' || err.message.includes('fetch')) {
        console.error(`[SDK] Network/Connection Error: ${err.message}`)
      }
      throw err
    }
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
