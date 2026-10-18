<?php

namespace App\Services;

use App\Models\Transaksi;
use App\Models\User;
use Illuminate\Support\Str;

class TransactionService
{
    public function createHeader(User $user, array $data, float $subtotal): Transaksi
    {
        $fee = round($subtotal * ((float) config('sibora.admin_fee_percent', 5) / 100), 2);
        do {
            $code = 'SIB-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
        } while (Transaksi::where('kode_booking', $code)->exists());

        return Transaksi::create([
            'kode_booking' => $code,
            'user_id' => $user->user_id,
            'nama_penyewa' => $data['nama_penyewa'],
            'no_hp_penyewa' => $data['no_hp_penyewa'],
            'email_penyewa' => $data['email_penyewa'],
            'catatan' => $data['catatan'] ?? null,
            'subtotal' => $subtotal,
            'biaya_admin' => $fee,
            'total_bayar' => $subtotal + $fee,
            'status' => 'menunggu_pembayaran',
            'batas_bayar' => now()->addHours((int) config('sibora.payment_deadline_hours', 24)),
        ]);
    }
}
