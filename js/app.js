// SIBORA - Sistem Booking Fasilitas Olahraga
// Interactive Frontend Script with Full User Flow & Modals

// Akun Demo Bawaan
const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'admin' },
  { username: 'user', password: '123456', role: 'user' },
  { username: 'dani', password: '123456', role: 'user' },
  { username: 'budi', password: '123456', role: 'pengelola' },
  { username: 'pengelola', password: 'pengelola123', role: 'pengelola' },
  { username: 'sibora', password: 'sibora2026', role: 'admin' }
];

document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  initLoginForm();
  initRegisterForm();
  initBookingProtectionModal();
  initLapanganFilter();
  initPeralatanFilter();
  initJadwalVenueSelect();
  initPaymentFlow();
  initBookingTimeSlots();
});

// Helper: Ambil semua akun (Demo + Registrasi Baru)
function getRegisteredAccounts() {
  const customAccounts = JSON.parse(localStorage.getItem('sibora_accounts') || '[]');
  return [...DEMO_ACCOUNTS, ...customAccounts];
}

// Helper: Cek status login
function isUserLoggedIn() {
  return sessionStorage.getItem('sibora_logged_in') === 'true';
}

// 1. Inisialisasi Tampilan Berdasarkan Status Login
function initAuthUI() {
  const loggedIn = isUserLoggedIn();
  const role = sessionStorage.getItem('sibora_role') || 'user';
  const logoutButtons = document.querySelectorAll('a[href="login.html"].nav-pill, #btnSidebarLogout');
  
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.removeItem('sibora_logged_in');
      sessionStorage.removeItem('sibora_username');
      sessionStorage.removeItem('sibora_role');
      alert('Anda berhasil logout.');
      window.location.href = 'login.html';
    });
  });

  // Tautkan Avatar ke Dashboard sesuai role
  const avatars = document.querySelectorAll('.nav-avatar');
  avatars.forEach(avatar => {
    avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', () => {
      if (role === 'pengelola') {
        window.location.href = 'pengelola-dashboard.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    });
    if (loggedIn) {
      const username = sessionStorage.getItem('sibora_username') || 'Pengguna';
      avatar.title = `Profil: ${username} (Klik untuk Dashboard)`;
    }
  });
}

// 2. Logika Form Login Utama (login.html)
function initLoginForm() {
  const form = document.querySelector('#loginForm');
  const errorBanner = document.querySelector('#loginErrorBanner');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const usernameInput = document.querySelector('#loginUsername').value.trim();
    const passwordInput = document.querySelector('#loginPassword').value.trim();

    const accounts = getRegisteredAccounts();
    const matched = accounts.find(
      acc => acc.username.toLowerCase() === usernameInput.toLowerCase() && acc.password === passwordInput
    );

    if (matched) {
      if (errorBanner) errorBanner.style.display = 'none';
      sessionStorage.setItem('sibora_logged_in', 'true');
      sessionStorage.setItem('sibora_username', matched.username);
      sessionStorage.setItem('sibora_role', matched.role || 'user');
      
      if (matched.role === 'pengelola') {
        window.location.href = 'pengelola-dashboard.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    } else {
      if (errorBanner) {
        errorBanner.style.display = 'block';
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });
}

// 3. Logika Form Registrasi (register.html)
function initRegisterForm() {
  const form = document.querySelector('#registerForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.querySelector('#regUsername').value.trim();
    const emailPrefix = document.querySelector('#regEmail').value.trim();
    const password = document.querySelector('#regPassword').value;
    const confirmPassword = document.querySelector('#regConfirmPassword').value;
    const agree = document.querySelector('#agreeTerms')?.checked;

    if (!agree) {
      alert('Harap centang persetujuan ketentuan yang berlaku!');
      return;
    }

    if (password !== confirmPassword) {
      alert('Konfirmasi Password tidak cocok!');
      return;
    }

    const customAccounts = JSON.parse(localStorage.getItem('sibora_accounts') || '[]');
    customAccounts.push({
      username: username,
      email: `${emailPrefix}@gmail.com`,
      password: password
    });
    localStorage.setItem('sibora_accounts', JSON.stringify(customAccounts));

    alert(`Akun "${username}" berhasil dibuat! Silakan login.`);
    window.location.href = 'login.html';
  });
}

// 4. Modal Pop-up Booking Sebelum Login
function initBookingProtectionModal() {
  const modal = document.querySelector('#bookingLoginModal');
  const btnClose = document.querySelector('#btnCloseModal');
  const modalForm = document.querySelector('#modalLoginForm');
  const modalErrorBanner = document.querySelector('#modalErrorBanner');
  const triggerButtons = document.querySelectorAll('.btn-trigger-booking');

  function openModal() {
    if (modal) {
      modal.classList.add('active');
      if (modalErrorBanner) modalErrorBanner.style.display = 'none';
    }
  }

  function closeModal() {
    if (modal) modal.classList.remove('active');
  }

  btnClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  triggerButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isUserLoggedIn()) {
        window.location.href = 'booking.html';
      } else {
        openModal();
      }
    });
  });

  modalForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const usernameInput = document.querySelector('#modalUsername').value.trim();
    const passwordInput = document.querySelector('#modalPassword').value.trim();

    const accounts = getRegisteredAccounts();
    const matched = accounts.find(
      acc => acc.username.toLowerCase() === usernameInput.toLowerCase() && acc.password === passwordInput
    );

    if (matched) {
      if (modalErrorBanner) modalErrorBanner.style.display = 'none';
      sessionStorage.setItem('sibora_logged_in', 'true');
      sessionStorage.setItem('sibora_username', matched.username);
      closeModal();
      alert(`Login berhasil! Selamat datang, ${matched.username}.`);
      initAuthUI();
      window.location.href = 'booking.html';
    } else {
      if (modalErrorBanner) {
        modalErrorBanner.style.display = 'block';
      }
    }
  });

  window.triggerBookingLoginModal = openModal;
}

// 5. Filter Katalog Lapangan
function initLapanganFilter() {
  const categoryPills = document.querySelectorAll('.category-filter-pill');
  const searchInput = document.querySelector('#searchLapanganInput');
  const btnSearch = document.querySelector('#btnSearchLapangan');
  const btnResetSearch = document.querySelector('#btnResetSearch');
  const venueCards = document.querySelectorAll('.venue-card');

  if (!venueCards.length) return;

  function filterCards() {
    const activeCategory = document.querySelector('.category-filter-pill.active')?.dataset.category || 'all';
    const keyword = searchInput?.value.toLowerCase().trim() || '';

    venueCards.forEach(card => {
      const cardCategory = card.dataset.category || '';
      const cardTitle = card.querySelector('.venue-name')?.textContent.toLowerCase() || '';
      const cardType = card.querySelector('.venue-sport-type')?.textContent.toLowerCase() || '';

      const matchesCategory = (activeCategory === 'all' || cardCategory.includes(activeCategory));
      const matchesKeyword = !keyword || cardTitle.includes(keyword) || cardType.includes(keyword);

      if (matchesCategory && matchesKeyword) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterCards();
    });
  });

  btnSearch?.addEventListener('click', filterCards);
  searchInput?.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') filterCards();
  });

  btnResetSearch?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    categoryPills.forEach(p => p.classList.remove('active'));
    document.querySelector('.category-filter-pill[data-category="all"]')?.classList.add('active');
    filterCards();
  });
}

// 6. Filter Peralatan
function initPeralatanFilter() {
  const equipmentPills = document.querySelectorAll('.peralatan-pill');
  const equipmentCards = document.querySelectorAll('.equipment-card');

  if (!equipmentCards.length) return;

  equipmentPills.forEach(pill => {
    pill.addEventListener('click', () => {
      equipmentPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const targetCategory = pill.dataset.category || 'all';
      equipmentCards.forEach(card => {
        const cardCat = card.dataset.category || '';
        if (targetCategory === 'all' || cardCat === targetCategory) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

// 7. Seleksi Slot Jadwal Interaktif
function initJadwalVenueSelect() {
  const miniCards = document.querySelectorAll('.venue-mini-card');
  miniCards.forEach(card => {
    card.addEventListener('click', () => {
      miniCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  const slots = document.querySelectorAll('.schedule-grid-table .cell-slot');
  slots.forEach(slot => {
    slot.addEventListener('click', () => {
      if (slot.classList.contains('slot-booked-blue') ||
          slot.classList.contains('slot-booked-yellow') ||
          slot.classList.contains('slot-booked-purple') ||
          slot.classList.contains('slot-booked-orange') ||
          slot.classList.contains('slot-booked-green') ||
          slot.classList.contains('slot-booked-lightgreen')) {
        alert('Slot waktu ini sudah dipesan (Booked). Silakan pilih slot putih yang kosong.');
        return;
      }

      if (!isUserLoggedIn()) {
        if (window.triggerBookingLoginModal) {
          window.triggerBookingLoginModal();
        }
        return;
      }

      const confirmBooking = confirm('Slot ini tersedia! Ingin memesan sesi ini dan lanjut ke form pemesanan?');
      if (confirmBooking) {
        window.location.href = 'booking.html';
      }
    });
  });
}

// 8. Seleksi Slot Waktu di Halaman Booking
function initBookingTimeSlots() {
  const slotButtons = document.querySelectorAll('.time-slot-grid .btn-slot-time:not(.disabled)');
  slotButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });
}

// 9. Logika Pop-Up Sewa Peralatan
let currentRentPrice = 15000;
let currentRentQty = 2;
let currentItemName = 'Bola Futsal';

window.openRentModal = function(title, price, brand) {
  currentItemName = title;
  currentRentPrice = price;
  currentRentQty = 2;

  const modal = document.querySelector('#modalSewaPeralatan');
  const titleEl = document.querySelector('#rentModalTitle');
  const subEl = document.querySelector('#rentModalSub');

  if (titleEl) titleEl.textContent = `Sewa ${title}`;
  if (subEl) subEl.textContent = `${brand} • Rp ${price.toLocaleString('id-ID')}/jam`;

  updateRentCalc();
  if (modal) modal.classList.add('active');
};

window.closeRentModal = function() {
  const modal = document.querySelector('#modalSewaPeralatan');
  if (modal) modal.classList.remove('active');
};

window.changeQty = function(delta) {
  currentRentQty = Math.max(1, currentRentQty + delta);
  const qtyEl = document.querySelector('#rentQty');
  if (qtyEl) qtyEl.textContent = currentRentQty;
  updateRentCalc();
};

window.updateRentCalc = function() {
  const durVal = parseInt(document.querySelector('#rentDuration')?.value || '2', 10);
  const total = currentRentPrice * currentRentQty * durVal;

  const detailEl = document.querySelector('#rentCalcDetail');
  const totalEl = document.querySelector('#rentTotal');

  if (detailEl) detailEl.textContent = `${currentRentQty} ${currentItemName.toLowerCase()} × ${durVal} jam`;
  if (totalEl) totalEl.textContent = `Rp ${total.toLocaleString('id-ID')}`;
};

// 10. Alur Konfirmasi Pembayaran & Modal Berhasil
function initPaymentFlow() {
  const methodButtons = document.querySelectorAll('.payment-method-btn');
  methodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      methodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const btnConfirm = document.querySelector('#btnKonfirmasiBayar');
  const successModal = document.querySelector('#modalPembayaranBerhasil');

  btnConfirm?.addEventListener('click', () => {
    if (successModal) successModal.classList.add('active');
  });
}

window.copyRekening = function() {
  const rek = document.querySelector('#rekeningText')?.textContent || '1234 5678 9012';
  navigator.clipboard?.writeText(rek);
  alert(`Nomor rekening ${rek} berhasil disalin!`);
};

window.copyKodeBooking = function() {
  const kode = document.querySelector('#kodeBookingText')?.textContent || 'SIB-2025-0712';
  navigator.clipboard?.writeText(kode);
  alert(`Kode booking ${kode} berhasil disalin!`);
};

window.unduhBuktiBooking = function() {
  alert('Bukti booking sedang diunduh (Simulasi Bukti PDF SIBORA).');
  window.print();
};
