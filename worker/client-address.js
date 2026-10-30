/** Only an authenticated server proxy may supply an alternate client address. */
export async function clientAddress(request,env){
 const expected=env.ZUPPO_PROXY_SECRET,provided=request.headers.get('x-zuppo-proxy-secret');
 if(typeof expected==='string'&&expected.length>=32&&provided&&provided.length<=1024){
  const encoder=new TextEncoder();
  const [a,b]=await Promise.all([expected,provided].map(value=>crypto.subtle.digest('SHA-256',encoder.encode(value))));
  const left=new Uint8Array(a),right=new Uint8Array(b);let diff=0;for(let i=0;i<left.length;i++)diff|=left[i]^right[i];
  const address=request.headers.get('x-zuppo-client-ip');
  if(diff===0&&address&&address.length<=64&&/^[a-fA-F0-9:.]+$/.test(address))return address;
 }
 return request.headers.get('cf-connecting-ip')||'local-or-unknown';
}
