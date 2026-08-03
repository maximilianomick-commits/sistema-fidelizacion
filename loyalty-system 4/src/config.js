'use strict';
require('dotenv').config();

/**
 * Configuración central del programa de fidelización.
 * Todo lo editable vive acá o en el archivo .env.
 */

// --- Niveles del programa ---------------------------------------------------
// Se miden por UNIDADES compradas dentro del trimestre. El premio es una
// cantidad FIJA de unidades. Editá umbrales y premios según tu negocio.
const NIVELES = [
  { nombre: 'Bronce', desde: 80,  premio: 20 },
  { nombre: 'Plata',  desde: 150, premio: 40 },
  { nombre: 'Oro',    desde: 300, premio: 60 },
];

// --- Parámetros generales ---------------------------------------------------
const cfg = {
  niveles: NIVELES,

  // Fecha de arranque del programa: los pedidos anteriores NO se cuentan.
  // Todos los clientes empiezan desde cero a partir de esta fecha.
  programStart: process.env.PROGRAM_START || '2026-07-01',

  // Estados de WooCommerce que consideramos "venta concretada" y suman unidades.
  // Suma y dispara el mail al pasar a "processing" (Procesando), que es cuando
  // ustedes CONFIRMAN el pedido (cerca de la fecha de carga). "completed"
  // (Completado = despacho) también está en la lista para que, al despachar, NO
  // se resten las unidades ya acreditadas. Para que no se dispare al cargar el
  // pedido, el pedido manual debe ENTRAR en un estado neutro (on-hold/pending),
  // no directamente en "processing".
  estadosValidos: (process.env.WC_ESTADOS_VALIDOS || 'processing,completed')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),

  // Estados que anulan la venta (restan unidades si el pedido ya sumó).
  estadosAnulados: (process.env.WC_ESTADOS_ANULADOS || 'cancelled,refunded,failed,trash')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean),

  moneda: process.env.MONEDA || '$',
  costoUnidad: Number(process.env.COSTO_UNIDAD || 0),

  // Nombre del comercio para las plantillas de mensajes.
  comercio: process.env.NOMBRE_COMERCIO || 'Nuestra Distribuidora',

  // Seguridad
  wcWebhookSecret: process.env.WC_WEBHOOK_SECRET || '',
  adminToken: process.env.ADMIN_TOKEN || '',

  puerto: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || require('path').join(__dirname, '..', 'data', 'fidelizacion.db'),

  // Qué avisos enviar (true/false)
  avisos: {
    pedido: (process.env.AVISO_PEDIDO || 'true') === 'true',
    subidaNivel: (process.env.AVISO_SUBIDA_NIVEL || 'true') === 'true',
    cierreTrimestre: (process.env.AVISO_CIERRE || 'true') === 'true',
  },
};

module.exports = cfg;
