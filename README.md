# Message Reader

> Bandeja ligera para revisar y gestionar conversaciones de chat multicanal.

## Stack

- [Vite](https://vitejs.dev/) + React 19 (TypeScript)
- [Tailwind CSS](https://tailwindcss.com/) con presets para shadcn/ui
- [shadcn/ui](https://ui.shadcn.com/) y Radix UI como base de componentes accesibles
- [@tanstack/react-query](https://tanstack.com/query/latest) para manejo de datos y caché
- [Zustand](https://zustand-demo.pmnd.rs/) para estado local de filtros y selección
- [date-fns](https://date-fns.org/) para formatear fechas y horarios

## Características

- Lista de conversaciones con búsqueda, filtros por estado/canal y contador de no leídos
- Panel de detalle con historial de mensajes, datos del cliente y agente asignado
- Editor de respuestas con mutación sobre TanStack Query (mock) y componentes reutilizables
- UI responsive con bandeja lateral desplegable en dispositivos móviles
- Theming listo para modo claro/oscuro gracias a Tailwind + CSS variables
- Autenticación por correo y contraseña con rutas protegidas y sesión basada en cookies HttpOnly

## Requisitos previos

- Node.js 18.3 o superior (recomendado 20+)
- npm (incluido con Node). Puedes usar pnpm/yarn si ajustas los comandos.

## Instalación

```powershell
npm install
```

## Scripts disponibles

```powershell
# arranca el servidor de desarrollo en http://localhost:5173
npm run dev

# inicia el backend Express con recarga en http://localhost:4000
npm run server:dev

# ejecuta ESLint sobre todos los archivos
npm run lint

# compila la aplicación para producción
npm run build

# transpila el backend a JavaScript en server/dist
npm run server:build

# previsualiza la build generada
npm run preview

# ejecuta el backend compilado
npm run server:start
```

## Estructura relevante

- `src/features/chat/` — lógica y componentes específicos de la bandeja
- `src/components/ui/` — componentes reutilizables basados en shadcn/ui
- `src/lib/query-client.ts` — configuración de TanStack Query
- `tailwind.config.ts` — tokens de diseño y plugins (forms, typography, animate)
- `server/` — servidor Express + Supabase encargado de exponer el historial

## Configuración de entorno

Completa un archivo `.env` en la raíz del proyecto (parte del gitignore) tomando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` de tu proyecto en Supabase. Asegúrate además de definir un secreto para las sesiones JWT y los orígenes permitidos para CORS/cookies:

```env
PORT=4000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
CLIENT_APP_URL=http://localhost:5173
JWT_SECRET=super-secreto-largo-y-unico
SESSION_DURATION_DAYS=7
SESSION_COOKIE_NAME=mr_session
```

Notas:

- `CLIENT_APP_URL` admite una lista separada por comas de orígenes permitidos (por ejemplo, `http://localhost:5173,https://mi-dominio.com`).
- `JWT_SECRET` debe ser un valor aleatorio y seguro; el backend lo usa para firmar los tokens almacenados en la cookie HttpOnly.
- `SESSION_DURATION_DAYS` y `SESSION_COOKIE_NAME` son opcionales (tienen valores por defecto 7 días y `mr_session`).
- El cliente web leerá opcionalmente `VITE_API_URL`; si no se define, apuntará a `http://localhost:4000`.

En Supabase, crea la tabla `app_users` para respaldar el registro e inicio de sesión:

```sql
CREATE TABLE public.app_users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	email text UNIQUE NOT NULL,
	password_hash text NOT NULL,
	full_name text,
	role text DEFAULT 'user',
	is_active boolean DEFAULT true,
	created_at timestamptz DEFAULT now(),
	updated_at timestamptz DEFAULT now()
);
```

## Autenticación

- `/login` muestra un formulario básico de acceso (correo + contraseña) y redirige a la bandeja tras validar credenciales.
- `/register` permite crear usuarios finales almacenando un hash seguro de la contraseña en Supabase.
- Las rutas protegidas (como la bandeja principal `/`) exigen una sesión válida; de lo contrario se redirige automáticamente a `/login`.
- El backend expone cookies HttpOnly con SameSite adecuado para evitar XSS; al cerrar sesión se invalidan y se limpia la caché de consultas.

## API del backend

- `GET /api/health` — estado simple del servicio.
- `POST /api/auth/register` — crea un usuario (`email`, `password`, `fullName` opcional) y devuelve la sesión activa.
- `POST /api/auth/login` — valida credenciales y devuelve la sesión activa.
- `POST /api/auth/logout` — elimina la cookie de sesión HttpOnly.
- `GET /api/auth/me` — devuelve el usuario autenticado asociado a la cookie actual.
- `GET /api/chat-histories` — lista todos los mensajes agrupables por `sessionId` (requiere sesión válida).
	- Parámetros opcionales: `sessionId` (filtra por número/canal), `limit`.
- `GET /api/chat-histories/:sessionId` — historial del identificador específico (requiere sesión válida).

Las respuestas incluyen el JSON original almacenado en Supabase y un bloque `parsedContent` con los campos resumidos (`isPedido`, `pedido`, `volumen`, etc.) que la app usa para armar conversaciones.

## Próximos pasos sugeridos

- Conectar endpoints reales del chat reemplazando los mocks de `src/features/chat/mock-data.ts`
- Ajustar prioridades/estados según tu dominio de negocio
- Añadir recuperación de contraseña, verificación de correo u otros mecanismos de seguridad avanzada
