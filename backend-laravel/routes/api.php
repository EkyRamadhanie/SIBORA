<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\CatalogManagementController;
use App\Http\Controllers\EquipmentController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RevenueController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\VenueController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', fn () => response()->json(['app' => 'SIBORA', 'status' => 'ok', 'version' => 'v1']));

    // Endpoint publik untuk katalog.
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::get('/venues', [VenueController::class, 'index']);
    Route::get('/venues/{lapangan}/schedule', [VenueController::class, 'schedule']);
    Route::get('/venues/{lapangan}', [VenueController::class, 'show']);
    Route::get('/sports', [VenueController::class, 'sports']);
    Route::get('/facilities', [VenueController::class, 'facilities']);
    Route::get('/equipments', [EquipmentController::class, 'index']);
    Route::get('/equipment-categories', [EquipmentController::class, 'categories']);

    Route::post('/payments/webhook', [PaymentController::class, 'webhook']);

    Route::middleware(['auth:sanctum', 'account.active'])->group(function () {
        // Autentikasi dan profil.
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::get('/user/profile', [ProfileController::class, 'show']);
        Route::put('/user/profile', [ProfileController::class, 'update']);
        Route::post('/user/emails', [ProfileController::class, 'addEmail']);
        Route::delete('/user/emails/{email}', [ProfileController::class, 'deleteEmail']);

        // Booking, sewa peralatan, histori, favorit, dan pembatalan.
        Route::post('/bookings/venues', [BookingController::class, 'bookVenue']);
        Route::post('/bookings/equipment-rentals', [BookingController::class, 'rentEquipment']);
        Route::get('/bookings/history', [BookingController::class, 'history']);
        Route::get('/transactions/{transaksi}', [BookingController::class, 'show']);
        Route::post('/transactions/{transaksi}/cancel', [BookingController::class, 'cancel']);
        Route::get('/favorites', [FavoriteController::class, 'index']);
        Route::post('/favorites/{lapangan}', [FavoriteController::class, 'store']);
        Route::delete('/favorites/{lapangan}', [FavoriteController::class, 'destroy']);

        // Pembayaran: konfirmasi demo hanya dapat dijalankan di APP_ENV=local.
        Route::post('/transactions/{transaksi}/payments', [PaymentController::class, 'store']);
        Route::post('/payments/{pembayaran}/mock-confirm', [PaymentController::class, 'mockConfirm']);

        // Endpoint pengelola dan admin. Controller tetap memeriksa role dan kepemilikan data.
        Route::get('/management/transactions', [BookingController::class, 'managementIndex']);
        Route::get('/management/catalogs', [CatalogManagementController::class, 'catalogs']);
        Route::get('/management/venues', [CatalogManagementController::class, 'venues']);
        Route::post('/management/venues', [CatalogManagementController::class, 'storeVenue']);
        Route::put('/management/venues/{lapangan}', [CatalogManagementController::class, 'updateVenue']);
        Route::delete('/management/venues/{lapangan}', [CatalogManagementController::class, 'deleteVenue']);
        Route::get('/management/equipments', [CatalogManagementController::class, 'equipment']);
        Route::post('/management/equipments', [CatalogManagementController::class, 'storeEquipment']);
        Route::put('/management/equipments/{peralatan}', [CatalogManagementController::class, 'updateEquipment']);
        Route::delete('/management/equipments/{peralatan}', [CatalogManagementController::class, 'deleteEquipment']);
        Route::get('/reports/revenue', [RevenueController::class, 'summary']);

        // Manajemen akun khusus admin.
        Route::get('/admin/users', [UserManagementController::class, 'index']);
        Route::post('/admin/users', [UserManagementController::class, 'store']);
        Route::get('/admin/users/{user}', [UserManagementController::class, 'show']);
        Route::put('/admin/users/{user}', [UserManagementController::class, 'update']);
        Route::delete('/admin/users/{user}', [UserManagementController::class, 'destroy']);
        Route::post('/admin/users/{user}/reset-password', [UserManagementController::class, 'resetPassword']);
    });
});
