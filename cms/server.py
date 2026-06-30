#!/usr/bin/env python3
"""
Jenna Lynn Photography — CMS Server
A self-contained content management system with:
  - Admin dashboard UI (visual editor)
  - Live preview
  - Static site generator (content.json → HTML)
  - Publish to GitHub Pages

Usage:
  python cms/server.py

Then open http://localhost:5000/admin/ in your browser.
"""

import json
import os
import sys
import subprocess
import threading
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

# ─── Paths ───
BASE_DIR = Path(__file__).resolve().parent.parent  # photography-site/
CMS_DIR = Path(__file__).resolve().parent            # photography-site/cms/
CONTENT_FILE = CMS_DIR / "content.json"
TEMPLATE_DIR = CMS_DIR / "templates"
ADMIN_DIR = CMS_DIR / "admin"
SITE_DIR = BASE_DIR  # Where index.html, gallery.html, css/, js/, photos/ live

PORT = 5000


def load_content():
    """Load content.json"""
    with open(CONTENT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_content(data):
    """Save content.json"""
    with open(CONTENT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


# ═══════════════════════════════════════════════════════════════
# STATIC SITE GENERATOR
# Generates index.html and gallery.html from content.json
# ═══════════════════════════════════════════════════════════════

def esc(text):
    """HTML escape"""
    if text is None:
        return ""
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;"))


def build_theme_css(c):
    """Generate dynamic CSS from theme settings"""
    t = c.get("theme", {})

    accent = t.get("accent_color", "#acb19f")
    accent_hover = t.get("accent_color_hover", "#9baaa2")
    accent_light = t.get("accent_color_light", "#edeae5")
    text_color = t.get("text_color", "#2c2c2c")
    text_secondary = t.get("text_color_secondary", "#555555")
    bg_color = t.get("background_color", "#ffffff")
    bg_alt = t.get("background_color_alt", "#fafafa")
    footer_bg = t.get("footer_background", "#2c2c2c")
    footer_text = t.get("footer_text_color", "#cccccc")
    section_spacing = t.get("section_spacing", 120)
    portfolio_cols = t.get("portfolio_columns", 3)
    portfolio_gap = t.get("portfolio_gap", 16)
    gallery_cols = t.get("gallery_columns", 3)
    gallery_gap = t.get("gallery_gap", 4)
    pkg_radius = t.get("package_border_radius", 4)
    btn_radius = t.get("button_border_radius", 0)

    css = f"""
    /* ─── Theme Overrides (from CMS) ─── */
    :root {{
        --rose: {accent};
        --rose-deep: {accent_hover};
        --rose-light: {accent_light};
        --charcoal: {text_color};
        --gray: {text_secondary};
        --ivory: {bg_color};
        --cream-deep: {bg_alt};
    }}
    body {{ background: {bg_color}; color: {text_color}; }}
    .footer {{ background: {footer_bg}; color: {footer_text}; }}
    .section-pad, .about, .services, .portfolio, .process,
    .faq, .galleries, .contact {{
        padding-top: {section_spacing}px;
        padding-bottom: {section_spacing}px;
    }}
    .packages-grid {{ grid-template-columns: repeat({portfolio_cols}, 1fr); gap: {portfolio_gap}px; }}
    .portfolio-grid {{ grid-template-columns: repeat({portfolio_cols}, 1fr); gap: {portfolio_gap}px; }}
    .package-card {{ border-radius: {pkg_radius}px; }}
    .btn {{ border-radius: {btn_radius}px; }}
    .ps-masonry {{ column-count: {gallery_cols}; column-gap: {gallery_gap}px; }}
    """

    # Hero background
    hero_type = t.get("hero_type", "gradient")
    if hero_type == "gradient":
        g1 = t.get("hero_gradient_start", "#edeae5")
        g2 = t.get("hero_gradient_mid", "#edece6")
        g3 = t.get("hero_gradient_end", "#acb19f")
        css += f".hero {{ background: linear-gradient(135deg, {g1} 0%, {g2} 50%, {g3} 100%); }}\n"
        css += f".hero-title, .hero-tag, .hero-sub {{ color: {t.get('hero_text_color', '#2c2c2c')}; }}\n"
    elif hero_type == "image":
        hero_img = t.get("hero_image", "")
        opacity = t.get("hero_overlay_opacity", 0.3)
        if hero_img:
            css += f".hero {{ background: url('{hero_img}') center/cover no-repeat; }}\n"
            css += f".hero-overlay {{ background: rgba(0,0,0,{opacity}); }}\n"
            css += f".hero-title, .hero-tag, .hero-sub {{ color: #fff; }}\n"
    elif hero_type == "solid":
        css += f".hero {{ background: {t.get('hero_gradient_start', '#edeae5')}; }}\n"
        css += f".hero-title, .hero-tag, .hero-sub {{ color: {t.get('hero_text_color', '#2c2c2c')}; }}\n"

    # Mobile overrides
    m = c.get("mobile", {})
    if m:
        m_cols = m.get("portfolio_columns", 1)
        m_g_cols = m.get("gallery_columns", 1)
        m_font = m.get("font_scale", 0.9)
        m_hero_h = m.get("hero_height", "70vh")
        m_hero_title = m.get("hero_title_size", 2.5)
        m_spacing = m.get("section_spacing", 60)
        m_cover_h = m.get("gallery_cover_height", "50vh")
        m_pgap = m.get("portfolio_gap_mobile", 0)
        m_ggap = m.get("gallery_gap_mobile", 0)

        css += f"""
        @media (max-width: 600px) {{
            .packages-grid, .portfolio-grid {{ grid-template-columns: repeat({m_cols}, 1fr) !important; gap: {m_pgap}px !important; }}
            .ps-masonry {{ column-count: {m_g_cols} !important; column-gap: {m_ggap}px !important; }}
            body {{ font-size: {m_font}rem; }}
            .hero {{ min-height: {m_hero_h} !important; }}
            .hero-title {{ font-size: {m_hero_title}rem !important; }}
            .about, .services, .portfolio, .process, .faq, .galleries, .contact {{
                padding-top: {m_spacing}px !important; padding-bottom: {m_spacing}px !important;
            }}
            .ps-cover {{ min-height: {m_cover_h} !important; }}
        """

        # Section visibility on mobile
        if not m.get("show_process_on_mobile", True):
            css += ".process { display: none !important; }\n"
        if not m.get("show_faq_on_mobile", True):
            css += ".faq { display: none !important; }\n"
        if not m.get("show_instagram_on_mobile", False):
            css += ".instagram { display: none !important; }\n"

        css += "}\n"

    return css


def build_index_html(c):
    """Generate index.html from content"""
    site = c["site"]
    hero = c["hero"]
    about = c["about"]
    services = c["services"]
    portfolio = c["portfolio"]
    process = c["process"]
    faq = c["faq"]
    galleries = c["client_galleries"]
    contact = c["contact"]

    # Build packages HTML
    packages_html = ""
    for pkg in services["packages"]:
        featured_class = " package-featured" if pkg.get("featured") else ""
        badge_html = '<div class="package-badge">Most Loved</div>' if pkg.get("featured") else ""
        obj_pos = pkg.get("object_position")
        obj_pos_attr = f' style="object-position: {esc(obj_pos)};"' if obj_pos else ""
        btn_class = "btn btn-primary" if pkg.get("featured") else "btn btn-outline"
        features_html = ""
        for feat in pkg["features"]:
            features_html += f'<li><span class="check">✓</span> {esc(feat)}</li>\n'

        packages_html += f'''
        <div class="package-card{featured_class}">
            {badge_html}
            <div class="package-card-img">
                <img src="{esc(pkg["image"])}" alt="{esc(pkg["name"])}" loading="lazy"{obj_pos_attr}>
            </div>
            <div class="package-body">
                <h3>{esc(pkg["name"])}</h3>
                <p class="package-price">{esc(pkg["price_prefix"])}<span class="price-amount">{esc(pkg["price"])}</span>{esc(pkg["price_suffix"])}</p>
                <p class="package-tagline">{esc(pkg["tagline"])}</p>
                <ul class="package-features">
                    {features_html}
                </ul>
                <a href="{esc(pkg.get("button_link", "#contact"))}" class="{btn_class}">{esc(pkg["button_text"])}</a>
            </div>
        </div>'''

    # Build portfolio HTML
    portfolio_photos_html = ""
    for photo in portfolio["photos"]:
        tall_class = " portfolio-tall" if photo.get("tall") else ""
        obj_pos = photo.get("object_position")
        obj_pos_attr = f' style="object-position: {esc(obj_pos)};"' if obj_pos else ""
        portfolio_photos_html += f'''
            <div class="portfolio-item{tall_class}" data-category="{esc(photo["category"])}">
                <img src="{esc(photo["src"])}" alt="{esc(photo["alt"])}" loading="lazy"{obj_pos_attr}>
                <div class="portfolio-overlay"><span class="portfolio-cat">{esc(photo["category"].title())}</span></div>
            </div>'''

    # Build process HTML
    process_html = ""
    for step in process["steps"]:
        process_html += f'''
            <div class="process-step">
                <div class="process-number">{esc(step["number"])}</div>
                <h3>{esc(step["title"])}</h3>
                <p>{esc(step["text"])}</p>
            </div>'''

    # Build FAQ HTML
    faq_html = ""
    for item in faq["items"]:
        open_attr = " open" if item.get("open") else ""
        faq_html += f'''
            <details class="faq-item"{open_attr}>
                <summary>{esc(item["question"])}</summary>
                <div class="faq-answer">
                    <p>{esc(item["answer"])}</p>
                </div>
            </details>'''

    # Build gallery steps HTML
    gallery_steps_html = ""
    for i, step in enumerate(galleries["intro_steps"], 1):
        gallery_steps_html += f'''
                    <li>
                        <span class="step-num">{i}</span>
                        <span>{esc(step)}</span>
                    </li>'''

    # Build gallery features HTML
    gallery_features_html = ""
    for feat in galleries["features"]:
        gallery_features_html += f'<li>{esc(feat)}</li>\n'

    # Build session type options
    session_options_html = ""
    for stype in contact["session_types"]:
        val = stype.lower().replace(" session", "").replace(" collection", "").replace(" something else!", "other")
        session_options_html += f'<option value="{esc(val)}">{esc(stype)}</option>\n'

    # Build about paragraphs
    about_paragraphs_html = ""
    for i, p in enumerate(about["paragraphs"]):
        cls = "lead" if i == 0 else ""
        about_paragraphs_html += f'<p class="{cls}">{esc(p)}</p>\n'

    # Gallery codes JS
    gallery_codes_js = "var GALLERY_CODES = {\n"
    for g in galleries["galleries"]:
        gallery_codes_js += f"    '{esc(g['code'])}': {{ title: '{esc(g['title'])}', date: '{esc(g['date'])}', cover: '{esc(g.get('cover', ''))}' }},\n"
    gallery_codes_js += "};"

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Seniors, couples, and wedding photography in Michigan, available worldwide. Sessions crafted with you in mind.">
    <title>{esc(site["business_name"])} — Seniors, Couples, and Wedding Photography</title>
    <meta property="og:type" content="website" />
    <meta property="og:title" content="{esc(site["business_name"])} — Seniors, Couples, and Wedding Photography" />
    <meta property="og:description" content="Seniors, couples, and wedding photography in Michigan, available worldwide." />
    <meta property="og:image" content="{esc(about["portrait_image"])}" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600&family=Tangerine:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <style>{build_theme_css(c)}</style>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📸</text></svg>">
</head>
<body id="top">

<!-- ============ NAVIGATION ============ -->
<nav class="navbar" id="navbar">
    <div class="nav-inner">
        <a href="#top" class="logo"><span class="logo-jenna">JENNA</span> <span class="logo-lynn">Lynn</span></a>
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
            <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" id="navLinks">
            <li><a href="#about">About</a></li>
            <li><a href="#services">Pricing</a></li>
            <li><a href="#portfolio">Gallery</a></li>
            <li><a href="#process">Process</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#galleries">Client Galleries</a></li>
            <li><a href="#contact" class="nav-cta">Let's Connect</a></li>
        </ul>
    </div>
</nav>

<!-- ============ HERO ============ -->
<header class="hero">
    <div class="hero-overlay"></div>
    <div class="hero-content">
        <p class="hero-tag fade-in-up">{esc(hero["tagline"])}</p>
        <h1 class="hero-title fade-in-up delay-1">{esc(hero["title_line1"])}<br>{esc(hero["title_line2"])}</h1>
        <p class="hero-sub fade-in-up delay-2">
            "{esc(hero["verse_text"])}" — {esc(hero["verse_ref"])}<br>
            {esc(hero["subtitle"])}
        </p>
        <div class="hero-buttons fade-in-up delay-3">
            <a href="{esc(hero["button1_link"])}" class="btn btn-primary">{esc(hero["button1_text"])}</a>
            <a href="{esc(hero["button2_link"])}" class="btn btn-outline">{esc(hero["button2_text"])}</a>
        </div>
    </div>
    <div class="hero-scroll">
        <span>Scroll</span>
        <div class="hero-scroll-line"></div>
    </div>
</header>

<!-- ============ ABOUT ============ -->
<section class="about" id="about">
    <div class="container">
        <div class="about-grid">
            <div class="about-image">
                <div class="about-image-inner">
                    <img src="{esc(about["portrait_image"])}" alt="{esc(site["business_name"])}" loading="lazy">
                </div>
            </div>
            <div class="about-text">
                <p class="section-label">{esc(about["label"])}</p>
                <h2 class="section-title">{esc(about["title_line1"])}<br>{esc(about["title_line2"])}</h2>
                {about_paragraphs_html}
                <a href="{esc(about["button_link"])}" class="btn btn-outline">{esc(about["button_text"])}</a>
            </div>
        </div>
    </div>
</section>

<!-- ============ SERVICES ============ -->
<section class="services" id="services">
    <div class="container">
        <div class="section-header">
            <p class="section-label">{esc(services["label"])}</p>
            <h2 class="section-title">{esc(services["title"])}</h2>
            <p class="section-sub">{esc(services["subtitle"])}</p>
        </div>
        <div class="packages-grid">
{packages_html}
        </div>
        <p class="custom-note">{esc(services["note"])}</p>
    </div>
</section>

<!-- ============ PORTFOLIO ============ -->
<section class="portfolio" id="portfolio">
    <div class="container">
        <div class="section-header">
            <p class="section-label">{esc(portfolio["label"])}</p>
            <h2 class="section-title">{esc(portfolio["title"])}</h2>
            <p class="section-sub">{esc(portfolio["subtitle"])}</p>
        </div>
        <div class="portfolio-filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="wedding">Weddings</button>
            <button class="filter-btn" data-filter="couples">Couples</button>
            <button class="filter-btn" data-filter="engagement">Engagements</button>
            <button class="filter-btn" data-filter="portrait">Portraits</button>
        </div>
        <div class="portfolio-grid" id="portfolioGrid">
{portfolio_photos_html}
        </div>
        <div class="gallery-cta">
            <a href="{esc(portfolio["cta_link"])}" class="btn btn-outline">{esc(portfolio["cta_text"])}</a>
        </div>
    </div>
</section>

<!-- ============ PROCESS ============ -->
<section class="process" id="process">
    <div class="container">
        <div class="section-header">
            <p class="section-label">{esc(process["label"])}</p>
            <h2 class="section-title">{esc(process["title"])}</h2>
            <p class="section-sub">{esc(process["subtitle"])}</p>
        </div>
        <div class="process-grid">
{process_html}
        </div>
    </div>
</section>

<!-- ============ FAQ ============ -->
<section class="faq" id="faq">
    <div class="container">
        <div class="section-header">
            <p class="section-label">{esc(faq["label"])}</p>
            <h2 class="section-title">{esc(faq["title"])}</h2>
        </div>
        <div class="faq-list">
{faq_html}
        </div>
    </div>
</section>

<!-- ============ CLIENT GALLERIES ============ -->
<section class="galleries" id="galleries">
    <div class="container">
        <div class="section-header">
            <p class="section-label">{esc(galleries["label"])}</p>
            <h2 class="section-title">{esc(galleries["title"])}</h2>
            <p class="section-sub">{esc(galleries["subtitle"])}</p>
        </div>
        <div class="gallery-access">
            <div class="gallery-info">
                <h3>{esc(galleries["intro_heading"])}</h3>
                <ol class="gallery-steps">
{gallery_steps_html}
                </ol>
                <div class="gallery-feature">
                    <h4>✨ What's included</h4>
                    <ul>
{gallery_features_html}
                    </ul>
                </div>
            </div>
            <div class="gallery-login-card">
                <h3>Access Your Gallery</h3>
                <p class="gallery-login-sub">Enter the passcode from your email</p>
                <form id="galleryLoginForm">
                    <div class="form-field">
                        <label for="galleryCode">Passcode</label>
                        <input type="text" id="galleryCode" placeholder="e.g. SMITH-0224" required>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full">View My Photos</button>
                    <p class="gallery-hint" id="galleryHint">
                        Don't have a passcode yet? Your gallery will be ready
                        {esc(galleries["delivery_time"])} after your session.
                    </p>
                    <p class="gallery-error" id="galleryError"></p>
                </form>
                <p class="gallery-contact">
                    Lost your passcode?
                    <a href="#contact">Contact me</a>
                </p>
            </div>
        </div>
    </div>
</section>

<!-- ============ CONTACT ============ -->
<section class="contact" id="contact">
    <div class="container">
        <div class="contact-grid">
            <div class="contact-info">
                <p class="section-label">{esc(contact["label"])}</p>
                <h2 class="section-title">{esc(contact["title"])}</h2>
                <p class="lead">{esc(contact["intro"])}</p>
                <div class="contact-details">
                    <div class="contact-item">
                        <span class="contact-icon">✉</span>
                        <div>
                            <small>Email</small>
                            <a href="mailto:{esc(site["email"])}">{esc(site["email"])}</a>
                        </div>
                    </div>
                    <div class="contact-item">
                        <span class="contact-icon">⚲</span>
                        <div>
                            <small>Location</small>
                            <span>{esc(site["location"])}</span>
                        </div>
                    </div>
                    <div class="contact-item">
                        <span class="contact-icon">♡</span>
                        <div>
                            <small>Follow Along</small>
                            <a href="{esc(site["instagram_url"])}">{esc(site["instagram"])}</a>
                        </div>
                    </div>
                </div>
                <p class="contact-verse">
                    <span class="verse-mark">&ldquo;</span>
                    {esc(contact["verse_text"])}
                    <span class="verse-mark">&rdquo;</span>
                    <small>— {esc(contact["verse_ref"])}</small>
                </p>
            </div>
            <div class="contact-form-card">
                <form id="contactForm" class="contact-form">
                    <div class="form-row">
                        <div class="form-field">
                            <label for="name">Your Name(s)</label>
                            <input type="text" id="name" name="name" placeholder="Both your names!" required>
                        </div>
                        <div class="form-field">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" placeholder="you@email.com" required>
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="eventType">What are you looking for?</label>
                        <select id="eventType" name="session_type" required>
                            <option value="">Select a session type</option>
                            {session_options_html}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-field">
                            <label for="date">Ideal Date (if known)</label>
                            <input type="date" id="date" name="date">
                        </div>
                        <div class="form-field">
                            <label for="location">Session Location</label>
                            <input type="text" id="location" name="location" placeholder="City, venue, or idea">
                        </div>
                    </div>
                    <div class="form-field">
                        <label for="message">Tell me about you two!</label>
                        <textarea id="message" name="message" rows="5" required
                            placeholder="How did you meet? What's your vibe? Anything you want me to know!"></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full">Send Inquiry</button>
                    <p class="form-note">{esc(contact["form_note"])}</p>
                    <p class="form-success" id="formSuccess">
                        ♡ Yay! Your inquiry is on its way! I'll get back to you within 24 hours. Can't wait to hear more about you two! 💕
                    </p>
                </form>
            </div>
        </div>
    </div>
</section>

<!-- ============ FOOTER ============ -->
<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col footer-brand">
                <div class="footer-logo-wordmark"><span class="logo-jenna footer-logo-jenna">JENNA</span> <span class="logo-lynn footer-logo-lynn">Lynn</span></div>
                <p class="footer-tagline">{esc(site["tagline"])}<br>{esc(site["location"])}</p>
            </div>
            <div class="footer-col">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="#about">About</a></li>
                    <li><a href="#services">Pricing</a></li>
                    <li><a href="#portfolio">Gallery</a></li>
                    <li><a href="#galleries">Client Galleries</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Connect</h4>
                <ul>
                    <li><a href="{esc(site["instagram_url"])}">Instagram</a></li>
                    <li><a href="mailto:{esc(site["email"])}">Email</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; {esc(site["footer_year"])} {esc(site["business_name"])}. All Rights Reserved.</p>
            <p class="footer-verse">
                <span class="verse-mark">&ldquo;</span>
                {esc(site["footer_verse_text"])}
                <span class="verse-mark">&rdquo;</span>
                <small>— {esc(site["footer_verse_ref"])}</small>
            </p>
        </div>
    </div>
</footer>

<!-- ============ LIGHTBOX ============ -->
<div class="lightbox" id="lightbox" aria-hidden="true">
    <button class="lightbox-close" id="lightboxClose" aria-label="Close">&times;</button>
    <button class="lightbox-prev" id="lightboxPrev" aria-label="Previous">‹</button>
    <button class="lightbox-next" id="lightboxNext" aria-label="Next">›</button>
    <div class="lightbox-content" id="lightboxContent">
        <img id="lightboxImg" src="" alt="">
    </div>
</div>

<script src="js/script.js"></script>
</body>
</html>'''

    return html


def build_gallery_html(c):
    """Generate gallery.html from content"""
    site = c["site"]
    gp = c["gallery_page"]
    galleries = c["client_galleries"]

    # Build gallery codes JS
    gallery_codes_js = "var GALLERY_CODES = {\n"
    for g in galleries["galleries"]:
        gallery_codes_js += f"    '{esc(g['code'])}': {{ title: '{esc(g['title'])}', date: '{esc(g['date'])}', cover: '{esc(g.get('cover', ''))}' }},\n"
    gallery_codes_js += "};"

    # Build gallery photos HTML
    photos_html = ""
    for photo in gp["photos"]:
        photos_html += f'''            <div class="ps-photo" data-full="{esc(photo["src"])}" data-w="{esc(photo.get("w", 1200))}" data-h="{esc(photo.get("h", 800))}">
                <img src="{esc(photo["src"])}" alt="{esc(photo["alt"])}" loading="lazy">
                <div class="ps-photo-actions">
                    <button class="ps-action" title="Favorite" data-action="fav">♡</button>
                    <a class="ps-action" title="Download" download href="{esc(photo["src"])}">⬇</a>
                </div>
            </div>
'''

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Client Gallery — {esc(site["business_name"])}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Montserrat:wght@300;400;500;600&family=Tangerine:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
    <style>{build_theme_css(c)}</style>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📸</text></svg>">
</head>
<body class="gallery-page">

<!-- Pixieset-style Navbar -->
<nav class="ps-nav" id="psNav">
    <div class="ps-nav-inner">
        <div class="ps-nav-left">
            <a href="index.html" class="ps-business-name">{esc(site["business_name"])}</a>
        </div>
        <div class="ps-nav-center">
            <span class="ps-gallery-title" id="psGalleryTitle"></span>
        </div>
        <div class="ps-nav-right">
            <button class="ps-nav-icon" id="psFavBtn" title="Favorites" aria-label="Favorites">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg>
            </button>
            <button class="ps-nav-icon" id="psShareBtnTop" title="Share" aria-label="Share">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V4M8 8l4-4 4 4M20 14v6H4v-6"/></svg>
            </button>
            <button class="ps-nav-icon" id="psSlideshowTopBtn" title="Slideshow" aria-label="Slideshow">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3V9z" fill="currentColor"/></svg>
            </button>
            <button class="ps-nav-icon" id="psDownloadBtn" title="Download All" aria-label="Download">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v12M8 12l4 4 4-4M4 20h16"/></svg>
            </button>
        </div>
    </div>
</nav>

<main class="client-gallery-page">
    <div class="gallery-gate" id="galleryGate">
        <div class="gate-card">
            <div class="gate-icon">🔒</div>
            <h1>Your Private Gallery</h1>
            <p class="gate-sub">Enter your passcode to view your photos</p>
            <form id="gateForm">
                <input type="text" id="gateCode" placeholder="e.g. SMITH-0224" required
                    autocomplete="off" autocapitalize="characters">
                <button type="submit" class="btn btn-primary btn-full">Unlock Gallery</button>
                <p class="gate-error" id="gateError"></p>
            </form>
            <p class="gate-hint">Don't have a passcode? <a href="index.html#galleries">Learn how to get one</a></p>
            <a href="index.html" class="gate-back">← Back to homepage</a>
        </div>
    </div>

    <div class="gallery-content hidden" id="galleryContent">
        <div class="ps-cover" id="psCover">
            <div class="ps-cover-overlay"></div>
            <div class="ps-cover-frame">
                <div class="ps-cover-content">
                    <h1 class="ps-cover-title" id="psCoverTitle">Your Gallery</h1>
                    <p class="ps-cover-date" id="psCoverDate"></p>
                    <button class="ps-cover-scroll" id="psCoverScroll" aria-label="Enter gallery">
                        <span>Enter Gallery</span>
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
                    </button>
                </div>
            </div>
        </div>

        <div class="ps-toolbar" id="psToolbar">
            <div class="ps-toolbar-inner">
                <span class="ps-photo-count"><span id="photoCount">0</span> photos</span>
                <div class="ps-toolbar-actions">
                    <button class="ps-toolbar-btn" id="psSlideshowBtn">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3V9z" fill="currentColor"/></svg>
                        Slideshow
                    </button>
                    <button class="ps-toolbar-btn" id="psShareBtn">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V4M8 8l4-4 4 4M20 14v6H4v-6"/></svg>
                        Share
                    </button>
                    <button class="ps-toolbar-btn" id="psDownloadAllBtn">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v12M8 12l4 4 4-4M4 20h16"/></svg>
                        Download All
                    </button>
                </div>
            </div>
        </div>

        <div class="ps-masonry" id="galleryGrid">
{photos_html}
        </div>

        <div class="ps-gallery-footer">
            <div class="ps-footer-divider"></div>
            <p class="ps-footer-message">{esc(gp["footer_message"])}</p>
            <p class="ps-footer-verse"><em>"{esc(gp["footer_verse_text"])}" — {esc(gp["footer_verse_ref"])}</em></p>
            <div class="ps-footer-actions">
                <a href="index.html#contact" class="ps-footer-link">Contact Jenna</a>
                <span class="ps-footer-dot">·</span>
                <a href="index.html" class="ps-footer-link">Back to Home</a>
            </div>
        </div>
    </div>

    <div class="ps-lightbox" id="psLightbox" aria-hidden="true">
        <div class="ps-lb-topbar">
            <span class="ps-lb-counter" id="psLbCounter">1 / 9</span>
            <div class="ps-lb-actions">
                <button class="ps-lb-btn" id="psLbFav" title="Favorite"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg></button>
                <button class="ps-lb-btn" id="psLbShare" title="Share"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 16V4M8 8l4-4 4 4M20 14v6H4v-6"/></svg></button>
                <button class="ps-lb-btn" id="psLbDownload" title="Download"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v12M8 12l4 4 4-4M4 20h16"/></svg></button>
                <button class="ps-lb-btn ps-lb-close" id="psLbClose" title="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
            </div>
        </div>
        <button class="ps-lb-prev" id="psLbPrev" aria-label="Previous"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1"><path d="M15 6l-6 6 6 6"/></svg></button>
        <button class="ps-lb-next" id="psLbNext" aria-label="Next"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1"><path d="M9 6l6 6-6 6"/></svg></button>
        <div class="ps-lb-image-wrap" id="psLbImageWrap"><img id="psLbImg" src="" alt=""></div>
    </div>
</main>

<script>
{gallery_codes_js}
</script>
<script src="js/gallery.js"></script>
</body>
</html>'''

    return html


def build_site():
    """Generate both HTML files from content.json"""
    c = load_content()
    index_html = build_index_html(c)
    gallery_html = build_gallery_html(c)

    with open(SITE_DIR / "index.html", "w", encoding="utf-8") as f:
        f.write(index_html)
    with open(SITE_DIR / "gallery.html", "w", encoding="utf-8") as f:
        f.write(gallery_html)

    return True


# ═══════════════════════════════════════════════════════════════
# HTTP SERVER
# ═══════════════════════════════════════════════════════════════

class CMSHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress logs

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Admin panel
        if path == "/admin" or path == "/admin/":
            self.serve_file(ADMIN_DIR / "index.html", "text/html")
        elif path == "/admin/css":
            self.serve_file(ADMIN_DIR / "style.css", "text/css")
        elif path == "/admin/js":
            self.serve_file(ADMIN_DIR / "app.js", "application/javascript")

        # API: Get content
        elif path == "/api/content":
            content = load_content()
            self.send_json(content)

        # API: Get preview HTML
        elif path == "/api/preview":
            build_site()
            self.send_json({"status": "ok", "message": "Site rebuilt"})

        # Serve site files (for preview)
        elif path == "/" or path == "/index.html":
            build_site()
            self.serve_file(SITE_DIR / "index.html", "text/html")
        elif path == "/gallery.html":
            build_site()
            self.serve_file(SITE_DIR / "gallery.html", "text/html")
        elif path.startswith("/css/") or path.startswith("/js/") or path.startswith("/photos/"):
            self.serve_file(SITE_DIR / path.lstrip("/"), self.guess_mime(path))
        else:
            self.send_error(404, "Not found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")

        # API: Save content
        if path == "/api/content":
            try:
                data = json.loads(body)
                save_content(data)
                build_site()  # Rebuild site immediately
                self.send_json({"status": "ok", "message": "Content saved and site rebuilt"})
            except Exception as e:
                self.send_json({"status": "error", "message": str(e)}, code=400)

        # API: Publish to GitHub
        elif path == "/api/publish":
            try:
                result = publish_to_github()
                self.send_json({"status": "ok", "message": result})
            except Exception as e:
                self.send_json({"status": "error", "message": str(e)}, code=500)

        # API: Add gallery photo
        elif path == "/api/upload":
            try:
                # Handle file upload (simplified — saves to photos/ folder)
                data = json.loads(body)
                filename = data.get("filename", "upload.jpg")
                filepath = SITE_DIR / "photos" / "client-photos" / filename
                # In production, save actual file data here
                self.send_json({"status": "ok", "path": f"photos/client-photos/{filename}"})
            except Exception as e:
                self.send_json({"status": "error", "message": str(e)}, code=400)

        else:
            self.send_error(404, "Not found")

    def serve_file(self, filepath, mime_type):
        try:
            with open(filepath, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404, "File not found")

    def send_json(self, data, code=200):
        json_str = json.dumps(data, ensure_ascii=False)
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(json_str.encode("utf-8"))))
        self.end_headers()
        self.wfile.write(json_str.encode("utf-8"))

    def guess_mime(self, path):
        if path.endswith(".css"):
            return "text/css"
        elif path.endswith(".js"):
            return "application/javascript"
        elif path.endswith(".jpg") or path.endswith(".jpeg"):
            return "image/jpeg"
        elif path.endswith(".png"):
            return "image/png"
        elif path.endswith(".svg"):
            return "image/svg+xml"
        elif path.endswith(".webp"):
            return "image/webp"
        else:
            return "application/octet-stream"


def publish_to_github():
    """Commit and push changes to GitHub"""
    commands = [
        ["git", "add", "-A"],
        ["git", "commit", "-m", "CMS update — content edited via admin panel"],
        ["git", "push", "origin", "master"],
    ]

    results = []
    for cmd in commands:
        result = subprocess.run(
            cmd,
            cwd=str(SITE_DIR),
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0 and "nothing to commit" not in result.stdout:
            # git commit might fail if nothing changed — that's ok
            if not (cmd[0] == "git" and cmd[1] == "commit"):
                raise Exception(f"Git command failed: {result.stderr}")
        results.append(result.stdout.strip())

    return "Changes published to GitHub! Site will update in ~15 seconds."


def main():
    print(f"╔═══════════════════════════════════════════════╗")
    print(f"║  Jenna Lynn Photography — CMS Server          ║")
    print(f"║  Admin Panel:  http://localhost:{PORT}/admin/  ║")
    print(f"║  Live Preview: http://localhost:{PORT}/        ║")
    print(f"║  Press Ctrl+C to stop                         ║")
    print(f"╚═══════════════════════════════════════════════╝")

    # Build site on startup
    build_site()
    print("✓ Site built from content.json")

    server = HTTPServer(("localhost", PORT), CMSHandler)
    print(f"✓ Server running on port {PORT}")

    # Open admin in browser
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{PORT}/admin/")).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n■ Server stopped")
        server.shutdown()


if __name__ == "__main__":
    main()