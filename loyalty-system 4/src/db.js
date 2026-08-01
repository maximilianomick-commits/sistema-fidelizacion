'use strict';
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const cfg = require('./config');

fs.mkdirSync(path.dirname(cfg.dbPath), { recursive: true });
const db = new Database(cfg.dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS customers (
  customer_key TEXT NOT NULL,
  quarter      TEXT NOT NULL,
  name         TEXT,
  email        TEXT,
  phone        TEXT,
  units        INTEGER NOT NULL DEFAULT 0,
  notified_level INTEGER NOT NULL DEFAULT -1,  -- último nivel avisado
  closed       INTEGER NOT NULL DEFAULT 0,     -- 1 si el trimestre ya se cerró
  gift         INTEGER NOT NULL DEFAULT 0,     -- unidades de premio otorgadas al cierre
  joined_at    TEXT,
  updated_at   TEXT,
  PRIMARY KEY (customer_key, quarter)
);
CREATE TABLE IF NOT EXISTS orders (
  order_id     TEXT PRIMARY KEY,
  customer_key TEXT NOT NULL,
  quarter      TEXT NOT NULL,
  units        INTEGER NOT NULL DEFAULT 0,  -- unidades que califican (0 si el estado no suma)
  status       TEXT,
  updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_customers_quarter ON customers(quarter);
`);

const now = () => new Date().toISOString();

const stmt = {
  getOrder: db.prepare('SELECT * FROM orders WHERE order_id = ?'),
  upsertOrder: db.prepare(`
    INSERT INTO orders (order_id, customer_key, quarter, units, status, updated_at)
    VALUES (@order_id, @customer_key, @quarter, @units, @status, @updated_at)
    ON CONFLICT(order_id) DO UPDATE SET
      customer_key=excluded.customer_key, quarter=excluded.quarter,
      units=excluded.units, status=excluded.status, updated_at=excluded.updated_at`),
  getCustomer: db.prepare('SELECT * FROM customers WHERE customer_key = ? AND quarter = ?'),
  insertCustomer: db.prepare(`
    INSERT INTO customers (customer_key, quarter, name, email, phone, units, notified_level, joined_at, updated_at)
    VALUES (@customer_key, @quarter, @name, @email, @phone, 0, -1, @joined_at, @updated_at)
    ON CONFLICT(customer_key, quarter) DO NOTHING`),
  updateCustomerUnits: db.prepare(`
    UPDATE customers SET units = units + @delta,
      name = COALESCE(@name, name), email = COALESCE(@email, email),
      phone = COALESCE(@phone, phone), updated_at = @updated_at
    WHERE customer_key = @customer_key AND quarter = @quarter`),
  setNotified: db.prepare('UPDATE customers SET notified_level = ?, updated_at = ? WHERE customer_key = ? AND quarter = ?'),
  listQuarter: db.prepare('SELECT * FROM customers WHERE quarter = ? ORDER BY units DESC'),
  closeCustomer: db.prepare('UPDATE customers SET closed = 1, gift = ?, updated_at = ? WHERE customer_key = ? AND quarter = ?'),
};

/**
 * Registra/actualiza un pedido y aplica el delta de unidades al acumulado
 * del cliente en su trimestre. Idempotente: reprocesar el mismo pedido no
 * duplica; si el pedido cambia (más ítems, o se cancela) ajusta la diferencia.
 * Devuelve el estado del cliente antes y después.
 */
const applyOrder = db.transaction((o) => {
  const prev = stmt.getOrder.get(o.orderId);
  const prevUnits = prev ? prev.units : 0;
  const delta = o.qualifyingUnits - prevUnits;

  stmt.upsertOrder.run({
    order_id: o.orderId, customer_key: o.customerKey, quarter: o.quarter,
    units: o.qualifyingUnits, status: o.status, updated_at: now(),
  });

  stmt.insertCustomer.run({
    customer_key: o.customerKey, quarter: o.quarter,
    name: o.name || null, email: o.email || null, phone: o.phone || null,
    joined_at: now(), updated_at: now(),
  });
  const before = stmt.getCustomer.get(o.customerKey, o.quarter);
  const unitsBefore = before.units;

  if (delta !== 0) {
    stmt.updateCustomerUnits.run({
      delta, name: o.name || null, email: o.email || null, phone: o.phone || null,
      customer_key: o.customerKey, quarter: o.quarter, updated_at: now(),
    });
  }
  const after = stmt.getCustomer.get(o.customerKey, o.quarter);
  return {
    delta, unitsBefore, unitsAfter: after.units,
    isNewOrder: !prev, customer: after,
  };
});

function setNotifiedLevel(customerKey, quarter, idx) {
  stmt.setNotified.run(idx, now(), customerKey, quarter);
}
function listQuarter(quarter) { return stmt.listQuarter.all(quarter); }
function getCustomer(customerKey, quarter) { return stmt.getCustomer.get(customerKey, quarter); }
function closeCustomer(customerKey, quarter, gift) { stmt.closeCustomer.run(gift, now(), customerKey, quarter); }

module.exports = { db, applyOrder, setNotifiedLevel, listQuarter, getCustomer, closeCustomer };
