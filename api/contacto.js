export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { nombre, email, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // 1. Validar sintaxis y formato del correo
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'El formato del correo electrónico es inválido' });
    }

    // 2. Validar que el dominio exista y tenga servidor MX (vía HTTP Google DNS API)
    const domain = email.split('@')[1];
    try {
        const dnsResponse = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
        const dnsData = await dnsResponse.json();

        // Status 0 significa NOERROR en DNS (el dominio existe)
        // Y Answer verifica que tenga registros MX configurados
        if (dnsData.Status !== 0 || !dnsData.Answer || dnsData.Answer.length === 0) {
            return res.status(400).json({ message: 'El correo ingresado no pertenece a un dominio con servicio de correo activo' });
        }
    } catch (error) {
        return res.status(400).json({ message: 'Error al verificar la existencia del dominio de correo' });
    }

    // 3. Ocultar la dirección de destino usando variable de entorno (con fallback)
    const destinationEmail = process.env.CONTACT_RECIPIENT_EMAIL || 'aracelipuert@gmail.com';

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