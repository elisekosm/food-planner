require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.post('/api/chat-proxy', async (req, res) => {
  console.log('Received POST /api/chat-proxy');
  const apiKey = process.env.OPENROUTER_API_KEY;
  const isLocal = process.env.IS_LOCAL === 'true';
  if (isLocal) {
    console.log('IS_LOCAL is true, returning stubbed LLM response from file.');
    const stubPath = __dirname + '/api/stubbed-llm-response.txt';
    let content;
    try {
      content = fs.readFileSync(stubPath, 'utf8');
    } catch (e) {
      console.error('Failed to read stubbed response file:', e);
      return res.status(500).json({ error: 'Failed to read stubbed response file', details: e.message });
    }
    return res.status(200).json({
      choices: [{ message: { content } }]
    });
  }
  if (!apiKey) {
    console.error('API key not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }
  try {
    let messages = req.body.messages;
    console.log('Request body:', req.body);
    if (!messages) {
      let prompt = req.body?.inputs || req.body?.prompt;
      if (!prompt) {
        console.warn('No prompt or messages provided');
        return res.status(400).json({ error: 'No prompt or messages provided' });
      }
      messages = [{ role: 'user', content: prompt }];
      console.log('Converted prompt to messages:', messages);
    } else {
      console.log('Using provided messages:', messages);
    }

    const model = 'mistralai/mistral-small-3.2-24b-instruct:free';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (process.env.OPENROUTER_REFERER) {
      headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER;
    }
    if (process.env.OPENROUTER_TITLE) {
      headers['X-Title'] = process.env.OPENROUTER_TITLE;
    }
    console.log('Proxying request to OpenRouter:', { model, messages, headers });
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, messages })
    });
    console.log('OpenRouter response status:', orRes.status);
    const data = await orRes.json();
    console.log('OpenRouter response data:', data);
    if (orRes.ok) {
      res.status(200).json(data);
    } else {
      res.status(orRes.status).json(data);
    }
  } catch (err) {
    console.error('OpenRouter request failed:', err);
    res.status(500).json({ error: 'OpenRouter request failed', details: err.message });
  }
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`API server running on port ${PORT}`));