import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/components/RouteErrorBoundary";

export const Route = createFileRoute("/workspace")({
  component: WorkspaceLayout,
  errorComponent: RouteErrorFallback,
});

function WorkspaceLayout() {
  return <Outlet />;
}
