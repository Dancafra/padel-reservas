# 🎾 Aldea Savia Padel

Sistema de reservas para las canchas de padel del condominio **Aldea Savia**. Permite a los condominos reservar turnos, gestionar sus reservas y a los administradores controlar bloques, invitaciones y usuarios.

**Producción:** https://padel-reservas-9e5a.vercel.app

---

## ✨ Características principales

- 📅 **Reservas diarias** — Cada condomino puede reservar turnos de 60 o 90 minutos.
- 🕘 **Reservas del día siguiente** — Se habilitan automáticamente a partir de las 9:00 AM (hora Quintana Roo).
- 🚫 **Sin empalmes** — Validación server-side que impide que dos reservas se crucen.
- 👥 **Jugadores por reserva** — Hasta 4 jugadores por turno (opcional).
- 📊 **Límite mensual** — Cada casa tiene un número máximo de turnos por mes (por defecto 12).
- ⛔ **Bloques administrativos** — Los admins pueden bloquear rangos para mantenimiento o eventos.
- ✉️ **Sistema de invitaciones** — Los admins invitan por link único (expira a los 7 días).
- 🔐 **Roles** — Residente (condomino) o Administrador.
- ⏰ **Cancelación con límite** — Solo hasta 2 horas antes del inicio del turno.
- 📱 **Mobile-first** — Diseño optimizado para teléfono, accesible desde cualquier navegador.

---

## 🛠 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend / SSR | **Next.js 15** (App Router, React Server Components) |
| Lenguaje | **TypeScript** |
| Estilos | **Tailwind CSS** |
| Base de datos | **Supabase** (PostgreSQL + Row Level Security) |
| Autenticación | **Supabase Auth** (email/password) |
| Hosting | **Vercel** |
| Zona horaria | **America/Cancun** (UTC-5, Quintana Roo) |

---

## 🚀 Puesta en marcha local

### 1. Requisitos

- Node.js 18+
- Una cuenta de Supabase con el esquema aplicado (`supabase/schema.sql`)

### 2. Instalación

```bash
cd padel-reservas
npm install
```

### 3. Variables de entorno

Crear un archivo `.env.local` en la raíz de `padel-reservas/` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_publishable_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

- `NEXT_PUBLIC_SUPABASE_URL` → URL de tu proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la **publishable key** (segura para el navegador).
- `SUPABASE_SERVICE_ROLE_KEY` → **secret key**, solo se usa en el servidor para bypass de RLS.

### 4. Correr el servidor de desarrollo

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

### 5. Build de producción

```bash
npm run build
npm start
```

---

## 🌳 Estructura del proyecto

```
padel-reservas/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login / register
│   │   ├── dashboard/           # Panel del condomino (reservar)
│   │   ├── mis-reservas/        # Ver y cancelar reservas
│   │   ├── admin/               # Panel admin (bloques, invitar, usuarios)
│   │   └── layout.tsx
│   ├── components/
│   │   └── Navigation.tsx
│   ├── lib/
│   │   ├── supabase/            # Clientes (browser / server / admin)
│   │   └── constants.ts         # Horarios, helpers de fecha/hora, TZ
│   └── middleware.ts
├── supabase/
│   └── schema.sql               # Esquema completo + RLS
├── sql/
│   └── rls-policies.sql
├── public/
└── README.md
```

---

## 🔁 Flujos principales

### Reservar una cancha (condomino)

1. Ingresa y ve el dashboard con turnos disponibles para **hoy** y **mañana**.
2. Selecciona horario → duración (60 o 90 min) → (opcional) nombres de jugadores → **Confirmar**.
3. El servidor valida contra RLS-bypass que no haya empalmes ni bloques antes de crear la reserva.

### Cancelar una reserva

- Desde "Mis Reservas", siempre que falten **más de 2 horas** para el inicio.

### Invitar a un condomino (admin)

1. Admin → **Invitar** → llena datos → crea link.
2. El link expira a los 7 días y solo puede usarse una vez.
3. El invitado se registra, elige contraseña y queda con el rol asignado.

---

## 📦 Deploy a producción (Vercel)

1. Push a `main` en GitHub.
2. Vercel detecta el cambio y despliega automáticamente.
3. Las variables de entorno se configuran en **Vercel → Settings → Environment Variables** (mismas tres que en `.env.local`).

---

## 📄 Documentación técnica

Para más detalle sobre arquitectura, esquema de base de datos, RLS, flujos y decisiones de diseño, consultar [`DOCUMENTATION.md`](./DOCUMENTATION.md).

---

## 📬 Contacto

Proyecto interno del condominio Aldea Savia. Para soporte, contactar al administrador del sistema.
