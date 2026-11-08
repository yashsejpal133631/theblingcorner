# The Bling Corner — Missing E-Commerce Features (Master To-Do)

> **Purpose:** One single file listing everything missing, broken, risky, or not production-ready in this e-commerce project.
> **Audited on:** 8 Nov 2026
> **Audited against:** current `src/`, `prisma/schema.prisma`, `prisma/seed.ts`, `package.json`
> **How to use:** Do not try to build everything at once. Work top-to-bottom. `P0` items must be fixed before taking real orders.

**Priority legend**

| Tag | Meaning |
| :-- | :-- |
| `P0` | Blocker. Wrong money, lost stock, fake payment success, security hole. Fix before launch. |
| `P1` | Required for a normal e-commerce store. Customers/vendor will notice it missing. |
| `P2` | Growth, polish, SEO, automation, nice-to-have. |

**Status legend**

- `[ ]` Not started
- `[~]` Partially exists
- `[x]` Done

---

## 0. What Already Exists (so we don't rebuild it)

**Pages currently working**

- [x] Home `/` (featured products + categories)
- [x] Catalog `/catalog` (search, category, sort, in-stock filter)
- [x] Product detail `/product/[slug]` (gallery, variants, stock, reviews)
- [x] Cart `/cart`
- [x] Slide-over cart drawer
- [x] Checkout `/checkout` (address + pincode shipping + Razorpay)
- [x] Checkout success `/checkout/success`
- [x] Public order tracking `/track-order`
- [x] Login `/login`, Register `/register`
- [x] Vendor overview `/vendor`
- [x] Vendor orders `/vendor/orders`
- [x] Vendor products/stock `/vendor/products`
- [x] Admin users + audit log `/admin`

**APIs currently working**

- [x] `POST /api/auth/register`, `/login`, `/logout`, `GET /api/auth/me`
- [x] `GET /api/products`, `POST /api/products`
- [x] `GET|PUT|DELETE /api/products/[slug]`
- [x] `GET /api/categories`
- [x] `POST /api/checkout/create-order`
- [x] `POST /api/payments/verify`, `POST /api/payments/webhook`
- [x] `GET|PATCH /api/orders/[orderNumber]`
- [x] `GET|POST /api/reviews`
- [x] `POST /api/shipping/calculate`
- [x] `POST /api/upload`
- [x] `GET /api/admin/users`, `PATCH /api/admin/users`, `GET /api/admin/audit`
- [x] `GET /api/vendor/orders`, `GET /api/vendor/stats`

**Database models currently present**

`User`, `Address`, `Category`, `Product`, `ProductImage`, `ProductVariant`, `Order`, `OrderItem`, `Payment`, `ShippingRateRule`, `Review`, `AuditLog`

**Tests currently present**

- [x] 64 unit tests across auth, products, cart, shipping, checkout, orders, admin/vendor, reviews
- [ ] No integration/API tests
- [ ] No end-to-end (Playwright) tests
- [ ] No CI pipeline

---

## 1. P0 — Critical Bugs & Security Holes

> These are the most important items in this file. Several of them can create fake paid orders with zero money received, or sell stock that does not exist.

### 1.1 Fake/fallback data is active in production code paths

- [ ] **Remove production fallback/mock data everywhere**
  - File: `src/app/api/checkout/create-order/route.ts`
    - `FALLBACK_PRODUCTS_MAP` at top.
    - Unknown `productId` silently becomes a fake product priced `₹249` with `stockQuantity: 99`.
    - DB transaction failure is swallowed and a fake `order_${Date.now()}` is returned as success.
  - File: `src/app/api/payments/verify/route.ts`
    - If the order is not found in DB, it still returns `{ success: true }` ("dev test simulation").
  - File: `src/app/api/orders/[orderNumber]/route.ts`
    - Any order number starting with `TBC-` returns a fully fake paid order.
  - File: `src/app/api/vendor/orders/route.ts`
    - Returns two fake orders when DB fails.
  - File: `src/app/api/vendor/stats/route.ts`
    - Returns fake revenue `14850` when DB fails.
  - File: `src/app/api/products/route.ts` and `src/app/api/products/[slug]/route.ts`
    - Returns 7 hardcoded products when DB fails.
  - File: `src/app/api/categories/route.ts`
    - Returns 6 hardcoded categories when DB fails.
  - File: `src/app/api/reviews/route.ts`
    - Returns 2 fake reviews when DB fails.
  - File: `src/app/api/admin/users/route.ts`, `src/app/api/admin/audit/route.ts`
    - Return fake users/logs when DB fails.
  - **Fix:** In production, fail closed (`500` / `503`) and log the error. Only allow mocks when an explicit `ENABLE_MOCK_MODE=true` **and** `NODE_ENV !== "production"`. Never return fake success for money or stock operations.

- [ ] **Never trust a client product ID that is not in the DB**
  - In `create-order/route.ts`, reject the whole cart with `400` if any `productId` is not found or is inactive.
  - Do not use a default price/weight/stock for unknown IDs.

### 1.2 Inventory can go negative / oversell

- [ ] **Atomic stock check + decrement**
  - Current flow: `create-order` checks stock, but does **not** reserve or decrement it. `verify`/`webhook` decrement later with no check.
  - Two customers can pay for the same last item, and stock can go below zero.
  - **Fix:** Inside one `prisma.$transaction`, use a conditional update:
    ```ts
    const res = await tx.product.updateMany({
      where: { id: productId, stockQuantity: { gte: qty } },
      data: { stockQuantity: { decrement: qty } },
    });
    if (res.count === 0) throw new Error("OUT_OF_STOCK");
    ```
  - Or create an `InventoryReservation` model with expiry (best for Razorpay checkout windows).

- [ ] **Restock on cancel / refund**
  - `PATCH /api/orders/[orderNumber]` lets a vendor set `CANCELLED` but does not add stock back.
  - `REFUNDED` status exists in the enum but is never used.

- [ ] **Prevent double stock decrement**
  - `verify` and `webhook` can both decrement. Idempotency checks exist but must be inside the same transaction/lock.

### 1.3 Payment verification is not fully bound to the order

- [ ] **Verify the payment against the DB order, not the client payload**
  - Current `POST /api/payments/verify` accepts `orderNumber` from the browser and returns success even if no matching order/payment exists.
  - **Fix:**
    1. Find `Payment` by `gatewayOrderId = razorpay_order_id`.
    2. Ensure `payment.order.orderNumber === orderNumber`.
    3. Ensure Razorpay amount (paise) matches `order.totalAmount`.
    4. Ensure payment status is still `PENDING`.
    5. Require the authenticated user or guest email/phone to match the order (optional but recommended).
    6. Return `404`/`409` when anything mismatches.

- [ ] **Require `RAZORPAY_WEBHOOK_SECRET` in production**
  - Current webhook skips signature verification when the secret is missing or still the placeholder.
  - **Fix:** Boot-time env validation. Refuse to start in production without it.

- [ ] **Fix `crypto.timingSafeEqual` crash on length mismatch**
  - In `src/app/api/payments/webhook/route.ts`, compare buffer lengths first, then use `timingSafeEqual`.
  - Current code can throw if an attacker sends a short signature.

- [ ] **Handle more Razorpay events**
  - `payment.failed`, `payment.authorized`, `refund.created`, `refund.processed`.
  - Store every webhook payload in a `WebhookEvent` table for replay/debugging.
  - Make processing idempotent by `event.id`.

- [ ] **Add idempotency to `create-order`**
  - Double-click / retry currently creates multiple Razorpay orders and multiple `Order` rows.
  - Accept an `Idempotency-Key` header or client-generated cart hash and return the existing order.

### 1.4 Hardcoded secrets / default credentials

- [ ] **Remove hardcoded Cloudinary credentials**
  - `src/lib/cloudinary.ts` currently has real-looking fallback `cloud_name`, `api_key`, and `api_secret` in source.
  - **Action:** rotate the Cloudinary key/secret immediately, then load only from env. Do not commit secrets.

- [ ] **Remove hardcoded Supabase URL/key from source**
  - `src/lib/storage.ts` has a fallback Supabase URL and publishable key.
  - Publishable/anon keys are public by design, but hardcoding a real project is still bad practice. Use env only.

- [ ] **Remove default login bypass**
  - `src/app/api/auth/login/route.ts` lets `admin@theblingcorner.in` / a demo password and `client@...` log in even without DB records.
  - **Fix:** Remove. If demo accounts are needed, seed them properly and force password change.

- [ ] **Remove default JWT secret**
  - `src/lib/auth/jwt.ts` falls back to a public string when `NEXTAUTH_SECRET` is missing.
  - **Fix:** throw at startup in production if secret is missing or shorter than 32 chars.

- [ ] **Rotate any secret that has ever been in git history**
  - Cloudinary, Supabase, Razorpay test/live keys, DB password, JWT secret.
  - Consider `git filter-repo` if a live key was committed.

### 1.5 Public order tracking leaks

- [ ] **Do not allow full order lookup by order number only**
  - `GET /api/orders/[orderNumber]` returns the full order, address city/state/pincode, masked phone, items, and payment status to anyone who guesses a number.
  - The `TBC-*` fallback makes it worse.
  - **Fix:** Require `orderNumber + phone` OR `orderNumber + email`, OR send a signed tracking token by email/WhatsApp after payment. Add strict rate limiting.

- [ ] **Add rate limiting to all sensitive routes**
  - Currently only `login` and `register` use `checkRateLimit`.
  - Add to: `checkout/create-order`, `payments/verify`, `orders/[orderNumber]` (GET + PATCH), `reviews` POST, `upload`, `admin/*`, `vendor/*`.

- [ ] **Replace in-memory rate limiter for production**
  - `src/lib/rate-limit.ts` uses a `Map`, which is per-instance on serverless (Vercel/Firebase) and resets on redeploy.
  - Use Upstash Redis free tier, or a DB-backed limiter, or Vercel KV.

### 1.6 CSRF / headers / input limits

- [ ] **Add CSRF protection for cookie-authenticated mutations**
  - All admin/vendor/product/order/review mutations rely on an `HttpOnly` cookie with `SameSite=Lax`.
  - Add an `Origin`/`Referer` check for every non-GET route, or a double-submit token.
  - Keep `SameSite=Lax`; consider `Strict` for dashboard routes.

- [ ] **Add a Content-Security-Policy**
  - `next.config.ts` has no headers; `src/middleware.ts` sets only basic headers.
  - Add CSP allowing: Razorpay checkout, Cloudinary, Supabase, Firebase Storage, Google Fonts, Instagram embed (if added).
  - Add `X-DNS-Prefetch-Control`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`.

- [ ] **Limit upload size/type server-side**
  - `src/app/api/upload/route.ts` checks auth but not file size, MIME type, or extension.
  - Add max 5 MB, allow only `image/jpeg|png|webp|avif`, verify magic bytes if possible.

- [ ] **Add request body size limits**
  - Especially for reviews, product create/update, and checkout.

### 1.7 Data accuracy bugs found during audit

- [ ] **Vendor product thumbnails are broken**
  - `src/app/(dashboard)/vendor/products/page.tsx` expects `thumbnailUrl`, but `GET /api/products` returns `images: [{ url }]`.
  - Add `thumbnailUrl` mapping server-side, or use `p.images?.[0]?.url` in the page.

- [ ] **Order item weight is hardcoded to `80g`**
  - `GET /api/orders/[orderNumber]` and `GET /api/vendor/orders` return `weightGrams: 80` for every item.
  - Store actual item weight on `OrderItem` (add `weightGrams` column) and return it.

- [ ] **Variant is not stored on order items**
  - `OrderItem` has no `variantId` / `variantTitle`.
  - Add `variantId String?`, `variantTitle String?` to `OrderItem`, and save it at checkout.

- [ ] **Order numbers can collide**
  - `TBC-${YYYYMM}-${4 random digits}` has only 9,000 possibilities per month.
  - Use a DB sequence, `nanoid`, or retry on unique violation.

- [ ] **Review average shows `5.0` when there are zero reviews**
  - `src/app/api/reviews/route.ts` returns `averageRating: 5.0` for no reviews.
  - Return `0` and show "No reviews yet".

- [ ] **"Verified" review badge is not verified**
  - `Review.isVerified` defaults to `true`.
  - Only mark verified when the user has a `DELIVERED` order containing that product; otherwise show "Customer".

- [ ] **`DeliveryEstimator` component is never used**
  - File: `src/components/checkout/DeliveryEstimator.tsx`.
  - Add it to the product page so customers can check delivery before checkout.

- [ ] **`ShippingRateRule` table is unused**
  - `src/lib/shipping.ts` has rates hardcoded; the DB table is seeded but never read.
  - Read rates from DB with hardcoded values as a fallback, and let admin edit them.

- [ ] **`Address` model is unused**
  - Checkout stores an address snapshot JSON only; no saved addresses for logged-in customers.
  - Implement address CRUD and "save this address".

- [ ] **Catalog pagination is missing**
  - API supports `page`/`limit`, but `/catalog` never sends `page` and never loads more.
  - Only the first 12 products can ever be seen.
  - Add "Load more" or numbered pagination.

- [ ] **Product/home pages are fully client-rendered**
  - `src/app/page.tsx` and `src/app/(store)/product/[slug]/page.tsx` use `"use client"` + `useEffect` fetch.
  - Search engines and social previews get an empty shell.
  - Convert to Server Components with `generateMetadata` and JSON-LD.

- [ ] **No `error.tsx`, `not-found.tsx`, or `loading.tsx`**
  - App Router will show a generic error page. Add branded pages.

- [ ] **No metadata base / canonical / OG images**
  - Add `metadataBase` in `src/app/layout.tsx`.

---

## 2. Customer-Facing Features Missing

### 2.1 Customer account area

- [ ] `/account` dashboard (profile summary, recent orders, default address)
- [ ] `/account/orders` — order history for logged-in customers
- [ ] `/account/orders/[orderNumber]` — order detail with invoice download
- [ ] `/account/addresses` — add/edit/delete/default addresses
- [ ] `/account/profile` — edit name, phone, email
- [ ] `/account/security` — change password
- [ ] `/forgot-password` + `/reset-password`
- [ ] Email verification after registration
- [ ] Resend verification email
- [ ] Delete account / data request (DPDP Act)
- [ ] Link "My Account" in Navbar to `/account` when logged in, `/login` when not
- [ ] Show user name + logout menu in Navbar (currently always shows `/login`)

**APIs needed**

- [ ] `GET /api/orders/user` — current user's orders
- [ ] `GET|POST|PATCH|DELETE /api/addresses`
- [ ] `GET|PATCH /api/account`
- [ ] `POST /api/account/password`
- [ ] `POST /api/auth/forgot-password`
- [ ] `POST /api/auth/reset-password`
- [ ] `POST /api/auth/verify-email`
- [ ] `DELETE /api/account`

### 2.2 Cart & checkout

- [ ] Coupon / discount code input (currently none)
- [ ] Coupon validation API: `POST /api/coupons/validate`
- [ ] Show discount in cart, checkout, order, invoice
- [ ] Free-shipping threshold (optional business rule)
- [ ] Save for later / move to wishlist
- [ ] Cart stock re-validation on open and checkout
- [ ] Cross-device cart (currently `localStorage` only)
- [ ] Gift wrap option + gift message
- [ ] Order notes (API accepts `notes`, but no field in checkout UI)
- [ ] Terms & Privacy checkbox at checkout
- [ ] Saved address picker at checkout
- [ ] Billing address separate from shipping (for GST invoice)
- [ ] GSTIN field for business buyers
- [ ] "Buy Now" button on product page (go straight to checkout)
- [ ] Payment retry when Razorpay fails/cancels
- [ ] Show clear payment failure reason
- [ ] Prevent checkout when cart has inactive/deleted products
- [ ] Minimum order value (if client wants)
- [ ] Serviceability check at cart/PDP (use `DeliveryEstimator`)

### 2.3 Product page

- [ ] Server-side rendering + SEO metadata
- [ ] Image zoom / lightbox
- [ ] Multiple images management (vendor can upload multiple, reorder, delete)
- [ ] Variant selector with per-variant price, stock, and image
- [ ] Disable out-of-stock variants
- [ ] Size guide / care instructions
- [ ] "Notify me when back in stock" (email capture)
- [ ] Wishlist / save for later button
- [ ] Share buttons (WhatsApp, Instagram, copy link)
- [ ] Frequently bought together / upsell
- [ ] Recently viewed products
- [ ] Customer Q&A section
- [ ] Review photos (customer uploads)
- [ ] Review helpful/unhelpful voting
- [ ] Review moderation (approve before publish)
- [ ] One review per customer per product
- [ ] Custom name input for personalized bracelets
- [ ] Estimated delivery by pincode on PDP
- [ ] Breadcrumb JSON-LD
- [ ] Product JSON-LD (`Product`, `Offer`, `AggregateRating`)
- [ ] Stock urgency ("Only 2 left") already exists — good
- [ ] Preorder/backorder flag (optional)

### 2.4 Search & discovery

- [ ] Dedicated `/search` page with query, filters, results count
- [ ] Search suggestions / autocomplete
- [ ] Search by category, price, availability, rating
- [ ] Price range filter
- [ ] Sort by popularity / rating / newest
- [ ] Pagination or infinite scroll (currently missing)
- [ ] "No results" suggestions / popular categories
- [ ] Search analytics (what people search and don't find)
- [ ] Collections / curated drops (e.g. "New Arrivals", "Under ₹199", "Best Sellers")
- [ ] Tags (e.g. `y2k`, `pastel`, `handmade`, `gift`)

### 2.5 Orders, tracking & after-sales

- [ ] Invoice / receipt PDF download
- [ ] Order confirmation page fetches real order data (currently only reads `orderNumber` from URL)
- [ ] Email confirmation with invoice attached
- [ ] WhatsApp order confirmation + dispatch notification
- [ ] Track by `orderNumber + phone` (more private than order number only)
- [ ] Cancel order request (only before `SHIPPED`)
- [ ] Return / exchange request
- [ ] Refund status visible to customer
- [ ] Reorder button
- [ ] Delivery address change before dispatch (support flow)
- [ ] Courier tracking link (not just AWB number)
- [ ] Order status timeline stored with timestamps (currently only current status)
- [ ] Downloadable GST invoice (if registered)

### 2.6 Trust, content & legal pages

- [ ] `/about`
- [ ] `/contact` with form + WhatsApp + email + Instagram
- [ ] `/faq`
- [ ] `/shipping-policy`
- [ ] `/return-refund-policy`
- [ ] `/privacy-policy`
- [ ] `/terms-and-conditions`
- [ ] `/cookie-policy`
- [ ] Cookie consent banner (India DPDP + basic GDPR if international)
- [ ] Business address, phone, email, GSTIN in footer
- [ ] Grievance officer / support hours (India compliance)
- [ ] Testimonials / customer photos
- [ ] Instagram feed or UGC gallery
- [ ] Size/care guide page
- [ ] Blog / journal (optional, good for SEO)
- [ ] Newsletter signup + double opt-in
- [ ] Contact form API + spam protection

### 2.7 UX / accessibility / PWA

- [ ] Global `not-found.tsx`
- [ ] Global `error.tsx` with retry
- [ ] Route-level `loading.tsx` skeletons
- [ ] Toast system for add-to-cart, copy, errors (currently mostly inline)
- [ ] Accessible focus rings and keyboard navigation
- [ ] WCAG 2.1 AA audit (contrast, labels, aria)
- [ ] Respect `prefers-reduced-motion`
- [ ] PWA manifest + icons + install prompt
- [ ] Offline page
- [ ] Sticky mobile bottom nav (Home / Shop / Cart / Account)
- [ ] Mobile in-app browser testing (Instagram, WhatsApp, Facebook)
- [ ] 360px / 768px / 1024px / 1440px QA
- [ ] Dark mode (optional)
- [ ] 404 search suggestion
- [ ] Image `sizes`/`priority` audit

---

## 3. Vendor / Store Owner Dashboard Missing

### 3.1 Orders

- [ ] Order detail page `/vendor/orders/[orderNumber]`
- [ ] Print invoice
- [ ] Print packing slip / shipping label
- [ ] Status history timeline
- [ ] Filter by status (exists), date range, search by customer/order
- [ ] Pagination
- [ ] Bulk status update
- [ ] Cancel + restock
- [ ] Refund via Razorpay
- [ ] Return/exchange queue
- [ ] CSV export
- [ ] Internal notes per order
- [ ] Courier tracking URL field
- [ ] Mark paid manually (admin only, audited)
- [ ] Email/WhatsApp customer from order page
- [ ] Validate allowed status transitions (state machine)

### 3.2 Products & inventory

- [ ] Multiple images upload + reorder + delete
- [ ] Variant CRUD (add/edit/delete variants with price/stock/SKU)
- [ ] Category management (create/edit/delete/reorder)
- [ ] Bulk price/stock update
- [ ] Archive/deactivate product (API exists, no UI)
- [ ] Delete product (soft delete with confirmation)
- [ ] Stock movement history (who changed what and when)
- [ ] Low-stock threshold per product
- [ ] Low-stock email/WhatsApp alert
- [ ] SKU generator
- [ ] Cost price + margin display
- [ ] Product SEO fields (meta title, meta description, slug edit)
- [ ] Product tags/collections
- [ ] Product dimensions (for courier)
- [ ] HSN code (GST invoice)
- [ ] Draft/published state
- [ ] Featured toggle
- [ ] Duplicate product
- [ ] Search/filter products
- [ ] Pagination

### 3.3 Shipping

- [ ] Shipping rate editor UI (DB table already exists)
- [ ] Pickup address / origin pincode setting (currently hardcoded Maharashtra/Mumbai)
- [ ] Courier partner list management
- [ ] Weight slab editor
- [ ] Free shipping rule
- [ ] Serviceable pincode list / exclusions
- [ ] Packaging weight buffer (e.g. +20g)
- [ ] Shipping label generation
- [ ] Pickup scheduling (optional)

### 3.4 Customers & analytics

- [ ] Customer list with total spent, order count, last order
- [ ] Customer detail with order history
- [ ] Sales chart (daily/weekly/monthly)
- [ ] Revenue, orders, AOV, repeat customers
- [ ] Top-selling products
- [ ] Low-stock / out-of-stock alerts
- [ ] Conversion funnel (visits → cart → checkout → paid)
- [ ] Traffic source (Instagram vs direct)
- [ ] Export reports
- [ ] Date range filter

### 3.5 Settings

- [ ] Store name, logo, contact details
- [ ] Policy text editor
- [ ] Announcement bar text
- [ ] Payment mode indicator (test/live) — admin only
- [ ] Email templates
- [ ] WhatsApp templates
- [ ] Notification preferences

---

## 4. Super Admin Console Missing

### 4.1 Analytics & monitoring

- [ ] Real `/api/admin/analytics`
- [ ] Revenue, orders, AOV, refunds, failed payments
- [ ] Top products/categories
- [ ] New customers
- [ ] Stock alerts
- [ ] Failed webhook/payment queue
- [ ] System health (DB, storage, email)
- [ ] Charts + date range

### 4.2 Orders & payments

- [ ] `GET /api/admin/orders` with filters/pagination
- [ ] Order detail with raw payment payload
- [ ] Force status override (audited)
- [ ] Manual refund via Razorpay
- [ ] Mark payment as failed/refunded
- [ ] Replay webhook
- [ ] Refund/return queue
- [ ] Export CSV

### 4.3 Users

- [ ] Search/filter users
- [ ] Suspend/ban user
- [ ] Delete user (with order retention)
- [ ] Force password reset
- [ ] Impersonate user (audited)
- [ ] View user's orders/addresses
- [ ] Role change (exists) with confirmation + audit reason
- [ ] Prevent removing the last `SUPER_ADMIN`

### 4.4 Settings & overrides

- [ ] `/admin/settings` page (planned but missing)
- [ ] Payment keys/mode (never expose secret to browser)
- [ ] Shipping rate overrides
- [ ] Feature flags
- [ ] Announcement banner
- [ ] Homepage section ordering
- [ ] Category CRUD
- [ ] Coupon management
- [ ] Email/WhatsApp template management
- [ ] Maintenance mode
- [ ] `/admin/overrides` direct DB tools (planned but missing; build carefully + audit)

### 4.5 Content & moderation

- [ ] Review moderation queue
- [ ] Product Q&A moderation
- [ ] Contact messages inbox
- [ ] Newsletter subscribers
- [ ] CMS for About/FAQ/Policies
- [ ] Instagram/UGC curation

### 4.6 Audit & security

- [ ] Audit log filters (action, user, date)
- [ ] Audit log pagination
- [ ] Audit log export
- [ ] Log all admin/vendor mutations (currently only some)
- [ ] Login history / active sessions
- [ ] Force logout all sessions

---

## 5. API Routes Missing (Complete List)

### Auth & account

- [ ] `POST /api/auth/forgot-password`
- [ ] `POST /api/auth/reset-password`
- [ ] `POST /api/auth/verify-email`
- [ ] `POST /api/auth/resend-verification`
- [ ] `GET /api/orders/user`
- [ ] `GET|POST|PATCH|DELETE /api/addresses`
- [ ] `GET|PATCH /api/account`
- [ ] `POST /api/account/password`
- [ ] `DELETE /api/account`

### Catalog

- [ ] `POST /api/categories`
- [ ] `PUT|DELETE /api/categories/[id]`
- [ ] `GET /api/products/[slug]/related` (currently returned inline; okay, but optional)
- [ ] `GET /api/search/suggestions`
- [ ] `GET /api/collections`
- [ ] `POST /api/products/[slug]/notify-restock`

### Cart / wishlist / coupons

- [ ] `GET|POST|PATCH|DELETE /api/cart` (server cart, optional)
- [ ] `GET|POST|DELETE /api/wishlist`
- [ ] `POST /api/coupons/validate`
- [ ] `GET|POST|PATCH|DELETE /api/admin/coupons`

### Orders & payments

- [ ] `POST /api/orders/[orderNumber]/cancel`
- [ ] `POST /api/orders/[orderNumber]/return`
- [ ] `GET /api/orders/[orderNumber]/invoice`
- [ ] `POST /api/payments/refund`
- [ ] `POST /api/payments/retry`
- [ ] `GET /api/admin/orders`
- [ ] `PATCH /api/admin/orders/[id]/status`
- [ ] `POST /api/admin/orders/[id]/refund`
- [ ] `POST /api/admin/webhooks/[id]/replay`

### Admin

- [ ] `GET /api/admin/analytics`
- [ ] `GET|POST|PATCH /api/admin/settings`
- [ ] `GET|POST|PATCH /api/admin/banners`
- [ ] `GET /api/admin/customers`
- [ ] `GET|POST|PATCH /api/admin/reviews` (moderation)
- [ ] `GET /api/admin/messages`
- [ ] `GET /api/admin/newsletter`
- [ ] `POST /api/admin/users/[id]/suspend`
- [ ] `POST /api/admin/users/[id]/force-reset`

### Vendor

- [ ] `GET /api/vendor/customers`
- [ ] `GET /api/vendor/analytics`
- [ ] `GET|PATCH /api/vendor/settings`
- [ ] `GET|PATCH /api/vendor/shipping-rates`
- [ ] `GET /api/vendor/orders/export`
- [ ] `POST /api/vendor/orders/[id]/invoice`

### Public / marketing

- [ ] `POST /api/contact`
- [ ] `POST /api/newsletter`
- [ ] `GET /api/instagram/feed` (optional)
- [ ] `GET /sitemap.xml` via `src/app/sitemap.ts`
- [ ] `GET /robots.txt` via `src/app/robots.ts`
- [ ] `GET /manifest.webmanifest` via `src/app/manifest.ts`
- [ ] `GET /feed.xml` (optional)

---

## 6. Database Schema — Models & Columns Missing

> Add these to `prisma/schema.prisma` when implementing the related feature. Do not add everything at once if not needed.

### 6.1 Columns to add to existing models

```prisma
model Order {
  // ...existing fields...
  discountCode     String?
  taxAmount        Decimal  @default(0) @db.Decimal(10, 2)
  cancelledAt      DateTime?
  cancelReason     String?
  deliveredAt      DateTime?
  refundedAt       DateTime?
  trackingUrl      String?
  courierPhone     String?
  paymentMethod    String?
  idempotencyKey   String?  @unique
  statusHistory    OrderStatusHistory[]
  returns          ReturnRequest[]
  refunds          Refund[]
  shipment         Shipment?
}

model OrderItem {
  // ...existing fields...
  variantId    String?
  variantTitle String?
  weightGrams  Int      @default(150)
  sku          String?
  hsnCode      String?
  productSlug  String?  // snapshot for old orders
}

model User {
  // ...existing fields...
  emailVerified DateTime?
  isSuspended   Boolean   @default(false)
  lastLoginAt   DateTime?
  wishlist      WishlistItem[]
  cart          Cart?
  reviews       Review[]
  emailLogs     EmailLog[]
}

model Review {
  // ...existing fields...
  title        String?
  isApproved   Boolean  @default(false)
  isVerified   Boolean  @default(false) // only true for delivered purchase
  images       ReviewImage[]
  helpfulCount Int      @default(0)

  @@unique([productId, userId]) // one review per product per user
}

model Product {
  // ...existing fields...
  costPrice     Decimal? @db.Decimal(10, 2)
  lowStockAlert Int      @default(5)
  metaTitle     String?
  metaDesc      String?
  tags          String[]
  hsnCode       String?
  isDraft       Boolean  @default(false)
  allowBackorder Boolean @default(false)
  collections   CollectionProduct[]
}
```

### 6.2 New models

```prisma
model Coupon {
  id            String   @id @default(cuid())
  code          String   @unique
  description   String?
  type          String   // PERCENT or FIXED
  value         Decimal  @db.Decimal(10, 2)
  minOrderValue Decimal? @db.Decimal(10, 2)
  maxDiscount   Decimal? @db.Decimal(10, 2)
  startsAt      DateTime?
  expiresAt     DateTime?
  usageLimit    Int?
  usedCount     Int      @default(0)
  perUserLimit  Int      @default(1)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  redemptions   CouponRedemption[]
}

model CouponRedemption {
  id        String   @id @default(cuid())
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id])
  orderId   String   @unique
  userId    String?
  email     String?
  createdAt DateTime @default(now())
}

model WishlistItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}

model Cart {
  id        String     @id @default(cuid())
  userId    String?    @unique
  user      User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionId String?    @unique // guest cart
  items     CartItem[]
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  variantId String?
  quantity  Int
  createdAt DateTime @default(now())

  @@unique([cartId, productId, variantId])
}

model OrderStatusHistory {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    String
  note      String?
  changedBy String?
  createdAt DateTime @default(now())
}

model ReturnRequest {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  reason      String
  description String?
  status      String   @default("REQUESTED") // REQUESTED, APPROVED, REJECTED, RECEIVED, REFUNDED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Refund {
  id              String   @id @default(cuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])
  amount          Decimal  @db.Decimal(10, 2)
  reason          String?
  gatewayRefundId String?  @unique
  status          String   @default("PENDING")
  createdAt       DateTime @default(now())
}

model Shipment {
  id             String    @id @default(cuid())
  orderId        String    @unique
  order          Order     @relation(fields: [orderId], references: [id])
  courier        String?
  awb            String?
  trackingUrl    String?
  shippedAt      DateTime?
  deliveredAt    DateTime?
  events         ShipmentEvent[]
}

model ShipmentEvent {
  id         String   @id @default(cuid())
  shipmentId String
  shipment   Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  status     String
  location   String?
  occurredAt DateTime
  createdAt  DateTime @default(now())
}

model WebhookEvent {
  id          String   @id @default(cuid())
  gateway     String   @default("RAZORPAY")
  eventId     String   @unique
  eventType   String
  payload     Json
  processed   Boolean  @default(false)
  error       String?
  createdAt   DateTime @default(now())
}

model EmailLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  to        String
  subject   String
  template  String
  status    String   // QUEUED, SENT, FAILED
  error     String?
  createdAt DateTime @default(now())
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}

model Banner {
  id         String   @id @default(cuid())
  title      String?
  imageUrl   String
  linkUrl    String?
  placement  String   // HOME_HERO, ANNOUNCEMENT, CATEGORY
  sortOrder  Int      @default(0)
  isActive   Boolean  @default(true)
  startsAt   DateTime?
  endsAt     DateTime?
}

model NewsletterSubscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  isVerified Boolean @default(false)
  createdAt DateTime @default(now())
}

model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  phone     String?
  subject   String?
  message   String
  status    String   @default("NEW")
  createdAt DateTime @default(now())
}

model ReviewImage {
  id       String @id @default(cuid())
  reviewId String
  review   Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  url      String
}

model StockMovement {
  id        String   @id @default(cuid())
  productId String
  variantId String?
  change    Int
  reason    String   // ORDER, CANCEL, RESTOCK, MANUAL
  orderId   String?
  userId    String?
  createdAt DateTime @default(now())
}

model Collection {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  description String?
  imageUrl    String?
  isActive    Boolean  @default(true)
  products    CollectionProduct[]
}

model CollectionProduct {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  productId    String
  sortOrder    Int        @default(0)

  @@unique([collectionId, productId])
}

model ProductQuestion {
  id        String   @id @default(cuid())
  productId String
  userId    String?
  question  String
  answer    String?
  isApproved Boolean @default(false)
  createdAt DateTime @default(now())
}
```

### 6.3 Schema corrections

- [ ] Add `@@index([createdAt])` to `Order`, `Review`, `AuditLog` for dashboards.
- [ ] Add `@@index([paymentStatus])` to `Order`.
- [ ] Add `@@index([email])` already exists on `User`.
- [ ] Add `onDelete` rules where missing (e.g. `OrderItem.product` should be `Restrict` or keep snapshot).
- [ ] Consider soft-delete for `Product` (`deletedAt`) instead of only `isActive`.
- [ ] Add `currency` to `Order` (currently fixed INR).
- [ ] Add `invoiceNumber` to `Order` (separate from `orderNumber`).

---

## 7. SEO, Marketing & Analytics Missing

### 7.1 Technical SEO

- [ ] Convert Home, Catalog, Product pages to Server Components
- [ ] `generateMetadata()` per product/category
- [ ] Unique title + meta description per page
- [ ] Canonical URLs
- [ ] `metadataBase`
- [ ] Open Graph + Twitter cards
- [ ] Dynamic OG image (`opengraph-image.tsx`)
- [ ] `src/app/sitemap.ts` (products + categories + static pages)
- [ ] `src/app/robots.ts`
- [ ] `src/app/manifest.ts`
- [ ] JSON-LD: `Organization`, `WebSite`, `Product`, `Offer`, `AggregateRating`, `BreadcrumbList`, `FAQPage`
- [ ] Image alt text from `ProductImage.altText`
- [ ] Internal linking (related products/categories)
- [ ] 301 redirects if slugs change
- [ ] `hreflang` only if multi-language (optional)

### 7.2 Marketing

- [ ] GA4 / Google Tag Manager
- [ ] Meta Pixel (Instagram/Facebook ads)
- [ ] Razorpay conversion event
- [ ] Consent-gated analytics
- [ ] Abandoned cart email/WhatsApp
- [ ] Welcome coupon for newsletter signup
- [ ] Instagram feed embed
- [ ] UGC/testimonial section
- [ ] Referral program (optional)
- [ ] Google Merchant Center feed (optional)
- [ ] WhatsApp Business catalog link
- [ ] Email templates: welcome, verify, reset, order confirm, shipped, delivered, refund
- [ ] Transactional email provider (Resend free tier is planned but not installed)
- [ ] SPF/DKIM/DMARC for the sending domain

### 7.3 Performance

- [ ] Lighthouse 90+ on mobile (planned but not verified)
- [ ] Image optimization audit
- [ ] Font loading strategy (currently Google Fonts via `next/font` — okay)
- [ ] Reduce client-side fetches (home/product/catalog)
- [ ] Cache product/category data (`revalidate`, `unstable_cache`)
- [ ] Bundle analysis
- [ ] Prefetch important routes
- [ ] Avoid layout shift from images
- [ ] Test on slow 4G / in-app browsers

---

## 8. Notifications & Automation Missing

- [ ] Order confirmation email
- [ ] Payment receipt email
- [ ] Vendor new-order email
- [ ] Shipping/dispatch email with AWB
- [ ] Delivered email
- [ ] Refund email
- [ ] Abandoned checkout email (optional)
- [ ] Low-stock alert to vendor
- [ ] Daily sales summary to vendor/admin
- [ ] WhatsApp order updates (client heavily uses Instagram/WhatsApp)
- [ ] SMS fallback (optional, paid)
- [ ] In-app notification bell
- [ ] Email log + retry failed emails
- [ ] Resend/email provider env keys

---

## 9. Legal, Compliance & Business Ops Missing

- [ ] Privacy Policy (India DPDP Act)
- [ ] Terms of Service
- [ ] Shipping Policy
- [ ] Return/Refund/Cancellation Policy
- [ ] Cookie Policy + consent
- [ ] Business legal name, address, phone, email in footer
- [ ] GSTIN + GST invoice format (if registered)
- [ ] HSN codes per product
- [ ] Grievance officer details (India IT Rules)
- [ ] Data retention policy
- [ ] User data export/delete
- [ ] Payment PCI compliance (Razorpay hosted checkout handles card data — keep it that way)
- [ ] Refund timelines clearly stated
- [ ] Restricted/regulated items policy (none for jewelry)
- [ ] Shipping origin address
- [ ] Return pickup address
- [ ] Support hours
- [ ] Force majeure/delay clause

---

## 10. Infrastructure, DevOps & Monitoring Missing

- [ ] Environment variable validation at boot (`zod` schema)
- [ ] `.env.example` updated with every new key
- [ ] Separate `.env.local`, staging, production
- [ ] Prisma migrations (currently likely `db push`; add `prisma migrate` workflow)
- [ ] Database backup/restore plan (Supabase backups)
- [ ] Connection pooling configuration for serverless
- [ ] Error monitoring (Sentry free tier)
- [ ] Structured logging
- [ ] Uptime monitoring (Better Stack / UptimeRobot free)
- [ ] CI: lint + typecheck + test on every PR
- [ ] CD: preview deploy + production deploy
- [ ] Staging environment
- [ ] Smoke test after deploy
- [ ] Rollback plan
- [ ] Rate limiting backed by Redis (Upstash)
- [ ] File storage cleanup for deleted products
- [ ] Image CDN cache rules
- [ ] Security headers/CSP (see P0)
- [ ] Dependency audit (`npm audit`)
- [ ] Secret scanning in CI
- [ ] Domain + SSL + DNS
- [ ] Email domain verification
- [ ] Analytics privacy configuration

---

## 11. Testing & QA Missing

- [ ] API integration tests with a test database
- [ ] Checkout → payment → order flow test
- [ ] Razorpay webhook signature test (valid/invalid/duplicate)
- [ ] Inventory race-condition test (concurrent checkouts)
- [ ] RBAC tests for every protected route
- [ ] Product CRUD tests against DB
- [ ] Order status transition tests
- [ ] Coupon validation tests
- [ ] Review moderation tests
- [ ] E2E Playwright: browse → cart → checkout (mock pay) → track order
- [ ] E2E: vendor add product → customer buys → vendor ships
- [ ] E2E: admin changes role
- [ ] Mobile viewport E2E (360px)
- [ ] Accessibility tests (axe)
- [ ] Lighthouse CI
- [ ] Load test checkout endpoint
- [ ] Failure injection: DB down, Razorpay down, storage down
- [ ] Test on real Instagram/WhatsApp in-app browsers

---

## 12. Content & Assets the Client Must Provide

> Collect these before launch. Code cannot fix missing real content.

- [ ] Official logo (currently `logo.jpg` at root; move to `public/`)
- [ ] Favicon / app icons (192, 512, apple-touch)
- [ ] Real product photos (multiple angles per product)
- [ ] Category cover images
- [ ] Homepage hero banner(s)
- [ ] About Us text
- [ ] Contact details (phone, email, address)
- [ ] Instagram handle (already known)
- [ ] Shipping origin pincode
- [ ] Courier partners used
- [ ] Return pickup address
- [ ] Policy copy (shipping, return, privacy, terms)
- [ ] GSTIN (if any)
- [ ] Size/care instructions
- [ ] FAQs
- [ ] Customer testimonials/UGC (with permission)
- [ ] Support hours
- [ ] WhatsApp Business number
- [ ] Bank/current account for Razorpay settlement
- [ ] Razorpay KYC completion

---

## 13. Recommended Build Order

### Phase 0 — Safety before real orders (1–2 days)

1. Remove all production fallbacks/mocks.
2. Fix stock decrement race + restock on cancel.
3. Bind payment verification to DB order and amount.
4. Require webhook secret; fix timing-safe compare.
5. Remove hardcoded secrets/default logins; rotate keys.
6. Add rate limiting to payment/checkout/order/upload routes.
7. Fix vendor product thumbnails + order item weight.
8. Add `error.tsx`, `not-found.tsx`, `loading.tsx`.

### Phase 1 — Customer account + trust (3–5 days)

1. `/account`, `/account/orders`, addresses, profile, change password.
2. `GET /api/orders/user`, address CRUD.
3. Forgot/reset password + email verification.
4. Legal pages + footer business details.
5. Email notifications (Resend): order confirm, shipped, delivered.
6. Invoice PDF.
7. Order cancel request.

### Phase 2 — Admin/vendor completeness (4–6 days)

1. Vendor order detail + invoice/packing slip + status history.
2. Product multiple images + variants + category CRUD.
3. Shipping rate editor (read from DB).
4. Admin analytics + orders + settings pages.
5. Refund/return queue.
6. Review moderation.
7. CSV exports.

### Phase 3 — Conversion features (4–6 days)

1. Coupons.
2. Wishlist.
3. Search page + suggestions + pagination.
4. Review photos + verified purchase logic.
5. "Buy Now", saved addresses, order notes, gift wrap.
6. Delivery estimator on PDP.
7. Recently viewed / upsell.

### Phase 4 — SEO, marketing, launch hardening (3–5 days)

1. Server-render home/catalog/product + metadata + JSON-LD.
2. Sitemap/robots/manifest/OG images.
3. GA4 + Meta Pixel + consent.
4. Newsletter/contact forms.
5. PWA + accessibility audit.
6. Integration/E2E tests + CI.
7. Sentry + uptime monitoring.
8. Lighthouse + mobile in-app browser QA.

---

## 14. Launch Acceptance Checklist

Use this before telling the client the store is live.

**Money**

- [ ] Test payment succeeds and order becomes `PAID`.
- [ ] Failed payment leaves order `PENDING_PAYMENT`, no stock change.
- [ ] Closing Razorpay popup does not create a paid order.
- [ ] Webhook marks the order paid even if the browser closes.
- [ ] Duplicate webhook does not decrement stock twice.
- [ ] Refund updates order + payment + stock correctly.
- [ ] Amount on Razorpay equals server-calculated amount.
- [ ] No client-supplied price can change the total.

**Stock**

- [ ] Two simultaneous buyers cannot buy the last item.
- [ ] Cancelled order restocks items.
- [ ] Out-of-stock product cannot be added/checked out.
- [ ] Inactive product cannot be checked out.

**Access**

- [ ] Customer cannot open `/vendor` or `/admin`.
- [ ] Vendor cannot open `/admin`.
- [ ] Admin can open everything.
- [ ] Logged-out user is redirected to login with `redirect` preserved.
- [ ] API routes return `401/403` without a session.

**Data**

- [ ] Order shows correct items, variants, weights, prices, shipping.
- [ ] Tracking shows correct status and AWB.
- [ ] Invoice totals match payment.
- [ ] Vendor sees the same order data as the customer.
- [ ] Admin analytics match DB counts.

**UX**

- [ ] Works on 360px mobile.
- [ ] Works inside Instagram/WhatsApp in-app browser.
- [ ] No console errors.
- [ ] Empty states and errors are friendly.
- [ ] All forms validate and show clear messages.
- [ ] Images load (no broken placeholders).

**SEO/Ops**

- [ ] Product page has title, description, OG image, canonical.
- [ ] `sitemap.xml` and `robots.txt` load.
- [ ] 404 page works.
- [ ] Emails arrive (inbox + spam check).
- [ ] Backups enabled.
- [ ] Monitoring/alerts enabled.
- [ ] All secrets are in env, not in git.
- [ ] `npm run build` passes.
- [ ] `npm test` passes.

---

## 15. Quick File-Level Index of Known Issues

| File | Issue |
| :--- | :--- |
| `src/app/api/checkout/create-order/route.ts` | Fallback products, fake order success, no stock reserve, no idempotency, weak order number |
| `src/app/api/payments/verify/route.ts` | Returns success when order not found; not bound to DB amount/order |
| `src/app/api/payments/webhook/route.ts` | Optional secret, possible `timingSafeEqual` crash, limited events |
| `src/app/api/orders/[orderNumber]/route.ts` | Public data leak, fake `TBC-*` orders, arbitrary status jumps, fake fallback success |
| `src/app/api/vendor/orders/route.ts` | Fake fallback orders, hardcoded item weight |
| `src/app/api/vendor/stats/route.ts` | Fake fallback revenue |
| `src/app/api/products/route.ts` | Fallback catalog in production, fake create success |
| `src/app/api/products/[slug]/route.ts` | Fallback product details, in-memory mutation |
| `src/app/api/reviews/route.ts` | Fake reviews, `5.0` with zero reviews, `isVerified` always true |
| `src/app/api/admin/users/route.ts` | Fake users fallback, role update can remove last admin |
| `src/app/api/admin/audit/route.ts` | Fake audit logs fallback |
| `src/app/api/auth/login/route.ts` | Default demo logins bypass DB |
| `src/lib/cloudinary.ts` | Hardcoded real-looking credentials |
| `src/lib/storage.ts` | Hardcoded Supabase fallback URL/key |
| `src/lib/auth/jwt.ts` | Insecure default JWT secret |
| `src/lib/rate-limit.ts` | In-memory only (not serverless safe) |
| `src/lib/shipping.ts` | Hardcoded rates; DB `ShippingRateRule` unused; origin hardcoded |
| `src/app/(store)/catalog/page.tsx` | No pagination; only first 12 products |
| `src/app/(store)/product/[slug]/page.tsx` | Client-rendered (no SEO); no Buy Now; no delivery estimator |
| `src/app/(store)/checkout/success/page.tsx` | Only shows order number from URL, no real receipt |
| `src/app/(dashboard)/vendor/products/page.tsx` | `thumbnailUrl` mismatch; no delete/archive UI; no variant/multi-image UI |
| `src/app/(dashboard)/vendor/orders/page.tsx` | No order detail page, invoice, refund, pagination, date filter |
| `src/app/(dashboard)/admin/page.tsx` | Only users + audit; no analytics/orders/settings |
| `src/components/checkout/DeliveryEstimator.tsx` | Built but never used |
| `prisma/schema.prisma` | Missing coupons, wishlist, cart, status history, refunds, returns, shipment, settings, banners, email logs, stock movements, review images, Q&A |
| `prisma/seed.ts` | Default vendor password, no admin user password env for vendor |
| `next.config.ts` | No security headers/CSP |
| `src/app/layout.tsx` | No `metadataBase`, no viewport/theme color, no analytics |

---

## 16. Notes

- `src/app/api/upload/route.ts` and `src/lib/cloudinary.ts` are currently modified in git working tree (your recent Cloudinary work). The audit above does not overwrite them.
- `PROJECT_PLAN.md` and `README.md` claim several features that are not actually implemented (admin analytics, settings, overrides, vendor shipping page, `GET /api/orders/user`, `GET /api/admin/orders`, `GET /api/admin/analytics`, `POST /api/admin/settings`, NextAuth). Treat the README as a wishlist, not as truth.
- The store is visually good and the core flow exists, but the payment/stock fallbacks are the reason it is **not safe to take real orders yet**.
- When you start Phase 0, create a branch such as `fix/launch-blockers` and do not mix it with UI work.

---

**End of master list.**
