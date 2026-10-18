<?php

namespace App\Http\Controllers;

use App\Models\UserEmail;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json(['data' => $request->user()->load('profile', 'emails')]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'username' => ['sometimes', 'required', 'string', 'min:3', 'max:60', 'alpha_dash', Rule::unique('users', 'username')->ignore($user->user_id, 'user_id')],
            'nama_lengkap' => ['sometimes', 'nullable', 'string', 'max:120'],
            'nickname' => ['sometimes', 'nullable', 'string', 'max:60'],
            'gender' => ['sometimes', 'nullable', 'string', 'max:30'],
            'negara' => ['sometimes', 'nullable', 'string', 'max:80'],
            'bahasa' => ['sometimes', 'nullable', 'string', 'max:50'],
            'zona_waktu' => ['sometimes', 'nullable', 'string', 'max:60'],
            'no_hp' => ['sometimes', 'nullable', 'string', 'max:30'],
            'foto_profil' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($user, $data) {
            if (array_key_exists('username', $data)) $user->update(['username' => $data['username']]);
            $profileFields = array_diff_key($data, ['username' => true]);
            if ($profileFields !== []) {
                UserProfile::updateOrCreate(['user_id' => $user->user_id], $profileFields);
            }
        });

        return response()->json(['message' => 'Profil berhasil diperbarui.', 'data' => $user->fresh()->load('profile', 'emails')]);
    }

    public function addEmail(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email:rfc', 'max:190', 'unique:user_email,email', 'unique:users,email']]);
        $record = UserEmail::create(['user_id' => $request->user()->user_id, 'email' => mb_strtolower($data['email']), 'is_primary' => false]);
        return response()->json(['message' => 'Email tambahan berhasil ditambahkan.', 'data' => $record], 201);
    }

    public function deleteEmail(Request $request, UserEmail $email)
    {
        abort_unless((int) $email->user_id === (int) $request->user()->user_id, 404);
        abort_if($email->is_primary, 422, 'Email utama tidak dapat dihapus melalui endpoint ini.');
        $email->delete();
        return response()->json(['message' => 'Email tambahan berhasil dihapus.']);
    }
}
