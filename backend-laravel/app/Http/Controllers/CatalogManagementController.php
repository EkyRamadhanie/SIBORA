<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesSiboraRoles;
use App\Models\KategoriPeralatan;
use App\Models\Lapangan;
use App\Models\LapanganFasilitas;
use App\Models\Peralatan;
use App\Models\Pengelola;
use App\Models\JenisOlahraga;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CatalogManagementController extends Controller
{
    use AuthorizesSiboraRoles;

    /** Save an uploaded catalog photo under public/uploads/sibora and return its public-relative path. */
    private function storeUploadedPhoto(?\Illuminate\Http\UploadedFile $file, string $folder): ?string
    {
        if (!$file) return null;

        $extension = match ($file->getMimeType()) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/jpeg' => 'jpg',
            default => throw new \RuntimeException('Format foto tidak didukung.'),
        };

        $relativeDirectory = 'uploads/sibora/'.$folder;
        $absoluteDirectory = public_path($relativeDirectory);
        if (!is_dir($absoluteDirectory) && !mkdir($absoluteDirectory, 0755, true) && !is_dir($absoluteDirectory)) {
            throw new \RuntimeException('Folder penyimpanan foto tidak dapat dibuat.');
        }

        $filename = Str::uuid()->toString().'.'.$extension;
        $file->move($absoluteDirectory, $filename);

        return $relativeDirectory.'/'.$filename;
    }

    public function venues(Request $request)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $query = Lapangan::with(['sports', 'facilities', 'pengelola.user']);
        if ($user->role === 'pengelola') {
            $managerId = $user->pengelola?->pengelola_id;
            abort_unless($managerId, 403, 'Akun pengelola belum memiliki profil pengelola.');
            $query->where('pengelola_id', $managerId);
        }
        if ($request->filled('status')) $query->where('status', $request->string('status')->toString());
        return response()->json($query->orderBy('nama')->paginate(20));
    }

    public function storeVenue(Request $request)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $data = $request->validate([
            'pengelola_id' => [$user->role === 'admin' ? 'required' : 'sometimes', 'integer', 'exists:pengelola,pengelola_id'],
            'nama' => ['required', 'string', 'max:150'],
            'lokasi' => ['required', 'string', 'max:255'],
            'harga_per_jam' => ['required', 'numeric', 'min:0', 'max:9999999999'],
            'jam_buka' => ['required', 'date_format:H:i'],
            'jam_tutup' => ['required', 'date_format:H:i', 'after:jam_buka'],
            'foto' => ['nullable', 'string', 'max:255'],
            'foto_file' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'status' => ['sometimes', 'in:aktif,nonaktif'],
            'sports' => ['sometimes', 'array'],
            'sports.*' => ['integer', 'distinct', 'exists:jenis_olahraga,jenis_olahraga_id'],
            'facilities' => ['sometimes', 'array'],
            'facilities.*' => ['string', 'max:120'],
        ]);
        $data['pengelola_id'] = $user->role === 'pengelola'
            ? $user->pengelola?->pengelola_id
            : $data['pengelola_id'];
        abort_unless($data['pengelola_id'], 422, 'Profil pengelola belum terdaftar.');
        if ($request->boolean('sports_present') && !array_key_exists('sports', $data)) $data['sports'] = [];
        if ($request->boolean('facilities_present') && !array_key_exists('facilities', $data)) $data['facilities'] = [];
        if ($request->hasFile('foto_file')) $data['foto'] = $this->storeUploadedPhoto($request->file('foto_file'), 'lapangan');
        unset($data['foto_file']);

        $venue = DB::transaction(function () use ($data) {
            $venue = Lapangan::create(collect($data)->only(['pengelola_id', 'nama', 'lokasi', 'harga_per_jam', 'jam_buka', 'jam_tutup', 'foto', 'status'])->all());
            if (array_key_exists('sports', $data)) $venue->sports()->sync($data['sports']);
            foreach (array_unique($data['facilities'] ?? []) as $name) {
                LapanganFasilitas::create(['lapangan_id' => $venue->lapangan_id, 'nama_fasilitas' => $name]);
            }
            return $venue;
        });
        return response()->json(['message' => 'Lapangan berhasil ditambahkan.', 'data' => $venue->load('sports', 'facilities')], 201);
    }

    public function updateVenue(Request $request, int $lapangan)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $venue = Lapangan::findOrFail($lapangan);
        abort_unless($this->canManageVenue($user, $venue), 403, 'Anda tidak dapat mengubah lapangan milik pengelola lain.');
        $data = $request->validate([
            'nama' => ['sometimes', 'required', 'string', 'max:150'],
            'lokasi' => ['sometimes', 'required', 'string', 'max:255'],
            'harga_per_jam' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999'],
            'jam_buka' => ['sometimes', 'required', 'date_format:H:i'],
            'jam_tutup' => ['sometimes', 'required', 'date_format:H:i', 'after:jam_buka'],
            'foto' => ['sometimes', 'nullable', 'string', 'max:255'],
            'foto_file' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'status' => ['sometimes', 'required', 'in:aktif,nonaktif'],
            'sports' => ['sometimes', 'array'],
            'sports.*' => ['integer', 'distinct', 'exists:jenis_olahraga,jenis_olahraga_id'],
            'facilities' => ['sometimes', 'array'],
            'facilities.*' => ['string', 'max:120'],
        ]);
        if ($request->boolean('sports_present') && !array_key_exists('sports', $data)) $data['sports'] = [];
        if ($request->boolean('facilities_present') && !array_key_exists('facilities', $data)) $data['facilities'] = [];
        if ($request->hasFile('foto_file')) $data['foto'] = $this->storeUploadedPhoto($request->file('foto_file'), 'lapangan');
        unset($data['foto_file']);
        DB::transaction(function () use ($venue, $data) {
            $venue->update(collect($data)->only(['nama', 'lokasi', 'harga_per_jam', 'jam_buka', 'jam_tutup', 'foto', 'status'])->all());
            if (array_key_exists('sports', $data)) $venue->sports()->sync($data['sports']);
            if (array_key_exists('facilities', $data)) {
                $venue->facilities()->delete();
                foreach (array_unique($data['facilities']) as $name) {
                    LapanganFasilitas::create(['lapangan_id' => $venue->lapangan_id, 'nama_fasilitas' => $name]);
                }
            }
        });
        return response()->json(['message' => 'Data lapangan berhasil diperbarui.', 'data' => $venue->fresh()->load('sports', 'facilities')]);
    }

    public function deleteVenue(Request $request, int $lapangan)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $venue = Lapangan::findOrFail($lapangan);
        abort_unless($this->canManageVenue($user, $venue), 403);
        // Nonaktifkan, bukan menghapus permanen, agar riwayat booking tetap konsisten.
        $venue->update(['status' => 'nonaktif']);
        return response()->json(['message' => 'Lapangan dinonaktifkan. Riwayat pemesanan tetap disimpan.']);
    }

    public function equipment(Request $request)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $query = Peralatan::with(['kategori', 'pengelola.user']);
        if ($user->role === 'pengelola') {
            $managerId = $user->pengelola?->pengelola_id;
            abort_unless($managerId, 403, 'Akun pengelola belum memiliki profil pengelola.');
            $query->where('pengelola_id', $managerId);
        }
        if ($request->filled('status')) $query->where('status', $request->string('status')->toString());
        return response()->json($query->orderBy('nama')->paginate(20));
    }

    public function storeEquipment(Request $request)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $data = $request->validate([
            'pengelola_id' => [$user->role === 'admin' ? 'required' : 'sometimes', 'integer', 'exists:pengelola,pengelola_id'],
            'kategori_id' => ['required', 'integer', 'exists:kategori_peralatan,kategori_id'],
            'nama' => ['required', 'string', 'max:150'],
            'spesifikasi' => ['nullable', 'string', 'max:5000'],
            'harga_per_jam' => ['required', 'numeric', 'min:0', 'max:9999999999'],
            'stok' => ['required', 'integer', 'min:0', 'max:100000'],
            'foto' => ['nullable', 'string', 'max:255'],
            'foto_file' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'status' => ['sometimes', 'in:aktif,nonaktif'],
        ]);
        $data['pengelola_id'] = $user->role === 'pengelola' ? $user->pengelola?->pengelola_id : $data['pengelola_id'];
        abort_unless($data['pengelola_id'], 422, 'Profil pengelola belum terdaftar.');
        if ($request->hasFile('foto_file')) $data['foto'] = $this->storeUploadedPhoto($request->file('foto_file'), 'peralatan');
        unset($data['foto_file']);
        $equipment = Peralatan::create(collect($data)->only(['pengelola_id', 'kategori_id', 'nama', 'spesifikasi', 'harga_per_jam', 'stok', 'foto', 'status'])->all());
        return response()->json(['message' => 'Peralatan berhasil ditambahkan.', 'data' => $equipment->load('kategori')], 201);
    }

    public function updateEquipment(Request $request, int $peralatan)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $equipment = Peralatan::findOrFail($peralatan);
        abort_unless($this->canManageEquipment($user, $equipment), 403, 'Anda tidak dapat mengubah peralatan milik pengelola lain.');
        $data = $request->validate([
            'kategori_id' => ['sometimes', 'required', 'integer', 'exists:kategori_peralatan,kategori_id'],
            'nama' => ['sometimes', 'required', 'string', 'max:150'],
            'spesifikasi' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'harga_per_jam' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999'],
            'stok' => ['sometimes', 'required', 'integer', 'min:0', 'max:100000'],
            'foto' => ['sometimes', 'nullable', 'string', 'max:255'],
            'foto_file' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'status' => ['sometimes', 'required', 'in:aktif,nonaktif'],
        ]);
        if ($request->hasFile('foto_file')) $data['foto'] = $this->storeUploadedPhoto($request->file('foto_file'), 'peralatan');
        unset($data['foto_file']);
        $equipment->update(collect($data)->only(['kategori_id', 'nama', 'spesifikasi', 'harga_per_jam', 'stok', 'foto', 'status'])->all());
        return response()->json(['message' => 'Data peralatan diperbarui.', 'data' => $equipment->fresh()->load('kategori')]);
    }

    public function deleteEquipment(Request $request, int $peralatan)
    {
        $user = $this->requireRole('admin', 'pengelola');
        $equipment = Peralatan::findOrFail($peralatan);
        abort_unless($this->canManageEquipment($user, $equipment), 403);
        $equipment->update(['status' => 'nonaktif']);
        return response()->json(['message' => 'Peralatan dinonaktifkan. Riwayat sewa tetap disimpan.']);
    }

    public function catalogs(Request $request)
    {
        $this->requireRole('admin', 'pengelola');
        return response()->json([
            'jenis_olahraga' => JenisOlahraga::orderBy('nama')->get(),
            'kategori_peralatan' => KategoriPeralatan::orderBy('nama')->get(),
            'pengelola' => Pengelola::with('user.profile')->orderBy('nama_perusahaan')->get(),
        ]);
    }
}
