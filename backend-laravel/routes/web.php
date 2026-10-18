<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'app' => 'SIBORA API',
    'status' => 'ok',
    'api_prefix' => '/api/v1',
]));
