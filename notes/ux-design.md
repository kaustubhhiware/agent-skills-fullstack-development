# FoodSpark — UX Design Plan

Date: 2026-04-08
Status: Approved

---

## 1. Design System

### Color Palette

| Token           | Hex                   | Use                                      |
|-----------------|-----------------------|------------------------------------------|
| `bg-base`       | `#f8fafc` (Slate-50)  | Page background                          |
| `bg-surface`    | `#ffffff`             | Cards, panels, nav                       |
| `border`        | `#e2e8f0` (Slate-200) | Dividers, input borders                  |
| `text-primary`  | `#1e293b` (Slate-800) | Body text, headings                      |
| `text-muted`    | `#64748b` (Slate-500) | Labels, metadata, placeholders           |
| `accent`        | `#2563eb` (Blue-600)  | CTAs, links, focus rings, brand elements |
| `success`       | `#10b981` (Emerald-500)| Order ready, Profile saved.             |
| `error`         | `#ef4444` (Red-500)   | Errors,                                  |
| `warning`       | `#f59e0b` (Amber-500) | Non-blocking warnings                    |

**No gradients are used anywhere.** All CTA buttons use solid `accent` (#2563eb).

### Typography

- **UI text**: Geist (weights 400, 500, 600). Inter is not used.
- **Code**: Geist Mono (editor and all inline code snippets)
- **Headlines**: `text-3xl font-semibold tracking-tight`
- **Body**: `text-base leading-relaxed text-slate-600 max-w-[65ch]`
- **Status / labels**: `text-sm font-medium`

### Motion

- **Page transitions**: Framer Motion `AnimatePresence`. 200ms ease-out, 8px y-translate + fade.
- **Panel morph** (single editor → split review): `layout` prop on both panels, 350ms spring (`stiffness: 100, damping: 20`).
- **Button press**: `-translate-y-[1px] scale-[0.98]` on `:active`.
- **Loading skeletons**: shimmer animation via `@keyframes` (no circular spinners).
- **Toast notifications**: slide in from top, auto-dismiss after 4s.
- No `window.addEventListener('scroll')` animations. No GSAP.

### Spacing

- Page layout container: `max-w-7xl mx-auto px-6`
- Full-height sections: `min-h-[100dvh]` (never `h-screen`)
- Grid over flex-math for multi-column layouts

---

## 2. Routes & Navigation

```text
/                         Home — browse restaurants + menus, search, cart sidebar
/login                    Sign in (email + password)
/register                 Role-aware registration (customer | restaurant | admin)
/restaurant/dashboard     Restaurant owner — manage menu items + incoming orders
/orders/:id               Customer — live order status tracker
/admin                    Admin — user list + platform management
```

### Shared Top Nav (56px, sticky)

- `bg-white/80 backdrop-blur-sm border-b border-slate-200`
- Left: "FoodSpark" wordmark (Geist 500 weight) + small sushi-mark SVG
- Right: context-sensitive
  - Logged out: "Sign in" (ghost) + "Sign up" (solid accent) buttons
  - Logged in (customer): Cart icon with badge + user avatar chip
  - Logged in (restaurant): "Dashboard" link + user avatar chip
  - Logged in (admin): "Admin" link + user avatar chip

---

## 3. Home Page (`/`)

### Layout

Asymmetric two-column grid on desktop (`grid-cols-[3fr_2fr]`), single column on mobile.

#### Left column — Browse panel

- Search bar at top: placeholder "Search restaurants or dishes…", icon on left, `border border-slate-200 rounded-lg`.
- Cuisine filter chips below search (All | Italian | Japanese | Indian | …). Active chip uses solid `accent` background, white text. Inactive: `bg-surface border`.
- Restaurant cards listed vertically. Each card:
  - Restaurant name (`text-lg font-semibold`), cuisine tag, address in `text-muted`.
  - "View Menu" affordance — clicking expands inline or navigates to menu section.
  - No images unless real. No placeholder broken links.
- When a restaurant is selected, its menu items replace the card list with a back chevron.
  - Menu items grouped by `category` heading (`text-xs font-semibold uppercase text-muted tracking-widest`).
  - Each `MenuCard`: name, description snippet, price (`font-mono text-accent`), "Add to cart" button.

#### Right column — Cart sidebar

- Sticky, `top-[72px]` (below nav), `min-h-[calc(100dvh-72px)]`.
- Header: "Your order" + item count badge.
- Item list: name, qty stepper (`-` / `+`), line total in `font-mono`.
- Subtotal + "Place Order" CTA (solid accent, full width). Disabled + muted when cart is empty.
- Empty state: centered icon (shopping bag outline) + "Your cart is empty. Add items to get started."

---

## 4. Restaurant Dashboard (`/restaurant/dashboard`)

**Access:** role = `restaurant` only. Non-restaurant users are redirected to `/`.

### Layout

Two-tab interface within a single page. Tab bar sits below nav, left-aligned.

```text
[  Menu  ]  [  Orders  ]
```

Active tab: solid `accent` bottom border, `text-primary`. Inactive: `text-muted`.

### Tab A — Menu

Split layout: item list on left (`grid-cols-[1fr_2fr]` on desktop).

#### Left: item list

- Grouped by category, same heading style as Home.
- Each row: item name + price + availability toggle (on/off pill). Toggle off dims the row (`opacity-50`).
- "Add item" button at list bottom — opens the right panel as a blank form.
- Clicking any row loads its data into the right panel.

#### Right: item editor form

```text
Name
[                              ]

Description (optional)
[                              ]

Category
[  dropdown  ]

Price
[  0.00  ]

Available  [toggle]

[Save item]          [Delete]
```

- Labels above inputs.
- Price field uses `font-mono`.
- "Save item" is solid accent. "Delete" is ghost with `error` text color, shown only in edit mode.
- Inline validation errors appear below the relevant field.
- On save success: toast "Item saved." On delete: confirm dialog, then toast "Item deleted."

### Tab B — Orders

Full-width list of incoming orders, newest first.

Each order row (card, `border border-slate-200 rounded-lg p-4`):

- Order ID (truncated UUID, `font-mono text-xs text-muted`) + timestamp.
- Customer name + item summary ("Margherita Pizza × 2, Tiramisu × 1").
- Total amount (`font-mono font-semibold`).
- `OrderStatusBadge` (see Section 10) — right-aligned.
- Clicking a row expands it inline to show full item list + status action buttons.

#### Status action buttons (shown in expanded row)

| Current status | Available actions |
|---|---|
| `placed` | Confirm |
| `confirmed` | Mark Preparing |
| `preparing` | Mark Out for Delivery |
| `out_for_delivery` | Mark Delivered |
| `delivered` / `cancelled` | — (read-only) |

Each action button is solid accent. On click: optimistic UI update + API call. On API error: revert + inline error toast.

---

## 5. Order Tracking (`/orders/:id`)

**Access:** customer who placed the order. Others are redirected.

### Layout

Centered single-column, `max-w-2xl mx-auto`, generous vertical padding.

#### Order header

- "Order #XXXX" in headline style + restaurant name below in `text-muted`.
- Placed timestamp, total amount.

#### Status stepper

Horizontal stepper on desktop, vertical on mobile. 5 steps:

```text
Placed → Confirmed → Preparing → Out for Delivery → Delivered
```

- Completed steps: filled circle, `accent` color, label in `text-primary`.
- Current step: pulsing filled circle (CSS `@keyframes pulse`, 1.5s infinite), label in `accent font-semibold`.
- Future steps: hollow circle, `border-slate-300`, label in `text-muted`.
- Cancelled state: all steps muted + red "Cancelled" badge replaces stepper.

#### Item breakdown

- Table: item name | qty | unit price | line total. All prices in `font-mono`.
- Divider, then subtotal row in `font-semibold`.

#### Polling behavior

- Page polls `GET /orders/:id` every 10 seconds while status is not terminal (`delivered` or `cancelled`).
- On status change: stepper animates to new step (Framer Motion layout transition, 350ms spring).

---

## 6. Admin Dashboard (`/admin`)

**Access:** role = `admin` only. Others redirected to `/`.

### Layout

Full-width, `max-w-7xl mx-auto px-6`.

#### Page header

- "Platform Admin" headline + live user count in `text-muted` ("142 users").

#### User table

Sortable table (`border-collapse`, `divide-y divide-slate-200`):

| Column | Notes |
|---|---|
| Name | `font-medium` |
| Email | `text-muted font-mono text-sm` |
| Role | Role badge (see below) |
| Joined | Relative date, e.g. "3 days ago" |
| Actions | "Delete" ghost button, `error` text color |

- **Role badges**: `customer` → slate chip; `restaurant` → amber chip; `admin` → blue chip. All use `text-xs font-medium px-2 py-0.5 rounded-full`.
- Clicking column headers toggles sort (asc/desc). Active sort column header shows chevron icon.
- "Delete" action: confirm dialog ("Delete [name]? This cannot be undone.") → `DELETE /admin/users/:id` → row fades out with exit animation → toast "User deleted."

#### Search + filter bar (above table)

- Text search filters by name or email (client-side, debounced 200ms).
- Role filter dropdown: All | Customer | Restaurant | Admin.

---

## 7. Auth Pages (`/login`, `/register`)

### Layout

Split screen on desktop (`grid-cols-[2fr_3fr]`), single column on mobile.

### Left Panel — Brand

- Solid Blue-600 background (`#2563eb`)
- "FoodSpark" wordmark in white, large
- Subtle animated wave/sushi SVG (CSS only, slow float animation, `pointer-events-none`)

### Right Panel — Form

#### Login (`/login`)

```text
Sign in to FoodSpark

Email
[                              ]

Password
[                              ]

[Sign in →]                     ← solid Blue-600

Don't have an account? Sign up →
```

#### Register (`/register`)

```text
Create your account

Name
[                              ]

Email
[                              ]

Password
[                              ]

Confirm password
[                              ]

I'm signing up as
( ) Customer   ( ) Restaurant owner

[Create account →]

Already have an account? Sign in →
```

- When "Restaurant owner" is selected, an additional field appears:

  ```text
  Restaurant name
  [                              ]
  ```

  Animates in with Framer Motion `AnimatePresence` (height + opacity, 200ms).

- Labels above inputs (required).
- Error text below failing input, inline (not a toast).
- CTA: solid Blue-600, full width.
- Loading state: spinner icon inside button, disabled.

---

## 8. Empty & Error States

| State | Location | Pattern |
|---|---|---|
| Empty cart | Home — cart sidebar | Centered bag icon + "Your cart is empty. Add items to get started." |
| No restaurants | Home — browse panel | Centered store icon + "No restaurants match your search." |
| No menu items | Home — menu panel | Centered icon + "This restaurant has no items yet." |
| No orders (restaurant) | Restaurant Dashboard → Orders tab | Centered icon + "No orders yet. They'll appear here when customers place them." |
| Order not found | `/orders/:id` | Full-page centered: "Order not found" headline + "Back to home" link |
| No users | Admin Dashboard | Table replaced with centered icon + "No users found." |
| Auth error | Login / Register | Inline error below the relevant input field |
| API error (generic) | Any page | Toast slide-in from top: red left border, error message text, auto-dismiss 4s |
| Network offline | Any page | Sticky banner below nav: "You appear to be offline. Changes may not save." |

---

## 9. Responsive Behavior

- **< 768px (mobile)**: Restaurant Dashboard and Order Tracking pages show a banner: "FoodSpark works best on desktop. Some features require a wider screen." CTA to dismiss. Home and auth pages are fully responsive.
- **md+ breakpoints**: All asymmetric layouts activate. Panels fill remaining viewport height.
- No `h-screen` anywhere. All full-height sections use `min-h-[100dvh]`.
- Cart sidebar collapses to a sticky bottom bar on mobile: shows item count + total + "View order" button that opens a bottom sheet.

---

## 10. Component Inventory

| Component | Type | Notes |
|---|---|---|
| `TopNav` | Client Component | Shared, sticky. Role-aware right slot. |
| `Toast` | Client Component | Slide-in from top, auto-dismiss 4s. Variants: default, success, error. |
| `AuthForm` | Client Component | Login + register variants. Role selector on register. |
| `MenuCard` | Client Component | Item name, description, price, "Add" button. |
| `Cart` | Client Component | Sticky sidebar on desktop; bottom sheet on mobile. |
| `OrderStatusBadge` | Pure Component | Maps order status → colored pill. `placed`=slate, `confirmed`=blue, `preparing`=amber, `out_for_delivery`=violet, `delivered`=emerald, `cancelled`=red. |
| `OrderStatusStepper` | Client Component | Horizontal/vertical stepper. Animated current step. |
| `ProtectedRoute` | Client Component | Reads JWT from localStorage, checks role, redirects. |
| `ConfirmDialog` | Client Component | Accessible modal for destructive actions (delete user, delete item). |
| `SkeletonRow` | Pure Component | Shimmer placeholder row matching table/list dimensions. |
| `RoleBadge` | Pure Component | Colored chip for user roles. |
