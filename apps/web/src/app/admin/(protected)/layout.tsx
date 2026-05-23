import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "../admin-shell";

const ADMIN_ROLES = new Set(["admin", "operator", "support"]);

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");

  const role = (session.user as { role?: string }).role;
  if (!role || !ADMIN_ROLES.has(role)) redirect("/admin/login?error=forbidden");

  return (
    <AdminShell
      user={{ name: session.user.name ?? null, email: session.user.email, role }}
    >
      {children}
    </AdminShell>
  );
}
