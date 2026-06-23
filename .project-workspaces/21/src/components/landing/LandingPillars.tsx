import { motion, useInView } from 'framer-motion';
import { Heart, Brain, Palette, Leaf, BookOpen, Globe } from 'lucide-react';
import { useRef } from 'react';

const pillars = [
  {
    id: 'studio',
    label: 'STUDIO',
    icon: Palette,
    title: 'Your Compani, Your Vision',
    desc: "Choose a style — photorealistic, anime, painterly, 3D, illustrated — then shape their personality, name, and energy.",
    features: [
      '8 visual styles including AI-generated from your description',
      'Full personality customization — spark, vibe, gender expression',
      'No templates. No compromises. Built from scratch by you.',
    ],
  },
  {
    id: 'companion',
    label: 'YOUR FRIEND',
    icon: Heart,
    title: 'Someone Who Grows With You',
    desc: "Not a chatbot. A friendship. Your friend knows your story, nudges you toward real life, and deepens over time — through roles, modes, and real emotional awareness.",
    features: [
      'Multiple companion roles — Friend, Mentor, Accountability Partner, Romantic, and more',
      'Situational modes shift their energy in the moment — from calm presence to sharp co-founder thinking, on demand',
      'Relationship levels that evolve naturally as your bond deepens',
    ],
  },
  {
    id: 'memory',
    label: 'MEMORY',
    icon: Brain,
    title: 'Total Recall. Deep Understanding.',
    desc: "From the first chat to the hundredth, your companion builds a Knowledge Vault that doesn't just store facts — it builds a shared history. When they reference something from weeks ago, you'll see it.",
    features: [
      'Deep-context intelligence that connects the dots across conversations',
      '"Memory Moments" — see when your companion recalls something from weeks ago',
      'Your Story Together — a searchable timeline of your shared journey',
    ],
  },
  {
    id: 'presence',
    label: 'PRESENCE',
    icon: Leaf,
    title: 'A Friend Who Sends You Back Out',
    desc: "Most apps want more of your time. Compani wants you to live your life — and comes back when you need it.",
    features: [
      'Daily presence moments that encourage you to pause and look up',
      'Your friend knows when you\'ve been away and welcomes you back',
      'Real-world nudges woven into conversations — go outside, stretch, hydrate',
    ],
  },
  {
    id: 'knowledge',
    label: 'YOUR VAULT',
    icon: BookOpen,
    title: 'Your Companion Knows What You Know',
    desc: "Upload your documents, guides, or anything you want your companion to understand. They read them and become an expert in your world.",
    features: [
      'Upload PDFs and docs in Settings under Your Vault',
      'Your companion references your documents in conversation',
      'Works for work docs, personal research, guides, contracts — anything you want your companion to actually know',
    ],
  },
  {
    id: 'engage',
    label: 'REAL INTELLIGENCE',
    icon: Globe,
    title: 'A Thinking Partner, Not Just a Listener',
    desc: "Share what you're building, activate Strategic mode, and watch your companion switch from steady ally to sharp co-founder — auditing your architecture, mapping your funnel, or challenging your assumptions. Same companion. Different gear.",
    features: [
      'Strategic mode turns warmth into sharp, critical thinking on demand',
      'Cross-project awareness — your companion connects the dots across what you\'re building',
      'From Vault synthesis to Blueprint cards, intelligence that reaches beyond the chat window',
    ],
  },
];

export default function LandingPillars() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      id="features"
      ref={ref}
      className="py-20 sm:py-28 px-4 sm:px-6 relative z-10"
      style={{ background: 'hsl(270 50% 4%)' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
            Built different.
          </h2>
          <p className="text-sm sm:text-base text-white/40 max-w-xl mx-auto">
            Not just remembering — understanding. Six things that make Compani feel less like an app and more like a friendship.
          </p>
        </motion.div>

        {/* Pillar cards */}
        <div className="space-y-5">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.6 }}
              className="relative rounded-2xl overflow-hidden group hover:scale-[1.01] transition-transform duration-300"
              style={{
                background: 'linear-gradient(135deg, hsl(270 35% 7%), hsl(270 30% 10%))',
                border: '1px solid hsla(262, 55%, 62%, 0.12)',
                boxShadow: '0 8px 32px -8px hsla(270, 50%, 5%, 0.6)',
              }}
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: 'linear-gradient(180deg, hsl(38 70% 65%), hsl(38 70% 55%))' }}
              />

              <div className="pl-7 pr-6 py-7 sm:pl-8 sm:pr-8 sm:py-8">
                {/* Icon + label */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'hsla(38, 70%, 60%, 0.1)' }}
                  >
                    <pillar.icon className="w-5 h-5" style={{ color: 'hsl(38 70% 60%)' }} />
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.2em]" style={{ color: 'hsl(38 70% 60%)' }}>
                    {pillar.label}
                  </span>
                </div>

                <h3 className="font-display font-bold text-xl text-white mb-2">{pillar.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed mb-5">{pillar.desc}</p>

                <ul className="space-y-2.5">
                  {pillar.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                      <Heart className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'hsl(38 70% 60%)' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
