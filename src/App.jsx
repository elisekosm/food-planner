import React, { useState } from 'react';
import './style.css';

const PRESET_PREFERENCES = 'low red meat, one-pan, quick to make';
const MODEL = 'flax-community/t5-recipe-generation';
const PROMPT_TEMPLATE = `Generate {numMeals} flavorful, healthy recipes that use minimal red meat. Each meal should take under 1 hour to make and be simple to cook (one-pan preferred). Provide a recipe title, short description, list of ingredients, and cooking instructions. Also, generate a consolidated grocery list for all meals formatted by ingredient type (e.g., produce, protein, spices). Servings: {servingsPerMeal}.`;

export default function App() {
  const [diet, setDiet] = useState('');
  const [numMeals, setNumMeals] = useState(3);
  const [servingsPerMeal, setServingsPerMeal] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handlePreset = (val) => {
    if (!diet.includes(val)) setDiet(diet ? diet + ', ' + val : val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');
    let allPreferences = PRESET_PREFERENCES;
    if (diet && diet.trim()) {
      const userPrefs = diet.split(',').map(s => s.trim().toLowerCase());
      const presetPrefs = PRESET_PREFERENCES.split(',').map(s => s.trim().toLowerCase());
      const merged = [...presetPrefs];
      userPrefs.forEach(p => { if (p && !presetPrefs.includes(p)) merged.push(p); });
      allPreferences = merged.join(', ');
    }
    const prompt =
      'You are a helpful meal planner.\n' +
      PROMPT_TEMPLATE.replace('{numMeals}', numMeals).replace('{servingsPerMeal}', servingsPerMeal) +
      ` Preferences: ${allPreferences}`;
    console.log('[Food Planner] Submitting form with:', { diet, numMeals, servingsPerMeal, allPreferences });
    console.log('[Food Planner] Prompt:', prompt);
    try {
      const requestBody = {
        model: MODEL,
        inputs: prompt
      };
      console.log('[Food Planner] Sending Hugging Face style API request:', requestBody);
      const response = await fetch('/api/openai-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      console.log('[Food Planner] API response status:', response.status);
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      console.log('[Food Planner] API response data:', data);
      setResult(data.choices[0].message.content);
    } catch (err) {
      console.error('[Food Planner] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  function splitResult(text) {
    if (!text) return { recipes: '', grocery: '' };
    const idx = text.toLowerCase().indexOf('grocery list');
    if (idx === -1) return { recipes: text, grocery: '' };
    return { recipes: text.slice(0, idx), grocery: text.slice(idx) };
  }

  const { recipes, grocery } = splitResult(result);

  return (
    <main className="container">
      <h1>Food Planner</h1>
      <form onSubmit={handleSubmit} className="form">
        <label htmlFor="diet">Meal Preferences</label>
        <div className="preset-btns">
          <button type="button" onClick={() => handlePreset('low red meat')}>Low Red Meat</button>
          <button type="button" onClick={() => handlePreset('one-pan')}>One Pan</button>
          <button type="button" onClick={() => handlePreset('quick to make')}>Quick to Make</button>
        </div>
        <input type="text" id="diet" name="diet" placeholder="e.g., low red meat, one-pan meals" value={diet} onChange={e => setDiet(e.target.value)} required />
        <label htmlFor="numMeals">Number of Meals</label>
        <input type="number" id="numMeals" name="numMeals" min={1} max={7} value={numMeals} onChange={e => setNumMeals(e.target.value)} required />
        <label htmlFor="servingsPerMeal">Servings per Meal</label>
        <input type="number" id="servingsPerMeal" name="servingsPerMeal" min={1} max={10} value={servingsPerMeal} onChange={e => setServingsPerMeal(e.target.value)} required />
        <button type="submit" className="submit-btn">Generate Recipes</button>
      </form>
      {loading && <div className="loading">Generating recipes...</div>}
      {error && <div className="error">{error}</div>}
      {result && (
        <section className="results">
          <h2>Generated Recipes and Grocery List</h2>
          <div className="recipes">
            {recipes.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>
          {grocery && <div className="grocery-list">{grocery.split('\n').map((line, i) => <div key={i}>{line}</div>)}</div>}
        </section>
      )}
    </main>
  );
}
