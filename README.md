# Food Planner

Food Planner is a lightweight web app that uses OpenAI's API to generate healthy, flavorful recipes and a consolidated grocery list based on your preferences. It supports both secure serverless proxy mode (for production) and local development mode.

## Features
- Enter meal preferences (e.g., low red meat, one-pan, quick to make)
- Specify number of meals and servings per meal
- Generates recipes and a categorized grocery list using GPT-4
- Secure API key handling via serverless function or local environment

## Prerequisites
- Node.js (v18+ recommended)
- An OpenAI API key ([get one here](https://platform.openai.com/account/api-keys))

## Setup
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd food-planner2
   ```
2. **Install dependencies (for serverless functions):**
   ```bash
   npm install
   ```
3. **Create a `.env` file:**
   ```env
   OPENAI_API_KEY=sk-...
   # For local dev mode only:
   LOCAL_API=true
   ```

## Running Locally (with Local API Key)
1. **Start a local server that supports API routes.**
   - For Vercel:
     ```bash
     npm install -g vercel
     vercel dev
     ```
   - For Netlify:
     ```bash
     npm install -g netlify-cli
     netlify dev
     ```
2. **Open [http://localhost:3000](http://localhost:3000) (or the port shown) in your browser.**
3. **(Optional) Enable local API mode:**
   - In your browser console, run:
     ```js
     window.LOCAL_API = true;
     ```
   - Or add `<script>window.LOCAL_API = true;</script>` before `app.js` in `index.html`.

## Running in Production (Recommended)
- Deploy to Vercel, Netlify, or another platform that supports serverless functions.
- Set your `OPENAI_API_KEY` as a secret/environment variable in your deployment settings.
- Do **not** enable `LOCAL_API` in production.

## Security Note
- Never expose your OpenAI API key in client-side code or public repositories.
- The provided serverless proxy ensures your key is kept secret in production.

## License
MIT
