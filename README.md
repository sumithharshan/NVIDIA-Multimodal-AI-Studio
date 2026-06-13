# NVIDIA Multi-Agent Next.js UI

A dark-mode Next.js starter for NVIDIA AI / NIM with:

- Settings page for API key + model selection
- Multi-agent chat (Auto / Research / Code / Writer)
- File uploads (TXT / MD / CSV / JSON / PDF / images / audio samples)
- PDF text extraction in the browser
- Vision chat with image input
- Image generation and image editing support
- NVIDIA Riva Translate support
- NVIDIA Magpie TTS voice output route
- Browser speech input from microphone
- Browser voice playback for assistant messages
- Paste screenshots directly into the chat box
- Stop generation button
- Local chat history in `localStorage`

## Run

```bash
npm install
npm run dev
```

## Windows PowerShell reset

```powershell
if (Test-Path .next) { Remove-Item -Recurse -Force .next }
npm install
npm run dev
```

## Recommended model usage

- `qwen/qwen3.5-397b-a17b` → image understanding / multimodal chat
- `qwen/qwen3.5-122b-a10b` → multimodal chat + tool-calling style tasks
- `qwen/qwen-image` → text-to-image generation
- `qwen/qwen-image-edit` → image editing
- `qwen/qwen2.5-coder-32b-instruct` → coding tasks
- `nvidia/riva-translate-4b-instruct-v1.1` → translation
- `nvidia/magpie-tts-zeroshot` → text-to-speech voice output

## Speech and translation

When the Riva Translate model is selected, the chat box shows source and target language dropdowns.

When the Magpie TTS model is selected, the send button becomes **Generate Voice** and the assistant response includes an audio player when the endpoint returns audio.

Every assistant message also has a **Voice** button that uses the browser's built-in speech synthesis as a fast fallback.

## Important TTS note

NVIDIA Magpie TTS is a specialized speech endpoint. This starter includes `/api/tts` using the common OpenAI-style `/audio/speech` pattern. If NVIDIA's hosted Magpie API returns a schema error, update:

- `app/api/tts/route.ts`

with the exact API Reference payload from your NVIDIA Build model page.

## Clipboard support

You can paste screenshots directly into the chat textarea with `Ctrl+V` / `Cmd+V`.

## Local storage

Settings and chats are stored in the browser only.
