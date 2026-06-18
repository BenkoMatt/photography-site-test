/* ═══════════════════════════════════════════════════════════════
   GRACE & LENS — Client Gallery Page JavaScript
   Features: Password gate, lightbox slideshow, favorites,
   download, share, keyboard navigation
   ═══════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ─── Navbar & mobile nav (same as main page) ───
    var navToggle = document.getElementById('navToggle');
    var navLinks = document.getElementById('navLinks');

    if (navToggle) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('open');
            navLinks.classList.toggle('open');
        });

        navLinks.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                navToggle.classList.remove('open');
                navLinks.classList.remove('open');
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // GALLERY PASSCODE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    // ─────────────────────────────────────────────────────────────
    // IMPORTANT: This is CLIENT-SIDE passcode checking for demo
    // purposes. It is NOT secure — anyone can view the source and
    // see these codes.
    //
    // FOR PRODUCTION (real client photos on your server):
    // 1. Remove the GALLERY_CODES object below
    // 2. Replace the gateForm submit handler with a fetch() call
    //    to your server API, e.g.:
    //
    //    fetch('/api/gallery/verify', {
    //        method: 'POST',
    //        headers: { 'Content-Type': 'application/json' },
    //        body: JSON.stringify({ code: code })
    //    })
    //    .then(function(res) { return res.json() })
    //    .then(function(data) {
    //        if (data.valid) { loadGallery(data.galleryId, data.photos); }
    //        else { showError('Invalid passcode'); }
    //    });
    //
    // 3. Your server validates the passcode and returns the list
    //    of photo URLs for that client's gallery.
    // ─────────────────────────────────────────────────────────────
    var GALLERY_CODES = {
        'DEMO-2024': { title: 'Sarah & Michael\'s Wedding', date: 'June 15, 2024' },
        'SAMPLE-001': { title: 'Engagement Session', date: 'March 3, 2024' },
        'COUPLE-LOVE': { title: 'Emily & James', date: 'February 14, 2024' }
        // Add your client passcodes here, e.g.:
        // 'SMITH-0224': { title: 'Smith Wedding Gallery', date: 'February 24, 2025' }
    };

    // ═══════════════════════════════════════════════════════════════
    // PASSWORD GATE
    // ═══════════════════════════════════════════════════════════════
    var galleryGate = document.getElementById('galleryGate');
    var galleryContent = document.getElementById('galleryContent');
    var gateForm = document.getElementById('gateForm');
    var gateCode = document.getElementById('gateCode');
    var gateError = document.getElementById('gateError');
    var galleryTitle = document.getElementById('galleryTitle');
    var galleryDate = document.getElementById('galleryDate');
    var photoCount = document.getElementById('photoCount');

    // Check if a gallery code was passed in the URL (from homepage login)
    var urlParams = new URLSearchParams(window.location.search);
    var presetCode = urlParams.get('gallery');

    if (presetCode) {
        presetCode = presetCode.toUpperCase();
        if (GALLERY_CODES[presetCode]) {
            unlockGallery(presetCode);
        } else {
            gateCode.value = presetCode;
            gateError.textContent = 'Passcode not found. Please check and try again.';
        }
    }

    if (gateForm) {
        gateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var code = gateCode.value.trim().toUpperCase();

            if (GALLERY_CODES[code]) {
                unlockGallery(code);
            } else {
                gateError.textContent = 'Passcode not found. Please check your email or contact me if you need help.';
                gateCode.value = '';

                setTimeout(function() {
                    gateError.textContent = '';
                }, 5000);
            }
        });
    }

    function unlockGallery(code) {
        var info = GALLERY_CODES[code];

        galleryGate.classList.add('hidden');
        galleryContent.classList.remove('hidden');

        if (info) {
            galleryTitle.textContent = info.title;
            galleryDate.textContent = info.date;
        }

        // Count photos
        var items = document.querySelectorAll('.gallery-item');
        if (photoCount) photoCount.textContent = items.length;

        // Scroll to top of gallery
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Initialize slideshow with gallery items
        initSlideshow();
    }

    // ═══════════════════════════════════════════════════════════════
    // FAVORITES
    // ═══════════════════════════════════════════════════════════════
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('gallery-action') && e.target.title === 'Favorite') {
            e.stopPropagation();
            e.target.classList.toggle('favorited');
            if (e.target.classList.contains('favorited')) {
                e.target.textContent = '♥';
            } else {
                e.target.textContent = '♡';
            }
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // SLIDESHOW / LIGHTBOX
    // ═══════════════════════════════════════════════════════════════
    var slideshow = document.getElementById('slideshow');
    var slideshowImg = document.getElementById('slideshowImg');
    var slideshowClose = document.getElementById('slideshowClose');
    var slideshowPrev = document.getElementById('slideshowPrev');
    var slideshowNext = document.getElementById('slideshowNext');
    var slideshowContent = document.getElementById('slideshowContent');
    var galleryItems = [];
    var currentSlide = 0;

    function initSlideshow() {
        galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));

        galleryItems.forEach(function(item, index) {
            item.addEventListener('click', function(e) {
                // Don't open slideshow if clicking action buttons
                if (e.target.classList.contains('gallery-action')) return;
                currentSlide = index;
                showSlide();
                openSlideshow();
            });
        });
    }

    function showSlide() {
        var item = galleryItems[currentSlide];
        if (!item) return;

        var img = item.querySelector('img');
        var placeholder = item.querySelector('.photo-placeholder');
        var fullSrc = item.getAttribute('data-full');

        // Clean up previous placeholder
        var existing = slideshowContent.querySelector('.slide-placeholder');
        if (existing) existing.remove();

        if (img && img.src) {
            slideshowImg.src = img.src;
            slideshowImg.alt = img.alt || '';
            slideshowImg.style.display = 'block';
        } else if (fullSrc) {
            // Try to load the data-full image
            slideshowImg.src = fullSrc;
            slideshowImg.alt = '';
            slideshowImg.style.display = 'block';
            slideshowImg.onerror = function() {
                slideshowImg.style.display = 'none';
                showSlidePlaceholder(placeholder);
            };
        } else if (placeholder) {
            slideshowImg.style.display = 'none';
            showSlidePlaceholder(placeholder);
        }
    }

    function showSlidePlaceholder(placeholder) {
        var span = placeholder ? placeholder.querySelector('span') : null;
        var div = document.createElement('div');
        div.className = 'photo-placeholder slide-placeholder';
        div.style.cssText = 'width:400px;height:300px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.5rem;';
        var spanEl = document.createElement('span');
        spanEl.textContent = span ? span.textContent : 'Photo';
        div.appendChild(spanEl);
        slideshowContent.appendChild(div);
    }

    function openSlideshow() {
        slideshow.classList.add('open');
        slideshow.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeSlideshow() {
        slideshow.classList.remove('open');
        slideshow.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        var existing = slideshowContent.querySelector('.slide-placeholder');
        if (existing) existing.remove();
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % galleryItems.length;
        showSlide();
    }

    function prevSlide() {
        currentSlide = (currentSlide - 1 + galleryItems.length) % galleryItems.length;
        showSlide();
    }

    if (slideshowClose) slideshowClose.addEventListener('click', closeSlideshow);
    if (slideshowNext) slideshowNext.addEventListener('click', function(e) { e.stopPropagation(); nextSlide(); });
    if (slideshowPrev) slideshowPrev.addEventListener('click', function(e) { e.stopPropagation(); prevSlide(); });

    if (slideshow) {
        slideshow.addEventListener('click', function(e) {
            if (e.target === slideshow) closeSlideshow();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (!slideshow.classList.contains('open')) return;
        if (e.key === 'Escape') closeSlideshow();
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
    });

    // ═══════════════════════════════════════════════════════════════
    // TOOLBAR BUTTONS
    // ═══════════════════════════════════════════════════════════════
    var downloadAllBtn = document.getElementById('downloadAllBtn');
    var shareBtn = document.getElementById('shareBtn');
    var slideshowBtn = document.getElementById('slideshowBtn');

    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', function() {
            // ─── FOR PRODUCTION ───
            // Replace this with a server endpoint that provides a
            // ZIP download of all full-resolution images, e.g.:
            //   window.location.href = '/api/gallery/download?code=' + code;

            alert('♡ In production, this would download all your photos as a ZIP file.\n\nFor now, click the ⬇ button on individual photos to download them one at a time.');
        });
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            var url = window.location.href;

            if (navigator.share) {
                navigator.share({
                    title: 'My Photography Gallery',
                    text: 'Check out my photos from Grace & Lens Photography!',
                    url: url
                }).catch(function() {});
            } else {
                // Fallback: copy to clipboard
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(function() {
                        alert('♡ Gallery link copied to clipboard!\n\nShare it with your family and friends.');
                    }).catch(function() {
                        prompt('Copy this link to share your gallery:', url);
                    });
                } else {
                    prompt('Copy this link to share your gallery:', url);
                }
            }
        });
    }

    if (slideshowBtn) {
        slideshowBtn.addEventListener('click', function() {
            if (galleryItems.length === 0) return;
            currentSlide = 0;
            showSlide();
            openSlideshow();
        });
    }

    // ─── Set download links on gallery items ───
    document.querySelectorAll('.gallery-item').forEach(function(item) {
        var fullSrc = item.getAttribute('data-full');
        var downloadLink = item.querySelector('a[download]');
        if (downloadLink && fullSrc) {
            downloadLink.href = fullSrc;
        }
    });

})();