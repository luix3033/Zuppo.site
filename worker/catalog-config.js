/** Runtime configuration only. Never substitutes Vite build variables or embeds keys. */
export function catalogConfiguration(env) {
  const missing=[];
  if(env.CATALOG_PROVIDER!=='supabase')missing.push('CATALOG_PROVIDER');
  try {const url=new URL(env.SUPABASE_URL);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)missing.push('SUPABASE_URL');}catch{missing.push('SUPABASE_URL');}
  if(typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'))missing.push('SUPABASE_PUBLISHABLE_KEY');
  return missing;
}
