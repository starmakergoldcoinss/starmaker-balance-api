const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

const STARMAKER_API =
  'https://pay.starmakerstudios.com/rapid/user';

const PROFILE_KEYS = new Set([
  'name', 'nickname', 'username', 'sid', 'uid',
  'userid', 'id', 'level', 'userlevel', 'avatar',
  'avatarurl', 'profilephoto', 'profileimage',
  'imgurl', 'headurl'
]);

const COIN_KEYS = new Set([
  'coin', 'coins', 'coinbalance', 'balancecoin',
  'goldcoin', 'goldcoins', 'walletcoin', 'coinamount'
]);

const DIAMOND_KEYS = new Set([
  'diamond', 'diamonds', 'diamondbalance',
  'balancediamond', 'diamondamount', 'gem', 'gems'
]);

function findValues(obj, wantedKeys, out = {}) {
  if (!obj || typeof obj !== 'object') return out;

  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (
      wantedKeys.has(normalizedKey) &&
      (typeof value === 'string' ||
       typeof value === 'number' ||
       value === null)
    ) {
      out[key] = value;
    }

    if (value && typeof value === 'object') {
      findValues(value, wantedKeys, out);
    }
  }

  return out;
}

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    service: 'StarMaker Account Data API',
    endpoints: [
      '/api/all?id=YOUR_ID',
      '/api/profile?id=YOUR_ID',
      '/api/coins?id=YOUR_ID',
      '/api/diamonds?id=YOUR_ID'
    ]
  });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    version: '1.1.0',
    method: 'GET',
    parameter: 'id'
  });
});

async function getStarMakerData(userId) {
  const params = {
    category: '6',
    id: userId,
    ts: Math.floor(Date.now() / 1000)
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://m.starmakerstudios.com',
    'Referer': 'https://m.starmakerstudios.com/'
  };

  const response = await axios.get(STARMAKER_API, {
    params,
    headers,
    timeout: 15000
  });

  return {
    upstreamStatus: response.status,
    raw: response.data
  };
}

async function handleRequest(req, res, section) {
  const userId = String(req.query.id || '').trim();

  if (!userId) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing ID. Use ?id=YOUR_STARMAKER_ID'
    });
  }

  if (!/^\d+$/.test(userId)) {
    return res.status(400).json({
      status: 'error',
      message: 'ID must contain digits only'
    });
  }

  try {
    const { upstreamStatus, raw } =
      await getStarMakerData(userId);

    const profile = findValues(raw, PROFILE_KEYS);
    const coins = findValues(raw, COIN_KEYS);
    const diamonds = findValues(raw, DIAMOND_KEYS);

    const coinResult = Object.keys(coins).length
      ? coins
      : {
          status: 'unavailable',
          message: 'Coin balance not found in upstream response'
        };

    const diamondResult = Object.keys(diamonds).length
      ? diamonds
      : {
          status: 'unavailable',
          message: 'Diamond balance not found in upstream response'
        };

    const profileResult = Object.keys(profile).length
      ? profile
      : {
          status: 'unavailable',
          message: 'Profile fields not found in upstream response'
        };

    if (section === 'profile') {
      return res.json({
        status: 'success',
        requested_id: userId,
        upstream_status: upstreamStatus,
        profile: profileResult
      });
    }

    if (section === 'coins') {
      return res.json({
        requested_id: userId,
        upstream_status: upstreamStatus,
        coin_balance: coinResult
      });
    }

    if (section === 'diamonds') {
      return res.json({
        requested_id: userId,
        upstream_status: upstreamStatus,
        diamond_balance: diamondResult
      });
    }

    return res.json({
      status: 'success',
      requested_id: userId,
      upstream_status: upstreamStatus,
      profile: profileResult,
      coin_balance: coinResult,
      diamond_balance: diamondResult,
      raw_data: raw
    });

  } catch (error) {
    const upstreamStatus =
      error.response?.status || null;

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
}

app.get('/api/all', (req, res) =>
  handleRequest(req, res, 'all')
);

app.get('/api/profile', (req, res) =>
  handleRequest(req, res, 'profile')
);

app.get('/api/coins', (req, res) =>
  handleRequest(req, res, 'coins')
);

app.get('/api/diamonds', (req, res) =>
  handleRequest(req, res, 'diamonds')
);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    available_routes: [
      '/api/all?id=YOUR_ID',
      '/api/profile?id=YOUR_ID',
      '/api/coins?id=YOUR_ID',
      '/api/diamonds?id=YOUR_ID'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
