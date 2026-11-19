# Regras obrigatórias

## Documentação oficial, stack e linguagem

- **NÃO ADIVINHAR O FUNCIONAMENTO DA STACK.
- Ao menor sinal de dúvida sobre qualquer ferramenta, SEMPRE consultar sua documentação oficial antes de escrever código ou responder.**

- Cumprir a stack e versões aprovadas no README; verificar exports, engines e peerDependencies.
- Apresentar incompatibilidades antes de substituir tecnologias ou acrescentar bibliotecas.

- Usar JavaScript, SFC/Composition API/script setup, roteador Framework7 Vue e branch master.
- Não adicionar React ou TypeScript.
- O roteador Framework7 pertence somente à PWA.

## Infraestrutura compartilhada

- Docker executa PHP/Composer e Node/npm.
- Reutilizar Compose, rede, Nginx, PHP-FPM e MySQL existentes.
- Não criar uma segunda pilha nem iniciar indiscriminadamente o perfil dev.
- Mudanças na infraestrutura são preparadas para aplicação manual.

- Não manter a pasta docs/referencias/infra nem cópias dos arquivos da infraestrutura compartilhada dentro do projeto, mesmo sanitizadas.
- Ao iniciar ou retomar análise/alteração de infraestrutura, solicitar ao responsável os arquivos atuais necessários (Compose, Dockerfile PHP-FPM, Nginx e php.ini), com segredos removidos.
- O SDD e MEMORY registram contratos e evidências históricas, não substituem esses arquivos atuais.
- Arquivos atuais já enviados na mesma sessão podem ser reutilizados enquanto não houver indicação de mudança.
- Os blocos de integração próprios da aplicação continuam centralizados em instalacao-my-framework.md.

## Configuração, segredos e proteção de dados

- Centralizar valores compartilhados em .env.foundation privado.
- Versionar o exemplo, não valores reais, APP_KEY, estado ou arquivos derivados privados.
- Não pedir senhas no chat.
- Nunca publicar configurações centrais completas.

- Usar a conta MySQL informada.
- Não criar usuários, senhas ou grants; criar somente bancos ausentes quando permitido.
- Testes destrutivos exigem ambiente testing e banco exclusivo efetivamente conferidos; bloqueados em produção.

## Bootstrap e operações permitidas

- Bootstrap obrigatório em Node/Docker; não depender de runtimes do host nem do serviço Node do produto para iniciar.
- Clones não recriam Laravel/Vite nem repetem sprints.
- Preservar identidade Compose e mapear caminhos internos para o host do daemon.

- Preservar dados, volumes, APP_KEY válida e personalizações. --force autoriza somente migrations em produção. app:sync limita-se a optimize:clear seguido de migrations, com falhas propagadas.

- Bootstrap autorizado a iniciar/recriar exclusivamente o serviço website já declarado/validado no Compose, depois de compilar e apenas quando o HTTP não mostrar o build esperado.
- Preservar identidade Compose, binds do host e volumes; usar --no-deps, sem build de imagens, sem alterar PHP/Nginx/MySQL ou subir perfis inteiros.
- Conferir HTTP com espera limitada antes de anunciar sucesso.
- Configuração da infraestrutura continua manual.

## Design system e acessibilidade

- Toda tela e todo componente seguem [o design system](docs/sdd/02-design-system.md).
- Framework7 Vue fornece controles, navegação e grid responsivo; tokens e CSS compartilhado definem os layouts.
- Usar Nunito local e ícones oficiais/Lucide.
- Novas telas e alterações globais seguem aprovação visual; Hello nativa já está autorizada.

- Ações usam f7-button type=button (submit só quando necessário); links de navegação preservam o roteador.
- Associar rótulos/erros aos inputs e manter foco visível, semântica disabled/loading e teclado.
- Layouts reutilizam app-content e classes/tokens compartilhados.
- Novos valores e exceções exigem uso real, documentação no design system e aprovação quando mudarem o visual global.

- Regra visual aprovada: inputs, selects e textareas sem outline retangular de foco.
- Usar a regra global de app.css e o estado próprio do Framework7; não reintroduzir anéis/contornos nesses campos em CSS local ou compartilhado.

## PWA e publicação

- PWA usa injectManifest/worker único e atualização prompt.
- Cache somente público; APIs/sessão/CSRF/diagnóstico nunca recebem fallback HTML/offline.
- Formulário alterado bloqueia recarga externa; atualização confirmada preserva campos ou mantém a aba em falha.
- Instalação só por ação explícita/menu.
- Validar build antes de publicar e assets antes do HTML/worker.

## Admin e autenticação

- Admin obrigatório em admin/, com Vue/shadcn-vue/Tailwind e build próprio.
- Proibido importar componentes/CSS/dependências de Framework7 no admin ou shadcn-vue/Tailwind na PWA.
- Rotas/domínios separados; mesmo backend/banco.
- Admin não registra manifest/service worker.
- Catálogo shadcn é incorporado ao código conforme necessidade, sem antecipar componentes não usados.

- A fundação entrega autenticações separadas: clientes com cadastro e acesso imediato; um administrador criado por comando; recuperação de senha por e-mail para ambos.
- Não implementar compras, assinaturas ou perfis administrativos adicionais neste ciclo.

## Website e conteúdo público

- Website autorizado em website/: Nuxt SSR + Tailwind + shadcn-vue JavaScript e Lucide, dependências/componentes/CSS próprios, sem Framework7 nem recursos PWA.
- Serviço Node permanente atrás do Nginx.
- Configuração somente por whitelist gerada pelo bootstrap; nunca ler o central privado no Nuxt.
- Não alterar domínios/sessões existentes automaticamente.
- Formulários das três interfaces reutilizam shared/forms com dependências próprias.
- Bibliotecas DOM do website inicializam somente após onMounted e são descartadas ao desmontar.
- Website/PWA compartilham sessão de cliente e broker de recuperação, mantendo admin isolado; cookie e CSRF próprios, whitelist de hosts/origens e verificação SSR sem cache privado.

- Conteúdo público do website: endpoint explícito e anônimo em routes/website.php/WebsitePublicContext, sem sessão/cookies.
- Bridge Nuxt encaminha somente a URL/Host fixos, sem credenciais ou Set-Cookie, e aplica whitelist/validação ao recurso.
- SSR/useFetch reutiliza apenas o payload de hidratação; manter no-store, ocultar dado anterior durante erro/carregamento e não cachear sessão/conta.
- O comando website:content altera somente o exemplo público, sem build.
- Não transformar o exemplo em catálogo/editor de negócio neste ciclo.

## Formulários compartilhados e dependências

- Compartilhar somente lógica neutra em shared/forms/; mensagens JSON, máscaras, regras e ciclo de validação.
- Nunca colocar CSS/componentes F7/shadcn nessa pasta nem reutilizar node_modules entre serviços.
- Dependências diretas npm exatas, lockfiles versionados e instalação com npm ci; mudanças de versão exigem testes/builds.
- A faixa Node/imagens Docker não se torna fixa por fixar pacotes npm.

## Documentação e continuidade

- Centralizar o roteiro operacional e todos os trechos de integração Compose/Nginx em instalacao-my-framework.md na raiz; não voltar a espalhar instruções por arquivos avulsos.
- Documentação faz parte da entrega: consultar fonte responsável antes de editar, atualizar o SDD pertinente e registrar verificações/decisões/pendências no MEMORY.
- Revisar coerência com o diff e links locais.
- Exatamente sete documentos iniciais no SDD; sem changelog, decisões ou sprints adicionais nessa pasta.

- Transferir código, manifests/lockfiles, exemplos sem segredos e referências aprovadas juntos.
- Outra IA deve continuar sem histórico; não criar documento de passagem paralelo.

- README/manual versionados são somente leitura para o bootstrap.
- Trechos e resumo por ambiente ficam no derivado .foundation-installation.md, ignorado pelo Git e excluído de pacotes.
- Manter o manual como fonte editorial única e não versionar atalhos gerados.

## Validação e evidências

- Não anunciar instalação, build, aparelho, HTTPS ou aceite sem evidência.
- Referências declaradas não comprovam mounts nem contêineres ativos.

- Validação final por instalação do zero e evidências reais.
- Não exigir clones A/B nem aprovar referências visuais automaticamente.
