import { useEffect, useMemo, useState } from 'react';
import { useSettingsStore } from '../store/settingsStore.js';
import { convert, convertMoney, fetchExchangeRates } from './currency.js';

let globalRates = null;

// Hook monnaie : renvoie la devise choisie, les taux chargés et des helpers
// de conversion/formattage. Les montants fournis sont toujours en EUR.
export function useCurrency() {
  const currency = useSettingsStore((s) => s.currency);
  const [, force] = useState(0);

  useEffect(() => {
    let active = true;
    fetchExchangeRates().then((rates) => {
      if (active) {
        globalRates = rates;
        force((n) => n + 1);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const rates = globalRates;

  return useMemo(
    () => ({
      currency,
      rates,
      loading: !rates,
      convert: (eur) => convert(eur, currency, rates),
      format: (eur) => convertMoney(eur, currency, rates),
    }),
    [currency, rates]
  );
}
