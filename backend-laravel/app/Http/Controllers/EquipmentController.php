<?php

namespace App\Http\Controllers;

use App\Models\KategoriPeralatan;
use App\Models\Peralatan;
use Illuminate\Http\Request;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Peralatan::with(['kategori', 'pengelola'])->where('status', 'aktif');
        if ($request->filled('search')) {
            $term = '%'.trim($request->string('search')->toString()).'%';
            $query->where(fn ($q) => $q->where('nama', 'like', $term)->orWhere('spesifikasi', 'like', $term));
        }
        if ($request->filled('kategori_id')) $query->where('kategori_id', $request->integer('kategori_id'));
        if ($request->filled('kategori')) $query->whereHas('kategori', fn ($q) => $q->where('nama', $request->string('kategori')->toString()));
        return response()->json($query->orderBy('nama')->paginate(min(max($request->integer('per_page', 12), 1), 50)));
    }

    public function categories()
    {
        return response()->json(['data' => KategoriPeralatan::withCount(['peralatan' => fn ($q) => $q->where('status', 'aktif')])->orderBy('nama')->get()]);
    }
}
