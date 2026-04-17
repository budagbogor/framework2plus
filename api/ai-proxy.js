/**
 * DevForge Studio - AI Proxy Serverless Function
 * Handles requests from frontend to AI providers (SumoPod/OpenRouter)
 * to bypass CORS and manage security.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { provider, apiUrl, apiKey, payload, method = 'POST' } = req.body;
    const requestMethod = String(method || 'POST').toUpperCase();

    if (!apiUrl || !apiKey || (requestMethod !== 'GET' && !payload)) {
      return res.status(400).json({ error: 'Missing required fields: apiUrl, apiKey, or payload' });
    }

    console.log(`[Proxy] Forwarding request to ${provider}: ${requestMethod} ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: requestMethod,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': 'https://devforge.studio',
          'X-Title': 'DevForge Studio'
        } : {})
      },
      ...(requestMethod === 'GET' ? {} : { body: JSON.stringify(payload) })
    });

    // 3. Handle non-JSON responses (security/errors)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.warn(`[Proxy] Provider returned non-JSON (${response.status}):`, text.substring(0, 200));
      return res.status(response.status).json({ 
        error: `Provider AI (${provider}) mengembalikan respon non-JSON (Status: ${response.status}).`,
        message: text.substring(0, 200) || 'Respon kosong atau bukan JSON.'
      });
    }

    const data = await response.json();

    // 4. Return the response back to the frontend
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('[Proxy Error]', error);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan sistem pada Proxy Serverless.',
      message: error.message 
    });
  }
}
