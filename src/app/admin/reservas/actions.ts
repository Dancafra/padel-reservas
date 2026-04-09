"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function createReservationAsAdmin(
  _prevState: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    const email = formData.get("email") as string;
    const fullName = formData.get("full_name") as string;
    const houseNumber = formData.get("house_number") as string;
    const reservationDate = formData.get("reservation_date") as string;
    const slotStart = formData.get("slot_start") as string;
    const durationStr = formData.get("duration") as string;
    const duration = parseInt(durationStr) || 60;
    const playerNamesJson = formData.get("player_names") as string;
    const playerNames = playerNamesJson ? JSON.parse(playerNamesJson) : [];

    if (!email || !fullName || !houseNumber || !reservationDate || !slotStart) {
      return { error: "Todos los campos son requeridos", success: false };
    }

    // Validate user is admin
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      return { error: "No autenticado", success: false };
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return { error: "Permiso denegado", success: false };
    }

    // Find or create the user
    let userId: string;
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create new user with admin client (bypasses RLS)
      const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        email_confirm: true,
      });

      if (createUserError || !newUser.user) {
        return { error: "Error creando usuario", success: false };
      }

      userId = newUser.user.id;

      // Create profile for new user
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: fullName,
          house_number: houseNumber,
          role: "resident",
          monthly_slots_limit: 8,
        });

      if (profileError) {
        return { error: "Error creando perfil", success: false };
      }
    }

    // Calculate slot end based on duration
    const [hours, minutes] = slotStart.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const slotEnd = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}:00`;

    const { data: reservation, error: reservationError } = await adminClient
      .from("reservations")
      .insert({
        user_id: userId,
        reservation_date: reservationDate,
        slot_start: slotStart,
        slot_end: slotEnd,
        status: "confirmed",
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      return { error: `Error creando reserva: ${reservationError?.message || "No data"}`, success: false };
    }

    // Save player names if provided
    if (playerNames.length > 0) {
      const playersToInsert = playerNames.map((name: string, idx: number) => ({
        reservation_id: reservation.id,
        player_name: name,
        slot_number: idx + 1,
      }));

      const { error: playersError } = await adminClient
        .from("reservation_players")
        .insert(playersToInsert);

      if (playersError) {
        return { error: "Error guardando nombres de jugadores", success: false };
      }
    }

    return { error: "", success: true };
  } catch (error) {
    return { error: "Error inesperado", success: false };
  }
}
