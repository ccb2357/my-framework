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

Sprint 1 implementada; build SSR e testes automatizados locais registrados em MEMORY. Instalação real no Docker/Windows e domínio ainda dependem da validação do responsável. Sprints 2–6 pendentes. Nenhuma autenticação foi alterada nesta etapa.
