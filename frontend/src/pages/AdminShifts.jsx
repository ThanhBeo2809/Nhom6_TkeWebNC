import { useEffect, useState } from 'react';
import { forceCloseShift, getAdminShifts, getShiftOrders } from '../api/shifts';
import { getUsers } from '../api/users';
import { getOrderStatusPresentation } from '../utils/orderStatus';
import '../components/common/Modal.css';
import './MyShift.css';

export default function AdminShifts() {
  const [shifts,setShifts]=useState([]); const [staff,setStaff]=useState([]); const [detail,setDetail]=useState(null);
  const [filters,setFilters]=useState({staffId:'',status:'',from:'',to:''}); const [error,setError]=useState('');
  const load=(values=filters)=>getAdminShifts(Object.fromEntries(Object.entries(values).filter(([,v])=>v))).then(r=>setShifts(r.data));
  useEffect(()=>{getAdminShifts().then(r=>setShifts(r.data)).catch(()=>setError('Không tải được ca làm'));getUsers().then(r=>setStaff(r.data)).catch(console.error)},[]);
  const fmt=n=>new Intl.NumberFormat('vi-VN').format(Number(n||0));
  const open=async shift=>{const orders=await getShiftOrders(shift.id);setDetail({...shift,orders:orders.data})};
  const forceClose=async shift=>{const actual=window.prompt('Nhập tiền thực tế trong két:');if(actual===null)return;const reason=window.prompt('Nhập lý do buộc đóng ca:');if(!reason)return;try{await forceCloseShift(shift.id,{actualCash:Number(actual),reason});setDetail(null);await load()}catch(e){alert(e.response?.data?.message||'Không thể đóng ca')}};
  return <div><div className="page-header"><h1>Quản lý ca làm</h1></div>{error&&<div className="shift-alert error">{error}</div>}
    <div className="card"><form className="order-filters" onSubmit={e=>{e.preventDefault();load()}}>
      <select value={filters.staffId} onChange={e=>setFilters({...filters,staffId:e.target.value})}><option value="">Tất cả nhân viên</option>{staff.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
      <select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Mọi trạng thái</option><option value="open">Đang mở</option><option value="closed">Đã đóng</option></select>
      <input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/><input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/>
      <button className="btn-primary">Lọc</button><button type="button" className="btn-secondary" onClick={()=>{const v={staffId:'',status:'',from:'',to:''};setFilters(v);load(v)}}>Xóa lọc</button>
    </form><div className="table-wrapper"><table><thead><tr><th>Nhân viên</th><th>Bắt đầu</th><th>Kết thúc</th><th>Doanh thu</th><th>Dự kiến</th><th>Thực tế</th><th>Chênh lệch</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>{shifts.length===0&&<tr><td colSpan="9" className="empty-state">Chưa có ca làm</td></tr>}{shifts.map(s=><tr key={s.id}><td>{s.staff?.name}</td><td>{new Date(s.startedAt).toLocaleString('vi-VN')}</td><td>{s.endedAt?new Date(s.endedAt).toLocaleString('vi-VN'):'-'}</td><td>{fmt(s.totalRevenue)} đ</td><td>{s.expectedCash==null?'-':`${fmt(s.expectedCash)} đ`}</td><td>{s.actualCash==null?'-':`${fmt(s.actualCash)} đ`}</td><td className={Number(s.difference)<0?'negative':''}>{s.difference==null?'-':`${fmt(s.difference)} đ`}</td><td>{s.status==='open'?'🟢 Đang mở':'Đã đóng'}</td><td><button className="icon-btn" onClick={()=>open(s)}>👁️</button></td></tr>)}</tbody>
    </table></div></div>
    {detail&&<div className="modal-overlay" onClick={()=>setDetail(null)}><div className="modal-box order-detail-box" onClick={e=>e.stopPropagation()}><div className="modal-header"><h3>Ca #{detail.id} — {detail.staff?.name}</h3><button className="modal-close" onClick={()=>setDetail(null)}>✕</button></div>
      <div className="shift-details"><p>Tiền đầu ca <strong>{fmt(detail.openingCash)} đ</strong></p><p>Tiền mặt <strong>{fmt(detail.cashSales)} đ</strong></p><p>Chuyển khoản <strong>{fmt(detail.transferSales)} đ</strong></p><p>Số hóa đơn <strong>{detail.totalOrders}</strong></p>{detail.closeNote&&<p>Lý do đóng <strong>{detail.closeNote}</strong></p>}</div>
      <h4>Hóa đơn trong ca</h4><div className="table-wrapper"><table><tbody>{detail.orders.map(o=><tr key={o.id}><td>#{o.id}</td><td>{new Date(o.createdAt).toLocaleString('vi-VN')}</td><td>{fmt(o.totalAmount)} đ</td><td><span className={`badge ${getOrderStatusPresentation(o).className}`}>{getOrderStatusPresentation(o).label}</span></td></tr>)}</tbody></table></div>
      {detail.status==='open'&&<div className="modal-actions"><button className="btn-danger" onClick={()=>forceClose(detail)}>Buộc đóng ca</button></div>}
    </div></div>}
  </div>;
}
