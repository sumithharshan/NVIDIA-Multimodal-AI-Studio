"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentType, ChatMessage as ChatMessageType, ChatSession, UploadedContextFile } from "@/lib/types";
import { activeInstruction, createEmptyChat, getActiveChatId, loadChats, loadSettings, saveChats, selectedModel, setActiveChatId, titleFromMessage, uid } from "@/lib/storage";
import { routeAgent } from "@/lib/agents";
import { fileTextContext } from "@/lib/file-utils";
import { pickProvider, fallbackProviders } from "@/lib/router";
import AppShell from "./AppShell";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import ChatInput, { ChatInputHandle } from "./ChatInput";
import ChatMessageView from "./ChatMessage";

export default function ChatWindow() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [settings, setSettings] = useState(loadSettings());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef<{ content: string; files: UploadedContextFile[]; agent: AgentType } | null>(null);
  const inputRef = useRef<ChatInputHandle | null>(null);

  const activeChat = chats.find((chat) => chat.id === activeId);
  const activeProvider = settings.activeProvider;
  const activeModel = useMemo(() => activeProvider === "auto" ? "Smart routing" : selectedModel(settings, activeProvider), [settings, activeProvider]);
  const instructionsActive = Boolean(activeInstruction(settings));

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    const stored = loadChats();
    const active = getActiveChatId();
    if (stored.length) {
      setChats(stored);
      setActiveId(active && stored.some((chat) => chat.id === active) ? active : stored[0].id);
    } else {
      const chat = createEmptyChat();
      setChats([chat]);
      setActiveId(chat.id);
      saveChats([chat]);
      setActiveChatId(chat.id);
    }
  }, []);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [activeChat?.messages, loading]);

  function commit(nextChats: ChatSession[]) {
    setChats(nextChats);
    saveChats(nextChats);
  }

  function updateChatById(chatId: string, updater: (chat: ChatSession) => ChatSession) {
    setChats((current) => {
      const next = current.map((chat) => chat.id === chatId ? updater(chat) : chat);
      saveChats(next);
      return next;
    });
  }

  function newChat() {
    const chat = createEmptyChat();
    commit([chat, ...chats]);
    setActiveId(chat.id);
    setActiveChatId(chat.id);
  }

  function selectChat(id: string) {
    setActiveId(id);
    setActiveChatId(id);
  }

  function deleteChat(id: string) {
    const next = chats.filter((chat) => chat.id !== id);
    if (!next.length) {
      const chat = createEmptyChat();
      commit([chat]);
      setActiveId(chat.id);
      return;
    }
    commit(next);
    if (activeId === id) setActiveId(next[0].id);
  }

  function buildCurrentUserPayload(content: string, files: UploadedContextFile[]) {
    const text = `${content}${fileTextContext(files)}`.trim();
    const imageFiles = files.filter((file) => file.dataUrl?.startsWith("data:image"));
    if (!imageFiles.length) return text;
    return [
      { type: "text" as const, text: text || "Please analyze the attached image." },
      ...imageFiles.map((file) => ({ type: "image_url" as const, image_url: { url: file.dataUrl! } })),
    ];
  }

  function buildSystemPrompt(agent: Exclude<AgentType, "auto">, loadedSettings = loadSettings()) {
    const instructions = activeInstruction(loadedSettings);
    const agentPrompt = loadedSettings.systemPrompts[agent];
    return [instructions ? `GLOBAL INSTRUCTIONS:\n${instructions}` : "", `AGENT INSTRUCTIONS:\n${agentPrompt}`].filter(Boolean).join("\n\n");
  }

  async function sendMessage(content: string, override: AgentType, files: UploadedContextFile[], seedMessages?: ChatMessageType[]) {
    const latestSettings = loadSettings();
    setSettings(latestSettings);
    if (!activeChat) return;

    const chatId = activeChat.id;
    const previousMessages = seedMessages ?? activeChat.messages;
    const provider = pickProvider(latestSettings, content, files);
    const model = selectedModel(latestSettings, provider);
    const providerConfig = latestSettings.providers[provider];

    if (!providerConfig.enabled) {
      alert(`${provider} is disabled in Settings.`);
      return;
    }

    const agent = routeAgent(content, override);
    const now = new Date().toISOString();
    const userMessage: ChatMessageType = { id: uid("msg"), role: "user", content, files, createdAt: now };
    const assistantId = uid("msg");
    const assistantMessage: ChatMessageType = { id: assistantId, role: "assistant", content: "", agent, provider, model, createdAt: now };

    lastPromptRef.current = { content, files, agent: override };

    updateChatById(chatId, (chat) => ({
      ...chat,
      title: chat.messages.length ? chat.title : titleFromMessage(content || files[0]?.name || "New chat"),
      messages: seedMessages ? [...seedMessages, userMessage, assistantMessage] : [...chat.messages, userMessage, assistantMessage],
      updatedAt: now,
    }));

    setLoading(true);
    setStreamingMessageId(assistantId);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiMessages = [
        ...previousMessages.filter((message) => message.role === "user" || message.role === "assistant").map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
        { role: "user" as const, content: buildCurrentUserPayload(content, files) },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          apiKey: providerConfig.apiKey,
          messages: apiMessages,
          systemPrompt: buildSystemPrompt(agent, latestSettings),
          temperature: latestSettings.temperature,
          maxTokens: latestSettings.maxTokens,
          stream: latestSettings.streaming,
          fallbackEnabled: latestSettings.fallbackEnabled,
          fallbackProviders: fallbackProviders(latestSettings, provider),
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(await response.text());
      const usedProvider = (response.headers.get("x-ai-provider") || provider) as typeof provider;
      const usedModel = response.headers.get("x-ai-model") || model;

      if (latestSettings.streaming && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) {
            await reader.cancel();
            break;
          }
          full += decoder.decode(value, { stream: true });
          updateChatById(chatId, (chat) => ({ ...chat, messages: chat.messages.map((message) => message.id === assistantId ? { ...message, content: full, provider: usedProvider, model: usedModel } : message), updatedAt: new Date().toISOString() }));
        }
      } else {
        const data = await response.json();
        updateChatById(chatId, (chat) => ({ ...chat, messages: chat.messages.map((message) => message.id === assistantId ? { ...message, content: data.content || "No response received.", provider: usedProvider, model: usedModel } : message), updatedAt: new Date().toISOString() }));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "Something went wrong.";
      updateChatById(chatId, (chat) => ({ ...chat, messages: chat.messages.map((item) => item.id === assistantId ? { ...item, content: `Error: ${message}` } : item), updatedAt: new Date().toISOString() }));
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
      setStreamingMessageId(null);
    }
  }

  function stopGeneration() {
    abortControllerRef.current?.abort();
    if (streamingMessageId) {
      updateChatById(activeId, (chat) => ({ ...chat, messages: chat.messages.map((message) => message.id === streamingMessageId ? { ...message, stopped: true } : message) }));
    }
    if (lastPromptRef.current) inputRef.current?.setDraft(lastPromptRef.current.content, lastPromptRef.current.files);
  }

  function editUserMessage(message: ChatMessageType) {
    if (!activeChat) return;
    const index = activeChat.messages.findIndex((item) => item.id === message.id);
    if (index < 0) return;
    updateChatById(activeChat.id, (chat) => ({ ...chat, messages: chat.messages.slice(0, index), updatedAt: new Date().toISOString() }));
    inputRef.current?.setDraft(message.content, message.files || []);
  }

  function regenerate() {
    if (!activeChat) return;
    const lastUserIndex = [...activeChat.messages].map((m, i) => ({ m, i })).reverse().find((item) => item.m.role === "user")?.i;
    if (lastUserIndex === undefined) return;
    const lastUser = activeChat.messages[lastUserIndex];
    const seed = activeChat.messages.slice(0, lastUserIndex);
    updateChatById(activeChat.id, (chat) => ({ ...chat, messages: seed, updatedAt: new Date().toISOString() }));
    sendMessage(lastUser.content, "auto", lastUser.files || [], seed);
  }

  function clearActiveChat() {
    if (!activeChat) return;
    updateChatById(activeChat.id, (chat) => ({ ...chat, messages: [], title: "New chat", updatedAt: new Date().toISOString() }));
  }

  function exportChat() {
    if (!activeChat) return;
    const text = activeChat.messages.map((message) => `${message.role.toUpperCase()}${message.provider ? ` [${message.provider} ${message.model || ""}]` : ""}:\n${message.content}\n`).join("\n---\n\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeChat.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "chat"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          chats={chats}
          activeId={activeId}
          onNew={newChat}
          onSelect={selectChat}
          onDelete={deleteChat}
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <section className="relative flex h-screen min-h-0 min-w-0 flex-1 flex-col">
          <TopNav
            provider={activeProvider}
            model={activeModel}
            instructionsActive={instructionsActive}
            fallback={settings.fallbackEnabled}
            onExport={exportChat}
            onClear={clearActiveChat}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <div className="thin-scrollbar mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6">
            {activeChat?.messages.length ? (
              activeChat.messages.map((message) => (
                <ChatMessageView
                  key={message.id}
                  message={message}
                  isStreaming={message.id === streamingMessageId}
                  onEdit={editUserMessage}
                  onRegenerate={message.role === "assistant" ? regenerate : undefined}
                />
              ))
            ) : (
              <div className="panel-surface my-auto rounded-[2rem] p-8 text-center shadow-glow sm:p-10">
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-blue-300">Unified AI Chat Studio</p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  One Workspace for every AI Agent
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                  Route across OpenAI, Claude, Gemini, Grok, and NVIDIA. Upload files, paste screenshots, edit prompts,
                  stop generation, and fall back automatically when a provider fails.
                </p>
                <div className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-3">
                  {[
                    ["Auto routing", "Pick the best provider per message"],
                    ["File context", "PDFs, images, and pasted screenshots"],
                    ["Local settings", "API keys stay in your browser"],
                  ].map(([title, detail]) => (
                    <div key={title} className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <p className="text-sm font-semibold text-slate-100">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="relative z-20 mx-auto w-full max-w-6xl shrink-0 border-t border-white/8 bg-[#060a12]/92 px-4 pb-4 pt-3 backdrop-blur-xl sm:px-6">
            <ChatInput ref={inputRef} onSend={sendMessage} disabled={loading} isGenerating={loading} onStop={stopGeneration} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
