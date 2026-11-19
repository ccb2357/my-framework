# Visão

My Framework é uma base reutilizável para criar **websites, aplicativos PWA e painéis administrativos** em um único projeto. As três interfaces têm entradas, domínios, componentes, estilos e builds próprios, com Laravel e MySQL compartilhados.

| Interface | Stack e finalidade |
| --- | --- |
| PWA — `pwa/` | Vue 3, Framework7 Vue e Vite; aplicativo instalável, shell offline e atualização confirmada pelo usuário. |
| Website — `website/` | Nuxt SSR, Vue, Tailwind e shadcn-vue; páginas públicas com HTML renderizado no servidor e área do cliente. Usa um serviço Node permanente atrás do Nginx, sem instalação PWA. |
| Admin — `admin/` | Vue, Vite, Tailwind e shadcn-vue; painel administrativo protegido, sem recursos PWA. |

A interface é definida pelo endereço acessado. Framework7 e shadcn-vue não se misturam na mesma tela. Mensagens, máscaras e regras de formulários são compartilhadas em `shared/forms/`, sem compartilhar layouts ou CSS. Cada interface mantém suas próprias dependências.

## Contas e acesso

PWA e website compartilham a conta e a sessão do cliente: cadastro público com acesso imediato, login/logout, recuperação de senha e área protegida. Não exigem confirmação de e-mail.

O admin usa conta, sessão e autenticação independentes. A base entrega um administrador criado por comando e uma Hello Dashboard protegida, sem cadastro administrativo público. A recuperação de senha usa SMTP, com tokens separados entre clientes e administrador, sem login automático após redefinir a senha.

## Entrega e limites

Inclui bootstrap Docker, configuração central em `.env.foundation`, diagnóstico do backend/banco, telas Hello, formulários demonstrativos, conteúdo público dinâmico no website e testes. O exemplo de conteúdo usa MySQL e aparece na próxima consulta sem reconstruir o website. O offline da PWA cobre a interface estática; API, sessão e banco exigem conexão.

Catálogo, carrinho, checkout, pedidos, assinaturas, editor de conteúdo, integrações comerciais e sincronização offline de registros pertencem ao produto construído sobre a base. Os formulários demonstrativos não gravam dados de negócio.

Instalação e operação: [manual da raiz](../../instalacao-my-framework.md). Versões efetivas: manifests, lockfiles e `foundation.json`. Os documentos SDD descrevem os contratos atuais; validação em Docker, navegador, aparelho e produção depende do ambiente correspondente.
