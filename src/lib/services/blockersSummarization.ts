// src/lib/services/blockersSummarization.ts
import { getBlocksInDateRange } from './db/blocks.js';
import { getEntriesForParent } from './db/entries.js';
import {
  getOrCreateSection,
  getEntriesForSection,
  addEntryToSection,
  updateSectionTimestamp,
} from './db/sections.js';
import { updateEntry, deleteEntry } from './db/entries.js';
import { generateContent, GeminiError } from './gemini.js';
import { format, subDays } from 'date-fns';
import type { Block, Entry } from './db/types.js';

const SECTION_TITLE = 'Current Blockers';

interface BlockerItem {
  id: number | null;
  text: string;
  status: 'active' | 'resolved';
}

interface BlockersResponse {
  blockers: BlockerItem[];
}

export function getBlockersSection() {
  return getOrCreateSection(SECTION_TITLE);
}

export function getBlockerEntries(sectionId: number): Entry[] {
  return getEntriesForSection(sectionId);
}

function buildBlockerPrompt(
  blocks: Block[],
  entriesByBlock: Map<number, Entry[]>,
  existingAiEntries: { id: number; text: string; status: string }[]
): string {
  let notesText = '';
  for (const block of blocks) {
    const categoryLabel = block.category_name ? ` [${block.category_name}]` : '';
    notesText += `\n- ${block.title || '(untitled)'}${categoryLabel}\n`;

    const entries = entriesByBlock.get(block.id) ?? [];
    for (const entry of entries) {
      if (entry.type === 'text') {
        const text = (entry.content as { text?: string })?.text ?? '';
        if (text.trim()) {
          notesText += `  ${text}\n`;
        }
      }
    }
  }

  let existingText = '';
  if (existingAiEntries.length > 0) {
    existingText = `\nCurrent AI-generated blockers (with their IDs):\n`;
    for (const entry of existingAiEntries) {
      existingText += `- [ID: ${entry.id}] (${entry.status}) ${entry.text}\n`;
    }
  }

  return `You are analyzing work log entries to identify and track blockers — things that are preventing or slowing down progress.

Return a JSON object with this exact structure:
{
  "blockers": [
    { "id": <existing_id_or_null>, "text": "Description of the blocker", "status": "active" | "resolved" }
  ]
}

Rules:
- Identify blockers from context: look for things people are "stuck on", "waiting for", "blocked by", "can't proceed with", "need help with"
- Entries categorized as "Blocker" should always be considered
- For existing blockers (shown with IDs): keep them with their ID if still relevant, update text if wording should change, mark as "resolved" if the notes show the issue was resolved, or omit entirely if no longer relevant at all
- For new blockers: use "id": null
- Keep descriptions concise (1-2 sentences max)
- Only include genuine blockers, not general work items
- If no blockers are found, return an empty array
${existingText}
Here are the work log entries from the selected timeframe:
${notesText}`;
}

function parseBlockersResponse(text: string): BlockersResponse {
  const parsed = JSON.parse(text) as BlockersResponse;

  if (!parsed.blockers || !Array.isArray(parsed.blockers)) {
    throw new Error('Invalid blockers response structure');
  }

  for (const blocker of parsed.blockers) {
    if (typeof blocker.text !== 'string' || !['active', 'resolved'].includes(blocker.status)) {
      throw new Error('Invalid blocker item in response');
    }
  }

  return parsed;
}

export async function refreshBlockers(days: number): Promise<void> {
  const section = getOrCreateSection(SECTION_TITLE);

  // Calculate date range
  const endDate = new Date();
  const startDate = subDays(endDate, days);
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  // Fetch all blocks in range
  const blocks = getBlocksInDateRange(startStr, endStr);

  // Fetch entries for each block
  const entriesByBlock = new Map<number, Entry[]>();
  for (const block of blocks) {
    entriesByBlock.set(block.id, getEntriesForParent('block', block.id));
  }

  // Get current section entries
  const currentEntries = getEntriesForSection(section.id);
  const aiEntries = currentEntries.filter((e) => e.author === 'ai');
  const existingAiEntries = aiEntries.map((e) => ({
    id: e.id,
    text: (e.content as { text?: string })?.text ?? '',
    status: (e.content as { status?: string })?.status ?? 'active',
  }));

  // Build prompt and call Gemini
  const prompt = buildBlockerPrompt(blocks, entriesByBlock, existingAiEntries);
  let responseText: string;
  try {
    responseText = await generateContent(prompt);
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw new GeminiError('NETWORK_ERROR', 'Unexpected error calling Gemini API.');
  }

  // Parse response
  let result: BlockersResponse;
  try {
    result = parseBlockersResponse(responseText);
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Unexpected response format from AI. Please try again.');
  }

  // Apply changes — merge AI entries
  const returnedIds = new Set<number>();

  for (const blocker of result.blockers) {
    if (blocker.id !== null) {
      // Update existing AI entry
      returnedIds.add(blocker.id);
      updateEntry(blocker.id, { text: blocker.text, status: blocker.status });
    } else {
      // Create new AI entry
      addEntryToSection(section.id, { text: blocker.text, status: blocker.status }, 'ai');
    }
  }

  // Delete AI entries not in response
  for (const existing of aiEntries) {
    if (!returnedIds.has(existing.id)) {
      deleteEntry(existing.id);
    }
  }

  // Update timestamp
  updateSectionTimestamp(section.id);
}
