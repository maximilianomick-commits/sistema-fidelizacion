# Imagen lista para desplegar en cualquier plataforma (Railway, Render, VPS, etc.)
FROM node:20-bookworm-slim

# Dependencias de compilación para better-sqlite3 (por si no hay binario prebuilt)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Carpeta persistente para la base de datos (montá un volumen acá en producción)
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
