# Telas

## Hello

Rota `/`, arquivo `frontend/src/pages/hello.vue`. Demonstra a base instalada e pode ser substituída pela página inicial do produto. Nome/identidade vêm da configuração central; os dados do formulário são apenas demonstrativos.

| Recurso | Comportamento |
| --- | --- |
| Accordion, botões, checkbox e diálogo | Componentes oficiais Framework7, ações e estado reativo. |
| Autocomplete | Input Framework7 com sugestões locais e seleção funcional. |
| Calendar | Calendário oficial em sheet, inclusive no desktop. |
| FAB | Speed Dial com três ações para cima, +/×, fechamento por ação/Escape e feedback por toast. |
| Ícones | Seção com 20 Lucide identificados; Framework7 Icons nos demais controles. |
| Notification, sheet, Smart Select e toast | APIs oficiais; Smart Select em popup. Notification é interna do Framework7. |
| Formulário | E-mail/celular obrigatórios, máscara brasileira, validação e erros acessíveis; sem gravação. |
| Navegação | cover-v, dive, fade e parallax, com retorno preservando o estado da Hello. |

`BackendStatus.vue` consulta `/api/v1/status` sem cache: carregando, OK, indisponível, erro ou não verificado. Offline/falha descartam o OK anterior; retorno da conexão consulta novamente.

`PwaStatus.vue` informa conexão, versão, instalação/menu, offline e atualização. Vite dev não registra worker nem oferece instalação. O build usa confirmação para atualizar; campos da Hello são preservados por aba. Formulário alterado impede recarga por outra aba; falha de armazenamento mantém a página. Novos formulários devem integrar a proteção de rascunho descrita na arquitetura.

## Outras rotas

`frontend/src/pages/transition.vue` atende `/transition/cover-v/`, `/transition/dive/`, `/transition/fade/` e `/transition/parallax/`, com retorno nativo. Identificadores Framework7: `f7-cover-v`, `f7-dive`, `f7-fade` e `f7-parallax`.

`/status` é HTML técnico independente do Vite; `/api/v1/status` fornece o mesmo diagnóstico em JSON e `/up` verifica a aplicação. Contratos em [05-api.md](05-api.md).

Toda tela segue [02-design-system.md](02-design-system.md). Novas telas de negócio precisam de aprovação visual; referências aprovadas ficam em `docs/telas/`. Não criar outro aplicativo de demonstração.

## Hello Dashboard administrativa

Rota `/` do domínio `admin.<domínio>`, arquivo `admin/src/pages/HelloDashboard.vue`. Exibe Login enquanto visitante; a Hello Dashboard só é montada após verificar a sessão administrativa. Inclui formulário demonstrativo de e-mail/celular com as mesmas máscaras e mensagens da PWA, sem envio ou gravação de dados. Usa somente Vue/shadcn-vue/Tailwind: cabeçalho, cards, badge de diagnóstico real e botão de nova consulta. Loading/falha/offline descartam o OK anterior. Sem dados comerciais simulados. Não carrega Framework7 nem recursos PWA. Login.vue usa Input/Label/Button/Card oficiais e mensagens compartilhadas. Dashboard mostra nome/e-mail e Sair. Sessão só em memória; foco/conexão consultam novamente, falhas/offline ocultam dados. Senha não é persistida; não há cadastro administrativo público.

## Acesso dos clientes

A Hello pública oferece Entrar e Criar conta. `/entrar/` e `/cadastro/` usam `access.vue`; `/conta/` usa `account.vue` e exige sessão verificada no servidor. Cadastro pede nome, e-mail, senha e confirmação; libera acesso imediato, sem confirmação por e-mail. A conta mostra nome/e-mail e Sair. Usuário autenticado é redirecionado dos formulários para a conta.

Sessão é consultada ao entrar e ao recuperar foco/conexão. Falha ou offline não mantêm identidade como verificada. Senhas e formulários de acesso não são persistidos; campos preenchidos bloqueiam atualização da PWA. Erros são acessíveis e controlados, sem exibir respostas técnicas.

## Esqueci minha senha

Nas duas interfaces, o login oferece Esqueci minha senha. `/esqueci-senha/` recebe e-mail e retorna mensagem genérica; `/redefinir-senha/` recebe o fragmento do e-mail e pede nova senha/confirmar. PWA usa rotas e campos Framework7; admin usa Card/Input/Label/Button shadcn e navegação por links próprios, sem Framework7. Sucesso orienta voltar ao login; não autentica automaticamente. Link inválido permite solicitar outro. Credenciais/token não entram no rascunho; PWA bloqueia atualização enquanto o fluxo estiver pendente.
