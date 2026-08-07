document.addEventListener('DOMContentLoaded', () => {
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

    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = currentLang === 'es'
                ? '[PACKET DELIVERED]: Tu mensaje ha sido enviado correctamente.'
                : '[PACKET DELIVERED]: Your message has been sent successfully.';
            alert(msg);
            contactForm.reset();
        });
    }

    function enviarCorreoPortafolio(event) {
        event.preventDefault();

        const nombre = document.getElementById('contacto-nombre').value;
        const email = document.getElementById('contacto-email').value;
        const mensaje = document.getElementById('contacto-mensaje').value;

        const asunto = encodeURIComponent(`Contacto desde Portafolio Web - ${nombre}`);
        const cuerpo = encodeURIComponent(`Hola Araceli,\n\nTe han enviado un mensaje desde tu sitio web:\n\nNombre: ${nombre}\nCorreo: ${email}\n\nMensaje:\n${mensaje}`);

        window.location.href = `mailto:2024030406@upsin.edu.mx?subject=${asunto}&body=${cuerpo}`;
    }
});