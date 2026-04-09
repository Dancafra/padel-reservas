# Guía de Instalación – Aldea Savia Padel (Mac)

> Tiempo estimado: 45 minutos a 1.5 horas la primera vez.
> No necesitas saber programar. Solo sigue los pasos en orden.

---

## RESUMEN DE LO QUE VAS A HACER

1. Instalar 3 programas en tu Mac (Homebrew, Node.js, VS Code)
2. Crear cuenta gratuita en **Supabase** (base de datos en la nube)
3. Crear cuenta gratuita en **GitHub** (guarda tu código)
4. Crear cuenta gratuita en **Vercel** (publica la app en internet)
5. Configurar la base de datos
6. Publicar la app

---

## PASO 1 — Instalar Homebrew (gestor de programas para Mac)

Homebrew es una herramienta que simplifica instalar software en Mac.

1. Abre **Terminal** en tu Mac
   - Busca "Terminal" en Spotlight (Cmd + Espacio, escribe "Terminal")
2. Copia y pega este comando exacto y presiona Enter:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

3. Te pedirá tu contraseña de Mac. Escríbela (no verás los caracteres, es normal) y presiona Enter.
4. Espera hasta que diga "Installation successful" (2-5 minutos)
5. Si al final te dice que ejecutes unos comandos adicionales para agregar brew al PATH, hazlo.

**Verificar:** Escribe `brew --version` y debe aparecer un número de versión.

---

## PASO 2 — Instalar Node.js

Node.js es el motor que corre la aplicación.

En la misma Terminal, escribe:
```
brew install node
```

Espera a que termine (1-2 minutos).

**Verificar:** Escribe `node --version`. Debe aparecer algo como `v22.0.0`

---

## PASO 3 — Instalar VS Code (editor de código)

Visual Studio Code es donde podrás ver y editar el código si algún día lo necesitas.

1. Ve a: https://code.visualstudio.com
2. Descarga la versión para Mac (botón azul grande)
3. Abre el archivo descargado y arrastra VS Code a tu carpeta de Aplicaciones

---

## PASO 4 — Crear cuenta en GitHub

GitHub es donde se guarda el código de tu app.

1. Ve a: https://github.com
2. Click en "Sign up"
3. Crea una cuenta con tu correo (guarda el usuario y contraseña)
4. Verifica tu correo
5. En la Terminal, configura tu identidad:

```
git config --global user.email "tu@correo.com"
git config --global user.name "Tu Nombre"
```

---

## PASO 5 — Crear cuenta en Supabase (base de datos)

Supabase guarda todos los usuarios, reservas y datos de tu app.

1. Ve a: https://supabase.com
2. Click "Start your project" → "Sign up"
3. Regístrate con tu correo de GitHub (más fácil)
4. Una vez dentro, click **"New project"**
5. Llénalo así:
   - Name: `aldea-savia-padel`
   - Database password: crea una contraseña fuerte y **guárdala** (la necesitarás)
   - Region: US East (o la más cercana a México)
6. Click "Create new project" — tardará 1-2 minutos

---

## PASO 6 — Configurar la base de datos en Supabase

1. En tu proyecto de Supabase, ve al menú izquierdo → **SQL Editor**
2. Click "New query"
3. Abre el archivo `supabase/schema.sql` que está en la carpeta del proyecto
4. Copia TODO el contenido y pégalo en el SQL Editor
5. Click "Run" (botón verde, o Ctrl+Enter)
6. Debe decir "Success. No rows returned"

---

## PASO 7 — Obtener las credenciales de Supabase

Necesitamos dos "llaves secretas" de Supabase para conectar la app.

1. En Supabase, ve al menú izquierdo → **Settings** → **API**
2. Copia y guarda estos dos valores:
   - **Project URL**: algo como `https://abcdefg.supabase.co`
   - **anon public key**: una cadena larga de letras y números
3. Ve a Settings → API → **Service role** → copia esa llave también

---

## PASO 8 — Preparar la app en tu computadora

1. Descarga la carpeta `padel-reservas` del proyecto (está en tu carpeta "Reservas Padel")
2. En Terminal, ve a esa carpeta:
```
cd ~/Documents/"Reservas Padel"/padel-reservas
```
3. Instala las dependencias:
```
npm install
```
4. Crea el archivo de configuración local:
```
cp .env.local.example .env.local
```
5. Abre el archivo `.env.local` con VS Code:
```
code .env.local
```
6. Reemplaza los valores con los que copiaste de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```
7. Guarda el archivo (Cmd + S)

---

## PASO 9 — Probar la app localmente

```
npm run dev
```

Abre tu navegador en: **http://localhost:3000**

¡Deberías ver la pantalla de login! (Por ahora no hay usuarios, así que no puedes entrar todavía)

Para detener el servidor: presiona `Ctrl + C` en la Terminal.

---

## PASO 10 — Crear tu cuenta de administrador

Para este paso necesitas ir a Supabase y crear tu usuario manualmente:

1. En Supabase, ve a **Authentication** → **Users** → **Invite user**
2. Escribe tu correo y click "Send invite"
3. Revisa tu correo y haz click en el link de invitación
4. Establece tu contraseña

Ahora en **SQL Editor**, ejecuta esto (reemplaza los valores):
```sql
INSERT INTO profiles (id, email, full_name, house_number, role)
SELECT id, email, 'Administrador', 'Admin', 'admin'
FROM auth.users
WHERE email = 'TU_CORREO@aqui.com';
```

Ahora ya puedes entrar a http://localhost:3000 con tu correo y contraseña como administrador.

---

## PASO 11 — Publicar en internet con Vercel

1. Ve a: https://vercel.com
2. Click "Sign Up" → Continuar con GitHub
3. Una vez dentro, click "Add New Project"
4. Necesitas subir tu código a GitHub primero:

En Terminal (dentro de la carpeta padel-reservas):
```
git init
git add .
git commit -m "primera version aldea savia padel"
```

5. En GitHub, crea un nuevo repositorio llamado `padel-reservas` (botón "+" arriba a la derecha → "New repository")
6. Sigue las instrucciones que GitHub te da para subir el código existente (sección "…or push an existing repository from the command line")

7. De regreso en Vercel, importa el repositorio que acabas de crear
8. Antes de hacer deploy, agrega las variables de entorno:
   - Click "Environment Variables"
   - Agrega las mismas 3 variables del archivo `.env.local`
9. Click "Deploy"
10. Espera 2-3 minutos — te dará una URL tipo `aldea-savia-padel.vercel.app`

---

## PASO 12 — Configurar la URL en Supabase

Para que los correos de confirmación funcionen:

1. En Supabase → **Authentication** → **URL Configuration**
2. En "Site URL", pon tu URL de Vercel: `https://aldea-savia-padel.vercel.app`
3. En "Redirect URLs", agrega: `https://aldea-savia-padel.vercel.app/auth/callback`

---

## ¡LISTO! Tu app está en internet

- URL de tu app: `https://aldea-savia-padel.vercel.app`
- Puedes entrar como admin y empezar a invitar condominos

---

## Solución de problemas comunes

**"command not found: brew"** → Cierra y vuelve a abrir Terminal, intenta de nuevo

**"npm install" falla** → Verifica que Node.js está instalado con `node --version`

**La app no carga después de hacer login** → Verifica que las variables de entorno en Vercel coincidan exactamente con las de Supabase

**Los correos de invitación no llegan** → Revisa la carpeta de Spam. En Supabase → Authentication → Email Templates puedes personalizar los correos.

---

## ¿Necesitas ayuda?

Si en algún paso te atascas, dile a Claude exactamente qué mensaje de error apareció y en qué paso estás, y te ayudará a resolverlo.
