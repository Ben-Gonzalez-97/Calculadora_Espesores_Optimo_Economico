# Mi API Python

Este proyecto es una API REST desarrollada en Python que permite realizar cálculos a través de solicitudes HTTP. La API está diseñada para ser utilizada desde aplicaciones web o formularios en Excel, facilitando la interacción con funciones matemáticas complejas.

## Estructura del Proyecto

```
mi-api-python
├── src
│   ├── __init__.py
│   ├── main.py
│   ├── api
│   │   ├── __init__.py
│   │   └── calculations.py
│   ├── services
│   │   ├── __init__.py
│   │   └── calculator.py
│   └── schemas
│       ├── __init__.py
│       └── calculation_schemas.py
├── requirements.txt
└── README.md
```

## Instalación

Para instalar las dependencias necesarias, asegúrate de tener `pip` instalado y ejecuta:

```
pip install -r requirements.txt
```

## Uso

Para iniciar la API, ejecuta el archivo `main.py`:

```
python src/main.py
```

La API estará disponible en `http://localhost:5000`.

## Endpoints

### Cálculos

La API expone un endpoint para realizar cálculos. Puedes enviar una solicitud POST a `/api/calculate` con los datos necesarios en el cuerpo de la solicitud.

#### Ejemplo de Solicitud

```json
{
  "operation": "suma",
  "operands": [1, 2, 3]
}
```

#### Ejemplo de Respuesta

```json
{
  "result": 6
}
```

## Contribuciones

Las contribuciones son bienvenidas. Si deseas mejorar este proyecto, por favor abre un issue o envía un pull request.

## Licencia

Este proyecto está bajo la Licencia MIT.