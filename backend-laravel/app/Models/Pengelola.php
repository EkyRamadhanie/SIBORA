<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengelola extends Model
{
    protected $table = 'pengelola';
    protected $primaryKey = 'pengelola_id';
    public $timestamps = false;
    protected $fillable = ['user_id', 'nama_perusahaan', 'no_hp'];
    public function user() { return $this->belongsTo(User::class, 'user_id', 'user_id'); }
    public function lapangan() { return $this->hasMany(Lapangan::class, 'pengelola_id', 'pengelola_id'); }
    public function peralatan() { return $this->hasMany(Peralatan::class, 'pengelola_id', 'pengelola_id'); }
}
