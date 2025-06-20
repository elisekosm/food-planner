// Simple Node.js test for OpenAI API key validity
require('dotenv').config();

async function testOpenAIKey() {
  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not set in .env');
    process.exit(1);
  }
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    if (res.ok) {
      console.log('✅ OpenAI API key is valid.');
      process.exit(0);
    } else {
      const err = await res.json();
      console.error('❌ OpenAI API key is invalid:', err);
      process.exit(2);
    }
  } catch (e) {
    console.error('❌ Error connecting to OpenAI:', e);
    process.exit(3);
  }
}

testOpenAIKey();
