import { requireAdmin } from "@/lib/auth";
import { NavBar, type NavLink } from "@/components/NavBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  const links: NavLink[] = [
    { href: "/dashboard", label: "ダッシュボード" },
    { href: "/scripts", label: "スクリプト" },
    { href: "/members", label: "スタッフ・店舗" },
    { href: "/record", label: "録音" },
  ];

  return (
    <div className="min-h-screen">
      <NavBar
        displayName={profile.display_name}
        roleLabel="管理者"
        links={links}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
