// Application header showing the title and a theme toggle.
import React from "react";
import { Sun, Moon } from "@phosphor-icons/react";

export default function AppHeader({ isDark, onToggleTheme }) {
  return (
    <header className="app-header">
      <h1 className="app-title">Müllmer</h1>
      <button
        onClick={onToggleTheme}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Theme wechseln"
        title="Theme wechseln"
      >
        {isDark ? <Sun size={24} /> : <Moon size={24} />}
      </button>
    </header>
  );
}
