/* ═══════════════════════════════════════════════════════════════
   JENNA LYNN PHOTOGRAPHY — Instagram Feed
   Fetches latest posts from /api/instagram-feed (server-side proxy)
   Renders a 3x3 grid with hover overlays
   ═══════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    var FEED_URL = '/api/instagram-feed';

    function renderFeed(posts) {
        var container = document.getElementById('instagram-feed');
        if (!container) return;

        if (!posts || posts.length === 0) {
            container.innerHTML = '<p class="ig-error">Unable to load Instagram feed. <a href="https://instagram.com/photographybyjennalynn_">Visit our Instagram</a></p>';
            return;
        }

        // Update post count
        var countEl = document.getElementById('igPostCount');
        if (countEl) {
            countEl.innerHTML = '<strong>' + posts.length + '</strong> recent posts';
        }

        container.innerHTML = posts.map(function(post) {
            var imgSrc = post.media_type === 'VIDEO'
                ? post.thumbnail_url
                : post.media_url;
            var caption = (post.caption || '').substring(0, 80);
            var isVideo = post.media_type === 'VIDEO';

            return '<a href="' + post.permalink + '" class="ig-post" target="_blank" rel="noopener" title="' +
                caption.replace(/"/g, '&quot;') + '">' +
                '<img src="' + imgSrc + '" alt="' + caption.replace(/"/g, '&quot;') + '" loading="lazy" />' +
                (isVideo ? '<span class="ig-post-type-badge">▶</span>' : '') +
                '<div class="ig-post-overlay">' +
                    '<div class="ig-post-stats">' +
                        '<span>♥ ' + (post.like_count || 0) + '</span>' +
                        '<span>💬 ' + (post.comments_count || 0) + '</span>' +
                    '</div>' +
                    '<div class="ig-post-caption">' + caption + '</div>' +
                '</div>' +
            '</a>';
        }).join('');
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