# Estado da fundação

## Entrega atual — Sprint 4

Recuperação de senha para clientes/admin, com telas independentes e validação compartilhada. Brokers/providers/tabelas separados; token hash/60min/uso único sob transação, reenvio após 60s, quotas por área/IP/e-mail, CSRF e mensagens controladas/genéricas. Conta de teste push não recupera senha. Sem login automático; troca de senha incrementa auth_version e invalida sessões antigas apenas da conta/área alvo.

SMTP centralizado em .env.foundation; TLS obrigatório, sem fallback/log de links/segredos. Sem SMTP_HOST não envia. Testing força array/recuperação desabilitada/senha SMTP vazia. Links usam origens configuradas e fragmento removido do histórico; token/senhas só em memória, nunca rascunho ou cache de API. Sem novas dependências/serviços/worker; bootstrap aplica migration/configuração/builds e preserva contas/chaves.

## Aceite anterior

Responsável confirmou Sprint 2 com testes manuais e 47 testes MySQL/367 assertions. Sprint 3: suíte completa com 55 testes/464 assertions aprovada no MySQL real; login/Dashboard acessados. Isolamento está coberto pela suíte e roteiro manual.

## Verificações desta entrega

- 44 testes PHP sem integração MySQL aprovados (364 assertions), incluindo CSRF sem Origin, quotas, transporte desabilitado, falha SMTP controlada, links e rejeição de versão antiga. Pint aprovado.
- 39 testes PWA e 15 admin aprovados; testes com campos/botões reais, confirmação de senha, fragmento removido, submissão permitida e limpeza dos segredos. Lint e builds reais aprovados; PWA mantém worker/manifest e admin não os inclui.
- 39 testes bootstrap aprovados, incluindo SMTP privado e configuração testing sem senha/envio. Engine/Compose/HTTP de infraestrutura são simulados. Manifests/lockfiles preservados; sete SDD e links locais conferidos.
- Quatro testes MySQL novos entregues para separação/hash/expiração/reuso/reenvio/revogação das sessões nas duas direções; não executados aqui. Nenhum envio SMTP real, Docker/Windows, navegador visual ou aparelho foi homologado nesta entrega.

## Próximo passo

Aplicar pacote e SMTP privado, repetir bootstrap e conferir recebimento/link/login antigo/novo nas duas contas pelo manual; executar suíte completa em MySQL testing. Envio SMTP real não foi executado neste ambiente. Após aceite: Sprint 5, consolidação/testes de isolamento e proteção dos acessos. Comércio/assinaturas/Capacitor fora do ciclo.
