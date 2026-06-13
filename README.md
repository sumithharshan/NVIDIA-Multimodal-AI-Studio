# Unified AI Chat Studio

A professional multi-provider AI chat studio built with Next.js, TypeScript, and Tailwind CSS.

Supports:

- OpenAI / ChatGPT API
- Anthropic / Claude API
- Google Gemini API
- xAI / Grok API
- NVIDIA AI / NIM API

## Features

- Multi-provider settings page
- API key storage in browser localStorage, with optional `.env.local` server keys
- Auto Router to pick the best provider for the task
- Manual provider selection
- Provider fallback if the selected provider fails
- Streaming responses with real-time typing effect
- Stop generation
- Edit user message and resend
- Regenerate assistant response
- Chat history in localStorage
- Upload TXT, Markdown, JSON, CSV, PDF, and images
- Paste screenshots directly into chat with Ctrl+V / Cmd+V
- Prompt preset chips
- Instruction profiles
- Upload instruction files as TXT, MD, or PDF
- Agent modes: Auto, Research, Code, Writer
- Markdown rendering
- Export chat as Markdown
- Dark modern UI with Inter font

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Windows PowerShell

```powershell
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
npm install
npm run dev
```

## Optional .env.local

You can either enter keys in the Settings page, or create `.env.local`:

```env
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
XAI_API_KEY=your_xai_key
NVIDIA_API_KEY=your_nvidia_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
```

## Recommended setup

1. Open Settings.
2. Add your API key for each provider you want to use.
3. Test each provider.
4. Set Active Provider to `Auto Router`.
5. Keep Fallback Models enabled.
6. Save settings.

## Notes

Model IDs change over time. Use the Custom Model ID field when your provider gives a newer model name.
