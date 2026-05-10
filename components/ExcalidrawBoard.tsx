"use client";

import dynamic from "next/dynamic";
import type { ExcalidrawCanvasHandle } from "./ExcalidrawCanvas";

// ExcalidrawCanvas must be loaded only in the browser:
// - Excalidraw accesses `window` during module init
// - The CSS import inside ExcalidrawCanvas also only makes sense client-side
const ExcalidrawCanvas = dynamic(() => import("./ExcalidrawCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-neutral-50">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading whiteboard…</p>
      </div>
    </div>
  ),
});

type Props = {
  roomId: string;
  onReady: (handle: ExcalidrawCanvasHandle) => void;
};

export default function ExcalidrawBoard({ roomId, onReady }: Props) {
  return <ExcalidrawCanvas roomId={roomId} onReady={onReady} />;
}

export type { ExcalidrawCanvasHandle };
