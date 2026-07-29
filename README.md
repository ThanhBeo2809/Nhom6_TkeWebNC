# 🛒 Hệ thống Quản lý Bán hàng (POS)

Ứng dụng quản lý cửa hàng theo mô hình client-server, gồm backend NestJS,
frontend React và cơ sở dữ liệu MySQL. Hệ thống hỗ trợ bán hàng, quản lý kho,
ca làm việc, nhân viên, hóa đơn và báo cáo doanh thu theo phân quyền Admin/Staff.

## Công nghệ sử dụng

- **Backend:** Node.js, NestJS 11, TypeScript, TypeORM.
- **Frontend:** React 19, Vite 8, React Router, Axios.
- **Cơ sở dữ liệu:** MySQL.
- **Xác thực:** JWT, Passport và Bcrypt.
- **Kiểm thử:** Jest.

## Chức năng chính

### Admin

- Xem dashboard doanh thu, lợi nhuận, sản phẩm bán chạy và cảnh báo sắp hết hàng.
- Quản lý danh mục, sản phẩm, giá bán, giá vốn và trạng thái kinh doanh.
- Nhập kho và xem lịch sử biến động kho.
- Tạo, khóa hoặc mở khóa tài khoản Staff.
- Xem toàn bộ hóa đơn và lọc theo thời gian, nhân viên, thanh toán, trạng thái.
- Duyệt hoặc từ chối yêu cầu hủy hóa đơn của Staff.
- Hủy trực tiếp hóa đơn và tự động hoàn lại tồn kho.
- Theo dõi ca làm việc và buộc đóng ca khi cần.

### Staff

- Đăng nhập và đổi mật khẩu trong lần sử dụng đầu tiên.
- Bắt đầu/kết thúc ca và đối soát tiền mặt cuối ca.
- Bán hàng bằng tiền mặt hoặc chuyển khoản.
- Xem các hóa đơn do mình tạo.
- Gửi yêu cầu hủy hóa đơn để Admin duyệt.

### Trạng thái hóa đơn

- **Hoàn thành:** giao dịch đã thanh toán bình thường.
- **Chờ duyệt hủy:** Staff đã gửi yêu cầu nhưng hóa đơn vẫn còn hiệu lực, chưa
  hoàn kho và chưa được tính là đã hủy.
- **Đã từ chối hủy:** Admin từ chối yêu cầu; hóa đơn tiếp tục ở trạng thái hoàn
  thành.
- **Đã hủy:** Admin đã duyệt hoặc trực tiếp hủy; hệ thống hoàn kho và cập nhật
  lại số liệu ca liên quan.

## Yêu cầu môi trường

- Node.js `^20.19.0`, `^22.13.0` hoặc `>=24`.
- npm.
- MySQL Server 8.x.
- Git.

## Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/ThanhBeo2809/Nhom6_TkeWebNC.git
cd Nhom6_TkeWebNC
```

Nếu thư mục dự án trên máy có tên `Code Web`, hãy mở terminal tại thư mục đó:

```powershell
cd "D:\Code Web"
```

### 2. Tạo cơ sở dữ liệu

Mở MySQL Workbench hoặc MySQL CLI và chạy:

```sql
CREATE DATABASE cuahang_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Không cần tạo bảng thủ công. Trong môi trường phát triển,
`DB_SYNCHRONIZE=true` cho phép TypeORM tạo/cập nhật cấu trúc bảng khi backend
khởi động.

### 3. Cấu hình backend

```bash
cd backend
npm install
```

Sao chép `backend/.env.example` thành `backend/.env`, sau đó cập nhật thông tin
MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_NAME=cuahang_db
DB_SYNCHRONIZE=true

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h

ADMIN_NAME=Quản trị viên
ADMIN_EMAIL=admin@cuahang.com
ADMIN_PASSWORD=change_this_initial_password

CORS_ORIGINS=http://localhost:5173
PORT=3001
```

Không commit file `.env` hoặc mật khẩu thật lên GitHub.

### 4. Khởi tạo dữ liệu

Khi backend kết nối tới database có bảng `users` rỗng, hệ thống tự tạo tài
khoản Admin theo các biến `ADMIN_NAME`, `ADMIN_EMAIL` và `ADMIN_PASSWORD`.

Để tạo bộ dữ liệu demo đầy đủ:

```bash
npm run seed:demo
```

Lệnh seed tạo:

- 9 danh mục;
- 55 sản phẩm;
- 6 tài khoản Staff;
- 90 ca làm việc trong 45 ngày;
- 360 hóa đơn cùng chi tiết hóa đơn và lịch sử biến động kho.

Seed chạy trong transaction và có cơ chế chống trùng. Chạy lại lệnh sẽ không
nhân đôi dữ liệu đã tạo.

Tài khoản Staff trong bộ seed sử dụng mật khẩu mặc định:

```text
NhanVien@123
```

Có thể thay mật khẩu này bằng biến `DEMO_STAFF_PASSWORD` trước khi chạy seed.
Các tài khoản đều được yêu cầu đổi mật khẩu sau lần đăng nhập đầu tiên.

Staff được Admin tạo trực tiếp trên giao diện sử dụng mật khẩu lần đầu:

```text
12345678
```

### 5. Chạy backend

Trong thư mục `backend`:

```bash
npm run start:dev
```

Backend mặc định chạy tại:

```text
http://localhost:3001
```

API sử dụng prefix:

```text
http://localhost:3001/api
```

### 6. Cấu hình và chạy frontend

Mở terminal mới:

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại:

```text
http://localhost:5173
```

Nếu backend không sử dụng địa chỉ mặc định, tạo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
```

Trên Windows, nếu PowerShell chặn `npm.ps1`, có thể dùng `npm.cmd`:

```powershell
npm.cmd run dev
```

## Luồng sử dụng

### Staff bán hàng

1. Đăng nhập và đổi mật khẩu nếu hệ thống yêu cầu.
2. Mở trang **Ca của tôi** và bắt đầu ca với số tiền đầu ca.
3. Mở trang **Bán hàng**, chọn sản phẩm và thanh toán.
4. Xem lại hóa đơn tại trang **Lịch sử hóa đơn**.
5. Kết thúc ca và nhập số tiền mặt thực tế để hệ thống tính chênh lệch.

Staff phải có một ca đang mở trước khi tạo hóa đơn.

### Staff yêu cầu hủy hóa đơn

1. Staff mở chi tiết hóa đơn và chọn **Yêu cầu hủy**.
2. Hóa đơn chuyển sang **Chờ duyệt hủy**, nhưng vẫn giữ trạng thái hoàn thành và
   chưa hoàn kho.
3. Admin chọn **Duyệt hủy** hoặc **Từ chối**.
4. Chỉ khi Admin duyệt, hóa đơn mới chuyển sang **Đã hủy** và số lượng sản phẩm
   mới được hoàn lại kho.

### Admin quản lý cửa hàng

1. Xem báo cáo tại `/dashboard`.
2. Quản lý sản phẩm và danh mục tại `/products`.
3. Nhập kho và xem lịch sử kho tại `/inventory`.
4. Quản lý nhân viên tại `/staff`.
5. Xem, lọc và xử lý hóa đơn tại `/orders`.
6. Theo dõi toàn bộ ca làm việc tại `/shifts`.

## Tuyến giao diện

| Đường dẫn | Chức năng | Quyền |
| --- | --- | --- |
| `/login` | Đăng nhập | Công khai |
| `/pos` | Bán hàng | Admin, Staff |
| `/orders` | Lịch sử và xử lý hóa đơn | Admin, Staff |
| `/my-shift` | Ca làm việc cá nhân | Staff |
| `/dashboard` | Báo cáo tổng quan | Admin |
| `/products` | Quản lý danh mục, sản phẩm | Admin |
| `/inventory` | Quản lý kho | Admin |
| `/staff` | Quản lý nhân viên | Admin |
| `/shifts` | Quản lý tất cả ca làm việc | Admin |

## Các lệnh thường dùng

### Backend

```bash
npm run start:dev   # Chạy backend ở chế độ phát triển
npm run build       # Build backend
npm run test        # Chạy unit test
npm run test:e2e    # Chạy end-to-end test
npm run lint        # Kiểm tra và sửa lint
npm run seed:demo   # Tạo dữ liệu demo
```

### Frontend

```bash
npm run dev         # Chạy frontend ở chế độ phát triển
npm run build       # Build frontend
npm run lint        # Kiểm tra lint
npm run preview     # Xem bản production build
```

## Kiểm tra trước khi commit

```bash
cd backend
npm run test
npm run build

cd ../frontend
npm run lint
npm run build
```

## Lưu ý khi triển khai

- Đặt `DB_SYNCHRONIZE=false` trong môi trường production và quản lý thay đổi
  database bằng migration.
- Dùng `JWT_SECRET` dài, ngẫu nhiên và không lưu trong repository.
- Thay mật khẩu Admin mặc định trước khi triển khai.
- Chỉ cấu hình các domain frontend hợp lệ trong `CORS_ORIGINS`.
- Sao lưu database trước khi cập nhật schema hoặc chạy thao tác dữ liệu lớn.
- Dữ liệu MySQL trên máy không được lưu trực tiếp trên GitHub; repository chỉ
  chứa code và script giúp tái tạo dữ liệu demo.
