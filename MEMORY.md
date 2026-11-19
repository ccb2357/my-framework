# Memória do projeto

My Framework 2.0.0. Interfaces independentes: PWA Framework7, admin shadcn-vue e website Nuxt SSR, com Laravel/MySQL compartilhados.

Configuração central em `.env.foundation`; campos da PWA com prefixo `PWA_`. Executor `my-framework-bootstrap:0.1.0`. Manual: `instalacao-my-framework.md`. Trechos por ambiente em `.foundation-installation.md`, ignorado pelo Git; bootstrap não altera README/manual versionados.

Validação local: 164 testes, lints e builds das três interfaces aprovados. Dependências preservadas. Instalação do zero e suíte MySQL completa ainda aguardam validação no ambiente do responsável; fundação com `completeFoundation=false`.

Próximo passo: instalar a base em `my-framework` seguindo o manual e registrar somente as evidências e pendências dessa instalação. Preservar dados, chaves e volumes existentes; sem migração automática de identidades antigas.
