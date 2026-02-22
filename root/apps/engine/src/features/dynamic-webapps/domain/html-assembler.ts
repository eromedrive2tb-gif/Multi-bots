/**
 * DOMAIN: HTML Assembler
 * Builds the final HTML document from a WebAppPage entity.
 * Two strategies: 'composed' (assemble from parts) and 'singlefile' (zero-overhead passthrough).
 */

import type { WebAppPage } from './types'
import { escapeHtml, sanitizeCss, auditJs } from './html-sanitizer'

// ============================================
// ASSEMBLED HTML (Composed Mode)
// ============================================

/**
 * Assembles a full HTML document from separate HTML/CSS/JS parts.
 * Applies sanitization to page.name (title) and page.css.
 * JS runs in the user's own page context, so we audit but don't block.
 */
function assembleComposed(page: WebAppPage): string {
    const safeName = escapeHtml(page.name)
    const safeCss = sanitizeCss(page.css)

    // Audit JS for suspicious patterns (log only)
    const jsWarnings = auditJs(page.js, page.id)
    if (jsWarnings.length > 0) {
        console.warn('[WebApp Assembler]', ...jsWarnings)
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeName}</title>
    <script src="https://telegram.org/js/telegram-web-app.js"><\/script>
    <style>
        body { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        ${safeCss}
    </style>
</head>
<body>
    ${page.html}
    <script type="module">
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
        }
        ${page.js}
    <\/script>
</body>
</html>`
}

// ============================================
// SINGLEFILE MODE (Zero-overhead passthrough)
// ============================================

/**
 * Returns the singlefile HTML directly — zero processing.
 * Designed for vite-plugin-singlefile outputs where HTML/CSS/JS
 * are already minified and embedded.
 */
function assembleSinglefile(page: WebAppPage): string {
    if (!page.singleFileHtml) {
        throw new Error(`[WebApp:${page.id}] singleFileHtml is required in singlefile mode`)
    }
    return page.singleFileHtml
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Assembles the final HTML for a WebAppPage based on its mode.
 * - 'composed': builds HTML from separate parts with sanitization
 * - 'singlefile': passes through the embedded HTML document as-is
 */
export function assembleHtml(page: WebAppPage): string {
    switch (page.mode) {
        case 'singlefile':
            return assembleSinglefile(page)
        case 'composed':
        default:
            return assembleComposed(page)
    }
}

/**
 * Security headers for serving dynamic webapps at the Edge.
 */
export function getServeHeaders(): Record<string, string> {
    return {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' https://telegram.org",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org",
            "style-src 'self' 'unsafe-inline'",
            "img-src * data: blob:",
            "connect-src *",
            "font-src * data:",
        ].join('; '),
    }
}
