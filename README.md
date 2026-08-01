# Sistema de Fidelización Mayorista — WooCommerce (tiempo real)

Backend que recibe los pedidos de WooCommerce **por webhook** (en tiempo real),
acumula las unidades de cada cliente **por trimestre** (todos desde cero),
calcula el nivel (Bronce / Plata / Oro) y el premio en unidades, avisa al
cliente por **WhatsApp y email**, y muestra todo en un **panel en vivo**.

## Arranque rápido (local)

```bash
npm install
cp .env.example .env      # completá tus datos
npm start                 # panel en http://localhost:3000
```

Probar sin la tienda conectada (simula pedidos firmados):

```bash
npm run simular
```

Correr los tests del motor de niveles:

```bash
npm test
```

Cerrar un trimestre manualmente (calcula premios y avisa):

```bash
npm run cerrar-trimestre 2026-T3
```

## Cómo funciona

- **Webhook**: `POST /webhook/woocommerce` recibe `order.created` y `order.updated`.
  Verifica la firma (`x-wc-webhook-signature`) y suma las unidades del pedido.
- **Idempotente**: reprocesar un pedido no duplica; si cambia (más ítems o se
  cancela) ajusta la diferencia.
- **Desde cero**: `PROGRAM_START` marca el inicio; lo anterior no cuenta. Cada
  trimestre arranca en cero automáticamente.
- **Avisos**: al confirmar pedido, al subir de nivel y al cierre del trimestre.
  Sin credenciales cargadas, funciona en modo *dry-run* (registra en consola).
- **Panel**: `GET /` — se actualiza solo cada 15 s desde `GET /api/estado`.

Los parámetros (niveles, premios, textos, avisos) se editan en `.env` y
`src/config.js`. La guía de instalación paso a paso está en el documento adjunto.
