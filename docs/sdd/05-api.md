# API e sessão

Base `/api/v1`. APIs de negócio são responsabilidade do produto. Autenticações de clientes e admin estão incluídas; recuperação por SMTP também está incluída.

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

## Admin

Prefixo `/api/v1/admin/auth`, somente no host administrativo e origens administrativas derivadas. Sessão real guard admin/provider administrators; não aceita sessão de cliente, teste push ou Bearer isolado. Respostas privadas/no-store.

| Método/rota | Contrato | Limite |
| --- | --- | --- |
| GET csrf-cookie | 204, cookies administrativos host-only; não autentica. | 30/min/IP |
| POST login | email/password; 200 com user {id,name,email}; rotaciona sessão/CSRF. | 20/min/IP e 5/min/e-mail+IP |
| GET me | 200 com user; 401 sem sessão administrativa. | 60/min/IP |
| POST logout | 204, invalida somente a sessão administrativa. | 10/min/IP |

Mutações exigem CSRF inclusive sem Origin: header X-XSRF-TOKEN vindo de XSRF-ADMIN-TOKEN, nunca do cookie do cliente. Validação compartilhada de e-mail/senha segue o login de clientes; campos arbitrários não participam das credenciais. Falhas 401/403/409/419/422/429/500 têm mensagem controlada; 422 contém apenas erros de campos permitidos. Cadastro público administrativo não existe (404); criação só por comando. GET status permanece diagnóstico público independente.

## Autenticação de clientes

Prefixo `/api/v1/auth`, somente no host da PWA. Cookies host-only, sessão web e CSRF nas mutações; origens precisam estar na configuração Sanctum derivada. Respostas `no-store, private`; sucesso contém somente `user: {id, name, email}`.

| Método/rota | Contrato | Limite |
| --- | --- | --- |
| POST register | name, email, password, password_confirmation; 201 e sessão imediata. | 5/min/IP |
| POST login | email, password; 200 e sessão. | 20/min/IP e 5/min/e-mail+IP |
| GET me | 200 com usuário; 401 sem sessão de cliente. | 60/min/usuário |
| POST logout | 204; invalida sessão e revoga vínculo push atual. | 10/min/usuário |

E-mail é normalizado para minúsculas/sem espaços externos, até 254 caracteres; nome até 120. Senha de cadastro: mínimo 8 caracteres, máximo 72 bytes UTF-8, sem NUL e confirmação idêntica; espaços são preservados. Login não impõe novamente o mínimo de cadastro. Limites compartilhados em `shared/forms/auth-policy.json`; servidor valida independentemente do navegador. Cadastro ignora atributos privilegiados e rejeita e-mail repetido com 422.

Login inválido retorna 401 genérico; substituir sessão ativa retorna 409; host/origem proibidos 403; CSRF 419; validação 422 com errors por campo; limite 429. Falhas inesperadas retornam mensagem controlada. Contas is_push_test não entram pelo login de clientes. Cadastro não verifica e-mail; recuperação usa o fluxo separado abaixo.

## Recuperação de senha

Em cada prefixo de autenticação (`/api/v1/auth` e `/api/v1/admin/auth`):

| POST | Entrada | Resposta | Limite independente por área |
| --- | --- | --- | --- |
| forgot-password | email | 200 genérico, sem revelar conta, throttling do broker ou falha SMTP. | 5/min/IP e e-mail; reenvio do broker após 60s |
| reset-password | email, token, password, password_confirmation | 200 após redefinir; 422 para link inválido/expirado/usado ou campos inválidos. | 10/min/IP e e-mail |

Mesmos hosts/origens, CSRF e no-store/private da área. Senha segue o cadastro: mínimo 8 caracteres, até 72 bytes UTF-8. Brokers clients/administrators usam providers e tabelas distintos, mesmo para e-mails iguais; clientes excluem is_push_test. Tokens de 64 caracteres têm apenas hash no banco, expiram em 60 minutos e são consumidos sob transação/lock. Não autenticar automaticamente. Redefinição incrementa auth_version e troca remember_token; ClientSession/AdminSession/PushSession rejeitam sessões antigas apenas daquela conta/área. APIs futuras devem usar essas proteções.

SMTP vazio desabilita envio; nenhuma recuperação usa transporte log ou grava tokens nos logs. Resposta de solicitação não confirma entrega. Falha SMTP registra somente password-recovery-mail-unavailable e área, sem detalhes privados.
