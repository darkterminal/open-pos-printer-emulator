/* Open POS Printer Emulator landing page — progressive enhancement only. */
(function () {
    "use strict";

    var REPO = "darkterminal/open-pos-printer-emulator";

    /* ----------------------------------------------------------- theme */
    // Same storage key and attribute as the user manual, so a toggle here
    // carries over when a reader opens the guide (and back again).
    var root = document.documentElement;
    var toggle = document.getElementById("theme-toggle");

    function applyTheme(theme) {
        root.setAttribute("data-theme", theme);
        if (toggle) {
            toggle.setAttribute(
                "aria-label",
                theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
            );
        }
        var icon = document.getElementById("site-favicon");
        var shortcut = document.querySelector('link[rel="shortcut icon"]');
        var base = root.getAttribute("data-baseurl") || "";
        if (icon) icon.href = base + "/favicon-32.png";
        if (shortcut) shortcut.href = base + "/favicon.ico";
    }

    if (toggle) {
        toggle.addEventListener("click", function () {
            var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
            applyTheme(next);
            try {
                localStorage.setItem("docs-theme", next);
            } catch (e) {
                /* storage can be disabled; the toggle still works for this page */
            }
        });
    }

    // The inline head script already set the attribute before paint; this
    // first pass only aligns the icon and the button label with that choice.
    applyTheme(root.getAttribute("data-theme") || "dark");

    /* ------------------------------------------------------ mobile nav */
    var navToggle = document.getElementById("nav-toggle");
    var panel = document.getElementById("mobile-panel");

    function closePanel() {
        if (!panel || !navToggle) return;
        panel.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
    }

    if (navToggle && panel) {
        navToggle.addEventListener("click", function () {
            var open = panel.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", String(open));
        });
        panel.addEventListener("click", function (e) {
            if (e.target.closest("a")) closePanel();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closePanel();
        });
    }

    /* ------------------------------------------------------- code blocks */
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

    function normalizeCodeText(text) { return String(text || '').replace(/\n$/, ''); }
    function toOneLiner(text) {
        var lines = normalizeCodeText(text).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        var cleaned = lines.filter(function (l) { return !/^(#|\/\/)/.test(l); });
        if (!cleaned.length) cleaned = lines;
        return cleaned.length > 1 ? cleaned.join(' && ') : (cleaned[0] || '');
    }

    document.querySelectorAll('.code-block').forEach(function (block) {
        var pre = block.querySelector('pre');
        var code = block.querySelector('code');
        if (!pre || !code) return;
        var raw = normalizeCodeText(code.innerText);
        var oneLiner = toOneLiner(raw);
        var oneBtn = block.querySelector('[data-action="oneline"]');
        var wrapBtn = block.querySelector('[data-action="wrap"]');
        var copyBtn = block.querySelector('[data-action="copy"]');

        if (oneBtn && (raw.indexOf('\n') === -1 || !oneLiner || oneLiner === raw)) oneBtn.style.display = 'none';
        var showingOne = false;

        if (wrapBtn) wrapBtn.addEventListener('click', function () {
            var wrapped = pre.classList.toggle('is-wrapped');
            wrapBtn.classList.toggle('is-active', wrapped);
            wrapBtn.textContent = wrapped ? 'Unwrap' : 'Wrap';
        });
        if (oneBtn) oneBtn.addEventListener('click', function () {
            showingOne = !showingOne;
            code.textContent = showingOne ? oneLiner : raw;
            oneBtn.classList.toggle('is-active', showingOne);
            oneBtn.textContent = showingOne ? 'Original' : 'One-liner';
        });
        if (copyBtn) copyBtn.addEventListener('click', function () {
            copyText(code.innerText, function () {
                copyBtn.textContent = 'Copied';
                window.setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1400);
            });
        });
    });

    /* ---------------------------------------------------- GitHub stats */
    function setText(id, value) {
        var el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    async function loadStats() {
        try {
            var headers = { Accept: "application/vnd.github+json" };
            var repoRes = await fetch("https://api.github.com/repos/" + REPO, {
                headers: headers,
            });
            if (!repoRes.ok) return;
            var repo = await repoRes.json();

            setText("stars", (repo.stargazers_count || 0).toLocaleString("en-US"));
            setText("header-stars", String(repo.stargazers_count || 0));

            var results = await Promise.allSettled([
                fetch("https://api.github.com/repos/" + REPO + "/contributors", {
                    headers: headers,
                }),
                fetch("https://api.github.com/repos/" + REPO + "/releases/latest", {
                    headers: headers,
                }),
            ]);

            if (results[0].status === "fulfilled" && results[0].value.ok) {
                var people = await results[0].value.json();
                if (Array.isArray(people)) setText("contributors", String(people.length));
            }
            if (results[1].status === "fulfilled" && results[1].value.ok) {
                var release = await results[1].value.json();
                if (release && release.tag_name) setText("release-tag", release.tag_name);
            }

        } catch (e) {
            /* The static fallback copy stays on the page. */
        }
    }

    /* ----------------------------------------------------------- lightbox */
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

    document.querySelectorAll('.shot-frame--zoomable img, .shot-frame img').forEach(function (img) {
        if (img.closest('a, button, .lightbox')) return;
        img.setAttribute('tabindex', '0');
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', (img.alt || 'Image') + ' — open preview');
        img.title = 'Click to enlarge';
        var caption = img.alt || '';
        function open() { openLightbox(img.currentSrc || img.src, img.alt, caption); }
        img.addEventListener('click', open);
        img.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
    });

    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    loadStats();
})();
