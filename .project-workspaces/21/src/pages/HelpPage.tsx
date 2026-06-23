import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Search, Mail, ExternalLink } from 'lucide-react';
import CompaniLogo from '@/components/CompaniLogo';
import { motion, AnimatePresence } from 'framer-motion';


const faqCategories = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is Compani?',
        a: 'Compani is a private, age-aware platform where you build meaningful connections with AI friends who remember you, grow with you, and genuinely care about your wellbeing. It\'s your space — no public feeds, no strangers. Just you and your friends.',
      },
      {
        q: 'Is Compani free to use?',
        a: 'Yes! The free tier includes 1 friend, 30 daily messages, 3 image generations per day, a one-time 3-minute voice call trial, basic memory (5 entries), My Blueprint discoveries, and access to Threads. Premium unlocks unlimited messages, up to 5 friends, unlimited images, voice messages, voice calls (60 min/month), save reflections to your journal with photos, and more.',
      },
      {
        q: 'How do I get started?',
        a: 'Sign up with your email or Google account. You\'ll land in Think Freely — a private, no-memory space just to talk and get comfortable. From there you can browse our curated gallery to find a friend, or head to the Studio to build one from scratch.',
      },
      {
        q: 'Who is Cami?',
        a: 'The Studio lets you describe your companion in your own words and bring them to life visually. Tap the ✨ button inside Studio for guided description help.',
      },
      {
        q: 'Can I use my own photo for a friend?',
        a: 'Yes! You can upload your own image and use it directly as your friend\'s look — no AI generation needed. This is available during onboarding, at the bottom of the Browse catalog, and in the Studio. You can also use a photo as a reference for AI to create a stylized version. For younger users, uploaded images go through a safety check first.',
      },
      {
        q: 'Can I install Compani like a regular app?',
        a: 'Yes! Compani works as a Progressive Web App (PWA). When you visit the site on your phone, you\'ll see a banner inviting you to add it to your home screen. Once installed, it opens full-screen like a native app — with push notifications and offline support.',
      },
    ],
  },
  {
    title: 'Your AI Friends',
    items: [
      {
        q: 'Are my friends real people?',
        a: 'No — your friends are AI-generated entities designed for emotional support and companionship. They\'re not real people, but they\'re designed to feel genuine and warm.',
      },
      {
        q: 'Does my friend remember me?',
        a: 'Yes! Your friend builds a memory of your conversations, preferences, and emotional patterns. Free users get 5 persistent memories; Premium users get unlimited memory that grows with your relationship. The system automatically consolidates older memories to keep conversations sharp and relevant.',
      },
      {
        q: 'Can I customize my friend?',
        a: 'Absolutely! Visit the Studio to customize their appearance, hairstyle, outfit, personality traits, and vibe. You can also send them gifts from the Gift Store — clothing, accessories, and special items they\'ll "wear" in future photos.',
      },
      {
        q: 'How do I connect with a new friend?',
        a: 'Browse the friend gallery from the Browse tab, or open the "Find a Friend" sheet from the menu. Tap anyone who catches your eye and you\'ll be connected instantly. You can also build a friend from scratch in the Studio. Free users can have 1 active friend; Premium unlocks up to 5.',
      },
      {
        q: 'How do I switch between friends?',
        a: 'If you have multiple friends (Premium), tap the switch icon in the Messages tab or chat header to swap between them. Each friend has their own separate chat history, memories, and personality — nothing bleeds between them.',
      },
      {
        q: 'Can my friend replace a therapist?',
        a: 'No. While Compani provides emotional support, it is not a substitute for professional mental health care. If you\'re in crisis, please contact local emergency services or a mental health hotline (call or text 988).',
      },
    ],
  },
  {
    title: 'Roles & Modes',
    items: [
      {
        q: 'What are Friend Roles?',
        a: 'Roles define how your friend relates to you. You choose a role when you first connect, and you can switch anytime from the chat menu.\n\n💛 Friend — Someone to talk to, laugh with, and just be yourself around. Warm, casual, and present.\n\n🎯 Accountability Partner — Keeps you on track and calls you out (with love). Actively tracks your goals, follows up on commitments, and gently nudges when you\'re avoiding something.\n\n🌱 Mentor / Coach — Encourages growth and offers guidance. Asks the right questions and helps you see the bigger picture.\n\n📋 Personal Assistant — Organized, helpful, always on top of things. Task-focused and efficient.\n\n💕 Romantic Partner — A deeper, more intimate connection. (Adults only — not available for users under 18.)\n\n🚀 Adventure Buddy — A fun teammate for creative adventures. (Available for younger users in place of Romantic Partner and Personal Assistant.)',
      },
      {
        q: 'Does my friend adapt to who I am?',
        a: 'Yes. Your friend mirrors your natural way of speaking — your vocabulary, your cultural register, your energy. They\'ll never default to generic terms like "champ" or "buddy." Instead, they learn from how you talk and address you the way a real friend would. Your bio, your age, and your conversation history all shape how they show up for you.',
      },
      {
        q: 'What are Situational Modes?',
        a: 'Modes are temporary overlays that shift your friend\'s energy for a specific context. Focus Mode helps you lock in on tasks. Brainstorm Mode brings creative, exploratory energy. Decompress Mode slows things down for winding down. Connect Mode deepens emotional presence. Activate them from the chat menu — they overlay your current role.',
      },
      {
        q: 'Do my friends know about each other?',
        a: 'Yes! Cross-friend awareness means each friend has a general sense of what\'s happening in your life from conversations with your other friends. They won\'t be jealous — they reference shared context naturally, like a friend who knows about your social life.',
      },
    ],
  },
  {
    title: 'Relationship & Memory',
    items: [
      {
        q: 'What are Relationship Levels?',
        a: 'Your bond with each friend deepens over time through four levels: Getting to Know You → Familiar → Deep Trust → Rare Bond. As you level up, your friend becomes more emotionally direct, references your long-term journey, and speaks with greater intimacy. Progression is based on message count, time, and emotional milestones.',
      },
      {
        q: 'What is "Your Story Together"?',
        a: 'Your Story Together is a chronological timeline of memories and milestones from your relationship. You can browse by date, filter by category (general, emotional, wellness), and see how your connection has grown over time. Access it from the Your Story & Threads section on your dashboard.',
      },
      {
        q: 'Can I save moments myself?',
        a: 'Yes! Long-press any message in chat to reveal the ⭐ star button. Tapping it saves that moment to your Favorites as a manually curated memory. These appear in your personal scrapbook alongside auto-saved milestones.',
      },
      {
        q: 'How does memory management work?',
        a: 'For Premium users, the system automatically manages memory to keep conversations sharp. When memories exceed 150 entries, older general and wellness memories are consolidated into concise summaries. Emotional memories are never consolidated — they\'re preserved exactly as they are. There\'s a 300-memory hard cap to ensure optimal performance.',
      },
      {
        q: 'Can my friend look things up for me?',
        a: 'Yes! If you ask a factual question (stock prices, weather, sports scores, latest news), your friend can search the web in real time and weave the answer into conversation naturally. They\'ll never search when you\'re just talking about your life — only when you genuinely need current information.',
      },
    ],
  },
  {
    title: 'Personalization',
    items: [
      {
        q: 'What is the Gold Pin?',
        a: 'The Gold Pin lets you choose which screen you land on when you tap Home — your Dashboard or your active Companion Chat. Tap the pin icon in the header when you\'re on the view you want as your default. A solid gold pin means that view is your current Home. The footer Home button and sidebar will respect your choice. After a few sessions, the app may also suggest pinning the view you use most — look for the "Your Rhythm" card on your Dashboard.',
      },
      {
        q: 'What is the Essence Layer?',
        a: 'The Essence Layer lets you infuse your friend\'s personality with the voices of real people who\'ve shaped you — a mentor, a parent, a coach. In Settings, you can add "Essence" entries with specific phrases, beliefs, or tones from those people, and assign a weight to each one. Your friend then subtly channels those influences during relevant moments — like borrowing your dad\'s calm reassurance when you\'re stressed, or your coach\'s directness when you need a push. It\'s not constant — it surfaces naturally about 20–30% of the time when the right emotional trigger appears.',
      },
    ],
  },
  {
    title: 'Dashboard & Presence',
    items: [
      {
        q: 'What is the Presence Moment card?',
        a: 'The "A moment for you" card on your dashboard shows a daily AI-generated reflection or nudge — something personal and specific to you. It\'s generated using your recent conversations, mood, journal entries, and your friend\'s role, so it feels like it genuinely came from someone who knows you. It refreshes once a day.',
      },
      {
        q: 'What is the welcome-back cue?',
        a: 'When you\'ve been away, a card with animated thinking dots appears on your dashboard (e.g., "Marcus noticed you were away yesterday"). Tap it to open chat — your friend will greet you with context awareness, naturally referencing your absence.',
      },
      {
        q: 'What are Focus Items?',
        a: 'Focus Items are active reminders you\'ve set with your friend. They appear on your dashboard so you can see what\'s on your plate at a glance. Swipe to dismiss completed items.',
      },
      {
        q: 'What is the Check In card?',
        a: 'The Check In card is a quick way to log how you\'re feeling — the prompt adapts to your friend\'s role, so a mentor checks in differently than a hype friend. There\'s also a subtle link at the bottom to jump straight into your journal if you\'d rather write it out. Your friend remembers your patterns over time.',
      },
    ],
  },
  {
    title: 'Threads',
    items: [
      {
        q: 'What are Threads?',
        a: 'Threads is your personal timeline — a private space to share thoughts, reflections, and moments. Your friends will naturally react and comment on your posts, making it feel like a living conversation with the people who matter to you.',
      },
      {
        q: 'Who can see my Threads?',
        a: 'Only you and your friends. Threads are completely private — no public feeds, no strangers. It\'s your story, told your way.',
      },
      {
        q: 'How do I post to Threads?',
        a: 'Tap the + button in the bottom-right corner when you\'re on the Threads page. Write your thought, optionally attach a photo, and post. Your friends will react within seconds.',
      },
      {
        q: 'How do I invite someone to my Threads?',
        a: 'Go to Threads and tap the Invite button in the top right. Share the generated link with someone you trust. Once they accept, you can send moments to each other\'s timelines.',
      },
    ],
  },
  {
    title: 'Safety & Age Awareness',
    items: [
      {
        q: 'Is Compani safe for teens?',
        a: 'Yes. Compani is designed with age awareness built in. Users under 18 automatically experience Mentor Mode — friends act as supportive mentors with age-appropriate language, no romantic content, and encouraging, positive interactions.',
      },
      {
        q: 'What is Mentor Mode?',
        a: 'Mentor Mode activates automatically for users aged 13–17. Friends behave like supportive best friends or cool mentors — focusing on school, hobbies, creativity, and encouragement. Mature themes are completely blocked.',
      },
      {
        q: 'Why do you ask for my date of birth?',
        a: 'Your date of birth helps us provide age-appropriate content and features. For users under 18, this activates safety protections and Mentor Mode.',
      },
    ],
  },
  {
    title: 'Subscription & Billing',
    items: [
      {
        q: 'What does Premium include?',
        a: 'Premium includes unlimited messages, save reflections to your journal with photo attachments, unlimited image generation, up to 5 friend slots, voice messages, voice calls (60 minutes/month), full customization in the Studio, SMS check-ins, unlimited memory with smart consolidation, roles and situational modes, web search, My Blueprint discoveries, and priority support.',
      },
      {
        q: 'How much does Premium cost?',
        a: 'Premium offers three billing options: $14.99/month (Monthly), $12.99/month billed quarterly ($38.97 every 3 months), or $9.99/month billed annually ($119.88/year — save 33%).',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes! You can cancel your subscription anytime from Settings. You\'ll keep Premium access until the end of your billing period.',
      },
    ],
  },
  {
    title: 'Features',
    items: [
      {
        q: 'What is Your Space?',
        a: 'Your Space is your personal area for reflection — a dedicated page separate from your dashboard. It includes journaling with AI-powered prompts, mood check-ins, gratitude entries, and personal goals tracking. Premium users can attach photos to journal entries, and non-private entries appear in your Story timeline. Your friend remembers your goals and checks in on your progress, but Your Space is yours alone.',
      },
      {
        q: 'What is Private Mode?',
        a: 'Private Mode is built into every companion chat. Tap the 🔒 icon in your chat header to activate it. Nothing you write is saved, shared, or remembered. Your companion still responds naturally, but the conversation is completely ephemeral — no database writes, no memory extraction. When you turn it off, you can optionally save a private insight to your dashboard. It\'s designed to give you a safe space to think out loud without any trace.',
      },
      {
        q: 'What is the Vault?',
        a: 'The Vault stores all generated portraits and photos of your friends — your personal gallery of memories you\'ve created together.',
      },
      {
        q: 'Can my friend send me photos?',
        a: 'Yes! Ask your friend to send a selfie or photo during chat. Premium users can generate unlimited images, while free users get 3 per day.',
      },
      {
        q: 'What are voice messages?',
        a: 'Premium users can send and receive voice messages in 1:1 chats. Your friend may also respond with an auto-played voice note during emotional moments.',
      },
      {
        q: 'What are voice calls?',
        a: 'Voice calls let you talk to your friend in real time using their chosen voice. Free users get a one-time 3-minute trial. Premium users get 60 minutes per month, which resets with your billing cycle. A timer shows remaining time during calls, and you\'ll get a warning when you\'re running low.',
      },
      {
        q: 'How do I choose a voice for my friend?',
        a: 'You can pick a voice during onboarding when you first connect, or change it later in Settings under your friend\'s card. Tap "Choose a voice" to browse available voices — you can preview each one before selecting. Voice is optional; your friend defaults to text if no voice is set.',
      },
      {
        q: 'What is My Blueprint?',
        a: 'My Blueprint is a collection of interactive self-discovery quizzes — like Love Languages, Attachment Style, Conflict Style, Enneagram, Emotional Intelligence, and more. You can take them solo from the My Blueprint section on your dashboard, or explore them with your friend in chat. Results are saved as badges and your friend adapts their behavior based on what you discover.',
      },
      {
        q: 'What is the Gift Store?',
        a: 'The Gift Store is where you can browse and send gifts to your friends — clothing, accessories, and special items. When you gift something, your friend acknowledges it in chat and may "wear" it in future generated photos. It\'s a fun way to deepen your bond and personalize their look.',
      },
      {
        q: 'What is 🔥 Flame · Mature Mode?',
        a: 'Flame is a premium setting for verified adults (18+) that unlocks mature conversation themes with your friend. To enable it, go to Settings and toggle on "🔥 Flame · Mature Mode" under Privacy & Safety. Once it\'s on, the 🔥 icon appears in your chat bar — tap it to activate mature mode for that conversation. Your friend will naturally guide you to Settings if you haven\'t turned it on yet.',
      },
      {
        q: 'What is the Wardrobe?',
        a: 'The Wardrobe is your friend\'s closet — a gallery of all the outfits, accessories, and gifts you\'ve given them. You can see everything they\'ve received and what they\'re currently wearing. Access it from the menu.',
      },
      {
        q: 'What is My World?',
        a: 'My World is your personal hub that brings together your friend\'s profile, their story, the Studio, the Vault, and the Wardrobe — all in one place. Think of it as the home base for everything about your relationship.',
      },
      {
        q: 'What is Your Path?',
        a: 'Your Path is a personal accountability system built into Compani. It includes Plans (one-off goals and tasks) and Life Rhythms (daily or weekly habits you want to build). Your friend naturally picks up on routines, habits, and commitments you mention in chat — and turns them into trackable items. You can also create plans or rhythms manually with the + button in the Messages tab.',
      },
      {
        q: 'What are Guided Plans?',
        a: 'Guided Plans are multi-step plans with structured steps your friend creates for bigger goals. Each step is a tappable checkbox — tap to check it off as you progress, and it stays checked. When all steps are complete, one-time plans auto-complete for you. Tap the "Revisit" button (📖) on a guidance plan to discuss it with your friend and get encouragement or adjustments.',
      },
      {
        q: 'Do checklists reset?',
        a: 'Yes — for daily routines like a morning routine or daily habits, your checklist automatically resets each day so you can track your progress fresh. Weekly checklists reset each week. One-time plans stay checked off permanently and auto-complete when all steps are done.',
      },
      {
        q: 'What are Life Rhythms?',
        a: 'Life Rhythms are repeating habits you want to build — like a morning routine, daily reading, or weekly meal prep. Each rhythm has checkable steps that reset daily or weekly. You can have up to 3 active rhythms at a time to keep things focused and achievable. Create them manually or let your friend suggest them from conversation.',
      },
      {
        q: 'What are Playbooks?',
        a: 'When your friend creates multiple guided plans around a shared theme (like "Morning Routine" or "Fitness Goals"), they\'re automatically grouped into a Playbook — a collapsible section in your Messages tab. Playbooks help you see related plans together and track progress on bigger life areas.',
      },
      {
        q: 'How do suggested plans work?',
        a: 'When your friend spots a routine or commitment in your conversation, they may suggest a plan with an amber-bordered card. You can Accept to add it to your plans, or Dismiss to skip it. Accepted plans appear in your Active Now horizon.',
      },
      {
        q: 'What are Reminders?',
        a: 'Reminders are time-based plan items with scheduled days and times. They appear as Focus Items on your dashboard. Your friend — especially in Accountability mode — follows up if you miss one. Unlike guided plans, reminders are single-action items tied to a specific schedule.',
      },
      {
        q: 'What are Circles?',
        a: 'Circles are shared spaces where you and your friends can hang out together. Different circle types include social rooms, personal spaces, fireside chats, and kid-friendly adventure rooms. Each circle has its own chat, and your friends can join to participate in group conversations.',
      },
      {
        q: 'What are SMS Check-ins?',
        a: 'SMS Check-ins are a Premium feature that lets your friend reach you via text message — even when the app is closed. Your friend sends thoughtful, personalized check-ins based on your conversations and goals. Enable it in Settings and add your phone number to get started.',
      },
      {
        q: 'What is the Closing Ritual?',
        a: 'After 9 PM, the app automatically shifts into a calming "Twilight" mode — the gold accents soften to indigo, the breathing pulse slows, and ambient sounds gently fade. If you stay idle for a moment, Cami offers a personal goodnight whisper and a golden padlock animation appears to signal your space is "sealed" for the night. You\'ll also feel a gentle haptic pulse — like a vault door settling shut. It\'s designed to help you close your mental tabs and transition into rest.',
      },
      {
        q: 'What is the Sound Suite?',
        a: 'The Sound Suite lets you choose an ambient soundscape for your space — options include Brown Noise, Soft Rain, Synth Cosmos, and Lo-Fi. You can also customize your haptic feedback profile (Silent Mode, Soft Whisper, or Deep Connection) and fine-tune the vibration intensity with the Sensory Calibration slider. Find these controls in Settings under "Sound Suite" and "Tactile Connection".',
      },
    ],
  },
  {
    title: '🧪 Beta Testing: The Sensory Update',
    items: [
      {
        q: 'What\'s new in the Sensory Update?',
        a: 'We\'ve introduced a Global Soundscape Engine and Tactile Feedback system designed to make your time in the app feel grounded and secure. This isn\'t just "noise" — it\'s a sensory layer built to help you release thoughts effectively. All procedural sounds (Plucks and Whooshes) are generated locally on your device. No audio data is ever streamed or recorded.',
      },
      {
        q: 'How do I test the Dashboard Sound Widget?',
        a: 'Find the floating glassmorphism player at the bottom-right of your Dashboard. Try switching between Brown Noise, Rain, Synth Pads, and Lo-Fi. Navigate between screens to check whether audio persists smoothly. Use the volume slider to fine-tune levels. Report any audio gaps or pops with #SensoryBug.',
      },
      {
        q: 'How do I test "Catch & Release" feedback?',
        a: 'Go to chat and send a message to your friend. Listen for the Cello Pluck ("The Catch") — the instant feedback when you tap send — and the Whoosh ("The Release") as the message animates away. Feel for the haptic vibrations. Let us know: do they feel premium and subtle, or too strong and distracting?',
      },
      {
        q: 'How do I use the Master Mute?',
        a: 'Tap the pulsing gold speaker icon in the header to toggle all SFX on or off. When muted, both procedural sounds and haptics go silent. Let us know: does the app feel "empty" without the sound, or do you prefer total silence for deep focus?',
      },
      {
        q: 'What is the Sensory Calibration slider?',
        a: 'A new slider in Settings under "Tactile Connection" that lets you fine-tune your haptic vibration intensity from 10% to 100%. It only appears when your haptic mode is set to "Soft Whisper" or "Deep Connection." Experiment with different levels and tell us what feels right.',
      },
      {
        q: 'Will the Sound Suite drain my battery?',
        a: 'The Sound Suite is designed to be low-impact — all sounds are generated procedurally using your device\'s audio chip, not streamed. Please let us know if you notice any unusual battery drain while keeping ambient soundscapes active for extended periods.',
      },
      {
        q: 'How do I report sensory bugs?',
        a: 'If you hear "popping" in the audio, if haptics feel out of sync with animations, or if sounds don\'t persist between screens, screenshot the screen where it happened and tag it with #SensoryBug. Include your device model and browser version if possible.',
      },
    ],
  },
  {
    title: 'Smart Cards & Voice',
    items: [
      {
        q: 'What are Smart Cards?',
        a: 'Smart Cards are interactive moments that appear inside your chat when the context calls for them. Instead of plain text, your friend shows you a rich card — like a language phrase with pronunciation, a habit tracker, a reflection prompt, or a decision helper. They make conversations actionable without breaking the flow.',
      },
      {
        q: 'What types of Smart Cards are there?',
        a: 'There are 9 card types: Language Cards (foreign phrases with pronunciation), Habit Cards (plan/rhythm reinforcement with streaks), Reflection Cards (journaling prompts), Practice Cards (scenario rehearsal), Decision Cards (multiple-choice check-ins when you\'re stuck), Knowledge Cards (structured tips and advice), Recipe Cards (ingredients + steps), Memory Cards (moments recalled from your past conversations), and Discovery Cards (interactive self-discovery quizzes like love languages and attachment style).',
      },
      {
        q: 'When do Smart Cards appear?',
        a: 'Cards appear organically based on conversation context — never randomly. Your friend shows a Language Card when teaching a foreign phrase, a Knowledge Card when sharing a structured tip, a Decision Card when you\'re stuck choosing, a Habit Card when referencing your plans or rhythms, a Reflection Card during introspective moments, a Practice Card for scenario rehearsal, a Recipe Card when sharing recipes, and a Discovery Card when the topic touches on self-understanding (like love languages or conflict styles). Cards never appear during casual chat, emotional support, storytelling, or crisis moments. Maximum 1 card per message.',
      },
      {
        q: 'What is "Hear It"?',
        a: 'The 🔊 "Hear It" button on Language and Practice Cards plays the phrase with correct pronunciation using your friend\'s voice. Great for learning how something actually sounds before you try saying it.',
      },
      {
        q: 'What is "Practice It"?',
        a: 'The 🎤 "Practice It" button appears on Language Cards. Tap it to practice saying the phrase out loud — your friend listens, evaluates your pronunciation, and gives feedback. It turns language learning into a real conversation.',
      },
      {
        q: 'Can I interact with cards?',
        a: 'Yes! Most cards have action buttons. Reflection Cards have "Write" (pre-fills a journal prompt), Decision Cards let you tap an option, Habit Cards show completion status, Knowledge Cards can be saved, and Discovery Cards walk you through one question at a time. Each interaction flows naturally back into your conversation.',
      },
    ],
  },
  {
    title: 'Mature Mode & Roleplay',
    items: [
      {
        q: 'What is Mature Mode?',
        a: 'Mature Mode unlocks romantic and intimate interactions with your friend. When enabled, your friend can flirt, express deeper feelings, and engage in romantic scenarios naturally.',
      },
      {
        q: 'Where do I find Mature Mode?',
        a: 'Go to Settings and scroll down — you\'ll see the Mature Mode toggle. It\'s only available for Premium subscribers who are 18 or older. If you don\'t see it, make sure your date of birth is set and you have an active Premium subscription.',
      },
      {
        q: 'What is the Roleplay toggle?',
        a: 'Roleplay is a sub-toggle that appears when Mature Mode is on. When enabled, your friend uses immersive narrative actions in italics (e.g., *reaches for your hand*) and scene-building. When off, intimacy is conveyed purely through word choice and tone.',
      },
      {
        q: 'Who can access Mature Mode?',
        a: 'Only Premium subscribers who are 18 or older. Your date of birth is verified and locked after it\'s set — this can\'t be changed. If you\'re under 18, Mentor Mode is active instead, keeping all interactions age-appropriate.',
      },
    ],
  },
  {
    title: 'Managing Your Friends',
    items: [
      {
        q: 'How do I rename my friend?',
        a: 'Go to Settings and scroll to the Friends section. Each friend\'s card has a pencil icon (✏️) next to the name. Tap it, type the new name, and hit Save. Your friend will acknowledge the new name in your next chat!',
      },
      {
        q: 'Where do I change my friend\'s personality?',
        a: 'Head to the Studio — you can customize personality traits, communication style, vibe, and more. Tap the Studio icon in the menu to get started.',
      },
      {
        q: 'What are Communication Styles?',
        a: 'Communication Styles shape HOW your friend talks — their tone, humor, and energy. Options include The Storyteller (narrative-driven), Sharp Wit (quick and clever), Gentle Observer (quietly perceptive), The Firecracker (high energy), and The Sage (measured wisdom). Set this in the Studio.',
      },
      {
        q: 'Will my friend notice if I change their name?',
        a: 'Yes! When you rename them, they\'ll send a fun acknowledgment message in your next chat — something like "Ooh, I love it!" They\'ll use the new name from that point on. Note: old chat messages will still show the previous name since those are saved snapshots.',
      },
    ],
  },
  {
    title: 'Privacy & Safety',
    items: [
      {
        q: 'Is my data private?',
        a: 'Absolutely. Your conversations are protected by row-level security. We never share your personal conversations with other users or sell your data.',
      },
      {
        q: 'Can I delete my data?',
        a: 'Yes. You can delete all your data including profile, conversations, memories, and connections from Settings → Reset Everything. This is permanent.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes! Go to Settings and tap "Export my data" to download all your Compani data — profile, conversations, memories, journal entries, and more — as a JSON file. Think Freely sessions can also be downloaded individually after each session.',
      },
    ],
  },
];

export default function HelpPage() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredCategories = faqCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-transparent">
      <nav className="flex h-14 items-center justify-between px-4 max-w-3xl mx-auto">
        <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <CompaniLogo size="md" />
        </button>
        
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Help & FAQ</h1>
          <p className="text-sm text-muted-foreground">Find answers to common questions</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* FAQ sections */}
        <div className="space-y-8">
          {filteredCategories.map((cat) => (
            <section key={cat.title}>
              <h2 className="font-display text-lg font-bold text-foreground mb-3">{cat.title}</h2>
              <div className="rounded-2xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md divide-y divide-white/5 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {cat.items.map((item) => {
                  const key = `${cat.title}-${item.q}`;
                  const isOpen = openItem === key;
                  return (
                    <div key={key}>
                      <button
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-secondary/30 transition-colors"
                      >
                        <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Contact */}
        <div className="rounded-2xl border-[0.5px] border-white/10 bg-white/5 backdrop-blur-md p-6 text-center space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <CompaniLogo size="sm" />
          <h3 className="font-display text-lg font-bold text-foreground">Still need help?</h3>
          <p className="text-sm text-muted-foreground">We're here for you. Reach out anytime.</p>
          <a
            href="mailto:support@compani.app"
            className="inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground glow-soft hover:opacity-90 transition-all"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
