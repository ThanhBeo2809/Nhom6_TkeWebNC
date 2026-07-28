import { useEffect, useState } from 'react';
import { getOrders, getOrderById, cancelOrder, requestCancelOrder, approveCancelOrder, rejectCancelOrder } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import { getOrderStatusPresentation } from '../utils/orderStatus';
import '../components/common/Modal.css';
import './Orders.css';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({
    orderId: '',
    status: '',
    paymentMethod: '',
    from: '',
    to: '',
  });

  const refreshOrders = (params = filters) => {
    setLoading(true);
    const cleanParams = Object.fromEntries(Object.entries(params).filter(([, value]) => value));
    return getOrders(cleanParams)
      .then((r) => setOrders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getOrders()
      .then((response) => {
        if (active) setOrders(response.data);
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openDetail = async (id) => {
    try {
      const res = await getOrderById(id);
      setDetail(res.data);
    } catch {
      alert('Không tải được chi tiết hóa đơn');
    }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Nhập lý do hủy hóa đơn:');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      alert('Lý do hủy phải có ít nhất 3 ký tự');
      return;
    }
    try {
      setActionLoading(true);
      await cancelOrder(id, reason.trim());
      setDetail(null);
      await refreshOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Hủy thất bại');
    } finally {
      setActionLoading(false);
    }
  };
  const requestCancel = async (id) => {
    const reason = window.prompt('Nhập lý do yêu cầu hủy:');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      alert('Lý do hủy phải có ít nhất 3 ký tự');
      return;
    }
    try {
      setActionLoading(true);
      await requestCancelOrder(id, reason.trim());
      setDetail(null);
      await refreshOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể gửi yêu cầu hủy');
    } finally {
      setActionLoading(false);
    }
  };
  const approve = async (id, accepted) => {
    const action = accepted ? 'duyệt' : 'từ chối';
    let rejectionReason = null;
    if (accepted) {
      if (!window.confirm(`Xác nhận duyệt yêu cầu hủy hóa đơn #${id}?`)) return;
    } else {
      rejectionReason = window.prompt('Nhập lý do từ chối yêu cầu hủy:');
      if (rejectionReason === null) return;
      if (rejectionReason.trim().length < 3) {
        alert('Lý do từ chối phải có ít nhất 3 ký tự');
        return;
      }
    }
    try {
      setActionLoading(true);
      if (accepted) await approveCancelOrder(id);
      else await rejectCancelOrder(id, rejectionReason.trim());
      setDetail(null);
      await refreshOrders();
    } catch (err) {
      alert(err.response?.data?.message || `Không thể ${action} yêu cầu`);
    } finally {
      setActionLoading(false);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
  const fmtDate = (d) => new Date(d).toLocaleString('vi-VN');

  if (loading) return <div className="spinner">Đang tải...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Lịch sử hóa đơn</h1>
      </div>

      <div className="card">
        <form
          className="order-filters"
          onSubmit={(event) => {
            event.preventDefault();
            refreshOrders();
          }}
        >
          <input
            type="number"
            min="1"
            placeholder="Mã hóa đơn"
            value={filters.orderId}
            onChange={(event) => setFilters({ ...filters, orderId: event.target.value })}
          />
          <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Tất cả trạng thái</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select value={filters.paymentMethod} onChange={(event) => setFilters({ ...filters, paymentMethod: event.target.value })}>
            <option value="">Mọi thanh toán</option>
            <option value="cash">Tiền mặt</option>
            <option value="transfer">Chuyển khoản</option>
          </select>
          <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          <input type="date" value={filters.to} min={filters.from} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          <button type="submit" className="btn-primary">Lọc</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const empty = { orderId: '', status: '', paymentMethod: '', from: '', to: '' };
              setFilters(empty);
              refreshOrders(empty);
            }}
          >
            Xóa lọc
          </button>
        </form>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#ID</th>
                <th>Thời gian</th>
                {user?.role === 'admin' && <th>Nhân viên</th>}
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={user?.role === 'admin' ? 7 : 6} className="empty-state">Không tìm thấy hóa đơn</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>#{o.id}</td>
                  <td>{fmtDate(o.createdAt)}</td>
                  {user?.role === 'admin' && <td>{o.user?.name}</td>}
                  <td style={{ fontWeight: 600 }}>{fmt(o.totalAmount)} đ</td>
                  <td>{o.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
                  <td>
                    <span className={`badge ${getOrderStatusPresentation(o).className}`}>
                      {getOrderStatusPresentation(o).label}
                    </span>
                  </td>
                  <td>
                    <button className="icon-btn" onClick={() => openDetail(o.id)} title="Xem chi tiết">👁️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box order-detail-box" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-print-header print-only">
              <h2>CỬA HÀNG TIỆN LỢI</h2>
              <p>HÓA ĐƠN BÁN HÀNG</p>
            </div>
            <div className="modal-header">
              <h3>Hóa đơn #{detail.id}</h3>
              <button className="modal-close no-print" onClick={() => setDetail(null)}>✕</button>
            </div>

            <div className="order-meta">
              <span>🕐 {fmtDate(detail.createdAt)}</span>
              {user?.role === 'admin' && <span>👤 {detail.user?.name}</span>}
              <span>💳 {detail.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</span>
              <span className={`badge ${getOrderStatusPresentation(detail).className}`}>
                {getOrderStatusPresentation(detail).label}
              </span>
            </div>

            <table className="detail-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Đơn giá</th>
                  <th>SL</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detail.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.name || `SP #${item.productId}`}</td>
                    <td>{fmt(item.priceAtTime)} đ</td>
                    <td>{item.quantity}</td>
                    <td>{fmt(item.priceAtTime * item.quantity)} đ</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="order-total-line">
              <span>Tổng cộng:</span>
              <strong>{fmt(detail.totalAmount)} đ</strong>
            </div>
            <div className="payment-detail">
              <span>Khách đưa: <strong>{fmt(detail.amountPaid)} đ</strong></span>
              <span>Tiền thừa: <strong>{fmt(detail.changeAmount)} đ</strong></span>
              {detail.note && <span>Ghi chú: <strong>{detail.note}</strong></span>}
            </div>
            {detail.cancelRequestStatus !== 'none' && (
              <div className={`cancel-audit cancel-audit-${detail.cancelRequestStatus}`}>
                <strong>
                  {detail.cancelRequestStatus === 'pending' && 'Yêu cầu hủy đang chờ duyệt'}
                  {detail.cancelRequestStatus === 'approved' && 'Yêu cầu hủy đã được duyệt'}
                  {detail.cancelRequestStatus === 'rejected' && 'Yêu cầu hủy đã bị từ chối'}
                </strong>
                {detail.cancelReason && <span>Lý do: {detail.cancelReason}</span>}
                {detail.cancelRequestedAt && (
                  <span>Thời điểm yêu cầu: {fmtDate(detail.cancelRequestedAt)}</span>
                )}
                {detail.cancelledAt && (
                  <span>Thời điểm hủy: {fmtDate(detail.cancelledAt)}</span>
                )}
                {detail.cancelRejectionReason && (
                  <span>Lý do từ chối: {detail.cancelRejectionReason}</span>
                )}
                {detail.cancelReviewedAt && detail.cancelRequestStatus === 'rejected' && (
                  <span>Thời điểm xử lý: {fmtDate(detail.cancelReviewedAt)}</span>
                )}
              </div>
            )}
            {detail.status === 'cancelled' && detail.cancelRequestStatus === 'none' && (
              <div className="cancel-audit cancel-audit-approved">
                <strong>Hóa đơn đã được Admin hủy</strong>
                {detail.cancelReason && <span>Lý do: {detail.cancelReason}</span>}
                {detail.cancelledAt && <span>Thời điểm hủy: {fmtDate(detail.cancelledAt)}</span>}
              </div>
            )}

            <p className="invoice-thanks print-only">Cảm ơn quý khách và hẹn gặp lại!</p>

            <div className="modal-actions no-print">
              <button type="button" className="btn-primary" onClick={() => window.print()}>
                🖨️ In hóa đơn
              </button>
              {detail.status === 'completed' && user?.role === 'admin' && (
                detail.cancelRequestStatus !== 'pending' && (
                <button className="btn-danger" disabled={actionLoading} onClick={() => handleCancel(detail.id)}>
                  Hủy hóa đơn
                </button>
                )
              )}
              {detail.status === 'completed' && user?.role !== 'admin' && detail.cancelRequestStatus !== 'pending' && (
                <button className="btn-danger" disabled={actionLoading} onClick={() => requestCancel(detail.id)}>Yêu cầu hủy</button>
              )}
              {user?.role === 'admin' && detail.cancelRequestStatus === 'pending' && (
                <>
                  <button className="btn-primary" disabled={actionLoading} onClick={() => approve(detail.id, true)}>Duyệt hủy</button>
                  <button className="btn-secondary" disabled={actionLoading} onClick={() => approve(detail.id, false)}>Từ chối</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
