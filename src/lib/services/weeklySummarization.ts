import { getBlocksInDateRange } from './db/blocks.js';
import { getEntriesForParent } from './db/entries.js';
import {
  getOrCreateSection,
  getSectionsByPrefix,
  getEntriesForSection,
  addEntryToSection,
  updateSectionTimestamp,
} from './db/sections.js';
import { updateEntry } from './db/entries.js';
import { generateContent, GeminiError } from './gemini.js';
import { startOfISOWeek, endOfISOWeek, format, addDays, parseISO } from 'date-fns';
import type { Block, Entry, Section } from './db/types.js';

const SECTION_PREFIX = 'Weekly Summary: ';

export interface WeeklySummaryInfo {
  weekKey: string;
  label: string;
  section: Section;
}

interface WeeklySummaryResponse {
  summary: string;
}

export function getWeekKey(date: Date): string {
  const monday = startOfISOWeek(date);
  return format(monday, 'yyyy-MM-dd');
}

export function formatWeekRange(weekKey: string): string {
  const monday = parseISO(weekKey);
  const sunday = endOfISOWeek(monday);
  return `${format(monday, 'MMM d')} – ${format(sunday, 'MMM d, yyyy')}`;
}

export function getWeeklySummaries(): WeeklySummaryInfo[] {
  const sections = getSectionsByPrefix(SECTION_PREFIX);
  return sections.map((section) => {
    const weekKey = section.title.replace(SECTION_PREFIX, '');
    return {
      weekKey,
      label: formatWeekRange(weekKey),
      section,
    };
  });
}

export function getWeeklySummary(weekKey: string): { section: Section; entry: Entry | null } {
  const section = getOrCreateSection(`${SECTION_PREFIX}${weekKey}`);
  const entries = getEntriesForSection(section.id);
  return {
    section,
    entry: entries.length > 0 ? entries[0] : null,
  };
}

function buildWeeklySummaryPrompt(
  blocks: Block[],
  entriesByBlock: Map<number, Entry[]>,
  existingText: string | null
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

  let editContext = '';
  if (existingText) {
    editContext = `\nThe user previously edited the summary below. Respect and incorporate their edits while updating with new information:\n---\n${existingText}\n---\n`;
  }

  return `You are summarizing a week of work log entries into a concise narrative summary.

Return a JSON object with this exact structure:
{
  "summary": "Your prose summary here..."
}

Rules:
- Write 2-4 paragraphs of free-form prose summarizing the week's work
- Group related activities together thematically
- Highlight key accomplishments and progress
- Note any patterns or themes across the week
- Use a professional but conversational tone
- Do NOT use bullet points or lists — write in paragraph form
${editContext}
Here are the work log entries for the week:
${notesText}`;
}

function parseWeeklySummaryResponse(text: string): WeeklySummaryResponse {
  const parsed = JSON.parse(text) as WeeklySummaryResponse;

  if (typeof parsed.summary !== 'string') {
    throw new Error('Invalid weekly summary response structure');
  }

  return parsed;
}

export async function generateWeeklySummary(weekKey: string): Promise<void> {
  const monday = parseISO(weekKey);
  const sunday = endOfISOWeek(monday);
  const startStr = format(monday, 'yyyy-MM-dd');
  const endStr = format(sunday, 'yyyy-MM-dd');

  // Fetch all blocks in the week
  const blocks = getBlocksInDateRange(startStr, endStr);

  if (blocks.length === 0) {
    throw new GeminiError('INVALID_RESPONSE', 'No work entries found for this week. Add some entries first.');
  }

  // Fetch entries for each block
  const entriesByBlock = new Map<number, Entry[]>();
  for (const block of blocks) {
    entriesByBlock.set(block.id, getEntriesForParent('block', block.id));
  }

  // Get or create section and check for existing entry
  const section = getOrCreateSection(`${SECTION_PREFIX}${weekKey}`);
  const sectionEntries = getEntriesForSection(section.id);
  const existingEntry = sectionEntries.length > 0 ? sectionEntries[0] : null;
  const existingText = existingEntry
    ? (existingEntry.content as { text?: string })?.text ?? null
    : null;

  // Build prompt and call Gemini
  const prompt = buildWeeklySummaryPrompt(blocks, entriesByBlock, existingText);
  let responseText: string;
  try {
    responseText = await generateContent(prompt);
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw new GeminiError('NETWORK_ERROR', 'Unexpected error calling Gemini API.');
  }

  // Parse response
  let result: WeeklySummaryResponse;
  try {
    result = parseWeeklySummaryResponse(responseText);
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Unexpected response format from AI. Please try again.');
  }

  // Save result
  if (existingEntry) {
    updateEntry(existingEntry.id, { text: result.summary });
  } else {
    addEntryToSection(section.id, { text: result.summary, status: 'active' }, 'ai');
  }

  updateSectionTimestamp(section.id);
}
