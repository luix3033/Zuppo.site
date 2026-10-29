export function TagMark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M28 7a8 8 0 0 1 6-3h16a7 7 0 0 1 7 7v17a8 8 0 0 1-2 5L31 58a7 7 0 0 1-10 0L6 43a7 7 0 0 1 0-10L28 7Z" fill="currentColor"/><circle cx="46" cy="15" r="4" fill="var(--tag-hole, #0b0b0f)"/><path d="m32 19-15 19h12l-5 15 21-26H33l4-13-5 5Z" fill="var(--tag-hole, #0b0b0f)"/><path d="m17 7-3-5M8 17l-5-3M10 27H3" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>;
}
export function Logo({ dark = false }: { dark?: boolean }) {
  return <span className={`logo ${dark ? 'logo-dark' : ''}`} aria-label="Zuppo"><TagMark /><span>zup<span className="logo-accent">po.</span></span></span>;
}
