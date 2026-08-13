/* ═══════════════════════════════════════════════════════════════
   GRACE & LENS — Main Page JavaScript
   Features: Navbar scroll, mobile menu, portfolio filter,
   lightbox, form handling, scroll reveal
   ═══════════════════════════════════════════════════════════════ */

// ─── MOBILE HERO HEIGHT FIX ───
// Viewport units (vh/svh/dvh) change when the mobile address bar
// collapses/expands during scroll, causing the hero images to resize
// (zoom) and jank the scroll. Lock the hero to a fixed pixel height
// via a CSS custom property that doesn't change during scroll.
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
}
setAppHeight();
window.addEventListener('resize', setAppHeight);

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
    // CONTACT FORM — Formspree Integration
    // ═══════════════════════════════════════════════════════════════
    // Sends form data to Formspree, which emails inquiries to
    // gallerybyjennalynn@gmail.com. Free tier: 50 submissions/month.
    //
    // SETUP: Replace YOUR_FORM_ID in the form's action attribute with
    // your actual Formspree form ID (found at https://formspree.io/forms).
    // ═══════════════════════════════════════════════════════════════
    var contactForm = document.getElementById('contactForm');
    var formSuccess = document.getElementById('formSuccess');
    var formError = document.getElementById('formError');
    var formLoading = document.getElementById('formLoading');
    var submitBtn = document.getElementById('submitBtn');
    var originalBtnText = submitBtn ? submitBtn.textContent : 'Send Inquiry';

    function resetFormStates() {
        if (formSuccess) formSuccess.classList.remove('show');
        if (formError) formError.classList.remove('show');
        if (formLoading) formLoading.classList.remove('show');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Hide any previous status messages
            resetFormStates();

            // Show loading state
            if (formLoading) formLoading.classList.add('show');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }

            // Collect form data
            var formData = new FormData(contactForm);

            // Submit to Formspree via fetch API
            fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            })
            .then(function(response) {
                if (response.ok) {
                    // Success — show confirmation, reset form
                    if (formLoading) formLoading.classList.remove('show');
                    if (formSuccess) formSuccess.classList.add('show');
                    contactForm.reset();

                    // Scroll to success message
                    if (formSuccess) {
                        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    // Hide success after 8 seconds
                    setTimeout(function() {
                        if (formSuccess) formSuccess.classList.remove('show');
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalBtnText;
                        }
                    }, 8000);
                } else {
                    // Formspree returned an error status
                    throw new Error('Formspree returned ' + response.status);
                }
            })
            .catch(function(error) {
                // Network error or Formspree error — show error message
                if (formLoading) formLoading.classList.remove('show');
                if (formError) formError.classList.add('show');

                if (formError) {
                    formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // Re-enable submit button so user can retry
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }

                // Hide error after 10 seconds
                setTimeout(function() {
                    if (formError) formError.classList.remove('show');
                }, 10000);
            });
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
    // S-3 SECURITY: Client-side passcodes are visible in page source.
    // Do NOT put real client passcodes here. For real client galleries:
    // 1. Use unguessable UUID-based URLs (not committed to public repo)
    // 2. Or implement server-side validation with per-client tokens
    // ─────────────────────────────────────────────────────────────
    var GALLERY_CODES = {
        // Demo entries removed — no client-side passcodes for real galleries
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
        '.gallery-access, .contact-info, .contact-form-card'
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

    // ─── Phone number: US only, digits only, max 10 ───
    var phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            // Strip everything except digits
            var cleaned = e.target.value.replace(/\D/g, '');
            // Enforce maxlength of 10
            if (cleaned.length > 10) {
                cleaned = cleaned.substring(0, 10);
            }
            e.target.value = cleaned;
        });
    }

})();