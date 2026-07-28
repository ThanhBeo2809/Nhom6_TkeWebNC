# 🛒 Hệ thống Quản lý Bán hàng (POS)

Dự án Hệ thống Quản lý Bán hàng (Point of Sale - POS) hoàn chỉnh được xây dựng với kiến trúc Client-Server, tách biệt rõ ràng giữa Backend và Frontend.

## 🚀 1. Công nghệ sử dụng (Tech Stack)

*   **Backend:** Node.js, NestJS (TypeScript), TypeORM.
*   **Frontend:** React 19, Vite, React Router DOM, Axios.
*   **Cơ sở dữ liệu:** MySQL.
*   **Bảo mật:** JWT (JSON Web Tokens), Passport.js, mã hóa Bcrypt.

---

## 🌟 2. Các chức năng chính

Hệ thống được chia làm 2 phân quyền chính là **Admin (Chủ cửa hàng)** và **Staff (Nhân viên bán hàng)**.

*   **🔐 Quản lý Tài khoản & Phân quyền:** Đăng nhập an toàn, bảo vệ các tuyến đường (routes) dựa trên quyền hạn.
*   **🛒 Quản lý Bán hàng (POS):** Giao diện bán hàng trực quan, cho phép chọn sản phẩm, tính tiền và tạo hóa đơn.
*   **📦 Quản lý Sản phẩm & Danh mục:** Thêm, sửa, xóa, phân loại các mặt hàng kinh doanh.
*   **🗄️ Quản lý Kho hàng (Inventory):** Kiểm soát số lượng hàng tồn kho.
*   **📝 Quản lý Đơn hàng (Orders):** Xem lịch sử giao dịch, chi tiết hóa đơn đã bán.
*   **📊 Báo cáo thống kê (Dashboard):** Dành riêng cho Admin xem tổng quan về doanh thu và hoạt động kinh doanh.
*   **👥 Quản lý Nhân viên (Staff):** Admin có thể quản lý danh sách nhân viên trong cửa hàng.

---

## 🛠️ 3. Hướng dẫn cài đặt & Khởi chạy (Dành cho Nhóm)

Để chạy được dự án này trên máy cá nhân, yêu cầu máy tính phải cài đặt sẵn **Node.js** và **MySQL Server (MySQL Workbench)**.

### Bước 3.1: Thiết lập Cơ sở dữ liệu (Database)
1. Mở **MySQL Workbench** và đăng nhập với tài khoản `root`.
2. Tạo một Database mới bằng cách chạy câu lệnh SQL sau:
   ```sql
   CREATE DATABASE cuahang_db;
   ```
*(Lưu ý: Bạn không cần tạo bảng, Backend NestJS sẽ tự động tạo cấu trúc bảng khi khởi chạy).*

### Bước 3.2: Cấu hình và chạy Backend
1. Mở Terminal (Command Prompt / VS Code Terminal), di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Cấu hình biến môi trường:
   Mở file `backend/.env` (hoặc tạo mới nếu chưa có) và đảm bảo nội dung trùng khớp với thông tin MySQL của bạn:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=Mật_khẩu_MySQL_của_bạn
   DB_NAME=cuahang_db
   DB_SYNCHRONIZE=true
   JWT_SECRET=supersecretkey_cuahang_2024
   JWT_EXPIRES_IN=8h
   ADMIN_EMAIL=admin@cuahang.com
   ADMIN_PASSWORD=admin123
   CORS_ORIGINS=http://localhost:5173
   PORT=3001
   ```
4. Khởi chạy Backend:
   ```bash
   npm run start:dev
   ```
   *(Backend sẽ chạy tại: http://localhost:3001)*

### Bước 3.3: Cấu hình và chạy Frontend
1. Mở một **Terminal mới** (giữ nguyên Terminal Backend đang chạy), di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Có thể tạo `frontend/.env` nếu Backend không chạy ở địa chỉ mặc định:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```
4. Khởi chạy giao diện Frontend:
   ```bash
   npm run dev
   ```
5. Truy cập vào đường link hiển thị trên Terminal (thường là `http://localhost:5173`) bằng trình duyệt Chrome/Edge.

> `DB_SYNCHRONIZE=true` giúp tự tạo/cập nhật bảng khi làm bài trên máy cá nhân.
> Khi triển khai với dữ liệu thật, hãy sao lưu cơ sở dữ liệu, tạo migration và chuyển
> `DB_SYNCHRONIZE=false`.

---

## 📖 4. Hướng dẫn sử dụng và Thao tác

Để hệ thống hoạt động, bạn phải đảm bảo **CẢ HAI** Terminal (Backend và Frontend) đều đang chạy.

### 4.1. Khởi tạo dữ liệu mẫu (Seeding)
Lần đầu backend chạy với bảng `users` rỗng, hệ thống tự tạo tài khoản Admin:
`admin@cuahang.com / admin123`. Không có route đăng ký công khai.

### 4.2. Luồng thao tác dành cho Nhân viên (Staff)
1. **Đăng nhập:** Truy cập `/login` và đăng nhập bằng tài khoản nhân viên.
2. **Bán hàng:** 
   - Hệ thống tự động chuyển hướng đến giao diện `/pos`.
   - Nhân viên thao tác chọn sản phẩm khách mua.
   - Kiểm tra giỏ hàng và tiến hành Thanh toán. Khi thanh toán thành công, hệ thống sinh ra một Đơn hàng.
3. **Xem đơn hàng:** Chuyển sang tab `/orders` để xem lại các hóa đơn mình vừa tạo trong ca làm việc.

### 4.3. Luồng thao tác dành cho Chủ cửa hàng (Admin)
1. **Đăng nhập:** Truy cập `/login` và đăng nhập bằng tài khoản Admin.
2. **Xem thống kê:** Tại trang `/dashboard`, Admin xem được tổng quan doanh thu, số đơn hàng.
3. **Quản lý danh mục & Sản phẩm:** Truy cập `/products` để thêm mặt hàng mới, cập nhật giá bán.
4. **Kiểm kho:** Truy cập `/inventory` để xem lượng hàng hóa còn lại thực tế.
5. **Quản lý nhân sự:** Truy cập `/staff` để cấp tài khoản hoặc khóa/mở khóa tài khoản nhân viên.
6. **Bán hàng:** Admin vẫn có toàn quyền truy cập giao diện `/pos` để bán hàng như một nhân viên bình thường.
