"use server";

import { createAdminClient } from "@/lib/supabase/server";

export async function createProfileFromInvite(
  userId: string,
  email: string,
  fullName: string,
  houseNumber: string,
  role: "admin" | "resident" = "resident",
  token: string
) {
  try {
    const admin = await createAdminClient();

    // 1. Crear perfil
    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      email,
      full_name: fullName,
      house_number: houseNumber,
      role: role,
      is_active: true,
      monthly_slots_limit: 12,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return { success: false, error: "Perfil: " + profileError.message };
    }

    // 2. Marcar invite como usado
    const { error: updateError } = await admin
      .from("invite_tokens")
      .update({ is_used: true })
      .eq("token", token);

    if (updateError) {
      console.error("Token update error:", updateError);
      return { success: false, error: "Token: " + updateError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Server action error:", err);
    return { success: false, error: err.message || "Error desconocido" };
  }
}
