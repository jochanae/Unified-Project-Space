import { Eye, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { usePartnerBranding } from '@/contexts/PartnerBrandingContext';
import { Button } from '@/components/ui/button';

const PREVIEW_BANNER_OFFSET = 'calc(44px + env(safe-area-inset-top))';

export function PreviewModeBanner() {
  const { isPreviewMode, partner } = usePartnerBranding();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isPreviewMode && partner) {
      document.documentElement.style.setProperty('--preview-banner-offset', PREVIEW_BANNER_OFFSET);
      return;
    }

    document.documentElement.style.setProperty('--preview-banner-offset', '0px');
  }, [isPreviewMode, partner]);

  if (!isPreviewMode || !partner) return null;

  const exitPreview = () => {
    // Remove the partner param from URL
    const params = new URLSearchParams(location.search);
    params.delete('partner');
    const newSearch = params.toString();
    navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      role="status"
      aria-live="polite"
    >
      <div className="h-11 px-4 flex items-center justify-center gap-3">
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium truncate max-w-[70vw]">
          Preview Mode: Viewing as <strong>{partner.name}</strong> partner
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={exitPreview}
          className="h-7 px-2 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
        >
          <X className="h-3 w-3 mr-1" />
          Exit
        </Button>
      </div>
    </div>
  );
}
