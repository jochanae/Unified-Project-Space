import { useTheme } from "@/contexts/ThemeContext";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-purple-500/90 group-[.toaster]:via-pink-500/90 group-[.toaster]:to-blue-500/90 group-[.toaster]:text-white group-[.toaster]:border-white/20 group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-xl group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-white/80",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-purple-600 group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
          success: "group-[.toaster]:from-emerald-500/90 group-[.toaster]:via-teal-500/90 group-[.toaster]:to-cyan-500/90",
          error: "group-[.toaster]:from-red-500/90 group-[.toaster]:via-rose-500/90 group-[.toaster]:to-pink-500/90",
          warning: "group-[.toaster]:from-amber-500/90 group-[.toaster]:via-orange-500/90 group-[.toaster]:to-yellow-500/90",
          info: "group-[.toaster]:from-blue-500/90 group-[.toaster]:via-indigo-500/90 group-[.toaster]:to-purple-500/90",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
