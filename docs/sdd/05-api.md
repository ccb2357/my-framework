# API e sessão

Base `/api/v1`. APIs de negócio e autenticação completa são responsabilidade do produto.

| Método/rota | Contrato |
| --- | --- |
| GET /up | Saúde Laravel; não consulta/comprova banco. |
| GET /status | HTML com consulta MySQL real; 200 saudável ou 503 indisponível. |
| GET /api/v1/status | Mesmo diagnóstico em JSON, sem cache. |
| GET /sanctum/csrf-cookie | 204, cookies host-only para sessão/CSRF; não autentica. |

JSON saudável: `{"status":"ok","checks":{"application":"ok","database":"ok"}}`. Banco indisponível: HTTP 503, `{"status":"error","checks":{"application":"ok","database":"error"}}`. Diagnóstico público sem credenciais, exceções, caminhos ou dados de usuários.

`services/api.js` centraliza credentials include, Accept JSON e cache no-store. Mutações obtêm CSRF e enviam X-XSRF-TOKEN decodificado; não repetir gravação automaticamente após 419. Cookie próprio por projeto, origens com portas efetivas. Nem Nginx nem worker podem devolver HTML do shell/cache para API, sessão ou diagnóstico.

Falhas: 401 autenticação, 403 permissão, 419 sessão/CSRF, 422 validação, 429 limite e 503 indisponibilidade. Instantes ISO 8601 com fuso; datas civis YYYY-MM-DD. Definir paginação antes do primeiro endpoint paginado.

## Web Push

Prefixo `/api/v1/push`; sessão web real com auth:sanctum, CSRF nas mutações e respostas no-store/private. Bearer isolado não substitui sessão. Inscrições, preferências e resultados pertencem à conta autenticada; nunca aceitar destinatário arbitrário do cliente.

| Método e sufixo | Contrato |
| --- | --- |
| GET config | enabled/public_key/user(id,name)/test_auth; somente chave pública. |
| GET subscriptions | devices com id/fingerprint/label/last_result/last_success_at; apenas próprios. |
| POST subscriptions | endpoint, keys.p256dh/auth, label opcional, contentEncoding=aes128gcm; 201 novo/200 repetido, 409 outro dono/chave, 422 inválido, 503 desabilitado. |
| DELETE subscriptions/{id} | 204 próprio; 404 ausente/outra conta. Permitido com push desligado. |
| GET/PUT preferences | {enabled:boolean}; desligar sempre permitido, ligar exige ambiente habilitado. Jobs revalidam. |
| GET deliveries | Últimos 20 próprios: UUID/status/result/provider_status/attempts/created_at; sem payload/destino. |
| POST test | subscription_id próprio, somente acesso de teste local; 202 com batch_id/queued/status. |

Acesso de teste: GET test-session informa disponibilidade; POST recebe code de 64 caracteres, hash/uso único/10min, regenera sessão/CSRF; POST test-logout revoga vínculo atual e encerra sessão. Exige local + PUSH_TEST_AUTH_ENABLED + conta marcada. Fora disso: 404. Código inválido/expirado: 401; sessão já autenticada: 409. Geração explícita pela CLI, sem senha fixa ou conta automática.

Limites nomeados independentes: API autenticada 60/min, login 5/min por IP, logout 10/min, cadastro 20/min e envio de teste 3/min. API autenticada usa ID web/fallback IP; leitura não consome a cota de envio/cadastro e logout não consome login.

`PushNotificationService` aceita title até 100, body até 240, url até 512 caracteres e image opcional. URL/imagem: caminho seguro da mesma origem, sem API/CSRF/status/dotfiles/PHP; imagem pública PNG/JPEG/WebP, sem conteúdo privado. Produto autoriza destinatário/destino. Exibição da imagem depende do navegador/SO; aceite do provedor não comprova recebimento/leitura.
