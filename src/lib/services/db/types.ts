export interface DailyNote {
  id: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_default: boolean;
  position: number;
}

export interface CategoryRow {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_default: number;
  position: number;
}

export interface Entry {
  id: number;
  daily_note_id: number;
  title: string | null;
  category_id: number | null;
  is_ai_generated: number;
  source_entry_ids: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string;
  category_color?: string;
}

export interface Block {
  id: number;
  parent_type: string;
  parent_id: number;
  type: string;
  content: unknown;
  position: number;
  author: string;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: number;
  title: string;
  position: number;
  last_ai_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface DefaultCategory {
  name: string;
  color: string;
  icon: string | null;
  is_default: number;
  position: number;
}
