/**
 * DOMAIN: HTML Sanitizer
 * Edge-safe sanitization (no DOM dependencies).
 * Protects against XSS when assembling dynamic HTML pages.
 */

// ============================================
// HTML ESCAPE (for use in <title>, attributes, etc.)
// ============================================

const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
}

const HTML_ESCAPE_REGEX = /[&<>"']/g

/**
 * Escapes HTML special characters to prevent XSS in text contexts.
 * Use for page names, titles, attribute values — never for body HTML.
 */
export function escapeHtml(input: string): string {
    return input.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] || char)
}

// ============================================
// CSS SANITIZER
// ============================================

/**
 * Dangerous CSS patterns that can execute code:
 * - expression() — IE-era eval in CSS
 * - @import url() with javascript: protocol
 * - javascript: in url()
 * - behavior: property (IE HTC)
 * - -moz-binding (Firefox XBL)
 */
const DANGEROUS_CSS_PATTERNS = [
    /expression\s*\(/gi,
    /javascript\s*:/gi,
    /behavior\s*:/gi,
    /-moz-binding\s*:/gi,
    /@import\s+url\s*\(\s*['"]?\s*javascript:/gi,
]

/**
 * Sanitizes CSS by removing dangerous patterns.
 * Returns cleaned CSS string.
 */
export function sanitizeCss(css: string): string {
    let cleaned = css
    for (const pattern of DANGEROUS_CSS_PATTERNS) {
        cleaned = cleaned.replace(pattern, '/* [blocked] */')
    }
    return cleaned
}

// ============================================
// JS AUDIT LOG (informational only)
// ============================================

const SUSPICIOUS_JS_PATTERNS = [
    /document\.cookie/gi,
    /window\.opener/gi,
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /innerHTML\s*=/gi,
    /outerHTML\s*=/gi,
    /document\.write\s*\(/gi,
]

/**
 * Audits JS for suspicious patterns.
 * Does NOT modify the JS — just logs warnings.
 * The JS runs in the user's browser context (their own page),
 * so we only warn, not block.
 */
export function auditJs(js: string, pageId: string): string[] {
    const warnings: string[] = []
    for (const pattern of SUSPICIOUS_JS_PATTERNS) {
        if (pattern.test(js)) {
            warnings.push(`[WebApp:${pageId}] Suspicious JS pattern: ${pattern.source}`)
        }
        // Reset lastIndex for global regex
        pattern.lastIndex = 0
    }
    return warnings
}
