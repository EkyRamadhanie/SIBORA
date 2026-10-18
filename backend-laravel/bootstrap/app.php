<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\EnsureAccountActive;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Bearer token Sanctum dan pengecekan status akun untuk endpoint terproteksi.
        $middleware->alias(['account.active' => EnsureAccountActive::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Laravel menangani exception; API mengembalikan JSON saat Accept: application/json.
    })
    ->create();
