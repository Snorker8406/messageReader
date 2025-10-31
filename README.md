# Message Reader

> Bandeja ligera para revisar y gestionar conversaciones de chat multicanal.

**📦 Estado:** Production-ready con soporte para Docker deployment en VPS

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
N8N_WHATSAPP_WEBHOOK_URL=https://n8n-boutique.duckdns.org/webhook-test/send-whatsapp
N8N_WHATSAPP_WEBHOOK_USER=MessageReaderApp
N8N_WHATSAPP_WEBHOOK_PASSWORD=Snorker84*
VITE_WHATSAPP_WEBHOOK_URL=https://n8n-boutique.duckdns.org/webhook-test/send-whatsapp
VITE_WHATSAPP_WEBHOOK_USER=MessageReaderApp
VITE_WHATSAPP_WEBHOOK_PASSWORD=Snorker84*
VITE_IMAGE_ANALYSIS_START_URL=https://semaforo-n8n.ddns.net/webhook-test/start-image-analysis
```

Notas:

- `CLIENT_APP_URL` admite una lista separada por comas de orígenes permitidos (por ejemplo, `http://localhost:5173,https://mi-dominio.com`).
- `JWT_SECRET` debe ser un valor aleatorio y seguro; el backend lo usa para firmar los tokens almacenados en la cookie HttpOnly.
- `SESSION_DURATION_DAYS` y `SESSION_COOKIE_NAME` son opcionales (tienen valores por defecto 7 días y `mr_session`).
- `N8N_WHATSAPP_WEBHOOK_URL` apunta al webhook de n8n que recibe los mensajes salientes. Si no se configura, el envío fallará con un error controlado.
- `N8N_WHATSAPP_WEBHOOK_USER` y `N8N_WHATSAPP_WEBHOOK_PASSWORD` son opcionales; cuando se definen, el backend añadirá cabeceras Basic Auth en los reintentos hacia n8n.
- `VITE_WHATSAPP_WEBHOOK_URL` permite que el cliente (browser) envíe directamente al webhook; si no se define, se usará el backend como proxy.
- `VITE_WHATSAPP_WEBHOOK_USER` y `VITE_WHATSAPP_WEBHOOK_PASSWORD` habilitan Basic Auth también desde el cliente; si faltan, el navegador omitirá la cabecera y dependerá del backend.
- `VITE_IMAGE_ANALYSIS_START_URL` apunta al webhook que dispara la generación del nuevo catálogo; debe exponer un `GET` que responda 200 para confirmar el inicio del proceso.
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
- `POST /api/chat-histories/:sessionId/reply` — envía una respuesta al webhook configurado (`message` en el body) y devuelve un mensaje sintético para optimizar la UI.
- `GET /api/catalog-metadata/latest` — devuelve el registro más reciente del catálogo PDF junto con el usuario que lo generó (requiere sesión válida).

Las respuestas incluyen el JSON original almacenado en Supabase y un bloque `parsedContent` con los campos resumidos (`isPedido`, `pedido`, `volumen`, etc.) que la app usa para armar conversaciones.

## Próximos pasos sugeridos

- Conectar endpoints reales del chat reemplazando los mocks de `src/features/chat/mock-data.ts`
- Ajustar prioridades/estados según tu dominio de negocio
- Añadir recuperación de contraseña, verificación de correo u otros mecanismos de seguridad avanzada

## 🚀 Deployment en Docker

Esta aplicación está lista para ser desplegada en Docker en un VPS. Incluye:

### Archivos de configuración:
- `Dockerfile.frontend` - Build optimizado para React + Vite
- `Dockerfile.backend` - Build optimizado para Express + Node
- `docker-compose.yml` - Orquestación de servicios
- `nginx.conf.example` - Configuración de reverse proxy
- `.env.production.example` - Template de variables de entorno

### Guías:
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guía completa paso a paso
- `.github/workflows/deploy.yml` - CI/CD automático con GitHub Actions

### Quick Start (VPS):
```bash
# 1. Clonar repo
git clone <repo-url>
cd messageReader

# 2. Preparar variables de entorno
cp .env.production.example /var/messagereader/env/.env.production
# Editar con credenciales reales

# 3. Ejecutar deployment
chmod +x quick-start.sh
./quick-start.sh
```

### Características del deployment:
- ✅ Contenedores separados para frontend y backend
- ✅ Reverse proxy con Nginx en puerto 443 (HTTPS)
- ✅ Health checks automáticos
- ✅ Multi-stage Docker builds para tamaños optimizados
- ✅ Variables de entorno seguras
- ✅ CI/CD automático con GitHub Actions
- ✅ Logs centralizados y monitoreo

**Para detalles completos, ver [DEPLOYMENT.md](./DEPLOYMENT.md)**
