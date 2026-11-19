# Ambiente e inicialização

Este documento define o contrato do ambiente. Comandos e trechos de instalação ficam no [manual da raiz](../../instalacao-my-framework.md); sessão, recuperação e publicação seguem a [arquitetura](03-arquitetura.md).

## Requisitos

Host com Docker/Compose e infraestrutura existente de Nginx, PHP-FPM/Composer e MySQL. PHP/Composer e Node/npm executam em contêineres; não instalar esses runtimes no Windows para usar a base.

| Componente | Contrato |
| --- | --- |
| Backend | PHP 8.2.x, Composer 2 e extensões conferidas pelo bootstrap; Laravel e demais pacotes nas versões dos manifests/lockfiles. |
| Banco | MySQL 8; conta existente com acesso aos bancos informados. |
| PWA/admin | `node:22-alpine`, Node ≥22.13 na linha 22. |
| Website | `node:22-bookworm-slim`, Node ≥22.22.3 na linha 22; mesma imagem Debian para instalação/build e runtime. |
| Executor | Imagem `my-framework-bootstrap:0.1.0`, construída de `scripts/bootstrap/Dockerfile`; runtime/dependências próprios em `/opt/foundation`. |

Dependências npm diretas têm versão exata, `.npmrc` usa save-exact e instalações usam `npm ci`. Imagens Docker e a faixa Node não ficam fixas por fixar pacotes npm. A imagem do website participa do marcador de dependências para detectar troca de plataforma/módulos nativos.

## Configuração central

Preencher somente `.env.foundation`, a partir do exemplo. O bootstrap gera os arquivos internos; não criar `.env` nas interfaces nem editar configurações derivadas. Preservar opções próprias do produto e APP_KEY válida; chave existente inválida interrompe a execução, sem regeneração silenciosa.

| Campos | Contrato |
| --- | --- |
| `PROJECT_SLUG`, `PROJECT_NAME`, `APP_ENV` | Slug minúsculo com hífens e igual à pasta; nome público; ambiente explícito `local` ou `production`. |
| `PWA_LOCAL_DOMAIN`, `PWA_PRODUCTION_URL` | Host local ou origem HTTPS de produção, sem caminho, query ou credenciais. Host local vazio deriva `<slug>.localhost`. |
| `PWA_DEV_PORT`, `PWA_PREVIEW_PORT` | Portas da PWA no host. |
| `ADMIN_LOCAL_DOMAIN`, `ADMIN_PRODUCTION_URL` | Hosts distintos da PWA; vazios derivam `admin.<host da PWA>`. Produção HTTPS, sem porta/caminho. |
| `ADMIN_DEV_PORT`, `ADMIN_PREVIEW_PORT` | Portas administrativas no host. |
| `WEBSITE_LOCAL_DOMAIN`, `WEBSITE_PRODUCTION_URL`, `WEBSITE_DEV_PORT` | Host próprio, origem HTTPS de produção sem porta/caminho e porta de desenvolvimento. Domínios vazios derivam `website.<host da PWA>`. |
| `CLIENT_SESSION_DOMAIN` | Escopo de sessão dos clientes; vazio deriva o ancestral comum validado dos hosts PWA/website. Domínios não relacionados ou sufixos públicos são rejeitados. |
| `INFRA_COMPOSE_PATH`, `CONTAINER_PROJECTS_ROOT` | Caminho do Compose relativo ao projeto e raiz interna permitida. Conferir mounts/caminhos reais e impedir escape por symlink. |
| `DOCKER_NETWORK`, `PHP_SERVICE`, `NGINX_SERVICE` | Recursos já existentes; descoberta por serviço/labels/mounts, sem depender de container_name. |
| `NGINX_INTERNAL_URL` | Origem técnica HTTP(S), sem caminho ou credenciais. Em local, também é o destino do backend SSR. |
| `NGINX_CERT_NAME` | Nome do certificado compartilhado em `/etc/letsencrypt/live/<nome>`, sem caminho/URL. Vazio usa um caminho por host; preenchido exige certificado cobrindo os três hosts. |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` | Conexão e conta existentes. Senha vazia deve ser explícita. Não criar usuários, senhas ou grants. |
| `DB_DATABASE`, `DB_TEST_DATABASE` | Principal e testing distintos, inclusive sem colisão por maiúsculas/minúsculas. Padrões derivados do slug e sufixo `_test`. |
| `APP_LOCALE`, `APP_TIMEZONE`, `DISPLAY_TIMEZONE`, `SESSION_LIFETIME` | Localidade, fusos IANA e duração positiva da sessão; padrões no exemplo. |
| `PWA_SHORT_NAME`, `PWA_DESCRIPTION`, `PWA_THEME_COLOR`, `PWA_BACKGROUND_COLOR` | Identidade pública da PWA; cores `#RRGGBB`, sem substituir o design system. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SCHEME`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_ADDRESS`, `SMTP_FROM_NAME` | Transporte de recuperação de senha; detalhes na seção SMTP abaixo. |

Os quatro campos de acesso da PWA exigem o prefixo `PWA_`; nomes antigos são rejeitados. Em local, os campos de produção podem ficar vazios. Em produção, a URL PWA é obrigatória; para topologia diferente das derivações, preencher as três URLs explicitamente, por exemplo website no domínio principal e PWA/admin em subdomínios.

A emissão do certificado e a aplicação dos blocos Nginx são manuais. Nome da pasta do certificado não altera os hosts cobertos. Configuração pública usa whitelist; central completo, APP_KEY e credenciais nunca entram em bundle, manifest, API ou logs públicos.

## Arquivos por ambiente

| Arquivo ou grupo | Responsabilidade |
| --- | --- |
| `backend/.env` | Configuração efetiva Laravel, com campos compartilhados gerenciados pelo bootstrap. |
| `backend/.env.testing` | Gerado somente em local, com banco exclusivo, stores array e e-mail real desabilitado. |
| `pwa/.foundation.public.json`, `admin/.foundation.public.json`, `website/.foundation.public.json` | Configuração permitida de cada aplicação, gerada a partir do central. |
| `website/.foundation.server.json` | Whitelist técnica do SSR, incorporada em runtimeConfig privado. Não contém credenciais nem é serializada ao navegador. |
| `pwa/vite.cmd`, `admin/vite.cmd`, `website/nuxt.cmd` | Atalhos derivados que preservam a identidade Compose e operam somente a interface correspondente. |
| `.foundation-installation.md` | Guia regenerável com trechos efetivos e resumo do ambiente. Ignorado pelo Git; README/manual versionados não são alterados. |
| `.foundation-state.json` | Identidade, fases e hashes sem credenciais; não substitui verificação real. |
| `.foundation-bootstrap.lock/` | Exclusão de execuções concorrentes. Antes de remover um lock interrompido, conferir ausência de bootstrap ativo. |

Privados, estado, instruções/atalhos derivados, dependências, dist e releases não acompanham o repositório/pacote. Mudança de slug, pasta, bancos ou volumes após inicializar exige migração explícita; não apagar estado para contornar a proteção de uma instalação com dados.

## Serviços, volumes e caminhos

Usar o Compose, rede e serviços compartilhados existentes. Ao revisar infraestrutura, solicitar os arquivos atuais necessários — Compose, Dockerfile PHP-FPM, Nginx principal/sites e php.ini — com segredos removidos; não guardar cópias no projeto nem tratar histórico como configuração atual.

`<base>` representa o slug com hífens convertidos em sublinhados.

| Área | Serviço / perfil | Dependências e conteúdo |
| --- | --- | --- |
| Backend | Serviço PHP informado no central | `<base>_vendor` montado em `/var/www/<slug>/backend/vendor`. |
| PWA | `<slug>-node` / `dev` | `pwa/` em `/app`; `<base>_node_modules` em `/app/node_modules`. |
| Admin | `<slug>-admin-node` / `dev` | `admin/` em `/app`; `<base>_admin_node_modules` em `/app/node_modules`. |
| Website | `<slug>-website-node` / `website` | `website/` em `/app`; `<base>_website_node_modules` em `/app/node_modules`; restart unless-stopped. |

Os três Nodes e contêineres temporários de build recebem `shared/` em `/shared`, somente leitura. Falta de mount/volume exigido é pendência de integração. Não reutilizar node_modules entre interfaces. O website não recebe socket Docker, central ou credenciais; somente o executor recebe o socket para operar o Engine existente.

Com `infra` e projeto lado a lado, os binds Compose usam `../<slug>/pwa`, `../<slug>/admin`, `../<slug>/website` e `../<slug>/shared`. São relativos à pasta do Compose base, independentemente do terminal. Trechos gerados preservam caminhos absolutos somente quando não há relativo possível, como em unidades diferentes no Windows.

No comando do executor, `source=..` é relativo ao **terminal**: executar dentro de `infra` para montar a pasta dos projetos em `/var/www`. Caminhos internos de PHP/Nginx permanecem Linux. O bootstrap mapeia host↔contêiner, inclusive aliases Docker Desktop, e preserva projeto/diretório/arquivos Compose descobertos.

## Acesso local e produção

| Interface / modo | Porta do host no exemplo | Porta interna | Comportamento |
| --- | --- | --- | --- |
| PWA dev | 5180 | 5173 | Vite/HMR, sem worker ou instalação. |
| PWA prévia | 5181 | 4173 | Serve o build para instalar/testar PWA. |
| Admin dev | 5182 | 5173 | Vite/HMR; sem recursos PWA. |
| Admin prévia | 5183 | 4173 | Serve o build administrativo. |
| Website dev | 5184 | 3000 | Nuxt/HMR em contêiner temporário. |
| Website produção | Sem publicação de porta Node | 3000 na rede Docker | SSR permanente atrás do Nginx. |

As cinco portas de desenvolvimento/prévia são válidas, distintas e disponíveis. Publicação de desenvolvimento fica em `127.0.0.1`; ADB encaminha a porta do host ao Android. Watchers Nuxt/Vite usam polling de 300 ms no website para detectar edições Windows/Docker Desktop. Reiniciar o dev ao alterar sua configuração. Acesso a arquivos fica restrito à aplicação e `shared/`, sem expor raiz/backend/central.

Produção serve `pwa/dist` e `admin/dist` pelo Nginx e website pelo SSR; não usar servidores dev para atender o público. Cada host encaminha rotas técnicas ao Laravel. Dotfiles/PHP arbitrário são bloqueados; HTML/manifest/worker exigem revalidação e assets com hash usam cache imutável. Website, sessão e conteúdo dinâmico seguem no-store.

DNS e certificados HTTPS devem funcionar para os três hosts. O Node SSR também precisa alcançar a origem HTTPS configurada do website para consultar o Laravel; em produção não usa o listener HTTP interno que redireciona. Não desabilitar validação TLS para contornar a configuração. Modo/alvo técnico participa do hash, exigindo nova release quando alterado.

## Executor e inicialização

Executar a imagem do bootstrap por `docker run --rm`, com bind dos projetos, socket Docker e rede existente. Não declarar serviço bootstrap no Compose nem criar outra pilha/dockerd interno. Reconstruir a imagem quando mudarem Dockerfile, dependências ou entrada incorporados nela; código do projeto é lido do bind.

O fluxo valida central, identidade e infraestrutura; gera derivados; confere PHP/Composer; instala pelos lockfiles quando os marcadores/metadados efetivos exigirem; verifica conexão/plataforma; executa app:sync; compila e verifica as três interfaces via Nginx. Composer usa --no-dev em produção; npm inclui ferramentas de build. Chaves, dados e dependências inalteradas são preservados.

A conta MySQL pode criar bancos ausentes somente se já possuir permissão. O executor confere tanto o principal quanto o testing; isso não autoriza executar testes na VPS de produção. Sem permissão de criação, a preparação retorna pendência para criação manual com a conta existente. Não executa fresh/reset/seeders nem administra usuários/grants.

**Produção exige `--force`**, que autoriza migrations pendentes, sem liberar alterações arbitrárias de infraestrutura. `app:sync` limpa caches e aplica migrations com falhas propagadas. Permissões são tratadas no projeto; não substituir essa rotina por chown recursivo da infraestrutura compartilhada.

### Ativação do website

Após compilar, o bootstrap verifica a versão acessível e inicia/recria somente o serviço website declarado/validado, com `up --no-deps --no-build --force-recreate`. Não reinicia PHP-FPM, Nginx, MySQL ou serviços de outros projetos. Serviço já respondendo com o build esperado não é recriado.

A verificação faz até 30 tentativas após ativar, com intervalo de 1s e timeout HTTP individual de 7s; isso não significa prazo total de 30s. Exige HTML SSR/buildId/no-store e JSON de `/_content` válido ou vazio, sem Set-Cookie. Falha de ativação/HTTP encerra com erro controlado. Runtime, builds e publicação estão detalhados na arquitetura; após build manual do Nuxt, repetir bootstrap para ativar/conferir a release.

| Saída | Significado |
| --- | --- |
| `0` | Contratos de backend, builds e HTTP conferidos. |
| `1` | Falha de configuração, instalação, compilação, ativação ou verificação. |
| `2` | Integração/recurso manual pendente. |

O estado registra fase e hashes; `completeFoundation` permanece false no bootstrap atual e `manualChecks` lista conferências humanas. Código zero e esse estado são distintos do aceite do produto: não comprovam jornadas interativas, SMTP real, instalação/offline/atualização em aparelho ou produção.

## SMTP e contas

Host SMTP vazio desabilita envio. Host preenchido exige usuário/senha e remetente válidos; o exemplo Gmail contém placeholders a substituir. Porta padrão 587, esquema smtp/STARTTLS; smtps atende TLS direto, normalmente 465. Remetente/nome vazios derivam usuário/nome do projeto. Gmail usa senha de app. Valores geram MAIL_* e RECOVERY_ENABLED somente no Laravel; não há worker/Cron ou serviço adicional.

Criação do administrador é comando explícito, não etapa automática do bootstrap. Cadastro de cliente libera acesso imediato, sem confirmação de e-mail. Separação de contas, cookies, brokers e links de recuperação está na [tabela de autenticação](03-arquitetura.md#autenticação-dos-clientes), sem configuração manual de outros arquivos env.

## Verificações e limites

PHPUnit com persistência MySQL exige ambiente testing local e banco exclusivo. `TestingDatabaseGuard` confere conexão/servidor/porta/banco e a separação do principal antes de operações destrutivas, rejeitando URL/socket/read-write alternativos. Não executar essa suíte em produção, substituir o guard por SQLite ou desligar o MySQL compartilhado.

Vitest e testes HTTP/SSR/DOM verificam os contratos do código; Pint, ESLint e Stylelint conferem formatação/lint. Testes de bootstrap simulam Engine/Compose/HTTP, incluindo caminhos Windows/Linux e manual LF/CRLF. Playwright/comparação visual dependem de execução e aceite próprios; jsdom não é navegador real.

Confirmar no ambiente correspondente login/logout compartilhado PWA/website, isolamento admin, recuperação, conteúdo sem rebuild e instalação/atualização/offline da PWA. Sessão por localhost não comprova compartilhamento entre domínios nomeados. Procedimentos executáveis ficam no manual; registrar evidências reais e pendências em MEMORY, sem confundir código entregue com instalação validada.
