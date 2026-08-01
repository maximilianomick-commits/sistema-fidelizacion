'use strict';
const cfg = require('./config');

/**
 * Motor de niveles. Puro (sin efectos secundarios) para poder testearlo.
 */

// Devuelve el nivel alcanzado (objeto) para una cantidad de unidades, o null.
function nivelPara(unidades, niveles = cfg.niveles) {
  let actual = null;
  for (const n of niveles) {
    if (unidades >= n.desde) actual = n;
  }
  return actual;
}

// Índice del nivel (0..n-1), o -1 si no alcanzó ninguno.
function indiceNivel(unidades, niveles = cfg.niveles) {
  const n = nivelPara(unidades, niveles);
  return n ? niveles.indexOf(n) : -1;
}

// Unidades de premio que corresponden por el nivel alcanzado.
function premioPara(unidades, niveles = cfg.niveles) {
  const n = nivelPara(unidades, niveles);
  return n ? n.premio : 0;
}

// Cuánto falta y para qué nivel. Devuelve {faltan, objetivo} o null si es máximo.
function progreso(unidades, niveles = cfg.niveles) {
  const idx = indiceNivel(unidades, niveles);
  if (idx === niveles.length - 1) return null; // nivel máximo
  const siguiente = niveles[idx + 1];
  return { faltan: siguiente.desde - unidades, objetivo: siguiente.nombre };
}

// Clave de trimestre para una fecha: "2026-T3".
function claveTrimestre(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const t = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-T${t}`;
}

// Rango [desde, hasta) de un trimestre dado su clave.
function rangoTrimestre(clave) {
  const [anio, t] = clave.split('-T').map(Number);
  const mesInicio = (t - 1) * 3;
  const desde = new Date(Date.UTC(anio, mesInicio, 1));
  const hasta = new Date(Date.UTC(anio, mesInicio + 3, 1));
  return { desde, hasta };
}

// Nombre legible del trimestre: "3.º trimestre 2026".
function nombreTrimestre(clave) {
  const [anio, t] = clave.split('-T');
  return `${t}.º trimestre ${anio}`;
}

module.exports = {
  nivelPara, indiceNivel, premioPara, progreso,
  claveTrimestre, rangoTrimestre, nombreTrimestre,
};
