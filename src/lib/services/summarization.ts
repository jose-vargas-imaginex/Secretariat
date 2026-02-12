import { getBlocksForDailyNote, createAiBlock, getAiSummaryForDailyNote, deleteBlock } from './db/blocks.js';
import { getEntriesForParent, createEntry } from './db/entries.js';
import { generateContent, GeminiError } from './gemini.js';
import type { Block, Entry } from './db/types.js';

interface SummaryCategory {
  name: string;
  color: string;
  highlights: string[];
}

interface SummaryResponse {
  categories: SummaryCategory[];
}

function buildPrompt(blocks: Block[], entriesByBlock: Map<number, Entry[]>): string {
  const grouped = new Map<string, { color: string; blocks: { title: string | null; entries: string[] }[] }>();

  for (const block of blocks) {
    const categoryName = block.category_name ?? 'Uncategorized';
    const categoryColor = block.category_color ?? '#6b7280';

    if (!grouped.has(categoryName)) {
      grouped.set(categoryName, { color: categoryColor, blocks: [] });
    }

    const entries = entriesByBlock.get(block.id) ?? [];
    const entryTexts = entries
      .filter((e) => e.type === 'text')
      .map((e) => (e.content as { text?: string })?.text ?? '')
      .filter((t) => t.trim().length > 0);

    grouped.get(categoryName)!.blocks.push({
      title: block.title,
      entries: entryTexts,
    });
  }

  let blocksText = '';
  for (const [category, data] of grouped) {
    blocksText += `\n## ${category} (color: ${data.color})\n`;
    for (const b of data.blocks) {
      if (b.title) blocksText += `- **${b.title}**\n`;
      for (const text of b.entries) {
        blocksText += `  ${text}\n`;
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
${blocksText}`;
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

export function getExistingSummary(dailyNoteId: number): Block | null {
  return getAiSummaryForDailyNote(dailyNoteId);
}

export function deleteSummary(blockId: number): void {
  deleteBlock(blockId);
}

export async function createDailySummary(dailyNoteId: number): Promise<number> {
  // Check for existing summary and delete it
  const existing = getExistingSummary(dailyNoteId);
  if (existing) {
    deleteSummary(existing.id);
  }

  // Fetch user blocks (exclude AI-generated)
  const allBlocks = getBlocksForDailyNote(dailyNoteId);
  const userBlocks = allBlocks.filter((b) => !b.is_ai_generated);

  if (userBlocks.length === 0) {
    throw new Error('No blocks to summarize');
  }

  // Fetch entries for each block
  const entriesByBlock = new Map<number, Entry[]>();
  for (const block of userBlocks) {
    entriesByBlock.set(block.id, getEntriesForParent('block', block.id));
  }

  // Build prompt and call Gemini
  const prompt = buildPrompt(userBlocks, entriesByBlock);
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

  // Create AI block
  const blockIds = userBlocks.map((b) => b.id);
  const aiBlockId = createAiBlock(dailyNoteId, 'Daily Summary', blockIds);

  // Create entries for each category
  for (const cat of summary.categories) {
    // Category heading entry
    createEntry('block', aiBlockId, 'category-heading', { name: cat.name, color: cat.color }, 'ai');

    // Highlight entries
    for (const highlight of cat.highlights) {
      createEntry('block', aiBlockId, 'text', { text: `• ${highlight}` }, 'ai');
    }
  }

  return aiBlockId;
}
