import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      key: 'system',
      label: 'System',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )
    },
    {
      key: 'light',
      label: 'Light',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      )
    },
    {
      key: 'dark',
      label: 'Dark',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      )
    }
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
          {themeOption.icon}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;