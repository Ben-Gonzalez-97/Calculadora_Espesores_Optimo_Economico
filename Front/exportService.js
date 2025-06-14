/**
 * @file exportService.js
 * @summary Proporciona funciones para exportar datos de la gráfica en varios formatos.
 * @module exportService
 */

/**
 * Prepara los datos de la gráfica para la exportación, formateando los números a una precisión específica.
 * @param {{x: number[], y: (number | null)[], h_vals?: (number | null)[], rc_vals?: (number | null)[]}} graphData - Los datos crudos de la gráfica.
 *        Debe contener al menos `x` (array de números) e `y` (array de números o nulos).
 *        Opcionalmente puede contener `h_vals` y `rc_vals` (arrays de números o nulos).
 * @param {string} xAxisLabel - La etiqueta para la variable del eje X que se usará como cabecera.
 * @param {number} precisionEspesor - Precisión decimal para los valores de espesor óptimo.
 * @param {number} precisionH - Precisión decimal para los valores del coeficiente de convección.
 * @param {number} precisionRc - Precisión decimal para los valores de espesor crítico.
 * @returns {Array<object>} Un array de objetos, donde cada objeto representa una fila de datos con cabeceras descriptivas.
 *                          Retorna un array vacío si `graphData` es inválido o no contiene `x` o `y`.
 */
function prepareDataForExport(graphData, xAxisLabel, precisionEspesor, precisionH, precisionRc) {
    const dataToExport = [];
    if (!graphData || !graphData.x || !graphData.y) {
        return dataToExport;
    }

    for (let i = 0; i < graphData.x.length; i++) {
        const row = {};
        row[xAxisLabel || 'Variable X'] = graphData.x[i];
        row['Espesor Optimo (m)'] = graphData.y[i] !== null && typeof graphData.y[i] === 'number' ? graphData.y[i].toFixed(precisionEspesor) : null;

        if (graphData.h_vals) {
            row['Coef. Conveccion (W/m²°C)'] = graphData.h_vals[i] !== null && typeof graphData.h_vals[i] === 'number' ? graphData.h_vals[i].toFixed(precisionH) : null;
        }
        if (graphData.rc_vals) {
            row['Espesor Critico (m)'] = graphData.rc_vals[i] !== null && typeof graphData.rc_vals[i] === 'number' ? graphData.rc_vals[i].toFixed(precisionRc) : null;
        }
        dataToExport.push(row);
    }
    return dataToExport;
}

/**
 * Inicia la descarga de un archivo en el navegador del cliente.
 * @param {string} content - El contenido del archivo a descargar.
 * @param {string} fileName - El nombre sugerido para el archivo descargado.
 * @param {string} mimeType - El tipo MIME del contenido del archivo (ej. 'application/json', 'text/csv').
 */
function downloadFile(content, fileName, mimeType) {
    console.log("Intentando descargar:", fileName, "MIME:", mimeType);
    // console.log("Contenido:", content); // Descomentar para depuración detallada del contenido
    const a = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    console.log("Descarga iniciada para:", fileName);
}

/**
 * Exporta los datos de la gráfica como un archivo JSON.
 * Los datos se preparan y luego se descargan.
 * Muestra un mensaje modal si no hay datos para exportar.
 * @param {{x: number[], y: (number | null)[], h_vals?: (number | null)[], rc_vals?: (number | null)[]}} graphData - Los datos crudos de la gráfica.
 * @param {string} xAxisVariable - La clave de la variable del eje X (ej. 'Ta'), usada para generar el nombre del archivo.
 * @param {string} xAxisLabel - La etiqueta descriptiva para la variable del eje X, usada como cabecera en los datos.
 * @param {number} precisionEspesor - Precisión decimal para los valores de espesor óptimo.
 * @param {number} precisionH - Precisión decimal para los valores del coeficiente de convección.
 * @param {number} precisionRc - Precisión decimal para los valores de espesor crítico.
 */
function exportDataAsJson(graphData, xAxisVariable, xAxisLabel, precisionEspesor, precisionH, precisionRc) {
    const preparedData = prepareDataForExport(graphData, xAxisLabel, precisionEspesor, precisionH, precisionRc);
    if (preparedData.length === 0) {
        console.warn("No hay datos preparados para exportar a JSON.");
        showMessageModal("No hay datos para exportar.", "Advertencia");
        return;
    }
    const jsonString = JSON.stringify(preparedData, null, 2);
    const fileName = `datos_grafica_${xAxisVariable || 'export'}.json`;
    downloadFile(jsonString, fileName, 'application/json');
}

/**
 * Exporta los datos de la gráfica como un archivo CSV.
 * Los datos se preparan, se convierten a formato CSV y luego se descargan.
 * Muestra un mensaje modal si no hay datos para exportar.
 * @param {{x: number[], y: (number | null)[], h_vals?: (number | null)[], rc_vals?: (number | null)[]}} graphData - Los datos crudos de la gráfica.
 * @param {string} xAxisVariable - La clave de la variable del eje X (ej. 'Ta'), usada para generar el nombre del archivo.
 * @param {string} xAxisLabel - La etiqueta descriptiva para la variable del eje X, usada como cabecera en los datos.
 * @param {number} precisionEspesor - Precisión decimal para los valores de espesor óptimo.
 * @param {number} precisionH - Precisión decimal para los valores del coeficiente de convección.
 * @param {number} precisionRc - Precisión decimal para los valores de espesor crítico.
 */
function exportDataAsCsv(graphData, xAxisVariable, xAxisLabel, precisionEspesor, precisionH, precisionRc) {
    const preparedData = prepareDataForExport(graphData, xAxisLabel, precisionEspesor, precisionH, precisionRc);
    if (preparedData.length === 0) {
        console.warn("No hay datos preparados para exportar a CSV.");
        showMessageModal("No hay datos para exportar.", "Advertencia");
        return;
    }

    const headers = Object.keys(preparedData[0]);
    let csvString = headers.join(',') + '\r\n';

    preparedData.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                return '';
            }
            value = String(value);
            // Escapar comas y comillas dentro de los valores
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvString += values.join(',') + '\r\n';
    });

    const fileName = `datos_grafica_${xAxisVariable || 'export'}.csv`;
    downloadFile(csvString, fileName, 'text/csv;charset=utf-8;');
}
