'use strict';
/**
 * Simula pedidos de WooCommerce contra el sistema en marcha, firmando el
 * webhook igual que WooCommerce. Sirve para probar sin tener la tienda conectada.
 *   node scripts/simular.js            → envía un set de pedidos de ejemplo
 */
const crypto = require('crypto');
require('dotenv').config();

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const SECRET = process.env.WC_WEBHOOK_SECRET || '';

function firmar(raw) {
  if (!SECRET) return '';
  return crypto.createHmac('sha256', SECRET).update(raw).digest('base64');
}

async function enviarPedido(order) {
  const raw = JSON.stringify(order);
  const res = await fetch(`${BASE}/webhook/woocommerce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-wc-webhook-signature': firmar(raw), 'x-wc-webhook-topic': 'order.updated' },
    body: raw,
  });
  return res.status;
}

function pedido(id, first, email, phone, status, items, fecha) {
  return {
    id, status, date_paid: fecha, date_created: fecha,
    billing: { first_name: first, last_name: 'SRL', email, phone },
    customer_id: id,
    line_items: items.map((q, i) => ({ product_id: 100 + i, quantity: q })),
  };
}

async function main() {
  const F = '2026-07-10T12:00:00';
  const pedidos = [
    // cliente que llega a Bronce (20) y luego sube a Plata con otro pedido
    pedido(1001, 'Kiosco', 'kiosco@mail.com', '3511111111', 'completed', [50, 40], F),   // 90 → Bronce
    pedido(1002, 'Kiosco', 'kiosco@mail.com', '3511111111', 'completed', [70], '2026-07-20T10:00:00'), // +70 = 160 → Plata (sube)
    // cliente directo a Oro
    pedido(1003, 'Supermercado', 'super@mail.com', '3512222222', 'processing', [200, 150], F), // 350 → Oro
    // cliente que queda sin nivel
    pedido(1004, 'Almacencito', 'alm@mail.com', '3513333333', 'completed', [40], F),      // 40 → sin nivel
    // pedido reprocesado (idempotencia): mismo id 1001 otra vez, no debe duplicar
    pedido(1001, 'Kiosco', 'kiosco@mail.com', '3511111111', 'completed', [50, 40], F),
    // pedido cancelado: resta (cliente 1003 cancela parte → mandamos el mismo id con menos)
  ];
  for (const p of pedidos) {
    const st = await enviarPedido(p);
    console.log(`Pedido ${p.id} (${p.status}) → HTTP ${st}`);
    await new Promise(r => setTimeout(r, 120));
  }
  console.log('\nListo. Abrí el panel para ver el estado.');
}
main().catch(console.error);
