#!/bin/bash

# =========================================
# Script de Diagnóstico - Backend Restarts
# =========================================

echo "================================"
echo "DIAGNOSTICO DEL BACKEND"
echo "================================"

echo -e "\n📋 Ver últimos 100 líneas de logs del backend:"
echo "=================================================="
docker compose logs --tail=100 backend

echo -e "\n\n🔍 Ver estado de contenedores:"
echo "================================"
docker compose ps

echo -e "\n\n💾 Ver variables de entorno del backend:"
echo "=========================================="
docker compose config | grep -A 100 "backend:"

echo -e "\n\n🐛 Intentar ejecutar el backend manualmente:"
echo "============================================"
docker compose run --rm backend node server/dist/index.js
