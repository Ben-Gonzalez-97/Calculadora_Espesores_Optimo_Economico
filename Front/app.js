// --- CONFIGURACIÓN DE ENDPOINT DE API SEGÚN ENTORNO ---
// Usa ruta relativa por defecto, pero permite sobreescribir con variable global
const API_BASE = window.API_BASE || '/';

// --- LIMPIEZA: Solo lógica para el botón Calcular y el cálculo óptimo ---
const calcularBtn = document.getElementById('calcular-btn');
const resultadoEspesor = document.getElementById('resultado_espesor');
const resultadoRadioCritico = document.getElementById('resultado_radio_critico');
const resultadoMensaje = document.getElementById('resultado'); // Referencia para el mensaje de cálculo puntual

const CATALOG_STORAGE_KEY = 'parameter_catalogs';
// --- FIN DECLARACIÓN MODAL ---

calcularBtn.addEventListener('click', async () => {
  resultadoEspesor.value = '-';
  resultadoRadioCritico.value = '-';
  resultadoMensaje.textContent = ''; // Limpiar mensaje anterior
  resultadoMensaje.className = 'px-4 py-2 text-base font-semibold min-h-6'; // Resetear clases
  document.getElementById('resultado_h').value = '-';

  // Obtener valores del formulario
  const vida_util = Number(document.getElementById('inp_vida_util').value);
  const w = Number(document.getElementById('inp_w').value);
  const beta = Number(document.getElementById('inp_beta').value);
  const C = Number(document.getElementById('inp_C').value);
  const k = Number(document.getElementById('inp_k').value);
  const Ta = Number(document.getElementById('inp_Ta').value);
  const Te = Number(document.getElementById('inp_Te').value);
  const Ti = Number(document.getElementById('inp_Ti').value);
  const v = Number(document.getElementById('inp_v').value);
  const h_input_str = document.getElementById('inp_h').value;
  const eta = Number(document.getElementById('inp_eta').value);
  const diametro = Number(document.getElementById('inp_diametro').value);
  const ambiente = document.getElementById('inp_ambiente').value;
  const tipo_calculo = document.getElementById('inp_tipo_calculo').value;
  const orientacion = document.getElementById('inp_orientacion').value;

  // Validaciones mínimas
  if (!tipo_calculo || !ambiente || !orientacion) {
    resultadoMensaje.textContent = 'Completa todos los campos obligatorios.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (!diametro || diametro <= 0) {
    resultadoMensaje.textContent = 'El diámetro o altura de la pared debe ser mayor a cero.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }

  // Validaciones adicionales de restricciones
  if (vida_util < 1) {
    resultadoMensaje.textContent = 'La vida útil debe ser mayor o igual a 1.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (w <= 0) {
    resultadoMensaje.textContent = 'El precio del combustible debe ser mayor que 0.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (beta <= 0 || beta > 8760) {
    resultadoMensaje.textContent = 'El periodo de operación debe ser mayor que 0 y menor o igual a 8760.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (C <= 0) {
    resultadoMensaje.textContent = 'El coste volumétrico del aislamiento debe ser mayor que 0.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (k <= 0) {
    resultadoMensaje.textContent = 'La conductividad térmica debe ser mayor que 0.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (Ta >= Te) {
    resultadoMensaje.textContent = 'La temperatura ambiente debe ser menor que la temperatura exterior o superficial.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (Te <= Ta) {
    resultadoMensaje.textContent = 'La temperatura exterior o superficial debe ser mayor que la temperatura ambiente.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (Ti <= Te) {
    resultadoMensaje.textContent = 'La temperatura interna máxima debe ser mayor que la temperatura exterior o superficial.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (v < 0) {
    resultadoMensaje.textContent = 'La velocidad del viento debe ser mayor o igual a 0.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (eta <= 0 || eta > 100) {
    // Se mantiene la validación original de eta, ya que el input espera porcentaje
    resultadoMensaje.textContent = 'La eficiencia de la máquina debe ser mayor que 0 y menor o igual a 100 (porcentaje).';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }
  if (diametro <= 0) {
    resultadoMensaje.textContent = 'El diámetro interior o altura de la pared debe ser mayor que 0.';
    resultadoMensaje.classList.add('text-red-600');
    return;
  }

  // Mapeo de variables para el backend
  const known_values = {
    vida_util,
    w,
    beta,
    C,
    k,
    Ta,
    Te,
    Ti,
    v,
    // h se añade condicionalmente más abajo
    eta: eta / 100,
    diametro,
    H: diametro,
    flow_type: ambiente,
    orientation: orientacion
  };

  // Usar h del input si es válido y positivo, sino, el backend lo calculará si es necesario
  if (h_input_str && !isNaN(parseFloat(h_input_str)) && parseFloat(h_input_str) > 0) {
    known_values.h = parseFloat(h_input_str);
  }

  // El nombre de la variable a despejar para óptimo económico siempre es 'e'
  const variableToSolve = 'e';

  calcularBtn.disabled = true;
  calcularBtn.textContent = 'Calculando...';
  calcularBtn.classList.remove('exito', 'error');

  try {
    const res = await fetch(`${API_BASE}solve_equation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equation_key: tipo_calculo,
        known_values,
        variable_to_solve: variableToSolve,
        flow_type: ambiente,
        orientation: orientacion
      })
    });
    const data = await res.json();
    if (res.ok) {
      resultadoEspesor.value = Number(data.result).toFixed(4);
      let mensajeResultado = 'Cálculo exitoso.';
      if (data.iterations !== undefined && data.iterations !== false) {
        mensajeResultado += ` (${data.iterations} iteraciones numéricas)`;
      } else if (data.iterations === false) {
        mensajeResultado += ` (solución simbólica)`;
      }
      resultadoMensaje.textContent = mensajeResultado;
      resultadoMensaje.classList.add('text-green-600'); // Color verde para éxito
      calcularBtn.classList.add('exito');
      calcularBtn.classList.remove('error');
      if (data.h !== undefined) {
        document.getElementById('resultado_h').value = Number(data.h).toFixed(2);
      } else {
        document.getElementById('resultado_h').value = '-';
      }
      // Calcular radio crítico si el cálculo es óptimo económico
      if (tipo_calculo.startsWith('optimo_economico')) {
        let radioCriticoKey = '';
        if (tipo_calculo === 'optimo_economico_cilindro') radioCriticoKey = 'radio_critico_cilindro';
        else if (tipo_calculo === 'optimo_economico_esfera') radioCriticoKey = 'radio_critico_esfera';
        else if (tipo_calculo === 'optimo_economico_plano') radioCriticoKey = 'espesor_critico_plano';
        else radioCriticoKey = null;

        console.log('[DEBUG] tipo_calculo:', tipo_calculo);
        console.log('[DEBUG] radioCriticoKey asignado:', radioCriticoKey);

        if (radioCriticoKey) {
          console.log('[DEBUG] Entrando al bloque if (radioCriticoKey)');
          try {
            const known_values_rc = { ...known_values };
            if (data.h !== undefined && typeof data.h === 'number' && !isNaN(data.h)) {
              known_values_rc.h = data.h;
              console.log('[DEBUG] data.h es válido y asignado a known_values_rc.h:', known_values_rc.h);
            } else {
              console.error("[DEBUG] data.h no es un número válido o está indefinido:", data.h);
              resultadoRadioCritico.value = 'Error: h no disp.';
              // Si h es crucial y falta, podríamos optar por no continuar
              // return; // Descomentar si se decide no intentar el fetch sin h
            }
            
            // Comprobación adicional antes del fetch
            if (typeof known_values_rc.h !== 'number' || isNaN(known_values_rc.h)) {
              console.error("[DEBUG] Abortando cálculo crítico: known_values_rc.h no es un número válido:", known_values_rc.h);
              resultadoRadioCritico.value = 'Error: h inválido';
            } else {
              const variableCritica = radioCriticoKey === 'espesor_critico_plano' ? 'e_c' : 'r_c';
              console.log(`[DEBUG] Intentando calcular ${radioCriticoKey} para variable ${variableCritica}. Valores conocidos (rc):`, JSON.stringify(known_values_rc));
              
              const resRC = await fetch(`${API_BASE}solve_equation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  equation_key: radioCriticoKey,
                  known_values: known_values_rc,
                  variable_to_solve: variableCritica,
                  flow_type: ambiente,
                  orientation: orientacion
                })
              });
              
              console.log('[DEBUG] Respuesta del fetch para cálculo crítico recibida.');
              const dataRC = await resRC.json();

              if (resRC.ok) {
                resultadoRadioCritico.value = Number(dataRC.result).toFixed(4);
                let mensajeCritico = 'Cálculo crítico exitoso.'; // Mensaje base
                if (dataRC.iterations !== undefined && dataRC.iterations !== false) {
                    mensajeCritico += ` (${dataRC.iterations} iteraciones numéricas)`;
                }
                console.log('[DEBUG] Cálculo crítico. Resultado:', dataRC.result, 'Iteraciones:', dataRC.iterations);
                // Podrías mostrar dataRC.iterations en algún lugar si es relevante para el usuario
              } else {
                resultadoRadioCritico.value = '-';
                console.error('[DEBUG] Error en cálculo crítico. Respuesta backend:', dataRC);
              }
            }
          } catch (err) {
            resultadoRadioCritico.value = '-';
            console.error('[DEBUG] Excepción en bloque try-catch de cálculo crítico:', err);
          }
        } else {
          console.log('[DEBUG] radioCriticoKey es null o vacío. No se calcula valor crítico.');
          resultadoRadioCritico.value = '-';
        }
      } else {
        console.log('[DEBUG] tipo_calculo no comienza con "optimo_economico". No se calcula valor crítico.');
        resultadoRadioCritico.value = '-';
      }
    } else {
      resultadoEspesor.value = '-';
      resultadoRadioCritico.value = '-';
      resultadoMensaje.textContent = data.error || 'Error al calcular.';
      resultadoMensaje.classList.add('text-red-600'); // Color rojo para error
      calcularBtn.classList.add('error');
      calcularBtn.classList.remove('exito');
      document.getElementById('resultado_h').value = '-';
    }
  } catch (err) {
    resultadoEspesor.value = '-';
    resultadoMensaje.textContent = 'Error de conexión con el backend.';
    resultadoMensaje.classList.add('text-red-600'); // Color rojo para error de conexión
    calcularBtn.classList.add('error');
    calcularBtn.classList.remove('exito');
    document.getElementById('resultado_h').value = '-';
  }
  calcularBtn.disabled = false;
  calcularBtn.textContent = 'Calcular';
});
// --- FIN LIMPIEZA ---

// --- GRAFICAR ESPESOR VS VARIABLE (NUEVO: solo pide datos al backend) ---
const graficarBtn = document.getElementById('graficar-btn');
const selectVariableGrafica = document.getElementById('select_variable_grafica');
const canvasGrafica = document.getElementById('grafica_espesor');
const resultadoGrafica = document.getElementById('resultado_grafica'); // Nueva referencia
let chartEspesor = null;

// Nuevos campos para rango de gráfica
const inpGraficaMin = document.getElementById('inp_grafica_min');
const inpGraficaMax = document.getElementById('inp_grafica_max');
const inpGraficaPaso = document.getElementById('inp_grafica_paso');

// Rangos por defecto para la gráfica en el frontend
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

selectVariableGrafica.addEventListener('change', (event) => {
    const selectedVariable = event.target.value;
    const ranges = defaultGraphRanges[selectedVariable];

    if (ranges) {
        inpGraficaMin.value = ranges[0];
        inpGraficaMax.value = ranges[1];
        inpGraficaPaso.value = ranges[2];
    } else {
        // Valores por defecto genéricos si la variable no tiene rangos predefinidos
        inpGraficaMin.value = ''; // O un valor como 0
        inpGraficaMax.value = ''; // O un valor como 10
        inpGraficaPaso.value = ''; // O un valor como 1
    }
});

graficarBtn.addEventListener('click', async () => {
  resultadoGrafica.textContent = ''; // Limpiar mensajes anteriores
  resultadoGrafica.className = 'px-4 py-2 text-base font-semibold min-h-6'; // Resetear clases

  const variable = selectVariableGrafica.value;
  const tipo_calculo = document.getElementById('inp_tipo_calculo').value;
  const ambiente = document.getElementById('inp_ambiente').value;
  const orientacion = document.getElementById('inp_orientacion').value;

  // Obtener valores de min, max, paso
  const grafica_min_str = inpGraficaMin.value;
  const grafica_max_str = inpGraficaMax.value;
  const grafica_paso_str = inpGraficaPaso.value;

  let grafica_min = grafica_min_str !== '' ? parseFloat(grafica_min_str) : undefined;
  let grafica_max = grafica_max_str !== '' ? parseFloat(grafica_max_str) : undefined;
  let grafica_paso = grafica_paso_str !== '' ? parseFloat(grafica_paso_str) : undefined;


  if (!variable) {
    resultadoGrafica.textContent = 'Selecciona una variable a graficar.';
    resultadoGrafica.classList.add('text-red-600');
    return;
  }
  if (!tipo_calculo || !ambiente || !orientacion) {
    resultadoGrafica.textContent = 'Completa todos los campos obligatorios antes de graficar.';
    resultadoGrafica.classList.add('text-red-600');
    return;
  }

  // Validaciones para min, max, paso
  if (grafica_min_str === '' || grafica_max_str === '' || grafica_paso_str === '') {
    resultadoGrafica.textContent = 'Los campos Mínimo, Máximo y Paso para la gráfica son obligatorios.';
    resultadoGrafica.classList.add('text-red-600');
    return;
  }

  if (isNaN(grafica_min) || isNaN(grafica_max) || isNaN(grafica_paso)) {
    resultadoGrafica.textContent = 'Mínimo, Máximo y Paso deben ser números válidos.';
    resultadoGrafica.classList.add('text-red-600');
    return;
  }

  if (grafica_max <= grafica_min) {
    resultadoGrafica.textContent = 'El valor Máximo debe ser mayor o igual que el valor Mínimo.';
    resultadoGrafica.classList.add('text-red-600');
    return;
  }

  if (grafica_paso <= 0) {
    resultadoGrafica.textContent = 'El valor del Paso debe ser mayor que cero.';
    resultadoGrafica.classList.add('text-red-600');
    return;
  }

  if (grafica_paso > (grafica_max - grafica_min)) {
    resultadoGrafica.textContent = 'El Paso debe ser menor o igual a (Máximo - Mínimo).';
    resultadoGrafica.classList.add('text-red-600');
    return;
  }

  // Tomar valores actuales del formulario
  const baseValues = {
    vida_util: Number(document.getElementById('inp_vida_util').value),
    w: Number(document.getElementById('inp_w').value),
    beta: Number(document.getElementById('inp_beta').value),
    C: Number(document.getElementById('inp_C').value),
    k: Number(document.getElementById('inp_k').value),
    Ta: Number(document.getElementById('inp_Ta').value),
    Te: Number(document.getElementById('inp_Te').value),
    Ti: Number(document.getElementById('inp_Ti').value),
    v: Number(document.getElementById('inp_v').value),
    eta: Number(document.getElementById('inp_eta').value) / 100, // CORREGIDO: Dividir por 100
    diametro: Number(document.getElementById('inp_diametro').value),
    H: Number(document.getElementById('inp_diametro').value),
    flow_type: ambiente,
    orientation: orientacion
  };
  // Validar y añadir min, max, paso si están definidos
  const plotParams = {
    equation_key: tipo_calculo,
    variable,
    known_values: baseValues,
    flow_type: ambiente,
    orientation: orientacion
  };

  if (grafica_min !== undefined && !isNaN(grafica_min)) {
    plotParams.min_val = grafica_min;
  }
  if (grafica_max !== undefined && !isNaN(grafica_max)) {
    plotParams.max_val = grafica_max;
  }
  if (grafica_paso !== undefined && !isNaN(grafica_paso) && grafica_paso > 0) {
    plotParams.step_val = grafica_paso;
  }


  graficarBtn.disabled = true;
  graficarBtn.textContent = 'Graficando...';
  graficarBtn.classList.remove('exito', 'error'); // Limpiar clases del botón

  try {
    const res = await fetch(`${API_BASE}plot_espesor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plotParams)
    });
    const data = await res.json();
    if(res.ok && data.x && data.y) {
      if(chartEspesor) chartEspesor.destroy();
      let label = variable;
      switch(variable) {
        case 'Ta': label='Temperatura ambiente (°C)'; break;
        case 'Tc': label='Temp. chaqueta (°C)'; break;
        case 'Ti': label='Temp. interna máx (°C)'; break;
        case 'v': label='Velocidad viento (m/s)'; break;
        case 'k': label='Conductividad térmica (W/m·K)'; break;
        case 'diametro': label='Diámetro/Altura (m)'; break;
        case 'C': label='Costo volumétrico ($/m³)'; break;
        case 'w': label='Precio combustible ($/kWh)'; break;
        case 'beta': label='Periodo operación (h/año)'; break;
        case 'vida_util': label='Vida útil (años)'; break;
        case 'eta': label='Eficiencia (%)'; break;
        default: label = leyendas[variable] || variable; // Usar leyenda si existe, sino la clave
      }

      const datasets = [{
        label: 'Espesor óptimo (m)',
        data: data.y,
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25,118,210,0.1)',
        pointRadius: 2,
        fill: true,
        spanGaps: true,
        yAxisID: 'y-espesor'
      }];

      const showHValues = data.h_vals && data.h_vals.some(h => h !== null && h !== undefined);

      if (showHValues) {
        datasets.push({
          label: 'Coef. Convección (W/m²K)',
          data: data.h_vals,
          borderColor: '#d32f2f',
          backgroundColor: 'rgba(211,47,47,0.1)',
          pointRadius: 2,
          fill: false,
          spanGaps: true,
          yAxisID: 'y-h'
        });
      }

      const scalesOptions = {
        x: { 
          title: { display: true, text: label },
          ticks: {
            callback: function(value, index, values) {
              // Asumiendo que data.x son números, los formatea.
              // Si data.x pueden ser strings, necesitaríamos una lógica más robusta aquí
              // o asegurar que data.x siempre contenga valores numéricos para el formateo.
              const numericValue = data.x[index]; // Acceder al valor original de data.x
              if (typeof numericValue === 'number') {
                return numericValue.toFixed(3);
              }
              return data.x[index]; // Devolver el valor original si no es número
            }
          }
        },
        'y-espesor': {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Espesor óptimo (m)'
          },
          ticks: {
            callback: function(value, index, values) {
              return Number(value).toFixed(3);
            }
          }
        }
      };

      if (showHValues) {
        scalesOptions['y-h'] = {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Coef. Convección (W/m²K)'
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function(value, index, values) {
              return Number(value).toFixed(3);
            }
          }
        };
      }

      chartEspesor = new Chart(canvasGrafica, {
        type: 'line',
        data: {
          labels: data.x,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: scalesOptions,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: `Espesor Óptimo vs ${label}`
            }
          }
        }
      });
      resultadoGrafica.textContent = 'Gráfico generado exitosamente.';
      resultadoGrafica.classList.add('text-green-600');
      graficarBtn.classList.add('exito');

    } else {
      if(chartEspesor) chartEspesor.destroy(); // Destruir gráfico anterior si existe
      canvasGrafica.getContext('2d').clearRect(0, 0, canvasGrafica.width, canvasGrafica.height); // Limpiar canvas
      resultadoGrafica.textContent = data.error || 'Error al generar el gráfico. No se recibieron datos válidos.';
      resultadoGrafica.classList.add('text-red-600');
      graficarBtn.classList.add('error');
    }
  } catch (err) {
    if(chartEspesor) chartEspesor.destroy();
    canvasGrafica.getContext('2d').clearRect(0, 0, canvasGrafica.width, canvasGrafica.height); // Limpiar canvas en caso de error de red
    resultadoGrafica.textContent = 'Error de conexión con el backend al generar el gráfico.';
    resultadoGrafica.classList.add('text-red-600');
    graficarBtn.classList.add('error');
    console.error('Error al graficar:', err);
  }
  graficarBtn.disabled = false;
  graficarBtn.textContent = 'Graficar';
});
// --- FIN GRAFICAR ---

// --- MODAL DE INFORMACIÓN ---
const infoModalBtn = document.getElementById('info-modal-btn');
const infoModal = document.getElementById('info-modal');
const closeInfoModalBtn = document.getElementById('close-info-modal-btn');

if (infoModalBtn && infoModal && closeInfoModalBtn) {
  infoModalBtn.addEventListener('click', () => {
    infoModal.classList.remove('hidden');
  });

  closeInfoModalBtn.addEventListener('click', () => {
    infoModal.classList.add('hidden');
  });

  // Cerrar modal si se hace clic fuera de él
  window.addEventListener('click', (event) => {
    if (event.target === infoModal) {
      infoModal.classList.add('hidden');
    }
  });
} else {
  console.error('No se encontraron los elementos del modal de información. Asegúrate de que los IDs son correctos en HTML y JS.');
}
// --- FIN MODAL DE INFORMACIÓN ---

// Código movido desde index.html y mejorado
const valoresBase = {
  vida_util: 15,
  w: 0.04,
  beta: 7968,
  C: 2205.48,
  k: 0.049,
  Ta: 28,
  Te: 50,
  Ti: 180,
  v: 2.1,
  eta: 85,
  h: '', 
  diametro: 0.1016,
  ambiente: '', // Estos se pueden preseleccionar si hay valores comunes
  tipo_calculo: '', // o dejar vacíos para que el usuario elija
  orientacion: ''
};

const leyendas = {
  vida_util: "Vida util (años)",
  w: "Costo del combustible ($/kW-h)",
  beta: "Periodo de operación por año (h/años)",
  C: "Parámetro de coste, asociado al precio del material ($/m3)",
  k: "Coeficiente de conductividad térmica (W/m°C)",
  Ta: "Temperatura ambiente (°C)",
  Te: "Temperatura externa o superficial (°C)",
  Ti: "Temperatura interna máxima (°C)",
  v: "Velocidad del viento (m/s)",
  eta: "Eficiencia de la máquina térmica (%)",
  diametro: "Diámetro de la tubería (m)",
  ambiente: "Tipo de ambiente: interior o exterior",
  tipo_calculo: "Tipo de cálculo: plano, cilindro o esfera",
  orientacion: "Orientación de la geometría: horizontal o vertical"
};

window.onload = function () {
  // Asignar valores base a los inputs
  for (const key in valoresBase) {
    const element = document.getElementById(`inp_${key}`);
    if (element) {
      element.value = valoresBase[key];
    }
  }
  // Disparar el evento 'change' para que se actualicen los cálculos y gráficos iniciales
  document.getElementById('inp_tipo_calculo').dispatchEvent(new Event('change'));
  document.getElementById('inp_ambiente').dispatchEvent(new Event('change'));
  document.getElementById('inp_orientacion').dispatchEvent(new Event('change'));

};

// --- FUNCIONES PARA GESTIÓN DE CATÁLOGO (adaptadas a MODAL) ---

function getCurrentInputValues() {
  const values = {};
  for (const key in valoresBase) {
    const element = document.getElementById(`inp_${key}`);
    if (element) {
      if (element.type === 'number') {
        values[key] = element.value === '' ? null : Number(element.value);
      } else {
        values[key] = element.value;
      }
    }
  }
  values['tipo_calculo'] = document.getElementById('inp_tipo_calculo').value;
  values['ambiente'] = document.getElementById('inp_ambiente').value;
  values['orientacion'] = document.getElementById('inp_orientacion').value;
  return values;
}

function loadValuesToInputs(values) {
  for (const key in valoresBase) {
    const element = document.getElementById(`inp_${key}`);
    if (element && values[key] !== undefined) {
      element.value = values[key];
    }
  }
  document.getElementById('inp_tipo_calculo').value = values['tipo_calculo'] || '';
  document.getElementById('inp_ambiente').value = values['ambiente'] || '';
  document.getElementById('inp_orientacion').value = values['orientacion'] || '';

  document.getElementById('inp_tipo_calculo').dispatchEvent(new Event('change'));
  document.getElementById('inp_ambiente').dispatchEvent(new Event('change'));
  document.getElementById('inp_orientacion').dispatchEvent(new Event('change'));

}

// --- FIN FUNCIONES GESTIÓN CATÁLOGO ---

// --- EVENTOS Y LISTENERS ---

// Código movido desde index.html y mejorado
window.addEventListener('load', () => {
    // Opcional: Cargar valores base al inicio
    // loadValuesToInputs(valoresBase);
});

// --- GESTIÓN DE PARÁMETROS GUARDADOS EN LISTA VISUAL ---
const parametrosGuardadosContainer = document.getElementById('parametrosGuardadosContainer');
const btnGuardarParametros = document.getElementById('btnGuardarParametros');

function renderListaParametros() {
  const catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY)) || {};
  const nombres = Object.keys(catalogs);
  parametrosGuardadosContainer.innerHTML = '';
  if (nombres.length === 0) {
    parametrosGuardadosContainer.innerHTML = `
      <div class="flex max-w-[480px] flex-col items-center gap-2">
        <p class="text-[#101518] text-lg font-bold leading-tight tracking-[-0.015em] max-w-[480px] text-center">No hay parámetros guardados</p>
        <p class="text-[#101518] text-sm font-normal leading-normal max-w-[480px] text-center">Guarda tus parámetros de cálculo para uso futuro.</p>
      </div>
      <button id="btnGuardarParametros" class="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#eaeef1] text-[#101518] text-sm font-bold leading-normal tracking-[0.015em] mt-4">
        <span class="truncate">Guardar Parámetros Actuales</span>
      </button>
    `;
    document.getElementById('btnGuardarParametros').onclick = guardarParametrosActuales;
    return;
  }
  // Lista de parámetros guardados
  const lista = document.createElement('div');
  lista.className = 'flex flex-col gap-3 w-full';
  nombres.forEach(nombre => {
    const item = document.createElement('div');
    item.className = 'flex flex-row items-center justify-between bg-gray-100 rounded-lg px-4 py-2';
    item.innerHTML = `
      <span class="font-semibold text-[#1976d2]">${nombre}</span>
      <div class="flex gap-2">
        <button class="cargar-parametro bg-[#b2d1e5] text-[#101518] rounded px-3 py-1 font-bold text-sm" data-nombre="${nombre}">Cargar</button>
        <button class="eliminar-parametro bg-[#e57373] text-white rounded px-3 py-1 font-bold text-sm" data-nombre="${nombre}">Eliminar</button>
      </div>
    `;
    lista.appendChild(item);
  });
  parametrosGuardadosContainer.appendChild(lista);
  // Botón para guardar
  const btnGuardar = document.createElement('button');
  btnGuardar.id = 'btnGuardarParametros';
  btnGuardar.className = 'flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#eaeef1] text-[#101518] text-sm font-bold leading-normal tracking-[0.015em] mt-4';
  btnGuardar.innerHTML = '<span class="truncate">Guardar Parámetros Actuales</span>';
  btnGuardar.onclick = guardarParametrosActuales;
  parametrosGuardadosContainer.appendChild(btnGuardar);
  // Listeners para cargar y eliminar
  parametrosGuardadosContainer.querySelectorAll('.cargar-parametro').forEach(btn => {
    btn.onclick = () => cargarParametros(btn.dataset.nombre);
  });
  parametrosGuardadosContainer.querySelectorAll('.eliminar-parametro').forEach(btn => {
    btn.onclick = () => eliminarParametros(btn.dataset.nombre);
  });
}

function guardarParametrosActuales() {
  const nombre = prompt('Nombre para el conjunto de parámetros:');
  if (!nombre) return;
  const values = getCurrentInputValues();
  if (saveCatalogSafe(nombre, values)) {
    renderListaParametros();
    alert(`Conjunto '${nombre}' guardado.`);
  }
}

function cargarParametros(nombre) {
  const catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY)) || {};
  if (catalogs[nombre]) {
    loadValuesToInputs({ ...catalogs[nombre], catalog_name: nombre });
    alert(`Conjunto '${nombre}' cargado.`);
  }
}

function eliminarParametros(nombre) {
  let catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY)) || {};
  if (catalogs[nombre]) {
    delete catalogs[nombre];
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalogs));
    renderListaParametros();
    alert(`Conjunto '${nombre}' eliminado.`);
  }
}

// Inicializar lista al cargar
window.addEventListener('DOMContentLoaded', renderListaParametros);

// --- SEGURIDAD: Limitar tamaño de catálogos en localStorage ---
function saveCatalogSafe(name, values) {
  let catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY)) || {};
  // Limitar a 30 catálogos para evitar abuso de almacenamiento
  if (Object.keys(catalogs).length >= 30 && !catalogs[name]) {
    alert('Límite de 30 catálogos alcanzado. Elimina alguno antes de guardar uno nuevo.');
    return false;
  }
  catalogs[name] = values;
  localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalogs));
  return true;
}
