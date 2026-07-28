import { useEffect, useState } from 'react';
import { getDashboard } from '../api/dashboard';
import './Dashboard.css';

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = dateKey(new Date());

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ from: today, to: today });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard({ from: today, to: today })
      .then((response) => setData(response.data))
      .catch(() => setError('Không tải được báo cáo'))
      .finally(() => setLoading(false));
  }, []);

  const loadReport = async (nextFilters = filters) => {
    if (nextFilters.from > nextFilters.to) {
      setError('Ngày bắt đầu không được sau ngày kết thúc');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await getDashboard(nextFilters);
      setData(response.data);
      setFilters(nextFilters);
    } catch (requestError) {
      const message = requestError.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Không tải được báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (days) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days + 1);
    loadReport({ from: dateKey(fromDate), to: today });
  };

  const fmt = (number) => new Intl.NumberFormat('vi-VN').format(number || 0);
  const fmtDay = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN');
  const isToday = data?.period?.from === today && data?.period?.to === today;
  const periodLabel = !data
    ? ''
    : isToday
      ? 'hôm nay'
      : `từ ${fmtDay(data.period.from)} đến ${fmtDay(data.period.to)}`;

  return (
    <div>
      <div className="page-header dashboard-page-header">
        <div>
          <h1>Báo cáo kinh doanh</h1>
          {data && <p>Số liệu {periodLabel}</p>}
        </div>
        <form
          className="report-filter"
          onSubmit={(event) => {
            event.preventDefault();
            loadReport();
          }}
        >
          <label>
            Từ ngày
            <input
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(event) => setFilters({ ...filters, from: event.target.value })}
              required
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={filters.to}
              min={filters.from}
              max={today}
              onChange={(event) => setFilters({ ...filters, to: event.target.value })}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            Xem báo cáo
          </button>
        </form>
      </div>

      <div className="report-presets">
        <button type="button" onClick={() => selectPreset(1)}>Hôm nay</button>
        <button type="button" onClick={() => selectPreset(7)}>7 ngày</button>
        <button type="button" onClick={() => selectPreset(30)}>30 ngày</button>
      </div>

      {error && <div className="dashboard-error">{error}</div>}
      {loading && !data && <div className="spinner">Đang tải...</div>}
      {!loading && !data && <div className="empty-state">Không có dữ liệu</div>}

      {data && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dbeafe' }}>💰</div>
              <div>
                <p className="stat-label">Doanh thu</p>
                <p className="stat-value">{fmt(data.totalRevenue)} đ</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7' }}>🏷️</div>
              <div>
                <p className="stat-label">Giá vốn</p>
                <p className="stat-value">{fmt(data.totalCost)} đ</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dcfce7' }}>📈</div>
              <div>
                <p className="stat-label">Lợi nhuận gộp</p>
                <p className="stat-value profit-value">{fmt(data.totalProfit)} đ</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#f3e8ff' }}>🧾</div>
              <div>
                <p className="stat-label">Hóa đơn / sản phẩm</p>
                <p className="stat-value">{data.totalOrders} / {fmt(data.totalItems)}</p>
              </div>
            </div>
          </div>

          <div className="secondary-stats">
            <span>📦 Tồn kho thấp: <strong className={data.lowStockCount > 0 ? 'danger-text' : ''}>{data.lowStockCount}</strong></span>
            <span>👥 Nhân viên hoạt động: <strong>{data.activeStaff}</strong></span>
          </div>

          <div className="dashboard-bottom">
            <div className="card top-products">
              <h2 className="section-title">Sản phẩm bán chạy</h2>
              {data.topProducts?.length > 0 ? (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Doanh thu</th>
                        <th>Lợi nhuận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((product, index) => (
                        <tr key={product.productId}>
                          <td>{index + 1}</td>
                          <td>{product.productName}</td>
                          <td>{fmt(product.totalQty)}</td>
                          <td>{fmt(product.totalRevenue)} đ</td>
                          <td>{fmt(product.totalProfit)} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">Không có hóa đơn trong khoảng đã chọn</div>
              )}
            </div>

            <div className="card daily-report-card">
              <h2 className="section-title">Doanh thu theo ngày</h2>
              {data.dailyRevenue?.length > 0 ? (
                <div className="table-wrapper daily-table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th>Đơn</th>
                        <th>Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dailyRevenue.map((day) => (
                        <tr key={day.date}>
                          <td>{fmtDay(day.date)}</td>
                          <td>{day.orders}</td>
                          <td>{fmt(day.revenue)} đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">Chưa có dữ liệu</div>
              )}
            </div>
          </div>

          {data.lowStockProducts?.length > 0 && (
            <div className="card low-stock-table">
              <h2 className="section-title">⚠️ Sản phẩm sắp hết hàng</h2>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Tồn kho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStockProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td><span className="badge badge-red">{product.stock}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
