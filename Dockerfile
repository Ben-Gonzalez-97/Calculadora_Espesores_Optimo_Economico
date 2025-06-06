# Usar una imagen oficial de Python basada en Alpine para reducir el tamaño
FROM python:3.11-alpine AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para compilar paquetes (si alguna dependencia lo requiere)
RUN apk add --no-cache build-base

# Copiar e instalar dependencias
COPY requirements.txt ./
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# Etapa 2: imagen final, solo con runtime
FROM python:3.11-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar las dependencias instaladas en la etapa de build
COPY --from=build /install /usr/local

# Copiar el backend y el frontend
COPY BackAPI/src/ ./src/
COPY Front/ ./Front/

# Exponer el puerto que usa Flask
EXPOSE 5000

# Variable de entorno para producción
ENV FLASK_ENV=production

# Comando para ejecutar la app desde /app, para evitar duplicar src en la ruta
CMD ["python", "src/main.py"]
