import { useCallback, useEffect, useState } from 'react';
import type { Offer } from '../data/types';
import { offerRepository } from '../lib/repository';

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(null);
    offerRepository.list(controller.signal).then(data => {
      if (!controller.signal.aborted) setOffers(data);
    }).catch((err: Error) => {
      if (err.name !== 'AbortError') setError('Não conseguimos carregar as ofertas. Tente novamente.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return { offers, loading, error, retry: useCallback(() => setAttempt(n => n + 1), []) };
}
