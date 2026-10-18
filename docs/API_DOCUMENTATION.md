# 📡 SIBORA — RESTful API Documentation (v1)

Dokumentasi lengkap antarmuka pemrograman aplikasi (API) untuk **SIBORA (Sistem Booking Fasilitas Olahraga Online)**.

- **Base URL:** `http://127.0.0.1:8000/api/v1`
- **Format Data:** JSON (`Content-Type: application/json`, `Accept: application/json`)
- **Autentikasi:** Laravel Sanctum Bearer Token (`Authorization: Bearer <access_token>`)
- **Koleksi Siap Pakai:** File [SIBORA.postman_collection.json](../postman/SIBORA.postman_collection.json) & [SIBORA_API.http](../SIBORA_API.http)

---

## 📑 Daftar Isi Endpoint

1. [Sistem & Health Check](#1-sistem--health-check)
2. [Autentikasi & Akun](#2-autentikasi--akun)
3. [Katalog Lapangan & Fasilitas (Publik)](#3-katalog-lapangan--fasilitas-publik)
4. [Katalog Peralatan (Publik)](#4-katalog-peralatan-publik)
5. [Profil Pengguna & Favorit](#5-profil-pengguna--favorit)
6. [Booking Lapangan & Sewa Alat](#6-booking-lapangan--sewa-alat)
7. [Pembayaran & Webhook](#7-pembayaran--webhook)
8. [Manajemen Katalog (Pengelola & Admin)](#8-manajemen-katalog-pengelola--admin)
9. [Laporan Pendapatan](#9-laporan-pendapatan)
10. [Administrasi Pengguna (Khusus Admin)](#10-administrasi-pengguna-khusus-admin)

---

## 1. Sistem & Health Check

### `GET /health`
Memeriksa status aktif server API.
- **Akses:** Publik
- **Contoh Respons (200 OK):**
```json
{
  "app": "SIBORA",
  "status": "ok",
  "version": "v1"
}
```

---

## 2. Autentikasi & Akun

### `POST /auth/register`
Mendaftarkan akun baru pelanggan.
- **Akses:** Publik
- **Request Body:**
```json
{
  "username": "ahmad_futsal",
  "email": "ahmad@example.com",
  "password": "Password123!",
  "password_confirmation": "Password123!",
  "nama_lengkap": "Ahmad Subarjo",
  "no_hp": "081234567890"
}
```
- **Respons (201 Created):**
```json
{
  "message": "Registrasi berhasil",
  "token": "1|raND0mStr1ngT0k3n...",
  "user": {
    "user_id": 7,
    "username": "ahmad_futsal",
    "email": "ahmad@example.com",
    "role": "pelanggan"
  }
}
```

### `POST /auth/login`
Masuk menggunakan username atau email.
- **Akses:** Publik
- **Request Body:**
```json
{
  "username": "dani",
  "password": "123456"
}
```
- **Respons (200 OK):** Mengembalikan bearer token untuk otorisasi sesi.

### `POST /auth/logout`
Mencabut token sesi saat ini.
- **Akses:** Memerlukan Token Sanctum
- **Respons (200 OK):** `{"message": "Berhasil logout"}`

### `GET /auth/me`
Mengambil data pengguna yang sedang login.
- **Akses:** Memerlukan Token Sanctum

---

## 3. Katalog Lapangan & Fasilitas (Publik)

### `GET /venues`
Mengambil daftar lapangan aktif beserta fasilitas dan jenis olahraganya.
- **Query Params Opsional:**
  - `sport`: Nama cabang olahraga (misal: `Futsal`)
  - `search`: Kata kunci pencarian nama atau lokasi
- **Respons (200 OK):** Array objek lapangan.

### `GET /venues/{id}`
Detail lengkap spesifik satu lapangan beserta informasi kontak pengelola.

### `GET /venues/{id}/schedule`
Melihat status ketersediaan slot jam lapangan pada tanggal tertentu.
- **Query Params Wajib:** `tanggal=YYYY-MM-DD` (contoh: `?tanggal=2026-12-10`)
- **Respons (200 OK):** Daftar slot waktu dan status (`tersedia` / `dipesan`).

### `GET /sports`
Daftar seluruh cabang olahraga yang terdaftar dalam sistem.

### `GET /facilities`
Daftar seluruh fasilitas lapangan yang tersedia.

---

## 4. Katalog Peralatan (Publik)

### `GET /equipments`
Mengambil daftar alat olahraga yang dapat disewa beserta sisa stoknya.

### `GET /equipment-categories`
Daftar kategori peralatan (Bola, Raket, Sepatu, Pelindung).

---

## 5. Profil Pengguna & Favorit

### `GET /user/profile` & `PUT /user/profile`
Melihat dan memperbarui identitas profil (nama lengkap, nickname, gender, no HP, bahasa, zona waktu).

### `GET /favorites`
Menampilkan daftar lapangan yang disimpan sebagai favorit oleh pengguna.

### `POST /favorites/{lapangan_id}` & `DELETE /favorites/{lapangan_id}`
Menambahkan atau menghapus lapangan dari daftar favorit.

---

## 6. Booking Lapangan & Sewa Alat

> **Catatan:** Fitur booking dan sewa alat hanya diizinkan untuk akun dengan role `pelanggan`.

### `POST /bookings/venues`
Membuat reservasi lapangan baru.
- **Request Body:**
```json
{
  "lapangan_id": 1,
  "tanggal": "2026-12-10",
  "jam_mulai": "14:00",
  "durasi_jam": 2,
  "nama_penyewa": "Dani Raja Hutan",
  "no_hp_penyewa": "081234567890",
  "email_penyewa": "dani@sibora.local",
  "catatan": "Latihan tanding persahabatan"
}
```
- **Respons (201 Created):** Objek `transaksi` dengan rincian biaya subtotal, biaya admin (5%), dan `total_bayar`.

### `POST /bookings/equipment-rentals`
Menyewa satu atau beberapa peralatan olahraga sekaligus.
- **Request Body:**
```json
{
  "tanggal_sewa": "2026-12-10",
  "waktu_mulai": "14:00",
  "durasi_jam": 2,
  "nama_penyewa": "Dani Raja Hutan",
  "no_hp_penyewa": "081234567890",
  "email_penyewa": "dani@sibora.local",
  "items": [
    { "peralatan_id": 1, "jumlah": 2 },
    { "peralatan_id": 2, "jumlah": 1 }
  ]
}
```

### `GET /bookings/history`
Riwayat semua transaksi yang pernah dilakukan oleh pelanggan yang login.

### `GET /transactions/{id}`
Detail transaksi spesifik untuk keperluan cetak struk digital / invoice.

### `POST /transactions/{id}/cancel`
Mengajukan pembatalan transaksi dengan menyertakan alasan.

---

## 7. Pembayaran & Webhook

### `POST /transactions/{id}/payments`
Membuat tagihan pembayaran untuk transaksi tertentu.
- **Request Body:**
```json
{
  "metode": "qris",
  "jumlah": 315000
}
```

### `POST /payments/{id}/mock-confirm`
*(Khusus Lingkungan Lokal/Demo)* Mengonfirmasi keberhasilan pembayaran secara instan tanpa gateway nyata.

### `POST /payments/webhook`
Endpoint penerima webhook otomatis dari payment gateway resmi (Midtrans/Xendit) untuk memperbarui status transaksi di server produksi.

---

## 8. Manajemen Katalog (Pengelola & Admin)

Akses terbatas untuk peran `pengelola` (hanya aset miliknya) dan `admin` (semua aset).

| Metode | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/management/transactions` | Daftar transaksi booking yang masuk |
| `GET` | `/management/venues` | Daftar lapangan milik pengelola |
| `POST` | `/management/venues` | Tambah lapangan baru (mendukung upload foto `multipart/form-data`) |
| `PUT` | `/management/venues/{id}` | Edit data lapangan |
| `DELETE` | `/management/venues/{id}` | Hapus lapangan |
| `GET` | `/management/equipments` | Daftar peralatan milik pengelola |
| `POST` | `/management/equipments` | Tambah peralatan sewa baru |
| `PUT` | `/management/equipments/{id}` | Update stok atau tarif peralatan |
| `DELETE` | `/management/equipments/{id}` | Hapus peralatan |

---

## 9. Laporan Pendapatan

### `GET /reports/revenue`
Menghitung total pendapatan kotor, potongan admin, dan estimasi laba bersih.
- Pengelola: Hanya mencakup transaksi atas aset miliknya.
- Admin: Rekapitulasi keuangan seluruh platform.

---

## 10. Administrasi Pengguna (Khusus Admin)

Akses eksklusif untuk peran `admin`.

| Metode | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/admin/users` | Menampilkan seluruh akun terdaftar beserta statusnya |
| `POST` | `/admin/users` | Menambahkan pengguna baru (bisa set role `admin`/`pengelola`) |
| `GET` | `/admin/users/{id}` | Detail profil pengguna |
| `PUT` | `/admin/users/{id}` | Update status akun (`aktif`/`nonaktif`) atau role |
| `DELETE` | `/admin/users/{id}` | Menghapus akun pengguna |
| `POST` | `/admin/users/{id}/reset-password` | Reset password akun pengguna ke nilai baru |
