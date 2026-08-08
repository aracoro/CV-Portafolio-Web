export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { nombre, email, mensaje, honeypot } = req.body;

    if (honeypot) {
        return res.status(200).json({ status: 'success', message: '¡Mensaje enviado con éxito!' });
    }

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'El formato del correo electrónico es inválido.' });
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
        return res.status(400).json({ message: 'Dominio de correo no válido.' });
    }

    const trustedDomains = [
        'gmail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com',
        'icloud.com', 'me.com', 'protonmail.com', 'proton.me', 'zoho.com',
        'aol.com', 'gmx.com', 'mail.com',
        'upsin.edu.mx'
    ];

    const isTrustedDomain = trustedDomains.includes(domain) || domain.endsWith('.edu') || domain.endsWith('.edu.mx');

    if (!isTrustedDomain) {
        return res.status(400).json({
            message: 'Solo se permiten direcciones de correo de proveedores reales o institucionales reconocidos (Gmail, Outlook, Yahoo, etc.).'
        });
    }

    const apiKey = process.env.ABSTRACT_API_KEY;

    if (apiKey) {
        try {
            const validationResponse = await fetch(`https://emailreputation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`);
            const data = await validationResponse.json();

            const status = data.email_deliverability?.status;
            const isFormatValid = data.email_deliverability?.is_format_valid;
            const isMxValid = data.email_deliverability?.is_mx_valid;

            if (!isFormatValid || !isMxValid || status === 'undeliverable') {
                return res.status(400).json({
                    message: 'El correo ingresado no existe o no puede recibir mensajes.'
                });
            }
        } catch (error) {
            console.error('Error al verificar correo con Abstract API:', error);
        }
    }

    const destinationEmail = process.env.CONTACT_RECIPIENT_EMAIL;

    if (!destinationEmail) {
        return res.status(500).json({ status: 'error', message: 'Configuración de servidor incompleta.' });
    }

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
                    <p><strong>Correo del usuario:</strong> ${email}</p>
                    <p><strong>Mensaje:</strong></p>
                    <p>${mensaje}</p>
                `
            })
        });

        if (response.ok) {
            return res.status(200).json({ status: 'success', message: '¡Mensaje enviado con éxito!' });
        } else {
            const errorData = await response.json();
            return res.status(500).json({ status: 'error', message: errorData.message });
        }
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
    }
}