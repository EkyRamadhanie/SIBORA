<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LapanganFasilitas extends Model
{
    protected $table = 'lapangan_fasilitas';
    protected $primaryKey = 'fasilitas_id';
    public $timestamps = false;
    protected $fillable = ['lapangan_id', 'nama_fasilitas'];
    public function lapangan() { return $this->belongsTo(Lapangan::class, 'lapangan_id', 'lapangan_id'); }
}
