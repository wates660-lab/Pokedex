// qr.js · lectura y validación de códigos QR
import { TOTAL } from './config.js';

// Valida el contenido de un QR.
export function validarQR(texto) {
  if (typeof texto !== 'string') return { ok: false, motivo: 'formato' };
  const limpio = texto.trim();
  if (!limpio.startsWith('pokemon:')) return { ok: false, motivo: 'formato' };
  const resto = limpio.slice('pokemon:'.length).trim();
  if (!/^\d+$/.test(resto)) return { ok: false, motivo: 'formato' };
  const id = parseInt(resto, 10);
  if (id < 1 || id > TOTAL) return { ok: false, motivo: 'rango' };
  return { ok: true, id };
}

let lector = null;

function errorQR(tipo, detalle = '') {
  const e = new Error(detalle || tipo);
  e.tipo = tipo; // 'libreria' | 'insegura' | 'permiso' | 'sin_camara' | 'ocupada' | 'desconocido'
  return e;
}

function clasificarErrorCamara(e) {
  const texto = `${e?.name || ''} ${e?.message || e || ''}`;
  if (/NotAllowed|Permission|denied/i.test(texto)) return errorQR('permiso', texto);
  if (/NotFound|no camera|Requested device not found|OverconstrainedError/i.test(texto)) return errorQR('sin_camara', texto);
  if (/NotReadable|TrackStart|in use/i.test(texto)) return errorQR('ocupada', texto);
  return errorQR('desconocido', texto);
}

// Enciende la cámara y llama a alLeer(texto) en cuanto detecta un QR.
export async function iniciarEscaner(idContenedor, alLeer) {
  if (!window.Html5Qrcode) throw errorQR('libreria');
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw errorQR('insegura');
  await detenerEscaner();

  const formatos = window.Html5QrcodeSupportedFormats?.QR_CODE;
  lector = new window.Html5Qrcode(idContenedor, {
    verbose: false,
    ...(formatos !== undefined ? { formatsToSupport: [formatos] } : {}),
  });

  let entregado = false;
  const alExito = (texto) => {
    if (entregado) return;
    entregado = true;
    alLeer(texto);
  };

  try {
    await lector.start({ facingMode: 'environment' }, { fps: 12 }, alExito, () => {});
  } catch (e) {
    lector = null;
    throw clasificarErrorCamara(e);
  }
}

// Apaga la cámara y libera el contenedor.
export async function detenerEscaner() {
  if (!lector) return;
  const actual = lector;
  lector = null;
  try {
    if (actual.isScanning) await actual.stop();
    actual.clear();
  } catch {
    // ya estaba apagado
  }
}

// Lee un QR desde una imagen (útil en computadora o si la cámara falla).
export async function leerArchivo(archivo, idContenedor = 'qr-archivo') {
  if (!window.Html5Qrcode) throw errorQR('libreria');
  const temporal = new window.Html5Qrcode(idContenedor, { verbose: false });
  try {
    return await temporal.scanFile(archivo, false);
  } catch {
    throw errorQR('ilegible');
  } finally {
    try { temporal.clear(); } catch { /* nada */ }
  }
}
