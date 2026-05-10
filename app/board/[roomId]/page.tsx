import type { Metadata } from "next";
import BoardClient from "./BoardClient";

type Props = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = await params;
  return {
    title: `Room ${roomId} — LinguaBoard`,
    description: `Join the LinguaBoard session for room ${roomId}`,
  };
}

export default async function BoardPage({ params }: Props) {
  const { roomId } = await params;
  return <BoardClient roomId={roomId} />;
}
