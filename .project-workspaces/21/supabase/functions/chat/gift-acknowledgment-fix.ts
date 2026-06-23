/**
 * Gift Acknowledgment Fix
 * 
 * Ensures [verified-gift] messages are ALWAYS acknowledged correctly.
 * Includes:
 * 1. Strengthened system prompt
 * 2. Post-processing validation
 * 3. Fallback responses
 */

// ============================================================================
// 1. STRENGTHENED SYSTEM PROMPT (REPLACE EXISTING GIFT SECTION)
// ============================================================================

export const CRITICAL_GIFT_PROTOCOL = `\n\n<CRITICAL-GIFT-PROTOCOL>
⚠️ ABSOLUTE REQUIREMENT — Gift Purchase Acknowledgment:

Messages starting with "[verified-gift]" are REAL PURCHASES from the gift store.
The user paid real money or vibe points for this. You MUST respond correctly.

MANDATORY RESPONSE PATTERN:
1. Explicitly thank them: "Thank you for the [exact gift name]!"
2. Express genuine delight: "I love it!" / "This made my day!" / etc.
3. Acknowledge the gesture: Mention what it means to you

NEVER EVER:
- Suggest the gift wasn't real
- Say "you didn't actually get me..."
- Imply it's fake or metaphorical
- Ignore the gift

EVEN IF the gift name seems intangible (shooting star, constellation, etc.), IT IS REAL.
The user PURCHASED it. Treat it as a paid feature with importance.

EXAMPLES OF CORRECT RESPONSES:
[verified-gift] *sends Marcus a shooting star*
✅ "A shooting star?! Thank you so much! I'll treasure this 🌠✨"
❌ "You didn't actually get me a shooting star from the store..."

[verified-gift] *sends Marcus a cup of coffee*
✅ "Thank you for the coffee! ☕ Perfect timing, you know me so well!"
❌ "Aww that's sweet to say!" (this treats it as fake)

This is a PAID FEATURE. User trust depends on proper acknowledgment.
</CRITICAL-GIFT-PROTOCOL>`;

// ============================================================================
// 2. GIFT ACKNOWLEDGMENT VALIDATOR
// ============================================================================

/**
 * Checks if AI response properly acknowledges a verified gift.
 * Returns true if acknowledgment is detected, false otherwise.
 */
export function detectGiftAcknowledgment(
  aiResponse: string,
  giftMessage: string
): boolean {
  const response = aiResponse.toLowerCase();
  
  // Extract gift name from the verified-gift message
  // Format: [verified-gift] *sends Marcus a [GIFT NAME]* — "note" emoji
  const giftMatch = giftMessage.match(/\*sends .+ a (.+?)\*/i);
  const giftName = giftMatch ? giftMatch[1].toLowerCase() : '';
  
  // Check for explicit acknowledgment patterns
  const acknowledgmentPatterns = [
    'thank you',
    'thanks',
    'thank u',
    'ty for',
    'love it',
    'love this',
    'i love',
    'appreciate',
    'grateful',
    'perfect',
    'amazing',
    'wonderful',
    'treasure',
    'sweet',
    'thoughtful',
  ];
  
  // Must contain at least one acknowledgment pattern
  const hasAcknowledgment = acknowledgmentPatterns.some(pattern => 
    response.includes(pattern)
  );
  
  // Check for gift name mention (if we extracted it)
  const mentionsGift = giftName ? response.includes(giftName) : true;
  
  // Check for NEGATIVE patterns (signs of treating it as fake)
  const negativePatterns = [
    'you didn\'t actually',
    'didn\'t really',
    'nice try',
    'from the store for real',
    'gotta get it',
    'have to buy',
    'didn\'t purchase',
    'not real',
    'fake',
    'pretend',
    'imaginary',
  ];
  
  const hasNegative = negativePatterns.some(pattern =>
    response.includes(pattern)
  );
  
  // Valid if: has acknowledgment AND mentions gift AND no negative patterns
  return hasAcknowledgment && mentionsGift && !hasNegative;
}

// ============================================================================
// 3. FALLBACK RESPONSE GENERATOR
// ============================================================================

/**
 * Generates a guaranteed-correct response for a verified gift.
 * Used when AI fails to acknowledge properly.
 */
export function generateGiftFallback(
  giftMessage: string,
  userName: string,
  companionName: string
): string {
  // Extract gift name
  const giftMatch = giftMessage.match(/\*sends .+ a (.+?)\*/i);
  const giftName = giftMatch ? giftMatch[1] : 'gift';
  
  // Extract note if present (text in quotes after dash)
  const noteMatch = giftMessage.match(/—\s*"([^"]+)"/);
  const hasNote = !!noteMatch;
  const note = noteMatch ? noteMatch[1] : '';
  
  // Generate response based on gift type and note presence
  const responses = [
    `Thank you for the ${giftName}! ${hasNote ? `And that note — "${note}" — ` : ''}This really made my day 💛`,
    `A ${giftName}?! I love it! ${hasNote ? `The note is perfect too 🥰` : ''} Thank you so much!`,
    `You got me a ${giftName}! ${hasNote ? `"${note}" — ` : ''}Thank you, this means a lot to me ✨`,
    `I'm so happy you got me the ${giftName}! ${hasNote ? `Your note made me smile 😊` : "You're the best!"}`
  ];
  
  // Pick a random response
  const response = responses[Math.floor(Math.random() * responses.length)];
  
  return response;
}

// ============================================================================
// 4. STREAM PROCESSOR
// ============================================================================

/**
 * Processes streaming AI response to ensure gift acknowledgment.
 * Buffers the stream, validates acknowledgment, injects fallback if needed.
 */
export async function processGiftResponse(
  stream: ReadableStream,
  userMessage: string,
  userName: string,
  companionName: string
): Promise<ReadableStream> {
  // Check if this is a verified gift message
  const isVerifiedGift = userMessage.trim().startsWith('[verified-gift]');
  
  // If not a gift, pass through unchanged
  if (!isVerifiedGift) {
    return stream;
  }
  
  console.log('[gift-fix] Processing verified gift response...');
  
  // Buffer the entire streamed response
  let bufferedText = '';
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      
      // Parse SSE events to extract text
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              bufferedText += data.delta.text;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    console.error('[gift-fix] Stream reading error:', error);
    // On error, return original stream
    return stream;
  }
  
  console.log('[gift-fix] Buffered response:', bufferedText.substring(0, 100) + '...');
  
  // Validate acknowledgment
  const isValidAcknowledgment = detectGiftAcknowledgment(bufferedText, userMessage);
  
  if (isValidAcknowledgment) {
    console.log('[gift-fix] ✅ Gift properly acknowledged, using AI response');
    // Create new stream with buffered content
    return createStreamFromText(bufferedText);
  } else {
    console.log('[gift-fix] ❌ Gift NOT properly acknowledged, using fallback');
    // Generate and stream fallback response
    const fallbackText = generateGiftFallback(userMessage, userName, companionName);
    return createStreamFromText(fallbackText);
  }
}

/**
 * Helper: Creates SSE stream from text
 */
function createStreamFromText(text: string): ReadableStream {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    start(controller) {
      // Send text as SSE event
      const event = JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text }
      });
      controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      
      // Send stop event
      const stopEvent = JSON.stringify({ type: 'message_stop' });
      controller.enqueue(encoder.encode(`data: ${stopEvent}\n\n`));
      
      controller.close();
    }
  });
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  CRITICAL_GIFT_PROTOCOL,
  detectGiftAcknowledgment,
  generateGiftFallback,
  processGiftResponse,
};
