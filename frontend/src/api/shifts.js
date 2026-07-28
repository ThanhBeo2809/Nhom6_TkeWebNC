import api from './axios';
export const getCurrentShift = () => api.get('/shifts/current');
export const startShift = (openingCash) => api.post('/shifts/start', { openingCash });
export const endShift = (actualCash) => api.post('/shifts/end', { actualCash });
export const getMySummary = () => api.get('/shifts/my-summary');
export const getShiftHistory = () => api.get('/shifts/history');
export const getAdminShifts = (params = {}) => api.get('/shifts/admin', { params });
export const getShiftOrders = (id) => api.get(`/shifts/admin/${id}/orders`);
export const forceCloseShift = (id, data) => api.patch(`/shifts/admin/${id}/force-close`, data);
