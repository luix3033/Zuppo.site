# Zuppo

Plataforma de curadoria de ofertas em React/TypeScript com backend HTTP real em JavaScript ESM, executado em Cloudflare Workers. O catálogo público usa exclusivamente ofertas persistidas, publicadas e válidas. Não há ofertas demonstrativas, preenchimento automático com produtos fictícios ou fallback de dados de exemplo.

## Conexão Supabase

A leitura pública pode usar PostgreSQL/RLS sem alterar as páginas. Veja [configuração, testes e limites desta etapa](docs/supabase-leitura.md) e o [esquema inicial](docs/supabase-primeira-etapa.md). Com `CATALOG_PROVIDER=supabase`, o painel usa [login Supabase e CRUD transacional com RLS](docs/supabase-admin.md), após aplicar a migração 202610290002. Home, mídia e contatos continuam no R2.

## Executar localmente

Requer Node.js 22.13+ e npm.

```sh
npm install
npm run dev
```

Abra **http://127.0.0.1:5173**. O comando sobe a API e o Vite no mesmo servidor. Ofertas, configurações, imagens, rascunhos e eventos ficam em `.local-data/`, ignorado pelo Git. O catálogo começa vazio. Recarregar ou reiniciar mantém os dados.

O modo local autoriza um administrador de desenvolvimento apenas no servidor ligado ao loopback `127.0.0.1`. Não implementa OAuth local e não deve ser exposto como servidor de produção. Na hospedagem, a identidade vem do login ChatGPT e o segredo `ADMIN_EMAIL` é validado no servidor; cabeçalhos enviados pelo navegador não substituem essa autorização. Reinicie o processo local após alterações no código do backend.

```sh
npm test
npm run build
```

O build gera o frontend e `dist/server/index.js`, com as APIs do Worker e os assets. A hospedagem usa o recurso R2 `BUCKET` declarado em `.openai/hosting.json`. O comando `npm run preview` serve somente os assets compilados; para trabalhar com a API e persistência locais use `npm run dev`.

## Estrutura

```text
src/
  components/          # Marca, navegação e cards
  features/homepage/   # Home, campanhas, aparência, editor e prévia
  features/media/      # Biblioteca e importação em lote
  features/offers/     # Catálogo, pesquisa e filtros
  hooks/               # API, favoritos e configurações públicas
  pages/               # Admin, contato, políticas e detalhes legados
  data/                # Tipos, categorias e lojas; sem produtos fictícios
worker/
  index.js             # HTTP, identidade, autorização e composição
  offers.js            # Persistência, validação, publicação e consultas
  settings.js          # Configurações reais de contato e canais
  media.js             # Metadados, paginação e proteção de arquivos em uso
  home-validation.js   # Validação do conteúdo e das cores
server/
  dev.mjs              # API e Vite no loopback
  local-bucket.mjs      # Adaptador persistente em disco para desenvolvimento
scripts/build-worker.mjs
tests/                 # Testes; dados fictícios ficam somente em fixtures/
```

## Ofertas

Em `/zuppo-admin/login`, entre com a conta autorizada e abra **Gerenciar ofertas**. Novos cadastros começam em **Rascunho**. Para publicar, informe nome, descrição, preço, categoria, loja, imagem válida e link de afiliado HTTPS. Rascunhos, ofertas expiradas, indisponíveis e registros antigos marcados como demonstração não aparecem no catálogo público. Registros reais já persistidos são preservados.

O preço anterior é opcional e não pode ser inferior ao atual. O histórico registra alterações informadas pela administração, sem apresentar esses valores como preços monitorados automaticamente na loja. A expiração é opcional e verificada na API e no redirecionamento.

Ao clicar no produto, o visitante vê a loja e confirma a saída. `/go/:id` consulta a oferta no servidor novamente, verifica disponibilidade e destino, registra o clique e redireciona. Ofertas que expiraram ou foram retiradas retornam uma página de indisponibilidade.

## APIs

| Endpoint | Comportamento |
| --- | --- |
| `GET /api/offers?limit=24&page=1` | Catálogo público paginado |
| `GET /api/offers` | Array compatível com clientes anteriores |
| `GET /api/offers/:id` | Oferta publicada e disponível |
| `GET /go/:id` | Redirecionamento validado com registro de clique |
| `GET /api/admin/offers` | Ofertas reais, incluindo rascunhos e expiradas |
| `PUT /api/admin/offers/:id` | Cria/edita e valida uma oferta |
| `DELETE /api/admin/offers/:id` | Remove a oferta do catálogo |
| `GET /api/settings` | Canais públicos configurados |
| `GET, PUT /api/admin/settings` | Administração dos contatos |
| `GET /api/homepage` | Conteúdo publicado |
| `GET, PUT /api/admin/homepage` | Edição e revisão do rascunho |
| `POST /api/admin/homepage/publish` | Publicação explícita |
| `GET, POST /api/admin/media` | Biblioteca paginada e upload |
| `PUT, DELETE /api/admin/media/:id` | Metadados e exclusão protegida |
| `POST /api/events` | Visualização anônima de oferta real |
| `GET /api/admin/stats` | Métricas reais de produtos cadastrados |

O catálogo aceita `q`, `category`, `store`, `minPrice`, `maxPrice`, `minDiscount`, `sort`, `limit` (máximo 100) e `page`. A resposta paginada contém `items`, `total`, `page`, `limit`, `totalPages`. As consultas percorrem as páginas do armazenamento R2, sem o limite anterior de mil cadastros.

Toda API administrativa verifica identidade e autorização. Mutações exigem origem correspondente ao site. O cadastro rejeita URLs inseguras, dados incompletos e preços inválidos. Valores secretos pertencem ao runtime e não ao frontend. As variáveis `VITE_*` antigas não são utilizadas como fonte de dados ou canais.

## Home, banners, cores e imagens

A home e as campanhas continuam editáveis no painel. Banner original, modelo de Black Friday e arte pronta para desktop/celular são opções reais de configuração. Salvar o rascunho não altera o público; visualizar e publicar são etapas distintas. A escrita condicional protege contra sobrescrever rascunhos salvos por outra janela.

A biblioteca aceita PNG, JPEG e WebP de até 4 MB, com até 50 arquivos por lote e páginas de 48 arquivos. Arquivos em uso não podem ser excluídos. Imagens são armazenadas em R2, com nomes e descrições. As cores e os níveis de arredondamento são validados antes de publicar, incluindo contraste dos textos.

Em **Configurações**, cadastre o e-mail público e os canais oficiais. Canais vazios ficam fora da interface; nenhum endereço é inventado. Configurações de canais que já existiam na home publicada são lidas por compatibilidade até o primeiro salvamento das configurações globais.

## Limites desta etapa e próximos passos

O backend já atende ofertas, publicação da home, mídia, configurações e métricas. Com o provedor `r2`, a persistência usa objetos JSON. Com `supabase`, ofertas públicas vêm do PostgreSQL e o restante permanece em R2. Consultas de ofertas leem os registros antes de filtrar. Para um catálogo grande, o próximo passo é migrar consultas e índices para D1/PostgreSQL, preservando a API e os arquivos no R2.

Não há checkout, cadastro de clientes ou integração automática com marketplaces. Não existe scraping ou envio de mensagens. A importação comercial depende de fontes autorizadas, credenciais e regras dos programas de afiliados. Favoritos continuam locais ao navegador. Indicadores não representam vendas nem clientes únicos; mostram eventos de produtos reais dos últimos 30 dias, com limite de 1.000 eventos por consulta, indicado quando parcial.

Os textos legais refletem o funcionamento atual e continuam identificados para revisão jurídica. Identificação da empresa e canais públicos devem ser fornecidos pelo proprietário. Nenhum dado de empresa, depoimento, produto ou condição comercial é inventado.
# Zuppo.site
