/*
 * SIBORA web-to-Laravel integration.
 * Keeps the original HTML/CSS design but routes customer workflows to the API.
 */
(function () {
    'use strict';
    const API = window.SiboraApi;
    const KEYS = {
        selectedVenueId: 'sibora_selected_venue_id',
        selectedDate: 'sibora_selected_date',
        selectedTime: 'sibora_selected_time',
        selectedEquipment: 'sibora_selected_equipment',
        transactionId: 'sibora_pending_transaction_id',
        transaction: 'sibora_pending_transaction',
        afterLogin: 'sibora_after_login',
        paymentReturnPage: 'sibora_payment_return_page',
        paymentFlow: 'sibora_payment_flow',
        resumeEquipmentRental: 'sibora_resume_equipment_rental',
    };
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const money = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
    const todayIso = () => {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    };
    const datePretty = (value) => {
        if (!value)
            return '-';
        const raw = String(value);
        // Parse a date-only value at noon to avoid timezone shifts to the previous day.
        const date = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
        if (Number.isNaN(date.getTime()))
            return raw.slice(0, 10);
        return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Makassar' }).format(date);
    };
    // Kept local to this IIFE; sibora-mvp.js has its own private dateText helper.
    const dateText = (value) => {
        if (!value)
            return '-';
        const raw = String(value);
        const date = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
        if (Number.isNaN(date.getTime()))
            return raw.slice(0, 10);
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(date);
    };
    const dateTimeText = (value) => {
        if (!value)
            return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return dateText(value);
        return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(date);
    };
    const timePretty = (value) => String(value || '').slice(0, 5).replace(':', '.');
    const roleName = (role) => ({ pelanggan: 'Pelanggan', user: 'Pelanggan', pengelola: 'Pengelola', admin: 'Admin' }[role] || role || 'Pengguna');
    const currentUser = () => API.currentUser() || {};
    const currentProfile = () => currentUser().profile || {};

    // Hanya role pelanggan yang boleh membuat booking lapangan atau sewa peralatan.
    // Pemeriksaan UI ini melengkapi validasi role pada backend Laravel.
    const isCustomerAccount = () => API.isLoggedIn() && currentUser()?.role === 'pelanggan';
    const isLoggedInNonCustomer = () => API.isLoggedIn() && !isCustomerAccount();
    const CUSTOMER_ONLY_MESSAGE = 'Booking fasilitas dan penyewaan peralatan hanya tersedia untuk akun Pelanggan.';

    function denyBookingForNonCustomer() {
        window.alert(CUSTOMER_ONLY_MESSAGE);
        return false;
    }

    function applyBookingRoleRestrictions(root = document) {
        if (!isLoggedInNonCustomer()) return;

        $$('.btn-trigger-booking, .btn-rent-equipment, [data-action="schedule-book"]', root).forEach((button) => {
            button.disabled = true;
            button.setAttribute('aria-disabled', 'true');
            button.classList.add('booking-disabled-for-role');
            button.title = CUSTOMER_ONLY_MESSAGE;
            if (button.matches('.btn-trigger-booking, .btn-rent-equipment, [data-action="schedule-book"]')) {
                button.textContent = 'Khusus pelanggan';
            }
        });
    }
    // Satu sumber kebenaran untuk menentukan dashboard menurut role akun.
    const dashboardPathForRole = (user = currentUser()) => {
        if (user?.role === 'admin')
            return 'admin-manajemen.html';
        if (user?.role === 'pengelola')
            return 'pengelola-dashboard.html';
        return 'dashboard.html';
    };
    const normalizedPage = (value) => String(value || '')
        .split(/[?#]/)[0]
        .replace(/^\.\//, '')
        .replace(/^\//, '')
        .split('/')
        .pop()
        .toLowerCase();
    const isCustomerDashboardPath = (value) => normalizedPage(value) === 'dashboard.html';
    const readTransaction = () => {
        try {
            return JSON.parse(sessionStorage.getItem(KEYS.transaction) || 'null');
        }
        catch (_) {
            return null;
        }
    };
    const saveTransaction = (transaction) => {
        const id = transaction?.transaksi_id || transaction?.id;
        if (id)
            sessionStorage.setItem(KEYS.transactionId, String(id));
        if (transaction)
            sessionStorage.setItem(KEYS.transaction, JSON.stringify(transaction));
    };
    const isEquipmentTransaction = (transaction) => Array.isArray(transaction?.sewa_peralatan) && transaction.sewa_peralatan.length > 0;
    const paymentReturnPath = (transaction = readTransaction()) => {
        const saved = sessionStorage.getItem(KEYS.paymentReturnPage);
        if (saved === 'peralatan.html' || saved === 'booking.html')
            return saved;
        return isEquipmentTransaction(transaction) ? 'peralatan.html' : 'booking.html';
    };
    const applyPaymentReturnLink = (transaction = readTransaction()) => {
        const href = paymentReturnPath(transaction);
        const label = href === 'peralatan.html' ? 'Kembali ke Peralatan' : 'Kembali ke Booking';
        $$('a[href="booking.html"]', document).forEach((link) => {
            link.href = href;
            link.textContent = label;
        });
        sessionStorage.setItem(KEYS.paymentReturnPage, href);
    };
    const goByRole = (user = currentUser()) => {
        const returnPage = sessionStorage.getItem(KEYS.afterLogin);
        if (returnPage) {
            sessionStorage.removeItem(KEYS.afterLogin);
            window.location.href = isCustomerDashboardPath(returnPage)
                ? dashboardPathForRole(user)
                : returnPage;
            return;
        }
        window.location.href = dashboardPathForRole(user);
    };
    const showError = (error, bannerSelector) => {
        const message = error?.message || String(error || 'Terjadi kesalahan.');
        const banner = bannerSelector ? $(bannerSelector) : null;
        if (banner) {
            banner.textContent = message;
            banner.style.display = 'block';
            banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        else {
            window.alert(message);
        }
    };
    const getVenueId = () => sessionStorage.getItem(KEYS.selectedVenueId);
    const setVenueId = (id) => sessionStorage.setItem(KEYS.selectedVenueId, String(id));
    async function loginFromForm(form) {
        const modal = form.id === 'modalLoginForm';
        const username = $(modal ? '#modalUsername' : '#loginUsername')?.value.trim();
        const password = $(modal ? '#modalPassword' : '#loginPassword')?.value || '';
        const banner = modal ? '#modalErrorBanner' : '#loginErrorBanner';
        try {
            const result = await API.login(username, password);
            const targetUser = result.user || currentUser();
            if (modal) {
                sessionStorage.removeItem(KEYS.afterLogin);
                const overlay = $('#bookingLoginModal');
                overlay?.classList.remove('active');
                window.location.href = 'booking.html';
            }
            else {
                goByRole(targetUser);
            }
        }
        catch (error) {
            showError(error, banner);
        }
    }
    async function registerFromForm(form) {
        const username = $('#regUsername')?.value.trim() || '';
        const emailValue = $('#regEmail')?.value.trim() || '';
        const email = emailValue.includes('@') ? emailValue : `${emailValue}@gmail.com`;
        const password = $('#regPassword')?.value || '';
        const confirmation = $('#regConfirmPassword')?.value || '';
        if (password !== confirmation)
            return window.alert('Konfirmasi password tidak sama.');
        if (password.length < 8)
            return window.alert('Password minimal 8 karakter.');
        if (!$('#agreeTerms')?.checked)
            return window.alert('Centang persetujuan ketentuan terlebih dahulu.');
        try {
            await API.register({
                username,
                email,
                password,
                password_confirmation: confirmation,
                nama_lengkap: username,
            });
            window.alert('Registrasi berhasil. Akun tersimpan di database SIBORA.');
            goByRole(currentUser());
        }
        catch (error) {
            showError(error);
        }
    }
    function addStatusNotice(container, message, type = 'info') {
        if (!container)
            return;
        let notice = $('#siboraApiNotice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'siboraApiNotice';
            notice.style.cssText = 'padding:12px 16px;margin:12px 0;border-radius:8px;font-size:14px;line-height:1.5;';
            container.prepend(notice);
        }
        notice.textContent = message;
        notice.style.background = type === 'error' ? '#fff0f0' : '#e8f5ec';
        notice.style.color = type === 'error' ? '#8a1c1c' : '#184e37';
    }
    function sportNames(venue) {
        return (venue.sports || venue.jenis_olahraga || []).map((sport) => sport.nama || sport.name || '').filter(Boolean);
    }
    function venueImage(venue) {
        const value = venue.foto || 'assets/images/sports_bg.jpg';
        return /^(https?:)?\/\//i.test(value) || value.startsWith('/') ? value : value;
    }
    function venueCardHtml(venue) {
        const sports = sportNames(venue);
        const categories = sports.join(' ').toLowerCase() || 'lainnya';
        const facilities = (venue.facilities || []).map((item) => item.nama_fasilitas || item.nama || item).filter(Boolean).slice(0, 3);
        return `<article class="venue-card" data-lapangan-id="${esc(venue.lapangan_id)}" data-category="${esc(categories)}">
      <div class="venue-image-wrapper"><img src="${esc(venueImage(venue))}" alt="${esc(venue.nama)}" loading="lazy" onerror="this.src='assets/images/sports_bg.jpg'"></div>
      <div class="venue-info-body">
        <h3 class="venue-name">${esc(venue.nama)}</h3>
        <p class="venue-sport-type">${esc(sports.join(' • ') || 'Olahraga')}</p>
        <p class="venue-location">📍 ${esc(venue.lokasi || '-')}</p>
        <div class="venue-tags-row">${facilities.map((item) => `<span class="venue-badge-tag">${esc(item)}</span>`).join('')}</div>
        <p class="venue-price-text">${money(venue.harga_per_jam)}/jam</p>
        <button type="button" class="btn-venue-booking btn-trigger-booking" data-venue-id="${esc(venue.lapangan_id)}">Lihat &amp; Booking</button>
      </div>
    </article>`;
    }
    async function loadVenues() {
        const grid = $('.venues-grid');
        if (!grid)
            return;
        try {
            const result = await API.venues({ per_page: 50 });
            const venues = result.data || [];
            grid.innerHTML = venues.length ? venues.map(venueCardHtml).join('') : '<p>Belum ada lapangan aktif.</p>';
            filterVenues();
            applyBookingRoleRestrictions(grid);
        }
        catch (error) {
            addStatusNotice($('.venues-container') || grid.parentElement, `Gagal memuat lapangan dari API: ${error.message}`, 'error');
        }
    }
    function filterVenues() {
        const selected = $('.category-filter-pill.active')?.dataset.category || 'all';
        const keyword = ($('#searchLapanganInput')?.value || '').toLowerCase().trim();
        $$('.venue-card').forEach((card) => {
            const text = card.textContent.toLowerCase();
            const categories = (card.dataset.category || '').toLowerCase();
            card.style.display = (selected === 'all' || categories.includes(selected)) && (!keyword || text.includes(keyword)) ? 'flex' : 'none';
        });
    }
    function setTodayMinimum(input) {
        if (!input)
            return;
        input.min = todayIso();
        if (!input.value || input.value < input.min)
            input.value = input.min;
    }
    function normalizeEquipmentCategory(item) {
        const categoryName = String(item?.kategori?.nama || item?.kategori_peralatan?.nama || '').toLowerCase().trim();
        const searchable = `${categoryName} ${item?.nama || ''} ${item?.spesifikasi || ''}`
            .toLowerCase();
        if (searchable.includes('bola'))
            return 'bola';
        if (searchable.includes('raket'))
            return 'raket';
        if (searchable.includes('sepatu'))
            return 'sepatu';
        if (searchable.includes('pelindung') ||
            searchable.includes('rompi') ||
            searchable.includes('support'))
            return 'pelindung';
        return categoryName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-');
    }
    function resumeEquipmentRentalAfterLogin() {
        if (sessionStorage.getItem(KEYS.resumeEquipmentRental) !== '1')
            return;
        sessionStorage.removeItem(KEYS.resumeEquipmentRental);

        if (!isCustomerAccount()) {
            if (API.isLoggedIn()) denyBookingForNonCustomer();
            return;
        }

        let selected = null;
        try {
            selected = JSON.parse(sessionStorage.getItem(KEYS.selectedEquipment) || 'null');
        } catch (_) {
            selected = null;
        }

        if (!selected?.peralatan_id)
            return;

        if (typeof window.openRentModal === 'function') {
            window.openRentModal(
                selected.nama || 'Peralatan olahraga',
                Number(selected.harga_per_jam || 0),
                selected.spesifikasi || 'Peralatan olahraga'
            );
        }
    }

    async function loadEquipments() {
        const grid = $('.peralatan-grid');
        const template = $('#equipmentCardTemplate');
        if (!grid || !template)
            return;
        const iconByCategory = {
            bola: '⚽',
            raket: '🏸',
            sepatu: '👟',
            pelindung: '🩹',
        };
        try {
            const result = await API.equipments({ per_page: 50 });
            const items = result.data || [];
            const fragment = document.createDocumentFragment();
            grid.replaceChildren();
            if (!items.length) {
                const message = document.createElement('p');
                message.className = 'equipment-list-message';
                message.textContent = 'Belum ada peralatan aktif.';
                grid.append(message);
                return;
            }
            items.forEach((item) => {
                const cardFragment = template.content.cloneNode(true);
                const card = $('.equipment-card', cardFragment);
                if (!card)
                    return;
                const id = item.peralatan_id ?? item.id;
                const category = normalizeEquipmentCategory(item);
                const name = item.nama || 'Peralatan olahraga';
                const specification = item.spesifikasi || item.kategori?.nama || 'Peralatan olahraga';
                const stock = item.stok ?? '-';
                card.dataset.peralatanId = String(id ?? '');
                card.dataset.category = category;
                const icon = $('[data-equipment-field="icon"]', card);
                const title = $('[data-equipment-field="name"]', card);
                const spec = $('[data-equipment-field="spec"]', card);
                const price = $('[data-equipment-field="price"]', card);
                const rentButton = $('[data-equipment-field="rent"]', card);
                if (icon) {
                    icon.textContent = iconByCategory[category] || '🎾';
                    icon.title = name;
                    if (item.foto) {
                        const visual = $('.equipment-visual-top', card);
                        const photo = document.createElement('img');
                        photo.className = 'equipment-photo';
                        photo.src = item.foto;
                        photo.alt = name;
                        photo.loading = 'lazy';
                        photo.onerror = () => photo.remove();
                        if (visual) {
                            visual.replaceChildren(photo);
                        }
                    }
                }
                if (title)
                    title.textContent = name;
                if (spec)
                    spec.textContent = `${specification} • Stok ${stock}`;
                if (price)
                    price.textContent = `${money(item.harga_per_jam)}/jam`;
                if (rentButton)
                    rentButton.dataset.equipmentId = String(id ?? '');
                fragment.append(cardFragment);
            });
            grid.append(fragment);
            filterEquipments();
            applyBookingRoleRestrictions(grid);
        }
        catch (error) {
            grid.replaceChildren();
        const message = document.createElement('p');
        message.className = 'equipment-list-message is-error';
        message.textContent = 'Gagal memuat daftar peralatan. Periksa koneksi API lalu muat ulang halaman.';
        grid.append(message);
        addStatusNotice(
            $('.peralatan-grid-wrapper') || grid.parentElement,
            `Gagal memuat peralatan dari API: ${error.message}`,
            'error'
        );
        }
    }
    function filterEquipments() {
        const selected = $('.peralatan-pill.active')?.dataset.category || 'all';
        const keyword = ($('#searchPeralatanInput')?.value || '').toLowerCase().trim();
        $$('.equipment-card').forEach((card) => {
            const categoryOk = selected === 'all' || (card.dataset.category || '').toLowerCase() === selected;
            const textOk = !keyword || card.textContent.toLowerCase().includes(keyword);
            card.style.display = categoryOk && textOk ? 'flex' : 'none';
        });
        const visible = $$('.equipment-card').filter(card => card.style.display !== 'none').length;
        let empty = $('#equipmentSearchEmpty');
        const grid = $('.peralatan-grid');
        const showEmptyState = grid && !visible && (keyword || selected !== 'all');
        if (showEmptyState && !empty) {
            const template = $('#equipmentSearchEmptyTemplate');
            if (template) {
                const fragment = template.content.cloneNode(true);
                empty = $('#equipmentSearchEmpty', fragment);
                if (empty)
                    grid.parentElement.append(fragment);
            }
        }
        else if (!showEmptyState && empty) {
            empty.remove();
        }
    }
    async function initSchedulePage() {
        const venueList = $('.venue-selector-list');
        const table = $('.schedule-grid-table');
        if (!venueList || !table)
            return;

        const tableCard = $('.schedule-table-card');
        let controls = tableCard?.querySelector('.schedule-controls');
        if (!controls && tableCard) {
            controls = document.createElement('div');
            controls.className = 'schedule-controls';
            controls.innerHTML = `
              <div class="schedule-controls-copy">
                <h2>Jadwal Lapangan</h2>
                <p id="scheduleSelectedSummary">Cari lapangan dan pilih tanggal untuk melihat jam yang masih tersedia.</p>
              </div>
              <label class="schedule-date-field" for="apiScheduleDate">
                <span>Tanggal booking</span>
                <input id="apiScheduleDate" type="date" required>
              </label>`;
            tableCard.prepend(controls);
        }
        setTodayMinimum($('#apiScheduleDate'));
        if ($('#apiScheduleDate') && !$('#apiScheduleDate').value)
            $('#apiScheduleDate').value = '';

        let venues = [];
        try {
            const result = await API.venues({ per_page: 100 });
            venues = result.data || [];
        }
        catch (error) {
            addStatusNotice(tableCard, `Gagal memuat jadwal: ${error.message}`, 'error');
            return;
        }

        if (!$('#scheduleVenueSearch') || !$('#scheduleVenueResults')) {
            venueList.innerHTML = `
              <div class="schedule-venue-search-panel">
                <label for="scheduleVenueSearch">Cari lapangan</label>
                <input id="scheduleVenueSearch" type="search" placeholder="Nama atau lokasi lapangan..." autocomplete="off">
                <p id="scheduleVenueSearchCount" aria-live="polite"></p>
              </div>
              <div class="schedule-venue-results" id="scheduleVenueResults"></div>`;
        }

        if (!venues.length) {
            addStatusNotice(tableCard, 'Belum ada lapangan aktif.', 'error');
            $('#scheduleVenueResults').innerHTML = '<p class="schedule-venue-empty">Belum ada lapangan yang dapat ditampilkan.</p>';
            return;
        }

        const MAX_VISIBLE_VENUES = 4;
        let hadNoScheduleMatches = false;
        let selectedVenueId = getVenueId() || String(venues[0].lapangan_id);
        if (!venues.some((venue) => String(venue.lapangan_id) === String(selectedVenueId)))
            selectedVenueId = String(venues[0].lapangan_id);
        setVenueId(selectedVenueId);

        function renderScheduleVenueList() {
            const storedVenueId = getVenueId();
            if (storedVenueId && venues.some((venue) => String(venue.lapangan_id) === String(storedVenueId)))
                selectedVenueId = String(storedVenueId);
            const query = ($('#scheduleVenueSearch')?.value || '').trim().toLocaleLowerCase('id-ID');
            const matches = venues.filter((venue) => {
                const searchable = [venue.nama, venue.lokasi, ...sportNames(venue)].join(' ').toLocaleLowerCase('id-ID');
                return !query || searchable.includes(query);
            });
            let visible = matches.slice(0, MAX_VISIBLE_VENUES);
            const selectedPosition = matches.findIndex((venue) => String(venue.lapangan_id) === String(selectedVenueId));
            if (!query && selectedPosition >= MAX_VISIBLE_VENUES) {
                visible = [matches[selectedPosition], ...matches.filter((venue) => String(venue.lapangan_id) !== String(selectedVenueId))].slice(0, MAX_VISIBLE_VENUES);
            }
            const resultBox = $('#scheduleVenueResults');
            const count = $('#scheduleVenueSearchCount');

            if (count) {
                count.textContent = matches.length > MAX_VISIBLE_VENUES
                    ? `Menampilkan ${visible.length} dari ${matches.length} hasil yang cocok. Perjelas pencarian untuk menemukan lapangan lain.`
                    : `${matches.length} lapangan ditemukan.`;
            }

            if (!resultBox) return false;
            if (!visible.length) {
                hadNoScheduleMatches = true;
                resultBox.innerHTML = '<p class="schedule-venue-empty">Lapangan tidak ditemukan. Coba nama atau lokasi lain.</p>';
                const body = $('tbody', table);
                if (body)
                    body.innerHTML = '<tr><td colspan="3" class="schedule-empty-state">Lapangan tidak ditemukan. Ubah kata kunci pencarian.</td></tr>';
                const title = $('.schedule-controls-copy h2');
                const summary = $('#scheduleSelectedSummary');
                if (title)
                    title.textContent = 'Lapangan tidak ditemukan';
                if (summary)
                    summary.textContent = 'Tidak ada lapangan yang cocok dengan kata kunci tersebut.';
                return false;
            }
            const resultsReturnedAfterEmpty = hadNoScheduleMatches;
            hadNoScheduleMatches = false;

            const currentIsVisible = visible.some((venue) => String(venue.lapangan_id) === String(selectedVenueId));
            let selectionChanged = false;
            if (!currentIsVisible && query) {
                selectedVenueId = String(visible[0].lapangan_id);
                setVenueId(selectedVenueId);
                selectionChanged = true;
            }

            resultBox.innerHTML = visible.map((venue) => {
                const id = String(venue.lapangan_id);
                const selected = id === String(selectedVenueId);
                return `<button type="button" class="venue-mini-card schedule-venue-card${selected ? ' active' : ''}" data-venue-id="${esc(id)}" aria-pressed="${selected}">
                  <img src="${esc(venueImage(venue))}" alt="${esc(venue.nama)}" class="venue-mini-thumb" loading="lazy" onerror="this.src='assets/images/sports_bg.jpg'">
                  <span class="venue-mini-info"><strong>${esc(venue.nama)}</strong><span>${esc(sportNames(venue).join(' • ') || 'Olahraga')}</span><span>📍 ${esc(venue.lokasi || '-')}</span></span>
                  <span class="schedule-venue-selected-mark" aria-hidden="true">${selected ? '✓' : ''}</span>
                </button>`;
            }).join('');
            return selectionChanged || resultsReturnedAfterEmpty;
        }

        async function loadDay() {
            const storedVenueId = getVenueId();
            const id = String(storedVenueId || selectedVenueId || venues[0].lapangan_id);
            selectedVenueId = id;
            const date = $('#apiScheduleDate')?.value || '';
            const venue = venues.find((item) => String(item.lapangan_id) === id);
            const title = $('.schedule-controls-copy h2');
            const summary = $('#scheduleSelectedSummary');
            if (title)
                title.textContent = venue?.nama || 'Jadwal Lapangan';

            if (!date) {
                const head = $('thead', table);
                const body = $('tbody', table);
                if (head)
                    head.innerHTML = '<tr><th style="width:100px">Jam</th><th>Status</th><th>Aksi</th></tr>';
                if (body)
                    body.innerHTML = '<tr><td colspan="3" class="schedule-empty-state">Pilih tanggal terlebih dahulu untuk melihat jam dan ketersediaan.</td></tr>';
                if (summary)
                    summary.textContent = 'Pilih tanggal untuk melihat jadwal lapangan yang dipilih.';
                return;
            }
            try {
                const result = await API.venueSchedule(id, date);
                const data = result.data || {};
                const head = $('thead', table);
                const body = $('tbody', table);
                if (head)
                    head.innerHTML = '<tr><th style="width:100px">Jam</th><th>Status</th><th>Aksi</th></tr>';
                if (body) {
                    const slots = data.slots || [];
                    body.innerHTML = slots.map((slot) => {
                        const available = slot.status === 'tersedia';
                        return `<tr><td class="time-label">${esc(timePretty(slot.jam_mulai))}</td><td><span class="schedule-slot-status ${available ? 'is-available' : 'is-booked'}">${available ? 'Tersedia' : 'Dipesan'}</span></td><td>${available ? `<button type="button" class="btn-venue-booking" data-action="schedule-book" data-venue-id="${esc(id)}" data-date="${esc(date)}" data-time="${esc(String(slot.jam_mulai).slice(0, 5))}" style="padding:7px 12px">Pilih</button>` : '—'}</td></tr>`;
                    }).join('') || '<tr><td colspan="3" class="schedule-empty-state">Tidak ada slot jadwal untuk tanggal ini.</td></tr>';
                    const availableCount = slots.filter((slot) => slot.status === 'tersedia').length;
                    if (summary)
                        summary.textContent = `${datePretty(date)} · ${availableCount} slot tersedia dari ${slots.length} slot.`;
                }
                applyBookingRoleRestrictions(body || table);
            }
            catch (error) {
                addStatusNotice(tableCard, `Gagal memuat slot pada tanggal tersebut: ${error.message}`, 'error');
            }
        }

        renderScheduleVenueList();
        $('#scheduleVenueSearch')?.addEventListener('input', () => {
            const changedSelection = renderScheduleVenueList();
            if (changedSelection) loadDay();
        });
        $('#scheduleVenueSearch')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                const changedSelection = renderScheduleVenueList();
                if (changedSelection) loadDay();
            }
        });
        $('#apiScheduleDate')?.addEventListener('change', loadDay);
        await loadDay();
    }
    let bookingVenue = null;
    let scheduleSlots = [];
    let selectedStart = '';
    async function initBookingPage() {
        if (!$('#bookingDate')) return;
        if (isLoggedInNonCustomer()) {
            denyBookingForNonCustomer();
            window.location.replace('lapangan.html');
            return;
        }
        if (!API.isLoggedIn()) {
            sessionStorage.setItem(KEYS.afterLogin, 'booking.html');
            window.alert('Silakan login terlebih dahulu untuk melakukan booking.');
            window.location.href = 'login.html';
            return;
        }
        const dateInput = $('#bookingDate');
        setTodayMinimum(dateInput);
        const scheduleDate = sessionStorage.getItem(KEYS.selectedDate);
        if (scheduleDate && scheduleDate >= todayIso())
            dateInput.value = scheduleDate;
        else
            dateInput.value = '';
        selectedStart = dateInput.value ? (sessionStorage.getItem(KEYS.selectedTime) || '') : '';
        const durationInput = $('#bookingDuration');
        if (durationInput)
            durationInput.disabled = !dateInput.value;
        try {
            let venueId = getVenueId();
            if (!venueId) {
                const list = await API.venues({ per_page: 1 });
                venueId = list.data?.[0]?.lapangan_id;
                if (venueId)
                    setVenueId(venueId);
            }
            if (!venueId)
                throw new Error('Belum ada lapangan aktif untuk dipesan.');
            const response = await API.venue(venueId);
            bookingVenue = response.data || response;
            const user = currentUser();
            const profile = currentProfile();
            if ($('#bookingNama') && (profile.nama_lengkap || user.username))
                $('#bookingNama').value = profile.nama_lengkap || user.username;
            if ($('#bookingHp') && profile.no_hp)
                $('#bookingHp').value = profile.no_hp;
            if ($('#bookingEmail') && user.email)
                $('#bookingEmail').value = user.email;
            renderBookingVenue();
            dateInput.addEventListener('change', () => {
                selectedStart = '';
                sessionStorage.removeItem(KEYS.selectedTime);
                const duration = $('#bookingDuration');
                if (duration)
                    duration.disabled = !dateInput.value;
                loadBookingSchedule();
            });
            $('#bookingDuration')?.addEventListener('change', refreshBookingSlots);
            if (dateInput.value)
                await loadBookingSchedule();
            else {
                renderBookingSlots();
                updateBookingSummary();
            }
        }
        catch (error) {
            addStatusNotice($('.booking-page-container'), error.message, 'error');
        }
    }
    function renderBookingVenue() {
        if (!bookingVenue)
            return;
        const banner = $('.selected-item-banner');
        const image = $('.selected-item-thumb', banner || document);
        const name = $('h4', $('.selected-item-left') || document);
        const desc = $('.selected-item-left p');
        const price = $('.selected-item-price');
        if (image) {
            image.src = venueImage(bookingVenue);
            image.alt = bookingVenue.nama;
        }
        if (name)
            name.textContent = bookingVenue.nama;
        if (desc)
            desc.textContent = `${sportNames(bookingVenue).join(' • ') || 'Olahraga'} · ${bookingVenue.lokasi || '-'}`;
        if (price)
            price.innerHTML = `${money(bookingVenue.harga_per_jam)}/jam<small style="display:block;font-size:.75rem;color:#008837;font-weight:600">Aktif</small>`;
        updateBookingSummary();
    }
    async function loadBookingSchedule() {
        if (!bookingVenue)
            return;
        const date = $('#bookingDate')?.value || '';
        if (!date) {
            scheduleSlots = [];
            selectedStart = '';
            renderBookingSlots();
            updateBookingSummary();
            return;
        }
        if (date < todayIso()) {
            window.alert('Tanggal booking tidak boleh sebelum hari ini.');
            $('#bookingDate').value = todayIso();
            return loadBookingSchedule();
        }
        try {
            const response = await API.venueSchedule(bookingVenue.lapangan_id, date);
            scheduleSlots = response.data?.slots || [];
            if (selectedStart && date !== sessionStorage.getItem(KEYS.selectedDate))
                selectedStart = '';
            if (selectedStart) {
                const selectedIndex = scheduleSlots.findIndex((slot) => String(slot.jam_mulai).slice(0, 5) === selectedStart);
                if (selectedIndex < 0 || !slotCanStart(selectedIndex))
                    selectedStart = '';
            }
            renderBookingSlots();
            updateBookingSummary();
        }
        catch (error) {
            addStatusNotice($('.booking-left-cards') || $('.booking-page-container'), error.message, 'error');
        }
    }
    function slotCanStart(index) {
        const duration = Number($('#bookingDuration')?.value || 1);
        if (index < 0 || index + duration > scheduleSlots.length)
            return false;
        const date = $('#bookingDate')?.value || todayIso();
        for (let offset = 0; offset < duration; offset++) {
            const slot = scheduleSlots[index + offset];
            if (!slot || slot.status !== 'tersedia')
                return false;
            if (offset > 0 && String(scheduleSlots[index + offset - 1].jam_selesai).slice(0, 5) !== String(slot.jam_mulai).slice(0, 5))
                return false;
        }
        if (date === todayIso()) {
            const start = String(scheduleSlots[index].jam_mulai).slice(0, 5);
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [hours, minutes] = start.split(':').map(Number);
            if (hours * 60 + minutes <= currentMinutes)
                return false;
        }
        return true;
    }
    function renderBookingSlots() {
        const grid = $('.time-slot-grid');
        if (!grid)
            return;
        const selectedDate = $('#bookingDate')?.value || '';
        if (!selectedDate) {
            grid.innerHTML = '<div class="slot-placeholder" id="slotPlaceholder">Pilih tanggal terlebih dahulu untuk melihat pilihan waktu yang tersedia.</div>';
            return;
        }
        const buttons = scheduleSlots.map((slot, index) => {
            const enabled = slotCanStart(index);
            const time = String(slot.jam_mulai).slice(0, 5);
            const active = enabled && selectedStart === time;
            const clockNow = new Date();
            const startMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
            const nowMinutes = clockNow.getHours() * 60 + clockNow.getMinutes();
            const isPast = selectedDate === todayIso() && startMinutes <= nowMinutes;
            const stateLabel = enabled ? 'Tersedia' : (slot.status !== 'tersedia' ? 'Sudah dipesan' : (isPast ? 'Waktu lewat' : 'Durasi tidak tersedia'));
            return `<button type="button" class="btn-slot-time${active ? ' active' : ''}${enabled ? ' is-available' : ' is-unavailable'}" data-time="${esc(time)}" aria-label="${esc(timePretty(time))}, ${esc(stateLabel)}" title="${esc(stateLabel)}" ${enabled ? '' : 'disabled'}><span class="slot-time-label">${esc(timePretty(time))}</span><small class="slot-state-label">${esc(stateLabel)}</small></button>`;
        }).join('');
        const availableCount = scheduleSlots.filter((slot, index) => slotCanStart(index)).length;
        grid.innerHTML = buttons
            ? `<div class="slot-availability-summary"><strong>${availableCount} slot tersedia</strong><span>${esc(datePretty(selectedDate))}</span></div>${buttons}`
            : '<div class="slot-placeholder">Tidak ada jadwal yang tersedia pada tanggal ini. Silakan pilih tanggal lain.</div>';
    }
    function refreshBookingSlots() {
        const date = $('#bookingDate')?.value || '';
        if (!date) {
            selectedStart = '';
            scheduleSlots = [];
            renderBookingSlots();
            updateBookingSummary();
            return;
        }
        if (selectedStart) {
            const selectedIndex = scheduleSlots.findIndex((slot) => String(slot.jam_mulai).slice(0, 5) === selectedStart);
            if (selectedIndex < 0 || !slotCanStart(selectedIndex))
                selectedStart = '';
        }
        renderBookingSlots();
        updateBookingSummary();
    }
    function updateBookingSummary() {
        if (!bookingVenue)
            return;
        const date = $('#bookingDate')?.value || '';
        const duration = Number($('#bookingDuration')?.value || 1);
        const startSlot = scheduleSlots.find((slot) => String(slot.jam_mulai).slice(0, 5) === selectedStart);
        let end = '';
        if (startSlot) {
            const [h, m] = selectedStart.split(':').map(Number);
            end = `${String(h + duration).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        const subtotal = Number(bookingVenue.harga_per_jam || 0) * duration;
        const fee = Math.round(subtotal * 0.05);
        const rows = $$('.booking-right-sidebar .summary-row');
        const values = [bookingVenue.nama, date ? datePretty(`${date}T00:00:00+08:00`) : 'Pilih tanggal', date && startSlot ? `${timePretty(selectedStart)}–${timePretty(end)}` : (date ? 'Pilih slot waktu' : 'Pilih tanggal terlebih dahulu'), `${duration} jam`, money(subtotal), money(fee)];
        rows.forEach((row, index) => {
            const target = row.children[1];
            if (target && values[index] !== undefined)
                target.textContent = values[index];
        });
        const totalNode = $('.booking-right-sidebar .summary-total-row strong');
        if (totalNode)
            totalNode.textContent = money(subtotal + fee);
    }
    async function submitVenueBooking() {
        if (!API.isLoggedIn()) {
            sessionStorage.setItem(KEYS.afterLogin, 'booking.html');
            window.location.href = 'login.html';
            return;
        }
        if (!isCustomerAccount()) {
            denyBookingForNonCustomer();
            return;
        }
        if (!bookingVenue)
            return window.alert('Lapangan belum selesai dimuat. Silakan muat ulang halaman.');
        const date = $('#bookingDate')?.value || '';
        const duration = Number($('#bookingDuration')?.value || 1);
        const index = scheduleSlots.findIndex((slot) => String(slot.jam_mulai).slice(0, 5) === selectedStart);
        if (!selectedStart || index < 0 || !slotCanStart(index))
            return window.alert('Pilih slot waktu tersedia yang sesuai dengan durasi booking.');
        const body = {
            lapangan_id: Number(bookingVenue.lapangan_id),
            tanggal: date,
            jam_mulai: selectedStart,
            durasi_jam: duration,
            nama_penyewa: $('#bookingNama')?.value.trim() || '',
            no_hp_penyewa: $('#bookingHp')?.value.trim() || '',
            email_penyewa: $('#bookingEmail')?.value.trim() || '',
            catatan: $('textarea.booking-input-gray')?.value.trim() || '',
        };
        if (!body.nama_penyewa || !body.no_hp_penyewa || !body.email_penyewa)
            return window.alert('Lengkapi nama, nomor HP, dan email penyewa.');
        const button = $('a.btn-confirm-booking-next[href="pembayaran.html"]');
        if (button) {
            button.dataset.oldText = button.textContent;
            button.textContent = 'Memproses booking...';
            button.style.pointerEvents = 'none';
        }
        try {
            const result = await API.bookVenue(body);
            saveTransaction(result.data);
            sessionStorage.setItem(KEYS.paymentReturnPage, 'booking.html');
            sessionStorage.setItem(KEYS.paymentFlow, 'venue');
            sessionStorage.removeItem(KEYS.selectedTime);
            sessionStorage.removeItem(KEYS.selectedDate);
            window.location.href = 'pembayaran.html';
        }
        catch (error) {
            showError(error);
            if (button) {
                button.textContent = button.dataset.oldText || 'Lanjutkan';
                button.style.pointerEvents = '';
            }
            await loadBookingSchedule();
        }
    }
    function fillPaymentPage(transaction) {
        if (!transaction) {
            window.alert('Data transaksi tidak ditemukan. Silakan buka kembali riwayat atau halaman pembayaran.');
            return;
        }
        const booking = transaction.booking_lapangan;
        const equipmentRentals = transaction.sewa_peralatan || [];
        const itemName = booking?.lapangan?.nama || equipmentRentals.map((row) => row.peralatan?.nama).filter(Boolean).join(', ') || 'Sewa Peralatan';
        const dateRaw = booking?.tanggal || equipmentRentals[0]?.tanggal_sewa;
        const start = booking?.jam_mulai || equipmentRentals[0]?.waktu_mulai;
        const end = booking?.jam_selesai || equipmentRentals[0]?.waktu_selesai;
        const duration = booking?.durasi_jam || equipmentRentals[0]?.durasi_jam || '';
        const image = $('.white-panel-card .selected-item-thumb');
        const detailPanel = $('.white-panel-card');
        const h4 = $('h4', detailPanel || document);
        const paragraphs = $$('p', $('.white-panel-card div[style*="display: flex; align-items: center"]') || detailPanel || document);
        if (h4)
            h4.textContent = itemName;
        if (paragraphs[0])
            paragraphs[0].textContent = datePretty(dateRaw);
        if (paragraphs[1])
            paragraphs[1].textContent = `${timePretty(start)} - ${timePretty(end)} (${duration} jam)`;
        const right = $('.white-panel-card div[style*="text-align: right"]');
        const rightStrong = $$('strong', right || document);
        if (rightStrong[0])
            rightStrong[0].textContent = transaction.nama_penyewa || currentProfile().nama_lengkap || currentUser().username || '-';
        if (rightStrong[1])
            rightStrong[1].textContent = transaction.kode_booking || '-';
        const badge = $('.payment-badge-status');
        if (badge)
            badge.textContent = String(transaction.status || 'menunggu_pembayaran').replaceAll('_', ' ').toUpperCase();
        const rows = $$('.sidebar-summary-card .summary-row');
        if (rows[0]?.children[1])
            rows[0].children[1].textContent = money(transaction.subtotal);
        if (rows[1]?.children[1])
            rows[1].children[1].textContent = money(transaction.biaya_admin);
        const total = $('.sidebar-summary-card .summary-total-row strong');
        if (total)
            total.textContent = money(transaction.total_bayar);
        const successCode = $('#kodeBookingText');
        if (successCode)
            successCode.textContent = transaction.kode_booking || '-';
        const paymentRecord = (transaction.pembayaran || []).slice(-1)[0] || {};
        const successRows = $$('.success-info-row');
        const successValues = [
            itemName,
            datePretty(dateRaw),
            `${timePretty(start)} – ${timePretty(end)}${duration ? ` (${duration} jam)` : ''}`,
            transaction.nama_penyewa || currentProfile().nama_lengkap || currentUser().username || '-',
            String(paymentRecord.metode || 'transfer_bank').replaceAll('_', ' ').toUpperCase(),
            String(paymentRecord.ref_gateway || '-'),
            paymentRecord.waktu_bayar ? dateTimeText(paymentRecord.waktu_bayar) : '-',
            (transaction.status === 'lunas' || paymentRecord.status === 'berhasil') ? 'LUNAS' : String(transaction.status || 'MENUNGGU').replaceAll('_', ' ').toUpperCase(),
            money(transaction.total_bayar),
        ];
        successRows.forEach((row, index) => {
            const value = $('.val', row);
            if (value && successValues[index] !== undefined)
                value.textContent = successValues[index];
        });
        const successMail = $('.success-alert-green strong');
        if (successMail)
            successMail.textContent = transaction.email_penyewa || currentUser().email || '-';
        if (image && booking?.lapangan?.foto)
            image.src = venueImage(booking.lapangan);
        if (transaction.status === 'lunas' || (transaction.pembayaran || []).some((p) => p.status === 'berhasil')) {
            const button = $('#btnKonfirmasiBayar');
            if (button) {
                button.disabled = true;
                button.textContent = 'Pembayaran Sudah Lunas';
            }
            $('#btnPrintPaymentReceiptPage')?.classList.remove('is-hidden');
        }
    }
    function printReceipt(transaction, title = 'Struk Pembayaran SIBORA', targetWindow = null) {
        if (!transaction)
            return;
        const booking = transaction.booking_lapangan;
        const rentals = transaction.sewa_peralatan || [];
        const payment = (transaction.pembayaran || []).slice(-1)[0] || {};
        const item = booking?.lapangan?.nama || rentals.map(r => r.peralatan?.nama).filter(Boolean).join(', ') || 'Sewa Peralatan';
        const date = booking?.tanggal || rentals[0]?.tanggal_sewa;
        const start = booking?.jam_mulai || rentals[0]?.waktu_mulai;
        const end = booking?.jam_selesai || rentals[0]?.waktu_selesai;
        const status = transaction.status === 'lunas' || payment.status === 'berhasil' ? 'LUNAS' : String(transaction.status || 'MENUNGGU').replaceAll('_', ' ').toUpperCase();
        const subtotal = transaction.subtotal ?? (booking?.subtotal ?? rentals.reduce((sum, row) => sum + Number(row.subtotal || row.jumlah || 0), 0));
        const adminFee = transaction.biaya_admin ?? 0;
        const total = transaction.total_bayar ?? (Number(subtotal || 0) + Number(adminFee || 0));
        const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial,sans-serif;background:#f4f6f4;padding:24px;color:#18251f}.receipt{max-width:430px;margin:auto;background:#fff;border:1px solid #dfe7e1;border-radius:16px;padding:24px}h1{font-size:22px;margin:0 0 4px;color:#184e37}p{margin:4px 0;color:#66736d;font-size:13px}.code{background:#eef7f1;border-radius:10px;padding:14px;margin:18px 0;text-align:center}.code strong{display:block;font-size:18px;color:#184e37;letter-spacing:1px}.row{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px dashed #d9e2dc;font-size:14px}.row strong{text-align:right}.total{font-size:18px;font-weight:800;color:#184e37;border-bottom:0}.badge{display:inline-block;padding:6px 10px;border-radius:999px;background:#e7f7ed;color:#137342;font-weight:700;font-size:12px}@media print{body{padding:0;background:#fff}.receipt{border:0}}</style></head><body><div class="receipt"><h1>SIBORA</h1><p>${esc(title)}</p><div class="code"><span>Kode Booking</span><strong>${esc(transaction.kode_booking || '-')}</strong></div><div class="row"><span>Fasilitas</span><strong>${esc(item)}</strong></div><div class="row"><span>Tanggal</span><strong>${esc(dateText(date))}</strong></div><div class="row"><span>Waktu</span><strong>${esc(start ? `${timePretty(start)} - ${timePretty(end)}` : '-')}</strong></div><div class="row"><span>Nama penyewa</span><strong>${esc(transaction.nama_penyewa || '-')}</strong></div><div class="row"><span>Metode</span><strong>${esc(String(payment.metode || '-').replaceAll('_', ' ').toUpperCase())}</strong></div><div class="row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="row"><span>Biaya admin</span><strong>${money(adminFee)}</strong></div><div class="row total"><span>Total</span><strong>${money(total)}</strong></div><div class="row"><span>Status</span><strong><span class="badge">${esc(status)}</span></strong></div><div class="row"><span>Ref. pembayaran</span><strong>${esc(payment.ref_gateway || '-')}</strong></div><div class="row"><span>Waktu pembayaran</span><strong>${esc(payment.waktu_bayar ? dateTimeText(payment.waktu_bayar) : '-')}</strong></div><p style="margin-top:18px;text-align:center">Terima kasih telah menggunakan SIBORA.</p></div><script>window.onload=()=>window.print();</script></body></html>`;
        const win = targetWindow || window.open('', '_blank', 'width=520,height=760');
        if (!win)
            return window.alert('Popup diblokir browser. Izinkan popup untuk mencetak struk, lalu coba lagi.');
        win.document.open();
        win.document.write(html);
        win.document.close();
    }
    async function initPaymentPage() {
        if (!$('#btnKonfirmasiBayar'))
            return;
        if (isLoggedInNonCustomer()) {
            denyBookingForNonCustomer();
            window.location.replace(dashboardPathForRole(currentUser()));
            return;
        }
        const id = sessionStorage.getItem(KEYS.transactionId);
        const transaction = readTransaction();
        applyPaymentReturnLink(transaction);
        if (!id || !transaction) {
            addStatusNotice($('.booking-page-container') || $('main'), 'Tidak ada transaksi aktif. Silakan buat booking terlebih dahulu.', 'error');
            const button = $('#btnKonfirmasiBayar');
            if (button)
                button.disabled = true;
            return;
        }
        fillPaymentPage(transaction);
        const methodBtns = $$('.payment-method-btn');
        methodBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.method === 'bca'));
        const isPaid = transaction.status === 'lunas' || (transaction.pembayaran || []).some((p) => p.status === 'berhasil');
        const confirmButton = $('#btnKonfirmasiBayar');
        if (confirmButton) {
            confirmButton.disabled = isPaid;
            confirmButton.textContent = isPaid ? 'Pembayaran Sudah Lunas' : 'Konfirmasi Pembayaran (Demo Lokal)';
        }
    }
    async function processPayment() {
        if (!isCustomerAccount()) {
            denyBookingForNonCustomer();
            return;
        }
        const transId = sessionStorage.getItem(KEYS.transactionId);
        let transaction = readTransaction();
        if (!transId || !transaction)
            return window.alert('Transaksi tidak ditemukan. Buat booking terlebih dahulu.');
        if (transaction.status === 'lunas')
            return window.alert('Transaksi ini sudah lunas.');
        const button = $('#btnKonfirmasiBayar');
        if (button) {
            button.disabled = true;
            button.textContent = 'Memproses pembayaran demo...';
        }
        try {
            let pending = (transaction.pembayaran || []).find((item) => item.status === 'menunggu');
            if (!pending) {
                const selected = $('.payment-method-btn.active')?.dataset.method || 'bca';
                const created = await API.createPayment(transId, { metode: selected });
                pending = created.data;
            }
            const confirmed = await API.confirmDemoPayment(pending.pembayaran_id);
            const payment = confirmed.data;
            const original = readTransaction() || transaction;
            // mock-confirm may return only a short transaction summary. Merge it into the full booking record.
            transaction = { ...original, ...(payment.transaksi || {}) };
            transaction.status = payment.transaksi?.status || (payment.status === 'berhasil' ? 'lunas' : original.status);
            transaction.pembayaran = [payment];
            saveTransaction(transaction);
            fillPaymentPage(transaction);
            const modal = $('#modalPembayaranBerhasil');
            if (modal)
                modal.classList.add('active');
        }
        catch (error) {
            showError(error);
        }
        finally {
            if (button) {
                const isPaid = transaction.status === 'lunas' || (transaction.pembayaran || []).some((p) => p.status === 'berhasil');
                button.disabled = isPaid;
                button.textContent = isPaid ? 'Pembayaran Sudah Lunas' : 'Konfirmasi Pembayaran (Demo Lokal)';
            }
        }
    }
    async function loadHistory() {
        const list = $('.history-items-list');
        if (!list)
            return;
        list.setAttribute('aria-busy', 'true');
        if (!API.isLoggedIn()) {
            sessionStorage.setItem(KEYS.afterLogin, 'riwayat.html');
            window.location.href = 'login.html';
            return;
        }
        if (!['pelanggan', 'user'].includes(currentUser()?.role)) {
            window.location.replace(dashboardPathForRole(currentUser()));
            return;
        }
        try {
            const result = await API.bookingHistory(1);
            const rows = result.data || [];
            if (!rows.length) {
                list.setAttribute('aria-busy', 'false');
                list.innerHTML = '<div class="history-row-item"><div class="history-item-info"><h4>Belum ada transaksi</h4><p>Booking lapangan atau sewa peralatan akan muncul di sini.</p></div><div class="history-empty-actions"><a href="lapangan.html" class="btn-rent-again">Cari Lapangan</a><a href="peralatan.html" class="btn-rent-again">Cari Peralatan</a></div></div>';
                return;
            }
            list.innerHTML = rows.map((item) => {
                const booking = item.booking_lapangan;
                const rentals = item.sewa_peralatan || [];
                const title = booking?.lapangan?.nama || rentals.map((r) => r.peralatan?.nama).filter(Boolean).join(', ') || 'Transaksi SIBORA';
                const details = booking
                    ? `${booking.lapangan?.lokasi || '-'} · ${datePretty(booking.tanggal)} · ${timePretty(booking.jam_mulai)}–${timePretty(booking.jam_selesai)}`
                    : rentals.map((r) => `${r.jumlah} × ${r.peralatan?.nama || 'Peralatan'}`).join(', ');
                const status = String(item.status || '-').replaceAll('_', ' ');
                const cancelButton = !['batal', 'kedaluwarsa'].includes(item.status)
                    ? `<button type="button" class="btn-rent-again" data-action="history-cancel" data-transaction-id="${esc(item.transaksi_id)}">Batalkan</button>` : '';
                const payButton = item.status === 'menunggu_pembayaran'
                    ? `<button type="button" class="btn-rent-again" data-action="history-pay" data-transaction-id="${esc(item.transaksi_id)}">Bayar</button>` : '';
                const refund = item.pembatalan ? `<p style="margin-top:6px;font-size:12px;color:#8a4d16">Refund: ${esc(item.pembatalan.status_refund)} · ${money(item.pembatalan.jumlah_refund)}</p>` : '';
                return `<div class="history-row-item">
          <div class="history-item-left"><div class="history-item-icon">${booking ? '🏟️' : '🎾'}</div><div class="history-item-info"><h4>${esc(title)}</h4><p>${esc(details)}</p><p style="margin-top:6px;font-size:12px">Kode: <strong>${esc(item.kode_booking || '-')}</strong></p><p style="margin-top:4px;font-size:12px">Status: <strong style="text-transform:capitalize">${esc(status)}</strong></p>${refund}</div></div>
          <div class="history-item-right"><div class="history-price-col"><span>Total Tagihan</span><strong>${money(item.total_bayar)}</strong></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${payButton}${cancelButton}<button type="button" class="btn-rent-again btn-print-history" data-action="history-print" data-transaction-id="${esc(item.transaksi_id)}">Cetak Struk</button></div></div>
        </div>`;
            }).join('');
            list.setAttribute('aria-busy', 'false');
        }
        catch (error) {
            list.setAttribute('aria-busy', 'false');
            list.innerHTML = `<div class="mvp-error-block">Riwayat belum dapat dimuat: ${esc(error.message)}<div style="margin-top:12px"><button type="button" class="btn-rent-again" data-action="history-reload">Coba lagi</button></div></div>`;
        }
    }
    async function cancelHistoryTransaction(id) {
        const reason = window.prompt('Masukkan alasan pembatalan (minimal 5 karakter):', 'Ada perubahan jadwal');
        if (reason === null)
            return;
        if (reason.trim().length < 5)
            return window.alert('Alasan minimal 5 karakter.');
        try {
            const result = await API.cancelTransaction(id, reason.trim());
            window.alert(result.message || 'Transaksi berhasil dibatalkan.');
            await loadHistory();
        }
        catch (error) {
            showError(error);
        }
    }
    async function openTransactionForPayment(id) {
        try {
            const result = await API.transaction(id);
            const transaction = result.data || result;
            saveTransaction(transaction);
            const destination = isEquipmentTransaction(transaction) ? 'peralatan.html' : 'booking.html';
            sessionStorage.setItem(KEYS.paymentReturnPage, destination);
            sessionStorage.setItem(KEYS.paymentFlow, destination === 'peralatan.html' ? 'equipment' : 'venue');
            window.location.href = 'pembayaran.html';
        } catch (error) {
            showError(error);
        }
    }
    async function initDashboard() {
        if (!$('.dashboard-layout'))
            return;
        if (!API.isLoggedIn()) {
            sessionStorage.setItem(KEYS.afterLogin, 'dashboard.html');
            window.location.href = 'login.html';
            return;
        }
        // Jangan pernah menampilkan dashboard pelanggan untuk role Admin/Pengelola,
        // termasuk saat URL dashboard.html dibuka langsung atau dari cache lama.
        const user = currentUser();
        if (user.role === 'admin' || user.role === 'pengelola') {
            window.location.replace(dashboardPathForRole(user));
            return;
        }
        try {
            const result = await API.profile();
            const user = result.data || currentUser();
            sessionStorage.setItem('sibora_api_user', JSON.stringify(user));
            const profile = user.profile || {};
            const displayName = profile.nama_lengkap || user.username || 'Pengguna';
            const headings = $$('.dashboard-topbar h1');
            if (headings[0])
                headings[0].textContent = `Selamat datang, ${displayName}`;
            const textNames = $$('.user-text-right h4');
            textNames.forEach((node) => node.textContent = displayName);
            const roleNode = $('.user-text-right p');
            if (roleNode)
                roleNode.textContent = roleName(user.role);
            const profileName = $('.profile-name-area h3');
            if (profileName)
                profileName.textContent = displayName;
            const profileEmail = $('.profile-name-area p');
            if (profileEmail)
                profileEmail.textContent = user.email || '';
            const profileInputs = $$('.profile-fields-grid .profile-field-input');
            const values = [profile.nama_lengkap || displayName, profile.nickname || user.username || '', profile.gender || '', profile.negara || 'Indonesia', profile.bahasa || 'Indonesia', profile.zona_waktu || 'Asia/Makassar'];
            profileInputs.forEach((input, index) => { if (values[index] !== undefined)
                input.value = values[index]; });
            const bigAvatar = $('.user-big-avatar');
            if (bigAvatar)
                bigAvatar.title = `${displayName} · ${roleName(user.role)}`;
        }
        catch (error) {
            showError(error);
        }
    }
    async function beginEquipmentRental() {
        if (!API.isLoggedIn()) {
            sessionStorage.setItem(KEYS.afterLogin, 'peralatan.html');
            window.alert('Login terlebih dahulu untuk menyewa peralatan.');
            window.location.href = 'login.html';
            return;
        }
        if (!isCustomerAccount()) {
            denyBookingForNonCustomer();
            return;
        }

        let selected = null;
        try {
            selected = JSON.parse(sessionStorage.getItem(KEYS.selectedEquipment) || 'null');
        } catch (_) {
            selected = null;
        }

        if (!selected?.peralatan_id) {
            window.alert('Pilih peralatan terlebih dahulu, lalu tekan tombol +Sewa.');
            return;
        }

        const date = $('#rentDate')?.value || '';
        const rawTime = $('#rentStartTime')?.value || '';
        const rawDuration = $('#rentDuration')?.value || '';
        const duration = Number(rawDuration);
        const quantity = Math.max(1, Number($('#rentQty')?.textContent || 1));

        if (!date) {
            window.alert('Pilih tanggal sewa terlebih dahulu.');
            $('#rentDate')?.focus();
            return;
        }
        if (date < todayIso()) {
            window.alert('Tanggal sewa tidak boleh sebelum hari ini.');
            $('#rentDate')?.focus();
            return;
        }
        if (!rawTime) {
            window.alert('Pilih waktu mulai terlebih dahulu.');
            $('#rentStartTime')?.focus();
            return;
        }
        if (!Number.isInteger(duration) || duration < 1) {
            window.alert('Pilih durasi sewa setelah memilih waktu mulai.');
            $('#rentDuration')?.focus();
            return;
        }

        const time = rawTime.replace('.', ':').slice(0, 5);
        const startHour = Number(time.slice(0, 2));
        if (!Number.isFinite(startHour) || startHour + duration > 22) {
            window.alert('Durasi melewati batas waktu operasional. Pilih waktu atau durasi lain.');
            return;
        }

        const submitButton = $('#btnSubmitEquipmentRental') || $('#modalSewaPeralatan a[href="pembayaran.html"]');
        if (submitButton) {
            submitButton.dataset.originalText = submitButton.textContent;
            submitButton.textContent = 'Memproses penyewaan...';
            submitButton.style.pointerEvents = 'none';
            submitButton.setAttribute('aria-disabled', 'true');
        }

        const user = currentUser();
        const profile = currentProfile();
        if (user.role !== 'pelanggan') {
            denyBookingForNonCustomer();
            if (submitButton) {
                submitButton.textContent = submitButton.dataset.originalText || 'Lanjut ke Pembayaran';
                submitButton.style.pointerEvents = '';
                submitButton.removeAttribute('aria-disabled');
            }
            return;
        }
        let phone = profile.no_hp || '';
        if (!phone) {
            phone = window.prompt('Masukkan nomor HP/WhatsApp untuk booking:', '08');
        }
        if (!phone || phone.trim().length < 6) {
            window.alert('Nomor HP diperlukan untuk melanjutkan.');
            if (submitButton) {
                submitButton.textContent = submitButton.dataset.originalText || 'Lanjut ke Pembayaran';
                submitButton.style.pointerEvents = '';
                submitButton.removeAttribute('aria-disabled');
            }
            return;
        }

        let email = user.email || profile.email || '';
        if (!email) email = window.prompt('Masukkan email untuk bukti penyewaan:', '');
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            window.alert('Email yang valid diperlukan untuk membuat penyewaan.');
            if (submitButton) {
                submitButton.textContent = submitButton.dataset.originalText || 'Lanjut ke Pembayaran';
                submitButton.style.pointerEvents = '';
                submitButton.removeAttribute('aria-disabled');
            }
            return;
        }
        const body = {
            tanggal_sewa: date,
            waktu_mulai: time,
            durasi_jam: duration,
            items: [{ peralatan_id: Number(selected.peralatan_id), jumlah: quantity }],
            nama_penyewa: profile.nama_lengkap || user.username || 'Pengguna',
            no_hp_penyewa: phone.trim(),
            email_penyewa: email.trim(),
        };

        try {
            const result = await API.rentEquipment(body);
            const transaction = result.data || result;
            saveTransaction(transaction);
            sessionStorage.setItem(KEYS.paymentReturnPage, 'peralatan.html');
            sessionStorage.setItem(KEYS.paymentFlow, 'equipment');
            $('#modalSewaPeralatan')?.classList.remove('active');
            window.location.href = 'pembayaran.html';
        } catch (error) {
            showError(error);
            if (submitButton) {
                submitButton.textContent = submitButton.dataset.originalText || 'Lanjut ke Pembayaran';
                submitButton.style.pointerEvents = '';
                submitButton.removeAttribute('aria-disabled');
            }
        }
    }
    async function handleClickCapture(event) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target)
            return;
        // Tangani tautan dashboard lama sebelum skrip lain sempat mengarahkannya
        // ke dashboard pelanggan.
        const dashboardLink = target.closest('a[href]');
        if (dashboardLink && isCustomerDashboardPath(dashboardLink.getAttribute('href'))) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!API.isLoggedIn()) {
                sessionStorage.setItem(KEYS.afterLogin, 'dashboard.html');
                window.location.href = 'login.html';
                return;
            }
            window.location.href = dashboardPathForRole(currentUser());
            return;
        }
        const logoutLink = target.closest('[data-nav-action="logout"], #btnSidebarLogout, a[href="login.html"].nav-pill');
        const logoutIntent = logoutLink && (
            logoutLink.dataset.navAction === 'logout' ||
            logoutLink.id === 'btnSidebarLogout' ||
            /log\s*out/i.test(logoutLink.textContent || '')
        );
        if (logoutIntent && API.isLoggedIn()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (!window.confirm('Yakin ingin keluar dari akun SIBORA?')) return;
            API.logout().finally(() => {
                ['sibora_logged_in', 'sibora_username', 'sibora_role'].forEach(key => sessionStorage.removeItem(key));
                window.location.href = 'login.html';
            });
            return;
        }
        const avatar = target.closest('.nav-avatar');
        if (avatar && API.isLoggedIn()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.location.href = dashboardPathForRole(currentUser());
            return;
        }
        const venueButton = target.closest('.btn-trigger-booking');
        if (venueButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (isLoggedInNonCustomer()) {
                denyBookingForNonCustomer();
                return;
            }
            const card = venueButton.closest('[data-lapangan-id]');
            const id = venueButton.dataset.venueId || card?.dataset.lapanganId;
            if (id)
                setVenueId(id);
            if (API.isLoggedIn()) {
                window.location.href = 'booking.html';
            }
            else {
                sessionStorage.setItem(KEYS.afterLogin, 'booking.html');
                const modal = $('#bookingLoginModal');
                if (modal)
                    modal.classList.add('active');
                else {
                    window.alert('Login terlebih dahulu untuk melakukan booking.');
                    window.location.href = 'login.html';
                }
            }
            return;
        }
        const scheduleCard = target.closest('.venue-mini-card[data-venue-id]');
        if (scheduleCard) {
            event.preventDefault();
            event.stopImmediatePropagation();
            setVenueId(scheduleCard.dataset.venueId);
            $$('.venue-mini-card').forEach((card) => card.classList.toggle('active', card === scheduleCard));
            const dateInput = $('#apiScheduleDate');
            if (dateInput)
                dateInput.dispatchEvent(new Event('change'));
            return;
        }
        const schedulePick = target.closest('[data-action="schedule-book"]');
        if (schedulePick) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (isLoggedInNonCustomer()) {
                denyBookingForNonCustomer();
                return;
            }
            setVenueId(schedulePick.dataset.venueId);
            sessionStorage.setItem(KEYS.selectedDate, schedulePick.dataset.date);
            sessionStorage.setItem(KEYS.selectedTime, schedulePick.dataset.time);
            if (!API.isLoggedIn()) {
                sessionStorage.setItem(KEYS.afterLogin, 'booking.html');
                const modal = $('#bookingLoginModal');
                if (modal) {
                    modal.classList.add('active');
                    return;
                }
                window.location.href = 'login.html';
                return;
            }
            window.location.href = 'booking.html';
            return;
        }
        // Kategori peralatan diperiksa lebih dahulu kerana pill peralatan juga
        // memakai class category-filter-pill untuk menyamakan tampilannya dengan lapangan.
        const equipCategory = target.closest('.peralatan-pill');
        if (equipCategory) {
            event.preventDefault();
            event.stopImmediatePropagation();
            $$('.peralatan-pill').forEach((item) => item.classList.toggle('active', item === equipCategory));
            filterEquipments();
            return;
        }
        const category = target.closest('.category-filter-pill');
        if (category) {
            event.preventDefault();
            event.stopImmediatePropagation();
            $$('.category-filter-pill:not(.peralatan-pill)').forEach((item) => item.classList.toggle('active', item === category));
            filterVenues();
            return;
        }
        if (target.closest('#btnSearchLapangan')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            filterVenues();
            return;
        }
        if (target.closest('#btnResetSearch')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if ($('#searchLapanganInput'))
                $('#searchLapanganInput').value = '';
            $$('.category-filter-pill:not(.peralatan-pill)').forEach((item) => item.classList.toggle('active', item.dataset.category === 'all'));
            filterVenues();
            return;
        }
        if (target.closest('#btnSearchPeralatan')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            filterEquipments();
            return;
        }
        if (target.closest('#btnResetSearchPeralatan')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if ($('#searchPeralatanInput'))
                $('#searchPeralatanInput').value = '';
            $$('.peralatan-pill').forEach((item) => item.classList.toggle('active', item.dataset.category === 'all'));
            filterEquipments();
            return;
        }
        const slotButton = target.closest('.time-slot-grid .btn-slot-time');
        if (slotButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (slotButton.disabled || slotButton.classList.contains('disabled'))
                return;
            selectedStart = slotButton.dataset.time || slotButton.textContent.trim().replace('.', ':');
            renderBookingSlots();
            updateBookingSummary();
            return;
        }
        const continueBooking = target.closest('a.btn-confirm-booking-next[href="pembayaran.html"]');
        if (continueBooking && $('#bookingDate')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            submitVenueBooking();
            return;
        }
        const methodButton = target.closest('.payment-method-btn');
        if (methodButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            $$('.payment-method-btn').forEach((item) => item.classList.toggle('active', item === methodButton));
            return;
        }
        if (target.closest('#btnKonfirmasiBayar')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            processPayment();
            return;
        }
        const equipmentButton = target.closest('.btn-rent-equipment');
        if (equipmentButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (isLoggedInNonCustomer()) {
                denyBookingForNonCustomer();
                return;
            }

            const card = equipmentButton.closest('[data-peralatan-id]');
            const id = equipmentButton.dataset.equipmentId || card?.dataset.peralatanId;
            if (!id) {
                window.alert('Data peralatan tidak ditemukan. Muat ulang halaman lalu coba lagi.');
                return;
            }

            const name = $('.equipment-title', card)?.textContent.trim() || 'Peralatan';
            const priceText = $('.equipment-price', card)?.textContent || 'Rp 0';
            const price = Number(priceText.replace(/[^0-9]/g, '')) || 0;
            const spec = $('.equipment-spec', card)?.textContent.trim() || '';

            sessionStorage.setItem(KEYS.selectedEquipment, JSON.stringify({
                peralatan_id: Number(id),
                nama: name,
                harga_per_jam: price,
                spesifikasi: spec,
            }));
            sessionStorage.setItem(KEYS.paymentReturnPage, 'peralatan.html');
            sessionStorage.setItem(KEYS.paymentFlow, 'equipment');

            if (!API.isLoggedIn()) {
                sessionStorage.setItem(KEYS.afterLogin, 'peralatan.html');
                sessionStorage.setItem(KEYS.resumeEquipmentRental, '1');
                window.alert('Silakan login terlebih dahulu. Pilihan peralatan akan tetap tersimpan.');
                window.location.href = 'login.html';
                return;
            }

            if (typeof window.openRentModal === 'function') {
                window.openRentModal(name, price, spec);
            } else {
                showError(new Error('Form penyewaan belum siap. Muat ulang halaman Peralatan.'));
            }
            return;
        }
        const rentToPayment = target.closest('#modalSewaPeralatan a[href="pembayaran.html"]');
        if (rentToPayment) {
            event.preventDefault();
            event.stopImmediatePropagation();
            beginEquipmentRental();
            return;
        }
        const cancelButton = target.closest('[data-action="history-cancel"]');
        if (cancelButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            cancelHistoryTransaction(cancelButton.dataset.transactionId);
            return;
        }
        const payButton = target.closest('[data-action="history-pay"]');
        if (payButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            openTransactionForPayment(payButton.dataset.transactionId);
            return;
        }
        const retryHistory = target.closest('[data-action="history-reload"]');
        if (retryHistory) {
            event.preventDefault();
            event.stopImmediatePropagation();
            await loadHistory();
            return;
        }
        const printHistory = target.closest('[data-action="history-print"]');
        if (printHistory) {
            event.preventDefault();
            event.stopImmediatePropagation();
            // Open the print window in the click gesture, before awaiting the API, to avoid popup blockers.
            const printWindow = window.open('', '_blank', 'width=520,height=760');
            if (!printWindow) {
                window.alert('Popup diblokir browser. Izinkan popup untuk mencetak struk, lalu coba lagi.');
                return;
            }
            printWindow.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Menyiapkan struk</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#184e37">Menyiapkan struk pembayaran…</body></html>');
            try {
                const result = await API.transaction(printHistory.dataset.transactionId);
                printReceipt(result.data, 'Struk Pembayaran SIBORA', printWindow);
            }
            catch (error) {
                printWindow.close();
                showError(error);
            }
            return;
        }
        if (target.closest('#btnPrintPaymentReceipt') || target.closest('#btnPrintPaymentReceiptPage')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            printReceipt(readTransaction());
            return;
        }
    }
    function handleSubmitCapture(event) {
        const form = event.target;
        if (!(form instanceof HTMLFormElement))
            return;
        if (form.id === 'loginForm' || form.id === 'modalLoginForm') {
            event.preventDefault();
            event.stopImmediatePropagation();
            loginFromForm(form);
            return;
        }
        if (form.id === 'registerForm') {
            event.preventDefault();
            event.stopImmediatePropagation();
            registerFromForm(form);
            return;
        }
    }
    function handleKeyCapture(event) {
        if (event.target?.id === 'searchLapanganInput' && (event.type === 'input' || event.key === 'Enter'))
            filterVenues();
        if (event.target?.id === 'searchPeralatanInput' && (event.type === 'input' || event.key === 'Enter'))
            filterEquipments();
    }
    function syncNavAndRole() {
        const user = currentUser();
        const logged = API.isLoggedIn() && !!user;
        const role = logged ? user.role : 'guest';
        const page = normalizedPage(window.location.pathname);
        const dashboardHref = dashboardPathForRole(user);
        const navLinks = [
            { href: 'lapangan.html', label: 'Lapangan' },
            { href: 'peralatan.html', label: 'Peralatan' },
            { href: 'jadwal.html', label: 'Cek Jadwal' },
        ];

        if (role === 'admin' || role === 'pengelola') {
            navLinks.push({ href: dashboardHref, label: 'Dashboard' });
            navLinks.push({ href: '#logout', label: 'Logout', action: 'logout' });
        } else if (role === 'pelanggan' || role === 'user') {
            navLinks.push({ href: 'favorit.html', label: 'Favorit' });
            navLinks.push({ href: 'dashboard.html', label: 'Dashboard' });
            navLinks.push({ href: '#logout', label: 'Logout', action: 'logout' });
        } else {
            navLinks.push({ href: 'login.html', label: 'Login', action: 'login' });
        }

        $$('.sibora-navbar .nav-group').forEach((navGroup) => {
            navGroup.innerHTML = navLinks.map((item) => {
                const active = item.href === page ||
                    (item.label === 'Dashboard' && item.href === page) ||
                    (item.label === 'Login' && page === 'login.html');
                const action = item.action ? ` data-nav-action="${item.action}"` : '';
                const href = item.href.startsWith('#') ? item.href : item.href;
                return `<a href="${href}" class="nav-pill${active ? ' active' : ''}"${action}>${item.label}</a>`;
            }).join('');
        });

        // Legacy links are also redirected by role if found outside the public navbar.
        if (logged) {
            $$('a[href]').forEach((link) => {
                if (isCustomerDashboardPath(link.getAttribute('href'))) {
                    link.setAttribute('href', dashboardHref);
                }
            });
        }
    }
    document.addEventListener('submit', handleSubmitCapture, true);
    document.addEventListener('click', handleClickCapture, true);
    document.addEventListener('input', handleKeyCapture, true);
    document.addEventListener('keyup', handleKeyCapture, true);
    document.addEventListener('DOMContentLoaded', async () => {
        syncNavAndRole();
        applyBookingRoleRestrictions();
        const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (page === 'lapangan.html')
            await loadVenues();
        if (page === 'peralatan.html') {
            await loadEquipments();
            resumeEquipmentRentalAfterLogin();
        }
        if (page === 'jadwal.html')
            await initSchedulePage();
        if (page === 'booking.html')
            await initBookingPage();
        if (page === 'pembayaran.html')
            await initPaymentPage();
        if (page === 'riwayat.html')
            await loadHistory();
        if (page === 'dashboard.html')
            await initDashboard();
        if (page === 'peralatan.html')
            setTodayMinimum($('#rentDate'));
    });
})();
