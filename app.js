// Exportar historial a CSV
function exportarHistorialCSV() {
    let historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
    let waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
    let suplementosPorDia = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
    if (!historial.length) {
        alert('No hay historial para exportar.');
        return;
    }
    // Agrupar por fecha
    const dias = {};
    historial.forEach(item => {
        let fechaSolo = item.fecha.split(',')[0].split(' ')[0].trim();
        if (!dias[fechaSolo]) dias[fechaSolo] = [];
        dias[fechaSolo].push(item);
    });
    let csv = 'Fecha,Agua,Suplementos,Comida,Selección\n';
    Object.keys(dias).sort((a,b) => {
        // dd/mm/yyyy a Date
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(`${yb}-${mb}-${db}`) - new Date(`${ya}-${ma}-${da}`);
    }).forEach(fecha => {
        let agua = waterCounts[fecha] || 0;
        let suplementos = (suplementosPorDia[fecha] || []).join(' | ');
        dias[fecha].forEach(item => {
            let fechaCSV = '"' + fecha.replace(/"/g, '""') + '"';
            let aguaCSV = '"' + agua + '"';
            let suplementosCSV = '"' + suplementos.replace(/"/g, '""') + '"';
            let nombre = '"' + (item.nombre || '').replace(/"/g, '""') + '"';
            let seleccion = '"' + (item.seleccion || '').replace(/"/g, '""') + '"';
            csv += `${fechaCSV},${aguaCSV},${suplementosCSV},${nombre},${seleccion}\n`;
        });
    });
    // Descargar archivo con BOM UTF-8 para Excel
    let BOM = '\uFEFF';
    let blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'historial_comidas.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Importar historial desde CSV
function importarHistorialCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        // Eliminar BOM si existe
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) {
            alert('El archivo CSV está vacío o no tiene datos.');
            return;
        }
        // Detectar columnas
        const headers = lines[0].split(',');
        const idxFecha = headers.findIndex(h => h.toLowerCase().includes('fecha'));
        const idxAgua = headers.findIndex(h => h.toLowerCase().includes('agua'));
        const idxSuplementos = headers.findIndex(h => h.toLowerCase().includes('suplementos'));
        const idxComida = headers.findIndex(h => h.toLowerCase().includes('comida'));
        const idxSeleccion = headers.findIndex(h => h.toLowerCase().includes('selección'));
        if (idxFecha === -1 || idxComida === -1 || idxSeleccion === -1) {
            alert('El archivo CSV no tiene el formato esperado.');
            return;
        }
        // Agrupar por fecha para agua y suplementos
        let waterCounts = {};
        let suplementosPorDia = {};
        let historial = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            // Quitar comillas y espacios
            const fecha = (cols[idxFecha] || '').replace(/(^"|"$)/g, '').trim();
            const agua = (cols[idxAgua] || '').replace(/(^"|"$)/g, '').trim();
            const suplementos = (cols[idxSuplementos] || '').replace(/(^"|"$)/g, '').trim();
            const nombre = (cols[idxComida] || '').replace(/(^"|"$)/g, '').trim();
            const seleccion = (cols[idxSeleccion] || '').replace(/(^"|"$)/g, '').trim();
            // Guardar agua y suplementos por fecha
            if (fecha) {
                if (agua) waterCounts[fecha] = parseInt(agua) || 0;
                if (suplementos) suplementosPorDia[fecha] = suplementos.split(' | ').map(s => s.trim()).filter(s => s);
            }
            // Guardar historial de comidas
            if (fecha && nombre) {
                historial.push({ fecha, nombre, seleccion });
            }
        }
        localStorage.setItem('waterCounts', JSON.stringify(waterCounts));
        localStorage.setItem('suplementosPorDia', JSON.stringify(suplementosPorDia));
        localStorage.setItem('historialComidas', JSON.stringify(historial));
        cargarHistorial();
        alert('Historial importado correctamente.');
    };
    reader.readAsText(file, 'UTF-8');
}

window.addEventListener('DOMContentLoaded', function() {
    if (window.gapi) initGoogleAPI();
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) exportBtn.onclick = exportarHistorialCSV;
    const importInput = document.getElementById('import-csv');
    if (importInput) {
        importInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) importarHistorialCSV(file);
        };
    }
    const saveDriveBtn = document.getElementById('save-drive');
    if (saveDriveBtn) saveDriveBtn.onclick = guardarEnDrive;
    const restoreDriveBtn = document.getElementById('restore-drive');
    if (restoreDriveBtn) restoreDriveBtn.onclick = restaurarDesdeDrive;
});
// Opciones extraídas del plan
const opciones = {
    proteinas: [
        "Vaso de leche (250cc)", "Vaso de yogur (200cc)", "Porción de queso (70gr)", "Fetas de queso (4u)", "Queso untable (2 cdas)", "Huevo entero (3u)", "Claras", "Jamón cocido", "Lomito", "Pavita", "Queso PortSalut (80gr)", "Lomo/solomillo/peceto/bola de lomo/cuadril/nalga (200gr)", "Abadejo/atún/merluza/salmón/trucha (200gr)", "Pollo/pavo (200gr)", "Ricota (80gr)", "Levadura nutricional (1 cda)"
    ],
    hidratos: [
        "Pan lactal integral (4u)", "Pan de mesa (8u)", "Tostada de arroz (6u)", "Granola (140grs)", "Avena (140grs)", "BabyScuit (2u)", "Legumbres (200grs)", "Pastas (220grs cruda)", "Arroz (220grs cocido)", "Pastas rellenas (300gr)", "Papa (2u mediana)", "Lentejas/soja (200grs)", "Camote", "Choclo"
    ],
    frutas: [
        "Fruta", "Banana", "Manzana", "Naranja", "Pera", "Frutilla", "Mandarina", "Durazno", "Ciruela"
    ],
    colaciones: [
        "Fruta", "Gelatina", "Torta de avena", "Yogur pote x120grs", "Barras de cereal", "Muttant Mass"
    ]
};

const suplementos = [
    "Creatina", "Proteína", "Muttant Mass"
];

const comidas = [
    { nombre: "Desayuno", grupos: ["proteinas", "hidratos", "frutas"] },
    { nombre: "Almuerzo", grupos: ["proteinas", "hidratos", "frutas"] },
    { nombre: "Merienda", grupos: ["proteinas", "hidratos", "frutas"] },
    { nombre: "Cena", grupos: ["proteinas", "hidratos", "frutas"] },
    { nombre: "Colación", grupos: ["colaciones"] }
];

const comidasLista = document.getElementById('comidas-lista');
const historialLista = document.getElementById('historial-lista');
const suplementosDiaDiv = document.getElementById('suplementos-dia');

function crearSelector(grupo, idx) {
    const select = document.createElement('select');
    select.id = `select-${grupo}-${idx}`;
    opciones[grupo].forEach(opcion => {
        const opt = document.createElement('option');
        opt.value = opcion;
        opt.textContent = opcion;
        select.appendChild(opt);
    });
    return select;
}

function cargarSuplementosDia() {
    if (!suplementosDiaDiv) return;
    suplementosDiaDiv.innerHTML = '<strong>Suplementos de hoy:</strong>';
    let todayKey = new Date().toLocaleDateString('es-AR');
    let suplementosTomados = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}')[todayKey] || [];
    suplementos.forEach(sup => {
        const label = document.createElement('label');
        label.style.marginRight = '1em';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = sup;
        checkbox.checked = suplementosTomados.includes(sup);
        checkbox.onchange = function() {
            let suplementosPorDia = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
            let arr = suplementosPorDia[todayKey] || [];
            if (checkbox.checked) {
                if (!arr.includes(sup)) arr.push(sup);
            } else {
                arr = arr.filter(s => s !== sup);
            }
            suplementosPorDia[todayKey] = arr;
            localStorage.setItem('suplementosPorDia', JSON.stringify(suplementosPorDia));
            cargarHistorial();
        };
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + sup));
        suplementosDiaDiv.appendChild(label);
    });
}

function cargarComidas() {
    comidasLista.innerHTML = '';
    // Obtener historial y fecha actual para deshabilitar botón si ya está marcada
    let historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
    let todayKey = new Date().toLocaleDateString('es-AR');
    comidas.forEach((comida, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${comida.nombre}</strong>`;
        comida.grupos.forEach(grupo => {
            li.appendChild(document.createTextNode(` ${grupo.charAt(0).toUpperCase() + grupo.slice(1)}: `));
            li.appendChild(crearSelector(grupo, idx));
        });
        // Suplementos ya no se seleccionan por comida
        const btn = document.createElement('button');
        btn.textContent = 'Marcar';
        btn.onclick = () => marcarComida(idx);
        btn.id = `btn-${idx}`;
        // Verificar si ya está marcada para hoy
        let yaMarcada = historial.some(item => {
            let itemFecha = item.fecha.split(',')[0].split(' ')[0].trim();
            return itemFecha === todayKey && item.nombre === comida.nombre;
        });
        if (yaMarcada) {
            btn.disabled = true;
            btn.style.background = '#ccc';
            btn.style.color = '#666';
            btn.style.cursor = 'not-allowed';
        }
        li.appendChild(btn);
        comidasLista.appendChild(li);
    });
}

function marcarComida(idx) {
    // Usar la hora local de la computadora (ISO string para testeo)
    const fecha = new Date().toLocaleString();
    const comida = comidas[idx];
    let seleccion = comida.grupos.map(grupo => {
        const select = document.getElementById(`select-${grupo}-${idx}`);
        return `${grupo}: ${select ? select.value : ''}`;
    }).join(', ');
    // ...yaMarcada no es necesario, el botón ya está deshabilitado...
    document.getElementById(`btn-${idx}`).disabled = true;
    guardarHistorial(comida.nombre, seleccion, fecha);
    cargarHistorial(); // Actualiza el historial agrupado
}

function guardarHistorial(nombre, seleccion, fecha) {
    let historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
    historial.push({ nombre, seleccion, fecha });
    localStorage.setItem('historialComidas', JSON.stringify(historial));
}

function cargarHistorial() {
    let historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
    historialLista.innerHTML = '';
    // Agrupar por fecha (solo día, sin hora)
    const dias = {};
    historial.forEach(item => {
        // Extraer solo la fecha (formato dd/mm/yyyy)
        let fechaSolo = item.fecha.split(',')[0].split(' ')[0].trim();
        if (!dias[fechaSolo]) dias[fechaSolo] = [];
        dias[fechaSolo].push(item);
    });
    Object.keys(dias).sort((a,b) => {
        // dd/mm/yyyy a Date
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(`${yb}-${mb}-${db}`) - new Date(`${ya}-${ma}-${da}`);
    }).forEach(fecha => {
        // Crear encabezado de fecha colapsable y mostrar agua y suplementos
        const fechaHeader = document.createElement('li');
        let waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
        let waterCountDia = waterCounts[fecha] || 0;
        let suplementosPorDia = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
        let suplementosDia = suplementosPorDia[fecha] || [];
        let suplementosTxt = suplementosDia.length ? ` | Suplementos: ${suplementosDia.join(', ')}` : '';
        fechaHeader.textContent = `${fecha} ▼  |  Agua: ${waterCountDia}${suplementosTxt}`;
        fechaHeader.className = 'historial-fecha';
        fechaHeader.style.cursor = 'pointer';
        historialLista.appendChild(fechaHeader);
        // Crear contenedor para las comidas de ese día
        const comidasDia = document.createElement('ul');
        comidasDia.style.margin = '0 0 1em 0';
        comidasDia.style.padding = '0';
        comidasDia.style.listStyle = 'none';
        comidasDia.className = 'comidas-dia';
        dias[fecha].forEach((item, idxDia) => {
            const li = document.createElement('li');
            li.textContent = `${item.nombre} (${item.seleccion})`;
            // Botón editar
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar';
            editBtn.style.marginLeft = '1em';
            editBtn.onclick = function() {
                // Mostrar selectores para editar la comida
                li.innerHTML = `<strong>${item.nombre}</strong>`;
                // Buscar los grupos de la comida
                const comidaDef = comidas.find(c => c.nombre === item.nombre);
                let selects = [];
                comidaDef.grupos.forEach(grupo => {
                    li.appendChild(document.createTextNode(` ${grupo.charAt(0).toUpperCase() + grupo.slice(1)}: `));
                    const select = document.createElement('select');
                    opciones[grupo].forEach(opcion => {
                        const opt = document.createElement('option');
                        opt.value = opcion;
                        opt.textContent = opcion;
                        select.appendChild(opt);
                    });
                    // Preseleccionar valor actual
                    const actual = item.seleccion.match(new RegExp(`${grupo}: ([^,]+)`));
                    if (actual && actual[1]) select.value = actual[1].trim();
                    selects.push({grupo, select});
                    li.appendChild(select);
                });
                // Botón guardar
                const saveBtn = document.createElement('button');
                saveBtn.textContent = 'Guardar';
                saveBtn.style.marginLeft = '1em';
                saveBtn.onclick = function() {
                    // Actualizar selección en historial
                    let nuevaSeleccion = selects.map(s => `${s.grupo}: ${s.select.value}`).join(', ');
                    // Actualizar en localStorage
                    let historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
                    // Buscar el índice global del item
                    let idxGlobal = historial.findIndex(h => h.nombre === item.nombre && h.seleccion === item.seleccion && h.fecha === item.fecha);
                    if (idxGlobal !== -1) {
                        historial[idxGlobal].seleccion = nuevaSeleccion;
                        localStorage.setItem('historialComidas', JSON.stringify(historial));
                        cargarHistorial();
                    }
                };
                li.appendChild(saveBtn);
            };
            li.appendChild(editBtn);
            comidasDia.appendChild(li);
        });
        historialLista.appendChild(comidasDia);
        // Estado inicial: expandido
        let visible = true;
        fechaHeader.onclick = function() {
            visible = !visible;
            comidasDia.style.display = visible ? '' : 'none';
            fechaHeader.textContent = visible ? (`${fecha} ▼  |  Agua: ${waterCountDia}${suplementosTxt}`) : (`${fecha} ▶  |  Agua: ${waterCountDia}${suplementosTxt}`);
        };
    });
}

// --- Google Drive Sync ---
const CLIENT_ID = '929729927006-dgn6pkm846fjopcm0sqipu2hbasquj38.apps.googleusercontent.com'; // Reemplaza por tu Client ID
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
let GoogleAuth;

// Deshabilitar botones de Drive al inicio
function setDriveButtonsEnabled(enabled) {
    const saveDriveBtn = document.getElementById('save-drive');
    const restoreDriveBtn = document.getElementById('restore-drive');
    if (saveDriveBtn) saveDriveBtn.disabled = !enabled;
    if (restoreDriveBtn) restoreDriveBtn.disabled = !enabled;
}

function initGoogleAPI() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            clientId: CLIENT_ID,
            scope: SCOPES
        }).then(() => {
            GoogleAuth = gapi.auth2.getAuthInstance();
            setDriveButtonsEnabled(true);
            mostrarEstadoGoogle();
        });
    });
}

function signInGoogle(callback) {
    if (!GoogleAuth) return alert('Google API no cargada');
    if (GoogleAuth.isSignedIn.get()) {
        callback();
    } else {
        GoogleAuth.signIn().then(callback);
    }
}

function mostrarEstadoGoogle() {
    const saveDriveBtn = document.getElementById('save-drive');
    const restoreDriveBtn = document.getElementById('restore-drive');
    if (!GoogleAuth) return;
    if (GoogleAuth.isSignedIn.get()) {
        saveDriveBtn.textContent = '☁️ Guardar en Google Drive (Conectado)';
        saveDriveBtn.style.background = '#388e3c';
        if (restoreDriveBtn) restoreDriveBtn.style.background = '#388e3c';
    } else {
        saveDriveBtn.textContent = '☁️ Guardar en Google Drive (Iniciar sesión)';
        saveDriveBtn.style.background = '#4caf50';
        if (restoreDriveBtn) restoreDriveBtn.style.background = '#4caf50';
    }
}

function guardarEnDrive() {
    signInGoogle(() => {
        mostrarEstadoGoogle();
        let historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
        let waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
        let suplementosPorDia = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
        let data = {
            historial,
            waterCounts,
            suplementosPorDia
        };
        let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        let metadata = {
            name: 'historial_comidas.json',
            mimeType: 'application/json'
        };
        // Buscar si ya existe el archivo
        gapi.client.drive.files.list({
            q: "name='historial_comidas.json' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive'
        }).then(resp => {
            let files = resp.result.files;
            let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            let method = 'POST';
            if (files.length) {
                // Si existe, actualiza
                uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${files[0].id}?uploadType=multipart`;
                method = 'PATCH';
            }
            var form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);
            fetch(uploadUrl, {
                method,
                headers: new Headers({
                    'Authorization': 'Bearer ' + gapi.auth.getToken().access_token
                }),
                body: form
            }).then(r => r.json()).then(resp => {
                alert('Historial guardado en Google Drive');
            }).catch(() => alert('Error al guardar en Drive'));
        });
    });
}

function restaurarDesdeDrive() {
    signInGoogle(() => {
        // Buscar archivos creados por la app
        gapi.client.drive.files.list({
            q: "name='historial_comidas.json' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive'
        }).then(resp => {
            let files = resp.result.files;
            if (!files.length) return alert('No se encontró historial en Drive');
            let fileId = files[0].id;
            gapi.client.drive.files.get({
                fileId,
                alt: 'media'
            }).then(fileResp => {
                let data = JSON.parse(fileResp.body);
                localStorage.setItem('historialComidas', JSON.stringify(data.historial || []));
                localStorage.setItem('waterCounts', JSON.stringify(data.waterCounts || {}));
                localStorage.setItem('suplementosPorDia', JSON.stringify(data.suplementosPorDia || {}));
                cargarHistorial();
                alert('Historial restaurado desde Google Drive');
            });
        });
    });
}

window.onload = function() {
    cargarComidas();
    cargarHistorial();
    cargarSuplementosDia();
    // Water counter logic por día
    const waterCountSpan = document.getElementById('water-count');
    const addWaterBtn = document.getElementById('add-water');
    const resetWaterBtn = document.getElementById('reset-water');
    // Fecha actual (solo día)
    function getTodayKey() {
        return new Date().toLocaleDateString('es-AR');
    }
    function getWaterCount(fecha) {
        let waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
        return waterCounts[fecha] || 0;
    }
    function setWaterCount(fecha, count) {
        let waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
        waterCounts[fecha] = count;
        localStorage.setItem('waterCounts', JSON.stringify(waterCounts));
    }
    // Inicializar contador actual
    let todayKey = getTodayKey();
    let waterCount = getWaterCount(todayKey);
    if (waterCountSpan) waterCountSpan.textContent = waterCount;
    if (addWaterBtn) {
        addWaterBtn.onclick = function() {
            waterCount++;
            waterCountSpan.textContent = waterCount;
            setWaterCount(todayKey, waterCount);
            cargarHistorial();
        };
    }
    if (resetWaterBtn) {
        resetWaterBtn.onclick = function() {
            waterCount = 0;
            waterCountSpan.textContent = waterCount;
            setWaterCount(todayKey, waterCount);
            cargarHistorial();
        };
    }
    // Inicializar Google API correctamente
    function tryInitGoogleAPI() {
        if (window.gapi && window.gapi.load) {
            initGoogleAPI();
            // Los botones se habilitan en initGoogleAPI cuando GoogleAuth está listo
        } else {
            setTimeout(tryInitGoogleAPI, 500);
        }
    }
    setDriveButtonsEnabled(false); // Deshabilitar al inicio
    tryInitGoogleAPI();
    // Asignar handlers a los botones
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) exportBtn.onclick = exportarHistorialCSV;
    const importInput = document.getElementById('import-csv');
    if (importInput) {
        importInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) importarHistorialCSV(file);
        };
    }
    const saveDriveBtn = document.getElementById('save-drive');
    if (saveDriveBtn) saveDriveBtn.onclick = guardarEnDrive;
    const restoreDriveBtn = document.getElementById('restore-drive');
    if (restoreDriveBtn) restoreDriveBtn.onclick = restaurarDesdeDrive;
}
