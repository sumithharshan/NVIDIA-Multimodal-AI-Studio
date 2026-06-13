"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentType, ChatMessage, ChatSession, UploadedContextFile } from "@/lib/types";
import { DEFAULT_SETTINGS, createEmptyChat, getActiveChatId, loadChats, loadSettings, saveChats, setActiveChatId, titleFromMessage, uid } from "@/lib/storage";
import { routeAgent } from "@/lib/agents";
import { filesToContext } from "@/lib/file-utils";
import { supportsImageEditing, supportsImageGeneration, supportsTTS, supportsVision } from "@/lib/nvidia";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import ChatInput from "./ChatInput";
import ChatMessageView from "./ChatMessage";

export default function ChatWindow() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeChat = chats.find((chat) => chat.id === activeId);
  const selectedModel = settings?.model === "custom" ? settings.customModel : settings?.model || "";
  const isImageModel = useMemo(() => supportsImageGeneration(selectedModel), [selectedModel]);
  const isTTSModel = useMemo(() => supportsTTS(selectedModel), [selectedModel]);

  useEffect(() => {
    setSettings(loadSettings());
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
    setChats((currentChats) => {
      const next = currentChats.map((chat) => chat.id === chatId ? updater(chat) : chat);
      saveChats(next);
      return next;
    });
  }

  function newChat() {
    const chat = createEmptyChat();
    const next = [chat, ...chats];
    commit(next);
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

  function updateActiveChat(updater: (chat: ChatSession) => ChatSession) {
    updateChatById(activeId, updater);
  }

  function toChatPayload(message: ChatMessage) {
    return { role: message.role, content: message.content };
  }

  function buildCurrentUserPayload(userMessage: ChatMessage, files: UploadedContextFile[], modelId: string) {
    const fileContext = filesToContext(files.filter((file) => !file.dataUrl || file.type.startsWith("audio/")));
    const imageFiles = files.filter((file) => file.dataUrl && file.type.startsWith("image/"));

    if (supportsVision(modelId) && imageFiles.length) {
      return {
        role: "user" as const,
        content: [
          { type: "text", text: `${userMessage.content}${fileContext}`.trim() },
          ...imageFiles.map((file) => ({ type: "image_url", image_url: { url: file.dataUrl! } })),
        ],
      };
    }

    return {
      role: "user" as const,
      content: `${userMessage.content}${fileContext}`,
    };
  }

  async function sendMessage(content: string, override: AgentType, files: UploadedContextFile[]) {
    const latestSettings = loadSettings();
    setSettings(latestSettings);

    const latestSelectedModel = latestSettings.model === "custom" ? latestSettings.customModel : latestSettings.model;

    if (!latestSettings.apiKey?.trim()) {
      alert("Missing NVIDIA API key. Please add and save it in Settings first.");
      return;
    }

    if (!latestSelectedModel?.trim()) {
      alert("Missing model ID. Please choose a model in Settings first.");
      return;
    }

    if (!activeChat) return;

    const chatId = activeChat.id;
    const agent = routeAgent(content, override);
    const now = new Date().toISOString();
    const userMessage: ChatMessage = { id: uid("msg"), role: "user", content, files, createdAt: now };
    const assistantId = uid("msg");
    const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", content: "", agent, createdAt: now };

    const previousMessages = activeChat.messages;
    updateChatById(chatId, (chat) => ({
      ...chat,
      title: chat.messages.length ? chat.title : titleFromMessage(content || files[0]?.name || "New chat"),
      messages: [...chat.messages, userMessage, assistantMessage],
      updatedAt: now,
    }));

    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (supportsTTS(latestSelectedModel)) {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: latestSettings.apiKey,
            model: latestSelectedModel,
            input: content,
            voice: "Magpie-ZeroShot.Female-1",
            sampleAudio: files.find((file) => file.dataUrl && file.type.startsWith("audio/"))?.dataUrl,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        updateChatById(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) => message.id === assistantId ? {
            ...message,
            content: data.note || `Generated voice output with ${latestSelectedModel}.`,
            generatedAudio: data.audio,
          } : message),
          updatedAt: new Date().toISOString(),
        }));
        return;
      }

      if (supportsImageGeneration(latestSelectedModel)) {
        const imageFiles = files.filter((file) => file.dataUrl && file.type.startsWith("image/")).map((file) => file.dataUrl);
        const response = await fetch("/api/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: latestSettings.apiKey,
            model: latestSelectedModel,
            prompt: content,
            images: imageFiles,
            edit: supportsImageEditing(latestSelectedModel) && imageFiles.length > 0,
          }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();
        updateChatById(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) => message.id === assistantId ? {
            ...message,
            content: data.note || (data.images?.length ? `Generated ${data.images.length} image${data.images.length > 1 ? "s" : ""} with ${latestSelectedModel}.` : "Image generation completed."),
            generatedImages: data.images || [],
          } : message),
          updatedAt: new Date().toISOString(),
        }));
        return;
      }

      const apiMessages = [
        ...previousMessages.map(toChatPayload),
        buildCurrentUserPayload(userMessage, files, latestSelectedModel),
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: latestSettings.apiKey,
          model: latestSelectedModel,
          temperature: latestSettings.temperature,
          maxTokens: latestSettings.maxTokens,
          stream: latestSettings.streaming,
          messages: apiMessages,
          systemPrompt: latestSettings.systemPrompts[agent],
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(await response.text());

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
          updateChatById(chatId, (chat) => ({
            ...chat,
            messages: chat.messages.map((message) => message.id === assistantId ? { ...message, content: full } : message),
            updatedAt: new Date().toISOString(),
          }));
        }
      } else {
        const data = await response.json();
        const full = data.content || "No response received.";
        updateChatById(chatId, (chat) => ({
          ...chat,
          messages: chat.messages.map((message) => message.id === assistantId ? { ...message, content: full } : message),
          updatedAt: new Date().toISOString(),
        }));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "Something went wrong.";
      updateChatById(chatId, (chat) => ({
        ...chat,
        messages: chat.messages.map((item) => item.id === assistantId ? { ...item, content: `Error: ${message}` } : item),
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }

  function stopGeneration() {
    abortControllerRef.current?.abort();
  }

  function clearActiveChat() {
    updateActiveChat((chat) => ({ ...chat, messages: [], title: "New chat", updatedAt: new Date().toISOString() }));
  }

  function exportChat() {
    if (!activeChat) return;
    const text = activeChat.messages.map((message) => {
      const imageLines = message.generatedImages?.map((src) => `IMAGE: ${src}`).join("\n") || "";
      const audioLine = message.generatedAudio ? `AUDIO: ${message.generatedAudio}` : "";
      return `${message.role.toUpperCase()}${message.agent ? ` [${message.agent}]` : ""}:\n${message.content}\n${imageLines}\n${audioLine}\n`;
    }).join("\n---\n\n");
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeChat.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "chat"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex min-h-screen bg-grid bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.16),transparent_30%)]" />
      <Sidebar chats={chats} activeId={activeId} onNew={newChat} onSelect={selectChat} onDelete={deleteChat} />
      <section className="relative flex h-screen min-w-0 flex-1 flex-col">
        <TopNav model={selectedModel} onExport={exportChat} onClear={clearActiveChat} />
        <div className="thin-scrollbar mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
          {activeChat?.messages.length ? activeChat.messages.map((message) => <ChatMessageView key={message.id} message={message} />) : (
            <div className="my-auto rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center shadow-glow backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Start a conversation</p>
              <h1 className="mt-3 text-3xl font-bold text-white">Chat, analyze images, generate images, translate, or create voice</h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">Use Kimi K2.6 or Qwen multimodal models for image understanding, FLUX/SDXL for hosted image generation, and Riva/Magpie for translation and voice. Chats are saved locally.</p>
            </div>
          )}
          {loading && <div className="text-sm text-slate-500">{isTTSModel ? "Generating voice..." : isImageModel ? "Generating image..." : "Generating..."}</div>}
          <div ref={bottomRef} />
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-4">
          <ChatInput onSend={sendMessage} disabled={loading} isGenerating={loading} onStop={stopGeneration} selectedModel={selectedModel} />
        </div>
      </section>
    </div>
  );
}
