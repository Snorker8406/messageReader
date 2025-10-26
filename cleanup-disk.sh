#!/bin/bash

# =========================================
# Script de Limpieza - Espacio en Disco
# =========================================

echo "================================"
echo "LIMPIEZA DE ESPACIO EN DISCO"
echo "================================"

echo -e "\n📊 Espacio actual:"
df -h

echo -e "\n🧹 Limpiando Docker..."
sudo docker system prune -a -f
sudo docker volume prune -f
sudo docker builder prune -a -f

echo -e "\n🗑️ Limpiando npm cache..."
sudo npm cache clean --force
rm -rf ~/.npm

echo -e "\n🧹 Limpiando /tmp..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

echo -e "\n🧹 Limpiando logs antiguos..."
sudo find /var/log -type f -name "*.log" -mtime +7 -delete

echo -e "\n📊 Espacio después de limpieza:"
df -h

echo -e "\n✅ Limpieza completada"
