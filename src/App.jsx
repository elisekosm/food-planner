import React, { useState } from 'react';
import './style.css';

const PRESET_PREFERENCES = 'low red meat, one-pan, quick to make';
const PROMPT_TEMPLATE = `Generate {numMeals} flavorful, healthy recipes that use minimal red meat. Each meal should take under 1 hour to make and be simple to cook (one-pan preferred). Provide a recipe title, short description, list of ingredients, and cooking instructions. Also, generate a consolidated grocery list for all meals formatted by ingredient type (e.g., produce, protein, spices). Servings: {servingsPerMeal}.`;

function parseRecipes(recipesText) {
  // Robust parser for stubbed LLM response
  if (!recipesText) return [];
  // Split on --- lines
  const recipeBlocks = recipesText.split(/---+/g).map(b => b.trim()).filter(Boolean);
  return recipeBlocks.filter(b => b.match(/^###/m) && !b.match(/consolidated/i)).map((block, idx) => {
    // Title
    const titleMatch = block.match(/^###\s*\*\*(\d+\.\s*)?(.+?)\*\*/m);
    const title = titleMatch ? titleMatch[2].trim() : `Recipe ${idx+1}`;
    // Description
    const descMatch = block.match(/\*\*Description:\*\*\s*(.+)/m);
    const description = descMatch ? descMatch[1].trim() : '';
    // Ingredients
    const ingMatch = block.match(/\*\*Ingredients:\*\*([\s\S]+?)\*\*Instructions:\*\*/m);
    let ingredients = [];
    if (ingMatch) {
      ingredients = ingMatch[1].split(/\n|-/).map(l => l.replace(/^\s*[-•]?\s*/, '').trim()).filter(l => l);
    }
    // Instructions
    const insMatch = block.match(/\*\*Instructions:\*\*([\s\S]+)/m);
    let instructions = [];
    if (insMatch) {
      instructions = insMatch[1].split(/\n\d+\.\s/).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l);
    }
    // Servings (try to extract from description or default to 2)
    let servings = 2;
    const servingsMatch = block.match(/serves?\s*(\d+)/i);
    if (servingsMatch) servings = parseInt(servingsMatch[1]);
    // Only include recipes with a title and at least one ingredient
    if (!title || ingredients.length === 0) return null;
    return { id: idx, title, description, ingredients, instructions, servings, checked: true, expanded: false, currentServings: servings };
  }).filter(Boolean);
}

function parseGroceryList(groceryText) {
  // Parse markdown-style bold section headers (e.g. **Produce:**) and list items
  if (!groceryText) return [];
  const lines = groceryText.split('\n');
  let sections = [], currentSection = null, items = [];
  lines.forEach(line => {
    const trimmed = line.trim();
    // Match section header: **Produce:**
    const sectionMatch = trimmed.match(/^\*\*([A-Za-z /&()]+):\*\*$/);
    if (sectionMatch) {
      if (currentSection && items.length) {
        sections.push({ section: currentSection, items });
      }
      currentSection = sectionMatch[1].trim();
      items = [];
    } else if (/^- /.test(trimmed)) {
      items.push(trimmed.replace(/^- /, '').trim());
    }
  });
  if (currentSection && items.length) {
    sections.push({ section: currentSection, items });
  }
  return sections;
}

function normalizeIngredient(str) {
  // Remove quantity, parentheticals, and extra words, lowercase
  return str
    .replace(/^[\d\s\/.,()-]+/, '') // remove leading quantity/units
    .replace(/\([^)]*\)/g, '') // remove parentheticals
    .replace(/[^a-zA-Z ]/g, '') // remove non-letters
    .toLowerCase()
    .replace(/\b(?:of|and|or|to|for|with|optional|fresh|small|medium|large|can|oz|cup|cups|tbsp|tsp|cloves|bunch|slices|slice|pieces|piece|trimmed|diced|minced|rinsed|peeled|deveined|zest|juice|sliced|thinly|drained|rinsed|plus|more|as needed|as desired|as required)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function App() {
  const [diet, setDiet] = useState('');
  const [numMeals, setNumMeals] = useState(3);
  const [servingsPerMeal, setServingsPerMeal] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [recipesState, setRecipesState] = useState([]);
  const [grocerySections, setGrocerySections] = useState([]);

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
        inputs: prompt
      };
      console.log('[Food Planner] Sending Hugging Face style API request:', requestBody);
      const response = await fetch('/api/chat-proxy', {
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

  React.useEffect(() => {
    if (result) {
      const { recipes, grocery } = splitResult(result);
      const parsedRecipes = parseRecipes(recipes);
      const parsedGrocery = parseGroceryList(grocery);
      setRecipesState(parsedRecipes);
      setGrocerySections(parsedGrocery);
    }
  }, [result]);

  function handleExpandRecipe(idx) {
    setRecipesState(rs => rs.map((r, i) => i === idx ? { ...r, expanded: !r.expanded } : r));
  }
  function handleServingsChange(idx, val) {
    setRecipesState(rs => rs.map((r, i) => i === idx ? { ...r, currentServings: val } : r));
  }

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
          <div className="recipes-list">
            {recipesState.map((r, i) => (
              <div key={r.id} className="recipe-card" style={{marginBottom: '2em', paddingBottom: '1em', borderBottom: '1px solid #eee'}}>
                <div style={{display:'flex',alignItems:'center',gap:'0.5em'}}>
                  {/* Removed checkbox for recipe selection */}
                  <span style={{fontWeight:'bold',fontSize:'1.1em'}}>{r.title}</span>
                  <button onClick={() => handleExpandRecipe(i)} style={{marginLeft:'auto'}}>{r.expanded ? 'Hide' : 'Show'} Details</button>
                </div>
                {r.expanded && (
                  <div className="recipe-details">
                    <div><em>{r.description}</em></div>
                    <div>Servings: <input type="number" min={1} value={r.currentServings} onChange={e => handleServingsChange(i, Number(e.target.value))} style={{width:'3em'}} /></div>
                    <div><strong>Ingredients:</strong><ul>{r.ingredients.map((ing, j) => <li key={j}>{ing}</li>)}</ul></div>
                    <div><strong>Instructions:</strong><ol>{r.instructions.map((ins, j) => <li key={j}>{ins}</li>)}</ol></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grocery-list">
            {grocerySections.map((section, i) => (
              <div key={section.section} style={{marginBottom: '1.5em'}}>
                <h3 style={{marginBottom: '0.5em', marginTop: i === 0 ? 0 : '1em'}}>{section.section}</h3>
                <ul style={{marginLeft: '1em'}}>
                  {section.items.filter(item => item && !item.match(/^[A-Za-z ]+:$/)).map((item, j) => (
                    <li key={item+j} style={{display:'flex',alignItems:'center',gap:'0.5em',marginBottom:'0.2em'}}>
                      <span>{item}</span>
                      <a href={`https://www.instacart.com/search?q=${encodeURIComponent(item)}`} target="_blank" rel="noopener noreferrer" className="instacart-link" style={{fontSize:'0.9em',color:'#22a857',textDecoration:'underline'}}>Instacart</a>
                      <a href={`https://www.walmart.com/search/?query=${encodeURIComponent(item)}`} target="_blank" rel="noopener noreferrer" className="walmart-link" style={{fontSize:'0.9em',color:'#0071ce',textDecoration:'underline'}}>Walmart</a>
                      <a href={`https://www.aldi.us/search/?q=${encodeURIComponent(item)}`} target="_blank" rel="noopener noreferrer" className="aldi-link" style={{fontSize:'0.9em',color:'#e6001f',textDecoration:'underline'}}>ALDI</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
