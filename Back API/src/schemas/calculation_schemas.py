from pydantic import BaseModel
from typing import List, Optional
from marshmallow import Schema, fields

class CalculationRequest(BaseModel):
    operation: str
    operands: List[float]

class CalculationResponse(BaseModel):
    result: float
    error: Optional[str] = None

class CalculationSchema(Schema):
    a = fields.Float(required=True)
    b = fields.Float(required=True)

class NewtonRaphsonSchema(Schema):
    initial_guess = fields.Float(required=True)
    # 'equation_params' puede ser flexible. Usamos Raw con tipo dict para permitir cualquier estructura.
    # Podrías definir esquemas más específicos si las ecuaciones tienen parámetros bien definidos.
    equation_params = fields.Raw(type="dict", required=False, missing={}) 
    equation_name = fields.Str(required=False, missing="example") # Para seleccionar la ecuación en el backend