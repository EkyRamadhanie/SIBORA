<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserEmail;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:60', 'alpha_dash', 'unique:users,username'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email', 'unique:user_email,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'nama_lengkap' => ['nullable', 'string', 'max:120'],
            'no_hp' => ['nullable', 'string', 'max:30'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'username' => $data['username'],
                'email' => mb_strtolower($data['email']),
                'password_hash' => Hash::make($data['password']),
                'role' => 'pelanggan',
                'status_akun' => 'aktif',
            ]);
            UserProfile::create([
                'user_id' => $user->user_id,
                'nama_lengkap' => $data['nama_lengkap'] ?? $data['username'],
                'no_hp' => $data['no_hp'] ?? null,
            ]);
            UserEmail::create(['user_id' => $user->user_id, 'email' => mb_strtolower($data['email']), 'is_primary' => true]);
            return $user;
        });

        $token = $user->createToken('sibora-api')->plainTextToken;
        return response()->json(['message' => 'Registrasi berhasil.', 'token' => $token, 'user' => $user->load('profile', 'emails')], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $identity = mb_strtolower($data['username']);
        $user = User::whereRaw('LOWER(username) = ?', [$identity])
            ->orWhereRaw('LOWER(email) = ?', [$identity])->first();

        if (!$user || !Hash::check($data['password'], $user->password_hash) || $user->status_akun !== 'aktif') {
            throw ValidationException::withMessages(['username' => ['Username/email atau password salah, atau akun tidak aktif.']]);
        }

        $token = $user->createToken('sibora-api')->plainTextToken;
        return response()->json(['message' => 'Login berhasil.', 'token' => $token, 'user' => $user->load('profile', 'pengelola')]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Logout berhasil.']);
    }

    public function me(Request $request)
    {
        return response()->json(['data' => $request->user()->load('profile', 'emails', 'pengelola')]);
    }
}
