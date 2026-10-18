<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SewaPeralatan extends Model
{
    protected $table = 'sewa_peralatan';
    protected $primaryKey = 'sewa_id';
    public $timestamps = false;
    protected $fillable = ['transaksi_id', 'peralatan_id', 'jumlah', 'tanggal_sewa', 'waktu_mulai', 'waktu_selesai', 'durasi_jam', 'harga_per_jam', 'subtotal'];
    protected function casts(): array { return ['tanggal_sewa' => 'date', 'jumlah' => 'integer', 'durasi_jam' => 'integer', 'harga_per_jam' => 'decimal:2', 'subtotal' => 'decimal:2']; }
    public function transaksi() { return $this->belongsTo(Transaksi::class, 'transaksi_id', 'transaksi_id'); }
    public function peralatan() { return $this->belongsTo(Peralatan::class, 'peralatan_id', 'peralatan_id'); }
}
