<?php

return [
    'admin_fee_percent' => (float) env('SIBORA_ADMIN_FEE_PERCENT', 5),
    'payment_deadline_hours' => 24,
    'roles' => ['pelanggan', 'pengelola', 'admin'],
    'transaction_statuses' => ['menunggu_pembayaran', 'dp', 'lunas', 'batal', 'kedaluwarsa'],
];
