# Zuppo — aplicativo web instalável

Instalação: https://zuppo-theta.vercel.app/instalar

A PWA usa o símbolo enviado pelo responsável (Zuppinho fazendo sinal positivo), preservado em public/icons/zuppo-original.jpg. Foram gerados PNGs de 192px, 512px, 180px para Apple e uma versão maskable com margem segura. Nenhuma marca foi redesenhada.

## Instalação

- Android: Chrome → Instalar Zuppo na página /instalar quando o navegador oferecer o evento nativo; alternativamente Menu → Instalar app / Adicionar à tela inicial.
- iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início → Adicionar. Mantenha Abrir como App ativado quando a opção existir.
- Desktop: Chrome/Edge podem oferecer o ícone de instalação na barra de endereço.

O navegador e sistema controlam a disponibilidade e o texto da instalação. Navegação privada normalmente impede instalação. O aplicativo abre em modo standalone e tem atalhos para Ofertas e Favoritos. Não é um APK nem uma publicação nas lojas Apple/Google.

## Conexão, privacidade e atualizações

O service worker guarda somente offline.html, o pequeno script de reconexão e ícones públicos do app. Navegações públicas usam rede; quando a conexão falha, exibem a tela offline. Não grava HTML de home, produtos, preços, favoritos ou painel no Cache Storage.

/api, /go, /media, /healthz e /zuppo-admin não são interceptados para cache. Ofertas, configurações, status do mascote e administração continuam online e sem dados privados no cache offline. Favoritos permanecem no localStorage original; atualizar o app não apaga esse armazenamento. Instalações/navegadores diferentes, especialmente no iOS, podem usar armazenamentos separados; não há sincronização de favoritos entre aparelhos.

Cada build gera uma versão do worker a partir dos assets, HTML, manifesto, ícones e tela offline. Uma nova versão fica aguardando; a interface oferece Atualizar agora ou Depois. A confirmação envia SKIP_WAITING e recarrega após controllerchange. O aviso de atualização fica oculto no painel administrativo para evitar recarregamento durante uma edição. Nenhuma ativação forçada ou limpeza de localStorage é executada.

O escopo é / e os caches próprios usam o prefixo zuppo-pwa-. Ativar uma nova versão remove apenas caches antigos desse prefixo. Não há notificações push nesta etapa.

## Build

npm run build:vercel executa Vite, scripts/build-pwa.mjs e o empacotamento do backend. O build legado também versiona o service worker. Não retire o passo build-pwa nem copie manualmente sw.js do fonte sobre o arquivo gerado em dist.

Vercel serve /sw.js com no-cache/no-store e Service-Worker-Allowed: /. O manifesto usa application/manifest+json, e os caminhos estáticos da PWA ficam fora do fallback SPA. O painel recebe Cache-Control: no-store.

## Verificação

- 67 testes locais aprovados; incluem dimensões dos ícones, manifesto, não interceptação de APIs/painel, fallback offline, atualização mediante mensagem e limpeza restrita dos caches.
- Build Vercel de produção concluído e deploy realizado.
- Navegador Chromium: manifesto válido, service worker ativo, tela de instalação sem overflow em 390px, fallback offline com ícone, APIs privadas indisponíveis offline, favoritos mantidos, reconexão e página de login funcionando, sem erros JavaScript.
- A janela anônima reporta apenas a restrição de instalação in-incognito. A disponibilidade nativa foi verificada também em perfil persistente normal.
- Ainda é recomendável confirmar a instalação física no Android e no iPhone do responsável. Nenhum dispositivo físico foi utilizado nesta validação.
