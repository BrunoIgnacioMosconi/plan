// — Exportar historial a CSV —
function exportarHistorialCSV() {
    const historial = JSON.parse(localStorage.getItem('historialComidas') || '[]');
    const waterCounts = JSON.parse(localStorage.getItem('waterCounts') || '{}');
    const suplementosPorDia = JSON.parse(localStorage.getItem('suplementosPorDia') || '{}');
    if (!historial.length) {
        alert('No hay historial para exportar.');
        return;
    }
    // Agrupar por fecha
    const dias = {};
    historial.forEach(item => {
        const fechaSolo = item.fecha.split(',')[0].split(' ')[0].trim();
        if (!dias[fechaSolo]) dias[fechaSolo] = [];
        dias[fechaSolo].push(item);
    });
    let csv = 'Fecha,Agua,Suplementos,Comida,Selección\n';
    Object.keys(dias).sort((a,b) => {
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(`${yb}-${mb}-${db}`) - new Date(`${ya}-${ma}-${da}`);
    }).forEach(fecha => {
        const agua = waterCounts[fecha] || 0;
        const suplementos = (suplementosPorDia[fecha] || []).join(' | ');
        dias[fecha].forEach(item => {
            const fechaCSV = `"${fecha.replace(/"/g,'""')}"`;
            const aguaCSV = `"${agua}"`;
            const suplementosCSV = `"${suplementos.replace(/"/g,'""')}"`;
            const nombre = `"${(item.nombre||'').replace(/"/g,'""')}"`;
            const seleccion = `"${(item.seleccion||'').replace(/"/g,'""')}"`;
            csv += `${fechaCSV},${aguaCSV},${suplementosCSV},${nombre},${seleccion}\n`;
        });
    });
    // Descargar CSV con BOM para Excel
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
        if (idxFecha<0 || idxComida<0 || idxSel<0) {
            alert('CSV en formato inesperado.');
            return;
        }
        const waterCounts = {};
        const suplementosPorDia = {};
        const historial = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            const fecha = (cols[idxFecha]||'').replace(/(^"|"$)/g,'').trim();
            const agua = (cols[idxAgua]||'').replace(/(^"|"$)/g,'').trim();
            const sup = (cols[idxSup]||'').replace(/(^"|"$)/g,'').trim();
            const nombre = (cols[idxComida]||'').replace(/(^"|"$)/g,'').trim();
            const seleccion = (cols[idxSel]||'').replace(/(^"|"$)/g,'').trim();
            if (fecha) {
                if (agua) waterCounts[fecha] = parseInt(agua,10) || 0;
                if (sup) suplementosPorDia[fecha] = sup.split(' | ').map(s=>s.trim());
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
const opciones = {
    proteinas: [ "Vaso de leche (250cc)", /*...*/ "Levadura nutricional (1 cda)" ],
    hidratos:   [ "Pan lactal integral (4u)", /*...*/ "Choclo" ],
    frutas:     [ "Fruta","Banana","Manzana","Naranja","Pera","Frutilla","Mandarina","Durazno","Ciruela" ],
    colaciones: [ "Fruta","Gelatina","Torta de avena","Yogur pote x120grs","Barras de cereal","Muttant Mass" ]
};
const suplementos = [ "Creatina","Proteína","Muttant Mass" ];
const comidas = [
    { nombre:"Desayuno", grupos:["proteinas","hidratos","frutas"] },
    { nombre:"Almuerzo",  grupos:["proteinas","hidratos","frutas"] },
    { nombre:"Merienda",  grupos:["proteinas","hidratos","frutas"] },
    { nombre:"Cena",      grupos:["proteinas","hidratos","frutas"] },
    { nombre:"Colación",  grupos:["colaciones"] }
];

function crearSelector(grupo, idx) {
    const select = document.createElement('select');
    select.id = `select-${grupo}-${idx}`;
    opciones[grupo].forEach(o=>{
        const opt = document.createElement('option');
        opt.value=o; opt.textContent=o;
        select.appendChild(opt);
    });
    return select;
}

function cargarSuplementosDia() {
    const div = document.getElementById('suplementos-dia');
    div.innerHTML = '<strong>Suplementos de hoy:</strong>';
    const key = new Date().toLocaleDateString('es-AR');
    const tomados = JSON.parse(localStorage.getItem('suplementosPorDia')||'{}')[key]||[];
    suplementos.forEach(sup=>{
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type='checkbox'; cb.checked=tomados.includes(sup);
        cb.onchange = ()=>{
            const m = JSON.parse(localStorage.getItem('suplementosPorDia')||'{}');
            const arr = m[key]||[];
            if (cb.checked) arr.push(sup); else {
                const i = arr.indexOf(sup); if (i>=0) arr.splice(i,1);
            }
            m[key]=[...new Set(arr)];
            localStorage.setItem('suplementosPorDia',JSON.stringify(m));
            cargarHistorial();
        };
        label.appendChild(cb);
        label.append(' '+sup);
        div.appendChild(label);
    });
}

function cargarComidas() {
    const ul = document.getElementById('comidas-lista');
    ul.innerHTML='';
    const hist = JSON.parse(localStorage.getItem('historialComidas')||'[]');
    const today = new Date().toLocaleDateString('es-AR');
    comidas.forEach((c,i)=>{
        const li = document.createElement('li');
        li.innerHTML = `<strong>${c.nombre}</strong> `;
        c.grupos.forEach(g=>{
            li.append(`${g.charAt(0).toUpperCase()+g.slice(1)}: `);
            li.append(crearSelector(g,i));
        });
        const btn = document.createElement('button');
        btn.textContent='Marcar';
        btn.onclick = ()=>marcarComida(i);
        const done = hist.some(x=>{
            const d = x.fecha.split(',')[0].split(' ')[0].trim();
            return d===today && x.nombre===c.nombre;
        });
        if (done) btn.disabled=true;
        li.append(btn);
        ul.append(li);
    });
}

function marcarComida(i) {
    const fecha = new Date().toLocaleString();
    const c = comidas[i];
    const sel = c.grupos.map(g=>{
        const s = document.getElementById(`select-${g}-${i}`);
        return `${g}: ${s.value}`;
    }).join(', ');
    let h = JSON.parse(localStorage.getItem('historialComidas')||'[]');
    h.push({ nombre:c.nombre, seleccion:sel, fecha });
    localStorage.setItem('historialComidas',JSON.stringify(h));
    cargarComidas();
    cargarHistorial();
}

function cargarHistorial() {
    const ul = document.getElementById('historial-lista');
    ul.innerHTML='';
    const h = JSON.parse(localStorage.getItem('historialComidas')||'[]');
    const dias = {};
    h.forEach(x=>{
        const d = x.fecha.split(',')[0].split(' ')[0].trim();
        (dias[d]||(dias[d]=[])).push(x);
    });
    Object.keys(dias).sort().forEach(fecha=>{
        const li = document.createElement('li');
        li.className='historial-fecha';
        let wc = JSON.parse(localStorage.getItem('waterCounts')||'{}')[fecha]||0;
        let sup = (JSON.parse(localStorage.getItem('suplementosPorDia')||'{}')[fecha]||[]).join(', ');
        li.textContent = `${fecha} ▼ | Agua: ${wc}${sup?(' | Sup: '+sup):''}`;
        ul.append(li);
        const inner = document.createElement('ul');
        dias[fecha].forEach(item=>{
            const li2 = document.createElement('li');
            li2.textContent = `${item.nombre} (${item.seleccion})`;
            inner.append(li2);
        });
        ul.append(inner);
        let open=true;
        li.onclick = ()=>{
            open=!open;
            inner.style.display = open?'':'none';
            li.textContent = open?`${fecha} ▼ | Agua: ${wc}${sup?(' | Sup: '+sup):''}`:
                              `${fecha} ▶ | Agua: ${wc}${sup?(' | Sup: '+sup):''}`;
        };
    });
}

// — Agua por día —
function getTodayKey(){ return new Date().toLocaleDateString('es-AR'); }
function getWaterCount(key){ return JSON.parse(localStorage.getItem('waterCounts')||'{}')[key]||0; }
function setWaterCount(key,v){
    const m=JSON.parse(localStorage.getItem('waterCounts')||'{}');
    m[key]=v; localStorage.setItem('waterCounts',JSON.stringify(m));
}

// — Inicialización al cargar la página —
window.addEventListener('DOMContentLoaded',()=>{
    // export/import
    document.getElementById('export-csv').onclick = exportarHistorialCSV;
    document.getElementById('import-csv').onchange = e=>{
        if(e.target.files[0]) importarHistorialCSV(e.target.files[0]);
    };
    // cargar app
    cargarComidas();
    cargarHistorial();
    cargarSuplementosDia();
    // agua
    const key = getTodayKey();
    let cnt = getWaterCount(key);
    const span = document.getElementById('water-count');
    span.textContent = cnt;
    document.getElementById('add-water').onclick = ()=>{
        cnt++; span.textContent=cnt; setWaterCount(key,cnt); cargarHistorial();
    };
    document.getElementById('reset-water').onclick = ()=>{
        cnt=0; span.textContent=cnt; setWaterCount(key,cnt); cargarHistorial();
    };
});
