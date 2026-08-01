'use strict';
const path = require('path');
const express = require('express');
const cfg = require('./config');
const L = require('./loyalty');
const dbmod = require('./db');
const { verificarFirma } = require('./woocommerce');
const { procesarPedido } = require('./service');
const { cerrarTrimestre } = require('./jobs/closeQuarter');

const app = express();

// --- Ajustes editables desde el panel (costo por unidad, etc.) ---
// Se guardan en la base (persisten en el volumen) para poder cambiarlos sin redeploy.
dbmod.db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)');
function getSetting(key, def) {
  const row = dbmod.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : def;
}
function setSetting(key, value) {
  dbmod.db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}
function costoUnidadActual() {
  const v = Number(getSetting('costoUnidad', ''));
  return Number.isFinite(v) && v > 0 ? v : cfg.costoUnidad;
}

// --- Webhook de WooCommerce (necesita el cuerpo CRUDO para validar la firma) ---
app.post('/webhook/woocommerce',
  express.raw({ type: '*/*', limit: '2mb' }),
  async (req, res) => {
    const raw = req.body instanceof Buffer ? req.body.toString('utf8') : '';
    const firma = req.get('x-wc-webhook-signature');

    // WooCommerce manda un "ping" al crear el webhook: cuerpo vacío o mínimo.
    if (!raw || raw.length < 5) return res.status(200).send('ok');

    // Autenticación: acepta si la firma HMAC es válida, o si la URL trae
    // ?token=<WC_WEBHOOK_SECRET> (útil cuando un proxy/plugin altera la firma).
    const token = req.query.token;
    const tokenOk = cfg.wcWebhookSecret && token === cfg.wcWebhookSecret;
    if (!tokenOk && !verificarFirma(raw, firma, cfg.wcWebhookSecret)) {
      return res.status(401).send('firma inválida');
    }
    // Parseo robusto: este WooCommerce entrega el cuerpo como form-urlencoded,
    // no como JSON crudo. Cubrimos todos los formatos posibles.
    let order = null;
    // Intento 0: JSON crudo (por si en algún caso llega application/json).
    try { order = JSON.parse(raw); } catch {}
    if (!order) {
      // Intento 1: cuerpo tipo formulario (form-urlencoded).
      try {
        const params = new URLSearchParams(raw);
        if (params.has('payload')) {
          order = JSON.parse(params.get('payload'));
        } else if (params.has('webhook_id') && !raw.includes('{')) {
          // Es solo el "ping" de WooCommerce (webhook_id=N): conexión OK, sin pedido.
          return res.status(200).send('ping-ok');
        } else if (/%7B/i.test(raw)) {
          order = JSON.parse(decodeURIComponent(raw.replace(/\+/g, ' ')));
        }
      } catch {}
    }
    if (!order) {
      // Intento 2: extraer el objeto JSON entre la primera { y la última }.
      const i = raw.indexOf('{'), j = raw.lastIndexOf('}');
      if (i >= 0 && j > i) { try { order = JSON.parse(raw.slice(i, j + 1)); } catch {} }
    }
    if (!order) {
      console.error('WH json inválido len=' + raw.length + ' ct=' + (req.get('content-type') || '') + ' ini=' + JSON.stringify(raw.slice(0, 200)));
      return res.status(400).send('json inválido');
    }
    if (!order.id || !order.line_items) return res.status(200).send('sin-pedido');

    // Respondemos rápido (WooCommerce espera 2xx) y procesamos.
    res.status(200).send('recibido');
    try {
      const r = await procesarPedido(order);
      console.log('Pedido procesado:', JSON.stringify(r));
    } catch (e) {
      console.error('Error procesando pedido:', e.message);
    }
  });

// --- API para el panel ---
app.get('/api/estado', (req, res) => {
  const quarter = req.query.quarter || L.claveTrimestre(new Date());
  const filas = dbmod.listQuarter(quarter).map(c => {
    const idx = L.indiceNivel(c.units);
    const nivel = idx >= 0 ? cfg.niveles[idx] : null;
    const prog = L.progreso(c.units);
    return {
      cliente: c.name || c.customer_key,
      email: c.email, telefono: c.phone,
      unidades: c.units,
      nivel: nivel ? nivel.nombre : null,
      premio: nivel ? nivel.premio : 0,
      faltan: prog ? prog.faltan : 0,
      objetivo: prog ? prog.objetivo : null,
      cerrado: !!c.closed,
    };
  });
  res.json({
    quarter, nombreTrimestre: L.nombreTrimestre(quarter),
    niveles: cfg.niveles, moneda: cfg.moneda, costoUnidad: costoUnidadActual(),
    comercio: cfg.comercio, generado: new Date().toISOString(),
    clientes: filas,
  });
});

// Lista de trimestres con datos (para el selector del panel).
app.get('/api/trimestres', (req, res) => {
  const rows = dbmod.db.prepare('SELECT DISTINCT quarter FROM customers ORDER BY quarter DESC').all();
  res.json(rows.map(r => r.quarter));
});

// --- Admin: cerrar trimestre manualmente (protegido por token) ---
app.post('/admin/cerrar-trimestre', express.json(), async (req, res) => {
  if (cfg.adminToken && req.get('x-admin-token') !== cfg.adminToken) {
    return res.status(401).json({ error: 'no autorizado' });
  }
  const quarter = (req.body && req.body.quarter) || req.query.quarter;
  try {
    const r = await cerrarTrimestre(quarter);
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Admin: guardar el costo por unidad (editable desde el panel, protegido) ---
app.post('/admin/config', express.json(), (req, res) => {
  if (cfg.adminToken && req.get('x-admin-token') !== cfg.adminToken) {
    return res.status(401).json({ error: 'no autorizado' });
  }
  const c = Number(req.body && req.body.costoUnidad);
  if (!Number.isFinite(c) || c < 0) return res.status(400).json({ error: 'costo inválido' });
  setSetting('costoUnidad', c);
  res.json({ ok: true, costoUnidad: c });
});

app.get('/salud', (req, res) => res.json({ ok: true, trimestre: L.claveTrimestre(new Date()) }));

// --- Panel ---
app.use('/', express.static(path.join(__dirname, '..', 'public')));

if (require.main === module) {
  app.listen(cfg.puerto, () => {
    console.log(`\n✅ Sistema de fidelización escuchando en http://localhost:${cfg.puerto}`);
    console.log(`   Panel:   http://localhost:${cfg.puerto}/`);
    console.log(`   Webhook: POST /webhook/woocommerce`);
    console.log(`   Trimestre actual: ${L.claveTrimestre(new Date())} · Inicio programa: ${cfg.programStart}\n`);
  });
}

module.exports = app;
