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
│   ├── assets/
│   ├── js/
│   │   ├── apiService.js
│   │   ├── CalculationHandler.js
│   │   ├── CatalogManager.js
│   │   ├── GraphHandler.js
│   │   ├── ModalHandler.js
│   │   ├── ExportService.js
│   │   └── UiSetup.js
│   ├── libs/
│   │   └──  chart.umd.min.js
│   └── css/
│       └──  styles.css
├── requirements.txt
├── pyIntaller.bat
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

La API proporciona varios endpoints para interactuar con el motor de cálculo y obtener información relevante.

### `POST /solve_equation`
Este es el endpoint principal para resolver una ecuación y obtener el valor de una variable desconocida, como el espesor óptimo económico.

**Ejemplo de request:**
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

**Ejemplo de respuesta:**
```json
{
  "result": 0.032,
  "h": 12.5
}
```

**Parámetros del cuerpo (JSON):**
- `equation_key` (string): Identificador de la ecuación a usar (ej: "optimo_economico_tuberia").
- `known_values` (object): Diccionario de variables conocidas con sus valores.
- `variable_to_solve` (string): Variable que se desea despejar (ej: `e` para espesor).
- `flow_type` (string, opcional): Tipo de flujo ("interno" o "externo"). Necesario si se requiere el cálculo automático del coeficiente de convección `h`.
- `orientation` (string, opcional): Orientación de la superficie ("horizontal", "vertical", "inclinada"). Necesario para algunos cálculos de `h`.

### `GET /equation_info/{equation_key}`
Recupera la información detallada de una ecuación específica, incluyendo su representación en formato LaTeX y las restricciones aplicables.

**Parámetros de URL:**
- `equation_key` (string, path): El identificador único de la ecuación (ej: "optimo_economico_tuberia").

**Ejemplo de request:**
```http
GET /equation_info/optimo_economico_tuberia
```

**Ejemplo de respuesta:**
```json
{
  "latex": "e = \\\\sqrt{\\\\frac{2 \\\\cdot k \u00b7 (Te - Ta) \u00b7 vida_util \u00b7 w \u00b7 beta}{C \u00b7 eta}} - D/2",
  "restricciones": [
    "Te > Ta",
    "k > 0",
    "vida_util > 0",
    "w > 0",
    "beta > 0",
    "C > 0",
    "eta > 0",
    "D >= 0"
  ]
}
```
- `latex`: La ecuación en formato LaTeX.
- `restricciones`: Una lista de cadenas que describen las restricciones o condiciones para la validez de la ecuación.

### `GET /variables_leyenda`
Obtiene un diccionario que sirve como leyenda para todas las variables utilizadas en las ecuaciones. Cada clave es el símbolo de la variable y su valor es una descripción de lo que representa.

**Ejemplo de request:**
```http
GET /variables_leyenda
```

**Ejemplo de respuesta:**
```json
{
  "Te": "Temperatura externa o del fluido caliente (\u00b0C)",
  "Ta": "Temperatura ambiente o del fluido frío (\u00b0C)",
  "Ti": "Temperatura interna o de la superficie aislada (\u00b0C)",
  "H": "Dimensión característica (m)",
  "v": "Velocidad del fluido (m/s)",
  "vida_util": "Vida útil de la instalación (años)",
  "w": "Costo de la energía ($/kWh)",
  "beta": "Factor de utilización o tiempo de operación (horas/año)",
  "C": "Costo del aislamiento por unidad de volumen o área ($/m\u00b3 o $/m\u00b2)",
  "k": "Conductividad térmica del material aislante (W/mK)",
  "e": "Espesor del aislamiento (m)",
  "h": "Coeficiente de transferencia de calor por convección (W/m\u00b2K)",
  "D": "Diámetro de la tubería (m)",
  "eta": "Eficiencia del sistema de calentamiento/enfriamiento (%)"
}
```

### `POST /plot_espesor`
Genera los datos necesarios para graficar cómo varía una variable objetivo (generalmente el espesor óptimo `e`) en función de otra variable seleccionada, dentro de un rango y con un paso definidos por el usuario.

**Ejemplo de request:**
```json
POST /plot_espesor
Content-Type: application/json
{
  "equation_key": "optimo_economico_tuberia",
  "variable": "Ta", // Variable que irá en el eje X del gráfico
  "known_values": { // Valores fijos para las otras variables
    "Te": 100,
    "H": 0.1,     // o "diametro": 0.1
    "v": 1.5,
    "vida_util": 15,
    "w": 0.10,
    "beta": 8000,
    "C": 150,
    "k": 0.035,
    "eta": 90
    // No incluir 'h' si se quiere que se calcule automáticamente
  },
  "flow_type": "externo", // Necesario si 'h' se calcula automáticamente
  "orientation": "horizontal", // Necesario si 'h' se calcula automáticamente
  "min_val": 5,     // Valor mínimo para la variable en el eje X (Ta)
  "max_val": 40,    // Valor máximo para la variable en el eje X (Ta)
  "step_val": 2     // Incremento para la variable en el eje X (Ta)
}
```

**Ejemplo de respuesta:**
```json
{
  "x": [5.0, 7.0, 9.0, 11.0, /* ... */, 39.0],
  "y": [0.085, 0.082, 0.079, 0.076, /* ... */, 0.032], // Valores de espesor 'e' calculados
  "h_vals": [10.5, 10.8, 11.1, 11.3, /* ... */, 14.5] // Valores de 'h' calculados para cada punto si aplica
}
```
- `x`: Lista de valores para la variable independiente (eje X del gráfico).
- `y`: Lista de valores calculados para la variable dependiente (generalmente el espesor `e`, eje Y del gráfico), correspondientes a cada valor de `x`.
- `h_vals`: Lista de valores del coeficiente de convección `h` calculados para cada punto, si `h` no se proporcionó como valor conocido y la ecuación lo requiere para el cálculo.

## Empaquetado con PyInstaller
Puedes generar un ejecutable standalone ejecutando el script `pyIntaller.bat` que se encuentra en la raíz del proyecto.

Este script utiliza PyInstaller para empaquetar la aplicación Flask junto con el frontend y todas las dependencias necesarias en un único archivo ejecutable.

Asegúrate de tener PyInstaller instalado (`pip install pyinstaller`) y estar en el directorio raíz del proyecto antes de ejecutar el script.

```bat
.\\pyIntaller.bat
```

El ejecutable resultante se encontrará en la carpeta `dist`.

Consulta el contenido del archivo `pyIntaller.bat` para ver los detalles específicos del comando de PyInstaller utilizado.

## Licencia
Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE).

## Contacto
¿Dudas o sugerencias? Abre un issue en el repositorio del proyecto o contacta a los desarrolladores a través de GitHub.
 
---
Esta calculadora de espesores para un cálculo de óptimo económico es resulstado del trabajo de grado:

*«IMPLEMENTACIÓN DE UN MODELO MATEMÁTICO PARA CALCULAR EL ESPESOR ÓPTIMO-ECONÓMICO DEL AISLAMIENTO TÉRMICO EN SISTEMAS DE TRANSPORTE Y ALMACENAMIENTO DE FLUIDOS»*

De la universidad:

**UNIVERSIDAD NACIONAL EXPERIMENTAL POLITÉCNICA “ANTONIO JOSÉ DE SUCRE” VICE-RECTORADO BARQUISIMETO**

  **DEPARTAMENTO DE INGENIERÍA MECÁNICA**
