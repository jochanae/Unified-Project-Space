import type { VaultCollection, VaultItem } from "@/lib/vault";

function colorLabel(id: string | null | undefined): string {
  const map: Record<string, string> = {
    gold: "Gold",
    amber: "Amber",
    rose: "Rose",
    violet: "Violet",
    indigo: "Indigo",
    teal: "Teal",
    emerald: "Emerald",
    slate: "Slate",
  };
  return map[id ?? "gold"] ?? "Gold";
}

export function collectionToMarkdown(collection: VaultCollection, items: VaultItem[]): string {
  const lines: string[] = [];
  lines.push(`# ${collection.title}`);
  lines.push("");
  if (collection.master_thought) {
    lines.push(`> ${collection.master_thought}`);
    lines.push("");
  }
  if (collection.description) {
    lines.push(collection.description);
    lines.push("");
  }
  lines.push(
    `*${items.length} ${items.length === 1 ? "entry" : "entries"} • Accent: ${colorLabel(collection.color)} • exported ${new Date().toLocaleDateString()}*`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const item of items) {
    if (item.scripture_ref) {
      lines.push(`## ${item.scripture_ref}${item.version ? ` (${item.version})` : ""}`);
    } else if (item.item_type === "note") {
      lines.push(`## Note`);
    } else {
      lines.push(`## Entry`);
    }
    lines.push("");
    if (item.quote_text) {
      const quoted = item.quote_text
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n");
      lines.push(quoted);
      lines.push("");
    }
    if (item.note_text) {
      lines.push(item.note_text);
      lines.push("");
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "collection"
  );
}

export function downloadTextFile(filename: string, content: string, mime = "text/markdown") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
