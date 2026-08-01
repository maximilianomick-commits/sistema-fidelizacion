'use strict';
const cfg = require('../config');
const L = require('../loyalty');
const dbmod = require('../db');
const msgs = require('../notify/messages');
const { avisar } = require('../notify');

/**
 * Cierra un trimestre: calcula el premio de cada cliente según el nivel
 * alcanzado, lo marca como entregado y envía el aviso de cierre.
 * El próximo trimestre arranca solo (cada trimestre es una fila nueva, desde cero).
 *
 * Idempotente: los clientes ya cerrados se saltean.
 */
async function cerrarTrimestre(quarter) {
  const q = quarter || L.claveTrimestre(new Date());
  const clientes = dbmod.listQuarter(q);
  const nombre = L.nombreTrimestre(q);
  let cerrados = 0, premioTotal = 0;

  for (const c of clientes) {
    if (c.closed) continue;
    const idx = L.indiceNivel(c.units);
    const nivel = idx >= 0 ? cfg.niveles[idx] : null;
    const gift = nivel ? nivel.premio : 0;

    dbmod.closeCustomer(c.customer_key, q, gift);
    if (cfg.avisos.cierreTrimestre) {
      await avisar({ phone: c.phone, email: c.email },
        msgs.cierreTrimestre({ name: c.name, units: c.units, gift, nivel, trimestre: nombre }));
    }
    cerrados++; premioTotal += gift;
  }
  return { quarter: q, cerrados, premioTotal };
}

module.exports = { cerrarTrimestre };

// Permite correrlo desde la línea de comandos: node src/jobs/closeQuarter.js [2026-T3]
if (require.main === module) {
  const q = process.argv[2];
  cerrarTrimestre(q).then(r => {
    console.log(`Trimestre ${r.quarter} cerrado. Clientes: ${r.cerrados}. Premio total: ${r.premioTotal} unidades.`);
    process.exit(0);
  }).catch(e => { console.error(e); process.exit(1); });
}
