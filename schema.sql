-- =========================================================
-- RESET (para desarrollo)
-- =========================================================
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS court_slots;
DROP TABLE IF EXISTS courts;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS purchase_items;

-- =========================================================
-- PAYMENT METHODS (Efectivo / Transferencia / QR por usuario)
-- =========================================================
CREATE TABLE payment_methods (
    id         BIGSERIAL PRIMARY KEY,
    user_uid   UUID NOT NULL,
    name       VARCHAR(50) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pm_unique_per_user UNIQUE (user_uid, name)
);

-- Notas:
-- Los métodos de pago se deberían insertar desde tu backend, por ejemplo:
-- INSERT INTO payment_methods (user_uid, name)
-- VALUES (auth.uid(), 'Efectivo'),
--        (auth.uid(), 'Transferencia'),
--        (auth.uid(), 'QR');

-- =========================================================
-- CUSTOMERS (jugadores / clientes del buffet)
-- =========================================================
CREATE TABLE customers (
    id          BIGSERIAL PRIMARY KEY,
    user_uid    UUID NOT NULL,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(30),
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive')),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_categories (
    id         BIGSERIAL PRIMARY KEY,
    user_uid   UUID NOT NULL,
    name       VARCHAR(100) NOT NULL,
    description TEXT,
    color      VARCHAR(20),                           -- opcional, para mostrar en la UI
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_categories_unique_per_user UNIQUE (user_uid, name)
);

-- =========================================================
-- PRODUCTS (buffet / tienda)
-- =========================================================
CREATE TABLE products (
    id             BIGSERIAL PRIMARY KEY,
    user_uid       UUID NOT NULL,
    category_id    BIGINT REFERENCES product_categories(id),
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    price          NUMERIC(10, 2) NOT NULL,
    uses_stock     BOOLEAN NOT NULL DEFAULT TRUE,
    min_stock      INTEGER NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ORDERS (cuentas de buffet por persona)
-- =========================================================
CREATE TABLE orders (
    id           BIGSERIAL PRIMARY KEY,
    user_uid     UUID NOT NULL,
    customer_id  BIGINT NOT NULL REFERENCES customers(id),

    status       VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed', 'cancelled')),

    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at    TIMESTAMP
);

-- =========================================================
-- ORDER_ITEMS (consumos en buffet)
-- =========================================================
CREATE TABLE order_items (
    id           BIGSERIAL PRIMARY KEY,
    user_uid     UUID NOT NULL,
    order_id     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   BIGINT NOT NULL REFERENCES products(id),
    quantity     INTEGER NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(10, 2) NOT NULL,
    total_price  NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- COURTS (canchas de pádel)
-- =========================================================
CREATE TABLE courts (
    id        BIGSERIAL PRIMARY KEY,
    user_uid  UUID NOT NULL,
    name      VARCHAR(50) NOT NULL,        -- 'Cancha 1', 'Cancha 2', etc.
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- =========================================================
-- COURT_SLOTS (turnos fijos – siempre 4 jugadores)
-- Solo indica si se usó el turno y cómo pagó cada jugador.
-- =========================================================
CREATE TABLE court_slots (
    id          BIGSERIAL PRIMARY KEY,
    user_uid    UUID NOT NULL,
    court_id    BIGINT NOT NULL REFERENCES courts(id),
    slot_date   DATE NOT NULL,             -- día del turno
    start_time  TIME NOT NULL,             -- ej: 13:00
    end_time    TIME NOT NULL,             -- ej: 14:30

    was_played  BOOLEAN NOT NULL DEFAULT FALSE,
    notes       TEXT,

    -- Jugador 1
    player1_payment_method_id BIGINT REFERENCES payment_methods(id),
    player1_note              TEXT,

    -- Jugador 2
    player2_payment_method_id BIGINT REFERENCES payment_methods(id),
    player2_note              TEXT,

    -- Jugador 3
    player3_payment_method_id BIGINT REFERENCES payment_methods(id),
    player3_note              TEXT,

    -- Jugador 4
    player4_payment_method_id BIGINT REFERENCES payment_methods(id),
    player4_note              TEXT,

    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- TRANSACTIONS (movimientos de caja del buffet)
-- (Solo buffet, sin referencia a turnos)
-- =========================================================
CREATE TABLE transactions (
    id                BIGSERIAL PRIMARY KEY,
    user_uid          UUID NOT NULL,

    order_id          BIGINT REFERENCES orders(id),
    customer_id       BIGINT REFERENCES customers(id),
    payment_method_id BIGINT REFERENCES payment_methods(id),

    description       TEXT,
    amount            NUMERIC(10, 2) NOT NULL,
    type              VARCHAR(20) NOT NULL
                       CHECK (type IN ('income', 'expense')),
    status            VARCHAR(20) NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('pending', 'completed', 'failed')),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- STOCK_MOVEMENTS (historial de stock del buffet)
-- =========================================================
CREATE TABLE stock_movements (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment')),
  quantity     INTEGER NOT NULL,
  unit_cost    DECIMAL(10, 2),
  notes        TEXT,
  user_uid     VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    phone       VARCHAR(50),
    notes       TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive')),
    user_uid    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
    id               SERIAL PRIMARY KEY,
    supplier_id      INTEGER NOT NULL REFERENCES suppliers(id),
    user_uid         VARCHAR(255) NOT NULL,
    total_amount     DECIMAL(10, 2) NOT NULL DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'completed'
                     CHECK (status IN ('pending', 'completed', 'cancelled')),
    payment_method_id INTEGER REFERENCES payment_methods(id),
    transaction_id   INTEGER REFERENCES transactions(id),
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id           SERIAL PRIMARY KEY,
    purchase_id  INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id   INTEGER NOT NULL REFERENCES products(id),
    quantity     INTEGER NOT NULL,
    unit_cost    DECIMAL(10, 2) NOT NULL
);
