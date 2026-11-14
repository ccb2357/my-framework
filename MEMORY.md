# Estado da fundação

**Entrega local concluída e aceita em 14/11/2026.** `pwa-teste` é o repositório oficial da base para iniciar novos projetos; cada aplicação usa identidade e configuração próprias. Instalação/operação no [guia](instalacao-pwa-framework.md); contratos em [docs/sdd/](docs/sdd/). Versões efetivas nos manifests/lockfiles e foundation.json.

## Evidências confirmadas

Instalação do zero pelo responsável no Windows/Docker, projeto pwa-a: Hello, /status, /api/v1/status e /up funcionando, com backend e MySQL acessíveis.

| Verificação enviada pelo responsável | Resultado |
| --- | --- |
| PHP/Laravel com MySQL testing | 35 testes, 260 assertions, sem falhas |
| Bootstrap Node após correção | 31 testes, sem falhas |
| Frontend Vitest | 16 testes em 4 arquivos, sem falhas |
| Pint | 64 arquivos aprovados |

Validações locais anteriores: PWA instalada no Android, offline e atualização preservando campos; push recebido no Chrome e na PWA em segundo plano, clique abrindo o app e cancelamento por preferência desligada/revogação antes do worker.

## Escopo e continuidade

O responsável aceitou uma instalação do zero com os testes enviados e dispensou o roteiro adicional de dois projetos/validação ampliada. Não reintroduzir essa exigência ou instruções históricas de construção. A base está pronta para desenvolvimento dos produtos; login de produção, telas e regras de negócio pertencem a cada aplicação.

VPS/HTTPS público, iOS e outros navegadores não foram homologados. Playwright/regressão visual não compõem as evidências deste aceite; testes Node simulam Engine/Compose/HTTP. Não apresentar simulações como validação de produção ou entrega real de push.

Configuração manual somente em .env.foundation; preservar APP_KEY/VAPID, dados e volumes. Antes de analisar infraestrutura compartilhada, solicitar arquivos atuais necessários, sem segredos. Não copiar configuração privada de outro projeto. Atualizar este resumo apenas com mudanças e evidências relevantes, sem histórico de conversa ou comandos duplicados.
