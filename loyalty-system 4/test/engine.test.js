'use strict';
// Test simple del motor de niveles (sin dependencias externas).
const L = require('../src/loyalty');
const assert = require('assert');

let ok = 0, fail = 0;
function t(nombre, fn) { try { fn(); ok++; console.log('  ✓', nombre); } catch (e) { fail++; console.log('  ✗', nombre, '→', e.message); } }

console.log('Motor de niveles:');
t('sin nivel bajo 80', () => assert.strictEqual(L.indiceNivel(79), -1));
t('Bronce en 80', () => assert.strictEqual(L.nivelPara(80).nombre, 'Bronce'));
t('Bronce en 149', () => assert.strictEqual(L.nivelPara(149).nombre, 'Bronce'));
t('Plata en 150', () => assert.strictEqual(L.nivelPara(150).nombre, 'Plata'));
t('Plata en 299', () => assert.strictEqual(L.nivelPara(299).nombre, 'Plata'));
t('Oro en 300', () => assert.strictEqual(L.nivelPara(300).nombre, 'Oro'));
t('premio Bronce 20', () => assert.strictEqual(L.premioPara(120), 20));
t('premio Plata 40', () => assert.strictEqual(L.premioPara(220), 40));
t('premio Oro 60', () => assert.strictEqual(L.premioPara(450), 60));
t('progreso desde 100 → faltan 50 para Plata', () => {
  const p = L.progreso(100); assert.strictEqual(p.faltan, 50); assert.strictEqual(p.objetivo, 'Plata');
});
t('Oro es nivel máximo', () => assert.strictEqual(L.progreso(500), null));
t('trimestre de julio 2026 = 2026-T3', () => assert.strictEqual(L.claveTrimestre('2026-07-15'), '2026-T3'));
t('trimestre de enero = T1', () => assert.strictEqual(L.claveTrimestre('2026-01-05'), '2026-T1'));
t('nombre trimestre', () => assert.strictEqual(L.nombreTrimestre('2026-T3'), '3.º trimestre 2026'));

console.log(`\nResultado: ${ok} ok, ${fail} fallo(s).`);
process.exit(fail ? 1 : 0);
