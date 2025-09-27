import React, { useEffect, useState } from 'react';

// Simple, clean header respecting rules:
// 1) No scroll (handled globally)
// 2) Proper padding on inputs/buttons
// 3) Proper width/height to avoid overflow

const Header = () => {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // Initialize theme from document on mount
  useEffect(() => {
    // Initialize theme from saved preference or system preference
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldDark = saved ? saved === 'dark' : prefersDark;
    setDark(shouldDark);
    const root = document.documentElement;
    root.classList.toggle('theme-dark', shouldDark);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    root.classList.toggle('theme-dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  return (
    <header className="w-full h-16" style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
      <div className="h-full max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between" style={{ color: 'var(--fg)' }}>
        {/* Brand */}
        <div className="shrink-0">
          <span className="text-xl font-semibold">StorySpark</span>
        </div>

        {/* Nav (desktop) */}
        <nav className="hidden md:flex items-center gap-3">
          <a href="#" className="px-3 py-2 text-sm rounded-md" style={{ color: 'var(--muted)' }}>Create Story</a>
          <a href="#" className="px-3 py-2 text-sm rounded-md" style={{ color: 'var(--muted)' }}>My Stories</a>
          <a href="#" className="px-3 py-2 text-sm rounded-md" style={{ color: 'var(--muted)' }}>Settings</a>
        </nav>

        {/* Actions */}
  <div className="flex items-center gap-2 sm:gap-3">
          {/* Simple theme toggle */}
          <button
            onClick={toggleDark}
            className="h-10 w-10 inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2"
            style={{ color: 'var(--muted)', backgroundColor: 'transparent' }}
            aria-label="Toggle dark mode"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              // Moon icon
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
            ) : (
              // Sun icon
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.76 4.84l-1.8-1.79L3.17 4.83l1.79 1.8 1.8-1.79zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zm9.83-18.17l-1.79-1.8-1.8 1.79 1.8 1.8 1.79-1.79zM20 11v2h3v-2h-3zM6.76 19.16l-1.8 1.79 1.8 1.8 1.79-1.8-1.79-1.79zM17.24 19.16l-1.79 1.8 1.79 1.79 1.8-1.79-1.8-1.8zM12 5a7 7 0 100 14 7 7 0 000-14z"/></svg>
            )}
          </button>

          <button
            className="min-h-10 px-3 py-2 md:h-10 md:px-5 inline-flex items-center justify-center rounded-md text-sm md:text-[0.95rem] font-semibold shadow-sm whitespace-normal md:whitespace-nowrap break-words text-center leading-tight max-w-[7.5rem] md:max-w-none"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Get Started
          </button>

          {/* Mobile menu */}
          <button
            className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2"
            style={{ color: 'var(--muted)' }}
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
          <div className="px-4 py-2 flex flex-col gap-1">
            <a href="#" className="px-3 py-2 text-sm rounded-md" style={{ color: 'var(--muted)' }}>Create Story</a>
            <a href="#" className="px-3 py-2 text-sm rounded-md" style={{ color: 'var(--muted)' }}>My Stories</a>
            <a href="#" className="px-3 py-2 text-sm rounded-md" style={{ color: 'var(--muted)' }}>Settings</a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;