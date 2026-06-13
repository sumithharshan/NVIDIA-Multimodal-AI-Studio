"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/storage";
import { supportsImageGeneration, supportsTTS } from "@/lib/nvidia";
import ModelSelector from "./ModelSelector";
import ThemeToggle from "./ThemeToggle";

export default function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<string>("");
  const selectedModel = useMemo(() => settings.model === "custom" ? settings.customModel : settings.model, [settings]);

  useEffect(() => setSettings(loadSettings()), []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updatePrompt(key: keyof AppSettings["systemPrompts"], value: string) {
    setSettings((prev) => ({ ...prev, systemPrompts: { ...prev.systemPrompts, [key]: value } }));
  }

  function save() {
    saveSettings(settings);
    setStatus("Settings saved locally in this browser.");
  }

  function reset() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setStatus("Settings reset.");
  }

  async function testConnection() {
    setStatus("Testing connection...");
    try {
      const isImageModel = supportsImageGeneration(selectedModel);
      const isTTSModel = supportsTTS(selectedModel);
      const response = await fetch(isTTSModel ? "/api/tts" : isImageModel ? "/api/images" : "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isTTSModel ? {
          apiKey: settings.apiKey,
          model: selectedModel,
          input: "Hello from NVIDIA Magpie TTS.",
          voice: "Magpie-ZeroShot.Female-1",
        } : isImageModel ? {
          apiKey: settings.apiKey,
          model: selectedModel,
          prompt: "Connection test only",
          images: [],
          edit: false,
          testOnly: true,
        } : {
          apiKey: settings.apiKey,
          model: selectedModel,
          temperature: 0,
          maxTokens: 20,
          stream: false,
          messages: [{ role: "user", content: "Reply with OK only." }],
          systemPrompt: "You are a connection test assistant. Reply with OK only.",
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      saveSettings(settings);
      setStatus(isImageModel ? "Connection successful. Settings saved. Image endpoint will be used when you generate." : "Connection successful. Settings saved.");
    } catch (error) {
      setStatus(error instanceof Error ? `Connection failed: ${error.message}` : "Connection failed.");
    }
  }

  return (
    <div className="min-h-screen bg-grid bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.16),transparent_30%)]" />
      <main className="relative mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Settings</p>
            <h1 className="mt-2 text-3xl font-bold text-white">NVIDIA AI Configuration</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Your API key and settings are stored in localStorage. The connection test now saves successful settings automatically, so Chat always uses the latest key.</p>
          </div>
          <Link href="/chat" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10">Back to Chat</Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-glow backdrop-blur-xl">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">NVIDIA API Key</label>
              <div className="flex gap-2">
                <input
                  value={settings.apiKey}
                  onChange={(event) => update("apiKey", event.target.value)}
                  type={showKey ? "text" : "password"}
                  placeholder="nvapi-..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-400/50"
                />
                <button onClick={() => setShowKey(!showKey)} className="rounded-2xl border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/10">{showKey ? "Hide" : "Show"}</button>
              </div>
            </div>

            <ModelSelector
              model={settings.model}
              customModel={settings.customModel}
              onModelChange={(value) => update("model", value)}
              onCustomModelChange={(value) => update("customModel", value)}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-2 flex justify-between text-sm"><span>Temperature</span><span>{settings.temperature}</span></div>
                <input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(event) => update("temperature", Number(event.target.value))} className="w-full" />
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-2 flex justify-between text-sm"><span>Max tokens</span><span>{settings.maxTokens}</span></div>
                <input type="range" min="256" max="4096" step="128" value={settings.maxTokens} onChange={(event) => update("maxTokens", Number(event.target.value))} className="w-full" />
              </div>
            </div>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
              Streaming responses
              <input type="checkbox" checked={settings.streaming} onChange={(event) => update("streaming", event.target.checked)} />
            </label>

            <div className="flex flex-wrap gap-3">
              <button onClick={save} className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">Save settings</button>
              <button onClick={testConnection} className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/10">Test connection</button>
              <button onClick={reset} className="rounded-2xl border border-red-400/20 px-5 py-3 text-sm text-red-200 hover:bg-red-500/10">Reset</button>
            </div>
            {status && <p className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">{status}</p>}
          </section>

          <aside className="space-y-5">
            <ThemeToggle />
            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-white">Agent system prompts</h2>
              <div className="mt-4 space-y-4">
                {(["research", "code", "writer"] as const).map((agent) => (
                  <div key={agent}>
                    <label className="mb-2 block text-sm font-medium capitalize text-slate-300">{agent}</label>
                    <textarea value={settings.systemPrompts[agent]} onChange={(event) => updatePrompt(agent, event.target.value)} rows={5} className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-xs leading-5 text-slate-200 outline-none focus:border-blue-400/50" />
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
