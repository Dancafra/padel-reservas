"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(
  _prevState: { error: string; email?: string },
  formData: FormData
): Promise<{ error: string; email?: string }> {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Mensajes de error más específicos
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Correo o contraseña incorrectos", email };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Por favor confirma tu correo antes de iniciar sesión", email };
    }
    return { error: error.message, email };
  }

  redirect("/dashboard");
}
