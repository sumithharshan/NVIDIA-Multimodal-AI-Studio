"use client";

import { ChatSession } from "@/lib/types";

export default function Sidebar({
  chats,
  activeId,
  onNew,
  onSelect,
  onDelete,
  mobileOpen,
  onClose,
}: {
  chats: ChatSession[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  function handleSelect(id: string) {
    onSelect(id);
    onClose?.();
  }

  function handleNew() {
    onNew();
    onClose?.();
  }

  const content = (
    <>
      <div className="mb-5 flex items-center gap-3 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-sm font-bold text-blue-200 shadow-[0_0_24px_rgba(59,130,246,0.2)]">
          AI
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Fynlaps Studio</p>
          <p className="text-[11px] text-slate-500">Multi-AI Agentic Studio</p>
        </div>
      </div>

      <button onClick={handleNew} className="btn-primary mb-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold">
        New chat
      </button>

      <div className="thin-scrollbar h-[calc(100vh-148px)] space-y-2 overflow-y-auto pr-1 lg:h-[calc(100vh-156px)]">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group rounded-2xl border p-3 transition ${
              chat.id === activeId
                ? "border-blue-400/35 bg-blue-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "border-white/8 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.06]"
            }`}
          >
            <button onClick={() => handleSelect(chat.id)} className="w-full text-left">
              <div className="truncate text-sm font-medium text-slate-100">{chat.title}</div>
              <div className="mt-1 text-xs text-slate-500">{chat.messages.length} messages</div>
            </button>
            <button
              onClick={() => onDelete(chat.id)}
              className="mt-2 text-xs text-slate-500 opacity-0 transition hover:text-rose-300 group-hover:opacity-100"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={`panel-surface fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] shrink-0 flex-col p-4 transition-transform duration-300 lg:static lg:z-10 lg:block lg:h-screen lg:w-80 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {content}
      </aside>
    </>
  );
}
