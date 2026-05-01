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
    console.log('[Adapter] GET /api/banks - Fetching banks from Hub');
    try {
        const response = await axios.get(`${HUB_URL}/banks`);
        console.log(`[Adapter] Successfully retrieved ${response.data.length} banks`);
        res.json(response.data);
    } catch (err) {
        console.error('[Adapter] Hub communication failed while fetching banks:', err.message);
        res.status(502).json({ error: 'Hub communication failed' });
    }
});

// 2. Initiate Consent Flow
app.post('/api/connect', async (req, res) => {
    const { bankId, permissions } = req.body;
    console.log(`[Adapter] POST /api/connect - Creating consent for bank: ${bankId}`);
    try {
        const response = await axios.post(`${HUB_URL}/consents`, {
            bank_id: bankId,
            permissions: permissions || ['ACCOUNTS_READ', 'TRANSACTIONS_READ']
        });
        console.log('[Adapter] Consent created successfully at Hub');
        res.json(response.data); // Returns { redirect_url, id }
    } catch (err) {
        console.error('[Adapter] Failed to create consent at Hub:', err.message);
        res.status(502).json({ error: 'Failed to create consent at Hub' });
    }
});

// 3. Get Accounts (Proxy)
app.get('/api/accounts', async (req, res) => {
    const { consentId } = req.query;
    console.log(`[Adapter] GET /api/accounts - Fetching accounts for consent: ${consentId}`);
    if (!consentId) {
        console.warn('[Adapter] Missing consentId in request');
        return res.status(400).json({ error: 'consentId required' });
    }

    try {
        const response = await axios.get(`${HUB_URL}/accounts?consentId=${consentId}`);
        console.log(`[Adapter] Successfully retrieved ${response.data.length} accounts`);
        res.json(response.data);
    } catch (err) {
        console.error('[Adapter] Communication error while fetching accounts:', err.message);
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Communication error' });
    }
});

// 4. Get Transactions (Proxy)
app.get('/api/accounts/:accountId/transactions', async (req, res) => {
    const { accountId } = req.params;
    const { consentId } = req.query;
    console.log(`[Adapter] GET /api/accounts/${accountId}/transactions - Fetching transactions (Consent: ${consentId})`);

    try {
        const response = await axios.get(`${HUB_URL}/accounts/${accountId}/transactions?consentId=${consentId}`);
        console.log(`[Adapter] Successfully retrieved ${response.data.length} transactions`);
        res.json(response.data);
    } catch (err) {
        console.error('[Adapter] Communication error while fetching transactions:', err.message);
        res.status(502).json({ error: 'Communication error' });
    }
});

// 5. Iniciar Transferência (Passo 1)
app.post('/api/transfers', async (req, res) => {
    const { consentId, amount, currency, debtorAccount, creditorAccount, creditorName, creditorIdType } = req.body;
    console.log(`[Adapter] POST /api/transfers - Initiating transfer of ${amount} ${currency} to ${creditorName} (idType=${creditorIdType || 'MSISDN'})`);

    if (!consentId || !amount || !creditorAccount) {
        console.warn('[Adapter] Missing required transfer parameters');
        return res.status(400).json({ error: 'consentId, amount and creditorAccount are required' });
    }
    try {
        const response = await axios.post(`${HUB_URL}/transfers`, {
            consentId, amount, currency, debtorAccount,
            creditorAccount, creditorName: creditorName || creditorAccount,
            creditorIdType: creditorIdType || 'MSISDN',
        });
        console.log(`[Adapter] Transfer created successfully. Hub ID: ${response.data.id}`);
        res.status(201).json(response.data);
    } catch (err) {
        console.error('[Adapter] Hub communication failed during transfer initiation:', err.message);
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Hub communication failed' });
    }
});

// 6. Confirmar Destinatário (Passo 2)
app.put('/api/transfers/:id/confirm-party', async (req, res) => {
    const { id } = req.params;
    console.log(`[Adapter] PUT /api/transfers/${id}/confirm-party - Confirming recipient`);
    try {
        const response = await axios.put(`${HUB_URL}/transfers/${id}/confirm-party`);
        console.log(`[Adapter] Recipient confirmed for transfer ${id}`);
        res.json(response.data);
    } catch (err) {
        console.error(`[Adapter] Hub communication failed while confirming party for ${id}:`, err.message);
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Hub communication failed' });
    }
});

// 7. Confirmar Cotação e Executar (Passo 3)
app.put('/api/transfers/:id/confirm-quote', async (req, res) => {
    const { id } = req.params;
    console.log(`[Adapter] PUT /api/transfers/${id}/confirm-quote - Confirming quote and executing`);
    try {
        const response = await axios.put(`${HUB_URL}/transfers/${id}/confirm-quote`);
        console.log(`[Adapter] Transfer ${id} executed successfully`);
        res.json(response.data);
    } catch (err) {
        console.error(`[Adapter] Hub communication failed while confirming quote for ${id}:`, err.message);
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Hub communication failed' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Open Banking Client Adapter active on port ${PORT}`);
    console.log(`🔗 Connected to Hub at: ${HUB_URL}`);
});
