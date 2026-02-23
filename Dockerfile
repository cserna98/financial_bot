# Usamos la versión oficial de Node.js ligera (Alpine)
FROM node:22-alpine

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias primero (para optimizar la caché de Docker)
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código del proyecto
COPY . .

# Comando para iniciar el bot (el mismo que usabas en tu PC)
CMD ["npx", "tsx", "src/bot/telegram.ts"]