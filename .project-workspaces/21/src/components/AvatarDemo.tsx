import demo1 from '@/assets/demo-avatars/companion-demo-1.jpg';
import demo2 from '@/assets/demo-avatars/companion-demo-2.jpg';
import demo3 from '@/assets/demo-avatars/companion-demo-3.jpg';

const avatars = [
  { src: demo1, label: 'Warm & Expressive', desc: 'Curly hair, cozy sweater, friendly smile' },
  { src: demo2, label: 'Kind & Thoughtful', desc: 'Wavy hair, gentle expression, casual style' },
  { src: demo3, label: 'Calm & Serene', desc: 'Short textured hair, grounded presence' },
];

export default function AvatarDemo() {
  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="font-display text-2xl font-bold text-foreground text-center mb-2">Companion Avatar Styles</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">Preview of AI-generated companion looks</p>
      <div className="flex flex-col gap-6 max-w-sm mx-auto">
        {avatars.map((a) => (
          <div key={a.label} className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center gap-3">
            <img src={a.src} alt={a.label} className="w-40 h-40 rounded-full object-cover shadow-md" />
            <h2 className="font-semibold text-foreground">{a.label}</h2>
            <p className="text-xs text-muted-foreground text-center">{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
