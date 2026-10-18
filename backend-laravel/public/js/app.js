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
  initAdminManagement();
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
      } else if (role === 'admin') {
        window.location.href = 'admin-manajemen.html';
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
      } else if (matched.role === 'admin') {
        window.location.href = 'admin-manajemen.html';
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

// 9. Modal sewa peralatan: pilih waktu mulai dahulu, lalu durasi.
let currentRentPrice = 0;
let currentRentQty = 1;
let currentItemName = 'Peralatan olahraga';
const RENTING_CLOSE_HOUR = 22;

function getLocalTodayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseRentHour(value) {
  if (!value) return null;
  const normalized = String(value).replace('.', ':');
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour + minute / 60;
}

function formatRentTime(hourValue) {
  const totalMinutes = Math.round(hourValue * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}.${String(minutes).padStart(2, '0')}`;
}

window.openRentModal = function(title, price, brand) {
  currentItemName = title || 'Peralatan olahraga';
  currentRentPrice = Math.max(0, Number(price) || 0);
  currentRentQty = 1;

  const modal = document.querySelector('#modalSewaPeralatan');
  const titleEl = document.querySelector('#rentModalTitle');
  const subEl = document.querySelector('#rentModalSub');
  const qtyEl = document.querySelector('#rentQty');
  const dateEl = document.querySelector('#rentDate');
  const startEl = document.querySelector('#rentStartTime');
  const durationEl = document.querySelector('#rentDuration');
  const endEl = document.querySelector('#rentEndTime');
  const submitEl = document.querySelector('#btnSubmitEquipmentRental');

  if (titleEl) titleEl.textContent = `Sewa ${currentItemName}`;
  if (subEl) {
    subEl.textContent = `${brand || 'Peralatan olahraga'} • Rp ${currentRentPrice.toLocaleString('id-ID')}/jam`;
  }
  if (qtyEl) qtyEl.textContent = String(currentRentQty);

  if (dateEl) {
    dateEl.min = getLocalTodayIso();
    if (!dateEl.value || dateEl.value < dateEl.min) dateEl.value = dateEl.min;
  }

  if (startEl) startEl.value = '';
  if (durationEl) {
    durationEl.value = '';
    durationEl.disabled = true;
    Array.from(durationEl.options).forEach(option => {
      option.disabled = option.value !== '';
    });
  }
  if (endEl) endEl.value = '';
  if (submitEl) {
    submitEl.textContent = 'Lanjut ke Pembayaran';
    submitEl.style.pointerEvents = '';
    submitEl.removeAttribute('aria-disabled');
  }

  window.updateRentCalc();
  if (modal) modal.classList.add('active');
};

window.closeRentModal = function() {
  document.querySelector('#modalSewaPeralatan')?.classList.remove('active');
};

window.changeQty = function(delta) {
  currentRentQty = Math.max(1, currentRentQty + Number(delta || 0));
  const qtyEl = document.querySelector('#rentQty');
  if (qtyEl) qtyEl.textContent = String(currentRentQty);
  window.updateRentCalc();
};

window.updateRentCalc = function() {
  const startEl = document.querySelector('#rentStartTime');
  const durationEl = document.querySelector('#rentDuration');
  const endEl = document.querySelector('#rentEndTime');
  const detailEl = document.querySelector('#rentCalcDetail');
  const totalEl = document.querySelector('#rentTotal');

  if (!startEl || !durationEl) return;

  const dateEl = document.querySelector('#rentDate');
  const isToday = dateEl?.value === getLocalTodayIso();
  const now = new Date();

  // Waktu mulai yang sudah lewat tidak boleh dipilih untuk sewa hari ini.
  Array.from(startEl.options).forEach(option => {
    if (!option.value) {
      option.disabled = false;
      return;
    }
    const optionHour = parseRentHour(option.value);
    option.disabled = isToday && optionHour !== null && optionHour <= now.getHours();
  });

  const selectedStartOption = startEl.options[startEl.selectedIndex];
  if (selectedStartOption?.disabled) startEl.value = '';

  const startHour = parseRentHour(startEl.value);
  const placeholder = durationEl.querySelector('option[value=""]');

  if (placeholder) placeholder.textContent = startHour === null
    ? 'Pilih waktu mulai dahulu'
    : 'Pilih durasi sewa';

  durationEl.disabled = startHour === null;
  let maxDuration = 0;

  if (startHour !== null) {
    maxDuration = Math.max(0, Math.floor(RENTING_CLOSE_HOUR - startHour));
    Array.from(durationEl.options).forEach(option => {
      if (!option.value) {
        option.disabled = false;
        return;
      }
      option.disabled = Number(option.value) > maxDuration;
    });

    const chosenDuration = Number(durationEl.value || 0);
    if (chosenDuration > maxDuration) durationEl.value = '';
  } else {
    durationEl.value = '';
    Array.from(durationEl.options).forEach(option => {
      option.disabled = option.value !== '';
    });
  }

  const duration = Number(durationEl.value || 0);
  const endHour = startHour !== null && duration > 0 ? startHour + duration : null;

  if (endEl) endEl.value = endHour === null ? '' : formatRentTime(endHour);

  const total = duration > 0 ? currentRentPrice * currentRentQty * duration : 0;

  if (detailEl) {
    if (startHour === null) {
      detailEl.textContent = 'Pilih waktu mulai terlebih dahulu.';
    } else if (duration === 0) {
      detailEl.textContent = `Mulai ${formatRentTime(startHour)} · pilih durasi sewa.`;
    } else {
      detailEl.textContent = `${currentRentQty} ${currentItemName.toLowerCase()} × ${duration} jam · ${formatRentTime(startHour)}–${formatRentTime(endHour)}`;
    }
  }

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

// ==========================================================
// 11. Modul Administrator - Manajemen Akun
// ==========================================================
function initAdminManagement() {
  const tabs = document.querySelectorAll('.admin-filter-tab');
  const searchInput = document.querySelector('#adminSearchInput');

  // Filter tabs (Semua, User, Pengelola Lapangan)
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filterAdminAccounts();
    });
  });

  // Search input live filtering
  searchInput?.addEventListener('input', () => {
    filterAdminAccounts();
  });
}

function filterAdminAccounts() {
  const activeTab = document.querySelector('.admin-filter-tab.active');
  const filterRole = activeTab?.dataset.filter || 'all';
  const query = (document.querySelector('#adminSearchInput')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#adminTableBody tr');

  rows.forEach(row => {
    const role = row.dataset.role || '';
    const textContent = row.textContent.toLowerCase();
    const matchesRole = (filterRole === 'all' || role === filterRole);
    const matchesQuery = query === '' || textContent.includes(query);

    if (matchesRole && matchesQuery) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

window.openAdminAccountModal = function() {
  const modal = document.querySelector('#modalTambahAkun');
  const form = document.querySelector('#formAdminAkun');
  const title = document.querySelector('#modalAdminTitle');
  const editId = document.querySelector('#editAccountId');
  
  if (form) form.reset();
  if (editId) editId.value = '';
  if (title) title.textContent = 'Tambah Akun';
  toggleLapanganField();

  if (modal) modal.classList.add('active');
};

window.closeAdminAccountModal = function() {
  const modal = document.querySelector('#modalTambahAkun');
  if (modal) modal.classList.remove('active');
};

window.toggleLapanganField = function() {
  const roleSelect = document.querySelector('#selectRole');
  const groupLapangan = document.querySelector('#groupLapangan');
  const selectLapangan = document.querySelector('#selectLapangan');
  if (!roleSelect || !selectLapangan) return;

  if (roleSelect.value === 'User') {
    selectLapangan.value = '-';
    if (groupLapangan) groupLapangan.style.opacity = '0.5';
    selectLapangan.disabled = true;
  } else {
    selectLapangan.disabled = false;
    if (groupLapangan) groupLapangan.style.opacity = '1';
    if (selectLapangan.value === '-') {
      selectLapangan.value = 'Hedera Padel Club';
    }
  }
};

window.editAccount = function(id) {
  const row = document.querySelector(`#adminTableBody tr[data-id="${id}"]`);
  if (!row) return;

  const nama = row.querySelector('td:nth-child(1) div:first-child')?.textContent.trim();
  const email = row.querySelector('td:nth-child(1) div:last-child')?.textContent.trim();
  const role = row.getAttribute('data-role') || 'User';
  const lapangan = row.querySelector('td:nth-child(3)')?.textContent.trim();
  const status = row.querySelector('td:nth-child(4) span')?.textContent.trim();

  document.querySelector('#editAccountId').value = id;
  document.querySelector('#inputNamaLengkap').value = nama || '';
  document.querySelector('#inputEmail').value = email || '';
  document.querySelector('#selectRole').value = role;
  toggleLapanganField();
  if (role !== 'User') {
    document.querySelector('#selectLapangan').value = lapangan;
  }
  document.querySelector('#selectStatus').value = status;
  document.querySelector('#modalAdminTitle').textContent = 'Edit Akun';

  const modal = document.querySelector('#modalTambahAkun');
  if (modal) modal.classList.add('active');
};

window.resetPassword = function(id) {
  const row = document.querySelector(`#adminTableBody tr[data-id="${id}"]`);
  const nama = row?.querySelector('td:nth-child(1) div:first-child')?.textContent.trim() || 'Akun';
  if (confirm(`Apakah Anda yakin ingin mereset password untuk ${nama}?`)) {
    alert(`Password untuk akun "${nama}" telah berhasil di-reset ke: default123`);
  }
};

window.deleteAccount = function(id) {
  const row = document.querySelector(`#adminTableBody tr[data-id="${id}"]`);
  const nama = row?.querySelector('td:nth-child(1) div:first-child')?.textContent.trim() || 'Akun';
  if (confirm(`Apakah Anda yakin ingin menghapus akun "${nama}"?`)) {
    row?.remove();
    updateAdminStatCards();
    alert(`Akun "${nama}" berhasil dihapus.`);
  }
};

window.saveAdminAccount = function(event) {
  event.preventDefault();
  const editId = document.querySelector('#editAccountId').value;
  const nama = document.querySelector('#inputNamaLengkap').value.trim();
  const email = document.querySelector('#inputEmail').value.trim();
  const role = document.querySelector('#selectRole').value;
  const lapangan = role === 'User' ? '-' : document.querySelector('#selectLapangan').value;
  const status = document.querySelector('#selectStatus').value;

  const roleBadgeClass = role === 'User' ? 'badge-role-user' : 'badge-role-pengelola';
  const statusBadgeClass = status === 'Aktif' ? 'badge-status-aktif' : 'badge-status-nonaktif';

  if (editId) {
    // Mode Update
    const row = document.querySelector(`#adminTableBody tr[data-id="${editId}"]`);
    if (row) {
      row.setAttribute('data-role', role);
      row.children[0].innerHTML = `
        <div style="font-weight: 700; color: #111111; font-size: 0.92rem;">${nama}</div>
        <div style="color: #777777; font-size: 0.78rem;">${email}</div>
      `;
      row.children[1].innerHTML = `<span class="${roleBadgeClass}">${role}</span>`;
      row.children[2].innerHTML = (role === 'User') 
        ? `<span style="color: #555555; font-size: 0.95rem;">-</span>` 
        : `<span style="font-weight: 700; color: #111111; font-size: 0.92rem;">${lapangan}</span>`;
      row.children[3].innerHTML = `<span class="${statusBadgeClass}">${status}</span>`;
      alert(`Akun "${nama}" berhasil diperbarui!`);
    }
  } else {
    // Mode Tambah Baru
    const newId = Date.now();
    const tbody = document.querySelector('#adminTableBody');
    const newRow = document.createElement('tr');
    newRow.setAttribute('data-role', role);
    newRow.setAttribute('data-id', newId);
    newRow.innerHTML = `
      <td style="padding: 14px 18px;">
        <div style="font-weight: 700; color: #111111; font-size: 0.92rem;">${nama}</div>
        <div style="color: #777777; font-size: 0.78rem;">${email}</div>
      </td>
      <td style="padding: 14px 18px;">
        <span class="${roleBadgeClass}">${role}</span>
      </td>
      <td style="padding: 14px 18px;">
        ${role === 'User' 
          ? '<span style="color: #555555; font-size: 0.95rem;">-</span>' 
          : '<span style="font-weight: 700; color: #111111; font-size: 0.92rem;">' + lapangan + '</span>'}
      </td>
      <td style="padding: 14px 18px;">
        <span class="${statusBadgeClass}">${status}</span>
      </td>
      <td style="padding: 14px 18px;">
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-table-action" onclick="editAccount(${newId})">Edit</button>
          <button type="button" class="btn-table-action" onclick="resetPassword(${newId})">Reset</button>
          <button type="button" class="btn-table-action action-delete" onclick="deleteAccount(${newId})">Hapus</button>
        </div>
      </td>
    `;
    tbody.appendChild(newRow);
    alert(`Akun baru "${nama}" berhasil ditambahkan!`);
  }

  updateAdminStatCards();
  closeAdminAccountModal();
  filterAdminAccounts();
};

function updateAdminStatCards() {
  const rows = document.querySelectorAll('#adminTableBody tr');
  const total = rows.length;
  let userCount = 0;
  let pengelolaCount = 0;

  rows.forEach(r => {
    if (r.getAttribute('data-role') === 'User') userCount++;
    if (r.getAttribute('data-role') === 'Pengelola Lapangan') pengelolaCount++;
  });

  const totalEl = document.querySelector('#statTotalAkun');
  const userEl = document.querySelector('#statTotalUser');
  const pengelolaEl = document.querySelector('#statTotalPengelola');

  if (totalEl) totalEl.textContent = total;
  if (userEl) userEl.textContent = userCount;
  if (pengelolaEl) pengelolaEl.textContent = pengelolaCount;
}


// Public/mobile navbar hamburger
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.public-mobile-toggle').forEach((toggle) => {
    const navbar = toggle.closest('.sibora-navbar');
    const menu = navbar?.querySelector('.nav-group');
    if (!navbar || !menu) return;

    const closeMenu = () => {
      navbar.classList.remove('public-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      const open = navbar.classList.toggle('public-menu-open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', (event) => {
      if (!navbar.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  });
});
