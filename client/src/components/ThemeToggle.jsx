import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore.js';

// Icône soleil (mode clair)
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Icône lune (mode sombre)
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Interrupteur clair / sombre : pastille avec bouton coulissant animé
// (soleil <-> lune). Visible dans le header, à côté des liens du menu.
export default function ThemeToggle({ compact = false }) {
  const dark = useThemeStore((state) => state.dark);
  const toggle = useThemeStore((state) => state.toggle);
  const apply = useThemeStore((state) => state.apply);

  // Applique le thème à chaque changement
  useEffect(() => {
    apply(dark);
  }, [dark, apply]);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={dark ? 'Mode clair' : 'Mode sombre'}
    >
      <span className="theme-toggle__icons">
        <span className="theme-toggle__icon theme-toggle__icon--sun">
          <SunIcon />
        </span>
        <span className="theme-toggle__icon theme-toggle__icon--moon">
          <MoonIcon />
        </span>
      </span>
      <span className="theme-toggle__knob" aria-hidden="true" />
    </button>
  );
}