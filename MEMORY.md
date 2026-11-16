# Estado da fundação

## Entrega atual — Sprint 1.1

`shared/forms/` centraliza mensagens pt-BR JSON, máscaras, regras e o ciclo neutro da validação. PWA e admin usam IMask 7.6.1/JustValidate 4.3.0, com dependências/volumes/builds e visuais próprios. A demonstração Framework7 foi migrada sem alterar seu CSS; o admin recebeu formulário demonstrativo com Input/Label/Button oficiais shadcn-vue. Nenhum formulário envia ou grava dados.

Os dois serviços Node e os contêineres temporários recebem shared em /shared somente leitura. O Vite restringe fs.allow à aplicação e shared; ambos os hashes de build incluem shared/forms. Manifests npm têm versões exatas, lockfiles coerentes, save-exact e instalação por npm ci. Nenhuma dependência existente mudou de versão. Jsdom 26.1.0 foi acrescentado somente para testes DOM. Node/imagens Docker mantêm a compatibilidade atual, sem promessa de versão exata de runtime.

## Verificações

- 37 testes Node do bootstrap: contratos/Engine/Compose/HTTP simulados, incluindo mounts shared, reexecução, falhas e coerência de versões/lockfiles.
- 19 testes PWA e 8 do admin aprovados, incluindo bibliotecas reais em DOM simulado, mensagens comuns, correção, acessibilidade, limpeza, Input Vue com máscara e mudança do hash ao editar shared.
- npm ci e npm run check aprovados nas duas aplicações: lint local/compartilhado, testes e builds reais. PWA segue com manifest/worker; admin sem recursos PWA.
- HTTP real do Vite neste ambiente: arquivos da aplicação/shared retornaram 200; arquivo do backend fora de fs.allow retornou 403 em ambos os serviços.
- Trechos Compose gerados passaram em docker compose config --quiet. Backend e CSS Framework7 preservados. Não foi repetida a suíte Laravel/MySQL, pois o backend não mudou.

## Instalação e próximo passo

Sprint 1: responsável informou abertura dos cinco endereços locais (PWA, admin, status HTML/JSON e up). Sprint 1.1: ainda falta aplicar o mount shared nos dois serviços Node, repetir o bootstrap e conferir os formulários no computador do responsável, conforme instalacao-pwa-framework.md. Os testes desta entrega não comprovam Docker Engine, Windows, Nginx/MySQL, navegador visual, aparelho ou VPS reais.

Depois do aceite: Sprint 2, cadastro/login/logout de clientes com acesso imediato, sem confirmação de e-mail. Admin continua público nesta etapa; login administrativo e recuperação separados seguem o plano. Capacitor/app nativo, compras e assinaturas permanecem fora do escopo.
