# GigPost Assistant

AI-powered portal assistant for GigPost venue clients.

- **Chat UI:** `/`
- **KB Admin Editor:** `/admin.html`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_KEY` | ✅ | OpenAI API key |
| `ADMIN_PASSWORD` | ✅ | Password for the KB editor (`/admin.html`) and every `/api/*` route. Your browser asks for it once; any username works. If it is not set, the editor stays locked. The chat (`/chat`) does not need it. |
| `KB_QA_PATH` | optional | Path to kb-qa.json (default: `./kb-qa.json`). On Render, set to `/data/kb-qa.json` |
| `KB_BASE_PATH` | optional | Path to base knowledge doc (default: `./GigPost_Assistant_Knowledge.md`) |
| `PORT` | optional | Server port (default: 4242, Render sets this automatically) |
| `ASSISTANT_KEY` | recommended | A long random value. When set, `/chat` answers only callers that send it as the `x-assistant-key` header (the GigPost server, which sends its `GP_ASSISTANT_KEY`). Set the same value on both services. The test page's chat at `/` stops working while it is set. |

## Render Deployment

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Persistent disk:** mount at `/data`, then set `KB_QA_PATH=/data/kb-qa.json`
- **Environment variables:** add `OPENAI_KEY` and `ADMIN_PASSWORD` (a long random password)

## Tests

`npm test` starts the server on a free port with a throwaway KB file and checks the KB editor password gate.
