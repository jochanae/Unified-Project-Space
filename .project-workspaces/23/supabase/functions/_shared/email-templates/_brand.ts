// Shared cinematic brand styling for IntoIQ auth emails.
// White email body (mandatory) with deep-teal accents and Instrument Serif headings.

export const brand = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: 0,
    padding: '40px 0',
  },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '0',
    backgroundColor: '#ffffff',
  },
  header: {
    padding: '0 32px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  logo: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: '28px',
    fontWeight: 400 as const,
    color: '#0a1f24',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  tagline: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '4px 0 0',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  body: {
    padding: '32px',
  },
  h1: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: '28px',
    fontWeight: 400 as const,
    color: '#0a1f24',
    margin: '0 0 20px',
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  text: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: 1.6,
    margin: '0 0 20px',
  },
  button: {
    backgroundColor: '#14b8a6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600 as const,
    borderRadius: '8px',
    padding: '14px 28px',
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '0.02em',
  },
  link: {
    color: '#14b8a6',
    textDecoration: 'underline',
  },
  code: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontSize: '28px',
    fontWeight: 600 as const,
    color: '#0a1f24',
    backgroundColor: '#f0fdfa',
    border: '1px solid #ccfbf1',
    borderRadius: '8px',
    padding: '16px 24px',
    margin: '0 0 24px',
    letterSpacing: '0.2em',
    textAlign: 'center' as const,
  },
  footer: {
    padding: '24px 32px',
    borderTop: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#9ca3af',
    lineHeight: 1.5,
  },
}
