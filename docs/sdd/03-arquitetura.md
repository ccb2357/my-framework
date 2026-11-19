# Arquitetura

PWA em `pwa/`, admin em `admin/`, website Nuxt em `website/`, Laravel em `backend/` e infraestrutura compartilhada externa. Versões efetivas nos manifests/lockfiles; instalação e comandos no [guia da raiz](../../instalacao-my-framework.md).

## Organização

Rotas HTTP do backend:

| Arquivo | Responsabilidade |
| --- | --- |
| `backend/routes/pwa.php` | APIs de autenticação e demais rotas da PWA. |
| `backend/routes/admin.php` | Rotas administrativas, com sessão e CSRF próprios. |
| `backend/routes/website.php` | GET público demonstrativo do website, sem sessão; endpoints do produto devem declarar seu pipeline próprio. |

`bootstrap/app.php` registra os três arquivos. `website.php` registra o conteúdo público demonstrativo; páginas Nuxt, catálogo, checkout e demais recursos pertencem ao produto. Evitar caminhos duplicados entre os arquivos; separar arquivos não cria domínio, interface ou autorização automaticamente. APIs protegidas de clientes usam ClientSession; administrativas, AdminSession.

| Área | Responsabilidade |
| --- | --- |
| `pwa/src/main.js`, `App.vue`, `routes.js` | Inicialização Vue/Framework7, componentes, estilos e roteamento oficial F7. JavaScript/script setup; sem roteador paralelo dentro da PWA. |
| `src/pages/`, `components/` | Páginas e composições reutilizáveis; APIs Core quando necessárias ao componente oficial. |
| `src/services/`, `forms/`, `css/` | HTTP/CSRF/erros, máscaras/validação e tokens/layout compartilhados. Destruir instâncias/listeners sem duplicação. |
| `admin/` | Vue/shadcn-vue/Tailwind; componentes locais JavaScript, configuração pública própria, Vite/lockfile/volume/build isolados. Login e Hello Dashboard protegida; sem PWA. |
| `backend/app/` | Diagnóstico, comandos, APIs/sessão, serviços. Regras de negócio são acrescentadas pelo produto. |
| `scripts/bootstrap/` | Executor Node/Docker; configuração, descoberta do Engine, arquivos derivados e verificações PHP/HTTP. |

`HealthCheck` faz consulta MySQL real; um serviço alimenta HTML/JSON. Rotas de diagnóstico são independentes de sessão para reportar falha do banco sem erro indireto de autenticação. `app:sync` executa optimize:clear e depois migrations; propaga falhas e exige --force em produção. Não instala/builda/semeia/regenera chaves.

Sessão Laravel/Sanctum com nome por projeto, CSRF e origens/portas derivadas; clientes compartilham cookie entre os hosts PWA/website e o admin mantém cookie host-only. Em produção: HTTPS/cookies seguros. Clientes usam o guard web e o modelo User. `TestingDatabaseGuard` verifica o banco testing antes de traits destrutivas.

## PWA e publicação

Fonte única `pwa/src/sw.js`, Workbox injectManifest e registro `virtual:pwa-register` em modo prompt, desativado no Vite dev. Precache somente público; API/sessão/CSRF/status nunca recebem cache ou fallback HTML. Shell offline para rotas conhecidas; demais navegações públicas recebem offline.html. Cache isolado por origem/escopo.

`pwa/manager.js` controla instalação, conexão e atualização. Novos formulários integram `draftGuard`: aba alterada não recarrega por ativação externa. Confirmação salva campos conhecidos da Hello em sessionStorage por projeto/aba, por até 24h; falha de armazenamento mantém a aba. Isso não implementa persistência/sincronização de registros offline.

Build com staging validado por `check-pwa.mjs`; `publish-build.mjs` publica assets antes do HTML/worker e conserva assets antigos. Falha de compilação não substitui entradas; falha de I/O exige correção/reexecução. Limpeza de assets e recuperação pertencem ao plano de publicação do produto.

## Fronteira PWA/admin

PWA/admin possuem dois projetos Vite, serviços Node e dist próprios. Seus dois server_name no Nginx servem as interfaces e encaminham rotas técnicas ao mesmo Laravel/MySQL. A escolha depende do domínio, nunca do tamanho da tela. Nenhum import cruza admin/ e pwa/; ambos importam apenas a lógica neutra em shared/forms/. O admin bloqueia sw.js/manifest/offline com 404 e seu build rejeita recursos Framework7/Workbox. Bootstrap só retorna 0 após compilar e conferir as três interfaces.

Clientes possuem cadastro imediato e sessão web. Admin tem área protegida e conta única criada por comando, com guard/provider e sessão próprios. Não ampliar SESSION_DOMAIN para compartilhar cookies. Nenhuma compra, assinatura integra este ciclo.

`shared/forms/` não importa pacotes dos node_modules das aplicações; os adaptadores fornecem IMask/JustValidate de suas dependências próprias, fixadas na mesma versão. Mensagens/máscaras/regras são fonte única. O bind monta a pasta em /shared somente leitura, ao lado de /app, preservando o caminho relativo ../shared. Alias @shared nos dois Vites e no Nuxt. Identificadores de build das três interfaces incluem shared/forms para que alterações dos textos participem da publicação de cada uma.

## Autenticação dos clientes

Rotas da PWA em `backend/routes/pwa.php`, carregadas pelo parâmetro web de `bootstrap/app.php` com sessão e CSRF. Rotas administrativas permanecem em `backend/routes/admin.php`, com pipeline próprio. Os caminhos HTTP continuam iguais.

`ClientAuthContext`, antes dos middlewares web, restringe `/api/v1/auth/*` e `/sanctum/csrf-cookie` aos hosts da PWA/website e às origens/portas configuradas. A ausência de Origin não dispensa sessão/CSRF; diagnóstico permanece independente. `ClientCredentials` valida uma lista explícita de campos; cadastro grava senha com o cast hashed existente. Login/cadastro regeneram sessão e CSRF. `ClientSession` exige usuário web real; Bearer isolado não autentica clientes. Respostas são privadas/no-store e erros não expõem exceções.

Nas três interfaces, login/logout são serializados; consultas simultâneas não restauram identidade durante essas operações, e respostas antigas são descartadas. Logout invalida a sessão e limpa a identidade em memória. Rotas Framework7 usam asyncComponent e verificação de sessão; APIs continuam protegidas independentemente da tela. Guards de rascunho coexistem por página: credenciais nunca vão para sessionStorage.

## Autenticação administrativa

`Administrator` usa administrators, hash de senha e ID único 1; `admin:create` solicita senha oculta/confirmada e recusa criação se já existe, sem alterar clientes. Guard admin/provider administrators separados de web/users. Mesma conexão MySQL, sem relacionamento que conceda privilégios por ID/e-mail coincidente.

Rotas administrativas têm pipeline próprio: AdminContext → EncryptCookies → AddQueuedCookiesToResponse → AdminStartSession → AdminCsrf → bindings/controle de sessão. Host e origens administrativas derivados do central são obrigatórios; host admin não acessa auth/CSRF de clientes. Sessão usa cookie `<cookie_cliente>_admin`, arquivos em storage/framework/sessions/admin (ou tabela admin_sessions no driver database), manager/store separados; configuração e bindings são restaurados ao terminar. Guard é resolvido novamente por requisição. Não compartilhar SESSION_DOMAIN.

CSRF administrativo usa XSRF-ADMIN-TOKEN, header X-XSRF-TOKEN e endpoint próprio; nenhum token de cliente é reutilizado. Login rotaciona sessão/CSRF; logout invalida somente a sessão administrativa. Respostas privadas/no-store. App.vue controla login/Dashboard com verificação no servidor, sem roteador Framework7, tokens persistidos ou cache offline. Novas APIs administrativas devem integrar o mesmo pipeline e AdminSession.

## Recuperação e e-mail

PasswordRecoveryController usa PasswordBroker Laravel: clients → EloquentUserProvider/users/client_password_reset_tokens; administrators → administrators/admin_password_reset_tokens. Tokens separados de password_reset_tokens legado; broker padrão é clients. Notification AccountPasswordReset constrói o link a partir de APP_URL/ADMIN_URL, nunca do Host/Origin recebido. Dados do link ficam no fragmento # (não enviados a Nginx/SW); a tela os lê em memória e remove do histórico, sem armazenamento persistente. Reload exige reabrir o link do e-mail.

Reset não cria sessão; altera somente a senha/hash, remember_token e auth_version da conta alvo. A versão é registrada no login e verificada nas APIs protegidas, preservando a outra área e rejeitando sessões antigas. Tokens expiram pela verificação do broker, sem worker adicional. SMTP envia de forma síncrona com timeout e TLS obrigatório; não há fallback para log. Testing deriva transporte array, recuperação desabilitada e senha SMTP vazia; testes explícitos usam notificações simuladas.

## Website SSR

`website/` é uma terceira aplicação Nuxt, com dependências/lockfile próprios. Nuxt Router atende páginas públicas, enquanto `backend/routes/website.php` fornece a leitura pública demonstrativa e permite endpoints Laravel do produto; não renderiza as páginas Nuxt. Nginx encaminha `/` ao `<slug>-website-node:3000` e rotas técnicas ao PHP-FPM; resolver Docker dinâmico evita exigir que o website esteja ativo ao carregar o Nginx.

Bootstrap gera configuração pública permitida: nome, slug, locale, URLs públicas e buildId. Nuxt nunca recebe `.env.foundation`, credenciais ou diretórios do backend. Build `node-server` cria release em `.releases/`, publica um ponteiro apenas após sucesso e conserva as anteriores. O runtime carrega uma release fixa ao iniciar; o bootstrap confere o build pelo Nginx e inicia/recria exclusivamente o website quando necessário, com --no-deps e sem build de imagens. A ativação preserva projeto/arquivos Compose e resolve seus binds no host por um override de volumes via stdin, sem arquivo Compose adicional. HTTP é consultado com espera limitada antes do sucesso. Rollback automático/limpeza de releases não implementados.

Website sem manifest/service worker. Cadastro/login/logout e recuperação usam os endpoints de cliente já registrados uma única vez em routes/pwa.php; routes/website.php fica disponível para APIs específicas do produto. ClientAuthContext admite somente hosts PWA/website e origens configuradas. ClientSession continua validando User/auth_version; User, tabelas e hashes existentes são preservados.

CLIENT_SESSION_DOMAIN vazio deriva o ancestral comum dos dois hosts, conferido com Public Suffix List (tldts fixado no executor). Não aceitar sufixo público, localhost genérico nem domínios não relacionados. O cookie `<base>_session_client` e XSRF-CLIENT-TOKEN usam esse escopo; o nome novo evita colisão com cookies host-only anteriores (clientes fazem login novamente). Admin conserva `<base>_session_admin`, XSRF-ADMIN-TOKEN, domínio host-only, store/guard/provider próprios. Um cookie de cliente com domínio pai também pode ser enviado pelo navegador a outros subdomínios; o admin nunca o usa como autenticação e rejeita as APIs de cliente. Todos os subdomínios desse escopo devem ser controlados pelo produto.

Em Vite/Nuxt dev/prévia/ADB via localhost ou 127.0.0.1, cookies de cliente ficam host-only; Origin ou Referer é conferido contra portas aprovadas. localhost e domínios nomeados são contextos distintos. Para validar integração entre os domínios, usar Nginx nos dois. Logout destrói a sessão compartilhada; recuperação incrementa auth_version, encerrando as sessões da conta em ambas as interfaces. Broker clients é único; link solicitado no website usa WEBSITE_URL configurada, na PWA usa APP_URL. Admin permanece no seu broker/domínio.

Nuxt mantém estado por requisição via useState/useNuxtApp, nunca singleton de usuário no servidor. Middleware confere /conta antes de renderizar; o endpoint GET /_session encaminha exclusivamente o cookie de cliente para GET /api/v1/auth/me em alvo/Host fixos, com timeout, sem redirecionamentos e sem cache. Transporte Node HTTP preserva o Host do virtual host; não confiar em override Host do Fetch. Resposta expõe somente id/name/email, não cookies nem cabeçalhos administrativos. Falha 401 leva ao login; transporte/contrato inválido retorna 503. Nenhuma mutação é repetida automaticamente. O proxy de desenvolvimento encaminha somente endpoints de cliente; produção usa Nginx diretamente.

Bootstrap gera website/.foundation.server.json com whitelist técnica (alvo do backend, host público, porta dev e nome do cookie), incorporada em runtimeConfig privado; nunca serializada ao navegador. Não contém central privado, APP_KEY ou credenciais e não é distribuída. Mudanças nessa configuração afetam o hash de build. Configuração pública permanece sem proxy/segredos.

Website: `app/forms/demo.js` injeta suas próprias IMask/JustValidate no bindContactForm comum. Imports dessas bibliotecas e vínculo ao DOM ocorrem após onMounted; desmontagem durante o carregamento cancela a inicialização e remove listeners/máscara/validador já criados. Não mover layout/CSS/componentes para shared. SSR entrega campos/labels sem executar validação; Vue e IMask mantêm o celular formatado após mudanças reativas. O formulário demonstra validação local e não substitui validação Laravel de futuros endpoints.

## Conteúdo público dinâmico

WebsiteContent lê somente id=1 de website_demo_content e seleciona title/body/updated_at. Migration cria a tabela vazia; sem seeder ou alteração de contas. website:content valida título (1–160 caracteres) e corpo (1–2000), publica por upsert e atualiza updated_at; --clear remove somente esse registro. Comandos não compilam nem reiniciam serviços. Não há escrita HTTP pública ou editor comercial nesta etapa.

GET /api/v1/website/content pertence a routes/website.php, registrado separadamente em bootstrap/app.php com WebsitePublicContext, sem web/StartSession/Sanctum stateful. Admite somente o host configurado do website e valida Origin, se houver; não lê identidade, não emite cookies e retorna apenas o recurso público. Falha MySQL retorna 503 controlado, não conteúdo vazio. Endpoints privados futuros precisam do contexto completo de sessão/autorização de clientes ou admin; nunca reutilizar esse pipeline anônimo.

Nuxt GET /_content consulta o endpoint fixo via transporte Node HTTP/Host configurado. Não encaminha cookies, Authorization, destino do usuário ou Set-Cookie. Valida envelope, tipos, limites e timestamp; remove propriedades extras. Erros HTTP/HTML/JSON/timeout não entram na página como dados. Alvo técnico continua no runtimeConfig privado existente.

DynamicContent usa useFetch com SSR, no-store, credentials=omit, retry=0, timeout e whitelist transform. getCachedData reutiliza somente o payload durante hidratação; navegações/atualizações fazem nova consulta. Sem prerender, cache Nitro, memoização global ou cache HTTP para esse fluxo. O bridge é anônimo e não mistura dados de cliente/admin. /_session e /conta mantêm sua proteção e no-store. O payload público não é um repositório de dados privados.

SSR recebe o estado atual do MySQL a cada nova requisição; aba já aberta se atualiza por botão, navegação ou retorno do foco/conexão. Dados mudam sem build; código e configuração compilada continuam no processo de publicação. Bootstrap exige o build SSR correto e GET /_content válido; falha de conteúdo impede anunciar sucesso.

Transporte SSR do backend: em produção, o alvo fixo é WEBSITE_PRODUCTION_URL via HTTPS, com validação TLS normal e sem seguir redirects; evita o redirecionamento da porta HTTP do Nginx. Em local, usa NGINX_INTERNAL_URL com Host configurado. O modo/alvo participa do hash para reconstruir a release ao mudar o transporte. O serviço Node precisa resolver e alcançar o domínio HTTPS; nenhuma URL da requisição do usuário define o destino.
