<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $table = 'user_profile';
    protected $primaryKey = 'profile_id';
    public $timestamps = false;
    protected $fillable = ['user_id', 'nama_lengkap', 'nickname', 'gender', 'negara', 'bahasa', 'zona_waktu', 'no_hp', 'foto_profil'];
    public function user() { return $this->belongsTo(User::class, 'user_id', 'user_id'); }
}
