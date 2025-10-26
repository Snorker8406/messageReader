#!/bin/bash

# =========================================
# Script de Build y Diagnóstico Detallado
# =========================================

set -e

echo "================================"
echo "DIAGNOSTICO DETALLADO DEL BUILD"
echo "================================"

cd /home/snorker84/messageReader

echo -e "\n1️⃣ Git pull para obtener últimos cambios:"
git pull origin main

echo -e "\n2️⃣ Limpiar Docker completamente:"
sudo docker compose down
sudo docker image prune -a -f
sudo docker builder prune -a -f

echo -e "\n3️⃣ Hacer build sin caché con output detallado:"
sudo docker compose build --no-cache --progress=plain backend 2>&1 | tee build.log

echo -e "\n4️⃣ Verificar que la imagen se creó:"
sudo docker images | grep messagereader-backend

echo -e "\n5️⃣ Cargar variables de entorno:"
export $(cat /var/messagereader/env/.env.production | grep -v '^#' | xargs)

echo -e "\n6️⃣ Intentar iniciar solo el backend:"
sudo docker compose up backend -d

echo -e "\n7️⃣ Esperar 5 segundos y ver logs:"
sleep 5
sudo docker compose logs backend

echo -e "\n8️⃣ Ver estado de contenedores:"
sudo docker compose ps

echo -e "\n✅ Diagnóstico completado"
