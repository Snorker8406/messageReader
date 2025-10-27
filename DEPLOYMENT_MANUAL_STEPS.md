# 🚀 PASOS MANUAL PARA DEPLOY CON `docker compose`

## **PASO 1: Conectar a la VPS**
```bash
# Reemplaza con tu usuario y dominio/IP
ssh snorker84@semaforo-bot
# o
ssh $USER@cloudjeans-admin.ddns.net
```

---

## **PASO 2: Clonar repositorio y preparar directorios**
```bash
cd /home/$USER
git clone https://github.com/Snorker8406/messageReader.git
cd messageReader

# Crear directorio para variables de entorno
mkdir -p /var/messagereader/env
sudo chown -R $USER:$USER /var/messagereader
chmod 700 /var/messagereader/env
```

---

## **PASO 3: Generar nuevo .env.production desde cero**

### **Opción A: Copiar el template y editar**
```bash
cp /home/$USER/messageReader/.env.production.example /var/messagereader/env/.env.production
nano /var/messagereader/env/.env.production
```

### **Opción B: Crear .env.production manualmente**
```bash
cat > /var/messagereader/env/.env.production << 'EOF'
# ========================================
# Server Configuration
# ========================================
PORT=4000
NODE_ENV=production
CLIENT_APP_URL=https://cloudjeans-admin.ddns.net/

# ========================================
# Supabase (Cloud)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://okugfpybiirktqjxyddo.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_kl2G-ofCIyKd5RfZBA_vRA_mauXx4KU
SUPABASE_SERVICE_ROLE_KEY=AQUI_TU_CLAVE_DE_SUPABASE

# ========================================
# Authentication & Security
# ========================================
JWT_SECRET=AQUI_TU_JWT_SECRET
SESSION_DURATION_DAYS=7
SESSION_COOKIE_NAME=mr_session

# ========================================
# N8N Webhook Integration
# ========================================
N8N_WHATSAPP_WEBHOOK_URL=https://n8n-boutique.duckdns.org/webhook/send-whatsapp
N8N_WHATSAPP_WEBHOOK_USER=MessageReaderApp
N8N_WHATSAPP_WEBHOOK_PASSWORD=Snorker84*

# ========================================
# Frontend Vite Environment Variables
# ========================================
VITE_API_URL=http://localhost:4000
VITE_WHATSAPP_WEBHOOK_URL=https://n8n-boutique.duckdns.org/webhook/send-whatsapp
VITE_WHATSAPP_WEBHOOK_USER=MessageReaderApp
VITE_WHATSAPP_WEBHOOK_PASSWORD=Snorker84*
EOF
```

### **Generar JWT_SECRET nuevo:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar el resultado y pegarlo en AQUI_TU_JWT_SECRET
```

### **Editar el .env.production con tus valores reales:**
```bash
nano /var/messagereader/env/.env.production
```

**CAMBIAR:**
- `AQUI_TU_CLAVE_DE_SUPABASE` → Tu SUPABASE_SERVICE_ROLE_KEY (de tu dashboard Supabase)
- `AQUI_TU_JWT_SECRET` → El resultado del comando anterior

---

## **PASO 4: Configurar Nginx**
```bash
# Copiar configuración
sudo cp /home/$USER/messageReader/nginx.conf.example /etc/nginx/sites-available/cloudjeans-admin

# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/cloudjeans-admin /etc/nginx/sites-enabled/cloudjeans-admin

# Verificar sintaxis
sudo nginx -t
# Debe mostrar: "nginx: configuration file... test is successful"

# Recargar
sudo systemctl reload nginx
```

---

## **PASO 5: Configurar SSL con Let's Encrypt**
```bash
# Instalar certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Generar certificado
sudo certbot certonly --nginx -d cloudjeans-admin.ddns.net

# Habilitar renovación automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar
sudo systemctl status certbot.timer
```

---

## **PASO 6: Build y deploy con Docker (CON ESPACIO)**
```bash
cd /home/$USER/messageReader

# Cargar variables de entorno
export $(cat /var/messagereader/env/.env.production | grep -v '^#' | xargs)

# Verificar que se cargaron correctamente
echo "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY"
echo "JWT_SECRET=$JWT_SECRET"

# Detener contenedores previos (si existen)
# ⚠️ IMPORTANTE: Usa "sudo -E" para que sudo herede las variables de entorno
sudo -E docker compose down

# Construir imágenes (toma 5-10 minutos)
sudo -E docker compose build

# Iniciar contenedores
sudo -E docker compose up -d

# Verificar estado
sudo docker compose ps
# Ambos deben estar en "Up"
```

---

## **PASO 7: Verificar que funcione**

**Probar backend:**
```bash
curl -s http://localhost:4000/api/health | jq .
# Esperado: { "status": "ok" }
```

**Probar frontend (puerto 3002):**
```bash
curl -s http://localhost:3002/ | head -20
# Debe retornar HTML
```

**Probar mediante Nginx (SSL):**
```bash
curl -s https://cloudjeans-admin.ddns.net/api/health
curl -s https://cloudjeans-admin.ddns.net/
```

**Acceder en navegador:**
- Frontend: `https://cloudjeans-admin.ddns.net/`
- API: `https://cloudjeans-admin.ddns.net/api/health`

---

## **PASO 8: Ver logs en tiempo real**
```bash
# Todos los logs
sudo -E docker compose logs -f

# Solo backend
sudo -E docker compose logs -f backend

# Solo frontend
sudo -E docker compose logs -f frontend
```

---

## 🔧 COMANDOS ÚTILES POST-DEPLOY

```bash
# Ver estado de contenedores
sudo docker compose ps

# Reiniciar todo
sudo docker compose restart

# Detener
sudo docker compose down

# Actualizar código
cd /home/$USER/messageReader
git pull origin main
sudo docker compose build
sudo docker compose up -d

# Ver recursos usados
sudo docker stats

# Limpiar imágenes no usadas
sudo docker image prune -a
```

---

## ⚠️ TROUBLESHOOTING RÁPIDO

**Puerto 3002 o 4000 ya en uso:**
```bash
sudo lsof -i :3002
sudo lsof -i :4000
sudo kill -9 <PID>
```

**Nginx no funciona:**
```bash
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/cloudjeans-admin-error.log
```

**Los contenedores no inician:**
```bash
sudo docker compose logs backend
sudo docker compose build --no-cache
sudo docker compose up -d
```

**Permisos con docker:**
```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

---

¡Eso es! Después del **PASO 8**, tu aplicación estará en vivo en `https://cloudjeans-admin.ddns.net/` 🎉
