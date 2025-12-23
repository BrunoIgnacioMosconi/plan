// Función para mostrar mensajes y permitir deshacer la última eliminación de alimento
// Pila para guardar eliminaciones múltiples
let gruposEliminadosStack = [];
let eliminadosStack = [];
function mostrarMensajeRestaurar(mensaje, grupoKey, valor, idx) {
  let msgContainer = document.getElementById('mensaje-container');
  if (!msgContainer) {
    msgContainer = document.createElement('div');
    msgContainer.id = 'mensaje-container';
    msgContainer.className = 'mensaje-container';
    document.body.appendChild(msgContainer);
  }

  // Guardar en la pila de eliminados
  eliminadosStack.push({ grupoKey, valor, idx });

  const msgElement = document.createElement('div');
  msgElement.className = 'mensaje info';
  msgElement.innerHTML = `<div class="mensaje-contenido"><span class="mensaje-icono">ℹ️</span> ${mensaje}</div>`;

  // Botón de cerrar con restaurar
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'mensaje-cerrar';
  closeBtn.onclick = () => {
    // Restaurar el alimento eliminado (último de la pila)
    const ultimo = eliminadosStack.pop();
    if (ultimo) {
      const current = getOpciones();
      if (!Array.isArray(current[ultimo.grupoKey])) current[ultimo.grupoKey] = [];
      current[ultimo.grupoKey].splice(ultimo.idx, 0, ultimo.valor);
      setOpciones(current);
      renderOpcionesForm();
      cargarComidas();
    }
    msgContainer.removeChild(msgElement);
  };
  msgElement.querySelector('.mensaje-contenido').appendChild(closeBtn);

  msgContainer.appendChild(msgElement);
  setTimeout(() => msgElement.classList.add('visible'), 10);
  setTimeout(() => {
    if (msgElement.parentNode) {
      msgElement.classList.remove('visible');
      setTimeout(() => {
        if (msgElement.parentNode) {
          msgElement.parentNode.removeChild(msgElement);
        }
      }, 300);
    }
  }, 6000);
}
// — Exportar historial a CSV —
function exportarHistorialCSV() {
   const historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
  const suplementosPorDia = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
  if (!historial.length) {
    console.warn('No hay historial de comidas, pero se exportarán suplementos, agua y opciones.');
  }
  const dias = {};
  historial.forEach(item => {
    const fechaSolo = item.fecha.split(',')[0].split(' ')[0].trim();
    if (!dias[fechaSolo]) dias[fechaSolo] = [];
    dias[fechaSolo].push(item);
  });
  let csv = 'Fecha,Agua,Suplementos,Comida,Selección\n';
  Object.keys(dias).sort((a, b) => {
    const [da, ma, ya] = a.split('/');
    const [db, mb, yb] = b.split('/');
    return new Date(`${yb}-${mb}-${da}`) - new Date(`${ya}-${ma}-${da}`);
  }).forEach(fecha => {
    const agua = waterCounts[fecha] || 0;
    const suplementos = (suplementosPorDia[fecha] || []).join(' | ');
    dias[fecha].forEach(item => {
      const fechaCSV = `"${fecha.replace(/"/g, '""')}"`;
      const aguaCSV = `"${agua}"`;
      const suplementosCSV = `"${suplementos.replace(/"/g, '""')}"`;
      const nombre = `"${(item.nombre || '').replace(/"/g, '""')}"`;
      const seleccion = `"${(item.seleccion || '').replace(/"/g, '""')}"`;
      csv += `${fechaCSV},${aguaCSV},${suplementosCSV},${nombre},${seleccion}\n`;
    });
  });

  // Agregar las opciones de dropdowns al final del CSV
  csv += '\nOpciones de Dropdowns\n';
  const opcionesDropdowns = JSON.parse(localStorage.getItem('opcionesDropdowns') || 'null') || opciones;
  // Exportar todos los grupos guardados (incluyendo renombrados)
  Object.keys(opcionesDropdowns).forEach(grupo => {
    const valores = opcionesDropdowns[grupo] || [];
    csv += `"${grupo}","${valores.join(' | ')}"\n`;
  });

  // Agregar la configuración de grupos por comida
  csv += '\nConfiguración de Comidas\n';
  const comidasEntrenamientoSaved = JSON.parse(localStorage.getItem('comidasEntrenamiento') || 'null') || comidasEntrenamiento;
  comidasEntrenamientoSaved.forEach(comida => {
    csv += `"${comida.nombre}","${comida.grupos.join(' | ')}"\n`;
  });

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'historial_comidas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// — Importar historial desde CSV —
function importarHistorialCSV(file) {

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result.replace(/^\u0000?(\uFEFF)?/, '');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      alert('El archivo CSV está vacío o no tiene datos.');
      return;
    }
    // Separar historial y opciones
    let opcionesStart = lines.findIndex(l => l.toLowerCase().includes('opciones de dropdowns'));
    let historialLines = opcionesStart > -1 ? lines.slice(0, opcionesStart) : lines;
    let opcionesLines = opcionesStart > -1 ? lines.slice(opcionesStart + 1) : [];

    // Buscar secciones de configuración de comidas
    let entrenamientoStart = lines.findIndex(l => l.toLowerCase().includes('configuración de comidas'));

    console.log('Líneas en CSV:', lines.length);
    console.log('Posición de sección entrenamiento:', entrenamientoStart);

    // Extraer líneas de cada sección correctamente
    let entrenamientoLines = [];

    if (entrenamientoStart > -1) {
      // Buscar el final de la sección de entrenamiento
      const finEntrenamiento = lines.findIndex((l, i) => i > entrenamientoStart && l.trim() === '');

      const endIdx = finEntrenamiento > -1 ? finEntrenamiento : lines.length;
      entrenamientoLines = lines.slice(entrenamientoStart + 1, endIdx).filter(l => l.trim() && l.includes(','));
      console.log('Líneas de entrenamiento encontradas:', entrenamientoLines.length);
    }

    // Procesar historial
    const headers = historialLines[0].split(',');
    const idxFecha = headers.findIndex(h => h.toLowerCase().includes('fecha'));
    const idxAgua = headers.findIndex(h => h.toLowerCase().includes('agua'));
    const idxSup = headers.findIndex(h => h.toLowerCase().includes('suplementos'));
    const idxComida = headers.findIndex(h => h.toLowerCase().includes('comida'));
    const idxSel = headers.findIndex(h => h.toLowerCase().includes('selección'));
    if (idxFecha < 0 || idxComida < 0 || idxSel < 0) {
      alert('CSV en formato inesperado.');
      return;
    }
    const waterCounts = {};
    const suplementosPorDia = {};
    const historial = [];
    for (let i = 1; i < historialLines.length; i++) {
      const cols = historialLines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      const fecha = (cols[idxFecha] || '').replace(/(^"|"$)/g, '').trim();
      const agua = (cols[idxAgua] || '').replace(/(^"|"$)/g, '').trim();
      const sup = (cols[idxSup] || '').replace(/(^"|"$)/g, '').trim();
      const nombre = (cols[idxComida] || '').replace(/(^"|"$)/g, '').trim();
      const seleccion = (cols[idxSel] || '').replace(/(^"|"$)/g, '').trim();
      if (fecha) {
        if (agua) waterCounts[fecha] = parseInt(agua, 10) || 0;
        if (sup) suplementosPorDia[fecha] = sup.split(' | ').map(s => s.trim());
      }
      if (fecha && nombre) {
        historial.push({ fecha, nombre, seleccion });
      }
    }
    localStorage.setItem('waterCounts', JSON.stringify(waterCounts));
    localStorage.setItem('suplementosPorDia', JSON.stringify(suplementosPorDia));
    localStorage.setItem('historialComidas', JSON.stringify(historial));

    // Procesar opciones de dropdowns
    if (opcionesLines.length) {
      const opcionesDropdowns = {};
      opcionesLines.forEach(line => {
        const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
        if (parts.length >= 2) {
          const grupo = (parts[0]||'').replace(/(^\"|\"$)/g, '').trim();
          const valores = (parts[1]||'').replace(/(^\"|\"$)/g, '').split(' | ').map(s=>s.trim()).filter(Boolean);
          if (grupo) opcionesDropdowns[grupo] = valores;
        }
      });
      localStorage.setItem('opcionesDropdowns', JSON.stringify(opcionesDropdowns));
      renderOpcionesForm();
      cargarComidas();
    }

    // Procesar configuración de comidas
    // Para días de entrenamiento
    if (entrenamientoLines.length) {
      console.log('Procesando líneas de entrenamiento:', entrenamientoLines);

      // Mapear las líneas a objetos de comida
      const nuevasComidasEntrenamiento = entrenamientoLines.map(line => {
        const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
        if (parts.length >= 2) {
          const nombre = (parts[0]||'').replace(/(^\"|\"$)/g, '').trim();
          const grupos = (parts[1]||'').replace(/(^\"|\"$)/g, '').split(' | ').map(s=>s.trim()).filter(Boolean);

          return { nombre, grupos };
        }
        return null;
      }).filter(Boolean); // Eliminar cualquier null

      if (nuevasComidasEntrenamiento.length) {
        console.log('Guardando nueva configuración de entrenamiento:', nuevasComidasEntrenamiento);
        localStorage.setItem('comidasEntrenamiento', JSON.stringify(nuevasComidasEntrenamiento));

        // Actualizar la referencia en memoria
        comidasEntrenamiento.length = 0; // Vaciar el array
        nuevasComidasEntrenamiento.forEach(c => comidasEntrenamiento.push(c));

        console.log('Configuración de entrenamiento actualizada en memoria:', comidasEntrenamiento);
      }
    }

    // Recargar todos los datos necesarios
    cargarComidas();
    cargarHistorial();

    // Forzar la actualización de la configuración de dropdowns por comida
    // independientemente de la pestaña actual
    renderOpcionesForm();

  };
  reader.readAsText(file, 'UTF-8');
}

// Función para cargar la configuración de comidas desde localStorage
function cargarConfiguracionComidas() {
  // Cargar configuración de comidas
  const entrenamientoSaved = JSON.parse(localStorage.getItem('comidasEntrenamiento')) || [];
  if (entrenamientoSaved.length > 0) {
    // Vaciar el array existente y llenarlo con nuevos valores
    comidasEntrenamiento.length = 0;
    entrenamientoSaved.forEach(item => comidasEntrenamiento.push(item));
  }

  console.log('Configuración de comidas cargada:', {
    comidas: comidasEntrenamiento.length
  });
}

// — Datos y lógica core de la app —

// Variable global para seguir la pestaña activa
let tabActual = 'principal';

// 🧠 Aquí están todas las opciones para los dropdowns agrupadas por tipo
const opciones = {
  // === PROTEÍNAS ===
  proteinas_desayuno_merienda: [
    "Queso (2u)",
    "Fetas de jamon (2u)",
    "Huevo entero (2u)",
    "Ricota (50g)",
  ],
  proteinas_almuerzo: [
    "Lomo (250g)",
    "Solomillo (250g)",
    "Peceto (250g)",
    "Bola de Lomo(250g)",
    "Cuadril (250g)",
    "Nalga(250g)",
    "Pollo (250g)",
    "Pavo (250g)"
  ],
  proteinas_cena: [
    "Solomillo (200g)",
    "Pollo (200g)",
    "Pavo (200g)",
    "Abadejo (200g)",
    "atún (200g)",
    "merluza (200g)",
    "salmón (200g)",
    "trucha (200g)",
  ],

  // === HIDRATOS ===
  hidratos_desayuno_merienda: [
    "Pan lactal integral (2u)",
    "Granola (50gr)",
    "Avena (50gr)",
  ],
  hidratos_almuerzo: [
    "Legumbre (180gr)",
    "Arroz (180gr cocido)",
  ],
  hidratos_cena: [
    "Papa (150gr)",
    "Camote (150gr)",
    "Legumbres (150gr)",
  ],

  // === LÁCTEOS ===
  lacteos_desayuno_merienda: [
    "Leche (150cc)",
    "Yogur (150cc)",
  ],

  // === FRUTAS ===
  frutas_desayuno_merienda: [
    "SI",
    "NO"
  ],

  // === GRASAS ===
  grasas_desayuno_merienda: [
    "F.secos 6u",
    "Aceitunas 4u",
    "½ palta"
  ],

  // === VEGETALES ===
  vegetales_cena: [
    "SI",
    "NO",
  ],

  // === COLACIONES ===
  colaciones: [
    "Torta de avena",
  ],

  // === SUPLEMENTOS ===
  suplementos: [
    "Creatina",
    "Proteína",
    "Muttant Mass",
  ],
};

// 🥗 Configuración de comidas para días de ENTRENAMIENTO
// Cada entrada representa una comida (ej: Desayuno) con los grupos de dropdowns que se van a mostrar
// Los grupos usan nombres específicos que coinciden con las keys en el objeto opciones
const comidasEntrenamiento = [
  {
    nombre: "Desayuno",
    grupos: [
      "proteinas_desayuno_merienda",
      "lacteos_desayuno_merienda",
      "hidratos_desayuno_merienda",
      "frutas_desayuno_merienda",
      "grasas_desayuno_merienda"
    ]
  },
  {
    nombre: "Almuerzo",
    grupos: ["proteinas_almuerzo", "hidratos_almuerzo"]
  },
  {
    nombre: "Merienda",
    grupos: [
      "proteinas_desayuno_merienda",
      "lacteos_desayuno_merienda",
      "hidratos_desayuno_merienda",
      "frutas_desayuno_merienda",
      "grasas_desayuno_merienda"
    ]
  },
  {
    nombre: "Cena",
    grupos: ["proteinas_cena", "hidratos_cena", "vegetales_cena"]
  },
  {
    nombre: "Colación",
    grupos: ["colaciones"]
  }
];



// 🔄 Recuperar opciones actuales desde localStorage (si existen)
function getOpciones() {
  const saved = JSON.parse(localStorage.getItem('opcionesDropdowns') || 'null');
  return saved || JSON.parse(JSON.stringify(opciones));
}

// 💾 Guardar opciones personalizadas al localStorage
function setOpciones(newOpc) {
  localStorage.setItem('opcionesDropdowns', JSON.stringify(newOpc));
}

// 🛠️ Crear un selector <select> para un grupo dado
// Ahora el grupo ya es la key completa (ej: proteinas_desayuno_merienda)
function crearSelector(grupo, idx, selected = null, grupoIdx = 0) {
  const select = document.createElement('select');
  select.id = `select-${grupo}-${idx}-${grupoIdx}`;

  // El grupo ya es la key completa, usarla directamente
  const key = grupo;

  const opcionesActuales = getOpciones()[key];
  if (Array.isArray(opcionesActuales)) {
    opcionesActuales.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      if (o === selected) opt.selected = true;
      select.appendChild(opt);
    });
  } else {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(Sin opciones)';
    select.appendChild(opt);
  }

  return select;
}

// 🗓️ Cargar suplementos marcados para el día de hoy
function cargarSuplementosDia() {
  const div = document.getElementById('suplementos-dia');
  div.className = 'suplemento-container';
  div.innerHTML = '<strong>💊 Suplementos de hoy:</strong>';
  const key = new Date().toLocaleDateString('es-AR');
  const tomados = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}')[key] || [];

  // Crear un contenedor con mejor diseño para los checkboxes
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'suplementos-checkboxes';
  checkboxContainer.style.display = 'flex';
  checkboxContainer.style.flexWrap = 'wrap';
  checkboxContainer.style.gap = '10px';
  checkboxContainer.style.marginTop = '10px';

  getOpciones().suplementos.forEach(sup => {
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.padding = '8px 12px';
    label.style.backgroundColor = tomados.includes(sup) ? '#4CAF5033' : '#f9f9f9';
    label.style.borderRadius = '5px';
    label.style.cursor = 'pointer';
    label.style.transition = 'background-color 0.3s';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = tomados.includes(sup);
    cb.style.marginRight = '8px';
    cb.onchange = () => {
      const m = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
      const arr = m[key] || [];
      if (cb.checked) {
        arr.push(sup);
        label.style.backgroundColor = '#4CAF5033';
      } else {
        const i = arr.indexOf(sup);
        if (i >= 0) arr.splice(i, 1);
        label.style.backgroundColor = '#f9f9f9';
      }
      m[key] = [...new Set(arr)];
      localStorage.setItem('suplementosPorDia', JSON.stringify(m));
      cargarHistorial();
    };

    label.appendChild(cb);
    label.append(' ' + sup);
    checkboxContainer.appendChild(label);
  });

  div.appendChild(checkboxContainer);
}

// 🧾 Cargar la lista de comidas del día actual (basado en tipo de día)
function cargarComidas() {
  const ul = document.getElementById('comidas-lista');
  ul.innerHTML = '';
  const hist = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const today = new Date().toLocaleDateString('es-AR');
  const comidas = comidasEntrenamiento;

  comidas.forEach((c, i) => {
    const li = document.createElement('li');

    // Agregar encabezado de la comida con estado
    const comidaHeader = document.createElement('div');
    comidaHeader.style.display = 'flex';
    comidaHeader.style.justifyContent = 'space-between';
    comidaHeader.style.alignItems = 'center';
    comidaHeader.style.marginBottom = '12px';

    const titulo = document.createElement('div');
    titulo.className = 'comida-titulo';
    titulo.textContent = c.nombre;

    const done = hist.some(x => {
      const d = x.fecha.split(',')[0].split(' ')[0].trim();
      return d === today && x.nombre === c.nombre;
    });

    // Obtener valores guardados si la comida está completada
    let valoresGuardados = {};
    if (done) {
      const entryHoy = hist.find(x => {
        const d = x.fecha.split(',')[0].split(' ')[0].trim();
        return d === today && x.nombre === c.nombre;
      });
      if (entryHoy && entryHoy.seleccion) {
        entryHoy.seleccion.split(', ').forEach(pair => {
          const [grupo, valor] = pair.split(': ');
          if (grupo && valor) valoresGuardados[grupo] = valor;
        });
      }
    }

    comidaHeader.appendChild(titulo);
    li.appendChild(comidaHeader);

    // Mostrar cada grupo de dropdowns
    // Contador para manejar grupos duplicados
    const contadorGrupos = {};
    c.grupos.forEach((g, gIdx) => {
      const grupoDiv = document.createElement('div');
      grupoDiv.className = 'grupo-dropdown';

      // Mostrar el nombre completo del grupo
      const labelGrupo = g.replace(/_/g, ' ').toUpperCase();
      const icono = getIconoGrupo(g);

      const label = document.createElement('label');
      label.innerHTML = `${icono} ${labelGrupo}`;

      // Obtener valor guardado para este grupo (considerando duplicados)
      let valorSeleccionado = null;
      if (done && valoresGuardados[g]) {
        valorSeleccionado = valoresGuardados[g];
      }

      const selector = crearSelector(g, i, valorSeleccionado, gIdx);
      if (done) {
        selector.disabled = true; // Desactiva si ya está marcada
        selector.style.opacity = '0.7';
      }

      grupoDiv.appendChild(label);
      grupoDiv.appendChild(selector);
      li.appendChild(grupoDiv);
    });

    // Botón para marcar comida como completada
    const btnContainer = document.createElement('div');
    btnContainer.style.marginTop = '15px';
    btnContainer.style.textAlign = 'right';

    const btn = document.createElement('button');
    if (done) {
      btn.textContent = '↩️ Desmarcar';
      btn.className = 'btn-secondary';
      btn.onclick = () => desmarcarComida(c.nombre);

      // Agregar badge de completado
      const badge = document.createElement('span');
      badge.textContent = '✓ Completada';
      badge.style.position = 'absolute';
      badge.style.top = '10px';
      badge.style.right = '10px';
      badge.style.backgroundColor = '#4CAF50';
      badge.style.color = 'white';
      badge.style.padding = '3px 8px';
      badge.style.borderRadius = '12px';
      badge.style.fontSize = '0.8rem';
      comidaHeader.appendChild(badge);
    } else {
      btn.textContent = 'Marcar como completada';
      btn.className = 'btn-completar';
      btn.onclick = () => marcarComida(i);
    }

    btnContainer.appendChild(btn);
    li.appendChild(btnContainer);

    // Si está completada, agregar clase para estilo visual
    if (done) {
      li.classList.add('comida-completada');
      li.style.borderLeft = '5px solid #4CAF50';
    } else {
      li.style.borderLeft = '5px solid #FFC107';
    }

    ul.appendChild(li);
  });
}

// ✅ Guardar selección de una comida en el historial
function marcarComida(i) {
  const fecha = new Date().toLocaleDateString('es-AR') + ', ' + new Date().toLocaleTimeString('es-AR');
  const c = comidasEntrenamiento[i];

  const sel = c.grupos.map((g, gIdx) => {
    const selectId = `select-${g}-${i}-${gIdx}`;
    const s = document.getElementById(selectId);
    if (!s) {
      console.error('No se encontró el selector:', selectId);
      return `${g}: ERROR`;
    }
    return `${g}: ${s.value}`;
  }).join(', ');

  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  // Guardar la comida
  h.push({ nombre: c.nombre, seleccion: sel, fecha });
  localStorage.setItem('historialComidas', JSON.stringify(h));
  cargarComidas();
  cargarHistorial();
  
  // Mostrar notificación de éxito
  mostrarNotificacion(`✅ ${c.nombre} completado`, 'success');
}

// 🔄 Desmarcar una comida del historial de hoy
function desmarcarComida(nombreComida) {
  const today = new Date().toLocaleDateString('es-AR');
  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  
  // Buscar y eliminar la entrada de hoy para esta comida
  const idx = h.findIndex(x => {
    const d = x.fecha.split(',')[0].split(' ')[0].trim();
    return d === today && x.nombre === nombreComida;
  });
  
  if (idx > -1) {
    h.splice(idx, 1);
    localStorage.setItem('historialComidas', JSON.stringify(h));
    cargarComidas();
    cargarHistorial();
    mostrarNotificacion(`↩️ ${nombreComida} desmarcado`, 'info');
  }
}

// 📢 Mostrar notificación temporal
function mostrarNotificacion(mensaje, tipo = 'info') {
  let msgContainer = document.getElementById('mensaje-container');
  if (!msgContainer) {
    msgContainer = document.createElement('div');
    msgContainer.id = 'mensaje-container';
    msgContainer.className = 'mensaje-container';
    document.body.appendChild(msgContainer);
  }

  const msgElement = document.createElement('div');
  msgElement.className = `mensaje ${tipo}`;
  msgElement.innerHTML = `<div class="mensaje-contenido">${mensaje}</div>`;

  msgContainer.appendChild(msgElement);
  setTimeout(() => msgElement.classList.add('visible'), 10);
  setTimeout(() => {
    if (msgElement.parentNode) {
      msgElement.classList.remove('visible');
      setTimeout(() => {
        if (msgElement.parentNode) {
          msgElement.parentNode.removeChild(msgElement);
        }
      }, 300);
    }
  }, 3000);
}

// 🖊️ Editar una entrada del historial directamente
function editarHistorial(idx, container) {
  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const entry = h[idx];
  
  // Extraer los grupos del historial guardado (no de la configuración actual)
  const gruposGuardados = [];
  const currentMap = {};
  entry.seleccion.split(', ').forEach(pair => {
    const [g, val] = pair.split(': ');
    if (g && val) {
      gruposGuardados.push(g);
      currentMap[g] = val;
    }
  });
  
  container.innerHTML = '';
  
  const form = document.createElement('div');
  form.className = 'historial-edit-form';
  
  // Título del formulario de edición
  const titulo = document.createElement('h4');
  titulo.textContent = `Editando: ${entry.nombre}`;
  form.appendChild(titulo);
  
  // Guardar referencias directas a los selectores para evitar problemas con IDs duplicados
  const selectoresEdit = [];
  
  // Usar los grupos que están guardados en el historial
  gruposGuardados.forEach((g, gIdx) => {
    const grupoDiv = document.createElement('div');
    grupoDiv.className = 'historial-edit-grupo';
    
    const lbl = document.createElement('label');
    const labelGrupo = g.replace(/_/g, ' ').toUpperCase();
    const icono = getIconoGrupo(g);
    lbl.innerHTML = `${icono} ${labelGrupo}`;
    
    // Crear selector manualmente para tener referencia directa
    const select = document.createElement('select');
    select.id = `edit-select-${g}-${idx}-${gIdx}`;
    
    const opcionesActuales = getOpciones()[g];
    if (Array.isArray(opcionesActuales)) {
      opcionesActuales.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = o;
        if (o === currentMap[g]) opt.selected = true;
        select.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(Sin opciones)';
      select.appendChild(opt);
    }
    
    // Guardar referencia al selector junto con el grupo
    selectoresEdit.push({ grupo: g, select: select });
    
    grupoDiv.appendChild(lbl);
    grupoDiv.appendChild(select);
    form.appendChild(grupoDiv);
  });

  // Contenedor de botones
  const btnContainer = document.createElement('div');
  btnContainer.className = 'historial-edit-buttons';
  
  const btnSave = document.createElement('button');
  btnSave.className = 'btn-guardar-edit';
  btnSave.innerHTML = '💾 Guardar';
  btnSave.onclick = () => {
    // Obtener el historial fresco al momento de guardar
    const historialActual = JSON.parse(localStorage.getItem('historialComidas') || '[]');
    const entryActual = historialActual[idx];
    
    // Usar las referencias directas a los selectores (no getElementById)
    const nuevaSeleccion = selectoresEdit.map(({ grupo, select }) => {
      return `${grupo}: ${select.value}`;
    }).join(', ');
    
    console.log('Selección ANTERIOR:', entryActual.seleccion);
    console.log('Selección NUEVA:', nuevaSeleccion);
    
    entryActual.seleccion = nuevaSeleccion;
    historialActual[idx] = entryActual;
    localStorage.setItem('historialComidas', JSON.stringify(historialActual));
    
    cargarHistorial();
    mostrarNotificacion('✅ Cambios guardados correctamente', 'success');
  };
  
  const btnCancel = document.createElement('button');
  btnCancel.className = 'btn-cancelar-edit';
  btnCancel.innerHTML = '✖ Cancelar';
  btnCancel.onclick = cargarHistorial;
  
  btnContainer.appendChild(btnSave);
  btnContainer.appendChild(btnCancel);
  form.appendChild(btnContainer);
  container.appendChild(form);
}

// 📜 Cargar historial completo de comidas
function cargarHistorial() {
  const ul = document.getElementById('historial-lista');
  ul.innerHTML = '';
  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const dias = {};

  // Agrupar por fecha
  h.forEach((item, idx) => {
    const d = item.fecha.split(',')[0].split(' ')[0].trim();
    if (!dias[d]) dias[d] = [];
    dias[d].push({ item, idx });
  });

  // Ordenar fechas de más reciente a más antigua
  Object.keys(dias).sort((a, b) => {
    // Convertir dd/mm/yyyy a objetos Date para comparar
    const [dA, mA, yA] = a.split('/');
    const [dB, mB, yB] = b.split('/');
    return new Date(yB, mB-1, dB) - new Date(yA, mA-1, dA);
  }).forEach(fecha => {
    const li = document.createElement('li');
    li.className = 'historial-fecha';

    // Obtener datos de agua y suplementos
    const wc = JSON.parse(localStorage.getItem('waterCounts') || '{}')[fecha] || 0;
    const sup = (JSON.parse(localStorage.getItem('suplementosPorDia') || '{}')[fecha] || []);

    // Crear cabecera del día con iconos
    const dateHeader = document.createElement('div');
    dateHeader.style.display = 'flex';
    dateHeader.style.alignItems = 'center';
    dateHeader.style.justifyContent = 'space-between';

    const dateText = document.createElement('span');
    dateText.innerHTML = `<strong>📅 ${fecha}</strong> <span class="toggle-icon">▼</span>`;
    dateText.style.flex = '1';
    dateText.style.display = 'flex';
    dateText.style.alignItems = 'center';
    dateText.style.gap = '8px';

    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'historial-badges';

    // Badge de agua
    const waterBadge = document.createElement('span');
    waterBadge.className = 'historial-badge historial-badge-agua';
    waterBadge.innerHTML = `💧 ${wc}`;
    badgesContainer.appendChild(waterBadge);

    // Badges de suplementos (si hay)
    if (sup.length > 0) {
      const supBadge = document.createElement('span');
      supBadge.className = 'historial-badge historial-badge-suplementos';
      supBadge.innerHTML = `💊 ${sup.length}`;
      supBadge.title = sup.join(', ');
      badgesContainer.appendChild(supBadge);
    }

    // Badge de comidas completadas
    const comidasBadge = document.createElement('span');
    comidasBadge.className = 'historial-badge';
    comidasBadge.style.background = 'rgba(255,255,255,0.2)';
    comidasBadge.style.color = 'white';
    comidasBadge.innerHTML = `🍽️ ${dias[fecha].length}`;
    badgesContainer.appendChild(comidasBadge);

    dateHeader.appendChild(dateText);
    dateHeader.appendChild(badgesContainer);
    li.appendChild(dateHeader);

    ul.appendChild(li);

    // Lista de comidas del día
    const inner = document.createElement('ul');
    inner.style.margin = '0';
    inner.style.padding = '0';
    inner.style.listStyle = 'none';

    dias[fecha].forEach(({ item, idx }) => {
      const li2 = document.createElement('li');

      // Crear estructura para la comida en el historial
      const comidaContainer = document.createElement('div');
      comidaContainer.className = 'historial-comida-container';

      // Cabecera con el nombre de la comida y botón de editar
      const comidaHeader = document.createElement('div');
      comidaHeader.className = 'historial-comida-header';

      const nombreComida = document.createElement('span');
      nombreComida.className = 'historial-item-nombre';
      nombreComida.textContent = item.nombre;

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn-editar-historial';
      btnEdit.innerHTML = '✏️ Editar';
      btnEdit.onclick = (e) => {
        e.stopPropagation();
        editarHistorial(idx, li2);
      };

      comidaHeader.appendChild(nombreComida);
      comidaHeader.appendChild(btnEdit);
      comidaContainer.appendChild(comidaHeader);

      // Detalles de la selección con iconos
      const detallesContainer = document.createElement('div');
      detallesContainer.className = 'historial-detalles';

      item.seleccion.split(', ').forEach(pair => {
        const [grupo, valor] = pair.split(': ');
        const icono = getIconoGrupo(grupo);

        const detalleFila = document.createElement('div');
        detalleFila.className = 'historial-detalle-fila';

        const labelGrupo = document.createElement('span');
        labelGrupo.className = 'historial-grupo-label';
        const nombreCompleto = grupo.replace(/_/g, ' ').toUpperCase();
        labelGrupo.innerHTML = `${icono} ${nombreCompleto}`;

        const valorSpan = document.createElement('span');
        valorSpan.className = 'historial-grupo-valor';
        valorSpan.textContent = valor || '-';

        detalleFila.appendChild(labelGrupo);
        detalleFila.appendChild(valorSpan);
        detallesContainer.appendChild(detalleFila);
      });

      comidaContainer.appendChild(detallesContainer);
      li2.appendChild(comidaContainer);
      inner.appendChild(li2);
    });

    ul.appendChild(inner);

    // Manejo de expansión/colapso
    let open = true;
    const toggleIcon = li.querySelector('.toggle-icon');

    li.onclick = (e) => {
      if (e.target.closest('.btn-editar-historial')) return;
      open = !open;
      inner.style.display = open ? '' : 'none';
      toggleIcon.textContent = open ? '▼' : '▶';
      toggleIcon.style.transform = open ? 'rotate(0deg)' : 'rotate(-90deg)';
    };
  });
}

// — Agua por día —
function getTodayKey() { return new Date().toLocaleDateString('es-AR'); }
function getWaterCount(key) { return JSON.parse(localStorage.getItem('waterCounts') || '{}')[key] || 0; }
function setWaterCount(key, v) {
  const m = JSON.parse(localStorage.getItem('waterCounts') || '{}');
  m[key] = v;
  localStorage.setItem('waterCounts', JSON.stringify(m));
}


// Función para modificar los grupos de comidas (añadir/quitar dropdowns)
function modificarGruposComida(comidaNombre, tipoComida, grupo, accion) {
  const lista = comidasEntrenamiento;
  const comida = lista.find(c => c.nombre === comidaNombre);

  if (!comida) return false;

  // Para añadir un grupo
  if (accion === 'agregar') {
    comida.grupos.push(grupo);
    console.log(`Grupo ${grupo} agregado a ${comidaNombre}`);
  }
  // Para quitar un grupo
  else if (accion === 'quitar') {
    const index = comida.grupos.indexOf(grupo);
    if (index > -1) {
      comida.grupos.splice(index, 1);
      console.log(`Grupo ${grupo} eliminado de ${comidaNombre}`);
    }
  }

  // Guardar los cambios en localStorage
  localStorage.setItem('comidasEntrenamiento', JSON.stringify(comidasEntrenamiento));

  // Actualizar todas las interfaces que dependen de esta configuración
  cargarComidas();
  return true;
}

// 🔄 Renombrar un grupo de alimentos
function renombrarGrupo(nombreAnterior, nombreNuevo) {
  if (nombreAnterior === nombreNuevo) return;
  
  // 1. Actualizar en opciones (localStorage)
  const current = getOpciones();
  if (current[nombreAnterior]) {
    current[nombreNuevo] = current[nombreAnterior];
    delete current[nombreAnterior];
    setOpciones(current);
  }
  
  // 2. Actualizar en comidasEntrenamiento
  comidasEntrenamiento.forEach(comida => {
    const idx = comida.grupos.indexOf(nombreAnterior);
    if (idx > -1) {
      comida.grupos[idx] = nombreNuevo;
    }
  });
  localStorage.setItem('comidasEntrenamiento', JSON.stringify(comidasEntrenamiento));
  
  // 3. Actualizar el objeto opciones en memoria (para que se exporte correctamente)
  if (opciones[nombreAnterior]) {
    opciones[nombreNuevo] = opciones[nombreAnterior];
    delete opciones[nombreAnterior];
  }
  
  // 4. Mantener el icono personalizado si existe
  const iconosPersonalizados = JSON.parse(localStorage.getItem('iconosGrupos') || '{}');
  if (iconosPersonalizados[nombreAnterior]) {
    iconosPersonalizados[nombreNuevo] = iconosPersonalizados[nombreAnterior];
    delete iconosPersonalizados[nombreAnterior];
    localStorage.setItem('iconosGrupos', JSON.stringify(iconosPersonalizados));
  }
  
  // 5. Refrescar la interfaz
  renderOpcionesForm();
  cargarComidas();
  
  mostrarNotificacion(`✏️ Grupo renombrado a "${nombreNuevo.replace(/_/g, ' ').toUpperCase()}"`, 'success');
}

// 🎨 Obtener icono para un grupo (personalizado o por defecto)
function getIconoGrupo(grupoKey) {
  const iconosPersonalizados = JSON.parse(localStorage.getItem('iconosGrupos') || '{}');
  if (iconosPersonalizados[grupoKey]) {
    return iconosPersonalizados[grupoKey];
  }
  
  const base = grupoKey.split('_')[0];
  const iconosDefault = {
    proteinas: "🥩",
    hidratos: "🍞",
    frutas: "🍎",
    colaciones: "🧁",
    grasas: "🥑",
    vegetales: "🥦",
    lacteos: "🥛",
    suplementos: "💊"
  };
  return iconosDefault[base] || "📦";
}

// 🎨 Guardar icono personalizado
function setIconoGrupo(grupoKey, icono) {
  const iconosPersonalizados = JSON.parse(localStorage.getItem('iconosGrupos') || '{}');
  iconosPersonalizados[grupoKey] = icono;
  localStorage.setItem('iconosGrupos', JSON.stringify(iconosPersonalizados));
}

// 🎨 Mostrar selector de iconos
function mostrarSelectorIcono(grupoKey, iconoSpan) {
  // Cerrar cualquier selector abierto
  const existente = document.querySelector('.icono-selector-popup');
  if (existente) existente.remove();
  
  const emojis = [
    "🥩", "🍗", "🍖", "🐟", "🦐", "🥚", "🧀",
    "🍞", "🍚", "🍝", "🥔", "🌽", "🥣", "🥐",
    "🍎", "🍌", "🍇", "🍓", "🥝", "🍑", "🍊",
    "🧁", "🍪", "🍫", "🍩", "🍰", "🍬", "🥜",
    "🥑", "🫒", "🥥", "🧈", "🥓",
    "🥦", "🥬", "🥒", "🍅", "🥕", "🌶️", "🧄",
    "🥛", "🧃", "🍶", "☕", "🧋",
    "💊", "🏋️", "⚡", "🔥", "💪",
    "📦", "🍱", "🥗", "🍲", "🥘", "🌮", "🥪"
  ];
  
  const popup = document.createElement('div');
  popup.className = 'icono-selector-popup';
  popup.style.cssText = `
    position: absolute;
    background: white;
    border: 2px solid var(--primary-color);
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    max-width: 280px;
  `;
  
  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.style.cssText = `
      font-size: 1.5rem;
      padding: 5px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: white;
      cursor: pointer;
      transition: transform 0.1s, background 0.1s;
    `;
    btn.onmouseover = () => btn.style.background = '#f0f0f0';
    btn.onmouseout = () => btn.style.background = 'white';
    btn.onclick = (e) => {
      e.stopPropagation();
      setIconoGrupo(grupoKey, emoji);
      iconoSpan.textContent = emoji;
      popup.remove();
      
      // Refrescar todas las vistas para que se actualicen los iconos
      renderOpcionesForm();
      cargarComidas();
      cargarHistorial();
      mostrarConfigComidas();
      
      mostrarNotificacion(`🎨 Icono cambiado a ${emoji}`, 'success');
    };
    popup.appendChild(btn);
  });
  
  // Posicionar cerca del span del icono
  const rect = iconoSpan.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
  popup.style.left = (rect.left + window.scrollX) + 'px';
  
  document.body.appendChild(popup);
  
  // Cerrar al hacer clic fuera
  const cerrar = (e) => {
    if (!popup.contains(e.target)) {
      popup.remove();
      document.removeEventListener('click', cerrar);
    }
  };
  setTimeout(() => document.addEventListener('click', cerrar), 10);
}

// — Render opciones de dropdowns (Opciones de Dropdowns) —
function renderOpcionesForm() {
  console.log('Renderizando formulario de opciones con configuración actualizada');
  const cont = document.getElementById('opciones-form');
  if (!cont) {
    console.warn('Elemento opciones-form no encontrado en el DOM');
    return; // Salir si no encontramos el contenedor
  }
  cont.innerHTML = '';

  // Asegurarnos de obtener los datos más recientes
  const current = getOpciones();

  // Primero, renderizar la sección para configurar grupos de comidas
  const configSection = document.createElement('div');
  configSection.className = 'config-grupos-section';

  const h3 = document.createElement('h3');
  h3.textContent = 'Configurar Grupos por Comida';
  configSection.appendChild(h3);

  // Contenedor para la configuración
  const configComidasDiv = document.createElement('div');
  configComidasDiv.id = 'dropdown-config-contenido';
  configSection.appendChild(configComidasDiv);

  // Función para mostrar los grupos
  function mostrarConfigComidas() {
    console.log('Mostrando configuración de comidas');

    // Usar las referencias en memoria actualizadas
    const lista = comidasEntrenamiento;
    console.log('Configuración actual:', lista);

    configComidasDiv.innerHTML = '';

    // Listar cada comida con sus grupos
    lista.forEach(comida => {
      const comidaDiv = document.createElement('div');
      comidaDiv.className = 'comida-grupos';

      // Encabezado de la comida con estilo mejorado
      const comidaHeader = document.createElement('div');
      comidaHeader.style.display = 'flex';
      comidaHeader.style.alignItems = 'center';
      comidaHeader.style.justifyContent = 'space-between';
      comidaHeader.style.marginBottom = '12px';
      comidaHeader.style.paddingBottom = '8px';
      comidaHeader.style.borderBottom = '1px solid #e0e0e0';

      const h4 = document.createElement('h4');
      h4.textContent = comida.nombre;
      h4.style.margin = '0';
      h4.style.color = '#388E3C';

      // Contador de grupos
      const grupoCount = document.createElement('span');
      grupoCount.textContent = `${comida.grupos.length} grupo(s)`;
      grupoCount.style.fontSize = '0.85rem';
// Función para mostrar mensaje y restaurar grupo eliminado en Configurar Grupos por Comida
function mostrarMensajeRestaurarGrupo(mensaje, comidaNombre, grupo, idx) {
  let msgContainer = document.getElementById('mensaje-container');
  if (!msgContainer) {
    msgContainer = document.createElement('div');
    msgContainer.id = 'mensaje-container';
    msgContainer.className = 'mensaje-container';
    document.body.appendChild(msgContainer);
  }

  const msgElement = document.createElement('div');
  msgElement.className = 'mensaje info';
  msgElement.innerHTML = `<div class="mensaje-contenido"><span class="mensaje-icono">ℹ️</span> ${mensaje}</div>`;

  // Botón de cerrar con restaurar
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'mensaje-cerrar';
  closeBtn.onclick = () => {
    // Restaurar el grupo eliminado (último de la pila)
    const ultimo = gruposEliminadosStack.pop();
    if (ultimo) {
      const lista = comidasEntrenamiento;
      const comida = lista.find(c => c.nombre === ultimo.comidaNombre);
      if (comida) {
        comida.grupos.splice(ultimo.idx, 0, ultimo.grupo);
        // Guardar los cambios en localStorage
        localStorage.setItem('comidasEntrenamiento', JSON.stringify(comidasEntrenamiento));
        renderOpcionesForm();
        mostrarConfigComidas();
      }
    }
    msgContainer.removeChild(msgElement);
  };
  msgElement.querySelector('.mensaje-contenido').appendChild(closeBtn);

  msgContainer.appendChild(msgElement);
  setTimeout(() => msgElement.classList.add('visible'), 10);
  setTimeout(() => {
    if (msgElement.parentNode) {
      msgElement.classList.remove('visible');
      setTimeout(() => {
        if (msgElement.parentNode) {
          msgElement.parentNode.removeChild(msgElement);
        }
      }, 300);
    }
  }, 6000);
}
      grupoCount.style.color = '#757575';

      comidaHeader.appendChild(h4);
      comidaHeader.appendChild(grupoCount);
      comidaDiv.appendChild(comidaHeader);

      // Listar los grupos actuales con estilo mejorado
      if (comida.grupos.length > 0) {
        const gruposContainer = document.createElement('div');
        gruposContainer.style.marginBottom = '15px';

        comida.grupos.forEach((grupo, grupoIdx) => {
          const grupoItem = document.createElement('div');
          grupoItem.style.display = 'flex';
          grupoItem.style.alignItems = 'center';
          grupoItem.style.justifyContent = 'space-between';
          grupoItem.style.padding = '8px 10px';
          grupoItem.style.marginBottom = '5px';
          grupoItem.style.backgroundColor = '#f5f5f5';
          grupoItem.style.borderRadius = '4px';
          grupoItem.style.borderLeft = '3px solid #4CAF50';

          // Obtener icono del grupo
          const icono = getIconoGrupo(grupo);

          const grupoLabel = document.createElement('div');
          grupoLabel.innerHTML = `<span class="grupo-icono">${icono}</span> ${grupo.replace(/_/g, ' ').toUpperCase()}`;

          const btnQuitar = document.createElement('button');
          btnQuitar.className = 'btn-delete';
          btnQuitar.innerHTML = '✖';
          btnQuitar.title = 'Quitar este grupo';
          btnQuitar.style.minWidth = 'unset';
          btnQuitar.style.width = '30px';
          btnQuitar.style.height = '30px';
          btnQuitar.style.padding = '0';
          btnQuitar.style.display = 'flex';
          btnQuitar.style.justifyContent = 'center';
          btnQuitar.style.alignItems = 'center';
          btnQuitar.onclick = () => {
            // Guardar en la pila de eliminados de grupos
            gruposEliminadosStack.push({
              comidaNombre: comida.nombre,
              grupo,
              idx: grupoIdx
            });
            if (modificarGruposComida(comida.nombre, 'entrenamiento', grupo, 'quitar')) {
              mostrarConfigComidas();
              mostrarMensajeRestaurarGrupo(`Grupo "${grupo.replace(/_/g, ' ').toUpperCase()}" eliminado de ${comida.nombre}. Haz clic en la X para restaurar.`, comida.nombre, grupo, grupoIdx);
            }
          };

          grupoItem.appendChild(grupoLabel);
          grupoItem.appendChild(btnQuitar);
          gruposContainer.appendChild(grupoItem);
        });

        comidaDiv.appendChild(gruposContainer);
      } else {
        // Mostrar mensaje si no hay grupos
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'No hay grupos configurados para esta comida.';
        emptyMessage.style.color = '#757575';
        emptyMessage.style.fontStyle = 'italic';
        comidaDiv.appendChild(emptyMessage);
      }

      // Selector para añadir grupos con mejor estilo
      const addGroupDiv = document.createElement('div');
      addGroupDiv.style.display = 'flex';
      addGroupDiv.style.alignItems = 'center';
      addGroupDiv.style.marginTop = '10px';
      addGroupDiv.style.flexWrap = 'wrap';
      addGroupDiv.style.width = '100%';
      addGroupDiv.style.boxSizing = 'border-box';
      addGroupDiv.style.gap = '8px';

      const select = document.createElement('select');
      select.id = `select-add-grupo-${comida.nombre}`;
      select.style.flex = '1 1 200px';
      select.style.minWidth = '0';
      select.style.maxWidth = '100%';
      select.style.padding = '8px 12px';
      select.style.borderRadius = '4px';
      select.style.border = '1px solid #ddd';
      select.style.boxSizing = 'border-box';

      // Opciones disponibles para añadir con iconos
      const opcionesGrupo = [
        'colaciones',
        'proteinas_desayuno_merienda',
        'proteinas_almuerzo',
        'proteinas_cena',
        'hidratos_desayuno_merienda',
        'hidratos_almuerzo',
        'hidratos_cena',
        'lacteos_desayuno_merienda',
        'frutas_desayuno_merienda',
        'grasas_desayuno_merienda',
        'vegetales_cena'
      ];

      opcionesGrupo.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;

        const icono = getIconoGrupo(opt);
        option.textContent = `${icono} ${opt.replace(/_/g, ' ').toUpperCase()}`;

        select.appendChild(option);
      });

      const btnAdd = document.createElement('button');
      btnAdd.className = 'btn-outline';
      btnAdd.innerHTML = '➕ Agregar';
      btnAdd.style.flex = '0 0 auto';
      btnAdd.style.minWidth = '80px';
      btnAdd.style.maxWidth = 'none';
      btnAdd.style.boxSizing = 'border-box';
      btnAdd.style.whiteSpace = 'nowrap';
      btnAdd.style.padding = '8px 12px';
      btnAdd.onclick = () => {
        const grupoSeleccionado = select.value;
        if (modificarGruposComida(comida.nombre, 'entrenamiento', grupoSeleccionado, 'agregar')) {
          mostrarConfigComidas();
        }
      };

      addGroupDiv.appendChild(select);
      addGroupDiv.appendChild(btnAdd);
      comidaDiv.appendChild(addGroupDiv);

      configComidasDiv.appendChild(comidaDiv);
    });
  }

  // Mostrar configuración
  mostrarConfigComidas();

  cont.appendChild(configSection);

  // Agregar separador visual
  const separator = document.createElement('div');
  separator.style.margin = '30px 0';
  separator.style.borderTop = '1px solid #e0e0e0';
  cont.appendChild(separator);

  // Título para la sección de alimentos
  const tituloAlimentos = document.createElement('h3');
  tituloAlimentos.textContent = 'Configuración de Alimentos';
  tituloAlimentos.style.marginBottom = '20px';
  cont.appendChild(tituloAlimentos);

  // Contenedor flexible para las tarjetas de opciones
  const opcionesGrid = document.createElement('div');
  opcionesGrid.className = 'opciones-form';
  cont.appendChild(opcionesGrid);

  // Renderizar opciones de alimentos (usar current para incluir grupos renombrados)
  Object.keys(current).forEach(grupoKey => {
    const div = document.createElement('div');
    div.className = 'grupo-opciones';

    // Usar el nombre completo del grupo reemplazando guiones bajos por espacios
    const labelGrupo = grupoKey.replace(/_/g, ' ').toUpperCase();

    // Obtener icono del grupo (personalizado o por defecto)
    const icono = getIconoGrupo(grupoKey);

    // Contador de alimentos
    const cantidad = Array.isArray(current[grupoKey]) ? current[grupoKey].length : 0;

    // Header con acordeón
    const header = document.createElement('div');
    header.className = 'grupo-header';
    
    // Crear elementos del header manualmente para agregar edición
    const grupoTitulo = document.createElement('div');
    grupoTitulo.className = 'grupo-titulo';
    
    const toggleSpan = document.createElement('span');
    toggleSpan.className = 'grupo-toggle';
    toggleSpan.textContent = '▼';
    
    const iconoSpan = document.createElement('span');
    iconoSpan.className = 'grupo-icono';
    iconoSpan.textContent = icono;
    iconoSpan.title = 'Clic para cambiar icono';
    iconoSpan.onclick = (e) => {
      e.stopPropagation();
      mostrarSelectorIcono(grupoKey, iconoSpan);
    };
    
    const nombreStrong = document.createElement('strong');
    nombreStrong.textContent = labelGrupo;
    
    const contadorSpan = document.createElement('span');
    contadorSpan.className = 'grupo-contador';
    contadorSpan.textContent = `(${cantidad})`;
    
    grupoTitulo.appendChild(toggleSpan);
    grupoTitulo.appendChild(iconoSpan);
    grupoTitulo.appendChild(nombreStrong);
    grupoTitulo.appendChild(contadorSpan);
    
    // Contenedor de botones
    const botonesContainer = document.createElement('div');
    botonesContainer.style.display = 'flex';
    botonesContainer.style.gap = '5px';
    
    // Botón editar icono
    const btnEditarIcono = document.createElement('button');
    btnEditarIcono.className = 'btn-ordenar';
    btnEditarIcono.title = 'Cambiar icono del grupo';
    btnEditarIcono.textContent = '🎨';
    btnEditarIcono.onclick = (e) => {
      e.stopPropagation();
      mostrarSelectorIcono(grupoKey, iconoSpan);
    };
    
    // Botón editar nombre
    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn-ordenar';
    btnEditar.title = 'Editar nombre del grupo';
    btnEditar.textContent = '✏️';
    btnEditar.onclick = (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'text';
      input.value = grupoKey;
      input.style.fontWeight = 'bold';
      input.style.fontSize = '1rem';
      input.style.padding = '2px 5px';
      input.style.border = '2px solid var(--primary-color)';
      input.style.borderRadius = '4px';
      input.style.width = '200px';
      
      nombreStrong.replaceWith(input);
      input.focus();
      input.select();
      
      const guardarNuevoNombre = () => {
        const nuevoNombre = input.value.trim().toLowerCase().replace(/\s+/g, '_');
        if (nuevoNombre && nuevoNombre !== grupoKey) {
          renombrarGrupo(grupoKey, nuevoNombre);
        } else {
          input.replaceWith(nombreStrong);
        }
      };
      
      input.onblur = guardarNuevoNombre;
      input.onkeypress = (ev) => {
        if (ev.key === 'Enter') {
          guardarNuevoNombre();
        }
      };
      input.onkeydown = (ev) => {
        if (ev.key === 'Escape') {
          input.replaceWith(nombreStrong);
        }
      };
    };
    
    header.appendChild(grupoTitulo);
    botonesContainer.appendChild(btnEditarIcono);
    botonesContainer.appendChild(btnEditar);
    header.appendChild(botonesContainer);

    // Contenedor colapsable
    const contenido = document.createElement('div');
    contenido.className = 'grupo-contenido';

    // Toggle acordeón
    grupoTitulo.onclick = (e) => {
      if (e.target.tagName === 'INPUT') return; // No colapsar si está editando
      const isOpen = contenido.classList.toggle('collapsed');
      toggleSpan.textContent = isOpen ? '▶' : '▼';
    };

    div.appendChild(header);

    // Lista de opciones actuales
    const ul = document.createElement('ul');
    if (Array.isArray(current[grupoKey])) {
      if (current[grupoKey].length === 0) {
        const li = document.createElement('li');
        li.textContent = '(Sin opciones)';
        li.style.fontStyle = 'italic';
        li.style.color = '#757575';
        li.style.borderBottom = 'none';
        ul.appendChild(li);
      } else {
        current[grupoKey].forEach((opt, idx) => {
          const li = document.createElement('li');

          const optionText = document.createElement('span');
          optionText.textContent = opt;

          const btnDel = document.createElement('button');
          btnDel.innerHTML = '✖';
          btnDel.className = 'btn-delete';
          btnDel.style.minWidth = 'unset';
          btnDel.style.width = '30px';
          btnDel.style.height = '30px';
          btnDel.style.padding = '0';
          btnDel.title = 'Eliminar este alimento';

          btnDel.onclick = () => {
            // Guardar el eliminado en la pila para restaurar múltiples
            const valorEliminado = current[grupoKey][idx];
            current[grupoKey].splice(idx, 1);
            setOpciones(current);
            renderOpcionesForm();
            cargarComidas();
            mostrarMensajeRestaurar(`Opción "${valorEliminado}" eliminada de ${labelGrupo}. Haz clic en la X para restaurar.`, grupoKey, valorEliminado, idx);
          };

          li.appendChild(optionText);
          li.appendChild(btnDel);
          ul.appendChild(li);
        });
      }
    }
    contenido.appendChild(ul);

    // Formulario para agregar nuevas opciones
    const addForm = document.createElement('div');
    addForm.style.display = 'flex';
    addForm.style.marginTop = '15px';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = `Nuevo alimento...`;
    inp.style.flex = '1';

    const btnAdd = document.createElement('button');
    btnAdd.textContent = 'Agregar';
    btnAdd.style.marginLeft = '10px';

    btnAdd.onclick = () => {
      const val = inp.value.trim();
      if (!Array.isArray(current[grupoKey])) current[grupoKey] = [];

      if (val && !current[grupoKey].includes(val)) {
        current[grupoKey].push(val);
        setOpciones(current);
        renderOpcionesForm();
        cargarComidas();
        inp.value = '';
      }
    };

    // También permitir agregar con Enter
    inp.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnAdd.click();
      }
    });

    addForm.appendChild(inp);
    addForm.appendChild(btnAdd);
    contenido.appendChild(addForm);

    div.appendChild(contenido);
    opcionesGrid.appendChild(div);
  });
}

// — Inicialización —
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('export-csv').onclick = exportarHistorialCSV;
  document.getElementById('import-csv').onchange = e => {
    if (e.target.files[0]) importarHistorialCSV(e.target.files[0]);
  };

  // Cargar configuraciones de comidas usando la función dedicada
  cargarConfiguracionComidas();

  cargarComidas();
  cargarHistorial();
  cargarSuplementosDia();

  // Agua
  const key = getTodayKey();
  let cnt = getWaterCount(key);
  const span = document.getElementById('water-count');
  span.textContent = cnt;
  document.getElementById('add-water').onclick = () => {
    cnt++;
    span.textContent = cnt;
    setWaterCount(key, cnt);
    cargarHistorial();
  };
  document.getElementById('remove-water').onclick = () => {
    if (cnt > 0) {
      cnt--;
      span.textContent = cnt;
      setWaterCount(key, cnt);
      cargarHistorial();
    }
  };
  document.getElementById('reset-water').onclick = () => {
    cnt = 0;
    span.textContent = cnt;
    setWaterCount(key, cnt);
    cargarHistorial();
  };

  // Tabs
  function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(s => s.style.display = 'none');
    document.getElementById('tab-content-' + tab).style.display = '';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    // Actualizar variable global de pestaña actual
    tabActual = tab;
    console.log('Cambio de pestaña a:', tabActual);
  }
  document.getElementById('tab-principal').onclick = () => showTab('principal');
  document.getElementById('tab-historial').onclick = () => showTab('historial');
  document.getElementById('tab-opciones').onclick = () => showTab('opciones');
  document.getElementById('tab-ayuda').onclick = () => showTab('ayuda');

  showTab('principal');

  renderOpcionesForm();
});

  document.getElementById('reiniciar-app').onclick = () => {
    if (confirm('¿Querés reiniciar la app? Se eliminarán todos los datos y se restaurarán las opciones por defecto.')) {
      localStorage.clear();
      alert('App reiniciada. Se restauró la configuración original.');
      location.reload();
    }
  };

// — Registrar Service Worker —
if ('serviceWorker' in navigator) {
  // Usar una ruta relativa para que funcione en GitHub Pages
  const swPath = new URL('service-worker.js', window.location.href).pathname;
  navigator.serviceWorker.register(swPath)
    .then(reg => console.log('SW registrado', reg))
    .catch(err => console.error('SW fallo', err));
}
