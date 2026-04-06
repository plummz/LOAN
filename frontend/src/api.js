import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:    data => api.post('/auth/login', data),
  register: data => api.post('/auth/register', data),
  me:       ()   => api.get('/auth/me'),
}

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  list:       params => api.get('/users', { params }),
  get:        id     => api.get(`/users/${id}`),
  setStatus:  (id, status) => api.patch(`/users/${id}/status`, { status }),
}

// ─── Loans ───────────────────────────────────────────────────────────────────
export const loansAPI = {
  list:      params => api.get('/loans', { params }),
  get:       id     => api.get(`/loans/${id}`),
  apply:     data   => api.post('/loans', data),
  setStatus: (id, status) => api.patch(`/loans/${id}/status`, { status }),
}

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  list:   params => api.get('/payments', { params }),
  create: data   => api.post('/payments', data),
  verify: (id, status) => api.patch(`/payments/${id}/verify`, { status }),
}

// ─── Inventory & Interest ────────────────────────────────────────────────────
export const inventoryAPI = {
  list:            params => api.get('/inventory', { params }),
  interestRecords: params => api.get('/interest-records', { params }),
}
