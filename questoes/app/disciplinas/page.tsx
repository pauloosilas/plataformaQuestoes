import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import DisciplineManager from "./discipline-manager";

export const instant = false;

export default async function DisciplinesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return <DisciplineManager />;
}
