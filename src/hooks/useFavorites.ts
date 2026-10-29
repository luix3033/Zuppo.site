import { useCallback, useEffect, useState } from 'react';
const key = 'zuppo:favorites:v1';
function read(): string[] {
  try { const parsed: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id)).filter((id,index,all)=>all.indexOf(id)===index).slice(0,200) : []; } catch { return []; }
}
export function useFavorites(onFeedback: (message: string) => void) {
  const [favorites, setFavorites] = useState<string[]>(read);
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === key) setFavorites(read()); };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  const toggle = useCallback((id: string) => {
    const removing = favorites.includes(id);
    if(!removing&&favorites.length>=200){onFeedback('Você pode salvar até 200 ofertas. Remova uma para adicionar outra.');return;}
    const next = removing ? favorites.filter(value => value !== id) : [...favorites, id];
    setFavorites(next);
    try { localStorage.setItem(key, JSON.stringify(next)); onFeedback(removing ? 'Oferta removida dos favoritos.' : 'Pronto! Oferta salva nos seus favoritos.'); }
    catch { onFeedback('Salvo nesta sessão. O navegador bloqueou o armazenamento local.'); }
  }, [favorites, onFeedback]);
  return { favorites, toggle };
}
