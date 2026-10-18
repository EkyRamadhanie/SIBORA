# Panduan Kontribusi SIBORA

Terima kasih atas ketertarikan Anda untuk berkontribusi pada pengembangan **SIBORA (Sistem Booking Fasilitas Olahraga Online)**! 

Proyek ini dibangun menggunakan arsitektur modern berbasis **Laravel 12 (REST API)** dan **Frontend Vanilla (HTML5, Modern CSS, Modular JS)**. Agar kualitas kode dan alur kolaborasi tetap terjaga rapi layaknya standar Full Stack Engineer profesional, silakan ikuti panduan berikut.

---

## 📋 Alur Kerja Git (Git Workflow)

### 1. Fork dan Clone Repositori
1. Lakukan *Fork* repositori ini ke akun GitHub Anda.
2. Clone ke mesin lokal Anda:
   ```bash
   git clone https://github.com/<username-anda>/SIBORA.git
   cd SIBORA
   ```

### 2. Standar Penamaan Branch
Selalu buat branch baru dari branch `main` dengan konvensi penamaan berikut:
- `feat/<nama-fitur>`: Penambahan fitur baru (contoh: `feat/payment-gateway-midtrans`)
- `fix/<nama-bug>`: Perbaikan bug atau celah sistem (contoh: `fix/booking-slot-overlap`)
- `docs/<topik>`: Pembaruan atau penambahan dokumentasi (contoh: `docs/api-payment-webhook`)
- `refactor/<modul>`: Refactoring struktur kode tanpa mengubah fungsi (contoh: `refactor/booking-service`)
- `chore/<tugas>`: Pembaruan dependensi, skrip, atau konfigurasi (contoh: `chore/update-composer-deps`)

### 3. Konvensi Commit Message (Conventional Commits)
Gunakan format standar Conventional Commits:
```text
<tipe>(<lingkup-opsional>): <deskripsi singkat imperative>

[deskripsi panjang opsional]

[referensi issue opsional, misal: Fixes #12]
```

**Tipe commit yang diterima:**
- `feat`: Fitur baru untuk pengguna
- `fix`: Perbaikan bug
- `docs`: Perubahan atau penambahan dokumentasi
- `style`: Perapian format, whitespace, titik koma (tidak mengubah logika)
- `refactor`: Refactoring kode
- `perf`: Optimasi performa dan query
- `test`: Menambah atau memperbarui unit/feature tests
- `chore`: Tugas pemeliharaan build tool, package, atau environment

**Contoh:**
```bash
git commit -m "feat(payment): integrate midtrans snap transaction token"
git commit -m "fix(booking): prevent double booking on simultaneous slot checkout"
git commit -m "docs(architecture): add sequence diagram for refund flow"
```

---

## 💻 Standar Koding (Coding Standards)

### Backend (PHP / Laravel 12)
- Ikuti standar **PSR-12** untuk formatting PHP.
- Gunakan fitur PHP 8.2+ terkini (strict types bila relevan, typed properties, match expressions).
- **Controller Tipis, Service/Model Tebal**: Tempatkan logika bisnis kompleks pada `app/Services/` alih-alih menumpuknya di Controller.
- Gunakan Form Request atau validation eksplisit untuk semua input pengguna sebelum diproses.
- Gunakan Eloquent relation dan eager loading (`with(...)`) untuk mencegah masalah **N+1 query**.
- Selalu gunakan migration untuk perubahan skema database dan sediakan metode `down()` yang konsisten.

### Frontend (HTML5, Modern CSS, Vanilla JS)
- Pertahankan struktur semantik HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`).
- CSS: Hindari penggunaan `!important`. Manfaatkan CSS Variables (Design Tokens) untuk warna, jarak, dan transisi.
- JS: Hindari variabel global tidak perlu. Gunakan `async/await` untuk penanganan HTTP fetch ke API Laravel.
- Pastikan UI tetap responsif untuk layar mobile, tablet, dan desktop.

---

## 🧪 Validasi Sebelum Mengajukan Pull Request

Sebelum membuat Pull Request, pastikan Anda telah melakukan:
1. **Pemeriksaan Sintaks PHP**:
   ```powershell
   cd backend-laravel
   php artisan route:list --path=api/v1
   ```
2. **Uji Migration & Seeder**:
   ```powershell
   php artisan migrate:status
   ```
3. **Pemeriksaan File Ter-commit**:
   Pastikan tidak ada file lokal/sensitif (`.env`, `vendor/`, `storage/logs/*.log`, `*.zip`) yang masuk ke staging git:
   ```bash
   git status
   ```

---

## 🚀 Mengajukan Pull Request (PR)

1. Push branch Anda ke remote repository GitHub:
   ```bash
   git push origin feat/<nama-fitur>
   ```
2. Buat Pull Request melalui antarmuka web GitHub.
3. Isi form Pull Request sesuai template yang telah disediakan.
4. Tunggu review dari maintainer proyek dan respon setiap komentar atau saran perbaikan dengan ramah dan konstruktif.

---

Terima kasih telah berkontribusi menjadikan **SIBORA** sistem reservasi olahraga yang handal dan profesional! 🏆
