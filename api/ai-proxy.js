/**
 * DevForge Studio - AI Proxy Serverless Function
 * Handles requests from frontend to AI providers (SumoPod/OpenRouter)
 * to bypass CORS and manage security.
 */

export default async function handler(req, res) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, apiUrl, apiKey, payload } = req.body;

    if (!apiUrl || !apiKey || !payload) {
      return res.status(400).json({ error: 'Missing required fields: apiUrl, apiKey, or payload' });
    }

    console.log(`[Proxy] Forwarding request to ${provider}: ${apiUrl}`);

    // 2. Perform the actual request to the AI Provider from the server
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': 'https://devforge.studio',
          'X-Title': 'DevForge Studio'
        } : {})
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // 3. Return the response back to the frontend
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('[Proxy Error]', error);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan pada Proxy Serverless.',
      message: error.message 
    });
  }
}
