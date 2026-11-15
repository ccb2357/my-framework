# Estado da fundação

## Estrutura administrativa — Sprint 1

Entregue: `admin/` Vue/shadcn-vue/Tailwind em JavaScript, Hello Dashboard pública com diagnóstico real, componentes oficiais locais e dependências/build isolados da PWA. Bootstrap prepara e verifica as duas interfaces; central inclui domínio/portas administrativos. Manual contém os dois serviços Node, três volumes e dois sites Nginx. README, sete SDD e plano atualizados.

Preservados: fontes, estilos, dependências e configuração Vite da PWA Framework7; backend Laravel e dados existentes. Apenas o atalho frontend/vite.cmd foi atualizado para o exemplo agnóstico e continua sendo regenerado pelo bootstrap.

Verificado nesta entrega:

- 35 testes Node do bootstrap: contratos e orquestração com Engine/Compose/HTTP explicitamente simulados, incluindo falhas do admin e reexecução.
- 5 testes do admin: configuração pública, publicação, isolamento de artefatos, diagnóstico e renderização inicial SSR.
- 16 testes da PWA; ESLint/Stylelint e builds reais PWA/admin aprovados com Node 22.23.4.
- Trechos Compose gerados aceitos por `docker compose config --quiet`; novo verificador PHP passou em sintaxe/Pint.
- Código do backend inalterado; suíte Laravel/MySQL não repetida neste ambiente.

Pendente: instalação do zero no computador do responsável, seguindo instalacao-pwa-framework.md. Confirmar bootstrap código 0, abertura dos dois domínios, diagnóstico/backend/MySQL e separação visual em navegador. Não houve Docker Engine, Nginx, MySQL, Windows, aparelho ou VPS reais nesta validação.

Próximas etapas: autenticação de clientes (cadastro com acesso imediato, sem confirmação de e-mail), autenticação de um único administrador criado por comando e recuperação de senha separada por e-mail. Não há login administrativo implementado nesta sprint. Compras, assinaturas e permissões para vários administradores ficam fora deste ciclo.
