<?php

namespace App\Http\Controllers;

use App\Models\Favorit;
use App\Models\Lapangan;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
    public function index(Request $request)
    {
        $rows = Favorit::with('lapangan.sports', 'lapangan.facilities')
            ->where('user_id', $request->user()->user_id)->latest('created_at')->get();
        return response()->json(['data' => $rows]);
    }

    public function store(Request $request, int $lapangan)
    {
        $venue = Lapangan::where('status', 'aktif')->findOrFail($lapangan);
        $favorite = Favorit::firstOrCreate(['user_id' => $request->user()->user_id, 'lapangan_id' => $venue->lapangan_id]);
        return response()->json(['message' => 'Lapangan ditambahkan ke favorit.', 'data' => $favorite->load('lapangan')], $favorite->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(Request $request, int $lapangan)
    {
        Favorit::where('user_id', $request->user()->user_id)->where('lapangan_id', $lapangan)->delete();
        return response()->json(['message' => 'Lapangan dihapus dari favorit.']);
    }
}
