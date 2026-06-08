import { redirect } from "next/navigation";
import { getProfile, homePathForRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const profile = await getProfile();
  redirect(profile ? homePathForRole(profile.role) : "/login");
}
