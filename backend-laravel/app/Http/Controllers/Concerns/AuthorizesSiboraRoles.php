<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Lapangan;
use App\Models\Peralatan;
use App\Models\Transaksi;
use App\Models\User;

trait AuthorizesSiboraRoles
{
    protected function requireRole(string ...$roles): User
    {
        $user = request()->user();
        abort_unless($user && in_array($user->role, $roles, true), 403, 'Anda tidak memiliki hak akses untuk tindakan ini.');
        return $user;
    }

    protected function canManageVenue(User $user, Lapangan $lapangan): bool
    {
        if ($user->role === 'admin') return true;
        return $user->role === 'pengelola'
            && $lapangan->pengelola()->where('user_id', $user->user_id)->exists();
    }

    protected function canManageEquipment(User $user, Peralatan $peralatan): bool
    {
        if ($user->role === 'admin') return true;
        return $user->role === 'pengelola'
            && $peralatan->pengelola()->where('user_id', $user->user_id)->exists();
    }

    protected function canSeeTransaction(User $user, Transaksi $transaksi): bool
    {
        if ($user->role === 'admin' || (int) $transaksi->user_id === (int) $user->user_id) return true;
        if ($user->role !== 'pengelola') return false;
        $ownsVenueBooking = $transaksi->bookingLapangan()->whereHas('lapangan.pengelola', fn ($q) => $q->where('user_id', $user->user_id))->exists();
        $ownsEquipmentRental = $transaksi->sewaPeralatan()->whereHas('peralatan.pengelola', fn ($q) => $q->where('user_id', $user->user_id))->exists();
        return $ownsVenueBooking || $ownsEquipmentRental;
    }

    protected function ownedManagerId(User $user): ?int
    {
        if ($user->role === 'admin') return null;
        return $user->pengelola()->value('pengelola_id');
    }
}
