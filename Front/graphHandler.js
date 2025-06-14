/**
 * @file Maneja la lógica de inicialización y actualización de la gráfica de espesor.
 * @summary Este módulo se encarga de la interacción del usuario con los controles de la gráfica,
 * la obtención de datos del backend y la representación visual usando Chart.js.
 */

// Constantes para configuración de la gráfica
const PRIMARY_DATASET_COLOR = 'rgb(75, 192, 192)';
const PRIMARY_DATASET_BG_COLOR = 'rgba(75, 192, 192, 0.2)';
const SECONDARY_DATASET_COLOR = 'rgb(255, 99, 132)';
const SECONDARY_DATASET_BG_COLOR = 'rgba(255, 99, 132, 0.2)';

const PRECISION_ESPESOR = 4; // Para el eje Y principal (espesor óptimo)
const PRECISION_H = 4;       // Para el coeficiente de convección
const PRECISION_RC = 4;      // Para el espesor crítico

/**
 * Instancia del gráfico Chart.js para mostrar el espesor.
 * @type {import('chart.js').Chart | null}
 */
let chartEspesor = null;
/**
 * Almacena los datos de la última gráfica generada, incluyendo x, y, h_vals y rc_vals.
 * @type {object | null}
 */
let currentGraphData = null;

/**
 * Calcula el valor mínimo y máximo de Y a través de múltiples datasets.
 * @param {Array<object>} datasets - Array de datasets de Chart.js (ej. [{ data: [{x,y},...] }, ...]).
 * @returns {{min: number, max: number} | null} Objeto con min y max, o null si no hay datos válidos.
 */
function getGlobalMinMaxY(datasets) {
    let minVal = Infinity;
    let maxVal = -Infinity;
    let hasData = false;

    datasets.forEach(dataset => {
        if (dataset && dataset.data && Array.isArray(dataset.data)) {
            dataset.data.forEach(point => {
                if (point && typeof point.y === 'number' && !isNaN(point.y)) {
                    minVal = Math.min(minVal, point.y);
                    maxVal = Math.max(maxVal, point.y);
                    hasData = true;
                }
            });
        }
    });

    return hasData ? { min: minVal, max: maxVal } : null;
}

/**
 * Rangos por defecto (mínimo, máximo, paso) para la graficación de diferentes variables.
 * Estos valores se usan para prellenar los campos de entrada del rango de la gráfica
 * cuando el usuario selecciona una variable en el desplegable.
 * @const
 * @type {Object<string, [number, number, number]>}
 */
const defaultGraphRanges = {
    'Ta': [10, 45, 1],    
    'Te': [10, 100, 5],   
    'Ti': [20, 300, 5],   
    'v': [0.1, 10, 0.2],  
    'k': [0.01, 0.2, 0.005], 
    'diametro': [0.01, 1, 0.02], 
    'C': [100, 10000, 200], 
    'w': [0.01, 0.2, 0.005],  
    'beta': [0, 8760, 96],   
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
    const graficaSecundariaControls = document.getElementById('grafica_secundaria_controls');
    const selectVisualizacionSecundaria = document.getElementById('select_visualizacion_secundaria');
    const exportGraphDataBtn = document.getElementById('export-graph-data-btn'); // Nuevo botón

    const inpGraficaMin = document.getElementById('inp_grafica_min');
    const inpGraficaMax = document.getElementById('inp_grafica_max');
    const inpGraficaPaso = document.getElementById('inp_grafica_paso');

    if (!graficarBtn || !selectVariableGrafica || !canvasGrafica || !resultadoGrafica || !inpGraficaMin || !inpGraficaMax || !inpGraficaPaso || !graficaSecundariaControls || !selectVisualizacionSecundaria || !exportGraphDataBtn) {
        console.error("Elementos del DOM para la gráfica, controles secundarios o botón de exportación no encontrados. La funcionalidad de graficación no estará disponible completamente.");
        return;
    }

    const originalGraphButtonText = graficarBtn.textContent; // Guardar texto original

    /**
     * Manejador para el evento 'change' del selector de variable de la gráfica.
     * Actualiza los campos de mínimo, máximo y paso según la variable seleccionada.
     * @param {Event} event - El objeto del evento 'change'.
     */
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

    /**
     * Manejador de eventos para el clic en el botón 'Graficar'.
     * Recopila los datos de entrada, realiza una solicitud a la API para obtener los datos de la gráfica
     * y luego renderiza la gráfica utilizando Chart.js.
     * @async
     */
    graficarBtn.addEventListener('click', async () => {
        // Estado inicial del botón y mensajes
        graficarBtn.disabled = true;
        graficarBtn.textContent = 'Graficando...';
        graficarBtn.classList.remove('bg-green-500', 'bg-red-500', 'hover:bg-green-700', 'hover:bg-red-700');
        graficarBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-700');
        resultadoGrafica.textContent = ''; 
        resultadoGrafica.className = 'px-4 py-2 text-base font-semibold min-h-6'; // Resetear clases de mensaje
        graficaSecundariaControls.classList.add('hidden'); // Ocultar al inicio de la graficación
        // exportGraphDataBtn está dentro de graficaSecundariaControls, por lo que se oculta también.
        currentGraphData = null; // Resetear datos de gráfica anterior

        const variableSeleccionada = selectVariableGrafica.value;
        if (!variableSeleccionada) {
            resultadoGrafica.textContent = 'Por favor, selecciona una variable para graficar.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            // graficaSecundariaControls ya está hidden
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
            // graficaSecundariaControls ya está hidden
            return;
        }

        /**
         * Objeto que contiene los valores conocidos para el cálculo de la gráfica.
         * @type {object}
         */
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
        if (isNaN(min_val) || isNaN(max_val) || isNaN(step_val) || step_val <= 0 || min_val < 0 || max_val < 0) {
            resultadoGrafica.textContent = 'Los valores de rango (Mín, Máx, Paso) deben ser números válidos y mayor a cero.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            // graficaSecundariaControls ya está hidden
            return;
        }
        if (min_val >= max_val) {
            resultadoGrafica.textContent = 'El valor Mín debe ser menor que el valor Máx para el rango.';
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.disabled = false;
            graficarBtn.textContent = originalGraphButtonText;
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            // graficaSecundariaControls ya está hidden
            return;
        }

        try {
            /**
             * Respuesta de la API para la solicitud de datos de la gráfica.
             * @type {Response}
             */
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
                /**
                 * Datos del error en formato JSON si la respuesta no es OK.
                 * @type {{error: string}}
                 */
                const errorData = await response.json().catch(() => ({ error: 'Error desconocido del servidor al graficar.' }));
                throw new Error(errorData.error || `Error ${response.status}`);
            }
            /**
             * Datos de la gráfica obtenidos de la API.
             * @type {{x: number[], y: number[], h_vals?: number[], rc_vals?: number[], error?: string}}
             */
            const data = await response.json();
            currentGraphData = data; // Almacenar datos para uso posterior

            if (data.error) {
                resultadoGrafica.textContent = `Error al obtener datos para gráfica: ${data.error}`;
                resultadoGrafica.classList.add('text-red-600');
                graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700', 'bg-green-500', 'hover:bg-green-700');
                graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
                graficaSecundariaControls.classList.add('hidden'); // Asegurar que esté oculto en caso de error
            } else {
                if (chartEspesor) {
                    chartEspesor.destroy(); 
                }
                /**
                 * Conjuntos de datos para la gráfica Chart.js.
                 * @type {import('chart.js').ChartDataset<'line'>[]}
                 */
                const datasets = [
                    {
                        label: `Espesor (m) vs ${leyendas[variableSeleccionada] || variableSeleccionada}`,
                        data: data.y.map((val, index) => ({ x: data.x[index], y: val })),
                        borderColor: PRIMARY_DATASET_COLOR,
                        backgroundColor: PRIMARY_DATASET_BG_COLOR, 
                        fill: true, 
                        tension: 0.1,
                        yAxisID: 'y',
                    }
                ];
                
                /**
                 * Configuración para los ejes Y de la gráfica.
                 * @type {object}
                 */
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
                            /**
                             * Formatea los ticks del eje Y para mostrar un número fijo de decimales.
                             * @param {number} value - El valor del tick.
                             * @returns {string} El valor formateado.
                             */
                            callback: function(value) {
                                return Number(value).toFixed(PRECISION_ESPESOR); 
                            }
                        }
                    }
                };

                // Calcular espesor crítico si hay datos de h_vals
                if (data.h_vals && data.h_vals.some(h => h !== null)) {
                    const k_input_val = parseFloat(document.getElementById('inp_k').value);
                    data.rc_vals = data.h_vals.map((h_val, index) => {
                        if (h_val === null || h_val <= 0) return null;
                        
                        const current_k_val = (variableSeleccionada === 'k') ? data.x[index] : k_input_val;
                        if (isNaN(current_k_val) || current_k_val <= 0) return null;

                        switch (tipo_calculo) {
                            case 'optimo_economico_plano':
                            case 'optimo_economico_cilindro':
                                return current_k_val / h_val;
                            case 'optimo_economico_esfera':
                                return (2 * current_k_val) / h_val;
                            default:
                                return null;
                        }
                    });

                    // Añadir el segundo dataset según la selección actual del select secundario
                    const selectedSecondaryView = selectVisualizacionSecundaria.value;
                    let secondaryDataArray, secondaryLabelText, secondaryAxisLabelText, secondaryTickPrecision;

                    if (selectedSecondaryView === 'h_calculado') {
                        secondaryDataArray = data.h_vals;
                        secondaryLabelText = `Coef. Convección (W/m²°C) vs ${leyendas[variableSeleccionada] || variableSeleccionada}`;
                        secondaryAxisLabelText = 'Coef. Convección (W/m²°C)';
                        secondaryTickPrecision = PRECISION_H;
                    } else { // 'radio_critico'
                        secondaryDataArray = data.rc_vals;
                        secondaryLabelText = `Espesor Crítico (m) vs ${leyendas[variableSeleccionada] || variableSeleccionada}`;
                        secondaryAxisLabelText = 'Espesor Crítico (m)';
                        secondaryTickPrecision = PRECISION_RC; 
                    }
                    
                    if (secondaryDataArray && secondaryDataArray.some(val => val !== null)) {
                        datasets.push({
                            label: secondaryLabelText,
                            data: secondaryDataArray.map((val, index) => ({ x: data.x[index], y: val })),
                            borderColor: SECONDARY_DATASET_COLOR,
                            backgroundColor: SECONDARY_DATASET_BG_COLOR, 
                            fill: true, 
                            tension: 0.1,
                            yAxisID: 'y1',
                        });

                        yAxesConfig.y1 = {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: secondaryAxisLabelText
                            },
                            grid: {
                                drawOnChartArea: false, 
                            },
                            ticks: {
                                /**
                                 * Formatea los ticks del eje Y1 para mostrar un número fijo de decimales.
                                 * @param {number} value - El valor del tick.
                                 * @returns {string} El valor formateado.
                                 */
                                callback: function(value) {
                                    return Number(value).toFixed(secondaryTickPrecision);
                                }
                            }
                        };

                        // Sincronizar escalas si se muestra Espesor Crítico
                        if (selectedSecondaryView === 'radio_critico') {
                            const primaryDataForScale = datasets[0];
                            const secondaryDataForScale = datasets[1];
                            const globalRange = getGlobalMinMaxY([primaryDataForScale, secondaryDataForScale]);

                            if (globalRange) {
                                let dataMin = globalRange.min;
                                let dataMax = globalRange.max;
                                let padding;
                                if (dataMin === dataMax) {
                                    padding = Math.max(Math.abs(dataMin * 0.1), 0.1);
                                } else {
                                    padding = (dataMax - dataMin) * 0.05;
                                }
                                yAxesConfig.y.min = dataMin - padding;
                                yAxesConfig.y.max = dataMax + padding;
                                yAxesConfig.y1.min = dataMin - padding;
                                yAxesConfig.y1.max = dataMax + padding;
                            }
                        }
                    }
                    graficaSecundariaControls.classList.remove('hidden');
                    // exportGraphDataBtn está dentro de graficaSecundariaControls, por lo que se muestra también.
                } else {
                    graficaSecundariaControls.classList.add('hidden');
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
                                /**
                                 * Callbacks para personalizar el tooltip de la gráfica.
                                 * @type {object}
                                 */
                                callbacks: {
                                    /**
                                     * Formatea la etiqueta del tooltip.
                                     * @param {import('chart.js').TooltipItem<'line'>} context - Contexto del tooltip.
                                     * @returns {string} La etiqueta formateada.
                                     */
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            let precision = PRECISION_ESPESOR; 
                                            if (context.dataset.yAxisID === 'y1') {
                                                const currentSelectedSecondaryView = document.getElementById('select_visualizacion_secundaria').value;
                                                precision = (currentSelectedSecondaryView === 'radio_critico') ? PRECISION_RC : PRECISION_H;
                                            }
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
                // La visibilidad de graficaSecundariaControls ya se manejó arriba.
            }

        } catch (error) {
            console.error('Error al graficar:', error);
            resultadoGrafica.textContent = `Error en la solicitud de gráfica: ${error.message}`;
            resultadoGrafica.classList.add('text-red-600');
            graficarBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-700', 'bg-green-500', 'hover:bg-green-700');
            graficarBtn.classList.add('bg-red-500', 'hover:bg-red-700');
            graficaSecundariaControls.classList.add('hidden'); // Asegurar que esté oculto en caso de error
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

    selectVisualizacionSecundaria.addEventListener('change', (event) => {
        if (!chartEspesor || !currentGraphData || !currentGraphData.x) return;

        const selectedValue = event.target.value;
        const currentVariableSeleccionada = document.getElementById('select_variable_grafica').value;

        let newSecondaryData, newLabel, newAxisLabel, newPrecision;

        if (selectedValue === 'h_calculado' && currentGraphData.h_vals) {
            newSecondaryData = currentGraphData.h_vals;
            newLabel = `Coef. Convección (W/m²°C) vs ${leyendas[currentVariableSeleccionada] || currentVariableSeleccionada}`;
            newAxisLabel = 'Coef. Convección (W/m²°C)';
            newPrecision = PRECISION_H;
        } else if (selectedValue === 'radio_critico' && currentGraphData.rc_vals) {
            newSecondaryData = currentGraphData.rc_vals;
            newLabel = `Espesor Crítico (m) vs ${leyendas[currentVariableSeleccionada] || currentVariableSeleccionada}`;
            newAxisLabel = 'Espesor Crítico (m)';
            newPrecision = PRECISION_RC; 
        } else {
            // Si no hay datos válidos para la selección, o la selección es inesperada,
            // se intenta ocultar o vaciar el segundo dataset si existe.
            if (chartEspesor.data.datasets.length > 1) {
                chartEspesor.data.datasets[1].data = []; // Vaciar datos
                if (chartEspesor.options.scales.y1) {
                    chartEspesor.options.scales.y1.display = false; // Ocultar eje
                }
                chartEspesor.update();
            }
            return;
        }

        // Asegurar que el segundo dataset y su eje existan antes de actualizarlos
        if (chartEspesor.data.datasets.length < 2) { // Si no existe el segundo dataset, créalo
             if (newSecondaryData && newSecondaryData.some(val => val !== null)) {
                chartEspesor.data.datasets.push({
                    label: newLabel,
                    data: newSecondaryData.map((val, index) => ({ x: currentGraphData.x[index], y: val })),
                    borderColor: SECONDARY_DATASET_COLOR,
                    backgroundColor: SECONDARY_DATASET_BG_COLOR,
                    fill: true,
                    tension: 0.1,
                    yAxisID: 'y1',
                });
                // Asegurar que la configuración del eje y1 exista
                if (!chartEspesor.options.scales.y1) {
                    chartEspesor.options.scales.y1 = {};
                }
             } else { // No hay datos para mostrar, no hacer nada o limpiar si es necesario
                 chartEspesor.update();
                 return;
             }
        }
        
        // Actualizar el segundo dataset existente
        chartEspesor.data.datasets[1].data = newSecondaryData.map((val, index) => ({ x: currentGraphData.x[index], y: val }));
        chartEspesor.data.datasets[1].label = newLabel;

        // Actualizar o crear la configuración del eje y1
        chartEspesor.options.scales.y1 = {
            ...chartEspesor.options.scales.y1, // Mantener otras propiedades si existen
            type: 'linear',
            display: true, // Asegurar que esté visible
            position: 'right',
            title: { 
                ... (chartEspesor.options.scales.y1 && chartEspesor.options.scales.y1.title),
                display: true, 
                text: newAxisLabel 
            },
            grid: { 
                ...(chartEspesor.options.scales.y1 && chartEspesor.options.scales.y1.grid), // Mantener otras propiedades de la cuadrícula
                drawOnChartArea: false 
            },
            ticks: { 
                ...(chartEspesor.options.scales.y1 && chartEspesor.options.scales.y1.ticks),
                callback: function(value) { return Number(value).toFixed(newPrecision); } 
            }
        };

        // Sincronizar o desincronizar escalas
        if (selectedValue === 'radio_critico') {
            const primaryDataset = chartEspesor.data.datasets[0];
            const secondaryDataset = chartEspesor.data.datasets[1]; // Ya actualizado
            const globalRange = getGlobalMinMaxY([primaryDataset, secondaryDataset]);

            if (globalRange) {
                let dataMin = globalRange.min;
                let dataMax = globalRange.max;
                let padding;
                if (dataMin === dataMax) {
                    padding = Math.max(Math.abs(dataMin * 0.1), 0.1);
                } else {
                    padding = (dataMax - dataMin) * 0.05;
                }
                chartEspesor.options.scales.y.min = dataMin - padding;
                chartEspesor.options.scales.y.max = dataMax + padding;
                chartEspesor.options.scales.y1.min = dataMin - padding;
                chartEspesor.options.scales.y1.max = dataMax + padding;
            } else {
                chartEspesor.options.scales.y.min = undefined;
                chartEspesor.options.scales.y.max = undefined;
                chartEspesor.options.scales.y1.min = undefined;
                chartEspesor.options.scales.y1.max = undefined;
            }
        } else { // h_calculado u otro caso
            chartEspesor.options.scales.y.min = undefined;
            chartEspesor.options.scales.y.max = undefined;
            chartEspesor.options.scales.y1.min = undefined;
            chartEspesor.options.scales.y1.max = undefined;
        }
        
        chartEspesor.update();
    });

    exportGraphDataBtn.addEventListener('click', async () => {
        if (!currentGraphData || !currentGraphData.x || !currentGraphData.y) {
            showMessageModal("No hay datos de gráfica para exportar. Por favor, genera una gráfica primero.", "Error de Exportación");
            return;
        }

        try {
            const selectedFormat = await showExportModal();
            if (selectedFormat) {
                const variableSeleccionada = document.getElementById('select_variable_grafica').value;
                const variableLabel = leyendas[variableSeleccionada] || variableSeleccionada;

                // Asegurarse de que las constantes de precisión están definidas y son números
                const pEspesor = typeof PRECISION_ESPESOR === 'number' ? PRECISION_ESPESOR : 4;
                const pH = typeof PRECISION_H === 'number' ? PRECISION_H : 4;
                const pRc = typeof PRECISION_RC === 'number' ? PRECISION_RC : 4;

                if (selectedFormat === 'JSON') {
                    exportDataAsJson(currentGraphData, variableSeleccionada, variableLabel, pEspesor, pH, pRc);
                    // showMessageModal se llama ahora desde exportService si no hay datos, 
                    // o se podría llamar aquí para éxito si se prefiere.
                    // Por ahora, la notificación de éxito se puede omitir si la descarga funciona.
                } else if (selectedFormat === 'CSV') {
                    exportDataAsCsv(currentGraphData, variableSeleccionada, variableLabel, pEspesor, pH, pRc);
                } else {
                    console.log(`Formato de exportación ${selectedFormat} no implementado.`);
                    showMessageModal(`Formato de exportación ${selectedFormat} aún no implementado.`, "Información");
                }
            } else {
                console.log("Exportación cancelada por el usuario.");
            }
        } catch (error) {
            console.error("Error durante el proceso de exportación:", error);
            showMessageModal("Ocurrió un error durante la exportación.", "Error de Exportación");
        }
    });
}
