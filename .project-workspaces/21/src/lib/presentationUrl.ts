/**
 * Auto-converts common share URLs into embeddable iframe-friendly formats.
 * Falls through unchanged for anything it doesn't recognise.
 *
 * Supported platforms:
 *  • Google Slides / Docs / Sheets
 *  • YouTube (standard, shortened, nocookie)
 *  • Canva (designs & presentations)
 *  • Figma (files & prototypes)
 *  • Prezi
 *  • PresentQ
 *  • Loom
 *  • Vimeo
 *  • Microsoft Office 365 / OneDrive (PowerPoint, Word, Excel)
 *  • Notion (public pages)
 *  • Miro (boards)
 *  • PDF files (via Google Docs viewer fallback)
 */
export function toEmbedUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');

    // ── Google Slides ──
    if (host === 'docs.google.com' && u.pathname.includes('/presentation/')) {
      const match = u.pathname.match(/\/presentation\/d\/([^/]+)/);
      if (match) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=60000`;
      }
    }

    // ── Google Docs ──
    if (host === 'docs.google.com' && u.pathname.includes('/document/')) {
      const match = u.pathname.match(/\/document\/d\/([^/]+)/);
      if (match) {
        return `https://docs.google.com/document/d/${match[1]}/pub?embedded=true`;
      }
    }

    // ── Google Sheets ──
    if (host === 'docs.google.com' && u.pathname.includes('/spreadsheets/')) {
      const match = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
      if (match) {
        return `https://docs.google.com/spreadsheets/d/${match[1]}/pub?embedded=true`;
      }
    }

    // ── YouTube ──
    if (host.includes('youtube.com') || host === 'youtu.be' || host === 'youtube-nocookie.com') {
      let videoId: string | null = null;
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1).split('/')[0];
      } else {
        videoId = u.searchParams.get('v');
        // Handle /embed/ URLs
        if (!videoId) {
          const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
          if (embedMatch) videoId = embedMatch[1];
        }
      }
      if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
      }
    }

    // ── Canva ──
    // Share URLs: canva.com/design/XXXXX/view  →  embed format
    if (host === 'canva.com' || host.endsWith('.canva.com')) {
      const designMatch = u.pathname.match(/\/design\/([^/]+)/);
      if (designMatch) {
        // Canva embeds use /design/ID/view?embed
        return `https://www.canva.com/design/${designMatch[1]}/view?embed`;
      }
      // Already an embed or other Canva link — pass through
      return raw;
    }

    // ── Figma ──
    // figma.com/file/XXX or figma.com/proto/XXX → Figma embed
    if (host === 'figma.com' || host.endsWith('.figma.com')) {
      if (u.pathname.startsWith('/file/') || u.pathname.startsWith('/proto/') || u.pathname.startsWith('/design/') || u.pathname.startsWith('/board/')) {
        return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(raw)}`;
      }
      return raw;
    }

    // ── Prezi ──
    // prezi.com/v/XXXXX or prezi.com/p/XXXXX → embed
    if (host === 'prezi.com') {
      const preziMatch = u.pathname.match(/\/(?:v|p)\/([^/]+)/);
      if (preziMatch) {
        return `https://prezi.com/p/${preziMatch[1]}/embed/`;
      }
      return raw;
    }

    // ── PresentQ ──
    // presentq.app/view/UUID → embed
    if (host === 'presentq.app') {
      const pqMatch = u.pathname.match(/\/view\/([^/]+)/);
      if (pqMatch) {
        return `https://presentq.app/embed/${pqMatch[1]}`;
      }
      return raw;
    }

    // ── Loom ──
    // loom.com/share/XXXXX → embed
    if (host === 'loom.com' || host.endsWith('.loom.com')) {
      const loomMatch = u.pathname.match(/\/share\/([^/?]+)/);
      if (loomMatch) {
        return `https://www.loom.com/embed/${loomMatch[1]}`;
      }
      return raw;
    }

    // ── Vimeo ──
    // vimeo.com/123456 → player embed
    if (host === 'vimeo.com') {
      const vimeoMatch = u.pathname.match(/^\/(\d+)/);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?badge=0&autopause=0`;
      }
      return raw;
    }

    // ── Microsoft Office 365 / OneDrive ──
    // Handles powerpoint, word, excel online embeds
    if (host.includes('onedrive.live.com') || host.includes('sharepoint.com') || host.includes('office.com')) {
      // If it's already an embed link, pass through
      if (u.searchParams.has('action') && u.searchParams.get('action') === 'embedview') {
        return raw;
      }
      // Convert view links to embed: add action=embedview
      if (u.pathname.includes('/:p:/') || u.pathname.includes('/:w:/') || u.pathname.includes('/:x:/')) {
        u.searchParams.set('action', 'embedview');
        return u.toString();
      }
      return raw;
    }

    // ── Notion ──
    // notion.site or notion.so public pages
    if (host === 'notion.site' || host === 'notion.so' || host.endsWith('.notion.site')) {
      return raw; // Notion public pages embed directly via iframe
    }

    // ── Miro ──
    // miro.com/app/board/XXX → embed
    if (host === 'miro.com') {
      const miroMatch = u.pathname.match(/\/app\/board\/([^/?]+)/);
      if (miroMatch) {
        return `https://miro.com/app/embed/${miroMatch[1]}/`;
      }
      return raw;
    }

    // ── Direct PDF links → Google Docs viewer ──
    if (raw.toLowerCase().endsWith('.pdf')) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(raw)}&embedded=true`;
    }

    // ── Everything else – pass through ──
    return raw;
  } catch {
    return raw;
  }
}

/**
 * Returns a user-friendly label for the detected platform, or null.
 */
export function detectPlatformLabel(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host === 'docs.google.com') return 'Google Workspace';
    if (host.includes('youtube') || host === 'youtu.be') return 'YouTube';
    if (host.includes('canva.com')) return 'Canva';
    if (host.includes('figma.com')) return 'Figma';
    if (host === 'prezi.com') return 'Prezi';
    if (host === 'presentq.app') return 'PresentQ';
    if (host.includes('loom.com')) return 'Loom';
    if (host === 'vimeo.com') return 'Vimeo';
    if (host.includes('onedrive') || host.includes('sharepoint') || host.includes('office.com')) return 'Microsoft 365';
    if (host.includes('notion')) return 'Notion';
    if (host === 'miro.com') return 'Miro';
    if (url.toLowerCase().endsWith('.pdf')) return 'PDF';
    return null;
  } catch {
    return null;
  }
}
