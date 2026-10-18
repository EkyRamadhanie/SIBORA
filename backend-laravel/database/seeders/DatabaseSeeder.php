<?php

namespace Database\Seeders;

use App\Models\JenisOlahraga;
use App\Models\KategoriPeralatan;
use App\Models\Lapangan;
use App\Models\LapanganFasilitas;
use App\Models\Peralatan;
use App\Models\Pengelola;
use App\Models\User;
use App\Models\UserEmail;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Akun demo ini hanya untuk pengembangan lokal. Ganti seluruh password sebelum deployment.
        $accountData = [
            ['username' => 'admin', 'email' => 'admin@sibora.local', 'password' => 'admin123', 'role' => 'admin', 'name' => 'Admin SIBORA'],
            ['username' => 'sibora', 'email' => 'sibora@sibora.local', 'password' => 'sibora2026', 'role' => 'admin', 'name' => 'Administrator Cadangan'],
            ['username' => 'budi', 'email' => 'budi@sibora.local', 'password' => '123456', 'role' => 'pengelola', 'name' => 'Budi Pengelola'],
            ['username' => 'pengelola', 'email' => 'pengelola@sibora.local', 'password' => 'pengelola123', 'role' => 'pengelola', 'name' => 'Pengelola Lapangan'],
            ['username' => 'dani', 'email' => 'dani@sibora.local', 'password' => '123456', 'role' => 'pelanggan', 'name' => 'Dani Raja Hutan'],
            ['username' => 'user', 'email' => 'user@sibora.local', 'password' => '123456', 'role' => 'pelanggan', 'name' => 'Pengguna Demo'],
        ];

        $users = [];
        foreach ($accountData as $data) {
            $user = User::updateOrCreate(['username' => $data['username']], [
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'role' => $data['role'],
                'status_akun' => 'aktif',
            ]);
            $users[$data['username']] = $user;
            UserProfile::updateOrCreate(['user_id' => $user->user_id], [
                'nama_lengkap' => $data['name'],
                'no_hp' => null,
                'negara' => 'Indonesia',
                'bahasa' => 'Indonesia',
                'zona_waktu' => 'Asia/Makassar',
            ]);
            UserEmail::updateOrCreate(['user_id' => $user->user_id, 'is_primary' => true], ['email' => $data['email']]);
        }

        $managerBudi = Pengelola::updateOrCreate(['user_id' => $users['budi']->user_id], [
            'nama_perusahaan' => 'Budi Sports Center', 'no_hp' => '081200000001',
        ]);
        $managerPengelola = Pengelola::updateOrCreate(['user_id' => $users['pengelola']->user_id], [
            'nama_perusahaan' => 'SIBORA Sport Arena', 'no_hp' => '081200000002',
        ]);

        $sports = [];
        foreach (['Futsal', 'Badminton', 'Basket', 'Padel', 'Tenis'] as $name) {
            $sports[$name] = JenisOlahraga::firstOrCreate(['nama' => $name]);
        }

        $fieldDefinitions = [
            ['manager' => $managerBudi, 'name' => 'Futsal A', 'location' => 'Banjarmasin', 'price' => 150000, 'photo' => 'assets/images/venue_hedera.jpg', 'sports' => ['Futsal'], 'facilities' => ['Toilet', 'Ruang Ganti', 'Parkir']],
            ['manager' => $managerPengelola, 'name' => 'Badminton Indoor', 'location' => 'Banjarbaru', 'price' => 80000, 'photo' => 'assets/images/venue_orix.jpg', 'sports' => ['Badminton'], 'facilities' => ['Toilet', 'Parkir', 'Tribun']],
            ['manager' => $managerPengelola, 'name' => 'Basket Arena', 'location' => 'Banjarmasin', 'price' => 175000, 'photo' => 'assets/images/venue_qpremier.jpg', 'sports' => ['Basket'], 'facilities' => ['Toilet', 'Parkir', 'Kantin']],
        ];

        foreach ($fieldDefinitions as $definition) {
            $venue = Lapangan::updateOrCreate(['nama' => $definition['name']], [
                'pengelola_id' => $definition['manager']->pengelola_id,
                'lokasi' => $definition['location'],
                'harga_per_jam' => $definition['price'],
                'jam_buka' => '08:00:00', 'jam_tutup' => '21:00:00',
                'foto' => $definition['photo'], 'status' => 'aktif',
            ]);
            $venue->sports()->sync(collect($definition['sports'])->map(fn ($name) => $sports[$name]->jenis_olahraga_id)->all());
            $venue->facilities()->delete();
            foreach ($definition['facilities'] as $facilityName) {
                LapanganFasilitas::create(['lapangan_id' => $venue->lapangan_id, 'nama_fasilitas' => $facilityName]);
            }
        }

        $categories = [];
        foreach (['Bola', 'Raket', 'Sepatu', 'Pelindung'] as $name) {
            $categories[$name] = KategoriPeralatan::firstOrCreate(['nama' => $name]);
        }

        Peralatan::updateOrCreate(['nama' => 'Bola Futsal'], [
            'pengelola_id' => $managerBudi->pengelola_id, 'kategori_id' => $categories['Bola']->kategori_id,
            'spesifikasi' => 'Bola futsal ukuran standar', 'harga_per_jam' => 15000, 'stok' => 10,
            'foto' => null, 'status' => 'aktif',
        ]);
        Peralatan::updateOrCreate(['nama' => 'Raket Badminton'], [
            'pengelola_id' => $managerPengelola->pengelola_id, 'kategori_id' => $categories['Raket']->kategori_id,
            'spesifikasi' => 'Raket badminton untuk penyewaan', 'harga_per_jam' => 10000, 'stok' => 12,
            'foto' => null, 'status' => 'aktif',
        ]);
    }
}
