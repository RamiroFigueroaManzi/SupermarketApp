import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginPage from "@/components/auth/LoginPage";

export default async function Login() {
  const session = await auth();

  if (session?.user) {
    const role = session.user.role;
    if (role === "cliente") redirect("/cliente");
    if (role === "OPERADOR") redirect("/operador");
    if (role === "ADMINISTRADOR") redirect("/admin");
  }

  return <LoginPage />;
}
