document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const responseText = document.getElementById('form-response');
    const submitBtn = document.getElementById('btn-submit');

    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        responseText.style.display = 'none';
        responseText.textContent = '';

        const lastSubmitTime = localStorage.getItem('last_contact_submit');
        const now = Date.now();
        const COOLDOWN_MS = 2 * 60 * 1000;

        if (lastSubmitTime && (now - lastSubmitTime < COOLDOWN_MS)) {
            const waitTime = Math.ceil((COOLDOWN_MS - (now - lastSubmitTime)) / 1000);
            responseText.style.color = '#ff9800';
            responseText.textContent = `[429] Por favor espera ${waitTime} segundos antes de enviar otro mensaje.`;
            responseText.style.display = 'block';
            return;
        }

        const nombre = document.getElementById('contacto-nombre').value.trim();
        const email = document.getElementById('contacto-email').value.trim();
        const mensaje = document.getElementById('contacto-mensaje').value.trim();
        const website_hp = document.getElementById('contacto-hp').value; // Honeypot

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'CONNECTING...';

        try {
            const response = await fetch('/api/contacto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre,
                    email,
                    mensaje,
                    website_hp
                })
            });

            const data = await response.json();

            if (response.ok) {
                responseText.style.color = '#00ff66';
                responseText.textContent = `[200 OK] ${data.message || '¡Mensaje enviado con éxito!'}`;
                localStorage.setItem('last_contact_submit', Date.now().toString());
                contactForm.reset();
            } else {
                responseText.style.color = '#ff3333';
                responseText.textContent = `[ERROR] ${data.message || 'Ocurrió un error al enviar.'}`;
            }
        } catch (error) {
            responseText.style.color = '#ff3333';
            responseText.textContent = '[ERROR] Fallo de conexión con el servidor.';
        } finally {
            responseText.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});