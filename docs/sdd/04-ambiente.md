# Ambiente e inicialização

O [guia de instalação](../../instalacao-pwa-framework.md) concentra os comandos e trechos Compose/Nginx. Host precisa de Docker/Compose; PHP/Composer e Node/npm executam em contêineres. PHP 8.2, MySQL 8 e Node 22.13+ na linha 22; dependências fixadas pelos lockfiles.

## Configuração central

A pessoa preenche somente `.env.foundation`, copiado do exemplo. Bootstrap gera `backend/.env`, `.env.testing` local e as configurações públicas `frontend/.foundation.public.json`/`admin/.foundation.public.json`; não criar `.env` frontend nem editar derivados. Preservar opções próprias do produto e APP_KEY/VAPID válidas. Arquivos privados, estado, dependências e builds não acompanham o repositório.

| Campos | Contrato |
| --- | --- |
| PROJECT_SLUG, PROJECT_NAME | Slug minúsculo com hífens, igual à pasta; nome público. Renomear identidade inicializada exige migração explícita. |
| APP_ENV, PRODUCTION_URL | local/production explícito; produção exige origem HTTPS e --force para o bootstrap. |
| INFRA_COMPOSE_PATH, CONTAINER_PROJECTS_ROOT | Compose real e raiz interna permitida; validar caminhos/mounts e bloquear escapes por symlink. |
| DOCKER_NETWORK, PHP_SERVICE, NGINX_SERVICE, NGINX_INTERNAL_URL | Recursos existentes; não presumir container_name. |
| LOCAL_DOMAIN, DEV_PORT, PREVIEW_PORT | Domínio e portas disponíveis, distintas entre serviços/projetos. Dev: porta do host → 5173 interno; prévia: porta do host → 4173 interno. |
| ADMIN_LOCAL_DOMAIN, ADMIN_PRODUCTION_URL | Opcionais: vazios derivam admin.<host da PWA>. Hosts diferentes; produção HTTPS sem caminho/porta. |
| ADMIN_DEV_PORT, ADMIN_PREVIEW_PORT | Admin: 5182/5183 no exemplo. Quatro portas distintas entre PWA/admin; internamente 5173 dev/4173 preview. |
| DB_HOST/PORT/USERNAME/PASSWORD | MySQL/conta existentes; não criar usuários/senhas/grants. |
| DB_DATABASE, DB_TEST_DATABASE | Banco principal e testing distinto; padrões derivados do slug e sufixo _test. |
| APP_LOCALE, APP_TIMEZONE, DISPLAY_TIMEZONE, SESSION_LIFETIME | Localidade, fusos IANA e duração da sessão; padrões no exemplo. |
| PWA_SHORT_NAME/DESCRIPTION/THEME_COLOR/BACKGROUND_COLOR | Identidade pública; cores #RRGGBB não substituem tokens CSS. |
| PUSH_ENABLED, PUSH_TEST_AUTH_ENABLED | Opcionais; acesso de teste permitido somente local. |
| VAPID_SUBJECT/PUBLIC_KEY/PRIVATE_KEY | Contato mailto:/HTTPS e par de chaves. Bootstrap gera o par ausente e preserva o válido; par parcial/inválido interrompe. |

Derivar serviço `<slug>-node`, volumes `<slug_com_sublinhados>_vendor` e `<slug_com_sublinhados>_node_modules`, bancos e cookie próprios. Configuração pública usa whitelist; nunca incluir central completo, credenciais, APP_KEY ou VAPID privada em bundle/manifest/log/API.

## Infraestrutura e executor

Reutilizar Compose/rede/PHP-FPM/Nginx/MySQL existentes. Antes de analisar ou alterar infraestrutura, solicitar os arquivos atuais necessários: Compose, Dockerfile PHP, Nginx principal/sites e php.ini, com segredos removidos. Não armazenar cópias em docs nem tratar histórico como configuração atual.

Imagem `pwa-foundation-bootstrap:0.1.0`, construída de `scripts/bootstrap/Dockerfile`, executada por docker run --rm com bind dos projetos, socket Docker e rede existente. Sem serviço de bootstrap no Compose, atalhos foundation.cmd/sh, dockerd interno ou runtime no host. O executor usa suas próprias dependências em /opt/foundation.

Descoberta por labels Compose e mounts reais; preservar projeto/diretório/arquivos Compose e mapear caminhos host↔contêiner, inclusive Docker Desktop. Compose dentro do executor é somente leitura/validação. PHP usa docker exec; instalações frontend e verificação real de portas usam contêineres temporários. Alterações na infraestrutura são aplicadas manualmente pelo responsável, sem substituir recursos de outros sites.

Bootstrap valida configuração/infra, gera blocos do guia, prepara env/chaves/permissões restritas ao projeto, instala pelos lockfiles quando necessário, confere conexão/plataforma, executa app:sync, compila e verifica backend/PWA pelo Nginx. Cria somente bancos ausentes quando autorizado pela conta; não executa fresh/reset/drop/seeders. Falha interrompe sem anunciar sucesso parcial.

Códigos: **0** backend/build/HTTP verificados; **1** erro; **2** integração manual pendente. `.foundation-state.json` registra identidade/fase/hashes sem segredos e não substitui verificações reais. Lock impede concorrência; interrompido abruptamente, conferir ausência de processo antes de remover o lock. Reexecução preserva dados/chaves/dependências inalteradas e personalizações.

## Acesso, build e fila

Nginx serve `frontend/dist`; /api, /sanctum, /up e /status seguem Laravel, sem fallback SPA. PHP externo/dotfiles bloqueados; HTML/manifest/worker sem cache imutável e assets com hash/cache longo. Vite dev tem HMR, proxy técnico e nenhum worker; prévia usa PREVIEW_PORT. ADB encaminha a porta do host ao Android; só o build oferece instalação/offline/push. Produção exige HTTPS público e certificado válido.

Fila database no MySQL existente. `push:work` tem lock de 180s, janela de 50s e limite externo de 75s; retry_after 90s, job 45s e transporte 15s. Requer proc_open. Operar periodicamente no mecanismo existente/Cron; não iniciar workers externos concorrentes sem ajustar esses limites. Não exige Redis nem novo contêiner. Preservar VAPID/APP_KEY nas atualizações.

## Testes

PHPUnit/MySQL somente no ambiente testing e banco exclusivo conferido pelo TestingDatabaseGuard antes de RefreshDatabase: central local, conexão/servidor/porta/banco correspondentes, distintos do principal, sem URL/socket/read-write alternativos. Não executar suíte destrutiva em produção nem desligar MySQL compartilhado.

Vitest testa lógica; Pint/ESLint/Stylelint conferem código. Contratos/orquestração Node simulam Engine/Compose/HTTP e aceitam manual com LF/CRLF e exemplos agnósticos. Playwright e comparação visual estão disponíveis no código, mas não integram automaticamente o aceite local; API/PushManager simulados não comprovam envio real. Evidências em [MEMORY.md](../../MEMORY.md), comandos aplicáveis no guia.

Admin obrigatório: serviço `<slug>-admin-node`, volume `<base>_admin_node_modules`, bind de admin/ em /app e dist separado. Não recebe credenciais, VAPID ou configuração PWA no bundle. Configuração pública passa por whitelist também no Vite. Cada atalho vite.cmd preserva a identidade Compose e opera somente seu serviço. Build admin valida staging antes de publicar assets e index, preservando assets antigos. Código 0 exige HTML/identificação/assets e backend pelo host administrativo, cabeçalhos corretos e ausência dos recursos PWA. Isso não certifica login (ainda pendente), navegador, Docker/Windows ou HTTPS real. Não adicionar origens administrativas à sessão PWA nesta etapa.
