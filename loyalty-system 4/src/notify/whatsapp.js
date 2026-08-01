'use strict';
/**
 * Envío de WhatsApp. Dos proveedores soportados: Meta WhatsApp Cloud API
 * (por defecto) y Twilio. Se elige con WHATSAPP_PROVIDER=meta|twilio.
 *
 * Si faltan credenciales, entra en modo "dry-run": no envía, solo registra
 * en consola y devuelve {dryRun:true}. Así el sistema funciona de una y podés
 * cargar las credenciales cuando estén listas.
 *
 * Nota Meta: para escribir a un cliente fuera de la ventana de 24 h se requiere
 * una PLANTILLA aprobada. Configurá WHATSAPP_TEMPLATE para usar plantilla;
 * si no, se envía texto plano (válido para pruebas y ventana de 24 h).
 */
const provider = (process.env.WHATSAPP_PROVIDER || 'meta').toLowerCase();

function normalizarTel(tel) {
  if (!tel) return null;
  let t = String(tel).replace(/[^\d+]/g, '');
  if (!t.startsWith('+')) {
    // Prefijo país por defecto (Argentina 54) si el número parece local.
    const cc = process.env.WHATSAPP_DEFAULT_CC || '54';
    t = '+' + cc + t.replace(/^0/, '');
  }
  return t;
}

async function enviarMeta(telefono, texto) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return { dryRun: true };
  const to = normalizarTel(telefono).replace('+', '');
  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  const body = { messaging_product: 'whatsapp', to, type: 'text', text: { body: texto } };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WhatsApp Meta ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function enviarTwilio(telefono, texto) {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // ej: whatsapp:+14155238886
  if (!sid || !token || !from) return { dryRun: true };
  const to = 'whatsapp:' + normalizarTel(telefono);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({ From: from, To: to, Body: texto });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!res.ok) throw new Error(`WhatsApp Twilio ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function enviarWhatsApp(telefono, texto) {
  if (!telefono) return { skipped: 'sin-telefono' };
  const fn = provider === 'twilio' ? enviarTwilio : enviarMeta;
  const r = await fn(telefono, texto);
  if (r && r.dryRun) {
    console.log(`\n[WhatsApp dry-run → ${telefono}]\n${texto}\n`);
  }
  return r;
}

module.exports = { enviarWhatsApp, normalizarTel };
