import React, { useState } from 'react';

const PRESET_PREFERENCES = 'low red meat, one-pan, quick to make';
const MODEL = 'gpt-4';
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
    const prompt = PROMPT_TEMPLATE
      .replace('{numMeals}', numMeals)
      .replace('{servingsPerMeal}', servingsPerMeal)
      + ` Preferences: ${allPreferences}`;
    try {
      const response = await fetch('/api/chat-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setResult(data.choices[0].message.content);
    } catch (err) {
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
    <main style={{ maxWidth: 600, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '2rem' }}>
      <h1 style={{ textAlign: 'center', color: '#2d7a46' }}>SmartMealGen</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <label htmlFor="diet">Meal Preferences</label>
        <div style={{ marginBottom: '0.5rem' }}>
          <button type="button" onClick={() => handlePreset('low red meat')}>Low Red Meat</button>{' '}
          <button type="button" onClick={() => handlePreset('one-pan')}>One Pan</button>{' '}
          <button type="button" onClick={() => handlePreset('quick to make')}>Quick to Make</button>
        </div>
        <input type="text" id="diet" name="diet" placeholder="e.g., low red meat, one-pan meals" value={diet} onChange={e => setDiet(e.target.value)} required />
        <label htmlFor="numMeals">Number of Meals</label>
        <input type="number" id="numMeals" name="numMeals" min={1} max={7} value={numMeals} onChange={e => setNumMeals(e.target.value)} required />
        <label htmlFor="servingsPerMeal">Servings per Meal</label>
        <input type="number" id="servingsPerMeal" name="servingsPerMeal" min={1} max={10} value={servingsPerMeal} onChange={e => setServingsPerMeal(e.target.value)} required />
        <button type="submit" style={{ background: '#2d7a46', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7rem', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Generate Recipes</button>
      </form>
      {loading && <div style={{ textAlign: 'center', color: '#2d7a46', fontWeight: 'bold', marginBottom: '1.5rem' }}>Generating recipes...</div>}
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      {result && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ color: '#2d7a46', marginBottom: '1rem' }}>Generated Recipes and Grocery List</h2>
          <div style={{ marginBottom: '2rem', background: '#e8f5e9', borderRadius: 8, padding: '1rem' }}>
            {recipes.split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>
          {grocery && <div style={{ background: '#fffde7', borderRadius: 8, padding: '1rem', border: '1px solid #ffe082' }}>{grocery.split('\n').map((line, i) => <div key={i}>{line}</div>)}</div>}
        </section>
      )}
    </main>
  );
}
