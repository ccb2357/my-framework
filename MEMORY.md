# Memória do projeto

Base: PWA Framework 1.1.0-website.1. Website Nuxt SSR/Hello, Tailwind/shadcn-vue/Lucide próprios; PWA/admin e autenticação preservados. Plano em sprints-website.md.

Build Alpine falhou no parser Rollup/Nitro; website passou a Node 22 Debian em build/runtime, com reinstalação dos módulos nativos. Responsável confirmou funcionamento local após ativação manual. Nuxt descobre somente componentes .vue.

Bootstrap agora ativa exclusivamente o website quando o build esperado não está acessível e aguarda HTTP na mesma execução. Mantém Compose/Nginx manuais e preserva os demais serviços. Validação: 43 testes do bootstrap com Engine/HTTP simulados, Pint do verificador PHP e merge de binds Windows/Linux no Compose real aprovados; ativação automática Docker/Windows ainda depende de confirmação real.

Responsável confirmou o bootstrap concluído e o website servido pelo Nginx após alinhar WEBSITE_LOCAL_DOMAIN; desenvolvimento usa nuxt.cmd dev/5184, domínio usa o build.

Diretório da PWA renomeado de frontend/ para pwa/. Caminhos de bootstrap, build, Nginx/Compose, ignore, verificações e documentação atualizados; serviços, volumes, bancos, domínios e identidade de estado preservados. Renomeação validada localmente com lint, 37 testes/build PWA, 43 testes do bootstrap e sintaxe/Pint do verificador PHP. Migração Docker/Windows ainda precisa de confirmação real.

Próximo passo: aplicar os caminhos novos na infraestrutura e seguir a Sprint 2 de formulários. Login integrado somente na Sprint 3; VPS/HTTPS não validados.
