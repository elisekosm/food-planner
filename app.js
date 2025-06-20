// SmartMealGen - app.js
// Handles form submission, OpenAI API call, and UI updates

const form = document.getElementById('meal-form');
const loading = document.getElementById('loading');
const resultsSection = document.getElementById('results');
const recipesDiv = document.getElementById('recipes');
const groceryListDiv = document.getElementById('grocery-list');

const OPENAI_API_KEY = window.SMARTMEALGEN_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4';

const PROMPT_TEMPLATE = `Generate {numMeals} flavorful, healthy recipes that use minimal red meat. Each meal should take under 1 hour to make and be simple to cook (one-pan preferred). Provide a recipe title, short description, list of ingredients, and cooking instructions. Also, generate a consolidated grocery list for all meals formatted by ingredient type (e.g., produce, protein, spices). Servings: {servingsPerMeal}.`;
const PRESET_PREFERENCES = 'low red meat, one-pan, quick to make';

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultsSection.classList.add('hidden');
  loading.classList.remove('hidden');

  const diet = form.diet.value;
  const numMeals = form.numMeals.value;
  const servingsPerMeal = form.servingsPerMeal.value;

  // Always include preset preferences in the prompt
  let allPreferences = PRESET_PREFERENCES;
  if (diet && diet.trim()) {
    // Avoid duplicate values
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

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful meal planner.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    const text = data.choices[0].message.content;
    displayResults(text);
  } catch (err) {
    recipesDiv.innerHTML = `<div class="recipe"><b>Error:</b> ${err.message}</div>`;
    groceryListDiv.innerHTML = '';
    resultsSection.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
});

function displayResults(text) {
  // Try to split recipes and grocery list
  const groceryIdx = text.toLowerCase().indexOf('grocery list');
  let recipesText = text;
  let groceryText = '';
  if (groceryIdx !== -1) {
    recipesText = text.slice(0, groceryIdx);
    groceryText = text.slice(groceryIdx);
  }
  recipesDiv.innerHTML = formatRecipes(recipesText);
  groceryListDiv.innerHTML = formatGroceryList(groceryText);
  resultsSection.classList.remove('hidden');
}

function formatRecipes(text) {
  // Split by recipe titles (numbered or titled)
  const recipeBlocks = text.split(/\n\s*\d+\.|\n\s*Recipe \d+:|\n(?=\w)/g).filter(Boolean);
  return recipeBlocks.map(block => `<div class="recipe">${block.replace(/\n/g, '<br>')}</div>`).join('');
}

function formatGroceryList(text) {
  if (!text) return '';
  return `<div>${text.replace(/\n/g, '<br>')}</div>`;
}

// Optionally, allow user to set API key via prompt if not set
if (!OPENAI_API_KEY) {
  setTimeout(() => {
    const key = prompt('Enter your OpenAI API key to use SmartMealGen:');
    if (key) window.SMARTMEALGEN_API_KEY = key;
  }, 500);
}
