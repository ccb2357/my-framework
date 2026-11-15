# Design system

**PWA (`frontend/`):** usar a aparência nativa do Framework7 Vue; a Hello é a referência de composição. Controles oficiais diretamente, sem biblioteca de estilos adicional ou wrappers equivalentes. Novas variações globais exigem aprovação e atualização deste contrato.

## Estilos e layout

Importação única em `frontend/src/main.js`: CSS Framework7 → Framework7 Icons → `css/tokens.css` → `css/app.css`. Fonte Nunito variável local em `public/fonts/`, com licença e fallback de sistema. Cor do manifest não altera a identidade CSS.

| Base compartilhada | Regra |
| --- | --- |
| Tokens `--app-*` | Referenciam variáveis Framework7 para fonte, cores, superfícies e estados, inclusive tema escuro; não duplicar paletas. |
| Espaçamento | `--app-space-1/2/3/4/5`: 4/8/16/24/32px; grid usa space-3. |
| Conteúdo | `app-content`, máximo 960px; `app-heading`, `app-note`, `app-actions`, `app-choice`, `app-grid-cell`. Reutilizar antes de criar CSS. |
| Grid | Framework7 `grid-cols-1 medium-grid-cols-2 grid-gap`, breakpoint 768px. Ícones usam grid compartilhado. |
| Ícones | Tamanho base 24px; Lucide decorativo com aria-hidden, ações por ícone com nome acessível. |
| FAB | Reservar espaço inferior e safe area; não cobrir o último conteúdo. |

Não criar tokens sem uso real nem estilos locais repetidos. Temas e redução de movimento seguem Framework7/preferências do navegador.

## Controles e acessibilidade

- Ações: `f7-button type=button`; submit só no formulário. fill principal, outline secundário; navegação usa link/roteador oficial.
- Assíncrono: loading/disabled, aria-busy/aria-disabled, tabindex adequado e guarda contra reentrada. Na versão fixada, f7-button desabilitado usa classe CSS; manter os atributos acessíveis complementares.
- Inputs: rótulo nativo associado ao input-id; IMask sincronizado com Vue e JustValidate com erros associados por aria-invalid/aria-describedby. Focar o primeiro inválido e remover descrições obsoletas ao corrigir.
- **Inputs, selects e textareas nunca recebem outline retangular**, em focus/focus-visible. Preservar a regra global e o foco próprio Framework7. Botões/links mantêm foco visível; checkbox realça o rótulo.
- Status com texto/role=status; não depender apenas da cor nem manter OK antigo em falha/offline.
- FAB oficial com aria-expanded/aria-controls; ações fechadas inert e fora da tabulação. Espaço aciona, Escape fecha e devolve o foco.
- Diálogos/sheets com identificação, fechamento e foco; feedback por notification/toast oficiais. Limpar instâncias/listeners ao remover páginas.

Push usa cards e ações empilhadas, sem truncar nomes. Chips informativos em lista vertical, sem ação/tabulação; até quatro estados com cores nativas blue/green/red/gray. Estilo compartilhado em app.css. Notificação do sistema é desenhada pelo navegador/SO.

A página `offline.html` é a exceção técnica mínima em HTML, com fonte local e link nativo. Contraste, teclado e aparência exigem navegador real; DOM simulado não certifica acessibilidade. Imagens de regressão visual só se tornam referências após aprovação humana.

## Administrativo

`admin/` usa shadcn-vue (componentes locais em src/components/ui), Reka UI e Tailwind 4 com Preflight. Importação somente em admin/src/main.js → style.css; aliases e gerador JavaScript em components.json/jsconfig.json. Tema neutral/new-york com variáveis CSS próprias, fonte de sistema e layout desktop com adaptação básica. Botões têm foco visível, estados disabled/loading e status com texto. Incorporar componentes oficiais conforme uso real. Nunca importar tokens, CSS ou componentes entre as duas interfaces. Regras visuais Framework7 acima pertencem exclusivamente à PWA.
