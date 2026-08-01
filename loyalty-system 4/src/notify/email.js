'use strict';
/**
 * Envío de email.
 *  - Si hay RESEND_API_KEY: usa Resend (API HTTPS, funciona en Railway). Recomendado.
 *  - Si no, usa SMTP (nodemailer) con los datos SMTP_*.
 *  - Si no hay nada configurado: modo dry-run (registra en consola).
 * El nombre del remitente, el color, la firma y el logo son editables desde el
 * panel (tabla settings). La dirección de envío sale de EMAIL_FROM.
 */
const nodemailer = require('nodemailer');
const dbmod = require('../db');

const PUBLIC_URL = (process.env.PUBLIC_URL || 'https://web-production-5b841.up.railway.app').replace(/\/+$/, '');

function getSetting(key) {
  try {
    const row = dbmod.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row && row.value ? row.value : '';
  } catch { return ''; }
}

function fromActual() {
  const raw = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'onboarding@resend.dev';
  const m = raw.match(/<([^>]+)>/);
  const address = m ? m[1] : raw.trim();
  const nombre = getSetting('mailRemitente') || process.env.NOMBRE_COMERCIO || 'Programa de Fidelización';
  return `${nombre} <${address}>`;
}

function escape(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
// Convierte *palabra* en negrita y escapa el resto.
function inline(s) { return escape(s).replace(/\*([^*]+)\*/g, '<strong>$1</strong>'); }

function htmlDesdeTexto(titulo, texto) {
  const color = getSetting('mailColor') || '#1F3A5F';
  const fondo = getSetting('mailFondo') || '#f4f6f8';
  const font = getSetting('mailFont') || 'Arial,sans-serif';
  const lh = Number(getSetting('mailLogoSize')) || 56;
  const firma = getSetting('mailFirma') || ((process.env.NOMBRE_COMERCIO || '') + ' - Programa de fidelizacion');
  const logo = getSetting('mailLogo')
    ? '<div style="text-align:center;padding:20px 0 4px"><img src="' + PUBLIC_URL + '/logo.png" alt="" style="max-height:' + lh + 'px;max-width:80%"></div>'
    : '';
  const btnT = getSetting('mailBtnTexto'), btnU = getSetting('mailBtnUrl');
  const boton = (btnT && btnU)
    ? '<div style="text-align:center;padding:4px 22px 20px"><a href="' + escape(btnU).replace(/"/g, '&quot;') + '" style="display:inline-block;background:' + escape(color) + ';color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:bold;font-size:14px">' + escape(btnT) + '</a></div>'
    : '';
  const cuerpo = texto.split('\n').map(l => '<p style="margin:0 0 10px">' + inline(l) + '</p>').join('');
  return '<!DOCTYPE html><html><body style="font-family:' + font + ';background:' + escape(fondo) + ';padding:24px">'
    + '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e7ec">'
    + logo
    + '<div style="background:' + escape(color) + ';color:#fff;padding:16px 22px;font-size:16px;font-weight:bold">' + escape(titulo) + '</div>'
    + '<div style="padding:22px;color:#333;font-size:14px;line-height:1.5">' + cuerpo + '</div>'
    + boton
    + '<div style="padding:14px 22px;color:#8a98a8;font-size:12px;border-top:1px solid #eee">' + escape(firma) + '</div>'
    + '</div></body></html>';
}

async function enviarResend(destino, titulo, texto) {
  const key = process.env.RESEND_API_KEY;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromActual(), to: [destino], subject: titulo, text: texto, html: htmlDesdeTexto(titulo, texto) }),
  });
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + await res.text());
  return await res.json();
}

let transporter = null;
function getTransport() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: (process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function enviarEmail(destino, titulo, texto) {
  if (!destino) return { skipped: 'sin-email' };
  if (process.env.RESEND_API_KEY) return await enviarResend(destino, titulo, texto);
  const t = getTransport();
  if (!t) {
    console.log('\n[Email dry-run -> ' + destino + '] ' + titulo + '\n' + texto + '\n');
    return { dryRun: true };
  }
  return await t.sendMail({
    from: fromActual(), to: destino, subject: titulo, text: texto, html: htmlDesdeTexto(titulo, texto),
  });
}

module.exports = { enviarEmail };
