'use strict';
const crypto = require('crypto');

/**
 * Verifica la firma del webhook de WooCommerce.
 * WooCommerce firma el cuerpo crudo con HMAC-SHA256 y lo manda en base64
 * en el header x-wc-webhook-signature.
 */
function verificarFirma(rawBody, signature, secret) {
  if (!secret) return true; // sin secreto configurado: no se valida (no recomendado en producción)
  if (!signature) return false;
  const esperado = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(esperado));
  } catch { return false; }
}

/**
 * Extrae del pedido de WooCommerce los datos que usa el programa.
 * Suma la cantidad de TODOS los ítems (unidades) del pedido.
 */
function parseOrder(order) {
  const billing = order.billing || {};
  const email = (billing.email || order.customer_email || '').trim().toLowerCase();
  const name = [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim()
    || (order.customer_note ? '' : '') || email || `Pedido ${order.id}`;
  const phone = (billing.phone || '').trim();
  const units = (order.line_items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  // Identidad del cliente: email si existe; si no, id de cliente; si no, teléfono.
  const customerKey = email || (order.customer_id ? `cid:${order.customer_id}` : null) || (phone ? `tel:${phone}` : `order:${order.id}`);

  // Fecha del pedido (preferimos fecha de pago/creación).
  const fecha = order.date_paid || order.date_created || order.date_modified || new Date().toISOString();

  return {
    orderId: String(order.id),
    status: String(order.status || '').toLowerCase(),
    fecha,
    customerKey,
    name,
    email: email || null,
    phone: phone || null,
    units,
  };
}

module.exports = { verificarFirma, parseOrder };
