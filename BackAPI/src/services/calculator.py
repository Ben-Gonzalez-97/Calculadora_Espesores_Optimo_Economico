"""
Este módulo proporciona funcionalidades para resolver ecuaciones y calcular coeficientes de convección.

Funciones principales:
- solve_equation: Resuelve ecuaciones simbólicas o numéricamente.
- check_restrictions: Verifica si un conjunto de valores conocidos cumple con las restricciones de una ecuación.
- calculate_convection_coefficient: Calcula el coeficiente de convección 'h' basándose en el tipo de flujo,
  orientación y valores conocidos, seleccionando la fórmula apropiada de un catálogo.

También define:
- EQUATIONS: Un diccionario que cataloga las ecuaciones utilizadas en la aplicación,
  incluyendo su forma LaTeX y las restricciones aplicables.
- VARIABLES_LEYENDA: Un diccionario con la descripción de cada variable utilizada.
"""
import numpy as np
import sympy as sp
from sympy.logic.boolalg import Boolean
from sympy.core.relational import Equality
import re
import warnings # Importar warnings aquí


def solve_equation(equation_str: str, known_values: dict, variable_to_solve: str, maxiter=50, tol=1e-6):
    """
    Resuelve una ecuación dada en formato string Python/SymPy para la variable deseada.

    Intenta primero una solución simbólica. Si no es posible o la ecuación es marcada
    como compleja, recurre a un método numérico (Brentq) dentro de un intervalo
    determinado (especialmente para la variable 'e').

    Args:
        equation_str (str): Ecuación en formato string Python/SymPy (ej. 'x**2 + y == 1').
                            Debe contener '==' para ser interpretada como una igualdad.
        known_values (dict): Diccionario con los valores conocidos para las variables
                             de la ecuación, ej: {'y': 2}.
        variable_to_solve (str): Nombre de la variable que se desea despejar.
        maxiter (int, optional): Número máximo de iteraciones para el método numérico.
                                 Por defecto es 50.
        tol (float, optional): Tolerancia para la convergencia del método numérico.
                               Por defecto es 1e-6.

    Returns:
        tuple[float, int | bool]: Una tupla conteniendo:
            - El valor de la variable despejada (float).
            - El número de iteraciones si se usó el método numérico (int),
              o False si se encontró una solución simbólica (bool).

    Raises:
        ValueError: Si la ecuación no es una igualdad válida, si no se puede convertir
                    a simbólica, si la variable a resolver no está en la ecuación
                    después de sustituciones, o si el método numérico no converge
                    o no encuentra una raíz en el intervalo especificado.
    """
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
            # Asegura que Eq esté correctamente formateado para sympify
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
    if not isinstance(expr, (sp.Equality, Equality)): # Asegurar que es una igualdad
        raise ValueError("La ecuación proporcionada no es una igualdad simbólica válida después de sympify.")

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
        EQUATIONS.get(key) for key in ["optimo_economico_cilindro", "optimo_economico_esfera"]
        if EQUATIONS.get(key) # Asegurarse que la clave existe
    ]

    # Comprobar si la ecuación actual (su string) está en la lista de solo numérico
    # Esto requiere que equation_str sea la forma LaTeX o la forma almacenada en EQUATIONS
    # Si EQUATIONS almacena dicts, hay que acceder a eq_data['latex']
    
    # Para ser más robusto, compararemos la `equation_key` si estuviera disponible,
    # o asumiremos que `equation_str` es la forma LaTeX que se usa como identificador.
    # Dado que `equation_key` no se pasa a esta función, usaremos `equation_str`.
    # Es crucial que `equation_str` coincida con lo que se define en `EQUATIONS` para estas claves.
    
    # Simplificación: si `equation_str` es la representación directa de una ecuación compleja.
    # Esta lógica podría necesitar ajuste si `equation_str` no es directamente comparable.
    # Por ahora, se asume que `equation_str` puede ser una de las cadenas de `ecuaciones_solo_numerico`.
    
    # Mejor enfoque: Pasar `equation_key` a `solve_equation` o marcar las ecuaciones de otra forma.
    # Por ahora, mantenemos la lógica original pero con la advertencia de que `equation_str` debe ser comparable.

    if equation_str in ecuaciones_solo_numerico:
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
    if isinstance(subs_expr, (sp.Equality, Equality)): # Asegurar que es una igualdad
        f_expr = subs_expr.lhs - subs_expr.rhs
    else:
        # Si subs_expr no es una igualdad después de sustituciones, algo fue mal.
        # O la ecuación original no era una igualdad, o la sustitución la alteró.
        # Esto no debería ocurrir si la validación inicial de `expr` es correcta.
        raise ValueError("La expresión sustituida ya no es una igualdad. No se puede proceder a la solución numérica.")

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
    Evalúa una lista de restricciones (dadas como cadenas de texto) contra un conjunto de valores conocidos.

    Las restricciones se convierten a expresiones simbólicas de SymPy y luego se evalúan
    sustituyendo los valores conocidos.

    Args:
        restrictions (list[str]): Lista de restricciones en formato string,
                                  ej: ["v * H <= 8", "H > 0"].
        known_values (dict): Diccionario con los valores conocidos para las variables
                             presentes en las restricciones.

    Returns:
        bool: True si todas las restricciones evaluables se cumplen (o si no hay restricciones
              evaluables). False si al menos una restricción evaluable no se cumple.
              Las restricciones que no se pueden evaluar completamente (por falta de
              valores) se ignoran y no causan que la función retorne False.
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
    flow_type: str,
    orientation: str
) -> float:
    """
    Calcula el coeficiente de convección (h) seleccionando la fórmula correcta.

    Busca en el catálogo `EQUATIONS` una fórmula de convección que coincida con
    el `flow_type` (interior/exterior) y `orientation` (vertical/horizontal) dados.
    Verifica las restricciones asociadas a cada fórmula candidata utilizando
    `check_restrictions`. La primera fórmula cuyas restricciones se cumplan es utilizada
    para calcular 'h' mediante `solve_equation`.

    Args:
        known_values_for_h (dict): Diccionario con los valores conocidos necesarios
                                   para las ecuaciones de convección (ej. Te, Ta, H, v).
                                   No debe contener 'h'.
        flow_type (str): Tipo de flujo, debe ser "interior" o "exterior".
        orientation (str): Orientación de la superficie, debe ser "vertical" u "horizontal".

    Returns:
        float: El valor calculado del coeficiente de convección 'h'.

    Raises:
        ValueError: Si no se encuentra una fórmula adecuada que cumpla las restricciones
                    para la combinación de `flow_type`, `orientation` y `known_values_for_h`,
                    o si `solve_equation` falla al calcular 'h'.
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
    "optimo_economico_plano": "(e + k/h)**2 == (((Ti - Ta) * k * w * beta * vida_util * eta) / C) * 10**-3",
    "optimo_economico_cilindro": "((e + r) * (h * (e + r) * log((e + r)/r) + k)**2) / (h * k * (h * (e + r) - k)) == (((Ti - Ta) * beta * vida_util * w * eta) / C) * 10**-3",
    "optimo_economico_esfera": "((e + r) * (h * (e + r)**2 - h * r * (e + r) + k * r)**2) / ((e + r)**2 * h * k * (h * (e + r) - 2 * k)) == (((Ti - Ta) * beta * w * vida_util * eta) / C) * 10**-3",
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
    "k": "Coeficiente de conductividad térmica del material aislante (W/m°C)", # Aclaración
    "w": "Costo de la energía o combustible ($/kWh)", # kWh es más común
    "beta": "Horas de operación por año (h/año)", # Singular
    "vida_util": "Vida útil de la instalación o del aislamiento (años)", # Aclaración
    "C": "Costo del material aislante instalado por unidad de volumen ($/m³)", # Aclaración y unidad
    "h": "Coeficiente de transferencia de calor por convección (W/m²K)", # Unidad K o °C es similar para deltas
    "Ti": "Temperatura del fluido caliente o superficie interna (°C)", # Aclaración
    "Te": "Temperatura de la superficie externa del aislamiento (°C)", # Aclaración
    "Ta": "Temperatura del ambiente circundante (°C)", # Aclaración
    "eta": "Eficiencia de la planta o del sistema de generación de calor (% o fracción)", # Aclaración
    "r": "Radio interior del aislamiento (para cilindros/esferas) (m)", # Aclaración
    "rc": "Radio crítico de aislamiento (m)",
    "H": "Dimensión característica (altura para placas, diámetro para cilindros/esferas) (m)", # Aclaración
    "v": "Velocidad del fluido (aire/viento) (m/s)"
}

