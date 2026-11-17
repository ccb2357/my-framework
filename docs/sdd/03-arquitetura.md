# Arquitetura

PWA em `frontend/`, admin independente em `admin/`, Laravel em `backend/` e infraestrutura compartilhada externa. Versões efetivas nos manifests/lockfiles; instalação e comandos no [guia da raiz](../../instalacao-pwa-framework.md).

## Organização

| Área | Responsabilidade |
| --- | --- |
| `frontend/src/main.js`, `App.vue`, `routes.js` | Inicialização Vue/Framework7, componentes, estilos e roteamento oficial F7. JavaScript/script setup; sem roteador paralelo dentro da PWA. |
| `src/pages/`, `components/` | Páginas e composições reutilizáveis; APIs Core quando necessárias ao componente oficial. |
| `src/services/`, `forms/`, `css/` | HTTP/CSRF/erros, máscaras/validação e tokens/layout compartilhados. Destruir instâncias/listeners sem duplicação. |
| `admin/` | Vue/shadcn-vue/Tailwind; componentes locais JavaScript, configuração pública própria, Vite/lockfile/volume/build isolados. Login e Hello Dashboard protegida; sem PWA. |
| `backend/app/` | Diagnóstico, comandos, APIs/sessão, serviços. Regras de negócio são acrescentadas pelo produto. |
| `scripts/bootstrap/` | Executor Node/Docker; configuração, descoberta do Engine, arquivos derivados e verificações PHP/HTTP. |

`HealthCheck` faz consulta MySQL real; um serviço alimenta HTML/JSON. Rotas de diagnóstico são independentes de sessão para reportar falha do banco sem erro indireto de autenticação. `app:sync` executa optimize:clear e depois migrations; propaga falhas e exige --force em produção. Não instala/builda/semeia/regenera chaves.

Sessão Laravel/Sanctum com cookies host-only, nome por projeto, CSRF e origens/portas derivadas. Em produção: HTTPS/cookies seguros. Clientes usam o guard web e o modelo User. `TestingDatabaseGuard` verifica o banco testing antes de traits destrutivas.

## PWA e publicação

Fonte única `frontend/src/sw.js`, Workbox injectManifest e registro `virtual:pwa-register` em modo prompt, desativado no Vite dev. Precache somente público; API/sessão/CSRF/status nunca recebem cache ou fallback HTML. Shell offline para rotas conhecidas; demais navegações públicas recebem offline.html. Cache isolado por origem/escopo.

`pwa/manager.js` controla instalação, conexão e atualização. Novos formulários integram `draftGuard`: aba alterada não recarrega por ativação externa. Confirmação salva campos conhecidos da Hello em sessionStorage por projeto/aba, por até 24h; falha de armazenamento mantém a aba. Isso não implementa persistência/sincronização de registros offline.

Build com staging validado por `check-pwa.mjs`; `publish-build.mjs` publica assets antes do HTML/worker e conserva assets antigos. Falha de compilação não substitui entradas; falha de I/O exige correção/reexecução. Limpeza de assets e recuperação pertencem ao plano de publicação do produto.

## Fronteira PWA/admin

Dois projetos Vite, dois serviços Node, dois volumes node_modules e dois dist. Dois server_name no Nginx servem as interfaces e encaminham rotas técnicas ao mesmo Laravel/MySQL. A escolha depende do domínio, nunca do tamanho da tela. Nenhum import cruza admin/ e frontend/; ambos importam apenas a lógica neutra em shared/forms/. O admin bloqueia sw.js/manifest/offline com 404 e seu build rejeita recursos Framework7/Workbox. Bootstrap só retorna 0 após compilar e conferir os dois sites.

Clientes possuem cadastro imediato e sessão web. Admin tem área protegida e conta única criada por comando, com guard/provider e sessão próprios. Não ampliar SESSION_DOMAIN para compartilhar cookies. Nenhuma compra, assinatura integra este ciclo.

`shared/forms/` não importa pacotes dos node_modules das aplicações; os adaptadores fornecem IMask/JustValidate de suas dependências próprias, fixadas na mesma versão. Mensagens/máscaras/regras são fonte única. O bind monta a pasta em /shared somente leitura, ao lado de /app, preservando o caminho relativo ../shared. Alias @shared nos dois Vites. Identificadores de build incluem shared/forms para que alterações dos textos participem da atualização PWA e identificação do admin.

## Autenticação dos clientes

`ClientAuthContext`, antes dos middlewares web, restringe `/api/v1/auth/*` e `/sanctum/csrf-cookie` ao host da PWA e às origens/portas configuradas. A ausência de Origin não dispensa sessão/CSRF; diagnóstico permanece independente. `ClientCredentials` valida uma lista explícita de campos; cadastro grava senha com o cast hashed existente. Login/cadastro regeneram sessão e CSRF. `ClientSession` exige usuário web real; Bearer isolado não autentica clientes. Respostas são privadas/no-store e erros não expõem exceções.

Nas duas interfaces, login/logout são serializados; consultas simultâneas não restauram identidade durante essas operações, e respostas antigas são descartadas. Logout invalida a sessão e limpa a identidade em memória. Rotas Framework7 usam asyncComponent e verificação de sessão; APIs continuam protegidas independentemente da tela. Guards de rascunho coexistem por página: credenciais nunca vão para sessionStorage.

## Autenticação administrativa

`Administrator` usa administrators, hash de senha e ID único 1; `admin:create` solicita senha oculta/confirmada e recusa criação se já existe, sem alterar clientes. Guard admin/provider administrators separados de web/users. Mesma conexão MySQL, sem relacionamento que conceda privilégios por ID/e-mail coincidente.

Rotas administrativas têm pipeline próprio: AdminContext → EncryptCookies → AddQueuedCookiesToResponse → AdminStartSession → AdminCsrf → bindings/controle de sessão. Host e origens administrativas derivados do central são obrigatórios; host admin não acessa auth/CSRF de clientes. Sessão usa cookie `<cookie_cliente>_admin`, arquivos em storage/framework/sessions/admin (ou tabela admin_sessions no driver database), manager/store separados; configuração e bindings são restaurados ao terminar. Guard é resolvido novamente por requisição. Não compartilhar SESSION_DOMAIN.

CSRF administrativo usa XSRF-ADMIN-TOKEN, header X-XSRF-TOKEN e endpoint próprio; nenhum token de cliente é reutilizado. Login rotaciona sessão/CSRF; logout invalida somente a sessão administrativa. Respostas privadas/no-store. App.vue controla login/Dashboard com verificação no servidor, sem roteador Framework7, tokens persistidos ou cache offline. Novas APIs administrativas devem integrar o mesmo pipeline e AdminSession.

## Recuperação e e-mail

PasswordRecoveryController usa PasswordBroker Laravel: clients → EloquentUserProvider/users/client_password_reset_tokens; administrators → administrators/admin_password_reset_tokens. Tokens separados de password_reset_tokens legado; broker padrão é clients. Notification AccountPasswordReset constrói o link a partir de APP_URL/ADMIN_URL, nunca do Host/Origin recebido. Dados do link ficam no fragmento # (não enviados a Nginx/SW); a tela os lê em memória e remove do histórico, sem armazenamento persistente. Reload exige reabrir o link do e-mail.

Reset não cria sessão; altera somente a senha/hash, remember_token e auth_version da conta alvo. A versão é registrada no login e verificada nas APIs protegidas, preservando a outra área e rejeitando sessões antigas. Tokens expiram pela verificação do broker, sem worker adicional. SMTP envia de forma síncrona com timeout e TLS obrigatório; não há fallback para log. Testing deriva transporte array, recuperação desabilitada e senha SMTP vazia; testes explícitos usam notificações simuladas.
