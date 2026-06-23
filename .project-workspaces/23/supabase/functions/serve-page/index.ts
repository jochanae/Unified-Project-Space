import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { resolveGeo } from "../_shared/resolve-geo.ts";
function buildLocalBusinessScriptTag(info: any): string {
  if (!info || !info.enabled || !info.name) return "";
  const SCHEMA_DAY: Record<string, string> = {
    mo: "Monday", tu: "Tuesday", we: "Wednesday", th: "Thursday",
    fr: "Friday", sa: "Saturday", su: "Sunday",
  };
  const jsonLd: any = {
    "@context": "https://schema.org",
    "@type": (info.businessType || "LocalBusiness").trim() || "LocalBusiness",
    name: String(info.name).trim(),
  };
  if (info.description) jsonLd.description = String(info.description).trim();
  if (info.telephone) jsonLd.telephone = String(info.telephone).trim();
  if (info.email) jsonLd.email = String(info.email).trim();
  if (info.url) jsonLd.url = String(info.url).trim();
  if (info.image) jsonLd.image = String(info.image).trim();
  if (info.priceRange) jsonLd.priceRange = String(info.priceRange).trim();

  const a = info.address || {};
  if (a.street || a.city || a.region || a.postalCode || a.country) {
    jsonLd.address = {
      "@type": "PostalAddress",
      ...(a.street && { streetAddress: String(a.street).trim() }),
      ...(a.city && { addressLocality: String(a.city).trim() }),
      ...(a.region && { addressRegion: String(a.region).trim() }),
      ...(a.postalCode && { postalCode: String(a.postalCode).trim() }),
      ...(a.country && { addressCountry: String(a.country).trim() }),
    };
  }

  if (info.geo?.latitude && info.geo?.longitude) {
    const lat = parseFloat(info.geo.latitude);
    const lng = parseFloat(info.geo.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      jsonLd.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
    }
  }

  if (info.hours) {
    const spec: any[] = [];
    for (const k of ["mo","tu","we","th","fr","sa","su"]) {
      const h = info.hours[k];
      if (h && h.open && h.close) {
        spec.push({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: SCHEMA_DAY[k],
          opens: String(h.open),
          closes: String(h.close),
        });
      }
    }
    if (spec.length) jsonLd.openingHoursSpecification = spec;
  }

  const same = Array.isArray(info.sameAs) ? info.sameAs.map((s: any) => String(s).trim()).filter(Boolean) : [];
  if (same.length) jsonLd.sameAs = same;

  const json = JSON.stringify(jsonLd).replace(/<\//g, "<\\/");
  return `<script type="application/ld+json">${json}</script>`;
}

/** Renders a complete, self-contained HTML landing page */
function renderPage(page: any, project: any, orgId: string, projectId: string, requestUrl: string): string {
  const blocks = page.published_content_blocks || page.content_blocks || [];
  const hero = blocks.find((b: any) => b.type === "hero")?.content;
  const features = blocks.filter((b: any) => b.type === "feature").map((b: any) => b.content);
  const socialProof = blocks.find((b: any) => b.type === "social_proof")?.content?.text;
  const heroImage = hero?.hero_image;
  const videoBlocks = blocks.filter((b: any) => b.type === "video");
  const audioBlocks = blocks.filter((b: any) => b.type === "audio");
  const localBusinessScript = buildLocalBusinessScriptTag(page.local_business);

  function parseVideoEmbed(url: string): { type: string; embedUrl: string } {
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    return { type: "native", embedUrl: url };
  }

  if (!hero) {
    return `<!DOCTYPE html><html><body><h1>Page not configured</h1></body></html>`;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${hero.headline || "Landing Page"}</title>
  <meta name="description" content="${hero.subheadline || ""}" />
  <meta property="og:title" content="${hero.headline || ""}" />
  <meta property="og:description" content="${hero.subheadline || ""}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${requestUrl}" />
  ${heroImage ? `<meta property="og:image" content="${heroImage}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${hero.headline || ""}" />
  <meta name="twitter:description" content="${hero.subheadline || ""}" />
  ${heroImage ? `<meta name="twitter:image" content="${heroImage}" />` : ''}
  ${localBusinessScript}
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #070b10; color: #e8f0f8; min-height: 100vh; -webkit-font-smoothing: antialiased; }
    .serif { font-family: 'Instrument Serif', serif; }
    .container { max-width: 960px; margin: 0 auto; padding: 0 24px; }
    
    /* Hero */
    .hero { position: relative; text-align: center; padding: 120px 24px 80px; overflow: hidden; }
    .hero-bg { position: absolute; inset: 0; z-index: 0; }
    .hero-bg img { width: 100%; height: 100%; object-fit: cover; opacity: 0.3; }
    .hero-bg .overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(7,11,16,0.6), rgba(7,11,16,0.9)); }
    .hero-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; border-radius: 50%; background: rgba(0,200,180,0.06); filter: blur(120px); pointer-events: none; }
    .hero-content { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; }
    .hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 16px; }
    .hero p { font-size: 1.125rem; color: rgba(232,240,248,0.6); max-width: 480px; margin: 0 auto 32px; line-height: 1.6; }
    .cta-btn { display: inline-block; padding: 14px 36px; border-radius: 12px; background: hsl(174, 72%, 50%); color: #070b10; font-weight: 600; font-size: 0.9rem; text-decoration: none; transition: all 0.3s; box-shadow: 0 0 30px rgba(0,200,180,0.25), 0 4px 16px rgba(0,200,180,0.15); }
    .cta-btn:hover { box-shadow: 0 0 40px rgba(0,200,180,0.35); transform: translateY(-1px); }
    
    /* Features */
    .features { padding: 80px 24px; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
    .feature-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px; transition: all 0.3s; }
    .feature-card:hover { border-color: rgba(0,200,180,0.2); box-shadow: 0 0 20px rgba(0,200,180,0.06); }
    .feature-card .icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(0,200,180,0.1); margin-bottom: 16px; display: flex; align-items: center; justify-content: center; }
    .feature-card .icon svg { width: 20px; height: 20px; color: hsl(174, 72%, 50%); }
    .feature-card h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 8px; }
    .feature-card p { font-size: 0.825rem; color: rgba(232,240,248,0.5); line-height: 1.5; }
    
    /* Opt-in */
    .optin { padding: 80px 24px; text-align: center; position: relative; }
    .optin::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, transparent, rgba(0,200,180,0.02), transparent); pointer-events: none; }
    .optin-form { display: flex; gap: 8px; max-width: 420px; margin: 0 auto; position: relative; z-index: 1; }
    .optin-form input { flex: 1; height: 44px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); padding: 0 16px; color: #e8f0f8; font-size: 0.875rem; outline: none; transition: border-color 0.2s; }
    .optin-form input:focus { border-color: rgba(0,200,180,0.4); }
    .optin-form button { padding: 0 24px; height: 44px; border: none; border-radius: 10px; background: hsl(174, 72%, 50%); color: #070b10; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 0 20px rgba(0,200,180,0.2); }
    .optin-form button:hover { box-shadow: 0 0 30px rgba(0,200,180,0.3); }
    .optin h2 { font-size: 1.5rem; margin-bottom: 24px; }
    
    /* Social Proof */
    .social-proof { padding: 40px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.04); }
    .social-proof p { font-size: 0.825rem; color: rgba(232,240,248,0.35); font-style: italic; }
    
    /* Footer */
    footer { text-align: center; padding: 32px; font-size: 0.7rem; color: rgba(232,240,248,0.15); }

    /* Video */
    .video-section { padding: 48px 24px; }
    .video-wrapper { max-width: 800px; margin: 0 auto; }
    .video-title { font-size: 1.1rem; font-weight: 600; text-align: center; margin-bottom: 16px; }
    .video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 16px; background: rgba(14,20,30,0.7); border: 1px solid rgba(232,240,248,0.08); }
    .video-container iframe, .video-container video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 16px; }
    .video-cta { display: flex; justify-content: center; margin-top: 24px; }
    .video-cta .cta-btn { opacity: 0; pointer-events: none; transition: opacity 0.8s ease-in-out; }
    .video-cta .cta-btn.visible { opacity: 1; pointer-events: auto; }
    @keyframes vsl-glow { 0% { box-shadow: 0 0 10px rgba(0,200,180,0.2); transform: scale(0.95); } 50% { box-shadow: 0 0 60px rgba(0,200,180,0.5), 0 0 120px rgba(0,200,180,0.2); transform: scale(1.05); } 100% { box-shadow: 0 0 24px rgba(0,200,180,0.35); transform: scale(1); } }
    .cta-glow { animation: vsl-glow 1.5s ease-in-out; }

    /* Audio */
    .audio-section { padding: 48px 24px; }
    .audio-card { max-width: 600px; margin: 0 auto; padding: 24px; border-radius: 16px; background: rgba(14,20,30,0.7); border: 1px solid rgba(232,240,248,0.08); backdrop-filter: blur(24px); }
    .audio-card p { font-size: 0.875rem; font-weight: 600; margin-bottom: 12px; }
    .audio-card audio { width: 100%; }

    /* Success state */
    .success-msg { display: none; color: hsl(142, 71%, 45%); font-size: 0.875rem; margin-top: 12px; }
    .error-msg { display: none; color: hsl(0, 72%, 51%); font-size: 0.875rem; margin-top: 12px; }

    /* Social proof toast */
    .sp-toast { position: fixed; bottom: 24px; left: 24px; background: rgba(14,20,30,0.95); border: 1px solid rgba(0,200,180,0.15); border-radius: 12px; padding: 12px 18px; display: flex; align-items: center; gap: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); z-index: 9999; transform: translateY(120px); opacity: 0; transition: all 0.5s cubic-bezier(0.4,0,0.2,1); max-width: 320px; backdrop-filter: blur(16px); }
    .sp-toast.visible { transform: translateY(0); opacity: 1; }
    .ef-wrap { margin-bottom: 12px; transition: opacity 0.2s; }
    .ef-label { display: block; font-size: 0.78rem; color: rgba(232,240,248,0.7); margin-bottom: 5px; }
    .ef-input { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #e8f0f8; font-size: 0.875rem; outline: none; box-sizing: border-box; }
    .ef-input:focus { border-color: rgba(0,200,180,0.4); }
    .ef-radio-group { display: flex; flex-direction: column; gap: 6px; }
    .ef-radio, .ef-checkbox { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; color: #e8f0f8; cursor: pointer; }
    .ef-radio input, .ef-checkbox input { accent-color: hsl(174,72%,50%); width: 15px; height: 15px; }
    .ef-checkbox-wrap { padding: 4px 0; }
    .sp-dot { width: 8px; height: 8px; border-radius: 50%; background: hsl(142,71%,45%); flex-shrink: 0; animation: sp-pulse 2s infinite; }
    @keyframes sp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    .sp-toast .sp-text { font-size: 0.8rem; color: rgba(232,240,248,0.8); line-height: 1.4; }
    .sp-toast .sp-text strong { color: #e8f0f8; font-weight: 600; }
    .sp-toast .sp-time { font-size: 0.65rem; color: rgba(232,240,248,0.3); margin-top: 2px; }
  </style>
</head>
<body>
  <!-- Hero -->
  <section class="hero">
    <div class="hero-bg">
      ${heroImage ? `<img src="${heroImage}" alt="Hero" /><div class="overlay"></div>` : ''}
      <div class="hero-glow"></div>
    </div>
    <div class="hero-content">
      <h1 class="serif">${hero.headline}</h1>
      <p>${hero.subheadline}</p>
      <a href="#optin" class="cta-btn">${hero.cta_text}</a>
    </div>
  </section>

  <!-- Features -->
  <section class="features">
    <div class="container">
      <div class="features-grid">
        ${features.map((f: any) => `
        <div class="feature-card">
          <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg></div>
          <h3>${f.title}</h3>
          <p>${f.description}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>

  ${videoBlocks.map((vb: any, vi: number) => {
    const url = vb.content?.url || '';
    const title = vb.content?.title || '';
    const revealSeconds = parseInt(vb.content?.reveal_cta_after_seconds || '0', 10);
    const revealText = vb.content?.reveal_cta_text || '';
    const revealUrl = vb.content?.reveal_cta_url || '#optin';
    if (!url) return '';
    const parsed = parseVideoEmbed(url);
    const isNative = parsed.type === 'native';
    const ctaId = 'vsl-cta-' + vi;
    const videoElId = 'vsl-video-' + vi;
    const storageKey = 'vsl_cta_' + page.id + '_' + vi;
    const showImmediately = revealSeconds <= 0 || !isNative;
    return `<section class="video-section"><div class="video-wrapper">${title ? '<h3 class="video-title serif">' + title + '</h3>' : ''}<div class="video-container">${isNative ? '<video id="' + videoElId + '" controls playsinline controlslist="nodownload" src="' + parsed.embedUrl + '" title="' + title + '"></video>' : '<iframe src="' + parsed.embedUrl + '" title="' + title + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'}</div>${revealText ? '<div class="video-cta"><a id="' + ctaId + '" href="' + revealUrl + '" class="cta-btn' + (showImmediately ? ' visible' : '') + '">' + revealText + '</a></div>' : ''}</div></section>${revealText && isNative && revealSeconds > 0 ? '<script>(function(){var btn=document.getElementById("' + ctaId + '");var vid=document.getElementById("' + videoElId + '");var key="' + storageKey + '";if(sessionStorage.getItem(key)==="revealed"){btn.classList.add("visible");return;}vid.addEventListener("timeupdate",function(){if(vid.currentTime>=' + revealSeconds + '&&!btn.classList.contains("visible")){btn.classList.add("visible","cta-glow");sessionStorage.setItem(key,"revealed");}});})();<\/script>' : ''}`;
  }).join('')}

  ${audioBlocks.map((ab: any) => {
    const url = ab.content?.url || '';
    const title = ab.content?.title || 'Audio';
    if (!url) return '';
    return `<section class="audio-section"><div class="audio-card"><p>${title}</p><audio controls src="${url}">Your browser does not support audio.</audio></div></section>`;
  }).join('')}

  <!-- Opt-in -->
  <section class="optin" id="optin">
    <h2 class="serif">Ready to get started?</h2>
    <form class="optin-form" id="optin-form">
      <input type="email" name="email" placeholder="Enter your email…" required />
      <button type="submit">${hero.cta_text}</button>
    </form>
    ${(() => {
      // Parse extra_fields from the optin block (if any)
      const optinBlock = (page.blocks || []).find((b: any) => b.type === 'optin');
      if (!optinBlock?.content?.extra_fields) return '';
      let fields: any[] = [];
      try { fields = JSON.parse(optinBlock.content.extra_fields); } catch { return ''; }
      if (!fields.length) return '';

      const fieldHtml = fields.map((f: any) => {
        const condAttr = f.show_if
          ? `data-cond-field="${f.show_if.field}" data-cond-val="${f.show_if.equals}" style="display:none"`
          : '';
        const req = f.required ? 'required' : '';
        const id = `ef_${f.id}`;

        if (f.type === 'text') {
          return `<div class="ef-wrap" id="wrap_${f.id}" ${condAttr}>
            <label class="ef-label" for="${id}">${f.label}</label>
            <input class="ef-input" id="${id}" name="${f.id}" type="text" placeholder="${f.placeholder || ''}" ${req} />
          </div>`;
        }
        if (f.type === 'select') {
          const opts = (f.options || '').split(',').map((o: string) => o.trim()).filter(Boolean)
            .map((o: string) => `<option value="${o}">${o}</option>`).join('');
          return `<div class="ef-wrap" id="wrap_${f.id}" ${condAttr}>
            <label class="ef-label" for="${id}">${f.label}</label>
            <select class="ef-input" id="${id}" name="${f.id}" ${req}><option value="">Select…</option>${opts}</select>
          </div>`;
        }
        if (f.type === 'radio') {
          const opts = (f.options || '').split(',').map((o: string) => o.trim()).filter(Boolean)
            .map((o: string) => `<label class="ef-radio"><input type="radio" name="${f.id}" value="${o}" ${req} />${o}</label>`).join('');
          return `<div class="ef-wrap" id="wrap_${f.id}" ${condAttr}>
            <p class="ef-label">${f.label}</p>
            <div class="ef-radio-group">${opts}</div>
          </div>`;
        }
        if (f.type === 'checkbox') {
          return `<div class="ef-wrap ef-checkbox-wrap" id="wrap_${f.id}" ${condAttr}>
            <label class="ef-checkbox"><input type="checkbox" name="${f.id}" value="yes" />${f.label}</label>
          </div>`;
        }
        return '';
      }).join('');

      return `<div id="extra-fields" style="max-width:420px;margin:16px auto 0;text-align:left">${fieldHtml}</div>`;
    })()}
    <p class="success-msg" id="success-msg">🎉 You're in! Check your email.</p>
    <p class="error-msg" id="error-msg">Something went wrong. Please try again.</p>
  </section>

  ${socialProof ? `
  <section class="social-proof">
    <div class="container">
      <p>${socialProof}</p>
    </div>
  </section>` : ''}

  <footer>Built with IntoIQ</footer>

  <!-- Social proof toast -->
  <div class="sp-toast" id="sp-toast">
    <div class="sp-dot"></div>
    <div>
      <div class="sp-text"><strong>Someone just signed up</strong> and joined the community</div>
      <div class="sp-time">just now</div>
    </div>
  </div>

  <!-- Lead capture script -->
  <script>
    const SUPABASE_URL = "${supabaseUrl}";
    const SUPABASE_KEY = "${supabaseKey}";
    const ORG_ID = "${orgId}";
    const PAGE_ID = "${page.id}";
    const PROJECT_ID = "${projectId}";

    // Capture affiliate ref code from URL (?ref=CODE) and persist across
    // funnel page redirects via sessionStorage.
    var _affRef = new URLSearchParams(window.location.search).get('ref')
                  || sessionStorage.getItem('_aff_ref')
                  || '';
    if (_affRef) sessionStorage.setItem('_aff_ref', _affRef);

    document.getElementById("optin-form").addEventListener("submit", async function(e) {
      e.preventDefault();
      const email = this.querySelector('input[name="email"]').value.trim();
      if (!email) return;

      // Collect visible extra field values
      var extraData = {};
      var wraps = document.querySelectorAll('#extra-fields .ef-wrap');
      wraps.forEach(function(wrap) {
        if (wrap.style.display === 'none') return;
        wrap.querySelectorAll('input,select,textarea').forEach(function(el) {
          if (el.type === 'radio') { if (el.checked) extraData[el.name] = el.value; }
          else if (el.type === 'checkbox') { extraData[el.name] = el.checked ? 'yes' : 'no'; }
          else if (el.name) extraData[el.name] = el.value;
        });
      });

      try {
        var payload = { email: email, page_id: PAGE_ID };
        if (Object.keys(extraData).length > 0) payload.extra_fields = extraData;
        if (_affRef) payload.ref_code = _affRef;
        const res = await fetch(SUPABASE_URL + "/functions/v1/submit-public-lead", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
          },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Submission failed");

        // Fire-and-forget welcome email
        fetch(SUPABASE_URL + "/functions/v1/send-welcome-email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY },
          body: JSON.stringify({ email: email, org_id: ORG_ID, project_id: PROJECT_ID }),
        }).catch(function() {});

        if (result.next_slug) {
          window.location.href = window.location.origin + "/" + result.next_slug;
          return;
        }

        document.getElementById("success-msg").style.display = "block";
        document.getElementById("error-msg").style.display = "none";
        this.reset();
      } catch (err) {
        console.error("Submission error:", err);
        document.getElementById("error-msg").style.display = "block";
      }
    });

    // Conditional field visibility engine
    (function() {
      var condWraps = document.querySelectorAll('#extra-fields [data-cond-field]');
      if (!condWraps.length) return;
      function evalConditions() {
        condWraps.forEach(function(wrap) {
          var watchId = wrap.getAttribute('data-cond-field');
          var watchVal = wrap.getAttribute('data-cond-val');
          var current = '';
          var checked = document.querySelector('input[name="' + watchId + '"]:checked');
          if (checked) { current = checked.value; }
          else { var el = document.querySelector('[name="' + watchId + '"]'); if (el) current = el.value; }
          var show = current === watchVal;
          wrap.style.display = show ? 'block' : 'none';
        });
      }
      var form = document.getElementById('optin-form');
      form.addEventListener('change', evalConditions);
      form.addEventListener('input', evalConditions);
      evalConditions();
    })();

    // Social proof notification
    (function() {
      var toast = document.getElementById("sp-toast");
      var times = ["just now", "2 minutes ago", "5 minutes ago", "12 minutes ago"];
      var msgs = ["Someone just signed up", "A new member joined", "Another person signed up"];
      var delay = 8000 + Math.random() * 12000;
      function show() {
        toast.querySelector(".sp-time").textContent = times[Math.floor(Math.random() * times.length)];
        toast.querySelector(".sp-text strong").textContent = msgs[Math.floor(Math.random() * msgs.length)];
        toast.classList.add("visible");
        setTimeout(function() { toast.classList.remove("visible"); setTimeout(show, 20000 + Math.random() * 40000); }, 5000);
      }
      setTimeout(show, delay);
    })();
  </script>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  // Expected path: /serve-page?slug=xxx or via path /serve-page/project-slug
  const slug = url.searchParams.get("slug") || pathParts[pathParts.length - 1];

  if (!slug || slug === "serve-page") {
    return new Response(JSON.stringify({ error: "Page slug required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find the page by slug
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("*, funnel_steps!inner(project_id, projects!inner(id, slug, org_id))")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (pageError || !page) {
      return new Response(`<!DOCTYPE html><html><head><title>Not Found</title></head><body style="background:#070b10;color:#e8f0f8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh"><h1>Page not found</h1></body></html>`, {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const project = (page as any).funnel_steps?.projects;
    const orgId = project?.org_id || "";
    const projectId = project?.id || "";

    // Track page view
    await supabase.from("page_views").insert({
      page_id: page.id,
      org_id: orgId,
      referrer: req.headers.get("referer") || null,
      user_agent: req.headers.get("user-agent") || null,
      country: resolveGeo(req).country,
    });

    const html = renderPage(page, project, orgId, projectId, url.toString());

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (e) {
    console.error("serve-page error:", e);
    return new Response(`<!DOCTYPE html><html><head><title>Error</title></head><body style="background:#070b10;color:#e8f0f8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh"><h1>Something went wrong</h1></body></html>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
});
