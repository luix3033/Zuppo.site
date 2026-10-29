import type { Offer } from '../data/types';
/** Only configured, active, non-demo HTTPS offers may leave the site. */
export function affiliateDestination(offer: Offer): string | null {
  if (offer.isDemo || !offer.available || offer.status !== 'active' || !offer.affiliateUrl || (offer.expiresAt && Date.parse(offer.expiresAt) <= Date.now())) return null;
  try { const url = new URL(offer.affiliateUrl); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
