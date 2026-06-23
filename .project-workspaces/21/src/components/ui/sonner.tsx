import { useTheme } from "@/hooks/useTheme";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { sfxNotification } from "@/hooks/useAppSfx";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      gap={8}
      offset={20}
      closeButton={false}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "group toast welcome-toast",
          description: "group-[.toast]:text-white/50",
          actionButton: "toast-button",
          cancelButton:
            "group-[.toast]:bg-white/5 group-[.toast]:text-white/40",
        },
      }}
      {...props}
    />
  );
};

// Wrap sonner's toast to auto-play notification chime
const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => {
    sfxNotification();
    return sonnerToast(...args);
  },
  {
    success: (...args: Parameters<typeof sonnerToast.success>) => { sfxNotification(); return sonnerToast.success(...args); },
    error: (...args: Parameters<typeof sonnerToast.error>) => { sfxNotification(); return sonnerToast.error(...args); },
    info: (...args: Parameters<typeof sonnerToast.info>) => { sfxNotification(); return sonnerToast.info(...args); },
    warning: (...args: Parameters<typeof sonnerToast.warning>) => { sfxNotification(); return sonnerToast.warning(...args); },
    loading: (...args: Parameters<typeof sonnerToast.loading>) => sonnerToast.loading(...args),
    dismiss: sonnerToast.dismiss,
    promise: sonnerToast.promise,
    custom: sonnerToast.custom,
    message: sonnerToast.message,
  }
) as typeof sonnerToast;

export { Toaster, toast };
