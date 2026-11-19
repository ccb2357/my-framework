<?php

namespace App\Console\Commands;

use App\Services\WebsiteContent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class WebsiteContentCommand extends Command
{
    protected $signature = 'website:content {title? : Título público demonstrativo} {--body= : Texto público demonstrativo} {--clear : Remove somente o exemplo público}';

    protected $description = 'Atualiza ou remove o conteúdo público demonstrativo do website, sem build.';

    public function handle(WebsiteContent $content): int
    {
        $title = $this->argument('title');
        $body = $this->option('body');
        if ($this->option('clear')) {
            if ($title !== null || $body !== null) {
                $this->error('Use --clear sem título ou texto.');

                return self::INVALID;
            }
        } else {
            $values = ['title' => is_string($title) ? trim($title) : $title, 'body' => is_string($body) ? trim($body) : $body];
            $valid = Validator::make($values, ['title' => ['required', 'string', 'max:160'], 'body' => ['required', 'string', 'max:2000']]);
            if ($valid->fails() || str_contains((string) $title.(string) $body, "\0")) {
                $this->error('Informe título público de até 160 caracteres e --body com texto de até 2000 caracteres.');

                return self::INVALID;
            }
        }
        try {
            if ($this->option('clear')) {
                $content->clear();
            } else {
                $content->publish($values['title'], $values['body']);
            }
        } catch (\Throwable) {
            $this->error('Não foi possível alterar o exemplo. Confira o banco e as migrations.');

            return self::FAILURE;
        }
        $this->info('Conteúdo público atualizado. Recarregue o website ou clique em Atualizar conteúdo; não precisa de build.');

        return self::SUCCESS;
    }
}
