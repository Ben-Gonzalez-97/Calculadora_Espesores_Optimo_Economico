// Este módulo maneja la lógica del botón "Calcular" y el cálculo óptimo.

// Asegúrate de que API_BASE esté disponible, por ejemplo, cargando apiService.js antes.

function initCalculationHandler() {
    const calcularBtn = document.getElementById('calcular-btn');
    const resultadoEspesor = document.getElementById('resultado_espesor');
    const resultadoRadioCritico = document.getElementById('resultado_radio_critico');
    const resultadoMensaje = document.getElementById('resultado'); // Referencia para el mensaje de cálculo puntual
    const resultadoH = document.getElementById('resultado_h'); 

    if (!calcularBtn || !resultadoEspesor || !resultadoRadioCritico || !resultadoMensaje || !resultadoH) {
        console.error("Alguno de los elementos de UI para el cálculo no fue encontrado.");
        return;
    }

    const originalButtonText = calcularBtn.textContent;

    // Función para manejar errores de validación, movida fuera del event listener
    function handleValidationError(message) {
        resultadoMensaje.textContent = message;
        resultadoMensaje.classList.remove('text-green-600'); // Asegurar que no haya clases de éxito
        resultadoMensaje.classList.add('text-red-600');
        calcularBtn.disabled = false;
        calcularBtn.textContent = originalButtonText;
        calcularBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700', 'bg-green-500', 'hover:bg-green-700');
        calcularBtn.classList.add('bg-red-500', 'hover:bg-red-700');
    }

    // Función para obtener los valores del formulario
    function getFormValues() {
        return {
            vida_util: Number(document.getElementById('inp_vida_util').value),
            w: Number(document.getElementById('inp_w').value),
            beta: Number(document.getElementById('inp_beta').value),
            C: Number(document.getElementById('inp_C').value),
            k: Number(document.getElementById('inp_k').value),
            Ta: Number(document.getElementById('inp_Ta').value),
            Te: Number(document.getElementById('inp_Te').value),
            Ti: Number(document.getElementById('inp_Ti').value),
            v: Number(document.getElementById('inp_v').value),
            h_input_str: document.getElementById('inp_h').value,
            eta: Number(document.getElementById('inp_eta').value) / 100, // Convertir a decimal
            diametro: Number(document.getElementById('inp_diametro').value),
            ambiente: document.getElementById('inp_ambiente').value,
            tipo_calculo: document.getElementById('inp_tipo_calculo').value,
            orientacion: document.getElementById('inp_orientacion').value
        };
    }

    calcularBtn.addEventListener('click', async () => {
        // Estado inicial del botón y mensajes
        calcularBtn.disabled = true;
        calcularBtn.textContent = 'Calculando...';
        calcularBtn.classList.remove('bg-green-500', 'bg-red-500', 'hover:bg-green-700', 'hover:bg-red-700');
        calcularBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-700');

        resultadoEspesor.value = '-';
        resultadoRadioCritico.value = '-';
        resultadoMensaje.textContent = '';
        resultadoMensaje.className = 'px-4 py-2 text-base font-semibold min-h-6'; // Resetear clases de mensaje
        if(resultadoH) resultadoH.value = '-';

        const formValues = getFormValues();
        const {
            vida_util, w, beta, C, k, Ta, Te, Ti, v, h_input_str, 
            eta, diametro, ambiente, tipo_calculo, orientacion
        } = formValues;

        // Definición de validaciones
        const validations = [
            { 
                condition: !tipo_calculo || !ambiente || !orientacion, 
                message: 'Completa todos los campos obligatorios (Tipo cálculo, Ambiente, Orientación).' 
            },
            { condition: vida_util < 1, message: 'La vida útil debe ser mayor o igual a uno.' },
            { condition: w <= 0, message: 'El precio del combustible debe ser mayor que cero.' },
            { condition: beta <= 0 || beta > 8760, message: 'El periodo de operación debe ser mayor que cero y menor o igual a 8760.' },
            { condition: C <= 0, message: 'El coste volumétrico del aislamiento debe ser mayor que cero.' },
            { condition: k <= 0, message: 'La conductividad térmica debe ser mayor que cero.' },
            { condition: Ta >= Te, message: 'La temperatura ambiente debe ser menor que la temperatura exterior o superficial.' },
            { condition: Ti <= Te, message: 'La temperatura interna máxima debe ser mayor que la temperatura exterior o superficial.' },
            { condition: v < 0, message: 'La velocidad del viento debe ser mayor o igual a cero.' },
            { condition: eta <= 0 || eta > 1, message: 'La eficiencia de la máquina debe ser mayor que 0% y menor o igual a 100%.' },
            { condition: diametro <= 0, message: 'El diámetro interior o altura de la pared debe ser mayor que cero.' },
            { 
                condition: h_input_str !== '' && Number(h_input_str) <= 0, 
                message: 'La convección (h), si se especifica, no puede ser menor o igual a cero.' 
            }
        ];

        // Iterar sobre las validaciones
        for (const validation of validations) {
            if (validation.condition) {
                handleValidationError(validation.message);
                return;
            }
        }

        const known_values = {
            vida_util, w, beta, C, k, Ta, Te, Ti, v, eta, diametro,
            h: h_input_str === '' ? null : Number(h_input_str), 
            flow_type: ambiente, 
            orientation: orientacion
        };

        try {
            const response = await fetch(`${API_BASE}solve_equation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equation_key: tipo_calculo,
                    known_values: known_values,
                    variable_to_solve: 'e', 
                    flow_type: ambiente,    
                    orientation: orientacion  
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor.' }));
                throw new Error(errorData.error || `Error ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                resultadoMensaje.textContent = `Error: ${data.error}`;
                resultadoMensaje.classList.add('text-red-600');
                calcularBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
                calcularBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            } else {
                resultadoEspesor.value = data.result !== null && data.result !== undefined ? Number(data.result).toFixed(4) : 'N/A';
                if (data.h) {
                   if(resultadoH) resultadoH.value = Number(data.h).toFixed(2);
                }
                if (data.iterations) {
                    resultadoMensaje.textContent = `Cálculo realizado. Iteraciones: ${data.iterations}`;
                } else {
                    resultadoMensaje.textContent = "Calculo realizado, (solución simbólica)";
                }
                resultadoMensaje.classList.remove('text-red-600');
                resultadoMensaje.classList.add('text-green-600');
                calcularBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
                calcularBtn.classList.add('bg-green-500', 'hover:bg-green-700');

                // Cálculo del Radio Crítico modificado según la solicitud
                const h_para_rc = data.h !== undefined && data.h !== null ? data.h : (known_values.h !== null ? known_values.h : 0);

                if (k > 0 && h_para_rc > 0) {
                    let rc_value;
                    if (tipo_calculo === 'optimo_economico_plano' || tipo_calculo === 'optimo_economico_cilindro') {
                        rc_value = k / h_para_rc;
                        resultadoRadioCritico.value = rc_value.toFixed(4);
                    } else if (tipo_calculo === 'optimo_economico_esfera') {
                        rc_value = 2 * k / h_para_rc;
                        resultadoRadioCritico.value = rc_value.toFixed(4);
                    } else {
                        console.warn(`Tipo de cálculo no reconocido: ${tipo_calculo}`);
                        resultadoRadioCritico.value = 'N/A'; // Caso inesperado para tipo_calculo
                    }
                } else {
                    resultadoRadioCritico.value = 'Verificar k,h';
                }
            }

        } catch (error) {
            console.error('Error en cálculo:', error);
            resultadoMensaje.textContent = `Error en la solicitud: ${error.message}`;
            resultadoMensaje.classList.add('text-red-600');
            calcularBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            calcularBtn.classList.add('bg-red-500', 'hover:bg-red-700');
        } finally {
            calcularBtn.disabled = false;
            calcularBtn.textContent = originalButtonText; // Usar texto original
            // El color del botón (verde o rojo) se mantiene según el resultado (éxito/error).
            // No es necesario cambiar el color aquí si ya fue establecido correctamente.
        }
    });
}
