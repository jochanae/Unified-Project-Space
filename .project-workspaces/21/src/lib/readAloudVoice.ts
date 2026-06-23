/**
 * Read Aloud voice selection — uses Web Speech API voices.
 * Driven by gender preference (auto / male / female) with language-aware matching.
 */



/** Get all available Web Speech voices (waits for them to load if needed) */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    if (voices.length > 0) return resolve(voices);
    window.speechSynthesis?.addEventListener('voiceschanged', () => {
      resolve(window.speechSynthesis.getVoices());
    }, { once: true });
    setTimeout(() => resolve(window.speechSynthesis?.getVoices() ?? []), 500);
  });
}

/** Simple heuristic to detect the dominant language of a text string */
export function detectTextLanguage(text: string): string | null {
  if (!text || text.length < 8) return null;

  // Common character ranges and word patterns
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';

  // Latin-script languages — sample common words
  const lower = text.toLowerCase();
  if (/\b(el|la|los|las|es|está|como|qué|pero|muy|también|hola)\b/.test(lower)) return 'es';
  if (/\b(le|la|les|des|est|sont|avec|dans|pour|très|je|vous|nous|mais)\b/.test(lower)) return 'fr';
  if (/\b(o|os|da|das|é|está|como|muito|também|mas|não|para)\b/.test(lower)) return 'pt';
  if (/\b(der|die|das|ist|und|ein|ich|nicht|mit|auf|auch|für)\b/.test(lower)) return 'de';

  // Default: assume English if Latin script
  return 'en';
}

const SAVED_VOICE_KEY = 'readAloudVoiceURI';

/**
 * Pick the best voice based on saved selection, gender, and text language.
 * 1. If user saved a specific voice, use it
 * 2. Otherwise detect text language and match + gender heuristics
 * 3. Fallback to default voice
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  companionGender?: 'male' | 'female' | 'neutral' | string,
  textLanguage?: string | null
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  // Check for user's saved voice first
  const savedURI = localStorage.getItem(SAVED_VOICE_KEY);
  if (savedURI) {
    const saved = voices.find(v => v.voiceURI === savedURI);
    if (saved) return saved;
  }

  // Determine target gender for auto mode
  const targetGender = companionGender && companionGender !== 'neutral' ? companionGender : null;

  const malePattern = /\b(male|david|james|daniel|mark|google us english|microsoft david|microsoft mark)\b/i;
  const femalePattern = /\b(female|samantha|zira|karen|victoria|google.*female|microsoft zira|fiona|moira|tessa)\b/i;
  const genderPattern = targetGender === 'male' ? malePattern
    : targetGender === 'female' ? femalePattern
    : null;

  // If we have a detected language, try to find a voice in that language first
  if (textLanguage && textLanguage !== 'en') {
    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(textLanguage));
    if (langVoices.length > 0) {
      // Try gender + language match
      if (genderPattern) {
        const genderLangMatch = langVoices.find(v => genderPattern.test(v.name));
        if (genderLangMatch) return genderLangMatch;
      }
      // Language match without gender preference
      return langVoices.find(v => v.default) || langVoices[0];
    }
  }

  // English or no language detected — match by gender in any language
  if (genderPattern) {
    const match = voices.find(v => genderPattern.test(v.name));
    if (match) return match;
  }

  // Fallback: default voice or first
  return voices.find(v => v.default) || voices[0];
}

const RATE_KEY = 'readAloudRate';
const PITCH_KEY = 'readAloudPitch';

export function getSavedRate(): number {
  const v = parseFloat(localStorage.getItem(RATE_KEY) || '');
  return Number.isFinite(v) && v >= 0.5 && v <= 2 ? v : 0.95;
}
export function getSavedPitch(): number {
  const v = parseFloat(localStorage.getItem(PITCH_KEY) || '');
  return Number.isFinite(v) && v >= 0 && v <= 2 ? v : 1;
}
export function setSavedRate(r: number) { localStorage.setItem(RATE_KEY, String(r)); }
export function setSavedPitch(p: number) { localStorage.setItem(PITCH_KEY, String(p)); }

/** Play a short preview of a voice using the user's saved rate & pitch */
export function previewVoice(
  voice: SpeechSynthesisVoice,
  sampleText = 'Hey, this is how I sound!'
): void {
  window.speechSynthesis?.cancel();
  const utterance = new SpeechSynthesisUtterance(sampleText);
  utterance.voice = voice;
  utterance.rate = getSavedRate();
  utterance.pitch = getSavedPitch();
  window.speechSynthesis?.speak(utterance);
}
