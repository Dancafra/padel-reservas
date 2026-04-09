"use client";

import { useState } from "react";
import { cancelReservation } from "./actions";

interface CancelButtonProps {
  reservationId: string;
  canCancel: boolean;
  minutesUntilStart?: number;
}

export default function CancelButton({ reservationId, canCancel, minutesUntilStart }: CancelButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("¿Estás seguro de que quieres cancelar esta reserva?")) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.set("reservationId", reservationId);

    const result = await cancelReservation(formData);

    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error || "Error al cancelar la reserva");
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={!canCancel || isLoading}
      className={`text-xs font-medium px-2 py-1 rounded ${
        canCancel
          ? "bg-red-100 text-red-600 hover:bg-red-200"
          : "bg-gray-100 text-gray-400 cursor-not-allowed"
      }`}
      title={canCancel ? "Cancelar reserva" : `Solo puedes cancelar 3 horas antes (faltan ${minutesUntilStart} min)`}
    >
      {isLoading ? "Cancelando..." : "Cancelar"}
    </button>
  );
}
