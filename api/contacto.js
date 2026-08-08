const rateLimitMap = new Map();

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

    // Validación de correo del visitante
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Por favor, ingresa un formato de correo válido.' });
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

    // 👇 OFUSCACIÓN DE CORREO: Visible en GitHub como un hash, no como un email.
    const secretHash = 'YXJhY2VsaXB1ZXJ0QGdtYWlsLmNvbQ==';
    // El servidor lo decodifica en tiempo de ejecución
    const destinationEmail = Buffer.from(secretHash, 'base64').toString('utf-8');

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
                subject: `Mensaje de Portafolio: ${nombre}`,
                html: `
                    <h3>Nuevo mensaje desde tu Portafolio Web</h3>
                    <p><strong>Nombre:</strong> ${nombre}</p>
                    <p><strong>Correo del visitante:</strong> ${email}</p>
                    <p><strong>Mensaje:</strong></p>
                    <p>${mensaje}</p>
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