# Instalação — PWA Framework

**Pasta antiga:** se ainda usa `frontend/`, pare o Vite e renomeie `frontend` para `pwa` antes de extrair esta atualização. Ajuste o bind Node e o `root` Nginx da PWA conforme a etapa 2, valide/recarregue o Nginx e repita o bootstrap. Preserve serviços, volumes e `.foundation-state.json`.

## 1. Preparar a pasta e a configuração

Os exemplos usam `meu-projeto` em `C:\var\www` (Windows) ou `/var/www` (Linux), com a pasta `infra` ao lado. Substitua nomes, caminhos, portas e rede pelos valores do seu `.env.foundation` e da infraestrutura.

**Compose no Windows e Linux:** mantenha `infra/docker-compose.yml` e a pasta do projeto lado a lado. Os binds Node usam `../meu-projeto/pwa`, `../meu-projeto/admin`, `../meu-projeto/website` e `../meu-projeto/shared`, relativos à pasta do Compose; o mesmo trecho funciona nos dois sistemas. Cada serviço mantém seu volume exclusivo em `/app/node_modules`; `/shared` é somente leitura. Os caminhos internos `/var/www/...` do PHP/Nginx permanecem iguais. No executor, `source=..` é relativo à pasta atual do terminal: execute sempre dentro de `infra` para montar a pasta que contém os projetos.

Extraia o pacote na pasta escolhida, sem criar outra pasta de projeto dentro dela. Preserve arquivos privados e volumes existentes. O pacote não contém vendor, node_modules, .env preenchidos ou APP_KEY.

Prepare o arquivo de configuração central **manualmente**:

   - Abra a pasta `C:\var\www\meu-projeto` no Explorador de Arquivos.
   - Se `.env.foundation` ainda não existir, copie o arquivo `.env.foundation.example` nessa mesma pasta e renomeie a cópia para `.env.foundation`, sem acrescentar `.txt` ao nome.
   - Se `.env.foundation` já existir, mantenha o arquivo atual; não o substitua pelo exemplo.
   - Abra `.env.foundation` no VSCode ou em outro editor de texto, confira os campos e salve as alterações.

Os exemplos deste guia usam:

| Interface | Domínio local | Dev | Prévia |
| --- | --- | --- | --- |
| PWA | meu-projeto.localhost | 5180 | 5181 |
| Admin | admin.meu-projeto.localhost | 5182 | 5183 |
| Website | website.meu-projeto.localhost | 5184 | — |

**Ambiente local — seu computador:**

- `APP_ENV=local`.
- `PROJECT_SLUG`: mesmo nome da pasta do projeto, por exemplo `meu-projeto`.
- `LOCAL_DOMAIN`: domínio local da PWA, por exemplo `meu-projeto.localhost`.
- `ADMIN_LOCAL_DOMAIN`: deixe vazio para usar `admin.meu-projeto.localhost` automaticamente.
- `WEBSITE_LOCAL_DOMAIN`: domínio do website, por exemplo `website.meu-projeto.localhost`.
- `CLIENT_SESSION_DOMAIN`: deixe vazio para derivar o domínio comum da PWA e do website.
- `PRODUCTION_URL`, `ADMIN_PRODUCTION_URL` e `WEBSITE_PRODUCTION_URL`: vazios no ambiente local.

**Portas locais:**

- `DEV_PORT` e `PREVIEW_PORT`: desenvolvimento e prévia da PWA.
- `ADMIN_DEV_PORT` e `ADMIN_PREVIEW_PORT`: desenvolvimento e prévia do admin.
- `WEBSITE_DEV_PORT`: desenvolvimento do website (5184).
- As cinco portas devem ser diferentes e estar livres.

**Produção — na VPS:**

- `APP_ENV=production`.
- `PRODUCTION_URL`: endereço HTTPS real da PWA, por exemplo `https://app.meu-dominio.com.br`.
- `ADMIN_PRODUCTION_URL`: endereço HTTPS do admin, por exemplo `https://admin.meu-dominio.com.br`.
- `WEBSITE_PRODUCTION_URL`: endereço HTTPS do website, por exemplo `https://meu-dominio.com.br`.
- PWA e website devem pertencer ao mesmo domínio de sessão; não use domínios independentes.
- Configure DNS e HTTPS para os três domínios. O contêiner do website também precisa alcançar seu domínio HTTPS para consultar o backend.
- `NGINX_CERT_NAME`: nome do certificado compartilhado em `/etc/letsencrypt/live/<nome>`. Exemplo: `NGINX_CERT_NAME=meu-projeto.meu-dominio.com.br`. O certificado deve cobrir os três hosts. Vazio mantém um caminho por host.
- Após definir o nome, execute o bootstrap e aplique os blocos Nginx gerados; ele não emite certificados nem edita o Nginx.

**Trechos por ambiente:** o bootstrap gera `.foundation-installation.md` na raiz, com os blocos Compose/Nginx e resumo do ambiente. Use esse arquivo quando houver pendência de infraestrutura. Ele é ignorado pelo Git; README e este manual versionados não são editados pelo bootstrap.

Você configura somente esse arquivo. O bootstrap gera os arquivos internos do Laravel/testing e as configurações públicas das três interfaces, preservando as chaves existentes; não é necessário criar ou preencher esses arquivos manualmente.

<!-- BEGIN FOUNDATION INSTALL INFRA -->

## 2. Preparar serviços Node, mount, volumes e sites

### 2.1 Serviços Node no Compose existente

Arquivo de destino: `C:/var/www/infra/docker-compose.yml`.

```yaml
services:
    meu-projeto-node:
        image: node:22-alpine
        working_dir: /app
        volumes:
            - type: bind
              source: ../meu-projeto/pwa
              target: /app
            - type: bind
              source: ../meu-projeto/shared
              target: /shared
              read_only: true
            - meu_projeto_node_modules:/app/node_modules
        ports:
            - "127.0.0.1:5180:5173"
        networks:
            - infra_network
        profiles:
            - dev
    meu-projeto-admin-node:
        image: node:22-alpine
        working_dir: /app
        volumes:
            - type: bind
              source: ../meu-projeto/admin
              target: /app
            - type: bind
              source: ../meu-projeto/shared
              target: /shared
              read_only: true
            - meu_projeto_admin_node_modules:/app/node_modules
        ports:
            - "127.0.0.1:5182:5173"
        networks:
            - infra_network
        profiles:
            - dev
    meu-projeto-website-node:
        image: node:22-bookworm-slim
        working_dir: /app
        command: ["node", "scripts/start.mjs"]
        restart: unless-stopped
        environment:
            NODE_ENV: production
            NITRO_HOST: 0.0.0.0
            NITRO_PORT: 3000
        volumes:
            - type: bind
              source: ../meu-projeto/website
              target: /app
            - type: bind
              source: ../meu-projeto/shared
              target: /shared
              read_only: true
            - meu_projeto_website_node_modules:/app/node_modules
        expose:
            - "3000"
        networks:
            - infra_network
        profiles:
            - website
```

### 2.2 Mount vendor no PHP-FPM existente

No mesmo Compose, localizar `services.php-fpm.volumes` e acrescentar somente a linha abaixo. Preservar os mounts atuais; não criar outro serviço PHP nem substituir sua lista de volumes.

```yaml
- meu_projeto_vendor:/var/www/meu-projeto/backend/vendor
```

### 2.3 Declaração dos volumes ao final do Compose

No mesmo arquivo, mesclar estas declarações no bloco `volumes` de nível raiz, no mesmo nível de `services` e `networks`.

```yaml
volumes:
    meu_projeto_vendor:
        name: meu_projeto_vendor
    meu_projeto_node_modules:
        name: meu_projeto_node_modules
    meu_projeto_admin_node_modules:
        name: meu_projeto_admin_node_modules
    meu_projeto_website_node_modules:
        name: meu_projeto_website_node_modules
```

### 2.4 Sites Nginx

No arquivo de sites ativo do Nginx, acrescentar o bloco abaixo preservando os outros sites. Nesta infraestrutura local, o destino é `C:\var\www\infra\nginx\sites_local.conf`. Em produção, usar o arquivo realmente montado e conferir os certificados. PWA: `pwa/dist`; admin: `admin/dist`; website: proxy para Nuxt. Rotas técnicas seguem para Laravel. Substitua o bloco anterior deste projeto, sem duplicar o server_name.

```nginx
# PWA FOUNDATION: meu-projeto
server {
    listen 80;
    server_name meu-projeto.localhost;
    root "/var/www/meu-projeto/pwa/dist";
    index index.html;
    charset utf-8;
    add_header Cache-Control "no-cache" always;

    location = /sw.js { try_files $uri =404; add_header Cache-Control "no-cache" always; add_header Service-Worker-Allowed "/"; }
    location = /manifest.webmanifest { types { application/manifest+json webmanifest; } try_files $uri =404; add_header Cache-Control "no-cache" always; }
    location = /index.html { try_files $uri =404; add_header Cache-Control "no-cache" always; }
    location /assets/ { try_files $uri =404; add_header Cache-Control "public, max-age=31536000, immutable"; }
    location ~ /\. { deny all; }
    location ~ ^/(api|sanctum|up|status)(/|$) { rewrite ^ /index.php last; }
    location = /index.php {
        internal;
        include fastcgi_params;
        fastcgi_pass php-fpm:9000;
        fastcgi_param SCRIPT_FILENAME "/var/www/meu-projeto/backend/public/index.php";
        fastcgi_param DOCUMENT_ROOT "/var/www/meu-projeto/backend/public";
        
        add_header Cache-Control "no-store" always;
    }
    location ~* \.php(/|$) { return 404; }
    location / { try_files $uri $uri/ /index.html; }
}

# ADMIN FOUNDATION: meu-projeto
server {
    listen 80;
    server_name admin.meu-projeto.localhost;
    root "/var/www/meu-projeto/admin/dist";
    index index.html;
    charset utf-8;
    add_header Cache-Control "no-cache" always;

    location = /sw.js { return 404; }
    location = /manifest.webmanifest { return 404; }
    location = /offline.html { return 404; }
    location = /index.html { try_files $uri =404; add_header Cache-Control "no-cache" always; }
    location /assets/ { try_files $uri =404; add_header Cache-Control "public, max-age=31536000, immutable"; }
    location ~ /\. { deny all; }
    location ~ ^/(api|sanctum|up|status)(/|$) { rewrite ^ /index.php last; }
    location = /index.php {
        internal;
        include fastcgi_params;
        fastcgi_pass php-fpm:9000;
        fastcgi_param SCRIPT_FILENAME "/var/www/meu-projeto/backend/public/index.php";
        fastcgi_param DOCUMENT_ROOT "/var/www/meu-projeto/backend/public";
        
        add_header Cache-Control "no-store" always;
    }
    location ~* \.php(/|$) { return 404; }
    location / { try_files $uri $uri/ /index.html; }
}

# WEBSITE FOUNDATION: meu-projeto
server {
    listen 80;
    server_name website.meu-projeto.localhost;
    charset utf-8;
    resolver 127.0.0.11 valid=10s ipv6=off;
    location ~ /\. { deny all; }
    location ~ ^/(api|sanctum|up|status)(/|$) { rewrite ^ /index.php last; }
    location = /index.php {
        internal;
        include fastcgi_params;
        fastcgi_pass php-fpm:9000;
        fastcgi_param SCRIPT_FILENAME "/var/www/meu-projeto/backend/public/index.php";
        fastcgi_param DOCUMENT_ROOT "/var/www/meu-projeto/backend/public";
        
        add_header Cache-Control "no-store" always;
    }
    location ~* \.php(/|$) { return 404; }
    location / {
        set $website_upstream meu-projeto-website-node:3000;
        proxy_pass http://$website_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

<!-- END FOUNDATION INSTALL INFRA -->

## 3. Validar e aplicar a infraestrutura

Entre na pasta da infraestrutura e valide o Compose:

```cmd
cd /d C:\var\www\infra
docker compose --profile dev --profile website config --quiet
```

A validação `config --quiet` não mostra nada quando está correta.

## 4. Construir a imagem do executor

No **Prompt de Comando (CMD)**:

```cmd
cd /d C:\var\www\infra
docker build -t pwa-foundation-bootstrap:0.1.0 ../meu-projeto/scripts/bootstrap
```

## 5. Executar o bootstrap

Com os três serviços Node, volumes, mount PHP-FPM e sites Nginx configurados, execute **dentro da pasta `infra`**. O comando usa `source=..` e é o mesmo no CMD do Windows e no terminal Linux; em produção, acrescente `--force` ao final:

```cmd
docker run --rm --workdir /var/www/infra --env FOUNDATION_PROJECTS_ROOT=/var/www --mount type=bind,source=..,target=/var/www --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock --network infra_network pwa-foundation-bootstrap:0.1.0 --project /var/www/meu-projeto
```

Quando o comando terminar e o prompt voltar, execute separadamente:

```cmd
echo %ERRORLEVEL%
```

O código esperado ao concluir esta etapa é **0**. Se retornar **2**, ainda existe alguma pendência: leia a lista exibida, confira as alterações da etapa 2, aplique-as conforme a etapa 3 e repita este comando. Não é necessário refazer as etapas que já estiverem corretas. Código **1** indica erro; envie a mensagem para análise.

O bootstrap compila, inicia/atualiza o website e confere o acesso automaticamente.

## 6. Conferir o resultado

Confira:

- [Hello/PWA](http://meu-projeto.localhost/)
- [Hello Website](http://website.meu-projeto.localhost/)
- [Login/Dashboard administrativa](http://admin.meu-projeto.localhost/)
- [Status do backend e banco](http://meu-projeto.localhost/status)
- [Mesmo diagnóstico em JSON](http://meu-projeto.localhost/api/v1/status)
- [Verificação básica do Laravel](http://meu-projeto.localhost/up)

### Cadastro, login e logout dos clientes

1. No website, clique **Criar conta**; o cadastro abre **Minha conta**, sem confirmação de e-mail.
2. Abra a PWA pelo domínio Nginx e acesse **Minha conta**: deve usar a mesma sessão. Teste o login no sentido inverso.
3. Saia em uma interface e volte à outra: ao navegar/recarregar ou recuperar foco, deve pedir login. O admin continua conectado.
4. **Esqueci minha senha** no website envia o link para o próprio website, usando o SMTP já configurado. Nova solicitação após 60 segundos; redefinir não autentica automaticamente.

**Atualização desta base:** reconstrua a imagem da etapa 4, repita o bootstrap da etapa 5 e aceite **Atualizar aplicativo** na PWA. Clientes precisam entrar novamente; contas/senhas são preservadas. Admin mantém sessão própria. Teste a integração pelos domínios; `localhost:porta` é outro contexto de cookies.

### Criar e acessar o administrador

Na pasta infra, execute (adapte meu-projeto ao nome da sua pasta):

```cmd
docker compose exec -it -w /var/www/meu-projeto/backend php-fpm php artisan admin:create admin@example.com --name="Administrador"
```

Informe e confirme a senha no terminal (mínimo 8 caracteres); ela não aparece enquanto digita. O e-mail será o login da conta, independente dos clientes. O comando cria somente um administrador e recusa outra criação sem alterar a conta existente. Não há cadastro público. A recuperação por e-mail exige o SMTP da seção abaixo.

1. Abra o domínio administrativo e entre. Confira nome/e-mail, recarregue e teste **Sair**; a Dashboard deve voltar ao login.
2. Confira campos vazios, senha incorreta e limite de tentativas.
3. Mantenha cliente e admin conectados, inclusive nas portas Vite respectivas. Saia de um e recarregue o outro: ele deve continuar conectado. Repita no sentido inverso.
4. Execute a suíte Laravel da seção **Verificações e testes**, no MySQL testing.

Se alterar o frontend administrativo, gere o build com `vite.cmd build` na pasta admin; no Vite dev, basta salvar. O bootstrap publica ambos os builds. Cookies/CSRF administrativos são próprios, sem preencher outro .env.

### Recuperação de senha por e-mail

No `.env.foundation`, configure o remetente. Exemplo Gmail:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SCHEME=smtp
SMTP_USER=seu-email@gmail.com
SMTP_PASS="senha_de_app_do_google"
SMTP_FROM_ADDRESS=seu-email@gmail.com
SMTP_FROM_NAME="Nome do aplicativo"
```

Aguarde **60 segundos** antes de solicitar outro e-mail de recuperação para a mesma conta.

## 7. Desenvolvimento com Vite (opcional)

### PWA — CMD

```cmd
cd /d C:\var\www\meu-projeto\pwa
vite.cmd dev
```

Acesso: [http://localhost:5180](http://localhost:5180) (`DEV_PORT`). Encerrar: **Ctrl+C**.

Build:

```cmd
cd /d C:\var\www\meu-projeto\pwa
vite.cmd build
```

### Admin — CMD

```cmd
cd /d C:\var\www\meu-projeto\admin
vite.cmd dev
```

Acesso: [http://localhost:5182](http://localhost:5182) (`ADMIN_DEV_PORT`). Encerrar: **Ctrl+C**.

Build:

```cmd
cd /d C:\var\www\meu-projeto\admin
vite.cmd build
```

### Website — CMD

```cmd
cd /d C:\var\www\meu-projeto\website
nuxt.cmd dev
```

**Desenvolvimento:** [http://localhost:5184](http://localhost:5184) (`WEBSITE_DEV_PORT`); alterações aparecem ao salvar. Mantenha o terminal aberto; encerre com **Ctrl+C**.

**Domínio do website:** alterações no código Vue/JS/CSS dependem do build publicado. Dados consultados no Laravel atualizam sem build. Para atualizá-lo, repita o bootstrap da etapa 5; ele recompila e ativa a nova versão.

Build manual (opcional):

```cmd
nuxt.cmd build
```

### Atualizar o website com formulários

Acrescente o bind `shared` ao serviço website, se ausente, conforme a etapa 2.1 e repita o bootstrap da etapa 5. Na Hello, teste **Validar formulário** vazio e depois com e-mail/celular válidos; nenhum dado é enviado ou salvo.

### Conteúdo dinâmico do website

Após o bootstrap, execute na pasta infra:

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan website:content "Conteudo publicado" --body="Texto vindo do Laravel."
```

Na Hello do website, clique **Atualizar conteúdo** ou recarregue. Altere os textos no comando e repita: o resultado muda sem build. Para remover somente o exemplo:

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan website:content --clear
```

### Mensagens e máscaras

Arquivos compartilhados em `shared/forms/`:

- `messages.pt-BR.json`: mensagens.
- `masks.js`: máscaras.
- `rules.js`: regras.

Após alterar, repita o bootstrap da etapa 5 para publicar nas três interfaces. Em desenvolvimento, mantenha o dev aberto; na PWA instalada, aceite a atualização.

## Android por USB

Abra o projeto no Chrome do celular pelo cabo USB, sem depender do Wi-Fi.

### Preparação inicial — uma vez

**No Windows:**

1. Baixe [SDK Platform-Tools for Windows](https://developer.android.com/tools/releases/platform-tools).
2. Extraia para `C:\tools\platform-tools` e confira se existe `adb.exe` nessa pasta. Não precisa instalar Android Studio nem alterar o PATH.

**No Android:**

1. Ative as opções do desenvolvedor. Em Samsung: **Configurações → Sobre o telefone → Informações do software → Número de compilação**; toque sete vezes.
2. Ative **Depuração USB**, conecte um cabo de dados e desbloqueie a tela.
3. Autorize **Permitir depuração USB?**. Autorize permanentemente somente um computador de confiança.

Os exemplos abaixo usam `DEV_PORT=5180`, `PREVIEW_PORT=5181` e o serviço `meu-projeto-node`. Se seus valores forem outros, substitua-os nos comandos e endereços.

### Desenvolvimento — sem instalação da PWA

`vite.cmd dev` usa a **DEV_PORT (5180)**. Nesse modo, o service worker fica desativado e **o botão de instalar a PWA não aparece**.

1. Na pasta pwa, execute e mantenha o terminal aberto:

```cmd
vite.cmd dev
```

2. Em outro CMD:

```cmd
C:\tools\platform-tools\adb.exe reverse tcp:5180 tcp:5180
```

3. Abra [http://localhost:5180](http://localhost:5180) no Chrome do celular para desenvolver com atualização automática das alterações.

### Instalar a PWA e testar offline

Use o **build na PREVIEW_PORT (5181)**. O bootstrap da etapa 5 já gera o build; se alterou a PWA depois, execute `vite.cmd build` na pasta pwa antes de continuar.

1. Na pasta infra, execute e mantenha o terminal aberto:

```cmd
cd /d C:\var\www\infra
```

```cmd
docker compose --profile dev run --rm --no-deps -p 127.0.0.1:5181:4173 meu-projeto-node npm run preview
```

2. Em outro CMD:

```cmd
C:\tools\platform-tools\adb.exe reverse tcp:5181 tcp:5181
```

3. Abra [http://localhost:5181](http://localhost:5181) no Chrome do celular. Instale pelo botão **Instalar aplicativo** ou pelo menu do Chrome.

### Encerrar

Pressione **Ctrl+C** no terminal do Vite/prévia. Para remover o túnel USB, execute somente a linha da porta utilizada:

```cmd
C:\tools\platform-tools\adb.exe reverse --remove tcp:5180
```

```cmd
C:\tools\platform-tools\adb.exe reverse --remove tcp:5181
```

## Verificações e testes

No CMD, execute um comando por vez. Os testes usam o banco exclusivo de testes.

```cmd
cd /d C:\var\www\infra
```

Testes do backend:

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan test --env=testing
```

Formatação PHP:

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php vendor/bin/pint --test
```

Testes do bootstrap (execute dentro da pasta `infra`):

```cmd
docker run --rm --workdir /var/www/infra --mount type=bind,source=..,target=/var/www --entrypoint node pwa-foundation-bootstrap:0.1.0 --test /var/www/meu-projeto/scripts/bootstrap/tests/contracts.test.mjs /var/www/meu-projeto/scripts/bootstrap/tests/orchestration.test.mjs
```

Testes da PWA, na pasta infra:

```cmd
docker compose --profile dev run --rm --no-deps meu-projeto-node npm test
```

Testes e build do admin:

```cmd
docker compose --profile dev run --rm --no-deps meu-projeto-admin-node npm run check
```

Website — build e testes SSR:

```cmd
docker compose --profile website run --rm --no-deps meu-projeto-website-node npm run check
```

Após esse build, repita o bootstrap para ativar e conferir o website.

Esperado: todos os testes passando e nenhuma falha de formatação.

## app:sync

Limpa os caches e aplica migrations pendentes. No CMD:

```cmd
cd /d C:\var\www\infra
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan app:sync
```

## VPS

Na pasta infra da VPS, com `.env.foundation` de produção, Compose, Nginx e HTTPS preparados:

```bash
docker build -t pwa-foundation-bootstrap:0.1.0 ../meu-projeto/scripts/bootstrap
docker run --rm --workdir /var/www/infra --env FOUNDATION_PROJECTS_ROOT=/var/www --mount type=bind,source=..,target=/var/www --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock --network infra_network pwa-foundation-bootstrap:0.1.0 --project /var/www/meu-projeto --force
```
