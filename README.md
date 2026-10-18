<div align="center">

# 🏟️ SIBORA
### Sistem Booking Fasilitas Olahraga & Persewaan Peralatan Online

[![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Sanctum](https://img.shields.io/badge/Auth-Sanctum%20Bearer-red?style=for-the-badge)](https://laravel.com/docs/sanctum)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-RESTful%20API-success?style=for-the-badge)](#-arsitektur-sistem)

*Solusi digital terintegrasi untuk reservasi lapangan olahraga, penyewaan alat, otomasi transaksi, dan analitik pendapatan berbasis peran.*

---

[Fitur Utama](#-fitur-utama) • [Teknologi](#-teknologi) • [Struktur Proyek](#-struktur-proyek) • [Panduan Instalasi](#-panduan-instalasi-cepat) • [Akun Demo](#-akun-demo-lokal) • [Dokumentasi Lengkap](#-indeks-dokumentasi-arsitektur) • [Roadmap](#-rencana-pengembangan-roadmap)

</div>

---

## 📖 Tentang SIBORA

**SIBORA** adalah platform manajemen dan pemesanan fasilitas olahraga (Futsal, Badminton, Basket, Padel, Tenis) yang dirancang untuk mengatasi inefisiensi pencatatan manual, risiko bentrok jadwal (*double booking*), serta ketiadaan transparansi laporan bagi pemilik gelanggang olahraga.

Sistem ini dibangun dengan arsitektur **Clean Full Stack**:
- **Backend API**: Menggunakan **Laravel 12** dengan arsitektur RESTful murni, validasi request ketat, autentikasi stateless berbasis token **Laravel Sanctum**, dan integritas relasional basis data yang kuat.
- **Frontend Client**: Antarmuka web responsif berbasis **HTML5 Semantik, Modern Vanilla CSS, dan Modular JavaScript**. Frontend terintegrasi langsung dalam direktori `backend-laravel/public/`, memungkinkan seluruh ekosistem aplikasi dijalankan secara efisien dari satu server lokal tanpa memerlukan proses build yang rumit.

---

## ✨ Fitur Utama

Aplikasi dirancang dengan **Role-Based Access Control (RBAC)** yang membagi wewenang secara presisi ke dalam 4 tingkatan:

### 🌐 1. Pengunjung (Guest / Publik)
- Menjelajah katalog lapangan dengan filter cabang olahraga, fasilitas, dan kata kunci lokasi.
- Memeriksa jadwal ketersediaan slot jam lapangan secara interaktif dan real-time.
- Melihat katalog peralatan olahraga yang tersedia untuk disewa beserta tarif dan sisa stok.

### 👤 2. Pelanggan (Customer)
- Registrasi akun baru dan autentikasi aman dengan bearer token.
- Booking lapangan olahraga dengan penentuan tanggal, jam mulai, dan durasi tanding.
- Sewa multi-peralatan olahraga dalam satu kesatuan transaksi reservasi.
- Simulasi pembayaran multi-channel (*mock payment*: BCA, BNI, QRIS, Transfer Bank, Cash).
- Melihat riwayat transaksi lengkap dengan status pembayaran dan batas waktu transfer.
- Cetak struk reservasi digital / invoice resmi langsung dari browser.
- Kelola profil personal dan daftar lapangan favorit untuk pemesanan cepat.

### 🏢 3. Pengelola Lapangan (Partner / Venue Manager)
- Dashboard operasional menampilkan ringkasan performa fasilitas yang dikelola.
- Manajemen katalog lapangan: tambah, ubah tarif/jadwal buka-tutup, dan unggah foto fasilitas.
- Manajemen inventaris peralatan olahraga: kontrol stok dan tarif sewa per jam.
- Pemantauan pesanan masuk khusus untuk lapangan dan alat milik pengelola bersangkutan.
- Laporan analitik pendapatan terisolasi: rincian pendapatan kotor, potongan admin, dan estimasi laba bersih.

### 🛡️ 4. Super Administrator
- Ringkasan statistik platform secara global (total lapangan, transaksi, pengguna, dan pendapatan).
- Manajemen akun pengguna: pembuatan akun baru, penyesuaian peran (`admin`, `pengelola`, `pelanggan`), aktivasi/nonaktifasi akun, dan reset password.
- Moderasi katalog lintas seluruh pengelola gelanggang olahraga.
- Laporan keuangan global dan audit log pembatalan transaksi / refund.

---

## 🛠️ Teknologi

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Backend Framework** | Laravel 12.x | REST API, Service Layer, Eloquent ORM |
| **Runtime Bahasa** | PHP 8.2+ | Strong typing, Bcrypt hashing, Fileinfo validation |
| **Autentikasi API** | Laravel Sanctum 4.x | Stateful & stateless Bearer Token |
| **Basis Data** | MySQL / MariaDB | 17 Tabel Relasional dengan Foreign Keys & Indexing |
| **Frontend UI** | HTML5, CSS3, Vanilla JS | Design Tokens, Mobile-Friendly, Zero Build Step |
| **API Testing** | VS Code REST Client & Postman | File `.http` dan Postman Collection disertakan |
| **Dev Environment** | Windows XAMPP / Native CLI | Dilengkapi skrip otomatisasi `start_server.bat` |

---

## 📂 Struktur Proyek

Repositori ini disusun dengan standar arsitektur industri yang rapi dan terisolasi:

```text
SIBORA/
├── .github/                        # Template komunitas GitHub (Issue & PR templates)
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── backend-laravel/                # Sumber kode utama Backend API & Frontend Statis
│   ├── app/
│   │   ├── Http/Controllers/       # Controller REST API per domain modul
│   │   ├── Models/                 # Eloquent Models & relasi relasional
│   │   └── Services/               # Logika kalkulasi bisnis, booking, & payment
│   ├── bootstrap/                  # Inisialisasi framework Laravel
│   ├── config/                     # Konfigurasi aplikasi & database
│   ├── database/
│   │   ├── migrations/             # Skema migrasi 17 tabel terpadu
│   │   └── seeders/                # Seeder data awal untuk pengujian lokal
│   ├── public/                     # Frontend aktif (HTML, CSS, JS modular, aset)
│   │   ├── css/                    # Desain stylesheet global & komponen
│   │   ├── js/                     # Modul logika client, API client fetch
│   │   ├── uploads/sibora/         # Penyimpanan media (lapangan & peralatan)
│   │   └── *.html                  # Halaman antarmuka publik, pelanggan, & admin
│   ├── routes/
│   │   └── api.php                 # 44 endpoint RESTful API versi 1
│   ├── storage/                    # Log framework & sesi
│   ├── tests/                      # Testing suite
│   ├── .env.example                # Templat variabel lingkungan konfigurasi
│   ├── artisan                     # Antarmuka CLI Laravel
│   ├── composer.json               # Definisi dependensi PHP
│   └── composer.lock               # Kunci versi dependensi stabil
├── docs/                           # Dokumentasi mendalam teknis & arsitektur
│   ├── ARCHITECTURE.md             # Desain sistem, RBAC, dan siklus transaksi
│   ├── API_DOCUMENTATION.md        # Spesifikasi 44 endpoint API beserta payload
│   ├── DATABASE_SCHEMA.md          # ERD Mermaid & kamus data 17 tabel
│   └── DATABASE_AND_CLEANUP_AUDIT.md # Riwayat audit & validasi paket
├── postman/                        # Pengujian API via Postman
│   └── SIBORA.postman_collection.json
├── .gitignore                      # Filter git profesional (bebas sampah & credentials)
├── CONTRIBUTING.md                 # Panduan kolaborasi, commit, dan branching
├── LICENSE                         # Lisensi sumber terbuka (MIT)
├── README.md                       # Dokumentasi utama proyek
├── ROADMAP.md                      # Rencana pengembangan skala lanjut
├── SIBORA_API.http                 # File pengujian API langsung di VS Code
└── start_server.bat                # Skrip 1-klik menjalankan MySQL & server lokal Windows
```

---

## 🚀 Panduan Instalasi Cepat

Ikuti langkah-langkah di bawah ini untuk menjalankan SIBORA di lingkungan lokal:

### 1. Prasyarat Sistem
- **PHP** minimal versi **8.2** (pastikan ekstensi `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `curl` aktif di `php.ini`).
- **Composer** terinstal secara global.
- **MySQL / MariaDB** (bisa menggunakan bawaan XAMPP).
- **Git**.

### 2. Clone Repositori
```bash
git clone https://github.com/EkyRamadhanie/SIBORA.git
cd SIBORA
```

### 3. Konfigurasi Environment & Dependensi
Masuk ke direktori `backend-laravel`:
```powershell
cd backend-laravel
Copy-Item .env.example .env
composer install
php artisan key:generate
```

### 4. Konfigurasi Database
1. Buat database baru di MySQL/phpMyAdmin:
   ```sql
   CREATE DATABASE sibora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Buka file `.env` di folder `backend-laravel` dan sesuaikan port serta kredensial database Anda:
   ```dotenv
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3308           # Ubah ke 3306 bila menggunakan port standar XAMPP
   DB_DATABASE=sibora
   DB_USERNAME=root
   DB_PASSWORD=
   ```
3. Jalankan migrasi skema tabel dan isi data awal (*seeding*):
   ```powershell
   php artisan migrate --seed
   ```

### 5. Menjalankan Aplikasi

#### Cara Cepat (Khusus Pengguna Windows + XAMPP):
Cukup jalankan file batch di root folder:
```powershell
.\start_server.bat
```
*Skrip akan otomatis memeriksa koneksi MySQL XAMPP, menyalakan server Laravel Artisan, dan membuka browser Anda.*

#### Cara Manual:
Dari folder `backend-laravel`, jalankan:
```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Buka peramban (browser) di alamat:
- **Frontend Portal**: [`http://127.0.0.1:8000/index.html`](http://127.0.0.1:8000/index.html)
- **API Health Check**: [`http://127.0.0.1:8000/api/v1/health`](http://127.0.0.1:8000/api/v1/health)

---

## 🔑 Akun Demo Lokal

Database seeder secara otomatis menyediakan beberapa akun pengujian untuk mencoba seluruh fitur:

| Role | Username | Password | Email | Akses & Wewenang |
|---|---|---|---|---|
| 🛡️ **Admin** | `admin` | `admin123` | `admin@sibora.local` | Kelola seluruh pengguna, katalog global, laporan |
| 🛡️ **Admin (Alt)** | `sibora` | `sibora2026` | `sibora@sibora.local` | Administrator cadangan |
| 🏢 **Pengelola** | `budi` | `123456` | `budi@sibora.local` | Pengelola "Budi Sports Center" (Futsal A, Bola) |
| 🏢 **Pengelola** | `pengelola` | `pengelola123` | `pengelola@sibora.local` | Pengelola "SIBORA Sport Arena" (Badminton, Basket) |
| 👤 **Pelanggan** | `dani` | `123456` | `dani@sibora.local` | Pelanggan demo (dapat booking & sewa alat) |
| 👤 **Pelanggan** | `user` | `123456` | `user@sibora.local` | Pelanggan demo standar |

> ⚠️ **Penting:** Akun dan password di atas hanya untuk keperluan pengembangan (*development*) lokal. Jangan gunakan kredensial demo ini pada server produksi!

---

## 🧪 Pengujian API

SIBORA menyediakan dua alternatif praktis untuk menguji seluruh 44 endpoint RESTful API:

1. **VS Code REST Client**:
   Buka file [`SIBORA_API.http`](SIBORA_API.http) pada Visual Studio Code (dengan ekstensi *REST Client* terpasang), lalu klik tautan `Send Request` di atas masing-masing method.
2. **Postman**:
   Impor file koleksi [`postman/SIBORA.postman_collection.json`](postman/SIBORA.postman_collection.json) ke aplikasi Postman Anda untuk pengujian terstruktur.

---

## 📚 Indeks Dokumentasi Arsitektur

Untuk pemahaman teknis mendalam dan kelanjutan proyek, silakan telusuri berkas panduan berikut:

- 🏛️ [**ARCHITECTURE.md**](docs/ARCHITECTURE.md): Diagram alur arsitektur, matriks otorisasi RBAC, siklus status transaksi, dan mekanisme upload file.
- 🗄️ [**DATABASE_SCHEMA.md**](docs/DATABASE_SCHEMA.md): Entity Relationship Diagram (ERD) lengkap, spesifikasi kamus data 17 tabel, relasi cascade, dan indeks query.
- 📡 [**API_DOCUMENTATION.md**](docs/API_DOCUMENTATION.md): Rujukan lengkap 44 endpoint API, struktur request body, dan format respons JSON.
- 📝 [**DATABASE_AND_CLEANUP_AUDIT.md**](docs/DATABASE_AND_CLEANUP_AUDIT.md): Laporan riwayat audit pembersihan dan konsistensi skema.
- 🤝 [**CONTRIBUTING.md**](CONTRIBUTING.md): Standar kontribusi open-source, konvensi branching Git, dan format Conventional Commits.
- 🗺️ [**ROADMAP.md**](ROADMAP.md): Panduan strategis pengembangan lanjutan (Payment Gateway Midtrans/Xendit, WebSockets, Notifikasi WhatsApp, PWA/Mobile App, dan Docker).

---

## 🗺️ Rencana Pengembangan (Roadmap)

Tahapan perluasan yang siap diimplementasikan untuk kebutuhan komersial skala besar:
- [ ] **Fase 1:** Integrasi Payment Gateway resmi (Midtrans Snap / Xendit API & webhook signature validation).
- [ ] **Fase 2:** *Concurrency Locking* (`lockForUpdate`) dan slot ketersediaan real-time via WebSockets (Laravel Reverb / Pusher).
- [ ] **Fase 3:** Pengiriman tiket/struk PDF otomatis via Email dan pengingat jadwal via WhatsApp Gateway (Fonnte/Twilio).
- [ ] **Fase 4:** PWA (Progressive Web App) dengan offline caching atau transisi ke aplikasi Mobile (Flutter / React Native).
- [ ] **Fase 5:** Automated Feature Testing (PHPUnit / Pest) dan CI/CD pipeline via GitHub Actions.
- [ ] **Fase 6:** Kontainerisasi Docker dan deployment berbasis cloud (AWS / DigitalOcean + Redis caching).

*Rincian teknis implementasi masing-masing fase dapat dilihat di [ROADMAP.md](ROADMAP.md).*

---

## 🔒 Standar Keamanan

- **Autentikasi Token Kriptografis:** Penggunaan token Laravel Sanctum dengan verifikasi status akun aktif di setiap request.
- **Enkripsi Sandi Kuat:** Hash Bcrypt satu arah untuk seluruh kredensial sandi pengguna.
- **Pencegahan SQL Injection:** Parameterized binding secara penuh melalui Eloquent ORM.
- **Sanitasi File Unggahan:** Validasi ketat terhadap tipe MIME asli, ekstensi file, dan batas ukuran gambar maksimum 5 MB.
- **Isolasi Multi-Tenant Data:** Pengelola dibatasi hanya dapat mengakses dan memodifikasi aset serta laporan milik bisnisnya sendiri.

---

## 📄 Lisensi & Hak Cipta

Proyek ini dilisensikan di bawah lisensi terbuka [MIT License](LICENSE). Anda bebas menggunakan, memodifikasi, dan mendistribusikan kode ini untuk keperluan pembelajaran maupun komersial.

Dikembangkan oleh **[Eky Ramadhanie](https://github.com/EkyRamadhanie)**.
