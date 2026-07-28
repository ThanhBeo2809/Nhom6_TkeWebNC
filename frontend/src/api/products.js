import api from './axios';

export const getProducts = (activeOnly = false) => api.get(`/products${activeOnly ? '?activeOnly=true' : ''}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data);
export const toggleProduct = (id) => api.patch(`/products/${id}/toggle-active`);
export const addStock = (id, quantity, note) => api.patch(`/inventory/${id}/add-stock`, { quantity, note });
export const getInventoryHistory = (params = {}) => api.get('/inventory/history', { params });
