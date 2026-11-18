# Memória do projeto

Base: PWA Framework 1.1.0-website.2. Interfaces: pwa/ (Framework7), admin/ (shadcn-vue) e website/ (Nuxt SSR). Serviços/volumes/bancos preservados após a renomeação da PWA. Responsável confirmou bootstrap e website via Nginx no Windows; VPS/HTTPS não validados.

Website usa Node 22 Debian; bootstrap compila, ativa somente seu serviço quando necessário e confere HTTP. Dev usa polling de 300 ms; confirmação específica do HMR no Windows permanece pendente.

Sprint 2: IMask 7.6.1/JustValidate 4.3.0 próprios no website, DemoForm com componentes locais e lógica de shared/forms. Inicialização DOM após montagem, cancelamento/descarte ao sair e nenhum envio/persistência. Shared montado somente leitura no website; hash do build inclui forms. Configuração central continua única. Validação local: npm ci e árvore de dependências consistentes; build Nuxt SSR; 3 testes SSR/publicação e 3 testes DOM do website; 44 testes do bootstrap (Engine/HTTP simulados), 37 da PWA e 18 do admin aprovados. Ainda falta o aceite do formulário no Docker/Windows; nenhuma migração ou autenticação foi alterada.

Próximo passo: validar formulário vazio/inválido/válido e navegação no Windows. Sprint 3 fará autenticação integrada website/PWA, mantendo admin isolado.
