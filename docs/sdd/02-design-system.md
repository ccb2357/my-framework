# Design system

## Fronteiras

PWA, admin e website têm componentes, tokens, CSS e dependências próprios. Nunca importar componentes ou estilos de uma interface em outra, nem misturar Framework7 e shadcn-vue na mesma tela. Somente a lógica neutra de `shared/forms/` é compartilhada.

As versões efetivas ficam nos manifests e lockfiles de cada aplicação. Admin e website declaram Lucide como dependência própria, na mesma versão da PWA; importar somente os ícones usados.

## Base compartilhada

`shared/forms/` define mensagens pt-BR (`messages.pt-BR.json`), máscaras (`masks.js`), regras JustValidate (`rules.js`) e política de acesso (`auth-policy.json`). `contact-form.js` e `recovery.js` fornecem integração neutra; os adaptadores de cada interface injetam suas próprias IMask/JustValidate e definem a apresentação.

IMask formata o celular com DDD e 11 dígitos; JustValidate apresenta os erros. A máscara não confirma existência do telefone. Instâncias mantêm `aria-invalid`/`aria-describedby`, preservam textos de ajuda e removem descrições obsoletas ao corrigir. Destruir validadores, máscaras e listeners ao desmontar a página.

Contratos de autenticação, sessão, recuperação e validação no servidor pertencem à [arquitetura](03-arquitetura.md#autenticação-dos-clientes) e à [API](05-api.md); este documento define sua apresentação.

## PWA

Usar a aparência nativa e os controles oficiais do Framework7 Vue diretamente, sem biblioteca de estilos adicional ou wrappers equivalentes. Referência de composição: `pwa/src/pages/hello.vue`.

### Estilos e layout

Importação única em `pwa/src/main.js`, nesta ordem: CSS Framework7 → Framework7 Icons → `css/tokens.css` → `css/app.css`. Fonte Nunito variável local em `pwa/public/fonts/`, com licença e fallback de sistema. Cor do manifest não altera a identidade CSS.

| Base | Contrato |
| --- | --- |
| Tokens `--app-*` | Referenciam variáveis Framework7 para fonte, cores, superfícies e estados, inclusive tema escuro; não duplicar paletas. |
| Espaçamento | `--app-space-1/2/3/4/5`: 4/8/16/24/32px; grid usa space-3. |
| Conteúdo | `app-content`, máximo 960px; reutilizar `app-heading`, `app-note`, `app-actions`, `app-choice` e `app-grid-cell`. |
| Grid | Framework7 `grid-cols-1 medium-grid-cols-2 grid-gap`, breakpoint 768px; ícones usam o mesmo grid da PWA. |
| Ícones | Tamanho base 24px. |
| FAB | Reservar espaço inferior e safe area para não cobrir o último conteúdo. |

Temas e redução de movimento seguem Framework7/preferências do navegador. `pwa/public/offline.html` é a exceção técnica mínima em HTML, com fonte local e link nativo.

### Controles

- Ações usam `f7-button type=button`; submit somente no formulário. Fill é principal, outline é secundário; navegação usa link/roteador oficial.
- Operações assíncronas usam loading/disabled, `aria-busy`/`aria-disabled`, tabulação adequada e guarda contra reentrada. Na versão fixada, f7-button desabilitado usa classe CSS; manter os atributos acessíveis complementares.
- Inputs usam rótulo nativo associado por `input-id`, valor IMask sincronizado com Vue e erros JustValidate associados ao campo.
- FAB oficial usa `aria-expanded`/`aria-controls`; ações fechadas ficam `inert` e fora da tabulação. Espaço aciona; Escape fecha e devolve o foco.
- Diálogos/sheets têm identificação, fechamento e foco. Feedback usa notification/toast oficiais. Descartar instâncias e listeners ao remover páginas.

Formulários de acesso: ListInput/Button Framework7 e adaptador `pwa/src/forms/auth.js`. Erros aparecem junto aos campos; foco vai para o primeiro inválido.

## Admin

Vue/shadcn-vue, Reka UI e Tailwind com Preflight. Componentes locais em `admin/src/components/ui/`; aliases e gerador JavaScript em `admin/components.json` e `admin/jsconfig.json`.

Importação única em `admin/src/main.js` → `admin/src/style.css`. Tema neutral/new-york, variáveis CSS próprias e fonte de sistema. Layout prioriza desktop com adaptação básica.

Referências: `admin/src/pages/Login.vue`, `admin/src/pages/HelloDashboard.vue` e `admin/src/components/DemoForm.vue`. Login usa Input/Label/Button/Card, rótulos e erros abaixo dos campos, senha com `autocomplete=current-password` e botão indisponível durante envio. A Dashboard organiza cabeçalho, identificação/Sair, cards, badge de diagnóstico e nova consulta; estados incluem texto, sem depender somente da cor.

## Website

Nuxt com Tailwind e shadcn-vue JavaScript. Estilos/tokens em `website/app/assets/css/main.css`, registrado no array `css` de `website/nuxt.config.js`. Componentes locais em `website/app/components/ui/`. Descoberta automática considera apenas `.vue`; `index.js` fornece exports explícitos.

Referências: `website/app/pages/index.vue`, `website/app/layouts/default.vue` e `website/app/components/DemoForm.vue`. Layout responsivo simples, link de salto, HTML semântico e foco visível em links/botões. Lucide renderiza SVG no servidor e cliente sem modificar o DOM gerenciado pelo Vue.

Formulários usam Input/Label/Button locais, card de largura limitada, links Nuxt, erro associado ao campo e confirmação por status. Adaptador de acesso em `website/app/forms/auth.js`; bibliotecas DOM inicializam após `onMounted`. Campos SSR permanecem desabilitados até concluir a inicialização; desmontagem durante carregamento cancela a integração.

`website/app/components/DynamicContent.vue` usa card e Button locais, título h2/h3 e texto com quebras preservadas. Vazio, carregamento e erro têm texto acessível; botão indisponível durante consulta/offline. Não apresentar conteúdo anterior como atual enquanto a leitura estiver pendente ou falhar.

## Regras gerais

- **Foco dos campos:** inputs, selects e textareas não recebem outline retangular em `focus`/`focus-visible`. Na PWA e no website, também não aplicar anel retangular; preservar os indicadores próprios do componente e as regras locais aprovadas. Botões/links mantêm foco visível; checkbox realça o rótulo.
- **Formulários:** labels associados, `aria-invalid`/`aria-describedby`, foco no primeiro inválido e erros junto aos campos. Recuperação usa a mesma apresentação; mensagens de retorno têm `role=status`, e envio respeita disabled/busy.
- **Feedback:** status com texto e `role=status`/`aria-live`; descartar OK anterior em falha/offline. Ícones decorativos usam `aria-hidden`; ações somente por ícone exigem nome acessível.
- **Reutilização:** procurar primeiro controles/componentes existentes. Quando uma tela aprovada exigir um componente ausente, incorporar o componente oficial correspondente na própria interface, sem gerar catálogo antecipadamente.
- **Evolução:** não criar token sem uso real nem repetir estilos locais. Mudanças visuais globais ou novas variações devem ser propostas ao responsável pelo projeto na conversa/demanda, com referência visual; após aprovação, atualizar este contrato junto da implementação. Ajustes que já seguem o contrato não exigem nova aprovação global.
- **Validação:** contraste, teclado e aparência exigem navegador real; testes DOM não certificam acessibilidade. Imagens de regressão só se tornam referências após aprovação do responsável pelo projeto.
