import type { Offer } from '../../src/data/types';

const common = {
  affiliateUrl: null,
  available: true,
  status: 'active' as const,
  source: 'Catálogo demonstrativo Zuppo. Preços, descontos e histórico fictícios para apresentação da interface.',
  isDemo: true,
  featured: false,
  flash: false,
  expiresAt: null,
  shipping: 'Frete e condições devem ser consultados na loja parceira.',
};

/**
 * Single source for all routes. These are fictional offers, never live prices.
 * Merchant names illustrate the UI and do not imply an active partnership.
 * No click is redirected until an authorized affiliate URL is configured.
 */
export const demoOffers: Offer[] = [
  {
    ...common, id: 'fone-jbl-e-series', name: 'Fone de ouvido Bluetooth JBL E-series, preto',
    description: 'Seu som favorito acompanha o dia a dia. Headphone sem fio com design leve e almofadas confortáveis. Produto e imagem utilizados para demonstrar a experiência de ofertas. Os preços abaixo são fictícios.',
    category: 'informatica', store: 'amazon', image: '/images/headphones-black.png',
    currentPrice: 189.90, previousPrice: 299.90, featured: true, flash: true,
    publishedAt: '2026-10-28T12:00:00Z', updatedAt: '2026-10-28T12:00:00Z',
    specs: { Tipo: 'Headphone', Conectividade: 'Bluetooth', Cor: 'Preto', Condição: 'Exemplo demonstrativo' },
    history: [
      { date: '2026-10-26T12:00:00Z', price: 299.90, note: 'Registro fictício para demonstração' },
      { date: '2026-10-28T12:00:00Z', price: 189.90, note: 'Preço demonstrativo, sem consulta à loja' },
    ],
  },
  {
    ...common, id: 'controle-dualsense', name: 'Controle sem fio DualSense para PS5, branco',
    description: 'Um novo companheiro de jogo. Controle DualSense branco, apresentado como exemplo de item para a categoria Games. Não representa uma oferta vigente na loja indicada.',
    category: 'games', store: 'mercado-livre', image: '/images/controller.png',
    currentPrice: 329.90, previousPrice: 449.90, featured: true,
    publishedAt: '2026-10-28T11:45:00Z', updatedAt: '2026-10-28T11:45:00Z',
    specs: { Compatibilidade: 'PlayStation 5', Tipo: 'Controle sem fio', Cor: 'Branco', Condição: 'Exemplo demonstrativo' },
    history: [
      { date: '2026-10-25T12:00:00Z', price: 449.90, note: 'Registro fictício para demonstração' },
      { date: '2026-10-28T11:45:00Z', price: 329.90, note: 'Preço demonstrativo, sem consulta à loja' },
    ],
  },
  {
    ...common, id: 'smartphone-iphone-13-pro', name: 'Smartphone Apple iPhone 13 Pro, 128 GB',
    description: 'Tecnologia para o que faz parte da sua rotina. Imagem ilustrativa de iPhone 13 Pro para apresentar os detalhes de uma oferta. Capacidade e preço são exemplos de configuração do catálogo, sem disponibilidade confirmada.',
    category: 'celulares', store: 'shopee', image: '/images/smartphone.webp',
    currentPrice: 1299, previousPrice: 1599, featured: true,
    publishedAt: '2026-10-28T11:30:00Z', updatedAt: '2026-10-28T11:30:00Z',
    specs: { Modelo: 'iPhone 13 Pro', Armazenamento: '128 GB (exemplo)', Tipo: 'Smartphone', Condição: 'Exemplo demonstrativo' },
  },
  {
    ...common, id: 'cafeteira-eletrica', name: 'Cafeteira elétrica com jarra de vidro, inox',
    description: 'Uma pausa para o café merece um bom achado. Cafeteira com acabamento em inox e jarra de vidro, em uma apresentação demonstrativa sem vínculo comercial com a loja indicada.',
    category: 'eletrodomesticos', store: 'amazon', image: '/images/coffee-maker.png',
    currentPrice: 249.90, previousPrice: 399.90, featured: true, flash: true,
    publishedAt: '2026-10-28T11:15:00Z', updatedAt: '2026-10-28T11:15:00Z',
    specs: { Tipo: 'Cafeteira de filtro', Jarra: 'Vidro', Acabamento: 'Inox e preto', Voltagem: 'Consultar a loja' },
  },
  {
    ...common, id: 'notebook-macbook-pro', name: 'Notebook Apple MacBook Pro 14”, cinza-espacial',
    description: 'Uma opção para trabalhar, estudar e criar. Notebook apresentado como exemplo de catálogo. Imagem ilustrativa e preços fictícios, sem confirmação de estoque.',
    category: 'informatica', store: 'mercado-livre', image: '/images/notebook.webp',
    currentPrice: 7299, previousPrice: 9499, featured: true,
    publishedAt: '2026-10-28T11:00:00Z', updatedAt: '2026-10-28T11:00:00Z',
    specs: { Linha: 'MacBook Pro', Tela: '14 polegadas', Cor: 'Cinza-espacial', Configuração: 'Consultar a loja' },
  },
  {
    ...common, id: 'fone-airpods', name: 'Fones sem fio Apple AirPods com estojo',
    description: 'Mais praticidade para ouvir música e atender chamadas. Apresentação demonstrativa dos AirPods com estojo. Não há oferta real vinculada a este item.',
    category: 'celulares', store: 'amazon', image: '/images/earbuds.webp',
    currentPrice: 699.90, previousPrice: 899.90, featured: true, flash: true,
    publishedAt: '2026-10-28T10:45:00Z', updatedAt: '2026-10-28T10:45:00Z',
  },
  {
    ...common, id: 'luminaria-mesa', name: 'Luminária de mesa com design minimalista',
    description: 'Um toque acolhedor para o seu cantinho. Luminária de mesa decorativa utilizada para demonstrar as ofertas da categoria Casa.',
    category: 'casa', store: 'shopee', image: '/images/table-lamp.webp',
    currentPrice: 89.90, previousPrice: 139.90, featured: true,
    publishedAt: '2026-10-28T10:30:00Z', updatedAt: '2026-10-28T10:30:00Z',
  },
  {
    ...common, id: 'tenis-puma-future', name: 'Tênis Puma Future Rider, casual e esportivo',
    description: 'Conforto e estilo para a rotina. Tênis utilizado como exemplo da categoria Moda. Consulte tamanhos, cores e condições em uma futura oferta verificada.',
    category: 'moda', store: 'mercado-livre', image: '/images/sneakers.webp',
    currentPrice: 239.90, previousPrice: 399.90, featured: true, flash: true,
    publishedAt: '2026-10-28T10:15:00Z', updatedAt: '2026-10-28T10:15:00Z',
  },
  {
    ...common, id: 'micro-ondas', name: 'Forno micro-ondas de bancada, preto',
    description: 'Praticidade para os momentos na cozinha. Micro-ondas ilustrativo; capacidade, medidas e tensão deverão ser confirmadas em uma futura fonte autorizada.',
    category: 'eletrodomesticos', store: 'mercado-livre', image: '/images/microwave.webp',
    currentPrice: 499.90, previousPrice: 649.90,
    publishedAt: '2026-10-28T10:00:00Z', updatedAt: '2026-10-28T10:00:00Z',
  },
  {
    ...common, id: 'liquidificador', name: 'Liquidificador de bancada com copo e tampa',
    description: 'Um aliado para receitas do dia a dia. Produto de exemplo para a navegação do catálogo. Imagem ilustrativa; acessórios e condições devem ser confirmados na loja.',
    category: 'eletrodomesticos', store: 'amazon', image: '/images/blender.webp',
    currentPrice: 149.90, previousPrice: 219.90,
    publishedAt: '2026-10-28T09:45:00Z', updatedAt: '2026-10-28T09:45:00Z',
  },
  {
    ...common, id: 'vaso-decorativo', name: 'Vaso com planta decorativa para ambientes',
    description: 'Um detalhe verde para renovar o espaço. Imagem de produto utilizada apenas para apresentar uma oferta fictícia na categoria Casa.',
    category: 'casa', store: 'shopee', image: '/images/plant.webp',
    currentPrice: 39.90, previousPrice: 69.90,
    publishedAt: '2026-10-28T09:30:00Z', updatedAt: '2026-10-28T09:30:00Z',
  },
  {
    ...common, id: 'bola-futebol', name: 'Bola de futebol para momentos de lazer',
    description: 'Para colocar a diversão em campo. Bola ilustrativa para demonstrar ofertas da categoria Esporte. Material e tamanho não foram verificados em uma fonte comercial.',
    category: 'esporte', store: 'mercado-livre', image: '/images/football.webp',
    currentPrice: 79.90, previousPrice: 119.90,
    publishedAt: '2026-10-28T09:15:00Z', updatedAt: '2026-10-28T09:15:00Z',
  },
  {
    ...common, id: 'raquete-tenis', name: 'Raquete de tênis para treino e lazer',
    description: 'Seu próximo treino começa com uma descoberta. Raquete apresentada em um exemplo sem disponibilidade ou condições comerciais confirmadas.',
    category: 'esporte', store: 'amazon', image: '/images/tennis-racket.webp',
    currentPrice: 159.90, previousPrice: 239.90,
    publishedAt: '2026-10-28T09:00:00Z', updatedAt: '2026-10-28T09:00:00Z',
  },
  {
    ...common, id: 'paleta-sombras', name: 'Paleta de sombras com espelho e cores variadas',
    description: 'Um achado para sua rotina de beleza. Paleta ilustrativa utilizada para apresentar busca e filtros. Valores exibidos são fictícios.',
    category: 'beleza', store: 'shopee', image: '/images/makeup-palette.webp',
    currentPrice: 49.90, previousPrice: 89.90,
    publishedAt: '2026-10-28T08:45:00Z', updatedAt: '2026-10-28T08:45:00Z',
  },
  {
    ...common, id: 'mascara-cilios', name: 'Máscara de cílios Essence Lash Princess',
    description: 'Pequenas descobertas para o dia a dia. Máscara de cílios apresentada como exemplo de produto, sem oferta comercial ativa.',
    category: 'beleza', store: 'amazon', image: '/images/mascara.webp',
    currentPrice: 29.90, previousPrice: 44.90,
    publishedAt: '2026-10-28T08:30:00Z', updatedAt: '2026-10-28T08:30:00Z',
  },
  {
    ...common, id: 'mamadeira-avent', name: 'Mamadeira Philips Avent Classic, 260 ml',
    description: 'Um exemplo de item para a categoria Bebês. Imagem ilustrativa. Disponibilidade, recomendações de uso e características devem ser verificadas na loja e no fabricante.',
    category: 'bebes', store: 'mercado-livre', image: '/images/baby-bottle.jpg',
    currentPrice: 54.90, previousPrice: 79.90,
    publishedAt: '2026-10-28T08:15:00Z', updatedAt: '2026-10-28T08:15:00Z',
  },
  {
    ...common, id: 'comedouro-pet', name: 'Comedouro para pets em aço inox',
    description: 'Um exemplo de achado para quem faz parte da família. Comedouro ilustrativo na categoria Pets. Capacidade e dimensões não foram confirmadas.',
    category: 'pets', store: 'shopee', image: '/images/pet-bowl.jpg',
    currentPrice: 24.90, previousPrice: 39.90,
    publishedAt: '2026-10-28T08:00:00Z', updatedAt: '2026-10-28T08:00:00Z',
  },
  {
    ...common, id: 'bolsa-casual', name: 'Bolsa casual preta com alça e fechamento',
    description: 'Estilo para levar com você. Bolsa ilustrativa para demonstrar filtros por categoria e faixa de preço. Sem oferta real associada.',
    category: 'moda', store: 'shopee', image: '/images/handbag.webp',
    currentPrice: 119.90, previousPrice: 179.90,
    publishedAt: '2026-10-28T07:45:00Z', updatedAt: '2026-10-28T07:45:00Z',
  },
];
