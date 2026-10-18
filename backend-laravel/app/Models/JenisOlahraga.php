<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JenisOlahraga extends Model
{
    protected $table = 'jenis_olahraga';
    protected $primaryKey = 'jenis_olahraga_id';
    public $timestamps = false;
    protected $fillable = ['nama'];
    public function lapangan() { return $this->belongsToMany(Lapangan::class, 'lapangan_olahraga', 'jenis_olahraga_id', 'lapangan_id'); }
}
