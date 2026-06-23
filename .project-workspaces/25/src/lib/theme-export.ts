/**
 * Exports the live computed theme tokens (CSS custom properties) from both
 * :root and .parchment as a single self-contained CSS file. Useful for
 * dropping the SanctumIQ palette into another project.
 */

export function exportThemeSnapshot(): string {
  if (typeof window === "undefined") return "";

  const root = document.documentElement;
  const lines: string[] = [
    "/* SanctumIQ — exported theme snapshot",
    `   Generated: ${new Date().toISOString()}`,
    "   Drop into any project as the source of truth for tokens. */",
    "",
  ];

  // Read all custom properties from :root computed style
  const dark = collectVarsForElement(root, "(no .parchment)");
  // Toggle parchment temporarily to read its overrides
  const hadParchment = root.classList.contains("parchment");
  if (!hadParchment) root.classList.add("parchment");
  const light = collectVarsForElement(root, "(.parchment active)");
  if (!hadParchment) root.classList.remove("parchment");

  lines.push(":root {");
  for (const [k, v] of dark) lines.push(`  ${k}: ${v};`);
  lines.push("}");
  lines.push("");
  lines.push(".parchment {");
  for (const [k, v] of light) {
    if (dark.get(k) !== v) lines.push(`  ${k}: ${v};`);
  }
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

/** Walk every stylesheet rule, collect declared --custom-property names, then read live values. */
function collectVarsForElement(el: HTMLElement, _label: string): Map<string, string> {
  const names = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin
    }
    if (!rules) continue;
    walkRules(rules, names);
  }
  const styles = getComputedStyle(el);
  const out = new Map<string, string>();
  Array.from(names)
    .sort()
    .forEach((name) => {
      const value = styles.getPropertyValue(name).trim();
      if (value) out.set(name, value);
    });
  return out;
}

function walkRules(rules: CSSRuleList, names: Set<string>) {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      for (let i = 0; i < rule.style.length; i++) {
        const prop = rule.style.item(i);
        if (prop.startsWith("--")) names.add(prop);
      }
    } else if ("cssRules" in rule && (rule as CSSGroupingRule).cssRules) {
      walkRules((rule as CSSGroupingRule).cssRules, names);
    }
  }
}

export function downloadThemeSnapshot(): void {
  const css = exportThemeSnapshot();
  const blob = new Blob([css], { type: "text/css" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sanctumiq-theme-${new Date().toISOString().slice(0, 10)}.css`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
