from flask import Blueprint, request, jsonify
from services.calculator import solve_equation, EQUATIONS, VARIABLES_LEYENDA, calculate_convection_coefficient
import numpy as np

calculations_bp = Blueprint('calculations', __name__)

@calculations_bp.route('/solve_equation', methods=['POST'])
def solve_equation_route():
    data = request.get_json()
    equation_key = data.get('equation_key')
    known_values = data.get('known_values', {})
    variable_to_solve = data.get('variable_to_solve')
    flow_type = data.get('flow_type') or known_values.get('flow_type')
    orientation = data.get('orientation') or known_values.get('orientation')

    # Buscar ecuación
    eq = EQUATIONS.get(equation_key)
    if eq is None:
        return jsonify({'error': 'Ecuación no encontrada'}), 404

    # Si la ecuación es un string, es de las antiguas, si es dict, es de las nuevas
    latex = eq['latex'] if isinstance(eq, dict) else eq

    # Si es óptimo económico y no se envía h, calcularlo automáticamente
    if equation_key.startswith('optimo_economico') and ('h' not in known_values or known_values['h'] in (None, '', 0)):
        # Determinar los valores necesarios para h
        # Se asume que el front envía Te, Ta, H, v, flow_type, orientation
        # H puede ser 'diametro' o 'H' según el front
        h_inputs = {}
        for k in ['Te', 'Ta', 'H', 'v']:
            if k in known_values:
                h_inputs[k] = known_values[k]
            elif k == 'H' and 'diametro' in known_values:
                h_inputs['H'] = known_values['diametro']
        if not flow_type or not orientation:
            return jsonify({'error': 'Faltan flow_type u orientation para calcular h'}), 400
        try:
            h_value = calculate_convection_coefficient(h_inputs, flow_type, orientation)
            known_values['h'] = h_value
        except Exception as e:
            return jsonify({'error': f'Error calculando h: {str(e)}'}), 400

    try:
        result, iterations = solve_equation(latex, known_values, variable_to_solve)
        response = {'result': result, 'iterations': iterations}
        if 'h' in known_values:
            response['h'] = known_values['h']
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@calculations_bp.route('/equation_info/<equation_key>', methods=['GET'])
def equation_info(equation_key):
    eq = EQUATIONS.get(equation_key)
    if eq is None:
        return jsonify({'error': 'Ecuación no encontrada'}), 404
    if isinstance(eq, dict):
        return jsonify({
            'latex': eq['latex'],
            'restricciones': eq.get('restricciones', [])
        })
    else:
        return jsonify({'latex': eq, 'restricciones': []})

@calculations_bp.route('/variables_leyenda', methods=['GET'])
def variables_leyenda():
    return jsonify(VARIABLES_LEYENDA)

@calculations_bp.route('/plot_espesor', methods=['POST'])
def plot_espesor():
    data = request.get_json()
    equation_key = data.get('equation_key')
    variable = data.get('variable')
    known_values = data.get('known_values', {})
    
    flow_type = data.get('flow_type') 
    if not flow_type and 'flow_type' in known_values:
        flow_type = known_values['flow_type']
    
    orientation = data.get('orientation')
    if not orientation and 'orientation' in known_values:
        orientation = known_values['orientation']

    # Leer los parámetros de rango del request con los nombres correctos
    req_min_val = data.get('min_val')
    req_max_val = data.get('max_val')
    req_step_val = data.get('step_val')
    
    # Rangos por defecto
    default_rangos = {
        'Ta': (10, 50, 1), 'Te': (10, 100, 5), 'Ti': (20, 300, 5),
        'v': (0.1, 10, 0.2), 'k': (0.01, 0.2, 0.005),
        'diametro': (0.01, 1, 0.02), 'C': (100, 10000, 200),
        'w': (0.01, 0.2, 0.005), 'beta': (0, 8760, 24), # Ajustado max a 8760
        'vida_util': (1, 30, 1), 'eta': (10, 100, 5)
    }

    if not variable or not equation_key:
        return jsonify({'error': 'Faltan parámetros: variable o equation_key'}), 400
    
    # Determinar los valores de rango a utilizar
    if req_min_val is not None and req_max_val is not None and req_step_val is not None:
        # Usar valores del request. 
        # El frontend ya valida que step_val > 0 y que son números.
        # Una validación adicional en el backend podría ser útil en el futuro.
        if not (isinstance(req_min_val, (int, float)) and
                isinstance(req_max_val, (int, float)) and
                isinstance(req_step_val, (int, float))):
            return jsonify({'error': 'Mínimo, Máximo y Paso deben ser números.'}), 400
        if req_step_val <= 0:
            return jsonify({'error': 'El valor de "Paso" para la gráfica debe ser positivo.'}), 400
        
        min_to_use = req_min_val
        max_to_use = req_max_val
        step_to_use = req_step_val
    else:
        # Si no, usar los rangos por defecto para la variable seleccionada
        min_to_use, max_to_use, step_to_use = default_rangos.get(variable, (0, 10, 1)) # Fallback genérico
    
    x_vals = []
    y_vals = []  # Valores del espesor 'e' o la variable principal de la ecuación
    h_vals = []  # NUEVO: para los valores de 'h'

    eq_obj = EQUATIONS.get(equation_key)
    if eq_obj is None:
        return jsonify({'error': f"Ecuación '{equation_key}' no encontrada."}), 404
    
    latex_eq_principal = eq_obj['latex'] if isinstance(eq_obj, dict) else eq_obj
    variable_principal_a_resolver = 'e' # Asumimos que el eje Y principal es el espesor.

    for v_iter_val in np.arange(min_to_use, max_to_use + step_to_use, step_to_use):
        current_known_values = known_values.copy()
        current_known_values[variable] = v_iter_val

        valor_principal_calculado = None
        h_calculado_iter = None

        if equation_key.startswith('optimo_economico'):
            temp_known_values_for_h = current_known_values.copy()
            if 'h' in temp_known_values_for_h:
                del temp_known_values_for_h['h']
            
            if not flow_type or not orientation:
                print(f"[PLOT DEBUG] No se puede calcular h para {variable}={v_iter_val} porque falta flow_type o orientation general.")
            else:
                try:
                    h_calculado_iter = calculate_convection_coefficient(
                        temp_known_values_for_h,
                        flow_type,
                        orientation
                    )
                    current_known_values['h'] = h_calculado_iter
                    print(f"[PLOT DEBUG] h calculado para {variable}={v_iter_val}: {h_calculado_iter}")
                except Exception as e_h:
                    print(f"[PLOT DEBUG] Error calculando h para {variable}={v_iter_val}: {e_h}")
                    current_known_values.pop('h', None) # Asegurar que no se use un h incorrecto

        try:
            # Modificación: Desempaquetar el resultado y las iteraciones
            valor_principal_calculado_tupla = solve_equation(
                latex_eq_principal,
                current_known_values, 
                variable_principal_a_resolver 
            )
            valor_principal_calculado = valor_principal_calculado_tupla[0] # Tomar solo el resultado
            # Las iteraciones están en valor_principal_calculado_tupla[1] si se necesitaran aquí
            print(f"[PLOT DEBUG] Valor principal '{variable_principal_a_resolver}' calculado para {variable}={v_iter_val} (con h={current_known_values.get('h')}): {valor_principal_calculado}")
        except Exception as e_principal:
            print(f"[PLOT DEBUG] Error calculando '{variable_principal_a_resolver}' para {variable}={v_iter_val}: {e_principal}")
            valor_principal_calculado = None

        x_vals.append(v_iter_val)
        y_vals.append(valor_principal_calculado)
        h_vals.append(h_calculado_iter)

    x_vals = [float(x) for x in x_vals]
    y_vals = [float(y) if y is not None else None for y in y_vals]
    h_vals = [float(h) if h is not None else None for h in h_vals]

    return jsonify({'x': x_vals, 'y': y_vals, 'h_vals': h_vals})