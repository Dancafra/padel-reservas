"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

function slotsOverlap(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && s2 < e1;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function createReservationAsAdmin(
  _prevState: { error: string; success: boolean },
  formData: FormData
): Promise<{ error: string; success: boolean }> {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    const email = (formData.get("email") as string)?.trim();
    const fullName = (formData.get("full_name") as string)?.trim();
    const houseNumber = (formData.get("house_number") as string)?.trim();
    const reservationDate = formData.get("reservation_date") as string;
    const slotStartRaw = formData.get("slot_start") as string; // "HH:MM:00"
    const durationStr = formData.get("duration") as string;
    const duration = parseInt(durationStr) || 60;
    const playerNamesJson = formData.get("player_names") as string;
    const playerNames: string[] = playerNamesJson ? JSON.parse(playerNamesJson) : [];

    if (!email || !fullName || !houseNumber || !reservationDate || !slotStartRaw) {
      return { error: "Todos los campos son requeridos", success: false };
    }

    // Normalizar hora a HH:MM
    const slotStartHHMM = slotStartRaw.substring(0, 5);

    // Validar admin
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

    // Calcular fin del turno
    const slotEndHHMM = addMinutes(slotStartHHMM, duration);
    if (slotEndHHMM > "22:00") {
      return { error: "El turno no puede terminar después de las 22:00", success: false };
    }

    // Validar conflictos con reservas existentes
    const { data: existingReservations, error: resQueryError } = await adminClient
      .from("reservations")
      .select("slot_start, slot_end")
      .eq("reservation_date", reservationDate)
      .eq("status", "confirmed");

    if (resQueryError) {
      return { error: "Error consultando reservas: " + resQueryError.message, success: false };
    }

    const reservationConflict = (existingReservations ?? []).some((r) =>
      slotsOverlap(
        slotStartHHMM,
        slotEndHHMM,
        r.slot_start.substring(0, 5),
        r.slot_end.substring(0, 5)
      )
    );
    if (reservationConflict) {
      return {
        error: `Ese horario (${slotStartHHMM}-${slotEndHHMM}) choca con otra reserva existente`,
        success: false,
      };
    }

    // Validar conflictos con bloques administrativos
    const { data: existingBlocks } = await adminClient
      .from("blocked_slots")
      .select("slot_start, slot_end")
      .eq("block_date", reservationDate);

    const blockConflict = (existingBlocks ?? []).some((b) =>
      slotsOverlap(
        slotStartHHMM,
        slotEndHHMM,
        b.slot_start.substring(0, 5),
        b.slot_end.substring(0, 5)
      )
    );
    if (blockConflict) {
      return { error: "Ese horario está bloqueado", success: false };
    }

    // Buscar o crear usuario
    let userId: string;
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: newUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password:
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15),
        email_confirm: true,
      });

      if (createUserError || !newUser.user) {
        return {
          error: "Error creando usuario: " + (createUserError?.message ?? "desconocido"),
          success: false,
        };
      }

      userId = newUser.user.id;

      const { error: profileError } = await adminClient.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName,
        house_number: houseNumber,
        role: "resident",
        monthly_slots_limit: 12,
      });

      if (profileError) {
        return { error: "Error creando perfil: " + profileError.message, success: false };
      }
    }

    // Crear reserva
    const slotStartDb = slotStartHHMM + ":00";
    const slotEndDb = slotEndHHMM + ":00";

    const { data: reservation, error: reservationError } = await adminClient
      .from("reservations")
      .insert({
        user_id: userId,
        reservation_date: reservationDate,
        slot_start: slotStartDb,
        slot_end: slotEndDb,
        status: "confirmed",
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      return {
        error: "Error creando reserva: " + (reservationError?.message ?? "sin datos"),
        success: false,
      };
    }

    // Guardar jugadores (si los hay)
    const cleanedPlayers = playerNames
      .map((name, idx) => ({ name: (name ?? "").trim(), slot: idx + 1 }))
      .filter((p) => p.name !== "");

    if (cleanedPlayers.length > 0) {
      const playersToInsert = cleanedPlayers.map((p) => ({
        reservation_id: reservation.id,
        player_name: p.name,
        slot_number: p.slot,
      }));

      const { error: playersError } = await adminClient
        .from("reservation_players")
        .insert(playersToInsert);

      if (playersError) {
        // Rollback: eliminar la reserva para no dejar estado inconsistente
        await adminClient.from("reservations").delete().eq("id", reservation.id);
        return {
          error: "Error guardando nombres de jugadores: " + playersError.message,
          success: false,
        };
      }
    }

    return { error: "", success: true };
  } catch (error: any) {
    return { error: "Error inesperado: " + (error?.message ?? String(error)), success: false };
  }
}
