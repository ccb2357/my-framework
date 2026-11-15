# Plano de implementação — Admin e autenticação

## Objetivo

Ampliar o PWA Framework com uma interface administrativa e autenticações independentes para clientes e administradores, mantendo a base reutilizável. As entregas e verificações estão registradas em MEMORY.md.

## Decisões de arquitetura

- Um projeto/repositório, um backend Laravel e banco de dados compartilhado.
- `frontend/`: PWA Framework7 Vue existente, no domínio principal, por exemplo `dominio.com.br`.
- `admin/`: Vue + shadcn-vue + Tailwind, no subdomínio administrativo, por exemplo `admin.dominio.com.br`. Desktop prioritário; suporte básico no celular.
- **Nunca misturar Framework7 e shadcn-vue na mesma tela.** Entradas, componentes, CSS, dependências e builds separados; cada domínio carrega apenas sua interface. Manter JavaScript.
- Administrativo sempre incluído na fundação, sem opção para desabilitá-lo.
- Manifest, service worker, instalação e offline exclusivos da PWA. Push existente permanece opcional, sem ferramenta de envio no admin.
- Contas de clientes e administradores separadas, com sessões/cookies, autenticação e permissões independentes no Laravel.
- Clientes podem criar suas próprias contas e acessar imediatamente, sem confirmação de e-mail. Haverá somente um administrador, criado por comando, sem cadastro público.
- Recuperação de senha por e-mail para ambas as interfaces.
- Configuração manual centralizada em `.env.foundation`, incluindo domínios, portas e envio de e-mail. Derivados internos gerados pelo bootstrap.
- Reutilizar a infraestrutura compartilhada. Preparar dois blocos Nginx, sem criar outra pilha; aplicação manual das alterações pelo responsável.
- Preservar as telas, os estilos e os recursos existentes da PWA. Acrescentar as telas Framework7 necessárias à autenticação.

## Sprint 1 — Estrutura administrativa e integração

- Criar `admin/` com Vue, shadcn-vue e Tailwind, mantendo JavaScript.
- Separar dependências, componentes, CSS, configuração Vite e build de `frontend/`.
- Acrescentar domínio e portas administrativas ao `.env.foundation`.
- Adaptar bootstrap e preparar os dois blocos Nginx e a integração Node no Compose compartilhado.
- Manter manifest, service worker e push exclusivamente na PWA.

**Aceite:** PWA e admin abrem em seus endereços; cada um carrega somente seus próprios componentes e estilos.

## Sprint 2 — Autenticação dos clientes

- Implementar cadastro público, login e logout na PWA com componentes Framework7.
- Preparar uma página inicial simples após autenticar; cadastro libera acesso sem confirmação de e-mail.
- Implementar validação, sessão, CSRF e limitação de tentativas.
- Preservar a Hello demonstrativa e os recursos existentes da PWA.

**Aceite:** cliente consegue criar conta, entrar, acessar a área protegida e sair.

## Sprint 3 — Autenticação administrativa

- Criar contas administrativas separadas das contas de clientes.
- Configurar guard/provider, rotas e proteção administrativa.
- Criar comando para cadastrar o primeiro administrador, sem senha fixa.
- Implementar login, logout e uma Hello Dashboard simples.
- Manter sessões e cookies independentes entre PWA e admin.

**Aceite:** administrador acessa o painel; login do cliente não concede acesso administrativo. Sair de uma interface não encerra a outra.

## Sprint 4 — Recuperação de senha por e-mail

- Centralizar a configuração de envio no `.env.foundation`.
- Implementar solicitação e redefinição de senha nas duas interfaces.
- Separar os fluxos e tokens de clientes e administradores.
- Aplicar expiração, uso único e limitação de solicitações.

**Aceite:** cada conta recupera sua senha pelo endereço correto; um fluxo não redefine a senha do outro.

## Sprint 5 — Isolamento e proteção dos acessos

- Verificar separação de guard/provider, sessões, cookies, tokens e rotas entre os dois acessos.
- Impedir que cadastro/login/recuperação do cliente concedam acesso administrativo.
- Testar CSRF, autorização e limites de tentativas, inclusive chamadas diretas à API.
- Preservar o módulo push e a compatibilidade da PWA.

**Aceite:** cada sessão acessa somente sua área; sair ou recuperar senha de uma não autentica nem encerra a outra.

## Sprint 6 — Instalação completa e fechamento

- Validar uma instalação do zero seguindo o manual.
- Conferir bootstrap, dois domínios, builds, autenticações, recuperação e isolamento.
- Executar os testes e verificar regressões da PWA existente.
- Conferir o uso básico do admin no celular, priorizando desktop.
- Atualizar README, SDD e manual com o funcionamento final.

**Aceite:** a instalação documentada entrega PWA e administrativo funcionais, sem configuração manual fora do `.env.foundation`, além das integrações de infraestrutura previstas no guia.

## Entrega e continuidade

Cada sprint entrega código, documentação enxuta e testes correspondentes. Comandos e trechos de instalação permanecem em `instalacao-pwa-framework.md`; contratos no SDD; evidências e próximo passo em `MEMORY.md`. Antes de analisar ou alterar infraestrutura, solicitar os arquivos atuais necessários, sem segredos. Não apresentar uma etapa planejada como implementada ou validada.

## Fora deste ciclo

Catálogo, tarot, compras avulsas, assinaturas, pagamentos e liberação de recursos por plano pertencem aos aplicativos derivados. Não antecipar essas funcionalidades na fundação. O módulo push existente permanece opcional e sem ferramenta de envio no administrativo.
