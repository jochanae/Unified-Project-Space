export type ReaderVoiceEngine = "google" | "system-native";

export const READER_VOICE_ENGINE_SETTING_KEY = "reader_voice_engine";
export const DEFAULT_READER_VOICE_ENGINE: ReaderVoiceEngine = "system-native";

export function normalizeReaderVoiceEngine(value: unknown): ReaderVoiceEngine {
  if (typeof value !== "string") return DEFAULT_READER_VOICE_ENGINE;

  const normalized = value.trim().toLowerCase();
  if (normalized === "system-native" || normalized === "system_native" || normalized === "native") {
    return "system-native";
  }

  return "google";
}
