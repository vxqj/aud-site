const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Discord lookup (fake example - real requires bot token)
app.get('/api/discord/:id', async (req, res) => {
    const id = req.params.id;
    // Real implementation uses Discord API with bot token
    res.json({ id, username: "ExampleUser", discriminator: "1234", created_at: "2023-01-01", avatar: null });
});

// Breach check via HaveIBeenPwned (free API)
app.get('/api/breach/:email', async (req, res) => {
    const email = req.params.email;
    const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${email}`, {
        headers: { 'hibp-api-key': 'YOUR_FREE_KEY' } // Get from haveibeenpwned.com
    });
    const breaches = response.status === 200 ? await response.json() : [];
    res.json({ email, breaches });
});

// IP geolocation (free ip-api.com)
app.get('/api/ip/:ip', async (req, res) => {
    const ip = req.params.ip;
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    res.json(data);
});

// Username search across platforms (simplified)
app.get('/api/username/:username', async (req, res) => {
    const username = req.params.username;
    const platforms = [
        { name: "GitHub", url: `https://github.com/${username}` },
        { name: "Twitter", url: `https://twitter.com/${username}` }
    ];
    const results = await Promise.all(platforms.map(async p => {
        try {
            const r = await fetch(p.url, { method: 'HEAD' });
            return { ...p, exists: r.ok };
        } catch { return { ...p, exists: false }; }
    }));
    res.json({ profiles: results, total: platforms.length });
});

app.listen(PORT, () => console.log(`OSINT running on port ${PORT}`));
