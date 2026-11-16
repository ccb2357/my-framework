# PWA Framework

Base reutilizável para construir PWAs com **Framework7 Vue, admin shadcn-vue, Laravel, MySQL e Web Push**. Inclui instalação automatizada via Docker, configuração centralizada, interface demonstrativa e documentação para evoluir cada produto em seu próprio repositório.

[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Framework7 9](https://img.shields.io/badge/Framework7-9-EF2D5E?style=for-the-badge&logo=framework7&logoColor=white)](https://framework7.io/vue/)
[![shadcn-vue](https://img.shields.io/badge/shadcn--vue-Admin-111111?style=for-the-badge)](https://www.shadcn-vue.com/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Laravel 12](https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com/docs/12.x)
[![PHP 8.2+](https://img.shields.io/badge/PHP-8.2%2B-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net/)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![MySQL 8](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://dev.mysql.com/doc/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docs.docker.com/)

**[Instalação e operação](instalacao-pwa-framework.md)** · **[Especificação técnica](docs/sdd/00-visao.md)** · **[Regras de desenvolvimento](RULES.md)**

## Recursos

- **Admin independente:** Vue/shadcn-vue/Tailwind em `admin/`, subdomínio e build próprios; sem misturar componentes ou estilos com a PWA.

- **Bootstrap Docker:** verifica infraestrutura, configura ambientes, instala pelos lockfiles, prepara bancos, aplica migrations e publica os builds PWA/admin.
- **Configuração única:** `.env.foundation` define identidade, ambiente, infraestrutura, bancos, sessão e PWA/push. Arquivos internos são gerados automaticamente.
- **Interface nativa:** Vue/Framework7, grid responsivo, Nunito local, ícones, máscaras, validação e design system compartilhado.
- **Hello demonstrativa:** componentes oficiais, FAB com três ações, quatro transições, formulário e status real de backend/banco.
- **PWA:** manifest, instalação em navegadores compatíveis, shell offline e atualização confirmada, preservando campos e abas em uso.
- **Web Push:** múltiplos dispositivos, preferência da conta, fila, revogação, retentativas e clique seguro, com VAPID por aplicativo/ambiente.
- **API e testes:** Laravel/Sanctum, sessão/CSRF, diagnósticos HTTP/JSON, isolamento do banco testing e testes automatizados.

Autenticações de clientes/admin e recuperação de senha seguem o [plano de implementação](plano-sprints-admin-autenticacao.md); ainda não estão disponíveis. Regras de negócio pertencem ao aplicativo derivado. Offline cobre a interface estática; não implementa edição/sincronização de registros. O formulário Hello não grava dados.

## Stack

| Área | Tecnologias |
| --- | --- |
| Interface | Vue 3.5.45 · Framework7/framework7-vue 9.2.0 · JavaScript/SFC/Composition API |
| Estilos e ícones | CSS/grid Framework7 · tokens próprios · Nunito local · Framework7 Icons 5.0.5 · Lucide 1.72.0 |
| Formulários compartilhados | IMask 7.6.1 · JustValidate 4.3.0 nas duas interfaces; mensagens/máscaras/regras em `shared/forms/`; validação também obrigatória no backend |
| Build e PWA | Vite 8.3.4 · plugin-vue 6.0.11 · vite-plugin-pwa 2.0.0 · Workbox 7.4.1/injectManifest |
| Administrativo | Vue 3.5.45 · shadcn-vue/JavaScript · Reka UI 2.11.0 · Tailwind 4.3.5 · Vite 8.3.4 |
| Backend | PHP 8.2 · Laravel 12.70.0 · Sanctum 4.4.0 · Composer 2 |
| Push | Laravel Notifications/Jobs · WebPush Channel 13.0.1 · Minishlink Web Push 11.0.0 · fila database |
| Infraestrutura | Docker/Compose · Node 22.13+ na linha 22 · Nginx · PHP-FPM · MySQL 8 · HTTPS/Certbot conforme infraestrutura |
| Qualidade | PHPUnit/Pint · Vitest 5.1.0 · Playwright 1.65.1 · ESLint 10.15.0/Vue · Stylelint 16.26.1 |

Manifests, lockfiles e [foundation.json](foundation.json) identificam as versões efetivas. Conferir engines, exports e peerDependencies antes de atualizar. Dependências npm diretas exatas, lockfiles no Git e instalação com `npm ci`; atualizações são deliberadas e testadas. `.npmrc` mantém `save-exact=true`. Node continua na faixa 22 compatível. Branch principal: `master`. Não acrescentar React ou TypeScript. Framework7 e seu roteador pertencem à PWA; shadcn-vue/Tailwind somente ao admin.

## Começar um projeto

**Pré-requisitos:** Docker/Compose e infraestrutura compartilhada com Nginx, PHP-FPM/Composer e MySQL. Node/npm, PHP e Composer executam em contêineres; não precisam ser instalados no Windows.

1. Clone a base na pasta do novo aplicativo, com repositório e histórico próprios.
2. Copie `.env.foundation.example` para `.env.foundation` e preencha a configuração do ambiente. `PROJECT_SLUG` deve coincidir com o nome da pasta.
3. Siga o [manual de instalação](instalacao-pwa-framework.md): construa o executor, prepare os trechos Compose/Nginx e aplique as alterações manualmente.
4. Execute o bootstrap. Corrija qualquer pendência indicada e repita até concluir; então confira os endereços do aplicativo e os testes aplicáveis.

Cada aplicação recebe código pronto; não recrie Laravel/Vite. Preserve os arquivos privados, dados, volumes, chaves e personalizações nas atualizações.

### Configuração central

| Grupo | Campos principais |
| --- | --- |
| Identidade e ambiente | PROJECT_SLUG, PROJECT_NAME, APP_ENV, LOCAL_DOMAIN, PRODUCTION_URL, ADMIN_LOCAL_DOMAIN, ADMIN_PRODUCTION_URL |
| Infraestrutura | INFRA_COMPOSE_PATH, CONTAINER_PROJECTS_ROOT, DOCKER_NETWORK, PHP_SERVICE, NGINX_SERVICE, NGINX_INTERNAL_URL |
| Acesso e dados | DEV_PORT, PREVIEW_PORT, ADMIN_DEV_PORT, ADMIN_PREVIEW_PORT, DB_HOST/PORT/DATABASE/TEST_DATABASE/USERNAME/PASSWORD |
| Regionalização e sessão | APP_LOCALE, APP_TIMEZONE, DISPLAY_TIMEZONE, SESSION_LIFETIME |
| PWA e push | PWA_SHORT_NAME/DESCRIPTION/THEME_COLOR/BACKGROUND_COLOR, PUSH_ENABLED, PUSH_TEST_AUTH_ENABLED, VAPID_SUBJECT/PUBLIC_KEY/PRIVATE_KEY |

O bootstrap deriva os `.env` Laravel/testing e configurações públicas próprias de `frontend/` e `admin/`; não criar `.env` no frontend nem repetir valores nos derivados. Somente campos públicos permitidos chegam ao navegador. APP_KEY e VAPID válidas são preservadas; push é opcional e desabilitado por padrão.

Serviço Node, volumes, bancos, cookie e manifest têm identidade própria por projeto. Portas do host devem estar livres e não podem conflitar entre aplicativos. Credenciais são da conta MySQL existente; o bootstrap não cria usuários, senhas ou grants.

## Desenvolvimento e operação

| Modo | Uso |
| --- | --- |
| Desenvolvimento | `frontend/vite.cmd dev`: Vite/HMR via Docker, na DEV_PORT do host → 5173 interno. Worker desativado; sem instalação da PWA. |
| Build | `frontend/vite.cmd build`: publica `frontend/dist` após validar artefatos; não instala npm automaticamente. |
| Prévia | Build na PREVIEW_PORT do host → 4173 interno; instalação/offline/push em localhost, inclusive Android por USB/ADB. |
| Produção | Nginx serve dist e encaminha API/Laravel ao PHP-FPM, na mesma origem HTTPS. Node só para build; sem servidor Node permanente. |
| Admin | `admin/vite.cmd dev` ou `build`: serviço e dist próprios; subdomínio administrativo, sem PWA. |
| Backend | `app:sync`: limpa caches e aplica migrations pendentes, com propagação de falhas; --force obrigatório em produção. |

Comandos completos de CMD/Linux, integração Docker, Android/ADB, fila e testes ficam no [manual](instalacao-pwa-framework.md). Frontend e API usam proxy técnico no Vite/prévia; Nginx encaminha `/api`, `/sanctum`, `/up` e `/status` ao Laravel, sem responder HTML da SPA para essas rotas.

### Diagnósticos

| Endereço | Finalidade |
| --- | --- |
| `/` | Hello/PWA |
| `/status` | Diagnóstico HTML de backend e MySQL |
| `/api/v1/status` | Mesmo diagnóstico em JSON |
| `/up` | Saúde Laravel; não comprova banco |

Status faz consulta real, sem cache: HTTP 200 saudável ou 503 indisponível. Falha/offline não mantém um OK antigo. [Contrato da API](docs/sdd/05-api.md).

### Contrato do bootstrap

Executor temporário `pwa-foundation-bootstrap:0.1.0`, construído de `scripts/bootstrap/Dockerfile` e executado com docker run --rm. Acessa o Engine existente, com dependências próprias; sem Docker-in-Docker, outro Compose, serviço de bootstrap ou atalhos no host.

Descobre serviços por labels/mounts reais, preserva a identidade Compose e mapeia caminhos host↔contêiner. Verifica recursos e portas efetivos; gera somente blocos gerenciados no guia, sem modificar automaticamente a infraestrutura compartilhada. Código **0**: backend/build/HTTP verificados; **1**: erro; **2**: integração manual pendente.

Dependências PHP e Node ficam em volumes exclusivos; vendor real é conferido antes do Composer para reduzir lentidão no Windows. Reexecução preserva chaves, dados e dependências inalteradas. Lock bloqueia concorrência; `.foundation-state.json` registra estado sem segredos. Mudança de slug/pasta/bancos/volumes inicializados exige migração explícita. [Contrato do ambiente](docs/sdd/04-ambiente.md).

## PWA e Web Push

Um único worker em `frontend/src/sw.js` atende precache, offline, atualização e push. Atualizações são detectadas automaticamente e aplicadas por confirmação; não recarregar formulários alterados por outra aba. Novos formulários integram `draftGuard`. API, sessão, CSRF e diagnóstico nunca entram no cache público ou no fallback HTML. Assets antigos são conservados para clientes ainda abertos.

Envio pelo [PushNotificationService](backend/app/Services/PushNotificationService.php): o produto define usuários autorizados, conteúdo e gatilhos; Notifications/Jobs processam a fila database no MySQL existente. Não exige Redis, novo contêiner ou SDK Firebase/OneSignal; utiliza os serviços push dos navegadores. VAPID pertence ao aplicativo/ambiente e não deve ser rotacionada silenciosamente.

Permissão somente por clique, APIs com sessão/CSRF/ownership/rate limit e revalidação de preferências/dispositivos pelos jobs. Inscrição de uma conta não é transferida para outra. Acesso de teste local usa código de uso único; produção integra o login do produto. O bootstrap não cria conta nem envia notificações.

Endpoints/chaves/payload privados não entram nos logs; destinos e transporte são validados contra acesso indevido. Só inscrições expiradas 404/410 são removidas. **Enfileirada**, **aceita pelo provedor** e **recebida** são resultados diferentes; imagem/exibição dependem do navegador/SO. Publicação externa exige HTTPS; iOS requer instalação pela Tela de Início. [Arquitetura e fila](docs/sdd/03-arquitetura.md) · [Contratos push](docs/sdd/05-api.md#web-push).

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `scripts/bootstrap/` | Executor, validação, descoberta Docker, templates e verificações PHP/HTTP |
| `frontend/src/main.js`, `App.vue`, `routes.js` | Inicialização Vue/Framework7 e navegação |
| `frontend/src/pages/`, `components/` | Telas e composições reutilizáveis; Hello em `pages/hello.vue` |
| `frontend/src/services/`, `forms/` | HTTP/CSRF/push, máscaras, conversões e validação |
| `frontend/src/css/`, `public/` | Tokens/estilos, fonte local, ícones e estáticos |
| `frontend/src/sw.js`, `dist/` | Fonte do worker e saída gerada do build |
| `admin/src/`, `components.json` | Hello Dashboard e componentes shadcn-vue/JavaScript; Tailwind e build próprios, sem PWA |
| `shared/forms/` | Mensagens pt-BR, máscaras, regras e integração comum, sem CSS/framework visual |
| `backend/` | Laravel, APIs, sessão, modelos, migrations, serviços e fila |
| `docs/sdd/`, `docs/telas/` | Contratos técnicos e referências visuais aprovadas |
| `AGENTS.md`, `RULES.md`, `MEMORY.md` | Orientação, regras obrigatórias e registros específicos do projeto |

## Convenções de desenvolvimento

- Consultar [AGENTS.md](AGENTS.md), [RULES.md](RULES.md) e o SDD pertinente antes de alterar. Ao menor sinal de dúvida, consultar a documentação oficial e o código da versão fixada.
- Na PWA, usar controles Framework7 Vue; API Core quando necessária, integrada ao ciclo Vue/F7. Criar composições por uso real, com props/eventos/slots, sem biblioteca antecipada. Componentes em PascalCase; `hello.vue` mantém seu nome.
- Toda tela segue [o design system](docs/sdd/02-design-system.md). Na PWA: CSS/grid Framework7, Nunito local, tokens/estilos compartilhados e ícones oficiais/Lucide. Importar CSS pelos exports do pacote (`framework7/css/bundle`), sem copiar para public. Não alterar DOM gerenciado pelo Vue quando bindings resolvem.
- Novas telas: consultar referências → propor/aprovar layout → implementar → atualizar o SDD. Aprovação de tela não autoriza mudança visual global. Referências reais/versionadas ficam em docs/telas; não inventar aprovação ou depender de links privados de conversa.
- Navegação nativa, avanço/retorno e redução de movimento preservados. Hello demonstra accordion, autocomplete, botões, calendar em sheet, checkbox, dialog, FAB, 20 Lucide, notification, sheet, Smart Select, toast e cover-v/dive/fade/parallax.
- Compartilhar máscaras/validadores; sincronizar Vue e destruir instâncias/listeners. Manter rótulos/erros associados, teclado, foco, estados loading/disabled e mensagens. **Inputs/selects/textareas sem outline retangular**; botões/links mantêm foco visível. Avaliar acessibilidade/WCAG 2.2 AA em navegador real.
- HTTP centralizado, datas civis YYYY-MM-DD e instantes ISO 8601 com fuso. Definir contratos/paginação antes de endpoints de negócio; não repetir gravações automaticamente após expiração da sessão. Autorização e validação Laravel permanecem obrigatórias.
- Testes proporcionais ao risco: regras/contratos/jornadas próprias, sem reproduzir internals de bibliotecas. Nunca executar testes destrutivos em produção ou no banco principal; TestingDatabaseGuard exige banco testing isolado.
- Antes de analisar infraestrutura, pedir Compose, Dockerfile PHP, Nginx e php.ini atuais necessários, com segredos removidos. Não arquivar cópias da infra nem usar configuração histórica como prova. Preservar outros sites/volumes; não subir toda a pilha nem executar down -v.
- Atualizar o documento responsável quando seu contrato mudar. MEMORY.md registra somente o estado relevante: decisões relevantes, evidências, pendências e próximo passo; sem histórico de conversa ou comandos duplicados.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Instalação](instalacao-pwa-framework.md) | Configuração, Compose/Nginx, bootstrap, desenvolvimento, PWA/USB, push, testes e VPS |
| [00 — Visão](docs/sdd/00-visao.md) | Escopo da base e do produto |
| [01 — Telas](docs/sdd/01-telas.md) | Hello, navegação, estados e interação |
| [02 — Design system](docs/sdd/02-design-system.md) | Tokens, layout, componentes e acessibilidade |
| [03 — Arquitetura](docs/sdd/03-arquitetura.md) | Módulos, sessão, PWA e processamento push |
| [04 — Ambiente](docs/sdd/04-ambiente.md) | Configuração central, executor, infraestrutura e isolamento |
| [05 — API](docs/sdd/05-api.md) | Diagnósticos, sessão/CSRF, contratos e limites push |
| [06 — Pedidos de componentes](docs/sdd/06-pedidos-componentes.md) | Lacunas oficiais e propostas de alternativa |

Manter os sete documentos SDD enxutos; contratos no SDD, procedimentos no manual, regras em RULES/AGENTS e andamento no MEMORY. Não criar documentos de passagem paralelos.

## Qualidade e validação

| Verificação | Resultado local confirmado |
| --- | --- |
| Laravel/PHPUnit com MySQL testing | 35 testes, 260 assertions |
| Bootstrap Node | 31 testes |
| Frontend/Vitest | 16 testes |
| Formatação PHP/Pint | 64 arquivos aprovados |

Resultados recebidos em **14/11/2026**, com instalação do zero e diagnósticos funcionando. O bootstrap testa Engine/Compose/HTTP por simulação; isso não comprova todos os hosts reais. Instalação/offline/atualização e recebimento/clique push foram confirmados em testes locais Android anteriores.

ESLint/Stylelint, build/check:pwa e testes de navegador/visuais complementam a suíte. Playwright usa imagem oficial compatível, com dependências próprias, sem compartilhar node_modules Alpine; referências visuais exigem aprovação humana. Playwright, VPS/HTTPS público, iOS e outros navegadores não foram homologados nesse aceite. Emulação, mocks e aceite HTTP não substituem aparelho real.

## Versões e publicação

Cada aplicativo tem versão/histórico próprios. Registrar versão e commit de origem da fundação; usar tags/versionamento semântico e notas de release para mudanças, requisitos, incompatibilidades e migração. A versão da fundação, a do produto e o hash de build são distintos.

Para incorporar atualizações, comparar a base de origem com a desejada, selecionar mudanças, resolver conflitos e validar personalizações; não sobrescrever o produto. Manter código, lockfiles, scripts e referências aprovadas juntos. Não distribuir configurações privadas, chaves, bancos, inscrições, sessões, dependências ou estado de outro ambiente.

Produção usa `.env.foundation` próprio (`APP_ENV=production`, PRODUCTION_URL HTTPS), certificado real e bootstrap com --force para migrations; --force não autoriza alteração automática de infraestrutura ou operações destrutivas. Preservar APP_KEY/VAPID/dados/volumes. Validar worker/Cron e jornadas; evidência local não homologa a VPS.

Antes de publicar: backup/restauração isolada de banco/arquivos/chaves, retenção/acesso e recuperação testados. Publicar assets antes do HTML/worker, manter clientes antigos compatíveis com API/banco e separar rollback de código de recuperação de dados. Não presumir migration reversa segura. Procedimentos concretos no [manual](instalacao-pwa-framework.md#vps-e-atualizações).

<!-- BEGIN FOUNDATION IDENTITY -->
| Campo | Valor |
| --- | --- |
| Projeto | PWA Framework |
| Slug | pwa-framework |
| Ambiente | local |
| URL | http://pwa-framework.localhost |
| Dev / preview | 5180 / 5181 |
| Serviço / Compose | pwa-framework-node / infra |
| Volumes | pwa_framework_vendor, pwa_framework_node_modules |
| Bancos | pwa_framework, pwa_framework_test |
| Admin | http://admin.pwa-framework.localhost |
| Admin dev / preview | 5182 / 5183 |
| Fundação | 0.7.1-forms.1 |
<!-- END FOUNDATION IDENTITY -->
