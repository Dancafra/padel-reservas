"use server";

import { createClient } from "@/lib/supabase/server";
import { parseQRDateTimeToUTC } from "@/lib/constants";

export async function cancelReservation(formData: FormData) {
  const reservationId = formData.get("reservationId") as string;
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "No autenticado", success: false };
    }

    // Verify the reservation belongs to the user and get details
    const { data: reservation } = await supabase
      .from("reservations")
      .select("user_id, reservation_date, slot_start")
      .eq("id", reservationId)
      .single();

    if (!reservation || reservation.user_id !== user.id) {
      return { error: "No autorizado", success: false };
    }

    // Verify cancellation is allowed (more than 120 minutes before start)
    // Use absolute UTC times — the reservation time is interpreted as QR time
    const nowUTC = new Date();
    const reservationUTC = parseQRDateTimeToUTC(
      reservation.reservation_date,
      reservation.slot_start
    );
    const timeUntilStart = reservationUTC.getTime() - nowUTC.getTime();
    const twoHoursMs = 120 * 60 * 1000;

    if (timeUntilStart <= twoHoursMs) {
      return { error: "Solo puedes cancelar hasta 2 horas antes de que comience", success: false };
    }

    // Delete the reservation
    const { error } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservationId);

    if (error) {
      return { error: "Error cancelando reserva", success: false };
    }

    return { error: "", success: true };
  } catch (error) {
    return { error: "Error inesperado", success: false };
  }
}
