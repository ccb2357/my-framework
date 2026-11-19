# Telas

A interface depende do domínio configurado: PWA, website e admin têm entradas, navegação, componentes e estilos próprios. As telas de autenticação podem ser reutilizadas no produto; as páginas Hello demonstram a base e podem ser substituídas.

## PWA

Framework7 Vue em `pwa/`.

| Rota | Arquivo em `pwa/src/pages/` | Finalidade |
| --- | --- | --- |
| `/` | `hello.vue` | Hello pública, componentes, formulário, diagnóstico e acesso à conta. |
| `/entrar/`, `/cadastro/` | `access.vue` | Login e cadastro de clientes. |
| `/conta/` | `account.vue` | Nome/e-mail e Sair; exige sessão verificada. |
| `/esqueci-senha/`, `/redefinir-senha/` | `recovery.vue` | Solicitar recuperação e definir nova senha. |
| `/transition/cover-v/`, `/transition/dive/`, `/transition/fade/`, `/transition/parallax/` | `transition.vue` | Transições oficiais com retorno preservando o estado da Hello. |

### Hello demonstrativa

Nome e identidade vêm da configuração central. A Hello reúne os seguintes recursos, sem gravar dados de negócio:

| Recurso | Comportamento |
| --- | --- |
| Accordion, botões, checkbox e diálogo | Componentes oficiais, ações e estado reativo. |
| Autocomplete | Sugestões locais e seleção funcional. |
| Calendar | Calendário oficial em sheet, inclusive no desktop. |
| FAB | Speed Dial com três ações para cima, +/×, fechamento por ação/Escape e feedback por toast. |
| Ícones | Vinte Lucide identificados; Framework7 Icons nos demais controles. |
| Notification, sheet, Smart Select e toast | APIs oficiais; Smart Select em popup. Notification é um aviso interno do Framework7. |
| Formulário | E-mail/celular obrigatórios, máscara brasileira e erros acessíveis; sem envio ou gravação. |
| Transições | `f7-cover-v`, `f7-dive`, `f7-fade` e `f7-parallax`. |

`PwaStatus.vue` mostra conexão, versão, instalação/menu e atualização. Vite dev não registra service worker nem oferece instalação. No build, atualizar exige confirmação; campos da Hello são preservados por aba. Formulário alterado bloqueia recarga por outra aba, e falha de armazenamento mantém a página. Novos formulários integram a proteção de rascunho descrita na [arquitetura](03-arquitetura.md). Dados de autenticação e tokens não entram nesse rascunho; campos preenchidos ou recuperação pendente bloqueiam a atualização da PWA.

## Website

Nuxt SSR em `website/`, com Tailwind/shadcn-vue e Lucide próprios. Não oferece instalação ou offline PWA. Layout em `website/app/layouts/default.vue`; rotas desconhecidas retornam 404.

| Rota | Arquivo em `website/app/pages/` | Finalidade |
| --- | --- | --- |
| `/` | `index.vue` | Hello pública SSR, conteúdo dinâmico, formulário e link para a PWA. |
| `/entrar/`, `/cadastro/` | `entrar.vue`, `cadastro.vue` | Login e cadastro da mesma conta de cliente da PWA. |
| `/conta/` | `conta.vue` | Minha conta; visitante é redirecionado antes de receber HTML privado. |
| `/esqueci-senha/`, `/redefinir-senha/` | `esqueci-senha.vue`, `redefinir-senha.vue` | Recuperação de senha do cliente. |

### Hello demonstrativa

Título, descrição, botão shadcn-vue e ícone Lucide SVG são renderizados no servidor e no cliente. `DemoForm.vue` demonstra e-mail/celular obrigatórios, máscara `(00) 00000-0000`, erros pt-BR e confirmação local. Os campos aparecem no SSR, mas permanecem desabilitados até inicializar as bibliotecas no navegador; falha mantém o formulário desabilitado. A demonstração não envia nem persiste dados.

`DynamicContent.vue` exibe título/texto público do Laravel/MySQL. SSR entrega o conteúdo no HTML e a hidratação reutiliza esse payload. Atualização manual, nova navegação ou retorno de foco/conexão consultam o dado atual sem rebuild; mudanças no código Vue/CSS exigem build fora do dev.

Carregamento, vazio, erro e sucesso são distintos. Durante carregamento, erro ou offline, o texto anterior não permanece como atual. O botão Atualizar conteúdo respeita disabled/busy, `aria-live` anuncia transições e falhas permitem tentar novamente. Texto usa interpolação escapada, nunca `v-html`. O exemplo nasce vazio e é alterado somente por comando explícito; não é um editor comercial.

O estado SSR da conta pertence à requisição. Falha de verificação não exibe identidade anterior. Entrar/sair reflete na PWA ao abrir, navegar ou recuperar foco; não há sincronização em tempo real entre domínios.

## Admin

Vue/shadcn-vue/Tailwind em `admin/`, no domínio administrativo configurado. Não carrega Framework7, manifest, service worker ou offline PWA.

| Rota | Arquivo em `admin/src/pages/` | Finalidade |
| --- | --- | --- |
| `/` | `Login.vue` ou `HelloDashboard.vue` | Login para visitante; Dashboard somente após verificar a sessão administrativa. Entrar/sair mantém a mesma URL. |
| `/esqueci-senha/`, `/redefinir-senha/` | `Recovery.vue` | Recuperação exclusiva da conta administrativa. |

O login usa Input/Label/Button/Card oficiais. A Hello Dashboard mostra nome/e-mail, Sair, cabeçalho, cards e diagnóstico real com nova consulta. Inclui formulário demonstrativo de e-mail/celular com mensagens e máscaras comuns, sem envio/gravação nem dados comerciais simulados. Não há cadastro público de administradores; a conta é criada por comando.

## Acesso e formulários

PWA e website compartilham conta e sessão do cliente; admin tem conta e sessão independentes. Cadastro do cliente pede nome, e-mail, senha e confirmação, com acesso imediato, sem confirmação por e-mail. Cliente já autenticado é encaminhado dos formulários de login/cadastro para a conta.

O Laravel mantém a sessão no servidor, identificada por cookie HTTP-only. O frontend mantém em memória apenas o estado de verificação e a identidade exibida. Entrada, retorno de foco/visibilidade e conexão renovam a consulta; falha ou offline não mantêm a identidade como verificada e ocultam dados protegidos.

Mensagens, máscaras e regras vêm de `shared/forms/`, com apresentação própria por interface. Validadores DOM inicializam após montagem e são descartados ao sair. Formulários têm labels/erros associados, teclado, disabled/busy e mensagens controladas, sem respostas técnicas. Senhas ficam somente na memória do componente, sem persistência. O Laravel valida novamente os dados recebidos.

### Recuperação de senha

O login das três interfaces oferece Esqueci minha senha. A solicitação retorna mensagem genérica; novo pedido para a mesma conta deve aguardar 60 segundos. O link expira em 60 minutos e é de uso único. Redefinir pede senha e confirmação; sucesso orienta voltar ao login, sem autenticar automaticamente. Link inválido permite solicitar outro.

O token vem no fragmento do link e é consumido/removido no navegador, sem entrar em SSR, query, armazenamento, rascunho ou telemetria. A redefinição encerra sessões antigas da conta afetada; a outra área de autenticação permanece independente.

## Diagnósticos e apresentação

`BackendStatus.vue` consulta `/api/v1/status` sem cache: carregando, OK, indisponível, erro ou não verificado. As interfaces descartam o OK anterior em offline/falha e consultam novamente ao reconectar.

`/status` é o diagnóstico HTML, `/api/v1/status` sua representação JSON e `/up` a verificação da aplicação. São endpoints técnicos do Laravel; contratos em [05-api.md](05-api.md).

Toda tela segue [02-design-system.md](02-design-system.md). Novas telas de negócio precisam de aprovação visual; referências aprovadas ficam em `docs/telas/`. Não criar outro aplicativo de demonstração.
