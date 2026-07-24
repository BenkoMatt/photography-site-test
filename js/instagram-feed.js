/* ═══════════════════════════════════════════════════════════════
   JENNA LYNN PHOTOGRAPHY — Instagram Feed
   Fetches latest posts from /api/instagram-feed (server-side proxy)
   Renders a 3x3 grid with hover overlays
   S-8 FIX: Uses DOM API (createElement + textContent) instead of innerHTML
   ═══════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    var FEED_URL = '/api/instagram-feed';

    function renderFeed(posts) {
        var container = document.getElementById('instagram-feed');
        if (!container) return;

        // Clear existing content
        container.textContent = '';

        if (!posts || posts.length === 0) {
            var p = document.createElement('p');
            p.className = 'ig-error';
            p.textContent = 'Unable to load Instagram feed. ';
            var link = document.createElement('a');
            link.href = 'https://instagram.com/photographybyjennalynn_';
            link.textContent = 'Visit our Instagram';
            p.appendChild(link);
            container.appendChild(p);
            return;
        }

        // Update post count
        var countEl = document.getElementById('igPostCount');
        if (countEl) {
            countEl.textContent = '';
            var strong = document.createElement('strong');
            strong.textContent = String(posts.length);
            countEl.appendChild(strong);
            countEl.appendChild(document.createTextNode(' recent posts'));
        }

        posts.forEach(function(post) {
            var imgSrc = post.media_type === 'VIDEO'
                ? post.thumbnail_url
                : post.media_url;
            var caption = (post.caption || '').substring(0, 80);
            var isVideo = post.media_type === 'VIDEO';

            // Build elements via DOM API — no innerHTML
            var anchor = document.createElement('a');
            anchor.href = post.permalink;
            anchor.className = 'ig-post';
            anchor.target = '_blank';
            anchor.rel = 'noopener';
            anchor.title = caption;

            var img = document.createElement('img');
            img.src = imgSrc || '';
            img.alt = caption;
            img.loading = 'lazy';
            anchor.appendChild(img);

            if (isVideo) {
                var badge = document.createElement('span');
                badge.className = 'ig-post-type-badge';
                badge.textContent = '\u25B6'; // play symbol
                anchor.appendChild(badge);
            }

            var overlay = document.createElement('div');
            overlay.className = 'ig-post-overlay';

            var stats = document.createElement('div');
            stats.className = 'ig-post-stats';
            var likeSpan = document.createElement('span');
            likeSpan.textContent = '\u2665 ' + (post.like_count || 0);
            var commentSpan = document.createElement('span');
            commentSpan.textContent = '\uD83D\uDCAC ' + (post.comments_count || 0);
            stats.appendChild(likeSpan);
            stats.appendChild(commentSpan);
            overlay.appendChild(stats);

            var captionDiv = document.createElement('div');
            captionDiv.className = 'ig-post-caption';
            captionDiv.textContent = caption;
            overlay.appendChild(captionDiv);

            anchor.appendChild(overlay);
            container.appendChild(anchor);
        });
    }

    function loadFeed() {
        fetch(FEED_URL)
            .then(function(response) { return response.json(); })
            .then(function(data) {
                renderFeed(data.posts || []);
            })
            .catch(function(err) {
                console.error('Instagram feed error:', err);
                renderFeed([]);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFeed);
    } else {
        loadFeed();
    }
})();