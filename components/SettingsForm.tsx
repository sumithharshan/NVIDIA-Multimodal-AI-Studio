"use client";

import AppShell from "./AppShell";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppSettings, ProviderId } from "@/lib/types";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, selectedModel, uid } from "@/lib/storage";
import { MODELS, PROVIDER_LABELS, modelsForProvider } from "@/lib/model-registry";
import { parseFiles } from "@/lib/file-utils";

type Provider = Exclude<ProviderId, "auto">;
const PROVIDERS: Provider[] = ["openai", "anthropic", "gemini", "xai", "nvidia"];

export default function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<Provider>("openai");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");

  useEffect(() => setSettings(loadSettings()), []);

  const activeProviderSettings = settings.providers[activeTab];
  const activeModels = useMemo(() => modelsForProvider(activeTab), [activeTab]);

  function updateProvider(provider: Provider, patch: Partial<AppSettings["providers"][Provider]>) {
    setSettings((prev) => ({ ...prev, providers: { ...prev.providers, [provider]: { ...prev.providers[provider], ...patch } } }));
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
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

  async function test(provider: Provider) {
    setStatus(`Testing ${PROVIDER_LABELS[provider]}...`);
    try {
      const response = await fetch("/api/test-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model: selectedModel(settings, provider), apiKey: settings.providers[provider].apiKey }),
      });
      if (!response.ok) throw new Error(await response.text());
      saveSettings(settings);
      setStatus(`${PROVIDER_LABELS[provider]} connection successful. Settings saved.`);
    } catch (error) {
      setStatus(error instanceof Error ? `${PROVIDER_LABELS[provider]} failed: ${error.message}` : `${PROVIDER_LABELS[provider]} failed.`);
    }
  }

  async function uploadInstruction(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;
    const parsed = await parseFiles(event.target.files);
    const content = parsed.map((file) => file.text || file.warning || "").join("\n\n").slice(0, 24000);
    const fileName = parsed[0]?.name?.replace(/\.[^.]+$/, "") || "Uploaded Instructions";
    setSettings((prev) => ({
      ...prev,
      instructionProfiles: [...prev.instructionProfiles.map((item) => ({ ...item, active: false })), { id: uid("inst"), name: fileName, content, active: true }],
    }));
    event.target.value = "";
  }

  function updateInstruction(id: string, patch: Partial<AppSettings["instructionProfiles"][number]>) {
    setSettings((prev) => ({ ...prev, instructionProfiles: prev.instructionProfiles.map((profile) => profile.id === id ? { ...profile, ...patch } : profile) }));
  }

  function addInstruction() {
    setSettings((prev) => ({ ...prev, instructionProfiles: [...prev.instructionProfiles.map((item) => ({ ...item, active: false })), { id: uid("inst"), name: "New profile", content: "", active: true }] }));
  }

  function removeInstruction(id: string) {
    setSettings((prev) => ({ ...prev, instructionProfiles: prev.instructionProfiles.filter((item) => item.id !== id) }));
  }

  return (
    <AppShell>
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-blue-300">Settings</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Multi-AI Studio Configuration</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Add API keys for OpenAI, Claude, Gemini, Grok/xAI, and NVIDIA. Keys are stored locally in your browser unless you use .env.local server keys.
            </p>
          </div>
          <Link href="/chat" className="btn-ghost rounded-2xl px-4 py-2 text-sm">
            Back to Chat
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="panel-surface rounded-3xl p-5 shadow-glow">
            <div className="mb-5 flex flex-wrap gap-2">
              {PROVIDERS.map((provider) => (
                <button key={provider} onClick={() => setActiveTab(provider)} className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${activeTab === provider ? "border-blue-400/40 bg-blue-500/15 text-blue-100" : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-white"}`}>{PROVIDER_LABELS[provider]}</button>
              ))}
            </div>

            <div className="space-y-5">
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
                Enable {PROVIDER_LABELS[activeTab]}
                <input type="checkbox" checked={activeProviderSettings.enabled} onChange={(event) => updateProvider(activeTab, { enabled: event.target.checked })} />
              </label>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">API key</label>
                <div className="flex gap-2">
                  <input
                    value={activeProviderSettings.apiKey}
                    onChange={(event) => updateProvider(activeTab, { apiKey: event.target.value })}
                    type={showKeys[activeTab] ? "text" : "password"}
                    placeholder={`${PROVIDER_LABELS[activeTab]} API key or leave empty for .env.local`}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-400/50"
                  />
                  <button onClick={() => setShowKeys((prev) => ({ ...prev, [activeTab]: !prev[activeTab] }))} className="rounded-2xl border border-white/10 px-4 text-sm text-slate-300 hover:bg-white/10">{showKeys[activeTab] ? "Hide" : "Show"}</button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
                <select value={activeProviderSettings.model} onChange={(event) => updateProvider(activeTab, { model: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-400/50">
                  {activeModels.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
                  <option value="custom">Custom model ID</option>
                </select>
                {activeProviderSettings.model === "custom" ? <input value={activeProviderSettings.customModel} onChange={(event) => updateProvider(activeTab, { customModel: event.target.value })} placeholder="Exact model ID" className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-400/50" /> : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {MODELS.filter((model) => model.provider === activeTab).map((model) => (
                    <div key={model.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                      <div className="text-sm font-semibold text-white">{model.label}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-400">{model.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">{model.capabilities.map((cap) => <span key={cap} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">{cap}</span>)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => test(activeTab)} className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-200 hover:bg-white/10">Test {PROVIDER_LABELS[activeTab]}</button>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="panel-surface rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-white">Chat behavior</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-sm text-slate-300">Active provider</label>
                <select value={settings.activeProvider} onChange={(event) => update("activeProvider", event.target.value as ProviderId)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none">
                  <option value="auto">Auto Router</option>
                  {PROVIDERS.map((provider) => <option key={provider} value={provider}>{PROVIDER_LABELS[provider]}</option>)}
                </select>
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">Fallback models <input type="checkbox" checked={settings.fallbackEnabled} onChange={(event) => update("fallbackEnabled", event.target.checked)} /></label>
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">Streaming <input type="checkbox" checked={settings.streaming} onChange={(event) => update("streaming", event.target.checked)} /></label>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><div className="mb-2 flex justify-between text-sm"><span>Temperature</span><span>{settings.temperature}</span></div><input type="range" min="0" max="1" step="0.1" value={settings.temperature} onChange={(event) => update("temperature", Number(event.target.value))} className="w-full" /></div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"><div className="mb-2 flex justify-between text-sm"><span>Max tokens</span><span>{settings.maxTokens}</span></div><input type="range" min="256" max="8192" step="128" value={settings.maxTokens} onChange={(event) => update("maxTokens", Number(event.target.value))} className="w-full" /></div>
              </div>
            </section>

            <section className="panel-surface rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">Instruction profiles</h2><button onClick={addInstruction} className="btn-ghost rounded-xl px-3 py-2 text-xs">Add</button></div>
              <label className="btn-ghost mt-3 inline-flex cursor-pointer rounded-xl px-3 py-2 text-xs">Upload instruction file<input type="file" className="hidden" accept=".txt,.md,.pdf" onChange={uploadInstruction} /></label>
              <div className="mt-4 space-y-4">
                {settings.instructionProfiles.map((profile) => (
                  <div key={profile.id} className="rounded-2xl border border-white/10 bg-slate-950/65 p-3">
                    <div className="mb-2 flex items-center gap-2"><input type="checkbox" checked={profile.active} onChange={(event) => updateInstruction(profile.id, { active: event.target.checked })} /><input value={profile.name} onChange={(event) => updateInstruction(profile.id, { name: event.target.value })} className="w-full bg-transparent text-sm font-semibold text-white outline-none" /><button onClick={() => removeInstruction(profile.id)} className="text-xs text-rose-300">Remove</button></div>
                    <textarea value={profile.content} onChange={(event) => updateInstruction(profile.id, { content: event.target.value.slice(0, 24000) })} rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-5 text-slate-200 outline-none" />
                    <div className="mt-1 text-right text-[10px] text-slate-500">{profile.content.length.toLocaleString()} / 24,000</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel-surface rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-white">Agent prompts</h2>
              <div className="mt-4 space-y-3">
                {(["research", "code", "writer"] as const).map((agent) => <div key={agent}><label className="mb-1 block text-xs font-semibold capitalize text-slate-400">{agent}</label><textarea value={settings.systemPrompts[agent]} onChange={(event) => setSettings((prev) => ({ ...prev, systemPrompts: { ...prev.systemPrompts, [agent]: event.target.value } }))} rows={4} className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs leading-5 text-slate-200 outline-none" /></div>)}
              </div>
            </section>
          </aside>
        </div>

        <div className="panel-surface sticky bottom-4 mt-6 rounded-3xl p-4 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-300">{status || "Remember to save settings after changes."}</div>
            <div className="flex gap-2">
              <button onClick={reset} className="rounded-2xl border border-rose-400/20 px-5 py-3 text-sm text-rose-200 hover:bg-rose-500/10">
                Reset
              </button>
              <button onClick={save} className="btn-primary rounded-2xl px-5 py-3 text-sm font-semibold">
                Save settings
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
