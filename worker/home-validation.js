export function validHome(c){
 if(c?.theme!==undefined&&c.theme!=='ocarina')return false;
 const text=v=>typeof v==='string'&&v.length<=2000;
 const link=(v,image=false)=>{if(!text(v))return false;if(!v)return true;if(v.startsWith('/')&&!v.startsWith('//')&&!/[\\\s]/.test(v))return true;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!(!image&&u.hash.includes('<'))}catch{return false}};
 const keys=(obj,names)=>obj&&names.every(k=>text(obj[k]));
 if(c?.appearance){const a=c.appearance;if(!['primary','header','background','surface','text'].every(k=>typeof a[k]==='string'&&/^#[a-f0-9]{6}$/i.test(a[k]))||![8,14,20].includes(a.radius))return false;
 function lum(hex){const n=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*n[0]+.7152*n[1]+.0722*n[2]}function contrast(x,y){return(Math.max(lum(x),lum(y))+.05)/(Math.min(lum(x),lum(y))+.05)}if(contrast(a.text,a.background)<4.5||contrast(a.text,a.surface)<4.5)return false;}
 const cats=['games','informatica','celulares','casa','eletrodomesticos','esporte','beleza','bebes','pets','moda','ferramentas','carros','limpeza','roupa-infantil','brinquedos','datas-comemorativas'];
 if(!c||!text(c.announcement)||!keys(c.hero,['eyebrow','title','highlight','description','buttonText','buttonUrl','image','footnote','sticker','sideTitle','sideDescription','sideButtonText','sideButtonUrl'])||!c.hero.title.trim()||!link(c.hero.buttonUrl)||!link(c.hero.sideButtonUrl)||!link(c.hero.image,true))return false;
 if(c.hero.mode!==undefined&&!['welcome','campaign','artwork'].includes(c.hero.mode))return false;
 if(c.hero.mobileImage!==undefined&&!link(c.hero.mobileImage,true))return false;
 if(c.hero.imageAlt!==undefined&&!text(c.hero.imageAlt))return false;
 if(c.hero.mode==='artwork'&&!c.hero.image)return false;
 if(!keys(c.categories,['eyebrow','title'])||!Array.isArray(c.categories.ids)||c.categories.ids.length>cats.length||!c.categories.ids.every(id=>cats.includes(id))||new Set(c.categories.ids).size!==c.categories.ids.length)return false;
 if(!Array.isArray(c.benefits)||c.benefits.length!==4||!c.benefits.every(text)||!keys(c.flash,['eyebrow','title','description','buttonText','buttonUrl'])||!link(c.flash.buttonUrl))return false;
 if(!keys(c.community,['eyebrow','title','highlight','description','whatsapp','telegram','instagram'])||!['whatsapp','telegram','instagram'].every(k=>!c.community[k]||(c.community[k].startsWith('https://')&&link(c.community[k]))))return false;
 if(!keys(c.how,['eyebrow','title'])||!Array.isArray(c.how.steps)||c.how.steps.length!==3||!c.how.steps.every(s=>keys(s,['title','description'])))return false;
 if(!Array.isArray(c.sections)||c.sections.length<1||c.sections.length>20||new Set(c.sections.map(s=>s.id)).size!==c.sections.length)return false;
 const single=c.sections.filter(s=>!['offers','banner'].includes(s.type)).map(s=>s.type);if(new Set(single).size!==single.length)return false;
 return c.sections.every(s=>keys(s,['id','type','title','description','mode','category','store','image','buttonText','buttonUrl','tone'])&&/^[a-zA-Z0-9-]{1,100}$/.test(s.id)&&['hero','benefits','categories','offers','flash','community','how','banner'].includes(s.type)&&typeof s.enabled==='boolean'&&['all','featured','flash','manual','category','discount'].includes(s.mode)&&['all',...cats].includes(s.category)&&['all','amazon','mercado-livre','shopee'].includes(s.store)&&Array.isArray(s.offerIds)&&s.offerIds.length<=100&&s.offerIds.every(id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(id))&&[4,8,12,16].includes(s.limit)&&['dark','yellow','light'].includes(s.tone)&&link(s.image,true)&&link(s.buttonUrl));
}
