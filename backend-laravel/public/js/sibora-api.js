/* SIBORA REST API client. Frontend ini ditujukan untuk disajikan dari Laravel public/. */
(function (window) {
  'use strict';

  const API_BASE = window.SIBORA_API_BASE || `${window.location.origin}/api/v1`;
  const TOKEN_KEY = 'sibora_api_token';
  const USER_KEY = 'sibora_api_user';

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');
    const hasBody = Object.prototype.hasOwnProperty.call(options, 'body');
    const isFormData = hasBody && typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (hasBody && !isFormData) headers.set('Content-Type', 'application/json');
    if (isFormData) headers.delete('Content-Type');
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        body: hasBody ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
      });
    } catch (error) {
      throw new Error(`Tidak dapat menghubungi API Laravel di ${API_BASE}. Pastikan php artisan serve sedang berjalan.`);
    }

    const raw = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      const validation = raw && raw.errors
        ? Object.values(raw.errors).flat().join(' ')
        : '';
      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      }
      throw new Error(validation || raw?.message || `Permintaan gagal (HTTP ${response.status}).`);
    }
    return raw;
  }

  function storeAuth(result) {
    if (result?.token) sessionStorage.setItem(TOKEN_KEY, result.token);
    if (result?.user) sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
    return result;
  }

  async function login(username, password) {
    return storeAuth(await request('/auth/login', { method: 'POST', body: { username, password } }));
  }

  async function register(data) {
    return storeAuth(await request('/auth/register', { method: 'POST', body: data }));
  }

  async function logout() {
    try {
      if (sessionStorage.getItem(TOKEN_KEY)) await request('/auth/logout', { method: 'POST' });
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    }
  }

  function catalogFormData(data, photoFile, methodSpoof = false) {
    const form = new FormData();
    Object.entries(data || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        form.append(`${key}_present`, '1');
        value.forEach((item) => form.append(`${key}[]`, String(item)));
      } else {
        form.append(key, String(value));
      }
    });
    if (typeof File !== 'undefined' && photoFile instanceof File && photoFile.size > 0) {
      form.append('foto_file', photoFile, photoFile.name);
    }
    if (methodSpoof) form.append('_method', 'PUT');
    return form;
  }

  const withParams = (path, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value) !== '') query.set(key, value);
    });
    return `${path}${query.toString() ? `?${query.toString()}` : ''}`;
  };

  window.SiboraApi = Object.freeze({
    baseUrl: API_BASE,
    request,
    login,
    register,
    logout,
    currentUser: () => {
      try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'); }
      catch (_) { return null; }
    },
    isLoggedIn: () => Boolean(sessionStorage.getItem(TOKEN_KEY)),
    venues: (params = {}) => request(withParams('/venues', params)),
    venue: (id) => request(`/venues/${encodeURIComponent(id)}`),
    venueSchedule: (id, tanggal) => request(withParams(`/venues/${encodeURIComponent(id)}/schedule`, { tanggal })),
    equipments: (params = {}) => request(withParams('/equipments', params)),
    equipmentCategories: () => request('/equipment-categories'),
    bookVenue: (data) => request('/bookings/venues', { method: 'POST', body: data }),
    rentEquipment: (data) => request('/bookings/equipment-rentals', { method: 'POST', body: data }),
    bookingHistory: (page = 1) => request(withParams('/bookings/history', { page })),
    transaction: (id) => request(`/transactions/${encodeURIComponent(id)}`),
    cancelTransaction: (id, alasan) => request(`/transactions/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: { alasan } }),
    createPayment: (id, data) => request(`/transactions/${encodeURIComponent(id)}/payments`, { method: 'POST', body: data }),
    confirmDemoPayment: (id) => request(`/payments/${encodeURIComponent(id)}/mock-confirm`, { method: 'POST', body: {} }),
    me: () => request('/auth/me'),
    profile: () => request('/user/profile'),
    updateProfile: (data) => request('/user/profile', { method: 'PUT', body: data }),
    addEmail: (email) => request('/user/emails', { method: 'POST', body: { email } }),
    deleteEmail: (id) => request(`/user/emails/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    favorites: () => request('/favorites'),
    addFavorite: (venueId) => request(`/favorites/${encodeURIComponent(venueId)}`, { method: 'POST', body: {} }),
    removeFavorite: (venueId) => request(`/favorites/${encodeURIComponent(venueId)}`, { method: 'DELETE' }),
    managementTransactions: (params = {}) => request(withParams('/management/transactions', params)),
    managementCatalogs: () => request('/management/catalogs'),
    managementVenues: (params = {}) => request(withParams('/management/venues', params)),
    createManagementVenue: (data) => request('/management/venues', { method: 'POST', body: data }),
    updateManagementVenue: (id, data) => request(`/management/venues/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
    createManagementVenueWithPhoto: (data, file) => request('/management/venues', { method: 'POST', body: catalogFormData(data, file) }),
    updateManagementVenueWithPhoto: (id, data, file) => request(`/management/venues/${encodeURIComponent(id)}`, { method: 'POST', body: catalogFormData(data, file, true) }),
    deleteManagementVenue: (id) => request(`/management/venues/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    managementEquipments: (params = {}) => request(withParams('/management/equipments', params)),
    createManagementEquipment: (data) => request('/management/equipments', { method: 'POST', body: data }),
    updateManagementEquipment: (id, data) => request(`/management/equipments/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
    createManagementEquipmentWithPhoto: (data, file) => request('/management/equipments', { method: 'POST', body: catalogFormData(data, file) }),
    updateManagementEquipmentWithPhoto: (id, data, file) => request(`/management/equipments/${encodeURIComponent(id)}`, { method: 'POST', body: catalogFormData(data, file, true) }),
    deleteManagementEquipment: (id) => request(`/management/equipments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    adminUsers: (params = {}) => request(withParams('/admin/users', params)),
    createAdminUser: (data) => request('/admin/users', { method: 'POST', body: data }),
    updateAdminUser: (id, data) => request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: data }),
    deleteAdminUser: (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    resetAdminPassword: (id, data) => request(`/admin/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST', body: data }),
    revenueReport: (params = {}) => request(withParams('/reports/revenue', params)),
  });
})(window);
