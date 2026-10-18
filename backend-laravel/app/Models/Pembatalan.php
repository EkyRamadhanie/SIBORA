<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pembatalan extends Model
{
    protected $table = 'pembatalan';
    protected $primaryKey = 'pembatalan_id';
    public $timestamps = false;
    protected $fillable = ['transaksi_id', 'dibatalkan_oleh', 'alasan', 'status_refund', 'jumlah_refund', 'tanggal_batal'];
    protected function casts(): array { return ['jumlah_refund' => 'decimal:2', 'tanggal_batal' => 'datetime']; }
    public function transaksi() { return $this->belongsTo(Transaksi::class, 'transaksi_id', 'transaksi_id'); }
    public function pelakuPembatalan() { return $this->belongsTo(User::class, 'dibatalkan_oleh', 'user_id'); }
}
