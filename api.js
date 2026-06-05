const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS for frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ============= DISCORD API =============
let discordToken = process.env.DISCORD_BOT_TOKEN || null;

app.get('/api/discord/:id', async (req, res) => {
    const id = req.params.id;
    if (!discordToken) return res.json({ error: 'Discord token not configured. Set DISCORD_BOT_TOKEN environment variable.' });
    try {
        const response = await fetch(`https://discord.com/api/v9/users/${id}`, {
            headers: { Authorization: `Bot ${discordToken}` }
        });
        if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            return res.json({ error: `Rate limited. Retry after ${retryAfter} seconds.` });
        }
        const data = await response.json();
        if (response.ok) {
            const createdTimestamp = (BigInt(data.id) >> 22n) + 1420070400000n;
            res.json({
                id: data.id,
                username: data.username,
                discriminator: data.discriminator,
                global_name: data.global_name,
                avatar_url: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null,
                banner_url: data.banner ? `https://cdn.discordapp.com/banners/${data.id}/${data.banner}.png` : null,
                bio: data.bio,
                public_flags: data.public_flags,
                created_at: new Date(Number(createdTimestamp)).toISOString().split('T')[0]
            });
        } else {
            res.json({ error: data.message || 'User not found' });
        }
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.get('/api/discord/reset-token', (req, res) => {
    discordToken = process.env.DISCORD_BOT_TOKEN;
    res.json({ message: 'Token reset. Make sure DISCORD_BOT_TOKEN is set in environment.' });
});

// ============= BREACH API (HaveIBeenPwned) =============
app.get('/api/breach/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`, {
            headers: { 'hibp-api-key': process.env.HIBP_API_KEY || '' }
        });
        if (response.status === 404) return res.json({ breaches: [] });
        if (response.status === 429) return res.json({ error: 'Rate limited. Try again in a few seconds.' });
        const breaches = await response.json();
        res.json({ breaches });
    } catch (err) {
        res.json({ error: err.message });
    }
});

// ============= EMAIL OSINT (mock - integrate Hunter, EmailRep, etc.) =============
app.get('/api/email-osint/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const breachRes = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`);
        const breaches = breachRes.status === 200 ? await breachRes.json() : [];
        res.json({
            email: email,
            breach_count: breaches.length,
            breaches: breaches.slice(0, 5),
            socials: [],
            reputation: 'unknown'
        });
    } catch (err) {
        res.json({ email: email, breach_count: 0, socials: [], error: err.message });
    }
});

// ============= USERNAME SEARCH (50+ platforms) =============
const usernamePlatforms = [
    { name: 'GitHub', url: u => `https://github.com/${u}` },
    { name: 'Twitter', url: u => `https://twitter.com/${u}` },
    { name: 'Reddit', url: u => `https://reddit.com/user/${u}` },
    { name: 'Instagram', url: u => `https://instagram.com/${u}` },
    { name: 'YouTube', url: u => `https://youtube.com/@${u}` },
    { name: 'Twitch', url: u => `https://twitch.tv/${u}` },
    { name: 'TikTok', url: u => `https://tiktok.com/@${u}` },
    { name: 'Telegram', url: u => `https://t.me/${u}` },
    { name: 'Pinterest', url: u => `https://pinterest.com/${u}` },
    { name: 'Spotify', url: u => `https://open.spotify.com/user/${u}` },
    { name: 'Medium', url: u => `https://medium.com/@${u}` },
    { name: 'DeviantArt', url: u => `https://deviantart.com/${u}` },
    { name: 'Tumblr', url: u => `https://${u}.tumblr.com` },
    { name: 'Steam', url: u => `https://steamcommunity.com/id/${u}` },
    { name: 'HackerNews', url: u => `https://news.ycombinator.com/user?id=${u}` },
    { name: 'Keybase', url: u => `https://keybase.io/${u}` },
    { name: 'GitLab', url: u => `https://gitlab.com/${u}` },
    { name: 'BitBucket', url: u => `https://bitbucket.org/${u}` },
    { name: 'Chess.com', url: u => `https://chess.com/member/${u}` },
    { name: 'Codecademy', url: u => `https://codecademy.com/profiles/${u}` },
    { name: 'Replit', url: u => `https://replit.com/@${u}` },
    { name: 'VK', url: u => `https://vk.com/${u}` },
    { name: 'Fiverr', url: u => `https://fiverr.com/${u}` },
    { name: 'Behance', url: u => `https://behance.net/${u}` },
    { name: 'Imgur', url: u => `https://imgur.com/user/${u}` },
    { name: 'Pastebin', url: u => `https://pastebin.com/u/${u}` },
    { name: 'About.me', url: u => `https://about.me/${u}` },
    { name: 'Quora', url: u => `https://quora.com/profile/${u}` },
    { name: 'Roblox', url: u => `https://roblox.com/user.aspx?username=${u}` },
    { name: 'Snapchat', url: u => `https://snapchat.com/add/${u}` }
];

app.get('/api/username/:username', async (req, res) => {
    const username = req.params.username;
    const results = [];
    const timeout = 2000;
    
    for (const platform of usernamePlatforms) {
        const url = platform.url(username);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            results.push({ name: platform.name, url: url, exists: response.ok });
        } catch (err) {
            results.push({ name: platform.name, url: url, exists: false });
        }
    }
    res.json({ username, profiles: results, total: usernamePlatforms.length });
});

// ============= IP GEOLOCATION =============
app.get('/api/ip/:ip', async (req, res) => {
    const ip = req.params.ip;
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.get('/api/ip/my', async (req, res) => {
    try {
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

// ============= PHONE LOOKUP (using free API) =============
app.get('/api/phone/:number', async (req, res) => {
    const number = req.params.number;
    try {
        const response = await fetch(`https://api.apilayer.com/number_verification/validate?number=${number}`, {
            headers: { 'apikey': process.env.PHONE_API_KEY || '' }
        });
        if (response.status === 401) {
            return res.json({ error: 'Phone API key not configured', number: number, country: 'Unknown', carrier: 'Unknown', line_type: 'Unknown', valid: false });
        }
        const data = await response.json();
        res.json({
            number: number,
            country: data.country_name || 'Unknown',
            carrier: data.carrier || 'Unknown',
            line_type: data.line_type || 'Unknown',
            valid: data.valid || false
        });
    } catch (err) {
        res.json({ number: number, country: 'Unknown', carrier: 'Unknown', line_type: 'Unknown', valid: false, error: err.message });
    }
});

// ============= DOMAIN WHOIS (using whois-api) =============
app.get('/api/domain/:domain', async (req, res) => {
    const domain = req.params.domain;
    try {
        const response = await fetch(`https://whoisjson.com/api/v1/whois?domain=${domain}`);
        const data = await response.json();
        res.json({
            domain: domain,
            registrar: data.registrar || 'Unknown',
            creation_date: data.created_date || 'Unknown',
            expiration_date: data.expiration_date || 'Unknown',
            name_servers: data.name_servers || [],
            registrant: data.registrant || null
        });
    } catch (err) {
        res.json({ domain: domain, error: err.message });
    }
});

// ============= DNS LOOKUP =============
const dns = require('dns').promises;
app.get('/api/domain/:domain/dns', async (req, res) => {
    const domain = req.params.domain;
    const records = {};
    const types = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME'];
    for (const type of types) {
        try {
            const result = await dns.resolve(domain, type);
            records[type] = result;
        } catch (err) {
            records[type] = [];
        }
    }
    res.json({ domain: domain, records: records });
});

// ============= START SERVER =============
app.listen(PORT, () => {
    console.log(`OSINT API running on port ${PORT}`);
    console.log(`Discord token: ${discordToken ? 'Configured' : 'NOT SET'}`);
});
