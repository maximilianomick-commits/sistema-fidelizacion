'use strict';
/**
 * Envío de email por SMTP (nodemailer). Funciona con Gmail, Outlook o el
 * correo de tu dominio. Si faltan credenciales, modo dry-run (registra en
 * consola). Para usar SendGrid/Mailgun basta con poner sus datos SMTP.
 */
const nodemailer = require('nodemailer');

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

function htmlDesdeTexto(titulo, texto) {
  const cuerpo = texto.split('\n').map(l => `<p style="margin:0 0 10px">${escape(l)}</p>`).join('');
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e7ec">
    <div style="background:#1F3A5F;color:#fff;padding:16px 22px;font-size:16px;font-weight:bold">${escape(titulo)}</div>
    <div style="padding:22px;color:#333;font-size:14px;line-height:1.5">${cuerpo}</div>
    <div style="padding:14px 22px;color:#8a98a8;font-size:12px;border-top:1px solid #eee">${escape(process.env.NOMBRE_COMERCIO || '')} · Programa de fidelización</div>
  </div></body></html>`;
}
function escape(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

async function enviarEmail(destino, titulo, texto) {
  if (!destino) return { skipped: 'sin-email' };
  const t = getTransport();
  if (!t) {
    console.log(`\n[Email dry-run → ${destino}] ${titulo}\n${texto}\n`);
    return { dryRun: true };
  }
  return await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destino,
    subject: titulo,
    text: texto,
    html: htmlDesdeTexto(titulo, texto),
  });
}

module.exports = { enviarEmail };
