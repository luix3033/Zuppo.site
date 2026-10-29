# Refinamento de desempenho, segurança e estrutura

## Ativação

1. Executar `supabase/migrations/202610290003_catalog_queries.sql` no SQL Editor do projeto atual. Esta migração usa CREATE OR REPLACE e índices IF NOT EXISTS: pode ser reexecutada para atualizar a função, sem excluir ofertas ou usuários. Não reexecutar as migrações 001/002 já aplicadas.
2. O `wrangler.jsonc` incluído aponta para o Worker `zuppo-site` e o bucket `zuppo`, conforme informado pelo responsável. Preservar as variáveis e a conta corretas ao publicar. O arquivo `wrangler.hospedagem.example.jsonc` é uma referência para outros ambientes. Alternativamente, fornecer `R2_BUCKET_NAME` ao processo de deploy e `ZUPPO_WORKER_NAME` opcional; `npm run deploy` gera uma configuração dentro de `.wrangler/`, ignorada pelo Git. O padrão do nome é `zuppo-site`.
3. Configurar no runtime `CATALOG_PROVIDER=supabase`, `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, além do binding R2 `BUCKET`. O script não grava valores secretos na configuração gerada.
4. Build `npm ci --include=dev && npm run build`; deploy `npm run deploy`. Wrangler e esbuild são dependências de desenvolvimento versionadas no lockfile. Node.js 22.13+.

## Assets e rotas

O Worker agora é gerado por esbuild a partir de `worker/entry.ts`, sem concatenar módulos ou embutir fontes/imagens em JavaScript. Arquivos públicos ficam em `dist/` e são atendidos pelo binding **ASSETS**. É obrigatório que a configuração tenha:

```json
"main": "dist/server/index.js",
"assets": {
  "directory": "./dist",
  "binding": "ASSETS",
  "not_found_handling": "single-page-application",
  "run_worker_first": true
}
```

Com `run_worker_first: true`, o Worker aplica headers e decide entre API e ASSETS. APIs desconhecidas retornam JSON 404, não HTML. Rotas internas de código e caminhos iniciados por ponto não são servidos. `public/.assetsignore` exclui a pasta `server/` do upload de assets. Não excluir esse arquivo ao enviar o projeto ao GitHub. Não restaurar o antigo fallback em `_redirects`.

`/healthz` verifica a presença das configurações/bindings e retorna 200 ou503; não comprova disponibilidade do banco ou existência da migração. O deploy não cria ou migra seu bucket e não transfere imagens.

## Catálogo

A RPC `zuppo_query_offers` é security invoker, sujeita a RLS e também exige a elegibilidade pública, inclusive quando chamada por um administrador. Retorna apenas os campos públicos declarados e executa filtros, ordenação, contagem e paginação no SQL. O navegador busca uma página por vez; home consulta até16 por seção, favoritos usam até200 IDs e detalhes apenas o ID solicitado.

Busca tem limite de200 caracteres/12 termos; páginas de1 a10000; até100 resultados por chamada. Valores monetários são comparados em centavos. A ordenação inclui desempate estável por data/ID. Busca textual não executa expressões SQL ou regex fornecidas pelo visitante. A contagem pode continuar examinando muitas linhas; índices não substituem medição com o volume real. A permissão SELECT já existente nas tabelas públicas permanece; futuros campos privados devem ficar em tabela privada ou receber privilégios de coluna adequados.

Debounce/cancelamento evitam consultas antigas durante digitação. Ao retornar à aba, consultas com mais de30 segundos podem ser renovadas; não há Realtime. Erros de API HTML, migração ausente e conexão aparecem com opção de repetição. Não há fallback automático que volte a baixar o banco inteiro.

## Contenção e métricas

O exemplo Wrangler configura quatro bindings de rate limit: AUTH_RATE_LIMITER, EVENT_RATE_LIMITER, CATALOG_RATE_LIMITER e ADMIN_RATE_LIMITER. Seus IDs de namespace são identificadores de configuração, não segredos; verifique colisões e limites de sua conta ao incorporá-los em configurações existentes. Esses limites gerenciados operam por localidade da rede Cloudflare, não como um contador global exato. Limites são compartilhados conforme o namespace e a chave calculada.

Sem o binding, existe apenas contenção limitada ao isolate, com memória limitada a4096 chaves. Isolates diferentes e reinícios não compartilham esse contador; não apresentar esse fallback como defesa global contra ataques distribuídos. Falhas de um binding configurado negam a operação. Os limites não substituem regras WAF e monitoramento.

Eventos repetidos para oferta/tipo/endereço têm supressão temporária por isolate. Uma impressão salteada é mantida somente em memória; IP puro e essa impressão não são gravados nos eventos R2. A deduplicação não transforma métricas em visitantes únicos nem impede toda fraude distribuída. Cliques não são impedidos por falha da gravação de métrica; com contexto Workers, ela é executada por waitUntil.

Indicadores continuam limitados a1000 eventos por consulta. Retenção automática, agregação histórica e auditoria administrativa completa ainda não foram implementadas.

## Sessão e entrada

Corpos JSON, login e upload são lidos com limite de bytes durante o streaming, inclusive sem Content-Length. JSON e multipart exigem tipos de conteúdo corretos. Login é limitado a4KiB; ofertas32KiB; CMS256KiB; uploads5MiB no total e4MiB por arquivo. Respostas de contenção usam429 com Retry-After.

Logout trata sessão com apenas refresh e valida a resposta de revogação. Cookies são removidos mesmo em falha externa; se a revogação não puder ser confirmada, o painel informa isso em vez de continuar mostrando a sessão como ativa. Isso não garante invalidar instantaneamente todo JWT já emitido: o comportamento do provedor e a expiração continuam relevantes.

MFA obrigatório não foi acrescentado: habilitá-lo exige o fluxo de desafio e verificação de nível de autenticação, evitando bloquear administradores sem um fluxo de entrada compatível.

## Imagens

PNG recebe validação de assinatura, chunks/CRC e cabeçalho. JPEG e WebP recebem validação estrutural correspondente. Limites de8192 por lado e16MP; arquivos truncados são rejeitados. **Não há decodificação/recompressão completa de pixels**. WebP animado não é aceito. Essas medidas não equivalem a varredura antivírus ou prova de que qualquer decoder esteja livre de vulnerabilidades.

## Integridade da publicação

Publicar exige revisão do rascunho e revisão publicada esperada. A gravação é condicional ao ETag da versão pública lida antes do rascunho; uma publicação concorrente não pode ser sobrescrita pela operação antiga. O editor impede operações sobrepostas e apresenta conflito409 para recarregar. O formulário de ofertas informa corretamente se foi salvo como rascunho ou publicado.

## Headers

A resposta do Worker aplica CSP, SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy e HSTS em HTTPS. A prévia da home permite iframe do próprio site. Estilos inline continuam permitidos para o tema e componentes existentes; imagens HTTPS externas são permitidas para ofertas. CSP é uma defesa adicional, não uma certificação contra XSS. Não habilitar HSTS preload/subdomínios sem avaliar a infraestrutura.

## Verificação antes de divulgar

- `/api/offers?limit=12`: JSON paginado real, sem HTML e sem erro de migração.
- `/api/admin/session`:401 sem sessão, login e logout testados com conta autorizada.
- Pesquisa, preço, loja, desconto, páginas e favoritos.
- Rascunho, publicação, preço e desativação de oferta real.
- Upload válido e inválido; campanha e conflito entre abas.
- Headers na página e na API, deep links e imagens.
- Confirmar revogação de quaisquer credenciais anteriormente compartilhadas e revisar backup/RLS no ambiente real.

O responsável confirmou a aplicação da migração003. A RPC foi consultada no projeto real com a chave pública: resposta200, página limitada e duas ofertas elegíveis no momento da validação. Nenhuma escrita de ofertas foi realizada nessa verificação. Não houve deploy real na conta Cloudflare ao preparar esta versão; a publicação depende do envio do código e das configurações descritas.

A listagem administrativa ainda consulta ofertas em lotes completos e os indicadores têm o limite declarado de eventos; paginação administrativa, agregação histórica e trilha de auditoria são evoluções separadas.
