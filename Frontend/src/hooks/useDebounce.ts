import { useEffect, useState } from 'react';

/**
 * Retourne la valeur passée après un délai d'inactivité.
 * Évite de déclencher une requête réseau à chaque frappe clavier.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}

export default useDebounce;
