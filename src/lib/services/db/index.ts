export { initDatabase, flushInMemoryDataToStorage, getDb } from './database.js';
export { getOrCreateDailyNote, getDailyNote, getDatesWithNotes } from './dailyNotes.js';
export { createBlock, getBlocksForDailyNote, updateBlockCategory, deleteBlock, getBlocksInDateRange } from './blocks.js';
export { getAllCategories, createCategory, updateCategory, deleteCategory } from './categories.js';
export { getSetting, setSetting, deleteSetting } from './settings.js';
export { createEntry, getEntriesForParent, updateEntry, deleteEntry } from './entries.js';
export { getOrCreateSection, getSection, getEntriesForSection, addEntryToSection, updateSectionTimestamp, deleteEntriesForSection } from './sections.js';
export * from './types.js';
