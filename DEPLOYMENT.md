# Guía de Deployment - MessageReader en Docker

## Índice
1. [Requisitos previos](#requisitos-previos)
2. [Preparación del VPS](#preparación-del-vps)
3. [Configuración de variables de entorno](#configuración-de-variables-de-entorno)
4. [Configuración de Nginx](#configuración-de-nginx)
5. [Deploy de los contenedores](#deploy-de-los-contene### 3. Agregar secrets a GitHub
Ve a: `Settings → Secrets and variables → Actions`

**Agregar los siguientes secrets:**
- `VPS_HOST`: IP o dominio de la VPS
- `VPS_USER`: usuario SSH (ej: snorker84@semaforo-bot, ubuntu, root, etc)
- `VPS_SSH_KEY`: contenido de tu clave SSH privada
6. [Configuración de SSL/TLS](#configuración-de-ssltls)
7. [Monitoreo y mantenimiento](#monitoreo-y-mantenimiento)
8. [CI/CD con GitHub Actions](#cicd-con-github-actions)
9. [Troubleshooting](#troubleshooting)

---

## Requisitos previos

- VPS en Google Cloud con Ubuntu 20.04+ o similar
- Docker instalado (`docker --version` debe funcionar)
- Docker Compose instalado (`docker compose version`)
- Nginx instalado y configurado
- N8N en un contenedor separado (ya existe)
- Dominio configurado: `https://cloudjeans-admin.ddns.net/`
- Acceso SSH a la VPS

**Verificar instalación:**
```bash
docker --version
docker compose version
nginx -v
```

---

## Preparación del VPS

### 1. Clonar el repositorio
```bash
cd /home/$USER  # o tu directorio preferido
git clone https://github.com/Snorker8406/messageReader.git
cd messageReader
```

### 2. Crear directorio para variables de entorno
```bash
mkdir -p /var/messagereader/env
cd /var/messagereader/env
```

### 3. Configurar permisos
```bash
sudo chown -R $USER:$USER /var/messagereader
chmod 700 /var/messagereader/env
```

---

## Configuración de variables de entorno

### 1. Copiar archivo de ejemplo
```bash
cp /home/$USER/messageReader/.env.production.example /var/messagereader/env/.env.production
```

### 2. Editar con variables reales
```bash
sudo nano /var/messagereader/env/.env.production
```

**Valores que DEBES cambiar:**

```env
# 1. JWT Secret (genera uno nuevo)
# Ejecuta: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=tu_jwt_secret_generado_aqui

# 2. Supabase Service Role Key
# Obtén de: Dashboard Supabase → Settings → API → Service Role Key
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_tu_clave_real_aqui
```

### 3. Verificar archivo (no debe haber secretos sin rellenar)
```bash
cat /var/messagereader/env/.env.production | grep "here\|your_"
# No debe retornar nada si todo está configurado correctamente
```

---

## Configuración de Nginx

### 1. Copiar configuración
```bash
sudo cp /home/$USER/messageReader/nginx.conf.example /etc/nginx/sites-available/cloudjeans-admin
```

### 2. Editar si es necesario
```bash
sudo nano /etc/nginx/sites-available/cloudjeans-admin
```

### 3. Crear enlace simbólico
```bash
sudo ln -s /etc/nginx/sites-available/cloudjeans-admin /etc/nginx/sites-enabled/cloudjeans-admin
```

### 4. Verificar sintaxis
```bash
sudo nginx -t
```

Salida esperada:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Recargar Nginx
```bash
sudo systemctl reload nginx
```

---

## Configuración de SSL/TLS

### Con Let's Encrypt (Certbot)

#### 1. Instalar Certbot (si aún no está)
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Generar certificado
```bash
sudo certbot certonly --nginx -d cloudjeans-admin.ddns.net
```

**Responde las preguntas:**
- Email: tu_email@example.com
- Acepta términos: `y`
- Compartir email: `y` o `n` (tu preferencia)

#### 3. Verificar certificado
```bash
sudo ls -la /etc/letsencrypt/live/cloudjeans-admin.ddns.net/
```

#### 4. Renovación automática
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar estado
sudo systemctl status certbot.timer
```

---

## Deploy de los contenedores

### 1. Preparar archivo docker-compose.yml
```bash
cd /home/$USER/messageReader

# Cargar variables de entorno desde el archivo
export $(cat /var/messagereader/env/.env.production | grep -v '^#' | xargs)
```

### 2. Construir imágenes
```bash
sudo docker compose build
```

Esto puede tomar 5-10 minutos dependiendo de la velocidad de internet.

### 3. Iniciar contenedores en background
```bash
sudo docker compose up -d
```

**Salida esperada:**
```
[+] Running 2/2
 ✔ Container messagereader-frontend  Started
 ✔ Container messagereader-backend   Started
```

### 4. Verificar estado
```bash
sudo docker compose ps

# Debe mostrar ambos contenedores con estado "Up"
```

### 5. Ver logs
```bash
# Logs de ambos contenedores
sudo docker compose logs -f

# Solo frontend
sudo docker compose logs -f frontend

# Solo backend
sudo docker compose logs -f backend

# Últimas 50 líneas
sudo docker compose logs --tail=50
```

---

## Verificación de funcionamiento

### 1. Probar backend
```bash
curl -s http://localhost:4000/api/health | jq .
# Respuesta esperada: { "status": "ok" }
```

### 2. Probar frontend
```bash
curl -s http://localhost:3002/ | head -20
# Debe retornar HTML de React
```

### 3. Probar Nginx reverse proxy
```bash
curl -s https://cloudjeans-admin.ddns.net/api/health | jq .
curl -s https://cloudjeans-admin.ddns.net/ | head -20
```

### 4. Acceder en navegador
- Frontend: `https://cloudjeans-admin.ddns.net/`
- API Health: `https://cloudjeans-admin.ddns.net/api/health`

---

## Monitoreo y mantenimiento

### Ver uso de recursos
```bash
sudo docker stats
```

### Ver logs en tiempo real
```bash
sudo docker compose logs -f
```

### Reiniciar un contenedor
```bash
sudo docker compose restart backend
# o
sudo docker compose restart frontend
```

### Detener los contenedores
```bash
sudo docker compose down
```

### Detener y eliminar todo (incluyendo datos)
```bash
sudo docker compose down -v
```

### Ver directorios de datos
```bash
sudo docker inspect messagereader-backend | grep -i volume
```

### Realizar backup de logs
```bash
sudo docker compose logs > backup_logs_$(date +%Y%m%d_%H%M%S).log
```

---

## Actualización del código

### 1. Descargar cambios
```bash
cd /home/$USER/messageReader
git pull origin main
```

### 2. Reconstruir imágenes
```bash
sudo docker compose build --no-cache
```

### 3. Reiniciar contenedores
```bash
sudo docker compose up -d
```

### 4. Verificar funcionamiento
```bash
sudo docker compose logs -f
curl -s https://cloudjeans-admin.ddns.net/api/health
```

---

## CI/CD con GitHub Actions

### 1. Crear estructura de directorios
```bash
mkdir -p .github/workflows
```

### 2. Crear archivo de workflow
```bash
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to VPS

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/$USER/messageReader
            git pull origin main
            export $(cat /var/messagereader/env/.env.production | grep -v '^#' | xargs)
            sudo docker compose build
            sudo docker compose up -d
            sudo docker compose logs --tail=20
EOF
```

### 3. Configurar secrets en GitHub
Ve a: `Settings → Secrets and variables → Actions`

**Agregar los siguientes secrets:**
- `VPS_HOST`: IP o dominio de la VPS
- `VPS_USER`: usuario SSH (ej: ubuntu)
- `VPS_SSH_KEY`: contenido de tu clave SSH privada

### 4. Generar clave SSH (si no tienes)
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/vps_key -N ""
cat ~/.ssh/vps_key  # Copiar para GitHub secret
cat ~/.ssh/vps_key.pub  # Agregar a ~/.ssh/authorized_keys en la VPS
```

---

## Troubleshooting

### Contenedor no inicia
```bash
# Ver logs detallados
sudo docker compose logs backend

# Verificar variables de entorno
sudo docker compose config | grep -A 50 "backend:"

# Reconstruir sin cache
sudo docker compose build --no-cache
```

### Puerto ya en uso
```bash
# Encontrar qué proceso usa el puerto
sudo lsof -i :4000
sudo lsof -i :3002

# Matar el proceso
sudo kill -9 <PID>

# O cambiar puertos en docker-compose.yml
```

### Errores de Supabase
```bash
# Verificar conectividad
curl -s https://okugfpybiirktqjxyddo.supabase.co/rest/v1/

# Verificar credenciales en logs
sudo docker compose logs backend | grep -i supabase
```

### Nginx no redirige correctamente
```bash
# Validar configuración
sudo nginx -t

# Recargar
sudo systemctl reload nginx

# Ver logs
sudo tail -f /var/log/nginx/cloudjeans-admin-error.log
```

### SSL certificado vencido
```bash
# Renovar manualmente
sudo certbot renew --dry-run

# Renovar en serio
sudo certbot renew
```

### Problema con permisos
```bash
# Dar permisos al usuario actual
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker ps
```

---

## Comandos útiles

```bash
# Ver todo
sudo docker compose ps -a

# Eliminar contenedores parados
sudo docker container prune

# Eliminar imágenes no usadas
sudo docker image prune -a

# Ver logs de un servicio
sudo docker compose logs --tail=100 -f backend

# Ejecutar comando en contenedor
sudo docker compose exec backend npm run lint

# Copiar archivo desde contenedor
sudo docker cp messagereader-backend:/app/server/dist ./backup_dist

# Inspeccionar contenedor
sudo docker inspect messagereader-backend
```

---

## Soporte y Contact

Para problemas adicionales, revisa:
- Logs de Docker: `sudo docker-compose logs`
- Logs de Nginx: `sudo tail -f /var/log/nginx/cloudjeans-admin-error.log`
- Estado de contenedores: `sudo docker-compose ps -a`
