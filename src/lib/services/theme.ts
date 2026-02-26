export function applyTheme(preference: string): void {
  const root = document.documentElement;
  if (preference === 'light' || preference === 'dark') {
    root.setAttribute('data-theme', preference);
  } else {
    root.removeAttribute('data-theme');
  }
}
