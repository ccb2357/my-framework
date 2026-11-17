# Instalação — PWA Framework

**Atualização de uma instalação existente:** preserve `.env.foundation` e volumes. Se os dois serviços Node já têm o bind `/shared` da etapa 3.1, repita apenas o bootstrap da etapa 5. Caso contrário, acrescente-o e valide o Compose conforme a etapa 4. Os demais trechos da infraestrutura só precisam ser reaplicados se houver pendência indicada. Esta atualização não exige novos serviços nem recriação do administrador.

## 1. Preparar a pasta e a configuração

Os exemplos usam `meu-projeto` em `C:\var\www`, com a pasta `infra` ao lado. Substitua nomes, caminhos, portas e rede pelos valores do seu `.env.foundation` e da infraestrutura.

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

**Ambiente local — seu computador:**

- `APP_ENV=local`.
- `PROJECT_SLUG`: mesmo nome da pasta do projeto, por exemplo `meu-projeto`.
- `LOCAL_DOMAIN`: domínio local da PWA, por exemplo `meu-projeto.localhost`.
- `ADMIN_LOCAL_DOMAIN`: deixe vazio para usar `admin.meu-projeto.localhost` automaticamente.
- `PRODUCTION_URL` e `ADMIN_PRODUCTION_URL`: deixe ambos vazios no ambiente local.

**Portas locais:**

- `DEV_PORT` e `PREVIEW_PORT`: desenvolvimento e prévia da PWA.
- `ADMIN_DEV_PORT` e `ADMIN_PREVIEW_PORT`: desenvolvimento e prévia do admin.
- As quatro portas devem ser diferentes e estar livres.

**Produção — na VPS:**

- `APP_ENV=production`.
- `PRODUCTION_URL`: endereço HTTPS real da PWA, por exemplo `https://meu-dominio.com.br`.
- `ADMIN_PRODUCTION_URL`: deixe vazio para usar `https://admin.meu-dominio.com.br`, ou informe outro endereço HTTPS.
- Configure DNS e HTTPS válidos para os dois domínios.

Você configura somente esse arquivo. O bootstrap gera os arquivos internos do Laravel/testing e as configurações públicas da PWA e do admin, preservando as chaves existentes; não é necessário criar ou preencher esses arquivos manualmente.

## 2. Construir a imagem do executor

No **Prompt de Comando (CMD)**:

```cmd
cd /d C:\var\www\infra
docker build -t pwa-foundation-bootstrap:0.1.0 ../meu-projeto/scripts/bootstrap
```

<!-- BEGIN FOUNDATION INSTALL INFRA -->

## 3. Preparar serviços Node, mount, volumes e sites

### 3.1 Serviços Node no Compose existente

Arquivo de destino: `C:\var\www\infra\docker-compose.yml`.

```yaml
services:
    meu-projeto-node:
        image: node:22-alpine
        working_dir: /app
        volumes:
            - type: bind
              source: C:/var/www/meu-projeto/frontend
              target: /app
            - type: bind
              source: C:/var/www/meu-projeto/shared
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
              source: C:/var/www/meu-projeto/admin
              target: /app
            - type: bind
              source: C:/var/www/meu-projeto/shared
              target: /shared
              read_only: true
            - meu_projeto_admin_node_modules:/app/node_modules
        ports:
            - "127.0.0.1:5182:5173"
        networks:
            - infra_network
        profiles:
            - dev
```

### 3.2 Mount vendor no PHP-FPM existente

No mesmo Compose, localizar `services.php-fpm.volumes` e acrescentar somente a linha abaixo. Preservar os mounts atuais; não criar outro serviço PHP nem substituir sua lista de volumes.

```yaml
- meu_projeto_vendor:/var/www/meu-projeto/backend/vendor
```

### 3.3 Declaração dos volumes ao final do Compose

No mesmo arquivo, mesclar estas declarações no bloco `volumes` de nível raiz, no mesmo nível de `services` e `networks`.

```yaml
volumes:
    meu_projeto_vendor:
        name: meu_projeto_vendor
    meu_projeto_node_modules:
        name: meu_projeto_node_modules
    meu_projeto_admin_node_modules:
        name: meu_projeto_admin_node_modules
```

### 3.4 Sites Nginx

No arquivo de sites ativo do Nginx, acrescentar o bloco abaixo preservando os outros sites. Nesta infraestrutura local, o destino é `C:\var\www\infra\nginx\sites_local.conf`. Em produção, usar o arquivo realmente montado e conferir os certificados. A PWA usa `frontend/dist` e o admin usa `admin/dist`; ambos encaminham rotas técnicas ao mesmo Laravel. O admin não possui PWA. Substitua o bloco anterior deste projeto, sem duplicar o server_name.

```nginx
# PWA FOUNDATION: meu-projeto
server {
    listen 80;
    server_name meu-projeto.localhost;
    root "/var/www/meu-projeto/frontend/dist";
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
```

<!-- END FOUNDATION INSTALL INFRA -->

## 4. Validar e aplicar a infraestrutura

Entre na pasta da infraestrutura e valide o Compose:

```cmd
cd /d C:\var\www\infra
docker compose --profile dev config --quiet
```

A validação `config --quiet` não mostra nada quando está correta.

## 5. Executar o bootstrap

Agora os dois serviços Node, os volumes, o mount PHP-FPM e os dois sites Nginx devem estar configurados e aplicados. Execute:

```cmd
docker run --rm --workdir /var/www/infra --env FOUNDATION_PROJECTS_ROOT=/var/www --mount "type=bind,source=C:\var\www,target=/var/www" --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock --network infra_network pwa-foundation-bootstrap:0.1.0 --project /var/www/meu-projeto
```

Quando o comando terminar e o prompt voltar, execute separadamente:

```cmd
echo %ERRORLEVEL%
```

O código esperado ao concluir esta etapa é **0**. Se retornar **2**, ainda existe alguma pendência: leia a lista exibida, confira as alterações da etapa 3, aplique-as conforme a etapa 4 e repita este comando. Não é necessário refazer as etapas que já estiverem corretas. Código **1** indica erro; envie a mensagem para análise.

## 6. Conferir o resultado

Confira:

- [Hello/PWA](http://meu-projeto.localhost/)
- [Login/Dashboard administrativa](http://admin.meu-projeto.localhost/)
- [Status do backend e banco](http://meu-projeto.localhost/status)
- [Mesmo diagnóstico em JSON](http://meu-projeto.localhost/api/v1/status)
- [Verificação básica do Laravel](http://meu-projeto.localhost/up)

### Cadastro, login e logout dos clientes

1. Na Hello, em **Sua conta**, clique **Criar conta**. Preencha nome, e-mail, senha (mínimo 8 caracteres) e confirmação. O cadastro abre **Minha conta** imediatamente, sem confirmação por e-mail.
2. Recarregue a página e confira nome/e-mail. Clique **Sair**; acessar `/conta/` deve levar a **Entrar**.
3. Entre novamente. Confira também senha incorreta, e-mail já cadastrado e campos inválidos.
4. Execute a suíte Laravel da seção **Verificações e testes**, no banco testing.

### Criar e acessar o administrador

Após extrair a atualização, repita o bootstrap da etapa 5. Não precisa alterar Compose/Nginx nem reconstruir a imagem do executor. Na pasta infra, execute (adapte meu-projeto ao nome da sua pasta):

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
cd /d C:\var\www\meu-projeto\frontend
vite.cmd dev
```

Acesso: [http://localhost:5180](http://localhost:5180) (`DEV_PORT`). Encerrar: **Ctrl+C**.

Build:

```cmd
cd /d C:\var\www\meu-projeto\frontend
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

### Mensagens e máscaras

Arquivos compartilhados em `shared/forms/`:

- `messages.pt-BR.json`: mensagens.
- `masks.js`: máscaras.
- `rules.js`: regras.

Após alterar, gere os dois builds. Na PWA instalada, aceite a atualização.

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

1. Na pasta frontend, execute e mantenha o terminal aberto:

```cmd
vite.cmd dev
```

2. Em outro CMD:

```cmd
C:\tools\platform-tools\adb.exe reverse tcp:5180 tcp:5180
```

3. Abra [http://localhost:5180](http://localhost:5180) no Chrome do celular para desenvolver com atualização automática das alterações.

### Instalar a PWA e testar offline

Use o **build na PREVIEW_PORT (5181)**. O bootstrap da etapa 5 já gera o build; se alterou o frontend depois, execute `vite.cmd build` na pasta frontend antes de continuar.

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

Testes do bootstrap:

```cmd
docker run --rm --workdir /var/www/infra --mount "type=bind,source=C:\var\www,target=/var/www" --entrypoint node pwa-foundation-bootstrap:0.1.0 --test /var/www/meu-projeto/scripts/bootstrap/tests/contracts.test.mjs /var/www/meu-projeto/scripts/bootstrap/tests/orchestration.test.mjs
```

Testes do frontend, na pasta infra:

```cmd
docker compose --profile dev run --rm --no-deps meu-projeto-node npm test
```

Testes e build do admin:

```cmd
docker compose --profile dev run --rm --no-deps meu-projeto-admin-node npm run check
```

Esperado: todos os testes passando e nenhuma falha de formatação.

## app:sync

Limpa os caches e aplica migrations pendentes. No CMD:

```cmd
cd /d C:\var\www\infra
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan app:sync
```

## VPS e atualizações

Na pasta infra da VPS, com `.env.foundation` de produção, Compose, Nginx e HTTPS preparados:

```bash
docker build -t pwa-foundation-bootstrap:0.1.0 ../meu-projeto/scripts/bootstrap
docker run --rm --workdir /var/www/infra --env FOUNDATION_PROJECTS_ROOT=/var/www --mount type=bind,source=/var/www,target=/var/www --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock --network infra_network pwa-foundation-bootstrap:0.1.0 --project /var/www/meu-projeto --force
```

Para atualizar: faça backup, execute `git pull` na pasta do projeto e repita o comando acima na pasta infra. Ajuste o source do mount, a raiz interna, a rede e os caminhos ao ambiente real da VPS. A imagem só precisa ser reconstruída quando seu conteúdo mudar.
