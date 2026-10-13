# 🏟️ SIBORA - Sistem Booking Fasilitas Olahraga Online

**SIBORA** adalah platform web modern untuk pemesanan (*booking*) fasilitas dan lapangan olahraga, penyewaan perlengkapan, serta pengelolaan jadwal secara daring. 

Aplikasi ini dirancang dengan arsitektur **3-Tier** (*Presentation, Application, Data*) menggunakan antarmuka berbasis HTML, CSS modern, dan JavaScript interaktif yang siap dihubungkan ke Application Server (REST API Laravel / PHP-FPM) dan Database Server (MySQL).

---

## 📸 Fitur Utama Antarmuka (Frontend)

1. **Beranda & Kategori (`index.html`)**
   - Hero banner dengan CTA menuju jadwal.
   - 3 Kategori utama: *Lapangan*, *Peralatan*, dan *Fasilitas*.
2. **Autentikasi Pengguna (`login.html` & `register.html`)**
   - Halaman Login *dual-card glassmorphism* dengan maskot bola olahraga.
   - Validasi akun demo dan pesan banner error merah (*"Username atau Password Salah !!"*).
   - Form registrasi akun baru yang langsung tersimpan di *local storage*.
3. **Katalog Lapangan (`lapangan.html`)**
   - Panel pencarian dan filter cepat jenis olahraga (*Semua, Futsal, Badminton, Basket, Padel, Tenis*).
   - Kartu venue dengan foto, badge fasilitas, dan harga per jam.
   - Proteksi booking: memunculkan modal login pop-up otomatis jika belum login.
4. **Cek Jadwal Lapangan (`jadwal.html`)**
   - Sidebar seleksi venue olahraga.
   - Tabel jadwal mingguan interaktif (Senin s/d Minggu, pukul 08:00–21:00) dengan indikator slot waktu terpesan (*Booked*) dan slot kosong.
5. **Form Booking Lapangan (`booking.html`)**
   - Informasi venue terpilih.
   - Form data penyewa (Nama, No. HP, Email).
   - Pemilihan tanggal, durasi sewa, dan seleksi slot sesi jam interaktif.
   - Rincian biaya sewa dan tombol lanjut ke pembayaran.
6. **Konfirmasi & Gateway Pembayaran (`pembayaran.html`)**
   - Stepper 4 tahap (*Pilih ➔ Jadwal ➔ Data ➔ Pembayaran*).
   - Pilihan metode bayar (*Bank BCA, Bank BNI, QRIS, Cash*).
   - Hitung mundur waktu penyelesaian 24 jam dan nomor rekening resmi.
   - **Pop-Up Pembayaran Berhasil**: Menampilkan kode booking resmi (contoh: `SIB-2025-0712`), rincian biaya, tombol salin kode, dan unduh bukti transaksi.
7. **Sewa Peralatan Olahraga (`peralatan.html`)**
   - Filter kategori barang (*Semua, Bola, Raket, Sepatu, Pelindung*).
   - **Modal Pop-Up Sewa**: Dilengkapi tombol counter kuantitas `[-]` dan `[+]`, pemilihan waktu sewa, serta kalkulasi total harga otomatis secara *real-time*.
8. **Riwayat Pembelian & Cetak Struk (`riwayat.html`)**
   - Daftar riwayat transaksi sewa pengguna dengan tombol *Sewa lagi*.
   - Tombol cetak struk pemesanan.
9. **Dashboard Pengguna (`dashboard.html`)**
   - Sidebar navigasi (*Dashboard, Booking, Favorite, History, Logout*).
   - Profil pengguna (*Dani Raja Hutan*), pengaturan identitas diri, dan kelola email.

### 🏢 Fitur Sisi Pengelola Lapangan (Budi)
10. **Dashboard Pengelola (`pengelola-dashboard.html`)**
    - 3 Kartu statistik ringkas (*Total booking*, *Pendapatan hari ini*, *Lapangan aktif*).
    - Diagram batang mingguan (*Pendapatan Mingguan 2026*).
    - Tabel ringkas *Booking Terbaru* dengan badge status pembayaran (*Lunas*, *DP*, *Batal*).
11. **Kelola Jadwal dan Booking (`pengelola-booking.html`)**
    - Ringkasan 4 badge kuantitas status: *Lunas (20)*, *Pending (6)*, *DP (3)*, *Batal (2)*.
    - Filter tanggal, filter status, tombol *+ Tambah Booking*, dan *Export*.
    - Tabel data pemesanan lengkap dengan aksi edit ✏️ dan hapus 🗑️ serta penomoran halaman (pagination).
12. **Kelola Lapangan dan Fasilitas (`pengelola-lapangan.html`)**
    - Pencarian lapangan, kartu venue aktif dengan badge status dan aksi edit.
    - Kartu dashed `+ Tambah lapangan` untuk penambahan fasilitas baru.
13. **Kelola Peralatan Olahraga (`pengelola-peralatan.html`)**
    - Manajemen alat olahraga (*Bola Futsal, Raket Badminton*) dengan tombol edit.
    - Kartu dashed `+ Tambah Peralatan`.
14. **Laporan Pendapatan (`pengelola-pendapatan.html`)**
    - 3 Ringkasan kartu: *Total Pendapatan (Rp 13,95jt)*, *Total Booking (138)*, *Pembatalan (4)*.
    - Diagram garis komparasi multi-tahun (*Perbandingan 2024 vs 2025*).
    - Tabel rincian pendapatan berdasarkan fasilitas dan tombol *Export PDF*.

---

## 📂 Struktur Direktori Proyek

```text
SIBORA/
├── index.html                  # Halaman Utama (Home)
├── login.html                  # Halaman Login (Role-based redirect)
├── register.html               # Halaman Pendaftaran Akun
├── lapangan.html               # Katalog & Pencarian Lapangan
├── peralatan.html              # Katalog & Sewa Peralatan (dengan Modal Counter)
├── jadwal.html                 # Jadwal Mingguan Interaktif Lapangan
├── booking.html                # Form Data Penyewa & Sesi Booking
├── pembayaran.html             # Konfirmasi Pembayaran & Modal Berhasil
├── riwayat.html                # Riwayat Transaksi & Cetak Struk
├── dashboard.html              # Dashboard Profil Pelanggan (Dani)
├── pengelola-dashboard.html    # Dashboard Pengelola (Budi)
├── pengelola-booking.html      # Kelola Jadwal dan Booking Pengelola
├── pengelola-lapangan.html     # Kelola Lapangan & Fasilitas Pengelola
├── pengelola-peralatan.html    # Kelola Peralatan Pengelola
├── pengelola-pendapatan.html   # Laporan Pendapatan Pengelola
├── css/
│   └── style.css               # Desain terpadu (Tema Hijau Tua, Glassmorphism, Responsive)
├── js/
│   └── app.js                  # Logika interaktif frontend (Filter, Validasi, Modal, Storage)
├── assets/
│   └── images/                 # Background tekstur rumput & foto venue realistis
├── .gitignore                  # File pengabaian git
└── README.md                   # Dokumentasi proyek
```

---

## 🔑 Akun Demo untuk Pengujian Cepat

Sistem frontend telah dilengkapi dengan akun bawaan untuk kemudahan testing alur:

| Username | Password | Peran (Role) | Keterangan & Pengalihan Halaman |
| :--- | :--- | :--- | :--- |
| **`budi`** | **`123456`** | Pengelola | Masuk langsung ke `pengelola-dashboard.html` |
| **`pengelola`**| **`pengelola123`**| Pengelola | Masuk langsung ke `pengelola-dashboard.html` |
| **`dani`** | **`123456`** | Pelanggan | Masuk langsung ke `dashboard.html` |
| **`user`** | **`123456`** | Pelanggan | Masuk langsung ke `dashboard.html` |
| **`admin`** | **`admin123`** | Admin | Akun Super Admin |
| **`sibora`** | **`sibora2026`** | Admin | Akun Cadangan |

> *Catatan:* Anda juga dapat mendaftar akun baru lewat [register.html](register.html). Akun baru otomatis disimpan ke `localStorage` browser dan dapat digunakan langsung untuk login.

---

## 🛠️ Panduan untuk Pengembang (Developer Guide)

### 1. Untuk Pengembang Frontend (Melanjutkan UI/UX)
- **Desain & Warna Token:** Seluruh variabel warna dan font didefinisikan pada bagian `:root` di [css/style.css](css/style.css) (misal: `--bg-dark-header`, `--text-mint`, `--pill-mint`, dsb.).
- **Responsivitas:** Gunakan breakpoint media query yang telah disediakan (`@media (max-width: 992px)` dan `@media (max-width: 768px)`).
- **Logika Modal:** Fungsi modal pop-up dikendalikan melalui class `.modal-overlay.active` di [js/app.js](js/app.js).

### 2. Untuk Pengembang Backend (Integrasi REST API Laravel)
Berdasarkan Deployment Diagram SIBORA (3-Tier Nginx + Laravel + MySQL), backend disarankan menyediakan endpoint REST API berikut:

| Modul | Method | Endpoint Usulan | Deskripsi |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Mendaftarkan akun pelanggan baru |
| **Auth** | `POST` | `/api/v1/auth/login` | Login pelanggan & generate JWT / Sanctum token |
| **Auth** | `GET` | `/api/v1/user/profile` | Mengambil data profil pelanggan yang login |
| **Venue** | `GET` | `/api/v1/venues` | Mengambil daftar lapangan & filter kategori |
| **Venue** | `GET` | `/api/v1/venues/{id}/schedule` | Mengambil ketersediaan slot waktu lapangan |
| **Equipment** | `GET` | `/api/v1/equipments` | Mengambil daftar peralatan olahraga & stok |
| **Booking** | `POST` | `/api/v1/bookings` | Membuat reservasi lapangan / sewa alat baru |
| **Payment** | `POST` | `/api/v1/payments/verify` | Konfirmasi pembayaran (integrasi payment gateway) |
| **History** | `GET` | `/api/v1/bookings/history` | Mengambil riwayat booking pengguna |

Saat menghubungkan ke backend, pengembang cukup mengganti penyimpanan sementara `localStorage`/`sessionStorage` pada [js/app.js](js/app.js) dengan pemanggilan `fetch()` atau `axios()` ke REST API Laravel.

---

## 💻 Cara Menjalankan Secara Lokal

1. **Clone Repository:**
   ```bash
   git clone https://github.com/EkyRamadhanie/SIBORA.git
   cd SIBORA
   ```

2. **Jalankan Web Server Lokal:**
   * Menggunakan Python:
     ```bash
     python -m http.server 3000
     ```
   * Menggunakan PHP Built-in Server:
     ```bash
     php -S localhost:3000
     ```
   * Menggunakan VS Code Live Server extension.
   * Atau cukup klik ganda file `index.html` langsung di browser Anda.

3. **Akses Aplikasi:**
   Buka peramban di `http://localhost:3000`

---

## 📄 Lisensi & Kontributor
- **Pengembang:** Tim Proyek SIBORA 2026
- **Repository Resmi:** [GitHub EkyRamadhanie/SIBORA](https://github.com/EkyRamadhanie/SIBORA.git)
