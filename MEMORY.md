# Estado da fundação

## Entrega atual — Sprint 3

Login/logout administrativos e Hello Dashboard protegida em admin/, com controles shadcn-vue existentes e validação compartilhada. Conta única em administrators/ID 1, guard admin/provider próprio; admin:create solicita senha oculta/confirmada e recusa repetição sem sobrescrever dados. Sem cadastro administrativo público, senha fixa, recuperação ou novos perfis.

Host/origens limitados ao admin; cookie de sessão com sufixo _admin, CSRF XSRF-ADMIN-TOKEN e armazenamento separado. Configuração/bindings restaurados após o pipeline administrativo. Sessão de cliente não autentica admin e vice-versa; logout não afeta a outra sessão nem dispositivos push de clientes. UI só monta Dashboard após checagem real, sem persistir senha/token/identidade. Admin continua sem PWA/Framework7/push.

Bootstrap deriva contexto administrativo, aplica migrations e publica builds; não cria conta automaticamente. Sem mudança de dependências/lockfiles, serviços ou blocos Nginx. Vite.cmd gerados pelo ambiente não integram o pacote de atualização. Manual concentra instalação/criação/validação.

## Aceite anterior

Responsável validou instalação e Sprint 1.1. Sprint 2: cadastro/login/logout, redirecionamento, limites e validação testados localmente; suíte real MySQL com 47 testes/367 assertions aprovada. Correções de navegação/posição dos erros incluídas.

## Verificações atuais

- 39 testes PHP sem integração MySQL aprovados, 329 assertions; cookies/CSRF reais, providers de contas simulados e regressões anteriores. Pint aprovado e verify-admin.php com sintaxe válida.
- 13 testes admin e 35 PWA aprovados; validação com JustValidate/componentes oficiais em DOM simulado, sessão, respostas controladas e Dashboard oculta antes de verificar acesso.
- Lint/builds reais das duas interfaces aprovados; check:pwa válido, build administrativo sem Framework7/worker/manifest.
- 38 testes bootstrap aprovados; Engine/Compose/HTTP de infraestrutura simulados. Contexto administrativo derivado sem admitir portas da PWA. Sete SDD e links locais conferidos; manifests/lockfiles preservados.
- Quatro testes MySQL novos entregues para comando/senha/conta única e sessões reais separadas; não executados aqui. TestingDatabaseGuard preservado. Sem homologação visual em navegador real, Windows/Docker, aparelhos ou VPS nesta entrega.

## Próximo passo

Aplicar o pacote, repetir bootstrap, criar administrador e seguir o manual para login/logout e sessões simultâneas. Executar suíte completa em MySQL testing; testes HTTP com providers simulados não substituem persistência real. Após esse aceite: Sprint 4, recuperação de senha por e-mail para clientes/admin. Compras, assinaturas e Capacitor permanecem fora deste ciclo.
