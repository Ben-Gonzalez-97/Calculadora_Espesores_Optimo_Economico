import numpy as np
import sympy as sp
from sympy.logic.boolalg import Boolean
from sympy.core.relational import Equality
import re


def solve_equation(equation_str: str, known_values: dict, variable_to_solve: str, maxiter=50, tol=1e-6):
    """
    Resuelve una ecuación dada en formato string Python/SymPy para la variable deseada.
    Si no hay solución analítica, intenta resolver numéricamente.
    Args:
        equation_str (str): Ecuación en formato string Python/SymPy (por ejemplo, 'x**2 + y == 1').
        known_values (dict): Diccionario con los valores conocidos, ej: {'y': 2}.
        variable_to_solve (str): Nombre de la variable a despejar.
        initial_guess (float): Valor inicial para el método numérico (opcional).
        maxiter (int): Número máximo de iteraciones para el método numérico.
        tol (float): Tolerancia para la convergencia numérica.
    Returns:
        float: Valor de la variable despejada.
    """
    import warnings
    # LOG para depuración
    print("[DEBUG] solve_equation: known_values (original):", known_values)
    print("[DEBUG] solve_equation: equation_str:", equation_str)
    print("[DEBUG] solve_equation: variable_to_solve:", variable_to_solve)
    # Eliminar la incógnita de los valores conocidos si está presente
    known_values = dict(known_values)
    if variable_to_solve in known_values:
        print(f"[DEBUG] Eliminando '{variable_to_solve}' de known_values para evitar sustitución prematura.")
        known_values.pop(variable_to_solve)
    print("[DEBUG] solve_equation: known_values (sin incógnita):", known_values)
    # Extraer todos los nombres de variables de la ecuación y crear símbolos
    var_names = set(re.findall(r'\b[a-zA-Z_]\w*\b', equation_str))
    reserved = {'log', 'sin', 'cos', 'tan', 'exp', 'sqrt', 'pi', 'E', 'Abs', 'min', 'max', 'and', 'or', 'not', 'True', 'False'}
    var_names = {name for name in var_names if not name.isnumeric() and name not in reserved}
    symbols_dict = {name: sp.symbols(name) for name in var_names}
    print("[DEBUG] solve_equation: symbols_dict:", symbols_dict)
    # --- Asignación automática de variables faltantes ---
    if 'r' in var_names and 'r' not in known_values:
        if 'diametro' in known_values:
            known_values['r'] = known_values['diametro'] / 2
            print("[DEBUG] Asignando r = diametro/2:", known_values['r'])
    # --- CORRECCIÓN: forzar que '==' sea interpretado como Eq() ---
    if '==' in equation_str:
        partes = equation_str.split('==')
        if len(partes) == 2:
            eq_str = f"Eq({partes[0].strip()}, {partes[1].strip()})"
        else:
            raise ValueError("Ecuación con más de un '==' no soportada.")
    else:
        eq_str = equation_str
    print("[DEBUG] solve_equation: eq_str para sympify:", eq_str)
    # Paso 1: Crear la expresión simbólica
    try:
        expr = sp.sympify(eq_str, locals=symbols_dict)
    except Exception as e:
        print(f"[ERROR] sympify falló: {e}")
        raise ValueError(f"Error al convertir la ecuación a simbólica: {e}")
    print("[DEBUG] solve_equation: expr sympified:", expr)
    # Validar que la expresión es una igualdad simbólica
    if not isinstance(expr, (sp.Equality, Equality)):
        raise ValueError("La ecuación proporcionada no es una igualdad simbólica válida.")
    # Paso 2: Obtener el símbolo de la variable a despejar
    var = symbols_dict.get(variable_to_solve, sp.symbols(variable_to_solve))
    # Paso 3: Sustituir los valores conocidos
    subs_dict = {symbols_dict.get(k, sp.symbols(k)): v for k, v in known_values.items()}
    print("[DEBUG] solve_equation: subs_dict:", subs_dict)
    subs_expr = expr.subs(subs_dict)
    print("[DEBUG] solve_equation: subs_expr after substitution:", subs_expr)
    # Validar que la expresión sigue siendo simbólica en la incógnita
    if not subs_expr.has(var):
        raise ValueError(f"La ecuación ya no depende de la variable '{variable_to_solve}'. Revisa los valores conocidos.")
    # Paso 4: Intentar solución simbólica SOLO si la ecuación no es compleja
    ecuaciones_solo_numerico = [
        "optimo_economico_cilindro", "optimo_economico_esfera"
    ]
    if equation_str in [EQUATIONS.get(key) for key in ecuaciones_solo_numerico]:
        print(f"[DEBUG] Saltando solución simbólica para ecuación compleja: {equation_str}")
        sol = []
    else:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                sol = sp.solve(subs_expr, var, dict=False)
        except Exception as e:
            print(f"[DEBUG] solve_equation: error en solve: {e}")
            sol = []
    print("[DEBUG] solve_equation: solution:", sol)
    # Filtrar solo soluciones reales y positivas si aplica
    if sol:
        if isinstance(sol, (list, tuple)):
            sol_reales = [float(s.evalf()) for s in sol if sp.im(s) == 0 and float(s.evalf()) > 0]
            if sol_reales:
                print(f"[DEBUG] solve_equation: returning real positive solution {sol_reales[0]}")
                return sol_reales[0], False # Solución simbólica
            sol_reales = [float(s.evalf()) for s in sol if sp.im(s) == 0]
            if sol_reales:
                print(f"[DEBUG] solve_equation: returning real solution {sol_reales[0]}")
                return sol_reales[0], False # Solución simbólica
            print(f"[DEBUG] solve_equation: returning first solution {float(sol[0].evalf())}")
            return float(sol[0].evalf()), False # Solución simbólica
        else:
            print(f"[DEBUG] solve_equation: returning solution {float(sol.evalf())}")
            return float(sol.evalf()), False # Solución simbólica
    # Paso 5: Si no hay solución simbólica, intentar numéricamente
    if isinstance(subs_expr, (sp.Equality, Equality)):
        f_expr = subs_expr.lhs - subs_expr.rhs
    else:
        f_expr = subs_expr
    print("[DEBUG] solve_equation: f_expr for numeric solve:", f_expr)
    from scipy.optimize import root_scalar
    import math
    # Diagnóstico: print antes de crear la función lambdify
    print("[DEBUG] Intentando crear f_lambdified con lambdify...")
    try:
        f_lambdified = sp.lambdify(var, f_expr, "numpy")
        print("[DEBUG] f_lambdified creado exitosamente.")
    except Exception as ex:
        print(f"[DEBUG] ERROR al crear f_lambdified: {ex}")
        raise ValueError(f"Error al crear la función numérica: {ex}")
    def safe_f_num(x):
        try:
            val = float(f_lambdified(x))
            if math.isnan(val) or math.isinf(val):
                print(f"[DEBUG] safe_f_num: x={x}, f(x) es nan o inf")
                return 1e6
            print(f"[DEBUG] safe_f_num: x={x}, f(x)={val}")
            return val
        except Exception as ex:
            print(f"[DEBUG] safe_f_num: error evaluando f({x}): {ex}")
            return 1e6
    # Determinar intervalo para e
    r_value = known_values.get('r', 0.01)
    emin = 0
    emax = r_value * 10
    print(f"[DEBUG] solve_equation: intervalo de búsqueda para e: [{emin}, {emax}]")
    # Diagnóstico: imprime valores de la función en 10 puntos del intervalo
    for i in range(11):
        test_e = emin + i * (emax - emin) / 10
        try:
            val = f_lambdified(test_e)
            print(f"[DEBUG] f_lambdified({test_e}) = {val}")
        except Exception as ex:
            print(f"[DEBUG] f_lambdified({test_e}) ERROR: {ex}")
    f_emin = safe_f_num(emin)
    f_emax = safe_f_num(emax)
    print(f"[DEBUG] safe_f_num: f({emin})={f_emin}, f({emax})={f_emax}")
    if f_emin * f_emax > 0:
        print(f"[DEBUG] No hay cambio de signo en el intervalo. f({emin})={f_emin}, f({emax})={f_emax}")
        raise ValueError(f"No se puede encontrar una raíz en el intervalo [{emin}, {emax}]. Cambia los parámetros o revisa los datos de entrada. f({emin})={f_emin}, f({emax})={f_emax}")
    try:
        sol = root_scalar(safe_f_num, bracket=[emin, emax], method='brentq', maxiter=maxiter, xtol=tol)
        print(f"[DEBUG] solve_equation: root_scalar result: {sol}")
        if not sol.converged:
            print(f"[DEBUG] root_scalar no convergió tras {sol.iterations} iteraciones. Intervalo: [{emin}, {emax}]")
            raise ValueError(f"El método numérico no convergió tras {sol.iterations} iteraciones.")
        return float(sol.root), sol.iterations # Solución numérica con iteraciones
    except Exception as e:
        print(f"[DEBUG] solve_equation: error en root_scalar: {e}")
        raise ValueError(f"No se pudo encontrar una solución numérica para la variable '{variable_to_solve}' en el intervalo [{emin}, {emax}]. Ajusta los parámetros o revisa los datos. Detalle: {e}")

def check_restrictions(restrictions: list[str], known_values: dict) -> bool:
    """
    Evalúa una lista de restricciones dadas como cadenas de texto.
    Args:
        restrictions (list[str]): Lista de restricciones, ej: ["v * H <= 8", "H > 0"].
        known_values (dict): Diccionario con los valores conocidos para las variables.
    Returns:
        bool: True si todas las restricciones se cumplen, False en caso contrario.
    """
    print("[DEBUG] Evaluando restricciones con known_values:")
    for k, v in known_values.items():
        print(f"  {k}: {v} (type: {type(v)})")
    symbol_known_values = {sp.symbols(k): v for k, v in known_values.items()}
    try:
        for r_str in restrictions:
            print(f"[DEBUG] Restricción: {r_str}")
            restriction_expr = sp.sympify(r_str)
            # Sustituir valores conocidos
            substituted = restriction_expr.subs(symbol_known_values)
            # Si la restricción aún contiene símbolos (no se puede evaluar),
            # pero esos símbolos son variables que SÍ están en known_values, intentar sustituir de nuevo
            if substituted.free_symbols:
                # Verifica si todos los símbolos libres están en known_values
                missing = [str(s) for s in substituted.free_symbols if str(s) not in known_values]
                if missing:
                    print(f"[DEBUG] Restricción '{r_str}' contiene símbolos libres que no están en known_values: {missing}, se ignora.")
                    continue
                # Si todos los símbolos libres están en known_values, intentar sustituir de nuevo
                try:
                    substituted = substituted.subs({sp.symbols(k): v for k, v in known_values.items()})
                except Exception as e:
                    print(f"[DEBUG] Error en sustitución extra: {e}")
                    continue
                if substituted.free_symbols:
                    print(f"[DEBUG] Restricción '{r_str}' sigue teniendo símbolos libres tras reintento, se ignora.")
                    continue
            # Si la restricción ya es un booleano (SymPy o Python), úsalo directamente
            if isinstance(substituted, (bool, Boolean)):
                result = bool(substituted)
            elif isinstance(substituted, Equality):
                # Para objetos relacionales, usar .evalf() y luego bool()
                result = bool(substituted.evalf())
            else:
                # Si es un número, interpreta como booleano
                result = bool(substituted)
            print(f"[DEBUG] Resultado de la restricción: {result} (type: {type(result)})")
            if not result:
                print(f"[DEBUG] Restricción '{r_str}' evaluó a False.")
                return False
        return True
    except Exception as e:
        print(f"[DEBUG] Error evaluando restricciones: {e}")
        return False

def calculate_convection_coefficient(
    known_values_for_h: dict, 
    flow_type: str, # "interior" o "exterior"
    orientation: str, # "vertical" u "horizontal"
) -> float:
    """
    Calcula el coeficiente de convección (h) seleccionando la fórmula correcta
    basada en el tipo de flujo, orientación y restricciones.
    Args:
        known_values_for_h (dict): Valores para variables en ecuaciones de convección (Te, Ta, H, v).
        flow_type (str): "interior" o "exterior".
        orientation (str): "vertical" u "horizontal".
    Returns:
        float: El valor calculado de h.
    Raises:
        ValueError: Si no se encuentra una fórmula adecuada o los valores son inconsistentes.
    """
    candidate_prefixes = [
        f"conv_{flow_type}_{orientation}_laminar",
        f"conv_{flow_type}_{orientation}_turbulento"
    ]
    
    for eq_name_prefix in candidate_prefixes:
        if eq_name_prefix in EQUATIONS:
            eq_data = EQUATIONS[eq_name_prefix]
            if not isinstance(eq_data, dict) or "latex" not in eq_data or "restricciones" not in eq_data:
                continue

            latex_h_eq = eq_data["latex"]
            restrictions = eq_data["restricciones"]
            
            # Copia limpia SIN 'h' para restricciones y para solve_latex_equation
            known_values_for_h_clean = {k: v for k, v in known_values_for_h.items() if k != 'h'}
            if check_restrictions(restrictions, known_values_for_h_clean):
                # h_value ahora es una tupla (valor, iteraciones)
                h_value_tuple = solve_equation(
                    equation_str=latex_h_eq,
                    known_values=known_values_for_h_clean,
                    variable_to_solve="h"
                )
                # Usamos solo el primer elemento de la tupla (el valor de h)
                return h_value_tuple[0]
                
    raise ValueError(
        f"No se pudo encontrar una fórmula de coeficiente de convección adecuada para "
        f"flow_type='{flow_type}', orientation='{orientation}' con los valores proporcionados: {known_values_for_h}. "
        f"Candidatos verificados: {', '.join(candidate_prefixes)}. "
        f"Por favor, verifica los valores de entrada y las restricciones definidas en EQUATIONS."
    )

# Diccionario de ecuaciones en formato Python/SymPy
EQUATIONS = {
    "optimo_economico_plano": "(e + k/h)**2 == (((Ti - Te) * k * w * beta * vida_util * eta) / C) * 10**-3",
    "optimo_economico_cilindro": "((e + r) * (h * (e + r) * log((e + r)/r) + k)**2) / (h * k * (h * (e + r) - k)) == (((Ti - Te) * beta * vida_util * w * eta) / C) * 10**-3",
    "optimo_economico_esfera": "((e + r) * (h * (e + r)**2 - h * r * (e + r) + k * r)**2) / ((e + r)**2 * h * k * (h * (e + r) - 2 * k)) == (((Ti - Te) * beta * w * vida_util * eta) / C) * 10**-3",
    "espesor_critico_plano": "e_c == k / h",
    "radio_critico_cilindro": "r_c == k / h",
    "radio_critico_esfera": "r_c == 2 * k / h",
    "conv_interior_vertical_laminar": {
        "latex": "h == 1.32 * ((Te - Ta) / H)**0.25",
        "restricciones": [
            "H**3 * (Te - Ta) <= 10",
            "Te - Ta <= 100",
            "H > 0"
        ]
    },
    "conv_interior_vertical_turbulento": {
        "latex": "h == 1.74 * (Te - Ta)**(1/3)",
        "restricciones": [
            "H**3 * (Te - Ta) >= 10",
            "Te - Ta <= 100",
            "H > 0"
        ]
    },
    "conv_interior_horizontal_laminar": {
        "latex": "h == 1.25 * ((Te - Ta) / H)**0.25",
        "restricciones": [
            "H**3 * (Te - Ta) <= 10",
            "Te - Ta <= 100",
            "H > 0"
        ]
    },
    "conv_interior_horizontal_turbulento": {
        "latex": "h == 1.21 * (Te - Ta)**(1/3)",
        "restricciones": [
            "H**3 * (Te - Ta) > 10",
            "Te - Ta <= 100",
            "H > 0"
        ]
    },
    "conv_exterior_vertical_laminar": {
        "latex": "h == 3.96 * (v / H)**0.5",
        "restricciones": [
            "v * H <= 8",
            "v > 0",
            "H > 0"
        ]
    },
    "conv_exterior_vertical_turbulento": {
        "latex": "h == 5.76 * (v**4 / H)**0.5",
        "restricciones": [
            "v * H > 8",
            "v > 0",
            "H > 0"
        ]
    },
    "conv_exterior_horizontal_laminar": {
        "latex": "h == (8.1 * 10**-3) / H + 3.14 * (v / H)**0.5",
        "restricciones": [
            "v * H <= 8.55",
            "v > 0",
            "H > 0"
        ]
    },
    "conv_exterior_horizontal_turbulento": {
        "latex": "h == 8.9 * v**0.9 / H**0.1",
        "restricciones": [
            "v * H > 8.55",
            "v > 0",
            "H > 0"
        ]
    }
}

# Leyenda de variables para ecuaciones
VARIABLES_LEYENDA = {
    "e": "Espesor del aislamiento en metros (m)",
    "k": "Coeficiente de conductividad térmica (W/m°C)",
    "w": "Costo del combustible ($/kW-h)",
    "beta": "Periodo de operación por año (h/años)",
    "vida_util": "Vida útil (años)",
    "C": "Parámetro de coste, asociado al precio del material ($/m3)",
    "h": "Coeficiente de convección (W/m2·K)",
    "Ti": "Temperatura interna, temperatura del fluido termico (°C)",
    "Te": "Temperatura externa o superficial (°C)",
    "Ta": "Temperatura ambiente (°C)",
    "eta": "Eficiencia de la máquina térmica",
    "r": "Radio interior o exterior de tubería (m)",
    "rc": "Radio crítico (m)",
    "H": "Altura de la pared o diámetro de la tubería (m)",
    "v": "Velocidad del viento (m/s)"
}

