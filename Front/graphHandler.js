/**
 * @file Maneja la lógica de inicialización y actualización de la gráfica de espesor.
 * @summary Este módulo se encarga de la interacción del usuario con los controles de la gráfica,
 * la obtención de datos del backend y la representación visual usando Chart.js.
 */

/**
 * Instancia del gráfico Chart.js para mostrar el espesor.
 * @type {Chart | null}
 */
let chartEspesor = null;

/**
 * Rangos por defecto (mínimo, máximo, paso) para la graficación de diferentes variables.
 * Estos valores se usan para prellenar los campos de entrada del rango de la gráfica
 * cuando el usuario selecciona una variable en el desplegable.
 * @const
 * @type {Object<string, [number, number, number]>}
 */
const defaultGraphRanges = {
    'Ta': [10, 50, 1],    
    'Te': [10, 100, 5],   
    'Ti': [20, 300, 5],   
    'v': [0.1, 10, 0.2],  
    'k': [0.01, 0.2, 0.005], 
    'diametro': [0.01, 1, 0.02], 
    'C': [100, 10000, 200], 
    'w': [0.01, 0.2, 0.005],  
    'beta': [0, 8760, 24],   
    'vida_util': [1, 30, 1], 
    'eta': [10, 100, 5]     
};

/**
 * Inicializa los manejadores de eventos y la lógica para la sección de graficación.
 *
 * Configura los listeners para:
 * - El cambio en el selector de variable para la gráfica (actualiza los campos de rango).
 * - El clic en el botón "Graficar" (recopila datos, llama a la API y renderiza la gráfica).
 * @returns {void}
 */
function initGraphHandler() {
    const graficarBtn = document.getElementById('graficar-btn');
    const selectVariableGrafica = document.getElementById('select_variable_grafica');
    const canvasGrafica = document.getElementById('grafica_espesor');
    const resultadoGrafica = document.getElementById('resultado_grafica'); 

    const inpGraficaMin = document.getElementById('inp_grafica_min');
    const inpGraficaMax = document.getElementById('inp_grafica_max');
    const inpGraficaPaso = document.getElementById('inp_grafica_paso');

    if (!graficarBtn || !selectVariableGrafica || !canvasGrafica || !resultadoGrafica || !inpGraficaMin || !inpGraficaMax || !inpGraficaPaso) {
        console.error("Elementos del DOM para la gráfica no encontrados. La funcionalidad de graficación no estará disponible.");
        return;
    }

    const originalGraphButtonText = graficarBtn.textContent; // Guardar texto original

    selectVariableGrafica.addEventListener('change', (event) => {
        const selectedVar = event.target.value;
        if (defaultGraphRanges[selectedVar]) {
            const [min, max, step] = defaultGraphRanges[selectedVar];
            inpGraficaMin.value = min;
            inpGraficaMax.value = max;
            inpGraficaPaso.value = step;
        } else {
            inpGraficaMin.value = '';
            inpGraficaMax.value = '';
            inpGraficaPaso.value = '';
        }
    });
    
    // Disparar el evento change al inicio si ya hay una variable seleccionada
    if (selectVariableGrafica.value) {
        selectVariableGrafica.dispatchEvent(new Event('change'));
    }


    graficarBtn.addEventListener('click', async () => {
        // Estado inicial del botón y mensajes
        graficarBtn.disabled = true;
        graficarBtn.textContent = 'Graficando...';
        graficarBtn.classList.remove('bg-green-500', 'bg-red-500', 'hover:bg-green-700', 'hover:bg-red-700');
        graficarBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-700');
        resultadoGrafica.textContent = ''; 
        resultadoGrafica.className = 'px-4 py-2 text-base font-semibold min-h-6'; // Resetear clases de mensaje

        const variableSeleccionada = selectVariableGrafica.value;
        if (!variableSeleccionada) {
            resultadoGrafica.textContent = 'Por favor, selecciona una variable para graficar.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            return;
        }

        // Recopilación de valores de entrada
        const vida_util = Number(document.getElementById('inp_vida_util').value);
        const w_val = Number(document.getElementById('inp_w').value); 
        const beta = Number(document.getElementById('inp_beta').value);
        const C = Number(document.getElementById('inp_C').value);
        const k = Number(document.getElementById('inp_k').value);
        const Ta = Number(document.getElementById('inp_Ta').value);
        const Te = Number(document.getElementById('inp_Te').value);
        const Ti = Number(document.getElementById('inp_Ti').value);
        const v = Number(document.getElementById('inp_v').value);
        const h_input_str = document.getElementById('inp_h').value;
        const eta = Number(document.getElementById('inp_eta').value) / 100; // Convertir a decimal, igual que en calculationHandler
        const diametro = Number(document.getElementById('inp_diametro').value);
        
        const ambiente = document.getElementById('inp_ambiente').value;
        const tipo_calculo = document.getElementById('inp_tipo_calculo').value;
        const orientacion = document.getElementById('inp_orientacion').value;

        if (!tipo_calculo || !ambiente || !orientacion) {
            resultadoGrafica.textContent = 'Completa los campos obligatorios (Tipo cálculo, Ambiente, Orientación) antes de graficar.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            return;
        }

        const known_values = {
            vida_util,
            w: w_val,
            beta,
            C,
            k,
            Ta,
            Te,
            Ti,
            v,
            eta, // eta ya está dividido por 100
            diametro,
            H: diametro, // AÑADIDO: Para coincidir con baseValues de app.js para graficación
            flow_type: ambiente, // AÑADIDO: Para coincidir con baseValues de app.js
            orientation: orientacion // AÑADIDO: Para coincidir con baseValues de app.js
        };
        
        // Manejar 'h' por separado: solo añadir si es válido y positivo, de lo contrario omitir
        const h_numeric = parseFloat(h_input_str);
        if (h_input_str !== '' && !isNaN(h_numeric) && h_numeric > 0) {
            known_values.h = h_numeric;
        }
        // Si h_input_str está vacío o no es válido, 'h' se omitirá de known_values,
        // permitiendo que el backend lo calcule.

        const min_val = parseFloat(inpGraficaMin.value);
        const max_val = parseFloat(inpGraficaMax.value);
        const step_val = parseFloat(inpGraficaPaso.value);

        // Validaciones de rango
        if (isNaN(min_val) || isNaN(max_val) || isNaN(step_val) || step_val <= 0 || min_val <= 0) {
            resultadoGrafica.textContent = 'Los valores de rango (Mín, Máx, Paso) deben ser números válidos. El Mín y el Paso deben ser mayores a cero.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            return;
        }
        if (min_val >= max_val) {
            resultadoGrafica.textContent = 'El valor Mín debe ser menor que el valor Máx para el rango.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            return;
        }
        if ((max_val - min_val) / step_val > 100) {
            resultadoGrafica.textContent = 'La combinación de Mín, Máx y Paso resulta en demasiadas iteraciones (máximo 100). Ajusta los valores.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}plot_espesor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equation_key: tipo_calculo,
                    variable: variableSeleccionada,
                    known_values: known_values,
                    min_val: min_val,
                    max_val: max_val,
                    step_val: step_val,
                    flow_type: ambiente,
                    orientation: orientacion
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor al graficar.' }));
                throw new Error(errorData.error || `Error ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                resultadoGrafica.textContent = `Error al obtener datos para gráfica: ${data.error}`;
                resultadoGrafica.classList.add('text-red-600');
                graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700', 'bg-green-500', 'hover:bg-green-700');
                graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            } else {
                if (chartEspesor) {
                    chartEspesor.destroy(); 
                }
                const datasets = [
                    {
                        label: `Espesor (m) vs ${leyendas[variableSeleccionada] || variableSeleccionada}`,
                        data: data.y.map((val, index) => ({ x: data.x[index], y: val })),
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Color de relleno para el área
                        fill: true, // Habilitar el relleno del área
                        tension: 0.1,
                        yAxisID: 'y',
                    }
                ];

                if (data.h_vals && data.h_vals.some(h => h !== null)) {
                    datasets.push({
                        label: `Coef. Convección (W/m²°C) vs ${leyendas[variableSeleccionada] || variableSeleccionada}`,
                        data: data.h_vals.map((val, index) => ({ x: data.x[index], y: val })),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)', // Color de relleno para el área
                        fill: true, // Habilitar el relleno del área
                        tension: 0.1,
                        yAxisID: 'y1', 
                    });
                }
                
                const yAxesConfig = {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Espesor (m)'
                        },
                        ticks: {
                            callback: function(value) {
                                return Number(value).toFixed(3); // Ajustar precisión si es necesario
                            }
                        }
                    }
                };

                if (datasets.length > 1) {
                    yAxesConfig.y1 = {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Coef. Convección (W/m²°C)'
                        },
                        grid: {
                            drawOnChartArea: false, 
                        },
                        ticks: {
                            callback: function(value) {
                                return Number(value).toFixed(2); // Ajustar precisión si es necesario
                            }
                        }
                    };
                }

                chartEspesor = new Chart(canvasGrafica, {
                    type: 'line',
                    data: { datasets: datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                type: 'linear', 
                                title: {
                                    display: true,
                                    // Usar leyenda para el título del eje X si está disponible
                                    text: leyendas[variableSeleccionada] || variableSeleccionada 
                                }
                            },
                           ...yAxesConfig 
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            title: {
                                display: true,
                                // Usar leyenda para el título del gráfico si está disponible
                                text: `Gráfica de Espesor vs ${leyendas[variableSeleccionada] || variableSeleccionada}` 
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            // Ajustar precisión según el eje
                                            const precision = context.dataset.yAxisID === 'y1' ? 2 : 3;
                                            label += Number(context.parsed.y).toFixed(precision);
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
                resultadoGrafica.textContent = 'Gráfica generada exitosamente.';
                resultadoGrafica.classList.remove('text-red-600');
                resultadoGrafica.classList.add('text-green-600');
                graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700', 'bg-red-500', 'hover:bg-red-700');
                graficarBtn.classList.add('bg-green-500', 'hover:bg-green-700');
            }

        } catch (error) {
            console.error('Error al graficar:', error);
            resultadoGrafica.textContent = `Error en la solicitud de gráfica: ${error.message}`;
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700', 'bg-green-500', 'hover:bg-green-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
        } finally {
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            // El color (verde/rojo) se mantiene si se estableció. 
            // Si no, se quitan los colores de estado para volver al default.
            if (!resultadoGrafica.classList.contains('text-green-600') && !resultadoGrafica.classList.contains('text-red-600')) {
                graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700', 'bg-green-500', 'hover:bg-green-700', 'bg-red-500', 'hover:bg-red-700');
            }
        }
    });
}
