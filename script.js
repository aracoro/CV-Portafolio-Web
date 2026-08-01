console.log("%c Araceli Puerta | Network & Infrastructure Portfolio ", "background: #0d131f; color: #00f2fe; font-size: 14px; font-weight: bold; padding: 5px; border: 1px solid #00f2fe;");

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            alert('[PACKET DELIVERED]: Tu mensaje ha sido enviado correctamente. Gracias por contactarme, Araceli se pondrá en contacto contigo pronto.');

            contactForm.reset();
        });
    }
});