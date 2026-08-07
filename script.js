document.addEventListener('DOMContentLoaded', () => {
    // --- Cambio de Idioma ---
    const langToggleBtn = document.getElementById('lang-toggle');
    let currentLang = 'es';

    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            currentLang = currentLang === 'es' ? 'en' : 'es';

            const translatableElements = document.querySelectorAll('[data-es][data-en]');

            translatableElements.forEach(el => {
                el.textContent = el.getAttribute(`data-${currentLang}`);
            });

            langToggleBtn.textContent = currentLang === 'es' ? '🌐 ES / EN' : '🌐 EN / ES';
        });
    }

    // --- Menú Hamburguesa / Móvil ---
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
});

// --- Función para enviar el formulario a la API Serverless (Resend) ---
async function enviarPorAPI(event) {
    event.preventDefault();

    const btn = document.getElementById('btn-submit');
    const responseText = document.getElementById('form-response');

    const data = {
        nombre: document.getElementById('contacto-nombre').value,
        email: document.getElementById('contacto-email').value,
        mensaje: document.getElementById('contacto-mensaje').value
    };

    btn.disabled = true;
    btn.textContent = 'ENVIANDO...';

    try {
        const response = await fetch('/api/contacto', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        responseText.style.display = 'block';
        if (response.ok) {
            responseText.style.color = '#64ffda';
            responseText.textContent = '>>> ACK: ¡Mensaje enviado exitosamente!';
            document.getElementById('contact-form').reset();
        } else {
            responseText.style.color = '#ff5555';
            responseText.textContent = `>>> NACK: Error (${result.message})`;
        }
    } catch (error) {
        responseText.style.display = 'block';
        responseText.style.color = '#ff5555';
        responseText.textContent = '>>> ERROR: No se pudo conectar con el servidor.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'PING / Enviar Mensaje';
    }
}