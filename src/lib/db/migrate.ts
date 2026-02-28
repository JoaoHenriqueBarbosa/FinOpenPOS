import { pglite } from ".";

/**
 * Create all tables via raw SQL.
 * Used on every cold start so the in-memory PGLite instance has the schema.
 * For the persistent (dev) instance, tables already exist and CREATE IF NOT EXISTS is a no-op.
 */
export async function migrate() {
  await pglite.exec(`
    -- Auth tables
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      image TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "session" (
      id TEXT PRIMARY KEY,
      expires_at TIMESTAMP NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS session_userId_idx ON "session"(user_id);

    CREATE TABLE IF NOT EXISTS "account" (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at TIMESTAMP,
      refresh_token_expires_at TIMESTAMP,
      scope TEXT,
      password TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS account_userId_idx ON "account"(user_id);

    CREATE TABLE IF NOT EXISTS "verification" (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);

    -- Business tables
    CREATE TABLE IF NOT EXISTS "products" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      in_stock INTEGER NOT NULL,
      user_uid VARCHAR(255) NOT NULL,
      category VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS "customers" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20),
      user_uid VARCHAR(255) NOT NULL,
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "orders" (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id),
      total_amount INTEGER NOT NULL,
      user_uid VARCHAR(255) NOT NULL,
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS "order_items" (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "payment_methods" (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS "transactions" (
      id SERIAL PRIMARY KEY,
      description TEXT,
      order_id INTEGER REFERENCES orders(id),
      payment_method_id INTEGER REFERENCES payment_methods(id),
      amount INTEGER NOT NULL,
      user_uid VARCHAR(255) NOT NULL,
      type VARCHAR(20),
      category VARCHAR(100),
      status VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
