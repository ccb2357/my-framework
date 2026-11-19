# Visão

PWA Framework é uma base reutilizável para iniciar aplicações independentes com Vue 3, Framework7 Vue, Vite, Laravel, MySQL, PWA e um admin Vue/shadcn-vue/Tailwind independente. Cada novo projeto recebe o código pronto e configura seu próprio `.env.foundation`.

Inclui bootstrap Docker, backend/status, Hello demonstrativa, design system, build/offline/atualização e testes. Clientes têm cadastro/login/logout e acesso imediato à área protegida, sem confirmação de e-mail. Admin tem login/logout, Hello Dashboard protegida e uma conta criada por comando. Sessões e contas são independentes; ambos têm recuperação de senha por SMTP com tokens separados e sem login automático. Regras de negócio, dados do formulário, sincronização offline de registros e integrações comerciais pertencem ao produto criado sobre a base.

Instalação e operação: [guia da raiz](../../instalacao-pwa-framework.md). Versões: manifests/lockfiles e `foundation.json`. Aceite e limites comprovados: [MEMORY.md](../../MEMORY.md). Os documentos SDD descrevem os contratos atuais, sem histórico de construção.

## Website

Website independente em `website/`: Nuxt 4.6.4, Vue, Tailwind, shadcn-vue e Lucide; Hello pública com SSR, sem instalação/offline. Compartilha Laravel/MySQL, não componentes/CSS. O website usa domínio próprio e servidor Node permanente; PWA/admin mantêm seus builds atuais. Formulários reutilizam `shared/forms/` com visuais próprios. Cadastro/login/logout, recuperação e área protegida estão disponíveis no website com a mesma conta/sessão da PWA; admin permanece separado. Inclui exemplo público dinâmico no MySQL, consultado por SSR e atualizado sem build. Loja e conteúdo comercial pertencem ao produto. Plano em [sprints-website.md](../../sprints-website.md).
