const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
});

// IP geolocation
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

// Discord lookup
app.get('/api/discord/:id', async (req, res) => {
    const id = req.params.id;
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        return res.json({ error: 'Discord token not configured' });
    }
    try {
        const response = await fetch(`https://discord.com/api/v9/users/${id}`, {
            headers: { Authorization: `Bot ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
            res.json({
                id: data.id,
                username: data.username,
                discriminator: data.discriminator,
                created_at: new Date((data.id >> 22) + 1420070400000).toISOString().split('T')[0],
                avatar_url: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null
            });
        } else {
            res.json({ error: data.message || 'User not found' });
        }
    } catch (err) {
        res.json({ error: err.message });
    }
});

// Breach check
app.get('/api/breach/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`);
        if (response.status === 404) {
            return res.json({ breaches: [] });
        }
        const breaches = await response.json();
        res.json({ breaches });
    } catch (err) {
        res.json({ error: err.message });
    }
});

// Username search (simplified)
app.get('/api/username/:username', async (req, res) => {
    const username = req.params.username;
    const platforms = [
        { name: 'GitHub', url: `https://github.com/${username}` },
        { name: 'Twitter', url: `https://twitter.com/${username}` },
        { name: 'Reddit', url: `https://reddit.com/user/${username}` }
    ];
    const results = [];
    for (const p of platforms) {
        try {
            const r = await fetch(p.url, { method: 'HEAD' });
            results.push({ name: p.name, url: p.url, exists: r.ok });
        } catch {
            results.push({ name: p.name, url: p.url, exists: false });
        }
    }
    res.json({ username, profiles: results, total: platforms.length });
});

// Email OSINT (placeholder)
app.get('/api/email-osint/:email', async (req, res) => {
    res.json({ email: req.params.email, breach_count: 0, socials: [] });
});

app.listen(PORT, () => {
    console.log(`OSINT API running on port ${PORT}`);
});
