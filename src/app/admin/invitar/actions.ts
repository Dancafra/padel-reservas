"use server";

import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function createInvite(
  email: string,
  fullName: string,
  houseNumber: string,
  createdBy: string,
  role: "admin" | "resident" = "resident"
) {
  try {
    const admin = await createAdminClient();
    const token = crypto.randomBytes(32).toString("hex");

    const { data, error } = await admin
      .from("invite_tokens")
      .insert({
        email,
        full_name: fullName,
        house_number: houseNumber,
        role,
        token,
        created_by: createdBy,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteInvite(inviteId: string) {
  try {
    const admin = await createAdminClient();
    const { error } = await admin
      .from("invite_tokens")
      .delete()
      .eq("id", inviteId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
