import { redirect } from "next/navigation";

// Esta página fue removida. Redirigir al dashboard.
export default function AcompanantesPage() {
  redirect("/dashboard");
}
