<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $timestamps = false;

    protected $fillable = [
        'username', 'email', 'password_hash', 'role', 'status_akun',
    ];

    protected $hidden = ['password_hash'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function profile() { return $this->hasOne(UserProfile::class, 'user_id', 'user_id'); }
    public function emails() { return $this->hasMany(UserEmail::class, 'user_id', 'user_id'); }
    public function pengelola() { return $this->hasOne(Pengelola::class, 'user_id', 'user_id'); }
    public function transaksi() { return $this->hasMany(Transaksi::class, 'user_id', 'user_id'); }
    public function favorit() { return $this->hasMany(Favorit::class, 'user_id', 'user_id'); }
}
