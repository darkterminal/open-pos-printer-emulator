/* Open POS Printer Emulator docs — progressive enhancement only. */

(function () {
    'use strict';

    /* ---------------------------------------------------------------- theme */
    var root = document.documentElement;

    function syncThemeButton() {
        var button = document.querySelector('[data-theme-toggle]');
        if (!button) return;
        var isDark = root.getAttribute('data-theme') === 'dark';
        button.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    }

    function syncFavicon() {
        var icon = document.getElementById('site-favicon');
        var shortcut = document.querySelector('link[rel="shortcut icon"]');
        var base = root.getAttribute('data-baseurl') || '';
        if (icon) icon.href = base + '/favicon-32.png';
        if (shortcut) shortcut.href = base + '/favicon.ico';
    }

    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem('docs-theme', next); } catch (e) { /* private mode */ }
            syncThemeButton();
            syncFavicon();
        });
    });

    syncThemeButton();
    syncFavicon();

    /* -------------------------------------------------------------- sidebar */
    var sidebar = document.querySelector('[data-sidebar]');
    var sidebarToggle = document.querySelector('[data-sidebar-toggle]');

    if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            var open = sidebar.classList.toggle('is-open');
            sidebarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    /* ------------------------------------------------------------------ toc */
    var toc = document.querySelector('[data-toc]');

    if (toc) {
        var list = toc.querySelector('ul');
        var headings = Array.prototype.slice.call(
            document.querySelectorAll('.prose h2[id], .prose h3[id]')
        );

        if (headings.length) {
            headings.forEach(function (heading) {
                var li = document.createElement('li');
                li.className = heading.tagName === 'H3' ? 'toc-h3' : 'toc-h2';

                var link = document.createElement('a');
                link.href = '#' + heading.id;
                link.textContent = heading.textContent.replace(/^#\s*/, '');

                li.appendChild(link);
                list.appendChild(li);
            });

            var links = Array.prototype.slice.call(list.querySelectorAll('a'));

            if ('IntersectionObserver' in window) {
                var observer = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        var id = entry.target.id;
                        links.forEach(function (link) {
                            link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
                        });
                    });
                }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

                headings.forEach(function (heading) { observer.observe(heading); });
            }
        } else {
            toc.remove();
        }
    }

    /* -------------------------------------------------------------- tables */
    // Permission matrices are wide by nature. Wrap them so the page itself
    // never scrolls sideways on a phone — only the table does.
    document.querySelectorAll('.prose table').forEach(function (table) {
        if (table.parentElement && table.parentElement.classList.contains('table-scroll')) return;
        var wrap = document.createElement('div');
        wrap.className = 'table-scroll';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
    });

    /* ------------------------------------------------------------- images */
    var lightbox = document.querySelector('[data-lightbox]');
    var lightboxImg = lightbox && lightbox.querySelector('[data-lightbox-image]');
    var lightboxCaption = lightbox && lightbox.querySelector('[data-lightbox-caption]');
    var lightboxZoom = lightbox && lightbox.querySelector('[data-lightbox-zoom]');
    var lastFocus = null;

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.hidden = true;
        lightbox.setAttribute('aria-hidden', 'true');
        lightbox.classList.remove('is-zoomed');
        document.body.classList.remove('has-lightbox');
        if (lightboxZoom) lightboxZoom.textContent = 'Zoom';
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function openLightbox(src, alt, caption) {
        if (!lightbox || !lightboxImg) return;
        lastFocus = document.activeElement;
        lightboxImg.src = src;
        lightboxImg.alt = alt || '';
        if (lightboxCaption) lightboxCaption.textContent = caption || alt || 'Image preview';
        lightbox.hidden = false;
        lightbox.setAttribute('aria-hidden', 'false');
        lightbox.classList.remove('is-zoomed');
        document.body.classList.add('has-lightbox');
        if (lightboxZoom) lightboxZoom.textContent = 'Zoom';
        var closeBtn = lightbox.querySelector('.lightbox__button[data-lightbox-close]');
        if (closeBtn) closeBtn.focus();
    }

    if (lightbox) {
        lightbox.querySelectorAll('[data-lightbox-close]').forEach(function (el) {
            el.addEventListener('click', closeLightbox);
        });
        if (lightboxZoom) {
            lightboxZoom.addEventListener('click', function () {
                var zoomed = lightbox.classList.toggle('is-zoomed');
                lightboxZoom.textContent = zoomed ? 'Fit' : 'Zoom';
            });
        }
        if (lightboxImg) {
            lightboxImg.addEventListener('click', function () {
                var zoomed = lightbox.classList.toggle('is-zoomed');
                if (lightboxZoom) lightboxZoom.textContent = zoomed ? 'Fit' : 'Zoom';
            });
        }
        document.addEventListener('keydown', function (e) {
            if (lightbox.hidden) return;
            if (e.key === 'Escape') closeLightbox();
        });
    }

    document.querySelectorAll('.prose img').forEach(function (img) {
        if (img.closest('a, button, .lightbox')) return;
        img.loading = img.loading || 'lazy';
        img.decoding = img.decoding || 'async';
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', (img.alt || 'Image') + ' — open preview');
        img.title = 'Click to enlarge';

        var caption = img.alt || '';
        var fig = img.closest('figure');
        if (fig && !fig.querySelector('figcaption, .img-caption')) {
            var cap = document.createElement('figcaption');
            cap.className = 'img-caption';
            cap.textContent = caption ? caption + ' — click to enlarge' : 'Click to enlarge';
            fig.appendChild(cap);
        }

        function open() { openLightbox(img.currentSrc || img.src, img.alt, caption); }
        img.addEventListener('click', open);
        img.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
    });

    /* -------------------------------------------------------- code blocks */
    function copyText(text, onDone) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onDone, function () { onDone(); });
            return;
        }
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try { document.execCommand('copy'); } catch (e) { /* noop */ }
        document.body.removeChild(area);
        onDone();
    }

    function normalizeCodeText(text) {
        return String(text || '').replace(/\n$/, '');
    }

    function languageLabel(pre, code) {
        var classes = ((code && code.className) || '') + ' ' + (pre.className || '');
        var match = classes.match(/language-([a-z0-9_-]+)/i);
        if (!match) return 'Code';
        var lang = match[1].toLowerCase();
        var map = { bash: 'Bash', sh: 'Shell', shell: 'Shell', zsh: 'Zsh', js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript', json: 'JSON', yaml: 'YAML', yml: 'YAML', php: 'PHP', html: 'HTML', css: 'CSS', sql: 'SQL', text: 'Text', plaintext: 'Text', md: 'Markdown', markdown: 'Markdown' };
        return map[lang] || lang.toUpperCase();
    }

    function toOneLiner(text) {
        var lines = normalizeCodeText(text).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        var cleaned = lines.filter(function (l) { return !/^(#|\/\/|;)/.test(l); });
        if (!cleaned.length) cleaned = lines;
        if (cleaned.length <= 1) return cleaned[0] || '';
        return cleaned.join(' && ');
    }

    document.querySelectorAll('.prose pre').forEach(function (pre) {
        if (pre.closest('.code-block')) return;
        var code = pre.querySelector('code');
        var raw = normalizeCodeText(code ? code.innerText : pre.innerText);
        var lang = languageLabel(pre, code);

        var wrapper = document.createElement('div');
        wrapper.className = 'code-block';

        var header = document.createElement('div');
        header.className = 'code-block__header';
        header.innerHTML = '' +
            '<div class="code-block__meta">' +
                '<span class="code-block__dots" aria-hidden="true"><span></span><span></span><span></span></span>' +
                '<span class="code-block__lang"></span>' +
            '</div>' +
            '<div class="code-block__actions">' +
                '<button type="button" class="code-block__btn" data-action="wrap">Wrap</button>' +
                '<button type="button" class="code-block__btn" data-action="oneline">One-liner</button>' +
                '<button type="button" class="code-block__btn" data-action="copy">Copy</button>' +
            '</div>';
        header.querySelector('.code-block__lang').textContent = lang;

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);

        var oneLiner = toOneLiner(raw);
        var onelineBtn = header.querySelector('[data-action="oneline"]');
        if (!oneLiner || oneLiner === raw || raw.indexOf('\n') === -1) {
            onelineBtn.style.display = 'none';
        }

        var showingOneLine = false;
        header.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-action');
            if (action === 'wrap') {
                var wrapped = pre.classList.toggle('is-wrapped');
                btn.classList.toggle('is-active', wrapped);
                btn.textContent = wrapped ? 'Unwrap' : 'Wrap';
                return;
            }
            if (action === 'oneline') {
                showingOneLine = !showingOneLine;
                if (code) code.textContent = showingOneLine ? oneLiner : raw;
                btn.classList.toggle('is-active', showingOneLine);
                btn.textContent = showingOneLine ? 'Original' : 'One-liner';
                return;
            }
            if (action === 'copy') {
                var text = code ? code.innerText : pre.innerText;
                copyText(text, function () {
                    btn.textContent = 'Copied';
                    window.setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
                });
            }
        });
    });
})();
