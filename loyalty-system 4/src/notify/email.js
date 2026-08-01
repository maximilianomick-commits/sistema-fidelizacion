'use strict';
/**
 * Envío de email.
 *  - Si hay RESEND_API_KEY: usa Resend (API HTTPS, funciona en Railway). Recomendado.
 *  - Si no, usa SMTP (nodemailer) con los datos SMTP_*.
 *  - Si no hay nada configurado: modo dry-run (registra en consola).
 * El remitente sale de EMAIL_FROM (o SMTP_FROM como respaldo).
 */
const nodemailer = require('nodemailer');

const FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'Fidelizacion <onboarding@resend.dev>';

function escape(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function htmlDesdeTexto(titulo, texto) {
  const cuerpo = texto.split('\n').map(l => '<p style="margin:0 0 10px">' + escape(l) + '</p>').join('');
  return '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px">'
    + '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e7ec">'
    + '<div style="background:#1F3A5F;color:#fff;padding:16px 22px;font-size:16px;font-weight:bold">' + escape(titulo) + '</div>'
    + '<div style="padding:22px;color:#333;font-size:14px;line-height:1.5">' + cuerpo + '</div>'
    + '<div style="padding:14px 22px;color:#8a98a8;font-size:12px;border-top:1px solid #eee">' + escape(process.env.NOMBRE_COMERCIO || '') + ' - Programa de fidelizacion</div>'
    + '</div></body></html>';
}

async function enviarResend(destino, titulo, texto) {
  const key = process.env.RESEND_API_KEY;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [destino], subject: titulo, text: texto, html: htmlDesdeTexto(titulo, texto) }),
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
    from: FROM, to: destino, subject: titulo, text: texto, html: htmlDesdeTexto(titulo, texto),
  });
}

module.exports = { enviarEmail };
