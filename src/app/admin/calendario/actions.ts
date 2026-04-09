"use server";

import { createClient } from "@/lib/supabase/server";

export async function cancelReservationAsAdmin(reservationId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "No autenticado", success: false };
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return { error: "No autorizado", success: false };
    }

    // Delete the reservation and related player names
    console.log("Attempting to delete reservation:", reservationId);

    // First delete player names
    const { error: playerError } = await supabase
      .from("reservation_players")
      .delete()
      .eq("reservation_id", reservationId);

    if (playerError) {
      console.error("Error deleting player names:", playerError);
    }

    // Then delete the reservation
    const { error: resError, data } = await supabase
      .from("reservations")
      .delete()
      .eq("id", reservationId)
      .select();

    if (resError) {
      console.error("Error deleting reservation:", resError);
      return { error: `Error: ${resError.message}`, success: false };
    }

    console.log("Reservation deleted successfully:", reservationId, "Data:", data);
    return { error: "", success: true };
  } catch (error) {
    console.error("Exception in cancelReservationAsAdmin:", error);
    return { error: `Error inesperado: ${error instanceof Error ? error.message : String(error)}`, success: false };
  }
}
