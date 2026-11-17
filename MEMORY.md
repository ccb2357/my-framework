# Estado da fundação

## Entrega atual

PWA Framework7 e admin shadcn-vue com autenticações independentes, recuperação por SMTP, formulários neutros compartilhados e Lucide 1.72.0 nas duas interfaces. Instalação/offline/atualização permanecem na PWA; configuração manual somente em .env.foundation.

Módulo descontinuado removido das APIs, UI, worker, bootstrap, dependências, exemplos e documentação por decisão do responsável. Uma migration histórica limpa somente estruturas, fila e contas de teste exclusivas, preservando clientes/admin e demais filas. Em instalação nova, não cria essas estruturas. Limpeza irreversível; dados removidos só retornam com backup anterior.

## Evidências

- Antes da remoção, responsável aprovou a suíte real MySQL: 71 testes, 627 assertions; recebimento de recuperação de senha confirmado nas duas interfaces.
- Após remoção: 36 testes PHP sem MySQL/246 assertions, 37 PWA, 18 admin e 38 bootstrap aprovados; Pint, lints e builds aprovados. Oito pacotes PHP exclusivos retirados sem atualizar os demais; manifests/lockfiles npm preservados.
- Limpeza transitória validada em pasta temporária: 35 arquivos retirados, campos antigos removidos dos envs, APP_KEY/SMTP preservados, script autoexcluído. Os nomes legados existem somente na migration, em seu teste de upgrade e nesse utilitário descartável.
- Migration/teste de atualização entregues para MySQL testing, não executados aqui. Engine/Compose são simulados, DOM não equivale a navegador/aparelho. SMTP permanece síncrono; resposta genérica não garante tempo uniforme. Sem homologação Docker/Windows/VPS nesta entrega.

## Próximo passo

Aplicar o pacote, executar uma vez a limpeza transitória e repetir bootstrap; aceitar atualização da PWA. Executar suíte completa no MySQL testing e conferir login/logout/recuperação nas duas interfaces. Depois, Sprint 6: instalação completa pelo manual e fechamento. Compras, assinaturas, múltiplos administradores e Capacitor fora do ciclo.
