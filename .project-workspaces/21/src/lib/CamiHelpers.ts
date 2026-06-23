/**
 * CamiHelpers — small utility functions and micro-components used by CamiMatchmaking.
 * Extracted here to keep the main orchestrator focused on flow logic.
 */

export function getAcknowledgment(questionIndex: number, _answer: string): string {
  const acks = [
    "I love that. That tells me a lot about what matters to you.",
    "Thank you for sharing that. It takes courage to name what's real.",
    "Got it. That's really helpful — I want to make sure this feels right for you.",
  ];
  return acks[questionIndex] || "I hear you. 💛";
}
