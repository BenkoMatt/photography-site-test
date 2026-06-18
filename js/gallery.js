/* ═══════════════════════════════════════════════════════════════
   JENNA LYNN PHOTOGRAPHY — Client Gallery JavaScript
   Pixieset-style: Cover image · Masonry grid · PhotoSwipe lightbox
   Features: Password gate, lightbox with counter, favorites,
   download, share, keyboard navigation, sticky navbar
   ═══════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // GALLERY PASSCODE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    var GALLERY_CODES = {
        'DEMO-2024': { title: 'Sarah & Michael\'s Wedding', date: 'June 15, 2024', cover: 'photos/gallery/portraits/matt-grad.jpeg' },
        'SAMPLE-001': { title: 'Engagement Session', date: 'March 3, 2024', cover: 'photos/gallery/engagements/gracie-isaiah-engagement-1.jpeg' },
        'COUPLE-LOVE': { title: 'Emily & James', date: 'February 14, 2024', cover: 'photos/gallery/couples/JennaLynnPhotography-641.jpg' }
        // Add your client passcodes here, e.g.:
        // 'SMITH-0224': { title: 'Smith Wedding Gallery', date: 'February 24, 2025', cover: 'photos/client-photos/smith-cover.jpg' }
    };

    // ═══════════════════════════════════════════════════════════════
    // ELEMENTS
    // ═══════════════════════════════════════════════════════════════
    var galleryGate = document.getElementById('galleryGate');
    var galleryContent = document.getElementById('galleryContent');
    var gateForm = document.getElementById('gateForm');
    var gateCode = document.getElementById('gateCode');
    var gateError = document.getElementById('gateError');

    // Pixieset-style elements
    var psNav = document.getElementById('psNav');
    var psGalleryTitle = document.getElementById('psGalleryTitle');
    var psCoverTitle = document.getElementById('psCoverTitle');
    var psCoverDate = document.getElementById('psCoverDate');
    var psCover = document.getElementById('psCover');
    var psCoverScroll = document.getElementById('psCoverScroll');
    var photoCount = document.getElementById('photoCount');

    // Lightbox
    var psLightbox = document.getElementById('psLightbox');
    var psLbImg = document.getElementById('psLbImg');
    var psLbCounter = document.getElementById('psLbCounter');
    var psLbClose = document.getElementById('psLbClose');
    var psLbPrev = document.getElementById('psLbPrev');
    var psLbNext = document.getElementById('psLbNext');
    var psLbFav = document.getElementById('psLbFav');
    var psLbShare = document.getElementById('psLbShare');
    var psLbDownload = document.getElementById('psLbDownload');

    var photos = [];
    var currentPhoto = 0;
    var favorites = {};

    // ═══════════════════════════════════════════════════════════════
    // PASSWORD GATE
    // ═══════════════════════════════════════════════════════════════

    // Check URL params for passcode from homepage
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
                setTimeout(function() { gateError.textContent = ''; }, 5000);
            }
        });
    }

    function unlockGallery(code) {
        var info = GALLERY_CODES[code];

        galleryGate.classList.add('hidden');
        galleryContent.classList.remove('hidden');

        if (info) {
            psCoverTitle.textContent = info.title;
            psCoverDate.textContent = info.date;
            psGalleryTitle.textContent = info.title;

            // Update cover image if specified
            if (info.cover) {
                var coverBefore = psCover.querySelector('::before'); // Can't set pseudo-element directly
                // Set cover background via inline style on the cover element
                psCover.style.backgroundImage = 'url(' + info.cover + ')';
                psCover.style.backgroundSize = 'cover';
                psCover.style.backgroundPosition = 'center';
                // Remove the ::before by adding a class
                psCover.classList.add('has-custom-cover');
            }
        }

        // Collect photos
        photos = Array.prototype.slice.call(document.querySelectorAll('.ps-photo'));
        if (photoCount) photoCount.textContent = photos.length;

        // Scroll to top
        window.scrollTo(0, 0);

        // Initialize interactions
        initPhotoClicks();
        initNavbarScroll();
    }

    // ═══════════════════════════════════════════════════════════════
    // NAVBAR SCROLL (show/hide on scroll)
    // ═══════════════════════════════════════════════════════════════
    function initNavbarScroll() {
        var coverHeight = psCover ? psCover.offsetHeight : 300;

        window.addEventListener('scroll', function() {
            if (window.scrollY > coverHeight - 80) {
                psNav.classList.add('visible');
            } else {
                psNav.classList.remove('visible');
            }
        });

        // Cover scroll button
        if (psCoverScroll) {
            psCoverScroll.addEventListener('click', function() {
                var toolbar = document.getElementById('psToolbar');
                if (toolbar) {
                    toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    window.scrollTo({ top: coverHeight, behavior: 'smooth' });
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHOTO CLICK → LIGHTBOX
    // ═══════════════════════════════════════════════════════════════
    function initPhotoClicks() {
        photos.forEach(function(photo, index) {
            photo.addEventListener('click', function(e) {
                // Don't open lightbox if clicking action buttons
                if (e.target.closest('.ps-action')) return;
                currentPhoto = index;
                openLightbox();
            });
        });

        // Favorite buttons in grid
        document.querySelectorAll('.ps-action[data-action="fav"]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var photoEl = this.closest('.ps-photo');
                var photoIndex = photos.indexOf(photoEl);
                toggleFavorite(photoIndex, this);
            });
        });
    }

    function toggleFavorite(index, btnEl) {
        favorites[index] = !favorites[index];
        if (btnEl) {
            if (favorites[index]) {
                btnEl.classList.add('favorited');
                btnEl.textContent = '♥';
            } else {
                btnEl.classList.remove('favorited');
                btnEl.textContent = '♡';
            }
        }
        // Update lightbox fav button if open
        if (psLightbox.classList.contains('open')) {
            updateLightboxFav();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LIGHTBOX
    // ═══════════════════════════════════════════════════════════════
    function openLightbox() {
        showPhoto();
        psLightbox.classList.add('open');
        psLightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        psLightbox.classList.remove('open');
        psLightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function showPhoto() {
        var photo = photos[currentPhoto];
        if (!photo) return;

        var fullSrc = photo.getAttribute('data-full');
        var img = photo.querySelector('img');
        var alt = img ? img.alt : '';

        // Fade transition
        psLbImg.style.opacity = '0';
        setTimeout(function() {
            psLbImg.src = fullSrc;
            psLbImg.alt = alt;
            psLbImg.style.opacity = '1';
        }, 150);

        // Update counter
        psLbCounter.textContent = (currentPhoto + 1) + ' / ' + photos.length;

        // Update fav state
        updateLightboxFav();

        // Update download link
        if (psLbDownload) {
            psLbDownload.onclick = function() {
                var a = document.createElement('a');
                a.href = fullSrc;
                a.download = fullSrc.split('/').pop();
                a.click();
            };
        }
    }

    function updateLightboxFav() {
        if (favorites[currentPhoto]) {
            psLbFav.classList.add('favorited');
        } else {
            psLbFav.classList.remove('favorited');
        }
    }

    function nextPhoto() {
        currentPhoto = (currentPhoto + 1) % photos.length;
        showPhoto();
    }

    function prevPhoto() {
        currentPhoto = (currentPhoto - 1 + photos.length) % photos.length;
        showPhoto();
    }

    // Lightbox event listeners
    if (psLbClose) psLbClose.addEventListener('click', closeLightbox);
    if (psLbNext) psLbNext.addEventListener('click', nextPhoto);
    if (psLbPrev) psLbPrev.addEventListener('click', prevPhoto);

    if (psLbFav) {
        psLbFav.addEventListener('click', function() {
            // Find the grid fav button for this photo
            var photoEl = photos[currentPhoto];
            var gridFavBtn = photoEl ? photoEl.querySelector('.ps-action[data-action="fav"]') : null;
            toggleFavorite(currentPhoto, gridFavBtn);
        });
    }

    if (psLbShare) {
        psLbShare.addEventListener('click', function() {
            shareGallery();
        });
    }

    // Click on image area (not buttons) — do nothing (prevent close)
    if (psLbImg) {
        psLbImg.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (!psLightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextPhoto();
        if (e.key === 'ArrowLeft') prevPhoto();
    });

    // ═══════════════════════════════════════════════════════════════
    // TOOLBAR BUTTONS
    // ═══════════════════════════════════════════════════════════════
    function shareGallery() {
        var url = window.location.href;
        if (navigator.share) {
            navigator.share({
                title: 'My Photography Gallery',
                text: 'Check out my photos from Jenna Lynn Photography!',
                url: url
            }).catch(function() {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function() {
                alert('♡ Gallery link copied to clipboard!\n\nShare it with your family and friends.');
            }).catch(function() {
                prompt('Copy this link to share your gallery:', url);
            });
        } else {
            prompt('Copy this link to share your gallery:', url);
        }
    }

    function downloadAll() {
        alert('♡ In production, this would download all your photos as a ZIP file.\n\nFor now, click the ⬇ button on individual photos to download them one at a time.');
    }

    function startSlideshow() {
        if (photos.length === 0) return;
        currentPhoto = 0;
        openLightbox();

        // Auto-advance
        var slideInterval = setInterval(function() {
            if (!psLightbox.classList.contains('open')) {
                clearInterval(slideInterval);
                return;
            }
            nextPhoto();
        }, 4000);
    }

    // Toolbar buttons
    var psSlideshowBtn = document.getElementById('psSlideshowBtn');
    var psShareBtn = document.getElementById('psShareBtn');
    var psDownloadAllBtn = document.getElementById('psDownloadAllBtn');

    // Nav buttons
    var psFavBtn = document.getElementById('psFavBtn');
    var psShareBtnTop = document.getElementById('psShareBtnTop');
    var psSlideshowTopBtn = document.getElementById('psSlideshowTopBtn');
    var psDownloadBtn = document.getElementById('psDownloadBtn');

    if (psSlideshowBtn) psSlideshowBtn.addEventListener('click', startSlideshow);
    if (psSlideshowTopBtn) psSlideshowTopBtn.addEventListener('click', startSlideshow);
    if (psShareBtn) psShareBtn.addEventListener('click', shareGallery);
    if (psShareBtnTop) psShareBtnTop.addEventListener('click', shareGallery);
    if (psDownloadAllBtn) psDownloadAllBtn.addEventListener('click', downloadAll);
    if (psDownloadBtn) psDownloadBtn.addEventListener('click', downloadAll);

    if (psFavBtn) {
        psFavBtn.addEventListener('click', function() {
            // Show favorites count
            var favCount = Object.keys(favorites).filter(function(k) { return favorites[k]; }).length;
            if (favCount === 0) {
                alert('♡ You haven\'t favorited any photos yet.\n\nClick the heart icon on any photo to save your favorites!');
            } else {
                alert('♡ You have ' + favCount + ' favorite photo' + (favCount > 1 ? 's' : '') + '!');
            }
        });
    }

    // Set download links on grid items
    document.querySelectorAll('.ps-photo').forEach(function(photo) {
        var fullSrc = photo.getAttribute('data-full');
        var dlLink = photo.querySelector('a[download]');
        if (dlLink && fullSrc) {
            dlLink.href = fullSrc;
        }
    });

})();