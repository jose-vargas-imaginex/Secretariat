export interface ColorPalette {
  id: string;
  name: string;
  isPreset: boolean;
  accent: string;
  bgPrimary: string;
  textPrimary: string;
}

export const PRESET_PALETTES: ColorPalette[] = [
  { id: 'default', name: 'Default', isPreset: true, accent: '#667eea', bgPrimary: '', textPrimary: '' },
  { id: 'ocean', name: 'Ocean', isPreset: true, accent: '#0891b2', bgPrimary: '#f0fdfa', textPrimary: '#164e63' },
  { id: 'forest', name: 'Forest', isPreset: true, accent: '#059669', bgPrimary: '#f0fdf4', textPrimary: '#14532d' },
  { id: 'sunset', name: 'Sunset', isPreset: true, accent: '#ea580c', bgPrimary: '#fff7ed', textPrimary: '#7c2d12' },
  { id: 'rose', name: 'Rose', isPreset: true, accent: '#e11d48', bgPrimary: '#fff1f2', textPrimary: '#881337' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function mixColors(hex1: string, hex2: string, weight: number): string {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  return rgbToHex(
    c1.r * (1 - weight) + c2.r * weight,
    c1.g * (1 - weight) + c2.g * weight,
    c1.b * (1 - weight) + c2.b * weight
  );
}

export function applyPalette(palette: ColorPalette | null): void {
  const root = document.documentElement;

  if (!palette || palette.id === 'default') {
    // Remove all palette overrides, let CSS defaults take over
    root.style.removeProperty('--accent-color');
    root.style.removeProperty('--bg-primary');
    root.style.removeProperty('--bg-secondary');
    root.style.removeProperty('--bg-hover');
    root.style.removeProperty('--bg-active');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-secondary');
    root.style.removeProperty('--border-color');
    return;
  }

  const { accent, bgPrimary, textPrimary } = palette;

  // Set key colors
  root.style.setProperty('--accent-color', accent);
  root.style.setProperty('--bg-primary', bgPrimary);
  root.style.setProperty('--text-primary', textPrimary);

  // Derive secondary colors
  root.style.setProperty('--bg-secondary', mixColors(bgPrimary, textPrimary, 0.03));
  root.style.setProperty('--bg-hover', mixColors(bgPrimary, textPrimary, 0.06));
  root.style.setProperty('--bg-active', mixColors(bgPrimary, accent, 0.08));
  root.style.setProperty('--text-secondary', mixColors(textPrimary, bgPrimary, 0.4));
  root.style.setProperty('--border-color', mixColors(bgPrimary, textPrimary, 0.12));
}

export function getPaletteById(id: string, customPalettes: ColorPalette[]): ColorPalette | null {
  return PRESET_PALETTES.find(p => p.id === id)
    || customPalettes.find(p => p.id === id)
    || null;
}

export function applyTheme(preference: string): void {
  const root = document.documentElement;
  if (preference === 'light' || preference === 'dark') {
    root.setAttribute('data-theme', preference);
  } else {
    root.removeAttribute('data-theme');
  }
}
