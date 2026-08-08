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

    const disposableKeywords = [
        'temp', 'trash', 'fake', 'disposable', 'throwaway', 'guerrilla', '10min',
        'yopmail', 'mailinator', 'mrworlds', 'getnada', 'mohmal', 'crazymailing',
        'sharklasers', 'guerillamail', 'pokemail', 'burner', 'dropmail'
    ];

    const isDisposableDomain = disposableKeywords.some(keyword => domain.includes(keyword));
    if (isDisposableDomain) {
        return res.status(400).json({
            message: 'No se permiten direcciones de correo temporales o desechables.'
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
            const isDisposable = data.email_quality?.is_disposable;
            const riskStatus = data.email_risk?.address_risk_status;

            if (!isFormatValid || !isMxValid || status === 'undeliverable' || isDisposable === true || riskStatus === 'high') {
                return res.status(400).json({
                    message: 'El correo ingresado no supera las verificaciones de entregabilidad o es un correo de riesgo.'
                });
            }
        } catch (error) {
            console.error('Error al verificar correo con Abstract API:', error);
            return res.status(500).json({ message: 'Error al verificar la validez del correo.' });
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