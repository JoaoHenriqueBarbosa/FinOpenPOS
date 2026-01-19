-- =========================================================
-- RESET (para desarrollo)
-- =========================================================

DROP TABLE IF EXISTS tournament_registration_payments;
DROP TABLE IF EXISTS tournament_group_standings;
DROP TABLE IF EXISTS tournament_playoffs;
DROP TABLE IF EXISTS tournament_matches;
DROP TABLE IF EXISTS tournament_group_teams;
DROP TABLE IF EXISTS tournament_groups;
DROP TABLE IF EXISTS tournament_teams;
DROP TABLE IF EXISTS tournaments;

DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS court_slot_day_notes;
DROP TABLE IF EXISTS court_slots;
DROP TABLE IF EXISTS courts;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS partners;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS purchase_items;

DROP TYPE IF EXISTS payment_scope;

-- =========================================================
-- PAYMENT METHODS (Efectivo / Transferencia / QR por usuario)
-- =========================================================

CREATE TYPE payment_scope AS ENUM ('BAR', 'COURT', 'BOTH');

CREATE TABLE payment_methods (
    id         BIGSERIAL PRIMARY KEY,
    user_uid   UUID NOT NULL,
    name       VARCHAR(50) NOT NULL,
    scope      payment_scope NOT NULL DEFAULT 'BAR', -- dónde se usa
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pm_unique_per_user UNIQUE (user_uid, name)
);

-- =========================================================
-- PLAYERS (jugadores / clientes del buffet / alumnos)
-- =========================================================
-- Versión unificada de "personas"
-- Obligatorios: first_name, last_name, phone
-- El resto opcional

CREATE TABLE players (
    id               BIGSERIAL PRIMARY KEY,
    user_uid         UUID NOT NULL,

    first_name       VARCHAR(255) NOT NULL,
    last_name        VARCHAR(255) NOT NULL,
    phone            VARCHAR(30)  NOT NULL,

    email            VARCHAR(255),
    gender           VARCHAR(20),
    city             VARCHAR(100),

    category         VARCHAR(50),   -- ej: "4ta", "5ta"
    female_category  VARCHAR(50),   -- ej: "7ma" femenina si aplica
    notes            TEXT,

    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),

    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PARTNERS (dueños/propietarios de la sociedad)
-- =========================================================
-- Tabla para gestionar los partners (dueños del negocio en una sociedad)
-- Los partners se crean y editan directamente desde la base de datos
-- La aplicación solo permite lectura

CREATE TABLE partners (
    id               BIGSERIAL PRIMARY KEY,
    user_uid         UUID NOT NULL,

    first_name       VARCHAR(255) NOT NULL,
    last_name        VARCHAR(255) NOT NULL,
    phone            VARCHAR(30)  NOT NULL,

    email            VARCHAR(255),
    notes            TEXT,

    status           VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'inactive')),

    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PRODUCT CATEGORIES
-- =========================================================

CREATE TABLE product_categories (
    id          BIGSERIAL PRIMARY KEY,
    user_uid    UUID NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    color       VARCHAR(20),   -- opcional, para mostrar en la UI
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    uses_stock     BOOLEAN NOT NULL DEFAULT TRUE,     -- si descuenta stock
    min_stock      INTEGER NOT NULL DEFAULT 0,        -- para alertas
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
    player_id    BIGINT NOT NULL REFERENCES players(id),

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
-- COURT_SLOT_DAY_NOTES (notas globales por día)
-- =========================================================

CREATE TABLE court_slot_day_notes (
    id          BIGSERIAL PRIMARY KEY,
    user_uid    UUID NOT NULL,
    slot_date   DATE NOT NULL,             -- día de las notas
    notes       TEXT,                      -- notas globales del día
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_uid, slot_date)
);

-- =========================================================
-- COURT_PRICING (precios por cancha y horario)
-- =========================================================

CREATE TABLE court_pricing (
    id              BIGSERIAL PRIMARY KEY,
    user_uid        UUID NOT NULL,
    court_id        BIGINT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    start_time      TIME NOT NULL,             -- hora de inicio del rango (ej: 13:00)
    end_time        TIME NOT NULL,             -- hora de fin del rango (ej: 19:00)
    price_per_player NUMERIC(10, 2) NOT NULL CHECK (price_per_player >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_uid, court_id, start_time, end_time)
);

CREATE INDEX idx_court_pricing_court_id ON court_pricing(court_id);
CREATE INDEX idx_court_pricing_time_range ON court_pricing(start_time, end_time);

-- =========================================================
-- TRANSACTIONS (movimientos de caja del buffet)
-- =========================================================

CREATE TABLE transactions (
    id                BIGSERIAL PRIMARY KEY,
    user_uid          UUID NOT NULL,

    order_id          BIGINT REFERENCES orders(id),
    player_id         BIGINT REFERENCES players(id),
    partner_id        BIGINT REFERENCES partners(id),
    payment_method_id BIGINT REFERENCES payment_methods(id),

    description       TEXT,
    amount            NUMERIC(10, 2) NOT NULL,
    type              VARCHAR(20) NOT NULL
                       CHECK (type IN ('income', 'expense', 'adjustment', 'withdrawal')),
    status            VARCHAR(20) NOT NULL DEFAULT 'completed'
                       CHECK (status IN ('pending', 'completed', 'failed')),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- STOCK_MOVEMENTS (historial de stock del buffet)
-- =========================================================

CREATE TABLE stock_movements (
  id            BIGSERIAL PRIMARY KEY,
  product_id    BIGINT NOT NULL REFERENCES products(id),
  movement_type VARCHAR(20) NOT NULL
                CHECK (movement_type IN ('purchase', 'sale', 'adjustment')),
  quantity      INTEGER NOT NULL,
  unit_cost     NUMERIC(10, 2),
  notes         TEXT,
  purchase_id   BIGINT REFERENCES purchases(id),
  user_uid      UUID NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_purchase_id ON stock_movements(purchase_id);

-- =========================================================
-- SUPPLIERS (proveedores)
-- =========================================================

CREATE TABLE suppliers (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    phone         VARCHAR(50),
    notes         TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),
    user_uid      UUID NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- PURCHASES (compras a proveedores)
-- =========================================================

CREATE TABLE purchases (
    id                BIGSERIAL PRIMARY KEY,
    supplier_id       BIGINT NOT NULL REFERENCES suppliers(id),
    user_uid          UUID NOT NULL,
    total_amount      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status            VARCHAR(20) NOT NULL DEFAULT 'completed'
                      CHECK (status IN ('pending', 'completed', 'cancelled')),
    payment_method_id BIGINT REFERENCES payment_methods(id),
    transaction_id    BIGINT REFERENCES transactions(id),
    notes             TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_items (
    id           BIGSERIAL PRIMARY KEY,
    purchase_id  BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id   BIGINT NOT NULL REFERENCES products(id),
    quantity     INTEGER NOT NULL,
    unit_cost    NUMERIC(10, 2) NOT NULL
);

-- =========================================================
-- TOURNAMENTS (torneos de pádel)
-- =========================================================

CREATE TABLE tournaments (
    id          BIGSERIAL PRIMARY KEY,
    user_uid    UUID NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    category    VARCHAR(50),      -- ej: "7ma", "Mixto"
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(20) NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'schedule_review', 'in_progress', 'finished', 'cancelled')),
    -- 🔹 Flag para indicar si el tercer set es super tie-break (aplicado a todos los matches del torneo)
    has_super_tiebreak  BOOLEAN NOT NULL DEFAULT FALSE,
    -- 🔹 Duración estimada de un partido en minutos (por defecto 60 minutos = 1 hora)
    match_duration      INTEGER NOT NULL DEFAULT 60,
    -- 🔹 Precio de inscripción por jugador
    registration_fee    NUMERIC(10, 2) DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- TOURNAMENT_TEAMS (parejas dentro de un torneo)
-- =========================================================

CREATE TABLE tournament_teams (
    id                  BIGSERIAL PRIMARY KEY,
    tournament_id       BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_uid            UUID NOT NULL,

    player1_id          BIGINT NOT NULL REFERENCES players(id),
    player2_id          BIGINT NOT NULL REFERENCES players(id),

    display_name        VARCHAR(120),      -- "Gómez / Pérez" opcional
    seed_number         INTEGER,
    notes               TEXT,
    display_order       INTEGER DEFAULT 0,  -- Orden de visualización de las parejas
    is_substitute       BOOLEAN NOT NULL DEFAULT FALSE,  -- Si es suplente, no se incluye en la generación del torneo
    schedule_notes      TEXT               -- Notas sobre disponibilidad horaria
);

-- =========================================================
-- TOURNAMENT_TEAM_SCHEDULE_RESTRICTIONS (restricciones de equipos)
-- =========================================================

-- =========================================================
-- TOURNAMENT_REGISTRATION_PAYMENTS (pagos de inscripciones por jugador)
-- =========================================================

CREATE TABLE tournament_registration_payments (
    id                      BIGSERIAL PRIMARY KEY,
    tournament_id           BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    tournament_team_id      BIGINT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    player_id               BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    user_uid                UUID NOT NULL,
    
    has_paid                BOOLEAN NOT NULL DEFAULT FALSE,
    payment_method_id       BIGINT REFERENCES payment_methods(id),
    
    notes                   TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Un jugador solo puede tener un registro de pago por equipo/torneo
    CONSTRAINT unique_player_payment_per_team UNIQUE (tournament_team_id, player_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_tournament_registration_payments_tournament_id 
    ON tournament_registration_payments(tournament_id);
CREATE INDEX idx_tournament_registration_payments_team_id 
    ON tournament_registration_payments(tournament_team_id);
CREATE INDEX idx_tournament_registration_payments_player_id 
    ON tournament_registration_payments(player_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_tournament_registration_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tournament_registration_payments_updated_at
    BEFORE UPDATE ON tournament_registration_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_registration_payments_updated_at();

CREATE TABLE tournament_team_schedule_restrictions (
    id                          BIGSERIAL PRIMARY KEY,
    tournament_team_id           BIGINT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    date                        DATE NOT NULL,
    start_time                  TIME NOT NULL,
    end_time                    TIME NOT NULL,
    user_uid                    UUID NOT NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tournament_team_id, date, start_time, end_time)
);

-- =========================================================
-- TOURNAMENT_GROUPS (ZONAS)
-- =========================================================

CREATE TABLE tournament_groups (
    id              BIGSERIAL PRIMARY KEY,
    tournament_id   BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_uid        UUID NOT NULL,
    name            VARCHAR(20) NOT NULL,  -- "Zona A"
    group_order     INTEGER NOT NULL DEFAULT 1
);

-- =========================================================
-- TOURNAMENT_GROUP_TEAMS (asignación equipo -> zona)
-- =========================================================

CREATE TABLE tournament_group_teams (
    id                  BIGSERIAL PRIMARY KEY,
    tournament_group_id BIGINT NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    team_id             BIGINT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    user_uid            UUID NOT NULL,
    UNIQUE (tournament_group_id, team_id)
);

-- =========================================================
-- TOURNAMENT_MATCHES (partidos: zonas + playoffs)
-- =========================================================

CREATE TABLE tournament_matches (
    id                  BIGSERIAL PRIMARY KEY,
    tournament_id       BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_uid            UUID NOT NULL,

    phase               VARCHAR(20) NOT NULL DEFAULT 'group'
                        CHECK (phase IN ('group', 'playoff')),

    tournament_group_id BIGINT REFERENCES tournament_groups(id),

    team1_id            BIGINT REFERENCES tournament_teams(id),
    team2_id            BIGINT REFERENCES tournament_teams(id),

    court_id            BIGINT REFERENCES courts(id),
    match_date          DATE,
    start_time          TIME,
    end_time            TIME,

    -- 🔹 Orden del partido dentro de un grupo (para grupos de 4: 1-2 primera ronda, 3-4 segunda ronda)
    match_order         INTEGER,

    status              VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'in_progress', 'finished', 'cancelled')),

    -- 🔹 Flag para indicar si el tercer set es super tie-break
    -- Se hereda del torneo, excepto para cuartos, semifinal y final (siempre false)
    has_super_tiebreak  BOOLEAN NOT NULL DEFAULT FALSE,

    -- 🔹 Resultados por set (games)
    set1_team1_games    INTEGER,
    set1_team2_games    INTEGER,

    set2_team1_games    INTEGER,
    set2_team2_games    INTEGER,

    set3_team1_games    INTEGER,
    set3_team2_games    INTEGER,

    super_tiebreak_team1_points INTEGER,
    super_tiebreak_team2_points INTEGER,

    -- 🔹 Totales (podés recalcularlos desde los sets)
    team1_sets          INTEGER DEFAULT 0,
    team2_sets          INTEGER DEFAULT 0,
    team1_games_total   INTEGER DEFAULT 0,
    team2_games_total   INTEGER DEFAULT 0,

    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- TOURNAMENT_GROUP_STANDINGS (tabla de posiciones por zona)
-- =========================================================

CREATE TABLE tournament_group_standings (
    id                  BIGSERIAL PRIMARY KEY,
    tournament_group_id BIGINT NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    team_id             BIGINT NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    user_uid            UUID NOT NULL,

    matches_played      INTEGER NOT NULL DEFAULT 0,
    wins                INTEGER NOT NULL DEFAULT 0,
    losses              INTEGER NOT NULL DEFAULT 0,
    sets_won            INTEGER NOT NULL DEFAULT 0,
    sets_lost           INTEGER NOT NULL DEFAULT 0,
    games_won           INTEGER NOT NULL DEFAULT 0,
    games_lost          INTEGER NOT NULL DEFAULT 0,
    position            INTEGER,

    UNIQUE (tournament_group_id, team_id)
);

-- =========================================================
-- TOURNAMENT_PLAYOFFS (metadata de cuadro: 8vos, 4tos, semi, final)
-- =========================================================
-- Esta tabla NO duplica los partidos.
-- Apunta a tournament_matches (phase='playoff') y agrega:
-- - qué ronda es (octavos, cuartos, etc)
-- - posición en el cuadro
-- - de dónde salen los equipos (1A vs 2B, Ganador QF1, etc.)

CREATE TABLE tournament_playoffs (
    id            BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_uid      UUID NOT NULL,

    match_id      BIGINT NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,

    round         VARCHAR(20) NOT NULL
                  CHECK (round IN ('16avos', 'octavos', 'cuartos', 'semifinal', 'final')),

    bracket_pos   INTEGER NOT NULL,    -- ej: 1..8 en octavos, 1..4 en cuartos, etc.

    -- Texto libre para saber de dónde vienen los equipos en el cuadro
    -- Ejemplos: '1A', '2B', 'Ganador QF1', 'Ganador SF1'
    source_team1  VARCHAR(50),
    source_team2  VARCHAR(50),

    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
