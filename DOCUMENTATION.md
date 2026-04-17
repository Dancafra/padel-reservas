# 📘 Documentación técnica — Aldea Savia Padel

Esta documentación está pensada para que cualquier ingeniero (o persona no-técnica con paciencia) pueda tomar el proyecto, entender cómo está construido, y modificarlo con confianza.

---

## 1. Visión general

**Aldea Savia Padel** es una aplicación web de reservas para las canchas de padel de un condominio. Solo hay **una cancha**, por lo que nunca pueden existir dos reservas que se crucen en el tiempo.

### Actores

- **Condomino (residente)**: Una cuenta por casa. Puede reservar hasta N turnos por mes (configurable por usuario, default 12).
- **Administrador**: Gestiona bloques de mantenimiento, invita nuevos condominos, ajusta límites mensuales, ve todas las reservas.

### Reglas de negocio clave

1. **Un solo turno activo por día** por condomino (hoy y mañana son los únicos días reservables).
2. **Duración** — 60 o 90 minutos. La opción de 90 min solo aparece habilitada si no hay conflicto con las siguientes reservas/bloques.
3. **Apertura de mañana** — las reservas para el día siguiente se liberan a las **09:00 AM (hora Quintana Roo)**.
4. **Cancelación** — permitida hasta **2 horas antes** del inicio del turno, y solo desde la pantalla "Mis Reservas".
5. **Horario de cancha** — turnos válidos hasta las 22:00 (ningún turno puede terminar después).
6. **Bloques administrativos** — permiten al admin marcar rangos como no-reservables (mantenimiento, torneos, etc.).
7. **Límite mensual** — contador de reservas `confirmed` del usuario en el mes actual vs. `monthly_slots_limit`.
8. **Invitaciones** — único mecanismo de creación de cuentas. Link único, expira en 7 días, un solo uso. Una casa no puede tener dos condominos activos.

---

## 2. Stack y arquitectura

### Stack

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Server Components + Server Actions |
| Lenguaje | TypeScript (strict) | |
| UI | Tailwind CSS | Sin librería de componentes; estilos utilitarios |
| DB | PostgreSQL (Supabase) | Con Row Level Security activado |
| Auth | Supabase Auth | Email + password |
| Hosting | Vercel | Despliegue automático desde `main` |

### Diagrama lógico

```
┌─────────────┐
│  Navegador  │
│  (React)    │
└──────┬──────┘
       │  HTTPS
       ▼
┌──────────────────────────────┐
│  Next.js (Vercel)            │
│  ┌────────────────────────┐  │
│  │ Server Components      │  │  ← rendering + fetch de datos
│  │ Server Actions         │  │  ← mutaciones con admin client
│  │ Middleware (auth)      │  │  ← refresca sesión en cada request
│  └────────────────────────┘  │
└──────┬───────────────┬───────┘
       │               │
       │ anon key      │ service_role key (solo servidor)
       ▼               ▼
┌──────────────────────────────┐
│  Supabase                    │
│  - Auth                      │
│  - Postgres + RLS            │
└──────────────────────────────┘
```

### Los tres clientes Supabase

Definidos en `src/lib/supabase/`:

| Cliente | Dónde vive | Llave | Uso |
|---|---|---|---|
| `createClient()` (browser) | `client.ts` | anon (publishable) | UI interactiva del cliente |
| `createClient()` (server) | `server.ts` | anon + cookies sesión | Server Components/Actions autenticadas |
| `createAdminClient()` | `server.ts` | **service role** | Solo servidor, **bypass de RLS** cuando se necesita ver/escribir transversalmente |

**⚠️ Nunca** exponer la `service_role` key al navegador. Solo se usa dentro de Server Actions.

---

## 3. Esquema de base de datos

Ver archivo completo en `supabase/schema.sql`.

### Tablas

#### `profiles`
Perfil de cada usuario (extensión de `auth.users`).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | FK a `auth.users(id)` |
| `email` | text unique | |
| `full_name` | text | |
| `house_number` | text **nullable** | null para admins |
| `role` | text | `'resident'` o `'admin'` |
| `monthly_slots_limit` | int | Default 12 |
| `created_at` | timestamptz | |

#### `reservations`
Turnos reservados.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid | FK → profiles |
| `reservation_date` | date | |
| `slot_start` | time | |
| `slot_end` | time | |
| `status` | text | `'confirmed'` / `'cancelled'` |
| `created_at` | timestamptz | |

#### `reservation_players`
Jugadores por reserva (hasta 4, opcionales).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `reservation_id` | uuid | FK → reservations (ON DELETE CASCADE) |
| `player_name` | text | |
| `slot_number` | int | 1–4, UNIQUE por reserva |

#### `blocked_slots`
Bloques administrativos.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `block_date` | date | |
| `slot_start` | time | |
| `slot_end` | time | |
| `reason` | text | Opcional |

#### `slot_notifications`
"Avísame si se libera" (stub — infra de envío pendiente).

| Columna | Tipo |
|---|---|
| `user_id` | uuid |
| `notification_date` | date |
| `slot_start` | time |
| `is_sent` | bool |

#### `invite_tokens`
Invitaciones para registrar condominos o admins.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `email` | text | |
| `full_name` | text | |
| `house_number` | text **nullable** | null para admins |
| `role` | text | `'admin'` o `'resident'` |
| `token` | text unique | Token del link |
| `created_by` | uuid | FK → profiles |
| `is_used` | bool | Default false |
| `expires_at` | timestamptz | +7 días |

### Row Level Security (RLS)

Todas las tablas tienen RLS activado. Políticas típicas:

- Los residentes ven **solo sus propios** datos.
- Los admins ven **todo**.
- Escrituras se restringen por `user_id = auth.uid()` o `role = 'admin'`.

**Consecuencia importante**: cuando un condomino quiere ver los turnos ocupados para decidir si reservar, necesita conocer los turnos de **otros** usuarios. Por RLS, con la anon key no los vería. Por eso **la carga de `takenSlots` y la creación de reservas usan el admin client** desde el servidor, donde se pueden hacer las validaciones con visibilidad total y sin comprometer seguridad.

---

## 4. Carpeta por carpeta

### `src/app/dashboard/`

Panel del residente para reservar.

- `page.tsx` — Server Component. Carga perfil, contador mensual, turnos tomados (admin client), bloques, y pasa todo al `BookingPanel`.
- `BookingPanel.tsx` — Client Component con los 3 pasos: horario → duración → confirmar.
- `actions.ts` — Server Action `createReservation()`: valida y crea la reserva + jugadores en una sola operación usando admin client.

### `src/app/mis-reservas/`

Lista de reservas del usuario, con opción de cancelar.

- `actions.ts` → `cancelReservation()` valida que falten más de 2h y borra la reserva.

### `src/app/admin/`

- `bloques/` — crear/eliminar bloques administrativos.
- `invitar/` — crear links de invitación (residente o admin). Validaciones: email único, casa sin condomino activo, sin invitación pendiente.
- `usuarios/` — ver y ajustar perfiles (límites mensuales, roles).
- `reservas/` — ver todas las reservas.

### `src/app/register/`

Pantalla pública que consume un token de invitación. Crea el usuario en Supabase Auth y su perfil con el rol y límite asignados.

### `src/lib/constants.ts`

Contiene lógica independiente de frontend:

- `getTodayDate()`, `getTomorrowDate()` — fecha en TZ de Quintana Roo.
- `canBookNow()` — true si son ≥ 09:00 QR (habilita reservar mañana).
- `getAvailableStartTimes()` — lista de horarios de inicio.
- `slotsOverlap(s1, e1, s2, e2)` — comparación de strings `HH:MM`.
- `parseQRDateTimeToUTC(date, time)` — convierte hora QR a UTC para comparar con `new Date()`.
- `formatTime()`, `formatDate()`, `getMonthName()`.

### `src/middleware.ts`

Refresca la sesión Supabase en cada request y redirige si no hay sesión en rutas protegidas.

---

## 5. Detección de empalmes (overlap)

El corazón del sistema. Se hace **tanto en cliente (UX)** como en **servidor (autoridad)**.

### Algoritmo

Dos intervalos `[s1, e1)` y `[s2, e2)` se intersectan si:

```
s1 < e2  &&  s2 < e1
```

Como los horarios se manejan como strings `"HH:MM"` en un mismo día, la comparación lexicográfica de strings equivale a la comparación numérica. Por eso es correcto:

```ts
function slotsOverlap(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && s2 < e1;
}
```

### Cliente (BookingPanel)

`can60Min(start)` y `can90Min(start)` calculan el `end` sumando minutos y verifican contra `takenSlots` y `blockedSlots` (props que vienen del servidor). Así el botón de 90 min se **deshabilita** automáticamente si el bloque de 90 minutos chocaría con otra reserva o bloque.

### Servidor (createReservation action)

Re-valida antes de insertar:

1. Trae **todas** las reservas `confirmed` de esa fecha con admin client.
2. Trae **todos** los bloques de esa fecha.
3. Aplica `slotsOverlap` contra el `start/end` propuesto.
4. Si hay conflicto → rechaza con mensaje amigable.
5. Si no → inserta reserva; si los jugadores fallan, hace **rollback** borrando la reserva para no dejar estado inconsistente.

---

## 6. Zona horaria

El proyecto opera en **America/Cancun (UTC-5, sin DST)**.

Funciones clave en `lib/constants.ts`:

- Todas las decisiones de "qué día es hoy" y "qué hora es" se calculan convirtiendo `new Date()` a hora QR.
- Para comparar un turno futuro con "ahora" (p.ej. cancelación), se usa `parseQRDateTimeToUTC(date, time)` que genera un `Date` absoluto en UTC a partir de un par `date/time` entendidos como QR.

No almacenamos TZ en la DB: las fechas/horas en `reservations` se interpretan siempre como QR.

---

## 7. Autenticación y sesión

1. Usuario recibe link `/register?token=XYZ`.
2. Introduce password. `register/actions.ts` crea usuario Supabase Auth con `admin.createUser` y luego inserta la fila en `profiles` heredando datos del `invite_token`.
3. El token se marca `is_used = true`.
4. Sesión vía cookies gestionadas por `@supabase/ssr`. El `middleware.ts` hace `auth.getUser()` en cada request para mantenerla viva.
5. Rutas protegidas (`/dashboard`, `/mis-reservas`, `/admin/*`) verifican sesión en el Server Component inicial y redirigen a `/` si no hay usuario.
6. El acceso a `/admin/*` adicionalmente verifica `profile.role === 'admin'`.

---

## 8. Variables de entorno

| Variable | Dónde | Ámbito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | Cliente + servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Cliente + servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` + Vercel | **Solo servidor** |

⚠️ La `service_role` key da **bypass total de RLS**. Nunca debe salir del servidor, nunca debe commitearse a git, nunca debe exponerse en `NEXT_PUBLIC_*`.

---

## 9. Deploy

### GitHub + Vercel (actual)

1. `git push origin main`.
2. Vercel detecta push, corre `npm run build`, despliega.
3. Dominios:
   - Producción: `padel-reservas-9e5a.vercel.app`
   - Previews: uno por PR.

### Variables en Vercel

Settings → Environment Variables → agregar las 3 keys en `Production` + `Preview` + `Development`. Tras un cambio, hacer **Redeploy** (no basta con guardar).

### Migraciones de DB

Las migraciones se aplican manualmente en el SQL editor de Supabase. Archivos de referencia:

- `supabase/schema.sql` — esquema inicial.
- `sql/rls-policies.sql` — políticas RLS.

Cambios ya aplicados en el proyecto actual (no están versionados como migration files, están documentados aquí para reproducir):

```sql
-- Rol en invitaciones
ALTER TABLE invite_tokens ADD COLUMN role text NOT NULL DEFAULT 'resident';

-- house_number opcional para admins
ALTER TABLE invite_tokens ALTER COLUMN house_number DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN house_number DROP NOT NULL;
```

---

## 10. Problemas históricos y decisiones

### "Reservas de otros usuarios invisibles"
Síntoma: un usuario podía reservar sobre un turno ya tomado por otro.
Causa: RLS ocultaba reservas ajenas al consultar con anon key.
Solución: cargar `takenSlots` en `page.tsx` con `createAdminClient()` y re-validar en el servidor al crear.

### "Error al guardar los nombres"
Síntoma: la reserva se creaba pero fallaba el insert de jugadores.
Causa: política RLS de `reservation_players` no permitía insert en algunos casos + falta de manejo de error.
Solución: mover el insert de jugadores a Server Action con admin client, y si falla → rollback de la reserva + error explícito al usuario.

### "90 min permitido con 60 min de margen"
Síntoma: el botón de 90 min estaba clickeable aunque hubiera conflicto.
Causa: mismo problema de visibilidad por RLS — `takenSlots` estaba incompleto en el cliente.
Solución: misma que arriba (admin client en `page.tsx`). Además, validación server-side en `createReservation` como safety net.

### TypeScript `CookieToSet implicitly has 'any'`
Fix: definir `interface CookieToSet { name: string; value: string; options?: CookieOptions; }` en `server.ts` y `middleware.ts` y tipar los parámetros de `cookiesToSet`.

### Commit de `node_modules` (128MB)
Se resolvió creando `.gitignore` antes de la primera carga real al repo y recreando el repo desde cero.

---

## 11. Convenciones de código

- Server Components por defecto; `"use client"` solo cuando se necesita interactividad (`useState`, eventos).
- Mutaciones siempre vía **Server Actions** (`"use server"`). Nunca llamar Supabase directamente desde el cliente para escrituras que requieran RLS bypass.
- Nombres en **español** (la app es para usuarios hispanohablantes).
- Mensajes de error para el usuario siempre en español, amigables.
- Tailwind: paleta `brand-*` definida en `tailwind.config.ts` (verde padel).

---

## 12. Roadmap / Ideas futuras

- Notificaciones push o email (tabla `slot_notifications` ya existe).
- Recordatorios de partido por WhatsApp (Twilio / Meta).
- Histórico de reservas pasadas y estadísticas (jugadores más frecuentes, horas pico).
- Exportar CSV de uso mensual para administración.
- Pagos/fianzas integrados (Stripe) si se monetiza.
- Multi-cancha si la aldea agrega una segunda cancha.
- Reserva recurrente (mismo horario cada semana).

---

## 13. Cheat-sheet para nuevos ingenieros

**"Quiero agregar un nuevo tipo de validación al crear una reserva"** → editar `src/app/dashboard/actions.ts` → función `createReservation`.

**"Quiero cambiar los horarios disponibles"** → `src/lib/constants.ts` → `getAvailableStartTimes()`.

**"Quiero cambiar el límite de cancelación de 2h a 1h"** → `src/app/mis-reservas/actions.ts` → constante `twoHoursMs`.

**"Un usuario se quedó colgado sin perfil"** → Supabase Dashboard → Authentication → Users → borrar manualmente; la invitación original ya estará usada, crear una nueva.

**"Un admin debería poder X"** → revisar si necesita RLS extra o si basta con `role === 'admin'` en el Server Component.

**"Producción falla con '... URL and Key are required'"** → revisar env vars en Vercel (especialmente `SUPABASE_SERVICE_ROLE_KEY`) y redeploy.

---

*Documento vivo. Al agregar features importantes, actualizar las secciones correspondientes.*
