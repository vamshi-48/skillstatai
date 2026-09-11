Skillstat AI is a React and Vite skill-assessment dashboard. It lets a user define a target role, choose skills, take assessments, and review readiness and skill gaps.

## What exists

- Loading screen with Skillstat branding.
- Sign-in screen with work email and password fields. The current UI advances locally; it does not authenticate against a user service.
- Language selector with English, Hindi, Tamil, and Telugu translations for the main flow.
- Three-step onboarding:
	1. Search and select a job role, or enter a custom role.
	2. Select role-related skills, add custom skills, and require at least two skills.
	3. Select an experience range: less than 1 year, 1-3 years, 3-5 years, or 5+ years.
- Skills dashboard showing the selected profile, assessment count, readiness score, proficiency, gap percentage, and recommendations for each skill.
- Standard skill assessment with scenario questions and coding challenges when a coding skill is selected.
- Results screen with total score, per-skill results, proficiency status, and gap classifications.
- Weekend company challenge with a 10-question quiz, score, rank, tier badge, and local leaderboard updates.
- Notes/PDF quiz tab that reads an uploaded file as text and creates a quiz from that content.
- Responsive styling, interactive login background, progress indicators, and light/dark green visual branding.

## Run the application

Install dependencies once:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/`.

## Optional AI question API

The standard assessment first requests generated questions from `/api/questions`. If the API is unavailable, the frontend uses built-in fallback questions.

To enable generated questions, set `OPENAI_API_KEY` or `GEMINI_API_KEY` in the environment and start the API in a second terminal:

```bash
npm run api
```

The API listens on `http://localhost:8787`; Vite proxies `/api` requests there. The API currently sends requests to OpenAI's chat completions endpoint.

## Useful commands

```bash
npm run build   # Production build
npm run lint    # Oxlint checks
```

## Current implementation notes

- Profile, quiz, leaderboard, and score data live in React state and reset when the page is refreshed.
- The sign-in form is a local UI step; there is no account or session persistence.
- Uploaded documents are read in the browser as text. There is no dedicated PDF parser, so binary PDF text extraction is not guaranteed.
- The API key is expected by the local API process, not by the frontend.
## Project Status

Skillstat AI project setup completed.
