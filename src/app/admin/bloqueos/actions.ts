"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { getSlotEnd, COURT_OPEN_HOUR, COURT_CLOSE_HOUR } from "@/lib/constants";

export async function createBlockedSlot(
  blockStartDate: string,
  blockEndDate: string,
  slotStart: string,
  slotEnd: string,
  reason: string,
  createdBy: string
) {
  try {
    const admin = await createAdminClient();
    
    // Si no se especifica hora de fin, usar la duración estándar
    let finalSlotEnd = slotEnd;
    if (!slotEnd || slotEnd === slotStart) {
      finalSlotEnd = getSlotEnd(slotStart);
    }

    // Parsear fechas correctamente en Quintana Roo (no UTC)
    const [startYear, startMonth, startDay] = blockStartDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = blockEndDate.split("-").map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    // Generar registros para cada día en el rango
    const records: any[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const currentDate = `${year}-${month}-${day}`;

      let blockStart = slotStart;
      let blockEnd = finalSlotEnd;

      // Si es el primer día y no es el único día
      if (currentDate === blockStartDate && blockStartDate !== blockEndDate) {
        blockStart = slotStart;
        blockEnd = `${String(COURT_CLOSE_HOUR).padStart(2, "0")}:00`;
      }
      // Si es el último día
      else if (currentDate === blockEndDate && blockStartDate !== blockEndDate) {
        blockStart = `${String(COURT_OPEN_HOUR).padStart(2, "0")}:00`;
        blockEnd = finalSlotEnd;
      }
      // Si es un día intermedio
      else if (blockStartDate !== blockEndDate) {
        blockStart = `${String(COURT_OPEN_HOUR).padStart(2, "0")}:00`;
        blockEnd = `${String(COURT_CLOSE_HOUR).padStart(2, "0")}:00`;
      }

      records.push({
        block_date: currentDate,
        slot_start: blockStart.includes(":") ? blockStart + ":00" : blockStart,
        slot_end: blockEnd.includes(":") ? blockEnd + ":00" : blockEnd,
        reason: reason.trim() || "Mantenimiento",
        created_by: createdBy,
      });
    }

    const { data, error } = await admin
      .from("blocked_slots")
      .insert(records)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteBlockedSlot(slotId: string) {
  try {
    const admin = await createAdminClient();
    const { error } = await admin
      .from("blocked_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
