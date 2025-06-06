## Ejecución con Docker

Puedes ejecutar tanto el backend (Flask API) como el frontend (estático con Nginx) usando Docker y Docker Compose. Esto facilita la instalación y asegura que se usen las versiones y dependencias correctas.

### Requisitos previos
- Docker y Docker Compose instalados en tu sistema.
- (Opcional) Archivo `.env` en la raíz si necesitas variables de entorno personalizadas para el backend.

### Instrucciones rápidas
1. **Construir y levantar los servicios:**
   ```sh
   docker compose up --build
   ```
   Esto construirá las imágenes para el backend (Python 3.10-slim, dependencias de `requirements.txt`) y el frontend (Nginx sirviendo archivos estáticos).

2. **Acceso a los servicios:**
   - **Frontend:** http://localhost:80
   - **Backend API:** http://localhost:5000

### Detalles de los servicios
- **Backend (python-back-api):**
  - Basado en Python 3.10-slim
  - Expone el puerto `5000`
  - Usa las dependencias de `requirements.txt`
  - Puede usar variables de entorno desde `.env` (ver sección [Variables de Entorno](#variables-de-entorno))

- **Frontend (js-front):**
  - Basado en Nginx (alpine)
  - Expone el puerto `80`
  - Sirve archivos estáticos (`index.html`, `app.js`, `styles.css`)

### Notas adicionales
- Los servicios están conectados en la red interna `app-net` definida en el `docker-compose.yml`.
- El frontend depende del backend y espera que la API esté disponible en el puerto 5000.
- No es necesario copiar manualmente archivos de configuración o dependencias: todo está gestionado por los Dockerfiles y el Compose.
- Si necesitas modificar variables de entorno para el backend, edita el archivo `.env` en la raíz antes de levantar los contenedores.

---
