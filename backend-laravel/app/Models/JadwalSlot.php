<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JadwalSlot extends Model
{
    protected $table = 'jadwal_slot';
    protected $primaryKey = 'slot_id';
    public $timestamps = false;
    protected $fillable = ['lapangan_id', 'booking_id', 'tanggal', 'jam_mulai', 'jam_selesai', 'status'];
    protected function casts(): array { return ['tanggal' => 'date']; }
    public function lapangan() { return $this->belongsTo(Lapangan::class, 'lapangan_id', 'lapangan_id'); }
    public function booking() { return $this->belongsTo(BookingLapangan::class, 'booking_id', 'booking_id'); }
}
