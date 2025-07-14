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
    const text = e.target.result.replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      alert('El archivo CSV está vacío o no tiene datos.');
      return;
    }
    const headers = lines[0].split(',');
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
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
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
    cargarHistorial();
    alert('Historial importado correctamente.');
  };
  reader.readAsText(file, 'UTF-8');
}

// — Datos y lógica core de la app —
// Opciones diferenciadas por tipo de comida: 'dm' = Desayuno/Merienda, 'lc' = Almuerzo/Cena
const opciones = {
  proteinas_dm: [
    "Vaso de leche (250cc)",
    "Vaso de yogur (200cc)",
    "Porción de queso (70gr)",
    "Fetas de queso (4u)",
    "Queso untable (2 cdas)",
    "Huevo entero (3u)"
  ],
  proteinas_lc: [
    "Lomo (200gr)",
    "Solomillo (200gr)",
    "Peceto (200gr)",
    "Abadejo/atún/merluza (200gr)",
    "Pollo/pavo (200gr)",
    "Ricota (80gr)",
    "Levadura nutricional (1 cda)"
  ],
  hidratos_dm: [
    "Pan lactal integral (4u)",
    "Tostada de arroz (6u)",
    "Granola (140gr)",
    "Avena (140gr)",
    "BabyScuit (2u)"
  ],
  hidratos_lc: [
    "Arroz (220gr cocido)",
    "Pastas (220gr cruda)",
    "Pastas rellenas (300gr)",
    "Legumbres (200gr)",
    "Papa mediana (2u)",
    "Camote"
  ],
  frutas: [
    "Banana",
    "Manzana",
    "Naranja",
    "Pera",
    "Frutilla",
    "Mandarina",
    "Durazno",
    "Ciruela"
  ],
  colaciones: [
    "Fruta",
    "Gelatina",
    "Torta de avena",
    "Yogur (120gr)",
    "Barras de cereal",
    "Muttant Mass (Scoop 1)",
    "Muttant Mass (Scoop 2)"
  ],
  // Nuevo dropdown solo para Desayuno y Merienda
  grasas: [
    "4 nueces",
    "Pasta de maní",
    "½ palta"
  ]
};
const suplementos = [
  "Creatina",
  "Proteína",
  "Muttant Mass (Scoop 1)",
  "Muttant Mass (Scoop 2)"
];
const comidas = [
  { nombre: "Desayuno", tipo: "dm", grupos: ["proteinas", "hidratos", "frutas", "grasas"] },
  { nombre: "Almuerzo",  tipo: "lc", grupos: ["proteinas", "hidratos", "frutas"] },
  { nombre: "Merienda",  tipo: "dm", grupos: ["proteinas", "hidratos", "frutas", "grasas"] },
  { nombre: "Cena",      tipo: "lc", grupos: ["proteinas", "hidratos", "frutas"] },
  { nombre: "Colación",  tipo: null, grupos: ["colaciones"] }
];

// — Persistencia de opciones de dropdowns —
function getOpciones() {
  const saved = JSON.parse(localStorage.getItem('opcionesDropdowns') || 'null');
  return saved || JSON.parse(JSON.stringify(opciones));
}
function setOpciones(newOpc) {
  localStorage.setItem('opcionesDropdowns', JSON.stringify(newOpc));
}

// — Crear un selector ajustado al tipo de comida —
function crearSelector(grupo, idx, tipo, selected = null) {
  const select = document.createElement('select');
  select.id = `select-${grupo}-${tipo || 'col'}-${idx}`;
  const key = (grupo === "proteinas" || grupo === "hidratos") && tipo
    ? `${grupo}_${tipo}`
    : grupo;
  getOpciones()[key].forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    if (o === selected) opt.selected = true;
    select.appendChild(opt);
  });
  return select;
}

function cargarSuplementosDia() {
  const div = document.getElementById('suplementos-dia');
  div.innerHTML = '<strong>Suplementos de hoy:</strong>';
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

// — Cargar lista de comidas del día —
function cargarComidas() {
  const ul = document.getElementById('comidas-lista');
  ul.innerHTML = '';
  const hist = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const today = new Date().toLocaleDateString('es-AR');
  comidas.forEach((c, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${c.nombre}</strong> `;
    c.grupos.forEach(g => {
      li.append(`${g.charAt(0).toUpperCase() + g.slice(1)}: `);
      li.append(crearSelector(g, i, c.tipo));
    });
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

function marcarComida(i) {
  const fecha = new Date().toLocaleString();
  const c = comidas[i];
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

// — Editar entrada del historial in-place —
function editarHistorial(idx, container) {
  const h = JSON.parse(localStorage.getItem('historialComidas') || '[]');
  const entry = h[idx];
  const conf = comidas.find(c => c.nombre === entry.nombre);
  const grupos = conf.grupos, tipo = conf.tipo;
  const currentMap = {};
  entry.seleccion.split(', ').forEach(pair => {
    const [g, val] = pair.split(': ');
    currentMap[g] = val;
  });
  container.innerHTML = '';
  const form = document.createElement('div');
  grupos.forEach(g => {
    const lbl = document.createElement('label');
    lbl.textContent = g.charAt(0).toUpperCase() + g.slice(1) + ': ';
    lbl.appendChild(crearSelector(g, idx, tipo, currentMap[g]));
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

// — Cargar historial —
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
      spanSel.textContent = `(${item.seleccion})`;
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
    div.innerHTML = `<strong>${grupoKey.replace('_', ' ').toUpperCase()}</strong>`;
    const ul = document.createElement('ul');
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
    div.append(ul);
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = `Agregar opción a ${grupoKey}`;
    inp.style.marginRight = '0.5em';
    const btnAdd = document.createElement('button');
    btnAdd.textContent = 'Agregar';
    btnAdd.onclick = () => {
      const val = inp.value.trim();
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
