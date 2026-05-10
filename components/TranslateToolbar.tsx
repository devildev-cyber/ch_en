"use client";

import { useState, useEffect } from "react";

export type TranslationResult = {
  detected_language: "zh" | "en";
  original: string;
  translation: string;
  pinyin: string;
};

type Props = {
  text: string;
  onTranslate: (result: TranslationResult) => void;
  onDismiss: () => void;
};

export default function TranslateToolbar({ text, onTranslate, onDismiss }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TranslationResult | null>(null);

  // Start translating the moment the toolbar mounts — no extra click needed.
  useEffect(() => { fetchTranslation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTranslation() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Translation failed");
      }
      const data = (await res.json()) as TranslationResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleAddToBoard() {
    if (!result) return;
    onTranslate(result);
  }

  const langLabel =
    result?.detected_language === "zh" ? "Chinese → English" : "English → Chinese";

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>✨</span>
            <span className="text-sm font-semibold text-slate-700">
              Translate + Pinyin
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200 cursor-pointer"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Selected text preview */}
          <div className="bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-600 border border-slate-100 line-clamp-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-0.5">
              Selected text
            </span>
            <span className="font-medium">&ldquo;{text}&rdquo;</span>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-3 text-slate-400 text-sm">
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Translating…
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-rose-500 text-xs text-center">{error}</p>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {langLabel}
              </p>

              <div className="bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100">
                <p className="text-xs text-indigo-400 font-medium mb-0.5">
                  Pinyin
                </p>
                <p className="text-indigo-700 font-medium text-sm">
                  {result.pinyin}
                </p>
              </div>

              <div className="bg-teal-50 rounded-xl px-3 py-2 border border-teal-100">
                <p className="text-xs text-teal-500 font-medium mb-0.5">
                  Translation
                </p>
                <p className="text-teal-800 font-semibold text-base">
                  {result.translation}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddToBoard}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  + Add to Board
                </button>
                <button
                  onClick={fetchTranslation}
                  disabled={loading}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
                  title="Re-translate"
                >
                  ↻
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
