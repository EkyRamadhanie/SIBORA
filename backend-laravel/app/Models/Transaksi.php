<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Transaksi extends Model
{
    protected $table = 'transaksi';
    protected $primaryKey = 'transaksi_id';
    public $timestamps = false;
    protected $fillable = ['kode_booking', 'user_id', 'nama_penyewa', 'no_hp_penyewa', 'email_penyewa', 'catatan', 'subtotal', 'biaya_admin', 'total_bayar', 'status', 'batas_bayar'];
    protected function casts(): array { return ['subtotal' => 'decimal:2', 'biaya_admin' => 'decimal:2', 'total_bayar' => 'decimal:2', 'batas_bayar' => 'datetime', 'created_at' => 'datetime']; }
    public function scopeBlockingReservation(Builder $query): Builder
    {
        return $query->whereIn('status', ['menunggu_pembayaran', 'dp', 'lunas'])
            ->where(fn (Builder $q) => $q->where('status', '!=', 'menunggu_pembayaran')
                ->orWhereNull('batas_bayar')->orWhere('batas_bayar', '>=', now()));
    }

    public function user() { return $this->belongsTo(User::class, 'user_id', 'user_id'); }
    public function bookingLapangan() { return $this->hasOne(BookingLapangan::class, 'transaksi_id', 'transaksi_id'); }
    public function sewaPeralatan() { return $this->hasMany(SewaPeralatan::class, 'transaksi_id', 'transaksi_id'); }
    public function pembayaran() { return $this->hasMany(Pembayaran::class, 'transaksi_id', 'transaksi_id'); }
    public function pembatalan() { return $this->hasOne(Pembatalan::class, 'transaksi_id', 'transaksi_id'); }
}
