import { redirect } from "next/navigation";

/**
 * The root path itself renders nothing. Middleware has already decided,
 * before this ever runs, whether the request should go to /login,
 * /admin/dashboard, or /r — this just covers the case where middleware
 * let an authenticated-but-unrouted request through.
 */
export default function RootPage() {
  redirect("/login");
}
