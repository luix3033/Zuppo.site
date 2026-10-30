# Status do Zuppinho

Painel → Configurações → Status do Zuppinho. Estados: hunting (procurando ofertas), resting (descansando), offline. Salve para divulgar a atividade. Não é presença automática de sessão: entrar/sair do painel não muda o status. O padrão é offline, sem alegar atividade real.

A janela pública começa recolhida, permite expandir/recolher por teclado e guarda a preferência no navegador. No celular fica acima da navegação inferior. Consulta o servidor a cada 30 segundos quando a aba está visível e ao recuperar o foco. Se a consulta falhar, a janela é ocultada para não anunciar um estado desatualizado. Não aparece no painel ou na prévia do editor.

A imagem de investigação fornecida foi utilizada para hunting. Descanso usa a imagem oficial na cadeira de balanço; offline usa a imagem oficial dormindo na cama, com a mensagem de retorno no dia seguinte. O administrador pode trocar cada imagem pela biblioteca ou por URL HTTPS, sem novo deploy.

## API para o aplicativo futuro

- GET /api/mascot-status: leitura pública, sem cache. Resposta contém state, images (hunting/resting/offline), revision e updatedAt.
- GET /api/admin/mascot-status: mesma estrutura, exige sessão administrativa válida.
- PUT /api/admin/mascot-status: enviar state, images e a revision recebida anteriormente como JSON. Exige autenticação administrativa Supabase, vínculo em admin_memberships e Origin igual à origem do servidor. Usa a mesma sessão HttpOnly do painel; o aplicativo futuro precisa integrar esse fluxo de autenticação (não deve embutir senha ou chave administrativa).
- 409 significa alteração concorrente: recarregar e reaplicar. A gravação usa ETag condicional e gera nova revision e updatedAt no servidor.
- Estado e imagens são validados no servidor. Visitantes não podem atualizar o status. Nenhum novo acesso público de escrita ao Supabase foi criado.

Persistência: objeto privado settings/mascot-status no Vercel Blob. Não exige migração SQL ou deploy para mudar o status. A API está pronta para integração; nenhum aplicativo móvel foi implementado nesta etapa.
