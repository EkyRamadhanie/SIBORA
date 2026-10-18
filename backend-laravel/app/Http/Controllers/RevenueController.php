<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesSiboraRoles;
use App\Models\Lapangan;
use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class RevenueController extends Controller
{
    use AuthorizesSiboraRoles;

    private function visibleTransactions(User $user)
    {
        $query = Transaksi::query();
        if ($user->role === 'admin') return $query;
        return $query->where(function ($q) use ($user) {
            $q->whereHas('bookingLapangan.lapangan.pengelola', fn ($manager) => $manager->where('user_id', $user->user_id))
                ->orWhereHas('sewaPeralatan.peralatan.pengelola', fn ($manager) => $manager->where('user_id', $user->user_id));
        });
    }

    public function summary(Request $request)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $filters = $request->validate([
            'dari' => ['sometimes', 'date_format:Y-m-d'],
            'sampai' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:dari'],
            'tahun' => ['sometimes', 'integer', 'min:2000', 'max:2100'],
            'pengelola_user_id' => ['sometimes', 'integer', 'exists:users,user_id'],
        ]);
        if (!empty($filters['pengelola_user_id']) && $user->role === 'admin') {
            $manager = User::where('user_id', $filters['pengelola_user_id'])->where('role', 'pengelola')->firstOrFail();
            $query = $this->visibleTransactions($user)->where(function ($q) use ($manager) {
                $q->whereHas('bookingLapangan.lapangan.pengelola', fn ($p) => $p->where('user_id', $manager->user_id))
                    ->orWhereHas('sewaPeralatan.peralatan.pengelola', fn ($p) => $p->where('user_id', $manager->user_id));
            });
        } else {
            $query = $this->visibleTransactions($user);
        }
        if (!empty($filters['dari'])) $query->whereDate('created_at', '>=', $filters['dari']);
        if (!empty($filters['sampai'])) $query->whereDate('created_at', '<=', $filters['sampai']);
        if (!empty($filters['tahun'])) $query->whereYear('created_at', $filters['tahun']);

        $transactions = $query->with(['pembayaran', 'bookingLapangan.lapangan', 'sewaPeralatan.peralatan.pengelola'])->get();
        $paidTransactions = $transactions->whereIn('status', ['dp', 'lunas']);
        $reportedManagerUserId = $user->role === 'pengelola'
            ? (int) $user->user_id
            : (!empty($filters['pengelola_user_id']) ? (int) $filters['pengelola_user_id'] : null);
        $equipmentLines = $paidTransactions->flatMap(function ($transaction) use ($reportedManagerUserId) {
            return $transaction->sewaPeralatan->filter(function ($rental) use ($reportedManagerUserId) {
                if (!$reportedManagerUserId) return true;
                return (int) ($rental->peralatan?->pengelola?->user_id ?? 0) === $reportedManagerUserId;
            });
        });
        $equipmentRevenue = round((float) $equipmentLines->sum(fn ($line) => (float) $line->subtotal), 2);
        $equipmentRows = $equipmentLines->groupBy(fn ($line) => (int) $line->peralatan_id)
            ->map(function ($lines) {
                $first = $lines->first();
                return [
                    'peralatan_id' => $first->peralatan_id,
                    'nama' => $first->peralatan?->nama ?? 'Peralatan',
                    'jumlah_sewa' => $lines->pluck('transaksi_id')->unique()->count(),
                    'unit_disewa' => (int) $lines->sum(fn ($line) => (int) $line->jumlah),
                    'pendapatan_subtotal' => round((float) $lines->sum(fn ($line) => (float) $line->subtotal), 2),
                ];
            })->values();
        $revenue = $paidTransactions->sum(fn ($transaction) => $transaction->pembayaran->where('status', 'berhasil')->sum(fn ($payment) => (float) $payment->jumlah));
        $monthly = $paidTransactions->groupBy(fn ($transaction) => Carbon::parse($transaction->created_at)->format('Y-m'))
            ->map(fn ($rows, $month) => [
                'bulan' => $month,
                'jumlah_transaksi' => $rows->count(),
                'pendapatan' => round($rows->sum(fn ($transaction) => $transaction->pembayaran->where('status', 'berhasil')->sum(fn ($payment) => (float) $payment->jumlah)), 2),
            ])->values();

        $venueRows = Lapangan::query()
            ->when($user->role === 'pengelola', fn ($q) => $q->whereHas('pengelola', fn ($p) => $p->where('user_id', $user->user_id)))
            ->when($user->role === 'admin' && !empty($filters['pengelola_user_id']), fn ($q) => $q->whereHas('pengelola', fn ($p) => $p->where('user_id', $filters['pengelola_user_id'])))
            ->with(['bookings.transaksi.pembayaran'])
            ->orderBy('nama')->get()->map(function (Lapangan $venue) {
                $paidBookings = $venue->bookings->filter(fn ($booking) => $booking->transaksi && in_array($booking->transaksi->status, ['dp', 'lunas'], true));
                $revenue = $paidBookings->sum(fn ($booking) => (float) $booking->subtotal);
                return [
                    'lapangan_id' => $venue->lapangan_id,
                    'nama' => $venue->nama,
                    'status' => $venue->status,
                    'total_booking_berbayar' => $paidBookings->count(),
                    'pendapatan_subtotal' => round($revenue, 2),
                ];
            });

        return response()->json([
            'filters' => $filters,
            'summary' => [
                'total_pendapatan_terkonfirmasi' => round((float) $revenue, 2),
                'total_pendapatan_peralatan' => $equipmentRevenue,
                'jumlah_sewa_peralatan' => (int) $equipmentLines->pluck('transaksi_id')->unique()->count(),
                'total_unit_peralatan_disewa' => (int) $equipmentLines->sum(fn ($line) => (int) $line->jumlah),
                'jumlah_transaksi' => $transactions->count(),
                'jumlah_transaksi_berbayar' => $paidTransactions->count(),
                'jumlah_pembatalan' => $transactions->where('status', 'batal')->count(),
                'jumlah_menunggu_pembayaran' => $transactions->where('status', 'menunggu_pembayaran')->count(),
            ],
            'pendapatan_bulanan' => $monthly,
            'performa_lapangan' => $venueRows,
            'pendapatan_peralatan' => $equipmentRows,
        ]);
    }
}
