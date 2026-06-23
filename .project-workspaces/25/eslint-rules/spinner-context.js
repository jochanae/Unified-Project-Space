/**
 * Custom ESLint rule: prefer `context=` over `size=` on LoadingSpinner,
 * and warn when neither is provided.
 *
 * Wired into eslint.config.js as the "local/spinner-context" rule.
 */
const VALID_CONTEXTS = new Set(["page", "content", "section", "inline", "button"]);

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer LoadingSpinner `context` prop over `size`; require one of them. See docs/spinner.md.",
    },
    schema: [],
    messages: {
      preferContext:
        "Prefer `context=` over `size=` on <LoadingSpinner />. `size` is an escape hatch — see docs/spinner.md.",
      missingContext:
        '<LoadingSpinner /> is missing `context=` (one of: page, content, section, inline, button). It will fall back to size "md".',
      invalidContext:
        "Invalid LoadingSpinner context. Use one of: page, content, section, inline, button.",
    },
  },
  create(ctx) {
    return {
      JSXOpeningElement(node) {
        if (node.name?.type !== "JSXIdentifier" || node.name.name !== "LoadingSpinner") return;

        const sizeAttr = node.attributes.find(
          (a) => a.type === "JSXAttribute" && a.name?.name === "size",
        );
        const contextAttr = node.attributes.find(
          (a) => a.type === "JSXAttribute" && a.name?.name === "context",
        );

        if (sizeAttr) {
          ctx.report({ node: sizeAttr, messageId: "preferContext" });
        }

        if (!contextAttr && !sizeAttr) {
          ctx.report({ node, messageId: "missingContext" });
          return;
        }

        if (contextAttr?.value?.type === "Literal" && typeof contextAttr.value.value === "string") {
          if (!VALID_CONTEXTS.has(contextAttr.value.value)) {
            ctx.report({ node: contextAttr, messageId: "invalidContext" });
          }
        }
      },
    };
  },
};
