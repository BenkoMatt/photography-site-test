/* ═══════════════════════════════════════════════════════════════
   Jenna Lynn Photography CMS — Admin Panel JavaScript
   Loads content.json, builds editor forms, saves changes,
   triggers preview rebuild, and publishes to GitHub.
   ═══════════════════════════════════════════════════════════════ */

var content = null;
var currentPanel = 'site';
var hasUnsavedChanges = false;

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    loadContent();
    // Warn before leaving if unsaved
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════

// S-2: Auth token for API calls — entered by user in admin panel
var CMS_AUTH_TOKEN = '';

function getAuthHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    if (CMS_AUTH_TOKEN) {
        headers['X-CMS-Token'] = CMS_AUTH_TOKEN;
        headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    return headers;
}

function checkAuthResponse(r) {
    if (r.status === 401) {
        promptForToken();
        throw new Error('Authentication required');
    }
    return r;
}

function promptForToken() {
    var token = prompt('Enter CMS auth token (shown in terminal when server starts):');
    if (token) {
        CMS_AUTH_TOKEN = token.trim();
        loadContent();  // Retry
    }
}

function loadContent() {
    fetch('/api/content', { headers: getAuthHeaders() })
        .then(checkAuthResponse)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            content = data;
            showPanel('site');
            setSaveStatus(true);
        })
        .catch(function(err) {
            showToast('Error loading content: ' + err.message, 'error');
        });
}

function saveContent() {
    if (!content) return;
    fetch('/api/content', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(content)
    })
        .then(checkAuthResponse)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.status === 'ok') {
                showToast('✓ Saved! Site rebuilt for preview.', 'success');
                setSaveStatus(true);
            } else {
                showToast('Error: ' + data.message, 'error');
            }
        })
        .catch(function(err) {
            showToast('Error saving: ' + err.message, 'error');
        });
}

function publishToGithub() {
    hidePublishModal();
    showToast('Publishing to GitHub...', 'info');

    // Save first, then publish
    fetch('/api/content', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(content)
    })
        .then(checkAuthResponse)
        .then(function(r) { return r.json(); })
        .then(function(saveResult) {
            if (saveResult.status !== 'ok') throw new Error(saveResult.message);
            return fetch('/api/publish', { method: 'POST', headers: getAuthHeaders() });
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.status === 'ok') {
                showToast('✓ Published! Live site will update in ~15 seconds.', 'success');
                setSaveStatus(true);
            } else {
                showToast('Publish error: ' + data.message, 'error');
            }
        })
        .catch(function(err) {
            showToast('Error: ' + err.message, 'error');
        });
}

// ═══════════════════════════════════════════════════════════════
// PANEL NAVIGATION
// ═══════════════════════════════════════════════════════════════
function showPanel(name) {
    currentPanel = name;

    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-panel') === name);
    });

    // Build panel content
    var html = '';
    switch(name) {
        case 'site': html = panelSite(); break;
        case 'hero': html = panelHero(); break;
        case 'about': html = panelAbout(); break;
        case 'services': html = panelServices(); break;
        case 'portfolio': html = panelPortfolio(); break;
        case 'process': html = panelProcess(); break;
        case 'faq': html = panelFaq(); break;
        case 'contact': html = panelContact(); break;
        case 'galleries': html = panelGalleries(); break;
        case 'gallery_photos': html = panelGalleryPhotos(); break;
        case 'theme': html = panelTheme(); break;
        case 'mobile': html = panelMobile(); break;
    }
    document.getElementById('mainContent').innerHTML = html;
    initDragAndDrop();
}

// ═══════════════════════════════════════════════════════════════
// FIELD HELPERS
// ═══════════════════════════════════════════════════════════════
function text(path, label, placeholder) {
    var val = getVal(path);
    return '<div class="field"><label class="field-label">' + label + '</label>' +
        '<input class="field-input" type="text" value="' + esc(val) + '" ' +
        'oninput="setVal(\'' + path + '\', this.value)" placeholder="' + (placeholder||'') + '"></div>';
}

function textarea(path, label, placeholder) {
    var val = getVal(path);
    return '<div class="field"><label class="field-label">' + label + '</label>' +
        '<textarea class="field-textarea" oninput="setVal(\'' + path + '\', this.value)" ' +
        'placeholder="' + (placeholder||'') + '">' + esc(val) + '</textarea></div>';
}

function number(path, label) {
    var val = getVal(path);
    return '<div class="field"><label class="field-label">' + label + '</label>' +
        '<input class="field-input" type="number" value="' + esc(val) + '" ' +
        'oninput="setVal(\'' + path + '\', this.value)"></div>';
}

function imageField(path, label) {
    var val = getVal(path);
    var preview = val ? '<img src="/' + val + '" onerror="this.style.display=\'none\'">' : '<div class="placeholder">No image</div>';
    return '<div class="field"><label class="field-label">' + label + '</label>' +
        '<input class="field-input" type="text" value="' + esc(val) + '" ' +
        'oninput="setVal(\'' + path + '\', this.value); updateImagePreview(this)" placeholder="photos/path/to/image.jpg">' +
        '<div class="image-preview">' + preview + '</div></div>';
}

function getVal(path) {
    var parts = path.split('.');
    var val = content;
    for (var i = 0; i < parts.length; i++) {
        var key = parts[i];
        if (key.includes('[')) {
            var idx = parseInt(key.match(/\[(\d+)\]/)[1]);
            key = key.replace(/\[\d+\]/, '');
            val = val[key][idx];
        } else {
            val = val[key];
        }
    }
    return val || '';
}

function setVal(path, value) {
    var parts = path.split('.');
    var obj = content;
    for (var i = 0; i < parts.length - 1; i++) {
        var key = parts[i];
        if (key.includes('[')) {
            var idx = parseInt(key.match(/\[(\d+)\]/)[1]);
            key = key.replace(/\[\d+\]/, '');
            obj = obj[key][idx];
        } else {
            obj = obj[key];
        }
    }
    var lastKey = parts[parts.length - 1];
    if (lastKey.includes('[')) {
        var idx = parseInt(lastKey.match(/\[(\d+)\]/)[1]);
        lastKey = lastKey.replace(/\[\d+\]/, '');
        obj[lastKey][idx] = value;
    } else {
        obj[lastKey] = value;
    }
    setSaveStatus(false);
}

function esc(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function updateImagePreview(input) {
    var preview = input.parentElement.querySelector('.image-preview');
    var val = input.value;
    if (val) {
        preview.innerHTML = '<img src="/' + val + '" onerror="this.style.display=\'none\'; this.parentElement.innerHTML=\'<div class=\\\'placeholder\\\'>Image not found</div>\'">';
    } else {
        preview.innerHTML = '<div class="placeholder">No image</div>';
    }
}

// ═══════════════════════════════════════════════════════════════
// PANELS
// ═══════════════════════════════════════════════════════════════

function panelSite() {
    return '<div class="panel active">' +
        '<div class="panel-title">Brand & Contact Info</div>' +
        '<div class="panel-sub">Your business name, contact details, and social media links.</div>' +
        text('site.business_name', 'Business Name') +
        text('site.tagline', 'Tagline') +
        text('site.email', 'Email Address') +
        text('site.phone', 'Phone (optional)') +
        text('site.location', 'Location') +
        text('site.instagram', 'Instagram Handle') +
        text('site.instagram_url', 'Instagram URL') +
        number('site.footer_year', 'Footer Copyright Year') +
        text('site.footer_verse_text', 'Footer Bible Verse Text') +
        text('site.footer_verse_ref', 'Footer Bible Verse Reference') +
    '</div>';
}

function panelHero() {
    return '<div class="panel active">' +
        '<div class="panel-title">Hero Section</div>' +
        '<div class="panel-sub">The big banner at the top of your homepage.</div>' +
        text('hero.tagline', 'Small Tagline (above title)') +
        text('hero.title_line1', 'Title Line 1') +
        text('hero.title_line2', 'Title Line 2') +
        textarea('hero.verse_text', 'Bible Verse Text') +
        text('hero.verse_ref', 'Bible Verse Reference') +
        textarea('hero.subtitle', 'Subtitle') +
        text('hero.button1_text', 'Button 1 Text') +
        text('hero.button1_link', 'Button 1 Link') +
        text('hero.button2_text', 'Button 2 Text') +
        text('hero.button2_link', 'Button 2 Link') +
    '</div>';
}

function panelAbout() {
    var paragraphsHtml = '';
    content.about.paragraphs.forEach(function(p, i) {
        paragraphsHtml += '<div class="sub-item">' +
            '<textarea class="field-textarea" oninput="setVal(\'about.paragraphs[' + i + ']\', this.value)">' + esc(p) + '</textarea>' +
            '<button class="sub-item-btn" onclick="removeItem(\'about.paragraphs\', ' + i + ')" title="Remove">✕</button>' +
        '</div>';
    });

    return '<div class="panel active">' +
        '<div class="panel-title">About Me Section</div>' +
        '<div class="panel-sub">Your bio and portrait photo.</div>' +
        text('about.label', 'Section Label') +
        text('about.title_line1', 'Title Line 1') +
        text('about.title_line2', 'Title Line 2') +
        imageField('about.portrait_image', 'Portrait Photo') +
        '<div class="field"><label class="field-label">Bio Paragraphs</label>' +
        '<div class="sub-items">' + paragraphsHtml + '</div>' +
        '<button class="add-btn" onclick="addItem(\'about.paragraphs\', \'\')">+ Add Paragraph</button>' +
        '</div>' +
        text('about.button_text', 'Button Text') +
        text('about.button_link', 'Button Link') +
    '</div>';
}

function panelServices() {
    var packagesHtml = '';
    content.services.packages.forEach(function(pkg, i) {
        var featuresHtml = '';
        pkg.features.forEach(function(f, j) {
            featuresHtml += '<div class="sub-item">' +
                '<input class="field-input" type="text" value="' + esc(f) + '" oninput="setVal(\'services.packages[' + i + '].features[' + j + ']\', this.value)">' +
                '<button class="sub-item-btn" onclick="removeItem(\'services.packages[' + i + '].features\', ' + j + ')">✕</button>' +
            '</div>';
        });

        packagesHtml += '<div class="item-card">' +
            '<div class="item-card-header">' +
                '<span class="item-card-title">Package ' + (i+1) + ': ' + esc(pkg.name) + '</span>' +
                '<div class="item-actions">' +
                    '<button class="item-btn move" onclick="moveItem(\'services.packages\', ' + i + ', -1)">↑</button>' +
                    '<button class="item-btn move" onclick="moveItem(\'services.packages\', ' + i + ', 1)">↓</button>' +
                    '<button class="item-btn danger" onclick="removeItem(\'services.packages\', ' + i + ')">Delete</button>' +
                '</div>' +
            '</div>' +
            text('services.packages[' + i + '].name', 'Package Name') +
            '<div class="field-row">' +
                text('services.packages[' + i + '].price_prefix', 'Price Prefix (e.g. $ or Starting at $)') +
                text('services.packages[' + i + '].price', 'Price Amount') +
            '</div>' +
            text('services.packages[' + i + '].price_suffix', 'Price Suffix (optional)') +
            textarea('services.packages[' + i + '].tagline', 'Tagline') +
            imageField('services.packages[' + i + '].image', 'Card Image') +
            text('services.packages[' + i + '].button_text', 'Button Text') +
            '<div class="field"><label class="field-label">Features List</label>' +
            '<div class="sub-items">' + featuresHtml + '</div>' +
            '<button class="add-btn" onclick="addItem(\'services.packages[' + i + '].features\', \'New feature\')">+ Add Feature</button>' +
            '</div>' +
            '<div class="field"><label><input type="checkbox" ' + (pkg.featured ? 'checked' : '') + ' onchange="setVal(\'services.packages[' + i + '].featured\', this.checked)"> Featured package (highlighted with badge)</label></div>' +
        '</div>';
    });

    return '<div class="panel active">' +
        '<div class="panel-title">Pricing & Packages</div>' +
        '<div class="panel-sub">Your photography packages and pricing.</div>' +
        text('services.label', 'Section Label') +
        text('services.title', 'Section Title') +
        textarea('services.subtitle', 'Section Subtitle') +
        '<div class="items-list" data-array="services.packages">' + packagesHtml + '</div>' +
        '<button class="add-btn" onclick="addPackage()">+ Add Package</button>' +
        '<div style="height:20px"></div>' +
        textarea('services.note', 'Bottom Note') +
    '</div>';
}

function panelPortfolio() {
    var photosHtml = '';
    content.portfolio.photos.forEach(function(photo, i) {
        photosHtml += '<div class="item-card">' +
            '<div class="item-card-header">' +
                '<span class="item-card-title">Photo ' + (i+1) + '</span>' +
                '<div class="item-actions">' +
                    '<button class="item-btn move" onclick="moveItem(\'portfolio.photos\', ' + i + ', -1)">↑</button>' +
                    '<button class="item-btn move" onclick="moveItem(\'portfolio.photos\', ' + i + ', 1)">↓</button>' +
                    '<button class="item-btn danger" onclick="removeItem(\'portfolio.photos\', ' + i + ')">Delete</button>' +
                '</div>' +
            '</div>' +
            imageField('portfolio.photos[' + i + '].src', 'Image') +
            text('portfolio.photos[' + i + '].alt', 'Alt Text (description)') +
            '<div class="field"><label class="field-label">Category</label>' +
            '<select class="field-select" onchange="setVal(\'portfolio.photos[' + i + '].category\', this.value)">' +
                ['wedding','couples','engagement','portrait'].map(function(c) {
                    return '<option value="' + c + '" ' + (photo.category === c ? 'selected' : '') + '>' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>';
                }).join('') +
            '</select></div>' +
            '<div class="field"><label><input type="checkbox" ' + (photo.tall ? 'checked' : '') + ' onchange="setVal(\'portfolio.photos[' + i + '].tall\', this.checked)"> Tall image (spans 2 rows)</label></div>' +
        '</div>';
    });

    return '<div class="panel active">' +
        '<div class="panel-title">Portfolio Gallery</div>' +
        '<div class="panel-sub">Photos shown in your portfolio section with filtering.</div>' +
        text('portfolio.label', 'Section Label') +
        text('portfolio.title', 'Section Title') +
        textarea('portfolio.subtitle', 'Section Subtitle') +
        '<div class="items-list" data-array="portfolio.photos">' + photosHtml + '</div>' +
        '<button class="add-btn" onclick="addPortfolioPhoto()">+ Add Photo</button>' +
        '<div style="height:20px"></div>' +
        text('portfolio.cta_text', 'CTA Button Text') +
        text('portfolio.cta_link', 'CTA Button Link') +
    '</div>';
}

function panelProcess() {
    var stepsHtml = '';
    content.process.steps.forEach(function(step, i) {
        stepsHtml += '<div class="item-card">' +
            '<div class="item-card-header">' +
                '<span class="item-card-title">Step ' + step.number + '</span>' +
                '<div class="item-actions">' +
                    '<button class="item-btn move" onclick="moveItem(\'process.steps\', ' + i + ', -1)">↑</button>' +
                    '<button class="item-btn move" onclick="moveItem(\'process.steps\', ' + i + ', 1)">↓</button>' +
                    '<button class="item-btn danger" onclick="removeItem(\'process.steps\', ' + i + ')">Delete</button>' +
                '</div>' +
            '</div>' +
            text('process.steps[' + i + '].number', 'Number (e.g. 01)') +
            text('process.steps[' + i + '].title', 'Title') +
            textarea('process.steps[' + i + '].text', 'Description') +
        '</div>';
    });

    return '<div class="panel active">' +
        '<div class="panel-title">Process Steps</div>' +
        '<div class="panel-sub">The "How It Works" section on your homepage.</div>' +
        text('process.label', 'Section Label') +
        text('process.title', 'Section Title') +
        textarea('process.subtitle', 'Section Subtitle') +
        '<div class="items-list" data-array="process.steps">' + stepsHtml + '</div>' +
        '<button class="add-btn" onclick="addProcessStep()">+ Add Step</button>' +
    '</div>';
}

function panelFaq() {
    var itemsHtml = '';
    content.faq.items.forEach(function(item, i) {
        itemsHtml += '<div class="item-card">' +
            '<div class="item-card-header">' +
                '<span class="item-card-title">Q' + (i+1) + '</span>' +
                '<div class="item-actions">' +
                    '<button class="item-btn move" onclick="moveItem(\'faq.items\', ' + i + ', -1)">↑</button>' +
                    '<button class="item-btn move" onclick="moveItem(\'faq.items\', ' + i + ', 1)">↓</button>' +
                    '<button class="item-btn danger" onclick="removeItem(\'faq.items\', ' + i + ')">Delete</button>' +
                '</div>' +
            '</div>' +
            text('faq.items[' + i + '].question', 'Question') +
            textarea('faq.items[' + i + '].answer', 'Answer') +
            '<div class="field"><label><input type="checkbox" ' + (item.open ? 'checked' : '') + ' onchange="setVal(\'faq.items[' + i + '].open\', this.checked)"> Open by default</label></div>' +
        '</div>';
    });

    return '<div class="panel active">' +
        '<div class="panel-title">FAQ</div>' +
        '<div class="panel-sub">Frequently asked questions section.</div>' +
        text('faq.label', 'Section Label') +
        text('faq.title', 'Section Title') +
        '<div class="items-list" data-array="faq.items">' + itemsHtml + '</div>' +
        '<button class="add-btn" onclick="addFaqItem()">+ Add FAQ Item</button>' +
    '</div>';
}

function panelContact() {
    return '<div class="panel active">' +
        '<div class="panel-title">Contact Section</div>' +
        '<div class="panel-sub">The inquiry form section at the bottom of your page.</div>' +
        text('contact.label', 'Section Label') +
        text('contact.title', 'Section Title') +
        textarea('contact.intro', 'Intro Text') +
        textarea('contact.verse_text', 'Bible Verse Text') +
        text('contact.verse_ref', 'Bible Verse Reference') +
        textarea('contact.form_note', 'Form Note (below submit button)') +
    '</div>';
}

function panelGalleries() {
    var galleriesHtml = '';
    content.client_galleries.galleries.forEach(function(g, i) {
        galleriesHtml += '<div class="item-card">' +
            '<div class="item-card-header">' +
                '<span class="item-card-title">Gallery: ' + esc(g.code) + '</span>' +
                '<div class="item-actions">' +
                    '<button class="item-btn danger" onclick="removeItem(\'client_galleries.galleries\', ' + i + ')">Delete</button>' +
                '</div>' +
            '</div>' +
            text('client_galleries.galleries[' + i + '].code', 'Passcode (clients enter this)') +
            text('client_galleries.galleries[' + i + '].title', 'Gallery Title') +
            text('client_galleries.galleries[' + i + '].date', 'Date') +
            imageField('client_galleries.galleries[' + i + '].cover', 'Cover Image') +
        '</div>';
    });

    var stepsHtml = '';
    content.client_galleries.intro_steps.forEach(function(step, i) {
        stepsHtml += '<div class="sub-item">' +
            '<input class="field-input" type="text" value="' + esc(step) + '" oninput="setVal(\'client_galleries.intro_steps[' + i + ']\', this.value)">' +
            '<button class="sub-item-btn" onclick="removeItem(\'client_galleries.intro_steps\', ' + i + ')">✕</button>' +
        '</div>';
    });

    var featuresHtml = '';
    content.client_galleries.features.forEach(function(feat, i) {
        featuresHtml += '<div class="sub-item">' +
            '<input class="field-input" type="text" value="' + esc(feat) + '" oninput="setVal(\'client_galleries.features[' + i + ']\', this.value)">' +
            '<button class="sub-item-btn" onclick="removeItem(\'client_galleries.features\', ' + i + ')">✕</button>' +
        '</div>';
    });

    return '<div class="panel active">' +
        '<div class="panel-title">Client Gallery Settings</div>' +
        '<div class="panel-sub">Manage passcodes and gallery info shown on your homepage.</div>' +
        text('client_galleries.label', 'Section Label') +
        text('client_galleries.title', 'Section Title') +
        textarea('client_galleries.subtitle', 'Section Subtitle') +
        text('client_galleries.delivery_time', 'Delivery Timeframe') +
        text('client_galleries.intro_heading', 'Info Heading') +
        '<div class="field"><label class="field-label">How It Works Steps</label>' +
        '<div class="sub-items">' + stepsHtml + '</div>' +
        '<button class="add-btn" onclick="addItem(\'client_galleries.intro_steps\', \'New step\')">+ Add Step</button>' +
        '</div>' +
        '<div class="field"><label class="field-label">Features List</label>' +
        '<div class="sub-items">' + featuresHtml + '</div>' +
        '<button class="add-btn" onclick="addItem(\'client_galleries.features\', \'New feature\')">+ Add Feature</button>' +
        '</div>' +
        '<div class="items-list" data-array="client_galleries.galleries">' + galleriesHtml + '</div>' +
        '<button class="add-btn" onclick="addGallery()">+ Add Client Gallery</button>' +
    '</div>';
}

function panelGalleryPhotos() {
    var photosHtml = '';
    content.gallery_page.photos.forEach(function(photo, i) {
        photosHtml += '<div class="item-card">' +
            '<div class="item-card-header">' +
                '<span class="item-card-title">Photo ' + (i+1) + '</span>' +
                '<div class="item-actions">' +
                    '<button class="item-btn move" onclick="moveItem(\'gallery_page.photos\', ' + i + ', -1)">↑</button>' +
                    '<button class="item-btn move" onclick="moveItem(\'gallery_page.photos\', ' + i + ', 1)">↓</button>' +
                    '<button class="item-btn danger" onclick="removeItem(\'gallery_page.photos\', ' + i + ')">Delete</button>' +
                '</div>' +
            '</div>' +
            imageField('gallery_page.photos[' + i + '].src', 'Image') +
            text('gallery_page.photos[' + i + '].alt', 'Alt Text (description)') +
        '</div>';
    });

    return '<div class="panel active">' +
        '<div class="panel-title">Client Gallery Photos</div>' +
        '<div class="panel-sub">Photos shown when a client unlocks their gallery.</div>' +
        textarea('gallery_page.footer_message', 'Footer Message') +
        text('gallery_page.footer_verse_text', 'Footer Verse Text') +
        text('gallery_page.footer_verse_ref', 'Footer Verse Reference') +
        '<div class="items-list" data-array="gallery_page.photos">' + photosHtml + '</div>' +
        '<button class="add-btn" onclick="addGalleryPhoto()">+ Add Photo</button>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════════════
// ITEM OPERATIONS (add, remove, move)
// ═══════════════════════════════════════════════════════════════
function getArray(path) {
    var parts = path.split('.');
    var obj = content;
    for (var i = 0; i < parts.length; i++) {
        obj = obj[parts[i]];
    }
    return obj;
}

function addItem(path, defaultVal) {
    var arr = getArray(path);
    arr.push(defaultVal);
    setSaveStatus(false);
    showPanel(currentPanel);
}

function removeItem(path, index) {
    var arr = getArray(path);
    arr.splice(index, 1);
    setSaveStatus(false);
    showPanel(currentPanel);
}

function moveItem(path, index, direction) {
    var arr = getArray(path);
    var newIndex = index + direction;
    if (newIndex < 0 || newIndex >= arr.length) return;
    var temp = arr[index];
    arr[index] = arr[newIndex];
    arr[newIndex] = temp;
    setSaveStatus(false);
    showPanel(currentPanel);
}

// Specific add functions
function addPackage() {
    content.services.packages.push({
        name: 'New Package', price: '0', price_prefix: '$', price_suffix: '',
        tagline: '', image: '', features: [], button_text: 'Inquire', featured: false
    });
    setSaveStatus(false);
    showPanel(currentPanel);
}

function addPortfolioPhoto() {
    content.portfolio.photos.push({ src: '', alt: 'New photo', category: 'couples', tall: false });
    setSaveStatus(false);
    showPanel(currentPanel);
}

function addProcessStep() {
    var num = String(content.process.steps.length + 1).padStart(2, '0');
    content.process.steps.push({ number: num, title: 'New Step', text: '' });
    setSaveStatus(false);
    showPanel(currentPanel);
}

function addFaqItem() {
    content.faq.items.push({ question: 'New question?', answer: 'Answer here.', open: false });
    setSaveStatus(false);
    showPanel(currentPanel);
}

function addGallery() {
    content.client_galleries.galleries.push({ code: 'NEW-CODE', title: 'New Gallery', date: '', cover: '' });
    setSaveStatus(false);
    showPanel(currentPanel);
}

function addGalleryPhoto() {
    content.gallery_page.photos.push({ src: '', alt: 'New photo', w: 1200, h: 800 });
    setSaveStatus(false);
    showPanel(currentPanel);
}

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════
function setSaveStatus(saved) {
    hasUnsavedChanges = !saved;
    var el = document.getElementById('saveStatus');
    if (saved) {
        el.textContent = 'All changes saved';
        el.className = 'topbar-status saved';
    } else {
        el.textContent = 'Unsaved changes';
        el.className = 'topbar-status unsaved';
    }
}

function showToast(message, type) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + (type || '');
    setTimeout(function() { toast.classList.remove('show'); }, 3500);
}

function openPreview() {
    // Save first, then open preview
    fetch('/api/content', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(content)
    }).then(function() {
        window.open('/', '_blank');
    });
}

function showPublishModal() {
    document.getElementById('publishModal').classList.add('show');
}

function hidePublishModal() {
    document.getElementById('publishModal').classList.remove('show');
}


// ═══════════════════════════════════════════════════════════════
// DRAG AND DROP REORDERING
// ═══════════════════════════════════════════════════════════════
function initDragAndDrop() {
    var containers = document.querySelectorAll('.items-list');
    containers.forEach(function(container) {
        var cards = container.querySelectorAll('.item-card');
        cards.forEach(function(card) {
            card.draggable = true;
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('drop', handleDrop);
            card.addEventListener('dragend', handleDragEnd);
        });
    });
}

var draggedElement = null;
var draggedArrayPath = null;
var draggedIndex = null;

function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.4';
    var itemsList = this.closest('.items-list');
    if (itemsList) {
        draggedArrayPath = itemsList.getAttribute('data-array');
        var cards = itemsList.querySelectorAll('.item-card');
        cards.forEach(function(c, i) { if (c === draggedElement) draggedIndex = i; });
    }
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (e.preventDefault) e.preventDefault();

    if (draggedElement !== this && draggedArrayPath) {
        var itemsList = this.closest('.items-list');
        if (!itemsList || itemsList.getAttribute('data-array') !== draggedArrayPath) return;

        var cards = Array.from(itemsList.querySelectorAll('.item-card'));
        var fromIndex = draggedIndex;
        var toIndex = cards.indexOf(this);

        var arr = getArray(draggedArrayPath);
        var movedItem = arr.splice(fromIndex, 1)[0];
        arr.splice(toIndex, 0, movedItem);

        setSaveStatus(false);
        showPanel(currentPanel);
    }
    return false;
}

function handleDragEnd(e) {
    if (draggedElement) draggedElement.style.opacity = '';
    draggedElement = null;
    draggedArrayPath = null;
    draggedIndex = null;
}


// ═══════════════════════════════════════════════════════════════
// COLOR PICKER FIELD
// ═══════════════════════════════════════════════════════════════
function colorField(path, label) {
    var val = getVal(path);
    return '<div class="field">' +
        '<label class="field-label">' + label + '</label>' +
        '<div style="display:flex; gap:10px; align-items:center;">' +
            '<input type="color" value="' + esc(val) + '" oninput="setVal(\'' + path + '\', this.value); this.nextElementSibling.value = this.value" style="width:50px; height:40px; border:1px solid #ddd; border-radius:4px; cursor:pointer;">' +
            '<input class="field-input" type="text" value="' + esc(val) + '" oninput="setVal(\'' + path + '\', this.value); this.previousElementSibling.value = this.value" style="flex:1; font-family:monospace;">' +
        '</div></div>';
}

function rangeField(path, label, min, max, step, unit) {
    var val = getVal(path);
    unit = unit || '';
    return '<div class="field">' +
        '<label class="field-label">' + label + ' — <span id="' + path.replace(/\./g, '_') + '_val">' + val + unit + '</span></label>' +
        '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" ' +
        'oninput="setVal(\'' + path + '\', parseFloat(this.value)); document.getElementById(\'' + path.replace(/\./g, '_') + '_val\').textContent = this.value + \'' + unit + '\'" ' +
        'style="width:100%; cursor:pointer;">' +
    '</div>';
}

function selectField(path, label, options) {
    var val = getVal(path);
    var opts = options.map(function(o) {
        return '<option value="' + o.value + '" ' + (val === o.value ? 'selected' : '') + '>' + o.label + '</option>';
    }).join('');
    return '<div class="field"><label class="field-label">' + label + '</label>' +
        '<select class="field-select" onchange="setVal(\'' + path + '\', this.value)">' + opts + '</select></div>';
}

function checkboxField(path, label) {
    var val = getVal(path);
    return '<div class="field"><label style="display:flex; align-items:center; gap:8px; cursor:pointer;">' +
        '<input type="checkbox" ' + (val ? 'checked' : '') + ' onchange="setVal(\'' + path + '\', this.checked)" style="width:18px; height:18px;">' +
        '<span style="font-size:0.9rem;">' + label + '</span></label></div>';
}


// ═══════════════════════════════════════════════════════════════
// THEME & COLORS PANEL
// ═══════════════════════════════════════════════════════════════
function panelTheme() {
    return '<div class="panel active">' +
        '<div class="panel-title">Theme & Colors</div>' +
        '<div class="panel-sub">Customize your site colors, backgrounds, fonts, and layout.</div>' +

        '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:20px 0 12px; color:#2c2c2c;">Accent Colors</h3>' +
        colorField('theme.accent_color', 'Primary Accent (buttons, links, highlights)') +
        colorField('theme.accent_color_hover', 'Accent Hover Color') +
        colorField('theme.accent_color_light', 'Accent Light (soft backgrounds)') +

        '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Text Colors</h3>' +
        colorField('theme.text_color', 'Primary Text') +
        colorField('theme.text_color_secondary', 'Secondary Text') +

        '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Backgrounds</h3>' +
        colorField('theme.background_color', 'Main Background') +
        colorField('theme.background_color_alt', 'Alt Background (sections)') +
        colorField('theme.footer_background', 'Footer Background') +
        colorField('theme.footer_text_color', 'Footer Text Color') +

        '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Hero Background</h3>' +
        selectField('theme.hero_type', 'Hero Background Type', [
            {value: 'gradient', label: 'Gradient (soft colors)'},
            {value: 'image', label: 'Photo Image'},
            {value: 'solid', label: 'Solid Color'}
        ]) +
        '<div id="heroGradientOpts">' +
            colorField('theme.hero_gradient_start', 'Gradient Color 1') +
            colorField('theme.hero_gradient_mid', 'Gradient Color 2') +
            colorField('theme.hero_gradient_end', 'Gradient Color 3') +
        '</div>' +
        '<div id="heroImageOpts">' +
            imageField('theme.hero_image', 'Hero Background Image') +
            rangeField('theme.hero_overlay_opacity', 'Dark Overlay Opacity', 0, 0.8, 0.05, '') +
        '</div>' +
        '<div id="heroSolidOpts">' +
            colorField('theme.hero_gradient_start', 'Solid Background Color') +
        '</div>' +
        colorField('theme.hero_text_color', 'Hero Text Color (for gradient/solid)') +

        '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Layout</h3>' +
        rangeField('theme.section_spacing', 'Section Spacing', 40, 200, 10, 'px') +
        rangeField('theme.portfolio_columns', 'Portfolio Columns', 1, 5, 1, '') +
        rangeField('theme.portfolio_gap', 'Photo Gap', 0, 40, 2, 'px') +
        rangeField('theme.gallery_columns', 'Gallery Columns', 1, 5, 1, '') +
        rangeField('theme.gallery_gap', 'Gallery Photo Gap', 0, 20, 1, 'px') +
        rangeField('theme.package_border_radius', 'Card Border Radius', 0, 20, 1, 'px') +
        rangeField('theme.button_border_radius', 'Button Border Radius', 0, 50, 1, 'px') +

        '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Fonts</h3>' +
        selectField('theme.font_serif', 'Heading Font', [
            {value: 'Cormorant Garamond', label: 'Cormorant Garamond (current — elegant serif)'},
            {value: 'Playfair Display', label: 'Playfair Display (classic serif)'},
            {value: 'DM Serif Display', label: 'DM Serif Display (modern serif)'},
            {value: 'Lora', label: 'Lora (warm serif)'},
            {value: 'Italiana', label: 'Italiana (fashion serif)'}
        ]) +
        selectField('theme.font_sans', 'Body Font', [
            {value: 'Montserrat', label: 'Montserrat (current — clean sans)'},
            {value: 'Lato', label: 'Lato (friendly sans)'},
            {value: 'Open Sans', label: 'Open Sans (neutral sans)'},
            {value: 'Quicksand', label: 'Quicksand (rounded sans)'},
            {value: 'Raleway', label: 'Raleway (elegant sans)'}
        ]) +

        '<div style="margin-top:30px; padding:20px; background:#f9f9f9; border-radius:8px; border:1px solid #eee;">' +
            '<p style="font-size:0.85rem; color:#888; line-height:1.6;">' +
                '<strong>Tip:</strong> After changing colors, click <strong>Save</strong> then <strong>Preview</strong> to see how it looks. ' +
                'Changes only go live when you click <strong>Publish</strong>.' +
            '</p>' +
        '</div>' +
    '</div>';
}


// ═══════════════════════════════════════════════════════════════
// MOBILE PANEL
// ═══════════════════════════════════════════════════════════════
function panelMobile() {
    return '<div class="panel active">' +
        '<div class="panel-title">Mobile Layout</div>' +
        '<div class="panel-sub">Customize how your site looks on phones. The phone preview shows a live mockup.</div>' +

        '<div style="display:flex; gap:30px; flex-wrap:wrap; align-items:flex-start;">' +

            '<div style="flex:1; min-width:300px;">' +
                '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:0 0 12px; color:#2c2c2c;">Layout</h3>' +
                rangeField('mobile.font_scale', 'Font Scale', 0.7, 1.2, 0.05, 'rem') +
                rangeField('mobile.section_spacing', 'Section Spacing', 30, 120, 10, 'px') +
                rangeField('mobile.hero_height', 'Hero Height', 50, 100, 5, 'vh') +
                rangeField('mobile.hero_title_size', 'Hero Title Size', 1.5, 5, 0.1, 'rem') +

                '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Photo Grids</h3>' +
                rangeField('mobile.portfolio_columns', 'Portfolio Columns', 1, 3, 1, '') +
                rangeField('mobile.portfolio_gap_mobile', 'Portfolio Gap', 0, 20, 1, 'px') +
                rangeField('mobile.gallery_columns', 'Gallery Columns', 1, 3, 1, '') +
                rangeField('mobile.gallery_gap_mobile', 'Gallery Gap', 0, 20, 1, 'px') +
                rangeField('mobile.gallery_cover_height', 'Gallery Cover Height', 40, 100, 5, 'vh') +

                '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Section Visibility</h3>' +
                '<p style="font-size:0.82rem; color:#888; margin-bottom:12px;">Hide sections you don\'t want mobile visitors to see (keeps the page faster).</p>' +
                checkboxField('mobile.show_process_on_mobile', 'Show Process section on mobile') +
                checkboxField('mobile.show_faq_on_mobile', 'Show FAQ on mobile') +
                checkboxField('mobile.show_instagram_on_mobile', 'Show Instagram feed on mobile') +

                '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:24px 0 12px; color:#2c2c2c;">Navigation</h3>' +
                selectField('mobile.nav_style', 'Mobile Nav Style', [
                    {value: 'hamburger', label: 'Hamburger Menu (slides out)'},
                    {value: 'dropdown', label: 'Dropdown Menu (expands down)'}
                ]) +
            '</div>' +

            '<div style="flex-shrink:0;">' +
                '<h3 style="font-family:Cormorant Garamond,serif; font-size:1.2rem; margin:0 0 12px; color:#2c2c2c;">Live Phone Preview</h3>' +
                '<div style="width:300px; height:600px; border:10px solid #1a1a1a; border-radius:40px; overflow:hidden; background:#fff; box-shadow:0 15px 50px rgba(0,0,0,0.2); position:relative;">' +
                    '<div style="position:absolute; top:0; left:50%; transform:translateX(-50%); width:100px; height:22px; background:#1a1a1a; border-bottom-left-radius:14px; border-bottom-right-radius:14px; z-index:10;"></div>' +
                    '<iframe id="mobilePreviewFrame" src="/" scrolling="yes" style="width:100%; height:100%; border:none; pointer-events:auto; display:block;" onload="this.style.opacity=1"></iframe>' +
                '</div>' +
                '<p style="text-align:center; font-size:0.78rem; color:#888; margin-top:10px;">Click inside the phone to scroll · Save to update</p>' +
                '<button class="btn btn-save" style="margin-top:8px; width:100%;" onclick="saveContent(); setTimeout(function(){document.getElementById(\'mobilePreviewFrame\').src=\'/\'+\'?\'+Date.now()},500)">Save &amp; Refresh Preview</button>' +
            '</div>' +

        '</div>' +
    '</div>';
}