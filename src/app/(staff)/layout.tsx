import { requireProfile } from "@/lib/auth";
import { NavBar, type NavLink } from "@/components/NavBar";

export const dynamic = "force-dynamic";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  const links: NavLink[] = [
    { href: "/record", label: "録音" },
    { href: "/history", label: "スコア履歴" },
  ];
  if (profile.role === "admin") {
    links.push({ href: "/dashboard", label: "管理画面" });
  }

  return (
    <div className="min-h-screen">
      <NavBar
        displayName={profile.display_name}
        roleLabel={profile.role === "admin" ? "管理者" : "スタッフ"}
        links={links}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
