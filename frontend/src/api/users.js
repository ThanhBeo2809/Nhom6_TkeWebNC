import api from './axios';

export const getUsers = () => api.get('/users');
export const createUser = (data) => api.post('/users', data);
export const toggleUser = (id) => api.patch(`/users/${id}/toggle-active`);
