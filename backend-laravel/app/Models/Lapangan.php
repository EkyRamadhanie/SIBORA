<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lapangan extends Model
{
    protected $table = 'lapangan';
    protected $primaryKey = 'lapangan_id';
    public $timestamps = false;
    protected $fillable = ['pengelola_id', 'nama', 'lokasi', 'harga_per_jam', 'jam_buka', 'jam_tutup', 'foto', 'status'];
    protected function casts(): array { return ['harga_per_jam' => 'decimal:2']; }
    public function pengelola() { return $this->belongsTo(Pengelola::class, 'pengelola_id', 'pengelola_id'); }
    public function sports() { return $this->belongsToMany(JenisOlahraga::class, 'lapangan_olahraga', 'lapangan_id', 'jenis_olahraga_id'); }
    public function facilities() { return $this->hasMany(LapanganFasilitas::class, 'lapangan_id', 'lapangan_id'); }
    public function bookings() { return $this->hasMany(BookingLapangan::class, 'lapangan_id', 'lapangan_id'); }
    public function slots() { return $this->hasMany(JadwalSlot::class, 'lapangan_id', 'lapangan_id'); }
    public function favorites() { return $this->hasMany(Favorit::class, 'lapangan_id', 'lapangan_id'); }
}
