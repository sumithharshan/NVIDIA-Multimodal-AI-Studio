"use client";

import { ChatSession } from "@/lib/types";

export default function Sidebar({
  chats,
  activeId,
  onNew,
  onSelect,
  onDelete,
}: {
  chats: ChatSession[];
  activeId?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="hidden h-screen w-80 shrink-0 border-r border-white/10 bg-slate-950/70 p-4 backdrop-blur-xl lg:block">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">NVIDIA Agents</h1>
          <p className="text-xs text-slate-500">Local chat history</p>
        </div>
        <button onClick={onNew} className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-blue-100">
          New
        </button>
      </div>

      <div className="thin-scrollbar max-h-[calc(100vh-110px)] space-y-2 overflow-y-auto pr-1">
        {chats.map((chat) => (
          <div key={chat.id} className={`group rounded-2xl border p-3 transition ${activeId === chat.id ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"}`}>
            <button onClick={() => onSelect(chat.id)} className="block w-full text-left">
              <p className="truncate text-sm font-medium text-slate-100">{chat.title}</p>
              <p className="mt-1 text-xs text-slate-500">{chat.messages.length} messages</p>
            </button>
            <button onClick={() => onDelete(chat.id)} className="mt-2 hidden text-xs text-red-300 hover:text-red-200 group-hover:block">
              Delete
            </button>
          </div>
        ))}

        {!chats.length && (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
            No saved chats yet.
          </div>
        )}
      </div>
    </aside>
  );
}
