# ✅ Deployment Checklist - MessageReader

## Pre-deployment

- [ ] Tienes SSH access a la VPS
- [ ] Conoces el usuario SSH (ej: ubuntu)
- [ ] Tienes Nginx instalado en la VPS
- [ ] Tienes Docker instalado en la VPS
- [ ] Tienes Docker Compose instalado
- [ ] Obtuviste `SUPABASE_SERVICE_ROLE_KEY` de tu dashboard Supabase

## Paso 1: Preparación Local

```bash
# En tu máquina local
cd messageReader

# Hacer el script ejecutable
chmod +x deploy.sh

# Ejecutar el script interactivo
./deploy.sh
```

**El script hará automáticamente:**
- ✅ Verificar conexión SSH
- ✅ Clonar/actualizar el repositorio
- ✅ Crear estructura de directorios
- ✅ Crear .env.production con variables
- ✅ Configurar Nginx
- ✅ Configurar SSL con Let's Encrypt
- ✅ Build y start con Docker
- ✅ Verificar endpoints

## Paso 2: Manual (si prefieres paso a paso)

### 2.1 Conectar a la VPS
```bash
ssh -p 22 ubuntu@YOUR_VPS_IP
# o si tienes dominio
ssh ubuntu@cloudjeans-admin.ddns.net
```

### 2.2 Clonar el repositorio
```bash
git clone https://github.com/Snorker8406/messageReader.git
cd messageReader
```

### 2.3 Preparar directorios
```bash
mkdir -p /var/messagereader/env
sudo chown -R $USER:$USER /var/messagereader
chmod 700 /var/messagereader/env
```

### 2.4 Crear .env.production
```bash
cp .env.production.example /var/messagereader/env/.env.production
nano /var/messagereader/env/.env.production
```

**IMPORTANTE:** Edita y completa:
- `SUPABASE_SERVICE_ROLE_KEY` - obtén de Supabase dashboard
- `JWT_SECRET` - genera con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 2.5 Configurar Nginx
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/cloudjeans-admin
sudo nginx -t  # Verificar sintaxis
sudo systemctl reload nginx
```

### 2.6 Configurar SSL (Let's Encrypt)
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d cloudjeans-admin.ddns.net
```

### 2.7 Deploy con Docker
```bash
# Cargar variables
export $(cat /var/messagereader/env/.env.production | grep -v '^#' | xargs)

# Construir
sudo docker-compose build

# Iniciar
sudo docker-compose up -d

# Ver estado
sudo docker-compose ps
```

## Paso 3: Verificación

### 3.1 Verificar backend
```bash
curl https://cloudjeans-admin.ddns.net/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok"
}
```

### 3.2 Acceder en navegador
```
https://cloudjeans-admin.ddns.net/
```

### 3.3 Ver logs
```bash
sudo docker-compose logs -f
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend
```

## Paso 4: CI/CD con GitHub Actions

### 4.1 Generar SSH key (si no tienes)
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/vps_key -N ""
cat ~/.ssh/vps_key  # Copiar para GitHub
cat ~/.ssh/vps_key.pub  # Agregar a ~/.ssh/authorized_keys en la VPS
```

### 4.2 Agregar SSH key a la VPS
```bash
# En la VPS
mkdir -p ~/.ssh
echo "TU_CLAVE_PUBLICA" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 4.3 Agregar secrets a GitHub
Ve a: **Settings → Secrets and variables → Actions**

Agrega estos secrets:
- `VPS_HOST`: Tu IP o dominio (ej: cloudjeans-admin.ddns.net)
- `VPS_USER`: ubuntu
- `VPS_SSH_KEY`: Contenido de ~/.ssh/vps_key (privada)
- `VPS_SSH_PORT`: 22 (opcional)

### 4.4 Verificar CI/CD
```bash
# Hacer un push a main
git push origin main

# GitHub Actions debería iniciar automáticamente
# Ver en: GitHub → Actions
```

## Troubleshooting Rápido

### Los contenedores no inician
```bash
# Ver logs detallados
sudo docker-compose logs backend

# Reconstruir sin caché
sudo docker-compose build --no-cache
sudo docker-compose up -d
```

### Nginx no responde
```bash
# Verificar sintaxis
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/cloudjeans-admin-error.log
```

### Permiso denegado con docker
```bash
# Agregar usuario a grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker ps
```

### Puerto ya en uso
```bash
# Encontrar qué usa el puerto
sudo lsof -i :4000
sudo lsof -i :3001

# Matar proceso
sudo kill -9 <PID>
```

## Comandos Útiles Post-Deploy

```bash
# Ver estado de todos los contenedores
sudo docker-compose ps

# Reiniciar todo
sudo docker-compose restart

# Detener
sudo docker-compose down

# Ver logs en tiempo real
sudo docker-compose logs -f

# Ver últimas 50 líneas
sudo docker-compose logs --tail=50

# Ejecutar comando en contenedor
sudo docker-compose exec backend npm run lint

# Copiar archivo desde contenedor
sudo docker cp messagereader-backend:/app/server/dist ./backup_dist

# Limpiar imágenes no usadas
sudo docker image prune -a
```

## Renovación Automática de SSL

La renovación de certificados debe ser automática:
```bash
# Verificar timer
sudo systemctl status certbot.timer

# Renovación manual si es necesario
sudo certbot renew
```

## Actualizar Código

Cuando hagas cambios:

### Opción 1: Manual
```bash
cd messageReader
git pull origin main
sudo docker-compose build
sudo docker-compose up -d
```

### Opción 2: CI/CD Automático (recomendado)
```bash
git push origin main
# GitHub Actions hace el rest automáticamente
```

## Backup

```bash
# Backup de logs
sudo docker-compose logs > backup_logs_$(date +%Y%m%d_%H%M%S).log

# Backup de .env
sudo cp /var/messagereader/env/.env.production ~/backup.env.production
```

## Soporte

Si algo no funciona:

1. Lee: `DEPLOYMENT.md` (guía completa)
2. Revisa: `docker-compose logs -f`
3. Ejecuta: `sudo nginx -t` (para Nginx)
4. Verifica: variables de entorno en `.env.production`

---

**¡Listo! Tu aplicación debería estar funcionando en https://cloudjeans-admin.ddns.net/ 🚀**
