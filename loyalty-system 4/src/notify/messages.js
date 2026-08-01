'use strict';
const cfg = require('../config');
const dbmod = require('../db');

const fmt = (n) => Number(n || 0).toLocaleString('es-AR');
const primerNombre = (name) => (name ? String(name).split(' ')[0] : '');

// Lee un ajuste editable (plantillas de mail) de la tabla settings.
function getSetting(key) {
  try {
    const row = dbmod.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row && row.value ? row.value : '';
  } catch { return ''; }
}

// Reemplaza {comodines} en una plantilla con los valores dados.
function render(tpl, vals) {
  return String(tpl).replace(/\{(\w+)\}/g, (m, k) => (k in vals ? String(vals[k]) : m));
}

function saludo(name) {
  return name ? `Hola ${primerNombre(name)}` : 'Hola';
}

// Aviso al confirmar un pedido: unidades sumadas, nivel y progreso.
function pedidoConfirmado({ name, unitsAfter, added, nivel, progreso }) {
  const subj = getSetting('subjPedido');
  const tpl = getSetting('textoPedido');
  const vals = {
    nombre: primerNombre(name) || 'cliente', comercio: cfg.comercio,
    sumadas: fmt(added), unidades: fmt(unitsAfter),
    nivel: nivel ? nivel.nombre : '', premio: nivel ? fmt(nivel.premio) : '0',
    faltan: progreso ? fmt(progreso.faltan) : '', objetivo: progreso ? progreso.objetivo : '',
  };
  const titulo = subj ? render(subj, vals) : 'Compra registrada';
  if (tpl) return { titulo, cuerpo: render(tpl, vals) };
  const l = [];
  l.push(`${saludo(name)}! 🎉 Registramos tu compra en ${cfg.comercio}.`);
  l.push(`Sumaste ${fmt(added)} unidades este trimestre (total: ${fmt(unitsAfter)}).`);
  if (nivel) l.push(`Tu nivel actual es *${nivel.nombre}* (premio de ${fmt(nivel.premio)} unidades al cierre del trimestre).`);
  else l.push(`Todavía no alcanzaste el primer nivel del programa.`);
  if (progreso) l.push(`Te faltan ${fmt(progreso.faltan)} unidades para llegar a *${progreso.objetivo}*.`);
  else l.push(`¡Ya estás en el nivel máximo! 🏆`);
  return { titulo, cuerpo: l.join('\n') };
}

// Felicitación al subir de nivel dentro del trimestre.
function subioNivel({ name, nivel, progreso }) {
  const subj = getSetting('subjNivel');
  const tpl = getSetting('textoNivel');
  const vals = {
    nombre: primerNombre(name) || 'cliente', comercio: cfg.comercio,
    nivel: nivel.nombre, premio: fmt(nivel.premio),
    faltan: progreso ? fmt(progreso.faltan) : '', objetivo: progreso ? progreso.objetivo : '',
  };
  const titulo = subj ? render(subj, vals) : `¡Nivel ${nivel.nombre} alcanzado!`;
  if (tpl) return { titulo, cuerpo: render(tpl, vals) };
  const l = [];
  l.push(`${saludo(name)}! 🚀 ¡Subiste al nivel *${nivel.nombre}* en ${cfg.comercio}!`);
  l.push(`Al cierre del trimestre te corresponden ${fmt(nivel.premio)} unidades de regalo.`);
  if (progreso) l.push(`Si sumás ${fmt(progreso.faltan)} unidades más, llegás a *${progreso.objetivo}*.`);
  else l.push(`Alcanzaste el nivel máximo del programa. 🏆`);
  return { titulo, cuerpo: l.join('\n') };
}

// Aviso al cierre del trimestre con el premio a entregar.
function cierreTrimestre({ name, units, gift, nivel, trimestre }) {
  const subj = getSetting('subjCierre');
  const tpl = getSetting('textoCierre');
  const vals = {
    nombre: primerNombre(name) || 'cliente', comercio: cfg.comercio,
    unidades: fmt(units), premio: fmt(gift), regalo: fmt(gift),
    nivel: nivel ? nivel.nombre : '', trimestre: trimestre || '',
  };
  const titulo = subj ? render(subj, vals) : `Cierre de trimestre — ${trimestre}`;
  if (tpl) return { titulo, cuerpo: render(tpl, vals) };
  const l = [];
  l.push(`${saludo(name)}! Cerramos el ${trimestre} en ${cfg.comercio}.`);
  l.push(`Compraste ${fmt(units)} unidades.`);
  if (gift > 0) l.push(`Alcanzaste el nivel *${nivel.nombre}*: te regalamos ${fmt(gift)} unidades, que se entregan automáticamente. 🎁`);
  else l.push(`Este trimestre no alcanzaste el primer nivel, ¡pero arrancás de nuevo desde cero para el próximo!`);
  l.push(`Gracias por tu confianza. 🙌`);
  return { titulo, cuerpo: l.join('\n') };
}

module.exports = { pedidoConfirmado, subioNivel, cierreTrimestre };
