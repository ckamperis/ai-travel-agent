/**
 * Convert plain-text email into styled HTML for preview.
 * Produces a self-contained HTML string suitable for iframe srcDoc.
 */
export function emailToHtml(
  plainText: string,
  meta?: { from?: string; to?: string; subject?: string; agency?: string }
): string {
  // Convert paragraphs: double newlines become <p> boundaries
  const paragraphs = plainText
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      // Convert single newlines within a paragraph to <br>
      const html = escapeHtml(p).replace(/\n/g, '<br>');
      return `<p style="margin:0 0 16px 0;line-height:1.6">${html}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:640px;margin:0 auto;background:#ffffff">
  <!-- Header -->
  <div style="background:#0B1D3A;padding:24px 32px;color:#ffffff">
    <div style="font-size:18px;font-weight:700;letter-spacing:0.5px">${escapeHtml(meta?.agency || 'Afea Travel')}</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px">Travel Services</div>
  </div>

  <!-- Email meta -->
  <div style="padding:16px 32px;border-bottom:1px solid #eee;font-size:13px;color:#888">
    ${meta?.from ? `<div style="margin-bottom:4px"><span style="color:#666;min-width:60px;display:inline-block">From:</span> ${escapeHtml(meta.from)}</div>` : ''}
    ${meta?.to ? `<div style="margin-bottom:4px"><span style="color:#666;min-width:60px;display:inline-block">To:</span> ${escapeHtml(meta.to)}</div>` : ''}
    ${meta?.subject ? `<div><span style="color:#666;min-width:60px;display:inline-block">Subject:</span> <strong style="color:#333">${escapeHtml(meta.subject)}</strong></div>` : ''}
  </div>

  <!-- Body -->
  <div style="padding:32px;font-size:15px;color:#333">
    ${paragraphs}
  </div>

  <!-- Footer -->
  <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #eee;font-size:11px;color:#aaa;text-align:center">
    Sent via ${escapeHtml(meta?.agency || 'Afea Travel')} &middot; Powered by TravelAgent AI
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
