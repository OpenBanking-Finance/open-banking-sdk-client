export class OpenBankingClient {
    /**
     * Creates an instance of the Open Banking Client SDK
     * @param {Object} config
     * @param {string} config.hubUrl - The base URL of the Open Banking Hub (e.g., 'http://127.0.0.1:3000')
     */
    constructor(config) {
        if (!config || !config.hubUrl) {
            throw new Error('OpenBankingClient: hubUrl is required in the configuration object.');
        }
        this.hubUrl = config.hubUrl;
    }

    /**
     * Internal helper for fetching data with better error handling
     */
    async _fetch(url, options = {}) {
        const response = await fetch(url, options);
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: response.statusText };
            }
            const message = errorData.message || errorData.error || response.statusText;
            console.error(`[SDK] Request failed: ${response.status} - ${message}`);
            throw new Error(`OpenBankingError: ${message}`);
        }
        return response.json();
    }

    /**
     * Fetches the list of all connected banks from the Hub Directory.
     * @returns {Promise<Array>} Array of bank objects { id, name, api_url }
     */
    async getBanks() {
        console.log(`[SDK] Fetching banks from ${this.hubUrl}/banks...`);
        const data = await this._fetch(`${this.hubUrl}/banks`);
        console.log(`[SDK] Successfully fetched ${data.length} banks.`);
        return data;
    }

    /**
     * Initiates the consent flow for a specific bank.
     * @param {string} bankId - The ID of the bank to connect to.
     * @param {Array<string>} permissions - List of permissions (e.g., ['ACCOUNTS_READ', 'TRANSACTIONS_READ'])
     * @returns {Promise<Object>} Object containing the `redirect_url` to send the user to.
     */
    async createConsent(bankId, permissions = ['ACCOUNTS_READ', 'TRANSACTIONS_READ']) {
        console.log(`[SDK] Creating consent for bank ${bankId}...`);
        const data = await this._fetch(`${this.hubUrl}/consents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions, bank_id: bankId })
        });
        console.log(`[SDK] Consent created. Redirect URL: ${data.redirect_url}`);
        return data;
    }

    /**
     * Fetches the status of a specific consent.
     * @param {string} consentId 
     * @returns {Promise<Object>} The consent object from the Hub
     */
    async getConsent(consentId) {
        if (!consentId) throw new Error('consentId is required.');
        console.log(`[SDK] Fetching status for consent ${consentId}...`);
        return this._fetch(`${this.hubUrl}/consents/${consentId}`);
    }

    /**
     * Fetches accounts authorized by the user.
     * @param {string} consentId - The Consent ID returned by the Hub after the user authorizes.
     * @returns {Promise<Object>} Object containing `accounts` array and `bank` name.
     */
    async getAccounts(consentId) {
        if (!consentId) throw new Error('consentId is required to fetch accounts.');
        console.log(`[SDK] Fetching accounts for consent ${consentId}...`);
        return this._fetch(`${this.hubUrl}/accounts?consentId=${consentId}`);
    }

    /**
     * Fetches transactions for a specific account.
     * @param {string} accountId - The ID of the account.
     * @param {string} consentId - The Consent ID associated with the account.
     * @returns {Promise<Object>} Object containing a `transactions` array.
     */
    async getTransactions(accountId, consentId) {
        if (!accountId || !consentId) throw new Error('accountId and consentId are required.');
        console.log(`[SDK] Fetching transactions for account ${accountId}...`);
        return this._fetch(`${this.hubUrl}/accounts/${accountId}/transactions?consentId=${consentId}`);
    }
}
