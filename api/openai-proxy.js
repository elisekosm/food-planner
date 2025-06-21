// Simple serverless function for OpenAI proxy (Node.js, e.g. for Vercel/Netlify)
require('dotenv').config();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.HUGGING_FACE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Hugging Face API key not configured' });
    return;
  }

  try {
    let prompt = req.body?.messages?.map(m => m.content).join('\n') || req.body.prompt || req.body.inputs;
    if (!prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }
    const model = req.body.model || 'mistralai/Mistral-7B-Instruct-v0.2';
    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ inputs: prompt })
    });
    const data = await hfRes.json();
    if (Array.isArray(data) && data[0]?.generated_text) {
      res.status(200).json({ choices: [{ message: { content: data[0].generated_text } }] });
    } else {
      res.status(hfRes.status).json(data);
    }
  } catch (err) {
    res.status(500).json({ error: 'Hugging Face request failed', details: err.message });
  }
};
