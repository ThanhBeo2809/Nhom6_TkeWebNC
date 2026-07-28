import api from './axios';

export const createOrder = (data) => api.post('/orders', data);
export const getOrders = (params = {}) => api.get('/orders', { params });
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const cancelOrder = (id, reason) => api.patch(`/orders/${id}/cancel`, { reason });
export const requestCancelOrder = (id, reason) => api.post(`/orders/${id}/cancel-request`, { reason });
export const approveCancelOrder = (id) => api.patch(`/orders/${id}/cancel-request/approve`);
export const rejectCancelOrder = (id, reason) => api.patch(`/orders/${id}/cancel-request/reject`, { reason });
