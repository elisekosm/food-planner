require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.post('/api/openai-proxy', async (req, res) => {
  const apiKey = process.env.HUGGING_FACE_API_KEY;
  if (!apiKey) {
    console.error('Hugging Face API key not configured');
    return res.status(500).json({ error: 'Hugging Face API key not configured' });
  }
  try {
    // Accept both OpenAI-style and Hugging Face-style requests
    let prompt = req.body?.inputs;
    if (!prompt && req.body?.messages) {
      prompt = req.body.messages.map(m => m.content).join('\n');
    }
    if (!prompt) {
      prompt = req.body.prompt;
    }
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }
    // Model selection is now only here in the API
    // 'MiriFur/gpt2-recipes' - no
    // 'alexdseo/RecipeBERT' - no
    // 'meta-llama/Llama-3.1-8B-Instruct'  - slow 
    // meta-llama/Llama-3.3-70B-Instruct - slow 
    // mistralai/Mixtral-8x7B-Instruct-v0.1
    // Gensyn/Qwen2.5-1.5B-Instruct - no 
    // Gensyn/Qwen2.5-0.5B-Instruct - no 
    // Qwen/Qwen3-32B 
    // Qwen/Qwen2.5-Coder-32B-Instruct
    // deepseek-ai/DeepSeek-R1 - no 
    const model = 'meta-llama/Llama-3.3-70B-Instruct';

    console.log('Proxying request to Hugging Face:', { model, prompt });
    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ inputs: prompt })
    });
    let data;
    const text = await hfRes.text();
    if (hfRes.status === 404) {
      console.error('Model not found on Hugging Face:', model);
      res.status(404).json({ error: `Model not found on Hugging Face: ${model}`, details: text });
      return;
    }
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Non-JSON response from Hugging Face:', text);
      res.status(hfRes.status).json({ error: 'Non-JSON response from Hugging Face', details: text });
      return; // Ensure function exits after sending response
    }
    console.log('Hugging Face response status:', hfRes.status);
    console.log('Hugging Face response message:', hfRes.message);
    console.log('Hugging Face response:', hfRes);

    // Hugging Face returns an array with generated_text
    if (Array.isArray(data) && data[0]?.generated_text) {
      res.status(200).json({ choices: [{ message: { content: data[0].generated_text } }] });
    } else {
      res.status(hfRes.status).json(data);
    }
  } catch (err) {
    console.error('Hugging Face request failed:', err);
    res.status(500).json({ error: 'Hugging Face request failed', details: err.message });
  }
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`API server running on port ${PORT}`));