<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KategoriPeralatan extends Model
{
    protected $table = 'kategori_peralatan';
    protected $primaryKey = 'kategori_id';
    public $timestamps = false;
    protected $fillable = ['nama'];
    public function peralatan() { return $this->hasMany(Peralatan::class, 'kategori_id', 'kategori_id'); }
}
