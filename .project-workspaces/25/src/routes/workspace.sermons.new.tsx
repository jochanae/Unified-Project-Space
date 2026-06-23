/**
 * /workspace/sermons/new — redirect only.
 *
 * The new sermon flow now lives at /workspace/sermons/choice.
 * Any incoming links (including the Bible bridge) are forwarded
 * with search params preserved.
 */

import { createFileRoute, Navigate, useSearch } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/sermons/new")({
  head: () => ({
    meta: [{ title: "New Sermon — SanctumIQ" }, { name: "robots", content: "noindex" }],
  }),
  component: RedirectToChoice,
});

function RedirectToChoice() {
  return (
    <Navigate
      to="/workspace/sermons/choice"
      search={{ scripture: undefined, scriptureText: undefined, path: undefined }}
      replace
    />
  );
}
