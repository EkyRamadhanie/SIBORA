<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peralatan extends Model
{
    protected $table = 'peralatan';
    protected $primaryKey = 'peralatan_id';
    public $timestamps = false;
    protected $fillable = ['pengelola_id', 'kategori_id', 'nama', 'spesifikasi', 'harga_per_jam', 'stok', 'foto', 'status'];
    protected function casts(): array { return ['harga_per_jam' => 'decimal:2', 'stok' => 'integer']; }
    public function pengelola() { return $this->belongsTo(Pengelola::class, 'pengelola_id', 'pengelola_id'); }
    public function kategori() { return $this->belongsTo(KategoriPeralatan::class, 'kategori_id', 'kategori_id'); }
    public function rentals() { return $this->hasMany(SewaPeralatan::class, 'peralatan_id', 'peralatan_id'); }
}
