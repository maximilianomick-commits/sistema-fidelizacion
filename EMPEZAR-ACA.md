# Puesta en marcha — 6 pasos

Este es el orden recomendado para poner el sistema en vivo. Los detalles de
cada paso están en la **Guía de implementación** (documento aparte).

## Resumen del camino más rápido (Railway)

1. **Subí el proyecto a GitHub** (o importalo directo en Railway).
2. **Creá el servicio en Railway** desde el repo. Detecta el `Dockerfile` solo.
   - Agregá un **Volumen** montado en `/app/data` (para que la base de datos no
     se borre en cada actualización).
3. **Cargá las variables de entorno** en Railway (pestaña Variables). Mínimo:
   ```
   NOMBRE_COMERCIO=Tu Distribuidora
   PROGRAM_START=2026-07-01
   WC_WEBHOOK_SECRET=b5da8516fcf794f7ca560fe834fcc9a5be03bb525a152534
   ADMIN_TOKEN=30ee58eb2c0ff3b35295a8611ab2fe9958a8488f900a0a1d
   DB_PATH=/app/data/fidelizacion.db
   ```
   (WhatsApp y SMTP se agregan cuando los tengas; sin ellos funciona en modo prueba.)
4. **Copiá la URL pública** que te da Railway (https://algo.up.railway.app).
   Verificá que abra: esa URL en el navegador muestra el panel; `…/salud` responde OK.
5. **Creá los webhooks en WooCommerce** (WooCommerce → Ajustes → Avanzado → Webhooks):
   - Uno con tema *Pedido creado* y otro con *Pedido actualizado*.
   - URL de entrega: `TU-URL/webhook/woocommerce`
   - Secreto: `b5da8516fcf794f7ca560fe834fcc9a5be03bb525a152534`
6. **Probá**: hacé un pedido de prueba en la tienda y miralo aparecer en el panel.

## Cuando quieras activar los envíos reales
- **WhatsApp**: cargá `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` (Meta) — sección 6 de la guía.
- **Email**: cargá `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — sección 7 de la guía.

## Cierre de trimestre
Al terminar cada trimestre:  `npm run cerrar-trimestre 2026-T3`
(o programalo con cron / el endpoint `/admin/cerrar-trimestre`).
