# Arquitetura

Frontend em `frontend/`, Laravel em `backend/` e infraestrutura compartilhada externa. Versões efetivas nos manifests/lockfiles; instalação e comandos no [guia da raiz](../../instalacao-pwa-framework.md).

## Organização

| Área | Responsabilidade |
| --- | --- |
| `frontend/src/main.js`, `App.vue`, `routes.js` | Inicialização Vue/Framework7, componentes, estilos e roteamento oficial F7. JavaScript/script setup; sem roteador ou aplicação paralela. |
| `src/pages/`, `components/` | Páginas e composições reutilizáveis; APIs Core quando necessárias ao componente oficial. |
| `src/services/`, `forms/`, `css/` | HTTP/CSRF/erros, máscaras/validação e tokens/layout compartilhados. Destruir instâncias/listeners sem duplicação. |
| `backend/app/` | Diagnóstico, comandos, APIs/sessão, serviços e jobs push. Regras de negócio são acrescentadas pelo produto. |
| `scripts/bootstrap/` | Executor Node/Docker; configuração, descoberta do Engine, arquivos derivados e verificações PHP/HTTP. |

`HealthCheck` faz consulta MySQL real; um serviço alimenta HTML/JSON. Rotas de diagnóstico são independentes de sessão para reportar falha do banco sem erro indireto de autenticação. `app:sync` executa optimize:clear e depois migrations; propaga falhas e exige --force em produção. Não instala/builda/semeia/regenera chaves.

Sessão Laravel/Sanctum com cookies host-only, nome por projeto, CSRF e origens/portas derivadas. Em produção: HTTPS/cookies seguros. Login de negócio não está implementado. `TestingDatabaseGuard` verifica o banco testing antes de traits destrutivas.

## PWA e publicação

Fonte única `frontend/src/sw.js`, Workbox injectManifest e registro `virtual:pwa-register` em modo prompt, desativado no Vite dev. Precache somente público; API/sessão/CSRF/status nunca recebem cache ou fallback HTML. Shell offline para rotas conhecidas; demais navegações públicas recebem offline.html. Cache isolado por origem/escopo.

`pwa/manager.js` controla instalação, conexão e atualização. Novos formulários integram `draftGuard`: aba alterada não recarrega por ativação externa. Confirmação salva campos conhecidos da Hello em sessionStorage por projeto/aba, por até 24h; falha de armazenamento mantém a aba. Código de acesso push nunca é salvo. Isso não implementa persistência/sincronização de registros offline.

Build com staging validado por `check-pwa.mjs`; `publish-build.mjs` publica assets antes do HTML/worker e conserva assets antigos. Falha de compilação não substitui entradas; falha de I/O exige correção/reexecução. Limpeza de assets e recuperação pertencem ao plano de publicação do produto.

## Web Push

O produto define gatilhos/destinatários autorizados em Service/Job/Listener e chama `PushNotificationService::sendToUser`; não criar envio público por ID de usuário. Serviço enfileira `PushDelivery`/`SendPushDelivery` em database/push; `push:work` consome no PHP-FPM existente. Enfileirar/aceite HTTP não comprova recebimento.

Endpoint/chaves e payload são criptografados por APP_KEY; hash único do endpoint impede transferência entre contas. Jobs transportam UUID e revalidam ambiente, preferência, dono, inscrição e validade de 24h. Até três tentativas; interrupção após aceite pode duplicar, com tag UUID para reduzir duplicação visual.

`SafeWebPushChannel` usa o canal oficial, PSR-18 síncrono e NullLogger para avisos opcionais do SDK, sem desativar erros PHP. Transporte valida TLS, provedor e IPs DNS, fixa resolução e bloqueia redirects/destinos privados. Provedores admitidos: FCM, Mozilla, Apple e notify.windows.com; ampliar exige revisão.

Somente 404/410 removem inscrição. Rede/DNS/429/5xx permitem retentativa; configuração/401/403 falham preservando inscrições. Sem endpoints/chaves/payload em logs. Revogação impede novos envios, sem recolher os já enviados. Produto define retenção dos registros.

O mesmo worker trata push/clique/mudança de inscrição. Destino seguro na mesma origem; clique foca/abre o app sem descartar formulário alterado. Logout integrado deve revogar o vínculo de sessão e cancelar a inscrição local, preservando ownership e outros dispositivos. Diagnóstico CLI com transporte simulado não comprova entrega externa.
