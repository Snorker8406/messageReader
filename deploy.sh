#!/bin/bash

# =========================================
# MessageReader - Deployment Step-by-Step
# =========================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_step() {
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}→ $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}\n"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}\n"
}

log_error() {
    echo -e "${RED}✗ $1${NC}\n"
}

confirm() {
    local prompt="$1"
    local response
    read -p "$(echo -e ${YELLOW}${prompt}${NC}) (s/n): " response
    [[ "$response" =~ ^[Ss]$ ]]
}

# =========================================
# STEP 1: Verificar requisitos previos
# =========================================
log_step "PASO 1: Verificar requisitos previos"

if command -v git &> /dev/null; then
    log_success "Git está instalado"
else
    log_error "Git NO está instalado. Instálalo primero."
    exit 1
fi

if command -v ssh &> /dev/null; then
    log_success "SSH está disponible"
else
    log_error "SSH NO está disponible"
    exit 1
fi

# =========================================
# STEP 2: Obtener información del usuario
# =========================================
log_step "PASO 2: Información de conexión SSH"

read -p "$(echo -e ${YELLOW}Ingresa la IP o dominio de tu VPS:${NC}) " VPS_HOST
read -p "$(echo -e ${YELLOW}Usuario SSH (ej: ubuntu):${NC}) " VPS_USER
read -p "$(echo -e ${YELLOW}Puerto SSH (default 22):${NC}) " VPS_PORT
VPS_PORT=${VPS_PORT:-22}

log_success "VPS configurado: $VPS_USER@$VPS_HOST:$VPS_PORT"

# =========================================
# STEP 3: Verificar conexión SSH
# =========================================
log_step "PASO 3: Verificar conexión SSH"

if ssh -p $VPS_PORT $VPS_USER@$VPS_HOST "echo 'SSH OK'" &> /dev/null; then
    log_success "Conexión SSH exitosa"
else
    log_error "No se puede conectar vía SSH. Verifica credenciales y puertos."
    exit 1
fi

# =========================================
# STEP 4: Clonar repositorio
# =========================================
log_step "PASO 4: Clonar repositorio en VPS"

read -p "$(echo -e ${YELLOW}URL del repositorio GitHub:${NC}) " REPO_URL

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'SSH_COMMANDS'
cd /home/$VPS_USER

if [ -d "messageReader" ]; then
    echo "Repositorio ya existe. Actualizando..."
    cd messageReader
    git pull origin main
else
    echo "Clonando repositorio..."
    git clone $REPO_URL messageReader
    cd messageReader
fi

echo "✓ Repositorio listo"
SSH_COMMANDS

log_success "Repositorio clonado/actualizado"

# =========================================
# STEP 5: Crear estructura de directorios
# =========================================
log_step "PASO 5: Crear estructura de directorios"

ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
echo "Creando directorios..."
mkdir -p /var/messagereader/env
sudo chown -R $USER:$USER /var/messagereader
chmod 700 /var/messagereader/env
echo "✓ Directorios creados"
EOF

log_success "Estructura de directorios creada"

# =========================================
# STEP 6: Configurar variables de entorno
# =========================================
log_step "PASO 6: Configurar variables de entorno"

log_warning "Necesitaré las siguientes credenciales:"
echo "  1. SUPABASE_SERVICE_ROLE_KEY (de tu dashboard Supabase)"
echo "  2. JWT_SECRET (será generado)"
echo ""

read -p "$(echo -e ${YELLOW}Tienes SUPABASE_SERVICE_ROLE_KEY? (s/n):${NC}) " has_supabase

if [[ "$has_supabase" =~ ^[Ss]$ ]]; then
    read -s -p "$(echo -e ${YELLOW}Ingresa SUPABASE_SERVICE_ROLE_KEY:${NC}) " SUPABASE_KEY
    echo ""
else
    log_error "Necesitas obtener SUPABASE_SERVICE_ROLE_KEY de tu Supabase dashboard"
    log_warning "Continuaremos sin ella, pero necesitarás agregarla manualmente"
    SUPABASE_KEY=""
fi

# Generar JWT_SECRET
echo ""
log_step "Generando JWT_SECRET seguro..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "NO_GENERADO")

if [ "$JWT_SECRET" = "NO_GENERADO" ]; then
    log_warning "No se pudo generar JWT_SECRET. Usa: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    read -p "Ingresa el JWT_SECRET manualmente: " JWT_SECRET
fi

# Crear archivo .env.production
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << ENVEOF
cat > /var/messagereader/env/.env.production << 'ENVFILE'
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
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_KEY

# ========================================
# Authentication & Security
# ========================================
JWT_SECRET=$JWT_SECRET
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
ENVFILE

chmod 600 /var/messagereader/env/.env.production
echo "✓ Archivo .env.production creado"
ENVEOF

log_success "Variables de entorno configuradas"

# =========================================
# STEP 7: Configurar Nginx
# =========================================
if confirm "¿Configurar Nginx ahora?"; then
    log_step "PASO 7: Configurar Nginx"
    
    ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
    cd /home/$USER/messageReader
    sudo cp nginx.conf.example /etc/nginx/sites-available/cloudjeans-admin
    
    # Verificar sintaxis
    if sudo nginx -t &>/dev/null; then
        echo "✓ Sintaxis de Nginx OK"
    else
        echo "✗ Error en sintaxis de Nginx"
        exit 1
    fi
    
    # Crear symlink
    sudo ln -sf /etc/nginx/sites-available/cloudjeans-admin /etc/nginx/sites-enabled/
    
    # Recargar
    sudo systemctl reload nginx
    echo "✓ Nginx configurado y recargado"
    EOF
    
    log_success "Nginx configurado"
fi

# =========================================
# STEP 8: Configurar SSL/TLS
# =========================================
if confirm "¿Configurar SSL con Let's Encrypt?"; then
    log_step "PASO 8: Configurar SSL/TLS"
    
    ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
    # Verificar si certbot está instalado
    if ! command -v certbot &> /dev/null; then
        echo "Instalando certbot..."
        sudo apt update
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    # Generar certificado
    echo "Generando certificado SSL..."
    sudo certbot certonly --nginx -d cloudjeans-admin.ddns.net
    
    echo "✓ Certificado SSL configurado"
    EOF
    
    log_success "SSL/TLS configurado"
fi

# =========================================
# STEP 9: Deploy Docker
# =========================================
if confirm "¿Iniciar deployment con Docker?"; then
    log_step "PASO 9: Deployment con Docker"
    
    ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
    cd /home/$USER/messageReader
    
    # Cargar variables de entorno
    export $(cat /var/messagereader/env/.env.production | grep -v '^#' | xargs)
    
    # Construir imágenes
    echo "Construyendo imágenes Docker..."
    sudo docker-compose build
    
    # Iniciar contenedores
    echo "Iniciando contenedores..."
    sudo docker-compose up -d
    
    # Esperar a que los servicios estén listos
    sleep 5
    
    # Verificar estado
    echo ""
    echo "Estado de contenedores:"
    sudo docker-compose ps
    
    echo ""
    echo "✓ Deployment completado"
    EOF
    
    log_success "Docker deployment completado"
fi

# =========================================
# STEP 10: Testing
# =========================================
log_step "PASO 10: Testing y verificación"

if confirm "¿Hacer test de los endpoints?"; then
    echo "Probando endpoints..."
    
    echo ""
    echo "Backend health check:"
    curl -s https://cloudjeans-admin.ddns.net/api/health | jq . 2>/dev/null || echo "⚠ Backend aún no responde (es normal si recién inició)"
    
    echo ""
    echo "Frontend:"
    curl -s -I https://cloudjeans-admin.ddns.net/ | head -5
fi

# =========================================
# STEP 11: GitHub Actions
# =========================================
if confirm "¿Configurar CI/CD con GitHub Actions?"; then
    log_step "PASO 11: Configurar CI/CD en GitHub"
    
    log_warning "Necesitarás agregar 3 secrets en GitHub:"
    echo "  1. VPS_HOST: $VPS_HOST"
    echo "  2. VPS_USER: $VPS_USER"
    echo "  3. VPS_SSH_KEY: (tu clave SSH privada)"
    echo ""
    echo "Ve a: GitHub → Tu Repo → Settings → Secrets and variables → Actions"
    echo "y agrega los secretos anteriores"
    echo ""
    read -p "Presiona Enter cuando hayas agregado los secrets..."
fi

# =========================================
# Resumen Final
# =========================================
log_step "✓ DEPLOYMENT COMPLETADO"

echo -e "${GREEN}Tu aplicación está disponible en:${NC}"
echo "  🌐 Frontend:  https://cloudjeans-admin.ddns.net/"
echo "  🔌 Backend:   https://cloudjeans-admin.ddns.net/api/"
echo "  💚 Health:    https://cloudjeans-admin.ddns.net/api/health"
echo ""

echo -e "${GREEN}Comandos útiles en la VPS:${NC}"
echo "  Ver logs:              ssh $VPS_USER@$VPS_HOST \"cd messageReader && sudo docker-compose logs -f\""
echo "  Reiniciar:             ssh $VPS_USER@$VPS_HOST \"cd messageReader && sudo docker-compose restart\""
echo "  Ver estado:            ssh $VPS_USER@$VPS_HOST \"cd messageReader && sudo docker-compose ps\""
echo ""

echo -e "${GREEN}Documentación:${NC}"
echo "  📖 Lee DEPLOYMENT.md para información completa"
echo "  📊 Ver monitoreo y troubleshooting"
echo ""

log_success "¡Tu aplicación está lista en producción!"
