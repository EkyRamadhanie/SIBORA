<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BookingLapangan extends Model
{
    protected $table = 'booking_lapangan';
    protected $primaryKey = 'booking_id';
    public $timestamps = false;
    protected $fillable = ['transaksi_id', 'lapangan_id', 'tanggal', 'jam_mulai', 'jam_selesai', 'durasi_jam', 'harga_per_jam', 'subtotal'];
    protected function casts(): array { return ['tanggal' => 'date', 'durasi_jam' => 'integer', 'harga_per_jam' => 'decimal:2', 'subtotal' => 'decimal:2']; }
    public function transaksi() { return $this->belongsTo(Transaksi::class, 'transaksi_id', 'transaksi_id'); }
    public function lapangan() { return $this->belongsTo(Lapangan::class, 'lapangan_id', 'lapangan_id'); }
    public function slots() { return $this->hasMany(JadwalSlot::class, 'booking_id', 'booking_id'); }
}
