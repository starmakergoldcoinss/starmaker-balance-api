const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Render अपने आप PORT असाइन करता है
const PORT = process.env.PORT || 3000;

app.get('/api/balance', async (req, res) => {
    // URL query से ID लें, वर्ना डिफ़ॉल्ट ID इस्तेमाल करें
    const userId = req.query.id || "13380988276";
    
    // हर रिक्वेस्ट पर नया टाइमस्टैम्प जनरेट करना बेहतर रहता है
    const ts = Math.floor(Date.now() / 1000).toString(); 

    const url = "https://pay.starmakerstudios.com/rapid/user";
    
    const params = {
        category: "6",
        id: userId,
        ts: ts
    };

    const headers = {
        'User-Agent': "Mozilla/5.0 (Linux; U; Android 14; en-in; SM-E546B Build/UP1A.231005.007) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36 HeyTapBrowser/45.11.5.1",
        'Accept': "application/json, text/plain, */*",
        'origin': "https://m.starmakerstudios.com",
        'sec-fetch-site': "same-site",
        'sec-fetch-mode': "cors",
        'sec-fetch-dest': "empty",
        'referer': "https://m.starmakerstudios.com/",
        'accept-language': "en-IN,en-US;q=0.9,en;q=0.8"
    };

    try {
        const response = await axios.get(url, { params, headers });
        const data = response.data;

        // API के असली स्ट्रक्चर के हिसाब से डेटा निकालें
        const userInfo = data.data || data.user || data;
        
        // रिस्पॉन्स तैयार करें
        const customResponse = {
            status: "success",
            user_id: userId,
            balance: {
                gold_coins: userInfo.gold_coin || userInfo.gold || 0,
                silver_coins: userInfo.silver_coin || userInfo.silver || 0,
                diamonds: userInfo.diamond || userInfo.diamonds || 0
            },
            // मैंने raw_data भी डाल दिया है ताकि अगर keys का नाम अलग हो तो आप JSON में देख सकें
            raw_data: data 
        };

        res.json(customResponse);
    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Failed to fetch data from StarMaker API",
            details: error.message
        });
    }
});

// होमपेज राउट (ताकि Render पर "Not Found" न दिखे)
app.get('/', (req, res) => {
    res.send('StarMaker Balance API is running! Go to /api/balance?id=YOUR_ID to check balance.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
