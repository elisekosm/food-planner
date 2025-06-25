// This file was renamed from openai-proxy.js to chat-proxy.js
// Simple serverless function for OpenRouter proxy (Node.js, e.g. for Vercel/Netlify)
require('dotenv').config();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OpenRouter API key not configured' });
    return;
  }

  try {
    // Accepts either OpenAI-style messages or a prompt string
    let messages = req.body.messages;
    if (!messages) {
      const prompt = req.body.prompt || req.body.inputs;
      if (!prompt) {
        return res.status(400).json({ error: 'No prompt or messages provided' });
      }
      messages = [{ role: 'user', content: prompt }];
    }
    const model = req.body.model || 'mistralai/mistral-small-3.2-24b-instruct:free';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    // Optionally add Referer and X-Title headers if provided
    if (process.env.OPENROUTER_REFERER) {
      headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER;
    }
    if (process.env.OPENROUTER_TITLE) {
      headers['X-Title'] = process.env.OPENROUTER_TITLE;
    }
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages })
    });
    const data = await orRes.json();
    if (orRes.ok) {
      res.status(200).json(data);
    } else {
      res.status(orRes.status).json(data);
    }
  } catch (err) {
    res.status(500).json({ error: 'OpenRouter request failed', details: err.message });
  }
};
