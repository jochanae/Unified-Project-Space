import { BrandColors } from '@/features/assets/components/BrandColorPicker';
import { PageBlock, FunnelPage } from '@/types/funnelhub';
import { LocalBusinessInfo, renderLocalBusinessScriptTag } from './local-business-schema';

/** Convert various YouTube/Vimeo URLs into embeddable iframe URLs. Returns null for non-embeddable URLs. */
function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  if (url.includes('/embed/') || url.includes('player.vimeo.com')) return url;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  if (url.includes('youtube') || url.includes('vimeo')) return url;
  return null;
}

const BRAND_STORAGE_KEY = 'brand_colors_';

export function getBrandColors(projectId: string): BrandColors {
  try {
    const saved = localStorage.getItem(BRAND_STORAGE_KEY + projectId);
    return saved ? JSON.parse(saved) : { primary: '#c8521a', accent: '#e8a87c', background: '#faf8f5', text: '#1a1a1a' };
  } catch {
    return { primary: '#c8521a', accent: '#e8a87c', background: '#faf8f5', text: '#1a1a1a' };
  }
}

export function blockToHTML(block: PageBlock, colors: BrandColors): string {
  const c = block.content;
  const { primary, accent, background, text } = colors;

  switch (block.type) {
    case 'hero':
      return `<section style="text-align:center;padding:80px 20px;background:${background}"><h1 style="font-size:48px;margin-bottom:16px;color:${text}">${c.headline}</h1><p style="font-size:20px;color:${text};opacity:0.7;margin-bottom:32px">${c.subheadline}</p><a href="${c.buttonUrl}" style="background:${primary};color:white;padding:16px 32px;border-radius:8px;text-decoration:none;font-weight:600">${c.buttonText}</a></section>`;
    case 'text':
      return `<section style="max-width:700px;margin:40px auto;padding:0 20px;line-height:1.8;color:${text}">${c.content}</section>`;
    case 'cta':
      return `<div style="text-align:center;padding:40px"><a href="${c.url}" style="background:${primary};color:white;padding:16px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:18px">${c.text}</a></div>`;
    case 'image':
      return `<div style="text-align:center;padding:20px"><img src="${c.url}" alt="${c.alt}" style="max-width:100%;border-radius:12px" /></div>`;
    case 'testimonial':
      return `<blockquote style="max-width:600px;margin:40px auto;padding:32px;border-left:4px solid ${primary};background:${accent}22;border-radius:0 12px 12px 0"><p style="font-size:18px;font-style:italic;margin-bottom:16px;color:${text}">${c.quote}</p><footer><strong style="color:${text}">${c.author}</strong><br/><small style="color:${text};opacity:0.6">${c.role}</small></footer></blockquote>`;
    case 'optin':
      return `<section style="text-align:center;padding:60px 20px;background:${primary};color:white;border-radius:16px;max-width:600px;margin:40px auto"><h2 style="margin-bottom:20px">${c.headline}</h2><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><input placeholder="${c.placeholder}" style="padding:12px 20px;border-radius:8px;border:none;min-width:250px" /><button style="background:${accent};color:${text};padding:12px 24px;border-radius:8px;border:none;font-weight:600">${c.buttonText}</button></div></section>`;
    case 'video': {
      const embedUrl = toEmbedUrl(c.url || '');
      if (embedUrl) {
        return `<div style="text-align:center;padding:20px;max-width:800px;margin:0 auto"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px"><iframe src="${embedUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen title="${c.title}"></iframe></div></div>`;
      }
      return `<div style="text-align:center;padding:20px;max-width:800px;margin:0 auto"><video controls style="width:100%;border-radius:12px" src="${c.url}"><p>${c.title}</p></video></div>`;
    }
    case 'audio':
      return `<div style="max-width:600px;margin:20px auto;padding:20px"><p style="font-weight:600;margin-bottom:8px;color:${text}">${c.title}</p><audio controls style="width:100%" src="${c.url}" ${c.autoplay === 'true' ? 'autoplay' : ''}>Your browser does not support audio.</audio></div>`;
    case 'countdown': {
      const targetDate = c.target_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
      return `<section style="text-align:center;padding:60px 20px;background:${background}">
<h2 style="font-size:28px;margin-bottom:8px;color:${text}">${c.headline || 'Offer Ends Soon'}</h2>
<p style="color:${text};opacity:0.6;margin-bottom:24px">${c.subtext || ''}</p>
<div id="countdown-${block.id}" style="display:flex;justify-content:center;gap:16px;font-size:32px;font-weight:700;color:${primary}">
<div><span class="cd-days">00</span><small style="display:block;font-size:12px;font-weight:400;color:${text};opacity:0.5">Days</small></div>
<div><span class="cd-hours">00</span><small style="display:block;font-size:12px;font-weight:400;color:${text};opacity:0.5">Hours</small></div>
<div><span class="cd-mins">00</span><small style="display:block;font-size:12px;font-weight:400;color:${text};opacity:0.5">Minutes</small></div>
<div><span class="cd-secs">00</span><small style="display:block;font-size:12px;font-weight:400;color:${text};opacity:0.5">Seconds</small></div>
</div>
<script>(function(){var t=new Date("${targetDate}").getTime(),el=document.getElementById("countdown-${block.id}");if(!el)return;setInterval(function(){var n=t-Date.now();if(n<0){el.innerHTML="<p>Time's up!</p>";return;}el.querySelector(".cd-days").textContent=Math.floor(n/86400000);el.querySelector(".cd-hours").textContent=Math.floor(n%86400000/3600000);el.querySelector(".cd-mins").textContent=Math.floor(n%3600000/60000);el.querySelector(".cd-secs").textContent=Math.floor(n%60000/1000);},1000);})();</script>
</section>`;
    }
    case 'faq': {
      const items = parseFaqItems(c);
      return `<section style="max-width:700px;margin:40px auto;padding:0 20px">
<h2 style="font-size:28px;margin-bottom:24px;color:${text}">${c.heading || 'Frequently Asked Questions'}</h2>
${items.map((item, i) => `<details style="border-bottom:1px solid ${accent}33;padding:16px 0;cursor:pointer">
<summary style="font-weight:600;color:${text};list-style:none;display:flex;justify-content:space-between;align-items:center">${item.q}<span style="color:${primary}">+</span></summary>
<p style="padding-top:12px;line-height:1.7;color:${text};opacity:0.7">${item.a}</p>
</details>`).join('\n')}
</section>`;
    }
    case 'pricing': {
      const plans = parsePricingPlans(c);
      return `<section style="text-align:center;padding:60px 20px;background:${background}">
<h2 style="font-size:32px;margin-bottom:8px;color:${text}">${c.heading || 'Pricing'}</h2>
<p style="color:${text};opacity:0.6;margin-bottom:32px">${c.subtext || 'Choose the plan that fits you'}</p>
<div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap">
${plans.map(plan => `<div style="background:white;border:2px solid ${plan.featured ? primary : accent + '44'};border-radius:16px;padding:32px 24px;min-width:240px;max-width:300px;flex:1;${plan.featured ? `box-shadow:0 8px 30px ${primary}22` : ''}">
${plan.featured ? `<span style="background:${primary};color:white;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:600">Most Popular</span>` : ''}
<h3 style="font-size:20px;margin:12px 0 4px;color:${text}">${plan.name}</h3>
<p style="font-size:36px;font-weight:700;color:${primary};margin:8px 0">${plan.price}</p>
<p style="font-size:13px;color:${text};opacity:0.5;margin-bottom:16px">${plan.period || ''}</p>
<ul style="list-style:none;padding:0;margin-bottom:24px;text-align:left">${plan.features.map(f => `<li style="padding:6px 0;font-size:14px;color:${text}">✓ ${f}</li>`).join('')}</ul>
<a href="${plan.cta_url || '#'}" style="display:block;background:${plan.featured ? primary : accent};color:${plan.featured ? 'white' : text};padding:12px;border-radius:8px;text-decoration:none;font-weight:600">${plan.cta_text || 'Get Started'}</a>
</div>`).join('\n')}
</div>
</section>`;
    }
    case 'divider': {
      const h = parseInt(c.height || '40', 10);
      const style = c.style || 'line';
      if (style === 'space') {
        return `<div style="height:${h}px"></div>`;
      }
      return `<div style="padding:${h / 2}px 20px;max-width:700px;margin:0 auto"><hr style="border:none;border-top:1px solid ${accent}44;margin:0" /></div>`;
    }
    case 'columns': {
      const cols = parseInt(c.layout || '2', 10);
      const bgColor = c.bg_color || '';
      const bgImage = c.bg_image || '';
      const sectionBg = bgImage
        ? `background:url('${bgImage}') center/cover no-repeat${bgColor ? `;background-color:${bgColor}` : ''}`
        : bgColor ? `background:${bgColor}` : '';
      const colItems: string[] = [];
      for (let i = 1; i <= cols; i++) {
        const img = c[`col${i}_image`] || '';
        const h = c[`col${i}_headline`] || '';
        const t = c[`col${i}_text`] || '';
        const imgTag = img ? `<img src="${img}" alt="" style="width:64px;height:64px;object-fit:contain;margin-bottom:12px;border-radius:8px" />` : '';
        colItems.push(`<div style="flex:1;min-width:200px;padding:24px;background:white;border:1px solid ${accent}33;border-radius:12px;text-align:center">${imgTag}<h3 style="font-size:18px;font-weight:600;margin-bottom:8px;color:${text}">${h}</h3><p style="font-size:14px;line-height:1.7;color:${text};opacity:0.7;text-align:left">${t}</p></div>`);
      }
      return `<section style="padding:40px 20px;${sectionBg}"><div style="max-width:900px;margin:0 auto"><div style="display:flex;gap:20px;flex-wrap:wrap">${colItems.join('')}</div></div></section>`;
    }
    case 'youtube': {
      const embedUrl = toEmbedUrl(c.url || '');
      const src = embedUrl || c.url || '';
      return `<div style="text-align:center;padding:20px;max-width:800px;margin:0 auto"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px"><iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen loading="lazy" title="${c.title || 'YouTube video'}"></iframe></div></div>`;
    }
    case 'tiktok': {
      const tiktokUrl = c.url || '';
      const videoIdMatch = tiktokUrl.match(/video\/(\d+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : '';
      if (!videoId) return `<div style="text-align:center;padding:40px;color:${text};opacity:0.5">Paste a TikTok video URL to embed it here.</div>`;
      return `<div style="text-align:center;padding:20px;max-width:400px;margin:0 auto"><blockquote class="tiktok-embed" cite="${tiktokUrl}" data-video-id="${videoId}" style="max-width:400px;min-width:300px"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script></div>`;
    }
    case 'heygen': {
      const heygenUrl = c.url || '';
      if (!heygenUrl) return `<div style="text-align:center;padding:40px;color:${text};opacity:0.5">Paste your HeyGen avatar embed URL here.</div>`;
      return `<div style="text-align:center;padding:20px;max-width:800px;margin:0 auto"><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px"><iframe src="${heygenUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe></div></div>`;
    }
    case 'calendly': {
      const calendlyUrl = c.url || 'https://calendly.com';
      const h = c.height || '700';
      return `<div style="max-width:800px;margin:20px auto;padding:0 20px"><div style="border-radius:12px;overflow:hidden;border:1px solid ${accent}33"><iframe src="${calendlyUrl}" style="width:100%;height:${h}px;border:none" loading="lazy" title="${c.title || 'Schedule'}"></iframe></div></div>`;
    }
    case 'scheduler': {
      const schedUrl = c.url || '';
      const h = c.height || '700';
      const provider = c.provider || 'Scheduler';
      if (!schedUrl) return `<div style="text-align:center;padding:40px;color:${text};opacity:0.5">Paste your ${provider} embed URL (Cal.com, Acuity, SavvyCal, TidyCal, YouCanBookMe, etc.).</div>`;
      return `<div style="max-width:800px;margin:20px auto;padding:0 20px"><div style="border-radius:12px;overflow:hidden;border:1px solid ${accent}33"><iframe src="${schedUrl}" style="width:100%;height:${h}px;border:none" loading="lazy" title="${c.title || provider}" allow="payment"></iframe></div></div>`;
    }
    case 'upsell': {
      const badge         = c.badge         || 'Special One-Time Offer';
      const headline      = c.headline      || 'Wait — Add This Before You Go';
      const offerName     = c.offer_name    || 'VIP Upgrade';
      const desc          = c.description   || '';
      const imgUrl        = c.image_url     || '';
      const origPrice     = c.original_price || '';
      const upsellPrice   = c.upsell_price  || '';
      const yesText       = c.yes_text      || 'Yes! Add This to My Order →';
      const yesUrl        = c.yes_url       || '#';
      const noText        = c.no_text       || 'No thanks, I don\'t want this.';
      const noUrl         = c.no_url        || '#';
      const urgency       = c.urgency_text  || '';

      return `<section style="background:${background};padding:60px 20px;text-align:center">
  <div style="max-width:640px;margin:0 auto">
    <div style="display:inline-block;background:${primary};color:#fff;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:6px 18px;border-radius:100px;margin-bottom:24px">${badge}</div>
    <h2 style="font-size:clamp(22px,4vw,34px);font-weight:800;color:${text};line-height:1.2;margin:0 0 12px">${headline}</h2>
    ${imgUrl ? `<img src="${imgUrl}" alt="${offerName}" style="width:100%;max-width:420px;border-radius:12px;margin:24px auto;display:block;box-shadow:0 12px 40px rgba(0,0,0,0.18)" />` : ''}
    <div style="background:${primary}12;border:1.5px solid ${primary}30;border-radius:16px;padding:28px 24px;margin:28px 0;text-align:left">
      <p style="font-size:18px;font-weight:700;color:${text};margin:0 0 10px">${offerName}</p>
      ${desc ? `<p style="font-size:15px;line-height:1.65;color:${text};opacity:0.75;margin:0 0 20px">${desc}</p>` : ''}
      <div style="display:flex;align-items:baseline;gap:12px">
        ${origPrice ? `<span style="font-size:18px;color:${text};opacity:0.4;text-decoration:line-through">${origPrice}</span>` : ''}
        ${upsellPrice ? `<span style="font-size:36px;font-weight:800;color:${primary}">${upsellPrice}</span>` : ''}
      </div>
    </div>
    <a href="${yesUrl}" style="display:block;background:${primary};color:#fff;font-size:17px;font-weight:700;padding:18px 32px;border-radius:12px;text-decoration:none;margin:0 0 12px;box-shadow:0 8px 28px ${primary}44;transition:opacity 0.2s" onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">${yesText}</a>
    ${urgency ? `<p style="font-size:12px;color:${text};opacity:0.5;margin:0 0 16px;font-style:italic">${urgency}</p>` : ''}
    <a href="${noUrl}" style="display:block;font-size:12px;color:${text};opacity:0.45;text-decoration:underline;padding:8px;cursor:pointer">${noText}</a>
  </div>
</section>`;
    }
    default:
      return '';
  }
}

/** Parse FAQ items from block content: q1/a1, q2/a2, etc. */
function parseFaqItems(content: Record<string, string>): { q: string; a: string }[] {
  const items: { q: string; a: string }[] = [];
  for (let i = 1; i <= 10; i++) {
    const q = content[`q${i}`];
    const a = content[`a${i}`];
    if (q && a) items.push({ q, a });
  }
  return items;
}

/** Parse pricing plans from block content: plan1_name, plan1_price, etc. */
function parsePricingPlans(content: Record<string, string>): { name: string; price: string; period: string; features: string[]; cta_text: string; cta_url: string; featured: boolean }[] {
  const plans: any[] = [];
  for (let i = 1; i <= 4; i++) {
    const name = content[`plan${i}_name`];
    if (!name) continue;
    plans.push({
      name,
      price: content[`plan${i}_price`] || '$0',
      period: content[`plan${i}_period`] || '/month',
      features: (content[`plan${i}_features`] || '').split(',').map(f => f.trim()).filter(Boolean),
      cta_text: content[`plan${i}_cta`] || 'Get Started',
      cta_url: content[`plan${i}_url`] || '#',
      featured: content[`plan${i}_featured`] === 'true',
    });
  }
  return plans;
}

export function generateFullHTML(page: FunnelPage, colors: BrandColors, localBusiness?: LocalBusinessInfo | null): string {
  const jsonLd = renderLocalBusinessScriptTag(localBusiness);
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${page.title}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${colors.text};background:${colors.background}}details summary::-webkit-details-marker{display:none}</style>
${jsonLd}
</head><body>
${page.blocks.map(b => blockToHTML(b, colors)).join('\n')}
<script>
(function(){try{
  var p=new URLSearchParams(location.search);
  if(p.get('booked')!=='1') return;
  var email=(p.get('email')||'').trim().toLowerCase();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  var key='intoiq_booked_'+${JSON.stringify(page.id)}+'_'+email;
  if(sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key,'1');
  fetch('https://vrrnvwxzrmqmbxaraivz.supabase.co/functions/v1/tag-booking-event',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:email,page_id:${JSON.stringify(page.id)},provider:p.get('provider')||''})
  }).catch(function(){});
}catch(e){}})();
</script>
</body></html>`;
}
