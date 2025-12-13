// --- ESTADO GLOBAL (V0.15) ---
const defaultData = {
    cards: [],
    loans: [],
    // ACTUALIZADO: Tarjetas iniciales con color y red para el nuevo diseño
    debit: [
        { name: 'Mercado Pago', balance: 0, color: 'blue', network: 'mastercard' },
        { name: 'Nu', balance: 0, color: 'purple', network: 'mastercard' },
        { name: 'Klar', balance: 0, color: 'dark', network: 'mastercard' },
        { name: 'BBVA', balance: 0, color: 'blue', network: 'visa' },
        { name: 'Cashi', balance: 0, color: 'pink', network: 'visa' },
        { name: 'Uala', balance: 0, color: 'red', network: 'mastercard' }
    ],
    assets: [],
    incomes: [],
    history: [],

    incomeSources: [
        { id: 'salary', label: 'Nómina', icon: 'fa-briefcase', color: '#11998e' },
        { id: 'sale', label: 'Venta', icon: 'fa-store', color: '#00b4db' },
        { id: 'freelance', label: 'Extra', icon: 'fa-laptop-code', color: '#f12711' },
        { id: 'gift', label: 'Regalo', icon: 'fa-gift', color: '#82269e' },
        { id: 'other', label: 'Otro', icon: 'fa-piggy-bank', color: '#343a40' }
    ]
};



// --- DEFINICIÓN DE GRADIENTES (V0.17.1) ---
const cardGradients = {
    'blue': 'linear-gradient(135deg, #00b4db, #0083b0)',
    'purple': 'linear-gradient(135deg, #82269e, #a450c0)',
    'dark': 'linear-gradient(135deg, #232526, #414345)',
    'teal': 'linear-gradient(135deg, #11998e, #38ef7d)',
    'green': 'linear-gradient(135deg, #0f9b0f, #005c00)',
    'orange': 'linear-gradient(135deg, #f12711, #f5af19)',
    'red': 'linear-gradient(135deg, #cb2d3e, #ef473a)',
    'pink': 'linear-gradient(135deg, #ec008c, #fc6767)',
    'gold': 'linear-gradient(135deg, #f7971e, #ffd200)',

    'brand_nu': 'linear-gradient(135deg, #82269e 0%, #5d1875 100%)',          // Morado Profundo
    'brand_bbva': 'linear-gradient(135deg, #004481 0%, #1a2d52 100%)',        // Azul Marino
    'brand_mercado': 'linear-gradient(135deg, #009ee3 0%, #007eb5 100%)',     // Celeste
    'brand_santander': 'linear-gradient(135deg, #ec0000 0%, #b30000 100%)',   // Rojo Intenso
    'brand_cashi': 'linear-gradient(135deg, #ff005e 0%, #d6004f 100%)',       // Rosa Mexicano
    'brand_uala': 'linear-gradient(135deg, #ff5e5e 0%, #e04545 100%)',        // Coral/Rojo
    'brand_stori': 'linear-gradient(135deg, #00a5a3 0%, #007a79 100%)',       // Verde Agua
    'brand_hey': 'linear-gradient(135deg, #000000 0%, #333333 100%)'
};

// Configuración de tipos de ingreso
const incomeConfig = {
    'salary': { color: '#11998e', icon: 'fa-briefcase', label: 'Nómina' },
    'sale':     { color: '#00b4db', icon: 'fa-store', label: 'Venta' },
    'freelance':{ color: '#f12711', icon: 'fa-laptop-code', label: 'Extra' },
    'gift':     { color: '#82269e', icon: 'fa-gift', label: 'Regalo' },
    'other':    { color: '#343a40', icon: 'fa-piggy-bank', label: 'Otro' }
};

let appData = JSON.parse(JSON.stringify(defaultData));
let myChart = null;
let calendarViewDate = new Date();
let depositoPendiente = null; // Variable temporal para depósitos
let pendingActionCallback = null; // Variable temporal para confirmaciones generales


const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Préstamos
    new Sortable(document.getElementById('loans-body'), {
        handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const item = appData.loans.splice(evt.oldIndex, 1)[0];
            appData.loans.splice(evt.newIndex, 0, item); saveData();
        }
    });

    // 2. Tarjetas de Débito (Grid)
    const debitGrid = document.getElementById('debit-grid');
    if (debitGrid) {
        new Sortable(debitGrid, {
            animation: 150, ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                let oldI = evt.oldIndex;
                let newI = evt.newIndex;
                if (oldI < appData.debit.length && newI < appData.debit.length) {
                    const item = appData.debit.splice(oldI, 1)[0];
                    appData.debit.splice(newI, 0, item); saveData();
                } else { updateUI(); }
            }
        });
    }

    // 3. Activos
    new Sortable(document.getElementById('assets-body'), {
        handle: '.drag-handle', animation: 150,
        onEnd: (evt) => {
            const statics = document.querySelectorAll('.static-row').length;
            const oldI = evt.oldIndex - statics;
            const newI = evt.newIndex - statics;

            if (oldI >= 0 && newI >= 0) {
                const item = appData.assets.splice(oldI, 1)[0];
                appData.assets.splice(newI, 0, item); saveData();
            } else { updateUI(); }
        }
    });

    loadData();
    updateUI();
});

// --- SISTEMA DE LOGS (HISTORIAL V0.15) ---
function addLog(tipo, mensaje, monto) {
    if (!appData.history) appData.history = []; // Inicializar si no existe

    const fecha = new Date().toLocaleString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    appData.history.unshift({
        date: fecha,
        type: tipo, // 'pago' o 'deposito'
        msg: mensaje,
        amount: monto
    });

    if (appData.history.length > 50) appData.history.pop();
}

function openHistoryModal() {
    const listBody = document.getElementById('history-list-body');
    listBody.innerHTML = '';

    if (!appData.history || appData.history.length === 0) {
        listBody.innerHTML = '<div class="text-center text-muted p-4">No hay movimientos registrados.</div>';
    } else {
        appData.history.forEach(h => {
            let icon = '';
            let color = 'text-dark';

            if (h.type === 'pago') {
                icon = '<div class="bg-danger bg-opacity-10 p-2 rounded-circle me-3"><i class="fas fa-arrow-up text-danger"></i></div>';
                color = 'text-danger';
            } else {
                icon = '<div class="bg-success bg-opacity-10 p-2 rounded-circle me-3"><i class="fas fa-arrow-down text-success"></i></div>';
                color = 'text-success';
            }

            listBody.innerHTML += `
                <div class="d-flex align-items-center border-bottom py-2">
                    ${icon}
                    <div class="w-100">
                        <div class="fw-bold small">${h.msg}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${h.date}</div>
                    </div>
                    <div class="fw-bold ${color}">${fmt(h.amount)}</div>
                </div>
            `;
        });
    }
    new bootstrap.Modal(document.getElementById('historyModal')).show();
}

// --- HERRAMIENTAS DE CONFIRMACIÓN GENERAL ---
function askConfirmation(message, callback) {
    pendingActionCallback = callback;
    document.getElementById('confirm-msg-text').innerHTML = message;
    // Usamos el mismo modal de confirmación para todo
    new bootstrap.Modal(document.getElementById('confirmActionModal')).show();
}

// Se ejecuta al dar clic en "Sí, continuar" en el modal genérico
function executePendingAction() {
    if (pendingActionCallback) {
        pendingActionCallback();
        pendingActionCallback = null;
    }
    // Para el depósito específico que usaba otro modal, también lo cerramos por si acaso
    bootstrap.Modal.getInstance(document.getElementById('confirmActionModal')).hide();

    // Si estábamos usando el modal específico de depósito, ejecutamos su lógica
    if (depositoPendiente) ejecutarDepositoReal();
}


// --- 1. CARGA EXCEL ---
document.getElementById('excelInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        if (wb.Sheets['Resumen']) {
            parseResumen(wb.Sheets['Resumen']);
            appData.cards.forEach(c => { if (wb.Sheets[c.name]) parseDetail(c, wb.Sheets[c.name]); });
            saveData(); updateUI(); showToast("¡Datos actualizados!");
        }
    };
    reader.readAsArrayBuffer(file);
});

function parseResumen(sheet) {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    appData.cards = []; appData.loans = []; appData.assets = [];

    let section = 'CARDS';
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i]; if (!r || r.length === 0) continue; const c0 = (r[0] || "").toString();
        if (c0.includes("TOTAL GENERAL")) { section = 'WAIT'; continue; }
        if (c0.includes("OTRAS CUENTAS")) { section = 'LOANS'; i++; continue; }
        if (c0.includes("TOTAL SALDO A RECIBIR")) { section = 'WAIT2'; continue; }
        if (c0.includes("RESUMEN DE INGRESOS")) { section = 'ASSETS'; i++; continue; }
        if (c0.includes("TOTAL INGRESOS")) { section = 'DONE'; continue; }

        if (section === 'CARDS' && typeof r[1] === 'number') appData.cards.push({ name: r[0], limit: r[1], creditBalance: 0, transactions: [] });
        else if (section === 'LOANS' && typeof r[1] === 'number' && !c0.includes("TOTAL")) appData.loans.push({ name: r[0], original: r[1], paid: r[2] || 0 });
        else if (section === 'ASSETS' && typeof r[1] === 'number' && !c0.includes("Total") && !c0.includes("Saldo")) appData.assets.push({ name: r[0], amount: r[1] });
    }
}

function parseDetail(card, sheet) {
    const g3 = sheet['G3']; if (g3 && g3.v) card.creditBalance = parseFloat(g3.v) || 0;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 4 });
    rows.forEach(r => { if (r[0] && typeof r[1] === 'number') card.transactions.push({ desc: r[0], amount: r[1], months: r[2] || 1, paidCycles: r[3] || 0, category: 'General' }); });
}

// --- CÁLCULOS ---
function calcCard(c) {
    let rawDebt = 0;
    let monthlyPay = 0;

    c.transactions.forEach(t => {
        let months = t.months || 1;
        let monthlyAmount = t.amount / months;
        let paidAmount = monthlyAmount * (t.paidCycles || 0);
        let remaining = t.amount - paidAmount;

        if (remaining < 0) remaining = 0;
        rawDebt += remaining;

        if (remaining > 0.1) {
            monthlyPay += monthlyAmount;
        }
    });

    let finalDebt = rawDebt - (c.creditBalance || 0);
    if (finalDebt < 0) finalDebt = 0;

    return { debt: finalDebt, raw: rawDebt, avail: c.limit - finalDebt, monthly: monthlyPay };
}

// --- UI HELPERS ---
function getBankClass(name) {
    const n = name.toLowerCase();
    if (n.includes('nu')) return 'bg-nu';
    if (n.includes('bbva')) return 'bg-bbva';
    if (n.includes('mercado')) return 'bg-mercado';
    if (n.includes('klar')) return 'bg-klar';
    if (n.includes('cashi')) return 'bg-cashi';
    if (n.includes('uala')) return 'bg-uala';
    return 'bg-default';
}

function getBankColorHex(name) {
    const n = name.toLowerCase();
    if (n.includes('nu')) return '#82269e';
    if (n.includes('bbva')) return '#004481';
    if (n.includes('santander')) return '#ec0000';
    if (n.includes('mercado')) return '#009ee3';
    if (n.includes('stori')) return '#00a5a3';
    if (n.includes('didi')) return '#ff7e00';
    if (n.includes('rappi')) return '#ff414d';
    if (n.includes('klar')) return '#333333';
    if (n.includes('cashi')) return '#ff005e';
    if (n.includes('uala')) return '#ff3333';
    return '#4b6cb7';
}

function getCategoryIcon(cat) {
    const map = {
        'Comida': '<i class="fas fa-utensils text-warning"></i>',
        'Super': '<i class="fas fa-shopping-cart text-success"></i>',
        'Transporte': '<i class="fas fa-gas-pump text-primary"></i>',
        'Servicios': '<i class="fas fa-lightbulb text-warning"></i>',
        'Salud': '<i class="fas fa-heartbeat text-danger"></i>',
        'Entretenimiento': '<i class="fas fa-film text-info"></i>',
        'Ropa': '<i class="fas fa-tshirt text-secondary"></i>',
        'Educacion': '<i class="fas fa-book text-primary"></i>',
        'General': '<i class="fas fa-box text-muted"></i>'
    };
    return map[cat] || map['General'];
}

// --- UI UPDATE ---
function updateUI() {
    let tDebt = 0, tLimit = 0, tMonthlyGlobal = 0;
    const dt = document.getElementById('dashboard-table');
    dt.innerHTML = '';

    appData.cards.forEach(c => {
        const s = calcCard(c);
        tDebt += s.debt; tLimit += c.limit; tMonthlyGlobal += s.monthly;
        dt.innerHTML += `<tr><td class="ps-4">${c.name}</td><td class="text-end text-primary fw-bold">${fmt(s.monthly)}</td><td class="pe-4 text-end fw-bold text-dark">${fmt(s.debt)}</td></tr>`;
    });

    const totalMonthEl = document.getElementById('total-monthly-payment');
    if (totalMonthEl) totalMonthEl.innerText = fmt(tMonthlyGlobal);

    // Préstamos
    let tLoansRem = 0; let tCollected = 0; const lb = document.getElementById('loans-body'); lb.innerHTML = '';
    appData.loans.forEach((l, i) => {
        let rem = l.original - l.paid; tLoansRem += rem; tCollected += l.paid;
        let percent = l.original > 0 ? (l.paid / l.original) * 100 : 0;
        lb.innerHTML += `<tr><td><div class="d-flex align-items-center"><i class="fas fa-grip-vertical drag-handle me-2"></i><div class="w-100"><div class="fw-bold">${l.name}</div><div class="small text-muted" style="font-size:0.75rem">Orig: ${fmt(l.original)} | Pagado: ${fmt(l.paid)}</div><div class="progress mt-1" style="height: 4px; width: 100%; max-width: 120px; border-radius: 2px;"><div class="progress-bar bg-success" role="progressbar" style="width: ${percent}%"></div></div></div></div></td><td class="text-end fw-bold text-danger">${fmt(rem)}</td><td class="text-end"><button class="btn-icon btn-light text-warning me-1" onclick="openEditModal('loan',${i})"><i class="fas fa-pen" style="font-size:0.8rem"></i></button>${rem > 0 ? `<button class="btn-icon btn-icon-pay me-1" onclick="openPayModal(${i},'${l.name}')"><i class="fas fa-dollar-sign"></i></button>` : '<span class="badge bg-success me-1">Pagado</span>'}<button class="btn-icon btn-icon-del" onclick="delItem('loan',${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });

    // DÉBITO (V0.24 - ESPACIO CORREGIDO Y CENTRADO)
    let tDebit = 0; 
    const dGrid = document.getElementById('debit-grid'); 
    dGrid.innerHTML = ''; 
    
    if (!appData.debit) appData.debit = defaultData.debit;

    // 1. EL BUCLE DE TARJETAS
    appData.debit.forEach((d, i) => {
        tDebit += d.balance;
        
        // --- TUS ESTILOS DE COLOR Y RED (Se mantienen igual) ---
        let bgStyle = '';
        const n = d.name.toLowerCase();

        if (d.color && cardGradients[d.color] && !d.color.startsWith('brand_')) {
            bgStyle = cardGradients[d.color];
        } else {
            if (n.includes('nu')) bgStyle = cardGradients['brand_nu'];
            else if (n.includes('bbva') || n.includes('bancomer')) bgStyle = cardGradients['brand_bbva'];
            else if (n.includes('mercado')) bgStyle = cardGradients['brand_mercado'];
            else if (n.includes('santander')) bgStyle = cardGradients['brand_santander'];
            else if (n.includes('klar')) bgStyle = cardGradients['dark'];
            else if (n.includes('cashi')) bgStyle = cardGradients['brand_cashi'];
            else if (n.includes('uala')) bgStyle = cardGradients['brand_uala'];
            else if (n.includes('stori')) bgStyle = cardGradients['brand_stori'];
            else if (n.includes('hey')) bgStyle = 'linear-gradient(135deg, #111 0%, #333 100%)';
            else if (n.includes('azteca') || n.includes('guardadito')) bgStyle = cardGradients['green'];
            else if (n.includes('coppel') || n.includes('bancco')) bgStyle = cardGradients['gold'];
            else bgStyle = cardGradients['blue'];
        }

        let netIconClass = 'fab fa-cc-visa fa-lg';
        if (d.network) {
            if (d.network === 'mastercard') netIconClass = 'fab fa-cc-mastercard fa-lg';
            else if (d.network === 'amex') netIconClass = 'fab fa-cc-amex fa-lg';
        } else {
            if (n.includes('nu') || n.includes('mercado') || n.includes('klar') || n.includes('uala')) {
                netIconClass = 'fab fa-cc-mastercard fa-lg';
            }
        }

        // --- AQUÍ ESTÁ EL AJUSTE DE TAMAÑO ---
        // Cambiamos a col-12 (celular) col-sm-6 (tablet) col-lg-4 (pc)
        dGrid.innerHTML += `
        <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div class="mini-card text-white" 
                 onclick="openEditModal('debit', ${i})" 
                 style="background: ${bgStyle};">
                <div class="mb-auto opacity-75"><i class="${netIconClass}"></i></div>
                <div class="d-flex justify-content-between align-items-end w-100">
                    <div class="mini-card-name fw-bold pe-2" style="letter-spacing:0.5px; overflow:hidden; text-overflow:ellipsis;">${d.name}</div>
                    <div class="text-end flex-shrink-0">
                        <div class="small opacity-75" style="font-size: 0.6rem;">Saldo</div>
                        <div class="mini-card-balance fw-bold">${fmt(d.balance)}</div>
                    </div>
                </div>
            </div>
        </div>`;
    }); 

    // Botón Nueva Tarjeta (También ajustado)
    dGrid.innerHTML += `
    <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
        <div class="mini-card mini-card-add h-100" onclick="openDebitModal()">
            <i class="fas fa-plus-circle fa-2x mb-2"></i>
            <span class="small fw-bold">Nueva Tarjeta</span>
        </div>
    </div>`;

    // Activos
    let tAssets = 0; const ab = document.getElementById('assets-body'); ab.innerHTML = '';
    if (tCollected > 0) ab.innerHTML += `<tr class="static-row table-light"><td><div class="d-flex align-items-center"><span class="fw-bold text-primary"><i class="fas fa-undo-alt me-2"></i>Recuperado de Deudas</span></div></td><td class="text-end text-success fw-bold">${fmt(tCollected)}</td><td class="text-end"><button class="btn-icon btn-icon-del" style="cursor: not-allowed; opacity: 0.5;"><i class="fas fa-lock"></i></button></td></tr>`;
    if (tDebit > 0) ab.innerHTML += `<tr class="static-row table-light"><td><div class="d-flex align-items-center"><span class="fw-bold text-dark"><i class="fas fa-credit-card me-2 text-primary"></i>Saldo en Tarjetas (Débito)</span></div></td><td class="text-end text-success fw-bold">${fmt(tDebit)}</td><td class="text-end"><button class="btn-icon btn-icon-del" style="cursor: not-allowed; opacity: 0.5;"><i class="fas fa-lock"></i></button></td></tr>`;

    appData.assets.forEach((a, i) => {
        tAssets += a.amount;
        ab.innerHTML += `<tr><td><div class="d-flex align-items-center"><i class="fas fa-grip-vertical drag-handle me-2"></i><span class="fw-bold">${a.name}</span></div></td><td class="text-end text-success fw-bold">${fmt(a.amount)}</td><td class="text-end"><button class="btn-icon btn-light text-warning me-1" onclick="openEditModal('asset',${i})"><i class="fas fa-pen" style="font-size:0.8rem"></i></button><button class="btn-icon btn-icon-del" onclick="delItem('asset',${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });

    // Totales
    // E. Ingresos (V0.18 Visual)
    let tInc = 0; 
    const il = document.getElementById('income-list-body'); 
    il.innerHTML = '';
    
    const visInc = appData.incomes.filter(inc => {
        const d = new Date(inc.date + 'T00:00:00');
        return d.getMonth() === calendarViewDate.getMonth() && d.getFullYear() === calendarViewDate.getFullYear();
    });
    visInc.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    visInc.forEach(inc => { 
        tInc += inc.amount; 
        const type = inc.type || 'other';
        const cfg = incomeConfig[type] || incomeConfig['other']; // Usa la config global
        
        // Formatear fecha corta (Ej: 15 Oct)
        const dateObj = new Date(inc.date + 'T00:00:00');
        const dayStr = dateObj.getDate();
        
        il.innerHTML += `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td class="py-2">
                <div class="d-flex align-items-center">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-3" 
                         style="width: 32px; height: 32px; background-color: ${cfg.color}20; color: ${cfg.color};">
                        <i class="fas ${cfg.icon} small"></i>
                    </div>
                    <div>
                        <div class="fw-bold text-dark small">${cfg.label}</div>
                        <div class="text-muted" style="font-size: 0.7rem;">${dayStr} de ${document.getElementById('month-label').innerText.split(' ')[0]}</div>
                    </div>
                </div>
            </td>
            <td class="text-end fw-bold text-success py-2">${fmt(inc.amount)}</td>
        </tr>`; 
    });

    document.getElementById('kpi-debt').innerText = fmt(tDebt);
    document.getElementById('kpi-available').innerText = fmt(tLimit - tDebt);
    document.getElementById('kpi-loans').innerText = fmt(tLoansRem);
    const granTotal = tAssets + tDebit + tCollected + appData.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    document.getElementById('kpi-assets').innerText = fmt(granTotal);
    document.getElementById('total-assets-sum').innerText = fmt(tAssets + tCollected + tDebit);
    document.getElementById('total-income-display').innerText = fmt(tInc);

    renderCalendar(); updateSelectors(); updateChart();
}

function updateChart() {
    const c = document.getElementById('mainChart').getContext('2d'); if (myChart) myChart.destroy();
    const bg = appData.cards.map(c => getBankColorHex(c.name));
    myChart = new Chart(c, { type: 'bar', data: { labels: appData.cards.map(x => x.name), datasets: [{ label: 'Deuda', data: appData.cards.map(x => calcCard(x).debt), backgroundColor: bg, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } } } })
}

// --- MODALES (Genéricos) ---
function openDebitModal() { 
    document.getElementById('new-debit-name').value = ''; 
    document.getElementById('new-debit-balance').value = ''; 
    document.getElementById('new-debit-network').value = 'visa';
    // Aseguramos que el primero esté seleccionado
    document.getElementById('c_blue').checked = true; 
    
    updateCardPreview(); 
    new bootstrap.Modal(document.getElementById('addDebitModal')).show(); 
}

function saveNewDebit() { 
    const name = document.getElementById('new-debit-name').value.trim(); 
    const balanceVal = document.getElementById('new-debit-balance').value;
    const balance = parseFloat(balanceVal); 
    const network = document.getElementById('new-debit-network').value;
    
    // Obtener color
    const colorRadio = document.querySelector('input[name="card-color"]:checked');
    const color = colorRadio ? colorRadio.value : 'blue';

    // Referencias al DOM para la animación de error
    const modalEl = document.getElementById('addDebitModal');
    const modalContent = modalEl.querySelector('.modal-content');
    
    // Validamos: Nombre no vacío Y balance numérico válido (puede ser 0)
    if(name && !isNaN(balance) && balance >= 0) { 
        
        // --- GUARDADO EXITOSO ---
        appData.debit.push({
            name: name, 
            balance: balance,
            network: network,
            color: color
        }); 
        
        saveData(); 
        updateUI(); 
        
        // Limpiamos errores previos si los hubo
        removeErrorVisuals(modalContent);
        
        bootstrap.Modal.getInstance(modalEl).hide(); 
        showToast('Tarjeta creada con éxito');
        
    } else { 
        // --- ERROR VISUAL (SIN ALERT) ---
        
        // 1. Activar animación de sacudida
        modalContent.classList.remove('modal-shake'); // Reset por si acaso
        void modalContent.offsetWidth; // Truco para reiniciar la animación CSS
        modalContent.classList.add('modal-shake');

        // 2. Mostrar mensaje de error dentro del modal
        let errorMsg = modalContent.querySelector('.error-msg-inline');
        
        // Si no existe el mensaje, lo creamos dinámicamente
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'error-msg-inline';
            // Lo insertamos justo antes del footer del modal
            const modalFooter = modalContent.querySelector('.modal-footer');
            modalContent.insertBefore(errorMsg, modalFooter);
        }
        
        errorMsg.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Completa el nombre y un monto válido';
        errorMsg.style.display = 'block';

        // 3. Quitar la animación después de que termine (500ms)
        setTimeout(() => {
            modalContent.classList.remove('modal-shake');
        }, 500);
    } 
}

// Helper para limpiar el mensaje cuando se cierre o se guarde bien
function removeErrorVisuals(content) {
    const msg = content.querySelector('.error-msg-inline');
    if(msg) msg.style.display = 'none';
    content.classList.remove('modal-shake');
}

// --- VISTA PREVIA DE TARJETA ---
// --- VISTA PREVIA DE TARJETA (Actualizada) ---
function updateCardPreview() {
    const name = document.getElementById('new-debit-name').value || 'NOMBRE BANCO';
    const balance = parseFloat(document.getElementById('new-debit-balance').value) || 0;
    const network = document.getElementById('new-debit-network').value;
    
    const colorRadio = document.querySelector('input[name="card-color"]:checked');
    const colorVal = colorRadio ? colorRadio.value : 'blue';

    document.getElementById('preview-name').innerText = name.toUpperCase();
    document.getElementById('preview-balance').innerText = fmt(balance);

    const iconEl = document.getElementById('preview-network-icon');
    iconEl.className = ''; 
    if (network === 'visa') iconEl.className = 'fab fa-cc-visa fa-2x';
    else if (network === 'mastercard') iconEl.className = 'fab fa-cc-mastercard fa-2x';
    else if (network === 'amex') iconEl.className = 'fab fa-cc-amex fa-2x';

    // Usamos la variable global
    document.getElementById('new-card-preview').style.background = cardGradients[colorVal];
}

function openAssetModal(forcedType) { const sel = document.getElementById('asset-type-select'); document.getElementById('asset-custom-name').value = ''; document.getElementById('asset-amount').value = ''; sel.value = 'Billetes'; toggleCustomAssetInput(); new bootstrap.Modal(document.getElementById('addAssetModal')).show(); }
function toggleCustomAssetInput() { const type = document.getElementById('asset-type-select').value; const input = document.getElementById('asset-custom-name'); if (type === 'Otro') { input.classList.remove('d-none'); input.focus(); } else { input.classList.add('d-none'); } }
function saveNewAsset() { const type = document.getElementById('asset-type-select').value; let name = type; if (type === 'Otro') { name = document.getElementById('asset-custom-name').value.trim(); if (!name) return; } const amount = parseFloat(document.getElementById('asset-amount').value); if (amount > 0) { const idx = appData.assets.findIndex(a => a.name === name); if (idx >= 0) appData.assets[idx].amount += amount; else appData.assets.push({ name: name, amount: amount }); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addAssetModal')).hide(); } }
// --- GESTIÓN DEL MODAL DE EDICIÓN (V0.16) ---

// --- GESTIÓN DEL MODAL DE EDICIÓN (V0.16 CON BLOQUEO) ---

function openEditModal(type, idx) {
    // 1. Obtener referencias
    const header = document.getElementById('edit-modal-header');
    const nameIn = document.getElementById('edit-name');
    const amtIn = document.getElementById('edit-amount'); // Referencia al input del saldo
    
    const actionsBlock = document.getElementById('quick-actions-block'); 
    const inputContainer = document.getElementById('quick-input-container');

    // 2. Guardar índices ocultos
    document.getElementById('edit-type').value = type;
    document.getElementById('edit-idx').value = idx;

    let item;
    let colorClass = 'bg-secondary'; 

    // 3. Resetear visualización
    if(inputContainer) {
        inputContainer.classList.add('d-none'); 
        document.getElementById('quick-amount-val').value = ''; 
    }

    // 4. Lógica según el tipo
    if (type === 'loan') {
        item = appData.loans[idx];
        colorClass = 'bg-danger'; 
        if(actionsBlock) actionsBlock.classList.add('d-none');
        
        nameIn.value = item.name;
        amtIn.value = item.original;
        
        // LOS PRÉSTAMOS SÍ SE EDITAN MANUALMENTE (No tienen botones rápidos aún)
        amtIn.readOnly = false; 
        amtIn.classList.remove('bg-light'); // Que se vea blanco (editable)
    } 
    else if (type === 'debit') {
        item = appData.debit[idx];
        colorClass = 'bg-primary'; 
        if(actionsBlock) actionsBlock.classList.remove('d-none');
        
        nameIn.value = item.name;
        amtIn.value = item.balance;
        
        // --- AQUÍ ESTÁ EL CAMBIO ---
        // BLOQUEAMOS EL CAMPO PARA OBLIGAR A USAR LOS BOTONES
        amtIn.readOnly = true; 
        amtIn.classList.add('bg-light'); // Se ve grisaseo para indicar bloqueo
    } 
    else if (type === 'asset') {
        item = appData.assets[idx];
        colorClass = 'bg-success'; 
        if(actionsBlock) actionsBlock.classList.remove('d-none');
        
        nameIn.value = item.name;
        amtIn.value = item.amount;
        
        // BLOQUEAMOS EL CAMPO TAMBIÉN EN ACTIVOS
        amtIn.readOnly = true;
        amtIn.classList.add('bg-light');
    }

    // 5. Aplicar estilos y abrir
    header.className = `modal-header border-bottom-0 text-white ${colorClass}`;
    header.style.background = ''; 
    
    new bootstrap.Modal(document.getElementById('editModal')).show();
}
// --- LÓGICA DE AJUSTE EN LÍNEA (V0.16 INLINE) ---

// --- LÓGICA DE TRANSFERENCIAS RÁPIDAS (V0.16) ---

let currentQuickOp = ''; // '+' o '-'

// 1. Mostrar cajita y llenar el selector inteligentemente
function showQuickInput(op) {
    currentQuickOp = op;
    const container = document.getElementById('quick-input-container');
    const select = document.getElementById('quick-context-select');
    const btn = document.getElementById('quick-apply-btn');
    const input = document.getElementById('quick-amount-val');
    
    // Obtenemos qué estamos editando (Débito o Activo)
    const type = document.getElementById('edit-type').value; 
    const idx = document.getElementById('edit-idx').value;
    const currentName = document.getElementById('edit-name').value;

    container.classList.remove('d-none');
    input.value = '';
    input.focus();
    select.innerHTML = ''; // Limpiar opciones anteriores

    // --- CONFIGURACIÓN DE OPCIONES ---
    
    // CASO A: RESTAR DINERO (-)
    if (op === '-') {
        btn.className = "btn btn-danger fw-bold";
        btn.innerHTML = '<i class="fas fa-minus"></i> Restar';
        
        // Opción 1: Gasto simple (desaparece el dinero)
        let opt1 = document.createElement('option');
        opt1.value = 'expense';
        opt1.text = `💸 Gasto / Pago (Desaparece de ${currentName})`;
        select.add(opt1);

        // Opciones de Transferencia (A dónde se fue)
        if (type === 'debit') {
            // Si es Banco, puede ir a Efectivo
            appData.assets.forEach((a, i) => {
                let opt = document.createElement('option');
                opt.value = `asset_${i}`;
                opt.text = `📥 Mover a: ${a.name}`;
                select.add(opt);
            });
        } else if (type === 'asset') {
            // Si es Efectivo, puede ir a Banco
            appData.debit.forEach((d, i) => {
                let opt = document.createElement('option');
                opt.value = `debit_${i}`;
                opt.text = `🏦 Depositar en: ${d.name}`;
                select.add(opt);
            });
        }
    } 
    // CASO B: SUMAR DINERO (+)
    else {
        btn.className = "btn btn-success fw-bold";
        btn.innerHTML = '<i class="fas fa-plus"></i> Sumar';

        // Opción 1: Ingreso Nuevo (dinero mágico/nómina)
        let opt1 = document.createElement('option');
        opt1.value = 'income';
        opt1.text = `💰 Ingreso Nuevo / Sin Concepto`;
        select.add(opt1);

        // Opciones de Transferencia (De dónde vino)
        if (type === 'debit') {
            // Si entra a Banco, puede venir de Efectivo
            appData.assets.forEach((a, i) => {
                let opt = document.createElement('option');
                opt.value = `asset_${i}`;
                opt.text = `📤 Traer de: ${a.name}`;
                select.add(opt);
            });
        } else if (type === 'asset') {
            // Si entra a Efectivo, puede venir del Banco
            appData.debit.forEach((d, i) => {
                let opt = document.createElement('option');
                opt.value = `debit_${i}`;
                opt.text = `🏧 Retirar de: ${d.name}`;
                select.add(opt);
            });
        }
    }
}

function hideQuickInput() {
    document.getElementById('quick-input-container').classList.add('d-none');
}

// 3. Ejecutar la operación real
function applyQuickInput() {
    const amount = parseFloat(document.getElementById('quick-amount-val').value);
    const contextVal = document.getElementById('quick-context-select').value;
    
    // Datos del item actual (el que estamos editando)
    const type = document.getElementById('edit-type').value;
    const idx = parseInt(document.getElementById('edit-idx').value);
    const currentName = document.getElementById('edit-name').value; // Usamos el nombre actual por si se editó
    
    if (!amount || amount <= 0) { showToast('Monto inválido', 'error'); return; }

    // Referencia al objeto actual en memoria
    let currentItem;
    if (type === 'debit') currentItem = appData.debit[idx];
    else if (type === 'asset') currentItem = appData.assets[idx];
    else return; // No aplica para préstamos por ahora

    // --- LÓGICA DE TRANSFERENCIA ---
    
    // 1. Modificar el item actual
    if (currentQuickOp === '+') {
        if(type === 'debit') currentItem.balance += amount;
        else currentItem.amount += amount;
    } else {
        if(type === 'debit') currentItem.balance -= amount;
        else currentItem.amount -= amount;
    }

    // 2. Modificar el "Otro lado" (si es transferencia)
    let logMsg = '';
    
    if (contextVal === 'expense') {
        logMsg = `Gasto/Retiro de ${currentName}`;
    } 
    else if (contextVal === 'income') {
        logMsg = `Ingreso directo a ${currentName}`;
    } 
    else {
        // Es una transferencia (ej. "asset_0" o "debit_2")
        const [targetType, targetIdx] = contextVal.split('_');
        const tIdx = parseInt(targetIdx);
        
        if (targetType === 'asset') {
            const target = appData.assets[tIdx];
            if (currentQuickOp === '-') { 
                // Resté de aquí -> Movi a Asset
                target.amount += amount; 
                logMsg = `Movimiento: ${currentName} ➝ ${target.name}`;
            } else { 
                // Sumé aquí <- Traje de Asset
                if(target.amount >= amount) {
                    target.amount -= amount;
                    logMsg = `Movimiento: ${target.name} ➝ ${currentName}`;
                } else {
                    showToast(`Saldo insuficiente en ${target.name}`, 'error');
                    // Revertimos el cambio local porque falló la transferencia
                    if(type === 'debit') currentItem.balance -= amount; else currentItem.amount -= amount;
                    return;
                }
            }
        } 
        else if (targetType === 'debit') {
            const target = appData.debit[tIdx];
            if (currentQuickOp === '-') {
                // Resté de aquí -> Movi a Debit
                target.balance += amount;
                logMsg = `Movimiento: ${currentName} ➝ ${target.name}`;
            } else {
                // Sumé aquí <- Traje de Debit
                if(target.balance >= amount) {
                    target.balance -= amount;
                    logMsg = `Movimiento: ${target.name} ➝ ${currentName}`;
                } else {
                    showToast(`Saldo insuficiente en ${target.name}`, 'error');
                    if(type === 'debit') currentItem.balance -= amount; else currentItem.amount -= amount;
                    return;
                }
            }
        }
    }

    // 3. Guardar, Log y UI
    addLog(currentQuickOp === '+' ? 'deposito' : 'pago', logMsg, amount);
    saveData();
    updateUI();

    // 4. Actualizar visualmente el modal abierto para reflejar el nuevo saldo
    const newVal = (type === 'debit') ? currentItem.balance : currentItem.amount;
    document.getElementById('edit-amount').value = newVal.toFixed(2);

    hideQuickInput();
    showToast(`✅ ${logMsg} (${fmt(amount)})`);
}

// (Asegúrate de que la función openEditModal que te pasé antes siga ahí, 
// solo actualizamos la parte visual del HTML, la lógica de openEditModal sigue igual)

// NUEVA FUNCIÓN: Eliminar directamente desde el modal de edición
function deleteFromEdit() {
    const type = document.getElementById('edit-type').value;
    const idx = document.getElementById('edit-idx').value;
    
    // Cerrar modal actual
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    
    // Llamar a la función de borrado existente (que tiene su propia confirmación)
    delItem(type, idx); 
}

function saveEdit() {
    const type = document.getElementById('edit-type').value;
    const idx = document.getElementById('edit-idx').value;
    const name = document.getElementById('edit-name').value;
    const amt = parseFloat(document.getElementById('edit-amount').value);

    if (name && amt >= 0) {
        let oldAmt = 0; 

        if (type === 'loan') {
            appData.loans[idx].name = name;
            appData.loans[idx].original = amt;
        } 
        else if (type === 'debit') {
            oldAmt = appData.debit[idx].balance;
            appData.debit[idx].name = name;
            appData.debit[idx].balance = amt;
            
            // Log si hubo cambio
            if (Math.abs(oldAmt - amt) > 0.1) {
                const diff = amt - oldAmt;
                addLog('ajuste', `Ajuste manual en ${name}`, Math.abs(diff));
            }
        } 
        else if (type === 'asset') {
            oldAmt = appData.assets[idx].amount;
            appData.assets[idx].name = name;
            appData.assets[idx].amount = amt;
            
            if (Math.abs(oldAmt - amt) > 0.1) {
                const diff = amt - oldAmt;
                addLog('ajuste', `Ajuste manual en ${name}`, Math.abs(diff));
            }
        }
        
        saveData();
        updateUI();
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        showToast('✅ Cambios guardados');
    } else {
        alert("Datos inválidos");
    }
}

function delItem(type, idx) { document.getElementById('del-type').value = type; document.getElementById('del-idx').value = idx; new bootstrap.Modal(document.getElementById('deleteModal')).show(); }
function confirmDelete() { const type = document.getElementById('del-type').value; const idx = parseInt(document.getElementById('del-idx').value); if (type === 'loan') appData.loans.splice(idx, 1); else if (type === 'debit') appData.debit.splice(idx, 1); else if (type === 'asset') appData.assets.splice(idx, 1); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide(); }

// --- CALENDARIO Y OTROS ---
// --- LÓGICA DE CALENDARIO (V0.18 MEJORADA) ---

// ==========================================
// 8. BLOQUE MAESTRO: CALENDARIO Y FUENTES (V0.19.1 FIXED)
// ==========================================

// 1. DIBUJAR EL CALENDARIO PRINCIPAL
function changeMonth(n) { 
    calendarViewDate.setMonth(calendarViewDate.getMonth() + n); 
    updateUI(); 
}

function renderCalendar() { 
    const now = new Date(); 
    const y = calendarViewDate.getFullYear(); 
    const m = calendarViewDate.getMonth(); 
    const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]; 
    document.getElementById('month-label').innerText = `${names[m]} ${y}`; 
    
    const first = new Date(y, m, 1).getDay(); 
    const dim = new Date(y, m + 1, 0).getDate(); 
    const off = first === 0 ? 6 : first - 1; 
    
    const g = document.getElementById('calendar-days'); 
    g.innerHTML = ''; 
    
    // Asegurar datos iniciales
    if(!appData.incomeSources || appData.incomeSources.length === 0) {
        appData.incomeSources = defaultData.incomeSources || [
            { id: 'salary', label: 'Nómina', icon: 'fa-briefcase', color: '#11998e' },
            { id: 'other', label: 'Otro', icon: 'fa-piggy-bank', color: '#343a40' }
        ];
    }

    for (let i = 0; i < off; i++) g.innerHTML += `<div></div>`; 
    
    for (let i = 1; i <= dim; i++) { 
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`; 
        const incomeData = appData.incomes.find(x => x.date === iso);
        let content = `${i}`; 
        let styles = '';
        
        if (incomeData) {
            // BUSCAR LA FUENTE (MEJORA V0.19.2)
            // Intentamos encontrar la fuente original. Si fue borrada, usamos la PRIMERA de la lista actual.
            const src = appData.incomeSources.find(s => s.id === incomeData.type) || appData.incomeSources[0]; 
            
            // Si por alguna razón extrema no hay fuentes (array vacío), usamos un placeholder gris
            const color = src ? src.color : '#ccc';
            const icon = src ? src.icon : 'fa-question-circle';

            content = `
                <div class="d-flex flex-column align-items-center justify-content-center h-100">
                    <span style="font-size:0.7rem; opacity:0.8;">${i}</span>
                    <i class="fas ${icon}" style="color:${color}; font-size:0.9rem;"></i>
                    <span style="font-size:0.6rem; color:${color}; font-weight:bold;">${fmt(incomeData.amount).split('.')[0]}</span>
                </div>
            `;
            styles = `border: 1px solid ${color}; background-color: rgba(255,255,255,0.9);`;
        }
        g.innerHTML += `<div class="calendar-day" style="${styles}" onclick="dateClick('${iso}')">${content}</div>`;
    } 
}

// 2. CLIC EN UN DÍA (ABRIR MODAL)
function dateClick(dateStr) { 
    // 1. Configuración inicial
    document.getElementById('cal-modal-date').value = dateStr;
    const title = document.getElementById('cal-modal-title');
    const sub = document.getElementById('cal-modal-subtitle');
    const amountIn = document.getElementById('cal-modal-amount');
    const deleteBtn = document.getElementById('btn-delete-income');
    const targetSelect = document.getElementById('cal-target-account');
    
    // Referencias de memoria
    const oldAmtInput = document.getElementById('cal-old-amount');
    const oldLinkInput = document.getElementById('cal-old-link');

    // Formato Fecha
    const dateObj = new Date(dateStr + 'T00:00:00');
    title.innerText = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

    // Llenar Selector
    targetSelect.innerHTML = '';
    const groupDebit = document.createElement('optgroup'); groupDebit.label = "Bancos";
    appData.debit.forEach((d, i) => groupDebit.appendChild(new Option(d.name, `debit_${i}`)));
    const groupAsset = document.createElement('optgroup'); groupAsset.label = "Efectivo";
    appData.assets.forEach((a, i) => groupAsset.appendChild(new Option(a.name, `asset_${i}`)));
    targetSelect.add(groupDebit); targetSelect.add(groupAsset);

    // 2. Buscar datos existentes
    const existing = appData.incomes.find(x => x.date === dateStr);
    
    if (existing) {
        sub.innerText = "Editar movimiento";
        amountIn.value = existing.amount;
        renderIncomeOptions(existing.type);
        
        // Guardar memoria para reversión
        oldAmtInput.value = existing.amount;
        oldLinkInput.value = existing.linkedAccount || ""; 

        // Seleccionar la cuenta donde se guardó
        if (existing.linkedAccount) {
            targetSelect.value = existing.linkedAccount;
        }
        
        deleteBtn.classList.remove('d-none');
    } else {
        sub.innerText = "Nuevo ingreso";
        amountIn.value = '';
        renderIncomeOptions(); 
        
        // Limpiar memoria
        oldAmtInput.value = "0";
        oldLinkInput.value = "";
        
        deleteBtn.classList.add('d-none');
    }

    new bootstrap.Modal(document.getElementById('calendarModal')).show();
    setTimeout(() => amountIn.focus(), 500);
}

// 3. RENDERIZAR LAS OPCIONES DE FUENTES (Botones de colores)
function renderIncomeOptions(selectedId = null) {
    const container = document.getElementById('income-options-container');
    container.innerHTML = '';
    
    if(!appData.incomeSources || appData.incomeSources.length === 0) appData.incomeSources = defaultData.incomeSources;

    appData.incomeSources.forEach((src, index) => {
        const isChecked = (selectedId === src.id) || (!selectedId && index === 0);
        const checkedAttr = isChecked ? 'checked' : '';
        
        // --- CAMBIO AQUÍ: SIEMPRE TRUE ---
        // Ahora permitimos borrar cualquiera, siempre que no sea la única que queda
        const canDelete = appData.incomeSources.length > 1; 

        const html = `
            <div class="income-option-wrapper">
                <input type="radio" class="btn-check" name="income-type" id="inc_${src.id}" value="${src.id}" ${checkedAttr} 
                       onchange="updateSourceStyles()">
                
                <label class="income-option-label" for="inc_${src.id}" data-color="${src.color}">
                    <i class="fas ${src.icon} fa-lg mb-2"></i>
                    <span class="small fw-bold text-center" style="line-height:1.1">${src.label}</span>
                </label>

                ${canDelete ? `<div class="btn-delete-source" onclick="deleteSource(${index}, event)" title="Borrar fuente"><i class="fas fa-times"></i></div>` : ''}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
    
    updateSourceStyles();
}

// 4. FUNCIÓN AUXILIAR DE ESTILOS (CRÍTICA PARA QUE NO DESAPAREZCAN)
function updateSourceStyles() {
    const allLabels = document.querySelectorAll('.income-option-label');
    allLabels.forEach(lbl => {
        const inputId = lbl.getAttribute('for');
        const input = document.getElementById(inputId);
        const color = lbl.getAttribute('data-color');
        
        if (input && input.checked) {
            // Si está seleccionado: Color sólido
            lbl.style.background = `linear-gradient(135deg, ${color}, ${color})`;
            lbl.style.color = 'white';
            lbl.style.borderColor = 'transparent';
        } else {
            // Si no: Blanco normal
            lbl.style.background = 'white';
            lbl.style.color = '#6c757d';
            lbl.style.borderColor = '#eee';
        }
    });
}

// 5. GUARDAR INGRESO
function saveCalendarIncome() { 
    // Datos del Formulario
    const dateStr = document.getElementById('cal-modal-date').value;
    const amountVal = document.getElementById('cal-modal-amount').value;
    const newAmount = parseFloat(amountVal);
    const typeRadio = document.querySelector('input[name="income-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'other';
    const newTarget = document.getElementById('cal-target-account').value; // Siempre hay uno seleccionado

    // Datos de Memoria (Para reversión inteligente)
    const oldAmount = parseFloat(document.getElementById('cal-old-amount').value) || 0;
    const oldLink = document.getElementById('cal-old-link').value;

    const modalEl = document.getElementById('calendarModal');
    const modalContent = modalEl.querySelector('.modal-content');

    if (newAmount > 0) {
        
        // PASO 1: REVERTIR EL PASADO (Si había un registro previo)
        // Restamos el monto viejo de la cuenta vieja
        if (oldLink && oldAmount > 0) {
            const [oldType, oldIdxStr] = oldLink.split('_');
            const oldIdx = parseInt(oldIdxStr);
            
            if (oldType === 'debit' && appData.debit[oldIdx]) {
                appData.debit[oldIdx].balance -= oldAmount;
            } else if (oldType === 'asset' && appData.assets[oldIdx]) {
                appData.assets[oldIdx].amount -= oldAmount;
            }
        }

        // PASO 2: APLICAR EL NUEVO (Siempre se ejecuta)
        const [newType, newIdxStr] = newTarget.split('_');
        const newIdx = parseInt(newIdxStr);
        let targetName = "";

        if (newType === 'debit') {
            appData.debit[newIdx].balance += newAmount;
            targetName = appData.debit[newIdx].name;
        } else {
            appData.assets[newIdx].amount += newAmount;
            targetName = appData.assets[newIdx].name;
        }
        
        // Log inteligente
        if(oldAmount > 0) {
            // Si es edición
            addLog('ajuste', `Actualización ingreso (${type}) en ${targetName}`, newAmount);
            showToast(`✅ Saldo actualizado en ${targetName}`);
        } else {
            // Si es nuevo
            addLog('deposito', `Ingreso (${type}) sumado a ${targetName}`, newAmount);
            showToast(`✅ Ingreso sumado a ${targetName}`);
        }

        // PASO 3: GUARDAR EL REGISTRO
        appData.incomes = appData.incomes.filter(x => x.date !== dateStr);
        
        appData.incomes.push({ 
            date: dateStr, 
            amount: newAmount, 
            type: type,
            linkedAccount: newTarget // Siempre guardamos el vínculo
        });
        
        saveData(); 
        updateUI(); 
        removeErrorVisuals(modalContent);
        bootstrap.Modal.getInstance(modalEl).hide(); 
        
    } else {
        // Error visual
        modalContent.classList.remove('modal-shake'); 
        void modalContent.offsetWidth; 
        modalContent.classList.add('modal-shake');
        const errorMsg = modalContent.querySelector('.error-msg-inline');
        errorMsg.style.display = 'block';
        errorMsg.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Ingresa un monto válido';
        setTimeout(() => modalContent.classList.remove('modal-shake'), 500);
    }
}
// 6. ELIMINAR INGRESO (Y RESTAR SALDO)
function deleteCalendarIncome() {
    const dateStr = document.getElementById('cal-modal-date').value;
    const item = appData.incomes.find(x => x.date === dateStr);
    
    if (item) {
        // Si el ingreso estaba vinculado a una cuenta, LE QUITAMOS EL DINERO
        if (item.linkedAccount) {
            const [tType, tIdxStr] = item.linkedAccount.split('_');
            const tIdx = parseInt(tIdxStr);
            let accName = "";
            
            if (tType === 'debit' && appData.debit[tIdx]) {
                appData.debit[tIdx].balance -= item.amount;
                accName = appData.debit[tIdx].name;
            } else if (tType === 'asset' && appData.assets[tIdx]) {
                appData.assets[tIdx].amount -= item.amount;
                accName = appData.assets[tIdx].name;
            }
            
            if(typeof addLog === 'function') {
                addLog('ajuste', `Ingreso eliminado (Restado de ${accName})`, item.amount);
            }
            showToast(`🗑️ Eliminado y restado de ${accName}`);
        } else {
            showToast('🗑️ Eliminado del calendario');
        }

        // Borrar del array
        appData.incomes = appData.incomes.filter(x => x.date !== dateStr);
        
        saveData(); 
        updateUI(); 
        bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide(); 
    }
}
// 7. GESTIÓN DE FUENTES PERSONALIZADAS
function openSourceManager() {
    bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
    document.getElementById('new-source-name').value = '';
    // Resetear preview
    document.getElementById('sc_green').checked = true;
    setSourceIcon('fa-briefcase'); 
    new bootstrap.Modal(document.getElementById('manageSourceModal')).show();
}

function setSourceIcon(icon) {
    document.getElementById('new-source-icon').value = icon;
    updateSourcePreview();
}

function updateSourcePreview() {
    const name = document.getElementById('new-source-name').value || 'Nombre';
    const icon = document.getElementById('new-source-icon').value;
    const color = document.querySelector('input[name="source-color"]:checked').value;
    
    const box = document.getElementById('source-preview-box');
    const iconEl = document.getElementById('source-preview-icon');
    const textEl = document.getElementById('source-preview-text');
    
    box.style.background = color;
    box.style.color = 'white';
    box.style.borderColor = 'transparent';
    
    iconEl.className = `fas ${icon} fa-lg mb-2`;
    textEl.innerText = name;
}

function saveNewSource() {
    const name = document.getElementById('new-source-name').value.trim();
    const icon = document.getElementById('new-source-icon').value;
    const color = document.querySelector('input[name="source-color"]:checked').value;
    
    if(name) {
        const id = 'custom_' + Date.now();
        appData.incomeSources.push({ id, label: name, icon, color });
        saveData();
        
        bootstrap.Modal.getInstance(document.getElementById('manageSourceModal')).hide();
        
        // Reabrir calendario
        const dateStr = document.getElementById('cal-modal-date').value;
        dateClick(dateStr); 
        
        // Seleccionar la nueva
        setTimeout(() => renderIncomeOptions(id), 300);
        showToast('Fuente creada');
    } else {
        alert("Escribe un nombre");
    }
}

function deleteSource(index, event) {
    event.preventDefault(); 
    event.stopPropagation(); 

    // --- REGLA DE SEGURIDAD ---
    if (appData.incomeSources.length <= 1) {
        alert("⚠️ Debes mantener al menos una fuente de ingreso.");
        return;
    }

    if(confirm("¿Seguro que quieres eliminar esta fuente?")) {
        // Borrar
        appData.incomeSources.splice(index, 1);
        saveData();
        
        // Determinar nueva selección segura
        // (Intentamos seleccionar la primera disponible para que no quede nada en el limbo)
        const firstAvailable = appData.incomeSources[0].id;
        
        // Actualizamos vista
        renderIncomeOptions(firstAvailable);
        
        // Actualizamos el preview de estilo también
        setTimeout(updateSourceStyles, 50);
        
        showToast('Fuente eliminada');
    }
}
// Helper para oscurecer un poco el color del gradiente
function adjustColor(color, amount) {
    return color; // Simplificación, retorna el mismo para gradiente plano o implementa lógica HEX
}

function updateSelectors() { const s = document.getElementById('card-selector'); if (s.options.length !== appData.cards.length) { const v = s.value; s.innerHTML = ''; const cOpt = document.getElementById('custom-select-options'); cOpt.innerHTML = ''; appData.cards.forEach((c, i) => { let o = document.createElement('option'); o.value = i; o.text = c.name; s.add(o); let co = document.createElement('span'); co.className = 'custom-option'; if (i == (v || 0)) co.classList.add('selected'); let ic = '<i class="fas fa-credit-card me-2 opacity-50"></i>'; if (c.name.toLowerCase().includes('nu')) ic = '<i class="fas fa-cube me-2 text-primary"></i>'; if (c.name.toLowerCase().includes('mercado')) ic = '<i class="fas fa-handshake me-2 text-info"></i>'; if (c.name.toLowerCase().includes('bbva')) ic = '<i class="fas fa-university me-2 text-primary"></i>'; co.innerHTML = `${ic} ${c.name}`; co.addEventListener('click', function () { s.value = i; document.getElementById('custom-select-text').innerHTML = this.innerHTML; document.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected')); this.classList.add('selected'); document.getElementById('custom-card-select').classList.remove('open'); renderCardDetail(i) }); cOpt.appendChild(co) }); s.value = v || 0; if (appData.cards.length > 0) { const initIdx = v || 0; const ops = cOpt.querySelectorAll('.custom-option'); if (ops[initIdx]) { document.getElementById('custom-select-text').innerHTML = ops[initIdx].innerHTML; ops[initIdx].classList.add('selected') } renderCardDetail(s.value) } } }
document.querySelector('.custom-select-trigger').addEventListener('click', function () { document.getElementById('custom-card-select').classList.toggle('open') }); window.addEventListener('click', function (e) { const s = document.getElementById('custom-card-select'); if (!s.contains(e.target)) s.classList.remove('open') });
function renderCardDetail(i) {
    if (!appData.cards[i]) return;
    const c = appData.cards[i]; const s = calcCard(c);
    const p = c.limit > 0 ? (s.debt / c.limit) * 100 : 0;

    document.getElementById('card-name').innerText = c.name;
    document.getElementById('card-limit').innerText = `Lim: ${fmt(c.limit)}`;
    document.getElementById('credit-balance-alert').classList.toggle('d-none', !(c.creditBalance > 0));
    document.getElementById('credit-balance-amount').innerText = fmt(c.creditBalance);
    document.getElementById('card-used').innerText = fmt(s.debt);
    document.getElementById('card-avail').innerText = fmt(s.avail);

    const cm = document.getElementById('card-monthly'); if (cm) cm.innerText = fmt(s.monthly);
    document.getElementById('card-percent-text').innerText = `${p.toFixed(1)}%`;
    document.getElementById('card-progress').style.width = `${p}%`;
    const h = document.getElementById('card-visual-bg');
    const n = c.name.toLowerCase();

    let bg = 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)';
    if (n.includes('nu')) bg = 'linear-gradient(135deg, #82269e 0%, #a450c0 100%)';
    else if (n.includes('bbva')) bg = 'linear-gradient(135deg, #004481 0%, #2dcccd 100%)';
    else if (n.includes('santander')) bg = 'linear-gradient(135deg, #ec0000 0%, #ff4b4b 100%)';
    else if (n.includes('mercado')) bg = 'linear-gradient(135deg, #009ee3 0%, #00c6fb 100%)';
    else if (n.includes('stori')) bg = 'linear-gradient(135deg, #00a5a3 0%, #35dcb4 100%)';
    else if (n.includes('didi')) bg = 'linear-gradient(135deg, #ff7e00 0%, #ffac4d 100%)';
    h.style.background = bg;

    const t = document.getElementById('transactions-body'); t.innerHTML = '';
    if (c.transactions.length === 0) {
        t.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Sin movimientos</td></tr>`;
    } else {
        c.transactions.forEach((x, ix) => {
            let pd = (x.amount / (x.months || 1)) * (x.paidCycles || 0);
            let r = x.amount - pd; if (r < 0) r = 0;
            let catIcon = getCategoryIcon(x.category || 'General');

            t.innerHTML += `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-3 fs-5">${catIcon}</div>
                        <div>
                            <div class="fw-bold text-dark">${x.desc}</div>
                            <div class="small text-muted">${x.paidCycles}/${x.months} pagos</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border">${x.months} M</span></td>
                <td class="text-end text-muted small">${fmt(x.amount)}</td>
                <td class="text-end fw-bold text-dark">${fmt(r)}</td>
                <td class="text-end">
                    <button class="btn-icon btn-icon-del shadow-sm" onclick="delTransaction(${ix})"><i class="fas fa-trash text-danger" style="font-size:0.8rem"></i></button>
                </td>
            </tr>`;
        });
    }
}

// --- V0.12: FUNCIONES DE SISTEMA (BACKUP & PRIVACIDAD) ---

function togglePrivacy() {
    document.body.classList.toggle('privacy-active');
    const icon = document.getElementById('privacy-icon');
    if (document.body.classList.contains('privacy-active')) {
        icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash');
    } else {
        icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye');
    }
}

function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
    const dlAnchorElem = document.createElement('a');
    const date = new Date().toISOString().slice(0,10);
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `finanzas_respaldo_${date}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
}

function openRestoreModal() {
    document.getElementById('backup-file-input').value = '';
    new bootstrap.Modal(document.getElementById('restoreBackupModal')).show();
}

function processRestoreFile() {
    const input = document.getElementById('backup-file-input');
    const file = input.files[0];
    if (!file) { showToast('Selecciona un archivo JSON', 'error'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if (json.cards && json.loans) {
                appData = json;
                saveData();
                updateUI();
                bootstrap.Modal.getInstance(document.getElementById('restoreBackupModal')).hide();
                showToast('✅ Datos restaurados correctamente');
            } else {
                showToast('Archivo inválido', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Error al leer el archivo', 'error');
        }
    };
    reader.readAsText(file);
}

// --- TOAST ---
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const msgContainer = document.getElementById('toast-msg');

    if (type === 'error') {
        toastEl.classList.remove('bg-success');
        toastEl.classList.add('bg-danger');
    } else {
        toastEl.classList.remove('bg-danger');
        toastEl.classList.add('bg-success');
    }

    msgContainer.innerHTML = message;

    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}

function openPurchaseModal() { const s = document.getElementById('card-selector'); const i = s.value; if (!appData.cards[i]) { alert("Carga Excel primero"); return } document.getElementById('purchase-card-name').innerText = appData.cards[i].name; document.getElementById('new-purch-desc').value = ''; document.getElementById('new-purch-amount').value = ''; document.getElementById('new-purch-months').value = '1'; new bootstrap.Modal(document.getElementById('addPurchaseModal')).show() }
function savePurchase() {
    const i = document.getElementById('card-selector').value;
    const cat = document.getElementById('new-purch-cat').value;
    const d = document.getElementById('new-purch-desc').value;
    const a = parseFloat(document.getElementById('new-purch-amount').value);
    const m = parseInt(document.getElementById('new-purch-months').value);

    if (d && a > 0) {
        appData.cards[i].transactions.push({
            desc: d, amount: a, months: m, paidCycles: 0, category: cat
        });
        saveData(); updateUI();
        bootstrap.Modal.getInstance(document.getElementById('addPurchaseModal')).hide();
        showToast('Compra registrada exitosamente');
    } else { alert("Completa datos"); }
}

// --- V0.13: PAGO TARJETA ---
function openPayCardModal() {
    const cardIdx = document.getElementById('card-selector').value;
    if (!appData.cards[cardIdx]) { showToast('Selecciona una tarjeta', 'error'); return; }

    document.getElementById('pay-card-target-name').innerText = appData.cards[cardIdx].name;
    const sourceSelect = document.getElementById('pay-source-account');
    sourceSelect.innerHTML = '';

    appData.debit.forEach((acc, idx) => {
        let opt = document.createElement('option');
        opt.value = idx;
        opt.text = `${acc.name} ($${fmt(acc.balance)})`;
        opt.setAttribute('data-balance', acc.balance);
        sourceSelect.add(opt);
    });

    document.getElementById('pay-card-amount').value = '';
    document.getElementById('pay-remaining-balance').innerText = '---';
    new bootstrap.Modal(document.getElementById('payCardModal')).show();
}

function fillFullDebt() {
    const cardIdx = document.getElementById('card-selector').value;
    const card = appData.cards[cardIdx];
    const s = calcCard(card);
    document.getElementById('pay-card-amount').value = s.debt.toFixed(2);
    calcRemainingBalance();
}

function calcRemainingBalance() {
    const select = document.getElementById('pay-source-account');
    const amountIn = document.getElementById('pay-card-amount').value;
    const display = document.getElementById('pay-remaining-balance');

    if (select.selectedIndex === -1) return;

    const currentBalance = parseFloat(select.options[select.selectedIndex].getAttribute('data-balance'));
    const amountToPay = parseFloat(amountIn) || 0;
    const remaining = currentBalance - amountToPay;

    display.innerText = fmt(remaining);
    if (remaining < 0) {
        display.className = "fw-bold text-danger";
        display.innerText = "Saldo Insuficiente";
    } else {
        display.className = "fw-bold text-success";
    }
}

function processCardPayment() {
    const cardIdx = document.getElementById('card-selector').value;
    const debitIdx = document.getElementById('pay-source-account').value;
    const amount = parseFloat(document.getElementById('pay-card-amount').value);

    if (!amount || amount <= 0) { showToast('Ingresa un monto válido', 'error'); return; }
    const debitAcc = appData.debit[debitIdx];
    if (debitAcc.balance < amount) { showToast(`Fondos insuficientes en ${debitAcc.name}`, 'error'); return; }

    // Cerrar modal de datos
    bootstrap.Modal.getInstance(document.getElementById('payCardModal')).hide();

    // Confirmación
    const msg = `Vas a pagar <strong>${fmt(amount)}</strong><br>a ${appData.cards[cardIdx].name} desde ${debitAcc.name}`;
    askConfirmation(msg, () => {
        debitAcc.balance -= amount;
        if (!appData.cards[cardIdx].creditBalance) appData.cards[cardIdx].creditBalance = 0;
        appData.cards[cardIdx].creditBalance += amount;

        // LOG V0.15
        addLog('pago', `Pago a tarjeta ${appData.cards[cardIdx].name}`, amount);

        saveData(); updateUI(); renderCardDetail(cardIdx);
        showToast(`✅ Pago aplicado correctamente`);
    });
}

// --- LÓGICA DE DEPÓSITO ESPECÍFICA (CORREGIDA) ---


// 2. Función que abre el modal de datos
function openDepositModal() {
    if (appData.assets.length === 0) { showToast('No tienes efectivo registrado', 'error'); return; }
    if (appData.debit.length === 0) { showToast('Registra una cuenta primero', 'error'); return; }

    const srcSelect = document.getElementById('dep-source-asset');
    const targetSelect = document.getElementById('dep-target-account');
    srcSelect.innerHTML = ''; targetSelect.innerHTML = '';

    appData.assets.forEach((a, i) => {
        let opt = document.createElement('option');
        opt.value = i; opt.text = `${a.name} (Disp: ${fmt(a.amount)})`; srcSelect.add(opt);
    });
    appData.debit.forEach((d, i) => {
        let opt = document.createElement('option');
        opt.value = i; opt.text = d.name; targetSelect.add(opt);
    });

    document.getElementById('dep-amount').value = '';
    new bootstrap.Modal(document.getElementById('depositModal')).show();
}

// 3. Función que VALIDA y abre la ventana de CONFIRMACIÓN
function processDeposit() {
    const assetIdx = document.getElementById('dep-source-asset').value;
    const debitIdx = document.getElementById('dep-target-account').value;
    const amount = parseFloat(document.getElementById('dep-amount').value);

    // Validaciones
    if (!amount || amount <= 0) { showToast('Ingresa un monto válido', 'error'); return; }

    const asset = appData.assets[assetIdx];
    const account = appData.debit[debitIdx];

    if (asset.amount < amount) { showToast(`No tienes suficientes fondos en ${asset.name}`, 'error'); return; }

    // A. Guardamos los datos para usarlos después
    depositoPendiente = {
        assetIndex: assetIdx,
        debitIndex: debitIdx,
        monto: amount
    };

    // B. Cerramos el modal de llenado de datos
    bootstrap.Modal.getInstance(document.getElementById('depositModal')).hide();

    // C. Preparamos el texto del modal de confirmación ESPECÍFICO
    document.getElementById('texto-confirmar-deposito').innerHTML =
        `¿Depositar <span class="text-dark">${fmt(amount)}</span><br>de ${asset.name} a ${account.name}?`;

    // D. Abrimos la ventana emergente específica
    new bootstrap.Modal(document.getElementById('modalConfirmarDeposito')).show();
}

// 4. Función que EJECUTA el movimiento REAL (Al dar clic en "Sí, Depositar")
function ejecutarDepositoReal() {
    if (depositoPendiente) {
        const asset = appData.assets[depositoPendiente.assetIndex];
        const account = appData.debit[depositoPendiente.debitIndex];
        const amount = depositoPendiente.monto;

        // 1. Restar y Sumar
        asset.amount -= amount;
        account.balance += amount;

        // 2. LOG (Historial v0.15)
        // Nota: Asegúrate de tener la función addLog en tu código
        if (typeof addLog === 'function') {
            addLog('deposito', `Depósito de ${asset.name} a ${account.name}`, amount);
        }

        // 3. Guardar y Actualizar (CRÍTICO)
        saveData();
        updateUI();

        // 4. Cerrar el modal y limpiar
        bootstrap.Modal.getInstance(document.getElementById('modalConfirmarDeposito')).hide();
        depositoPendiente = null;

        showToast(`✅ Depósito registrado con éxito`);
    }
}
// --- BORRADO ---
function delTransaction(ix) {
    const cardIdx = document.getElementById('card-selector').value;
    if (appData.cards[cardIdx] && appData.cards[cardIdx].transactions[ix]) {
        const transaction = appData.cards[cardIdx].transactions[ix];
        document.getElementById('del-trans-name').innerText = transaction.desc;
        document.getElementById('del-trans-index').value = ix;
        new bootstrap.Modal(document.getElementById('deleteTransModal')).show();
    }
}

function confirmDeleteTransaction() {
    const cardIdx = document.getElementById('card-selector').value;
    const transIdx = document.getElementById('del-trans-index').value;
    if (cardIdx !== "" && transIdx !== "") {
        appData.cards[cardIdx].transactions.splice(transIdx, 1);
        saveData(); updateUI(); renderCardDetail(cardIdx);
        bootstrap.Modal.getInstance(document.getElementById('deleteTransModal')).hide();
        showToast('Movimiento eliminado');
    }
}

function addNewLoan() { const n = document.getElementById('nl-name').value; const a = parseFloat(document.getElementById('nl-amount').value); if (n && a) { appData.loans.push({ name: n, original: a, paid: 0 }); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addLoanModal')).hide(); document.getElementById('nl-name').value = ''; document.getElementById('nl-amount').value = '' } }
function openPayModal(i, n) { document.getElementById('pay-label').innerText = `Abonar a: ${n}`; document.getElementById('pay-idx').value = i; document.getElementById('pay-amount').value = ''; new bootstrap.Modal(document.getElementById('payModal')).show() }
function submitPay() { const i = document.getElementById('pay-idx').value; const a = parseFloat(document.getElementById('pay-amount').value); if (a > 0) { appData.loans[i].paid += a; saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('payModal')).hide() } }

function loadData() { const s = localStorage.getItem('finanzasApp_Split_v1'); if (s) appData = JSON.parse(s); }
function saveData() { localStorage.setItem('finanzasApp_Split_v1', JSON.stringify(appData)); }