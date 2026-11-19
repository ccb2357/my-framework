# API e sessão

O Laravel fornece diagnóstico, autenticação e conteúdo público demonstrativo. APIs de negócio pertencem ao produto. A base de autenticação é `/api/v1`; diagnóstico e bridges Nuxt também têm caminhos fora desse prefixo.

## Convenções e fronteiras

- Requisições JSON usam `Accept: application/json`; envios JSON também usam `Content-Type: application/json`.
- Autenticação usa cookies de sessão, com `credentials: include` no navegador. Bearer isolado não autentica cliente ou administrador.
- Hosts e origens devem corresponder à área configurada. Em produção, as origens permitidas são HTTPS. Ausência de Origin não dispensa CSRF nas mutações.
- Sessão, autenticação e recuperação respondem com `Cache-Control: no-store, private`; diagnóstico e conteúdo público usam no-store. Nginx e service worker não podem responder HTML do shell/cache para esses contratos.
- Sucesso com identidade expõe somente `user: {id, name, email}`; nunca hash de senha, auth_version ou campos administrativos.

Exemplo de recurso de identidade:

```json
{"user":{"id":1,"name":"Nome da conta","email":"conta@example.com"}}
```

Contas, cookies, guards, domínios e brokers estão na [tabela de autenticação](03-arquitetura.md#autenticação-dos-clientes). A separação continua obrigatória mesmo quando cliente e admin têm o mesmo e-mail.

### CSRF

| Área | Preparação | Cookie legível pelo navegador |
| --- | --- | --- |
| Cliente — PWA/website | `GET /sanctum/csrf-cookie` → 204; não autentica. | `XSRF-CLIENT-TOKEN` |
| Admin | `GET /api/v1/admin/auth/csrf-cookie` → 204; não autentica. | `XSRF-ADMIN-TOKEN` |

Antes de enviar uma mutação, obter CSRF na área correta e enviar o valor decodificado do cookie no header `X-XSRF-TOKEN`, junto da sessão. Tokens de cliente/admin não são intercambiáveis. Login e logout rotacionam sessão/CSRF; não reutilizar valor antigo nem repetir gravação automaticamente após `419`.

No cliente, o escopo acompanha a sessão compartilhada; em dev por localhost é host-only. No admin, cookies são host-only. O endpoint CSRF administrativo tem limite de 30/min/IP; o de cliente não possui limitador específico declarado pela base.

## Diagnóstico

Endereços completos, independentes dos prefixos de autenticação e da sessão:

| Método / rota | Resposta |
| --- | --- |
| `GET /up` | Saúde Laravel; não consulta nem comprova banco. |
| `GET /status` | HTML com consulta MySQL real; 200 saudável ou 503 indisponível. |
| `GET /api/v1/status` | Mesmo diagnóstico em JSON, sem cache. |

Banco saudável — HTTP 200:

```json
{"status":"ok","checks":{"application":"ok","database":"ok"}}
```

Banco indisponível — HTTP 503:

```json
{"status":"error","checks":{"application":"ok","database":"error"}}
```

Não expor credenciais, exceções, caminhos ou dados de usuários no diagnóstico.

## Clientes — PWA e website

Somente nos hosts autorizados de cliente. PWA e website usam as mesmas contas, endpoints, sessão e quotas; não há uma segunda API de autenticação para o website.

| Método / rota | Entrada | Sucesso | Limite |
| --- | --- | --- | --- |
| `POST /api/v1/auth/register` | `name`, `email`, `password`, `password_confirmation` | 201 com recurso de identidade e sessão imediata. | 5/min/IP |
| `POST /api/v1/auth/login` | `email`, `password` | 200 com recurso de identidade; regenera sessão/CSRF. | 20/min/IP **e** 5/min/e-mail+IP |
| `GET /api/v1/auth/me` | Sessão de cliente | 200 com recurso de identidade. | 60/min/usuário |
| `POST /api/v1/auth/logout` | Sessão e CSRF de cliente | 204 sem corpo; invalida a sessão compartilhada. | 10/min/usuário |

Cadastro libera acesso sem confirmação de e-mail. Atributos privilegiados são ignorados; e-mail duplicado retorna `422`. Login inválido retorna `401`; tentativa de login/cadastro com sessão já autenticada retorna `409`, sem substituí-la silenciosamente. Inspeção/saída sem sessão válida retorna `401`.

### Credenciais

| Campo | Validação |
| --- | --- |
| `name` | Obrigatório no cadastro; string de até 120 caracteres. |
| `email` | Obrigatório; normalizado para minúsculas e sem espaços externos; formato válido e até 254 caracteres. |
| `password` | Obrigatória; string sem NUL, até 72 **bytes UTF-8**, preservando espaços. Cadastro e redefinição exigem mínimo de 8 caracteres; login não reaplica esse mínimo. |
| `password_confirmation` | Obrigatória no cadastro/redefinição e idêntica à senha. |

Limites vêm de `shared/forms/auth-policy.json` e mensagens de `messages.pt-BR.json`; Laravel valida independentemente do navegador. Regras do formulário não concedem autorização.

## Admin

Somente no host e nas origens administrativas configuradas, com sessão guard admin/provider administrators. Sessão de cliente não concede acesso administrativo.

| Método / rota | Entrada | Sucesso | Limite |
| --- | --- | --- | --- |
| `POST /api/v1/admin/auth/login` | `email`, `password`; mesmas regras de login acima | 200 com recurso de identidade; regenera sessão/CSRF. | 20/min/IP **e** 5/min/e-mail+IP |
| `GET /api/v1/admin/auth/me` | Sessão administrativa | 200 com recurso de identidade. | 60/min/IP |
| `POST /api/v1/admin/auth/logout` | Sessão e CSRF administrativos | 204 sem corpo; invalida somente a sessão administrativa. | 10/min/IP |

Os limites administrativos são independentes dos de cliente. Login inválido retorna `401`; sessão já autenticada retorna `409`. Inspeção/saída exigem sessão válida e auth_version atual. Não existe cadastro administrativo público (`404`); a conta única é criada por comando. Preparação CSRF está na seção comum.

## Recuperação de senha

Mesmos hosts, origens, CSRF e cache privado da respectiva autenticação.

| Método / rota | Entrada | Resultado |
| --- | --- | --- |
| `POST /api/v1/auth/forgot-password` | `email` | 200 com mensagem genérica. |
| `POST /api/v1/admin/auth/forgot-password` | `email` | 200 com mensagem genérica. |
| `POST /api/v1/auth/reset-password` | `email`, `token`, `password`, `password_confirmation` | 200 após redefinir; 422 para dados ou link inválidos. |
| `POST /api/v1/admin/auth/reset-password` | Mesmos campos de redefinição | Mesmo resultado, somente para a conta administrativa. |

| Ação | Quotas por área |
| --- | --- |
| Solicitar link | 5/min/IP **e** 5/min/e-mail. |
| Redefinir | 10/min/IP **e** 10/min/e-mail. |

As quotas são separadas entre cliente e admin. PWA/website compartilham a área de cliente. Exceder quota HTTP retorna `429`; isso é diferente do **intervalo de 60 segundos do broker**, que mantém a resposta genérica `200` da solicitação. E-mail desconhecido, recuperação desabilitada e falha SMTP também não são revelados nessa resposta; `200` não comprova envio ou entrega.

O token aceito pela redefinição é string com 64 caracteres hexadecimais minúsculos. O banco guarda somente hash; link expira em 60 minutos, é de uso único e seu consumo usa transação/lock. Senha e confirmação seguem as regras de cadastro. Sucesso não autentica: atualiza senha, remember_token e auth_version, encerrando as sessões antigas somente da conta/área afetada. E-mails iguais entre cliente/admin não tornam os tokens intercambiáveis.

Os links usam a origem configurada de quem solicitou: APP_URL, WEBSITE_URL ou ADMIN_URL. O navegador recebe o token pelo fragmento do link e o envia no corpo da redefinição; não colocá-lo em query, armazenamento ou telemetria. Transporte SMTP vazio/desabilitado não envia; não usar fallback para log. Falha SMTP registra somente o código privado `password-recovery-mail-unavailable` e a área, sem credenciais/link/token. Detalhes internos em [03-arquitetura.md](03-arquitetura.md#recuperação-e-e-mail).

## Website — bridges Nuxt e conteúdo público

Os caminhos abaixo são serviços distintos: `/_session` e `/_content` pertencem ao Nuxt; `/api/v1/website/content` pertence ao Laravel. Eles não substituem os endpoints de autenticação acima. No host website, Nginx mantém `/api`, `/sanctum`, `/up` e `/status` no Laravel.

| Método / rota | Contrato |
| --- | --- |
| `GET /_session` | Nuxt: 200 com recurso de identidade; 401 sem cookie/sessão de cliente válida; 503 quando transporte ou contrato Laravel não puderem ser confirmados. `no-store, private`. |
| `GET /api/v1/website/content` | Laravel: 200 com recurso público ou `data: null`; 503 genérico em falha de banco. Host website, sem sessão/cookie. |
| `GET /_content` | Nuxt: mesmo recurso público validado; 503 para transporte/contrato inválido e 429 se a origem limitar a leitura. Sem credenciais ou Set-Cookie. |

`/_session` usa exclusivamente o cookie de cliente recebido e um destino/Host fixos. Não usa Bearer nem parâmetros para escolher identidade/destino, não encaminha cookie administrativo e não devolve Set-Cookie. Não cria uma nova sessão.

### Recurso público

Sem registro — HTTP 200:

```json
{"data":null}
```

Com registro — HTTP 200:

```json
{"data":{"title":"Título público","body":"Texto público.","updatedAt":"2026-11-19T12:00:00Z"}}
```

| Campo | Contrato |
| --- | --- |
| `title` | Texto não vazio, até 160 caracteres. |
| `body` | Texto não vazio, até 2000 caracteres. |
| `updatedAt` | Data/hora UTC válida, formato `YYYY-MM-DDTHH:mm:ssZ`. |

As duas leituras usam no-store. O recurso não contém campos de conta, segredos ou dados administrativos; a bridge aplica whitelist e rejeita resposta inválida. Texto é apresentado com interpolação escapada, nunca como HTML confiável.

No endpoint Laravel, GET por host PWA/admin ou Origin não autorizado retorna `403`; Origin ausente é permitido, e Origin presente é conferido contra a lista configurada de cliente. Mutações não estão implementadas (`405`). Não há quota específica declarada para essa leitura pública. Escrita/limpeza do exemplo ocorrem somente pelo comando `website:content`, preservando outros registros e sem build.

## Erros e evolução

Nos endpoints Laravel de autenticação, CSRF e conteúdo público, falhas têm mensagem controlada, sem diagnóstico privado. A estrutura depende da origem: Nuxt/H3 tem seu próprio envelope de erro, não o mesmo JSON do Laravel; consumidores devem tratar o status HTTP e as mensagens permitidas de cada contrato.

| HTTP | Significado |
| --- | --- |
| `401` | Credenciais inválidas ou sessão ausente/encerrada. |
| `403` | Host/origem ou acesso proibido. |
| `404` | Rota inexistente, incluindo cadastro administrativo público. |
| `405` | Método não disponível para a rota. |
| `409` | Sessão já autenticada que não pode ser substituída. |
| `419` | CSRF/sessão expirados ou incompatíveis. |
| `422` | Dados ou link de recuperação inválidos. |
| `429` | Quota HTTP excedida. |
| `500` | Falha inesperada controlada nos endpoints protegidos pelo tratamento Laravel. |
| `503` | Diagnóstico indisponível, falha de banco no conteúdo ou falha de bridge Nuxt. |

Validação Laravel retorna `message` e, quando houver, `errors` por campo. O filtro permite somente `name`, `email`, `password` e `password_confirmation`; erros de token não são expostos nesse mapa. Redefinição com link inválido também pode retornar somente `message` e `422`. Não exigir a presença de `errors` em toda falha.

Novas APIs devem definir autorização, recurso público/privado, datas e paginação antes da implementação. Instantes usam ISO 8601 com fuso; datas civis usam `YYYY-MM-DD`. Não acrescentar fallback SPA, repetição automática de mutações ou campos privados aos contratos existentes.
