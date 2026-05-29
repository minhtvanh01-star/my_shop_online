# Tài liệu 01 — Tổng quan dự án

| Thông tin | Chi tiết |
|-----------|----------|
| **Tên tài liệu** | Tổng quan dự án My Shop Online |
| **Phiên bản** | 1.0.0 |
| **Ngày tạo** | 2026-05-30 |
| **Người tạo** | Anh Minh Phạm Vũ |

---

## Mục lục

1. [Mô tả hệ thống](#1-mô-tả-hệ-thống)
2. [Mục tiêu dự án](#2-mục-tiêu-dự-án)
3. [Đối tượng người dùng](#3-đối-tượng-người-dùng)
4. [Phạm vi dự án](#4-phạm-vi-dự-án)
5. [Kiến trúc hệ thống](#5-kiến-trúc-hệ-thống)
6. [Công nghệ sử dụng](#6-công-nghệ-sử-dụng)
7. [Ràng buộc kỹ thuật](#7-ràng-buộc-kỹ-thuật)
8. [Câu hỏi thường gặp](#8-câu-hỏi-thường-gặp)

---

## 1. Mô tả hệ thống

**My Shop Online** là nền tảng thương mại điện tử phục vụ cả khách hàng trong nước (Việt Nam) lẫn khách hàng quốc tế. Hệ thống bao gồm hai phần chính:

- **Storefront (Cửa hàng):** Giao diện mua sắm dành cho khách hàng, hỗ trợ đa ngôn ngữ (Tiếng Việt / Tiếng Anh), đa tiền tệ (VND / USD), và nhiều phương thức thanh toán.
- **Admin Panel (Quản trị):** Bảng điều khiển dành cho đội ngũ vận hành — quản lý sản phẩm, đơn hàng, khách hàng, nội dung blog, media, cấu hình hệ thống.

Hệ thống được thiết kế theo mô hình **monorepo**, tách biệt rõ ràng giữa backend API và frontend, dễ dàng mở rộng và bảo trì.

---

## 2. Mục tiêu dự án

### Mục tiêu chính

| # | Mục tiêu | Chỉ số đo lường |
|---|----------|-----------------|
| 1 | Xây dựng kênh bán hàng trực tuyến hoạt động ổn định | Uptime ≥ 99.5% |
| 2 | Phục vụ khách hàng Việt Nam và quốc tế trên cùng một nền tảng | Hỗ trợ ≥ 2 ngôn ngữ, ≥ 2 tiền tệ |
| 3 | Xử lý thanh toán an toàn, đáng tin cậy | Tỷ lệ giao dịch thành công ≥ 98% |
| 4 | Cung cấp trải nghiệm mua sắm nhanh, mượt mà | Trang tải < 2 giây (LCP) |
| 5 | Quản lý vận hành hiệu quả qua Admin Panel | Xử lý đơn hàng trong < 2 phút |

### Mục tiêu phụ

- Tích hợp SEO chuẩn để tăng traffic tự nhiên
- Hỗ trợ remarketing thông qua wishlist và email
- Ghi nhận đầy đủ audit log phục vụ kiểm tra và tuân thủ

---

## 3. Đối tượng người dùng

### 3.1 Khách hàng Việt Nam

- **Mô tả:** Người dùng trong nước, quen với VNPay, mua hàng bằng VND
- **Kỳ vọng:** Giao diện tiếng Việt, thanh toán qua VNPay/ATM, giá hiển thị VND
- **Nhu cầu chính:** Đặt hàng nhanh, theo dõi đơn, đánh giá sản phẩm

### 3.2 Khách hàng quốc tế

- **Mô tả:** Người dùng nước ngoài, thanh toán bằng thẻ quốc tế
- **Kỳ vọng:** Giao diện tiếng Anh, thanh toán qua Stripe, giá USD
- **Nhu cầu chính:** Thông tin sản phẩm đầy đủ tiếng Anh, phí ship quốc tế rõ ràng

### 3.3 Admin / Đội ngũ vận hành

- **Mô tả:** Nhân viên công ty — quản lý kho, CSKH, biên tập nội dung, kế toán
- **Kỳ vọng:** Dashboard trực quan, xuất báo cáo nhanh, quyền truy cập phân cấp rõ ràng
- **Nhu cầu chính:** Quản lý sản phẩm và đơn hàng, xem thống kê doanh thu

---

## 4. Phạm vi dự án

### ✅ In-scope (Nằm trong phạm vi)

**Quản lý catalog:**
- CRUD sản phẩm, danh mục, tags
- Đa ngôn ngữ (Việt/Anh), đa tiền tệ (VND/USD)
- Quản lý variants (kích cỡ, màu sắc...)
- Upload ảnh lên Cloudflare R2

**Thương mại:**
- Giỏ hàng (lưu theo tài khoản)
- Mã giảm giá (coupon)
- Checkout đa bước
- Thanh toán: VNPay + Stripe
- Quản lý đơn hàng và trạng thái
- Hoàn tiền (refund)

**Người dùng:**
- Đăng ký / đăng nhập / OAuth
- Quản lý địa chỉ giao hàng
- Lịch sử đơn hàng
- Wishlist, đánh giá sản phẩm

**Nội dung (CMS):**
- Blog bài viết đa ngôn ngữ
- Trang tĩnh (About, Policy...)
- Thư viện media

**Vận hành:**
- Admin panel phân quyền RBAC
- Quản lý tồn kho + audit log
- Cấu hình hệ thống và feature flags
- Thông báo (email, in-app)

### ❌ Out-of-scope (Ngoài phạm vi)

- Ứng dụng mobile native (iOS/Android)
- Tích hợp ERP/SAP
- Hệ thống affiliate marketing
- Chat trực tiếp với CSKH
- So sánh sản phẩm
- Đấu giá / flash sale theo thời gian thực
- Thanh toán trả góp

---

## 5. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                       │
│   Next.js 14 (App Router)  ·  apps/web/                 │
│   Storefront + Admin Panel + i18n (vi/en)               │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS / REST API
┌───────────────────────────▼─────────────────────────────┐
│                      API LAYER                          │
│   Node.js + Express + TypeScript  ·  apps/api/          │
│   JWT Auth · RBAC · Rate Limiting · Webhook handlers    │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
┌──────▼──┐     ┌─────▼────┐  ┌─────▼────────────────────┐
│Postgres │     │  Redis   │  │  Cloudflare R2           │
│Prisma   │     │  Cache   │  │  (ảnh sản phẩm / media)  │
│  ORM    │     │  Session │  └──────────────────────────┘
└─────────┘     └──────────┘
       │
┌──────▼─────────────────────────────────────────────────┐
│              PAYMENT GATEWAYS                          │
│   Stripe (quốc tế)      VNPay (Việt Nam)               │
└────────────────────────────────────────────────────────┘
```

---

## 6. Công nghệ sử dụng

| Thành phần | Công nghệ | Lý do chọn |
|------------|-----------|------------|
| Frontend | Next.js 14 (App Router) | SSR/SSG, SEO tốt, App Router hiện đại |
| UI | Tailwind CSS + shadcn/ui | Nhất quán, dễ tùy biến |
| State quản lý | Zustand + TanStack Query | Nhẹ, phù hợp e-commerce |
| Form & Validation | React Hook Form + Zod | Type-safe, hiệu suất cao |
| i18n | next-intl | Hỗ trợ App Router tốt nhất |
| Backend | Node.js + Express + TypeScript | Quen thuộc, hệ sinh thái phong phú |
| ORM | Prisma | Type-safe, migration dễ |
| Database | PostgreSQL | Quan hệ phức tạp, ACID, hỗ trợ JSON |
| Cache | Redis (ioredis) | Session, rate limit, cache API |
| File Storage | Cloudflare R2 | S3-compatible, rẻ, CDN toàn cầu |
| Thanh toán VN | VNPay | Cổng phổ biến nhất tại VN |
| Thanh toán QT | Stripe | Standard quốc tế, dễ tích hợp |
| Auth | JWT (access + refresh token) | Stateless, bảo mật |
| Monorepo | npm workspaces | Đơn giản, không cần build tools phức tạp |

---

## 7. Ràng buộc kỹ thuật

### 7.1 Hiệu suất

| Chỉ số | Mục tiêu |
|--------|----------|
| API response time (p95) | < 300ms |
| Trang sản phẩm LCP | < 2.5s |
| Database query timeout | 5s |
| File upload tối đa | 10MB/file |
| Concurrent users | 500+ |

### 7.2 Bảo mật

- Tất cả giao tiếp phải qua **HTTPS**
- Không lưu thông tin thẻ tín dụng trực tiếp (delegate cho Stripe/VNPay)
- Mọi input từ người dùng phải được **validate và sanitize**
- Rate limiting: 200 request/15 phút/IP (API), 5 lần/phút (login)
- Webhook thanh toán phải **verify signature** trước khi xử lý
- PII (thông tin cá nhân) phải được mã hóa khi lưu trữ nhạy cảm

### 7.3 Vận hành

- Code phải có TypeScript strict mode
- Không commit file `.env` lên repository
- Prisma migration phải reviewed trước khi deploy production
- Mọi thay đổi dữ liệu quan trọng phải ghi **audit log**
- Backup database hàng ngày, lưu trữ 30 ngày

### 7.4 Tương thích

- Hỗ trợ browser: Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- Responsive: Mobile (320px) → Desktop (1920px)
- Không yêu cầu plugin/extension của browser

---

## 8. Câu hỏi thường gặp

**Q: Tại sao dùng Next.js thay vì Nuxt hay Remix?**
> Next.js 14 với App Router có hệ sinh thái lớn nhất, SEO tốt qua SSR/SSG, và cộng đồng Việt Nam quen thuộc. shadcn/ui cũng được thiết kế tối ưu cho Next.js.

**Q: Tại sao tách Backend riêng thay vì dùng Next.js API Routes?**
> Tách BE cho phép scale độc lập, dùng WebSocket trong tương lai, và phục vụ cả mobile app sau này. Next.js API Routes phù hợp cho project nhỏ hơn.

**Q: Tại sao chọn PostgreSQL thay vì MySQL?**
> PostgreSQL hỗ trợ kiểu dữ liệu phong phú hơn (UUID native, JSONB, Array), tuân thủ SQL standards tốt hơn, và Prisma hỗ trợ tốt nhất với PostgreSQL.

**Q: Redis dùng để làm gì cụ thể?**
> Cache kết quả query sản phẩm/danh mục, lưu refresh token, rate limiting, queue email notifications, và session data.

**Q: Hệ thống có hỗ trợ thêm ngôn ngữ/tiền tệ mới không?**
> Có. Kiến trúc i18n và đa tiền tệ được thiết kế mở rộng. Thêm ngôn ngữ chỉ cần tạo file translation mới; thêm tiền tệ cần thêm bản ghi vào bảng `product_prices`.
