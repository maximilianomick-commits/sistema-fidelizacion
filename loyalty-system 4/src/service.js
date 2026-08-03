'use strict';
const cfg = require('./config');
const L = require('./loyalty');
const dbmod = require('./db');
const { parseOrder } = require('./woocommerce');
const msgs = require('./notify/messages');
const { avisar } = require('./notify');

// Fecha de inicio del programa: editable desde el panel (tabla settings).
function programStartActual() {
  try {
    const row = dbmod.db.prepare("SELECT value FROM settings WHERE key = 'programStart'").get();
    return (row && row.value) ? row.value : cfg.programStart;
  } catch { return cfg.programStart; }
}

/**
 * Procesa un pedido de WooCommerce de punta a punta:
 *  - lo parsea
 *  - descarta pedidos anteriores al inicio del programa (todos desde cero)
 *  - acumula unidades en el trimestre correspondiente (idempotente)
 *  - detecta subida de nivel y dispara los avisos
 * Devuelve un resumen (útil para logs y tests).
 */
async function procesarPedido(orderRaw) {
  const o = parseOrder(orderRaw);

  // Todos los clientes empiezan desde cero: ignoramos lo anterior al inicio.
  // La fecha de inicio se puede editar desde el panel (tabla settings); si no,
  // se usa la de la configuración (PROGRAM_START).
  if (new Date(o.fecha) < new Date(programStartActual())) {
    return { ignorado: 'anterior-al-inicio', orderId: o.orderId };
  }

  const quarter = L.claveTrimestre(o.fecha);
  const suma = cfg.estadosValidos.includes(o.status);
  const qualifyingUnits = suma ? o.units : 0;

  const notifiedAntes = (dbmod.getCustomer(o.customerKey, quarter) || {}).notified_level ?? -1;

  const r = dbmod.applyOrder({
    orderId: o.orderId, customerKey: o.customerKey, quarter,
    qualifyingUnits, status: o.status,
    name: o.name, email: o.email, phone: o.phone,
  });

  const nivelAntes = notifiedAntes;
  const idxDespues = L.indiceNivel(r.unitsAfter);
  const nivelDespues = idxDespues >= 0 ? cfg.niveles[idxDespues] : null;
  const progreso = L.progreso(r.unitsAfter);
  const contacto = { phone: o.phone, email: o.email };

  let avisoEnviado = null;

  if (idxDespues > nivelAntes && idxDespues >= 0 && cfg.avisos.subidaNivel) {
    // Subió de nivel en este trimestre → felicitación (incluye el progreso).
    await avisar(contacto, msgs.subioNivel({ name: o.name, nivel: nivelDespues, progreso }));
    dbmod.setNotifiedLevel(o.customerKey, quarter, idxDespues);
    avisoEnviado = 'subida-nivel';
  } else if (r.delta > 0 && cfg.avisos.pedido) {
    // Se sumaron unidades (p. ej. el pedido pasó de un estado neutro a
    // "procesando") sin cambio de nivel → confirmación con progreso. No exige que
    // sea un pedido nuevo, porque el pedido suele verse primero en un estado que
    // no suma (0 unidades) y recién acredita al pasar a "procesando".
    await avisar(contacto, msgs.pedidoConfirmado({
      name: o.name, unitsAfter: r.unitsAfter, added: r.delta, nivel: nivelDespues, progreso,
    }));
    avisoEnviado = 'pedido';
  }

  return {
    orderId: o.orderId, cliente: o.customerKey, quarter,
    sumo: suma, delta: r.delta, unidades: r.unitsAfter,
    nivel: nivelDespues ? nivelDespues.nombre : 'Sin nivel',
    avisoEnviado,
  };
}

module.exports = { procesarPedido };
