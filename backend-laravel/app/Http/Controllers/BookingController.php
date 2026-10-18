<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesSiboraRoles;
use App\Models\BookingLapangan;
use App\Models\JadwalSlot;
use App\Models\Lapangan;
use App\Models\Pembatalan;
use App\Models\Peralatan;
use App\Models\SewaPeralatan;
use App\Models\Transaksi;
use App\Services\TransactionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    use AuthorizesSiboraRoles;

    public function bookVenue(Request $request, TransactionService $transactions)
    {
        $user = $request->user();
        abort_unless(
            $user && $user->role === 'pelanggan',
            403,
            'Booking fasilitas hanya tersedia untuk akun pelanggan.'
        );
        $data = $request->validate([
            'lapangan_id' => ['required', 'integer', 'exists:lapangan,lapangan_id'],
            'tanggal' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'jam_mulai' => ['required', 'date_format:H:i'],
            'durasi_jam' => ['required', 'integer', 'min:1', 'max:12'],
            'nama_penyewa' => ['required', 'string', 'max:120'],
            'no_hp_penyewa' => ['required', 'string', 'max:30'],
            'email_penyewa' => ['required', 'email:rfc', 'max:190'],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = DB::transaction(function () use ($data, $user, $transactions) {
            // Mengunci baris lapangan membuat proses cek benturan berurutan untuk lapangan yang sama.
            $venue = Lapangan::where('status', 'aktif')->whereKey($data['lapangan_id'])->lockForUpdate()->firstOrFail();
            $start = Carbon::createFromFormat('Y-m-d H:i', $data['tanggal'].' '.$data['jam_mulai']);
            $end = $start->copy()->addHours((int) $data['durasi_jam']);
            $opening = Carbon::parse($data['tanggal'].' '.$venue->jam_buka);
            $closing = Carbon::parse($data['tanggal'].' '.$venue->jam_tutup);

            if ($start->lt($opening) || $end->gt($closing) || !$end->gt($start)) {
                throw ValidationException::withMessages(['jam_mulai' => ['Waktu booking harus berada dalam jam operasional lapangan.']]);
            }
            if ($start->isPast()) {
                throw ValidationException::withMessages(['jam_mulai' => ['Waktu booking tidak boleh sudah lewat.']]);
            }

            $overlap = BookingLapangan::where('lapangan_id', $venue->lapangan_id)
                ->whereDate('tanggal', $data['tanggal'])
                ->whereTime('jam_mulai', '<', $end->format('H:i:s'))
                ->whereTime('jam_selesai', '>', $start->format('H:i:s'))
                ->whereHas('transaksi', fn ($q) => $q->blockingReservation())
                ->exists();
            if ($overlap) {
                throw ValidationException::withMessages(['jam_mulai' => ['Slot tersebut telah dipesan. Silakan pilih waktu lain.']]);
            }

            $price = (float) $venue->harga_per_jam;
            $subtotal = round($price * (int) $data['durasi_jam'], 2);
            $transaction = $transactions->createHeader($user, $data, $subtotal);
            $booking = BookingLapangan::create([
                'transaksi_id' => $transaction->transaksi_id,
                'lapangan_id' => $venue->lapangan_id,
                'tanggal' => $data['tanggal'],
                'jam_mulai' => $start->format('H:i:s'),
                'jam_selesai' => $end->format('H:i:s'),
                'durasi_jam' => $data['durasi_jam'],
                'harga_per_jam' => $price,
                'subtotal' => $subtotal,
            ]);
            JadwalSlot::create([
                'lapangan_id' => $venue->lapangan_id,
                'booking_id' => $booking->booking_id,
                'tanggal' => $data['tanggal'],
                'jam_mulai' => $start->format('H:i:s'),
                'jam_selesai' => $end->format('H:i:s'),
                'status' => 'dipesan',
            ]);
            return $transaction;
        }, 3);

        return response()->json(['message' => 'Booking berhasil dibuat. Silakan lanjutkan pembayaran.', 'data' => $result->load('bookingLapangan.lapangan', 'pembayaran')], 201);
    }

    public function rentEquipment(Request $request, TransactionService $transactions)
    {
        $user = $request->user();
        abort_unless(
            $user && $user->role === 'pelanggan',
            403,
            'Penyewaan peralatan hanya tersedia untuk akun pelanggan.'
        );

        $data = $request->validate([
            'tanggal_sewa' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'waktu_mulai' => ['required', 'date_format:H:i'],
            'durasi_jam' => ['required', 'integer', 'min:1', 'max:24'],
            'items' => ['required', 'array', 'min:1', 'max:15'],
            'items.*.peralatan_id' => ['required', 'integer', 'distinct', 'exists:peralatan,peralatan_id'],
            'items.*.jumlah' => ['required', 'integer', 'min:1', 'max:100'],
            'nama_penyewa' => ['required', 'string', 'max:120'],
            'no_hp_penyewa' => ['required', 'string', 'max:30'],
            'email_penyewa' => ['required', 'email:rfc', 'max:190'],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ]);

        $start = Carbon::createFromFormat('Y-m-d H:i', $data['tanggal_sewa'].' '.$data['waktu_mulai']);
        $end = $start->copy()->addHours((int) $data['durasi_jam']);
        if ($start->isPast() || $end->format('Y-m-d') !== $start->format('Y-m-d')) {
            throw ValidationException::withMessages(['waktu_mulai' => ['Waktu sewa harus berada pada waktu mendatang dan selesai pada hari yang sama.']]);
        }

        $transaction = DB::transaction(function () use ($data, $user, $transactions, $start, $end) {
            $ids = collect($data['items'])->pluck('peralatan_id')->map(fn ($id) => (int) $id)->sort()->values();
            $items = Peralatan::whereIn('peralatan_id', $ids)->where('status', 'aktif')->orderBy('peralatan_id')->lockForUpdate()->get()->keyBy('peralatan_id');
            if ($items->count() !== $ids->count()) {
                throw ValidationException::withMessages(['items' => ['Satu atau lebih peralatan tidak tersedia.']]);
            }
            if ($items->pluck('pengelola_id')->unique()->count() > 1) {
                throw ValidationException::withMessages(['items' => ['Dalam satu transaksi, peralatan harus berasal dari pengelola yang sama.']]);
            }

            $subtotal = 0.0;
            foreach ($data['items'] as $line) {
                $equipment = $items->get((int) $line['peralatan_id']);
                $used = SewaPeralatan::where('peralatan_id', $equipment->peralatan_id)
                    ->whereDate('tanggal_sewa', $data['tanggal_sewa'])
                    ->whereTime('waktu_mulai', '<', $end->format('H:i:s'))
                    ->whereTime('waktu_selesai', '>', $start->format('H:i:s'))
                    ->whereHas('transaksi', fn ($q) => $q->blockingReservation())
                    ->sum('jumlah');
                if ((int) $used + (int) $line['jumlah'] > (int) $equipment->stok) {
                    throw ValidationException::withMessages(['items' => ["Stok {$equipment->nama} tidak cukup pada waktu yang dipilih."]]);
                }
                $subtotal += (float) $equipment->harga_per_jam * (int) $line['jumlah'] * (int) $data['durasi_jam'];
            }

            $headerData = [
                'nama_penyewa' => $data['nama_penyewa'], 'no_hp_penyewa' => $data['no_hp_penyewa'],
                'email_penyewa' => $data['email_penyewa'], 'catatan' => $data['catatan'] ?? null,
            ];
            $transaction = $transactions->createHeader($user, $headerData, round($subtotal, 2));
            foreach ($data['items'] as $line) {
                $equipment = $items->get((int) $line['peralatan_id']);
                $lineSubtotal = round((float) $equipment->harga_per_jam * (int) $line['jumlah'] * (int) $data['durasi_jam'], 2);
                SewaPeralatan::create([
                    'transaksi_id' => $transaction->transaksi_id,
                    'peralatan_id' => $equipment->peralatan_id,
                    'jumlah' => $line['jumlah'],
                    'tanggal_sewa' => $data['tanggal_sewa'],
                    'waktu_mulai' => $start->format('H:i:s'),
                    'waktu_selesai' => $end->format('H:i:s'),
                    'durasi_jam' => $data['durasi_jam'],
                    'harga_per_jam' => $equipment->harga_per_jam,
                    'subtotal' => $lineSubtotal,
                ]);
            }
            return $transaction;
        }, 3);

        return response()->json(['message' => 'Permintaan sewa peralatan berhasil dibuat. Silakan lanjutkan pembayaran.', 'data' => $transaction->load('sewaPeralatan.peralatan', 'pembayaran')], 201);
    }

    public function history(Request $request)
    {
        $rows = Transaksi::with(['bookingLapangan.lapangan', 'sewaPeralatan.peralatan', 'pembayaran', 'pembatalan'])
            ->where('user_id', $request->user()->user_id)->orderByDesc('created_at')->paginate(15);
        return response()->json($rows);
    }

    public function show(Request $request, int $transaksi)
    {
        $row = Transaksi::with(['bookingLapangan.lapangan', 'sewaPeralatan.peralatan', 'pembayaran', 'pembatalan', 'user.profile'])
            ->findOrFail($transaksi);
        abort_unless($this->canSeeTransaction($request->user(), $row), 403, 'Transaksi ini tidak dapat diakses oleh akun Anda.');
        return response()->json(['data' => $row]);
    }

    public function cancel(Request $request, int $transaksi)
    {
        $user = $request->user();
        $data = $request->validate(['alasan' => ['required', 'string', 'min:5', 'max:2000']]);

        $row = DB::transaction(function () use ($user, $transaksi, $data) {
            $transaction = Transaksi::whereKey($transaksi)->lockForUpdate()->firstOrFail();
            abort_unless($this->canSeeTransaction($user, $transaction), 403, 'Transaksi ini tidak dapat dibatalkan oleh akun Anda.');
            if (in_array($transaction->status, ['batal', 'kedaluwarsa'], true)) {
                throw ValidationException::withMessages(['transaksi' => ['Transaksi ini sudah dibatalkan atau kedaluwarsa.']]);
            }
            if ($user->role === 'pelanggan' && ($transaction->batas_bayar && $transaction->batas_bayar->isPast()) && $transaction->status === 'menunggu_pembayaran') {
                throw ValidationException::withMessages(['transaksi' => ['Batas waktu pembayaran telah lewat.']]);
            }
            $paid = (float) $transaction->pembayaran()->where('status', 'berhasil')->sum('jumlah');
            Pembatalan::create([
                'transaksi_id' => $transaction->transaksi_id,
                'dibatalkan_oleh' => $user->user_id,
                'alasan' => $data['alasan'],
                'status_refund' => $paid > 0 ? 'menunggu' : 'tidak_berlaku',
                'jumlah_refund' => $paid,
                'tanggal_batal' => now(),
            ]);
            $transaction->update(['status' => 'batal']);
            $transaction->bookingLapangan?->slots()->update(['status' => 'dibatalkan']);
            return $transaction;
        });

        return response()->json(['message' => 'Transaksi dibatalkan. Jika ada pembayaran yang telah berhasil, refund tercatat menunggu proses.', 'data' => $row->load('pembatalan')]);
    }

    public function managementIndex(Request $request)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $query = Transaksi::with(['user.profile', 'bookingLapangan.lapangan', 'sewaPeralatan.peralatan', 'pembayaran']);
        if ($user->role === 'pengelola') {
            $query->where(function ($q) use ($user) {
                $q->whereHas('bookingLapangan.lapangan.pengelola', fn ($p) => $p->where('user_id', $user->user_id))
                    ->orWhereHas('sewaPeralatan.peralatan.pengelola', fn ($p) => $p->where('user_id', $user->user_id));
            });
        }
        if ($request->filled('status')) $query->where('status', $request->string('status')->toString());
        if ($request->filled('tanggal')) $query->whereDate('created_at', $request->string('tanggal')->toString());
        if ($request->filled('search')) {
            $term = '%'.$request->string('search')->toString().'%';
            $query->where(fn ($q) => $q->where('kode_booking', 'like', $term)->orWhere('nama_penyewa', 'like', $term));
        }
        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }
}
