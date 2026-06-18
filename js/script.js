/* ═══════════════════════════════════════════════════════════════
   GRACE & LENS — Main Page JavaScript
   Features: Navbar scroll, mobile menu, portfolio filter,
   lightbox, testimonials, form handling, scroll reveal
   ═══════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ─── Navbar scroll effect ───
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const scrolled = window.scrollY > 60;
        navbar.classList.toggle('scrolled', scrolled);
        lastScroll = window.scrollY;
    });

    // ─── Mobile nav toggle ───
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('open');
            navLinks.classList.toggle('open');
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navToggle.classList.remove('open');
                navLinks.classList.remove('open');
            });
        });
    }

    // ─── Current year in footer ───
    var yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // ═══════════════════════════════════════════════════════════════
    // PORTFOLIO FILTER
    // ═══════════════════════════════════════════════════════════════
    var filterBtns = document.querySelectorAll('.filter-btn');
    var portfolioItems = document.querySelectorAll('.portfolio-item');

    filterBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var filter = this.getAttribute('data-filter');

            filterBtns.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');

            portfolioItems.forEach(function(item) {
                var cat = item.getAttribute('data-category');
                if (filter === 'all' || cat === filter) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // LIGHTBOX
    // ═══════════════════════════════════════════════════════════════
    var lightbox = document.getElementById('lightbox');
    var lightboxImg = document.getElementById('lightboxImg');
    var lightboxClose = document.getElementById('lightboxClose');
    var lightboxPrev = document.getElementById('lightboxPrev');
    var lightboxNext = document.getElementById('lightboxNext');
    var currentLightboxIndex = 0;
    var visibleItems = [];

    function getVisibleItems() {
        visibleItems = [];
        portfolioItems.forEach(function(item) {
            if (!item.classList.contains('hidden')) {
                visibleItems.push(item);
            }
        });
    }

    function openLightbox(index) {
        getVisibleItems();
        currentLightboxIndex = index;
        showLightboxImage();
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function showLightboxImage() {
        var item = visibleItems[currentLightboxIndex];
        if (!item) return;

        var img = item.querySelector('img');
        var placeholder = item.querySelector('.photo-placeholder');

        if (img) {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightboxImg.style.display = 'block';
        } else if (placeholder) {
            // Show placeholder text content as styled box
            var span = placeholder.querySelector('span');
            lightboxImg.src = '';
            lightboxImg.style.display = 'none';
            // Create a temporary styled display
            var content = document.getElementById('lightboxContent');
            var existing = content.querySelector('.lightbox-placeholder');
            if (existing) existing.remove();
            var div = document.createElement('div');
            div.className = 'photo-placeholder';
            div.style.cssText = 'width:400px;height:300px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:1.5rem;';
            div.textContent = span ? span.textContent : 'Photo';
            div.classList.add('lightbox-placeholder');
            content.appendChild(div);
        }
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Clean up placeholder
        var content = document.getElementById('lightboxContent');
        var existing = content.querySelector('.lightbox-placeholder');
        if (existing) existing.remove();
    }

    function nextLightbox() {
        getVisibleItems();
        currentLightboxIndex = (currentLightboxIndex + 1) % visibleItems.length;
        showLightboxImage();
    }

    function prevLightbox() {
        getVisibleItems();
        currentLightboxIndex = (currentLightboxIndex - 1 + visibleItems.length) % visibleItems.length;
        showLightboxImage();
    }

    // Open lightbox on portfolio item click
    portfolioItems.forEach(function(item, index) {
        item.addEventListener('click', function() {
            // Get index among all items (visibleItems computed on open)
            var allIndex = Array.prototype.indexOf.call(portfolioItems, item);
            openLightbox(allIndex);
        });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxNext) lightboxNext.addEventListener('click', function(e) { e.stopPropagation(); nextLightbox(); });
    if (lightboxPrev) lightboxPrev.addEventListener('click', function(e) { e.stopPropagation(); prevLightbox(); });

    // Close on background click
    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextLightbox();
        if (e.key === 'ArrowLeft') prevLightbox();
    });

    // ═══════════════════════════════════════════════════════════════
    // TESTIMONIALS SLIDER
    // ═══════════════════════════════════════════════════════════════
    var testimonials = document.querySelectorAll('.testimonial');
    var dots = document.querySelectorAll('.dot');
    var currentTestimonial = 0;
    var testimonialInterval;

    function showTestimonial(index) {
        testimonials.forEach(function(t) { t.classList.remove('active'); });
        dots.forEach(function(d) { d.classList.remove('active'); });
        if (testimonials[index]) testimonials[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        currentTestimonial = index;
    }

    function nextTestimonial() {
        showTestimonial((currentTestimonial + 1) % testimonials.length);
    }

    function startTestimonialSlider() {
        testimonialInterval = setInterval(nextTestimonial, 6000);
    }

    function stopTestimonialSlider() {
        if (testimonialInterval) clearInterval(testimonialInterval);
    }

    dots.forEach(function(dot, index) {
        dot.addEventListener('click', function() {
            stopTestimonialSlider();
            showTestimonial(index);
            startTestimonialSlider();
        });
    });

    if (testimonials.length > 0) startTestimonialSlider();

    // ═══════════════════════════════════════════════════════════════
    // CONTACT FORM
    // ═══════════════════════════════════════════════════════════════
    var contactForm = document.getElementById('contactForm');
    var formSuccess = document.getElementById('formSuccess');

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // ─── FOR PRODUCTION: Send form data to your server/email ───
            // This currently just shows a success message locally.
            // To actually receive inquiries, connect this to:
            //   1. A backend API endpoint (POST /api/contact)
            //   2. A service like Formspree (https://formspree.io)
            //   3. EmailJS (https://www.emailjs.com)
            //   4. Your server's email handler
            //
            // Example with fetch():
            //   var formData = new FormData(contactForm);
            //   fetch('/api/contact', { method: 'POST', body: formData })
            //     .then(function(res) { show success })
            //     .catch(function(err) { show error });
            // ─────────────────────────────────────────────────────────

            // Show success message (matches Jenna's style)
            formSuccess.classList.add('show');
            contactForm.reset();

            // Hide success after 6 seconds
            setTimeout(function() {
                formSuccess.classList.remove('show');
            }, 6000);

            // Scroll to success message
            formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    // ─── Newsletter form (footer) ───
    var newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var btn = newsletterForm.querySelector('button');
            var originalText = btn.textContent;
            btn.textContent = '♡ Thank You!';
            newsletterForm.reset();
            setTimeout(function() { btn.textContent = originalText; }, 3000);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // GALLERY LOGIN (from homepage)
    // ═══════════════════════════════════════════════════════════════
    // ─────────────────────────────────────────────────────────────
    // PASSCODE CONFIGURATION
    // ─────────────────────────────────────────────────────────────
    // Add client passcodes here. Each passcode maps to a gallery.
    // Format: 'PASSCODE': { title: 'Gallery Title', date: 'Date String' }
    //
    // When a client enters their passcode, they're redirected to
    // gallery.html?gallery=PASSCODE where the gallery page loads.
    //
    // For production with a real server, you'd replace this with
    // a server-side check that loads actual photo folders.
    // ─────────────────────────────────────────────────────────────
    var GALLERY_CODES = {
        'DEMO-2024': { title: 'Sarah & Michael\'s Wedding', date: 'June 15, 2024' },
        'SAMPLE-001': { title: 'Engagement Session', date: 'March 3, 2024' },
        'COUPLE-LOVE': { title: 'Emily & James', date: 'February 14, 2024' }
        // Add your client passcodes here, e.g.:
        // 'SMITH-0224': { title: 'Smith Wedding Gallery', date: 'February 24, 2025' }
    };

    var galleryLoginForm = document.getElementById('galleryLoginForm');
    var galleryError = document.getElementById('galleryError');
    var galleryHint = document.getElementById('galleryHint');

    if (galleryLoginForm) {
        galleryLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var code = document.getElementById('galleryCode').value.trim().toUpperCase();

            if (GALLERY_CODES[code]) {
                // Redirect to gallery page with the passcode
                window.location.href = 'gallery.html?gallery=' + encodeURIComponent(code);
            } else {
                // Show error
                galleryError.textContent = 'Passcode not found. Please check your email or contact me if you need help.';
                galleryHint.style.display = 'none';

                // Clear error after 5 seconds
                setTimeout(function() {
                    galleryError.textContent = '';
                    galleryHint.style.display = '';
                }, 5000);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SCROLL REVEAL
    // ═══════════════════════════════════════════════════════════════
    // Add .reveal class to elements you want to animate on scroll
    var revealElements = document.querySelectorAll(
        '.section-header, .package-card, .about-image, .about-text, ' +
        '.testimonial-slider, .gallery-access, .contact-info, .contact-form-card'
    );

    revealElements.forEach(function(el) {
        el.classList.add('reveal');
    });

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

    revealElements.forEach(function(el) {
        observer.observe(el);
    });

    // ─── Set min date for date picker to today ───
    var dateInput = document.getElementById('date');
    if (dateInput) {
        var today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

})();