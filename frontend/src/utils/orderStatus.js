export const getOrderStatusPresentation = (order) => {
  if (order.status === 'cancelled') {
    return { className: 'badge-red', label: 'Đã hủy' };
  }

  if (order.cancelRequestStatus === 'pending') {
    return { className: 'badge-yellow', label: 'Chờ duyệt hủy' };
  }

  if (order.cancelRequestStatus === 'rejected') {
    return { className: 'badge-green', label: 'Hoàn thành · Đã từ chối hủy' };
  }

  return { className: 'badge-green', label: 'Hoàn thành' };
};
