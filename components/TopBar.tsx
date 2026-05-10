"use client";

import { useState } from "react";
import type { ExcalidrawCanvasHandle } from "./ExcalidrawCanvas";

type Props = {
  roomId: string;
  boardHandle: ExcalidrawCanvasHandle | null;
};

export default function TopBar({ roomId, boardHandle }: Props) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  function handleCopyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => showToast("Could not copy link"));
  }

  function handleTranslate() {
    if (!boardHandle) return;
    const hadSelection = boardHandle.translateSelected();
    if (!hadSelection) {
      showToast("Select a text element on the board first");
    }
  }

  function handleSaveNotes() {
    if (!boardHandle) return;
    const notes = boardHandle.getLessonNotes();
    if (!notes.trim()) {
      showToast("No text on the board yet");
      return;
    }
    const blob = new Blob([notes], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `linguaboard-notes-${roomId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Lesson notes downloaded!");
  }

  async function handleExport() {
    if (!boardHandle) return;
    showToast("Exporting board…");
    await boardHandle.exportBoard();
  }

  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-3 px-4 bg-white border-b border-slate-200 z-40">
      {/* Brand */}
      <a href="/" className="flex items-center gap-2 mr-2 select-none">
        <span className="text-xl" aria-hidden>🖊️</span>
        <span className="font-bold text-slate-800 text-base hidden sm:inline">
          LinguaBoard
        </span>
      </a>

      {/* Room badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-mono font-semibold text-slate-600">
          {roomId}
        </span>
      </div>

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <TopBarButton
          onClick={handleCopyLink}
          icon={copied ? "✓" : "🔗"}
          label={copied ? "Copied!" : "Copy invite link"}
          active={copied}
        />
        <TopBarButton
          onClick={handleTranslate}
          icon="✨"
          label="Translate selected"
          disabled={!boardHandle}
        />
        <TopBarButton
          onClick={handleSaveNotes}
          icon="📝"
          label="Save lesson notes"
          disabled={!boardHandle}
        />
        <TopBarButton
          onClick={handleExport}
          icon="⬇️"
          label="Export board"
          disabled={!boardHandle}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-slate-800 text-white text-sm rounded-xl shadow-xl pointer-events-none animate-fade-in">
          {toast}
        </div>
      )}
    </header>
  );
}

type ButtonProps = {
  onClick: () => void;
  icon: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
};

function TopBarButton({ onClick, icon, label, disabled, active }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800",
      ].join(" ")}
    >
      <span aria-hidden>{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
