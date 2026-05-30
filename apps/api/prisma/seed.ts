import bcrypt from 'bcryptjs';
import { PrismaClient, InventoryTxType, PostStatus } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// ─── Roles ────────────────────────────────────────────────────────────────────
const ROLES = [
  { name: 'SUPER_ADMIN', displayName: 'Super Administrator', isSystem: true },
  { name: 'ADMIN',       displayName: 'Administrator',       isSystem: true },
  { name: 'WAREHOUSE',   displayName: 'Warehouse Staff',     isSystem: true },
  { name: 'SUPPORT',     displayName: 'Customer Support',    isSystem: true },
  { name: 'CONTENT',     displayName: 'Content Editor',      isSystem: true },
  { name: 'CUSTOMER',    displayName: 'Customer',            isSystem: true },
];

// ─── Permissions ─────────────────────────────────────────────────────────────
const PERMISSIONS = [
  { resource: 'products',   action: 'read'    },
  { resource: 'products',   action: 'create'  },
  { resource: 'products',   action: 'update'  },
  { resource: 'products',   action: 'delete'  },
  { resource: 'categories', action: 'read'    },
  { resource: 'categories', action: 'create'  },
  { resource: 'categories', action: 'update'  },
  { resource: 'categories', action: 'delete'  },
  { resource: 'orders',     action: 'read'    },
  { resource: 'orders',     action: 'create'  },
  { resource: 'orders',     action: 'update'  },
  { resource: 'orders',     action: 'cancel'  },
  { resource: 'users',      action: 'read'    },
  { resource: 'users',      action: 'create'  },
  { resource: 'users',      action: 'update'  },
  { resource: 'users',      action: 'delete'  },
  { resource: 'inventory',  action: 'read'    },
  { resource: 'inventory',  action: 'update'  },
  { resource: 'reviews',    action: 'read'    },
  { resource: 'reviews',    action: 'approve' },
  { resource: 'reviews',    action: 'reject'  },
  { resource: 'blog',       action: 'read'    },
  { resource: 'blog',       action: 'create'  },
  { resource: 'blog',       action: 'update'  },
  { resource: 'blog',       action: 'delete'  },
  { resource: 'settings',   action: 'read'    },
  { resource: 'settings',   action: 'update'  },
  { resource: 'admin',      action: 'access'  },
];

// ─── Role → Permission keys ───────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map(p => `${p.resource}:${p.action}`),
  ADMIN: [
    'products:read', 'products:create', 'products:update', 'products:delete',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'orders:read', 'orders:update', 'orders:cancel',
    'users:read', 'users:create', 'users:update',
    'inventory:read', 'inventory:update',
    'reviews:read', 'reviews:approve', 'reviews:reject',
    'blog:read', 'blog:create', 'blog:update', 'blog:delete',
    'settings:read', 'admin:access',
  ],
  WAREHOUSE: [
    'inventory:read', 'inventory:update',
    'orders:read', 'products:read', 'categories:read',
  ],
  SUPPORT: [
    'orders:read', 'orders:cancel',
    'users:read',
    'products:read', 'categories:read',
    'reviews:read',
  ],
  CONTENT: [
    'blog:read', 'blog:create', 'blog:update', 'blog:delete',
    'products:read', 'categories:read',
  ],
  CUSTOMER: [
    'orders:create', 'orders:read',
    'reviews:read',
    'products:read', 'categories:read',
  ],
};

// ─── Staff users (get AdminAccount) ──────────────────────────────────────────
const STAFF_USERS = [
  { email: 'superadmin@myshop.dev', fullName: 'Super Admin',     password: 'SuperAdmin@123!', role: 'SUPER_ADMIN', employeeCode: 'SA-001',  department: 'Management' },
  { email: 'admin@myshop.dev',      fullName: 'Admin User',      password: 'Admin@123!',      role: 'ADMIN',       employeeCode: 'ADM-001', department: 'Operations' },
  { email: 'warehouse@myshop.dev',  fullName: 'Warehouse Staff', password: 'Warehouse@123!',  role: 'WAREHOUSE',   employeeCode: 'WH-001',  department: 'Warehouse'  },
  { email: 'support@myshop.dev',    fullName: 'Support Staff',   password: 'Support@123!',    role: 'SUPPORT',     employeeCode: 'SUP-001', department: 'Support'    },
];

// ─── Customer users ───────────────────────────────────────────────────────────
const CUSTOMER_USERS = [
  { email: 'customer@myshop.dev',  fullName: 'Test Customer',   password: 'Customer@123!' },
  { email: 'customer2@myshop.dev', fullName: 'Test Customer 2', password: 'Customer@123!' },
];

// ─── System Configs ────────────────────────────────────────────────────────────
const SYSTEM_CONFIGS = [
  { key: 'site.name',                  value: 'My Shop Online', dataType: 'string',  group: 'general',  description: 'Tên website',                         isPublic: true  },
  { key: 'site.locale_default',        value: 'en',             dataType: 'string',  group: 'general',  description: 'Ngôn ngữ mặc định',                   isPublic: true  },
  { key: 'site.currency_default',      value: 'USD',            dataType: 'string',  group: 'general',  description: 'Đơn vị tiền tệ mặc định',             isPublic: true  },
  { key: 'site.maintenance_mode',      value: 'false',          dataType: 'boolean', group: 'general',  description: 'Chế độ bảo trì',                      isPublic: false },
  { key: 'shipping.free_threshold',    value: '50',             dataType: 'number',  group: 'shipping', description: 'Ngưỡng miễn phí vận chuyển (USD)',     isPublic: true  },
  { key: 'payment.stripe_enabled',     value: 'true',           dataType: 'boolean', group: 'payment',  description: 'Bật/tắt thanh toán Stripe',            isPublic: false },
  { key: 'payment.vnpay_enabled',      value: 'true',           dataType: 'boolean', group: 'payment',  description: 'Bật/tắt thanh toán VNPay',             isPublic: false },
  { key: 'order.max_items',            value: '50',             dataType: 'number',  group: 'orders',   description: 'Số item tối đa trong 1 đơn hàng',     isPublic: false },
  { key: 'media.max_file_size_mb',     value: '5',              dataType: 'number',  group: 'media',    description: 'Kích thước file upload tối đa (MB)',   isPublic: false },
  { key: 'auth.access_token_ttl_s',   value: '900',            dataType: 'number',  group: 'auth',     description: 'Thời hạn access token (giây)',         isPublic: false },
  { key: 'auth.refresh_token_ttl_d',  value: '30',             dataType: 'number',  group: 'auth',     description: 'Thời hạn refresh token (ngày)',        isPublic: false },
];

// ─── Feature Flags ─────────────────────────────────────────────────────────────
const FEATURE_FLAGS = [
  { key: 'feature.review_system',  isEnabled: true,  description: 'Hệ thống đánh giá sản phẩm' },
  { key: 'feature.wishlist',       isEnabled: true,  description: 'Danh sách yêu thích'         },
  { key: 'feature.blog',           isEnabled: true,  description: 'Module Blog'                  },
  { key: 'feature.coupon',         isEnabled: false, description: 'Hệ thống mã giảm giá'        },
  { key: 'feature.multi_currency', isEnabled: false, description: 'Hỗ trợ đa tiền tệ'           },
];

// ─── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: 'electronics', name: 'Điện tử',    sortOrder: 1 },
  { slug: 'fashion',     name: 'Thời trang',  sortOrder: 2 },
  { slug: 'home-living', name: 'Gia dụng',    sortOrder: 3 },
  { slug: 'books',       name: 'Sách',        sortOrder: 4 },
  { slug: 'sports',      name: 'Thể thao',    sortOrder: 5 },
];

// ─── Products ─────────────────────────────────────────────────────────────────
interface ProductSeed {
  sku: string;
  slug: string;
  categorySlug: string;
  basePrice: number;
  stockQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  translation: { name: string; description: string };
  images: Array<{ url: string; altText: string; isPrimary?: boolean }>;
  prices: Array<{ currency: string; amount: number; compareAt?: number | null }>;
  variants: Array<{ sku: string; optionName: string; optionValue: string; priceModifier: number; stockQuantity: number }>;
}

const PRODUCTS: ProductSeed[] = [
  {
    sku: 'IPHONE15PRO-256',
    slug: 'iphone-15-pro-256gb',
    categorySlug: 'electronics',
    basePrice: 999,
    stockQuantity: 50,
    isActive: true,
    isFeatured: true,
    translation: {
      name: 'iPhone 15 Pro 256GB',
      description: 'Apple iPhone 15 Pro với chip A17 Pro, bộ nhớ 256GB, thiết kế Titanium cao cấp.',
    },
    images: [
      { url: 'https://placehold.co/800x800/1a1a1a/ffffff?text=iPhone+15+Pro', altText: 'iPhone 15 Pro - Mặt trước', isPrimary: true },
      { url: 'https://placehold.co/800x800/2a2a2a/ffffff?text=iPhone+15+Pro+Back', altText: 'iPhone 15 Pro - Mặt sau' },
    ],
    prices: [{ currency: 'USD', amount: 999, compareAt: 1099 }],
    variants: [
      { sku: 'IPHONE15PRO-256-BLK', optionName: 'Color', optionValue: 'Black Titanium',      priceModifier: 0,   stockQuantity: 20 },
      { sku: 'IPHONE15PRO-256-WHT', optionName: 'Color', optionValue: 'White Titanium',      priceModifier: 0,   stockQuantity: 15 },
      { sku: 'IPHONE15PRO-512-BLK', optionName: 'Color', optionValue: 'Black Titanium 512GB', priceModifier: 200, stockQuantity: 15 },
    ],
  },
  {
    sku: 'GALAXY-S24-128',
    slug: 'samsung-galaxy-s24-128gb',
    categorySlug: 'electronics',
    basePrice: 799,
    stockQuantity: 40,
    isActive: true,
    isFeatured: true,
    translation: {
      name: 'Samsung Galaxy S24 128GB',
      description: 'Samsung Galaxy S24 với Snapdragon 8 Gen 3, camera AI và màn hình Dynamic AMOLED 2X.',
    },
    images: [
      { url: 'https://placehold.co/800x800/0a2a5e/ffffff?text=Galaxy+S24', altText: 'Samsung Galaxy S24', isPrimary: true },
    ],
    prices: [{ currency: 'USD', amount: 799, compareAt: 899 }],
    variants: [
      { sku: 'GALAXY-S24-128-BLK', optionName: 'Color', optionValue: 'Onyx Black', priceModifier: 0, stockQuantity: 20 },
      { sku: 'GALAXY-S24-128-VLT', optionName: 'Color', optionValue: 'Violet',     priceModifier: 0, stockQuantity: 20 },
    ],
  },
  {
    sku: 'TSHIRT-BASIC-UNISEX',
    slug: 'basic-unisex-tshirt',
    categorySlug: 'fashion',
    basePrice: 29.99,
    stockQuantity: 120,
    isActive: true,
    isFeatured: false,
    translation: {
      name: 'Basic Unisex T-Shirt',
      description: 'Áo thun unisex cotton 100%, thoáng mát, nhiều màu sắc. Phù hợp mặc hàng ngày.',
    },
    images: [
      { url: 'https://placehold.co/800x800/f5f5f5/333333?text=Basic+TShirt', altText: 'Basic Unisex T-Shirt', isPrimary: true },
    ],
    prices: [{ currency: 'USD', amount: 29.99 }],
    variants: [
      { sku: 'TSHIRT-BASIC-S-BLK',  optionName: 'Size/Color', optionValue: 'S / Black', priceModifier: 0, stockQuantity: 30 },
      { sku: 'TSHIRT-BASIC-M-BLK',  optionName: 'Size/Color', optionValue: 'M / Black', priceModifier: 0, stockQuantity: 40 },
      { sku: 'TSHIRT-BASIC-L-BLK',  optionName: 'Size/Color', optionValue: 'L / Black', priceModifier: 0, stockQuantity: 50 },
    ],
  },
  {
    sku: 'COFFEE-MAKER-12CUP',
    slug: 'coffee-maker-12-cup',
    categorySlug: 'home-living',
    basePrice: 79.99,
    stockQuantity: 30,
    isActive: true,
    isFeatured: false,
    translation: {
      name: 'Coffee Maker 12-Cup',
      description: 'Máy pha cà phê 12 tách có hẹn giờ, giữ ấm và tự động tắt sau 2 giờ.',
    },
    images: [
      { url: 'https://placehold.co/800x800/4a3728/ffffff?text=Coffee+Maker', altText: 'Coffee Maker 12-Cup', isPrimary: true },
    ],
    prices: [{ currency: 'USD', amount: 79.99, compareAt: 99.99 }],
    variants: [
      { sku: 'COFFEE-12CUP-BLK', optionName: 'Color', optionValue: 'Black',  priceModifier: 0, stockQuantity: 15 },
      { sku: 'COFFEE-12CUP-SLV', optionName: 'Color', optionValue: 'Silver', priceModifier: 5, stockQuantity: 15 },
    ],
  },
  {
    sku: 'YOGA-MAT-6MM',
    slug: 'yoga-mat-6mm-non-slip',
    categorySlug: 'sports',
    basePrice: 39.99,
    stockQuantity: 60,
    isActive: true,
    isFeatured: false,
    translation: {
      name: 'Yoga Mat 6mm Non-Slip',
      description: 'Thảm yoga dày 6mm chống trơn trượt, có đường kẻ căn chỉnh, kèm dây đai mang.',
    },
    images: [
      { url: 'https://placehold.co/800x800/5d9b84/ffffff?text=Yoga+Mat', altText: 'Yoga Mat 6mm Non-Slip', isPrimary: true },
    ],
    prices: [{ currency: 'USD', amount: 39.99 }],
    variants: [
      { sku: 'YOGA-6MM-BLU', optionName: 'Color', optionValue: 'Ocean Blue', priceModifier: 0, stockQuantity: 30 },
      { sku: 'YOGA-6MM-PNK', optionName: 'Color', optionValue: 'Rose Pink',  priceModifier: 0, stockQuantity: 30 },
    ],
  },
];

// ─── Post Categories ──────────────────────────────────────────────────────────
const POST_CATEGORIES = [
  { slug: 'tech-news',  name: 'Tech News',  sortOrder: 1 },
  { slug: 'lifestyle',  name: 'Lifestyle',  sortOrder: 2 },
  { slug: 'promotions', name: 'Promotions', sortOrder: 3 },
];

// ─── Blog Posts ───────────────────────────────────────────────────────────────
interface PostSeed {
  slug: string;
  categorySlug: string;
  status: PostStatus;
  isFeatured: boolean;
  publishedAt: Date | null;
  translation: { title: string; content: string; excerpt: string };
}

const POSTS: PostSeed[] = [
  {
    slug: 'welcome-to-myshop-online',
    categorySlug: 'tech-news',
    status: PostStatus.published,
    isFeatured: true,
    publishedAt: new Date(),
    translation: {
      title: 'Welcome to My Shop Online!',
      content: 'We are excited to launch My Shop Online — your one-stop destination for electronics, fashion, home goods, and more. Shop with confidence with our secure checkout, fast delivery, and dedicated support team.',
      excerpt: 'My Shop Online is now live. Discover amazing products at great prices.',
    },
  },
  {
    slug: 'summer-sale-2025',
    categorySlug: 'promotions',
    status: PostStatus.published,
    isFeatured: false,
    publishedAt: new Date(),
    translation: {
      title: 'Summer Sale 2025 — Up to 30% Off',
      content: 'Our biggest summer sale is here! Get up to 30% off on electronics, fashion, and home goods. Limited time offer — shop now before stocks run out. Use code SUMMER30 at checkout.',
      excerpt: 'Up to 30% off on selected items. Limited time offer.',
    },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Roles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`✅ Roles: ${ROLES.length} records`);

  // 2. Permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where:  { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ Permissions: ${PERMISSIONS.length} records`);

  // 3. Role-Permission mapping
  let rpCount = 0;
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const permKey of permKeys) {
      const [resource, action] = permKey.split(':');
      const perm = await prisma.permission.findUnique({
        where: { resource_action: { resource, action } },
      });
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
      rpCount++;
    }
  }
  console.log(`✅ Role-Permissions: ${rpCount} records`);

  // 4. Staff users + AdminAccount
  for (const u of STAFF_USERS) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, fullName: u.fullName, isVerified: true, isActive: true },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });
    await prisma.userRole.upsert({
      where:  { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id, isActive: true },
    });
    await prisma.adminAccount.upsert({
      where:  { userId: user.id },
      update: {},
      create: { userId: user.id, employeeCode: u.employeeCode, department: u.department, isActive: true },
    });
    console.log(`  ↳ ${u.email} (${u.role}, ${u.employeeCode})`);
  }
  console.log(`✅ Staff users: ${STAFF_USERS.length} records`);

  // 5. Customer users
  for (const u of CUSTOMER_USERS) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, fullName: u.fullName, isVerified: true, isActive: true },
    });
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } });
    await prisma.userRole.upsert({
      where:  { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id, isActive: true },
    });
  }
  console.log(`✅ Customer users: ${CUSTOMER_USERS.length} records`);

  // Get superadmin for actor/auditor references
  const superAdmin = await prisma.user.findUniqueOrThrow({ where: { email: 'superadmin@myshop.dev' } });

  // 6. System Configs
  for (const cfg of SYSTEM_CONFIGS) {
    await prisma.systemConfig.upsert({
      where:  { key: cfg.key },
      update: {},
      create: { ...cfg, updatedBy: superAdmin.id },
    });
  }
  console.log(`✅ System configs: ${SYSTEM_CONFIGS.length} records`);

  // 7. Feature Flags
  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where:  { key: flag.key },
      update: {},
      create: { ...flag, updatedBy: superAdmin.id },
    });
  }
  console.log(`✅ Feature flags: ${FEATURE_FLAGS.length} records`);

  // 8. Categories
  const catMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true, createdBy: superAdmin.id },
    });
    catMap[cat.slug] = created.id;
  }
  console.log(`✅ Categories: ${CATEGORIES.length} records`);

  // 9. Products (with translations, images, prices, variants, inventory)
  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where:  { sku: p.sku },
      update: {},
      create: {
        sku:           p.sku,
        slug:          p.slug,
        categoryId:    catMap[p.categorySlug],
        basePrice:     p.basePrice,
        stockQuantity: p.stockQuantity,
        isActive:      p.isActive,
        isFeatured:    p.isFeatured,
        currency:      'USD',
        createdBy:     superAdmin.id,
      },
    });

    // Translation (EN)
    await prisma.productTranslation.upsert({
      where:  { productId_locale: { productId: product.id, locale: 'en' } },
      update: {},
      create: {
        productId:   product.id,
        locale:      'en',
        name:        p.translation.name,
        description: p.translation.description,
      },
    });

    // Images — findFirst + create for idempotency (no unique constraint on images)
    for (let i = 0; i < p.images.length; i++) {
      const img = p.images[i];
      const existing = await prisma.productImage.findFirst({
        where: { productId: product.id, url: img.url },
      });
      if (!existing) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url:       img.url,
            altText:   img.altText,
            isPrimary: img.isPrimary ?? false,
            sortOrder: i,
            createdBy: superAdmin.id,
          },
        });
      }
    }

    // Prices — findFirst + create (countryCode is nullable, upsert on compound null is unreliable)
    for (const price of p.prices) {
      const existing = await prisma.productPrice.findFirst({
        where: { productId: product.id, currency: price.currency, countryCode: null },
      });
      if (!existing) {
        await prisma.productPrice.create({
          data: {
            productId:   product.id,
            currency:    price.currency,
            amount:      price.amount,
            compareAt:   price.compareAt ?? null,
            updatedBy:   superAdmin.id,
          },
        });
      }
    }

    // Variants + initial inventory transaction (BR-I02)
    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where:  { sku: v.sku },
        update: {},
        create: {
          productId:     product.id,
          sku:           v.sku,
          optionName:    v.optionName,
          optionValue:   v.optionValue,
          priceModifier: v.priceModifier,
          stockQuantity: v.stockQuantity,
          isActive:      true,
          createdBy:     superAdmin.id,
        },
      });

      // Initial stock purchase transaction
      const existingTx = await prisma.inventoryTransaction.findFirst({
        where: { variantId: variant.id, type: InventoryTxType.purchase },
      });
      if (!existingTx) {
        await prisma.inventoryTransaction.create({
          data: {
            productId:      product.id,
            variantId:      variant.id,
            actorId:        superAdmin.id,
            type:           InventoryTxType.purchase,
            quantityChange: v.stockQuantity,
            quantityBefore: 0,
            quantityAfter:  v.stockQuantity,
            note:           'Initial stock — seed data',
          },
        });
      }
    }

    console.log(`  ↳ ${p.translation.name} (${p.variants.length} variants)`);
  }
  console.log(`✅ Products: ${PRODUCTS.length} records`);

  // 10. Post Categories
  const postCatMap: Record<string, string> = {};
  for (const pc of POST_CATEGORIES) {
    const created = await prisma.postCategory.upsert({
      where:  { slug: pc.slug },
      update: {},
      create: { ...pc, isActive: true, createdBy: superAdmin.id },
    });
    postCatMap[pc.slug] = created.id;
  }
  console.log(`✅ Post categories: ${POST_CATEGORIES.length} records`);

  // 11. Blog Posts (with translations)
  for (const post of POSTS) {
    const created = await prisma.post.upsert({
      where:  { slug: post.slug },
      update: {},
      create: {
        slug:        post.slug,
        categoryId:  postCatMap[post.categorySlug],
        authorId:    superAdmin.id,
        status:      post.status,
        isFeatured:  post.isFeatured,
        publishedAt: post.publishedAt,
      },
    });
    await prisma.postTranslation.upsert({
      where:  { postId_locale: { postId: created.id, locale: 'en' } },
      update: {},
      create: {
        postId:  created.id,
        locale:  'en',
        title:   post.translation.title,
        content: post.translation.content,
        excerpt: post.translation.excerpt,
      },
    });
    console.log(`  ↳ "${post.translation.title}"`);
  }
  console.log(`✅ Blog posts: ${POSTS.length} records`);

  console.log('\n🎉 Seed hoàn tất!');
  console.log('\n📋 Tài khoản đăng nhập:');
  console.log('  superadmin@myshop.dev  /  SuperAdmin@123!  (SUPER_ADMIN)');
  console.log('  admin@myshop.dev       /  Admin@123!       (ADMIN)');
  console.log('  warehouse@myshop.dev   /  Warehouse@123!   (WAREHOUSE)');
  console.log('  support@myshop.dev     /  Support@123!     (SUPPORT)');
  console.log('  customer@myshop.dev    /  Customer@123!    (CUSTOMER)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
