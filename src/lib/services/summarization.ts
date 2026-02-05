import { getEntriesForDailyNote, createAiEntry, getAiSummaryForDailyNote, deleteEntry } from './db/entries.js';
import { getBlocksForParent, createBlock } from './db/blocks.js';
import { generateContent, GeminiError } from './gemini.js';
import type { Entry, Block } from './db/types.js';

interface SummaryCategory {
  name: string;
  color: string;
  highlights: string[];
}

interface SummaryResponse {
  categories: SummaryCategory[];
}

function buildPrompt(entries: Entry[], blocksByEntry: Map<number, Block[]>): string {
  const grouped = new Map<string, { color: string; entries: { title: string | null; blocks: string[] }[] }>();

  for (const entry of entries) {
    const categoryName = entry.category_name ?? 'Uncategorized';
    const categoryColor = entry.category_color ?? '#6b7280';

    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, { color: categoryColor, entries: [] });
    }

    const blocks = blocksByEntry.get(entry.id) ?? [];
    const blockTexts = blocks
      .filter((b) => b.type === 'text')
      .map((b) => (b.content as { text?: string })?.text ?? '')
      .filter((t) => t.trim().length > 0);

    grouped.get(categoryName)!.entries.push({
      title: entry.title,
      blocks: blockTexts,
    });
  }

  let entriesText = '';
  for (const [category, data] of grouped) {
    entriesText += `\n## ${category} (color: ${data.color})\n`;
    for (const e of data.entries) {
      if (e.title) entriesText += `- **${e.title}**\n`;
      for (const text of e.blocks) {
        entriesText += `  ${text}\n`;
      }
    }
  }

  return `You are a concise work-log summarizer. Given the following daily work entries grouped by category, produce a brief summary with highlights for each category.

Return a JSON object with this exact structure:
{
  "categories": [
    {
      "name": "Category Name",
      "color": "#hexcolor",
      "highlights": ["Brief highlight 1", "Brief highlight 2"]
    }
  ]
}

Rules:
- Keep each highlight to 1 short sentence
- Only include categories that have entries
- Preserve the original category names and colors
- Summarize, don't just repeat the entries verbatim
- Maximum 3-4 highlights per category

Here are today's entries:
${entriesText}`;
}

function parseSummaryResponse(text: string): SummaryResponse {
  const parsed = JSON.parse(text) as SummaryResponse;

  if (!parsed.categories || !Array.isArray(parsed.categories)) {
    throw new Error('Invalid summary response structure');
  }

  for (const cat of parsed.categories) {
    if (!cat.name || !Array.isArray(cat.highlights)) {
      throw new Error('Invalid category in summary response');
    }
  }

  return parsed;
}

export function getExistingSummary(dailyNoteId: number): Entry | null {
  return getAiSummaryForDailyNote(dailyNoteId);
}

export function deleteSummary(entryId: number): void {
  deleteEntry(entryId);
}

export async function createDailySummary(dailyNoteId: number): Promise<number> {
  // Check for existing summary and delete it
  const existing = getExistingSummary(dailyNoteId);
  if (existing) {
    deleteSummary(existing.id);
  }

  // Fetch user entries (exclude AI-generated)
  const allEntries = getEntriesForDailyNote(dailyNoteId);
  const userEntries = allEntries.filter((e) => !e.is_ai_generated);

  if (userEntries.length === 0) {
    throw new Error('No entries to summarize');
  }

  // Fetch blocks for each entry
  const blocksByEntry = new Map<number, Block[]>();
  for (const entry of userEntries) {
    blocksByEntry.set(entry.id, getBlocksForParent('entry', entry.id));
  }

  // Build prompt and call Gemini
  const prompt = buildPrompt(userEntries, blocksByEntry);
  let responseText: string;
  try {
    responseText = await generateContent(prompt);
  } catch (err) {
    if (err instanceof GeminiError) throw err;
    throw new GeminiError('NETWORK_ERROR', 'Unexpected error calling Gemini API.');
  }

  // Parse response
  let summary: SummaryResponse;
  try {
    summary = parseSummaryResponse(responseText);
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Unexpected response format from AI. Please try again.');
  }

  // Create AI entry
  const entryIds = userEntries.map((e) => e.id);
  const aiEntryId = createAiEntry(dailyNoteId, 'Daily Summary', entryIds);

  // Create blocks for each category
  for (const cat of summary.categories) {
    // Category heading block
    createBlock('entry', aiEntryId, 'category-heading', { name: cat.name, color: cat.color }, 'ai');

    // Highlight blocks
    for (const highlight of cat.highlights) {
      createBlock('entry', aiEntryId, 'text', { text: `• ${highlight}` }, 'ai');
    }
  }

  return aiEntryId;
}
