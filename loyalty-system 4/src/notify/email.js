'use strict';
/**
 * Envío de email.
 *  - Si hay RESEND_API_KEY: usa Resend (API HTTPS, funciona en Railway). Recomendado.
 *  - Si no, usa SMTP (nodemailer) con los datos SMTP_*.
 *  - Si no hay nada configurado: modo dry-run (registra en consola).
 *
 * Diseño: plantilla de Stripo (cabecera con logo + degradado azul, contenido
 * centrado, botón y pie con Instagram). El asunto y el cuerpo de cada uno de los
 * 3 mails se inyectan en la plantilla (marcadores {{ASUNTO}} y {{CUERPO}}).
 * El texto y la URL del botón son editables desde el panel (tabla settings).
 */
const nodemailer = require('nodemailer');
const dbmod = require('../db');

const PUBLIC_URL = (process.env.PUBLIC_URL || 'https://web-production-5b841.up.railway.app').replace(/\/+$/, '');

function getSetting(key) {
  try {
    const row = dbmod.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row && row.value ? row.value : '';
  } catch { return ''; }
}

function fromActual() {
  const raw = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'onboarding@resend.dev';
  const m = raw.match(/<([^>]+)>/);
  const address = m ? m[1] : raw.trim();
  const nombre = getSetting('mailRemitente') || process.env.NOMBRE_COMERCIO || 'Programa de Fidelización';
  return `${nombre} <${address}>`;
}

function escape(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
// Convierte *palabra* en negrita y escapa el resto.
function inline(s) { return escape(s).replace(/\*([^*]+)\*/g, '<strong>$1</strong>'); }

// Plantilla de email (exportada de Stripo). Marcadores: {{ASUNTO}}, {{CUERPO}},
// {{BTN_URL}}, {{BTN_TEXTO}}.
const PLANTILLA = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="es">
 <head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>Cultivamente Mayorista</title>
  <style type="text/css">
#outlook a { padding:0; }
a.es-button { mso-style-priority:100!important; text-decoration:none!important; }
a[x-apple-data-detectors], #MessageViewBody a { color:inherit!important; text-decoration:none!important; font-size:inherit!important; font-family:inherit!important; font-weight:inherit!important; line-height:inherit!important; }
@media only screen and (max-width:600px) { p, a { line-height:150%!important } h1, h1 a { line-height:120%!important; font-size:30px!important } .es-content-body p, .es-content-body a { font-size:16px!important } a.es-button, button.es-button { display:inline-block!important; font-size:20px!important; padding:10px 30px 10px 30px!important; line-height:120%!important } .es-adaptive table, .es-left, .es-right { width:100%!important } .es-content table, .es-header table, .es-footer table, .es-content, .es-footer, .es-header { width:100%!important; max-width:600px!important } .adapt-img { width:100%!important; height:auto!important } .h-auto { height:auto!important } }
</style>
 </head>
 <body class="body" style="width:100%;height:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
  <div dir="ltr" class="es-wrapper-color" lang="es" style="background-color:#FAFAFA">
   <table width="100%" cellspacing="0" cellpadding="0" class="es-wrapper" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%;background-repeat:repeat;background-position:center top">
    <tbody>
     <tr>
      <td valign="top" style="padding:0;Margin:0">
       <table cellpadding="0" cellspacing="0" align="center" class="es-header" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%;table-layout:fixed !important;background-color:transparent;background-repeat:repeat;background-position:center top">
        <tbody>
         <tr>
          <td align="center" bgcolor="#6fa8dc" style="padding:0;Margin:0;background-color:#6fa8dc;background:linear-gradient(319deg, #6FA8DC 37%, #FFFFFF 82%)">
           <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" class="es-header-body" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px">
            <tbody>
             <tr>
              <td align="center" style="Margin:0;padding:6px 20px">
               <img src="https://ezsbqcq.stripocdn.email/content/guids/CABINET_df856c13c5cc402b947a1f8fe67294708fe35a975d0489abd3fbb456ab8c424a/images/isologipo_horizontal_negro.png" alt="Cultivamente Mayorista" width="250" title="Cultivamente Mayorista" class="adapt-img" style="display:block;font-size:12px;border:0;outline:none;text-decoration:none;margin:0 auto">
              </td>
             </tr>
            </tbody>
           </table></td>
         </tr>
        </tbody>
       </table>
       <table cellpadding="0" cellspacing="0" align="center" class="es-content" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%;table-layout:fixed !important">
        <tbody>
         <tr>
          <td align="center" style="padding:0;Margin:0">
           <table bgcolor="#ffffff" align="center" cellpadding="0" cellspacing="0" class="es-content-body" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:#FFFFFF;width:600px">
            <tbody>
             <tr>
              <td align="center" style="Margin:0;padding:30px 30px 10px">
               <h1 style="Margin:0;font-family:arial, 'helvetica neue', helvetica, sans-serif;mso-line-height-rule:exactly;letter-spacing:0;font-size:30px;font-style:normal;font-weight:bold;line-height:36px;color:#1F3A5F">{{ASUNTO}}</h1>
              </td>
             </tr>
             <tr>
              <td align="center" style="Margin:0;padding:10px 30px 10px">
               {{CUERPO}}
              </td>
             </tr>
             <tr>
              <td align="center" style="padding:10px 0 30px;Margin:0">
               <span class="es-button-border" style="border-style:solid;border-color:#5C68E2;background:#5C68E2;border-width:0px;display:inline-block;border-radius:6px;width:auto"><a href="{{BTN_URL}}" target="_blank" class="es-button" style="mso-style-priority:100 !important;text-decoration:none !important;mso-line-height-rule:exactly;color:#FFFFFF;font-size:20px;font-weight:normal;padding:12px 30px;display:inline-block;background:#5C68E2;border-radius:6px;font-family:arial, 'helvetica neue', helvetica, sans-serif;font-style:normal;line-height:24px;width:auto;text-align:center;letter-spacing:0;mso-padding-alt:0;mso-border-alt:10px solid #5C68E2;text-transform:none;border-left-width:30px;border-right-width:30px">{{BTN_TEXTO}}</a></span>
              </td>
             </tr>
            </tbody>
           </table></td>
         </tr>
        </tbody>
       </table>
       <table cellpadding="0" cellspacing="0" align="center" class="es-footer" role="none" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;width:100%;table-layout:fixed !important;background-color:transparent;background-repeat:repeat;background-position:center top">
        <tbody>
         <tr>
          <td align="center" style="padding:0;Margin:0">
           <table align="center" cellpadding="0" cellspacing="0" class="es-footer-body" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;border-spacing:0px;background-color:transparent;width:600px" role="none">
            <tbody>
             <tr>
              <td align="center" style="padding:15px 20px 5px;Margin:0;font-size:0">
               <a href="https://cultivamente.arg" target="_blank" style="mso-line-height-rule:exactly;text-decoration:none"><img width="32" title="Instagram" src="https://ezsbqcq.stripocdn.email/content/assets/img/social-icons/logo-black/instagram-logo-black.png" alt="Instagram" style="display:inline-block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0"></a>
              </td>
             </tr>
             <tr>
              <td align="center" style="padding:0 20px 20px;Margin:0"><p style="Margin:0;mso-line-height-rule:exactly;font-family:arial, 'helvetica neue', helvetica, sans-serif;line-height:18px;letter-spacing:0;color:#8a98a8;font-size:12px">{{FIRMA}}</p></td>
             </tr>
            </tbody>
           </table></td>
         </tr>
        </tbody>
       </table></td>
     </tr>
    </tbody>
   </table>
  </div>
 </body>
</html>`;

function htmlDesdeTexto(titulo, texto) {
  const btnT = getSetting('mailBtnTexto') || 'HACER MI PEDIDO';
  const btnU = getSetting('mailBtnUrl') || 'https://cultivamente.arg';
  const firma = getSetting('mailFirma') || ((process.env.NOMBRE_COMERCIO || 'Cultivamente Mayorista') + ' · Programa de fidelización');
  const cuerpo = String(texto).split('\n')
    .map(l => '<p style="Margin:0 0 12px;font-family:arial, \'helvetica neue\', helvetica, sans-serif;mso-line-height-rule:exactly;line-height:24px;letter-spacing:0;font-weight:normal;color:#333333;font-size:16px;text-align:center">' + (inline(l) || '&nbsp;') + '</p>')
    .join('');
  return PLANTILLA
    .replace('{{ASUNTO}}', escape(titulo))
    .replace('{{CUERPO}}', cuerpo)
    .replace('{{BTN_URL}}', escape(btnU).replace(/"/g, '&quot;'))
    .replace('{{BTN_TEXTO}}', escape(btnT))
    .replace('{{FIRMA}}', escape(firma));
}

async function enviarResend(destino, titulo, texto) {
  const key = process.env.RESEND_API_KEY;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromActual(), to: [destino], subject: titulo, text: texto, html: htmlDesdeTexto(titulo, texto) }),
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
    from: fromActual(), to: destino, subject: titulo, text: texto, html: htmlDesdeTexto(titulo, texto),
  });
}

module.exports = { enviarEmail };
