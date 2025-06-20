// SmartMealGen - Node.js CLI version
// Handles user input, OpenAI API call, and result output in terminal

require('dotenv').config();
const readline = require('readline');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const LOCAL_API = process.env.LOCAL_API === 'true' || process.env.LOCAL_API === '1' || process.env.LOCAL_API === true;
let OPENAI_API_KEY = '';
let OPENAI_API_URL = '/api/openai-proxy';

if (LOCAL_API) {
    OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
    OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    if (!OPENAI_API_KEY) {
        console.error('OpenAI API key is not set. Please configure it in your environment variables.');
        process.exit(1);
    }
}

const MODEL = 'gpt-4';
const PROMPT_TEMPLATE = `Generate {numMeals} flavorful, healthy recipes that use minimal red meat. Each meal should take under 1 hour to make and be simple to cook (one-pan preferred). Provide a recipe title, short description, list of ingredients, and cooking instructions. Also, generate a consolidated grocery list for all meals formatted by ingredient type (e.g., produce, protein, spices). Servings: {servingsPerMeal}.`;
const PRESET_PREFERENCES = 'low red meat, one-pan, quick to make';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer)));
}

(async () => {
  const diet = await ask('Meal Preferences (comma separated, or leave blank for default): ');
  const numMeals = await ask('Number of Meals (1-7): ');
  const servingsPerMeal = await ask('Servings per Meal (1-10): ');

  let allPreferences = PRESET_PREFERENCES;
  if (diet && diet.trim()) {
    const userPrefs = diet.split(',').map(s => s.trim().toLowerCase());
    const presetPrefs = PRESET_PREFERENCES.split(',').map(s => s.trim().toLowerCase());
    const merged = [...presetPrefs];
    userPrefs.forEach(p => { if (p && !presetPrefs.includes(p)) merged.push(p); });
    allPreferences = merged.join(', ');
  }

  const prompt = PROMPT_TEMPLATE
    .replace('{numMeals}', numMeals)
    .replace('{servingsPerMeal}', servingsPerMeal)
    + ` Preferences: ${allPreferences}`;

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful meal planner.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  };
  if (LOCAL_API && OPENAI_API_KEY) {
    fetchOptions.headers['Authorization'] = `Bearer ${OPENAI_API_KEY}`;
  }

  try {
    const response = await fetch(OPENAI_API_URL, fetchOptions);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const text = data.choices[0].message.content;
    displayResults(text);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    rl.close();
  }
})();

function displayResults(text) {
  const groceryIdx = text.toLowerCase().indexOf('grocery list');
  let recipesText = text;
  let groceryText = '';
  if (groceryIdx !== -1) {
    recipesText = text.slice(0, groceryIdx);
    groceryText = text.slice(groceryIdx);
  }
  console.log('\n=== Recipes ===\n');
  console.log(recipesText.trim());
  if (groceryText) {
    console.log('\n=== Grocery List ===\n');
    console.log(groceryText.trim());
  }
}
