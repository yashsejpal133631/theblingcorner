# The Bling Corner — Missing E-Commerce Features (Master To-Do)

> **Purpose:** One single file listing everything missing, broken, risky, or not production-ready in this e-commerce project.
> **Audited on:** 8 Nov 2026
> **Audited against:** current `src/`, `prisma/schema.prisma`, `prisma/seed.ts`, `package.json`
> **How to use:** Do not try to build everything at once. Work top-to-bottom. `P0` items must be fixed before taking real orders.
> **How this file is organised:** Sections 0–16 are the audit of what is missing or broken. Sections 17–22 are the complete build inventories: every page, every button/control, every service, every business function, the full sitemap, and the phase gates.

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

**Top 10 launch blockers (fix in this order)**

| # | Blocker | Section |
| :-- | :--- | :--- |
| 1 | Remove every fake/fallback success path (orders, payments, products, reviews, users) | 1.1 |
| 2 | Verify Direct UPI UTRs server-side + build the admin approval queue | 1.8 |
| 3 | Atomic stock decrement and restock (no oversell, no negative stock) | 1.2 |
| 4 | Bind payment verification to the DB order, amount, and status | 1.3 |
| 5 | Remove hardcoded secrets and default logins; rotate exposed keys | 1.4 |
| 6 | Add rate limits, CSRF checks, CSP/security headers, upload limits | 1.5, 1.6 |
| 7 | Stop public order lookup by order number only; use phone/token | 1.5 |
| 8 | Build the customer account area + password reset + email verification | 2.1 |
| 9 | Publish legal pages, contact details, and business information | 2.6, 9 |
| 10 | Add order emails/WhatsApp, invoices, and a real success page | 2.5, 8 |

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

### 1.8 P0 — Direct UPI payment flow is unverified (the flow actually used by checkout)

> `src/app/(store)/checkout/page.tsx` does **not** open Razorpay. It creates an order with `paymentMethod: "DIRECT_UPI"`, shows a static UPI ID/QR, asks the customer to type a UTR and optionally upload a screenshot, then redirects to a success page that says the order is confirmed. There is no server-side verification of the UTR anywhere. This must be fixed before taking real orders.

- [ ] **Add a real UTR verification queue**
  - `POST /api/checkout/create-order` stores `upiUtrNumber` / `upiScreenshotUrl` and leaves the order `PENDING_PAYMENT`.
  - Nothing ever checks whether that UTR exists, belongs to the store, or matches the amount.
  - **Build:** `GET /api/admin/payments/pending`, `POST /api/admin/payments/[id]/verify`, `POST /api/admin/payments/[id]/reject` with audit log.
  - Add an `/admin/payments` screen showing order number, amount, UTR, payer name, screenshot, age, and Approve/Reject buttons.

- [ ] **Make UTR unique and validated**
  - Add a unique index on the UTR (per gateway) so the same UTR cannot be submitted for two orders.
  - Validate format (typically 12 digits), payment date, amount, and paying UPI ID.
  - Store `payerUpiId`, `paidAt`, `verifiedById`, `verifiedAt`, `rejectionReason`.

- [ ] **Use `PENDING_VERIFICATION` honestly**
  - The `PaymentStatus` enum already has `PENDING_VERIFICATION`; set it when the customer submits a UTR.
  - Only move the order to `PAID` after an admin/bank match, and only then decrement stock — in one transaction.

- [ ] **Fix the misleading success page**
  - `src/app/(store)/checkout/success/page.tsx` currently renders "Payment Verified & Order Confirmed" purely from the URL.
  - Fetch the real order and show one of: `Awaiting payment`, `Payment under review`, `Payment verified`, `Payment rejected`.
  - Do not call it confirmed while `paymentStatus` is `PENDING` / `PENDING_VERIFICATION`.

- [ ] **Stop fake-confirming unpaid orders**
  - `GET /api/orders/[orderNumber]` still returns a hardcoded `PAID` order for any `TBC-*` number. Remove that before UPI verification goes live.

- [ ] **Handle abandoned / unpaid orders**
  - Add `expiresAt` (e.g. 24 hours) to unpaid orders.
  - Cron job: cancel expired unpaid orders, release reservations, notify the customer.
  - Show "Payment pending" in the customer account and vendor order list.

- [ ] **Protect payment proof uploads**
  - Screenshots can contain names, UTRs, and bank details. Store them privately (signed URLs), not in a public bucket.
  - Limit size/type (see 1.6) and delete/expire proofs after the dispute window.

- [ ] **Reconcile against the bank, not the customer's word**
  - Best: import the bank/UPI statement CSV daily and auto-match by UTR + amount + date.
  - Good: admin manually checks the statement and clicks Approve.
  - Never approve based only on a screenshot.

- [ ] **Decide the long-term payment architecture**
  - Option A (recommended): Razorpay/PhonePe dynamic QR or hosted checkout with webhook → automatic `PAID`, no manual queue.
  - Option B: keep Direct UPI but build the full manual verification workflow above.
  - Do not ship the current half-manual, half-automatic mix.

- [ ] **Add customer-visible payment status + notifications**
  - Email/WhatsApp: "Payment received, verifying", "Payment verified", "Payment could not be matched — please re-submit".
  - Show the same status on `/track-order` and `/account/orders`.

---

## 2. Customer-Facing Features Missing

### 2.1 Customer account area

- [x] `/account` dashboard (profile summary, recent orders, default address)
- [x] `/account/orders` — order history for logged-in customers
- [x] `/account/orders/[orderNumber]` — order detail with invoice download (`/invoice/[orderNumber]`)
- [ ] `/account/addresses` — add/edit/delete/default addresses
- [ ] `/account/profile` — edit name, phone, email
- [ ] `/account/security` — change password
- [ ] `/forgot-password` + `/reset-password`
- [ ] Email verification after registration
- [ ] Resend verification email
- [ ] Delete account / data request (DPDP Act)
- [x] Link "My Account" in Navbar to `/account` when logged in, `/login` when not
- [x] Show user name + logout menu in Navbar (with Google profile avatar)

**APIs needed**

- [x] `GET /api/account/orders` — current user's orders
- [ ] `GET|POST|PATCH|DELETE /api/addresses`
- [ ] `GET|PATCH /api/account`
- [ ] `POST /api/account/password`
- [ ] `POST /api/auth/forgot-password`
- [ ] `POST /api/auth/reset-password`
- [ ] `POST /api/auth/verify-email`
- [ ] `DELETE /api/account`

### 2.2 Cart & checkout

- [x] Coupon / discount code input (in checkout summary with instant validation)
- [x] Coupon validation API: `POST /api/coupons/validate`
- [x] Show discount in cart, checkout, order, invoice
- [ ] Free-shipping threshold (optional business rule)
- [x] Save for later / move to wishlist (with 1-click Move to Bag)
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
- [x] Wishlist / save for later button (heart toggle on cards + /wishlist page)
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

- [x] Dedicated `/search` page with query, filters, results count
- [x] Search suggestions / autocomplete
- [x] Search by category, price, availability, rating
- [x] Price range filter
- [x] Sort by popularity / rating / newest
- [ ] Pagination or infinite scroll (currently missing)
- [x] "No results" suggestions / popular categories
- [ ] Search analytics (what people search and don't find)
- [ ] Collections / curated drops (e.g. "New Arrivals", "Under ₹199", "Best Sellers")
- [ ] Tags (e.g. `y2k`, `pastel`, `handmade`, `gift`)

### 2.5 Orders, tracking & after-sales

- [x] Invoice / receipt PDF download (`/invoice/[orderNumber]`)
- [ ] Order confirmation page fetches real order data (currently only reads `orderNumber` from URL)
- [ ] Email confirmation with invoice attached
- [ ] WhatsApp order confirmation + dispatch notification
- [x] Track by `orderNumber + phone` (more private than order number only)
- [ ] Cancel order request (only before `SHIPPED`)
- [ ] Return / exchange request
- [ ] Refund status visible to customer
- [ ] Reorder button
- [ ] Delivery address change before dispatch (support flow)
- [x] Courier tracking link (not just AWB number)
- [ ] Order status timeline stored with timestamps (currently only current status)
- [x] Downloadable GST invoice / receipt

### 2.6 Trust, content & legal pages

- [x] `/about`
- [x] `/contact` with form + WhatsApp + email + Instagram
- [x] `/faq`
- [x] `/shipping-policy`
- [x] `/return-refund-policy`
- [x] `/privacy-policy`
- [x] `/terms-and-conditions`
- [ ] `/cookie-policy`
- [ ] Cookie consent banner (India DPDP + basic GDPR if international)
- [x] Business address, phone, email, GSTIN in footer
- [x] Grievance officer / support hours (India compliance)
- [ ] Testimonials / customer photos
- [x] Instagram feed or UGC gallery link
- [ ] Size/care guide page
- [ ] Blog / journal (optional, good for SEO)
- [ ] Newsletter signup + double opt-in
- [x] Contact form API + spam protection

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
| `src/app/api/checkout/create-order/route.ts` | Fallback products, fake order success, no stock reserve, no idempotency, weak order number, stores UTR/screenshot but never verifies them |
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
| `src/app/(store)/checkout/success/page.tsx` | Only shows order number from URL, no real receipt; says "confirmed" before payment is verified |
| `src/app/(store)/checkout/page.tsx` | Direct UPI only (Razorpay not wired in UI); UTR/screenshot collected but never verified; no coupon, terms checkbox, saved address, or retry flow |
| `src/app/(dashboard)/vendor/products/page.tsx` | `thumbnailUrl` mismatch; no delete/archive UI; no variant/multi-image UI |
| `src/app/(dashboard)/vendor/orders/page.tsx` | No order detail page, invoice, refund, pagination, date filter |
| `src/app/(dashboard)/admin/page.tsx` | Only users + audit; no analytics/orders/settings, and no Direct UPI verification queue |
| `src/components/checkout/DeliveryEstimator.tsx` | Built but never used |
| `prisma/schema.prisma` | Missing coupons, wishlist, cart, status history, refunds, returns, shipment, settings, banners, email logs, stock movements, review images, Q&A |
| `prisma/seed.ts` | Default vendor password, no admin user password env for vendor |
| `next.config.ts` | No security headers/CSP |
| `src/app/layout.tsx` | No `metadataBase`, no viewport/theme color, no analytics |

---

## 16. Notes

- At audit time, `src/app/api/upload/route.ts` and `src/lib/cloudinary.ts` had uncommitted changes. Re-check `git status` before editing them; do not discard the user's work.
- `PROJECT_PLAN.md` and `README.md` claim several features that are not actually implemented (admin analytics, settings, overrides, vendor shipping page, `GET /api/orders/user`, `GET /api/admin/orders`, `GET /api/admin/analytics`, `POST /api/admin/settings`, NextAuth). Treat the README as a wishlist, not as truth.
- The store is visually good and the core flow exists, but the payment/stock fallbacks are the reason it is **not safe to take real orders yet**.
- When you start Phase 0, create a branch such as `fix/launch-blockers` and do not mix it with UI work.

---

## 17. Complete Page Inventory (every route, existing + missing)

**Legend:** `✅` built and acceptable · `⚠️` built but incomplete · `❌` missing

> Use this as the master page list. A page is only "done" when its row here is `✅`, its buttons in Section 18 work, and its APIs exist in Section 5.

### 17.1 Public storefront pages

| Route | Status | Priority | The page must contain | Primary actions |
| :--- | :--- | :--- | :--- | :--- |
| `/` | ⚠️ | P1 | Server-rendered hero, announcement bar, category tiles, featured products, best sellers, new arrivals, trust badges, testimonials, Instagram/UGC strip, newsletter signup, SEO metadata + JSON-LD | Shop Now, Browse Category, Add to Cart, View All, Subscribe |
| `/catalog` | ⚠️ | P1 | Product grid, search, category filter, price filter, availability filter, rating filter, sort, result count, pagination/load-more, breadcrumb, SEO copy | Filter, Sort, Clear Filters, Load More, Add to Cart |
| `/search` | ❌ | P1 | Query input, suggestions, results count, same filters as catalog, "no results" suggestions, popular searches | Search, Filter, Add to Cart |
| `/product/[slug]` | ⚠️ | P1 | Gallery + zoom, title, price, variant selector, stock, quantity, Add to Bag, Buy Now, wishlist, share, delivery estimator, description, specs, size/care, reviews summary, review list, review form, Q&A, related products, recently viewed, breadcrumb, JSON-LD | Variant, Qty, Add to Cart, Buy Now, Wishlist, Share, Review, Ask, Notify Me |
| `/collections` | ❌ | P2 | Curated collection list with cover images and descriptions | Open Collection |
| `/collections/[slug]` | ❌ | P2 | Collection hero, product grid, filters, SEO metadata | Filter, Add to Cart |
| `/category/[slug]` | ❌ | P2 | SEO landing page per category (canonical, intro copy, FAQ, product grid) | Filter, Add to Cart |
| `/cart` | ⚠️ | P1 | Items, thumbnails, variant, qty +/-, remove, clear bag, subtotal, weight, coupon, shipping estimate, save for later, cross-sell, trust badges | Update Qty, Remove, Apply Coupon, Checkout |
| `/checkout` | ⚠️ | P0 | Guest/login, contact, shipping address, pincode serviceability, shipping fee, order summary, coupon, gift wrap, order notes, terms checkbox, Direct UPI block **or** Razorpay, payment proof, Pay button | Apply Coupon, Pay, Copy UPI ID, Open UPI App, Upload Proof, Place Order |
| `/checkout/success` | ⚠️ | P0 | Real order number, real payment status, amount, items, delivery estimate, next steps, invoice download, track link | Track Order, Download Invoice, Continue Shopping |
| `/checkout/failure` | ❌ | P1 | Failure reason, retry payment, change method, contact support | Retry Payment, Contact Support |
| `/track-order` | ⚠️ | P1 | Order number + phone/email lookup, status timeline, items, AWB + courier link, address, invoice, cancel/return request | Look Up, Copy AWB, Open Courier, Cancel, Return |
| `/wishlist` | ❌ | P1 | Saved products, move to cart, remove, share wishlist | Move to Cart, Remove, Share |
| `/about` | ❌ | P1 | Brand story, photos, founder note, values, CTA | Shop, Contact |
| `/contact` | ❌ | P1 | Form, email, phone, WhatsApp, Instagram, address, support hours, map optional | Send Message, WhatsApp, Call |
| `/faq` | ❌ | P1 | Searchable FAQ, categories (orders, shipping, returns, payments, products), contact CTA | Search FAQ, Contact |
| `/shipping-policy` | ❌ | P0 | Zones, rates, dispatch time, delivery estimates, tracking, delays | Contact Support |
| `/return-refund-policy` | ❌ | P0 | Eligibility, window, exclusions (hygiene/earrings), process, refund timeline | Start Return |
| `/privacy-policy` | ❌ | P0 | Data collected, purpose, retention, sharing, cookies, rights, grievance officer | Request Data / Delete |
| `/terms-and-conditions` | ❌ | P0 | Eligibility, orders, pricing, payment, shipping, returns, IP, liability, disputes | — |
| `/cookie-policy` | ❌ | P1 | Cookie types, consent, opt-out | Cookie Preferences |
| `/size-guide` | ❌ | P2 | Bracelet/ring sizes, measuring guide, chart | — |
| `/care-guide` | ❌ | P2 | Jewelry care, storage, allergy notes | — |
| `/blog` | ❌ | P2 | Journal list, categories, SEO | Read |
| `/blog/[slug]` | ❌ | P2 | Article, author, related posts, JSON-LD | Share |
| `/gift-cards` | ❌ | P2 | Denominations, buy, redeem, balance check | Buy, Redeem |
| `/reviews` | ❌ | P2 | All customer reviews, photos, filters | Filter |
| `/order/[token]` | ❌ | P1 | Guest order view via signed token sent by email/WhatsApp (no public order-number lookup) | Track, Invoice |

### 17.2 Auth and customer account pages

| Route | Status | Priority | The page must contain | Primary actions |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | ⚠️ | P1 | Email/password, show password, remember me, forgot link, register link, rate limit, error states, redirect param | Login, Forgot, Register |
| `/register` | ⚠️ | P1 | Name, email, phone, password + strength, terms checkbox, verification notice | Register |
| `/forgot-password` | ❌ | P1 | Email form, neutral response (no account enumeration) | Send Reset Link |
| `/reset-password` | ❌ | P1 | Token validation, new password + confirm, strength, success state | Reset Password |
| `/verify-email` | ❌ | P1 | Token verification, resend, success/failure | Verify, Resend |
| `/account` | ❌ | P1 | Profile summary, recent orders, default address, wishlist count, support card | View Orders, Edit Profile |
| `/account/orders` | ❌ | P1 | Order list with status, date, total, filters, pagination, reorder | View, Reorder, Invoice |
| `/account/orders/[orderNumber]` | ❌ | P1 | Items, timeline, payment status, address, AWB, invoice, cancel/return | Download Invoice, Cancel, Return |
| `/account/addresses` | ❌ | P1 | Address cards, add/edit/delete, set default | Add, Edit, Delete, Set Default |
| `/account/profile` | ❌ | P1 | Name, phone, email (verified), DOB optional | Save |
| `/account/security` | ❌ | P1 | Change password, active sessions, logout all | Change Password, Logout All |
| `/account/wishlist` | ❌ | P1 | Saved items, move to cart, remove | Move to Cart, Remove |
| `/account/returns` | ❌ | P1 | Return/exchange requests and status | Start Return, Track |
| `/account/notifications` | ❌ | P2 | Email/WhatsApp preferences | Save Preferences |
| `/account/delete` | ❌ | P1 | Data export request, delete account with confirmation and retention notes | Export, Delete |

### 17.3 Cart, checkout and order pages (supporting)

| Route | Status | Priority | The page must contain | Primary actions |
| :--- | :--- | :--- | :--- | :--- |
| `/checkout/address` | ❌ | P2 | Optional multi-step split if checkout grows | Continue |
| `/checkout/payment` | ❌ | P2 | Optional multi-step split | Pay |
| `/invoice/[orderNumber]` | ❌ | P1 | Printable GST invoice / receipt (auth or signed token) | Print, Download PDF |
| `/track-order` | ⚠️ | P1 | See 17.1 | — |
| `/order/[token]` | ❌ | P1 | Guest order access without exposing order-number-only lookup | — |

### 17.4 Vendor dashboard pages

| Route | Status | Priority | The page must contain | Primary actions |
| :--- | :--- | :--- | :--- | :--- |
| `/vendor` | ⚠️ | P1 | KPIs (revenue, orders, AOV, low stock), sales chart, date range, recent orders, alerts | Change Range, Open Order |
| `/vendor/orders` | ⚠️ | P1 | List, status filter, date filter, customer search, pagination, bulk select, export | Filter, Search, Export, Bulk Update |
| `/vendor/orders/[orderNumber]` | ❌ | P1 | Full order, timeline, customer, payment, items, invoice, packing slip, tracking, notes | Update Status, Print, Refund, Cancel, Notify |
| `/vendor/products` | ⚠️ | P1 | List, search, filter, pagination, stock, price, image, status, add/edit | Add, Edit, Archive, Bulk Update |
| `/vendor/products/new` | ⚠️ | P1 | Full product form (inline panel exists) — images, variants, SEO, dimensions, HSN | Save Draft, Publish |
| `/vendor/products/[id]/edit` | ⚠️ | P1 | Edit modal exists — needs images, variants, SEO, dimensions | Save |
| `/vendor/categories` | ❌ | P1 | Category tree, create/edit/delete/reorder, image | Add, Edit, Delete, Reorder |
| `/vendor/inventory` | ❌ | P2 | Stock by SKU, low-stock filter, adjustments, history | Adjust, Export |
| `/vendor/customers` | ❌ | P2 | Customer list, orders, spend, last order | View, Export |
| `/vendor/customers/[id]` | ❌ | P2 | Customer detail and order history | View Order |
| `/vendor/analytics` | ❌ | P2 | Revenue, orders, AOV, repeat rate, top products, funnel, traffic | Date Range |
| `/vendor/shipping` | ❌ | P1 | Origin pincode, rate slabs, free-shipping rule, serviceable pincodes, packaging buffer | Save |
| `/vendor/coupons` | ❌ | P2 | Coupon list, create/edit, usage | Create, Disable |
| `/vendor/reviews` | ❌ | P2 | Reviews for vendor products, reply | Approve/Reply (if allowed) |
| `/vendor/settings` | ❌ | P2 | Store details, policies, notification prefs | Save |

### 17.5 Super admin console pages

| Route | Status | Priority | The page must contain | Primary actions |
| :--- | :--- | :--- | :--- | :--- |
| `/admin` | ⚠️ | P1 | Overview KPIs, revenue chart, recent orders, alerts, shortcuts | Date Range, Open |
| `/admin/analytics` | ❌ | P1 | Revenue, orders, AOV, refunds, failed payments, top products, customers, traffic, funnel | Date Range, Export |
| `/admin/orders` | ❌ | P1 | All orders, filters, search, pagination, export | View, Update, Export |
| `/admin/orders/[id]` | ❌ | P1 | Full order, raw payment payload, timeline, notes, override | Force Status, Refund, Replay |
| `/admin/payments` | ❌ | P0 | **Direct UPI verification queue** — UTR, amount, screenshot, age, approve/reject | Approve, Reject, Match |
| `/admin/products` | ❌ | P1 | All products, search, filter, bulk actions | Edit, Archive, Feature |
| `/admin/products/new` | ❌ | P1 | Full product create | Save |
| `/admin/products/[id]/edit` | ❌ | P1 | Full product edit | Save |
| `/admin/categories` | ❌ | P1 | Category CRUD and ordering | Add, Edit, Delete |
| `/admin/customers` | ❌ | P1 | Customer list, spend, orders, last active | View, Export |
| `/admin/customers/[id]` | ❌ | P1 | Profile, addresses, orders, reviews, notes | Suspend, View Order |
| `/admin/users` | ⚠️ | P1 | Currently combined into `/admin`; needs search, filters, pagination | Role, Suspend, Reset |
| `/admin/reviews` | ❌ | P1 | Moderation queue, approve/reject, photos | Approve, Reject |
| `/admin/coupons` | ❌ | P1 | Coupon CRUD, usage, limits | Create, Disable |
| `/admin/shipping` | ❌ | P1 | Rate card editor, origin, serviceability, free-shipping | Save |
| `/admin/content` | ❌ | P2 | Banners, homepage sections, About/FAQ/policies, Instagram/UGC | Edit, Publish |
| `/admin/messages` | ❌ | P2 | Contact form inbox, status, reply | Reply, Close |
| `/admin/newsletter` | ❌ | P2 | Subscribers, export, campaigns | Export |
| `/admin/settings` | ❌ | P1 | Store details, payment mode, feature flags, maintenance mode | Save |
| `/admin/webhooks` | ❌ | P1 | Event log, payload, retry/replay | Replay |
| `/admin/audit` | ⚠️ | P1 | Filters, pagination, export | Filter, Export |
| `/admin/overrides` | ❌ | P2 | Direct DB tools — build last, heavily audited, confirmation required | Run (audited) |

### 17.6 System, SEO and utility pages

| Route / file | Status | Priority | Purpose |
| :--- | :--- | :--- | :--- |
| `src/app/not-found.tsx` | ❌ | P1 | Branded 404 with search + popular links |
| `src/app/error.tsx` | ❌ | P1 | Branded error with retry |
| `src/app/global-error.tsx` | ❌ | P1 | Root error boundary |
| `src/app/loading.tsx` + route-level `loading.tsx` | ❌ | P2 | Skeletons, no layout shift |
| `/offline` | ❌ | P2 | PWA offline fallback |
| `/maintenance` | ❌ | P2 | Maintenance-mode landing |
| `/sitemap.xml` (`src/app/sitemap.ts`) | ❌ | P1 | Products, categories, collections, static pages |
| `/robots.txt` (`src/app/robots.ts`) | ❌ | P1 | Allow public, disallow account/admin/vendor/api |
| `/manifest.webmanifest` (`src/app/manifest.ts`) | ❌ | P2 | PWA manifest + icons |
| `/feed.xml` | ❌ | P2 | Product/blog feed |
| `/opengraph-image` (dynamic) | ❌ | P2 | Social share images |
| `/unsubscribe` | ❌ | P1 | Newsletter unsubscribe with signed token |
| `/verify-email` | ❌ | P1 | See 17.2 |

---

## 18. Buttons, Forms and UI Controls Inventory

> "Button exists" is not enough. Each control needs: loading state, disabled state, error message, success feedback, mobile tap target, keyboard access, and an audit-safe server action.

### 18.1 Global shell (header, footer, overlays)

| Control | Location | Expected behaviour | Status |
| :--- | :--- | :--- | :--- |
| Announcement bar | Header | Text from CMS, optional link, dismissible, remembered | ⚠️ static text |
| Logo | Header / Footer | Go to `/` | ✅ |
| Desktop category links | Header | Load category from DB, not hardcoded array | ⚠️ hardcoded |
| Mobile menu button | Header | Open/close drawer, ARIA expanded, focus trap, Escape closes | ✅ |
| Mobile search icon | Header | Open real search overlay, not just `/catalog` | ⚠️ links to catalog |
| Global search input | Header | Query, debounce, suggestions, recent searches, Enter → `/search?q=` | ❌ |
| Account icon | Header | `/login` when logged out; `/account` + menu when logged in | ⚠️ always `/login` |
| Cart button + badge | Header | Open drawer, live count capped at `9+` | ✅ |
| Cart drawer close / backdrop | Drawer | Close, restore scroll, focus return | ✅ |
| Cart drawer qty − / + | Drawer | Update, disable at 1 / stock limit | ✅ |
| Cart drawer remove | Drawer | Remove item, optional undo toast | ⚠️ no undo |
| Cart drawer "View Full Cart" | Drawer | Go to `/cart` | ✅ |
| Cart drawer "Proceed to Checkout" | Drawer | Go to `/checkout` after stock re-check | ⚠️ no re-check |
| Cart drawer empty "Start Shopping" | Drawer | Go to `/catalog` | ✅ |
| Footer links | Footer | Add About, Contact, FAQ, all policies, account, track | ⚠️ missing legal links |
| Footer newsletter form | Footer | Email validation, consent, double opt-in, success state | ❌ |
| Social icons | Footer | Instagram, WhatsApp, email | ⚠️ Instagram only |
| Payment / trust icons | Footer | UPI, cards, secure checkout, GST invoice | ❌ |
| Cookie consent banner | Global | Accept / reject / preferences, persisted, blocks non-essential tags | ❌ |
| Toast system | Global | Add-to-cart, copy, save, errors; auto-dismiss, ARIA live | ❌ |
| WhatsApp float button | Global | Open WhatsApp with prefilled message | ❌ |
| Back-to-top button | Global | Appears after scroll, smooth scroll | ❌ |
| Mobile bottom nav | Global | Home / Shop / Cart / Account | ❌ |
| Skip-to-content link | Global | Keyboard users skip header | ❌ |

### 18.2 Home page controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Hero primary CTA | Go to catalog/collection | ⚠️ verify |
| Hero secondary CTA | Go to best sellers/new arrivals | ❌ |
| Hero carousel arrows/dots | Change slide, pause on hover, keyboard | ❌ |
| Category tiles | Go to filtered catalog | ✅ |
| Product card add-to-cart | Add, toast, badge update, disabled when sold out | ✅ |
| Product card wishlist heart | Add/remove wishlist; login prompt if guest | ❌ |
| Product card quick view | Modal with variants + add | ❌ |
| "View all" links | Go to catalog/collection | ✅ |
| Testimonials carousel | Customer quotes/photos, arrows | ❌ |
| Instagram/UGC strip | Real feed or curated images, link to Instagram | ❌ |
| Newsletter submit | Validate, consent, API, success/error | ❌ |

### 18.3 Catalog and search controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Search input | Query with debounce, URL state, clear button | ⚠️ basic |
| Category pills | Multi-select or single-select filter, URL state | ✅ |
| Sort dropdown | Newest, price low/high, popular, rating | ✅ |
| In-stock toggle | Filter out `stockQuantity = 0` | ✅ |
| Price range filter | Min/max with validation, URL state | ❌ |
| Rating filter | 4★+, 3★+ | ❌ |
| Tag filter | Collections/tags | ❌ |
| Result count | "Showing X of Y" | ❌ |
| Clear all filters | Reset URL and controls | ❌ |
| Load more / pagination | Fetch next page, preserve scroll | ❌ |
| Product card actions | Add, wishlist, quick view | ⚠️ add only |
| No-results CTA | Suggest categories/popular products | ⚠️ |
| Search suggestions | Autocomplete products + categories | ❌ |

### 18.4 Product detail page controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Thumbnail buttons | Change main image, keyboard accessible | ✅ |
| Image zoom / lightbox | Click/tap to zoom, swipe on mobile | ❌ |
| Variant buttons | Select variant, update price/stock/image, disable out-of-stock | ⚠️ no per-variant image/disable |
| Quantity − / + | Min 1, max stock, disable at limits | ✅ |
| Add to Bag (desktop) | Add variant + qty, toast, button success state | ✅ |
| Add to Bag (mobile sticky) | Same as desktop | ✅ |
| Buy Now | Add then go straight to checkout | ❌ |
| Wishlist heart | Save/remove, login prompt | ❌ |
| Notify me when back in stock | Email capture, API, confirmation | ❌ |
| Share buttons | WhatsApp, Instagram, copy link, native share | ❌ |
| Delivery estimator | Pincode → fee/ETA before checkout, use existing component | ⚠️ component unused |
| Size guide / care modal | Open guide, close, focus trap | ❌ |
| Review submit | Rating, title, body, photos; auth + purchase check | ⚠️ basic |
| Review photo upload | Upload, preview, remove, size/type limits | ❌ |
| Helpful / not helpful | One vote per user, optimistic update | ❌ |
| Ask a question | Submit Q&A, moderation notice | ❌ |
| Related product add-to-cart | Same as product card | ✅ |
| Breadcrumbs | Home / Category / Product | ✅ |

### 18.5 Cart page controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Continue shopping | Go to catalog | ✅ |
| Clear entire bag | Confirm dialog, then clear | ⚠️ no confirm |
| Remove item | Remove, optional undo | ⚠️ no undo |
| Qty − / + | Update, disable at limits, re-check stock | ✅ |
| Coupon input + Apply | Validate, show discount, persist | ❌ |
| Remove coupon | Recalculate totals | ❌ |
| Save for later | Move item out of cart | ❌ |
| Move to wishlist | Save and remove | ❌ |
| Shipping estimate | Pincode input + fee/ETA | ❌ |
| Proceed to Checkout | Validate stock, go to checkout | ⚠️ no stock re-check |
| Cross-sell / frequently bought | Add recommended items | ❌ |
| Empty-state CTA | Go to catalog | ✅ |

### 18.6 Checkout controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Guest / login choice | Guest allowed, login prefills data | ⚠️ implicit |
| Full name / phone / email | Validate, autofill, error inline | ✅ |
| Address line 1 / 2 | Required line 1, optional line 2 | ✅ |
| City / state | Autofill from pincode, editable | ✅ |
| Pincode + serviceability | 6-digit validation, fee + ETA, block unserviceable | ✅ |
| Saved address picker | Logged-in users choose saved address | ❌ |
| Save this address | Checkbox + address CRUD | ❌ |
| Shipping method | Show calculated fee and ETA | ⚠️ fee only |
| Coupon input + Apply | Validate server-side, show discount | ❌ |
| Gift wrap toggle + message | Price rule, message saved to order | ❌ |
| Order notes | Optional, length limit | ✅ |
| Terms + privacy checkbox | Required, links open policy | ❌ |
| GSTIN field | Optional for business buyers, validated | ❌ |
| Copy UPI ID | Copy with feedback | ✅ |
| UPI app deep links | GPay / PhonePe / Paytm with amount + VPA | ✅ |
| QR code | Amount + VPA, fallback text | ✅ |
| UTR input | 12-digit validation, uniqueness, required | ⚠️ stored but unverified |
| Screenshot upload | Optional, size/type, private storage | ⚠️ public upload |
| Place Order | Disable while submitting, server totals, idempotency | ⚠️ no idempotency |
| Payment retry / change method | Retry failed/cancelled payment | ❌ |
| Razorpay checkout | Only if client chooses automatic payments | ❌ not wired |
| Edit cart link | Return to cart without losing data | ❌ |
| Success page status | Real `paymentStatus`, not URL text | ❌ |

### 18.7 Auth and account controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Login submit | Loading, error, redirect param, rate limit | ✅ |
| Show / hide password | Toggle with ARIA | ❌ |
| Remember me | Longer session, opt-in | ❌ |
| Forgot password link | Go to `/forgot-password` | ❌ |
| Register link | Go to `/register` | ✅ |
| Register submit | Validation, terms, verification email | ✅ |
| Terms checkbox (register) | Required | ❌ |
| Resend verification | Rate-limited, success state | ❌ |
| Logout | Clear cookie, redirect, confirm | ⚠️ dashboards only |
| Profile save | Validate, optimistic update, toast | ❌ |
| Change password | Current + new + confirm, invalidate sessions | ❌ |
| Address add / edit / delete | Modal/form, validation, default flag | ❌ |
| Set default address | One default per user | ❌ |
| Order invoice download | Auth/token protected PDF | ❌ |
| Cancel order | Only before `SHIPPED`, reason | ❌ |
| Return / exchange request | Reason, photos, policy window | ❌ |
| Reorder | Re-add available items, warn on missing | ❌ |
| Wishlist move to cart | Stock check | ❌ |
| Delete account | Confirm, export offer, retention notice | ❌ |
| Notification preferences | Email/WhatsApp toggles | ❌ |

### 18.8 Vendor dashboard controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Sidebar navigation | Overview, orders, products, categories, shipping, settings | ⚠️ 3 pages only |
| Date range | Today / 7d / 30d / custom, refetch KPIs | ❌ |
| Export CSV | Orders/products with filters | ❌ |
| Order search / filters | Status, date, customer, order number | ⚠️ status only |
| Order row open | Go to order detail | ❌ |
| Status update | State-machine validated, audit logged | ⚠️ unrestricted |
| Tracking number + courier | Save, show customer, build tracking URL | ⚠️ basic |
| Print invoice | Print-friendly page/PDF | ❌ |
| Print packing slip / label | Print-friendly | ❌ |
| Refund | Razorpay/manual, reason, audit | ❌ |
| Cancel + restock | Confirm, restock, audit | ❌ |
| Internal notes | Private, timestamped | ❌ |
| Add product | Create with validation | ✅ inline |
| Edit product | Price, stock, image, weight, description | ✅ modal |
| Archive / delete product | Soft delete, confirm | ❌ |
| Multi-image upload / reorder / delete | Primary image selection | ❌ |
| Variant CRUD | Title, price, stock, SKU, image | ❌ |
| Category CRUD | Create/edit/delete/reorder | ❌ |
| Stock − / + | Optimistic, audit, prevent negative | ✅ |
| Bulk price / stock update | CSV or table | ❌ |
| Low-stock threshold | Per product, alerts | ❌ |
| Product search / filter | Query, category, status | ✅ |
| Pagination | Server-side | ❌ |
| Shipping rate editor | Read/write DB rules | ❌ |
| Settings save | Store details, notifications | ❌ |

### 18.9 Super admin controls

| Control | Expected behaviour | Status |
| :--- | :--- | :--- |
| Logout | Clear session | ✅ |
| Role selector | Change role, confirm, audit, protect last `SUPER_ADMIN` | ⚠️ no guard |
| User search / filter | Name, email, role, status | ❌ |
| Suspend / ban user | Reason, audit, block login | ❌ |
| Force password reset | Email token, invalidate sessions | ❌ |
| Impersonate user | Audited, banner, short expiry | ❌ |
| Orders list / detail | Filters, pagination, raw payment payload | ❌ |
| Force order status | Reason, audit, side effects | ❌ |
| Refund | Gateway/manual, audit | ❌ |
| Replay webhook | Idempotent, audit | ❌ |
| **Verify / reject UPI payment** | Match UTR + amount, mark paid/rejected, audit | ❌ **P0** |
| Analytics date range | Refetch charts/KPIs | ❌ |
| Settings save | Payment mode, flags, maintenance | ❌ |
| Feature flags | Toggle, audit | ❌ |
| Banner / content upload | Image, placement, schedule | ❌ |
| Category CRUD | Create/edit/delete/reorder | ❌ |
| Coupon CRUD | Create/edit/disable, usage limits | ❌ |
| Review approve / reject | Moderation queue | ❌ |
| Contact inbox | Read/reply/close | ❌ |
| Newsletter export | CSV | ❌ |
| Audit filters / export | Action, user, date | ⚠️ basic list only |

---

## 19. Services, Integrations and Background Functions

### 19.1 Internal services (the `src/lib` layer)

| Service | Responsibility | Key functions to build / fix | Status |
| :--- | :--- | :--- | :--- |
| Auth / session | Issue, verify, refresh, revoke sessions | `getSession`, `requireRole`, cookie flags, session table | ⚠️ basic |
| Password | Hash + verify | Argon2/bcrypt, strength policy | ✅ |
| RBAC | Role + owner checks | `can(user, action, resource)`, route guards | ⚠️ route-level only |
| Validation | Zod schemas for every mutation | Auth, checkout, product, coupon, address, review, settings | ⚠️ partial |
| Rate limiting | Per-IP + per-user limits | Redis/Upstash, route-specific buckets | ⚠️ in-memory |
| Cart | Add/update/remove, totals, stock re-check | Server cart for logged-in, merge guest cart on login | ⚠️ localStorage only |
| Pricing | Server-side price authority | Recompute every line, coupon, shipping, rounding | ❌ |
| Inventory | Reserve, decrement, restock, history | Conditional updates, reservations, `StockMovement` | ❌ |
| Order numbering | Collision-free human number | DB sequence/nanoid + retry | ❌ |
| Order state machine | Allowed transitions + side effects | Single `transitionOrder()` service | ❌ |
| Payment — Razorpay | Create order, verify signature, refund | Webhook, idempotency, reconciliation | ⚠️ exists but unused in UI |
| Payment — Direct UPI | Collect UTR/proof, verify, reconcile | UTR uniqueness, admin queue, bank CSV match | ❌ |
| Payment ledger | Every attempt and event | `Payment`, `WebhookEvent`, `Refund` | ⚠️ basic |
| Shipping | Zone, weight slabs, ETA | Read DB rules, origin config, serviceability | ⚠️ hardcoded |
| Tax / invoice | GST, HSN, invoice number | Tax-inclusive decision, PDF, credit notes | ❌ |
| Coupons | Validate, reserve usage, redeem | Per-user limit, expiry, stacking rules | ❌ |
| Wishlist | Add/remove/list, merge guest | Auth required or local | ❌ |
| Reviews | Create, moderate, verify purchase | Photos, helpful votes, one per product | ⚠️ basic |
| Q&A | Ask, answer, moderate | Product questions | ❌ |
| Returns / refunds | Request, approve, receive, refund | State machine, restock, gateway refund | ❌ |
| Email | Transactional templates | Queue, retry, log, unsubscribe | ❌ |
| WhatsApp | Order + shipping templates | Cloud API/Twilio, opt-in | ❌ |
| SMS | Optional fallback | Provider + cost control | ❌ |
| Media upload | Validate, store, transform, delete | Private proofs, Cloudinary/Supabase, cleanup | ⚠️ partial |
| Search | Product search + suggestions | Postgres trigram or Meilisearch | ⚠️ basic SQL |
| Settings | Store config + feature flags | `Setting` table, cached | ❌ |
| Audit | Log every privileged mutation | Actor, action, resource, before/after, IP | ⚠️ partial |
| Analytics | Events + business metrics | GA4, internal events, dashboards | ❌ |
| SEO | Metadata, JSON-LD, sitemap, robots | Server components, canonical, OG | ❌ |
| Monitoring | Errors, uptime, alerts | Sentry, uptime checks, structured logs | ❌ |
| Webhooks (in) | Receive, verify, store, replay | Razorpay/courier, idempotent | ⚠️ Razorpay only |
| Webhooks (out) | Notify external systems | Optional | ❌ |

### 19.2 Third-party integrations

| Integration | Purpose | Env keys | Status |
| :--- | :--- | :--- | :--- |
| Razorpay | Cards/UPI/netbanking, refunds, webhooks | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | ⚠️ code exists, UI unused |
| Store UPI VPA | Direct UPI collection | `UPI_VPA`, `UPI_PAYEE_NAME` | ⚠️ hardcoded/verify |
| Resend (or SendGrid/Postmark) | Transactional email | `RESEND_API_KEY`, `EMAIL_FROM` | ❌ |
| WhatsApp Cloud API / Twilio | Order updates, OTP optional | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` | ❌ |
| Shiprocket / Delhivery / direct courier | AWB, pickup, tracking webhook | Courier API keys | ❌ |
| Cloudinary | Product image upload/transform | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | ⚠️ hardcoded fallback |
| Supabase Storage / Firebase Storage | Backups / private payment proofs | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, Firebase config | ⚠️ hardcoded fallback |
| PostgreSQL (Supabase/Neon) | Primary database | `DATABASE_URL`, `DIRECT_URL` | ✅ |
| Upstash Redis | Distributed rate limit + cache | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | ❌ |
| GA4 / GTM | Traffic + conversion analytics | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID` | ❌ |
| Meta Pixel / Conversions API | Instagram/Facebook ads | `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKEN` | ❌ |
| Sentry | Error monitoring | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | ❌ |
| Google Search Console | Indexing + sitemap | Verification token | ❌ |
| Instagram | Feed/UGC embed, DM link | Optional token | ❌ |
| Google Merchant Center | Product feed | Feed URL / API | ❌ |
| GST/e-invoice (optional) | B2B invoices | GST portal / provider | ❌ |
| Domain + SSL + DNS | Production hosting | Registrar/host | ❌ |

### 19.3 Scheduled jobs / cron

| Job | Schedule | What it does |
| :--- | :--- | :--- |
| Expire unpaid orders | Every 15 min | Cancel `PENDING_PAYMENT` older than 24h, release reservations |
| Expire inventory reservations | Every 5 min | Release stock reserved by abandoned checkouts |
| Abandoned cart | Hourly | Email/WhatsApp after 1h / 24h, respect opt-out |
| Low-stock alert | Daily + on change | Notify vendor/admin below threshold |
| Daily sales summary | 9 PM IST | Revenue, orders, AOV, failed payments, low stock |
| Webhook retry | Every 10 min | Retry failed/unprocessed `WebhookEvent` |
| Email retry | Every 10 min | Retry `EmailLog` failures with backoff |
| Refund reconciliation | Daily | Match gateway refunds to `Refund` rows |
| UPI statement import | Daily | Import bank CSV, auto-match UTRs |
| Review request | 3 days after delivery | Email/WhatsApp review link |
| Sitemap refresh | Daily | Regenerate product/category sitemap |
| Token/session cleanup | Daily | Delete expired sessions, verification tokens |
| Payment proof cleanup | Monthly | Delete proofs past retention window |
| Backup verification | Weekly | Confirm DB backup restore works |

### 19.4 Environment variables (complete inventory)

| Group | Variables |
| :--- | :--- |
| App | `NEXT_PUBLIC_APP_URL`, `NODE_ENV`, `PORT` |
| Database | `DATABASE_URL`, `DIRECT_URL` |
| Auth | `NEXTAUTH_SECRET` / `JWT_SECRET` (32+ chars), `SESSION_TTL`, `COOKIE_DOMAIN` |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `UPI_VPA`, `UPI_PAYEE_NAME` |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` |
| WhatsApp | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_SUPPORT_NUMBER` |
| Storage | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Cache / limits | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Analytics | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKEN` |
| Monitoring | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `LOG_LEVEL` |
| Ops | `CRON_SECRET`, `ADMIN_ALERT_EMAIL`, `FEATURE_FLAGS`, `MAINTENANCE_MODE` |
| Dev only | `ENABLE_MOCK_MODE` (must be ignored in production) |

> Rule: every variable above must appear in `.env.example` (with a dummy value), be validated at boot with Zod, and never be committed with a real value.

### 19.5 Webhook events to handle

| Source | Events |
| :--- | :--- |
| Razorpay | `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed` |
| Courier | `shipment.created`, `shipment.picked_up`, `shipment.in_transit`, `shipment.out_for_delivery`, `shipment.delivered`, `shipment.exception`, `shipment.rto` |
| WhatsApp | `messages` status (sent/delivered/read/failed) |
| Email | Delivered, bounced, complained (provider webhook) |
| Internal | `order.paid`, `order.shipped`, `order.delivered`, `order.cancelled`, `refund.processed`, `stock.low` |

---

## 20. Business Functions and Rules (the logic layer)

### 20.1 Order status state machine

| From | To | Who can do it | Condition | Side effects |
| :--- | :--- | :--- | :--- | :--- |
| — | `PENDING_PAYMENT` | Customer | Valid cart, address, stock, totals | Create order + payment; **do not** decrement stock |
| `PENDING_PAYMENT` | `PAID` | System / admin | Payment webhook verified **or** UTR matched | Decrement stock atomically, payment `SUCCESS`, audit, email |
| `PENDING_PAYMENT` | `CANCELLED` | Customer / admin / cron | Not paid or expired | No stock change, email |
| `PAID` | `PROCESSING` | Vendor / admin | Payment confirmed | Email "preparing" |
| `PROCESSING` | `PACKED` | Vendor / admin | Items packed | Email optional |
| `PACKED` | `SHIPPED` | Vendor / admin | Courier + AWB saved | Create shipment, tracking email/WhatsApp |
| `SHIPPED` | `DELIVERED` | Vendor / admin / courier webhook | Courier confirms | `deliveredAt`, review request |
| `PAID` / `PROCESSING` / `PACKED` | `CANCELLED` | Admin / vendor | Before `SHIPPED` | Restock, refund if paid, audit |
| `DELIVERED` | Return requested | Customer | Within return window | Create `ReturnRequest` |
| Return requested | Approved / rejected | Admin | Policy check | Email |
| Approved | Received | Vendor | Item received | Inspect |
| Received | `REFUNDED` | Admin | Refund processed | Restock, gateway refund, audit |
| `PAID` | `REFUNDED` | Admin | Full refund | Restock, refund, audit |

> Do **not** add return states to `OrderStatus` directly. Keep `ReturnRequest.status` separate so the order lifecycle stays clean. Add `RETURN_REQUESTED` only if reporting needs it.

### 20.2 Payment status rules

| Status | Meaning | Allowed next |
| :--- | :--- | :--- |
| `PENDING` | No payment attempt confirmed | `PENDING_VERIFICATION`, `SUCCESS`, `FAILED` |
| `PENDING_VERIFICATION` | UTR/proof submitted, waiting for match | `SUCCESS`, `FAILED` |
| `SUCCESS` | Money confirmed | `REFUNDED` |
| `FAILED` | Attempt failed / rejected | `PENDING` (retry) |
| `REFUNDED` | Money returned | — |

Rules:
- A payment row is 1:1 with an order for this store. If partial payments are ever needed, change the model first.
- `SUCCESS` requires gateway signature **or** an audited admin match — never a client payload.
- Every transition writes an audit row with actor, amount, and reference.

### 20.3 Money and pricing rules

```text
unitPrice      = variant.price ?? product.price          // server-side only
subtotal       = Σ (unitPrice × quantity)
discount       = coupon.type == PERCENT
                   ? min(subtotal × value / 100, maxDiscount)
                   : min(value, subtotal)
shipping       = rate(zone, totalWeightGrams)             // Section 20.4
tax            = client decision: inclusive (shown on invoice) or exclusive (added)
total          = subtotal − discount + shipping (+ tax if exclusive)
amountPaise    = round(total × 100)
```

Rules:
- Never accept `price`, `subtotal`, `shipping`, or `total` from the client.
- Recompute everything inside the order transaction.
- Use integer paise internally; format to ₹ only in the UI.
- Round half-up to 2 decimals at the final total only.
- Coupons apply after item validation and before shipping (unless the coupon says free shipping).
- Shipping is calculated on **actual packed weight**, not on the client’s cart weight.

### 20.4 Shipping rules (current rate card)

| Zone | ≤500g | ≤1000g | ≤1500g | ≤2000g | Each extra 500g |
| :--- | ---: | ---: | ---: | ---: | ---: |
| LOCAL (origin prefix 40) | ₹34 | ₹56 | ₹70 | ₹103 | +₹25 |
| WITHIN_STATE (Maharashtra) | ₹77 | ₹107 | ₹139 | ₹188 | +₹40 |
| ZONE_METRO (metro pincodes) | ₹82 | ₹126 | ₹168 | ₹234 | +₹50 |
| OTHER_STATE | ₹84 | ₹134 | ₹201 | ₹283 | +₹60 |

Rules:
- Minimum billable weight 50g.
- Origin is currently hardcoded to Maharashtra / Mumbai (prefix `40`); move to settings.
- Zone resolution: local prefix → same state → metro prefix → other state.
- Add packaging buffer (e.g. +20–50g) before charging.
- Store the rate card in `ShippingRateRule`; the hardcoded matrix becomes the fallback only.
- Free-shipping threshold must be a setting, not code.
- Serviceable pincode list and exclusions are required before ads go live.

### 20.5 Coupon rules

- Types: `PERCENT` and `FIXED` (add `FREE_SHIPPING` if needed).
- Conditions: min order value, max discount, start/end date, total usage limit, per-user limit, first-order-only, category/product restriction.
- Validate on the server at apply time **and** again inside the order transaction (usage can change).
- One coupon per order unless stacking is explicitly enabled.
- Record a `CouponRedemption` row with order, user/email, and amount.
- Never let a coupon make the total negative; clamp at ₹0.
- Show clear errors: invalid, expired, minimum not met, already used, not applicable.

### 20.6 Tax, GST and invoice rules

- Decide whether displayed prices include GST; write it in the policies and invoice.
- Store `hsnCode`, `taxRate`, `taxAmount`, and `invoiceNumber` per order/item.
- Invoice number must be sequential and separate from `orderNumber`.
- B2B buyers: collect GSTIN, validate format, show it on the invoice.
- Credit notes for refunds; never edit a issued invoice.
- Keep invoices immutable; store a PDF snapshot or regenerate from the snapshot.

### 20.7 Inventory rules

- Decrement only after payment confirmation, in the same transaction as the order status change.
- Use conditional updates: `where: { id, stockQuantity: { gte: qty } }`; if `count === 0`, fail the whole transaction.
- For Razorpay checkout windows, use `InventoryReservation` with expiry instead of decrementing immediately.
- Restock exactly once on cancel/refund; make it idempotent.
- Never allow negative stock; refuse the sale instead.
- Write a `StockMovement` row for every change (order, cancel, restock, manual, correction).
- Low-stock threshold per product; alert vendor and admin.
- Variant stock is authoritative when a variant is selected.

### 20.8 Returns, exchanges and refunds

- Return window (e.g. 7 days from delivery) stored in settings.
- Exclusions: used/opened hygiene items, earrings (if policy says so), custom/personalized items, sale items.
- Customer must upload photos and choose a reason.
- Admin approves/rejects with a note; customer is notified.
- Refund to original payment method; if Direct UPI, collect/confirm the refund UPI ID.
- Restock only after the item is received and inspected (unless the policy says otherwise).
- Refund timeline must match the policy page (e.g. 5–7 business days).
- Every step is audited.

### 20.9 Authorization matrix (RBAC)

| Action | Guest | Customer | Vendor | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| Browse catalog / product | ✅ | ✅ | ✅ | ✅ |
| Add to cart / checkout as guest | ✅ | ✅ | ✅ | ✅ |
| View own orders | ❌ | ✅ | ✅ (own) | ✅ (all) |
| Manage own addresses/profile | ❌ | ✅ | ✅ | ✅ |
| Write review | ❌ | ✅ (purchased) | ✅ | ✅ |
| View `/vendor` | ❌ | ❌ | ✅ | ✅ |
| Manage products/stock | ❌ | ❌ | ✅ | ✅ |
| Update order status | ❌ | ❌ (cancel only) | ✅ (own) | ✅ |
| Refund | ❌ | ❌ | ❌ | ✅ |
| View `/admin` | ❌ | ❌ | ❌ | ✅ |
| Change roles / settings | ❌ | ❌ | ❌ | ✅ |
| Verify UPI payment | ❌ | ❌ | ❌ | ✅ |
| Impersonate | ❌ | ❌ | ❌ | ✅ (audited) |

Rules:
- Check on the server, not only in the UI.
- Vendors can only touch their own orders/products; return `403` otherwise.
- Protect the last `SUPER_ADMIN` from demotion/deletion.
- Admin override actions require a reason and write an audit row.

### 20.10 Validation rules

| Field | Rule |
| :--- | :--- |
| Email | Valid format, lowercase, max 254 chars, unique |
| Phone (India) | 10 digits, starts 6–9, normalize `+91` |
| Pincode | 6 digits, not starting 0, serviceability check |
| Password | Min 8–10 chars, mix of letters/numbers, block common passwords |
| Name | 2–80 chars, no control characters |
| Address line | 5–200 chars, required line 1 |
| Quantity | Integer, ≥1, ≤ stock, ≤ per-order limit |
| UTR | 12 digits, unique per gateway, required for UPI |
| GSTIN | 15 chars, valid checksum (if collected) |
| Coupon code | Uppercase, 3–20 chars, alphanumeric |
| Review | Rating 1–5, body 10–1000 chars, one per product per user |
| Upload | JPEG/PNG/WebP/AVIF, max 5 MB, magic-byte check |
| Notes | Max 500 chars, escaped on render |
| Search query | Max 100 chars, trim, no SQL wildcards injected |

### 20.11 Rate limits and fraud rules

| Route | Limit |
| :--- | :--- |
| Login | 5 / 15 min per IP + per email |
| Register | 3 / hour per IP |
| Forgot password | 3 / hour per email |
| Checkout create | 10 / hour per IP + per user |
| Payment verify | 20 / hour per order |
| Order lookup | 10 / hour per IP |
| Review create | 5 / day per user |
| Contact form | 3 / hour per IP |
| Upload | 20 / hour per user |
| Admin/vendor mutations | 100 / hour per user |

Fraud rules:
- Block checkout if the same UTR is reused.
- Flag multiple orders from the same phone/address in a short window.
- Flag mismatched billing/shipping names on high-value orders.
- Never auto-approve UPI based on a screenshot.
- Require prepaid only (current policy) — do not add COD without a separate risk process.

---

## 21. Complete Sitemap (navigation map)

```text
/
├── catalog
│   ├── ?category=keychains|hair-clips|stationery|bracelets|charms|wipes
│   ├── ?sort=newest|price-asc|price-desc|rating|popular
│   └── ?page=N
├── search?q=
├── collections
│   └── [slug]
├── category/[slug]                 (SEO landing pages)
├── product/[slug]
├── wishlist
├── cart
├── checkout
│   ├── success
│   └── failure
├── track-order
├── order/[token]                   (guest signed link)
├── invoice/[orderNumber]
├── about
├── contact
├── faq
├── size-guide
├── care-guide
├── blog
│   └── [slug]
├── gift-cards
├── reviews
├── login
├── register
├── forgot-password
├── reset-password
├── verify-email
├── account
│   ├── orders
│   │   └── [orderNumber]
│   ├── addresses
│   ├── profile
│   ├── security
│   ├── wishlist
│   ├── returns
│   ├── notifications
│   └── delete
├── vendor
│   ├── orders
│   │   └── [orderNumber]
│   ├── products
│   │   ├── new
│   │   └── [id]/edit
│   ├── categories
│   ├── inventory
│   ├── customers
│   │   └── [id]
│   ├── analytics
│   ├── shipping
│   ├── coupons
│   ├── reviews
│   └── settings
├── admin
│   ├── analytics
│   ├── orders
│   │   └── [id]
│   ├── payments                 (UPI verification queue — P0)
│   ├── products
│   │   ├── new
│   │   └── [id]/edit
│   ├── categories
│   ├── customers
│   │   └── [id]
│   ├── users
│   ├── reviews
│   ├── coupons
│   ├── shipping
│   ├── content
│   ├── messages
│   ├── newsletter
│   ├── settings
│   ├── webhooks
│   ├── audit
│   └── overrides                (last, audited)
├── privacy-policy
├── terms-and-conditions
├── shipping-policy
├── return-refund-policy
├── cookie-policy
├── unsubscribe
├── offline
├── maintenance
├── sitemap.xml
├── robots.txt
├── manifest.webmanifest
├── feed.xml
└── not-found / error
```

---

## 22. Step-by-Step Execution Gates

> Work in this order. Do not start a phase until the previous gate passes.

| Phase | Build | Gate — do not proceed until |
| :--- | :--- | :--- |
| **0. Safety** | Remove mocks/fallbacks, atomic stock, payment binding, UTR verification queue, secrets, rate limits, error pages | A test order cannot become paid without money; stock cannot go negative; no secret is in git; `npm run build` passes |
| **1. Customer account + trust** | Account pages, addresses, password reset, email verification, legal pages, invoices, cancel request, email notifications | Customer can register → verify → order → track → invoice → cancel; all policies exist; emails arrive |
| **2. Admin / vendor completeness** | Order detail, UTR queue, product images/variants, categories, shipping editor, analytics, settings, refunds/returns | Vendor can fulfill an order end-to-end; admin can verify UPI, refund, and see real analytics |
| **3. Conversion** | Coupons, wishlist, search page, filters, pagination, reviews photos/verified, Buy Now, saved addresses, gift wrap, delivery estimator, recently viewed | A guest can find → filter → wishlist → coupon → buy; every button in Section 18 has a working action |
| **4. SEO / marketing / hardening** | SSR + metadata + JSON-LD, sitemap/robots/manifest, GA4 + Pixel + consent, newsletter/contact, PWA, a11y, E2E + CI, Sentry + uptime | Lighthouse 90+ mobile, E2E green, monitoring live, launch checklist in Section 14 complete |

### 22.1 Definition of Done for every page/feature

- [ ] Server-side authorization on every mutation.
- [ ] Loading, empty, error, and success states.
- [ ] Mobile 360px + tablet + desktop verified.
- [ ] Keyboard accessible; focus visible; labels/ARIA correct.
- [ ] No client-trusted money, stock, role, or status values.
- [ ] API validation + friendly error messages.
- [ ] Audit log for privileged actions.
- [ ] Test coverage (unit for logic, integration for API, E2E for the flow).
- [ ] SEO metadata where public.
- [ ] Added to the sitemap/navigation where public.
- [ ] Analytics event where it matters (view, add-to-cart, checkout, purchase).
- [ ] Documented in this file and checked off.

### 22.2 Suggested branch / commit discipline

- `fix/launch-blockers` — Phase 0 only.
- `feat/account` — Phase 1.
- `feat/admin-vendor` — Phase 2.
- `feat/conversion` — Phase 3.
- `feat/seo-launch` — Phase 4.
- One PR per feature; never mix payment/stock changes with UI polish.

---

## 23. P0 Implementation Status — `fix/launch-blockers`

> Status snapshot after the Phase 0 safety pass. Section 1 above remains the
> detailed issue catalogue; this section records what is actually fixed.

### 23.1 Completed ✅

- [x] **Fake/fallback data removed** from checkout, Razorpay verify/webhook,
  order lookup/update, vendor orders/stats, products, categories, reviews, and
  admin users/audit. These routes now fail closed with a `500`/`503` instead of
  returning invented orders, products, revenue, or success responses.
- [x] **Server-side pricing & totals** in `POST /api/checkout/create-order`.
  Unknown/inactive products are rejected; `expectedTotal` mismatch returns
  `409 TOTAL_CHANGED`; the client cannot set price or shipping.
- [x] **Atomic stock reservation** at checkout via conditional
  `updateMany({ stockQuantity: { gte: qty } })` inside the order transaction.
  Reservation and restock are idempotent through `payload.stockReserved` /
  `payload.stockRestored`.
- [x] **Restock on cancel/reject** in both the order state machine and the UPI
  rejection transaction.
- [x] **Payment verification bound to the DB order** for Razorpay: signature,
  gateway order id, one-order-per-payment-id, and amount/currency checks in the
  webhook. Missing orders are errors, never simulated success.
- [x] **Webhook hardening:** `RAZORPAY_WEBHOOK_SECRET` is mandatory, signatures
  are length-checked before `timingSafeEqual`, events are idempotent, and every
  validation/out-of-stock outcome is audited.
- [x] **Idempotent order creation:** unique 12-digit UTR (`gatewayPaymentId`),
  duplicate-submit returns the original order, and order numbers use
  `TBC-YYYYMM-XXXXXX` with retry on unique collision.
- [x] **Hardcoded credentials removed:** Cloudinary and Supabase now load from
  env only; JWT secret fails closed in production; login has no default-account
  bypass; Google sign-in verifies the Firebase ID token server-side; the seed
  script refuses to create a default-password admin.
- [x] **Order privacy:** `GET /api/orders/[orderNumber]` requires a signed
  access token, the customer account, staff role, or the checkout phone/email.
  PII is masked and only the UTR last four digits are returned.
- [x] **Rate limiting + CSRF:** sensitive mutation routes use per-route limits
  and an Origin/Referer same-origin check (`src/lib/http.ts`).
- [x] **Upload hardening:** staff uploads max 5 MB, guest receipts max 8 MB,
  MIME allow-list, Cloudinary configured from env.
- [x] **Security headers + CSP** in `src/middleware.ts`, including Razorpay,
  Firebase, Google Identity, Supabase, Cloudinary, and Google Fonts origins.
- [x] **Branded error pages:** `src/app/not-found.tsx`, `src/app/error.tsx`,
  `src/app/global-error.tsx`, and `public/placeholder.svg`.
- [x] **Direct UPI verification queue:** `GET /api/admin/payments/pending`,
  `POST /api/admin/payments/[id]/verify`, `POST /api/admin/payments/[id]/reject`
  with audit logging, plus `/admin/payments` and `/vendor/payments` screens and
  navigation links. Approve marks the order `PAID`; reject cancels and restocks.
- [x] **Honest payment status:** checkout returns `PENDING_VERIFICATION`, the
  success page fetches real status via the access token, and track-order shows
  real payment state without exposing full PII.
- [x] **Data accuracy:** product thumbnails mapped server-side, order-item
  weight read from the product (no hardcoded 80g), review average is `0` with no
  reviews, and the verified badge requires a delivered purchase.
- [x] **Build/test gate:** `npm run build` passes (the WASM SWC fallback warning
  is environmental), `npx tsc --noEmit` is clean, and `npx vitest run` passes
  85/85 tests including the new P0 suite.

### 23.2 Still open (P0/P1)

- [ ] Move the in-memory rate limiter to Redis/KV for multi-instance serverless.
- [ ] Add explicit request-body size caps for reviews, products, and checkout.
- [ ] Store UPI receipts privately (signed URLs) instead of public Cloudinary.
- [ ] Add unpaid-order expiry + cron to cancel and release reservations.
- [ ] Add a `WebhookEvent` table (currently event ids are stored in
  `Payment.payload`) and handle `payment.failed` / refund events.
- [ ] Rotate any credentials that were previously committed to git history.
- [ ] Customer payment status notifications (email/WhatsApp).
- [ ] Schema follow-ups deferred from P0: `OrderItem.variantId`,
  `OrderItem.variantTitle`, `OrderItem.weightGrams`, and variant-level stock
  decrement. Checkout currently snapshots variant price/weight into the title
  and totals but does not decrement variant stock.
- [ ] Optional long-term shift to a gateway-hosted dynamic QR/webhooks to remove
  manual UTR matching.

### 23.3 Build verification

| Check | Result |
| :--- | :--- |
| `npm run build` | ✅ compiles, all routes generated (`/admin/payments`, `/vendor/payments` included) |
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` | ✅ 9 files, 85 tests passed |

---

**End of master list.**
