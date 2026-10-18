<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesSiboraRoles;
use App\Models\Pengelola;
use App\Models\User;
use App\Models\UserEmail;
use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    use AuthorizesSiboraRoles;

    public function index(Request $request)
    {
        $this->requireRole('admin');
        $query = User::with(['profile', 'pengelola'])->orderByDesc('created_at');
        if ($request->filled('role')) $query->where('role', $request->string('role')->toString());
        if ($request->filled('status')) $query->where('status_akun', $request->string('status')->toString());
        if ($request->filled('search')) {
            $term = '%'.$request->string('search')->toString().'%';
            $query->where(fn ($q) => $q->where('username', 'like', $term)->orWhere('email', 'like', $term)
                ->orWhereHas('profile', fn ($p) => $p->where('nama_lengkap', 'like', $term))
                ->orWhereHas('pengelola', fn ($p) => $p->where('nama_perusahaan', 'like', $term)));
        }
        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $this->requireRole('admin');
        $data = $request->validate([
            'username' => ['required', 'string', 'min:3', 'max:60', 'alpha_dash', 'unique:users,username'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email', 'unique:user_email,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'in:pelanggan,pengelola,admin'],
            'status_akun' => ['sometimes', 'in:aktif,nonaktif'],
            'nama_lengkap' => ['required', 'string', 'max:120'],
            'no_hp' => ['nullable', 'string', 'max:30'],
            'nama_perusahaan' => ['required_if:role,pengelola', 'nullable', 'string', 'max:150'],
        ]);
        $user = DB::transaction(function () use ($data) {
            $row = User::create([
                'username' => $data['username'], 'email' => mb_strtolower($data['email']),
                'password_hash' => Hash::make($data['password']), 'role' => $data['role'],
                'status_akun' => $data['status_akun'] ?? 'aktif',
            ]);
            UserProfile::create(['user_id' => $row->user_id, 'nama_lengkap' => $data['nama_lengkap'], 'no_hp' => $data['no_hp'] ?? null]);
            UserEmail::create(['user_id' => $row->user_id, 'email' => mb_strtolower($data['email']), 'is_primary' => true]);
            if ($row->role === 'pengelola') {
                Pengelola::create(['user_id' => $row->user_id, 'nama_perusahaan' => $data['nama_perusahaan'], 'no_hp' => $data['no_hp'] ?? null]);
            }
            return $row;
        });
        return response()->json(['message' => 'Akun berhasil dibuat.', 'data' => $user->load('profile', 'pengelola')], 201);
    }

    public function show(int $user)
    {
        $this->requireRole('admin');
        return response()->json(['data' => User::with(['profile', 'emails', 'pengelola'])->findOrFail($user)]);
    }

    public function update(Request $request, int $user)
    {
        $this->requireRole('admin');
        $row = User::findOrFail($user);
        $data = $request->validate([
            'username' => ['sometimes', 'required', 'string', 'min:3', 'max:60', 'alpha_dash', Rule::unique('users', 'username')->ignore($row->user_id, 'user_id')],
            'email' => ['sometimes', 'required', 'email:rfc', 'max:190', Rule::unique('users', 'email')->ignore($row->user_id, 'user_id')],
            'role' => ['sometimes', 'required', 'in:pelanggan,pengelola,admin'],
            'status_akun' => ['sometimes', 'required', 'in:aktif,nonaktif'],
            'nama_lengkap' => ['sometimes', 'nullable', 'string', 'max:120'],
            'no_hp' => ['sometimes', 'nullable', 'string', 'max:30'],
            'nama_perusahaan' => ['sometimes', 'nullable', 'string', 'max:150'],
        ]);
        DB::transaction(function () use ($row, $data) {
            $userFields = collect($data)->only(['username', 'role', 'status_akun'])->all();
            if (array_key_exists('email', $data)) {
                $email = mb_strtolower($data['email']);
                if (UserEmail::where('email', $email)->where(function ($q) use ($row) {
                    $q->where('user_id', '!=', $row->user_id)
                        ->orWhere(function ($sameUser) use ($row) { $sameUser->where('user_id', $row->user_id)->where('is_primary', false); });
                })->exists()) {
                    abort(422, 'Email sudah digunakan akun lain atau terdaftar sebagai email tambahan.');
                }
                $userFields['email'] = $email;
                UserEmail::updateOrCreate(['user_id' => $row->user_id, 'is_primary' => true], ['email' => $email]);
            }
            $row->update($userFields);
            if (($data['status_akun'] ?? null) === 'nonaktif') $row->tokens()->delete();
            if (array_key_exists('nama_lengkap', $data) || array_key_exists('no_hp', $data)) {
                UserProfile::updateOrCreate(['user_id' => $row->user_id], collect($data)->only(['nama_lengkap', 'no_hp'])->all());
            }
            if (($data['role'] ?? $row->role) === 'pengelola') {
                Pengelola::updateOrCreate(['user_id' => $row->user_id], [
                    'nama_perusahaan' => $data['nama_perusahaan'] ?? $row->pengelola?->nama_perusahaan ?? ($row->profile?->nama_lengkap ?? $row->username),
                    'no_hp' => $data['no_hp'] ?? $row->pengelola?->no_hp,
                ]);
            }
        });
        return response()->json(['message' => 'Data akun diperbarui.', 'data' => $row->fresh()->load('profile', 'emails', 'pengelola')]);
    }

    public function resetPassword(Request $request, int $user)
    {
        $this->requireRole('admin');
        $data = $request->validate(['password' => ['required', 'string', 'min:8', 'confirmed']]);
        $row = User::findOrFail($user);
        $row->update(['password_hash' => Hash::make($data['password'])]);
        $row->tokens()->delete();
        return response()->json(['message' => 'Password berhasil direset. Semua token login lama telah dicabut.']);
    }

    public function destroy(int $user)
    {
        $admin = $this->requireRole('admin');
        abort_if((int) $admin->user_id === $user, 422, 'Admin tidak dapat menonaktifkan akun sendiri.');
        $row = User::findOrFail($user);
        $row->update(['status_akun' => 'nonaktif']);
        $row->tokens()->delete();
        return response()->json(['message' => 'Akun dinonaktifkan; transaksi historis tidak dihapus.']);
    }
}
