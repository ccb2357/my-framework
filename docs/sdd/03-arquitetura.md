# Arquitetura

My Framework reúne PWA, website e admin independentes, com Laravel/MySQL compartilhados e infraestrutura Docker externa ao repositório. Versões efetivas ficam nos manifests/lockfiles; instalação e comandos no [manual da raiz](../../instalacao-my-framework.md).

## Organização

| Área | Responsabilidade |
| --- | --- |
| `pwa/` | Vue/Framework7 e Vite. `src/main.js`, `App.vue` e `routes.js` inicializam a aplicação; páginas, componentes, serviços, formulários e CSS ficam em `src/`. Roteamento oficial Framework7. |
| `website/` | Nuxt SSR: páginas em `app/pages/`, layouts/componentes/formulários em `app/`, bridges e integrações de servidor em `server/`. Runtime Node permanente. |
| `admin/` | Vue/shadcn-vue/Tailwind e Vite; entrada, componentes, serviços, dependências e build próprios. Login e Dashboard protegida. |
| `backend/` | Laravel: rotas, middlewares, autenticação, APIs, serviços, comandos, migrations e testes. MySQL é a conexão comum às interfaces. |
| `shared/forms/` | Lógica neutra de mensagens, máscaras, regras e integração dos formulários. |
| `scripts/bootstrap/` | Executor Node/Docker: validação central, descoberta da infraestrutura, arquivos derivados, instalação, compilação e verificações HTTP. |
| Nginx — infraestrutura externa | Seleção por host, HTTPS, arquivos estáticos PWA/admin, proxy Nuxt e encaminhamento das rotas técnicas ao PHP-FPM. |
| Docker/Compose — infraestrutura externa | Rede e serviços existentes de Nginx, PHP-FPM e MySQL; Nodes de desenvolvimento/build e serviço SSR. Dependências em volumes exclusivos. |

A escolha da interface depende do endereço, nunca do tamanho da tela. As fronteiras visuais e de componentes são definidas uma única vez no [design system](02-design-system.md#fronteiras).

### Rotas HTTP do Laravel

`backend/bootstrap/app.php` registra os arquivos e pipelines abaixo. A organização em arquivos não concede autorização nem cria domínio ou interface automaticamente; evitar caminhos duplicados.

| Arquivo | Responsabilidade e pipeline |
| --- | --- |
| `backend/routes/pwa.php` | Endpoints de cliente usados pela PWA e pelo website, em `/api/v1/auth/*`; grupo web com `ClientAuthContext`, sessão e `ClientCsrf`. A inspeção/saída da conta exige `ClientSession`. |
| `backend/routes/admin.php` | `/api/v1/admin/auth/*`; `AdminContext` → EncryptCookies → AddQueuedCookiesToResponse → `AdminStartSession` → `AdminCsrf` → bindings. Endpoints protegidos exigem `AdminSession`. |
| `backend/routes/website.php` | Leitura pública demonstrativa com `WebsitePublicContext`, registrada fora do grupo web e sem sessão. APIs privadas futuras devem declarar o contexto completo de cliente ou admin. |

As páginas Nuxt são atendidas pelo Nuxt Router. `/status`, `/api/v1/status` e `/up` são registrados pelo bootstrap Laravel; diagnósticos não dependem de sessão. `HealthCheck` faz consulta MySQL real e alimenta HTML/JSON; `/up` verifica a aplicação sem consultar o banco. Contratos em [05-api.md](05-api.md).

## Formulários compartilhados

Mensagens, máscaras e regras ficam em `shared/forms/`. Os adaptadores locais fornecem IMask/JustValidate das próprias dependências, sem resolver pacotes pelo `node_modules` de outra aplicação. O bind somente leitura em `/shared`, ao lado de `/app`, preserva `../shared`; os Vites e o Nuxt usam alias `@shared`.

Os hashes das três interfaces incluem essas fontes para que alterações participem da publicação. Desmontagem cancela inicializações pendentes e descarta máscaras, validadores e listeners. No website, imports de bibliotecas DOM e vinculação aos campos ocorrem após `onMounted`; SSR entrega a marcação sem executar essas APIs. Apresentação e acessibilidade seguem o design system.

## Autenticação dos clientes

PWA e website usam a mesma conta e sessão; admin usa identidade independente. Nesta seção, `<base>` é `PROJECT_SLUG` com hífens convertidos em sublinhados. O bootstrap gera `SESSION_COOKIE=<base>_session` como nome-base; os contextos aplicam os nomes efetivos da tabela.

| Contrato | PWA | Website | Admin |
| --- | --- | --- | --- |
| Modelo / tabela | `User` / `users` | Mesmo cliente da PWA | `Administrator` / `administrators` |
| Guard / provider | `web` / `users` | `web` / `users` | `admin` / `administrators` |
| Cookie de sessão | `<base>_session_client` | Mesmo cookie da PWA | `<base>_session_admin` |
| Escopo do cookie | `CLIENT_SESSION_DOMAIN` | Mesmo escopo da PWA | Host-only, sem domínio pai |
| Contexto / inspeção | `ClientAuthContext` / `ClientSession` | Mesmo pipeline da PWA | `AdminContext` / `AdminSession` |
| Host autorizado | Host de `APP_URL` | Host de `WEBSITE_URL` | Host de `ADMIN_URL` |
| Origens autorizadas | `SANCTUM_STATEFUL_DOMAINS` gerado | Mesma lista de cliente | `ADMIN_STATEFUL_DOMAINS` gerado |
| CSRF | `XSRF-CLIENT-TOKEN` | Mesmo token da sessão de cliente | `XSRF-ADMIN-TOKEN` independente |
| Broker de recuperação | `clients` | Mesmo broker da PWA | `administrators` |
| Tokens de recuperação | `client_password_reset_tokens` | Mesma tabela da PWA | `admin_password_reset_tokens` |
| Store da sessão | Laravel, driver `file` por padrão | Mesmo store de cliente | Manager/store dedicados; arquivos em `storage/framework/sessions/admin` ou tabela `admin_sessions` com driver database |

Os cookies de sessão são HTTP-only; cookies CSRF são legíveis pelo cliente e enviados no header `X-XSRF-TOKEN`. As duas áreas não aceitam tokens CSRF intercambiáveis. Em produção, as origens são HTTPS e os cookies seguros.

### Domínios e contextos locais

O bootstrap mantém o **`SESSION_DOMAIN` geral do Laravel em `null`**; não ampliá-lo para compartilhar a sessão administrativa. O admin força escopo host-only. O compartilhamento entre clientes usa a variável própria **`CLIENT_SESSION_DOMAIN`**, aplicada por `ClientAuthContext` durante a requisição e restaurada ao terminar.

Quando vazia, essa variável deriva o ancestral comum dos hosts de cliente, validado com Public Suffix List via tldts. Rejeitar sufixo público, `localhost` genérico e domínios não relacionados. Todos os subdomínios do escopo devem ser controlados pelo produto: o navegador pode enviar o cookie de cliente ao host administrativo, mas o admin não o usa como autenticação.

Em Vite/Nuxt dev/prévia/ADB via `localhost` ou `127.0.0.1`, o contexto usa cookie host-only e confere Origin/Referer contra as portas aprovadas. Esses endereços e os domínios nomeados são contextos distintos; validar compartilhamento entre hosts usando Nginx nas duas interfaces.

### Fluxo e proteção

`ClientAuthContext` roda antes de cookies/sessão/CSRF nos pontos de entrada de cliente, incluindo `/sanctum/csrf-cookie`. Confere hosts e origens conforme a tabela; produção rejeita Origin HTTP. Ausência de Origin não dispensa sessão ou CSRF.

Cadastro é público, com acesso imediato e sem confirmação de e-mail. `ClientCredentials` valida campos explícitos; senha usa o cast hashed. Login/cadastro regeneram sessão e CSRF. `ClientSession` exige usuário web real e `auth_version` atual; Bearer isolado não autentica. Respostas privadas usam no-store e erros controlados.

As regras do frontend não substituem validação/autorização Laravel. Login/logout são serializados nas três interfaces; respostas antigas não restauram identidade durante essas operações. Logout destrói a sessão compartilhada e limpa a identidade em memória. Framework7 verifica a sessão ao navegar para páginas protegidas; APIs mantêm sua própria proteção. Senhas não entram em rascunhos/sessionStorage.

## Autenticação administrativa

`admin:create` solicita senha oculta e confirmação, cria o administrador único ID 1 e recusa sobrescrever uma conta existente. Não há cadastro público. IDs ou e-mails coincidentes com clientes não concedem privilégios.

`AdminStartSession` prepara o store administrativo descrito na tabela, recria a resolução dos guards e restaura configuração/bindings ao terminar a requisição. Host administrativo rejeita acesso à autenticação e ao CSRF de cliente. Login rotaciona sessão/CSRF; logout invalida somente a sessão administrativa.

`admin/src/App.vue` monta a Dashboard somente após inspeção no servidor. Novas APIs administrativas integram o pipeline e o middleware de sessão existentes; proteger a tela não substitui a autorização do endpoint.

## Recuperação e e-mail

`PasswordRecoveryController` usa PasswordBroker Laravel conforme o mapeamento da tabela. As tabelas efetivas são distintas de `password_reset_tokens` legado; a recuperação de clientes usa provider dedicado `client_recovery` e mantém o mesmo modelo de cliente.

`AccountPasswordReset` escolhe a origem configurada pela interface que solicitou o link: **`APP_URL` para PWA, `WEBSITE_URL` para website e `ADMIN_URL` para admin**. Nunca construir o destino a partir do Host/Origin recebido. Os dados ficam no fragmento `#`, não enviado a Nginx/service worker; o navegador consome/remove o fragmento e mantém o token somente em memória. Não registrar link/token em telemetria/logs, campo oculto persistente, armazenamento ou rascunho. Reload exige reabrir o link do e-mail.

O link expira em 60 minutos, é de uso único e novo pedido para a mesma conta respeita 60 segundos. Reset não cria sessão; altera senha/hash, remember_token e `auth_version` somente da conta alvo. As APIs rejeitam suas sessões antigas; a outra área permanece independente. Solicitação usa mensagem genérica, que não comprova envio ou entrega.

SMTP envia de forma síncrona, com timeout e TLS obrigatório. Testing deriva transporte array, recuperação desabilitada e senha SMTP vazia; testes explícitos usam notificações simuladas. Expiração dos tokens é conferida pelo broker, sem worker adicional.

## Integração HTTP e configuração SSR

Nginx serve os `dist` de PWA/admin e encaminha `/` do website ao serviço `<slug>-website-node:3000`. Rotas técnicas seguem para o mesmo PHP-FPM. Resolver Docker dinâmico permite carregar o Nginx antes de o SSR estar ativo. Admin e website não oferecem manifest/service worker.

O bootstrap gera configuração pública por whitelist: identidade, localidade, URLs e buildId. `website/.foundation.server.json` contém somente alvo/Host do backend, URL do website, porta dev e nome do cookie, incorporados no runtimeConfig privado. Central, credenciais, APP_KEY e diretórios do backend não são disponibilizados ao Nuxt/navegador; os arquivos derivados não entram no Git/pacote.

Em produção, o alvo fixo do backend é a origem `WEBSITE_PRODUCTION_URL` via HTTPS, com validação TLS e sem seguir redirects. Em local, usa `NGINX_INTERNAL_URL` e Host configurado. Isso evita o redirecionamento do listener HTTP em produção. Node precisa resolver/alcançar a origem HTTPS; parâmetros da requisição do usuário nunca escolhem o destino. Modo/alvo e configuração relevante participam do hash do build.

### Inspeção de sessão no Nuxt

Estado de usuário usa `useState`/`useNuxtApp` por requisição, nunca singleton no servidor. Middleware verifica `/conta` antes de renderizar HTML privado. `GET /_session` encaminha exclusivamente o cookie de cliente a `GET /api/v1/auth/me`, em destino/Host fixos, com timeout e sem cache.

O transporte Node preserva Host do virtual host; não depender do override de Host do Fetch. A resposta expõe somente id/name/email, sem cookies ou cabeçalhos administrativos. `401` direciona ao login; falha de transporte/contrato retorna `503`. Nenhuma mutação é repetida automaticamente. O proxy de desenvolvimento encaminha somente os endpoints de cliente; produção usa o roteamento Nginx.

## Conteúdo público dinâmico

`WebsiteContent` lê somente id=1 de `website_demo_content`, selecionando title/body/updated_at. O comando `website:content` valida título de 1–160 caracteres e corpo de 1–2000, faz upsert e atualiza updated_at; `--clear` remove somente esse registro. Não compila nem reinicia serviços.

`GET /api/v1/website/content` usa o contexto público registrado na organização de rotas: host do website e Origin, se presente, são conferidos; nenhuma identidade ou cookie de sessão é lido/emitido. Falha MySQL retorna `503` controlado, nunca conteúdo vazio.

Nuxt `GET /_content` consulta esse endpoint em alvo fixo, sem encaminhar Cookie, Authorization ou Set-Cookie. Valida envelope, tipos, limites e timestamp e elimina propriedades extras. HTTP inválido, HTML, JSON malformado e timeout não entram na página como dados. O pipeline é anônimo; endpoints privados não podem reutilizá-lo.

`DynamicContent.vue` usa `useFetch` SSR com no-store, credentials omit, retry zero, timeout e transformação por whitelist. `getCachedData` reaproveita somente o payload na hidratação; navegações e atualizações consultam novamente. Sem prerender, cache Nitro, memoização global ou cache HTTP nesse fluxo. `/_session` e `/conta` mantêm proteção/no-store.

SSR lê o estado atual a cada requisição; uma aba aberta consulta por botão, navegação ou retorno do foco/conexão. Dados mudam sem build; mudanças no código/configuração compilada seguem a publicação. O bootstrap exige HTML/buildId esperado e resposta válida de `/_content` antes de anunciar sucesso.

## PWA e publicação

Fonte única `pwa/src/sw.js`, Workbox injectManifest e registro `virtual:pwa-register` em modo prompt, desativado no Vite dev. Precache somente público; API/sessão/CSRF/status nunca recebem cache ou fallback HTML. Shell offline para rotas conhecidas; outras navegações públicas recebem offline.html. Cache isolado por origem/escopo.

`pwa/src/pwa/manager.js` controla instalação, conexão e atualização. Novos formulários integram `draftGuard`: aba alterada não recarrega por ativação externa. Confirmação salva campos conhecidos da Hello em sessionStorage por projeto/aba por até 24h; falha de armazenamento mantém a aba.

PWA usa staging validado por `check-pwa.mjs`; publicação coloca assets antes do HTML/worker e conserva assets anteriores. Admin também valida staging antes de publicar. Falha de compilação não substitui entradas; falha de I/O exige correção/reexecução.

Nuxt `node-server` cria releases em `.releases/` e publica o ponteiro somente após sucesso; runtime fixa a release ao iniciar. O bootstrap verifica o build pelo Nginx e inicia/recria somente o website quando necessário, com espera limitada, `--no-deps` e sem build de imagens. Preserva projeto/arquivos Compose e resolve binds no host via override de volumes por stdin, sem outro Compose persistente.

## Bootstrap e dados

Valores são preenchidos somente em `.env.foundation`. Executor `my-framework-bootstrap:0.1.0` descobre e valida a infraestrutura existente, gera configurações/atalhos e `.foundation-installation.md` ignorado; README/manual versionados permanecem inalterados. Integração Compose/Nginx é aplicada manualmente.

Instala pelos lockfiles quando necessário, preserva chaves/dados/volumes e exige `--force` para migrations em produção. `app:sync` limita-se a optimize:clear e migrations, propagando falhas; não instala dependências, compila ou regenera chaves. `TestingDatabaseGuard` confere ambiente/banco exclusivo antes de operações destrutivas nos testes. Código zero exige verificações de backend, builds e HTTP das três interfaces.

## Limites desta etapa

- Catálogo, checkout, compras, assinaturas, editor e integrações comerciais pertencem ao produto; a base contém somente exemplos públicos/demonstrativos.
- A migration de conteúdo cria tabela vazia, sem seeder. O comando altera somente o exemplo; não há escrita HTTP pública nem alteração de contas por esse fluxo. Bootstrap não executa fresh/reset/seeders.
- Offline cobre a interface PWA e o rascunho temporário conhecido; não implementa persistência/sincronização de registros. Admin e website não têm cache offline privado.
- Atualização entre domínios acontece na próxima inspeção/navegação/foco, sem canal de sincronização em tempo real.
- Rollback automático e limpeza de releases Nuxt não estão implementados. Retenção/limpeza de assets antigos e recuperação são decisões do plano de publicação do produto.
- A única ativação automática de infraestrutura é o serviço website já declarado e validado. PHP-FPM, Nginx, MySQL e outros serviços não são reiniciados pelo bootstrap.
