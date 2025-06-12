"""
Módulo para definir los esquemas de datos utilizados en la API.

Nota: Actualmente, este módulo y sus esquemas no están siendo utilizados activamente
en la implementación de la API de cálculo. Fueron parte de una exploración inicial
o podrían ser para funcionalidades futuras.
"""

from pydantic import BaseModel
from typing import List, Optional
from marshmallow import Schema, fields

class CalculationRequest(BaseModel):
    """
    Esquema para las solicitudes de cálculo.
    No utilizado actualmente.
    """
    operation: str
    operands: List[float]

class CalculationResponse(BaseModel):
    """
    Esquema para las respuestas de cálculo.
    No utilizado actualmente.
    """
    result: float
    error: Optional[str] = None

class CalculationSchema(Schema):
    """
    Esquema de Marshmallow para cálculos simples.
    No utilizado actualmente.
    """
    a = fields.Float(required=True)
    b = fields.Float(required=True)

class NewtonRaphsonSchema(Schema):
    """
    Esquema de Marshmallow para el método de Newton-Raphson.
    No utilizado actualmente.
    """
    initial_guess = fields.Float(required=True)
    # 'equation_params' puede ser flexible. Usamos Raw con tipo dict para permitir cualquier estructura.
    # Podrías definir esquemas más específicos si las ecuaciones tienen parámetros bien definidos.
    equation_params = fields.Raw(type="dict", required=False, missing={}) 
    equation_name = fields.Str(required=False, missing="example") # Para seleccionar la ecuación en el backend