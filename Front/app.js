// --- CONFIGURACIÓN DE ENDPOINT DE API SEGÚN ENTORNO ---
// Usa ruta relativa por defecto, pero permite sobreescribir con variable global
const API_BASE = window.API_BASE || '/';

// --- LIMPIEZA: Solo lógica para el botón Calcular y el cálculo óptimo ---
const calcularBtn = document.getElementById('calcular-btn');
const resultadoEspesor = document.getElementById('resultado_espesor');
const resultadoRadioCritico = document.getElementById('resultado_radio_critico');

// --- DECLARACIÓN DE VARIABLES PARA ELEMENTOS DEL MODAL (sin asignar aún) ---
let btnOpenCatalogModal, catalogModal, btnCloseCatalogModal;
let catalogNameInputModal, catalogSelectModal, btnLoadCatalogModal;
let btnSaveCatalogModal, btnDeleteCatalogModal, btnNewCatalogModal;

const CATALOG_STORAGE_KEY = 'parameter_catalogs';
// --- FIN DECLARACIÓN MODAL ---

calcularBtn.addEventListener('click', async () => {
  resultadoEspesor.value = '-';
  resultadoRadioCritico.value = '-';
  document.getElementById('resultado').textContent = '';
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
    document.getElementById('resultado').textContent = 'Completa todos los campos obligatorios.';
    return;
  }
  if (!diametro || diametro <= 0) {
    document.getElementById('resultado').textContent = 'El diámetro o altura de la pared debe ser mayor a cero.';
    return;
  }

  // Validaciones adicionales de restricciones
  if (vida_util < 1) {
    document.getElementById('resultado').textContent = 'La vida útil debe ser mayor o igual a 1.';
    return;
  }
  if (w <= 0) {
    document.getElementById('resultado').textContent = 'El precio del combustible debe ser mayor que 0.';
    return;
  }
  if (beta <= 0 || beta > 8760) {
    document.getElementById('resultado').textContent = 'El periodo de operación debe ser mayor que 0 y menor o igual a 8760.';
    return;
  }
  if (C <= 0) {
    document.getElementById('resultado').textContent = 'El coste volumétrico del aislamiento debe ser mayor que 0.';
    return;
  }
  if (k <= 0) {
    document.getElementById('resultado').textContent = 'La conductividad térmica debe ser mayor que 0.';
    return;
  }
  if (Ta >= Te) {
    document.getElementById('resultado').textContent = 'La temperatura ambiente debe ser menor que la temperatura exterior o superficial.';
    return;
  }
  if (Te <= Ta) {
    document.getElementById('resultado').textContent = 'La temperatura exterior o superficial debe ser mayor que la temperatura ambiente.';
    return;
  }
  if (Ti <= Te) {
    document.getElementById('resultado').textContent = 'La temperatura interna máxima debe ser mayor que la temperatura exterior o superficial.';
    return;
  }
  if (v < 0) {
    document.getElementById('resultado').textContent = 'La velocidad del viento debe ser mayor o igual a 0.';
    return;
  }
  if (eta <= 0 || eta > 100) {
    document.getElementById('resultado').textContent = 'La eficiencia de la máquina debe ser mayor que 0 y menor o igual a 1 (fracción, no porcentaje).';
    return;
  }
  if (diametro <= 0) {
    document.getElementById('resultado').textContent = 'El diámetro interior o altura de la pared debe ser mayor que 0.';
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
      document.getElementById('resultado').textContent = 'Cálculo exitoso.';
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
                console.log('[DEBUG] Cálculo crítico exitoso. Resultado:', dataRC.result);
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
      document.getElementById('resultado').textContent = data.error || 'Error al calcular.';
      calcularBtn.classList.add('error');
      calcularBtn.classList.remove('exito');
      document.getElementById('resultado_h').value = '-';
    }
  } catch (err) {
    resultadoEspesor.value = '-';
    document.getElementById('resultado').textContent = 'Error de conexión con el backend.';
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
let chartEspesor = null;

graficarBtn.addEventListener('click', async () => {
  const variable = selectVariableGrafica.value;
  const tipo_calculo = document.getElementById('inp_tipo_calculo').value;
  const ambiente = document.getElementById('inp_ambiente').value;
  const orientacion = document.getElementById('inp_orientacion').value;
  if (!variable) {
    alert('Selecciona una variable a graficar.');
    return;
  }
  if (!tipo_calculo || !ambiente || !orientacion) {
    alert('Completa todos los campos obligatorios antes de graficar.');
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
    eta: Number(document.getElementById('inp_eta').value),
    diametro: Number(document.getElementById('inp_diametro').value),
    H: Number(document.getElementById('inp_diametro').value),
    flow_type: ambiente,
    orientation: orientacion
  };
  graficarBtn.disabled = true;
  graficarBtn.textContent = 'Graficando...';
  try {
    const res = await fetch(`${API_BASE}plot_espesor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equation_key: tipo_calculo,
        variable,
        known_values: baseValues,
        flow_type: ambiente,
        orientation: orientacion
      })
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
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: true },
            title: { display: true, text: `Resultados vs ${label}` }, // Título más genérico
            tooltip: {
              callbacks: {
                label: function(context) {
                  let currentLabel = context.dataset.label || '';
                  if (currentLabel) {
                    currentLabel += ': ';
                  }
                  if (context.parsed.y !== null && context.parsed.y !== undefined) {
                    currentLabel += context.parsed.y.toFixed(3);
                  }
                  return currentLabel;
                }
              }
            }
          },
          scales: scalesOptions
        }
      });
    } else {
      alert('No se pudo calcular la gráfica.');
    }
  } catch (err) {
    alert('Error de conexión con el backend.');
  }
  graficarBtn.disabled = false;
  graficarBtn.textContent = 'Graficar';
});
// --- FIN GRAFICAR ---

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
  diametro: "Altura de la pared o diámetro de la tubería (m)",
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

  // --- INICIALIZACIÓN DE ELEMENTOS DEL MODAL Y LISTENERS (DENTRO DE WINDOW.ONLOAD) ---
  btnOpenCatalogModal = document.getElementById('btn_open_catalog_modal');
  catalogModal = document.getElementById('catalog_modal');
  btnCloseCatalogModal = document.getElementById('btn_close_catalog_modal');
  catalogNameInputModal = document.getElementById('catalog_name_input_modal');
  catalogSelectModal = document.getElementById('catalog_select_modal');
  btnLoadCatalogModal = document.getElementById('btn_load_catalog_modal');
  btnSaveCatalogModal = document.getElementById('btn_save_catalog_modal');
  btnDeleteCatalogModal = document.getElementById('btn_delete_catalog_modal');
  btnNewCatalogModal = document.getElementById('btn_new_catalog_modal');

  if (btnOpenCatalogModal) {
    btnOpenCatalogModal.addEventListener('click', () => {
      if (catalogModal) catalogModal.style.display = 'block';
      loadCatalogsToSelectModal();
    });
  }

  if (btnCloseCatalogModal) {
    btnCloseCatalogModal.addEventListener('click', () => {
      if (catalogModal) catalogModal.style.display = 'none';
    });
  }

  if (btnLoadCatalogModal) {
    btnLoadCatalogModal.addEventListener('click', () => {
      const selectedName = catalogSelectModal.value;
      if (selectedName) {
        const catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY)) || {};
        if (catalogs[selectedName]) {
          loadValuesToInputs({ ...catalogs[selectedName], catalog_name: selectedName });
          // catalogNameInputModal.value = selectedName; // Opcional: ya lo hace loadValuesToInputs
          if (catalogModal) catalogModal.style.display = 'none';
        } else {
          alert('El catálogo seleccionado ya no existe.');
          loadCatalogsToSelectModal(); // Recargar por si acaso
        }
      } else {
        alert('Por favor, selecciona un conjunto de parámetros para cargar.');
      }
    });
  }

  if (btnSaveCatalogModal) {
    btnSaveCatalogModal.addEventListener('click', () => {
      const name = catalogNameInputModal.value.trim();
      if (name) {
        const values = getCurrentInputValues();
        if (saveCatalogSafe(name, values)) {
          loadCatalogsToSelectModal(); // Actualizar el select
          alert(`Conjunto '${name}' guardado.`);
        }
      } else {
        alert('Por favor, ingresa un nombre para el conjunto de parámetros.');
      }
    });
  }

  if (btnDeleteCatalogModal) {
    btnDeleteCatalogModal.addEventListener('click', () => {
      const selectedName = catalogSelectModal.value;
      if (selectedName) {
        let catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY)) || {};
        if (catalogs[selectedName]) {
          delete catalogs[selectedName];
          localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(catalogs));
          loadCatalogsToSelectModal(); // Actualizar el select
          catalogNameInputModal.value = ''; // Limpiar input nombre
          alert(`Conjunto '${selectedName}' eliminado.`);
        } else {
          alert('El catálogo seleccionado ya no existe.');
          loadCatalogsToSelectModal(); // Recargar
        }
      } else {
        alert('Por favor, selecciona un conjunto de parámetros para eliminar.');
      }
    });
  }

  if (btnNewCatalogModal) {
    btnNewCatalogModal.addEventListener('click', () => {
      catalogNameInputModal.value = '';
      loadValuesToInputs(valoresBase); // Cargar valores base
      // Opcional: limpiar selección del dropdown
      // catalogSelectModal.value = "";
      alert('Formulario limpiado para un nuevo conjunto. Ingresa un nombre y guarda.');
    });
  }
  
  // Listener para cerrar modal si se hace clic fuera de ella
  window.addEventListener('click', (event) => {
    if (catalogModal && event.target == catalogModal) {
      catalogModal.style.display = 'none';
    }
  });
  // --- FIN INICIALIZACIÓN MODAL ---
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

  // Solo para la versión modal antigua, no ejecutar en la nueva interfaz visual
  if (typeof catalogNameInputModal !== 'undefined' && catalogNameInputModal && values.catalog_name) {
    catalogNameInputModal.value = values.catalog_name;
  } else if (typeof catalogSelectModal !== 'undefined' && catalogSelectModal && catalogSelectModal.value) {
    catalogNameInputModal.value = catalogSelectModal.options[catalogSelectModal.selectedIndex].text;
  }
}

function loadCatalogsToSelectModal() {
  const catalogs = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY)) || {};
  catalogSelectModal.innerHTML = '<option value="">-- Seleccionar para cargar o eliminar --</option>';
  for (const name in catalogs) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    catalogSelectModal.appendChild(option);
  }
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
