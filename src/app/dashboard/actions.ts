"use server";

import { createAdminClient } from "@/lib/supabase/server";

function slotsOverlap(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && s2 < e1;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function createReservation(
  userId: string,
  reservationDate: string,
  startTime: string,
  duration: 60 | 90,
  playerNames: string[]
) {
  try {
    const admin = await createAdminClient();
    const endTime = addMinutes(startTime, duration);

    // 1. Verificar conflictos con todas las reservas (todos los usuarios)
    const { data: existing } = await admin
      .from("reservations")
      .select("slot_start, slot_end")
      .eq("reservation_date", reservationDate)
      .eq("status", "confirmed");

    const conflict = (existing ?? []).some((r) =>
      slotsOverlap(
        startTime,
        endTime,
        r.slot_start.substring(0, 5),
        r.slot_end.substring(0, 5)
      )
    );

    if (conflict) {
      return { success: false, error: "Ese horario ya fue tomado por otro usuario." };
    }

    // 2. Verificar conflictos con bloques administrativos
    const { data: blocks } = await admin
      .from("blocked_slots")
      .select("slot_start, slot_end")
      .eq("block_date", reservationDate);

    const blockedConflict = (blocks ?? []).some((b) =>
      slotsOverlap(
        startTime,
        endTime,
        b.slot_start.substring(0, 5),
        b.slot_end.substring(0, 5)
      )
    );

    if (blockedConflict) {
      return { success: false, error: "Ese horario está bloqueado." };
    }

    // 3. Crear la reserva
    const { data: reservation, error: resError } = await admin
      .from("reservations")
      .insert({
        user_id: userId,
        reservation_date: reservationDate,
        slot_start: startTime + ":00",
        slot_end: endTime + ":00",
        status: "confirmed",
      })
      .select()
      .single();

    if (resError || !reservation) {
      return { success: false, error: "No se pudo crear la reserva: " + resError?.message };
    }

    // 4. Guardar jugadores
    const playersToInsert = playerNames
      .map((name, idx) => ({ name: name.trim(), slot: idx + 1 }))
      .filter((p) => p.name !== "")
      .map((p) => ({
        reservation_id: reservation.id,
        player_name: p.name,
        slot_number: p.slot,
      }));

    if (playersToInsert.length > 0) {
      const { error: playersError } = await admin
        .from("reservation_players")
        .insert(playersToInsert);

      if (playersError) {
        // Rollback: eliminar la reserva recién creada para evitar estado inconsistente
        await admin.from("reservations").delete().eq("id", reservation.id);
        return {
          success: false,
          error: "No se pudieron guardar los jugadores: " + playersError.message,
        };
      }
    }

    return { success: true, count: playersToInsert.length, startTime, endTime, duration };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Error inesperado" };
  }
}
