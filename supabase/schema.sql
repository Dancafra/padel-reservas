-- ============================================================
-- ALDEA SAVIA PADEL - Schema de Base de Datos
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

-- Extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: profiles
-- Un perfil por cada condomino registrado
-- ============================================================
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  house_number text not null,
  role text not null default 'resident' check (role in ('resident', 'admin')),
  is_active boolean default true,
  monthly_slots_limit integer default 12,
  created_at timestamp with time zone default now()
);

-- Índice único parcial: solo un residente por número de casa.
-- Los admins no están sujetos a esta restricción.
create unique index unique_resident_per_house
  on profiles(house_number)
  where role = 'resident';

-- ============================================================
-- TABLA: reservations
-- Cada reserva de cancha
-- Horario: 9:00am - 10:00pm, inicio en :00 o :30, duración 1.5h
-- Turnos protegidos (no bloqueables): 17:30, 19:00, 20:30
-- ============================================================
create table reservations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  reservation_date date not null,
  slot_start time not null,   -- ej: '09:00', '09:30', '17:30'
  slot_end time not null,     -- slot_start + duración (máx 90 min)
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamp with time zone default now()
);

create index idx_reservations_date_status on reservations(reservation_date, status);
create index idx_reservations_user on reservations(user_id);

-- ============================================================
-- TABLA: reservation_players
-- Nombres de los jugadores para cada reserva (todos opcionales).
-- Se escriben libremente al hacer la reserva. Máximo 4 por reserva.
-- Nota futura: aquí se podría agregar un campo 'email' o 'phone'
-- para enviar invitaciones por correo/WhatsApp/SMS cuando se
-- implemente ese servicio (ej. Twilio, Resend, etc.)
-- ============================================================
create table reservation_players (
  id uuid default uuid_generate_v4() primary key,
  reservation_id uuid references reservations(id) on delete cascade not null,
  player_name text not null,
  slot_number integer not null check (slot_number between 1 and 4),
  created_at timestamp with time zone default now(),
  unique(reservation_id, slot_number)
);

create index idx_reservation_players_res on reservation_players(reservation_id);

-- ============================================================
-- TABLA: slot_notifications
-- Si el turno que quieres ya está ocupado, te avisamos si se libera
-- ============================================================
create table slot_notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  notification_date date not null,
  slot_start time not null,
  is_sent boolean default false,
  created_at timestamp with time zone default now(),
  unique(user_id, notification_date, slot_start)
);

-- ============================================================
-- TABLA: blocked_slots
-- Admin puede bloquear rangos de tiempo (mantenimiento, eventos)
-- Los turnos 17:30, 19:00 y 20:30 NO se pueden bloquear (protegidos)
-- ============================================================
create table blocked_slots (
  id uuid default uuid_generate_v4() primary key,
  block_date date not null,
  slot_start time not null,
  slot_end time not null,
  reason text,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default now()
);

-- ============================================================
-- TABLA: invite_tokens
-- Admin genera links de invitación para nuevos condominos
-- ============================================================
create table invite_tokens (
  id uuid default uuid_generate_v4() primary key,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  email text not null,
  house_number text not null,
  full_name text not null,
  is_used boolean default false,
  created_by uuid references profiles(id),
  expires_at timestamp with time zone default (now() + interval '7 days'),
  created_at timestamp with time zone default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table reservations enable row level security;
alter table reservation_players enable row level security;
alter table slot_notifications enable row level security;
alter table blocked_slots enable row level security;
alter table invite_tokens enable row level security;

-- PROFILES
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Admins can update any profile" on profiles
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- RESERVATIONS
create policy "Users can view own reservations" on reservations
  for select using (auth.uid() = user_id);

create policy "Users can insert own reservations" on reservations
  for insert with check (auth.uid() = user_id);

create policy "Users can cancel own reservations" on reservations
  for update using (auth.uid() = user_id);

create policy "Admins can view all reservations" on reservations
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update any reservation" on reservations
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Todos los autenticados ven reservas confirmadas (para disponibilidad)
create policy "All users can see confirmed reservations" on reservations
  for select using (auth.uid() is not null);

-- RESERVATION_PLAYERS
create policy "Users can view players of own reservations" on reservation_players
  for select using (
    exists (select 1 from reservations where id = reservation_id and user_id = auth.uid())
  );

create policy "Users can insert players for own reservations" on reservation_players
  for insert with check (
    exists (select 1 from reservations where id = reservation_id and user_id = auth.uid())
  );

create policy "Users can delete players from own reservations" on reservation_players
  for delete using (
    exists (select 1 from reservations where id = reservation_id and user_id = auth.uid())
  );

create policy "Admins can view all reservation players" on reservation_players
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- BLOCKED_SLOTS
create policy "Anyone authenticated can view blocked slots" on blocked_slots
  for select using (auth.uid() is not null);

create policy "Only admins can manage blocked slots" on blocked_slots
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- SLOT_NOTIFICATIONS
create policy "Users can manage own notifications" on slot_notifications
  for all using (auth.uid() = user_id);

-- INVITE_TOKENS
create policy "Only admins can manage invite tokens" on invite_tokens
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrarse
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  invite_record invite_tokens%rowtype;
begin
  select * into invite_record
  from invite_tokens
  where email = new.email and is_used = false and expires_at > now()
  limit 1;

  if found then
    insert into profiles (id, email, full_name, house_number, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', invite_record.full_name),
      invite_record.house_number,
      'resident'
    );
    update invite_tokens set is_used = true where id = invite_record.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- FUNCIÓN: validar que no hay solapamiento de reservas
-- ============================================================
create or replace function check_reservation_overlap(
  p_date date,
  p_start time,
  p_end time,
  p_exclude_id uuid default null
)
returns boolean as $$
declare
  overlap_count integer;
begin
  select count(*) into overlap_count
  from reservations
  where reservation_date = p_date
    and status = 'confirmed'
    and (id != coalesce(p_exclude_id, '00000000-0000-0000-0000-000000000000'::uuid))
    and (slot_start < p_end and slot_end > p_start);
  return overlap_count = 0;
end;
$$ language plpgsql security definer;

-- ============================================================
-- INSERTAR ADMIN INICIAL
-- Después de crear tu cuenta en Supabase Auth, ejecuta esto
-- reemplazando los valores con los tuyos
-- ============================================================
-- insert into profiles (id, email, full_name, house_number, role)
-- select id, email, 'Administrador', 'Admin', 'admin'
-- from auth.users where email = 'tu@correo.com';
