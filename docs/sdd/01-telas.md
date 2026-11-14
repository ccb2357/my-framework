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
| Notification, sheet, Smart Select e toast | APIs oficiais; Smart Select em popup. Notification interna não é Web Push. |
| Formulário | E-mail/celular obrigatórios, máscara brasileira, validação e erros acessíveis; sem gravação. |
| Navegação | cover-v, dive, fade e parallax, com retorno preservando o estado da Hello. |

`BackendStatus.vue` consulta `/api/v1/status` sem cache: carregando, OK, indisponível, erro ou não verificado. Offline/falha descartam o OK anterior; retorno da conexão consulta novamente.

`PwaStatus.vue` informa conexão, versão, instalação/menu, offline e atualização. Vite dev não registra worker nem oferece instalação. O build usa confirmação para atualizar; campos da Hello são preservados por aba. Formulário alterado impede recarga por outra aba; falha de armazenamento mantém a página. Novos formulários devem integrar a proteção de rascunho descrita na arquitetura.

## Push na Hello

`PushSettings.vue` reúne acesso de teste local, permissão por clique, preferência da conta, inscrição e remoção de dispositivos. Acesso por código de uso único, válido por 10 minutos; indisponível em produção. Código pendente/operação push bloqueiam atualização e não entram no rascunho.

Dispositivos aparecem em cards, com identificação e botão de remoção confirmado. Histórico mostra os quatro últimos envios em pilha: enfileirada azul, aceita verde, falhou vermelho e cancelada cinza; texto/detalhes acompanham as cores. A lista não apaga o histórico no banco. Aceite do provedor não comprova recebimento/leitura.

## Outras rotas

`frontend/src/pages/transition.vue` atende `/transition/cover-v/`, `/transition/dive/`, `/transition/fade/` e `/transition/parallax/`, com retorno nativo. Identificadores Framework7: `f7-cover-v`, `f7-dive`, `f7-fade` e `f7-parallax`.

`/status` é HTML técnico independente do Vite; `/api/v1/status` fornece o mesmo diagnóstico em JSON e `/up` verifica a aplicação. Contratos em [05-api.md](05-api.md).

Toda tela segue [02-design-system.md](02-design-system.md). Novas telas de negócio precisam de aprovação visual; referências aprovadas ficam em `docs/telas/`. Não criar outro aplicativo de demonstração.
