#!/bin/bash

# Script para agregar extensiones .js a los imports en archivos compilados
# Esto es necesario para ES modules en Node.js

echo "Fixing ES module imports in TypeScript output..."

find server/dist -name "*.js" -type f | while read file; do
    # Agregar .js a los imports que no lo tienen
    sed -i "s/from \"\.\.\([^\"]*\)\"$/from \"\.\.\1.js\"/g" "$file"
    sed -i "s/from \"\.\([^\"]*\)\"$/from \"\.\1.js\"/g" "$file"
    sed -i "s/from '\.\.\([^']*\)'$/from '\.\.\1.js'/g" "$file"
    sed -i "s/from '\.\([^']*\)'$/from '\.\1.js'/g" "$file"
done

echo "✅ ES module imports fixed!"
ls -la server/dist/
