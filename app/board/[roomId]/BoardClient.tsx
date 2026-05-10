"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import ExcalidrawBoard from "@/components/ExcalidrawBoard";
import type { ExcalidrawCanvasHandle } from "@/components/ExcalidrawBoard";

type Props = { roomId: string };

export default function BoardClient({ roomId }: Props) {
  const [boardHandle, setBoardHandle] = useState<ExcalidrawCanvasHandle | null>(
    null
  );

  return (
    <div className="board-root">
      <TopBar roomId={roomId} boardHandle={boardHandle} />
      <ExcalidrawBoard roomId={roomId} onReady={setBoardHandle} />
    </div>
  );
}
