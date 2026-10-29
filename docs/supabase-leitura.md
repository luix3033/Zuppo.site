# Consulta pública do catálogo

A RPC zuppo_query_offers, criada pela migração 003, executa busca, filtros, ordenação, contagem e paginação respeitando RLS. O Worker envia a chave publishable sem sessão administrativa para consultas públicas. Nenhuma mudança de catálogo exige build.

O frontend consulta a página atual, seleções limitadas da home e favoritos por IDs. Detalhes consultam o ID necessário. Há cancelamento, debounce e revalidação ao retornar à aba, sem Realtime. Erros de configuração são explícitos; não há fallback de consulta completa.

A resposta mantém items, total, page, limit e totalPages. A migração é reexecutável e não exclui dados. Limites, configuração de ASSETS e testes operacionais estão em [refinamento](refinamento.md).
