import { useState } from "react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
  SpinnerIcon,
  StorefrontIcon,
  UserCircleIcon,
  WarningIcon,
  XCircleIcon,
  XIcon,
  ArrowClockwiseIcon,
  CarSimpleIcon,
} from "@phosphor-icons/react";
import styles from "./Demo.module.css";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const ORDER_STEPS = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered"];
const STATUS_STEP_IDX = { placed: 0, confirmed: 1, preparing: 2, out_for_delivery: 3, delivered: 4 };

const MOCK_RESTAURANTS = [
  { id: "r1", name: "Riku Ramen House",      cuisine: "Japanese", address: "14 Oak St, Midtown" },
  { id: "r2", name: "Trattoria Pellegrino",  cuisine: "Italian",  address: "88 Vine Ave, East Side" },
];

const MOCK_CART_ITEMS = [
  { id: "c1", name: "Spicy Tonkotsu Ramen", qty: 1, price: 16.00 },
  { id: "c2", name: "Gyoza (6 pcs)",        qty: 2, price: 8.50 },
];

const MOCK_MENU_ITEMS = [
  { id: "m1", name: "Spicy Tonkotsu Ramen", price: 16.00, available: true,  selected: true },
  { id: "m2", name: "Gyoza (6 pcs)",        price: 8.50,  available: true,  selected: false },
  { id: "m3", name: "Karaage Chicken",      price: 12.00, available: false, selected: false },
];

const MOCK_ORDER_ITEMS = [
  { name: "Spicy Tonkotsu Ramen", qty: 1, price: 16.00 },
  { name: "Gyoza (6 pcs)",        qty: 2, price: 8.50 },
];

const MOCK_USERS = [
  { id: "u1", name: "Amara Osei",      email: "amara@example.com",     role: "customer",   joined: "2 days ago" },
  { id: "u2", name: "Riku Tanaka",     email: "riku@tanaka-ramen.co",  role: "restaurant", joined: "5 days ago" },
  { id: "u3", name: "Priya Nambiar",   email: "priya@foodspark.io",    role: "admin",      joined: "14 days ago" },
  { id: "u4", name: "Lucas Schneider", email: "l.schneider@mail.de",   role: "customer",   joined: "1 day ago" },
];

const NAV_SECTIONS = [
  ["#nav",        "Navigation"],
  ["#auth",       "Auth"],
  ["#restaurant", "Restaurant"],
  ["#tracking",   "Order tracking"],
  ["#admin",      "Admin"],
  ["#shared",     "Shared"],
];

// ─────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────

function Section({ id, title, note, children }) {
  return (
    <section id={id} className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {note && <p className={styles.sectionNote}>{note}</p>}
      {children}
    </section>
  );
}

function Card({ label, children, noPad }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={noPad ? styles.cardBodyNoPad : styles.cardBody}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Logo mark
// ─────────────────────────────────────────────

function SushiMark() {
  return <span aria-hidden>🍣</span>;
}

// ─────────────────────────────────────────────
// Section 1 — Top Navigation
// ─────────────────────────────────────────────

function NavView({ role, cartCount = 0 }) {
  return (
    <nav className={styles.navBar}>
      <div className={styles.navBrand}>
        <SushiMark />
        <span className={styles.navWordmark}>FoodSpark</span>
      </div>
      <div className={styles.navRight}>
        {role === "guest" && (
          <>
            <button className={styles.ghostBtn}>Sign in</button>
            <button className={styles.solidBtn}>Sign up</button>
          </>
        )}
        {role === "customer" && (
          <>
            <button className={styles.cartBtn} aria-label="Cart">
              <ShoppingCartIcon size={16} />
              {cartCount > 0 && (
                <span className={styles.cartBadge}>{cartCount}</span>
              )}
            </button>
            <div className={styles.avatar}>A</div>
          </>
        )}
        {role === "restaurant" && (
          <>
            <a className={styles.navDashLink}>Dashboard</a>
            <div className={styles.avatar}>R</div>
          </>
        )}
        {role === "admin" && (
          <>
            <a className={styles.navDashLink}>Admin</a>
            <div className={`${styles.avatar} ${styles.avatarAdmin}`}>P</div>
          </>
        )}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// Section 2 — Home Page
// ─────────────────────────────────────────────

function RestaurantListView({ empty }) {
  return (
    <div className={styles.browsePanel}>
      <div className={styles.searchBar}>
        <MagnifyingGlassIcon size={14} />
        <span>Search restaurants or dishes…</span>
      </div>
      <div className={styles.filterChips}>
        {["All", "Japanese", "Italian", "Indian", "Mexican"].map((c, i) => (
          <span key={c} className={`${styles.chip} ${i === 0 ? styles.chipActive : ""}`}>{c}</span>
        ))}
      </div>
      {empty ? (
        <div className={styles.emptyState}>
          <StorefrontIcon size={28} weight="thin" />
          <p className={styles.emptyText}>No restaurants match your search.</p>
        </div>
      ) : (
        MOCK_RESTAURANTS.map((r) => (
          <div key={r.id} className={styles.restaurantCard}>
            <p className={styles.restaurantName}>{r.name}</p>
            <div className={styles.restaurantMeta}>
              <span className={styles.cuisineTag}>{r.cuisine}</span>
              <span>·</span>
              <span>{r.address}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CartEmptyView() {
  return (
    <div className={styles.cartPanel}>
      <div className={styles.cartHeader}>Your order</div>
      <div className={styles.cartEmpty}>
        <ShoppingCartIcon size={28} weight="thin" />
        <p className={styles.cartEmptyText}>
          Your cart is empty.<br />Add items to get started.
        </p>
      </div>
      <div className={styles.cartFooter}>
        <button className={`${styles.cartPlaceOrder} ${styles.cartPlaceOrderDisabled}`} disabled>
          Place Order
        </button>
      </div>
    </div>
  );
}

function CartWithItemsView() {
  const subtotal = MOCK_CART_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div className={styles.cartPanel}>
      <div className={styles.cartHeader}>
        Your order
        <span className={styles.cartCountBadge}>{MOCK_CART_ITEMS.length}</span>
      </div>
      <div className={styles.cartItems}>
        {MOCK_CART_ITEMS.map((item) => (
          <div key={item.id} className={styles.cartItem}>
            <span className={styles.cartItemName}>{item.name}</span>
            <div className={styles.cartItemRight}>
              <div className={styles.qtyControl}>
                <button className={styles.qtyBtn}><MinusIcon size={10} /></button>
                <span className={styles.qtyNum}>{item.qty}</span>
                <button className={styles.qtyBtn}><PlusIcon size={10} /></button>
              </div>
              <span className={styles.cartLineTotal}>
                ${(item.price * item.qty).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.cartFooter}>
        <div className={styles.cartSubtotal}>
          <span>Subtotal</span>
          <span className={styles.cartSubtotalAmt}>${subtotal.toFixed(2)}</span>
        </div>
        <button className={styles.cartPlaceOrder}>Place Order</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 3 — Auth Pages
// ─────────────────────────────────────────────

function Field({ label, type = "text", placeholder, error }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className={`${styles.fieldInput} ${error ? styles.fieldInputError : ""}`}
        readOnly
      />
      {error && <span className={styles.fieldError}>{error}</span>}
    </div>
  );
}

function LoginFormView({ hasError }) {
  return (
    <form className={styles.authForm} onSubmit={(e) => e.preventDefault()}>
      <p className={styles.authFormTitle}>Sign in to FoodSpark</p>
      <div className={styles.formFields}>
        <Field label="Email" type="email" placeholder="you@example.com" />
        <Field
          label="Password"
          type="password"
          placeholder="••••••••"
          error={hasError ? "Invalid email or password." : undefined}
        />
      </div>
      <button type="submit" className={styles.authSubmit}>
        Sign in <ArrowRightIcon size={14} weight="bold" />
      </button>
      <p className={styles.authFooter}>
        Don't have an account?{" "}
        <a href="/register" className={styles.inlineLink}>Sign up →</a>
      </p>
    </form>
  );
}

function RegisterFormView() {
  const [role, setRole] = useState("customer");
  return (
    <form className={styles.authForm} onSubmit={(e) => e.preventDefault()}>
      <p className={styles.authFormTitle}>Create your account</p>
      <div className={styles.formFields}>
        <Field label="Name" placeholder="Alex Nakamura" />
        <Field label="Email" type="email" placeholder="alex@example.com" />
        <Field label="Password" type="password" placeholder="••••••••" />
        <Field label="Confirm password" type="password" placeholder="••••••••" />
        <div className={styles.field}>
          <span className={styles.fieldLabel}>I'm signing up as</span>
          <div className={styles.roleSelector}>
            <label className={styles.roleOption}>
              <input
                type="radio"
                name="role"
                value="customer"
                checked={role === "customer"}
                onChange={() => setRole("customer")}
              />
              Customer
            </label>
            <label className={styles.roleOption}>
              <input
                type="radio"
                name="role"
                value="restaurant"
                checked={role === "restaurant"}
                onChange={() => setRole("restaurant")}
              />
              Restaurant owner
            </label>
          </div>
        </div>
        {role === "restaurant" && (
          <div className={styles.conditionalField}>
            <Field label="Restaurant name" placeholder="Riku Ramen House" />
          </div>
        )}
      </div>
      <button type="submit" className={styles.authSubmit}>
        Create account <ArrowRightIcon size={14} weight="bold" />
      </button>
      <p className={styles.authFooter}>
        Already have an account?{" "}
        <a href="/login" className={styles.inlineLink}>Sign in →</a>
      </p>
    </form>
  );
}

// ─────────────────────────────────────────────
// Section 4 — Restaurant Dashboard
// ─────────────────────────────────────────────

function MenuDashboardView() {
  return (
    <div className={styles.menuDash}>
      <div className={styles.menuList}>
        <div className={styles.menuListHeader}>Items</div>
        {MOCK_MENU_ITEMS.map((item) => (
          <div
            key={item.id}
            className={[
              styles.menuItemRow,
              item.selected ? styles.menuItemRowActive : "",
              !item.available ? styles.menuItemRowDimmed : "",
            ].join(" ")}
          >
            <span className={styles.menuItemName}>{item.name}</span>
            <div className={styles.menuItemRight}>
              <span className={styles.menuPrice}>${item.price.toFixed(2)}</span>
              <div className={`${styles.toggle} ${!item.available ? styles.toggleOff : ""}`}>
                <div className={`${styles.toggleThumb} ${!item.available ? styles.toggleThumbOff : ""}`} />
              </div>
            </div>
          </div>
        ))}
        <button className={styles.menuAddBtn}>
          <PlusIcon size={12} /> Add item
        </button>
      </div>

      <div className={styles.menuEditor}>
        <p className={styles.menuEditorTitle}>Edit item</p>
        <div className={styles.menuEditorFields}>
          <Field label="Name" placeholder="Spicy Tonkotsu Ramen" />
          <Field label="Description (optional)" placeholder="Rich pork broth, soft-boiled egg, nori" />
          <Field label="Price" placeholder="16.00" />
        </div>
        <div className={styles.menuEditorActions}>
          <button className={styles.saveBtn}>Save item</button>
          <button className={styles.deleteBtn}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function OrderDashboardView() {
  const total = MOCK_ORDER_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div className={styles.orderCard}>
      <div className={styles.orderCardHeader}>
        <div>
          <div className={styles.orderCardId}>#a3f9c1 · Apr 8, 2026, 12:47 PM</div>
          <div className={styles.orderCardCustomer}>Amara Osei</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className={styles.orderCardTotal}>${total.toFixed(2)}</span>
          <StatusBadge status="confirmed" />
        </div>
      </div>
      <div className={styles.orderCardBody}>
        <table className={styles.orderItemsTable}>
          <tbody>
            {MOCK_ORDER_ITEMS.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td>× {item.qty}</td>
                <td>${(item.price * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.orderActions}>
          <button className={styles.saveBtn}>Mark Preparing</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 5 — Order Tracking
// ─────────────────────────────────────────────

function OrderStepperView({ status }) {
  const activeIdx = status === "cancelled" ? -1 : (STATUS_STEP_IDX[status] ?? 0);
  return (
    <div className={styles.stepperWrap}>
      <div className={styles.stepper}>
        {ORDER_STEPS.map((label, i) => {
          const isCompleted = status !== "cancelled" && i < activeIdx;
          const isActive    = status !== "cancelled" && i === activeIdx;
          return (
            <div
              key={label}
              className={[
                styles.stepItem,
                isCompleted ? styles.stepItemCompleted : "",
              ].join(" ")}
            >
              <div
                className={[
                  styles.stepCircle,
                  isCompleted ? styles.stepCircleCompleted : "",
                  isActive    ? styles.stepCircleActive    : "",
                ].join(" ")}
              >
                {isCompleted && <CheckIcon size={10} weight="bold" className={styles.stepCheck} />}
              </div>
              <span
                className={[
                  styles.stepLabel,
                  isActive    ? styles.stepLabelActive    : "",
                  isCompleted ? styles.stepLabelCompleted : "",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {status === "cancelled" && (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span className={styles.stepperCancelledBadge}>
            <XCircleIcon size={14} weight="fill" /> Cancelled
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Section 6 — Admin Dashboard
// ─────────────────────────────────────────────

function RoleBadge({ role }) {
  const cls = {
    customer:   styles.roleCustomer,
    restaurant: styles.roleRestaurant,
    admin:      styles.roleAdmin,
  }[role] ?? styles.roleCustomer;
  return <span className={`${styles.roleBadge} ${cls}`}>{role}</span>;
}

function UserTableView() {
  return (
    <table className={styles.userTable}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {MOCK_USERS.map((user) => (
          <tr key={user.id}>
            <td className={styles.userNameCell}>{user.name}</td>
            <td className={styles.userEmailCell}>{user.email}</td>
            <td><RoleBadge role={user.role} /></td>
            <td className={styles.userJoinedCell}>{user.joined}</td>
            <td>
              <button className={styles.tableDeleteBtn}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────
// Section 7 — Shared Components
// ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const cls = {
    placed:           styles.statusPlaced,
    confirmed:        styles.statusConfirmed,
    preparing:        styles.statusPreparing,
    out_for_delivery: styles.statusOutForDelivery,
    delivered:        styles.statusDelivered,
    cancelled:        styles.statusCancelled,
  }[status] ?? styles.statusPlaced;

  const label = {
    placed:           "Placed",
    confirmed:        "Confirmed",
    preparing:        "Preparing",
    out_for_delivery: "Out for delivery",
    delivered:        "Delivered",
    cancelled:        "Cancelled",
  }[status] ?? status;

  return <span className={`${styles.statusBadge} ${cls}`}>{label}</span>;
}

function ToastRow({ dismissedStates, onDismiss }) {
  const toasts = [
    { key: "default", cls: styles.toastDefault,  icon: <SpinnerIcon size={14} className="spinIcon" />, text: "Loading order status" },
    { key: "success", cls: styles.toastSuccess,  icon: <CheckCircleIcon size={14} weight="fill" />,   text: "Order placed successfully." },
    { key: "warning", cls: styles.toastWarning,  icon: <WarningIcon size={14} weight="fill" />,        text: "Failed to add menu item to your order." },
    { key: "error",   cls: styles.toastError,    icon: <XCircleIcon size={14} weight="fill" />,        text: "Could not make your order. Please try again." },
  ];

  return (
    <div className={styles.toastRow}>
      {toasts.map(({ key, cls, icon, text }) =>
        dismissedStates[key] ? null : (
          <div key={key} className={`${styles.toast} ${cls}`} role="status">
            {icon}
            {text}
            <button className={styles.toastDismiss} onClick={() => onDismiss(key)} aria-label="Dismiss">
              <XIcon size={12} weight="bold" />
            </button>
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Demo Page
// ─────────────────────────────────────────────

export default function DemoPage() {
  const [loginError,      setLoginError]      = useState(false);
  const [dismissedToasts, setDismissedToasts] = useState({});

  function dismissToast(key) {
    setDismissedToasts((prev) => ({ ...prev, [key]: true }));
  }

  function resetToasts() {
    setDismissedToasts({});
  }

  const allToastsDismissed = Object.keys(dismissedToasts).length === 4;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <nav className={styles.nav}>
          {NAV_SECTIONS.map(([href, label]) => (
            <a key={href} href={href} className={styles.navLink}>{label}</a>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Component States</h1>
        <p className={styles.pageSubtitle}>All conditional UI states grouped by page.</p>
        <br />

        {/* ── Navigation ── */}
        <Section id="nav" title="Shared: Top Navigation">
          <Card label="Logged out">
            <NavView role="guest" />
          </Card>
          <Card label="Customer logged in (3 items in cart)">
            <NavView role="customer" cartCount={3} />
          </Card>
          <Card label="Restaurant owner logged in">
            <NavView role="restaurant" />
          </Card>
          <Card label="Admin logged in">
            <NavView role="admin" />
          </Card>
        </Section>

        {/* ── Home page ── */}
        <Section id="home" title="Home Page">
          <Card label="Restaurant list — populated">
            <RestaurantListView />
          </Card>
          <Card label="Restaurant list — empty (no search results)">
            <RestaurantListView empty />
          </Card>
          <Card label="Cart sidebar — empty">
            <CartEmptyView />
          </Card>
          <Card label="Cart sidebar — with items">
            <CartWithItemsView />
          </Card>
        </Section>

        {/* ── Auth pages ── */}
        <Section
          id="auth"
          title="Auth Pages"
          note="Login and register pages use split-screen layout on desktop. Shown here as the right-panel form only."
        >
          <Card label="Login — idle">
            <LoginFormView hasError={false} />
          </Card>
          <Card
            label={`Login — validation error (interactive: ${loginError ? "error visible" : "no error"})`}
          >
            <div style={{ marginBottom: "1rem" }}>
              <button
                className={styles.resetBtn}
                onClick={() => setLoginError((v) => !v)}
              >
                {loginError ? "Clear error" : "Trigger error"}
              </button>
            </div>
            <LoginFormView hasError={loginError} />
          </Card>
          <Card label="Register — role selector (interactive: toggle Customer / Restaurant owner)">
            <RegisterFormView />
          </Card>
        </Section>

        {/* ── Restaurant Dashboard ── */}
        <Section id="restaurant" title="Restaurant Dashboard">
          <Card label="Menu tab — item list (left) + editor form (right). First item selected." noPad>
            <div className={styles.cardBody}>
              <MenuDashboardView />
            </div>
          </Card>
          <Card label="Orders tab — expanded order card with status action button">
            <OrderDashboardView />
          </Card>
        </Section>

        {/* ── Order Tracking ── */}
        <Section
          id="tracking"
          title="Order Tracking: status stepper"
          note="Stepper shows 5 steps. Active step pulses. Cancelled replaces stepper with a red badge."
        >
          {[
            ["placed",           "Status: placed (step 1 active)"],
            ["confirmed",        "Status: confirmed (step 2 active)"],
            ["preparing",        "Status: preparing (step 3 active)"],
            ["out_for_delivery", "Status: out for delivery (step 4 active)"],
            ["delivered",        "Status: delivered (all steps complete)"],
            ["cancelled",        "Status: cancelled"],
          ].map(([status, label]) => (
            <Card key={status} label={label}>
              <OrderStepperView status={status} />
            </Card>
          ))}
        </Section>

        {/* ── Admin Dashboard ── */}
        <Section id="admin" title="Admin Dashboard">
          <Card label="User table with role badges and delete actions" noPad>
            <UserTableView />
          </Card>
        </Section>

        {/* ── Shared components ── */}
        <Section id="shared" title="Shared Components">
          <Card label="OrderStatusBadge — all 6 variants">
            <div className={styles.badgeRow}>
              {["placed","confirmed","preparing","out_for_delivery","delivered","cancelled"].map(
                (s) => <StatusBadge key={s} status={s} />
              )}
            </div>
          </Card>
          <Card label="RoleBadge — all 3 variants">
            <div className={styles.badgeRow}>
              {["customer","restaurant","admin"].map(
                (r) => <RoleBadge key={r} role={r} />
              )}
            </div>
          </Card>
          <Card
            label={`Toast / banner variants (interactive: dismiss each · ${allToastsDismissed ? "all dismissed" : "some visible"})`}
            noPad
          >
            <ToastRow dismissedStates={dismissedToasts} onDismiss={dismissToast} />
            {allToastsDismissed && (
              <div className={styles.cardBody}>
                <button className={styles.resetBtn} onClick={resetToasts}>
                  Reset all toasts
                </button>
              </div>
            )}
          </Card>
        </Section>
      </main>
    </div>
  );
}
