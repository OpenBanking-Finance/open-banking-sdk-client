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
    try {
        const response = await axios.get(`${HUB_URL}/banks`);
        res.json(response.data);
    } catch (err) {
        res.status(502).json({ error: 'Hub communication failed' });
    }
});

// 2. Initiate Consent Flow
app.post('/api/connect', async (req, res) => {
    const { bankId, permissions } = req.body;
    try {
        const response = await axios.post(`${HUB_URL}/consents`, {
            bank_id: bankId,
            permissions: permissions || ['ACCOUNTS_READ', 'TRANSACTIONS_READ']
        });
        res.json(response.data); // Returns { redirect_url, id }
    } catch (err) {
        res.status(502).json({ error: 'Failed to create consent at Hub' });
    }
});

// 3. Get Accounts (Proxy)
app.get('/api/accounts', async (req, res) => {
    const { consentId } = req.query;
    if (!consentId) return res.status(400).json({ error: 'consentId required' });

    try {
        const response = await axios.get(`${HUB_URL}/accounts?consentId=${consentId}`);
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Communication error' });
    }
});

// 4. Get Transactions (Proxy)
app.get('/api/accounts/:accountId/transactions', async (req, res) => {
    const { accountId } = req.params;
    const { consentId } = req.query;

    try {
        const response = await axios.get(`${HUB_URL}/accounts/${accountId}/transactions?consentId=${consentId}`);
        res.json(response.data);
    } catch (err) {
        res.status(502).json({ error: 'Communication error' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Open Banking Client Adapter active on port ${PORT}`);
    console.log(`🔗 Connected to Hub at: ${HUB_URL}`);
});
