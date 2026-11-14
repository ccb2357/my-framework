# Instalação — PWA Framework

## 1. Preparar a pasta e a configuração

Os exemplos usam `meu-projeto` em `C:\var\www`, com a pasta `infra` ao lado. Substitua nomes, caminhos, portas e rede pelos valores do seu `.env.foundation` e da infraestrutura.

Extraia o pacote na pasta escolhida, sem criar outra pasta de projeto dentro dela. Preserve arquivos privados e volumes existentes. O pacote não contém vendor, node_modules, .env preenchidos ou APP_KEY.

Prepare o arquivo de configuração central **manualmente**:

   - Abra a pasta `C:\var\www\meu-projeto` no Explorador de Arquivos.
   - Se `.env.foundation` ainda não existir, copie o arquivo `.env.foundation.example` nessa mesma pasta e renomeie a cópia para `.env.foundation`, sem acrescentar `.txt` ao nome.
   - Se `.env.foundation` já existir, mantenha o arquivo atual; não o substitua pelo exemplo.
   - Abra `.env.foundation` no VSCode ou em outro editor de texto, confira os campos e salve as alterações.

Você configura somente esse arquivo. O bootstrap gera os arquivos internos do Laravel/testing e a configuração pública do frontend, preservando as chaves existentes; não é necessário criar ou preencher esses arquivos manualmente.

## 2. Construir a imagem do executor

No **Prompt de Comando (CMD)**:

```cmd
cd /d C:\var\www\infra
docker build -t pwa-foundation-bootstrap:0.1.0 ../meu-projeto/scripts/bootstrap
```

<!-- BEGIN FOUNDATION INSTALL INFRA -->

## 3. Preparar serviço Node, mount, volumes e site

O executor usa docker run --rm (etapas 2 e 5); não cadastrar serviço de bootstrap no Compose.

Antes de executar o bootstrap, aplique **todos os quatro itens** abaixo para o ambiente **local** e o projeto **meu-projeto**. Não duplique entradas que já estejam corretas. Os trechos abaixo refletem a configuração central e o mapeamento deste ambiente; confira-os antes de aplicar. O restante do guia usa exemplos, que devem ser adaptados ao projeto.

### 3.1 Serviço Node no Compose existente

Arquivo de destino: `C:\var\www\infra\docker-compose.yml`. Acrescentar o serviço ao `services` existente, sem duplicar essa chave. Inicie o Vite somente após executar o bootstrap e instalar as dependências, conforme a etapa 7.

```yaml
services:
    meu-projeto-node:
        image: node:22-alpine
        working_dir: /app
        volumes:
            - type: bind
              source: C:/var/www/meu-projeto/frontend
              target: /app
            - meu_projeto_node_modules:/app/node_modules
        ports:
            - "127.0.0.1:5176:5173"
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

No mesmo arquivo, mesclar estas declarações no bloco `volumes` de nível raiz, no mesmo nível de `services` e `networks`. Se o bloco ainda não existir, criá-lo. O mount do passo anterior e esta declaração são necessários.

```yaml
volumes:
    meu_projeto_vendor:
        name: meu_projeto_vendor
    meu_projeto_node_modules:
        name: meu_projeto_node_modules
```

### 3.4 Site Nginx

No arquivo de sites ativo do Nginx, acrescentar o bloco abaixo preservando os outros sites. Nesta infraestrutura local, o destino é `C:\var\www\infra\nginx\sites_local.conf`. Em produção, usar o arquivo realmente montado e conferir os certificados. O root é `frontend/dist`; somente as rotas técnicas são encaminhadas ao Laravel. Substitua o bloco anterior deste projeto, sem duplicar o server_name.

```nginx
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

Agora o serviço Node, os volumes, o mount PHP-FPM e o site Nginx devem estar configurados e aplicados. Execute:

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

O bootstrap verifica as dependências, a configuração, os bancos, as migrations e a comunicação com o backend. Código **0** confirma backend, build PWA e arquivos/cabeçalhos HTTP no Nginx. Confira:

- [Hello/PWA](http://meu-projeto.localhost/)
- [Status do backend e banco](http://meu-projeto.localhost/status)
- [Mesmo diagnóstico em JSON](http://meu-projeto.localhost/api/v1/status)
- [Verificação básica do Laravel](http://meu-projeto.localhost/up)

Com o Vite parado, abra a Hello pelo domínio do projeto. Teste instalação pelo botão/menu, offline após o primeiro carregamento e retorno da conexão. API/banco não podem manter OK offline. Código 0 não comprova instalação, funcionamento em aparelho ou recebimento push.


## 7. Desenvolvimento com Vite (opcional)

No CMD:

```cmd
cd /d C:\var\www\meu-projeto\frontend
vite.cmd dev
```

Abra [http://localhost:5176](http://localhost:5176). Mantenha esse terminal aberto; encerre com Ctrl+C. Alterações em .vue/JS/CSS devem aparecer pelo HMR.

Esse endereço usa HMR e não registra o service worker. Teste a PWA pelo domínio Nginx ou pela prévia abaixo. Push funciona somente no build.

Para refazer o build e publicar em dist:

```cmd
cd /d C:\var\www\meu-projeto\frontend
vite.cmd build
```

## Android por USB: preparação e Vite

Este procedimento abre o Vite no Chrome do Android pelo cabo USB, usando um túnel ADB, sem depender da comunicação pelo Wi-Fi. Use a porta publicada no **Windows**, não a porta interna do contêiner.

| Uso | Porta no Windows neste guia | Endereço no celular |
| --- | --- | --- |
| Vite: desenvolvimento/HMR | DEV_PORT, exemplo 5176 | http://localhost:5176 |
| Vite: exemplo alternativo com DEV_PORT=5173 | 5173 | http://localhost:5173 |
| Build/PWA: instalação, offline e push | PREVIEW_PORT, exemplo 5177 | http://localhost:5177 |

### Comando rápido para começar no celular

Com o Vite em execução (`vite.cmd dev`), Android conectado por USB e depuração autorizada, execute no CMD. **Se a porta publicada no Windows for 5173:**

```cmd
C:\tools\platform-tools\adb.exe reverse tcp:5173 tcp:5173
```

Depois abra [http://localhost:5173](http://localhost:5173) no Chrome do celular. O caminho completo dispensa entrar na pasta platform-tools. Esse encaminhamento não inicia o Vite nem publica uma porta Docker.

**Se manteve DEV_PORT=5176 conforme a etapa 3**, use este comando e abra [http://localhost:5176](http://localhost:5176):

```cmd
C:\tools\platform-tools\adb.exe reverse tcp:5176 tcp:5176
```

Substitua a porta dos dois lados por DEV_PORT do seu projeto. Para instalar/testar offline e push, use o build e PREVIEW_PORT, conforme a próxima seção.

Se aparecer `no devices/emulators found`, confira o cabo/conexão e execute:

```cmd
C:\tools\platform-tools\adb.exe devices -l
```

O aparelho deve aparecer como `device`; se estiver `unauthorized`, desbloqueie e autorize a depuração. Com vários aparelhos, acrescente `-s SERIAL` logo após adb.exe, usando o identificador listado. Refaça o encaminhamento após reconectar o cabo ou reiniciar o ADB.

### Preparação inicial — uma vez por computador e celular

**No Windows:**

1. Baixe [SDK Platform-Tools for Windows](https://developer.android.com/tools/releases/platform-tools).
2. Extraia a pasta platform-tools para `C:\tools\platform-tools`.
3. Confira se existe `C:\tools\platform-tools\adb.exe`. Não precisa instalar Android Studio nem alterar o PATH.

**No Android:**

1. Ative as opções do desenvolvedor. Em Samsung: **Configurações → Sobre o telefone → Informações do software → Número de compilação**; toque sete vezes e informe o PIN quando solicitado. O caminho pode variar conforme o aparelho.
2. Em **Opções do desenvolvedor**, ative **Depuração USB**.
3. Conecte um cabo USB que permita transferência de dados e mantenha a tela desbloqueada.
4. Ao aparecer **Permitir depuração USB?**, autorize o computador. Marque a autorização permanente somente em computador de confiança.

## Testar a PWA no Windows/Android por USB

Após aplicar os arquivos, atualize dependências pelo bootstrap da etapa 5; alternativamente, com configuração pública já regenerada, execute na pasta infra:

```cmd
docker compose --profile dev run --rm --no-deps meu-projeto-node npm ci
```

Faça o build com `vite.cmd build` e confira os arquivos antes de abrir uma única prévia:

```cmd
docker compose --profile dev run --rm --no-deps meu-projeto-node npm run check:pwa
```

```cmd
docker compose --profile dev run --rm --no-deps meu-projeto-node ls -l /app/dist/index.html /app/dist/manifest.webmanifest /app/dist/sw.js
```

```cmd
docker compose --profile dev run --rm --no-deps -p 127.0.0.1:5177:4173 meu-projeto-node npm run preview
```

Abra primeiro http://localhost:5177 no Windows. Mantenha a prévia aberta. Para Android, conecte o cabo, autorize a depuração USB e, em outro CMD, use o caminho real do ADB:

```cmd
C:\tools\platform-tools\adb.exe reverse tcp:5177 tcp:5177
```

```cmd
C:\tools\platform-tools\adb.exe reverse --list
```

Abra http://localhost:5177 no Chrome Android. A porta interna 4173 do log não é o endereço do aparelho. Se houver vários aparelhos, selecione com `-s`. Ctrl+C encerra a prévia.

## Encerrar testes e liberar portas

1. Encerre o Vite/prévia com **Ctrl+C** no terminal onde iniciou cada um.
2. Remova somente os túneis utilizados. Execute a linha correspondente à porta; adapte para as portas do seu projeto:

```cmd
C:\tools\platform-tools\adb.exe reverse --remove tcp:5173
```

```cmd
C:\tools\platform-tools\adb.exe reverse --remove tcp:5176
```

```cmd
C:\tools\platform-tools\adb.exe reverse --remove tcp:5177
```

Confira os túneis restantes:

```cmd
C:\tools\platform-tools\adb.exe reverse --list
```

3. Se a porta continuar ocupada, liste os contêineres do serviço Node do projeto. Confira nome/porta e pare somente o Vite ou a prévia desejada, substituindo ID_DO_CONTAINER pelo ID listado:

```cmd
docker ps --filter "label=com.docker.compose.service=meu-projeto-node" --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}"
```

```cmd
docker stop ID_DO_CONTAINER
```

Se não houver contêiner correspondente, identifique quem escuta na porta do Windows; substitua 5173 pela porta em uso:

```cmd
netstat -ano -p tcp | findstr /C:":5173 "
```

Confira **endereço local/estado de escuta/PID** e encerre apenas o processo de teste identificado pelo Gerenciador de Tarefas. Remover o túnel ADB não encerra o servidor; parar o servidor não remove o túnel. Preserve os demais serviços/volumes e encaminhamentos; não use parada global nem `down -v`.

## Conferir atualização

Preencha campos na Hello do build A. Altere um texto de demonstração no código e execute `vite.cmd build` para gerar B. Na aba A, clique em Verificar atualização; confirme Atualizar aplicativo e confira os campos preservados. Repita com outra aba preenchida: ela deve aguardar sua confirmação. Recusar a atualização mantém a aba atual. Sem armazenamento de sessão disponível, a atualização com campos alterados é bloqueada.

O rascunho da Hello é temporário, por aba/projeto, e só é salvo ao confirmar a atualização; não salva registros no banco. Os assets anteriores são mantidos em dist/assets para abas antigas. A limpeza deles depende do plano de publicação; não apague durante este teste.

## Conferir o design system

Após atualizar o pacote, mantenha o Vite aberto e recarregue a Hello. Sem mudanças de dependências, não é necessário reconstruir o executor nem reinstalar npm.

Confira no celular/desktop: grid e página auxiliar, fonte/ícones, formulário vazio/inválido/válido e retorno das transições. Com Tab/Enter/Espaço/Escape, confira foco, botões, campos e FAB. O status deve mostrar carregamento e nunca manter OK ao ficar offline.

## Push Notifications (opcional)

1. No `.env.foundation`, acrescente/confira os campos abaixo. O `VAPID_SUBJECT` é obrigatório com push habilitado por exigência da configuração VAPID. O e-mail serve apenas como contato técnico: não envia nem recebe alertas automáticos e não aparece nas notificações. Informe um e-mail válido ou substitua por uma URL HTTPS sua. Deixe as duas chaves vazias **somente na primeira configuração**; preserve as já existentes.

```dotenv
PUSH_ENABLED=true
VAPID_SUBJECT=mailto:seu-email@seu-dominio.com
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
PUSH_TEST_AUTH_ENABLED=true
```

`PUSH_TEST_AUTH_ENABLED=true` é exclusivo de testes locais. Em produção, mantenha `false` e use a autenticação do produto. Para não usar push, mantenha `PUSH_ENABLED=false`.

2. Execute novamente o bootstrap da etapa 5. Ele instala as dependências PHP, prepara as tabelas, gera/preserva VAPID e publica o build. Não exige novo serviço Compose nem reconstrução do executor. Mantenha `.env.foundation` privado e não apague VAPID/APP_KEY nas atualizações.

**Nome exibido nas notificações:** configure `PROJECT_NAME="Nome do aplicativo"` e `PWA_SHORT_NAME="Nome curto"` no `.env.foundation` e repita o bootstrap da etapa 5 para atualizar o manifest e o build. O Android pode demorar para atualizar o nome da PWA já instalada. O sininho é o ícone pequeno da notificação, separado do nome.

3. No CMD, crie o acesso de teste local:

```cmd
cd /d C:\var\www\infra
```

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan push:test-user teste-push@example.test
```

`teste-push@example.test` identifica apenas o usuário de teste no banco; pode manter esse exemplo. Não precisa ser igual ao e-mail do `VAPID_SUBJECT` e não recebe e-mails.

4. Abra a Hello pelo build (Nginx ou prévia 5177/ADB). Se aparecer Atualizar aplicativo, aplique a atualização. Na seção Push Notifications, cole o código exibido no terminal e entre; ele vale 10 minutos e só pode ser usado uma vez. Clique **Ativar neste dispositivo** e permita notificações.

5. Clique **Enviar teste para este dispositivo**. Depois, no CMD:

```cmd
docker compose exec -T -w /var/www/meu-projeto/backend php-fpm php artisan push:work
```

Confira a notificação e o clique de retorno ao app. Repita com o app fechado, mantendo navegador/SO autorizados. **Enfileirada** aguarda o worker; **aceita pelo provedor** ainda não comprova exibição. Se houver retentativa, aguarde e execute o worker novamente.

6. Confira preferência global desligada, desativação/revogação do dispositivo e saída da conta. Imagens dependem do navegador. iPhone/iPad exige PWA instalada e aberta pela Tela de Início; fora de localhost, use HTTPS. O código de acesso não é salvo: conclua o login ou limpe o campo antes de atualizar a PWA.

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
