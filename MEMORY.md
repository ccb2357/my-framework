# Estado da fundação

## Entrega atual — Sprint 2

PWA com cadastro público, login, logout e Minha conta protegida; acesso imediato sem confirmação de e-mail. Hello e demonstrações preservadas. Conta de teste push não autentica pelo login de clientes. Admin permanece com Hello pública; autenticação administrativa e recuperação pertencem às próximas etapas.

Backend usa sessão web, CSRF, rotação de sessão/token, restrição de host/origem, limites independentes e respostas privadas/controladas. Senhas são hash; campos privilegiados são ignorados. Logout invalida sessão e revoga somente o vínculo push atual. Identidade fica em memória; formulários de acesso bloqueiam atualização e não persistem credenciais. Mensagens/limites reutilizam shared/forms, sem compartilhar layout/CSS.

Nenhuma dependência ou infraestrutura nova. Versões exatas e lockfiles preservados. Bootstrap publica o código e limpa caches pela operação existente.

## Evidências desta entrega

- 35 testes PHP sem integração MySQL: 271 assertions; sessão/CSRF, contexto, validação, rate limits e regressões push/status. Pint aprovado.
- 35 testes PWA e 8 admin aprovados, com JustValidate real em DOM simulado e renderização dos componentes oficiais Framework7.
- Lint e builds reais das duas interfaces aprovados; PWA com manifest/worker e admin sem recursos PWA.
- 37 testes bootstrap aprovados; Engine/Compose/HTTP são simulados.
- Cinco testes novos de persistência/autenticação MySQL entregues, não executados neste ambiente. TestingDatabaseGuard preservado; nenhum SQLite substitui a integração.

## Correção após uso local

Links de conta/retorno usam anchors oficiais Framework7: type=button removia href e impedia navegação. Teste de renderização agora confere os links reais para entrar, cadastrar, conta e Hello. No Vite dev, push informa uso pelo build e não consulta APIs protegidas; teste cobre montagem/atualização/eventos. Favicon explícito evita a consulta ausente a favicon.ico. Lint, 33 testes PWA e build/check:pwa aprovados após a correção. Uma resposta 401 de auth/me antes do login continua sendo esperada e tratada como visitante.

Mensagens de cadastro/login movidas para o slot info, dentro de item-input-wrap, abaixo dos campos; antes estavam fora de item-inner. Dois testes adicionais montam componentes/roteador reais em DOM simulado, clicam no submit vazio e conferem mensagens e aria-invalid. Após a correção: 35 testes PWA, lint e build/check:pwa aprovados. Pacotes não incluem mais os vite.cmd derivados por ambiente; o bootstrap os gera, preservando os atalhos existentes ao extrair atualizações.

## Aceite e próximo passo

Responsável confirmou instalação dos cinco endereços na Sprint 1 e validou a Sprint 1.1 localmente. Para aceitar a Sprint 2: repetir o bootstrap, aplicar a atualização da PWA, conferir cadastro/recarregamento/logout/login e executar a suíte completa no MySQL testing conforme instalacao-pwa-framework.md. Não houve validação visual em navegador real, Windows/Docker, aparelho ou VPS nesta entrega.

Após esse aceite: Sprint 3, conta administrativa separada por comando, login/logout e Hello Dashboard protegida. Recuperação por e-mail na Sprint 4. Compras, assinaturas e Capacitor continuam fora deste ciclo.
