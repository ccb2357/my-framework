# Instalação — PWA Framework

**Atualização de uma instalação existente:** preserve `.env.foundation` e volumes. Acrescente o bind `/shared` aos dois serviços Node conforme a etapa 3.1, valide o Compose conforme a etapa 4 e repita o bootstrap da etapa 5. Os demais trechos da infraestrutura só precisam ser reaplicados se houver pendência indicada.

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

No central, ajuste `PROJECT_SLUG` ao nome da pasta e `LOCAL_DOMAIN` ao domínio da PWA. Deixe `ADMIN_LOCAL_DOMAIN` vazio para derivar `admin.<LOCAL_DOMAIN>`. Confira as quatro portas; cada uma deve estar livre. Em produção, informe `PRODUCTION_URL`; `ADMIN_PRODUCTION_URL` vazio deriva `https://admin.<host da PWA>`. Prepare HTTPS para os dois domínios.

Você configura somente esse arquivo. O bootstrap gera os arquivos internos do Laravel/testing e as configurações públicas da PWA e do admin, preservando as chaves existentes; não é necessário criar ou preencher esses arquivos manualmente.

## 2. Construir a imagem do executor

No **Prompt de Comando (CMD)**:

```cmd
cd /d C:\var\www\infra
docker build -t pwa-foundation-bootstrap:0.1.0 ../meu-projeto/scripts/bootstrap
```

<!-- BEGIN FOUNDATION INSTALL INFRA -->

## 3. Preparar serviços Node, mount, volumes e sites

O executor usa docker run --rm (etapas 2 e 5); não cadastrar serviço de bootstrap no Compose.

Antes de executar o bootstrap, aplique **todos os quatro itens** abaixo para o ambiente **local** e o projeto **pwa-framework**. Não duplique entradas que já estejam corretas. Os trechos abaixo refletem a configuração central e o mapeamento deste ambiente; confira-os antes de aplicar. O restante do guia usa exemplos, que devem ser adaptados ao projeto.

### 3.1 Serviços Node no Compose existente

Arquivo de destino: `C:\var\www\infra\docker-compose.yml`. Acrescentar o serviço ao `services` existente, sem duplicar essa chave. Inicie o Vite somente após executar o bootstrap e instalar as dependências, conforme a etapa 7.

```yaml
services:
    pwa-framework-node:
        image: node:22-alpine
        working_dir: /app
        volumes:
            - type: bind
              source: C:/var/www/pwa-framework/frontend
              target: /app
            - type: bind
              source: C:/var/www/pwa-framework/shared
              target: /shared
              read_only: true
            - pwa_framework_node_modules:/app/node_modules
        ports:
            - "127.0.0.1:5180:5173"
        networks:
            - infra_network
        profiles:
            - dev
    pwa-framework-admin-node:
        image: node:22-alpine
        working_dir: /app
        volumes:
            - type: bind
              source: C:/var/www/pwa-framework/admin
              target: /app
            - type: bind
              source: C:/var/www/pwa-framework/shared
              target: /shared
              read_only: true
            - pwa_framework_admin_node_modules:/app/node_modules
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
- pwa_framework_vendor:/var/www/pwa-framework/backend/vendor
```

### 3.3 Declaração dos volumes ao final do Compose

No mesmo arquivo, mesclar estas declarações no bloco `volumes` de nível raiz, no mesmo nível de `services` e `networks`. Se o bloco ainda não existir, criá-lo. O mount do passo anterior e esta declaração são necessários.

```yaml
volumes:
    pwa_framework_vendor:
        name: pwa_framework_vendor
    pwa_framework_node_modules:
        name: pwa_framework_node_modules
    pwa_framework_admin_node_modules:
        name: pwa_framework_admin_node_modules
```

### 3.4 Sites Nginx

No arquivo de sites ativo do Nginx, acrescentar o bloco abaixo preservando os outros sites. Nesta infraestrutura local, o destino é `C:\var\www\infra\nginx\sites_local.conf`. Em produção, usar o arquivo realmente montado e conferir os certificados. A PWA usa `frontend/dist` e o admin usa `admin/dist`; ambos encaminham rotas técnicas ao mesmo Laravel. O admin não possui PWA. Substitua o bloco anterior deste projeto, sem duplicar o server_name.

```nginx
# PWA FOUNDATION: pwa-framework
server {
    listen 80;
    server_name pwa-framework.localhost;
    root "/var/www/pwa-framework/frontend/dist";
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
        fastcgi_param SCRIPT_FILENAME "/var/www/pwa-framework/backend/public/index.php";
        fastcgi_param DOCUMENT_ROOT "/var/www/pwa-framework/backend/public";
        
        add_header Cache-Control "no-store" always;
    }
    location ~* \.php(/|$) { return 404; }
    location / { try_files $uri $uri/ /index.html; }
}

# ADMIN FOUNDATION: pwa-framework
server {
    listen 80;
    server_name admin.pwa-framework.localhost;
    root "/var/www/pwa-framework/admin/dist";
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
        fastcgi_param SCRIPT_FILENAME "/var/www/pwa-framework/backend/public/index.php";
        fastcgi_param DOCUMENT_ROOT "/var/www/pwa-framework/backend/public";
        
        add_header Cache-Control "no-store" always;
    }
    location ~* \.php(/|$) { return 404; }
    location / { try_files $uri $uri/ /index.html; }
}
```

<!-- END FOUNDATION INSTALL INFRA -->

## 4. Validar e aplicar a infraestrutura

Somente depois de construir a imagem e salvar **todas** as alterações da etapa 3, abra o **Prompt de Comando (CMD)**. Execute uma linha por vez; se um comando falhar, corrija antes de continuar.

Entre na pasta da infraestrutura e valide o Compose:

```cmd
cd /d C:\var\www\infra
docker compose --profile dev config --quiet
```

A validação `config --quiet` não mostra nada quando está correta. Se os mounts já estiverem aplicados, não recrie PHP-FPM. Se o site já corresponder à etapa 3.4, preserve-o; valide/recarregue somente após mudanças.

Recrie somente o PHP-FPM para aplicar o mount vendor. Isso interrompe brevemente os sites PHP compartilhados; não é necessário reconstruir a imagem PHP.

```cmd
docker compose up -d --no-deps --force-recreate php-fpm
```

Valide o Nginx e recarregue somente se a validação passar:

```cmd
docker compose exec -T nginx nginx -t && docker compose exec -T nginx nginx -s reload
```

Não execute `down -v` nem inicie todo o perfil dev. O bootstrap instala dependências e publica o build. Vite é opcional para desenvolvimento.

## 5. Executar o bootstrap

Agora os dois serviços Node, os volumes, o mount PHP-FPM e os dois sites Nginx devem estar configurados e aplicados. Execute:

```cmd
docker run --rm --workdir /var/www/infra --env FOUNDATION_PROJECTS_ROOT=/var/www --mount "type=bind,source=C:\var\www,target=/var/www" --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock --network infra_network pwa-foundation-bootstrap:0.1.0 --project /var/www/meu-projeto
```

Quando o comando terminar e o prompt voltar, execute separadamente:

```cmd
echo %ERRORLEVEL%
```

Ao terminar, o contêiner é removido; a imagem e os dados do projeto permanecem.

O código esperado ao concluir esta etapa é **0**. Se retornar **2**, ainda existe alguma pendência: leia a lista exibida, confira as alterações da etapa 3, aplique-as conforme a etapa 4 e repita este comando. Não é necessário refazer as etapas que já estiverem corretas. Código **1** indica erro; envie a mensagem para análise.

## 6. Conferir o resultado

O bootstrap verifica as dependências, a configuração, os bancos, as migrations e a comunicação com o backend. Código **0** confirma backend, builds PWA/admin e arquivos/cabeçalhos HTTP no Nginx. Confira:

- [Hello/PWA](http://meu-projeto.localhost/)
- [Hello Dashboard administrativa](http://admin.meu-projeto.localhost/)
- [Status do backend e banco](http://meu-projeto.localhost/status)
- [Mesmo diagnóstico em JSON](http://meu-projeto.localhost/api/v1/status)
- [Verificação básica do Laravel](http://meu-projeto.localhost/up)

**Nesta etapa o admin tem uma página de instalação pública; ainda não tem login.** A PWA e o admin devem mostrar backend/banco OK. Nos dois formulários demonstrativos, confira campos vazios, e-mail inválido e celular completo; as mensagens devem ser iguais, com o visual de cada interface.

Com o Vite parado, abra a Hello pelo domínio do projeto. Teste instalação pelo botão/menu, offline após o primeiro carregamento e retorno da conexão. API/banco não podem manter OK offline. Código 0 não comprova instalação, funcionamento em aparelho ou recebimento push.


## 7. Desenvolvimento com Vite (opcional)

No CMD:

```cmd
cd /d C:\var\www\meu-projeto\frontend
vite.cmd dev
```

Abra [http://localhost:5180](http://localhost:5180). Mantenha esse terminal aberto; encerre com Ctrl+C. Alterações em .vue/JS/CSS devem aparecer pelo HMR.

Esse endereço usa HMR e não registra o service worker. Teste a PWA pelo domínio Nginx ou pela prévia abaixo. Push funciona somente no build.

Para refazer o build e publicar em dist:

```cmd
cd /d C:\var\www\meu-projeto\frontend
vite.cmd build
```

### Desenvolvimento do admin

No CMD:

```cmd
cd /d C:\var\www\meu-projeto\admin
vite.cmd dev
```

Abra [http://localhost:5182](http://localhost:5182), conforme `ADMIN_DEV_PORT`. Para publicar alterações, encerre com Ctrl+C e execute `vite.cmd build` nessa pasta; abra novamente o domínio administrativo. O admin não oferece instalação PWA.

### Personalizar mensagens e máscaras

Edite `shared/forms/messages.pt-BR.json` para mensagens, `masks.js` para máscaras e `rules.js` para regras. São usados pela PWA e pelo admin. Após alterações, execute `vite.cmd build` na pasta frontend e na pasta admin; na PWA instalada, aceite a atualização disponível. O Vite dev usa os mesmos arquivos compartilhados.

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

### Instalar a PWA e testar offline/push

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

## Push Notifications (opcional)

**Nome exibido nas notificações:** configure `PROJECT_NAME="Nome do aplicativo"` e `PWA_SHORT_NAME="Nome curto"` no `.env.foundation` e repita o bootstrap da etapa 5 para atualizar o manifest e o build. O Android pode demorar para atualizar o nome da PWA já instalada. O sininho é o ícone pequeno da notificação, separado do nome.

1. No CMD, crie o acesso de teste local:

```cmd
cd /d C:\var\www\infra
```

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan push:test-user teste-push@example.test
```

`teste-push@example.test` identifica apenas o usuário de teste no banco; pode manter esse exemplo. Não precisa ser igual ao e-mail do `VAPID_SUBJECT` e não recebe e-mails.

2. Abra a Hello pelo build (Nginx ou prévia na PREVIEW_PORT/ADB). Se aparecer Atualizar aplicativo, aplique a atualização. Na seção Push Notifications, cole o código exibido no terminal e entre; ele vale 10 minutos e só pode ser usado uma vez. Clique **Ativar neste dispositivo** e permita notificações.

3. Clique **Enviar teste para este dispositivo**. Depois, no CMD:

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan push:work
```

Confira a notificação e o clique de retorno ao app. Repita com o app fechado, mantendo navegador/SO autorizados. **Enfileirada** aguarda o worker; **aceita pelo provedor** ainda não comprova exibição. Se houver retentativa, aguarde e execute o worker novamente.

4. Confira preferência global desligada, desativação/revogação do dispositivo e saída da conta. Imagens dependem do navegador. iPhone/iPad exige PWA instalada e aberta pela Tela de Início; fora de localhost, use HTTPS. O código de acesso não é salvo: conclua o login ou limpe o campo antes de atualizar a PWA.

Em VPS, agende o worker no Cron a cada minuto, adaptando os caminhos/serviço existentes:

```cron
* * * * * cd /var/www/infra && docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan push:work >/dev/null 2>&1
```

O usuário do Cron precisa acessar Docker. O comando tem lock e tempo limitado; não substitui a autenticação do produto. Desligue `PUSH_TEST_AUTH_ENABLED` e repita o bootstrap ao terminar os testes locais.

### Usar push nas funcionalidades do aplicativo

Crie a regra de notificação no backend do produto, em um Service, Job ou Listener. Quando a novidade estiver confirmada, selecione o usuário autorizado e chame o serviço central:

```php
$resultado = app(\App\Services\PushNotificationService::class)->sendToUser($usuario, [
    'title' => 'Nova publicação',
    'body' => 'Há uma novidade para você.',
    'url' => '/novidades/123/',
]);
```

`$usuario` é um modelo `App\Models\User` autorizado a acessar a novidade. Personalize `title`, `body` e `url`; o link deve ser uma rota real dentro do aplicativo. Não altere o teste da Hello para implementar notificações do produto. Avisos agendados usam uma rotina periódica que identifica quando notificar.

O serviço enfileira para os dispositivos inscritos com preferência ativa; `$resultado['queued']` informa a quantidade enfileirada. O worker descrito acima processa os envios; enfileirar não confirma recebimento.

Referências:

- [docs/sdd/03-arquitetura.md](docs/sdd/03-arquitetura.md) — serviço central, fila e gatilhos.
- [docs/sdd/05-api.md](docs/sdd/05-api.md) — campos, limites e contratos.
- [instalacao-pwa-framework.md](instalacao-pwa-framework.md#push-notifications-opcional) — configuração, teste e operação.

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
