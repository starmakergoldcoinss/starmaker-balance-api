const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const STARMAKER_API = 'https://pay.starmakerstudios.com/rapid/user';

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'StarMaker Balance API is running',
        endpoint: '/api/balance?id=YOUR_ID'
    });
});

// API information
app.get('/api', (req, res) => {
    res.json({
        status: 'success',
        service: 'StarMaker Balance API',
        version: '1.0.1',
        endpoint: '/api/balance',
        method: 'GET',
        parameter: 'id'
    });
});

// Balance lookup
app.get('/api/balance', async (req, res) => {
    const userId = String(req.query.id || '').trim();

    if (!userId) {
        return res.status(400).json({
            status: 'error',
            message: 'Missing ID. Use /api/balance?id=160008'
        });
    }

    if (!/^\d+$/.test(userId)) {
        return res.status(400).json({
            status: 'error',
            message: 'ID must contain digits only'
        });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const params = {
        category: '6',
        id: userId,
        ts: timestamp
    };

    const headers = {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://m.starmakerstudios.com',
        'Referer': 'https://m.starmakerstudios.com/'
    };

    try {
        const response = await axios.get(STARMAKER_API, {
            params,
            headers,
            timeout: 15000
        });

        const data = response.data;

        return res.json({
            status: 'success',
            requested_id: userId,
            upstream_status: response.status,
            data: data
        });

    } catch (error) {
        const upstreamStatus = error.response?.status || null;

        console.error('StarMaker API error:', {
            id: userId,
            status: upstreamStatus,
            message: error.message
        });

        return res.status(502).json({
            status: 'error',
            requested_id: userId,
            message: 'Unable to retrieve data from StarMaker API',
            upstream_status: upstreamStatus,
            details: error.code || error.message
        });
    }
});

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        available_routes: [
            '/',
            '/api',
            '/api/balance?id=160008'
        ]
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
