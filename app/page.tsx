"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function HomePage() {
  const router = useRouter();
  const [roomInput, setRoomInput] = useState("");
  const [error, setError] = useState("");

  function handleJoinRoom() {
    const trimmed = roomInput.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a room code.");
      return;
    }
    router.push(`/board/${trimmed}`);
  }

  function handleCreateRoom() {
    router.push(`/board/${generateRoomId()}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleJoinRoom();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[#f8f7f4]">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-rose-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-100 opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-100 opacity-30 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-5xl select-none">🖊️</span>
            <h1 className="text-5xl font-bold tracking-tight text-slate-800">
              LinguaBoard
            </h1>
          </div>
          <p className="text-slate-500 text-lg leading-relaxed">
            A live Excalidraw whiteboard for Chinese &amp; English tutoring.
            <br />
            Draw, annotate, and translate — together.
          </p>
          <div className="mt-3 flex justify-center gap-2 text-2xl select-none">
            <span>🇨🇳</span>
            <span className="text-slate-400">↔</span>
            <span>🇬🇧</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <label
            htmlFor="room-input"
            className="block text-sm font-semibold text-slate-600 mb-2"
          >
            Room Code
          </label>
          <input
            id="room-input"
            type="text"
            value={roomInput}
            onChange={(e) => {
              setRoomInput(e.target.value.toUpperCase());
              setError("");
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. ABC123"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono text-lg tracking-widest transition"
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
          />
          {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}

          <button
            onClick={handleJoinRoom}
            className="mt-4 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-base transition-colors shadow-sm cursor-pointer"
          >
            Join Room →
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-widest">
                or
              </span>
            </div>
          </div>

          <button
            onClick={handleCreateRoom}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-semibold text-base transition-colors shadow-sm cursor-pointer"
          >
            ✨ Create New Room
          </button>
        </div>

        {/* Feature chips */}
        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-sm text-slate-500">
          <div className="bg-white/80 rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="text-xl mb-1">🔴</div>
            Real-time sync
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="text-xl mb-1">💬</div>
            AI translation
          </div>
          <div className="bg-white/80 rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="text-xl mb-1">🀄</div>
            Pinyin support
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Built with Excalidraw · Supabase · OpenAI
        </p>
      </div>
    </main>
  );
}
