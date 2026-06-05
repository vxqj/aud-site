const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.get('/api/test', (req, res) => res.json({ status: 'ok' }));

app.get('/api/ip/:ip', async (req, res) => {
    const ip = req.params.ip;
    try {
        const r = await fetch(`http://ip-api.com/json/${ip}`);
        const data = await r.json();
        res.json(data);
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.get('/api/discord/:id', async (req, res) => {
    const id = req.params.id;
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return res.json({ error: 'Discord token not configured' });
    try {
        const r = await fetch(`https://discord.com/api/v9/users/${id}`, {
            headers: { Authorization: `Bot ${token}` }
        });
        const data = await r.json();
        if (r.ok) {
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

app.get('/api/breach/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const r = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`);
        if (r.status === 404) return res.json({ breaches: [] });
        const breaches = await r.json();
        res.json({ breaches });
    } catch (err) {
        res.json({ error: err.message });
    }
});

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

app.get('/api/email-osint/:email', async (req, res) => {
    res.json({ email: req.params.email, breach_count: 0, socials: [] });
});

app.listen(PORT, () => console.log(`OSINT API on port ${PORT}`));
