# Website — plano de implementação

Objetivo: website institucional/loja em Nuxt, PWA Framework7 e admin shadcn-vue independentes, com Laravel/MySQL central. JavaScript, versões diretas exatas e configuração apenas no `.env.foundation`.

| Sprint | Entrega | Aceite |
| --- | --- | --- |
| 1 — Estrutura | `website/`, Nuxt SSR, Tailwind/shadcn-vue/Lucide, Hello, serviço Node e domínio próprio. | Hello renderizada pelo servidor; PWA/admin preservados; bootstrap e builds conferidos. |
| 2 — Formulários | IMask/JustValidate próprios no website, usando `shared/forms/`. | Mesmas mensagens/máscaras/regras, sem compartilhar layout ou CSS. |
| 3 — Autenticação | Cadastro, login/logout, recuperação e área protegida; sessão integrada website/PWA. | Cadastro com acesso imediato; entrar/sair refletido nas duas interfaces; admin isolado. |
| 4 — Conteúdo dinâmico | Comunicação Nuxt/Laravel, exemplo público dinâmico, loading/erros/cache. | Alteração no backend aparece sem build; dados privados não entram em cache público. |
| 5 — Instalação/produção | Consolidar central, bootstrap, runtime SSR, Nginx/HTTPS e operação. | Roteiro único de instalação e atualização local/VPS. |
| 6 — Validação | Instalação limpa pelo manual e jornadas das três interfaces. | Registrar resultados reais e limites; revisar documentação final. |

Toda sprint atualiza README, SDD pertinente, manual conciso e MEMORY. Catálogo, banners, carrinho, checkout, pagamentos, pedidos e assinaturas pertencem ao produto derivado; não são entregues neste ciclo.

## Estado

Sprints 1 e 2 validadas pelo responsável no Windows. Sprint 3 implementada: cadastro/login/logout/recuperação e conta SSR, sessão integrada website/PWA, admin isolado; aceite Windows pendente. Sprints 4–6 pendentes. Evidências e limites em MEMORY.md.
