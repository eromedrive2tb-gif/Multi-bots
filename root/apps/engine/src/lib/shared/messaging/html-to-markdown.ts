/**
 * Utility to convert simple HTML tags to Discord Markdown
 * 
 * Supports:
 * - Bold: <b>, <strong> -> **text**
 * - Italic: <i>, <em> -> *text*
 * - Code: <code> -> `text`
 * - Pre: <pre> -> ```text```
 * - Link: <a href="url">text</a> -> [text](url)
 * - Br: <br>, <br/> -> \n
 */
export function htmlToMarkdown(html: string): string {
    if (!html) return ''

    let markdown = html

    // Replace <br> tags first
    markdown = markdown.replace(/<br\s*\/?>/gi, '\n')

    // Bold
    markdown = markdown.replace(/<(b|strong)>(.*?)<\/\1>/gis, '**$2**')

    // Italic
    markdown = markdown.replace(/<(i|em)>(.*?)<\/\1>/gis, '*$2*')

    // Code
    markdown = markdown.replace(/<code>(.*?)<\/code>/gis, '`$1`')

    // Pre (Code block)
    markdown = markdown.replace(/<pre>(.*?)<\/pre>/gis, '```$1```')

    // Links: <a href="Val">Key</a> -> [Key](Val)
    markdown = markdown.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)')

    // Remove any remaining HTML tags (optional, but good for cleanup)
    // markdown = markdown.replace(/<[^>]*>/g, '')

    return markdown
}
