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



    const pdfUrl = 'assets/docs/CV_ARACELI PUERTA.pdf';

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    let pdfDoc = null,
        pageNum = 1,
        pageIsRendering = false,
        pageNumIsPending = null;

    const scale = 1.5,
        canvas = document.getElementById('pdf-render'),
        ctx = canvas ? canvas.getContext('2d') : null;

    const renderPage = num => {
        pageIsRendering = true;

        pdfDoc.getPage(num).then(page => {
            const viewport = page.getViewport({ scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: ctx,
                viewport
            };

            const renderTask = page.render(renderContext);

            renderTask.promise.then(() => {
                pageIsRendering = false;

                if (pageNumIsPending !== null) {
                    renderPage(pageNumIsPending);
                    pageNumIsPending = null;
                }
            });

            document.getElementById('page-num').textContent = num;
        });
    };

    const queueRenderPage = num => {
        if (pageIsRendering) {
            pageNumIsPending = num;
        } else {
            renderPage(num);
        }
    };

    document.getElementById('prev-page')?.addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });

    if (canvas) {
        pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc_ => {
            pdfDoc = pdfDoc_;
            document.getElementById('page-count').textContent = pdfDoc.numPages;
            renderPage(pageNum);
        }).catch(err => {
            console.error('Error al cargar el PDF:', err);
        });
    }
});