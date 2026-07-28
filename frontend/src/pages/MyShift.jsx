import { useCallback, useEffect, useState } from 'react';
import { endShift, getCurrentShift, getMySummary, getShiftHistory, startShift } from '../api/shifts';
import './MyShift.css';

export default function MyShift() {
  const [shift, setShift] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [money, setMoney] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const [currentResponse, summaryResponse, historyResponse] = await Promise.all([
      getCurrentShift(), getMySummary(), getShiftHistory(),
    ]);
    setShift(currentResponse.data);
    setSummary(summaryResponse.data);
    setHistory(historyResponse.data);
  }, []);

  useEffect(() => {
    Promise.all([getCurrentShift(), getMySummary(), getShiftHistory()])
      .then(([currentResponse, summaryResponse, historyResponse]) => {
        setShift(currentResponse.data);
        setSummary(summaryResponse.data);
        setHistory(historyResponse.data);
      })
      .catch(() => setError('Không tải được dữ liệu ca làm việc'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
  const expectedCash = Number(shift?.openingCash || 0) + Number(summary?.cash || 0);

  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(money);
    if (money === '' || !Number.isFinite(amount) || amount < 0) {
      setError('Số tiền phải là số không âm');
      return;
    }
    setSaving(true); setError(''); setMessage('');
    try {
      if (shift) {
        const response = await endShift(amount);
        setMessage(`Đã kết thúc ca. Chênh lệch: ${fmt(response.data.difference)} đ`);
      } else {
        await startShift(amount);
        setMessage('Bắt đầu ca làm việc thành công');
      }
      setMoney('');
      await load();
    } catch (requestError) {
      const value = requestError.response?.data?.message;
      setError(Array.isArray(value) ? value.join(', ') : value || 'Thao tác thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner">Đang tải...</div>;
  return <div>
    <div className="page-header"><h1>Ca làm việc & thống kê cá nhân</h1></div>
    {error && <div className="shift-alert error">{error}</div>}
    {message && <div className="shift-alert success">{message}</div>}
    <div className="stats-grid">
      <div className="stat-card"><div><p className="stat-label">Doanh thu trong ca</p><p className="stat-value">{fmt(summary?.totalRevenue)} đ</p></div></div>
      <div className="stat-card"><div><p className="stat-label">Hóa đơn / sản phẩm</p><p className="stat-value">{summary?.totalOrders || 0} / {summary?.totalItems || 0}</p></div></div>
      <div className="stat-card"><div><p className="stat-label">Tiền mặt</p><p className="stat-value">{fmt(summary?.cash)} đ</p></div></div>
      <div className="stat-card"><div><p className="stat-label">Chuyển khoản</p><p className="stat-value">{fmt(summary?.transfer)} đ</p></div></div>
    </div>
    <div className="shift-grid">
      <form className="card" onSubmit={submit}>
        <h2 className="section-title">{shift ? '🟢 Ca đang mở' : 'Bắt đầu ca mới'}</h2>
        {shift && <div className="shift-details">
          <p>Bắt đầu <strong>{new Date(shift.startedAt).toLocaleString('vi-VN')}</strong></p>
          <p>Tiền đầu ca <strong>{fmt(shift.openingCash)} đ</strong></p>
          <p>Tiền mặt bán hàng <strong>{fmt(summary?.cash)} đ</strong></p>
          <p>Tiền dự kiến trong két <strong>{fmt(expectedCash)} đ</strong></p>
        </div>}
        <div className="form-group">
          <label>{shift ? 'Tiền thực tế trong két khi chốt ca' : 'Tiền mặt đầu ca'}</label>
          <input type="number" min="0" step="1000" value={money} onChange={(event) => setMoney(event.target.value)} required />
        </div>
        <button className={shift ? 'btn-danger' : 'btn-primary'} disabled={saving}>
          {saving ? 'Đang xử lý...' : shift ? 'Kết thúc ca' : 'Bắt đầu ca'}
        </button>
      </form>
      <div className="card">
        <h2 className="section-title">20 ca gần nhất</h2>
        <div className="table-wrapper"><table><thead><tr><th>Bắt đầu</th><th>Doanh thu</th><th>Chênh lệch</th><th>Trạng thái</th></tr></thead>
          <tbody>{history.length === 0 && <tr><td colSpan="4" className="empty-state">Chưa có lịch sử ca</td></tr>}
            {history.map((item) => <tr key={item.id}><td>{new Date(item.startedAt).toLocaleString('vi-VN')}</td><td>{fmt(item.totalRevenue)} đ</td><td className={Number(item.difference) < 0 ? 'negative' : ''}>{item.difference == null ? '-' : `${fmt(item.difference)} đ`}</td><td>{item.status === 'open' ? 'Đang mở' : 'Đã đóng'}</td></tr>)}
          </tbody></table></div>
      </div>
    </div>
  </div>;
}
