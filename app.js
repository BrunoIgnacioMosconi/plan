// — Exportar historial a CSV —
function exportarHistorialCSV() {
   const historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
  const suplementosPorDia = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
  if (!historial.length) {
    alert('No hay historial para exportar.');
    return;
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
  // Exportar todos los grupos definidos en opciones, incluyendo los nuevos dropdowns
  Object.keys(opciones).forEach(grupo => {
    const valores = opcionesDropdowns[grupo] || [];
    csv += `"${grupo}","${valores.join(' | ')}"\n`;
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
      // Asegurar que todos los grupos de opciones existan, aunque estén vacíos
      Object.keys(opciones).forEach(grupo => {
        if (!opcionesDropdowns.hasOwnProperty(grupo)) {
          opcionesDropdowns[grupo] = [];
        }
      });
      localStorage.setItem('opcionesDropdowns', JSON.stringify(opcionesDropdowns));
      renderOpcionesForm();
      cargarComidas();
    }

    cargarHistorial();
    alert('Historial y opciones importados correctamente.');
  };
  reader.readAsText(file, 'UTF-8');
}

// — Datos y lógica core de la app —

// 🧠 Aquí están todas las opciones para los dropdowns agrupadas por tipo
const opciones = {
  proteinas_dm: [
    "Vaso de leche (250cc)",
    "Vaso de yogur (200cc)",
    "Porción de queso (70gr)",
    "Fetas de queso (4u)",
    "Queso untable (2 cdas)",
    "Huevo entero (3u)"
  ],
  proteinas_dm_no_entrenamiento: [
    "Vaso de leche (250cc)",
    "Vaso de yogur (200cc)",
    "Porción de queso (70gr)",
    "Fetas de queso (4u)",
    "Queso untable (2 cdas)",
    "Huevo entero (3u)"
  ],
  hidratos_dm: [
    "Pan lactal integral (4u)",
    "Pan de mesa (8u)",
    "Tostada de arroz (6u)",
    "Granola (140gr)",
    "Avena (140gr)",
    "Bay Biscuit (2u)"
  ],
  frutas: [
    "Banana",
    "Manzana",
    "Naranja",
    "Pera",
    "Frutilla",
    "Mandarina",
    "Durazno",
    "Ciruela",
    "Pomelo"
  ],
  frutas_no_entrenamiento: [
    "Banana",
    "Manzana",
    "Naranja",
    "Pera",
    "Frutilla",
    "Mandarina",
    "Durazno",
    "Ciruela",
    "Pomelo"
  ],
  colaciones: [
    "Fruta",
    "Gelatina",
    "Torta de avena",
    "Yogur (120gr)",
    "Barras de cereal",
    "Muttant Mass",
  ],
  grasas: [
    "4 nueces",
    "Pasta de maní",
    "½ palta"
  ],
  // Opciones separadas para almuerzo y cena
  proteinas_almuerzo_entrenamiento: [
    "Huevo entero (3u)",
    "Porción de queso PortSalut (80gr)",
    "Ricota (80gr)",
    "Lomo (200g)",
    "Solomillo (200g)",
    "Peceto (200g)",
    "Bola de Lomo(200g)",
    "Cuadril (200g)",
    "Nalga(200g)",
    "Pollo (200g)",
    "Pavo (200g)"
  ],
  hidratos_almuerzo_entrenamiento: [
    "Legumbre (200gr)",
    "Arroz (220gr cocido)",
    "Quinoa (??)",
    "Trigo (??)",
  ],
  proteinas_almuerzo_no_entrenamiento: [
    "Huevo entero (3u)",
    "Porción de queso PortSalut (80gr)",
    "Ricota (80gr)",
    "Lomo (200g)",
    "Solomillo (200g)",
    "Peceto (200g)",
    "Bola de Lomo(200g)",
    "Cuadril (200g)",
    "Nalga (200g)",
    "Pollo (200g)",
    "Pavo (200g)"
  ],
  hidratos_almuerzo_no_entrenamiento: [
    "Papa (2u med.)",
    "Camote (2u med.)",
    "Legumbres (200gr)",
    "Choclo (??)"
  ],
  vegetales_almuerzo_no_entrenamiento: [
    "SI",
    "NO",
  ],
  proteinas_cena: [
    "Huevo entero (3u)",
    "Ricota (80gr)",
    "Queso PortSalut (80gr)",
    "Solomillo (200g)",
    "Pollo (200g)",
    "Pavo (200g)",
    "Abadejo (200g)",
    "atún (200g)",
    "merluza (200g)",
    "salmón (200g)",
    "trucha (200g)",
  ],
  hidratos_cena: [
    "Papa (2u med.)",
    "Camote (2u med.)",
    "Legumbres (200gr)",
    "Choclo (??)"
  ],
  vegetales_cena: [
    "SI",
    "NO",
  ]
};

// 💊 Lista de suplementos disponibles para elegir por día
const suplementos = [
  "Creatina",
  "Proteína",
  "Muttant Mass (Scoop 1)",
  "Muttant Mass (Scoop 2)"
];

// 🥗 Configuración de comidas para días de ENTRENAMIENTO
// Cada entrada representa una comida (ej: Desayuno) con los grupos de dropdowns que se van a mostrar
// Podés duplicar un grupo (como "proteinas") si querés mostrar dos dropdowns de ese tipo
const comidasEntrenamiento = [
  {
    nombre: "Desayuno",  // nombre visible en pantalla
    tipo: "dm",          // clave que determina qué grupo de opciones se usa ("dm" = desayuno/merienda)
    grupos: [
      "proteinas",       // primer dropdown de proteínas
      "proteinas",       // segundo dropdown de proteínas (agregado nuevo)
      "hidratos",
      "frutas",
      "grasas"
    ]
  },
  {
    nombre: "Almuerzo",
    tipo: "almuerzo_entrenamiento",
    grupos: ["proteinas", "hidratos"]
  },
  {
    nombre: "Merienda",
    tipo: "dm",
    grupos: [
      "proteinas",       // primer dropdown de proteínas
      "proteinas",       // segundo dropdown de proteínas (agregado nuevo)
      "hidratos",
      "frutas"
    ]
  },
  {
    nombre: "Cena",
    tipo: "cena",
    grupos: ["proteinas", "hidratos", "vegetales"]
  },
  {
    nombre: "Colación",
    tipo: null,
    grupos: ["colaciones"]
  }
];

// 🛋️ Configuración de comidas para días SIN entrenamiento
const comidasNoEntrenamiento = [
  {
    nombre: "Desayuno",
    tipo: "no_entrenamiento",
    grupos: ["proteinas_dm_no_entrenamiento", "frutas_no_entrenamiento"]
  },
  {
    nombre: "Almuerzo",
    tipo: "almuerzo_no_entrenamiento",
    grupos: ["proteinas", "hidratos", "vegetales"]
  },
  {
    nombre: "Merienda",
    tipo: "no_entrenamiento",
    grupos: ["proteinas_dm_no_entrenamiento", "frutas_no_entrenamiento"]
  },
  {
    nombre: "Cena",
    tipo: "cena",
    grupos: ["proteinas", "hidratos", "vegetales"]
  },
  {
    nombre: "Colación",
    tipo: null,
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

// 🛠️ Crear un selector <select> para un grupo dado (ej: proteinas, hidratos...)
function crearSelector(grupo, idx, tipo, selected = null) {
  const select = document.createElement('select');
  select.id = `select-${grupo}-${tipo || 'col'}-${idx}`;

  let key;
  if (tipo === "almuerzo_entrenamiento") {
    key = `${grupo}_almuerzo_entrenamiento`;
  } else if (tipo === "almuerzo_no_entrenamiento") {
    key = `${grupo}_almuerzo_no_entrenamiento`;
  } else if (tipo === "cena") {
    key = `${grupo}_cena`;
  } else if ((grupo === "proteinas" || grupo === "hidratos") && tipo === "dm") {
    key = `${grupo}_dm`;
  } else {
    key = grupo;
  }

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
  suplementos.forEach(sup => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = tomados.includes(sup);
    cb.onchange = () => {
      const m = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
      const arr = m[key] || [];
      if (cb.checked) arr.push(sup);
      else {
        const i = arr.indexOf(sup);
        if (i >= 0) arr.splice(i, 1);
      }
      m[key] = [...new Set(arr)];
      localStorage.setItem('suplementosPorDia', JSON.stringify(m));
      cargarHistorial();
    };
    label.appendChild(cb);
    label.append(' ' + sup);
    div.appendChild(label);
  });
}

// 🧾 Cargar la lista de comidas del día actual (basado en tipo de día)
function cargarComidas() {
  const ul = document.getElementById('comidas-lista');
  ul.innerHTML = '';
  const hist = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const today = new Date().toLocaleDateString('es-AR');
  const tipoDia = document.getElementById('tipo-dia-select')?.value || 'entrenamiento';
  const comidas = tipoDia === 'entrenamiento' ? comidasEntrenamiento : comidasNoEntrenamiento;

  comidas.forEach((c, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${c.nombre}</strong> `;

    // Mostrar cada grupo de dropdowns
    c.grupos.forEach(g => {
      const labelGrupo = g.replace(/_/g, ' ').toUpperCase();
      li.append(`${labelGrupo}: `);
      li.append(crearSelector(g, i, c.tipo));
    });

    // Botón para marcar comida como completada
    const btn = document.createElement('button');
    btn.textContent = 'Marcar';
    btn.onclick = () => marcarComida(i);

    const done = hist.some(x => {
      const d = x.fecha.split(',')[0].split(' ')[0].trim();
      return d === today && x.nombre === c.nombre;
    });
    if (done) btn.disabled = true;
    li.append(btn);
    ul.append(li);
  });
}

// ✅ Guardar selección de una comida en el historial
function marcarComida(i) {
  const fecha = new Date().toLocaleString();
  const tipoDia = document.getElementById('tipo-dia-select')?.value || 'entrenamiento';
  const comidasList = tipoDia === 'entrenamiento' ? comidasEntrenamiento : comidasNoEntrenamiento;
  const c = comidasList[i];

  const sel = c.grupos.map(g => {
    const s = document.getElementById(`select-${g}-${c.tipo || 'col'}-${i}`);
    return `${g}: ${s.value}`;
  }).join(', ');

  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  h.push({ nombre: c.nombre, seleccion: sel, fecha });
  localStorage.setItem('historialComidas', JSON.stringify(h));
  cargarComidas();
  cargarHistorial();
}

// 🖊️ Editar una entrada del historial directamente
function editarHistorial(idx, container) {
  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const entry = h[idx];
  // Determinar si el registro es de entrenamiento o no
  // Detectar tipo de día por los grupos registrados
  let conf;
  if (entry.seleccion.includes('frutas_huevos') || entry.seleccion.includes('vegetales')) {
    conf = comidasNoEntrenamiento.find(c => c.nombre === entry.nombre);
  } else {
    conf = comidasEntrenamiento.find(c => c.nombre === entry.nombre);
  }
  const grupos = conf.grupos, tipo = conf.tipo;
  const currentMap = {};
  entry.seleccion.split(', ').forEach(pair => {
    const [g, val] = pair.split(': ');
    currentMap[g] = val;
  });
  container.innerHTML = '';
  const form = document.createElement('div');
    const iconos = {
  proteinas: "🥩",
  hidratos: "🍞",
  frutas: "🍎",
  colaciones: "🧁",
  grasas: "🥑",
  vegetales: "🥦"
};
grupos.forEach(g => {
  const lbl = document.createElement('label');
  const labelGrupo = g.replace(/_/g, ' ').toUpperCase();
  const base = g.split('_')[0];
  const icono = iconos[base] || '';
  lbl.innerHTML = `<span style="display:inline-block; min-width:120px">${icono} ${labelGrupo}</span>`;
  lbl.appendChild(crearSelector(g, idx, tipo, currentMap[g]));
  lbl.style.marginBottom = '0.5em';
  lbl.style.flexDirection = 'column';
  lbl.style.alignItems = 'flex-start';
  form.appendChild(lbl);
});

  const btnSave = document.createElement('button');
  btnSave.textContent = 'Guardar';
  btnSave.onclick = () => {
    entry.seleccion = grupos.map(gp => {
      const s = document.getElementById(`select-${gp}-${tipo || 'col'}-${idx}`);
      return `${gp}: ${s.value}`;
    }).join(', ');
    h[idx] = entry;
    localStorage.setItem('historialComidas', JSON.stringify(h));
    cargarHistorial();
  };
  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Cancelar';
  btnCancel.style.marginLeft = '0.5em';
  btnCancel.onclick = cargarHistorial;
  form.appendChild(btnSave);
  form.appendChild(btnCancel);
  container.appendChild(form);
}

// 📜 Cargar historial completo de comidas
function cargarHistorial() {
  const ul = document.getElementById('historial-lista');
  ul.innerHTML = '';
  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const dias = {};
  h.forEach((item, idx) => {
    const d = item.fecha.split(',')[0].split(' ')[0].trim();
    if (!dias[d]) dias[d] = [];
    dias[d].push({ item, idx });
  });
  Object.keys(dias).sort().forEach(fecha => {
    const li = document.createElement('li');
    li.className = 'historial-fecha';
    const wc = JSON.parse(localStorage.getItem('waterCounts') || '{}')[fecha] || 0;
    const sup = (JSON.parse(localStorage.getItem('suplementosPorDia') || '{}')[fecha] || []).join(', ');
    li.textContent = `${fecha} ▼ | Agua: ${wc}${sup ? ' | Sup: ' + sup : ''}`;
    ul.append(li);
    const inner = document.createElement('ul');
    dias[fecha].forEach(({ item, idx }) => {
      const li2 = document.createElement('li');
      li2.textContent = `${item.nombre}: `;
      const spanSel = document.createElement('span');
      // spanSel.textContent = `(${item.seleccion})`;
      const iconos = {
  proteinas: "🥩",
  hidratos: "🍞",
  frutas: "🍎",
  colaciones: "🧁",
  grasas: "🥑",
  vegetales: "🥦"
};
const partes = item.seleccion.split(', ').map(pair => {
  const [grupo, valor] = pair.split(': ');
  const g = grupo.replace(/_/g, ' ').toUpperCase();
  const base = grupo.split('_')[0]; // para proteinas_dm => proteinas
  const icono = iconos[base] || '';
  return `${icono} ${g} → ${valor}`;
});
spanSel.innerHTML = partes.join('<br>');
      li2.append(spanSel);
      const btnEdit = document.createElement('button');
      btnEdit.textContent = 'Editar';
      btnEdit.style.marginLeft = '1em';
      btnEdit.onclick = () => editarHistorial(idx, li2);
      li2.append(btnEdit);
      inner.append(li2);
    });
    ul.append(inner);
    let open = true;
    li.onclick = () => {
      open = !open;
      inner.style.display = open ? '' : 'none';
      li.textContent = open
        ? `${fecha} ▼ | Agua: ${wc}${sup ? ' | Sup: ' + sup : ''}`
        : `${fecha} ▶ | Agua: ${wc}${sup ? ' | Sup: ' + sup : ''}`;
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

// — Render opciones de dropdowns (Opciones de Dropdowns) —
function renderOpcionesForm() {
  const cont = document.getElementById('opciones-form');
  cont.innerHTML = '';
  const current = getOpciones();
  Object.keys(opciones).forEach(grupoKey => {
    const div = document.createElement('div');
    div.style.marginBottom = '1.5em';
    // Mostrar el nombre del grupo sin guiones bajos y en mayúsculas
    const labelGrupo = grupoKey.replace(/_/g, ' ').toUpperCase();
// Después (reemplazo):
const iconos = {
  proteinas: "🥩",
  hidratos: "🍞",
  frutas: "🍎",
  colaciones: "🧁",
  grasas: "🥑",
  vegetales: "🥦"
};
const base = grupoKey.split('_')[0]; // Para agarrar 'proteinas' de 'proteinas_dm'
const icono = iconos[base] || '';
div.innerHTML = `<strong data-icon="${icono}">${labelGrupo}</strong>`;

    const ul = document.createElement('ul');
    if (Array.isArray(current[grupoKey])) {
      current[grupoKey].forEach((opt, idx) => {
        const li = document.createElement('li');
        li.textContent = opt;
        const btnDel = document.createElement('button');
        btnDel.textContent = 'Eliminar';
        btnDel.style.marginLeft = '1em';
        btnDel.onclick = () => {
          current[grupoKey].splice(idx, 1);
          setOpciones(current);
          renderOpcionesForm();
          cargarComidas();
        };
        li.append(btnDel);
        ul.append(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = '(Sin opciones)';
      ul.append(li);
    }
    div.append(ul);
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = `Agregar opción a ${labelGrupo}`;
    inp.style.marginRight = '0.5em';
    const btnAdd = document.createElement('button');
    btnAdd.textContent = 'Agregar';
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
    div.append(inp);
    div.append(btnAdd);
    cont.append(div);
  });
}

// — Inicialización —
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('export-csv').onclick = exportarHistorialCSV;
  document.getElementById('import-csv').onchange = e => {
    if (e.target.files[0]) importarHistorialCSV(e.target.files[0]);
  };

  cargarComidas();
  // Cambiar comidas al cambiar tipo de día
  document.getElementById('tipo-dia-select').onchange = cargarComidas;
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
  }
  document.getElementById('tab-principal').onclick = () => showTab('principal');
  document.getElementById('tab-historial').onclick = () => showTab('historial');
  document.getElementById('tab-opciones').onclick = () => showTab('opciones');
  showTab('principal');

  renderOpcionesForm();
});

// — Registrar Service Worker —
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('SW registrado', reg))
    .catch(err => console.error('SW fallo', err));
}
