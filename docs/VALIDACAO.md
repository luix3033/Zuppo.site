# Validação da versão

- 57 testes automatizados aprovados: autorização, SQL/RLS, busca/paginação, sessão, limites de corpo, mídia, contenção e concorrência.
- Migração003 executada duas vezes em PostgreSQL/PGlite para verificar reexecução segura; testes de filtros e visibilidade passaram.
- Build TypeScript/Vite/esbuild aprovado.
- Wrangler deploy --dry-run aprovado com bucket zuppo, ASSETS e bindings de rate limit.
- Worker compilado: aproximadamente52KiB,16KiB gzip. O backend anterior embutia fontes/imagens e tinha aproximadamente2,9MiB gzip. Assets continuam sendo publicados separadamente; não é uma redução equivalente de todos os bytes baixados pelo visitante.
- Runtime workerd: deep links, APIs JSON, sessão restrita, bloqueio de código interno e headers verificados.
- Navegador: paginação, busca, favoritos, seleções da home, detalhe por ID, repetição após erro e viewport390px; sem erros JavaScript ou violações da CSP nos fluxos exercitados.
- Consulta real read-only da RPC Supabase: status200, limite1, total2 no momento da verificação.
- npm audit e npm audit --omit=dev: zero alertas conhecidos na execução.

Nenhum teste de carga, ataque a contas reais, gravação de oferta em produção ou publicação real na Cloudflare foi realizado. Leituras limitadas não certificam todo o ambiente. MFA, revisão de credenciais, backup, retenção e limites da conta exigem verificação operacional.
