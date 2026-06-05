const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Discord lookup (requires bot token – get from Discord Developer Portal)
app.get('/api/discord/:id', async (req, res) => {
    const id = req.params.id;
    const token = process.env.DISCORD_BOT_TOKEN; // Set in environment
    if (!token) return res.json({ error: 'Discord token not configured', id });
    try {
        const r = await fetch(`https://discord.com/api/v9/users/${id}`, {
            headers: { Authorization: `Bot ${token}` }
        });
        const data = await r.json();
        if (r.status === 200) {
            res.json({
                id: data.id,
                username: data.username,
                discriminator: data.discriminator,
                created_at: new Date((data.id >> 22) + 1420070400000).toISOString().split('T')[0],
                avatar_url: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : null,
                bio: data.bio || null
            });
        } else {
            res.json({ error: data.message || 'User not found' });
        }
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Breach check via HaveIBeenPwned (no key required for basic, but limited)
app.get('/api/breach/:email', async (req, res) => {
    const email = req.params.email;
    try {
        const r = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`);
        if (r.status === 404) return res.json({ breaches: [] });
        const breaches = await r.json();
        res.json({ breaches });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Email OSINT (mock – integrate Hunter.io or similar)
app.get('/api/email-osint/:email', async (req, res) => {
    res.json({ email: req.params.email, breach_count: 0, socials: [] });
});

// Username search across 50 platforms (simplified)
const platforms = [
    { name: 'GitHub', url: u => `https://github.com/${u}` },
    { name: 'Twitter', url: u => `https://twitter.com/${u}` },
    { name: 'Reddit', url: u => `https://reddit.com/user/${u}` }
];
app.get('/api/username/:username', async (req, res) => {
    const username = req.params.username;
    const results = await Promise.all(platforms.map(async p => {
        const url = p.url(username);
        try {
            const r = await fetch(url, { method: 'HEAD' });
            return { name: p.name, url, exists: r.ok };
        } catch { return { name: p.name, url, exists: false }; }
    }));
    res.json({ username, profiles: results, total: platforms.length });
});

// IP geolocation (free ip-api.com)
app.get('/api/ip/:ip', async (req, res) => {
    const ip = req.params.ip;
    const r = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await r.json();
    res.json(data);
});

app.listen(PORT, () => console.log(`OSINT API on port ${PORT}`));
