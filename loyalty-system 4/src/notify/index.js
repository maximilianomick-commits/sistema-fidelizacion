'use strict';
const { enviarWhatsApp } = require('./whatsapp');
const { enviarEmail } = require('./email');

/**
 * Envía un aviso por ambos canales, tolerante a fallos: si un canal falla,
 * el otro igual se intenta y el error se registra sin cortar el flujo.
 */
async function avisar({ phone, email }, { titulo, cuerpo }) {
  const resultados = {};
  await Promise.allSettled([
    (async () => { resultados.whatsapp = await enviarWhatsApp(phone, cuerpo); })(),
    (async () => { resultados.email = await enviarEmail(email, titulo, cuerpo); })(),
  ]).then(rs => rs.forEach(r => { if (r.status === 'rejected') console.error('Aviso falló:', r.reason?.message || r.reason); }));
  return resultados;
}

module.exports = { avisar };
