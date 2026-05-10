"use client";

import "@excalidraw/excalidraw/index.css";
import { CaptureUpdateAction, Excalidraw, exportToBlob, reconcileElements } from "@excalidraw/excalidraw";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import TranslateToolbar from "./TranslateToolbar";
import type { TranslationResult } from "./TranslateToolbar";
import type { RealtimeChannel } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElement = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAppState = any;

export type ExcalidrawCanvasHandle = {
  translateSelected: () => boolean;
  exportBoard: () => Promise<void>;
  getLessonNotes: () => string;
};

type Props = {
  roomId: string;
  onReady: (handle: ExcalidrawCanvasHandle) => void;
};

// ── Constants & helpers ───────────────────────────────────────────────────────

const CURSOR_COLORS = [
  "#e03131", "#2f9e44", "#1971c2", "#f08c00",
  "#ae3ec9", "#0c8599", "#d6336c", "#5c7cfa",
];

function colorFromId(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

function makeSessionId() {
  return Math.random().toString(36).slice(2, 10);
}

// Throttle helper — returns a stable function that fires fn at most once per ms
function makeThrottle(ms: number) {
  let last = 0;
  return (fn: () => void) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(); }
  };
}

function makeTextEl(
  text: string, x: number, y: number, color: string, fontSize: number
): AnyElement {
  const rnd = () => Math.floor(Math.random() * 2 ** 31);
  return {
    id: Math.random().toString(36).slice(2, 11),
    type: "text", x, y,
    width: Math.max(240, text.length * fontSize * 0.58),
    height: Math.ceil(fontSize * 1.5),
    angle: 0, strokeColor: color, backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid",
    roughness: 1, opacity: 100, groupIds: [], frameId: null,
    roundness: null, seed: rnd(), version: 1, versionNonce: rnd(),
    isDeleted: false, boundElements: null, updated: Date.now(),
    link: null, locked: false, text, fontSize, fontFamily: 1,
    textAlign: "left", verticalAlign: "top", containerId: null,
    originalText: text, lineHeight: 1.25, autoResize: true,
  };
}

// ── Cursor overlay ────────────────────────────────────────────────────────────

type RemoteCursor = { sessionId: string; x: number; y: number; color: string };

// View transform extracted from appState — only changes on scroll/zoom
type ViewTransform = { scrollX: number; scrollY: number; zoom: number };

function CursorOverlay({
  cursors,
  view,
}: {
  cursors: Map<string, RemoteCursor>;
  view: ViewTransform;
}) {
  if (cursors.size === 0) return null;

  return (
    <>
      {Array.from(cursors.values()).map((c) => {
        // scene → viewport: viewportX = sceneX * zoom + scrollX
        const vx = c.x * view.zoom + view.scrollX;
        const vy = c.y * view.zoom + view.scrollY;
        return (
          <div
            key={c.sessionId}
            className="pointer-events-none absolute z-50 select-none"
            style={{ left: vx, top: vy, transform: "translate(-2px, -2px)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))" }}
            >
              <path
                d="M2 2 L2 14 L6 10 L10 16 L12 15 L8 9 L14 9 Z"
                fill={c.color} stroke="white" strokeWidth="1"
              />
            </svg>
            <span
              className="absolute top-4 left-3 rounded px-1 py-0.5 text-white text-[10px] font-semibold leading-none whitespace-nowrap"
              style={{ backgroundColor: c.color }}
            >
              {c.sessionId.slice(0, 4)}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExcalidrawCanvas({ roomId, onReady }: Props) {
  const sessionId = useMemo(() => makeSessionId(), []);
  const userColor = useMemo(() => colorFromId(sessionId), [sessionId]);

  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPI | null>(null);
  const [initialData, setInitialData] = useState<{
    elements: AnyElement[];
    appState?: Record<string, unknown>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTextEl, setSelectedTextEl] = useState<AnyElement | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [cursors, setCursors] = useState<Map<string, RemoteCursor>>(new Map());

  // View transform — only updates on scroll/zoom, NOT on every draw frame.
  // This avoids re-rendering the entire component 60×/s during drawing.
  const [viewTransform, setViewTransform] = useState<ViewTransform>(
    { scrollX: 0, scrollY: 0, zoom: 1 }
  );
  const viewTransformRef = useRef<ViewTransform>({ scrollX: 0, scrollY: 0, zoom: 1 });

  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const selectedTextRef = useRef<AnyElement | null>(null);
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Gate: only broadcast once the WebSocket handshake is complete.
  // Without this, Supabase falls back to REST for every early send().
  const subscribedRef = useRef(false);

  // Echo-loop prevention: each remote updateScene() increments this counter.
  // handleChange decrements it and skips broadcasting for that render, so
  // User B doesn't re-broadcast stale positions back to User A (the shaking bug).
  const remoteUpdateCountRef = useRef(0);

  const cursorTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const throttleScene = useMemo(() => makeThrottle(33), []);   // ~30 fps
  const throttlePointer = useMemo(() => makeThrottle(50), []); // ~20 fps

  // ── Load initial scene ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("whiteboard_scenes")
          .select("elements, app_state")
          .eq("room_id", roomId)
          .maybeSingle();

        if (error) {
          console.error("[load] Supabase error:", error.message, error.details);
        }

        if (data) {
          const elements = (data.elements as AnyElement[]) ?? [];
          lastSavedRef.current = JSON.stringify(elements);
          setInitialData({
            elements,
            appState: (data.app_state as Record<string, unknown>) ?? {},
          });
        } else {
          setInitialData({ elements: [], appState: {} });
        }
      } catch (err) {
        console.error("[load] Unexpected error:", err);
        // Still show an empty board rather than staying stuck on loading
        setInitialData({ elements: [], appState: {} });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roomId]);

  // ── Realtime channel ──────────────────────────────────────────────────────
  useEffect(() => {
    subscribedRef.current = false;

    const channel = supabase.channel(`wb:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "scene" }, ({ payload }) => {
        const api = apiRef.current;
        if (!api) return;
        const incoming = JSON.stringify(payload.elements);
        if (incoming === lastSavedRef.current) return;
        lastSavedRef.current = incoming;

        // Reconcile remote elements against local ones using Excalidraw's own
        // version-based algorithm. An element with a higher `version` wins, so
        // a dragged element (local v5) beats a stale echo (remote v3) — no snap-back.
        const localElements = api.getSceneElementsIncludingDeleted();
        const reconciled = reconcileElements(
          localElements,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload.elements as any,
          api.getAppState(),
        );

        // Increment BEFORE updateScene so the resulting onChange skips broadcasting.
        remoteUpdateCountRef.current += 1;
        api.updateScene({
          elements: reconciled,
          // Remote updates must NOT enter the undo/redo stack.
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      })

      .on("broadcast", { event: "pointer" }, ({ payload }) => {
        const sid: string = payload.sessionId;
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(sid, { sessionId: sid, x: payload.x, y: payload.y, color: payload.color });
          return next;
        });
        // Auto-remove after 4 s of silence
        clearTimeout(cursorTimersRef.current.get(sid));
        cursorTimersRef.current.set(
          sid,
          setTimeout(() => {
            setCursors((prev) => { const n = new Map(prev); n.delete(sid); return n; });
          }, 4000)
        );
      })

      .on("broadcast", { event: "disconnect" }, ({ payload }) => {
        const sid: string = payload.sessionId;
        clearTimeout(cursorTimersRef.current.get(sid));
        setCursors((prev) => { const n = new Map(prev); n.delete(sid); return n; });
      })

      // Postgres for late-join: when a new user opens a room they receive the
      // persisted snapshot via postgres_changes before any peers broadcast.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whiteboard_scenes", filter: `room_id=eq.${roomId}` },
        (pl) => {
          const api = apiRef.current;
          if (!api) return;
          const rec = pl.new as { elements: AnyElement[] };
          if (!rec?.elements) return;
          const incoming = JSON.stringify(rec.elements);
          if (incoming === lastSavedRef.current) return;
          lastSavedRef.current = incoming;

          const localElements = api.getSceneElementsIncludingDeleted();
          const reconciled = reconcileElements(
            localElements,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rec.elements as any,
            api.getAppState(),
          );
          remoteUpdateCountRef.current += 1;
          api.updateScene({
            elements: reconciled,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
        }
      )

      // ── Wait for SUBSCRIBED before allowing send() calls ──────────────────
      .subscribe((status) => {
        subscribedRef.current = status === "SUBSCRIBED";
      });

    channelRef.current = channel;

    return () => {
      subscribedRef.current = false;
      // Tell peers we're gone (best-effort — channel may already be closing)
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "disconnect",
          payload: { sessionId },
        }).catch(() => {/* ignore if WS is already closing */});
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, sessionId]);

  // ── onChange ──────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (elements: readonly AnyElement[], appState: ExcalidrawAppState) => {
      // ── Echo-loop guard ─────────────────────────────────────────────────
      // If this onChange was triggered by applying a remote updateScene(),
      // skip broadcasting so we don't echo stale positions back to the sender.
      if (remoteUpdateCountRef.current > 0) {
        remoteUpdateCountRef.current -= 1;
        return;
      }

      // ── Selection detection ─────────────────────────────────────────────
      const selectedIds = (appState.selectedElementIds as Record<string, boolean>) ?? {};
      const textEls = elements.filter(
        (el) => selectedIds[el.id] && el.type === "text" && !el.isDeleted
      );
      if (textEls.length === 1) {
        selectedTextRef.current = textEls[0];
        setSelectedTextEl(textEls[0]);
      } else {
        selectedTextRef.current = null;
        setSelectedTextEl(null);
        setShowToolbar(false);
      }

      // ── View transform: only re-render cursors when scroll/zoom changes ──
      const zoom = typeof appState.zoom === "number"
        ? appState.zoom : (appState.zoom?.value ?? 1);
      const vt = viewTransformRef.current;
      if (
        appState.scrollX !== vt.scrollX ||
        appState.scrollY !== vt.scrollY ||
        zoom !== vt.zoom
      ) {
        const next = { scrollX: appState.scrollX, scrollY: appState.scrollY, zoom };
        viewTransformRef.current = next;
        setViewTransform(next);
      }

      // ── Broadcast scene (only when WebSocket is ready) ──────────────────
      if (!subscribedRef.current) return;

      throttleScene(() => {
        channelRef.current?.send({
          type: "broadcast",
          event: "scene",
          payload: { sessionId, elements: elements as AnyElement[] },
        });
      });

      // ── Debounce-persist to DB for late-join recovery ───────────────────
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const json = JSON.stringify(elements);
        if (json === lastSavedRef.current) return;
        lastSavedRef.current = json;
        await supabase
          .from("whiteboard_scenes")
          .upsert(
            {
              room_id: roomId,
              elements: elements as AnyElement[],
              app_state: { zoom, scrollX: appState.scrollX, scrollY: appState.scrollY },
              updated_at: new Date().toISOString(),
            },
            { onConflict: "room_id" }
          )
          .then(({ error }) => { if (error) console.error("[save]", error.message); });
      }, 2000);
    },
    [roomId, sessionId, throttleScene]
  );

  // ── onPointerUpdate ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointerUpdate = useCallback((payload: any) => {
    // Also guard pointer broadcasts — pointer fires immediately on mount
    // before the WS handshake, causing the same REST fallback warning.
    if (!subscribedRef.current) return;
    throttlePointer(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "pointer",
        payload: { sessionId, x: payload.pointer.x, y: payload.pointer.y, color: userColor },
      });
    });
  }, [sessionId, userColor, throttlePointer]);

  // ── Translation ───────────────────────────────────────────────────────────
  const handleTranslate = useCallback((result: TranslationResult) => {
    const api = apiRef.current;
    const source = selectedTextRef.current;
    if (!api || !source) return;
    const existing: AnyElement[] = [...api.getSceneElements()];
    const baseX: number = source.x as number;
    const baseY: number = (source.y as number) + (source.height as number) + 20;
    api.updateScene({
      elements: [
        ...existing,
        makeTextEl(`🔊 ${result.pinyin}`, baseX, baseY, "#6366f1", 15),
        makeTextEl(`📝 ${result.translation}`, baseX, baseY + 28, "#0f766e", 18),
      ],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    setShowToolbar(false);
    setSelectedTextEl(null);
    selectedTextRef.current = null;
  }, []);

  // ── Sync apiRef ───────────────────────────────────────────────────────────
  useEffect(() => { apiRef.current = excalidrawAPI; }, [excalidrawAPI]);

  // ── Expose handle ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!excalidrawAPI) return;
    onReady({
      translateSelected: () => {
        if (!selectedTextRef.current) return false;
        setShowToolbar(true);
        return true;
      },
      exportBoard: async () => {
        const api = apiRef.current;
        if (!api) return;
        const blob = await exportToBlob({
          elements: api.getSceneElements(),
          files: api.getFiles(),
          mimeType: "image/png",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getDimensions: () => ({ width: 2000, height: 1500, scale: 2 }) as any,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `linguaboard-${roomId}.png`;
        a.click();
        URL.revokeObjectURL(url);
      },
      getLessonNotes: () => {
        const api = apiRef.current;
        if (!api) return "";
        return (api.getSceneElements() as AnyElement[])
          .filter((el) => el.type === "text" && !el.isDeleted && el.text)
          .map((el: AnyElement) => String(el.text))
          .join("\n---\n");
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excalidrawAPI]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading whiteboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="excalidraw-wrapper">
      <Excalidraw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialData={(initialData ?? undefined) as any}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        excalidrawAPI={(api: ExcalidrawAPI) => setExcalidrawAPI(api)}
        UIOptions={{
          canvasActions: { loadScene: false, saveToActiveFile: false },
        }}
        isCollaborating={cursors.size > 0}
      />

      <CursorOverlay cursors={cursors} view={viewTransform} />

      {selectedTextEl && !showToolbar && (
        <button
          onClick={() => setShowToolbar(true)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl shadow-xl text-sm font-semibold transition-all cursor-pointer select-none"
        >
          <span aria-hidden>✨</span>
          Translate + Pinyin
        </button>
      )}

      {showToolbar && selectedTextEl && (
        <TranslateToolbar
          text={String(selectedTextEl.text ?? "")}
          onTranslate={handleTranslate}
          onDismiss={() => setShowToolbar(false)}
        />
      )}
    </div>
  );
}
