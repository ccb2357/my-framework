# Ambiente e inicialização

O [guia de instalação](../../instalacao-pwa-framework.md) concentra os comandos e trechos Compose/Nginx. Host precisa de Docker/Compose; PHP/Composer e Node/npm executam em contêineres. PHP 8.2, MySQL 8 e Node na linha 22 (website exige ≥22.22.3); dependências fixadas pelos lockfiles.

## Configuração central

A pessoa preenche somente `.env.foundation`, copiado do exemplo. Bootstrap gera `backend/.env`, `.env.testing` local e as configurações públicas `pwa/.foundation.public.json`, `admin/.foundation.public.json` e `website/.foundation.public.json`, além da whitelist técnica privada `website/.foundation.server.json`; não criar `.env` na PWA nem editar derivados. Preservar opções próprias do produto e APP_KEY válidas. Arquivos privados, estado, dependências e builds não acompanham o repositório.

| Campos | Contrato |
| --- | --- |
| PROJECT_SLUG, PROJECT_NAME | Slug minúsculo com hífens, igual à pasta; nome público. Renomear identidade inicializada exige migração explícita. |
| APP_ENV, PRODUCTION_URL | local/production explícito; produção exige origem HTTPS e --force para o bootstrap. |
| INFRA_COMPOSE_PATH, CONTAINER_PROJECTS_ROOT | Compose real e raiz interna permitida; validar caminhos/mounts e bloquear escapes por symlink. |
| DOCKER_NETWORK, PHP_SERVICE, NGINX_SERVICE, NGINX_INTERNAL_URL | Recursos existentes; não presumir container_name. |
| LOCAL_DOMAIN, DEV_PORT, PREVIEW_PORT | Domínio e portas disponíveis, distintas entre serviços/projetos. Dev: porta do host → 5173 interno; prévia: porta do host → 4173 interno. |
| ADMIN_LOCAL_DOMAIN, ADMIN_PRODUCTION_URL | Opcionais: vazios derivam admin.<host da PWA>. Hosts diferentes; produção HTTPS sem caminho/porta. |
| ADMIN_DEV_PORT, ADMIN_PREVIEW_PORT | Admin: 5182/5183 no exemplo. Quatro portas distintas entre PWA/admin; internamente 5173 dev/4173 preview. |
| WEBSITE_LOCAL_DOMAIN, WEBSITE_PRODUCTION_URL, WEBSITE_DEV_PORT | Website SSR independente, domínio próprio e porta dev 5184; runtime interno 3000. |
| DB_HOST/PORT/USERNAME/PASSWORD | MySQL/conta existentes; não criar usuários/senhas/grants. |
| DB_DATABASE, DB_TEST_DATABASE | Banco principal e testing distinto; padrões derivados do slug e sufixo _test. |
| APP_LOCALE, APP_TIMEZONE, DISPLAY_TIMEZONE, SESSION_LIFETIME | Localidade, fusos IANA e duração da sessão; padrões no exemplo. |
| PWA_SHORT_NAME/DESCRIPTION/THEME_COLOR/BACKGROUND_COLOR | Identidade pública; cores #RRGGBB não substituem tokens CSS. |

Derivar serviço `<slug>-node`, volumes `<slug_com_sublinhados>_vendor` e `<slug_com_sublinhados>_node_modules`, bancos e cookie próprios. Configuração pública usa whitelist; nunca incluir central completo, credenciais, APP_KEY em bundle/manifest/log/API.

## Infraestrutura e executor

Reutilizar Compose/rede/PHP-FPM/Nginx/MySQL existentes. Antes de analisar ou alterar infraestrutura, solicitar os arquivos atuais necessários: Compose, Dockerfile PHP, Nginx principal/sites e php.ini, com segredos removidos. Não armazenar cópias em docs nem tratar histórico como configuração atual.

Imagem `pwa-foundation-bootstrap:0.1.0`, construída de `scripts/bootstrap/Dockerfile`, executada por docker run --rm com bind dos projetos, socket Docker e rede existente. Sem serviço de bootstrap no Compose, atalhos foundation.cmd/sh, dockerd interno ou runtime no host. O executor usa suas próprias dependências em /opt/foundation.

Descoberta por labels Compose e mounts reais; preservar projeto/diretório/arquivos Compose e mapear caminhos host↔contêiner, inclusive Docker Desktop. Compose no executor valida a infraestrutura; a única ativação automática autorizada é o serviço website após build, sem dependências. PHP usa docker exec; instalações frontend e verificação real de portas usam contêineres temporários. Alterações na infraestrutura são aplicadas manualmente pelo responsável, sem substituir recursos de outros sites.

Bootstrap valida configuração/infra, gera blocos do guia, prepara env/chaves/permissões restritas ao projeto, instala pelos lockfiles quando necessário, confere conexão/plataforma, executa app:sync, compila e verifica backend/PWA pelo Nginx. Cria somente bancos ausentes quando autorizado pela conta; não executa fresh/reset/seeders; alterações de esquema seguem as migrations versionadas. Falha interrompe sem anunciar sucesso parcial.

Códigos: **0** backend/build/HTTP verificados; **1** erro; **2** integração manual pendente. `.foundation-state.json` registra identidade/fase/hashes sem segredos e não substitui verificações reais. Lock impede concorrência; interrompido abruptamente, conferir ausência de processo antes de remover o lock. Reexecução preserva dados/chaves/dependências inalteradas e personalizações.

## Acesso e build

Nginx serve `pwa/dist`; /api, /sanctum, /up e /status seguem Laravel, sem fallback SPA. PHP externo/dotfiles bloqueados; HTML/manifest/worker sem cache imutável e assets com hash/cache longo. Vite dev tem HMR, proxy técnico e nenhum worker; prévia usa PREVIEW_PORT. ADB encaminha a porta do host ao Android; só o build oferece instalação/offline. Produção exige HTTPS público e certificado válido.

## Testes

PHPUnit/MySQL somente no ambiente testing e banco exclusivo conferido pelo TestingDatabaseGuard antes de RefreshDatabase: central local, conexão/servidor/porta/banco correspondentes, distintos do principal, sem URL/socket/read-write alternativos. Não executar suíte destrutiva em produção nem desligar MySQL compartilhado.

Vitest testa lógica; Pint/ESLint/Stylelint conferem código. Contratos/orquestração Node simulam Engine/Compose/HTTP e aceitam manual com LF/CRLF e exemplos agnósticos. Playwright e comparação visual estão disponíveis no código, mas não integram automaticamente o aceite local; APIs simuladas não comprovam integração real. Evidências em [MEMORY.md](../../MEMORY.md), comandos aplicáveis no guia.

Admin obrigatório: serviço `<slug>-admin-node`, volume `<base>_admin_node_modules`, bind de admin/ em /app e dist separado. Não recebe credenciais ou configuração PWA no bundle. Configuração pública passa por whitelist também no Vite. Cada atalho vite.cmd preserva a identidade Compose e opera somente seu serviço. Build admin valida staging antes de publicar assets e index, preservando assets antigos. Código 0 exige HTML/identificação/assets e backend pelo host administrativo, cabeçalhos corretos e ausência dos recursos PWA. Também confere bloqueio de acesso administrativo sem sessão e rejeição de auth de cliente pelo host admin. Isso não certifica login interativo, navegador, Docker/Windows ou HTTPS real. Não adicionar origens administrativas à sessão PWA.

## Código de formulários compartilhado

Os três serviços Node e os contêineres temporários de instalação/build recebem bind de `<projeto>/shared` em `/shared`, `read_only: true`. O bootstrap exige esse mount no Compose antes de instalar; pendência retorna 2. Cada serviço continua montando somente sua aplicação em /app e seu volume node_modules próprio. Vite permite somente a aplicação e shared em fs.allow; não liberar a raiz do projeto/backend/central para servir arquivos. Não exige alteração Nginx/PHP ou volume adicional. Depois de alterar mensagens, máscaras ou regras, repetir o bootstrap para publicar as três interfaces. Dependências npm exatas e lockfiles coerentes; .npmrc usa save-exact. Instalações normais usam npm ci. Jsdom 26.1.0 é somente ferramenta de testes DOM, não navegador real.

Autenticação de clientes não acrescenta configuração manual nem serviço/volume. Repita o bootstrap para aplicar código, limpar caches e publicar o build. SMTP só será configurado na etapa de recuperação; cadastro não exige e-mail de confirmação. Testes de cadastro/login/logout com persistência exigem o MySQL testing isolado; não substituir o guard por SQLite.

Bootstrap deriva ADMIN_URL e ADMIN_STATEFUL_DOMAINS no Laravel/testing a partir dos campos ADMIN_* do central; produção admite somente a origem HTTPS administrativa. Nenhum campo privado adicional é preenchido manualmente. Atualização aplica migration administrators/admin_sessions e os builds existentes; criação da conta é comando explícito, não parte do bootstrap. Sem mudança nos serviços Compose/Nginx ou reconstrução do executor. Preserve os vite.cmd derivados por ambiente ao distribuir atualizações.

SMTP_HOST vazio desabilita e-mail. SMTP_PORT (587 padrão), SMTP_SCHEME (smtp/STARTTLS ou smtps), SMTP_USER, SMTP_PASS, SMTP_FROM_ADDRESS e SMTP_FROM_NAME vêm somente do central; remetente vazio deriva usuário/nome do projeto. Bootstrap valida e gera MAIL_* privados/RECOVERY_ENABLED, nunca configuração pública. TLS e certificado são verificados; Gmail usa senha de app. Nenhum serviço Compose, worker ou reconstrução de executor adicional. Aplicar migration de tokens separados/auth_version pelo bootstrap, preservando contas/senhas existentes.

## Versão e conclusão

`foundation.json` identifica a versão entregue. O estado local começa com `completeFoundation=false` e permanece false durante a extensão do website; `manualChecks` lista as conferências interativas de cada instalação. Isso não homologa automaticamente SMTP, aparelho ou VPS.

## Website Nuxt

Central: `WEBSITE_LOCAL_DOMAIN`, `WEBSITE_PRODUCTION_URL` e `WEBSITE_DEV_PORT` (5184). Domínio vazio deriva `website.<domínio da PWA>`; não renomear domínios existentes automaticamente. Para website no domínio principal, configure explicitamente os três endereços, por exemplo website `dominio.com.br`, PWA `app.dominio.com.br`, admin `admin.dominio.com.br`. Em local, campos de produção permanecem vazios. Cinco portas de host distintas; website SSR usa 3000 somente na rede Docker.

Serviço `<slug>-website-node`, perfil `website`, `node:22-bookworm-slim` atualizado (Node ≥22.22.3 na linha 22), bind apenas `website/` em `/app`, volume `<base>_website_node_modules` e restart `unless-stopped`. Instalação/build e runtime do website usam a mesma imagem Debian; a identidade da imagem integra o marcador de dependências para reinstalar módulos nativos ao migrar de Alpine. Sem socket Docker, central privado ou credenciais. Monta shared em /shared, somente leitura; Nuxt/Vite permitem arquivos apenas do website e dessa pasta, sem liberar a raiz do projeto. Desenvolvimento publica somente 127.0.0.1:WEBSITE_DEV_PORT:3000 em execução temporária, sem interromper o runtime.

Bootstrap exige integração Compose/Nginx, instala via lockfile e compila Nuxt. Website inativo/desatualizado é iniciado/recriado automaticamente na mesma execução, preservando a identidade Compose e os volumes. Só esse serviço é alvo de up --no-deps --no-build --force-recreate; PHP, Nginx, MySQL e demais serviços não são reiniciados. Falha de ativação/HTTP encerra com código 1. O bootstrap aguarda HTML SSR/buildId/no-store pelo Nginx (HTTPS público validado em produção); versão já acessível não sofre reinício. Configuração Compose/Nginx ausente continua pendência manual com código 2. Artefatos e releases são gerados por ambiente e não entram no Git/pacote. Após `nuxt.cmd build`, repetir bootstrap para ativar/conferir; o dev usa HMR.

A versão deste ciclo é preliminar; `completeFoundation=false` enquanto faltarem as etapas do website. Código 0 verifica os contratos entregues; não homologa a loja, navegador ou produção.

Desenvolvimento do website: watchers Nuxt/Vite usam polling de 300 ms para detectar edições no host Windows com Docker Desktop. Vite ignora releases e saídas geradas; fs.allow continua restrito ao website. Mudanças nessa configuração exigem reiniciar somente nuxt.cmd dev.

Website inclui IMask 7.6.1, JustValidate 4.3.0 e VueUse 15.0.0 no próprio manifest/lockfile; Vitest/jsdom somente para testes DOM. Adicionar o bind shared ao serviço website existente conforme o guia; sem novos serviços/volumes, mudanças Nginx/PHP ou chaves de configuração. Bootstrap retorna 2 se faltar esse mount. Testes SSR não executam APIs do navegador; testes DOM não substituem aceite no navegador/Docker Windows.

## Sessão integrada website/PWA

`CLIENT_SESSION_DOMAIN` opcional no central: vazio deriva o ancestral comum validado pela PSL. Local: meu-projeto.localhost e website.meu-projeto.localhost compartilham meu-projeto.localhost. Produção: https://app.exemplo.com.br e https://exemplo.com.br compartilham exemplo.com.br; configurar as URLs explicitamente. Domínios não relacionados/sufixos públicos são bloqueados antes de escrever ambientes. HTTPS obrigatório em produção e cookies Secure; SameSite=Lax, sessão HttpOnly e CSRF legível pelo cliente. Não compartilhar com subdomínios não confiáveis.

Atualização exige reconstruir a imagem do executor (tldts 6.1.86 adicionado ao runtime fixado), executar o bootstrap e aceitar o novo build PWA. Não altera banco/contas; clientes entram novamente por mudança do nome do cookie. A sessão administrativa conserva nome/escopo. Não editar derivados. O bootstrap faz até 30 verificações do website com intervalo de 1s e timeout HTTP individual de 7s, cobrindo a validade de 10s do DNS Nginx, sem reiniciar outros serviços. Cold start PHP-FPM/healthcheck compartilhado continua fora desta alteração.

## Conteúdo dinâmico

Atualização: executar bootstrap para aplicar migration e publicar website; não há novo campo central, dependência, volume, serviço ou mudança de Nginx. Imagem do executor não mudou. website_demo_content começa vazia e não altera bancos/contas existentes além da nova tabela. O comando website:content é executado no PHP-FPM e mantém apenas o exemplo público; --clear não apaga a tabela nem dados de outras áreas.

Bootstrap confere HTML SSR/buildId/no-store e o JSON de /_content (HTTP 200, recurso válido ou vazio, sem Set-Cookie). A consulta não depende de sessão. Verificador usa timeout individual de 7s; status/erro não divulga resposta ou credenciais. Sessão, recuperação e cache privado mantêm os contratos anteriores. Conteúdo comercial, editor no admin e cache público com invalidação ficam para o produto.
