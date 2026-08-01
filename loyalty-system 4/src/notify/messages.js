'use strict';
const cfg = require('../config');

const fmt = (n) => Number(n).toLocaleString('es-AR');

function saludo(name) {
  return name ? `Hola ${name.split(' ')[0]}` : 'Hola';
}

// Aviso al confirmar un pedido: unidades sumadas, nivel y progreso.
function pedidoConfirmado({ name, unitsAfter, added, nivel, progreso }) {
  const l = [];
  l.push(`${saludo(name)}! 🎉 Registramos tu compra en ${cfg.comercio}.`);
  l.push(`Sumaste ${fmt(added)} unidades este trimestre (total: ${fmt(unitsAfter)}).`);
  if (nivel) l.push(`Tu nivel actual es *${nivel.nombre}* (premio de ${fmt(nivel.premio)} unidades al cierre del trimestre).`);
  else l.push(`Todavía no alcanzaste el primer nivel del programa.`);
  if (progreso) l.push(`Te faltan ${fmt(progreso.faltan)} unidades para llegar a *${progreso.objetivo}*.`);
  else l.push(`¡Ya estás en el nivel máximo! 🏆`);
  return { titulo: 'Compra registrada', cuerpo: l.join('\n') };
}

// Felicitación al subir de nivel dentro del trimestre.
function subioNivel({ name, nivel, progreso }) {
  const l = [];
  l.push(`${saludo(name)}! 🚀 ¡Subiste al nivel *${nivel.nombre}* en ${cfg.comercio}!`);
  l.push(`Al cierre del trimestre te corresponden ${fmt(nivel.premio)} unidades de regalo.`);
  if (progreso) l.push(`Si sumás ${fmt(progreso.faltan)} unidades más, llegás a *${progreso.objetivo}*.`);
  else l.push(`Alcanzaste el nivel máximo del programa. 🏆`);
  return { titulo: `¡Nivel ${nivel.nombre} alcanzado!`, cuerpo: l.join('\n') };
}

// Aviso al cierre del trimestre con el premio a entregar.
function cierreTrimestre({ name, units, gift, nivel, trimestre }) {
  const l = [];
  l.push(`${saludo(name)}! Cerramos el ${trimestre} en ${cfg.comercio}.`);
  l.push(`Compraste ${fmt(units)} unidades.`);
  if (gift > 0) {
    l.push(`Alcanzaste el nivel *${nivel.nombre}*: te regalamos ${fmt(gift)} unidades, que se entregan automáticamente. 🎁`);
  } else {
    l.push(`Este trimestre no alcanzaste el primer nivel, ¡pero arrancás de nuevo desde cero para el próximo!`);
  }
  l.push(`Gracias por tu confianza. 🙌`);
  return { titulo: `Cierre de trimestre — ${trimestre}`, cuerpo: l.join('\n') };
}

module.exports = { pedidoConfirmado, subioNivel, cierreTrimestre };
