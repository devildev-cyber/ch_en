import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaBoard",
  description:
    "A collaborative Excalidraw whiteboard for Chinese–English language tutoring. Draw, annotate, and translate in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
