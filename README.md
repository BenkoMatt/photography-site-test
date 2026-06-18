# Jenna Lynn Photography — Wedding & Couples Photography Website

A professional, elegant photography website for Jenna Lynn Photography, specializing in
couples and wedding photography in Michigan (available worldwide). Features a full landing
page with hero, about, pricing, portfolio with filtering and lightbox, process steps,
testimonials, FAQ, password-protected client gallery, and contact form.

Built with a bright, airy, feminine aesthetic with Christian warmth — rose pink (#c4758a)
accent color, Cormorant Garamond serif headings, and Montserrat body text.

---

## ✨ Features

- **Bright, airy, feminine design** — rose pink (#c4758a) accent, soft gradient backgrounds,
  Cormorant Garamond + Montserrat typography
- **Christian scripture accents** — Bible verses woven throughout (1 Cor 13:13, Prov 16:3)
- **Responsive** — looks beautiful on phone, tablet, and desktop
- **Portfolio with filtering** — filter by Weddings, Couples, Engagements, Portraits;
  click to view full-size in a lightbox with keyboard navigation
- **Pricing packages** — three tiers (Couples $600, Engagement $800, Wedding $2,800)
  with a featured "Most Loved" Wedding Collection card and real photos
- **Process section** — 4-step journey (Connect → Plan → Party → Relive)
- **Testimonials** — 3 client reviews with 5-star ratings
- **FAQ** — 6 expandable Q&A items covering common client questions
- **Password-protected client gallery** — clients enter a passcode to view their
  private photos, with slideshow, favorites, download, and share features
- **Contact form** — detailed inquiry form with session type, date, location, and message
- **Scroll animations** — sections fade in as you scroll for a polished feel
- **SEO-ready** — Open Graph tags, Twitter cards, meta descriptions, semantic HTML

---

## 📁 File Structure

```
photography-site/
├── index.html              ← Main landing page (all sections)
├── gallery.html            ← Client gallery page (password-protected)
├── css/
│   └── style.css           ← All styling (colors, fonts, layout, responsive)
├── js/
│   ├── script.js           ← Main page JS (nav, portfolio, lightbox, forms)
│   └── gallery.js          ← Gallery page JS (passcode, slideshow, favorites)
├── photos/                 ← All photography images
│   ├── about/              ← Jenna's portrait
│   ├── pricing/             ← Package card images
│   ├── gallery/             ← Portfolio images
│   │   ├── couples/
│   │   ├── engagements/
│   │   ├── portraits/
│   │   └── weddings/
│   └── client-photos/      ← Client gallery photos (per client)
├── .gitignore
└── README.md               ← This file
```

---

## 🚀 Quick Start

### View the site locally
```bash
cd photography-site
python -m http.server 8000
# Open: http://localhost:8000
```

### Deploy to the web
Upload the entire `photography-site` folder to any web host:
- **Netlify** (free): Drag the folder onto https://app.netlify.com/drop
- **Vercel** (free): `npm i -g vercel && vercel` in the folder
- **Your own server**: Upload via FTP/SFTP to your hosting provider
- **Your existing domain**: Upload to photographybyjennalynn.com via your host

---

## 📝 Editing Guide

### 1. Update Contact Info

In `index.html`, search for and replace:

| Current | What to change |
|---|---|
| `hello@photographybyjennalynn.com` | Your email (contact section + footer) |
| `Michigan — Available Worldwide` | Your specific city if desired |
| `@jennalynnphotography` | Your Instagram handle |
| `#` in footer social links | Your actual social media URLs |

### 2. Add Portfolio Photos

In `index.html`, find the `<!-- PORTFOLIO -->` section. Each photo is a
`.portfolio-item` div. To add a photo, copy a block and change the image:

```html
<div class="portfolio-item" data-category="couples">
    <img src="photos/gallery/couples/your-photo.jpg" alt="Description" loading="lazy">
    <div class="portfolio-overlay"><span class="portfolio-cat">Couples</span></div>
</div>
```

Available categories: `wedding`, `couples`, `engagement`, `portrait`

Put photos in the matching folder under `photos/gallery/`. Recommended: 800×600px,
under 200KB each (use https://tinypng.com to compress).

### 3. Edit Pricing

In `index.html`, find the `<!-- SERVICES -->` section. Each package is a
`.package-card` div. Edit the price, features, and tagline as needed.

### 4. Edit Testimonials

In `index.html`, find the `<!-- TESTIMONIALS -->` section. Replace `[Client Name]`
with actual client names when you have permission. Add more `.testimonial` blocks
to the `.testimonials-grid` as needed.

### 5. Edit FAQ

In `index.html`, find the `<!-- FAQ -->` section. Each FAQ is a `<details>` element.
Add or remove items as needed. The first one is `open` by default.

### 6. Change the Hero Background

The hero uses a soft gradient. To use a real photo:

In `css/style.css`, find `.hero`:
```css
/* Current: */
.hero { background: linear-gradient(135deg, #fdf2f4 0%, #fef9f0 50%, #f0f7f4 100%); }

/* With photo: */
.hero { background: url('../photos/hero-bg.jpg') center/cover no-repeat; }
.hero-overlay { background: rgba(0,0,0,0.3); }
```

### 7. Change Colors

All colors are CSS variables at the top of `css/style.css`:

```css
:root {
    --rose: #c4758a;        /* Main accent color */
    --rose-deep: #a85a70;   /* Hover states */
    --rose-light: #fdf2f4;  /* Soft backgrounds */
    /* etc. */
}
```

---

## 🔐 Client Gallery Setup

### Adding a Client Gallery

**Step 1: Add the passcode** in BOTH `js/script.js` AND `js/gallery.js`:

```javascript
var GALLERY_CODES = {
    'DEMO-2024': { title: 'Sarah & Michael\'s Wedding', date: 'June 15, 2024' },
    // Add new clients here:
    'SMITH-0224': { title: 'Smith Wedding Gallery', date: 'February 24, 2025' }
};
```

**Step 2: Add photos** to `gallery.html` in the `.gallery-grid` section:

```html
<div class="gallery-item" data-full="photos/client-photos/smith-01.jpg">
    <img src="photos/client-photos/smith-01.jpg" alt="First look" loading="lazy">
    <div class="gallery-item-actions">
        <button class="gallery-action" title="Favorite">♡</button>
        <a class="gallery-action" title="Download" download href="photos/client-photos/smith-01.jpg">⬇</a>
    </div>
</div>
```

**Step 3: Send the passcode** to your client via email with the gallery link.

### ⚠️ Security Note

The passcode system uses client-side JavaScript — it's for privacy, not true security.
For production-grade security, connect to a server backend (see comments in `gallery.js`).

---

## 📧 Contact Form Setup

The contact form shows a success message but doesn't actually send data yet.
To make it functional, connect it to a form service:

### Option 1: Formspree (easiest, free tier)
1. Sign up at https://formspree.io and create a form
2. In `index.html`, add `action` and `method` to the form:
```html
<form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```
3. In `js/script.js`, replace the submit handler with a fetch() call (see code comments)

### Option 2: Your own backend
Create a POST endpoint at `/api/contact` and send form data via `fetch()`.

---

## 📱 Social Media Links

In `index.html`, find the footer section. Replace `#` placeholders with your URLs:

```html
<li><a href="https://instagram.com/jennalynnphotography">Instagram</a></li>
<li><a href="https://pinterest.com/yourprofile">Pinterest</a></li>
<li><a href="https://facebook.com/yourpage">Facebook</a></li>
```

---

## 🖼️ Image Optimization

- **Resize before uploading**: Photos from a camera can be 5-10MB. Resize to display size
- **Compress**: Use https://tinypng.com or https://squoosh.app (reduces 70-80% file size)
- **Use `loading="lazy"`**: Already included — images load as you scroll

### Recommended Sizes

| Location | Size | Aspect |
|---|---|---|
| Hero background | 1920×1080px | 16:9 |
| About portrait | 800×1000px | 4:5 |
| Pricing card images | 800×1000px | 4:5 |
| Portfolio | 800×600px | 4:3 |
| Client gallery | 1200×800px | 3:2 |

---

## 📌 Version History (Git Tags)

This project uses git versioning. You can always go back to any version:

```bash
git log --oneline        # See all versions
git tag -l               # List all tags
git checkout v1.0-template    # Revert to original template with placeholders
git checkout v2.0-jenna       # Revert to this version (Jenna's real content)
```

| Version | Tag | Description |
|---|---|---|
| v1.0 | `v1.0-template` | Initial template with generic "Grace & Lens" placeholders |
| v2.0 | `v2.0-jenna` | Full Jenna Lynn Photography content — real copy, images, pricing, FAQ |

---

## ♡ A Note

*"Commit to the Lord whatever you do." — Proverbs 16:3*

Built with love. Customize freely. 💕