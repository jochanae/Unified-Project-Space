import { BuildStreamResult } from '@/features/quinn';

/**
 * Generates a clean, self-contained HTML landing page from the build result.
 * Includes Tailwind via CDN, responsive design, and lead-capture form.
 */
export function generateExportBundle(result: BuildStreamResult, projectName: string): string {
  const { landing_page: lp, strategy } = result;
  const safeProjectName = projectName.toLowerCase().replace(/\s+/g, '-');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(lp.headline)}</title>
  <meta name="description" content="${escapeHtml(lp.subheadline)}" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['DM Sans', 'sans-serif'],
            serif: ['Instrument Serif', 'serif'],
          },
          colors: {
            brand: { DEFAULT: '#14b8a6', dark: '#0d9488', light: '#5eead4' },
          },
        },
      },
    }
  </script>
  <style>
    .gradient-bg {
      background: linear-gradient(135deg, #0a0a1a 0%, #0f172a 50%, #0a0a1a 100%);
    }
    .glow-btn {
      box-shadow: 0 0 20px rgba(20, 184, 166, 0.3), 0 0 60px rgba(20, 184, 166, 0.1);
    }
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
  </style>
</head>
<body class="gradient-bg text-white min-h-screen font-sans antialiased">
  <!-- Navigation -->
  <nav class="flex items-center justify-between px-6 lg:px-12 py-5">
    <span class="text-xl font-serif">${escapeHtml(projectName)}</span>
    <a href="#signup" class="bg-brand hover:bg-brand-dark text-slate-950 font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
      ${escapeHtml(lp.cta_text)}
    </a>
  </nav>

  <!-- Hero -->
  <section class="max-w-4xl mx-auto px-6 pt-16 sm:pt-24 pb-16 text-center">
    ${lp.hero_image ? `<img src="${escapeHtml(lp.hero_image)}" alt="Hero" class="w-full max-w-2xl mx-auto rounded-2xl mb-10 shadow-2xl" />` : ''}
    <h1 class="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] mb-5">
      ${escapeHtml(lp.headline)}
    </h1>
    <p class="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
      ${escapeHtml(lp.subheadline)}
    </p>
    <a href="#signup" class="inline-block bg-brand hover:bg-brand-dark text-slate-950 font-semibold px-8 py-3.5 rounded-xl text-base transition-all glow-btn">
      ${escapeHtml(lp.cta_text)}
    </a>
  </section>

  <!-- Features -->
  <section class="max-w-5xl mx-auto px-6 py-16">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${lp.features.map(f => `
      <div class="glass rounded-2xl p-6">
        <h3 class="font-semibold text-lg mb-2">${escapeHtml(f.title)}</h3>
        <p class="text-sm text-slate-400 leading-relaxed">${escapeHtml(f.description)}</p>
      </div>`).join('')}
    </div>
  </section>

  <!-- Social Proof -->
  ${lp.social_proof ? `
  <section class="max-w-3xl mx-auto px-6 py-12 text-center">
    <div class="glass rounded-2xl px-8 py-6">
      <p class="text-slate-400 italic">"${escapeHtml(lp.social_proof)}"</p>
    </div>
  </section>` : ''}

  <!-- Lead Capture -->
  <section id="signup" class="max-w-xl mx-auto px-6 py-16 text-center">
    <h2 class="font-serif text-2xl sm:text-3xl mb-3">Ready to Get Started?</h2>
    <p class="text-slate-400 text-sm mb-6">${escapeHtml(strategy.hook || 'Join now and take the first step.')}</p>
    <form onsubmit="handleSubmit(event)" class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        name="email"
        required
        placeholder="Enter your email"
        class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand/50 transition-colors"
      />
      <button type="submit" class="bg-brand hover:bg-brand-dark text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm transition-all glow-btn whitespace-nowrap">
        ${escapeHtml(lp.cta_text)}
      </button>
    </form>
    <p id="success-msg" class="text-brand text-sm mt-3 hidden">Thanks! You're in.</p>
  </form>
  </section>

  <!-- Footer -->
  <footer class="text-center py-8 text-xs text-slate-600 border-t border-white/5">
    <p>Built with IntoIQ — ${escapeHtml(strategy.positioning)}</p>
  </footer>

  <script>
    function handleSubmit(e) {
      e.preventDefault();
      var email = e.target.email.value;
      // Replace this with your own lead capture endpoint
      // Lead captured — wire to your endpoint
      document.getElementById('success-msg').classList.remove('hidden');
      e.target.email.value = '';
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
