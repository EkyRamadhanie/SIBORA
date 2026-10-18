# SIBORA Backend — Laravel 12 + MySQL

Dokumentasi ini melengkapi [README utama proyek](../README.md). Backend Laravel sekaligus menyajikan frontend statis dari folder `public/`, sehingga untuk pengembangan lokal cukup jalankan satu server Laravel.

## 1. Teknologi dan skema

- Laravel 12, PHP 8.2+, MySQL/MariaDB, Laravel Sanctum bearer token.
- Satu migration utama membuat 17 tabel bisnis sesuai ERD dan tabel teknis `personal_access_tokens`.
- Seeder demo ada pada `database/seeders/DatabaseSeeder.php`. Akun/katalog demo dibuat menggunakan `updateOrCreate` atau `firstOrCreate` agar seeder dapat diulang.
- Role yang digunakan: `pelanggan`, `pengelola`, dan `admin`. Hanya Pelanggan yang boleh booking lapangan atau menyewa peralatan. Pengelola dibatasi pada asetnya, sedangkan Admin mengelola akun dan melihat laporan global.

## 2. Instalasi lokal

Dari folder `backend-laravel`, ikuti langkah lengkap di README utama. Ringkasnya:

```powershell
Copy-Item .env.example .env
composer install
php artisan key:generate
# Buat database `sibora` pada MySQL dan sesuaikan kredensial pada .env.
php artisan migrate --seed
php artisan route:list --path=api/v1
php artisan serve --host=127.0.0.1 --port=8000
```

Akses frontend di `http://127.0.0.1:8000/index.html` dan status API di `http://127.0.0.1:8000/api/v1/health`.
Jangan menjalankan `migrate:fresh` pada database yang berisi data penting.

## 3. Akun demo (lokal saja)

Akun ini dibuat oleh seeder untuk pengujian lokal. Password sederhana di bawah **tidak boleh digunakan pada server produksi**.

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | `admin` |
| `sibora` | `sibora2026` | `admin` |
| `budi` | `123456` | `pengelola` |
| `pengelola` | `pengelola123` | `pengelola` |
| `dani` | `123456` | `pelanggan` |
| `user` | `123456` | `pelanggan` |

Seeder juga menambahkan contoh lapangan, jenis olahraga, fasilitas, kategori peralatan, dan alat sewa.

## 4. Cara autentikasi API

Login menggunakan username atau email. Respons berisi token. Sertakan token pada endpoint yang membutuhkan login:

```http
Authorization: Bearer TOKEN_HASIL_LOGIN
Accept: application/json
```

Contoh PowerShell:

```powershell
$login = Invoke-RestMethod -Method Post `
  -Uri 'http://127.0.0.1:8000/api/v1/auth/login' `
  -ContentType 'application/json' `
  -Body (@{ username = 'dani'; password = '123456' } | ConvertTo-Json)

$token = $login.token
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/v1/venues' `
  -Headers @{ Authorization = "Bearer $token"; Accept = 'application/json' }
```

Registrasi membutuhkan `username`, `email` lengkap, `password`, `password_confirmation`; `nama_lengkap` dan `no_hp` opsional. Role registrasi publik selalu `pelanggan`; role pengelola/admin hanya dapat diberikan melalui manajemen admin.

## 5. Daftar endpoint API

Semua endpoint di bawah memakai prefix `/api/v1`.

### Publik

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/health` | Status API |
| POST | `/auth/register` | Registrasi pelanggan |
| POST | `/auth/login` | Login dan membuat token |
| GET | `/venues` | Katalog lapangan; filter `search`, `jenis_olahraga`, `harga_min`, `harga_max`, `per_page` |
| GET | `/venues/{lapangan}` | Detail lapangan, jenis olahraga, fasilitas |
| GET | `/venues/{lapangan}/schedule?tanggal=YYYY-MM-DD` | Slot per jam dan interval booking terpakai |
| GET | `/sports` | Daftar jenis olahraga |
| GET | `/facilities?lapangan_id=1` | Daftar fasilitas |
| GET | `/equipments` | Katalog peralatan; filter `search`, `kategori`, `kategori_id` |
| GET | `/equipment-categories` | Kategori peralatan |
| POST | `/payments/webhook` | Callback gateway; wajib secret webhook yang dikonfigurasi |

### Pelanggan dan endpoint login

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/auth/logout` | Cabut token login saat ini |
| GET | `/auth/me` | Informasi akun yang login |
| GET / PUT | `/user/profile` | Melihat/mengubah profil |
| POST | `/user/emails` | Tambah email alternatif, body `{ "email": "lain@example.com" }` |
| DELETE | `/user/emails/{email_id}` | Hapus email alternatif milik sendiri; email utama tidak dapat dihapus |
| POST | `/bookings/venues` | Booking lapangan |
| POST | `/bookings/equipment-rentals` | Sewa satu atau lebih peralatan pada rentang waktu yang sama |
| GET | `/bookings/history` | Riwayat transaksi pelanggan login |
| GET | `/transactions/{transaksi_id}` | Detail transaksi (pemilik, pengelola terkait, atau admin) |
| POST | `/transactions/{transaksi_id}/cancel` | Batalkan transaksi dengan menyimpan record pembatalan |
| GET | `/favorites` | Lihat favorit sendiri |
| POST / DELETE | `/favorites/{lapangan_id}` | Tambahkan/hapus favorit |
| POST | `/transactions/{transaksi_id}/payments` | Mencatat permintaan pembayaran |
| POST | `/payments/{pembayaran_id}/mock-confirm` | Konfirmasi simulasi pembayaran, hanya `APP_ENV=local` |

Contoh body booking lapangan:

```json
{
  "lapangan_id": 1,
  "tanggal": "2026-12-10",
  "jam_mulai": "10:00",
  "durasi_jam": 2,
  "nama_penyewa": "Dani Raja Hutan",
  "no_hp_penyewa": "081234567890",
  "email_penyewa": "dani@sibora.local",
  "catatan": "Booking untuk latihan"
}
```

`jam_selesai` dihitung backend dari `jam_mulai + durasi_jam`. Backend menolak pemesanan di luar jam operasional, waktu lampau, dan waktu yang tumpang tindih dengan booking aktif.

Contoh body sewa peralatan:

```json
{
  "tanggal_sewa": "2026-12-10",
  "waktu_mulai": "10:00",
  "durasi_jam": 2,
  "nama_penyewa": "Dani Raja Hutan",
  "no_hp_penyewa": "081234567890",
  "email_penyewa": "dani@sibora.local",
  "items": [
    { "peralatan_id": 1, "jumlah": 2 }
  ]
}
```

Jumlah stok yang tersedia dihitung berdasarkan sewa lain yang waktunya bertumpang tindih. Untuk menjaga laporan setiap pengelola tetap tepat, satu transaksi sewa peralatan dibatasi pada peralatan dari pengelola yang sama.

Pembayaran dibuat dengan body seperti `{ "metode": "qris" }` atau `{ "metode": "bca", "jumlah": 50000 }`. Tanpa `jumlah`, nominal permintaan adalah sisa tagihan. Endpoint ini mencatat pembayaran pending, tetapi tidak melakukan charge pada gateway sungguhan.

### Admin/pengelola

| Method | Endpoint | Fungsi / akses |
|---|---|---|
| GET | `/management/transactions` | Daftar transaksi; admin melihat semua, pengelola hanya transaksi terkait lapangannya/peralatannya |
| GET | `/management/catalogs` | Referensi olahraga, kategori peralatan, dan pengelola |
| GET / POST | `/management/venues` | Daftar/tambah lapangan milik sendiri; admin dapat menetapkan pengelola |
| PUT / DELETE | `/management/venues/{id}` | Edit atau nonaktifkan lapangan |
| GET / POST | `/management/equipments` | Daftar/tambah peralatan milik sendiri |
| PUT / DELETE | `/management/equipments/{id}` | Edit atau nonaktifkan peralatan |
| GET | `/reports/revenue` | Laporan pendapatan; admin global, pengelola terbatas pada asetnya |
| GET / POST | `/admin/users` | Daftar/tambah akun, khusus admin |
| GET / PUT / DELETE | `/admin/users/{user_id}` | Detail/edit/nonaktifkan akun, khusus admin |
| POST | `/admin/users/{user_id}/reset-password` | Reset password dan cabut token lama, khusus admin |

Untuk membuat pengelola lewat endpoint admin, kirim `role: "pengelola"` dan `nama_perusahaan`. Pengelola yang registrasi lewat endpoint publik tidak otomatis memperoleh role pengelola.

## 6. Status transaksi

- `menunggu_pembayaran`: transaksi telah dibuat, pembayaran belum terkonfirmasi.
- `dp`: pembayaran terkonfirmasi tetapi jumlahnya belum melunasi tagihan.
- `lunas`: jumlah pembayaran terkonfirmasi telah mencapai total bayar.
- `batal`: transaksi dibatalkan; record pembatalan tetap tersimpan.
- `kedaluwarsa`: batas pembayaran sudah lewat dan status ditandai kedaluwarsa pada proses pembayaran.

`pembatalan.status_refund` melacak status refund. Backend tidak mengirim refund sungguhan ke gateway karena integrasi penyedia pembayaran belum ditentukan.

## 7. Catatan integrasi pembayaran dan produksi

1. `mock-confirm` sengaja hanya aktif di environment `local`, untuk pengujian alur UI.
2. Gateway sungguhan belum dipilih atau dikonfigurasi. Implementasikan pembuatan charge, signature callback resmi provider, verifikasi nominal/reference, dan pemrosesan refund berdasarkan dokumentasi provider sebelum produksi.
3. Set `PAYMENT_WEBHOOK_SECRET` ke nilai acak yang kuat dan gunakan HTTPS pada server. Secret header pada template ini adalah proteksi minimal; provider yang digunakan sebaiknya memakai signature/timestamp sesuai spesifikasinya.
4. Ganti password seluruh akun demo, batasi CORS dengan domain frontend resmi, dan nonaktifkan `APP_DEBUG` pada produksi.
5. Untuk mengulang seluruh database saat development, `php artisan migrate:fresh --seed` **menghapus semua tabel dan data**. Jangan jalankan pada database berisi data penting.

## 8. Catatan tentang ERD

Semua 17 tabel bisnis utama dari ERD disertakan. `personal_access_tokens` ditambahkan karena Sanctum membutuhkannya untuk autentikasi API token. Kolom `updated_at` tidak ditambahkan pada tabel yang tidak menampilkannya di ERD; model terkait mengatur `timestamps = false`. `jadwal_slot.booking_id` nullable supaya slot dapat merepresentasikan keadaan yang belum terikat booking. Relasi pengelola, tabel pivot olahraga, fasilitas, serta audit pembatalan dipertahankan.
