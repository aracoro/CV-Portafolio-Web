document.addEventListener('DOMContentLoaded', () => {
    // 1. Traductor de Idioma (ES / EN)
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

    // 2. Menú Hamburguesa para Móviles
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        // Cerrar el menú desplegable automáticamente al hacer clic en un enlace
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // 3. Manejo del Formulario de Contacto
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
});