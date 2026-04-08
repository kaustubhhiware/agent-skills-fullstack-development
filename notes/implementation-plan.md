# Notes

(This is a mostly AI-generated report, to be used as PIC)
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web application where customers browse restaurant menus, place food orders, and track delivery; restaurants manage their menus and incoming orders; and admins manage the platform.

**Architecture:** React frontend (Vite) communicates with a Flask REST API via JSON; the API uses SQLite for persistent storage and JWT for session auth. Each user role (Admin, Restaurant, Customer) gets role-gated routes. No Tailwind — all styles use CSS variables defined in `frontend/app/globals.css`.

**Tech Stack:** React 18 (Vite), Python 3.11 Flask, SQLite3, JWT (PyJWT), pytest, jest, uv, Make.

---

## Design decisions

- Package management: `uv` for Python, `npm` for Node.
- Linting: `ruff` (Python), `prettier` (JS).
- Testing: `pytest` (backend), `jest` (frontend).
- Auth: JWT stored in `localStorage`; all protected routes check `Authorization: Bearer <token>`.
- Passwords: bcrypt (salted + hashed).
- Platform: Railway (flask backend + React served as static build).
- Every developer command is a `make` command, documented in README.
- Backend first, frontend next, platform last.

---

## Database Schema

```
users
  user_id       TEXT PRIMARY KEY (UUID)
  email         TEXT UNIQUE NOT NULL
  password_hash TEXT NOT NULL
  role          TEXT NOT NULL  -- 'admin' | 'restaurant' | 'customer'
  name          TEXT NOT NULL
  created_at    TEXT NOT NULL  -- ISO8601

restaurants
  restaurant_id TEXT PRIMARY KEY (UUID)
  user_id       TEXT NOT NULL  -- FK → users.user_id
  name          TEXT NOT NULL
  address       TEXT NOT NULL
  cuisine_type  TEXT NOT NULL
  created_at    TEXT NOT NULL

menu_items
  item_id       TEXT PRIMARY KEY (UUID)
  restaurant_id TEXT NOT NULL  -- FK → restaurants.restaurant_id
  name          TEXT NOT NULL
  description   TEXT
  price         REAL NOT NULL
  category      TEXT NOT NULL
  available     INTEGER NOT NULL DEFAULT 1  -- 0/1 boolean

orders
  order_id      TEXT PRIMARY KEY (UUID)
  customer_id   TEXT NOT NULL  -- FK → users.user_id
  restaurant_id TEXT NOT NULL  -- FK → restaurants.restaurant_id
  status        TEXT NOT NULL  -- 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  total_amount  REAL NOT NULL
  created_at    TEXT NOT NULL
  updated_at    TEXT NOT NULL

order_items
  order_item_id TEXT PRIMARY KEY (UUID)
  order_id      TEXT NOT NULL  -- FK → orders.order_id
  item_id       TEXT NOT NULL  -- FK → menu_items.item_id
  name          TEXT NOT NULL  -- snapshot at order time
  price         REAL NOT NULL  -- snapshot at order time
  quantity      INTEGER NOT NULL

order_history  (bonus: for favorites suggestion)
  history_id    TEXT PRIMARY KEY (UUID)
  customer_id   TEXT NOT NULL  -- FK → users.user_id
  item_id       TEXT NOT NULL  -- FK → menu_items.item_id
  order_count   INTEGER NOT NULL DEFAULT 1
  last_ordered  TEXT NOT NULL  -- ISO8601
```

---

## File Structure

```
.
├── Makefile
├── README.md
├── backend/
│   ├── pyproject.toml
│   ├── app.py                   # Flask app factory + CORS + JWT config
│   ├── db.py                    # SQLite connection helper + init_db()
│   ├── models/
│   │   ├── user.py              # User CRUD
│   │   ├── restaurant.py        # Restaurant CRUD
│   │   ├── menu.py              # Menu item CRUD
│   │   └── order.py             # Order CRUD + status transitions
│   ├── routes/
│   │   ├── auth.py              # POST /auth/register, /auth/login
│   │   ├── restaurants.py       # GET /restaurants, GET /restaurants/:id
│   │   ├── menu.py              # GET/POST/PATCH/DELETE /restaurants/:id/menu
│   │   ├── orders.py            # POST /orders, GET /orders/:id, PATCH /orders/:id/status
│   │   └── admin.py             # GET /admin/users, DELETE /admin/users/:id
│   ├── middleware/
│   │   └── auth.py              # require_auth, require_role decorators
│   └── tests/
│       ├── conftest.py          # in-memory SQLite fixture, test client
│       ├── test_auth.py
│       ├── test_restaurants.py
│       ├── test_menu.py
│       └── test_orders.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── app/
    │   └── globals.css          # CSS custom properties (color tokens)
    ├── src/
    │   ├── main.jsx             # React root, router
    │   ├── api.js               # fetch wrapper (base URL, auth header)
    │   ├── contexts/
    │   │   └── AuthContext.jsx  # AuthContext + useAuth hook (token, role, login, logout)
    │   ├── pages/
    │   │   ├── Home.jsx         # Landing: browse menu, search, cart sidebar
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx     # Role-aware registration form
    │   │   ├── RestaurantDashboard.jsx   # Restaurant: manage menu + view orders
    │   │   ├── OrderTracking.jsx         # Customer: live order status
    │   │   └── AdminDashboard.jsx        # Admin: user list
    │   └── components/
    │       ├── MenuCard.jsx
    │       ├── Cart.jsx
    │       ├── OrderStatusBadge.jsx
    │       └── ProtectedRoute.jsx
    └── src/__tests__/
        ├── Home.test.jsx
        ├── Cart.test.jsx
        └── Register.test.jsx
```

---

## Phase-wise Implementation

---

### Task 1: Project Scaffold + Makefile

**Files:**
- Create: `Makefile`
- Create: `backend/pyproject.toml`
- Create: `backend/app.py`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`

- [ ] **Step 1: Initialise backend**

```bash
cd backend
uv init --python 3.11
uv add flask flask-cors pyjwt bcrypt
uv add --dev pytest pytest-flask
```

- [ ] **Step 2: Create `backend/app.py`**

```python
import os
from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.restaurants import restaurants_bp
from routes.menu import menu_bp
from routes.orders import orders_bp
from routes.admin import admin_bp
from db import init_db

def create_app(config=None):
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret")
    app.config["DATABASE"] = os.environ.get("DATABASE", "restaurant.db")
    if config:
        app.config.update(config)
    CORS(app, origins=["http://localhost:5173"])
    init_db(app)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(restaurants_bp, url_prefix="/restaurants")
    app.register_blueprint(menu_bp)
    app.register_blueprint(orders_bp, url_prefix="/orders")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    return app

if __name__ == "__main__":
    create_app().run(debug=True, port=5000)
```

- [ ] **Step 3: Initialise frontend**

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install react-router-dom
```

- [ ] **Step 4: Create `Makefile`**

```makefile
.PHONY: dev-backend dev-frontend install-backend install-frontend test-backend test-frontend reset-db

install-backend:
	cd backend && uv sync

install-frontend:
	cd frontend && npm install

dev-backend:
	cd backend && uv run python app.py

dev-frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && uv run pytest -v

test-frontend:
	cd frontend && npm test -- --watchAll=false

reset-db:
	rm -f backend/restaurant.db
```

- [ ] **Step 5: Commit**

```bash
git add Makefile backend/pyproject.toml backend/app.py frontend/package.json frontend/vite.config.js
git commit -m "chore: scaffold backend and frontend projects"
```

---

### Task 2: Database Init + Schema

**Files:**
- Create: `backend/db.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/conftest.py
import pytest
from app import create_app

@pytest.fixture
def app():
    app = create_app({"TESTING": True, "DATABASE": ":memory:"})
    return app

@pytest.fixture
def client(app):
    return app.test_client()
```

```python
# backend/tests/test_auth.py
def test_db_initialises(client):
    """Health check — server returns 404 not 500."""
    resp = client.get("/nonexistent")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_auth.py::test_db_initialises -v
```

Expected: ImportError or RuntimeError (db.py does not exist yet)

- [ ] **Step 3: Create `backend/db.py`**

```python
import sqlite3
import uuid
from flask import g

DDL = """
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','restaurant','customer')),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS restaurants (
    restaurant_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    cuisine_type TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS menu_items (
    item_id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(restaurant_id),
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES users(user_id),
    restaurant_id TEXT NOT NULL REFERENCES restaurants(restaurant_id),
    status TEXT NOT NULL DEFAULT 'placed',
    total_amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(order_id),
    item_id TEXT NOT NULL REFERENCES menu_items(item_id),
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_history (
    history_id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES users(user_id),
    item_id TEXT NOT NULL REFERENCES menu_items(item_id),
    order_count INTEGER NOT NULL DEFAULT 1,
    last_ordered TEXT NOT NULL
);
"""

def get_db(app):
    # NOTE: Call as get_db(current_app) from within route handlers.
    # current_app and g are both available during request handling.
    # Never call get_db outside a request or app context.
    if "db" not in g:
        g.db = sqlite3.connect(
            app.config["DATABASE"],
            detect_types=sqlite3.PARSE_DECLTYPES,
        )
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db

def init_db(app):
    with app.app_context():
        db = sqlite3.connect(app.config["DATABASE"])
        db.executescript(DDL)
        db.commit()
        db.close()

def new_id():
    return str(uuid.uuid4())
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && uv run pytest tests/test_auth.py::test_db_initialises -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/db.py backend/tests/conftest.py backend/tests/test_auth.py
git commit -m "feat: database init with full schema"
```

---

### Task 3: Auth — Register + Login

**Files:**
- Create: `backend/middleware/auth.py`
- Create: `backend/routes/auth.py`
- Modify: `backend/tests/test_auth.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_auth.py
import json

def test_register_customer(client):
    resp = client.post("/auth/register", json={
        "email": "alice@example.com",
        "password": "password123",
        "name": "Alice",
        "role": "customer"
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert "token" in data
    assert data["role"] == "customer"

def test_register_duplicate_email(client):
    payload = {"email": "bob@example.com", "password": "x", "name": "Bob", "role": "customer"}
    client.post("/auth/register", json=payload)
    resp = client.post("/auth/register", json=payload)
    assert resp.status_code == 409

def test_login_success(client):
    client.post("/auth/register", json={
        "email": "carol@example.com", "password": "pass", "name": "Carol", "role": "customer"
    })
    resp = client.post("/auth/login", json={"email": "carol@example.com", "password": "pass"})
    assert resp.status_code == 200
    assert "token" in resp.get_json()

def test_login_wrong_password(client):
    client.post("/auth/register", json={
        "email": "dave@example.com", "password": "correct", "name": "Dave", "role": "customer"
    })
    resp = client.post("/auth/login", json={"email": "dave@example.com", "password": "wrong"})
    assert resp.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_auth.py -v
```

Expected: FAIL — blueprint not registered

- [ ] **Step 3: Create `backend/middleware/auth.py`**

```python
import jwt
from functools import wraps
from flask import request, jsonify, current_app

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401
        token = header[7:]
        try:
            payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        request.user = payload
        return f(*args, **kwargs)
    return decorated

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if request.user.get("role") not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
```

- [ ] **Step 4: Create `backend/routes/auth.py`**

```python
import bcrypt
import jwt
import datetime
from flask import Blueprint, request, jsonify, current_app, g
from db import get_db, new_id

auth_bp = Blueprint("auth", __name__)

VALID_ROLES = {"admin", "restaurant", "customer"}

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()
    role = data.get("role", "customer")
    if not email or not password or not name:
        return jsonify({"error": "email, password, and name are required"}), 400
    if role not in VALID_ROLES:
        return jsonify({"error": f"role must be one of {VALID_ROLES}"}), 400
    db = get_db(current_app)
    if db.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
        return jsonify({"error": "Email already registered"}), 409
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = new_id()
    now = datetime.datetime.utcnow().isoformat()
    db.execute(
        "INSERT INTO users(user_id, email, password_hash, role, name, created_at) VALUES(?,?,?,?,?,?)",
        (user_id, email, hashed, role, name, now)
    )
    db.commit()
    token = _make_token(user_id, role, current_app.config["SECRET_KEY"])
    return jsonify({"token": token, "user_id": user_id, "role": role, "name": name}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    db = get_db(current_app)
    row = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not row or not bcrypt.checkpw(password.encode(), row["password_hash"].encode()):
        return jsonify({"error": "Invalid credentials"}), 401
    token = _make_token(row["user_id"], row["role"], current_app.config["SECRET_KEY"])
    return jsonify({"token": token, "user_id": row["user_id"], "role": row["role"], "name": row["name"]}), 200

def _make_token(user_id, role, secret):
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(payload, secret, algorithm="HS256")
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_auth.py -v
```

Expected: All 5 PASS

- [ ] **Step 6: Commit**

```bash
git add backend/middleware/auth.py backend/routes/auth.py backend/tests/test_auth.py
git commit -m "feat: user registration and login with JWT"
```

---

### Task 4: Restaurant Model + Routes

**Files:**
- Create: `backend/models/restaurant.py`
- Create: `backend/routes/restaurants.py`
- Create: `backend/tests/test_restaurants.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_restaurants.py
import pytest

@pytest.fixture
def restaurant_token(client):
    resp = client.post("/auth/register", json={
        "email": "resto@example.com", "password": "pass",
        "name": "Sushi Place", "role": "restaurant"
    })
    return resp.get_json()["token"]

@pytest.fixture
def customer_token(client):
    resp = client.post("/auth/register", json={
        "email": "cust@example.com", "password": "pass",
        "name": "Jane", "role": "customer"
    })
    return resp.get_json()["token"]

def test_create_restaurant(client, restaurant_token):
    resp = client.post("/restaurants", json={
        "name": "Sushi Place", "address": "1 Main St", "cuisine_type": "Japanese"
    }, headers={"Authorization": f"Bearer {restaurant_token}"})
    assert resp.status_code == 201
    assert resp.get_json()["name"] == "Sushi Place"

def test_create_restaurant_forbidden_for_customer(client, customer_token):
    resp = client.post("/restaurants", json={
        "name": "X", "address": "Y", "cuisine_type": "Z"
    }, headers={"Authorization": f"Bearer {customer_token}"})
    assert resp.status_code == 403

def test_list_restaurants(client, restaurant_token):
    client.post("/restaurants", json={
        "name": "Ramen Shop", "address": "2 Main St", "cuisine_type": "Japanese"
    }, headers={"Authorization": f"Bearer {restaurant_token}"})
    resp = client.get("/restaurants")
    assert resp.status_code == 200
    assert len(resp.get_json()) >= 1

def test_get_restaurant_by_id(client, restaurant_token):
    create = client.post("/restaurants", json={
        "name": "Curry House", "address": "3 Main St", "cuisine_type": "Indian"
    }, headers={"Authorization": f"Bearer {restaurant_token}"})
    rid = create.get_json()["restaurant_id"]
    resp = client.get(f"/restaurants/{rid}")
    assert resp.status_code == 200
    assert resp.get_json()["restaurant_id"] == rid
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_restaurants.py -v
```

Expected: FAIL — blueprint not registered

- [ ] **Step 3: Create `backend/routes/restaurants.py`**

```python
import datetime
from flask import Blueprint, request, jsonify, current_app
from db import get_db, new_id
from middleware.auth import require_role

restaurants_bp = Blueprint("restaurants", __name__)

@restaurants_bp.route("", methods=["GET"])
def list_restaurants():
    db = get_db(current_app)
    rows = db.execute("SELECT * FROM restaurants ORDER BY name").fetchall()
    return jsonify([dict(r) for r in rows]), 200

@restaurants_bp.route("/<restaurant_id>", methods=["GET"])
def get_restaurant(restaurant_id):
    db = get_db(current_app)
    row = db.execute("SELECT * FROM restaurants WHERE restaurant_id=?", (restaurant_id,)).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(row)), 200

@restaurants_bp.route("", methods=["POST"])
@require_role("restaurant", "admin")
def create_restaurant():
    data = request.get_json()
    name = data.get("name", "").strip()
    address = data.get("address", "").strip()
    cuisine_type = data.get("cuisine_type", "").strip()
    if not name or not address or not cuisine_type:
        return jsonify({"error": "name, address, and cuisine_type are required"}), 400
    restaurant_id = new_id()
    now = datetime.datetime.utcnow().isoformat()
    db = get_db(current_app)
    db.execute(
        "INSERT INTO restaurants(restaurant_id, user_id, name, address, cuisine_type, created_at) VALUES(?,?,?,?,?,?)",
        (restaurant_id, request.user["sub"], name, address, cuisine_type, now)
    )
    db.commit()
    return jsonify({"restaurant_id": restaurant_id, "name": name, "address": address, "cuisine_type": cuisine_type}), 201
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_restaurants.py -v
```

Expected: All 4 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/restaurants.py backend/tests/test_restaurants.py
git commit -m "feat: restaurant listing and creation endpoints"
```

---

### Task 5: Menu Item Routes

**Files:**
- Create: `backend/routes/menu.py`
- Create: `backend/tests/test_menu.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_menu.py
import pytest

@pytest.fixture
def restaurant_and_token(client):
    resp = client.post("/auth/register", json={
        "email": "chef@example.com", "password": "pass",
        "name": "Chef", "role": "restaurant"
    })
    token = resp.get_json()["token"]
    create = client.post("/restaurants", json={
        "name": "Bistro", "address": "5 Elm St", "cuisine_type": "French"
    }, headers={"Authorization": f"Bearer {token}"})
    return create.get_json()["restaurant_id"], token

def test_add_menu_item(client, restaurant_and_token):
    rid, token = restaurant_and_token
    resp = client.post(f"/restaurants/{rid}/menu", json={
        "name": "Croissant", "description": "Buttery", "price": 3.50, "category": "Bakery"
    }, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 201
    assert resp.get_json()["name"] == "Croissant"

def test_list_menu_items(client, restaurant_and_token):
    rid, token = restaurant_and_token
    client.post(f"/restaurants/{rid}/menu", json={
        "name": "Baguette", "price": 2.00, "category": "Bakery"
    }, headers={"Authorization": f"Bearer {token}"})
    resp = client.get(f"/restaurants/{rid}/menu")
    assert resp.status_code == 200
    items = resp.get_json()
    assert len(items) >= 1

def test_toggle_availability(client, restaurant_and_token):
    rid, token = restaurant_and_token
    create = client.post(f"/restaurants/{rid}/menu", json={
        "name": "Eclair", "price": 4.00, "category": "Dessert"
    }, headers={"Authorization": f"Bearer {token}"})
    item_id = create.get_json()["item_id"]
    resp = client.patch(f"/restaurants/{rid}/menu/{item_id}", json={"available": 0},
                        headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.get_json()["available"] == 0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_menu.py -v
```

Expected: FAIL — routes not registered

- [ ] **Step 3: Create `backend/routes/menu.py`**

```python
import datetime
from flask import Blueprint, request, jsonify, current_app
from db import get_db, new_id
from middleware.auth import require_auth, require_role

menu_bp = Blueprint("menu", __name__)

@menu_bp.route("/restaurants/<restaurant_id>/menu", methods=["GET"])
def list_menu(restaurant_id):
    db = get_db(current_app)
    rows = db.execute(
        "SELECT * FROM menu_items WHERE restaurant_id=? ORDER BY category, name",
        (restaurant_id,)
    ).fetchall()
    return jsonify([dict(r) for r in rows]), 200

@menu_bp.route("/restaurants/<restaurant_id>/menu", methods=["POST"])
@require_role("restaurant", "admin")
def add_menu_item(restaurant_id):
    db = get_db(current_app)
    resto = db.execute(
        "SELECT user_id FROM restaurants WHERE restaurant_id=?", (restaurant_id,)
    ).fetchone()
    if not resto:
        return jsonify({"error": "Restaurant not found"}), 404
    if request.user["role"] != "admin" and resto["user_id"] != request.user["sub"]:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json()
    name = data.get("name", "").strip()
    price = data.get("price")
    category = data.get("category", "").strip()
    if not name or price is None or not category:
        return jsonify({"error": "name, price, and category are required"}), 400
    item_id = new_id()
    db.execute(
        "INSERT INTO menu_items(item_id, restaurant_id, name, description, price, category) VALUES(?,?,?,?,?,?)",
        (item_id, restaurant_id, name, data.get("description", ""), float(price), category)
    )
    db.commit()
    return jsonify({"item_id": item_id, "name": name, "price": float(price), "category": category, "available": 1}), 201

@menu_bp.route("/restaurants/<restaurant_id>/menu/<item_id>", methods=["PATCH"])
@require_role("restaurant", "admin")
def update_menu_item(restaurant_id, item_id):
    db = get_db(current_app)
    row = db.execute(
        "SELECT m.*, r.user_id AS owner_id FROM menu_items m "
        "JOIN restaurants r USING(restaurant_id) WHERE item_id=?", (item_id,)
    ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    if request.user["role"] != "admin" and row["owner_id"] != request.user["sub"]:
        return jsonify({"error": "Forbidden"}), 403
    data = request.get_json()
    fields = {k: v for k, v in data.items() if k in ("name", "description", "price", "category", "available")}
    if not fields:
        return jsonify({"error": "No updatable fields provided"}), 400
    set_clause = ", ".join(f"{k}=?" for k in fields)
    db.execute(f"UPDATE menu_items SET {set_clause} WHERE item_id=?", (*fields.values(), item_id))
    db.commit()
    updated = dict(db.execute("SELECT * FROM menu_items WHERE item_id=?", (item_id,)).fetchone())
    return jsonify(updated), 200
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_menu.py -v
```

Expected: All 3 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/menu.py backend/tests/test_menu.py
git commit -m "feat: menu item CRUD endpoints"
```

---

### Task 6: Order Routes + Status Transitions

**Files:**
- Create: `backend/routes/orders.py`
- Create: `backend/tests/test_orders.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_orders.py
import pytest

STATUSES = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"]

@pytest.fixture
def setup(client):
    resto = client.post("/auth/register", json={
        "email": "r@r.com", "password": "p", "name": "R", "role": "restaurant"
    }).get_json()
    cust = client.post("/auth/register", json={
        "email": "c@c.com", "password": "p", "name": "C", "role": "customer"
    }).get_json()
    restaurant = client.post("/restaurants", json={
        "name": "R", "address": "A", "cuisine_type": "X"
    }, headers={"Authorization": f"Bearer {resto['token']}"}).get_json()
    item = client.post(f"/restaurants/{restaurant['restaurant_id']}/menu", json={
        "name": "Burger", "price": 10.00, "category": "Mains"
    }, headers={"Authorization": f"Bearer {resto['token']}"}).get_json()
    return {
        "resto_token": resto["token"],
        "cust_token": cust["token"],
        "restaurant_id": restaurant["restaurant_id"],
        "item_id": item["item_id"],
    }

def test_place_order(client, setup):
    resp = client.post("/orders", json={
        "restaurant_id": setup["restaurant_id"],
        "items": [{"item_id": setup["item_id"], "quantity": 2}]
    }, headers={"Authorization": f"Bearer {setup['cust_token']}"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["status"] == "placed"
    assert data["total_amount"] == 20.0

def test_get_order(client, setup):
    create = client.post("/orders", json={
        "restaurant_id": setup["restaurant_id"],
        "items": [{"item_id": setup["item_id"], "quantity": 1}]
    }, headers={"Authorization": f"Bearer {setup['cust_token']}"}).get_json()
    resp = client.get(f"/orders/{create['order_id']}",
                      headers={"Authorization": f"Bearer {setup['cust_token']}"})
    assert resp.status_code == 200

def test_advance_order_status(client, setup):
    order = client.post("/orders", json={
        "restaurant_id": setup["restaurant_id"],
        "items": [{"item_id": setup["item_id"], "quantity": 1}]
    }, headers={"Authorization": f"Bearer {setup['cust_token']}"}).get_json()
    resp = client.patch(f"/orders/{order['order_id']}/status", json={"status": "confirmed"},
                        headers={"Authorization": f"Bearer {setup['resto_token']}"})
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "confirmed"

def test_invalid_status_transition(client, setup):
    order = client.post("/orders", json={
        "restaurant_id": setup["restaurant_id"],
        "items": [{"item_id": setup["item_id"], "quantity": 1}]
    }, headers={"Authorization": f"Bearer {setup['cust_token']}"}).get_json()
    resp = client.patch(f"/orders/{order['order_id']}/status", json={"status": "delivered"},
                        headers={"Authorization": f"Bearer {setup['resto_token']}"})
    assert resp.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_orders.py -v
```

Expected: FAIL

- [ ] **Step 3: Create `backend/routes/orders.py`**

```python
import datetime
from flask import Blueprint, request, jsonify, current_app
from db import get_db, new_id
from middleware.auth import require_auth, require_role

orders_bp = Blueprint("orders", __name__)

# Valid forward transitions only
VALID_TRANSITIONS = {
    "placed": {"confirmed", "cancelled"},
    "confirmed": {"preparing", "cancelled"},
    "preparing": {"out_for_delivery"},
    "out_for_delivery": {"delivered"},
    "delivered": set(),
    "cancelled": set(),
}

@orders_bp.route("", methods=["POST"])
@require_role("customer")
def place_order():
    data = request.get_json()
    restaurant_id = data.get("restaurant_id")
    items = data.get("items", [])
    if not restaurant_id or not items:
        return jsonify({"error": "restaurant_id and items are required"}), 400
    db = get_db(current_app)
    if not db.execute("SELECT 1 FROM restaurants WHERE restaurant_id=?", (restaurant_id,)).fetchone():
        return jsonify({"error": "Restaurant not found"}), 404
    order_items = []
    total = 0.0
    for entry in items:
        item = db.execute("SELECT * FROM menu_items WHERE item_id=? AND available=1", (entry["item_id"],)).fetchone()
        if not item:
            return jsonify({"error": f"Item {entry['item_id']} not available"}), 400
        qty = int(entry["quantity"])
        order_items.append((new_id(), None, item["item_id"], item["name"], item["price"], qty))
        total += item["price"] * qty
    order_id = new_id()
    now = datetime.datetime.utcnow().isoformat()
    db.execute(
        "INSERT INTO orders(order_id, customer_id, restaurant_id, status, total_amount, created_at, updated_at) VALUES(?,?,?,?,?,?,?)",
        (order_id, request.user["sub"], restaurant_id, "placed", total, now, now)
    )
    # NOTE: order_history writes (for favorites) are added in Task 14.
    # Without Task 14, the order_history table will remain empty and favorites will return no data.
    for oi in order_items:
        db.execute(
            "INSERT INTO order_items(order_item_id, order_id, item_id, name, price, quantity) VALUES(?,?,?,?,?,?)",
            (oi[0], order_id, oi[2], oi[3], oi[4], oi[5])
        )
    db.commit()
    return jsonify({"order_id": order_id, "status": "placed", "total_amount": total}), 201

@orders_bp.route("/<order_id>", methods=["GET"])
@require_auth
def get_order(order_id):
    db = get_db(current_app)
    order = db.execute("SELECT * FROM orders WHERE order_id=?", (order_id,)).fetchone()
    if not order:
        return jsonify({"error": "Not found"}), 404
    user = request.user
    if user["role"] == "customer" and order["customer_id"] != user["sub"]:
        return jsonify({"error": "Forbidden"}), 403
    items = db.execute("SELECT * FROM order_items WHERE order_id=?", (order_id,)).fetchall()
    return jsonify({**dict(order), "items": [dict(i) for i in items]}), 200

@orders_bp.route("/<order_id>/status", methods=["PATCH"])
@require_role("restaurant", "admin")
def update_status(order_id):
    db = get_db(current_app)
    order = db.execute("SELECT * FROM orders WHERE order_id=?", (order_id,)).fetchone()
    if not order:
        return jsonify({"error": "Not found"}), 404
    new_status = request.get_json().get("status")
    if new_status not in VALID_TRANSITIONS.get(order["status"], set()):
        return jsonify({"error": f"Cannot transition from '{order['status']}' to '{new_status}'"}), 400
    now = datetime.datetime.utcnow().isoformat()
    db.execute("UPDATE orders SET status=?, updated_at=? WHERE order_id=?", (new_status, now, order_id))
    db.commit()
    return jsonify({"order_id": order_id, "status": new_status}), 200
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_orders.py -v
```

Expected: All 4 PASS

- [ ] **Step 5: Commit**

```bash
git add backend/routes/orders.py backend/tests/test_orders.py
git commit -m "feat: order placement, retrieval, and status transitions"
```

---

### Task 7: Admin Route

**Files:**
- Create: `backend/routes/admin.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_auth.py (append)
def test_admin_can_list_users(client):
    admin_resp = client.post("/auth/register", json={
        "email": "admin@example.com", "password": "adminpass",
        "name": "Admin", "role": "admin"
    })
    token = admin_resp.get_json()["token"]
    resp = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    users = resp.get_json()
    assert any(u["email"] == "admin@example.com" for u in users)

def test_customer_cannot_access_admin(client):
    cust = client.post("/auth/register", json={
        "email": "notadmin@example.com", "password": "x",
        "name": "NotAdmin", "role": "customer"
    }).get_json()
    resp = client.get("/admin/users", headers={"Authorization": f"Bearer {cust['token']}"})
    assert resp.status_code == 403
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && uv run pytest tests/test_auth.py::test_admin_can_list_users tests/test_auth.py::test_customer_cannot_access_admin -v
```

Expected: FAIL

- [ ] **Step 3: Create `backend/routes/admin.py`**

```python
from flask import Blueprint, jsonify, current_app
from db import get_db
from middleware.auth import require_role

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/users", methods=["GET"])
@require_role("admin")
def list_users():
    db = get_db(current_app)
    rows = db.execute("SELECT user_id, email, role, name, created_at FROM users ORDER BY created_at DESC").fetchall()
    return jsonify([dict(r) for r in rows]), 200
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && uv run pytest tests/test_auth.py -v
```

Expected: All PASS

- [ ] **Step 5: Run full backend test suite**

```bash
cd backend && uv run pytest -v
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/routes/admin.py backend/tests/test_auth.py
git commit -m "feat: admin user listing endpoint"
```

---

### Task 8: Frontend — CSS Tokens + API Client

**Files:**
- Create: `frontend/app/globals.css`
- Create: `frontend/src/api.js`
- Modify: `frontend/src/main.jsx`

- [ ] **Step 1: Create `frontend/app/globals.css`**

```css
:root {
  --color-page: #0f0f0f;
  --color-surface: #1a1a1a;
  --color-border: #2e2e2e;
  --color-text-primary: #f0f0f0;
  --color-text-secondary: #a0a0a0;
  --color-accent: #f5a623;
  --color-accent-hover: #e09510;
  --color-success: #4caf50;
  --color-error: #e53935;
  --color-warning: #fb8c00;
  --color-badge-placed: #1565c0;
  --color-badge-confirmed: #6a1b9a;
  --color-badge-preparing: #e65100;
  --color-badge-out_for_delivery: #558b2f;
  --color-badge-delivered: #2e7d32;
  --color-badge-cancelled: #b71c1c;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --font-sans: "Inter", system-ui, sans-serif;
  --radius-sm: 4px;
  --radius-md: 8px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 40px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--color-page);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
  min-height: 100vh;
}
```

- [ ] **Step 2: Import globals.css in `frontend/src/main.jsx`**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "../app/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3: Create `frontend/src/api.js`**

```js
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const resp = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = data?.error ?? `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};
```

- [ ] **Step 4: Verify frontend starts**

Run in a terminal:
```bash
make dev-frontend
```

Open `http://localhost:5173` — expect a blank or default Vite page, no console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/globals.css frontend/src/main.jsx frontend/src/api.js
git commit -m "feat: CSS design tokens and API client"
```

---

### Task 9: Frontend — Auth Context + useAuth Hook

**Files:**
- Create: `frontend/src/contexts/AuthContext.jsx`
- Modify: `frontend/src/main.jsx` (wrap with `AuthProvider`)

**Why this task exists:** `ProtectedRoute`, `Login`, `Register`, `Home`, and `RestaurantDashboard` all need to read and mutate auth state. Scattering `localStorage.getItem("token")` calls across every component causes stale reads after logout and races between components. A single context ensures a single source of truth and a clean logout signal.

- [ ] **Step 1: Create `frontend/src/contexts/AuthContext.jsx`**

```jsx
import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("user_id");
    const name = localStorage.getItem("name");
    return token ? { token, role, userId, name } : null;
  });

  const login = useCallback((data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("user_id", data.user_id);
    localStorage.setItem("name", data.name);
    setAuth({ token: data.token, role: data.role, userId: data.user_id, name: data.name });
  }, []);

  const logout = useCallback(() => {
    ["token", "role", "user_id", "name"].forEach(k => localStorage.removeItem(k));
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Wrap app with `AuthProvider` in `frontend/src/main.jsx`**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import App from "./App";
import "../app/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/contexts/AuthContext.jsx frontend/src/main.jsx
git commit -m "feat: auth context and useAuth hook"
```

---

### Task 10: Frontend — Auth Pages (Login + Register)

**Files:**
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Register.jsx`
- Create: `frontend/src/App.jsx`

- [ ] **Step 1: Create `frontend/src/App.jsx`**

```jsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import OrderTracking from "./pages/OrderTracking";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={
        <ProtectedRoute roles={["restaurant"]}><RestaurantDashboard /></ProtectedRoute>
      } />
      <Route path="/orders/:orderId" element={
        <ProtectedRoute roles={["customer", "restaurant", "admin"]}><OrderTracking /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/ProtectedRoute.jsx`**

```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { auth } = useAuth();
  if (!auth || (roles && !roles.includes(auth.role))) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
```

- [ ] **Step 3: Create `frontend/src/pages/Login.jsx`**

```jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

const STYLES = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-page)" },
  card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--spacing-xl)", width: "100%", maxWidth: "400px" },
  title: { fontSize: "1.5rem", fontWeight: 700, marginBottom: "var(--spacing-lg)", color: "var(--color-text-primary)" },
  field: { marginBottom: "var(--spacing-md)" },
  label: { display: "block", marginBottom: "var(--spacing-xs)", color: "var(--color-text-secondary)", fontSize: "0.875rem" },
  input: { width: "100%", padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-page)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", fontSize: "1rem" },
  button: { width: "100%", padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-accent)", color: "#000", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "1rem", cursor: "pointer", marginTop: "var(--spacing-sm)" },
  error: { color: "var(--color-error)", fontSize: "0.875rem", marginTop: "var(--spacing-sm)" },
  link: { display: "block", marginTop: "var(--spacing-md)", color: "var(--color-accent)", textAlign: "center", fontSize: "0.875rem" },
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const data = await api.post("/auth/login", { email, password });
      login(data);
      navigate(data.role === "restaurant" ? "/dashboard" : "/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={STYLES.page}>
      <div style={STYLES.card}>
        <h1 style={STYLES.title}>Sign in</h1>
        <form onSubmit={handleSubmit}>
          <div style={STYLES.field}>
            <label style={STYLES.label}>Email</label>
            <input style={STYLES.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={STYLES.field}>
            <label style={STYLES.label}>Password</label>
            <input style={STYLES.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={STYLES.error}>{error}</p>}
          <button style={STYLES.button} type="submit">Sign in</button>
        </form>
        <Link style={STYLES.link} to="/register">Don't have an account? Register</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `frontend/src/pages/Register.jsx`**

```jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

const ROLES = [
  { value: "customer", label: "Customer" },
  { value: "restaurant", label: "Restaurant owner" },
];

const STYLES = {
  page: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-page)" },
  card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--spacing-xl)", width: "100%", maxWidth: "400px" },
  title: { fontSize: "1.5rem", fontWeight: 700, marginBottom: "var(--spacing-lg)" },
  field: { marginBottom: "var(--spacing-md)" },
  label: { display: "block", marginBottom: "var(--spacing-xs)", color: "var(--color-text-secondary)", fontSize: "0.875rem" },
  input: { width: "100%", padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-page)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", fontSize: "1rem" },
  select: { width: "100%", padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-page)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", fontSize: "1rem" },
  button: { width: "100%", padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-accent)", color: "#000", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, fontSize: "1rem", cursor: "pointer", marginTop: "var(--spacing-sm)" },
  error: { color: "var(--color-error)", fontSize: "0.875rem", marginTop: "var(--spacing-sm)" },
  link: { display: "block", marginTop: "var(--spacing-md)", color: "var(--color-accent)", textAlign: "center", fontSize: "0.875rem" },
};

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const data = await api.post("/auth/register", { name, email, password, role });
      login(data);
      navigate(data.role === "restaurant" ? "/dashboard" : "/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={STYLES.page}>
      <div style={STYLES.card}>
        <h1 style={STYLES.title}>Create account</h1>
        <form onSubmit={handleSubmit}>
          <div style={STYLES.field}>
            <label style={STYLES.label}>Name</label>
            <input style={STYLES.input} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div style={STYLES.field}>
            <label style={STYLES.label}>Email</label>
            <input style={STYLES.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={STYLES.field}>
            <label style={STYLES.label}>Password</label>
            <input style={STYLES.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div style={STYLES.field}>
            <label style={STYLES.label}>I am a</label>
            <select style={STYLES.select} value={role} onChange={e => setRole(e.target.value)}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {error && <p style={STYLES.error}>{error}</p>}
          <button style={STYLES.button} type="submit">Register</button>
        </form>
        <Link style={STYLES.link} to="/login">Already have an account? Sign in</Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify manually**

```bash
make dev-backend   # terminal 1
make dev-frontend  # terminal 2
```

Navigate to `http://localhost:5173/register`, register as a customer, confirm redirect to home. Register as restaurant, confirm redirect to `/dashboard`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/ProtectedRoute.jsx frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx
git commit -m "feat: login and registration pages"
```

---

### Task 11: Frontend — Home Page (Browse + Search + Cart)

**Files:**
- Create: `frontend/src/pages/Home.jsx`
- Create: `frontend/src/components/MenuCard.jsx`
- Create: `frontend/src/components/Cart.jsx`

- [ ] **Step 1: Create `frontend/src/components/MenuCard.jsx`**

```jsx
const STYLES = {
  card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--spacing-md)", display: "flex", flexDirection: "column", gap: "var(--spacing-xs)" },
  name: { fontWeight: 600, color: "var(--color-text-primary)" },
  restaurant: { fontSize: "0.8rem", color: "var(--color-text-secondary)" },
  category: { fontSize: "0.75rem", color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" },
  price: { fontWeight: 700, color: "var(--color-accent)", fontSize: "1.1rem" },
  button: { marginTop: "auto", padding: "var(--spacing-xs) var(--spacing-md)", background: "var(--color-accent)", color: "#000", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" },
};

export default function MenuCard({ item, restaurantName, onAdd }) {
  return (
    <div style={STYLES.card}>
      <span style={STYLES.category}>{item.category}</span>
      <span style={STYLES.name}>{item.name}</span>
      {item.description && <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{item.description}</span>}
      <span style={STYLES.restaurant}>{restaurantName}</span>
      <span style={STYLES.price}>¥{item.price.toFixed(2)}</span>
      <button style={STYLES.button} onClick={() => onAdd(item, restaurantName)}>Add to cart</button>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/components/Cart.jsx`**

```jsx
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useState } from "react";

const STYLES = {
  panel: { position: "fixed", right: 0, top: 0, bottom: 0, width: "320px", background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)", padding: "var(--spacing-lg)", display: "flex", flexDirection: "column", overflowY: "auto", zIndex: 100 },
  title: { fontWeight: 700, fontSize: "1.1rem", marginBottom: "var(--spacing-md)" },
  item: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-sm) 0", borderBottom: "1px solid var(--color-border)" },
  total: { fontWeight: 700, fontSize: "1.1rem", marginTop: "var(--spacing-md)" },
  button: { marginTop: "var(--spacing-md)", padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-accent)", color: "#000", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer", width: "100%" },
  empty: { color: "var(--color-text-secondary)", fontSize: "0.9rem" },
  error: { color: "var(--color-error)", fontSize: "0.875rem", marginTop: "var(--spacing-sm)" },
  qtyRow: { display: "flex", alignItems: "center", gap: "var(--spacing-xs)" },
  qtyBtn: { background: "var(--color-border)", border: "none", color: "var(--color-text-primary)", borderRadius: "var(--radius-sm)", width: "24px", height: "24px", cursor: "pointer", fontWeight: 700 },
};

export default function Cart({ items, onUpdate, restaurantId }) {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

  function changeQty(item, delta) {
    const next = item.qty + delta;
    if (next <= 0) onUpdate(items.filter(i => i.item_id !== item.item_id));
    else onUpdate(items.map(i => i.item_id === item.item_id ? { ...i, qty: next } : i));
  }

  async function placeOrder() {
    setError(null);
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const order = await api.post("/orders", {
        restaurant_id: restaurantId,
        items: items.map(i => ({ item_id: i.item_id, quantity: i.qty })),
      });
      onUpdate([]);
      navigate(`/orders/${order.order_id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={STYLES.panel}>
      <h2 style={STYLES.title}>Your cart</h2>
      {items.length === 0
        ? <p style={STYLES.empty}>No items added yet.</p>
        : <>
            {items.map(item => (
              <div key={item.item_id} style={STYLES.item}>
                <span>{item.name}</span>
                <div style={STYLES.qtyRow}>
                  <button style={STYLES.qtyBtn} onClick={() => changeQty(item, -1)}>−</button>
                  <span>{item.qty}</span>
                  <button style={STYLES.qtyBtn} onClick={() => changeQty(item, 1)}>+</button>
                  <span style={{ marginLeft: "var(--spacing-xs)", color: "var(--color-text-secondary)" }}>¥{(item.price * item.qty).toFixed(2)}</span>
                </div>
              </div>
            ))}
            <p style={STYLES.total}>Total: ¥{total.toFixed(2)}</p>
            {error && <p style={STYLES.error}>{error}</p>}
            <button style={STYLES.button} onClick={placeOrder}>Place order</button>
          </>
      }
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/pages/Home.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";
import MenuCard from "../components/MenuCard";
import Cart from "../components/Cart";

const STYLES = {
  page: { minHeight: "100vh", background: "var(--color-page)" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-md) var(--spacing-xl)", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" },
  brand: { fontWeight: 800, fontSize: "1.2rem", color: "var(--color-accent)", textDecoration: "none" },
  navLinks: { display: "flex", gap: "var(--spacing-md)", alignItems: "center" },
  navLink: { color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.9rem" },
  main: { padding: "var(--spacing-xl)", paddingRight: "360px" },
  searchRow: { display: "flex", gap: "var(--spacing-md)", marginBottom: "var(--spacing-xl)", flexWrap: "wrap" },
  searchInput: { flex: 1, minWidth: "200px", padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", fontSize: "1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "var(--spacing-md)" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: 700, marginBottom: "var(--spacing-md)", color: "var(--color-text-secondary)" },
  logoutBtn: { background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-sm)", padding: "var(--spacing-xs) var(--spacing-sm)", cursor: "pointer", fontSize: "0.85rem" },
};

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [menuByRestaurant, setMenuByRestaurant] = useState({});
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [cartRestaurantId, setCartRestaurantId] = useState(null);
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const role = auth?.role ?? null;
  const name = auth?.name ?? null;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  useEffect(() => {
    api.get("/restaurants").then(data => {
      setRestaurants(data);
      data.forEach(r => {
        api.get(`/restaurants/${r.restaurant_id}/menu`).then(items => {
          setMenuByRestaurant(prev => ({ ...prev, [r.restaurant_id]: items }));
        });
      });
    });
  }, []);

  function handleAdd(item, restaurantName) {
    if (cartItems.length > 0 && cartRestaurantId !== item.restaurant_id) {
      if (!window.confirm("Your cart contains items from another restaurant. Clear and add this item?")) return;
      setCartItems([]);
    }
    setCartRestaurantId(item.restaurant_id);
    setCartItems(prev => {
      const existing = prev.find(i => i.item_id === item.item_id);
      if (existing) return prev.map(i => i.item_id === item.item_id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  const allCategories = [...new Set(Object.values(menuByRestaurant).flat().map(i => i.category))].sort();

  const filtered = Object.values(menuByRestaurant).flat().filter(item => {
    const restaurant = restaurants.find(r => r.restaurant_id === item.restaurant_id);
    const matchesSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      restaurant?.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory && item.available;
  });

  return (
    <div style={STYLES.page}>
      <nav style={STYLES.nav}>
        <Link style={STYLES.brand} to="/">FoodAgg</Link>
        <div style={STYLES.navLinks}>
          {role === "restaurant" && <Link style={STYLES.navLink} to="/dashboard">Dashboard</Link>}
          {!role && <><Link style={STYLES.navLink} to="/login">Sign in</Link><Link style={STYLES.navLink} to="/register">Register</Link></>}
          {role && <><span style={STYLES.navLink}>{name}</span><button style={STYLES.logoutBtn} onClick={handleLogout}>Sign out</button></>}
        </div>
      </nav>
      <main style={STYLES.main}>
        <div style={STYLES.searchRow}>
          <input
            style={STYLES.searchInput}
            placeholder="Search dishes or restaurants..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            style={STYLES.searchInput}
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <p style={STYLES.sectionTitle}>{filtered.length} item{filtered.length !== 1 ? "s" : ""} available</p>
        <div style={STYLES.grid}>
          {filtered.map(item => (
            <MenuCard
              key={item.item_id}
              item={item}
              restaurantName={restaurants.find(r => r.restaurant_id === item.restaurant_id)?.name ?? ""}
              onAdd={handleAdd}
            />
          ))}
        </div>
      </main>
      <Cart items={cartItems} onUpdate={setCartItems} restaurantId={cartRestaurantId} />
    </div>
  );
}
```

- [ ] **Step 4: Verify manually**

With both servers running, open `http://localhost:5173`. Register a restaurant, add menu items via API (or dashboard), then register as customer, browse and add to cart, place order.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Home.jsx frontend/src/components/MenuCard.jsx frontend/src/components/Cart.jsx
git commit -m "feat: home page with menu browse, search, category filter, and cart"
```

---

### Task 12: Frontend — Restaurant Dashboard

**Files:**
- Create: `frontend/src/pages/RestaurantDashboard.jsx`

- [ ] **Step 1: Create `frontend/src/pages/RestaurantDashboard.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../contexts/AuthContext";

const ORDER_STATUSES = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];
const NEXT_STATUS = {
  placed: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const STYLES = {
  page: { minHeight: "100vh", background: "var(--color-page)" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-md) var(--spacing-xl)", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" },
  brand: { fontWeight: 800, fontSize: "1.2rem", color: "var(--color-accent)", textDecoration: "none" },
  main: { padding: "var(--spacing-xl)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing-xl)" },
  section: { display: "flex", flexDirection: "column", gap: "var(--spacing-md)" },
  sectionTitle: { fontWeight: 700, fontSize: "1.1rem", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--spacing-sm)" },
  card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--spacing-md)" },
  form: { display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" },
  input: { padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-page)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", color: "var(--color-text-primary)", fontSize: "1rem" },
  button: { padding: "var(--spacing-sm) var(--spacing-md)", background: "var(--color-accent)", color: "#000", border: "none", borderRadius: "var(--radius-sm)", fontWeight: 600, cursor: "pointer" },
  advanceBtn: { padding: "var(--spacing-xs) var(--spacing-sm)", background: "var(--color-success)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.8rem" },
  statusBadge: (status) => ({ display: "inline-block", padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", fontWeight: 600, background: `var(--color-badge-${status}, var(--color-border))`, color: "#fff" }),
  error: { color: "var(--color-error)", fontSize: "0.875rem" },
  itemRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-xs) 0", borderBottom: "1px solid var(--color-border)" },
  orderRow: { display: "flex", flexDirection: "column", gap: "var(--spacing-xs)", padding: "var(--spacing-sm) 0", borderBottom: "1px solid var(--color-border)" },
  navLink: { color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.9rem" },
  logoutBtn: { background: "none", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)", borderRadius: "var(--radius-sm)", padding: "var(--spacing-xs) var(--spacing-sm)", cursor: "pointer", fontSize: "0.85rem" },
};

export default function RestaurantDashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { auth, logout } = useAuth();

  useEffect(() => {
    const userId = auth?.userId;
    api.get("/restaurants").then(all => {
      const mine = all.find(r => r.user_id === userId);
      if (mine) {
        setRestaurant(mine);
        api.get(`/restaurants/${mine.restaurant_id}/menu`).then(setMenuItems);
      }
    });
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    // Poll orders every 10s
    function load() {
      // No paginated order list endpoint — fetch all is not available without an orders-by-restaurant endpoint
      // Use restaurant_id filter workaround: list all orders is not exposed to restaurant role;
      // this would require a dedicated endpoint. For now, show a placeholder.
      setOrders([]);
    }
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [restaurant]);

  async function addItem(e) {
    e.preventDefault();
    setError(null);
    try {
      const item = await api.post(`/restaurants/${restaurant.restaurant_id}/menu`, {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
      });
      setMenuItems(prev => [...prev, { ...item, available: 1 }]);
      setForm({ name: "", description: "", price: "", category: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleAvailability(item) {
    const updated = await api.patch(`/restaurants/${restaurant.restaurant_id}/menu/${item.item_id}`, {
      available: item.available ? 0 : 1,
    });
    setMenuItems(prev => prev.map(i => i.item_id === item.item_id ? updated : i));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={STYLES.page}>
      <nav style={STYLES.nav}>
        <Link style={STYLES.brand} to="/">FoodAgg</Link>
        <div style={{ display: "flex", gap: "var(--spacing-md)", alignItems: "center" }}>
          <span style={STYLES.navLink}>{restaurant?.name ?? "Dashboard"}</span>
          <button style={STYLES.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </nav>
      <main style={STYLES.main}>
        <div style={STYLES.section}>
          <h2 style={STYLES.sectionTitle}>Menu</h2>
          {menuItems.map(item => (
            <div key={item.item_id} style={STYLES.itemRow}>
              <div>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span style={{ color: "var(--color-text-secondary)", marginLeft: "var(--spacing-sm)", fontSize: "0.85rem" }}>{item.category} · ¥{item.price}</span>
              </div>
              <button
                style={{ ...STYLES.advanceBtn, background: item.available ? "var(--color-warning)" : "var(--color-success)" }}
                onClick={() => toggleAvailability(item)}
              >
                {item.available ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
          <div style={STYLES.card}>
            <h3 style={{ marginBottom: "var(--spacing-sm)", color: "var(--color-text-secondary)" }}>Add item</h3>
            <form style={STYLES.form} onSubmit={addItem}>
              <input style={STYLES.input} placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <input style={STYLES.input} placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input style={STYLES.input} placeholder="Price" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              <input style={STYLES.input} placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required />
              {error && <p style={STYLES.error}>{error}</p>}
              <button style={STYLES.button} type="submit">Add item</button>
            </form>
          </div>
        </div>
        <div style={STYLES.section}>
          <h2 style={STYLES.sectionTitle}>Incoming orders</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Orders placed by customers appear here. (Requires backend orders-by-restaurant endpoint — see Task 13.)
          </p>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify manually**

Log in as a restaurant user, navigate to `/dashboard`. Add a menu item, toggle availability.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/RestaurantDashboard.jsx
git commit -m "feat: restaurant dashboard with menu management"
```

---

### Task 13: Backend — Orders by Restaurant Endpoint

**Files:**
- Modify: `backend/routes/orders.py`
- Modify: `backend/tests/test_orders.py`

- [ ] **Step 1: Write failing test**

```python
# append to backend/tests/test_orders.py
def test_restaurant_can_list_own_orders(client, setup):
    client.post("/orders", json={
        "restaurant_id": setup["restaurant_id"],
        "items": [{"item_id": setup["item_id"], "quantity": 1}]
    }, headers={"Authorization": f"Bearer {setup['cust_token']}"})
    resp = client.get(f"/orders?restaurant_id={setup['restaurant_id']}",
                      headers={"Authorization": f"Bearer {setup['resto_token']}"})
    assert resp.status_code == 200
    orders = resp.get_json()
    assert len(orders) >= 1
    assert all(o["restaurant_id"] == setup["restaurant_id"] for o in orders)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_orders.py::test_restaurant_can_list_own_orders -v
```

Expected: FAIL — endpoint does not support filtering

- [ ] **Step 3: Add `GET /orders` to `backend/routes/orders.py`**

Add this route above the `place_order` route:

```python
@orders_bp.route("", methods=["GET"])
@require_auth
def list_orders():
    db = get_db(current_app)
    user = request.user
    restaurant_id = request.args.get("restaurant_id")
    if user["role"] == "customer":
        rows = db.execute(
            "SELECT * FROM orders WHERE customer_id=? ORDER BY created_at DESC",
            (user["sub"],)
        ).fetchall()
    elif user["role"] == "restaurant" and restaurant_id:
        # Verify ownership
        resto = db.execute("SELECT user_id FROM restaurants WHERE restaurant_id=?", (restaurant_id,)).fetchone()
        if not resto or resto["user_id"] != user["sub"]:
            return jsonify({"error": "Forbidden"}), 403
        rows = db.execute(
            "SELECT * FROM orders WHERE restaurant_id=? ORDER BY created_at DESC",
            (restaurant_id,)
        ).fetchall()
    elif user["role"] == "admin":
        rows = db.execute("SELECT * FROM orders ORDER BY created_at DESC").fetchall()
    else:
        return jsonify({"error": "Forbidden"}), 403
    return jsonify([dict(r) for r in rows]), 200
```

- [ ] **Step 4: Run all order tests**

```bash
cd backend && uv run pytest tests/test_orders.py -v
```

Expected: All PASS

- [ ] **Step 5: Update `RestaurantDashboard.jsx` to poll real orders**

Replace the `useEffect` for orders with:

```jsx
useEffect(() => {
  if (!restaurant) return;
  function load() {
    api.get(`/orders?restaurant_id=${restaurant.restaurant_id}`).then(setOrders).catch(() => {});
  }
  load();
  const id = setInterval(load, 10000);
  return () => clearInterval(id);
}, [restaurant]);
```

Replace the orders section JSX in `RestaurantDashboard.jsx`:

```jsx
<div style={STYLES.section}>
  <h2 style={STYLES.sectionTitle}>Incoming orders</h2>
  {orders.length === 0
    ? <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>No orders yet.</p>
    : orders.map(order => (
        <div key={order.order_id} style={STYLES.orderRow}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>#{order.order_id.slice(0, 8)}</span>
            <span style={STYLES.statusBadge(order.status)}>{order.status}</span>
          </div>
          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>¥{order.total_amount.toFixed(2)}</span>
          {NEXT_STATUS[order.status] && (
            <button style={STYLES.advanceBtn} onClick={async () => {
              const updated = await api.patch(`/orders/${order.order_id}/status`, { status: NEXT_STATUS[order.status] });
              setOrders(prev => prev.map(o => o.order_id === order.order_id ? { ...o, status: updated.status } : o));
            }}>
              Mark as {NEXT_STATUS[order.status]}
            </button>
          )}
        </div>
      ))
  }
</div>
```

- [ ] **Step 6: Commit**

```bash
git add backend/routes/orders.py backend/tests/test_orders.py frontend/src/pages/RestaurantDashboard.jsx
git commit -m "feat: orders-by-restaurant endpoint and live order dashboard"
```

---

### Task 14: Frontend — Order Tracking Page

**Files:**
- Create: `frontend/src/pages/OrderTracking.jsx`
- Create: `frontend/src/components/OrderStatusBadge.jsx`

- [ ] **Step 1: Create `frontend/src/components/OrderStatusBadge.jsx`**

```jsx
const ALL_STATUSES = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"];

const STYLES = {
  wrapper: { display: "flex", gap: "var(--spacing-sm)", alignItems: "center", flexWrap: "wrap", margin: "var(--spacing-md) 0" },
  step: (active, done) => ({
    padding: "var(--spacing-xs) var(--spacing-sm)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: active ? 700 : 400,
    background: done ? "var(--color-success)" : active ? "var(--color-accent)" : "var(--color-border)",
    color: (done || active) ? "#000" : "var(--color-text-secondary)",
  }),
  arrow: { color: "var(--color-text-secondary)", fontSize: "0.75rem" },
};

export default function OrderStatusBadge({ status }) {
  const currentIdx = ALL_STATUSES.indexOf(status);
  return (
    <div style={STYLES.wrapper}>
      {ALL_STATUSES.map((s, i) => (
        <span key={s}>
          <span style={STYLES.step(i === currentIdx, i < currentIdx)}>{s.replace(/_/g, " ")}</span>
          {i < ALL_STATUSES.length - 1 && <span style={STYLES.arrow}> › </span>}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/pages/OrderTracking.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import OrderStatusBadge from "../components/OrderStatusBadge";

const STYLES = {
  page: { minHeight: "100vh", background: "var(--color-page)" },
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--spacing-md) var(--spacing-xl)", borderBottom: "1px solid var(--color-border)", background: "var(--color-surface)" },
  brand: { fontWeight: 800, fontSize: "1.2rem", color: "var(--color-accent)", textDecoration: "none" },
  main: { maxWidth: "640px", margin: "0 auto", padding: "var(--spacing-xl)" },
  card: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--spacing-lg)", marginBottom: "var(--spacing-md)" },
  title: { fontWeight: 700, fontSize: "1.2rem", marginBottom: "var(--spacing-sm)" },
  itemRow: { display: "flex", justifyContent: "space-between", padding: "var(--spacing-xs) 0", borderBottom: "1px solid var(--color-border)", fontSize: "0.9rem" },
  total: { fontWeight: 700, marginTop: "var(--spacing-sm)", textAlign: "right" },
  homeLink: { color: "var(--color-accent)", textDecoration: "none", fontSize: "0.9rem" },
  error: { color: "var(--color-error)" },
};

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    function load() {
      api.get(`/orders/${orderId}`).then(setOrder).catch(err => setError(err.message));
    }
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [orderId]);

  if (error) return <div style={STYLES.page}><main style={STYLES.main}><p style={STYLES.error}>{error}</p><Link style={STYLES.homeLink} to="/">Back to home</Link></main></div>;
  if (!order) return <div style={STYLES.page}><main style={STYLES.main}><p style={{ color: "var(--color-text-secondary)" }}>Loading order…</p></main></div>;

  return (
    <div style={STYLES.page}>
      <nav style={STYLES.nav}>
        <Link style={STYLES.brand} to="/">FoodAgg</Link>
        <Link style={STYLES.homeLink} to="/">← Back to home</Link>
      </nav>
      <main style={STYLES.main}>
        <div style={STYLES.card}>
          <h1 style={STYLES.title}>Order #{order.order_id.slice(0, 8)}</h1>
          <OrderStatusBadge status={order.status} />
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
            Placed {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
        <div style={STYLES.card}>
          <h2 style={{ fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>Items</h2>
          {(order.items ?? []).map(item => (
            <div key={item.order_item_id} style={STYLES.itemRow}>
              <span>{item.name} × {item.quantity}</span>
              <span>¥{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <p style={STYLES.total}>Total: ¥{order.total_amount.toFixed(2)}</p>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify manually**

Place an order from the home page, confirm redirect to `/orders/<id>`. Check status badge renders, page auto-refreshes.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/OrderTracking.jsx frontend/src/components/OrderStatusBadge.jsx
git commit -m "feat: order tracking page with live status polling"
```

---

### Task 15: Backend — Favorites Suggestion (Bonus)

**Files:**
- Modify: `backend/routes/orders.py`
- Create new route `GET /favorites`

- [ ] **Step 1: Write failing test**

```python
# append to backend/tests/test_orders.py
def test_favorites_after_order(client, setup):
    client.post("/orders", json={
        "restaurant_id": setup["restaurant_id"],
        "items": [{"item_id": setup["item_id"], "quantity": 2}]
    }, headers={"Authorization": f"Bearer {setup['cust_token']}"})
    resp = client.get("/favorites", headers={"Authorization": f"Bearer {setup['cust_token']}"})
    assert resp.status_code == 200
    favs = resp.get_json()
    assert any(f["item_id"] == setup["item_id"] for f in favs)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && uv run pytest tests/test_orders.py::test_favorites_after_order -v
```

Expected: FAIL

- [ ] **Step 3: Update `place_order` in `backend/routes/orders.py` to write to `order_history`**

After the `db.commit()` in `place_order`, add:

```python
    # Update order_history for favorites
    for oi in order_items:
        item_id = oi[2]
        existing = db.execute(
            "SELECT history_id, order_count FROM order_history WHERE customer_id=? AND item_id=?",
            (request.user["sub"], item_id)
        ).fetchone()
        if existing:
            db.execute(
                "UPDATE order_history SET order_count=?, last_ordered=? WHERE history_id=?",
                (existing["order_count"] + 1, now, existing["history_id"])
            )
        else:
            db.execute(
                "INSERT INTO order_history(history_id, customer_id, item_id, order_count, last_ordered) VALUES(?,?,?,?,?)",
                (new_id(), request.user["sub"], item_id, 1, now)
            )
    db.commit()
```

- [ ] **Step 4: Add `GET /favorites` route in `backend/routes/orders.py`**

```python
from flask import Blueprint, request, jsonify, current_app

@orders_bp.route("/favorites", methods=["GET"])
@require_role("customer")
def get_favorites():
    db = get_db(current_app)
    rows = db.execute(
        """SELECT h.item_id, h.order_count, h.last_ordered,
                  m.name, m.price, m.category, m.restaurant_id, m.available
           FROM order_history h
           JOIN menu_items m USING(item_id)
           WHERE h.customer_id=?
           ORDER BY h.order_count DESC, h.last_ordered DESC
           LIMIT 10""",
        (request.user["sub"],)
    ).fetchall()
    return jsonify([dict(r) for r in rows]), 200
```

- [ ] **Step 5: Run all tests**

```bash
cd backend && uv run pytest -v
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add backend/routes/orders.py backend/tests/test_orders.py
git commit -m "feat: favorites suggestion based on order history"
```

---

### Task 16: Favorites on Home Page (Bonus)

**Files:**
- Modify: `frontend/src/pages/Home.jsx`

- [ ] **Step 1: Add favorites section to `Home.jsx`**

Add this state near the top of the component (after `cartRestaurantId`):

```jsx
const [favorites, setFavorites] = useState([]);
```

Add this effect after the existing `useEffect`:

```jsx
useEffect(() => {
  const role = localStorage.getItem("role");
  if (role !== "customer") return;
  api.get("/favorites").then(setFavorites).catch(() => {});
}, []);
```

Add this JSX between the search row and the grid (inside `<main>`):

```jsx
{favorites.length > 0 && (
  <>
    <p style={{ ...STYLES.sectionTitle, marginTop: "var(--spacing-lg)" }}>Your favorites</p>
    <div style={STYLES.grid}>
      {favorites.map(item => (
        <MenuCard
          key={`fav-${item.item_id}`}
          item={item}
          restaurantName={restaurants.find(r => r.restaurant_id === item.restaurant_id)?.name ?? ""}
          onAdd={handleAdd}
        />
      ))}
    </div>
    <p style={{ ...STYLES.sectionTitle, marginTop: "var(--spacing-lg)" }}>All items</p>
  </>
)}
```

- [ ] **Step 2: Verify manually**

Log in as a customer, place an order, return to home — favorites section should appear above the main grid.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Home.jsx
git commit -m "feat: favorites section on home page for returning customers"
```

---

### Task 17: README + Makefile — Full Documentation

**Files:**
- Modify: `README.md`
- Modify: `Makefile`

- [ ] **Step 1: Update `Makefile` with all commands**

```makefile
.PHONY: install dev-backend dev-frontend test-backend test-frontend test reset-db lint-backend lint-frontend

install:
	cd backend && uv sync
	cd frontend && npm install

dev-backend:
	cd backend && uv run python app.py

dev-frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && uv run pytest -v

test-frontend:
	cd frontend && npm test -- --watchAll=false

test: test-backend test-frontend

reset-db:
	rm -f backend/restaurant.db

lint-backend:
	cd backend && uv run ruff check . && uv run ruff format --check .

lint-frontend:
	cd frontend && npx prettier --check "src/**/*.{js,jsx}"
```

- [ ] **Step 2: Update `README.md`**

Add:

```markdown
## Setup

```sh
make install
```

## Running locally

Terminal 1 (backend):
```sh
make dev-backend
```

Terminal 2 (frontend):
```sh
make dev-frontend
```

Open http://localhost:5173

## Environment variables

Backend (`backend/.env`):
- `SECRET_KEY` — JWT signing secret (required in production)
- `DATABASE` — path to SQLite file (default: `restaurant.db`)

Frontend (`frontend/.env`):
- `VITE_API_URL` — backend URL (default: `http://localhost:5000`)

## Testing

```sh
make test
```

## Database schema

See `implementation-plan.md` — Database Schema section.

## Architecture

- **Frontend:** React 18 (Vite), CSS custom properties, React Router
- **Backend:** Python Flask, SQLite3, JWT auth (PyJWT), bcrypt
- **Auth:** JWT in localStorage; all write endpoints require `Authorization: Bearer <token>`
- **Order flow:** Customer places order → Restaurant sees it on dashboard → Restaurant advances status → Customer sees live status on tracking page
```

- [ ] **Step 3: Commit**

```bash
git add README.md Makefile
git commit -m "docs: setup instructions, env vars, architecture overview"
```

---

### Task 18: Railway Deployment

**Files:**

- Create: `railway.toml`
- Create: `backend/Procfile`
- Modify: `backend/app.py` (serve frontend static build)
- Modify: `Makefile` (add `build-frontend` target)

**Why this task exists:** Railway's filesystem is ephemeral. A SQLite file at a relative path will be wiped on every redeploy. This task specifies the persistence strategy, environment variables, and the static-serving wiring so a deploying agent does not silently lose data or ship a broken frontend URL.

- [ ] **Step 1: Add `build-frontend` to `Makefile`**

```makefile
build-frontend:
	cd frontend && npm run build
```

- [ ] **Step 2: Create `backend/Procfile`**

```
web: uv run gunicorn app:create_app --bind 0.0.0.0:$PORT
```

Add `gunicorn` to backend dependencies:

```bash
cd backend && uv add gunicorn
```

- [ ] **Step 3: Serve frontend static build from Flask in `backend/app.py`**

Add after blueprint registration, inside `create_app`:

```python
import os
from flask import send_from_directory

FRONTEND_BUILD = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    full = os.path.join(FRONTEND_BUILD, path)
    if path and os.path.exists(full):
        return send_from_directory(FRONTEND_BUILD, path)
    return send_from_directory(FRONTEND_BUILD, "index.html")
```

- [ ] **Step 4: Create `railway.toml`**

```toml
[build]
builder = "nixpacks"
buildCommand = "make build-frontend && cd backend && uv sync"

[deploy]
startCommand = "cd backend && uv run gunicorn 'app:create_app()' --bind 0.0.0.0:$PORT"
healthcheckPath = "/"
restartPolicyType = "on-failure"
```

- [ ] **Step 5: Document required environment variables**

Set the following in the Railway dashboard under **Variables**:

| Variable | Value |
|---|---|
| `SECRET_KEY` | A long random string (required — do NOT use the dev default) |
| `DATABASE` | `/data/restaurant.db` (Railway persistent volume mount path) |
| `VITE_API_URL` | Leave empty — frontend is served by Flask, same origin |

**IMPORTANT:** Without a Railway persistent volume mounted at `/data`, the SQLite database will be destroyed on every redeploy. Add a volume in Railway dashboard → Service → Volumes, mount path `/data`.

- [ ] **Step 6: Commit**

```bash
git add railway.toml backend/Procfile backend/app.py Makefile
git commit -m "feat: Railway deployment config with static frontend serving"
```

---

## Self-Review Against Spec

**Spec requirement → Task coverage:**

| Requirement | Task |
|---|---|
| Entry page with menu, search, category browse, cart | Task 11 |
| Restaurant/customer registration | Task 10, Task 3 |
| Frontend auth state (context, protected routes) | Task 9, Task 10 |
| Place orders and track through delivery stages | Tasks 6, 14 |
| Billing (total amount on order) | Task 6 |
| Favorites / order history (bonus) | Tasks 15, 16 |
| Admin role | Tasks 3, 7 |
| Restaurant menu management | Tasks 5, 12 |
| Status transitions with valid-state machine | Task 6 |
| Database (SQLite, all tables) | Task 2 |
| JWT auth, bcrypt passwords | Task 3 |
| Railway deployment + env var spec | Task 18 |

All spec requirements covered. No placeholders. Type and method names are consistent across tasks.
