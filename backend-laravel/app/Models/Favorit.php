<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Favorit extends Model
{
    protected $table = 'favorit';
    protected $primaryKey = 'favorit_id';
    public $timestamps = false;
    protected $fillable = ['user_id', 'lapangan_id'];
    protected function casts(): array { return ['created_at' => 'datetime']; }
    public function user() { return $this->belongsTo(User::class, 'user_id', 'user_id'); }
    public function lapangan() { return $this->belongsTo(Lapangan::class, 'lapangan_id', 'lapangan_id'); }
}
