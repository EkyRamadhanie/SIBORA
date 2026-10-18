<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesSiboraRoles;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    use AuthorizesSiboraRoles;

    public function store(Request $request, int $transaksi)
    {
        $data = $request->validate([
            'metode' => ['required', 'in:bca,bni,qris,cash,transfer_bank,lainnya'],
            'jumlah' => ['sometimes', 'numeric', 'min:1'],
        ]);
        $user = $request->user();

        $payment = DB::transaction(function () use ($transaksi, $data, $user) {
            $transaction = Transaksi::whereKey($transaksi)->lockForUpdate()->firstOrFail();
            abort_unless((int) $transaction->user_id === (int) $user->user_id || $user->role === 'admin', 403, 'Anda tidak dapat membayar transaksi ini.');
            if (in_array($transaction->status, ['batal', 'kedaluwarsa', 'lunas'], true)) {
                throw ValidationException::withMessages(['transaksi' => ['Transaksi sudah lunas, dibatalkan, atau kedaluwarsa.']]);
            }
            if ($transaction->batas_bayar && $transaction->batas_bayar->isPast()) {
                return null; // Status kedaluwarsa ditulis setelah transaksi DB ini selesai agar tidak ikut rollback.
            }
            $paid = (float) $transaction->pembayaran()->where('status', 'berhasil')->sum('jumlah');
            $pending = (float) $transaction->pembayaran()->where('status', 'menunggu')->sum('jumlah');
            $remaining = max(0, (float) $transaction->total_bayar - $paid - $pending);
            $amount = isset($data['jumlah']) ? (float) $data['jumlah'] : $remaining;
            if ($amount <= 0 || $amount > $remaining) {
                throw ValidationException::withMessages(['jumlah' => ['Jumlah pembayaran harus lebih dari 0 dan tidak melebihi sisa tagihan.']]);
            }
            return Pembayaran::create([
                'transaksi_id' => $transaction->transaksi_id,
                'metode' => $data['metode'],
                'ref_gateway' => null,
                'jumlah' => round($amount, 2),
                'status' => 'menunggu',
                'waktu_bayar' => null,
            ]);
        });

        if (!$payment) {
            Transaksi::whereKey($transaksi)->where('status', 'menunggu_pembayaran')->update(['status' => 'kedaluwarsa']);
            throw ValidationException::withMessages(['transaksi' => ['Batas waktu pembayaran telah lewat.']]);
        }

        return response()->json([
            'message' => 'Instruksi pembayaran dicatat. Status akan berubah setelah konfirmasi gateway.',
            'data' => $payment->load('transaksi'),
            'payment_gateway' => [
                'mode' => 'adapter-belum-dikonfigurasi',
                'note' => 'Endpoint ini belum mengirim charge ke penyedia pembayaran sungguhan. Hubungkan SDK/API gateway pilihan sebelum produksi.',
            ],
        ], 201);
    }

    public function mockConfirm(Request $request, int $pembayaran)
    {
        abort_unless(app()->environment('local'), 404, 'Endpoint demo hanya tersedia di environment local.');
        $user = $request->user();
        $result = DB::transaction(function () use ($user, $pembayaran) {
            $payment = Pembayaran::whereKey($pembayaran)->lockForUpdate()->firstOrFail();
            $transaction = Transaksi::whereKey($payment->transaksi_id)->lockForUpdate()->firstOrFail();
            abort_unless((int) $transaction->user_id === (int) $user->user_id || $user->role === 'admin', 403);
            if ($payment->status === 'berhasil') {
                throw ValidationException::withMessages(['pembayaran' => ['Pembayaran ini sudah dikonfirmasi.']]);
            }
            if ($transaction->status === 'batal' || $transaction->status === 'kedaluwarsa') {
                throw ValidationException::withMessages(['transaksi' => ['Transaksi tidak lagi dapat dibayar.']]);
            }
            if ($transaction->batas_bayar && $transaction->batas_bayar->isPast()) {
                return ['expired' => true, 'payment' => null];
            }
            $payment->update([
                'status' => 'berhasil',
                'waktu_bayar' => now(),
                'ref_gateway' => $payment->ref_gateway ?: 'MOCK-'.$payment->pembayaran_id.'-'.Str::upper(Str::random(8)),
            ]);
            $paid = (float) $transaction->pembayaran()->where('status', 'berhasil')->sum('jumlah');
            $transaction->update(['status' => $paid >= (float) $transaction->total_bayar ? 'lunas' : 'dp']);
            return ['expired' => false, 'payment' => $payment->fresh()->load('transaksi')];
        });
        if ($result['expired']) {
            Transaksi::whereKey(Pembayaran::findOrFail($pembayaran)->transaksi_id)->where('status', 'menunggu_pembayaran')->update(['status' => 'kedaluwarsa']);
            throw ValidationException::withMessages(['transaksi' => ['Batas waktu pembayaran telah lewat.']]);
        }
        return response()->json(['message' => 'Pembayaran demo berhasil dikonfirmasi.', 'data' => $result['payment']]);
    }

    public function webhook(Request $request)
    {
        $secret = (string) config('services.payment.webhook_secret');
        abort_if($secret === '', 503, 'Webhook belum dikonfigurasi.');
        $received = (string) $request->header('X-Payment-Webhook-Secret', '');
        abort_unless(hash_equals($secret, $received), 401, 'Kunci webhook tidak valid.');

        $data = $request->validate([
            'pembayaran_id' => ['required', 'integer', 'exists:pembayaran,pembayaran_id'],
            'status' => ['required', 'in:berhasil,gagal'],
            'ref_gateway' => ['required', 'string', 'max:190'],
        ]);

        $payment = DB::transaction(function () use ($data) {
            $row = Pembayaran::whereKey($data['pembayaran_id'])->lockForUpdate()->firstOrFail();
            $transaction = Transaksi::whereKey($row->transaksi_id)->lockForUpdate()->firstOrFail();
            if ($transaction->status === 'batal' || $transaction->status === 'kedaluwarsa') {
                throw ValidationException::withMessages(['transaksi' => ['Transaksi sudah tidak aktif.']]);
            }
            $row->update([
                'status' => $data['status'],
                'ref_gateway' => $data['ref_gateway'],
                'waktu_bayar' => $data['status'] === 'berhasil' ? now() : null,
            ]);
            $paid = (float) $transaction->pembayaran()->where('status', 'berhasil')->sum('jumlah');
            $transaction->update(['status' => $paid >= (float) $transaction->total_bayar ? 'lunas' : ($paid > 0 ? 'dp' : 'menunggu_pembayaran')]);
            return $row->fresh();
        });
        return response()->json(['message' => 'Webhook pembayaran diproses.', 'data' => $payment]);
    }
}
