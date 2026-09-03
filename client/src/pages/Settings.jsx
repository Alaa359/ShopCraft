import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore.js';
import { useThemeStore } from '../store/themeStore.js';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { LANGS, useT } from '../i18n.js';
import { CURRENCIES } from '../lib/currency.js';

// Petite bascule générique (réutilisée pour les options)
function Switch({ checked, onChange, label, hint, id }) {
  return (
    <div className="settings__row">
      <div className="settings__row-text">
        <label className="settings__row-label" htmlFor={id}>
          {label}
        </label>
        {hint && <span className="settings__row-hint">{hint}</span>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        className={`settings__switch ${checked ? 'is-on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings__switch-knob" />
      </button>
    </div>
  );
}

// Page Paramètres : langue, monnaie, thème clair/sombre, options d'interface.
export default function Settings() {
  const { lang, setLang, emailNotifs, sound, toggle, currency, setCurrency } = useSettingsStore();
  const dark = useThemeStore((state) => state.dark);
  const toggleTheme = useThemeStore((state) => state.toggle);
  const apply = useThemeStore((state) => state.apply);
  const { t } = useT();

  // Applique la langue courante à <html> (rôle d'accessibilité + future RTL)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Applique le thème choisi (même logique que le bouton du header)
  useEffect(() => {
    apply(dark);
  }, [dark, apply]);

  return (
    <div className="settings">
      <h1 className="settings__title">{t('settingsTitle')}</h1>

      <div className="settings__card">
        {/* ------- Apparence : mode clair / sombre ------- */}
        <section className="settings__section">
          <h2 className="settings__section-title">{t('appearance')}</h2>
          <div className="settings__row">
            <div className="settings__row-text">
              <span className="settings__row-label">{t('themeLabel')}</span>
              <span className="settings__row-hint">{dark ? t('dark') : t('light')}</span>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* ------- Langue ------- */}
        <section className="settings__section">
          <h2 className="settings__section-title">{t('language')}</h2>
          <div className="settings__langs">
            {Object.entries(LANGS).map(([code, meta]) => (
              <button
                key={code}
                type="button"
                className={`settings__lang ${lang === code ? 'is-active' : ''}`}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
              >
                {meta.label}
              </button>
            ))}
          </div>
        </section>

        {/* ------- Monnaie ------- */}
        <section className="settings__section">
          <h2 className="settings__section-title">Monnaie</h2>
          <div className="settings__langs">
            {Object.entries(CURRENCIES).map(([code, meta]) => (
              <button
                key={code}
                type="button"
                className={`settings__lang ${currency === code ? 'is-active' : ''}`}
                onClick={() => setCurrency(code)}
                aria-pressed={currency === code}
              >
                {meta.label}
              </button>
            ))}
          </div>
          <span className="settings__row-hint">
            {currency === 'DT'
              ? 'Les prix s’affichent en Dinar tunisien (taux en ligne, 1 EUR variable).'
              : 'Les prix s’affichent en Euro.'}
          </span>
        </section>

        {/* ------- Notifications & sons ------- */}
        <section className="settings__section">
          <h2 className="settings__section-title">{t('notifications')}</h2>
          <Switch
            id="settings-email"
            label={t('notifEmail')}
            hint={t('notifEmailHint')}
            checked={emailNotifs}
            onChange={() => toggle('emailNotifs')}
          />
          <Switch
            id="settings-sound"
            label={t('soundLabel')}
            hint={t('soundHint')}
            checked={sound}
            onChange={() => toggle('sound')}
          />
        </section>
      </div>
    </div>
  );
}