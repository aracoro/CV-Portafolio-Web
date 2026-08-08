export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { nombre, email, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // 1. Validación de calidad y existencia del correo vía Abstract API
    try {
        const apiKey = process.env.ABSTRACT_API_KEY || 'fdb211f1562a4a9ab0d5940dbd819b7a';
        const validationResponse = await fetch(`https://emailreputation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`);
        const data = await validationResponse.json();

        // Extracción de métricas de seguridad según la respuesta de la API
        const isFormatValid = data.email_deliverability?.is_format_valid;
        const isMxValid = data.email_deliverability?.is_mx_valid;
        const status = data.email_deliverability?.status;
        const isDisposable = data.email_quality?.is_disposable;
        const riskStatus = data.email_risk?.address_risk_status;

        // Rechaza el envío si el formato/MX es inválido, si es un correo desechable o de riesgo alto
        if (!isFormatValid || !isMxValid || status === 'undeliverable' || isDisposable || riskStatus === 'high') {
            return res.status(400).json({
                message: 'El correo electrónico ingresado no existe, es inválido o se considera de riesgo.'
            });
        }
    } catch (error) {
        console.error('Error al verificar el correo con Abstract API:', error);
        // Si la API de verificación falla externamente, se permite continuar para no bloquear usuarios legítimos
    }

    // 2. Dirección de destino resguardada en variable de entorno
    const destinationEmail = process.env.CONTACT_RECIPIENT_EMAIL || 'aracelipuert@gmail.com';

    // 3. Envío del correo con Resend
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Portafolio <onboarding@resend.dev>',
                to: destinationEmail,
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
        return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
}