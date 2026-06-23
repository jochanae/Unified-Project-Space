import { toast } from "sonner";
import { addVerseToCollection, getActiveCollectionId } from "@/lib/vault";

/**
 * Adds a verse (or verse range) to the user's currently Active Collection.
 * If no Active Collection is set, prompts the user to pick one in the Vault.
 */
export async function addVerseToActiveVault(
  userId: string,
  payload: {
    book: string;
    chapter: number;
    verse_start: number;
    verse_end?: number;
    version?: string;
    quote_text?: string;
  },
): Promise<boolean> {
  const collectionId = getActiveCollectionId();
  if (!collectionId) {
    toast("Pick an Active Study first", {
      description: "Open the Vault and tap 'Set active' on a collection.",
      action: {
        label: "Open Vault",
        onClick: () => {
          window.location.href = "/vault";
        },
      },
    });
    return false;
  }
  try {
    await addVerseToCollection(userId, collectionId, payload);
    const ref =
      payload.verse_end && payload.verse_end !== payload.verse_start
        ? `${payload.book} ${payload.chapter}:${payload.verse_start}-${payload.verse_end}`
        : `${payload.book} ${payload.chapter}:${payload.verse_start}`;
    toast(`Added ${ref} to Vault`);
    return true;
  } catch {
    toast.error("Could not add to Vault.");
    return false;
  }
}
