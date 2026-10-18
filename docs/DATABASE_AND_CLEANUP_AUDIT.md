# Catatan Audit Database dan Pembersihan

## Pembersihan paket

- Frontend yang aktif dipertahankan hanya di `backend-laravel/public/`. Salinan HTML/CSS/JS lama di root dihapus agar tidak ada dua versi yang dapat diedit secara keliru.
- Dependency hasil instalasi `backend-laravel/vendor/` tidak dipaketkan; `composer.lock` tetap dipertahankan. Jalankan `composer install` setelah mengekstrak.
- File `.env`, log Laravel, file sesi/cache hasil runtime dan cache bootstrap hasil generate dikeluarkan. Gunakan `.env.example` untuk membuat konfigurasi lokal.
- Dokumentasi lama yang berada di dalam `public/` dihapus dari web root; panduan utama dipusatkan di `README.md`.
- Seeder dibersihkan dari variabel `$fields` yang tidak pernah dipakai.

## Pemeriksaan statis yang dilakukan

- Syntax check semua file PHP sumber (`app`, `bootstrap`, `config`, `database`, `routes`).
- `php artisan route:list --path=api/v1` dapat dijalankan dari snapshot asli dan menunjukkan 44 route.
- Pemeriksaan JSON `composer.json`, `composer.lock`, dan koleksi Postman.
- Pemeriksaan konsistensi tabel migration dengan model Eloquent, fillable model terhadap kolom skema, dan referensi file CSS/JavaScript pada frontend.
- Validasi sintaks JavaScript pada `public/js/`.
- Memeriksa bahwa migration membuat tabel dalam urutan relasi yang sesuai dan `down()` menghapus dalam urutan terbalik. Seeder menggunakan `updateOrCreate`/`firstOrCreate` untuk akun serta katalog dan membersihkan fasilitas venue sebelum membuat ulang.

## Batasan pengujian

Migrasi tidak dapat dijalankan terhadap database dalam lingkungan pemeriksaan ini: PHP CLI yang tersedia tidak memiliki driver PDO MySQL/SQLite dan tidak ada server database lokal. `php artisan migrate:status` mengembalikan `could not find driver`. Ini adalah keterbatasan lingkungan pemeriksaan, bukan bukti migration gagal. Untuk verifikasi runtime di Windows/XAMPP, pastikan `pdo_mysql` aktif pada PHP CLI, buat database kosong `sibora`, lalu jalankan:

```powershell
php artisan migrate --seed
php artisan migrate:status
php artisan db:seed --class=DatabaseSeeder
```

Jangan gunakan `migrate:fresh` di database yang menyimpan data penting. Seeder tidak membuat transaksi contoh; lakukan booking/sewa dengan akun Pelanggan untuk mengisi riwayat.
- Satu gambar hasil upload uji dari `public/uploads/sibora/lapangan/` dikeluarkan dari paket; foto yang diunggah pengguna adalah data runtime, bukan source code.
