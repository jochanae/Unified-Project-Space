import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Glass-Gold Toaster — matches the Selah button vibe.
 * Frosted obsidian backdrop, 1px gold hairline, soft gold bloom shadow.
 * Docked bottom-center so it never blocks the reading runway.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      offset={24}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            "group toast",
            // Glass surface
            "!bg-obsidian/55 !backdrop-blur-2xl !backdrop-saturate-150",
            // Gold hairline border
            "!border !border-gold/30",
            "!rounded-xl !px-4 !py-3",
            // Gold bloom shadow (light, not heavy)
            "!shadow-[0_0_25px_rgba(201,168,76,0.18),inset_0_0_10px_rgba(201,168,76,0.05)]",
            // Typography
            "!text-gold-soft",
          ].join(" "),
          title: "!font-display !text-[13px] !tracking-[0.04em] !text-gold",
          description: "!text-[12px] !leading-relaxed !text-foreground/70",
          actionButton:
            "!bg-gold !text-obsidian hover:!bg-gold-soft !rounded-md !px-3 !py-1.5 !text-[11px] !uppercase !tracking-[0.18em]",
          cancelButton: "!bg-transparent !text-muted-foreground hover:!text-gold-soft !text-[11px]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
