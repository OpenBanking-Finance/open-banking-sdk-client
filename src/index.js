import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.CLIENT_ADAPTER_PORT || 4000;
const HUB_URL = process.env.HUB_URL || 'http://127.0.0.1:3000';

app.use(cors());
app.use(express.json());

/**
 * CLIENT ADAPTER ENDPOINTS
 */

// 1. List available banks from Hub
app.get('/api/banks', async (req, res) => {
    console.log('GET /api/banks - Fetching banks from Hub...');
    try {
        const response = await axios.get(`${HUB_URL}/banks`);
        console.log(`GET /api/banks - Success: ${response.data.length} banks found`);
        res.json(response.data);
    } catch (err) {
        console.error(`GET /api/banks - Error connecting to Hub at ${HUB_URL}:`, err.message);
        res.status(502).json({ error: 'Hub communication failed', details: err.message });
    }
});

// 2. Initiate Consent Flow
app.post('/api/connect', async (req, res) => {
    const { bankId, permissions } = req.body;
    console.log(`POST /api/connect - Initiating consent for bank: ${bankId}`);
    try {
        const response = await axios.post(`${HUB_URL}/consents`, {
            bank_id: bankId,
            permissions: permissions || ['ACCOUNTS_READ', 'TRANSACTIONS_READ']
        });
        console.log(`POST /api/connect - Consent created successfully. ID: ${response.data.id}`);
        res.json(response.data); // Returns { redirect_url, id }
    } catch (err) {
        console.error(`POST /api/connect - Error creating consent at Hub:`, err.message);
        if (err.response) {
            console.error('Hub Response Error:', err.response.data);
        }
        res.status(502).json({ error: 'Failed to create consent at Hub', details: err.message });
    }
});

// 3. Get Accounts (Proxy)
app.get('/api/accounts', async (req, res) => {
    const { consentId } = req.query;
    console.log(`GET /api/accounts - Fetching accounts for consentId: ${consentId}`);
    if (!consentId) return res.status(400).json({ error: 'consentId required' });

    try {
        const response = await axios.get(`${HUB_URL}/accounts?consentId=${consentId}`);
        console.log(`GET /api/accounts - Success: ${response.data.length || 1} accounts found`);
        res.json(response.data);
    } catch (err) {
        console.error(`GET /api/accounts - Error:`, err.message);
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Communication error' });
    }
});

// 4. Get Transactions (Proxy)
app.get('/api/accounts/:accountId/transactions', async (req, res) => {
    const { accountId } = req.params;
    const { consentId } = req.query;
    console.log(`GET /api/transactions - Fetching transactions for account: ${accountId}`);

    try {
        const response = await axios.get(`${HUB_URL}/accounts/${accountId}/transactions?consentId=${consentId}`);
        console.log(`GET /api/transactions - Success: ${response.data.length || 0} transactions found`);
        res.json(response.data);
    } catch (err) {
        console.error(`GET /api/transactions - Error:`, err.message);
        res.status(502).json({ error: 'Communication error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Open Banking Client Adapter active on port ${PORT}`);
    console.log(`🔗 Connected to Hub at: ${HUB_URL}`);
});
