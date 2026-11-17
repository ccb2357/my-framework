<?php

namespace App\Support;

use Illuminate\Auth\EloquentUserProvider;

class RecoveryUserProvider extends EloquentUserProvider
{
    public function retrieveByCredentials(array $credentials)
    {
        $credentials['is_push_test'] = false;

        return parent::retrieveByCredentials($credentials);
    }
}
