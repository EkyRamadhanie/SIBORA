<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Akun utama. Kolom password_hash menyimpan hasil Hash::make(), bukan password asli.
        Schema::create('users', function (Blueprint $table) {
            $table->id('user_id');
            $table->string('username', 60)->unique();
            $table->string('email', 190)->unique();
            $table->string('password_hash');
            $table->enum('role', ['pelanggan', 'pengelola', 'admin'])->default('pelanggan');
            $table->enum('status_akun', ['aktif', 'nonaktif'])->default('aktif');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('user_profile', function (Blueprint $table) {
            $table->id('profile_id');
            $table->unsignedBigInteger('user_id')->unique();
            $table->string('nama_lengkap', 120)->nullable();
            $table->string('nickname', 60)->nullable();
            $table->string('gender', 30)->nullable();
            $table->string('negara', 80)->nullable();
            $table->string('bahasa', 50)->nullable();
            $table->string('zona_waktu', 60)->nullable();
            $table->string('no_hp', 30)->nullable();
            $table->string('foto_profil')->nullable();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        });

        Schema::create('user_email', function (Blueprint $table) {
            $table->id('email_id');
            $table->unsignedBigInteger('user_id');
            $table->string('email', 190)->unique();
            $table->boolean('is_primary')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
            $table->index(['user_id', 'is_primary']);
        });

        Schema::create('pengelola', function (Blueprint $table) {
            $table->id('pengelola_id');
            $table->unsignedBigInteger('user_id')->unique();
            $table->string('nama_perusahaan', 150);
            $table->string('no_hp', 30)->nullable();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
        });

        Schema::create('jenis_olahraga', function (Blueprint $table) {
            $table->id('jenis_olahraga_id');
            $table->string('nama', 80)->unique();
        });

        Schema::create('lapangan', function (Blueprint $table) {
            $table->id('lapangan_id');
            $table->unsignedBigInteger('pengelola_id');
            $table->string('nama', 150);
            $table->string('lokasi', 255);
            $table->decimal('harga_per_jam', 12, 2);
            $table->time('jam_buka');
            $table->time('jam_tutup');
            $table->string('foto')->nullable();
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif');
            $table->foreign('pengelola_id')->references('pengelola_id')->on('pengelola')->restrictOnDelete();
            $table->index(['status', 'nama']);
        });

        // Relasi many-to-many lapangan dan jenis olahraga sesuai ERD.
        Schema::create('lapangan_olahraga', function (Blueprint $table) {
            $table->unsignedBigInteger('lapangan_id');
            $table->unsignedBigInteger('jenis_olahraga_id');
            $table->primary(['lapangan_id', 'jenis_olahraga_id']);
            $table->foreign('lapangan_id')->references('lapangan_id')->on('lapangan')->cascadeOnDelete();
            $table->foreign('jenis_olahraga_id')->references('jenis_olahraga_id')->on('jenis_olahraga')->cascadeOnDelete();
        });

        Schema::create('lapangan_fasilitas', function (Blueprint $table) {
            $table->id('fasilitas_id');
            $table->unsignedBigInteger('lapangan_id');
            $table->string('nama_fasilitas', 120);
            $table->foreign('lapangan_id')->references('lapangan_id')->on('lapangan')->cascadeOnDelete();
            $table->unique(['lapangan_id', 'nama_fasilitas']);
        });

        Schema::create('favorit', function (Blueprint $table) {
            $table->id('favorit_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('lapangan_id');
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('user_id')->references('user_id')->on('users')->cascadeOnDelete();
            $table->foreign('lapangan_id')->references('lapangan_id')->on('lapangan')->cascadeOnDelete();
            $table->unique(['user_id', 'lapangan_id']);
        });

        Schema::create('kategori_peralatan', function (Blueprint $table) {
            $table->id('kategori_id');
            $table->string('nama', 100)->unique();
        });

        Schema::create('peralatan', function (Blueprint $table) {
            $table->id('peralatan_id');
            $table->unsignedBigInteger('pengelola_id');
            $table->unsignedBigInteger('kategori_id');
            $table->string('nama', 150);
            $table->text('spesifikasi')->nullable();
            $table->decimal('harga_per_jam', 12, 2);
            $table->unsignedInteger('stok')->default(0);
            $table->string('foto')->nullable();
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif');
            $table->foreign('pengelola_id')->references('pengelola_id')->on('pengelola')->restrictOnDelete();
            $table->foreign('kategori_id')->references('kategori_id')->on('kategori_peralatan')->restrictOnDelete();
            $table->index(['status', 'nama']);
        });

        Schema::create('transaksi', function (Blueprint $table) {
            $table->id('transaksi_id');
            $table->string('kode_booking', 40)->unique();
            $table->unsignedBigInteger('user_id');
            $table->string('nama_penyewa', 120);
            $table->string('no_hp_penyewa', 30);
            $table->string('email_penyewa', 190);
            $table->text('catatan')->nullable();
            $table->decimal('subtotal', 12, 2);
            $table->decimal('biaya_admin', 12, 2)->default(0);
            $table->decimal('total_bayar', 12, 2);
            $table->enum('status', ['menunggu_pembayaran', 'dp', 'lunas', 'batal', 'kedaluwarsa'])->default('menunggu_pembayaran');
            $table->dateTime('batas_bayar')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreign('user_id')->references('user_id')->on('users')->restrictOnDelete();
            $table->index(['user_id', 'status']);
            $table->index('created_at');
        });

        Schema::create('booking_lapangan', function (Blueprint $table) {
            $table->id('booking_id');
            $table->unsignedBigInteger('transaksi_id');
            $table->unsignedBigInteger('lapangan_id');
            $table->date('tanggal');
            $table->time('jam_mulai');
            $table->time('jam_selesai');
            $table->unsignedSmallInteger('durasi_jam');
            $table->decimal('harga_per_jam', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->foreign('transaksi_id')->references('transaksi_id')->on('transaksi')->restrictOnDelete();
            $table->foreign('lapangan_id')->references('lapangan_id')->on('lapangan')->restrictOnDelete();
            $table->index(['lapangan_id', 'tanggal', 'jam_mulai', 'jam_selesai']);
        });

        Schema::create('sewa_peralatan', function (Blueprint $table) {
            $table->id('sewa_id');
            $table->unsignedBigInteger('transaksi_id');
            $table->unsignedBigInteger('peralatan_id');
            $table->unsignedInteger('jumlah');
            $table->date('tanggal_sewa');
            $table->time('waktu_mulai');
            $table->time('waktu_selesai');
            $table->unsignedSmallInteger('durasi_jam');
            $table->decimal('harga_per_jam', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->foreign('transaksi_id')->references('transaksi_id')->on('transaksi')->restrictOnDelete();
            $table->foreign('peralatan_id')->references('peralatan_id')->on('peralatan')->restrictOnDelete();
            $table->index(
                [
                    'peralatan_id',
                    'tanggal_sewa',
                    'waktu_mulai',
                    'waktu_selesai'
                ],
                'sewa_alat_waktu_idx'
            );
        });

        Schema::create('jadwal_slot', function (Blueprint $table) {
            $table->id('slot_id');
            $table->unsignedBigInteger('lapangan_id');
            $table->unsignedBigInteger('booking_id')->nullable();
            $table->date('tanggal');
            $table->time('jam_mulai');
            $table->time('jam_selesai');
            $table->enum('status', ['tersedia', 'dipesan', 'dibatalkan'])->default('tersedia');
            $table->foreign('lapangan_id')->references('lapangan_id')->on('lapangan')->restrictOnDelete();
            $table->foreign('booking_id')->references('booking_id')->on('booking_lapangan')->nullOnDelete();
            $table->index(['lapangan_id', 'tanggal', 'status']);
        });

        Schema::create('pembayaran', function (Blueprint $table) {
            $table->id('pembayaran_id');
            $table->unsignedBigInteger('transaksi_id');
            $table->enum('metode', ['bca', 'bni', 'qris', 'cash', 'transfer_bank', 'lainnya']);
            $table->string('ref_gateway', 190)->nullable()->unique();
            $table->decimal('jumlah', 12, 2);
            $table->enum('status', ['menunggu', 'berhasil', 'gagal', 'dikembalikan'])->default('menunggu');
            $table->dateTime('waktu_bayar')->nullable();
            $table->foreign('transaksi_id')->references('transaksi_id')->on('transaksi')->restrictOnDelete();
            $table->index(['transaksi_id', 'status']);
        });

        Schema::create('pembatalan', function (Blueprint $table) {
            $table->id('pembatalan_id');
            $table->unsignedBigInteger('transaksi_id')->unique();
            $table->unsignedBigInteger('dibatalkan_oleh');
            $table->text('alasan');
            $table->enum('status_refund', ['tidak_berlaku', 'menunggu', 'diproses', 'berhasil', 'ditolak'])->default('tidak_berlaku');
            $table->decimal('jumlah_refund', 12, 2)->default(0);
            $table->dateTime('tanggal_batal')->useCurrent();
            $table->foreign('transaksi_id')->references('transaksi_id')->on('transaksi')->restrictOnDelete();
            $table->foreign('dibatalkan_oleh')->references('user_id')->on('users')->restrictOnDelete();
        });

        // Token autentikasi personal dari Laravel Sanctum.
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('pembatalan');
        Schema::dropIfExists('pembayaran');
        Schema::dropIfExists('jadwal_slot');
        Schema::dropIfExists('sewa_peralatan');
        Schema::dropIfExists('booking_lapangan');
        Schema::dropIfExists('transaksi');
        Schema::dropIfExists('peralatan');
        Schema::dropIfExists('kategori_peralatan');
        Schema::dropIfExists('favorit');
        Schema::dropIfExists('lapangan_fasilitas');
        Schema::dropIfExists('lapangan_olahraga');
        Schema::dropIfExists('lapangan');
        Schema::dropIfExists('jenis_olahraga');
        Schema::dropIfExists('pengelola');
        Schema::dropIfExists('user_email');
        Schema::dropIfExists('user_profile');
        Schema::dropIfExists('users');
    }
};
