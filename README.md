# 🖊️ LinguaBoard

> A real-time collaborative whiteboard for Chinese–English language tutoring — powered by Excalidraw, Supabase, and OpenAI.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎨 **Shared Whiteboard** | Full Excalidraw canvas — draw, annotate, use shapes, arrows, and freehand |
| 🔴 **Real-time Sync** | All changes broadcast instantly to every user in the room via Supabase Realtime |
| 🖱️ **Live Cursors** | See collaborators' cursors moving in real time with unique colour labels |
| 🌐 **AI Translation** | Select any text element → translate Chinese ↔ English + Pinyin with one click |
| 💾 **Persistent Rooms** | Scene is saved to Supabase — new users joining later see the full board |
| 🔗 **Shareable Rooms** | Create or join any room with a short code; copy invite link from the toolbar |
| 📤 **Export Board** | Export the current scene as a PNG image |
| 📋 **Lesson Notes** | Extract all text elements from the board as plain-text lesson notes |

---

## 🏗️ Tech Stack

- **[Next.js 16](https://nextjs.org/)** — App Router, server components, API routes
- **[Excalidraw 0.18](https://github.com/excalidraw/excalidraw)** — Open-source collaborative drawing canvas
- **[Supabase](https://supabase.com/)** — Postgres database + Realtime broadcast channels
- **[OpenAI GPT-4o mini](https://platform.openai.com/docs/models)** — Chinese ↔ English translation & Pinyin via server-side API route
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first styling
- **TypeScript** — End-to-end type safety

---

## 📁 Project Structure

```
├── app/
│   ├── page.tsx                    # Landing page — create or join a room
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── board/
│   │   └── [roomId]/
│   │       ├── page.tsx            # Board page (server component, metadata)
│   │       └── BoardClient.tsx     # Board page (client shell)
│   └── api/
│       └── translate/
│           └── route.ts            # POST /api/translate — OpenAI translation
├── components/
│   ├── ExcalidrawBoard.tsx         # Dynamic (SSR-safe) wrapper for the canvas
│   ├── ExcalidrawCanvas.tsx        # Core canvas — Realtime sync, cursors, persistence
│   ├── TopBar.tsx                  # Top toolbar — invite link, translate, export
│   └── TranslateToolbar.tsx        # Floating translation panel
├── lib/
│   └── supabase.ts                 # Supabase client + DB schema docs
├── .env.local                      # Secret keys (never commit)
└── .env.local.example              # Template for new developers
```

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/linguaboard.git
cd linguaboard
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run:

```sql
create table if not exists whiteboard_scenes (
  id         uuid primary key default gen_random_uuid(),
  room_id    text unique not null,
  elements   jsonb not null default '[]',
  app_state  jsonb,
  files      jsonb,
  updated_at timestamp with time zone default now()
);

alter table whiteboard_scenes enable row level security;
create policy "Public read"  on whiteboard_scenes for select using (true);
create policy "Public write" on whiteboard_scenes for all    using (true);

alter publication supabase_realtime add table whiteboard_scenes;
```

3. Copy your **Project URL** and **anon public key** from Project Settings → API

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-...
```

### 4. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🌍 Sharing Externally (ngrok)

To share your local instance with students or collaborators without deploying:

```bash
# Build for production (smaller bundles, more stable through tunnels)
npm run build
npm start

# In a second terminal:
~/ngrok config add-authtoken YOUR_NGROK_TOKEN
~/ngrok http 3000
```

Share the `https://xxxx.ngrok-free.app` URL. Anyone can open it and join a room.

> **Note:** Get a free ngrok token at [dashboard.ngrok.com](https://dashboard.ngrok.com).

---

## 🚢 Production Deployment (Vercel)

```bash
npx vercel
```

Add the three environment variables in your Vercel project dashboard under **Settings → Environment Variables**, then redeploy:

```bash
npx vercel --prod
```

---

## 🔄 How Real-time Sync Works

```
User A draws           User B draws
     │                      │
     ▼                      ▼
  onChange             onChange
     │                      │
     ▼                      ▼
throttle(33ms)        throttle(33ms)
     │                      │
     ▼                      ▼
  broadcast ──────────► reconcileElements()
  (Supabase)               │
                           ▼
                      updateScene()
                      CaptureUpdateAction.NEVER
```

- **Broadcast channel** (`wb:<roomId>`) carries scene diffs at ~30 fps and cursor positions at ~20 fps
- **`reconcileElements`** (Excalidraw's own algorithm) merges remote elements by version number — your in-progress drag (version 5) always beats a stale echo (version 3), eliminating snap-back
- **Postgres** stores the latest scene for late-joining users; updated every 2 s via debounce

---

## 🌐 Translation API

`POST /api/translate`

**Request**
```json
{ "text": "你好世界" }
```

**Response**
```json
{
  "detected_language": "zh",
  "original": "你好世界",
  "translation": "Hello, world",
  "pinyin": "nǐ hǎo shì jiè"
}
```

- Runs server-side only — the OpenAI API key is never exposed to the browser
- Detects language automatically (Chinese → English+Pinyin, English → Chinese+Pinyin)
- Uses `gpt-4o-mini` with `response_format: json_object` for fast, structured responses

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server on `0.0.0.0:3000` (ngrok-compatible) |
| `npm run build` | Create optimised production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |

---

## 📄 License

MIT
