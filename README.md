# SleepLens

SleepLens is a deployable Vite + React application that turns a short sleep intake into an AI-generated sleep intelligence report focused on sleep quality, circadian rhythm alignment, and cardiometabolic risk signals.

## Stack

- React 19
- Vite 7
- Tailwind CSS 3
- Recharts
- OpenAI `gpt-4o` via client-side `fetch`

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:

```env
VITE_OPENAI_API_KEY=sk-...
```

4. Start the app:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- The app uses the OpenAI Chat Completions API directly from the browser because the spec requested no backend.
- If no API key is present, SleepLens generates a deterministic local demo report so the UI remains usable during design review.
- The in-app report is educational only and not medical advice.

## Deploy

This repo is ready for Vercel deployment. `vercel.json` is included and the app builds as a static Vite project.
