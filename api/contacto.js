import dns from 'dns/promises';

const rateLimitMap = new Map();

function escaparHtml(texto) {
    const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(texto).replace(/[&<>"']/g, (caracter) => mapa[caracter]);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { nombre, email, mensaje, website_hp } = req.body;

    if (website_hp) {
        return res.status(200).json({ status: 'success', message: '¡Mensaje enviado con éxito!' });
    }

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // 1. Validación de sintaxis estándar
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Por favor, ingresa un formato de correo válido.' });
    }

    // 2. Verificación con Reoon (detecta desechables, correos falsos, riesgo de spam)
    // Se hace antes del rate limit para no gastar el cooldown en correos falsos.
    try {
        const reoonUrl = `https://emailverifier.reoon.com/api/v1/verify?email=${encodeURIComponent(email)}&key=${process.env.REOON_API_KEY}&mode=quick`;
        const reoonRes = await fetch(reoonUrl);

        if (reoonRes.ok) {
            const reoonData = await reoonRes.json();

            if (!reoonData.is_safe_to_send) {
                return res.status(400).json({
                    message: 'El correo ingresado no parece válido o es de riesgo. Verifícalo e intenta de nuevo.'
                });
            }
        } else {
            // Si Reoon falla (ej. sin créditos o caído), no bloqueamos el flujo completo;
            // dejamos que la validación MX de más abajo siga como respaldo.
            console.error('Error al contactar Reoon:', reoonRes.status);
        }
    } catch (error) {
        console.error('Error al verificar con Reoon:', error);
        // No se bloquea aquí para no tumbar el formulario si Reoon tiene un problema temporal.
    }

    // Rate Limit (2 minutos)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const COOLDOWN_TIME = 2 * 60 * 1000;

    if (rateLimitMap.has(clientIp)) {
        const lastSent = rateLimitMap.get(clientIp);
        if (now - lastSent < COOLDOWN_TIME) {
            const remainingSeconds = Math.ceil((COOLDOWN_TIME - (now - lastSent)) / 1000);
            return res.status(429).json({
                message: `Por favor, espera ${remainingSeconds} segundos antes de enviar otro mensaje.`
            });
        }
    }

    rateLimitMap.set(clientIp, now);

    // 3. Validación de dominio real mediante registros MX del servidor DNS
    const dominio = email.split('@')[1]?.toLowerCase();
    try {
        const registrosMx = await dns.resolveMx(dominio);
        if (!registrosMx || registrosMx.length === 0) {
            rateLimitMap.delete(clientIp);
            return res.status(400).json({ message: 'El dominio del correo no cuenta con servidores para recibir mensajes.' });
        }
    } catch (error) {
        rateLimitMap.delete(clientIp);
        return res.status(400).json({ message: 'El dominio del correo ingresado no existe o no es válido.' });
    }

    // Ofuscación del correo de destino (Resend)
    const tx_buffer_weights = [102, 119, 102, 104, 106, 113, 110, 117, 122, 106, 119, 121, 69, 108, 114, 102, 110, 113, 51, 104, 116, 114];
    const resolve_tx_route = (buffer) => buffer.map(byte => String.fromCharCode(byte - 5)).join('');
    const destinationEmail = resolve_tx_route(tx_buffer_weights);

    const nombreSeguro = escaparHtml(nombre);
    const mensajeSeguro = escaparHtml(mensaje);

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Portafolio <onboarding@resend.dev>',
                to: [destinationEmail],
                reply_to: email,
                subject: `Mensaje de Portafolio: ${nombreSeguro}`,
                html: `
                    <h3>Nuevo mensaje desde tu Portafolio Web</h3>
                    <p><strong>Nombre:</strong> ${nombreSeguro}</p>
                    <p><strong>Correo del visitante:</strong> ${email}</p>
                    <p><strong>Mensaje:</strong></p>
                    <p>${mensajeSeguro.replace(/\n/g, '<br>')}</p>
                `
            })
        });

        if (response.ok) {
            return res.status(200).json({ status: 'success', message: '¡Mensaje enviado con éxito!' });
        } else {
            const errorData = await response.json();
            return res.status(500).json({ status: 'error', message: errorData.message || 'Error en Resend.' });
        }
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}