export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { nombre, email, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
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
                to: '2024030406@upsin.edu.mx',
                reply_to: email, // <-- Dirección a la que le responderás
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