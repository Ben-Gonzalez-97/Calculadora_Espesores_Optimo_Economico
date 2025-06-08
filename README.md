# Calculadora de Espesores - Óptimo Económico

Aplicación web para el cálculo de espesores de aislantes térmicos mediante el método del óptimo económico. Incluye backend en Flask y frontend moderno, con empaquetado opcional como ejecutable usando PyInstaller.

## Tabla de Contenidos
- [Descripción](#descripción)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación y Ejecución](#instalación-y-ejecución)
  - [Instalación Manual](#instalación-manual)
  - [Ejecución con Docker](#ejecución-con-docker)
- [Variables de Entorno](#variables-de-entorno)
- [Uso de la API](#uso-de-la-api)
- [Empaquetado con PyInstaller](#empaquetado-con-pyinstaller)
- [Licencia](#licencia)
- [Contacto](#contacto)

---

## Descripción
Esta app permite calcular el espesor óptimo de aislamiento térmico en tuberías y paredes, considerando criterios económicos y físicos. El usuario puede ingresar parámetros, seleccionar condiciones y obtener resultados y recomendaciones.

## Estructura del Proyecto
```
Calculadora_Espesores_Optimo_Economico/
├── BackAPI/
│   └── src/
│       ├── main.py
│       ├── api/
│       ├── services/
│       └── schemas/
├── Front/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── requirements.txt
├── pyIntaller.txt
├── LICENSE
└── README.md
```

## Instalación y Ejecución

### Instalación Manual
#### 1. Clonar el repositorio
```sh
git clone <url-del-repo>
cd Calculadora_Espesores_Optimo_Economico
```

#### 2. Instalar dependencias (Python 3.8+ recomendado)
```sh
pip install -r requirements.txt
```

#### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto (ver sección [Variables de Entorno](#variables-de-entorno)).

#### 4. Ejecutar en modo desarrollo
```sh
cd "BackAPI/src"
python main.py
```
El frontend estará disponible en `http://127.0.0.1:5000`.

### Ejecución con Docker

Puedes ejecutar tanto el backend (Flask API) como el frontend (estático con Nginx) usando Docker y Docker Compose. Esto facilita la instalación y asegura que se usen las versiones y dependencias correctas.

#### Requisitos previos
- Docker y Docker Compose instalados en tu sistema.
- (Opcional) Archivo `.env` en la raíz si necesitas variables de entorno personalizadas para el backend.

#### Instrucciones rápidas
1. **Construir y levantar los servicios:**
   ```sh
   docker compose up --build
   ```
   Esto construirá las imágenes para el backend (Python 3.10-slim, dependencias de `requirements.txt`) y el frontend (Nginx sirviendo archivos estáticos).

2. **Acceso a los servicios:**
   - **Frontend:** http://localhost:80
   - **Backend API:** http://localhost:5000

#### Detalles de los servicios
- **Backend (python-back-api):**
  - Basado en Python 3.10-slim
  - Expone el puerto `5000`
  - Usa las dependencias de `requirements.txt`
  - Puede usar variables de entorno desde `.env` (ver sección [Variables de Entorno](#variables-de-entorno))

- **Frontend (js-front):**
  - Basado en Nginx (alpine)
  - Expone el puerto `80`
  - Sirve archivos estáticos (`index.html`, `app.js`, `styles.css`)

#### Notas adicionales
- Los servicios están conectados en la red interna `app-net` definida en el `docker-compose.yml`.
- El frontend depende del backend y espera que la API esté disponible en el puerto 5000.
- No es necesario copiar manualmente archivos de configuración o dependencias: todo está gestionado por los Dockerfiles y el Compose.
- Si necesitas modificar variables de entorno para el backend, edita el archivo `.env` en la raíz antes de levantar los contenedores.

---

## Variables de Entorno
Ejemplo de `.env`:
```
FLASK_ENV=development
APP_HOST=127.0.0.1
APP_PORT=5000
```

## Uso de la API
La API principal está en `/solve_equation` (POST):

### Ejemplo de request
```json
POST /solve_equation
Content-Type: application/json
{
  "equation_key": "optimo_economico_tuberia",
  "known_values": {
    "Te": 80,
    "Ta": 25,
    "H": 0.05,
    "v": 2,
    "vida_util": 10,
    "w": 0.12,
    "beta": 0.9,
    "C": 0.08,
    "k": 0.04
  },
  "variable_to_solve": "e",
  "flow_type": "externo",
  "orientation": "horizontal"
}
```

### Ejemplo de respuesta
```json
{
  "result": 0.032,
  "h": 12.5
}
```

- `equation_key`: Identificador de la ecuación a usar.
- `known_values`: Diccionario de variables conocidas.
- `variable_to_solve`: Variable a despejar (ej: `e` para espesor).
- `flow_type` y `orientation`: Opcionales, para cálculo automático de coeficiente de convección.

## Empaquetado con PyInstaller
Puedes generar un ejecutable standalone:

```sh
pyinstaller --name CalculadoraEspesores --onefile \
  --add-data "Front;Front" \
  --add-data "BackAPI/src/api;api" \
  --add-data "BackAPI/src/services;services" \
  --add-data ".env;." \
  --paths "BackAPI/src" \
  "BackAPI/src/main.py"
```

Consulta el archivo `pyIntaller.txt` para detalles.

## Licencia
Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE).

## Contacto
Autor: Ben Gonzalez

¿Dudas o sugerencias? Abre un issue o contacta por GitHub.

---
Esta calculadora de espesores para un cálculo de óptimo económico es resultado del trabajo de grado:

*«IMPLEMENTACIÓN DE UN MODELO MATEMÁTICO PARA CALCULAR EL ESPESOR ÓPTIMO-ECONÓMICO DEL AISLAMIENTO TÉRMICO EN SISTEMAS DE TRANSPORTE Y ALMACENAMIENTO DE FLUIDOS»*

De la universidad:

**UNIVERSIDAD NACIONAL EXPERIMENTAL POLITÉCNICA “ANTONIO JOSÉ DE SUCRE” VICE-RECTORADO BARQUISIMETO DEPARTAMENTO DE INGENIERÍA MECÁNICA**
