<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountPasswordReset extends Notification
{
    public function __construct(public string $token, public string $area) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function url($notifiable): string
    {
        $origin = match ($this->area) {
            'admin' => config('foundation.admin_url'),
            'website' => config('foundation.website_url'),
            default => config('app.url'),
        };

        return rtrim($origin, '/').'/redefinir-senha/#'.http_build_query(['token' => $this->token, 'email' => $notifiable->getEmailForPasswordReset()], '', '&', PHP_QUERY_RFC3986);
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)->subject('Redefinir senha · '.config('app.name').($this->area === 'admin' ? ' · Admin' : ''))->greeting('Olá!')->line('Recebemos uma solicitação para redefinir a senha da sua conta '.($this->area === 'admin' ? 'administrativa.' : 'de cliente.'))->action('Redefinir senha', $this->url($notifiable))->line('Este link expira em 60 minutos e só pode ser utilizado uma vez.')->line('Se você não solicitou a alteração, ignore este e-mail.')->salutation(config('app.name'));
    }
}
