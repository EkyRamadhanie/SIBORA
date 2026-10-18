/* SIBORA MVP UI enhancement: real Laravel data, practical demo actions, responsive dashboard. */
(() => {
  'use strict';
  const API = window.SiboraApi;
  if (!API) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v || 0));
  const compactMoney = (v) => { const n=Number(v||0); if(n>=1_000_000_000)return `Rp ${(n/1_000_000_000).toLocaleString('id-ID',{maximumFractionDigits:1})} M`; if(n>=1_000_000)return `Rp ${(n/1_000_000).toLocaleString('id-ID',{maximumFractionDigits:1})} jt`; if(n>=1_000)return `Rp ${(n/1_000).toLocaleString('id-ID',{maximumFractionDigits:0})} rb`; return money(n); };
  const num = (v) => new Intl.NumberFormat('id-ID').format(Number(v || 0));
  const pageName = () => (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const userNow = () => API.currentUser() || {};
  const profileNow = () => userNow().profile || {};
  const dashboardPathForRole = (user = userNow()) => {
    if (user?.role === 'admin') return 'admin-manajemen.html';
    if (user?.role === 'pengelola') return 'pengelola-dashboard.html';
    return 'dashboard.html';
  };
  const roleLabel = (r) => ({admin:'Administrator', pengelola:'Pengelola', pelanggan:'Pelanggan', user:'Pelanggan'}[r] || r || 'Pengguna');
  const statusLabel = (s) => ({lunas:'Lunas', dp:'Dibayar sebagian', menunggu_pembayaran:'Menunggu pembayaran', menunggu:'Menunggu', berhasil:'Berhasil', batal:'Dibatalkan', kedaluwarsa:'Kedaluwarsa', gagal:'Gagal', aktif:'Aktif', nonaktif:'Nonaktif'}[String(s || '').toLowerCase()] || s || '—');
  const statusClass = (s) => ({lunas:'success', dp:'info', berhasil:'success', aktif:'success', menunggu:'warning', menunggu_pembayaran:'warning', batal:'danger', kedaluwarsa:'muted', gagal:'danger', nonaktif:'muted'}[String(s || '').toLowerCase()] || 'muted');
  const dateText = (v) => {
    if (!v) return '—';
    const raw = String(v);
    const date = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw);
    if (Number.isNaN(date.getTime())) return raw.slice(0,10);
    return new Intl.DateTimeFormat('id-ID', { day:'2-digit', month:'short', year:'numeric', timeZone:'Asia/Makassar' }).format(date);
  };
  const dateInputToday = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  let toastTimer;
  function toast(message, type='success') {
    let el = $('#mvpToast');
    if (!el) { el = document.createElement('div'); el.id='mvpToast'; el.className='mvp-toast'; document.body.appendChild(el); }
    el.textContent = message; el.className = `mvp-toast is-${type} is-visible`;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3600);
  }
  function errorToast(error) { toast(error?.message || 'Terjadi kesalahan. Coba lagi.', 'error'); }
  function emptyState(title, desc='Belum ada data untuk ditampilkan.') { return `<div class="mvp-empty"><span class="mvp-empty-icon">✦</span><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>`; }
  function statusPill(status) { return `<span class="mvp-status is-${statusClass(status)}">${esc(statusLabel(status))}</span>`; }
  function readNested(row) { return row?.booking_lapangan?.lapangan?.nama || row?.sewa_peralatan?.map(x => x.peralatan?.nama).filter(Boolean).join(', ') || 'Sewa fasilitas'; }
  function txnDate(row) { return dateText(row?.created_at || row?.tanggal || row?.booking_lapangan?.tanggal); }
  function txnAmount(row) { return row?.total_bayar ?? row?.jumlah ?? 0; }
  function txnRows(rows, options={}) {
    if (!rows?.length) return `<tr><td colspan="${options.manager ? 6 : 5}">${esc(options.empty || 'Belum ada transaksi.')}</td></tr>`;
    return rows.map(row => `<tr>
      <td><strong>${esc(row.kode_booking || `TRX-${row.transaksi_id}`)}</strong><small class="mvp-cell-sub">${esc(txnDate(row))}</small></td>
      <td>${esc(row.nama_penyewa || row.user?.username || 'Pelanggan')}<small class="mvp-cell-sub">${esc(row.email_penyewa || '')}</small></td>
      <td>${esc(readNested(row))}</td>
      <td class="mvp-number">${money(txnAmount(row))}</td>
      <td>${statusPill(row.status)}</td>
      ${options.manager ? `<td><button class="mvp-btn mvp-btn-small mvp-btn-secondary" data-action="txn-detail" data-id="${esc(row.transaksi_id)}">Detail</button></td>` : ''}
    </tr>`).join('');
  }
  function updateUserCache(user) { if (user) sessionStorage.setItem('sibora_api_user', JSON.stringify(user)); }
  function navActive(current) {
    $$('.dashboard-sidebar .sidebar-link').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      a.classList.toggle('active', href === current);
    });
    const user = userNow();
    $$('.user-text-right h4, .mvp-user-name').forEach(n => n.textContent = user.profile?.nama_lengkap || user.username || 'Pengguna');
    $$('.user-text-right p, .mvp-user-role').forEach(n => n.textContent = roleLabel(user.role));
  }
  function topHeader(title, subtitle='Ringkasan dari data SIBORA') {
    const u = userNow();
    const name = u.profile?.nama_lengkap || u.username || 'Pengguna';
    const dashboardUrl = dashboardPathForRole(u);
    return `<header class="mvp-page-header"><div><div class="mvp-eyebrow">SIBORA · WORKSPACE</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="mvp-profile-chip"><div class="mvp-avatar">${esc((name.trim()[0] || 'S').toUpperCase())}</div><div><strong>${esc(name)}</strong><span>${esc(roleLabel(u.role))}</span></div><a href="${dashboardUrl}" class="mvp-icon-link" title="Buka dashboard akun" aria-label="Buka dashboard akun">↗</a></div></header>`;
  }
  function renderShell(title, subtitle, content) {
    const main = $('.dashboard-main-content');
    if (!main) return null;
    main.classList.add('mvp-main');
    main.innerHTML = `${topHeader(title, subtitle)}<div class="mvp-page-body">${content}</div>`;
    navActive(pageName());
    return main;
  }
  function shellLoading(title, subtitle) { return renderShell(title, subtitle, '<div class="mvp-loading"><span class="mvp-spinner"></span> Mengambil data dari server…</div>'); }
  function requireRole(roles) {
    if (!API.isLoggedIn()) { sessionStorage.setItem('sibora_after_login', pageName()); location.href='login.html'; return false; }
    const role = userNow().role;
    if (!roles.includes(role)) {
      toast('Akun ini tidak memiliki akses ke halaman tersebut.', 'error');
      location.href = role === 'admin' ? 'admin-manajemen.html' : role === 'pengelola' ? 'pengelola-dashboard.html' : 'dashboard.html';
      return false;
    }
    return true;
  }
  function openModal(title, description, body, submitLabel='Simpan', onSubmit=null) {
    $('#mvpModal')?.remove();
    const wrap = document.createElement('div'); wrap.className='mvp-modal-backdrop'; wrap.id='mvpModal';
    wrap.innerHTML = `<section class="mvp-modal" role="dialog" aria-modal="true"><header class="mvp-modal-head"><div><span class="mvp-eyebrow">SIBORA</span><h2>${esc(title)}</h2><p>${esc(description || '')}</p></div><button class="mvp-modal-close" type="button" data-modal-close aria-label="Tutup">×</button></header><form id="mvpModalForm"><div class="mvp-modal-body">${body}</div><footer class="mvp-modal-foot"><button class="mvp-btn mvp-btn-secondary" type="button" data-modal-close>Batal</button><button class="mvp-btn mvp-btn-primary" type="submit">${esc(submitLabel)}</button></footer></form></section>`;
    document.body.appendChild(wrap);
    const photoInput = $('input[type="file"][name="foto_file"]', wrap);
    photoInput?.addEventListener('change', () => {
      const file = photoInput.files?.[0];
      const preview = $('[data-photo-preview]', wrap);
      if (!preview) return;
      if (!file) {
        preview.hidden = true;
        preview.removeAttribute('src');
        return;
      }
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
        photoInput.value = '';
        toast('Pilih gambar JPG, PNG, atau WebP maksimal 5 MB.', 'error');
        preview.hidden = true;
        preview.removeAttribute('src');
        return;
      }
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
    $$('[data-modal-close]', wrap).forEach(b => b.addEventListener('click', () => wrap.remove()));
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    $('#mvpModalForm', wrap).addEventListener('submit', async e => {
      e.preventDefault();
      const submit = $('button[type="submit"]', e.currentTarget); const old = submit.textContent;
      submit.disabled = true; submit.textContent='Memproses…';
      try { if (onSubmit) await onSubmit(new FormData(e.currentTarget), e.currentTarget); wrap.remove(); }
      catch (error) { errorToast(error); submit.disabled=false; submit.textContent=old; }
    });
    const first = $('input:not([type=hidden]), select, textarea', wrap); first?.focus();
  }
  function field(label, name, value='', type='text', attrs='') {
    return `<label class="mvp-field"><span>${esc(label)}</span><input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${attrs}></label>`;
  }
  function selectField(label, name, options, selected='') {
    return `<label class="mvp-field"><span>${esc(label)}</span><select name="${esc(name)}">${options.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(selected)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`;
  }
  function photoUploadField(label, currentPhoto='') {
    const preview = currentPhoto
      ? `<div class="mvp-photo-preview-wrap"><img class="mvp-photo-preview" data-photo-preview src="${esc(currentPhoto)}" alt="Foto saat ini" onerror="this.hidden=true"><small>Foto saat ini. Pilih file baru untuk menggantinya.</small></div>`
      : `<div class="mvp-photo-preview-wrap"><img class="mvp-photo-preview" data-photo-preview alt="Pratinjau foto" hidden></div>`;
    return `<div class="mvp-field mvp-field-wide"><label class="mvp-photo-upload-label"><span>${esc(label)}</span><input type="file" name="foto_file" accept="image/jpeg,image/png,image/webp"></label><small>Unggah JPG, PNG, atau WebP maksimal 5 MB. Tidak perlu memasukkan URL/path.</small>${preview}</div>`;
  }
  function pageTools(items='') { return `<div class="mvp-toolbar">${items}</div>`; }
  function statCard(label, value, hint, icon='✦') { return `<article class="mvp-stat-card"><div class="mvp-stat-top"><span>${esc(label)}</span><span class="mvp-stat-icon">${esc(icon)}</span></div><strong>${esc(value)}</strong><small>${esc(hint || '')}</small></article>`; }
  function tableWrap(headers, body, id='') { return `<div class="mvp-table-wrap"><table class="mvp-table" ${id?`id="${esc(id)}"`:''}><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`; }
  function paginationHtml(current=1,last=1) { return `<div class="mvp-pagination"><span>Halaman ${current} dari ${last}</span><div><button type="button" class="mvp-btn mvp-btn-secondary" data-page="${Math.max(1,current-1)}" ${current<=1?'disabled':''}>Sebelumnya</button><button type="button" class="mvp-btn mvp-btn-secondary" data-page="${Math.min(last,current+1)}" ${current>=last?'disabled':''}>Berikutnya</button></div></div>`; }
  function downloadCsv(filename, rows) {
    if (!rows?.length) return toast('Tidak ada data untuk diekspor.', 'error');
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8;'}));
    const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
  }
  function monthName(key) {
    const [year, month] = String(key).split('-').map(Number);
    return new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(year || 2026, (month || 1)-1, 15));
  }
  function normalizeMonthly(data, year) {
    const map = new Map((data || []).map(x => [String(x.bulan), x]));
    return Array.from({length:12}, (_,i) => {
      const key = `${year}-${String(i+1).padStart(2,'0')}`;
      const row = map.get(key) || {};
      return {bulan:key, label:monthName(key), pendapatan:Number(row.pendapatan || 0), jumlah_transaksi:Number(row.jumlah_transaksi || 0)};
    });
  }
  function barChart(monthly, title='Pendapatan per Bulan') {
    const max = Math.max(1, ...monthly.map(x => x.pendapatan));
    const hasData = monthly.some(x => x.pendapatan > 0);
    if (!hasData) return `<section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>${esc(title)}</h2><p>Nilai berasal dari transaksi yang dikonfirmasi backend.</p></div></div>${emptyState('Belum ada pendapatan terkonfirmasi','Grafik akan terisi ketika ada transaksi berstatus dibayar dan belum dibatalkan.')}</section>`;
    return `<section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>${esc(title)}</h2><p>Pendapatan terkonfirmasi per bulan · sumber API Laravel</p></div><span class="mvp-legend"><i></i> Pendapatan</span></div><div class="mvp-chart-scroll"><div class="mvp-bar-chart">${monthly.map(x=>`<div class="mvp-bar-col" title="${esc(x.label)}: ${esc(money(x.pendapatan))}"><span class="mvp-bar-value">${x.pendapatan ? esc(compactMoney(x.pendapatan)) : ''}</span><div class="mvp-bar-track"><div class="mvp-bar" style="height:${Math.max(x.pendapatan?3:0, x.pendapatan/max*100)}%"></div></div><span class="mvp-bar-label">${esc(x.label)}</span></div>`).join('')}</div></div></section>`;
  }

  // CUSTOMER PROFILE + EMAIL MANAGEMENT
  async function initCustomerDashboard() {
    if (!requireRole(['pelanggan','admin','pengelola'])) return;
    shellLoading('Profil Saya','Kelola data akun, informasi profil, dan alamat email.');
    try {
      const [response, historyResult] = await Promise.all([
        API.profile(),
        API.bookingHistory(1).then(value => ({ ok: true, value })).catch(error => ({ ok: false, error })),
      ]);
      const user = response.data || response; updateUserCache(user);
      const p = user.profile || {};
      const history = historyResult.ok ? historyResult.value : { data: [], total: 0 };
      const transactions = Array.isArray(history.data) ? history.data : [];
      const emails = user.emails || [];
      renderShell('Profil Saya','Informasi akun yang tersimpan di database SIBORA.', `
        <div class="mvp-stat-grid">${statCard('Total transaksi', num(history.total ?? transactions.length),'Riwayat booking akun ini','▤')}${statCard('Email terdaftar', num(emails.length || 1),'Email utama dan email tambahan','✉')}${statCard('Peran akun', roleLabel(user.role),'Hak akses aktif','◈')}</div>
        <section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Informasi pribadi</h2><p>Perubahan di sini disimpan ke backend, bukan hanya di browser.</p></div><span class="mvp-status is-success">Tersinkron</span></div>
          <form id="mvpProfileForm" class="mvp-form-grid">
            ${field('Nama lengkap','nama_lengkap',p.nama_lengkap || '')}${field('Username','username',user.username || '','text','required minlength="3" maxlength="60"')}${field('Nickname','nickname',p.nickname || '')}${field('Nomor HP','no_hp',p.no_hp || '','tel')}${field('Jenis kelamin','gender',p.gender || '')}${field('Negara','negara',p.negara || 'Indonesia')}${field('Bahasa','bahasa',p.bahasa || 'Indonesia')}${field('Zona waktu','zona_waktu',p.zona_waktu || 'Asia/Makassar (WITA)')}
            <div class="mvp-form-actions"><button class="mvp-btn mvp-btn-primary" type="submit">Simpan perubahan</button></div>
          </form></section>
        <section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Alamat email</h2><p>Email utama tidak bisa dihapus dari halaman ini. Email tambahan bisa dikelola.</p></div><button class="mvp-btn mvp-btn-primary" type="button" data-action="email-add">+ Tambah email</button></div>
          <div class="mvp-email-list">${(emails.length?emails:[{email:user.email,is_primary:true}]).map(email=>`<div class="mvp-email-row"><div class="mvp-email-icon">✉</div><div class="mvp-email-content"><strong>${esc(email.email)}</strong><span>${email.is_primary?'Email utama':'Email tambahan'}</span></div>${email.is_primary?'<span class="mvp-status is-success">Utama</span>':`<button class="mvp-btn mvp-btn-danger mvp-btn-small" data-action="email-delete" data-id="${esc(email.email_id)}">Hapus</button>`}</div>`).join('')}</div>
        </section>
      `);
    } catch (e) { renderShell('Profil Saya','Tidak dapat memuat profil.', `<div class="mvp-error-block">${esc(e.message)}</div><button class="mvp-btn mvp-btn-primary" data-action="retry-profile">Coba lagi</button>`); }
  }
  async function saveProfile(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    Object.keys(data).forEach(k=>{ if (data[k] === '') data[k] = null; });
    const result = await API.updateProfile(data);
    updateUserCache(result.data || result);
    toast(result.message || 'Profil berhasil diperbarui.');
    await initCustomerDashboard();
  }
  function addEmailModal() {
    openModal('Tambah alamat email','Email tambahan akan terhubung ke akun kamu.',`${field('Alamat email','email','','email','required autocomplete="email"')}`,'Tambah email',async form=>{
      const response = await API.addEmail(String(form.get('email')||'').trim());
      toast(response.message || 'Email tambahan berhasil disimpan.'); await initCustomerDashboard();
    });
  }

  function initMobileSidebar() {
    $$('.dashboard-sidebar').forEach(sidebar => {
      if ($('.sidebar-mobile-toggle', sidebar)) return;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'sidebar-mobile-toggle';
      toggle.setAttribute('aria-label', 'Buka menu navigasi');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<span></span><span></span><span></span>';
      const brand = $('.brand-logo', sidebar);
      if (brand) brand.insertAdjacentElement('afterend', toggle);
      else sidebar.prepend(toggle);
      toggle.addEventListener('click', () => {
        const opened = sidebar.classList.toggle('mobile-menu-open');
        toggle.setAttribute('aria-expanded', String(opened));
        toggle.setAttribute('aria-label', opened ? 'Tutup menu navigasi' : 'Buka menu navigasi');
      });
      $$('.sidebar-link', sidebar).forEach(link => link.addEventListener('click', () => {
        sidebar.classList.remove('mobile-menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      }));
    });
  }

  // MANAGER / ADMIN REVENUE DASHBOARD
  async function loadRevenuePage(isAdmin) {
    const roles = isAdmin ? ['admin'] : ['pengelola']; if (!requireRole(roles)) return;
    const title = 'Laporan Pendapatan';
    shellLoading(title,'Laporan dinamis berdasarkan transaksi yang terlihat oleh akun ini.');
    const reportQuery = new URLSearchParams(location.search);
    const start = reportQuery.get('dari'); const end = reportQuery.get('sampai');
    const year = Number(reportQuery.get('tahun')) || Number((start || end || '').slice(0,4)) || new Date().getFullYear();
    const managerId = reportQuery.get('pengelola_user_id') || '';
    const params = {};
    if(start) params.dari=start; if(end) params.sampai=end; if(!start && !end) params.tahun=year;
    if(isAdmin && managerId) params.pengelola_user_id=managerId;
    try {
      const [managerResult, report] = await Promise.all([
        isAdmin ? API.adminUsers({role:'pengelola', page:1}) : Promise.resolve({data:[]}),
        API.revenueReport(params),
      ]);
      const managers = [...(managerResult.data || [])];
      if (isAdmin && Number(managerResult.last_page || 1) > 1) {
        const remainingPages = Array.from({length:Number(managerResult.last_page)-1}, (_, index) => index + 2);
        const pageResults = await Promise.all(remainingPages.map(page => API.adminUsers({role:'pengelola', page})));
        pageResults.forEach(result => managers.push(...(result.data || [])));
      }
      const summary = report.summary || {};
      const monthly = normalizeMonthly(report.pendapatan_bulanan, year);
      const venues = report.performa_lapangan || [];
      const managerOptions = managers.map(u => ({value:String(u.user_id),label:(u.pengelola?.nama_perusahaan || u.profile?.nama_lengkap || u.username)}));
      const managerFilter = isAdmin ? selectField('Pantau pengelola','pengelola_user_id',[{value:'',label:'Semua pengelola'},...managerOptions],managerId) : '';
      const rangeControls = `<form id="mvpReportFilter" class="mvp-filter-form">${managerFilter}${selectField('Tahun','tahun',Array.from({length:5},(_,i)=>({value:new Date().getFullYear()-i,label:String(new Date().getFullYear()-i)})),year)}${field('Dari tanggal','dari',start || '', 'date')}${field('Sampai tanggal','sampai',end || '', 'date')}<button class="mvp-btn mvp-btn-primary" type="submit">Terapkan</button><button class="mvp-btn mvp-btn-secondary" type="button" data-action="report-reset">Reset</button><button class="mvp-btn mvp-btn-secondary" type="button" data-action="export-monthly">Ekspor CSV</button><button class="mvp-btn mvp-btn-secondary" type="button" data-action="report-print">Cetak / PDF</button></form>`;
      const selectedManager = managers.find(u => String(u.user_id) === String(managerId));
      const reportSubtitle = isAdmin ? `Pantauan pendapatan pengelola${selectedManager ? `: ${selectedManager.pengelola?.nama_perusahaan || selectedManager.profile?.nama_lengkap || selectedManager.username}` : ': semua pengelola'}.` : 'Angka dan visualisasi bersumber dari endpoint /reports/revenue.';
      const equipmentRows = report.pendapatan_peralatan || [];
      renderShell(title,reportSubtitle, `${rangeControls}
        <div class="mvp-stat-grid">${statCard('Pendapatan terkonfirmasi',money(summary.total_pendapatan_terkonfirmasi),'Dari pembayaran berstatus berhasil','↗')}${statCard('Subtotal sewa peralatan',money(summary.total_pendapatan_peralatan),'Nilai sewa peralatan pada transaksi berbayar','🎾')}${statCard('Total transaksi',num(summary.jumlah_transaksi),'Transaksi pada periode ini','▤')}${statCard('Pembatalan',num(summary.jumlah_pembatalan),'Transaksi dibatalkan','↶')}</div>
        ${barChart(monthly,`Pendapatan Bulanan ${year}`)}
        <section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Pendapatan dari peralatan</h2><p>Subtotal sewa peralatan pada transaksi berbayar.</p></div></div>
        ${equipmentRows.length ? tableWrap(['Peralatan','Jumlah transaksi sewa','Unit disewa','Subtotal sewa'],equipmentRows.map(e=>`<tr><td><strong>${esc(e.nama)}</strong></td><td>${num(e.jumlah_sewa)}</td><td>${num(e.unit_disewa)}</td><td class="mvp-number">${money(e.pendapatan_subtotal)}</td></tr>`).join('')) : emptyState('Belum ada pendapatan peralatan','Pendapatan peralatan akan muncul setelah transaksi sewanya berstatus DP atau lunas.')}</section>
        <section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Performa lapangan</h2><p>Rekap subtotal booking berbayar dari backend.</p></div><button class="mvp-btn mvp-btn-secondary" data-action="export-venues" type="button">Ekspor CSV</button></div>
        ${venues.length ? tableWrap(['Lapangan','Status','Booking berbayar','Pendapatan subtotal'],venues.map(v=>`<tr><td><strong>${esc(v.nama)}</strong><small class="mvp-cell-sub">ID ${esc(v.lapangan_id)}</small></td><td>${statusPill(v.status)}</td><td>${num(v.total_booking_berbayar)}</td><td class="mvp-number">${money(v.pendapatan_subtotal)}</td></tr>`).join('')) : emptyState('Belum ada performa lapangan','Belum terdapat data lapangan pada periode ini.')}</section>
        <div class="mvp-note">Catatan: jumlah pendapatan dihitung backend dari pembayaran terkonfirmasi pada transaksi berstatus DP/lunas. Pembayaran demo tidak memproses transfer uang sungguhan.</div>
      `);
      window.SiboraMvpState = { report, year, venues };
    } catch(e) { renderShell(title,'Laporan tidak dapat dimuat.',`<div class="mvp-error-block">${esc(e.message)}</div><button class="mvp-btn mvp-btn-primary" data-action="retry-revenue">Coba lagi</button>`); }
  }

  // MANAGER DASHBOARD + BOOKINGS
  async function loadManagerDashboard() {
    if (!requireRole(['pengelola'])) return;
    shellLoading('Dashboard Pengelola','Pantau transaksi, fasilitas, dan pendapatan usaha.');
    try {
      const [rep, tx, v] = await Promise.all([API.revenueReport({tahun:new Date().getFullYear()}), API.managementTransactions({page:1}), API.managementVenues({})]);
      const summary = rep.summary || {}; const venues = v.data || []; const rows = (tx.data || []).slice(0,6);
      const active = venues.filter(x=>x.status==='aktif').length;
      renderShell('Dashboard Pengelola','Ringkasan ini dihitung dari data milik akun pengelola yang sedang login.', `
        <div class="mvp-stat-grid">${statCard('Total transaksi',num(summary.jumlah_transaksi),'Transaksi fasilitas kamu','▤')}${statCard('Pendapatan terkonfirmasi',money(summary.total_pendapatan_terkonfirmasi),'Pembayaran yang diakui backend','↗')}${statCard('Pendapatan peralatan',money(summary.total_pendapatan_peralatan),'Subtotal sewa alat pada transaksi berbayar','🎾')}${statCard('Lapangan aktif',`${active} / ${venues.length}`,'Status katalog lapangan','⚽')}${statCard('Menunggu pembayaran',num(summary.jumlah_menunggu_pembayaran),'Perlu dipantau','◷')}</div>
        ${barChart(normalizeMonthly(rep.pendapatan_bulanan,new Date().getFullYear()),'Pendapatan Bulanan')}
        <section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Transaksi terbaru</h2><p>Transaksi terbaru yang dapat dilihat akun pengelola ini.</p></div><a class="mvp-btn mvp-btn-secondary" href="pengelola-booking.html">Lihat semua</a></div>${tableWrap(['Kode / tanggal','Pelanggan','Fasilitas','Total','Status'],txnRows(rows,{empty:'Belum ada transaksi.'}))}</section>
        <section class="mvp-quick-grid"><a href="pengelola-lapangan.html" class="mvp-quick-card"><span>⚽</span><strong>Kelola lapangan</strong><small>Tambah, edit, dan nonaktifkan lapangan.</small><b>→</b></a><a href="pengelola-peralatan.html" class="mvp-quick-card"><span>🏸</span><strong>Kelola peralatan</strong><small>Atur stok dan harga sewa peralatan.</small><b>→</b></a><a href="pengelola-pendapatan.html" class="mvp-quick-card"><span>▥</span><strong>Laporan pendapatan</strong><small>Lihat grafik dan rekap transaksi.</small><b>→</b></a></section>
      `);
    } catch(e) { renderShell('Dashboard Pengelola','Data tidak dapat dimuat.',`<div class="mvp-error-block">${esc(e.message)}</div>`); }
  }
  let managerTxPage = 1;
  async function loadManagerTransactions(page=1) {
    if (!requireRole(['pengelola','admin'])) return;
    managerTxPage = page;
    const isAdmin = userNow().role === 'admin';
    shellLoading('Transaksi Booking','Pantau semua permintaan booking yang berada dalam cakupan akun kamu.');
    const search = $('#mvpBookingSearch')?.value || new URLSearchParams(location.search).get('search') || '';
    const status = $('#mvpBookingStatus')?.value || new URLSearchParams(location.search).get('status') || '';
    try {
      const data = await API.managementTransactions({page,search,status});
      const rows = data.data || [];
      const form = `<div class="mvp-filter-bar"><label class="mvp-search"><span>⌕</span><input id="mvpBookingSearch" placeholder="Cari kode booking atau nama pelanggan" value="${esc(search)}"></label><select id="mvpBookingStatus" aria-label="Filter status"><option value="">Semua status</option>${['menunggu_pembayaran','dp','lunas','batal','kedaluwarsa'].map(s=>`<option value="${s}" ${status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select><button class="mvp-btn mvp-btn-primary" data-action="booking-filter" type="button">Terapkan filter</button><button class="mvp-btn mvp-btn-secondary" data-action="booking-reset" type="button">Reset</button></div>`;
      renderShell('Transaksi Booking','Data transaksi langsung dari API pengelolaan. Akses otomatis dibatasi oleh backend.',`${form}<section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Daftar transaksi</h2><p>${num(data.total || rows.length)} transaksi ditemukan</p></div><button class="mvp-btn mvp-btn-secondary" data-action="export-transactions" type="button">Ekspor CSV</button></div>${rows.length?tableWrap(['Kode / tanggal','Pelanggan','Fasilitas','Total','Status','Aksi'],txnRows(rows,{manager:true})) : emptyState('Belum ada transaksi','Transaksi baru akan muncul setelah pelanggan melakukan booking.')}${paginationHtml(data.current_page || 1,data.last_page || 1)}</section>`);
      window.SiboraMvpState = {...window.SiboraMvpState, transactions: rows, transactionPagination: data};
    } catch(e) { renderShell('Transaksi Booking','Data transaksi tidak dapat dimuat.',`<div class="mvp-error-block">${esc(e.message)}</div>`); }
  }
  async function showTransactionDetail(id) {
    try {
      const resp = await API.transaction(id); const t = resp.data || resp;
      const bp = t.booking_lapangan; const payment = (t.pembayaran || [])[0]; const cancel = t.pembatalan;
      openModal(`Detail ${t.kode_booking || `TRX-${id}`}`,'Rincian transaksi dari database.', `<div class="mvp-detail-grid">
        <div><span>Status transaksi</span><strong>${esc(statusLabel(t.status))}</strong></div><div><span>Total</span><strong>${money(t.total_bayar)}</strong></div>
        <div><span>Nama pelanggan</span><strong>${esc(t.nama_penyewa || '—')}</strong></div><div><span>Email</span><strong>${esc(t.email_penyewa || '—')}</strong></div>
        <div><span>Fasilitas</span><strong>${esc(readNested(t))}</strong></div><div><span>Tanggal booking</span><strong>${esc(bp ? dateText(bp.tanggal) : '—')}</strong></div>
        <div><span>Jam</span><strong>${esc(bp ? `${String(bp.jam_mulai).slice(0,5)}–${String(bp.jam_selesai).slice(0,5)}` : '—')}</strong></div><div><span>Status pembayaran</span><strong>${esc(statusLabel(payment?.status || '—'))}</strong></div>
        <div><span>Ref gateway</span><strong>${esc(payment?.ref_gateway || 'Belum tersedia')}</strong></div><div><span>Status refund</span><strong>${esc(cancel?.status_refund ? statusLabel(cancel.status_refund) : '—')}</strong></div>
        <div class="mvp-detail-wide"><span>Catatan</span><strong>${esc(t.catatan || 'Tidak ada catatan')}</strong></div>
      </div>`, 'Tutup', async()=>{});
      const submit = $('#mvpModalForm button[type=submit]'); if (submit) submit.style.display='none';
    } catch(e) { errorToast(e); }
  }

  // CATALOG CRUD
  let catalogsCache = null;
  async function catalogs() { if (!catalogsCache) catalogsCache = await API.managementCatalogs(); return catalogsCache; }
  function multiSports(cats, picked=[]) {
    const selected = new Set((picked || []).map(x=>String(x.jenis_olahraga_id || x.id || x)));
    return (cats.jenis_olahraga || []).map(s=>`<label class="mvp-check-option"><input type="checkbox" name="sports" value="${esc(s.jenis_olahraga_id)}" ${selected.has(String(s.jenis_olahraga_id))?'checked':''}><span>${esc(s.nama)}</span></label>`).join('') || '<small>Kategori olahraga belum tersedia.</small>';
  }
  async function loadManagerVenues(page=1) {
    if (!requireRole(['pengelola','admin'])) return;
    shellLoading('Kelola Lapangan','Data lapangan dari database; perubahan akan langsung diterapkan ke katalog.');
    try {
      const [result, cat] = await Promise.all([API.managementVenues({page}), catalogs()]); catalogsCache=cat;
      const venues=result.data || [];
      const status=venues.map(v=>`<tr><td><div class="mvp-table-primary">${esc(v.nama)}</div><small class="mvp-cell-sub">${esc(v.lokasi || 'Lokasi belum diatur')}</small></td><td>${(v.sports||[]).map(s=>esc(s.nama)).join(', ') || '—'}</td><td>${money(v.harga_per_jam)}<small class="mvp-cell-sub">per jam</small></td><td>${esc(v.jam_buka||'—')}–${esc(v.jam_tutup||'—')}</td><td>${statusPill(v.status)}</td><td class="mvp-actions"><button class="mvp-btn mvp-btn-small mvp-btn-secondary" data-action="venue-edit" data-id="${esc(v.lapangan_id)}">Edit</button><button class="mvp-btn mvp-btn-small mvp-btn-danger" data-action="venue-delete" data-id="${esc(v.lapangan_id)}" data-name="${esc(v.nama)}" ${v.status==='nonaktif'?'disabled':''}>Nonaktifkan</button></td></tr>`).join('');
      renderShell('Kelola Lapangan','Kelola nama, lokasi, harga, jam operasional, status, dan fasilitas.',`${pageTools(`<span class="mvp-data-count">${num(result.total ?? venues.length)} lapangan terdaftar</span><button class="mvp-btn mvp-btn-primary" data-action="venue-create">+ Tambah lapangan</button>`)}
        <section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Daftar lapangan</h2><p>Akun Pengelola hanya dapat mengubah lapangannya sendiri.</p></div><button class="mvp-btn mvp-btn-secondary" data-action="refresh-venues">Muat ulang</button></div>${venues.length?tableWrap(['Lapangan','Olahraga','Tarif','Jam operasional','Status','Aksi'],status):emptyState('Belum ada lapangan','Tambahkan lapangan pertama untuk menampilkannya ke pelanggan.')}${paginationHtml(result.current_page || 1,result.last_page || 1)}</section>`);
      window.SiboraMvpState = {...window.SiboraMvpState, venues, venuePagination: result};
    } catch(e) { renderShell('Kelola Lapangan','Tidak dapat memuat data lapangan.',`<div class="mvp-error-block">${esc(e.message)}</div>`); }
  }
  function venueFormHtml(v, cat) {
    const isAdmin=userNow().role==='admin';
    const managers = cat.pengelola || [];
    return `<div class="mvp-form-grid">
      ${field('Nama lapangan','nama',v?.nama||'','text','required maxlength="150"')}${field('Lokasi','lokasi',v?.lokasi||'','text','required maxlength="255"')}
      ${field('Harga per jam (Rp)','harga_per_jam',v?.harga_per_jam||'','number','required min="0" step="1000"')}${field('Jam buka','jam_buka',String(v?.jam_buka||'08:00').slice(0,5),'time','required')}${field('Jam tutup','jam_tutup',String(v?.jam_tutup||'21:00').slice(0,5),'time','required')}${photoUploadField('Foto lapangan',v?.foto||'')}
      ${selectField('Status','status',[{value:'aktif',label:'Aktif'},{value:'nonaktif',label:'Nonaktif'}],v?.status||'aktif')}
      ${isAdmin ? selectField('Pemilik/Pengelola','pengelola_id',managers.map(m=>({value:m.pengelola_id,label:`${m.nama_perusahaan} · ${m.user?.username||''}`})),v?.pengelola_id||managers[0]?.pengelola_id||'') : ''}
      <div class="mvp-field mvp-field-wide"><span>Jenis olahraga</span><div class="mvp-check-grid">${multiSports(cat,v?.sports||[])}</div></div>
      ${field('Fasilitas (pisahkan dengan koma)','facilities_text',(v?.facilities||[]).map(x=>x.nama_fasilitas||x.nama||x).join(', '),'text')}
    </div>`;
  }
  async function openVenueForm(id=null) {
    try {
      const cat = await catalogs(); const venues = window.SiboraMvpState?.venues || [];
      let venue = venues.find(v=>String(v.lapangan_id)===String(id)) || null;
      if (id && !venue) { const r=await API.managementVenues({}); venue=(r.data||[]).find(v=>String(v.lapangan_id)===String(id))||null; }
      openModal(venue?'Edit lapangan':'Tambah lapangan', 'Pastikan jam tutup setelah jam buka dan harga sesuai.', venueFormHtml(venue,cat), venue?'Simpan perubahan':'Tambah lapangan', async form=>{
        const get=n=>String(form.get(n)||'').trim();
        const data={nama:get('nama'),lokasi:get('lokasi'),harga_per_jam:Number(get('harga_per_jam')),jam_buka:get('jam_buka'),jam_tutup:get('jam_tutup'),status:get('status'),sports:form.getAll('sports').map(Number),facilities:get('facilities_text').split(',').map(x=>x.trim()).filter(Boolean)};
        if(userNow().role==='admin') data.pengelola_id=Number(get('pengelola_id'));
        const photo=form.get('foto_file'); const hasPhoto=typeof File !== 'undefined' && photo instanceof File && photo.size>0;
        const result = venue
          ? (hasPhoto ? await API.updateManagementVenueWithPhoto(venue.lapangan_id,data,photo) : await API.updateManagementVenue(venue.lapangan_id,data))
          : (hasPhoto ? await API.createManagementVenueWithPhoto(data,photo) : await API.createManagementVenue(data));
        toast(result.message || 'Data lapangan tersimpan.'); catalogsCache=null; await loadManagerVenues();
      });
    } catch(e) { errorToast(e); }
  }
  async function deactivateVenue(id,name) {
    if(!confirm(`Nonaktifkan lapangan "${name}"? Data histori tidak akan dihapus.`)) return;
    try { const r=await API.deleteManagementVenue(id); toast(r.message||'Lapangan dinonaktifkan.'); await loadManagerVenues(); }
    catch(e){errorToast(e);}
  }

  async function loadManagerEquipments(page=1) {
    if (!requireRole(['pengelola','admin'])) return;
    shellLoading('Kelola Peralatan','Atur stok, kategori, harga sewa, dan status peralatan.');
    try {
      const [result,cat]=await Promise.all([API.managementEquipments({page}),catalogs()]); catalogsCache=cat;
      const items=result.data||[];
      const rows=items.map(e=>`<tr><td><div class="mvp-table-item">${e.foto?`<img class="mvp-table-thumb" src="${esc(e.foto)}" alt="" onerror="this.hidden=true">`:''}<div><div class="mvp-table-primary">${esc(e.nama)}</div><small class="mvp-cell-sub">${esc(e.spesifikasi||'Tanpa spesifikasi')}</small></div></div></td><td>${esc(e.kategori?.nama||e.kategori_id||'—')}</td><td>${num(e.stok)}</td><td>${money(e.harga_per_jam)}<small class="mvp-cell-sub">per jam / unit</small></td><td>${statusPill(e.status)}</td><td class="mvp-actions"><button class="mvp-btn mvp-btn-small mvp-btn-secondary" data-action="equipment-edit" data-id="${esc(e.peralatan_id)}">Edit</button><button class="mvp-btn mvp-btn-small mvp-btn-danger" data-action="equipment-delete" data-id="${esc(e.peralatan_id)}" data-name="${esc(e.nama)}" ${e.status==='nonaktif'?'disabled':''}>Nonaktifkan</button></td></tr>`).join('');
      renderShell('Kelola Peralatan','Perubahan tersimpan melalui endpoint management Laravel.',`${pageTools(`<span class="mvp-data-count">${num(result.total ?? items.length)} peralatan</span><button class="mvp-btn mvp-btn-primary" data-action="equipment-create">+ Tambah peralatan</button>`)}<section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Inventaris peralatan</h2><p>Barang yang dinonaktifkan tidak dihapus dari riwayat.</p></div><button class="mvp-btn mvp-btn-secondary" data-action="refresh-equipments">Muat ulang</button></div>${items.length?tableWrap(['Nama / spesifikasi','Kategori','Stok','Harga sewa','Status','Aksi'],rows):emptyState('Belum ada peralatan','Tambahkan item inventaris supaya pelanggan dapat menyewanya.')}${paginationHtml(result.current_page||1,result.last_page||1)}</section>`);
      window.SiboraMvpState={...window.SiboraMvpState,equipments:items,equipmentPagination:result};
    } catch(e){renderShell('Kelola Peralatan','Tidak dapat memuat inventaris.',`<div class="mvp-error-block">${esc(e.message)}</div>`);}
  }
  function equipmentFormHtml(item,cat) {
    const isAdmin=userNow().role==='admin'; const managers=cat.pengelola||[]; const categories=cat.kategori_peralatan||[];
    return `<div class="mvp-form-grid">${field('Nama peralatan','nama',item?.nama||'','text','required maxlength="150"')}${selectField('Kategori','kategori_id',categories.map(x=>({value:x.kategori_id,label:x.nama})),item?.kategori_id||categories[0]?.kategori_id||'')}${field('Spesifikasi','spesifikasi',item?.spesifikasi||'','text')}${field('Harga per jam (Rp)','harga_per_jam',item?.harga_per_jam||'','number','required min="0" step="1000"')}${field('Stok','stok',item?.stok ?? 1,'number','required min="0" step="1"')}${photoUploadField('Foto peralatan',item?.foto||'')}${selectField('Status','status',[{value:'aktif',label:'Aktif'},{value:'nonaktif',label:'Nonaktif'}],item?.status||'aktif')}${isAdmin?selectField('Pemilik/Pengelola','pengelola_id',managers.map(m=>({value:m.pengelola_id,label:m.nama_perusahaan})),item?.pengelola_id||managers[0]?.pengelola_id||''):''}</div>`;
  }
  async function openEquipmentForm(id=null) {
    try {
      const cat=await catalogs(); const rows=window.SiboraMvpState?.equipments||[]; const item=rows.find(x=>String(x.peralatan_id)===String(id))||null;
      openModal(item?'Edit peralatan':'Tambah peralatan','Isi harga sewa per jam dan stok tersedia.',equipmentFormHtml(item,cat),item?'Simpan perubahan':'Tambah peralatan',async form=>{
        const get=n=>String(form.get(n)||'').trim(); const data={kategori_id:Number(get('kategori_id')),nama:get('nama'),spesifikasi:get('spesifikasi')||null,harga_per_jam:Number(get('harga_per_jam')),stok:Number(get('stok')),status:get('status')};
        if(userNow().role==='admin')data.pengelola_id=Number(get('pengelola_id'));
        const photo=form.get('foto_file'); const hasPhoto=typeof File !== 'undefined' && photo instanceof File && photo.size>0;
        const r=item
          ? (hasPhoto ? await API.updateManagementEquipmentWithPhoto(item.peralatan_id,data,photo) : await API.updateManagementEquipment(item.peralatan_id,data))
          : (hasPhoto ? await API.createManagementEquipmentWithPhoto(data,photo) : await API.createManagementEquipment(data));
        toast(r.message||'Peralatan tersimpan.'); catalogsCache=null; await loadManagerEquipments();
      });
    } catch(e){errorToast(e);}
  }
  async function deactivateEquipment(id,name) {
    if(!confirm(`Nonaktifkan peralatan "${name}"? Riwayat sewa tetap disimpan.`)) return;
    try {const r=await API.deleteManagementEquipment(id);toast(r.message||'Peralatan dinonaktifkan.');await loadManagerEquipments();}catch(e){errorToast(e);}
  }

  // ADMIN USER DIRECTORY
  let adminUserPage=1;
  async function loadAdminUsers(page=1) {
    if(!requireRole(['admin'])) return; adminUserPage=page;
    shellLoading('Manajemen Akun','Kelola pelanggan, pengelola, serta akun administrator.');
    const params=new URLSearchParams(location.search); const search=params.get('search')||''; const role=params.get('role')||'';
    try {
      const [result,pelanggan,pengelola,admin]=await Promise.all([API.adminUsers({page,search,role}),API.adminUsers({role:'pelanggan'}),API.adminUsers({role:'pengelola'}),API.adminUsers({role:'admin'})]);
      const rows=result.data||[];
      const body=rows.map(u=>`<tr><td><div class="mvp-table-primary">${esc(u.profile?.nama_lengkap||u.username)}</div><small class="mvp-cell-sub">@${esc(u.username)} · ${esc(u.email)}</small></td><td><span class="mvp-role-badge is-${esc(u.role)}">${esc(roleLabel(u.role))}</span></td><td>${esc(u.pengelola?.nama_perusahaan||'—')}</td><td>${statusPill(u.status_akun)}</td><td class="mvp-actions"><button class="mvp-btn mvp-btn-small mvp-btn-secondary" data-action="admin-user-edit" data-id="${esc(u.user_id)}">Edit</button><button class="mvp-btn mvp-btn-small mvp-btn-secondary" data-action="admin-user-reset" data-id="${esc(u.user_id)}" data-username="${esc(u.username)}" ${Number(u.user_id)===Number(userNow().user_id)?'disabled':''}>Reset sandi</button><button class="mvp-btn mvp-btn-small mvp-btn-danger" data-action="admin-user-disable" data-id="${esc(u.user_id)}" data-username="${esc(u.username)}" ${u.status_akun==='nonaktif'||Number(u.user_id)===Number(userNow().user_id)?'disabled':''}>Nonaktifkan</button></td></tr>`).join('');
      renderShell('Manajemen Akun','Data akun aktual dari database. Tindakan nonaktifkan tidak menghapus histori transaksi.',`${pageTools(`<button class="mvp-btn mvp-btn-primary" data-action="admin-user-create">+ Buat akun</button><button class="mvp-btn mvp-btn-secondary" data-action="admin-user-refresh">Muat ulang</button><button class="mvp-btn mvp-btn-secondary" data-action="admin-user-print">Cetak / PDF</button>`)}
        <div class="mvp-stat-grid">${statCard('Total akun',num(result.total||0),'Semua peran','◈')}${statCard('Pelanggan',num(pelanggan.total||0),'Akun pengguna layanan','♙')}${statCard('Pengelola',num(pengelola.total||0),'Akun pemilik fasilitas','⚽')}${statCard('Admin',num(admin.total||0),'Administrator sistem','⚙')}</div>
        <section class="mvp-panel"><div class="mvp-panel-heading"><div><h2>Direktori akun</h2><p>${num(result.total||0)} akun terdaftar · maks 20 per halaman</p></div></div>
          <form id="mvpAdminUserFilter" class="mvp-filter-bar"><label class="mvp-search"><span>⌕</span><input name="search" placeholder="Cari nama, username, atau email" value="${esc(search)}"></label><select name="role"><option value="">Semua peran</option>${[['pelanggan','Pelanggan'],['pengelola','Pengelola'],['admin','Admin']].map(([v,l])=>`<option value="${v}" ${role===v?'selected':''}>${l}</option>`).join('')}</select><button class="mvp-btn mvp-btn-primary" type="submit">Cari</button><button class="mvp-btn mvp-btn-secondary" type="button" data-action="admin-user-filter-reset">Reset</button></form>
          ${rows.length?tableWrap(['Nama / email','Peran','Perusahaan','Status','Aksi'],body):emptyState('Akun tidak ditemukan','Ubah filter pencarian atau buat akun baru.')}${paginationHtml(result.current_page||1,result.last_page||1)}</section>`);
      window.SiboraMvpState={...window.SiboraMvpState,adminUsers:rows,adminUserPagination:result};
    }catch(e){renderShell('Manajemen Akun','Tidak dapat memuat data akun.',`<div class="mvp-error-block">${esc(e.message)}</div>`);}
  }
  function adminUserFormHtml(u) {
    const isEdit=Boolean(u);
    return `<div class="mvp-form-grid">${field('Nama lengkap','nama_lengkap',u?.profile?.nama_lengkap||'','text','required maxlength="120"')}${field('Username','username',u?.username||'','text','required minlength="3" maxlength="60"')}${field('Email','email',u?.email||'','email','required')}${field('Nomor HP','no_hp',u?.profile?.no_hp||u?.pengelola?.no_hp||'','tel')}${selectField('Peran','role',[{value:'pelanggan',label:'Pelanggan'},{value:'pengelola',label:'Pengelola'},{value:'admin',label:'Admin'}],u?.role||'pelanggan')}${selectField('Status akun','status_akun',[{value:'aktif',label:'Aktif'},{value:'nonaktif',label:'Nonaktif'}],u?.status_akun||'aktif')}
      <div class="mvp-field mvp-field-wide"><span>Nama perusahaan (wajib untuk Pengelola)</span><input name="nama_perusahaan" value="${esc(u?.pengelola?.nama_perusahaan||'')}" maxlength="150" placeholder="Contoh: Borneo Sport Center"></div>
      ${isEdit?'':`${field('Password awal','password','','password','required minlength="8" autocomplete="new-password"')}${field('Konfirmasi password','password_confirmation','','password','required minlength="8" autocomplete="new-password"')}`}</div>`;
  }
  async function openAdminUserForm(id=null) {
    const users=window.SiboraMvpState?.adminUsers||[]; const u=users.find(x=>String(x.user_id)===String(id))||null;
    openModal(u?'Edit akun':'Buat akun baru',u?'Perbarui identitas, peran, atau status akun.':'Akun akan langsung disimpan di database SIBORA.',adminUserFormHtml(u),u?'Simpan perubahan':'Buat akun',async form=>{
      const get=n=>String(form.get(n)||'').trim(); const role=get('role');
      const data={username:get('username'),email:get('email'),role,status_akun:get('status_akun'),nama_lengkap:get('nama_lengkap'),no_hp:get('no_hp')||null};
      if(role==='pengelola') data.nama_perusahaan=get('nama_perusahaan');
      if(!u){data.password=get('password');data.password_confirmation=get('password_confirmation');}
      const r=u?await API.updateAdminUser(u.user_id,data):await API.createAdminUser(data);
      toast(r.message||'Akun tersimpan.'); await loadAdminUsers(adminUserPage);
    });
  }
  function resetAdminPassword(id,username) {
    openModal('Reset password',`Tetapkan password baru untuk @${username}. Token lama akun ini akan dicabut.`,`${field('Password baru','password','','password','required minlength="8" autocomplete="new-password"')}${field('Konfirmasi password baru','password_confirmation','','password','required minlength="8" autocomplete="new-password"')}`,'Reset password',async form=>{
      const data={password:String(form.get('password')||''),password_confirmation:String(form.get('password_confirmation')||'')};
      const r=await API.resetAdminPassword(id,data);toast(r.message||'Password direset.');
    });
  }
  async function disableAdminUser(id,username) {
    if(!confirm(`Nonaktifkan akun @${username}? Akun tidak dapat login, tetapi histori tetap ada.`))return;
    try{const r=await API.deleteAdminUser(id);toast(r.message||'Akun dinonaktifkan.');await loadAdminUsers(adminUserPage);}catch(e){errorToast(e);}
  }

  // CUSTOMER FAVORITES
  function addFavoriteButton(card) {
    if(!card || $('.mvp-favorite-toggle',card))return false;
    const id=card.dataset.lapanganId || card.dataset.venueId;
    const container=$('.venue-info-body',card); if(!id||!container)return false;
    const b=document.createElement('button'); b.type='button'; b.className='mvp-favorite-toggle'; b.dataset.favoriteId=id; b.setAttribute('aria-pressed','false'); b.innerHTML='<span>♡</span> Simpan favorit';
    const booking=$('.btn-trigger-booking',container); if(booking) booking.insertAdjacentElement('beforebegin',b); else container.appendChild(b);
    return true;
  }
  async function syncFavoriteStates() {
    if(!API.isLoggedIn())return;
    try{
      const result=await API.favorites(); const ids=new Set((result.data||[]).map(x=>String(x.lapangan_id || x.lapangan?.lapangan_id)));
      $$('.mvp-favorite-toggle').forEach(b=>{const yes=ids.has(String(b.dataset.favoriteId));b.classList.toggle('is-saved',yes);b.setAttribute('aria-pressed',String(yes));b.innerHTML=`<span>${yes?'♥':'♡'}</span> ${yes?'Tersimpan':'Simpan favorit'}`;});
    }catch(_){ /* Favorit memerlukan login; katalog tetap dapat digunakan. */ }
  }
  async function toggleFavorite(btn) {
    if(!API.isLoggedIn()){sessionStorage.setItem('sibora_after_login','lapangan.html');location.href='login.html';return;}
    const id=btn.dataset.favoriteId; const saved=btn.getAttribute('aria-pressed')==='true';
    try{
      const result=saved?await API.removeFavorite(id):await API.addFavorite(id);
      btn.classList.toggle('is-saved',!saved);btn.setAttribute('aria-pressed',String(!saved));btn.innerHTML=`<span>${saved?'♡':'♥'}</span> ${saved?'Simpan favorit':'Tersimpan'}`;
      toast(result.message || (saved?'Favorit dihapus.':'Lapangan ditambahkan ke favorit.'));
    }catch(e){errorToast(e);}
  }
  async function initCustomerHistoryPage() {
    if (!requireRole(['pelanggan', 'user'])) return;
    navActive('riwayat.html');
    const user = userNow();
    const name = user.profile?.nama_lengkap || user.username || 'Pelanggan';
    const nameEl = $('.mvp-history-name');
    const roleEl = $('.mvp-history-role');
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = roleLabel(user.role);
    try {
      const response = await API.profile();
      const freshUser = response.data || response;
      updateUserCache(freshUser);
      const freshName = freshUser.profile?.nama_lengkap || freshUser.username || name;
      if (nameEl) nameEl.textContent = freshName;
      if (roleEl) roleEl.textContent = roleLabel(freshUser.role);
    } catch (_) {
      // Riwayat utama tetap dimuat melalui loadHistory() di sibora-integration.js.
      // Nama cache tetap ditampilkan bila endpoint profil sedang tidak tersedia.
    }
  }

  async function initFavoritesPage() {
    if(!requireRole(['pelanggan','pengelola','admin']))return;
    const main=$('.public-main')||$('main')||document.body;
    main.innerHTML=`<section class="mvp-public-page"><div class="mvp-public-hero"><span class="mvp-eyebrow">KOLEKSI PRIBADI</span><h1>Lapangan favorit</h1><p>Lapangan yang kamu simpan, tersimpan di akun dan database SIBORA.</p><a class="mvp-btn mvp-btn-secondary" href="lapangan.html">Jelajahi lapangan</a></div><div id="mvpFavoriteList" class="mvp-public-grid"><div class="mvp-loading"><span class="mvp-spinner"></span> Memuat favorit…</div></div></section>`;
    try{
      const result=await API.favorites(); const favs=result.data||[]; const grid=$('#mvpFavoriteList');
      grid.innerHTML=favs.length?favs.map(row=>{const v=row.lapangan||{};const id=v.lapangan_id||row.lapangan_id;return `<article class="mvp-venue-card"><img src="${esc(v.foto||'assets/images/sports_bg.jpg')}" onerror="this.src='assets/images/sports_bg.jpg'" alt="${esc(v.nama||'Lapangan')}"/><div><span class="mvp-status is-success">Favorit tersimpan</span><h2>${esc(v.nama||'Lapangan')}</h2><p>${esc(v.lokasi||'')}</p><strong>${money(v.harga_per_jam)}/jam</strong><div class="mvp-card-actions"><a class="mvp-btn mvp-btn-primary" href="lapangan.html" data-favorite-book="${esc(id)}">Lihat lapangan</a><button class="mvp-btn mvp-btn-danger" type="button" data-action="favorite-remove" data-id="${esc(id)}">Hapus favorit</button></div></div></article>`;}).join(''):emptyState('Belum ada favorit','Buka katalog lapangan, lalu tekan “Simpan favorit” pada lapangan pilihanmu.');
    }catch(e){$('#mvpFavoriteList').innerHTML=`<div class="mvp-error-block">${esc(e.message)}</div>`;}
  }

  // Delegated actions for the buttons rendered above.
  document.addEventListener('click', async event => {
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    const button=target.closest('[data-action], .mvp-favorite-toggle');if(!button)return;
    const action=button.dataset.action;
    if(button.matches('.mvp-favorite-toggle')){event.preventDefault();event.stopImmediatePropagation();await toggleFavorite(button);return;}
    const simpleActions=new Set(['email-add','email-delete','retry-profile','retry-revenue','report-reset','export-monthly','report-print','export-venues','booking-filter','booking-reset','txn-detail','refresh-venues','venue-create','venue-edit','venue-delete','refresh-equipments','equipment-create','equipment-edit','equipment-delete','admin-user-create','admin-user-edit','admin-user-reset','admin-user-disable','admin-user-refresh','admin-user-print','admin-user-filter-reset','export-transactions','favorite-remove']);
    if(!simpleActions.has(action))return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      switch(action){
        case 'email-add': addEmailModal();break;
        case 'email-delete': if(confirm('Hapus email tambahan ini dari akun?')){const r=await API.deleteEmail(button.dataset.id);toast(r.message||'Email dihapus.');await initCustomerDashboard();}break;
        case 'retry-profile': await initCustomerDashboard();break;
        case 'retry-revenue': await loadRevenuePage(userNow().role==='admin');break;
        case 'report-reset': location.href=pageName();break;
        case 'export-monthly': {const rows=window.SiboraMvpState?.report?.pendapatan_bulanan||[];downloadCsv('sibora-pendapatan-bulanan.csv',[['Bulan','Jumlah transaksi','Pendapatan'],...rows.map(x=>[x.bulan,x.jumlah_transaksi,x.pendapatan])]);break;}
        case 'report-print': window.print();break;
        case 'export-venues': {const vs=window.SiboraMvpState?.venues||[];downloadCsv('sibora-performa-lapangan.csv',[['Lapangan','Status','Booking berbayar','Pendapatan subtotal'],...(window.SiboraMvpState?.report?.performa_lapangan||[]).map(v=>[v.nama,v.status,v.total_booking_berbayar,v.pendapatan_subtotal])]);break;}
        case 'booking-filter': {const search=$('#mvpBookingSearch')?.value.trim()||'';const status=$('#mvpBookingStatus')?.value||'';const url=new URL(location.href);if(search)url.searchParams.set('search',search);else url.searchParams.delete('search');if(status)url.searchParams.set('status',status);else url.searchParams.delete('status');history.replaceState({},'',url);await loadManagerTransactions(1);break;}
        case 'booking-reset': history.replaceState({},'',pageName());await loadManagerTransactions(1);break;
        case 'txn-detail': await showTransactionDetail(button.dataset.id);break;
        case 'refresh-venues': catalogsCache=null;await loadManagerVenues();break;
        case 'venue-create': await openVenueForm();break;
        case 'venue-edit': await openVenueForm(button.dataset.id);break;
        case 'venue-delete': await deactivateVenue(button.dataset.id,button.dataset.name||'lapangan');break;
        case 'refresh-equipments': catalogsCache=null;await loadManagerEquipments();break;
        case 'equipment-create': await openEquipmentForm();break;
        case 'equipment-edit': await openEquipmentForm(button.dataset.id);break;
        case 'equipment-delete': await deactivateEquipment(button.dataset.id,button.dataset.name||'peralatan');break;
        case 'admin-user-create': await openAdminUserForm();break;
        case 'admin-user-edit': await openAdminUserForm(button.dataset.id);break;
        case 'admin-user-reset': resetAdminPassword(button.dataset.id,button.dataset.username||'user');break;
        case 'admin-user-disable': await disableAdminUser(button.dataset.id,button.dataset.username||'user');break;
        case 'admin-user-refresh': await loadAdminUsers(adminUserPage);break;
        case 'admin-user-print': window.print();break;
        case 'admin-user-filter-reset': history.replaceState({},'',pageName());await loadAdminUsers(1);break;
        case 'export-transactions': {const rows=window.SiboraMvpState?.transactions||[];downloadCsv('sibora-transaksi.csv',[['Kode booking','Tanggal','Pelanggan','Email','Fasilitas','Total','Status'],...rows.map(r=>[r.kode_booking,txnDate(r),r.nama_penyewa,r.email_penyewa,readNested(r),txnAmount(r),r.status])]);break;}
        case 'favorite-remove': {if(confirm('Hapus lapangan dari daftar favorit?')){const r=await API.removeFavorite(button.dataset.id);toast(r.message||'Favorit dihapus.');await initFavoritesPage();}break;}
      }
    }catch(e){errorToast(e);}
  },true);

  document.addEventListener('change', event => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.name === 'pengelola_user_id' && target.closest('#mvpReportFilter')) {
      // Apply the report as soon as the admin changes the selected manager.
      target.form?.requestSubmit();
    }
  }, true);

  document.addEventListener('submit', async event => {
    const form=event.target;if(!(form instanceof HTMLFormElement))return;
    if(form.id==='mvpProfileForm'){event.preventDefault();try{await saveProfile(form);}catch(e){errorToast(e);}return;}
    if(form.id==='mvpReportFilter'){
      event.preventDefault();const fd=new FormData(form);const params=new URLSearchParams(); const from=String(fd.get('dari')||'').trim(); const until=String(fd.get('sampai')||'').trim();
      if(from&&until&&until<from)return toast('Tanggal sampai tidak boleh sebelum tanggal dari.','error');
      if(from||until){if(from)params.set('dari',from);if(until)params.set('sampai',until);}else{params.set('tahun',String(fd.get('tahun')||new Date().getFullYear()));}
      const manager = String(fd.get('pengelola_user_id')||'').trim(); if(manager) params.set('pengelola_user_id',manager);
      location.href=`${pageName()}?${params.toString()}`;return;
    }
    if(form.id==='mvpAdminUserFilter'){
      event.preventDefault();const fd=new FormData(form);const params=new URLSearchParams();['search','role'].forEach(k=>{const v=String(fd.get(k)||'').trim();if(v)params.set(k,v);});history.replaceState({},'',`${pageName()}${params.toString()?`?${params}`:''}`);await loadAdminUsers(1);return;
    }
  },true);
  document.addEventListener('click', async event => {
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    const pageBtn=target.closest('[data-page]');
    if(pageBtn){event.preventDefault();event.stopImmediatePropagation();const page=Number(pageBtn.dataset.page);if(pageName()==='pengelola-booking.html')await loadManagerTransactions(page);else if(pageName()==='pengelola-lapangan.html')await loadManagerVenues(page);else if(pageName()==='pengelola-peralatan.html')await loadManagerEquipments(page);else if(pageName()==='admin-manajemen.html')await loadAdminUsers(page);}
    const favoriteBook=target.closest('[data-favorite-book]');
    if(favoriteBook){event.preventDefault();const id=favoriteBook.dataset.favoriteBook;sessionStorage.setItem('sibora_selected_venue_id',id);location.href=API.isLoggedIn()?'booking.html':'login.html';}
  },true);

  // Add favorites controls when live catalog cards arrive asynchronously.
  function observeVenueCards() {
    const grid=$('.venues-grid');if(!grid)return;
    const process=()=>{let changed=false;$$('.venue-card[data-lapangan-id]',grid).forEach(card=>{if(addFavoriteButton(card))changed=true;});if(changed)syncFavoriteStates();};
    const observer=new MutationObserver(process);observer.observe(grid,{childList:true,subtree:true});process();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const page=pageName();
    initMobileSidebar();
    // Hide obsolete Favorite links from dashboard sidebars; favorites remain reachable from customer public navigation.
    $$('.dashboard-sidebar .sidebar-link').forEach(a=>{if(/favorite|favorit/i.test(a.textContent||''))a.remove();});
    if (page === 'dashboard.html') {
      const role = userNow().role;
      if (API.isLoggedIn() && (role === 'admin' || role === 'pengelola')) {
        location.replace(dashboardPathForRole(userNow()));
        return;
      }
      await initCustomerDashboard();
    }
    if(page==='riwayat.html')await initCustomerHistoryPage();
    if(page==='favorit.html')await initFavoritesPage();
    if(page==='pengelola-dashboard.html')await loadManagerDashboard();
    if(page==='pengelola-booking.html')await loadManagerTransactions(1);
    if(page==='pengelola-lapangan.html')await loadManagerVenues();
    if(page==='pengelola-peralatan.html')await loadManagerEquipments();
    if(page==='pengelola-pendapatan.html')await loadRevenuePage(false);
    if(page==='admin-pendapatan.html')await loadRevenuePage(true);
    if(page==='admin-manajemen.html')await loadAdminUsers(1);
    if(page==='lapangan.html')observeVenueCards();
  });
})();
