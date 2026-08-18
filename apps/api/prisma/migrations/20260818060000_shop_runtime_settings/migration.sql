-- Public payment flags so the storefront can hide disabled gateways.
UPDATE "system_configs"
SET "isPublic" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" IN ('payment.stripe_enabled', 'payment.vnpay_enabled');

INSERT INTO "system_configs" ("id", "key", "value", "dataType", "group", "description", "isPublic", "isEncrypted", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'shipping.flat_fee_usd', '0', 'number', 'shipping', 'Phí vận chuyển cố định (USD). 0 = miễn phí ship.', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment.cod_enabled', 'true', 'boolean', 'payment', 'Bật/tắt thanh toán COD', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment.stripe_locales', 'vi,en', 'string', 'payment', 'Locale được dùng Stripe (vi,en)', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment.vnpay_locales', 'vi', 'string', 'payment', 'Locale được dùng VNPay (vi,en)', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'payment.cod_locales', 'vi', 'string', 'payment', 'Locale được dùng COD (vi,en)', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'order.return_window_days', '7', 'number', 'orders', 'Số ngày đổi/trả sau khi giao', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'checkout.default_country', 'VN', 'string', 'checkout', 'Quốc gia mặc định lúc checkout', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'checkout.allowed_countries', 'VN,US', 'string', 'checkout', 'Danh sách quốc gia (ISO-2, cách nhau bởi dấu phẩy)', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'locale.vi_currency', 'VND', 'string', 'general', 'Tiền tệ hiển thị khi ngôn ngữ VI', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'locale.en_currency', 'USD', 'string', 'general', 'Tiền tệ hiển thị khi ngôn ngữ EN', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'admin.dashboard_currency', 'VND', 'string', 'general', 'Tiền tệ hiển thị doanh thu trên dashboard', true, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'api.rate_limit_max', '200', 'number', 'api', 'Số request tối đa trong một cửa sổ', false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'api.rate_limit_window_min', '15', 'number', 'api', 'Độ dài cửa sổ rate limit (phút)', false, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
