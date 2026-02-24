/**
 * DOMAIN: HTML Assembler — Multi-Paradigm Rendering Engine
 * 
 * Builds the final HTML document from a WebAppPage entity.
 * 4 strategies based on mode:
 * - 'classic':      HTML + CSS + JS assembled with sanitization
 * - 'singlefile':   Zero-overhead passthrough (vite-plugin-singlefile)
 * - 'hypermedia':   HTML + CSS + Head + Alpine.js & HTMX injected via CDN
 * 
 * GOLDEN RULE: The webapp is 100% isolated. The CRM Engine only stores and delivers the HTML.
 */

import type { WebAppPage } from './types'
import { escapeHtml, sanitizeCss, auditJs } from './html-sanitizer'

// ============================================
// CDN CONSTANTS (pinned versions for stability)
// ============================================

const CDN_ALPINEJS = 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js'
const CDN_HTMX = 'https://unpkg.com/htmx.org@1.9.10'
const CDN_TELEGRAM = 'https://telegram.org/js/telegram-web-app.js'

// ============================================
// BASE TEMPLATE
// ============================================

/**
 * Generates the full HTML document shell.
 * All modes except singlefile share this structure.
 */
function renderDocument(opts: {
    name: string
    css: string
    html: string
    headScripts: string
    bodyScripts: string
}): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${opts.name}</title>
    <script src="${CDN_TELEGRAM}"><\/script>
${opts.headScripts}
    <style>
        body { margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        ${opts.css}
    </style>
</head>
<body>
    ${opts.html}
${opts.bodyScripts}
</body>
</html>`
}

// ============================================
// MODE: CLASSIC (HTML + CSS + JS)
// ============================================

function assembleClassic(page: WebAppPage): string {
    const safeName = escapeHtml(page.name)
    const safeCss = sanitizeCss(page.css)

    const jsWarnings = auditJs(page.js, page.id)
    if (jsWarnings.length > 0) {
        console.warn('[WebApp Assembler]', ...jsWarnings)
    }

    return renderDocument({
        name: safeName,
        css: safeCss,
        html: page.html,
        headScripts: '',
        bodyScripts: `    <script type="module">
        if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); }
        ${page.js}
    <\/script>`,
    })
}

// ============================================
// MODE: SINGLEFILE (Zero-overhead passthrough)
// ============================================

function assembleSinglefile(page: WebAppPage): string {
    if (!page.singleFileHtml) {
        throw new Error(`[WebApp:${page.id}] singleFileHtml is required in singlefile mode`)
    }
    return page.singleFileHtml
}

// ============================================
// MODE: HYPERMEDIA (Alpine.js & HTMX injected)
// ============================================

function assembleHypermedia(page: WebAppPage): string {
    const safeName = escapeHtml(page.name)
    const safeCss = sanitizeCss(page.css)

    // User can manipulate the head, we inject their custom tags here.
    // They are responsible for validity, but the application isolates scripts anyway.
    const customHead = page.head || ''

    return renderDocument({
        name: safeName,
        css: safeCss,
        html: page.html,
        headScripts: `${customHead}\n    <script defer src="${CDN_ALPINEJS}"><\/script>\n    <script src="${CDN_HTMX}"><\/script>`,
        bodyScripts: `    <script>
        if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); }
    <\/script>`,
    })
}



// ============================================
// PUBLIC API
// ============================================

/**
 * Assembles the final HTML for a WebAppPage based on its mode.
 * Strict switch/case — no fallthrough, no ambiguity.
 */
export function assembleHtml(page: WebAppPage): string {
    switch (page.mode) {
        case 'classic':
            return assembleClassic(page)
        case 'singlefile':
            return assembleSinglefile(page)
        case 'hypermedia':
            return assembleHypermedia(page)
        default: {
            // Backward compatibility
            const fallback = page as any
            if (fallback.mode === 'composed') return assembleClassic(page)
            if (fallback.mode === 'declarative' || fallback.mode === 'htmx') return assembleHypermedia(page)

            console.warn(`[WebApp Assembler] Unknown mode "${page.mode}", falling back to classic`)
            return assembleClassic(page)
        }
    }
}

/**
 * Security headers for serving dynamic webapps at the Edge.
 * CSP allows Alpine.js, HTMX, and Telegram SDK CDNs + external API calls via connect-src.
 */
export function getServeHeaders(): Record<string, string> {
    return {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' https://telegram.org",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://cdn.jsdelivr.net https://unpkg.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src * data: blob:",
            "connect-src *",
            "font-src * data:",
        ].join('; '),
    }
}
