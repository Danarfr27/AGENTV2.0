const SUMOPOD_MODELS = require('../js/models.js');
const DEFAULT_MODEL = 'gemini/gemini-3.5-flash-lite';

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.SUMOPOD_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            error: 'SUMOPOD_API_KEY belum diatur pada environment server'
        });
    }

    const model = req.body?.model || DEFAULT_MODEL;
    if (!SUMOPOD_MODELS.includes(model)) {
        return res.status(400).json({ error: 'Model Sumopod tidak tersedia.' });
    }

    const messages = req.body?.messages;
    if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        messages.some(message =>
            !message ||
            !['system', 'user', 'assistant'].includes(message.role) ||
            typeof message.content !== 'string'
        )
    ) {
        return res.status(400).json({ error: 'Format messages tidak valid.' });
    }

    try {
        const baseUrl = (process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1').replace(/\/+$/, '');
        const upstreamUrl = baseUrl.endsWith('/chat/completions')
            ? baseUrl
            : `${baseUrl}/chat/completions`;
        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 2000,
                temperature: 0.7,
                stream: true
            })
        });

        if (!upstreamResponse.ok) {
            const data = await upstreamResponse.json().catch(() => null);
            const upstreamMessage = data?.error?.message;
            const error = upstreamResponse.status === 401
                ? 'Sumopod menolak API key. Periksa SUMOPOD_API_KEY di environment server'
                : upstreamMessage || `Sumopod mengembalikan HTTP ${upstreamResponse.status}`;

            return res.status(upstreamResponse.status).json({ error });
        }

        if (!upstreamResponse.body) {
            return res.status(502).json({ error: 'Sumopod tidak mengirim stream respons' });
        }

        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        const reader = upstreamResponse.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } finally {
            reader.releaseLock();
            res.end();
        }
    } catch (error) {
        console.error('Sumopod request failed:', error);
        if (!res.headersSent) {
            return res.status(502).json({ error: 'Tidak dapat terhubung ke Sumopod' });
        }
        res.end();
    }
};
