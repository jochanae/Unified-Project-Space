/**
 * PoemImportDialog — bring an existing poem into the Library.
 *
 * Paste is primary. File upload (.txt / .docx / .pdf) is optional and lazy.
 * On confirm, we create a `heart_cry` poem with the imported body and an
 * optional user-supplied title (or derived from the first line).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, Loader2, FileText, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createPoem } from "@/lib/poems";
import { extractPoemText, deriveTitle, validatePoemText, PoemImportError } from "@/lib/poemImport";

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onImported: (poemId: string) => void;
}

export function PoemImportDialog({ open, userId, onClose, onImported }: Props) {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"file" | "save" | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setTitle("");
      setBusy(null);
      setFilename(null);
      setShowPreview(false);
    }
  }, [open]);

  const preview = useMemo(() => {
    if (!text.trim()) return { ok: false as const, body: "", error: "Nothing to preview yet." };
    try {
      const body = validatePoemText(text);
      return { ok: true as const, body, error: null };
    } catch (err) {
      const msg = err instanceof PoemImportError ? err.message : "Couldn't clean this text.";
      return { ok: false as const, body: "", error: msg };
    }
  }, [text]);

  const stanzaCount = useMemo(
    () => (preview.ok ? preview.body.split(/\n{2,}/).filter((s) => s.trim()).length : 0),
    [preview],
  );
  const lineCount = useMemo(
    () => (preview.ok ? preview.body.split("\n").filter((l) => l.trim()).length : 0),
    [preview],
  );

  if (!open) return null;

  const handleFile = async (file: File) => {
    setBusy("file");
    try {
      const result = await extractPoemText(file);
      setText(result.text);
      setFilename(result.filename);
      if (!title.trim()) setTitle(deriveTitle(result.text));
    } catch (err) {
      const msg = err instanceof PoemImportError ? err.message : "Couldn't read that file.";
      toast.error(msg);
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    let body: string;
    try {
      body = validatePoemText(text);
    } catch (err) {
      const msg =
        err instanceof PoemImportError ? err.message : "Check the poem text and try again.";
      toast.error(msg);
      return;
    }
    setBusy("save");
    try {
      const finalTitle = title.trim().slice(0, 120) || deriveTitle(body);
      const record = await createPoem({
        userId,
        data: { template: "heart_cry", body },
        title: finalTitle || undefined,
        inspiration: filename ? `Imported from ${filename}` : undefined,
      });
      toast.success("Poem imported.");
      onImported(record.id);
    } catch {
      toast.error("Couldn't save the poem. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-obsidian/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg hairline rounded-2xl bg-obsidian-elevated/95 backdrop-blur-md p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">Import poem</p>
            <h2 className="font-display text-xl text-foreground mt-1">Paste an existing poem</h2>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Paste the text below — or upload a small .txt, .docx, or .pdf. It joins your library
              like any other poem.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Title (optional)
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave blank to use the first line"
            className="w-full hairline rounded-md bg-obsidian/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 caret-gold"
            aria-label="Leave blank to use the first line"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
              Poem text
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-gold-soft/80 hover:text-gold transition-colors disabled:opacity-50"
            >
              {busy === "file" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Upload file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx,.pdf,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste your poem here…"
            className="w-full hairline rounded-md bg-obsidian/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 caret-gold leading-relaxed font-display italic resize-y"
          />
          {filename && (
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
              <FileText className="h-3 w-3" /> {filename}
            </p>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              disabled={!text.trim()}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-gold-soft/80 hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showPreview ? "Hide preview" : "Preview cleaned text"}
            </button>
          </div>

          {showPreview && (
            <div className="hairline rounded-md bg-obsidian/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">Preview</p>
                {preview.ok && (
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                    {stanzaCount} {stanzaCount === 1 ? "stanza" : "stanzas"} · {lineCount}{" "}
                    {lineCount === 1 ? "line" : "lines"}
                  </p>
                )}
              </div>
              {preview.ok ? (
                <pre className="font-display italic text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto m-0">
                  {preview.body}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground/70 italic">{preview.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy !== null || !text.trim()}
            className={cn(
              "text-xs uppercase tracking-widest px-4 py-2 rounded-md hairline transition-colors inline-flex items-center gap-1.5",
              text.trim() && busy === null
                ? "bg-gold/15 text-gold-soft hover:bg-gold/25"
                : "text-muted-foreground/40 cursor-not-allowed",
            )}
          >
            {busy === "save" && <Loader2 className="h-3 w-3 animate-spin" />}
            Save to library
          </button>
        </div>
      </div>
    </div>
  );
}
