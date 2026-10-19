# GigPost Assistant

AI-powered portal assistant for GigPost venue clients.

- **Chat UI:** `/`
- **KB Admin Editor:** `/admin.html`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_KEY` | ✅ | OpenAI API key |
| `KB_QA_PATH` | optional | Path to kb-qa.json (default: `./kb-qa.json`). On Render, set to `/data/kb-qa.json` |
| `KB_BASE_PATH` | optional | Path to base knowledge doc (default: `./GigPost_Assistant_Knowledge.md`) |
| `PORT` | optional | Server port (default: 4242, Render sets this automatically) |

## Render Deployment

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Persistent disk:** mount at `/data`, then set `KB_QA_PATH=/data/kb-qa.json`
- **Environment variables:** add `OPENAI_KEY`
