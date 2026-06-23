import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Globe, MoreVertical, Plus, Share, Smartphone } from "lucide-react";

export type InstallGuideMode = "ios" | "android" | "preview" | "manual";

interface PwaInstallGuideDialogProps {
  mode: InstallGuideMode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const GUIDE_CONTENT: Record<
  InstallGuideMode,
  {
    eyebrow: string;
    steps: Array<{ body: string; icon: typeof Share; title: string }>;
    title: string;
  }
> = {
  ios: {
    title: "Install IntoIQ on iPhone",
    eyebrow: "Safari doesn't show a native install popup, so use the share menu instead.",
    steps: [
      {
        icon: Share,
        title: "Tap Share",
        body: "Open the Share menu in Safari at the bottom of the screen.",
      },
      {
        icon: Plus,
        title: "Choose Add to Home Screen",
        body: "Scroll the sheet if needed, then confirm to save IntoIQ like an app.",
      },
    ],
  },
  android: {
    title: "Install IntoIQ on Android",
    eyebrow: "If Chrome doesn't show the install sheet automatically, you can still add it manually.",
    steps: [
      {
        icon: MoreVertical,
        title: "Open the browser menu",
        body: "Tap the three-dot menu in Chrome or your mobile browser.",
      },
      {
        icon: Download,
        title: "Tap Install app",
        body: "If you don't see that option, choose Add to Home screen instead.",
      },
    ],
  },
  preview: {
    title: "Install from the live site",
    eyebrow: "Install prompts are blocked inside the editor preview, so open the published IntoIQ site on your phone.",
    steps: [
      {
        icon: Globe,
        title: "Open the published URL",
        body: "Use the live IntoIQ site in Safari or Chrome instead of the preview window.",
      },
      {
        icon: Smartphone,
        title: "Install from your browser",
        body: "Use Share → Add to Home Screen on iPhone, or the browser menu → Install app on Android.",
      },
    ],
  },
  manual: {
    title: "Install IntoIQ manually",
    eyebrow: "Your browser didn't expose the install prompt, but you can still add IntoIQ from the browser menu.",
    steps: [
      {
        icon: MoreVertical,
        title: "Open your browser menu",
        body: "Look for the menu button in the top or bottom toolbar.",
      },
      {
        icon: Download,
        title: "Choose Install or Add to Home Screen",
        body: "The wording varies by browser, but both options save IntoIQ as an app icon.",
      },
    ],
  },
};

export function PwaInstallGuideDialog({ mode, onOpenChange, open }: PwaInstallGuideDialogProps) {
  const content = GUIDE_CONTENT[mode];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm glass border-border/30">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">{content.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <p className="text-sm text-muted-foreground">{content.eyebrow}</p>

          <div className="space-y-4">
            {content.steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-center text-muted-foreground/50">
            Once installed, IntoIQ launches full-screen from your home screen.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}