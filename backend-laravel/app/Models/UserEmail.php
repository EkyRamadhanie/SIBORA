<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserEmail extends Model
{
    protected $table = 'user_email';
    protected $primaryKey = 'email_id';
    public $timestamps = false;
    protected $fillable = ['user_id', 'email', 'is_primary'];
    protected function casts(): array { return ['is_primary' => 'boolean', 'created_at' => 'datetime']; }
    public function user() { return $this->belongsTo(User::class, 'user_id', 'user_id'); }
}
