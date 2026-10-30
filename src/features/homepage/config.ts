export type SectionType = 'hero'|'benefits'|'categories'|'offers'|'flash'|'community'|'how'|'banner';
export interface HomeSection {id:string;type:SectionType;enabled:boolean;title:string;description:string;mode:'all'|'featured'|'flash'|'manual'|'category'|'discount';category:string;store:string;offerIds:string[];limit:number;image:string;buttonText:string;buttonUrl:string;tone:'dark'|'yellow'|'light'}
export interface AppearanceConfig {primary:string;header:string;background:string;surface:string;text:string;radius:number}
export interface HomeConfig {
 theme?:'ocarina';
 appearance?:AppearanceConfig;
 announcement:string;
 hero:{mode?:'welcome'|'campaign'|'artwork';mobileImage?:string;imageAlt?:string;eyebrow:string;title:string;highlight:string;description:string;buttonText:string;buttonUrl:string;image:string;footnote:string;sticker:string;sideTitle:string;sideDescription:string;sideButtonText:string;sideButtonUrl:string};
 categories:{eyebrow:string;title:string;ids:string[]};
 benefits:string[];
 flash:{eyebrow:string;title:string;description:string;buttonText:string;buttonUrl:string};
 community:{eyebrow:string;title:string;highlight:string;description:string;whatsapp:string;telegram:string;instagram:string};
 how:{eyebrow:string;title:string;steps:{title:string;description:string}[]};
 sections:HomeSection[];
}
export function newSection(type:SectionType):HomeSection {return {id:crypto.randomUUID(),type,enabled:true,title:type==='offers'?'Uma seleção para você':type==='banner'?'Seu próximo achado começa aqui':'',description:'',mode:'all',category:'all',store:'all',offerIds:[],limit:8,image:'',buttonText:'Explorar ofertas',buttonUrl:'/ofertas',tone:'dark'}}
export const defaultHome:HomeConfig={
 announcement:'Ofertas que chegam primeiro.',
 hero:{eyebrow:'GARIMPAR É COM A GENTE.',title:'As melhores ofertas.',highlight:'Em um só lugar.',description:'Os seus próximos achados da Amazon, Mercado Livre e Shopee estão aqui.',buttonText:'Explorar ofertas',buttonUrl:'/ofertas',image:'',footnote:'Curadoria com cuidado. Economia com propósito.',sticker:'ACHADO DO DIA',sideTitle:'Oferta boa não espera.',sideDescription:'Receba os próximos achados nos seus canais favoritos.',sideButtonText:'Entrar na comunidade',sideButtonUrl:'/#comunidade'},
 categories:{eyebrow:'ENCONTRE O SEU PRÓXIMO ACHADO',title:'O que faz seu estilo?',ids:['games','informatica','celulares','casa','eletrodomesticos','moda']},
 benefits:['Oportunidades em um só lugar','Você compra direto na loja','Seus achados sempre por perto','Transparência em cada oferta'],
 flash:{eyebrow:'PISCOU, ACHOU.',title:'Uma dose extra de oportunidade.',description:'Confira as ofertas com condições de compra disponíveis nas lojas.',buttonText:'Ver ofertas relâmpago',buttonUrl:'/ofertas?flash=true'},
 community:{eyebrow:'SEMPRE UM ACHADO À FRENTE',title:'Não perca a',highlight:'próxima oferta.',description:'Entre para a comunidade Zuppo e receba promoções diretamente nos seus canais favoritos.',whatsapp:'',telegram:'',instagram:''},
 how:{eyebrow:'ECONOMIZAR PODE SER SIMPLES',title:'Bom pra você. Fácil de usar.',steps:[{title:'A gente encontra.',description:'Buscamos boas oportunidades nas lojas que você já conhece.'},{title:'Organiza tudo por aqui.',description:'Ofertas por categoria, para você ir direto ao que interessa.'},{title:'Você escolhe o seu achado.',description:'Confira a oferta e finalize a compra direto na loja parceira.'}]},
 sections:['hero','benefits','categories','offers','flash','community','how'].map((type,i)=>({id:'section-'+i,type:type as SectionType,enabled:true,title:type==='offers'?'Tá valendo a pena':'',description:type==='offers'?'Uma seleção para você encontrar a sua próxima boa escolha.':'',mode:'all',category:'all',store:'all',offerIds:[],limit:8,image:'',buttonText:'Explorar ofertas',buttonUrl:'/ofertas',tone:'dark'}))
};
