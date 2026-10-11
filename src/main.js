const root = document.documentElement;
const decreaseButton = document.querySelector('#decrease-text');
const increaseButton = document.querySelector('#increase-text');
const themeButton = document.querySelector('#theme-toggle');
const status = document.querySelector('#control-status');
const scales = [0.875, 0.9375, 1, 1.0625, 1.125];
const labels = ['Smallest', 'Small', 'Default', 'Large', 'Largest'];

function readPreference(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function savePreference(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Controls still work when storage is unavailable. */ }
}

const storedSize = Number(readPreference('jb-text-size') ?? 2);
let textSize = Number.isInteger(storedSize) && storedSize >= 0 && storedSize <= 4 ? storedSize : 2;

function updateTextSize(announce = false) {
  root.style.setProperty('--text-scale', scales[textSize]);
  decreaseButton.disabled = textSize === 0;
  increaseButton.disabled = textSize === scales.length - 1;
  document.querySelectorAll('.size-dots i').forEach((dot, index) => dot.classList.toggle('active', index === textSize));
  if (announce) status.textContent = `${labels[textSize]} text size`;
}

decreaseButton.addEventListener('click', () => {
  textSize = Math.max(0, textSize - 1);
  savePreference('jb-text-size', String(textSize));
  updateTextSize(true);
});

increaseButton.addEventListener('click', () => {
  textSize = Math.min(scales.length - 1, textSize + 1);
  savePreference('jb-text-size', String(textSize));
  updateTextSize(true);
});

function updateThemeControl() {
  const dark = root.dataset.theme === 'dark';
  const label = `Switch to ${dark ? 'light' : 'dark'} theme`;
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
  document.querySelector('meta[name="theme-color"]').content = dark ? '#191c1a' : '#faf9f6';
}

themeButton.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = theme;
  savePreference('jb-theme', theme);
  updateThemeControl();
  status.textContent = `${theme === 'dark' ? 'Dark' : 'Light'} theme enabled`;
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (!readPreference('jb-theme')) {
    root.dataset.theme = event.matches ? 'dark' : 'light';
    updateThemeControl();
  }
});

updateTextSize();
updateThemeControl();
