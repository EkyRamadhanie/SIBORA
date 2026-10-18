<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pembayaran extends Model
{
    protected $table = 'pembayaran';
    protected $primaryKey = 'pembayaran_id';
    public $timestamps = false;
    protected $fillable = ['transaksi_id', 'metode', 'ref_gateway', 'jumlah', 'status', 'waktu_bayar'];
    protected function casts(): array { return ['jumlah' => 'decimal:2', 'waktu_bayar' => 'datetime']; }
    public function transaksi() { return $this->belongsTo(Transaksi::class, 'transaksi_id', 'transaksi_id'); }
}
