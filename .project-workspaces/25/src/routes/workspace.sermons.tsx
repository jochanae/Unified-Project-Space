import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/sermons")({
  component: SermonsLayout,
});

function SermonsLayout() {
  return <Outlet />;
}
