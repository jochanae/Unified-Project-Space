import { useState, useRef } from 'react';
import { Copy, Check, ExternalLink, Share2, Globe, Link2, Twitter, Facebook, Linkedin, MessageCircle, QrCode, Download, Palette, ImagePlus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { getBrandColors } from '@/features/pages/utils/html-generator';

interface ShareLinkGeneratorProps {
  projectId: string;
  projectName: string;
  projectSlug: string;
  deployed?: boolean;
}

const SOCIAL_CHANNELS = [
  { key: 'twitter', label: 'X / Twitter', icon: Twitter, buildUrl: (url: string, text: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { key: 'facebook', label: 'Facebook', icon: Facebook, buildUrl: (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, buildUrl: (url: string, _text: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, buildUrl: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}` },
];

export function ShareLinkGenerator({ projectId, projectName, projectSlug, deployed }: ShareLinkGeneratorProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrFg, setQrFg] = useState('#000000');
  const [qrBg, setQrBg] = useState('#ffffff');
  const [logoUrl, setLogoUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const brandColors = getBrandColors(projectId);

  const baseUrl = deployed
    ? `https://${projectSlug}.intoiq.app`
    : `${window.location.origin}`;

  const buildUrl = () => {
    const url = new URL(baseUrl);
    if (utmSource) url.searchParams.set('utm_source', utmSource);
    if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
    if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
    return url.toString();
  };

  const finalUrl = buildUrl();

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const applyBrandPalette = () => {
    setQrFg(brandColors.primary);
    setQrBg(brandColors.background);
    toast.success('Brand colors applied to QR code');
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement('a');
      a.download = `${projectSlug}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      toast.success('QR code downloaded');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shareText = `Check out ${projectName}!`;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" /> Share & Link Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
          deployed
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
        )}>
          <Globe className="h-3.5 w-3.5" />
          {deployed ? 'Your funnel is live and shareable' : 'Deploy your funnel to get a public URL'}
        </div>

        {/* Main URL with copy */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 text-sm font-mono truncate',
            deployed ? 'border-green-500/20' : 'border-border'
          )}>
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate text-xs">{finalUrl}</span>
          </div>
          <Button
            size="sm"
            variant={copied === 'URL' ? 'default' : 'outline'}
            onClick={() => handleCopy('URL', finalUrl)}
            className={cn('shrink-0 gap-1.5', copied === 'URL' && 'bg-green-600 hover:bg-green-600')}
          >
            {copied === 'URL' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === 'URL' ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* UTM Builder */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">UTM Campaign Tracking</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Source</label>
              <Input value={utmSource} onChange={e => setUtmSource(e.target.value)} placeholder="instagram" className="text-xs h-8" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Medium</label>
              <Input value={utmMedium} onChange={e => setUtmMedium(e.target.value)} placeholder="social" className="text-xs h-8" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground">Campaign</label>
              <Input value={utmCampaign} onChange={e => setUtmCampaign(e.target.value)} placeholder="launch" className="text-xs h-8" />
            </div>
          </div>
        </div>

        {/* Quick share buttons */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Quick Share</p>
          <div className="flex gap-2 flex-wrap">
            {SOCIAL_CHANNELS.map(({ key, label, icon: Icon, buildUrl: buildShareUrl }) => (
              <a
                key={key}
                href={buildShareUrl(finalUrl, shareText)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-xs text-muted-foreground hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">QR Code</p>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setShowQR(!showQR)}>
              <QrCode className="h-3.5 w-3.5" />
              {showQR ? 'Hide' : 'Show'} QR
            </Button>
          </div>
          {showQR && (
            <div className="space-y-3 p-4 rounded-lg border border-border">
              {/* QR Preview */}
              <div className="flex justify-center rounded-lg p-2" ref={qrRef} style={{ backgroundColor: qrBg }}>
                <QRCodeSVG
                  value={finalUrl}
                  size={180}
                  bgColor={qrBg}
                  fgColor={qrFg}
                  level="H"
                  includeMargin
                  imageSettings={logoUrl ? {
                    src: logoUrl,
                    height: 36,
                    width: 36,
                    excavate: true,
                  } : undefined}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center max-w-[200px] mx-auto truncate">{finalUrl}</p>

              {/* QR Color Customization */}
              <div className="space-y-2 pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1"><Palette className="h-3 w-3" /> Customize QR</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Foreground</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={qrFg} onChange={e => setQrFg(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                      <Input value={qrFg} onChange={e => setQrFg(e.target.value)} className="text-[10px] h-7 font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Background</label>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={qrBg} onChange={e => setQrBg(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" />
                      <Input value={qrBg} onChange={e => setQrBg(e.target.value)} className="text-[10px] h-7 font-mono" />
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={applyBrandPalette}>
                  <Palette className="h-3 w-3" /> Use Brand Colors
                </Button>
              </div>

              {/* Logo embed */}
              <div className="space-y-1.5 pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1"><ImagePlus className="h-3 w-3" /> Center Logo (optional)</p>
                <div
                  className={`flex gap-2 rounded-lg p-1 transition-colors ${dragOver ? 'bg-primary/10 ring-1 ring-primary/40' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (!file || !file.type.startsWith('image/')) return;
                    const reader = new FileReader();
                    reader.onload = () => setLogoUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                >
                  <Input
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    placeholder={dragOver ? 'Drop image here…' : 'Paste logo URL…'}
                    className="text-xs h-8 flex-1"
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setLogoUrl(reader.result as string);
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                  <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => logoInputRef.current?.click()} title="Upload logo">
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {logoUrl && (
                  <div className="flex items-center gap-2 mt-1">
                    <img src={logoUrl} alt="Logo preview" className="h-8 w-8 rounded border border-border object-contain bg-white" />
                    <span className="text-[10px] text-muted-foreground truncate flex-1">Logo selected</span>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setLogoUrl('')}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {/* Download */}
              <Button variant="outline" size="sm" className="text-xs gap-1.5 w-full" onClick={downloadQR}>
                <Download className="h-3 w-3" /> Download PNG
              </Button>
            </div>
          )}
        </div>

        {/* Copy formatted links */}
        <div className="flex gap-2 pt-2 border-t border-border/30 flex-wrap min-w-0">
          <Button variant="ghost" size="sm" className="text-xs flex-1 min-w-0 truncate" onClick={() => handleCopy('HTML', `<a href="${finalUrl}">${projectName}</a>`)}>
            {copied === 'HTML' ? <Check className="h-3 w-3 mr-1 shrink-0" /> : <Copy className="h-3 w-3 mr-1 shrink-0" />}
            <span className="truncate">Copy HTML</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-xs flex-1 min-w-0 truncate" onClick={() => handleCopy('Markdown', `[${projectName}](${finalUrl})`)}>
            {copied === 'Markdown' ? <Check className="h-3 w-3 mr-1 shrink-0" /> : <Copy className="h-3 w-3 mr-1 shrink-0" />}
            <span className="truncate">Copy MD</span>
          </Button>
          {deployed && (
            <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
              <Button variant="ghost" size="sm" className="text-xs w-full">
                <ExternalLink className="h-3 w-3 mr-1" /> Open
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}