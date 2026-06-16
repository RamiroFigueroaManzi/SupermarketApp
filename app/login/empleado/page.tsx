import EmployeeLoginForm from "@/components/auth/EmployeeLoginForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function EmployeeLoginPage() {
  const session = await auth();
  if (session?.user) {
    if (session.user.role === "OPERADOR") redirect("/operador");
    if (session.user.role === "ADMINISTRADOR") redirect("/admin");
  }
  return <EmployeeLoginForm />;
}
