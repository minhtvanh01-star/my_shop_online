Kiểm tra xem module **$ARGUMENTS** đã enforce đúng các Business Rules chưa.

## Quy trình

1. Đọc `.claude/rules/business-rules.md` — lấy danh sách tất cả business rules.
2. Xác định rules nào áp dụng cho module $ARGUMENTS:
   - Module `products` → BR-P01 đến BR-P07
   - Module `orders` → BR-O01 đến BR-O04, BR-I01, BR-I02
   - Module `payments` → BR-PAY01 đến BR-PAY03
   - Module `auth` → BR-U01 đến BR-U04
   - Module `reviews` → BR-U05
   - Module `cart` → BR-I01 (kiểm tra stock)
   - Module `coupons/cart` → BR-C01, BR-C02

3. Đọc file service của module: `apps/api/src/modules/$ARGUMENTS/$ARGUMENTS.service.ts`
4. Với từng rule liên quan, xác định xem code đã implement chưa.

## Output format

Trả về bảng:

| Rule | Mô tả | Status | Vị trí / Ghi chú |
|------|--------|--------|------------------|
| BR-P01 | SKU unique (kể cả soft-deleted) | ✅ Đã implement | service.ts:45 |
| BR-P06 | Soft-delete filter | ❌ Thiếu | findMany không có deletedAt filter |
| BR-I02 | Inventory transaction | ⚠️ Một phần | Có update stock nhưng chưa log transaction |

Sau đó liệt kê những gì cần fix.
