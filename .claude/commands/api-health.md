Kiểm tra nhanh toàn bộ services mà API phụ thuộc vào: PostgreSQL, Redis, API server.

Dev server phải đang chạy tại `http://localhost:4000`.

## Quy trình

### 1. API Server
```bash
curl -s --max-time 3 http://localhost:4000/health
```
- ✅ Response 200 → server đang chạy.
- ❌ Connection refused / timeout → server chưa start. Hướng dẫn: `cd apps/api && npm run dev`.

### 2. PostgreSQL (qua Prisma)
Đọc `apps/api/src/config/database.ts` để hiểu cách kết nối.

Gọi endpoint health check nếu có, hoặc thử raw query:
```bash
curl -s http://localhost:4000/health/db
```
Nếu không có health endpoint, kiểm tra `DATABASE_URL` trong `.env` và thử:
```bash
cd apps/api && npx prisma db execute --stdin <<< "SELECT 1;" 2>&1
```

### 3. Redis
Đọc `apps/api/src/config/redis.ts`.
```bash
cd apps/api && node -e "
const Redis = require('ioredis');
const r = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
r.ping().then(v => { console.log('Redis:', v); process.exit(0); }).catch(e => { console.error('Redis error:', e.message); process.exit(1); });
" 2>&1
```

### 4. Prisma migrations
```bash
cd apps/api && npx prisma migrate status 2>&1
```
Kiểm tra có migrations nào chưa apply không.

## Output

```
API Server    ✅ Running (200 OK)
PostgreSQL    ✅ Connected
Redis         ✅ Connected (PONG)
Migrations    ✅ Up to date (5 applied)
```

Hoặc nếu có lỗi:
```
API Server    ❌ Not running — chạy: npm run dev
PostgreSQL    ⚠️ Cannot connect — kiểm tra DATABASE_URL
Redis         ❌ Error — kiểm tra REDIS_URL
Migrations    ⚠️ 1 pending — chạy: npm run db:migrate
```
