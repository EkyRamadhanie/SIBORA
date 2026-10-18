<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user || $user->status_akun !== 'aktif') {
            return response()->json(['message' => 'Akun tidak aktif. Hubungi administrator.'], 403);
        }
        return $next($request);
    }
}
