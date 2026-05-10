import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database schema — run this in your Supabase SQL editor:
 *
 * create table whiteboard_scenes (
 *   id         uuid primary key default gen_random_uuid(),
 *   room_id    text unique not null,
 *   elements   jsonb not null default '[]',
 *   app_state  jsonb,
 *   files      jsonb,
 *   updated_at timestamp with time zone default now()
 * );
 *
 * -- Enable row-level security (adjust policies as needed)
 * alter table whiteboard_scenes enable row level security;
 * create policy "Public read" on whiteboard_scenes for select using (true);
 * create policy "Public write" on whiteboard_scenes for all using (true);
 *
 * -- Enable Realtime for the table
 * alter publication supabase_realtime add table whiteboard_scenes;
 */

export type WhiteboardScene = {
  id: string;
  room_id: string;
  elements: unknown[];
  app_state: Record<string, unknown> | null;
  files: Record<string, unknown> | null;
  updated_at: string;
};
