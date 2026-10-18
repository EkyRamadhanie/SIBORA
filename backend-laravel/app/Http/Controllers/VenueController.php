<?php

namespace App\Http\Controllers;

use App\Models\BookingLapangan;
use App\Models\JadwalSlot;
use App\Models\Lapangan;
use Carbon\Carbon;
use Illuminate\Http\Request;

class VenueController extends Controller
{
    public function index(Request $request)
    {
        $query = Lapangan::with(['sports', 'facilities', 'pengelola'])
            ->where('status', 'aktif');

        if ($request->filled('search')) {
            $term = '%'.trim($request->string('search')->toString()).'%';
            $query->where(fn ($q) => $q->where('nama', 'like', $term)->orWhere('lokasi', 'like', $term));
        }
        if ($request->filled('jenis_olahraga')) {
            $query->whereHas('sports', fn ($q) => $q->where('jenis_olahraga.jenis_olahraga_id', $request->integer('jenis_olahraga'))
                ->orWhere('jenis_olahraga.nama', $request->string('jenis_olahraga')->toString()));
        }
        if ($request->filled('harga_min')) $query->where('harga_per_jam', '>=', $request->input('harga_min'));
        if ($request->filled('harga_max')) $query->where('harga_per_jam', '<=', $request->input('harga_max'));

        return response()->json($query->orderBy('nama')->paginate(min(max($request->integer('per_page', 12), 1), 50)));
    }

    public function show(int $lapangan)
    {
        $venue = Lapangan::with(['sports', 'facilities', 'pengelola.user.profile'])
            ->where('status', 'aktif')->findOrFail($lapangan);
        return response()->json(['data' => $venue]);
    }

    public function sports()
    {
        return response()->json(['data' => \App\Models\JenisOlahraga::orderBy('nama')->get()]);
    }

    public function facilities(Request $request)
    {
        $query = \App\Models\LapanganFasilitas::query()->with('lapangan');
        if ($request->filled('lapangan_id')) $query->where('lapangan_id', $request->integer('lapangan_id'));
        return response()->json(['data' => $query->orderBy('nama_fasilitas')->get()]);
    }

    public function schedule(Request $request, int $lapangan)
    {
        $data = $request->validate(['tanggal' => ['required', 'date_format:Y-m-d', 'after_or_equal:today']]);
        $venue = Lapangan::where('status', 'aktif')->findOrFail($lapangan);
        $date = $data['tanggal'];

        $bookings = BookingLapangan::with('transaksi:user_id,transaksi_id,status')
            ->where('lapangan_id', $venue->lapangan_id)
            ->whereDate('tanggal', $date)
            ->whereHas('transaksi', fn ($q) => $q->blockingReservation())
            ->orderBy('jam_mulai')->get();

        $opening = Carbon::parse($date.' '.$venue->jam_buka);
        $closing = Carbon::parse($date.' '.$venue->jam_tutup);
        $slots = [];
        for ($cursor = $opening->copy(); $cursor->lt($closing); $cursor->addHour()) {
            $end = $cursor->copy()->addHour();
            if ($end->gt($closing)) $end = $closing->copy();
            $busy = $bookings->contains(fn ($booking) =>
                Carbon::parse($date.' '.$booking->jam_mulai)->lt($end)
                && Carbon::parse($date.' '.$booking->jam_selesai)->gt($cursor)
            );
            $slots[] = ['jam_mulai' => $cursor->format('H:i'), 'jam_selesai' => $end->format('H:i'), 'status' => $busy ? 'dipesan' : 'tersedia'];
        }

        return response()->json([
            'data' => [
                'lapangan' => ['lapangan_id' => $venue->lapangan_id, 'nama' => $venue->nama, 'jam_buka' => $venue->jam_buka, 'jam_tutup' => $venue->jam_tutup, 'harga_per_jam' => $venue->harga_per_jam],
                'tanggal' => $date,
                'slots' => $slots,
                'pemesanan' => $bookings->map(fn ($booking) => ['jam_mulai' => substr($booking->jam_mulai, 0, 5), 'jam_selesai' => substr($booking->jam_selesai, 0, 5), 'durasi_jam' => $booking->durasi_jam]),
            ],
        ]);
    }
}
