import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ICONS = {
  system: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12.5 16h-8.5a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v8" />
    <path d="M7 20h4" />
    <path d="M9 16v4" />
    <path d="M20 21l2 -2l-2 -2" />
    <path d="M17 17l-2 2l2 2" />
  </svg>`,
  light: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
    <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7" />
  </svg>`,
  dark: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
  </svg>`
};

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' }
  ];

  const handleThemeChange = () => {
    const currentIndex = themes.findIndex(t => t.key === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].key);
  };

  const currentTheme = themes.find(t => t.key === theme);

  return (
    <div className="theme-toggle-container">
      {themes.map((themeOption) => (
        <button
          key={themeOption.key}
          onClick={() => setTheme(themeOption.key)}
          className={`theme-toggle-option ${theme === themeOption.key ? 'active' : ''}`}
          title={`Switch to ${themeOption.label} theme`}
          aria-label={`Switch to ${themeOption.label} theme`}
        >
          <span dangerouslySetInnerHTML={{ __html: ICONS[themeOption.key] }} />
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;