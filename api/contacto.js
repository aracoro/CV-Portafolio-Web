import dns from 'dns/promises';

const rateLimitMap = new Map();

// Escapa caracteres HTML para evitar inyección de código/scripts en el correo
function escaparHtml(texto) {
    const mapa = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(texto).replace(/[&<>"']/g, (caracter) => mapa[caracter]);
}

async function esDesechable(dominio) {
    try {
        const resp = await fetch(`https://open.kickbox.com/v1/disposable/${dominio}`);
        if (!resp.ok) return false; // si Kickbox falla, no bloqueamos por error ajeno
        const data = await resp.json();
        return data.disposable === true;
    } catch {
        return false; // si hay error de red, no afectamos a usuarios reales
    }
}

async function esCorreoValido(email) {
    const dominio = email.split('@')[1]?.toLowerCase();
    if (!dominio) return { valido: false, razon: 'formato' };

    // 1. Verificar que el dominio pueda recibir correos (MX)
    try {
        const registrosMx = await dns.resolveMx(dominio);
        if (!registrosMx || registrosMx.length === 0) {
            return { valido: false, razon: 'sin_mx' };
        }
    } catch {
        return { valido: false, razon: 'dominio_no_existe' };
    }

    // 2. Verificar que no sea un dominio desechable (Kickbox)
    const desechable = await esDesechable(dominio);
    if (desechable) {
        return { valido: false, razon: 'desechable' };
    }

    return { valido: true };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { nombre, email, mensaje, website_hp } = req.body;

    // Filtro Honeypot
    if (website_hp) {
        return res.status(200).json({ status: 'success', message: '¡Mensaje enviado con éxito!' });
    }

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // Validación de formato de correo
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Por favor, ingresa un formato de correo válido.' });
    }

    // Rate Limit (2 minutos) - se aplica antes de la validación MX/Kickbox
    // para evitar que alguien abuse de estas consultas repetidamente
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

    // Validación de dominio real + desechable
    const validacion = await esCorreoValido(email);
    if (!validacion.valido) {
        return res.status(400).json({
            message: 'El correo ingresado no parece ser válido. Verifica que esté bien escrito.'
        });
    }

    rateLimitMap.set(clientIp, now);

    const tx_buffer_weights = [102, 119, 102, 104, 106, 113, 110, 117, 122, 106, 119, 121, 69, 108, 114, 102, 110, 113, 51, 104, 116, 114];

    const resolve_tx_route = (buffer) => {
        return buffer.map(byte => String.fromCharCode(byte - 5)).join('');
    };

    const destinationEmail = resolve_tx_route(tx_buffer_weights);

    // Sanitizar antes de insertar en el HTML (previene inyección de scripts/HTML)
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