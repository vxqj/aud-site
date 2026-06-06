const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const RESEND_API_KEY = 're_PdpSut6x_8XJV77U424TSpZsvpRTXTcSV';

app.post('/send', async (req, res) => {
    const { to, subject, body, from } = req.body;
    
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: from || 'noreply@aud.lol',
                to: [to],
                subject: subject,
                text: body
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            res.json({ success: true, id: data.id });
        } else {
            res.json({ success: false, error: data.message });
        }
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
