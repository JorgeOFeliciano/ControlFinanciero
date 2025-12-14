// --- ESTADO GLOBAL (V0.15) ---
const defaultData = {
    cards: [],
    loans: [],
    // Tarjetas iniciales (Solo se muestran si NO has cargado Excel)
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

// --- DEFINICIÓN DE GRADIENTES ---
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

    'brand_nu': 'linear-gradient(135deg, #82269e 0%, #5d1875 100%)',
    'brand_bbva': 'linear-gradient(135deg, #004481 0%, #1a2d52 100%)',
    'brand_mercado': 'linear-gradient(135deg, #009ee3 0%, #007eb5 100%)',
    'brand_santander': 'linear-gradient(135deg, #ec0000 0%, #b30000 100%)',
    'brand_cashi': 'linear-gradient(135deg, #ff005e 0%, #d6004f 100%)',
    'brand_uala': 'linear-gradient(135deg, #ff5e5e 0%, #e04545 100%)',
    'brand_stori': 'linear-gradient(135deg, #00a5a3 0%, #007a79 100%)',
    'brand_hey': 'linear-gradient(135deg, #000000 0%, #333333 100%)'
};

// Configuración de tipos de ingreso
const incomeConfig = {
    'salary': { color: '#11998e', icon: 'fa-briefcase', label: 'Nómina' },
    'sale': { color: '#00b4db', icon: 'fa-store', label: 'Venta' },
    'freelance': { color: '#f12711', icon: 'fa-laptop-code', label: 'Extra' },
    'gift': { color: '#82269e', icon: 'fa-gift', label: 'Regalo' },
    'other': { color: '#343a40', icon: 'fa-piggy-bank', label: 'Otro' }
};

let appData = JSON.parse(JSON.stringify(defaultData));
let myChart = null;
let calendarViewDate = new Date();
let depositoPendiente = null;
let pendingActionCallback = null;

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Préstamos
    const loanBody = document.getElementById('loans-body');
    if (loanBody) {
        new Sortable(loanBody, {
            handle: '.drag-handle', animation: 150, ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                const item = appData.loans.splice(evt.oldIndex, 1)[0];
                appData.loans.splice(evt.newIndex, 0, item); saveData();
            }
        });
    }

    // 2. Tarjetas de Débito (Grid)
    const debitGrid = document.getElementById('debit-grid');
    if (debitGrid) {
        new Sortable(debitGrid, {
            animation: 150, ghostClass: 'sortable-ghost',
            onEnd: (evt) => {
                let oldI = evt.oldIndex;
                let newI = evt.newIndex;
                // Verificamos límites porque el botón "Nueva Tarjeta" también es hijo del grid
                if (oldI < appData.debit.length && newI < appData.debit.length) {
                    const item = appData.debit.splice(oldI, 1)[0];
                    appData.debit.splice(newI, 0, item); saveData();
                } else { updateUI(); }
            }
        });
    }

    // 3. Activos
    const assetsBody = document.getElementById('assets-body');
    if (assetsBody) {
        new Sortable(assetsBody, {
            handle: '.drag-handle', animation: 150,
            onEnd: (evt) => {
                const statics = document.querySelectorAll('.static-row').length;
                const oldI = evt.oldIndex - statics;
                const newI = evt.newIndex - statics;

                if (oldI >= 0 && newI >= 0 && appData.assets[oldI]) {
                    const item = appData.assets.splice(oldI, 1)[0];
                    appData.assets.splice(newI, 0, item); saveData();
                } else { updateUI(); }
            }
        });
    }

    loadData();
    updateUI();
});

// --- SISTEMA DE LOGS ---
function addLog(tipo, mensaje, monto) {
    if (!appData.history) appData.history = [];
    const fecha = new Date().toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    appData.history.unshift({ date: fecha, type: tipo, msg: mensaje, amount: monto });
    if (appData.history.length > 50) appData.history.pop();
}

function openHistoryModal() {
    const listBody = document.getElementById('history-list-body');
    listBody.innerHTML = '';
    if (!appData.history || appData.history.length === 0) {
        listBody.innerHTML = '<div class="text-center text-muted p-4">No hay movimientos registrados.</div>';
    } else {
        appData.history.forEach(h => {
            let icon = h.type === 'pago' ? '<div class="bg-danger bg-opacity-10 p-2 rounded-circle me-3"><i class="fas fa-arrow-up text-danger"></i></div>' : '<div class="bg-success bg-opacity-10 p-2 rounded-circle me-3"><i class="fas fa-arrow-down text-success"></i></div>';
            let color = h.type === 'pago' ? 'text-danger' : 'text-success';
            listBody.innerHTML += `<div class="d-flex align-items-center border-bottom py-2">${icon}<div class="w-100"><div class="fw-bold small">${h.msg}</div><div class="text-muted" style="font-size: 0.75rem;">${h.date}</div></div><div class="fw-bold ${color}">${fmt(h.amount)}</div></div>`;
        });
    }
    new bootstrap.Modal(document.getElementById('historyModal')).show();
}

// --- HERRAMIENTAS DE CONFIRMACIÓN ---
function askConfirmation(message, callback) {
    pendingActionCallback = callback;
    document.getElementById('confirm-msg-text').innerHTML = message;
    new bootstrap.Modal(document.getElementById('confirmActionModal')).show();
}

function executePendingAction() {
    if (pendingActionCallback) { pendingActionCallback(); pendingActionCallback = null; }
    bootstrap.Modal.getInstance(document.getElementById('confirmActionModal')).hide();
    if (depositoPendiente) ejecutarDepositoReal();
}

// ==========================================
//  LÓGICA DE EXCEL (ACTUALIZADA Y ROBUSTA)
// ==========================================
document.getElementById('excelInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            
            // Buscar hoja "Resumen" o usar la primera
            const sheetName = wb.SheetNames.includes("Resumen") ? "Resumen" : wb.SheetNames[0];
            
            if (wb.Sheets[sheetName]) {
                parseResumen(wb.Sheets[sheetName]);
                
                // Procesar detalles de tarjetas de CRÉDITO
                appData.cards.forEach(c => { 
                    if (wb.Sheets[c.name]) parseDetail(c, wb.Sheets[c.name]); 
                });
                
                saveData(); 
                updateUI(); 
                showToast("¡Datos importados correctamente!");
            }
        } catch (err) {
            console.error(err);
            alert("Error al leer el archivo. Revisa el formato.");
        }
    };
    reader.readAsArrayBuffer(file);
    // Limpiar input para permitir recargar el mismo archivo
    e.target.value = '';
});

function parseResumen(sheet) {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // 1. LIMPIEZA: Borramos los datos viejos y los defaults
    appData.cards = []; 
    appData.loans = []; 
    appData.assets = [];
    appData.debit = []; // <--- ESTO ES CLAVE: Borra las tarjetas de ejemplo (Nu, Klar...)

    let section = 'WAIT'; // Estados: 'CREDIT', 'LOANS', 'DEBIT'

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i]; 
        if (!r || r.length === 0) continue; 
        
        const c0 = (r[0] || "").toString().trim();

        // --- DETECTOR DE SECCIONES ---
        if (c0.includes("TUS TARJETAS DE CRÉDITO")) { section = 'CREDIT'; i++; continue; }
        if (c0.includes("OTRAS CUENTAS")) { section = 'LOANS'; i++; continue; }
        if (c0.includes("RESUMEN DE INGRESOS")) { section = 'DEBIT'; i++; continue; }

        // --- PROCESAMIENTO ---
        
        // A) Tarjetas de Crédito
        if (section === 'CREDIT' && typeof r[1] === 'number') {
            appData.cards.push({ 
                name: r[0], 
                limit: r[1], 
                creditBalance: 0, 
                transactions: [],
                cutDay: 1,  // Default
                payDays: 20 // Default
            });
        }
        
        // B) Préstamos
        else if (section === 'LOANS' && typeof r[1] === 'number') {
            appData.loans.push({ 
                name: r[0], 
                original: r[1], 
                paid: r[2] || 0 
            });
        }
        
        // C) DÉBITO Y EFECTIVO (AQUÍ ESTÁ LA LÓGICA QUE PEDISTE)
        else if (section === 'DEBIT' && typeof r[1] === 'number') {
            const name = r[0];
            const balance = r[1];
            
            // Heurística: ¿Es efectivo o tarjeta?
            if (name.toLowerCase().includes('efectivo') || name.toLowerCase().includes('colchón')) {
                // Va a Activos/Efectivo
                appData.assets.push({ name: name, amount: balance });
            } else {
                // Va a Tarjetas de Débito
                
                // Autodetectar Color y Red
                let color = 'blue';
                let network = 'mastercard';
                const nLower = name.toLowerCase();

                if (nLower.includes('visa')) network = 'visa';

                if (nLower.includes('nu')) color = 'purple';
                else if (nLower.includes('bbva')) color = 'blue';
                else if (nLower.includes('santander')) color = 'red';
                else if (nLower.includes('mercado')) color = 'blue'; // MercadoPago
                else if (nLower.includes('cashi')) color = 'pink';
                else if (nLower.includes('uala')) color = 'red';
                else if (nLower.includes('stori')) color = 'green';
                else if (nLower.includes('azteca') || nLower.includes('guardadito')) color = 'green';
                else if (nLower.includes('coppel')) color = 'gold';
                else if (nLower.includes('klar')) color = 'dark';

                appData.debit.push({ 
                    name: name, 
                    balance: balance,
                    color: color,
                    network: network
                });
            }
        }
    }
}

function parseDetail(card, sheet) {
    const g3 = sheet['G3']; 
    if (g3 && g3.v) card.creditBalance = parseFloat(g3.v) || 0;
    
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 4 });
    rows.forEach(r => { 
        if (r[0] && typeof r[1] === 'number') {
            card.transactions.push({ 
                desc: r[0], 
                amount: r[1], 
                months: r[2] || 1, 
                paidCycles: r[3] || 0, 
                category: 'General' 
            }); 
        }
    });
}

// --- CÁLCULOS Y FECHAS ---
function getCardDates(c) {
    const cutDay = parseInt(c.cutDay) || 1;
    const payDays = parseInt(c.payDays) || 20;
    const now = new Date();
    const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const cutoffThisMonth = new Date(now.getFullYear(), now.getMonth(), cutDay);
    
    let baseCutoff;
    if (todayZero.getTime() > cutoffThisMonth.getTime()) {
        baseCutoff = new Date(now.getFullYear(), now.getMonth(), cutDay);
    } else {
        baseCutoff = new Date(now.getFullYear(), now.getMonth() - 1, cutDay);
    }

    let limitOfBaseCutoff = new Date(baseCutoff);
    limitOfBaseCutoff.setDate(limitOfBaseCutoff.getDate() + payDays);

    let visualCutoff, visualLimit;
    if (todayZero.getTime() <= limitOfBaseCutoff.getTime()) {
        visualCutoff = baseCutoff;
        visualLimit = limitOfBaseCutoff;
    } else {
        let nextCut = new Date(baseCutoff);
        nextCut.setMonth(nextCut.getMonth() + 1);
        let nextLim = new Date(nextCut);
        nextLim.setDate(nextLim.getDate() + payDays);
        visualCutoff = nextCut;
        visualLimit = nextLim;
    }

    return {
        displayCutoff: visualCutoff,
        displayLimit: visualLimit,
        calculationCutoff: visualCutoff
    };
}

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
        if (remaining > 0.1) monthlyPay += monthlyAmount;
    });

    let saldoFavor = c.creditBalance || 0;
    let available = c.limit - rawDebt + saldoFavor;
    let netDebt = rawDebt - saldoFavor;
    if (netDebt < 0) netDebt = 0;

    return {
        debt: netDebt,
        raw: rawDebt,
        creditBalance: saldoFavor,
        avail: available,
        monthly: monthlyPay
    };
}

// --- UI HELPERS ---
function getBankColorHex(name) {
    const n = name.toLowerCase();
    if (n.includes('nu')) return '#82269e';
    if (n.includes('bbva')) return '#004481';
    if (n.includes('santander')) return '#ec0000';
    if (n.includes('mercado')) return '#009ee3';
    if (n.includes('stori')) return '#00a5a3';
    if (n.includes('klar')) return '#333333';
    if (n.includes('cashi')) return '#ff005e';
    if (n.includes('uala')) return '#ff3333';
    return '#4b6cb7';
}

// --- UI UPDATE PRINCIPAL ---
function updateUI() {
    let tDebt = 0, tLimit = 0, tMonthlyGlobal = 0;

    appData.cards.forEach(c => {
        const s = calcCard(c);
        tDebt += s.debt;
        tLimit += c.limit;
        tMonthlyGlobal += s.monthly;
    });

    if (!appData.cards) appData.cards = [];

    // 1. Grilla Crédito
    const cGrid = document.getElementById('credit-grid');
    if (cGrid) {
        cGrid.innerHTML = '';
        appData.cards.forEach((c, i) => {
            let bgStyle = '';
            const n = c.name.toLowerCase();
            if (c.color && cardGradients[c.color] && !c.color.startsWith('brand_')) {
                bgStyle = cardGradients[c.color];
            } else {
                if (n.includes('nu')) bgStyle = cardGradients['brand_nu'];
                else if (n.includes('bbva')) bgStyle = cardGradients['brand_bbva'];
                else bgStyle = cardGradients['dark'];
            }
            
            let netIconClass = 'fab fa-cc-visa fa-lg';
            if (c.network === 'mastercard') netIconClass = 'fab fa-cc-mastercard fa-lg';
            else if (c.network === 'amex') netIconClass = 'fab fa-cc-amex fa-lg';

            cGrid.innerHTML += `
            <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
                <div class="mini-card text-white" onclick="selectCreditCard(${i})" style="background: ${bgStyle};">
                    <div class="mb-auto opacity-75">
                         <i class="${netIconClass}"></i>
                         <i class="fas fa-trash-alt float-end text-white-50" style="cursor:pointer; font-size:0.8rem;" onclick="event.stopPropagation(); deleteCreditCard(${i})"></i>
                    </div>
                    <div class="d-flex justify-content-between align-items-end w-100">
                        <div class="mini-card-name fw-bold pe-2" style="overflow:hidden; text-overflow:ellipsis;">${c.name}</div>
                        <div class="text-end flex-shrink-0">
                            <div class="small opacity-75" style="font-size: 0.6rem;">Deuda</div>
                            <div class="mini-card-balance fw-bold">${fmt(calcCard(c).debt)}</div>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        cGrid.innerHTML += `<div class="col-12 col-sm-6 col-lg-4 col-xl-3"><div class="mini-card mini-card-add h-100" onclick="openCreditModal()"><i class="fas fa-plus-circle fa-2x mb-2"></i><span class="small fw-bold">Nueva Tarjeta</span></div></div>`;
    }

    // 2. Préstamos
    let tLoansRem = 0; let tCollected = 0; 
    const lb = document.getElementById('loans-body'); 
    lb.innerHTML = '';
    appData.loans.forEach((l, i) => {
        let rem = l.original - l.paid; tLoansRem += rem; tCollected += l.paid;
        let percent = l.original > 0 ? (l.paid / l.original) * 100 : 0;
        lb.innerHTML += `<tr><td><div class="d-flex align-items-center"><i class="fas fa-grip-vertical drag-handle me-2"></i><div class="w-100"><div class="fw-bold">${l.name}</div><div class="small text-muted" style="font-size:0.75rem">Orig: ${fmt(l.original)} | Pagado: ${fmt(l.paid)}</div><div class="progress mt-1" style="height: 4px; width: 100%; max-width: 120px;"><div class="progress-bar bg-success" style="width: ${percent}%"></div></div></div></div></td><td class="text-end fw-bold text-danger">${fmt(rem)}</td><td class="text-end"><button class="btn-icon btn-light text-warning me-1" onclick="openEditModal('loan',${i})"><i class="fas fa-pen" style="font-size:0.8rem"></i></button>${rem > 0 ? `<button class="btn-icon btn-icon-pay me-1" onclick="openPayModal(${i},'${l.name}')"><i class="fas fa-dollar-sign"></i></button>` : '<span class="badge bg-success me-1">Pagado</span>'}<button class="btn-icon btn-icon-del" onclick="delItem('loan',${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });

    // 3. Débito (Grid)
    let tDebit = 0;
    const dGrid = document.getElementById('debit-grid');
    dGrid.innerHTML = '';

    if (!appData.debit) appData.debit = [];

    appData.debit.forEach((d, i) => {
        tDebit += d.balance;
        
        // --- AQUÍ ESTÁ LA CORRECCIÓN DE COLOR ---
        // 1. Empezamos con el color guardado (si existe)
        let bgStyle = d.color && cardGradients[d.color] ? cardGradients[d.color] : cardGradients['blue'];

        // 2. Si es el azul por defecto, intentamos DETECTAR por el nombre del banco
        // Esto arregla que las tarjetas importadas (que no tienen color guardado) se vean bien
        if (bgStyle === cardGradients['blue']) {
            const n = d.name.toLowerCase();
            if (n.includes('nu')) bgStyle = cardGradients['brand_nu'];
            else if (n.includes('bbva')) bgStyle = cardGradients['brand_bbva'];
            else if (n.includes('mercado')) bgStyle = cardGradients['brand_mercado'];
            else if (n.includes('santander')) bgStyle = cardGradients['brand_santander'];
            else if (n.includes('cashi')) bgStyle = cardGradients['brand_cashi'];
            else if (n.includes('uala')) bgStyle = cardGradients['brand_uala'];
            else if (n.includes('stori')) bgStyle = cardGradients['brand_stori'];
            else if (n.includes('klar')) bgStyle = cardGradients['brand_klar'] || cardGradients['dark'];
            else if (n.includes('azteca') || n.includes('guardadito')) bgStyle = cardGradients['brand_azteca'];
            else if (n.includes('coppel')) bgStyle = cardGradients['brand_coppel'];
            else if (n.includes('amex')) bgStyle = cardGradients['brand_amex'];
            else if (n.includes('rappi')) bgStyle = cardGradients['red'];
        }

        // Icono de red (Visa/Mastercard)
        let netIconClass = 'fab fa-cc-visa fa-lg';
        const nLower = d.name.toLowerCase();
        
        if (d.network === 'mastercard') netIconClass = 'fab fa-cc-mastercard fa-lg';
        else if (nLower.includes('nu') || nLower.includes('mercado') || nLower.includes('master')) netIconClass = 'fab fa-cc-mastercard fa-lg';
        else if (nLower.includes('amex')) netIconClass = 'fab fa-cc-amex fa-lg';

        dGrid.innerHTML += `
        <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
            <div class="mini-card text-white" onclick="openEditModal('debit', ${i})" style="background: ${bgStyle};">
                <div class="mb-auto opacity-75"><i class="${netIconClass}"></i></div>
                <div class="d-flex justify-content-between align-items-end w-100">
                    <div class="mini-card-name fw-bold pe-2" style="overflow:hidden; text-overflow:ellipsis;">${d.name}</div>
                    <div class="text-end flex-shrink-0">
                        <div class="small opacity-75" style="font-size: 0.6rem;">Saldo</div>
                        <div class="mini-card-balance fw-bold">${fmt(d.balance)}</div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    
    // Botón de agregar nueva tarjeta
    dGrid.innerHTML += `<div class="col-12 col-sm-6 col-lg-4 col-xl-3"><div class="mini-card mini-card-add h-100" onclick="openDebitModal()"><i class="fas fa-plus-circle fa-2x mb-2"></i><span class="small fw-bold">Nueva Tarjeta</span></div></div>`;
    // 4. Activos
    let tAssets = 0; const ab = document.getElementById('assets-body'); ab.innerHTML = '';
    if (tCollected > 0) ab.innerHTML += `<tr class="static-row table-light"><td><div class="d-flex align-items-center"><span class="fw-bold text-primary"><i class="fas fa-undo-alt me-2"></i>Recuperado de Deudas</span></div></td><td class="text-end text-success fw-bold">${fmt(tCollected)}</td><td class="text-end"><i class="fas fa-lock text-muted"></i></td></tr>`;
    if (tDebit > 0) ab.innerHTML += `<tr class="static-row table-light"><td><div class="d-flex align-items-center"><span class="fw-bold text-dark"><i class="fas fa-credit-card me-2 text-primary"></i>Saldo en Tarjetas (Débito)</span></div></td><td class="text-end text-success fw-bold">${fmt(tDebit)}</td><td class="text-end"><i class="fas fa-lock text-muted"></i></td></tr>`;

    appData.assets.forEach((a, i) => {
        tAssets += a.amount;
        ab.innerHTML += `<tr><td><div class="d-flex align-items-center"><i class="fas fa-grip-vertical drag-handle me-2"></i><span class="fw-bold">${a.name}</span></div></td><td class="text-end text-success fw-bold">${fmt(a.amount)}</td><td class="text-end"><button class="btn-icon btn-light text-warning me-1" onclick="openEditModal('asset',${i})"><i class="fas fa-pen" style="font-size:0.8rem"></i></button><button class="btn-icon btn-icon-del" onclick="delItem('asset',${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });

    // 5. Ingresos
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
        const cfg = incomeConfig[inc.type] || incomeConfig['other'];
        const dayStr = new Date(inc.date + 'T00:00:00').getDate();
        il.innerHTML += `<tr style="border-bottom: 1px solid #f0f0f0;"><td class="py-2"><div class="d-flex align-items-center"><div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 32px; height: 32px; background-color: ${cfg.color}20; color: ${cfg.color};"><i class="fas ${cfg.icon} small"></i></div><div><div class="fw-bold text-dark small">${cfg.label}</div><div class="text-muted" style="font-size: 0.7rem;">${dayStr} de ${document.getElementById('month-label').innerText.split(' ')[0]}</div></div></div></td><td class="text-end fw-bold text-success py-2">${fmt(inc.amount)}</td></tr>`;
    });

    // KPIs
    document.getElementById('kpi-debt').innerText = fmt(tDebt);
    document.getElementById('kpi-available').innerText = fmt(tLimit - tDebt);
    document.getElementById('kpi-loans').innerText = fmt(tLoansRem);

    const dineroPositivo = tAssets + tDebit + tCollected + appData.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const granTotal = dineroPositivo - tMonthlyGlobal;

    document.getElementById('kpi-assets').innerText = fmt(granTotal);
    document.getElementById('total-assets-sum').innerText = fmt(tAssets + tCollected + tDebit);
    document.getElementById('total-income-display').innerText = fmt(tInc);

    renderCalendar();
    updateSelectors();
    updateChart();
    initProjectionWidget();
    updateSummaryWidgets();
    updateLiquidityCharts();
}

function updateChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    if (myChart) myChart.destroy();

    // 1. LÓGICA PARA ELEGIR EL COLOR DE LA BARRA
    // Debe coincidir con el color de la tarjeta
    const getBarColor = (c) => {
        // Mapa de tus IDs de color a Hexadecimal sólido
        const colorMap = {
            'brand_nu': '#82269e',
            'brand_bbva': '#004481',
            'brand_mercado': '#009ee3',
            'brand_santander': '#ec0000',
            'brand_cashi': '#ff005e',
            'brand_uala': '#ff5e5e',
            'brand_stori': '#00a5a3',
            'brand_amex': '#2c3e50',
            'brand_azteca': '#27ae60',
            'brand_coppel': '#f7971e',
            // Colores genéricos
            'blue': '#00b4db',
            'purple': '#82269e',
            'dark': '#343a40',
            'teal': '#11998e',
            'green': '#0f9b0f',
            'orange': '#f12711',
            'red': '#cb2d3e',
            'pink': '#ec008c',
            'gold': '#f7971e'
        };

        // A. Si tiene color manual configurado, úsalo
        if (c.color && colorMap[c.color]) {
            return colorMap[c.color];
        }

        // B. Si no, usa la detección por nombre antigua (Fallback)
        return getBankColorHex(c.name);
    };

    // 2. GENERAR ARREGLO DE COLORES
    const bgColors = appData.cards.map(c => getBarColor(c));

    // 3. CREAR GRÁFICA
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: appData.cards.map(x => x.name),
            datasets: [{
                label: 'Deuda Total',
                data: appData.cards.map(x => calcCard(x).debt),
                backgroundColor: bgColors, // <--- Aquí aplicamos los colores correctos
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return fmt(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: { 
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                },
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(0,0,0,0.05)', borderDash: [5, 5] },
                    ticks: { callback: function(value) { return '$' + value/1000 + 'k'; } }
                }
            }
        }
    });
}
// --- MODALES Y LÓGICA DE EDICIÓN ---

function openDebitModal() {
    document.getElementById('new-debit-name').value = '';
    document.getElementById('new-debit-balance').value = '';
    document.getElementById('new-debit-network').value = 'visa';
    document.getElementById('c_blue').checked = true;
    updateCardPreview();
    new bootstrap.Modal(document.getElementById('addDebitModal')).show();
}

function saveNewDebit() {
    const name = document.getElementById('new-debit-name').value.trim();
    const balance = parseFloat(document.getElementById('new-debit-balance').value);
    const network = document.getElementById('new-debit-network').value;
    const color = document.querySelector('input[name="card-color"]:checked').value || 'blue';
    const modalEl = document.getElementById('addDebitModal');

    if (name && !isNaN(balance) && balance >= 0) {
        appData.debit.push({ name, balance, network, color });
        saveData(); updateUI();
        removeErrorVisuals(modalEl.querySelector('.modal-content'));
        bootstrap.Modal.getInstance(modalEl).hide();
        showToast('Tarjeta creada');
    } else {
        shakeModal(modalEl);
    }
}

function updateCardPreview() {
    const name = document.getElementById('new-debit-name').value || 'NOMBRE BANCO';
    const balance = parseFloat(document.getElementById('new-debit-balance').value) || 0;
    const network = document.getElementById('new-debit-network').value;
    const color = document.querySelector('input[name="card-color"]:checked').value || 'blue';

    document.getElementById('preview-name').innerText = name.toUpperCase();
    document.getElementById('preview-balance').innerText = fmt(balance);
    const iconEl = document.getElementById('preview-network-icon');
    iconEl.className = network === 'visa' ? 'fab fa-cc-visa fa-2x' : network === 'mastercard' ? 'fab fa-cc-mastercard fa-2x' : 'fab fa-cc-amex fa-2x';
    document.getElementById('new-card-preview').style.background = cardGradients[color];
}

function openAssetModal() { 
    const sel = document.getElementById('asset-type-select'); 
    document.getElementById('asset-custom-name').value = ''; 
    document.getElementById('asset-amount').value = ''; 
    sel.value = 'Billetes'; 
    toggleCustomAssetInput(); 
    new bootstrap.Modal(document.getElementById('addAssetModal')).show(); 
}

function toggleCustomAssetInput() { 
    const type = document.getElementById('asset-type-select').value; 
    const input = document.getElementById('asset-custom-name'); 
    if (type === 'Otro') { input.classList.remove('d-none'); input.focus(); } else { input.classList.add('d-none'); } 
}

function saveNewAsset() { 
    const type = document.getElementById('asset-type-select').value; 
    let name = type; 
    if (type === 'Otro') { name = document.getElementById('asset-custom-name').value.trim(); if (!name) return; } 
    const amount = parseFloat(document.getElementById('asset-amount').value); 
    if (amount > 0) { 
        const idx = appData.assets.findIndex(a => a.name === name); 
        if (idx >= 0) appData.assets[idx].amount += amount; else appData.assets.push({ name: name, amount: amount }); 
        saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addAssetModal')).hide(); 
    } 
}

// EDITAR MODAL
function openEditModal(type, idx) {
    const header = document.getElementById('edit-modal-header');
    const nameIn = document.getElementById('edit-name');
    const amtIn = document.getElementById('edit-amount');
    const actionsBlock = document.getElementById('quick-actions-block');
    const inputContainer = document.getElementById('quick-input-container');
    const colorBlock = document.getElementById('edit-color-block'); // Referencia al nuevo bloque

    document.getElementById('edit-type').value = type;
    document.getElementById('edit-idx').value = idx;

    let item; 
    let colorClass = 'bg-secondary';
    
    // Reseteamos visuales
    if (inputContainer) { inputContainer.classList.add('d-none'); document.getElementById('quick-amount-val').value = ''; }
    
    // Ocultamos el selector de color por defecto (se activa solo en Debit)
    if (colorBlock) colorBlock.classList.add('d-none');

    if (type === 'loan') {
        item = appData.loans[idx]; 
        colorClass = 'bg-danger'; 
        if(actionsBlock) actionsBlock.classList.add('d-none');
        nameIn.value = item.name; 
        amtIn.value = item.original; 
        amtIn.readOnly = false; 
        amtIn.classList.remove('bg-light');
    } 
    else if (type === 'debit') {
        item = appData.debit[idx]; 
        colorClass = 'bg-primary'; // Se sobreescribirá abajo con el gradiente real si quieres
        
        if(actionsBlock) actionsBlock.classList.remove('d-none');
        nameIn.value = item.name; 
        amtIn.value = item.balance; 
        amtIn.readOnly = true; 
        amtIn.classList.add('bg-light');

        // --- LÓGICA DE COLOR (NUEVO) ---
        if (colorBlock) {
            colorBlock.classList.remove('d-none'); // Mostrar selector
            
            // Desmarcar todos primero
            document.querySelectorAll('input[name="edit-color"]').forEach(r => r.checked = false);

            // Intentar marcar el color actual
            let c = item.color;
            // Si no tiene color definido, intentamos adivinarlo (igual que en updateUI)
            if (!c) {
                const n = item.name.toLowerCase();
                if (n.includes('nu')) c = 'brand_nu';
                else if (n.includes('bbva')) c = 'brand_bbva';
                else if (n.includes('mercado')) c = 'brand_mercado';
                else c = 'blue';
            }
            
            const radio = document.querySelector(`input[name="edit-color"][value="${c}"]`);
            if (radio) radio.checked = true;
        }
        // -------------------------------
    } 
    else if (type === 'asset') {
        item = appData.assets[idx]; 
        colorClass = 'bg-success'; 
        if(actionsBlock) actionsBlock.classList.remove('d-none');
        nameIn.value = item.name; 
        amtIn.value = item.amount; 
        amtIn.readOnly = true; 
        amtIn.classList.add('bg-light');
    }

    // Cabecera del modal
    header.className = `modal-header border-bottom-0 text-white ${colorClass}`;
    
    // Opcional: Si quieres que el header tenga el color exacto de la tarjeta
    if (type === 'debit' && item.color && cardGradients[item.color]) {
        header.style.background = cardGradients[item.color];
    } else {
        header.style.background = ''; // Resetear al color de la clase CSS
    }

    new bootstrap.Modal(document.getElementById('editModal')).show();
}

function saveEdit() {
    const type = document.getElementById('edit-type').value;
    const idx = parseInt(document.getElementById('edit-idx').value);
    const name = document.getElementById('edit-name').value.trim();
    const amt = parseFloat(document.getElementById('edit-amount').value);

    if (name && !isNaN(amt) && amt >= 0) {
        if (type === 'loan') { 
            appData.loans[idx].name = name; 
            appData.loans[idx].original = amt; 
        }
        else if (type === 'debit') { 
            appData.debit[idx].name = name; 
            appData.debit[idx].balance = amt; 

            // --- GUARDAR COLOR (NUEVO) ---
            const colorRadio = document.querySelector('input[name="edit-color"]:checked');
            if (colorRadio) {
                appData.debit[idx].color = colorRadio.value;
            }
        }
        else if (type === 'asset') { 
            appData.assets[idx].name = name; 
            appData.assets[idx].amount = amt; 
        }
        
        saveData(); 
        updateUI();
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        showToast('✅ Cambios guardados');
    } else {
        alert("Revisa los datos ingresados");
    }
}

// Lógica Rápida (+ / -)
let currentQuickOp = '';
function showQuickInput(op) {
    currentQuickOp = op;
    const container = document.getElementById('quick-input-container');
    const select = document.getElementById('quick-context-select');
    const btn = document.getElementById('quick-apply-btn');
    const type = document.getElementById('edit-type').value;
    const currentName = document.getElementById('edit-name').value;

    container.classList.remove('d-none'); document.getElementById('quick-amount-val').focus();
    select.innerHTML = '';

    if (op === '-') {
        btn.className = "btn btn-danger fw-bold"; btn.innerHTML = '<i class="fas fa-minus"></i> Restar';
        select.add(new Option(`💸 Gasto (Desaparece de ${currentName})`, 'expense'));
        if (type === 'debit') appData.assets.forEach((a,i) => select.add(new Option(`📥 Mover a: ${a.name}`, `asset_${i}`)));
        if (type === 'asset') appData.debit.forEach((d,i) => select.add(new Option(`🏦 Depositar en: ${d.name}`, `debit_${i}`)));
    } else {
        btn.className = "btn btn-success fw-bold"; btn.innerHTML = '<i class="fas fa-plus"></i> Sumar';
        select.add(new Option(`💰 Ingreso Nuevo`, 'income'));
        if (type === 'debit') appData.assets.forEach((a,i) => select.add(new Option(`📤 Traer de: ${a.name}`, `asset_${i}`)));
        if (type === 'asset') appData.debit.forEach((d,i) => select.add(new Option(`🏧 Retirar de: ${d.name}`, `debit_${i}`)));
    }
}

function applyQuickInput() {
    const amount = parseFloat(document.getElementById('quick-amount-val').value);
    const contextVal = document.getElementById('quick-context-select').value;
    const type = document.getElementById('edit-type').value;
    const idx = parseInt(document.getElementById('edit-idx').value);
    const currentName = document.getElementById('edit-name').value;

    if (!amount || amount <= 0) { showToast('Monto inválido', 'error'); return; }

    let currentItem = type === 'debit' ? appData.debit[idx] : appData.assets[idx];
    
    // Aplicar al item actual
    if (currentQuickOp === '+') {
        if (type === 'debit') currentItem.balance += amount; else currentItem.amount += amount;
    } else {
        if (type === 'debit') currentItem.balance -= amount; else currentItem.amount -= amount;
    }

    let logMsg = contextVal === 'expense' ? `Gasto de ${currentName}` : `Ingreso a ${currentName}`;

    // Transferencias
    if (contextVal.includes('_')) {
        const [targetType, tIdxStr] = contextVal.split('_');
        const tIdx = parseInt(tIdxStr);
        let target = targetType === 'asset' ? appData.assets[tIdx] : appData.debit[tIdx];

        if (currentQuickOp === '-') {
            // Resto de actual -> Sumo a target
            if (targetType === 'asset') target.amount += amount; else target.balance += amount;
            logMsg = `Transferencia: ${currentName} ➝ ${target.name}`;
        } else {
            // Sumo a actual <- Resto de target
            if ((targetType === 'asset' ? target.amount : target.balance) >= amount) {
                if (targetType === 'asset') target.amount -= amount; else target.balance -= amount;
                logMsg = `Transferencia: ${target.name} ➝ ${currentName}`;
            } else {
                showToast('Saldo insuficiente en origen', 'error');
                // Revertir
                if (type === 'debit') currentItem.balance -= amount; else currentItem.amount -= amount;
                return;
            }
        }
    }

    addLog(currentQuickOp === '+' ? 'deposito' : 'pago', logMsg, amount);
    saveData(); updateUI();
    document.getElementById('edit-amount').value = (type === 'debit' ? currentItem.balance : currentItem.amount).toFixed(2);
    document.getElementById('quick-input-container').classList.add('d-none');
    showToast('Operación exitosa');
}

function saveEdit() {
    const type = document.getElementById('edit-type').value;
    const idx = parseInt(document.getElementById('edit-idx').value);
    const name = document.getElementById('edit-name').value.trim();
    const amt = parseFloat(document.getElementById('edit-amount').value);

    if (name && !isNaN(amt) && amt >= 0) {
        if (type === 'loan') { 
            appData.loans[idx].name = name; 
            appData.loans[idx].original = amt; 
        }
        else if (type === 'debit') { 
            appData.debit[idx].name = name; 
            appData.debit[idx].balance = amt; 

            // --- GUARDAR COLOR (NUEVO) ---
            const colorRadio = document.querySelector('input[name="edit-color"]:checked');
            if (colorRadio) {
                appData.debit[idx].color = colorRadio.value;
            }
        }
        else if (type === 'asset') { 
            appData.assets[idx].name = name; 
            appData.assets[idx].amount = amt; 
        }
        
        saveData(); 
        updateUI();
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        showToast('✅ Cambios guardados');
    } else {
        alert("Revisa los datos ingresados");
    }
}

function deleteFromEdit() {
    const type = document.getElementById('edit-type').value;
    const idx = document.getElementById('edit-idx').value;
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    delItem(type, idx);
}

function delItem(type, idx) { document.getElementById('del-type').value = type; document.getElementById('del-idx').value = idx; new bootstrap.Modal(document.getElementById('deleteModal')).show(); }
function confirmDelete() {
    const type = document.getElementById('del-type').value;
    const idx = parseInt(document.getElementById('del-idx').value);
    if (type === 'loan') appData.loans.splice(idx, 1);
    else if (type === 'debit') appData.debit.splice(idx, 1);
    else if (type === 'asset') appData.assets.splice(idx, 1);
    saveData(); updateUI();
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
}

// --- CALENDARIO ---
function changeMonth(n) { calendarViewDate.setMonth(calendarViewDate.getMonth() + n); updateUI(); }
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

    for (let i = 0; i < off; i++) g.innerHTML += `<div></div>`;
    for (let i = 1; i <= dim; i++) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const inc = appData.incomes.find(x => x.date === iso);
        let content = `${i}`; let styles = '';
        if (inc) {
            const src = appData.incomeSources.find(s => s.id === inc.type) || appData.incomeSources[0];
            content = `<div class="d-flex flex-column align-items-center justify-content-center h-100"><span style="font-size:0.7rem; opacity:0.8;">${i}</span><i class="fas ${src.icon}" style="color:${src.color}; font-size:0.9rem;"></i><span style="font-size:0.6rem; color:${src.color}; font-weight:bold;">${fmt(inc.amount).split('.')[0]}</span></div>`;
            styles = `border: 1px solid ${src.color}; background-color: rgba(255,255,255,0.9);`;
        }
        g.innerHTML += `<div class="calendar-day" style="${styles}" onclick="dateClick('${iso}')">${content}</div>`;
    }
}

function dateClick(dateStr) {
    document.getElementById('cal-modal-date').value = dateStr;
    const dateObj = new Date(dateStr + 'T00:00:00');
    document.getElementById('cal-modal-title').innerText = dateObj.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    
    const targetSelect = document.getElementById('cal-target-account');
    targetSelect.innerHTML = '';
    const groupDebit = document.createElement('optgroup'); groupDebit.label = "Bancos";
    appData.debit.forEach((d, i) => groupDebit.appendChild(new Option(d.name, `debit_${i}`)));
    const groupAsset = document.createElement('optgroup'); groupAsset.label = "Efectivo";
    appData.assets.forEach((a, i) => groupAsset.appendChild(new Option(a.name, `asset_${i}`)));
    targetSelect.add(groupDebit); targetSelect.add(groupAsset);

    const existing = appData.incomes.find(x => x.date === dateStr);
    if (existing) {
        document.getElementById('cal-modal-amount').value = existing.amount;
        document.getElementById('cal-old-amount').value = existing.amount;
        document.getElementById('cal-old-link').value = existing.linkedAccount || "";
        if (existing.linkedAccount) targetSelect.value = existing.linkedAccount;
        renderIncomeOptions(existing.type);
        document.getElementById('btn-delete-income').classList.remove('d-none');
    } else {
        document.getElementById('cal-modal-amount').value = '';
        document.getElementById('cal-old-amount').value = "0";
        document.getElementById('cal-old-link').value = "";
        renderIncomeOptions();
        document.getElementById('btn-delete-income').classList.add('d-none');
    }
    new bootstrap.Modal(document.getElementById('calendarModal')).show();
}

function renderIncomeOptions(selectedId = null) {
    const container = document.getElementById('income-options-container');
    container.innerHTML = '';
    if (!appData.incomeSources || appData.incomeSources.length === 0) appData.incomeSources = defaultData.incomeSources;
    appData.incomeSources.forEach((src, index) => {
        const checked = (selectedId === src.id) || (!selectedId && index === 0) ? 'checked' : '';
        const canDelete = appData.incomeSources.length > 1;
        container.insertAdjacentHTML('beforeend', `
            <div class="income-option-wrapper">
                <input type="radio" class="btn-check" name="income-type" id="inc_${src.id}" value="${src.id}" ${checked} onchange="updateSourceStyles()">
                <label class="income-option-label" for="inc_${src.id}" data-color="${src.color}"><i class="fas ${src.icon} fa-lg mb-2"></i><span class="small fw-bold text-center">${src.label}</span></label>
                ${canDelete ? `<div class="btn-delete-source" onclick="deleteSource(${index}, event)"><i class="fas fa-times"></i></div>` : ''}
            </div>`);
    });
    updateSourceStyles();
}

function updateSourceStyles() {
    document.querySelectorAll('.income-option-label').forEach(lbl => {
        const inp = document.getElementById(lbl.getAttribute('for'));
        const col = lbl.getAttribute('data-color');
        if (inp && inp.checked) { lbl.style.background = `linear-gradient(135deg, ${col}, ${col})`; lbl.style.color = 'white'; lbl.style.borderColor = 'transparent'; }
        else { lbl.style.background = 'white'; lbl.style.color = '#6c757d'; lbl.style.borderColor = '#eee'; }
    });
}

function saveCalendarIncome() {
    const dateStr = document.getElementById('cal-modal-date').value;
    const newAmount = parseFloat(document.getElementById('cal-modal-amount').value);
    const type = document.querySelector('input[name="income-type"]:checked').value;
    const target = document.getElementById('cal-target-account').value;
    const oldAmount = parseFloat(document.getElementById('cal-old-amount').value) || 0;
    const oldLink = document.getElementById('cal-old-link').value;

    if (newAmount > 0) {
        // Revertir
        if (oldLink && oldAmount > 0) {
            const [t, i] = oldLink.split('_');
            if (t === 'debit' && appData.debit[i]) appData.debit[i].balance -= oldAmount;
            if (t === 'asset' && appData.assets[i]) appData.assets[i].amount -= oldAmount;
        }
        // Aplicar nuevo
        const [nt, ni] = target.split('_');
        if (nt === 'debit') appData.debit[ni].balance += newAmount; else appData.assets[ni].amount += newAmount;

        appData.incomes = appData.incomes.filter(x => x.date !== dateStr);
        appData.incomes.push({ date: dateStr, amount: newAmount, type, linkedAccount: target });
        saveData(); updateUI();
        bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
        showToast('Ingreso registrado');
    }
}

function deleteCalendarIncome() {
    const dateStr = document.getElementById('cal-modal-date').value;
    const item = appData.incomes.find(x => x.date === dateStr);
    if (item && item.linkedAccount) {
        const [t, i] = item.linkedAccount.split('_');
        if (t === 'debit' && appData.debit[i]) appData.debit[i].balance -= item.amount;
        if (t === 'asset' && appData.assets[i]) appData.assets[i].amount -= item.amount;
    }
    appData.incomes = appData.incomes.filter(x => x.date !== dateStr);
    saveData(); updateUI();
    bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
    showToast('Ingreso eliminado');
}

// --- FUENTES PERSONALIZADAS ---
function openSourceManager() { bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide(); document.getElementById('new-source-name').value = ''; setSourceIcon('fa-briefcase'); new bootstrap.Modal(document.getElementById('manageSourceModal')).show(); }
function setSourceIcon(icon) { document.getElementById('new-source-icon').value = icon; updateSourcePreview(); }
function updateSourcePreview() {
    const n = document.getElementById('new-source-name').value || 'Nombre';
    const c = document.querySelector('input[name="source-color"]:checked').value;
    const box = document.getElementById('source-preview-box');
    box.style.background = c; box.style.color = 'white';
    document.getElementById('source-preview-text').innerText = n;
}
function saveNewSource() {
    const n = document.getElementById('new-source-name').value.trim();
    if(n){ 
        appData.incomeSources.push({ id: 'custom_'+Date.now(), label: n, icon: document.getElementById('new-source-icon').value, color: document.querySelector('input[name="source-color"]:checked').value });
        saveData(); bootstrap.Modal.getInstance(document.getElementById('manageSourceModal')).hide();
        dateClick(document.getElementById('cal-modal-date').value);
    }
}
function deleteSource(idx, e) { e.preventDefault(); e.stopPropagation(); if(appData.incomeSources.length>1 && confirm('Borrar fuente?')) { appData.incomeSources.splice(idx, 1); saveData(); renderIncomeOptions(appData.incomeSources[0].id); }}

// --- DETALLE TARJETA Y SELECTOR ---
function updateSelectors() { 
    const s = document.getElementById('card-selector'); 
    if (s.options.length !== appData.cards.length) { 
        const v = s.value; s.innerHTML = ''; const cOpt = document.getElementById('custom-select-options'); cOpt.innerHTML = ''; 
        appData.cards.forEach((c, i) => { 
            let o = document.createElement('option'); o.value = i; o.text = c.name; s.add(o); 
            let co = document.createElement('span'); co.className = 'custom-option'; 
            if (i == (v || 0)) co.classList.add('selected'); 
            let ic = '<i class="fas fa-credit-card me-2 opacity-50"></i>'; 
            if (c.name.toLowerCase().includes('nu')) ic = '<i class="fas fa-cube me-2 text-primary"></i>'; 
            co.innerHTML = `${ic} ${c.name}`; 
            co.addEventListener('click', function () { s.value = i; document.getElementById('custom-select-text').innerHTML = this.innerHTML; document.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected')); this.classList.add('selected'); document.getElementById('custom-card-select').classList.remove('open'); renderCardDetail(i) }); 
            cOpt.appendChild(co) 
        }); 
        s.value = v || 0; 
        if (appData.cards.length > 0) renderCardDetail(s.value); 
    } 
}
document.querySelector('.custom-select-trigger').addEventListener('click', function () { document.getElementById('custom-card-select').classList.toggle('open') }); 
window.addEventListener('click', function (e) { const s = document.getElementById('custom-card-select'); if (!s.contains(e.target)) s.classList.remove('open') });

function renderCardDetail(i) {
    if (!appData.cards[i]) return;
    const c = appData.cards[i];
    const dates = getCardDates(c); 
    const s = calcCard(c);
    const p = c.limit > 0 ? (s.debt / c.limit) * 100 : 0;
    
    // Deuda meses
    let monthsOwed = 1; 
    if (c.lastPaidPeriod) {
        const [lastY, lastM] = c.lastPaidPeriod.split('-').map(Number);
        const targetCutoff = dates.calculationCutoff; 
        monthsOwed = ((targetCutoff.getFullYear() * 12) + targetCutoff.getMonth()) - ((lastY * 12) + lastM);
    }

    document.getElementById('card-name').innerHTML = `${c.name} <button class="btn btn-sm btn-link text-white p-0 ms-2 opacity-50" onclick="openCardConfig()"><i class="fas fa-cog"></i></button>`;
    document.getElementById('card-used').innerText = fmt(s.debt);
    document.getElementById('card-limit').innerText = `Lim: ${fmt(c.limit)}`;
    document.getElementById('card-avail').innerText = fmt(s.avail);
    
    const formatDate = (d) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
    document.getElementById('card-date-cut').innerText = formatDate(dates.displayCutoff);
    document.getElementById('card-date-pay').innerText = formatDate(dates.displayLimit);

    const cm = document.getElementById('card-monthly');
    const label = cm.previousElementSibling;
    const multiplier = monthsOwed > 0 ? monthsOwed : 0;
    const balanceNeto = (s.monthly * multiplier) - (c.creditBalance || 0);

    if (balanceNeto < -0.01) { label.innerText = "SALDO A FAVOR"; cm.innerText = fmt(Math.abs(balanceNeto)); cm.className = "card-money-big text-success-bright fw-bold"; }
    else if (Math.abs(balanceNeto) < 0.01 && monthsOwed <= 0) { label.innerText = "PAGO CUBIERTO"; cm.innerText = fmt(0); cm.className = "card-money-big text-success-bright fw-bold"; }
    else { label.innerText = "RESTANTE A PAGAR"; cm.innerText = fmt(balanceNeto); cm.className = "card-money-big text-danger-bright fw-bold"; }

    document.getElementById('card-percent-text').innerText = `${p.toFixed(1)}%`;
    document.getElementById('card-progress').style.width = `${p}%`;

    // --- CORRECCIÓN DEL COLOR DEL FONDO ---
    let bgStyle = cardGradients['dark']; // Fallback por defecto

    // 1. Si el usuario configuró un color manualmente, USAR ESE.
    if (c.color && cardGradients[c.color]) {
        bgStyle = cardGradients[c.color];
    } 
    // 2. Si no, intentar detectar por el nombre del banco
    else {
        const n = c.name.toLowerCase();
        if (n.includes('nu')) bgStyle = cardGradients['brand_nu'];
        else if (n.includes('bbva')) bgStyle = cardGradients['brand_bbva'];
        else if (n.includes('mercado')) bgStyle = cardGradients['brand_mercado'];
        else if (n.includes('santander')) bgStyle = cardGradients['brand_santander'];
        else if (n.includes('cashi')) bgStyle = cardGradients['brand_cashi'];
        else if (n.includes('uala')) bgStyle = cardGradients['brand_uala'];
        else if (n.includes('stori')) bgStyle = cardGradients['brand_stori'];
        else if (n.includes('amex')) bgStyle = cardGradients['brand_amex'];
        else if (n.includes('azteca')) bgStyle = cardGradients['brand_azteca'];
        else if (n.includes('coppel')) bgStyle = cardGradients['brand_coppel'];
    }

    document.getElementById('card-visual-bg').style.background = bgStyle; 
    // ----------------------------------------

    const t = document.getElementById('transactions-body'); t.innerHTML = '';
    if (c.transactions.length === 0) t.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Sin movimientos</td></tr>`;
    else c.transactions.forEach((x, ix) => {
        let paidAmt = (x.amount / (x.months||1)) * (x.paidCycles || 0);
        let rem = x.amount - paidAmt;
        t.innerHTML += `<tr><td><div class="fw-bold text-dark">${x.desc}</div><div class="small text-muted">${x.paidCycles}/${x.months}</div></td><td class="text-center"><span class="badge bg-light text-dark border">${x.months} M</span></td><td class="text-end text-muted small">${fmt(x.amount)}</td><td class="text-end fw-bold text-dark">${fmt(rem)}</td><td class="text-end"><button class="btn-icon btn-icon-del shadow-sm" onclick="delTransaction(${ix})"><i class="fas fa-trash text-danger" style="font-size:0.8rem"></i></button></td></tr>`;
    });
}
// ABRIR MODAL: Carga fechas Y selecciona el color actual
function openCardConfig() {
    let idx = -1;
    // Intentar obtener índice del selector o de la variable global de detalle
    if (typeof currentDetailCardIndex !== 'undefined' && currentDetailCardIndex !== -1) {
        idx = currentDetailCardIndex;
    } else {
        const sel = document.getElementById('card-selector');
        if (sel && sel.value !== "") idx = parseInt(sel.value);
    }

    if (idx !== -1 && appData.cards[idx]) {
        const c = appData.cards[idx];
        
        // 1. Cargar Fechas
        document.getElementById('cfg-card-index').value = idx;
        document.getElementById('cfg-cut-day').value = c.cutDay || '';
        document.getElementById('cfg-pay-days').value = c.payDays || 20;

        // 2. Pre-seleccionar el Color Actual
        // Primero desmarcamos todos
        document.querySelectorAll('input[name="cfg-color"]').forEach(el => el.checked = false);
        
        // Buscamos si el color actual existe en los radios
        let colorToSelect = c.color;
        
        // Si no tiene color guardado, intentamos adivinar cuál está usando visualmente
        if (!colorToSelect) {
            // Lógica simple de fallback
            if(c.name.toLowerCase().includes('nu')) colorToSelect = 'brand_nu';
            else if(c.name.toLowerCase().includes('bbva')) colorToSelect = 'brand_bbva';
            else colorToSelect = 'blue';
        }

        const radio = document.querySelector(`input[name="cfg-color"][value="${colorToSelect}"]`);
        if (radio) {
            radio.checked = true;
        } else {
            // Si el color no coincide con ninguno, marcamos 'blue' o 'dark' por defecto visual
            if(document.getElementById('cc_dark')) document.getElementById('cc_dark').checked = true;
        }

        new bootstrap.Modal(document.getElementById('configCardModal')).show();
    } else {
        showToast('Selecciona una tarjeta primero', 'error');
    }
}

// GUARDAR: Guarda fechas Y el nuevo color seleccionado
function saveCardConfig() {
    const idx = parseInt(document.getElementById('cfg-card-index').value);
    const cutDay = parseInt(document.getElementById('cfg-cut-day').value);
    const payDays = parseInt(document.getElementById('cfg-pay-days').value);
    
    // Obtener el color seleccionado
    const selectedColorRadio = document.querySelector('input[name="cfg-color"]:checked');
    const newColor = selectedColorRadio ? selectedColorRadio.value : null;

    if (appData.cards[idx]) {
        // Guardar Fechas
        if (cutDay > 0 && cutDay <= 31) {
            appData.cards[idx].cutDay = cutDay;
            appData.cards[idx].payDays = payDays || 20;
        }

        // Guardar Color (Sobreescribe cualquier automático)
        if (newColor) {
            appData.cards[idx].color = newColor;
        }

        saveData();
        updateUI(); // Refresca los colores en el grid
        renderCardDetail(idx); // Refresca el panel de detalle

        bootstrap.Modal.getInstance(document.getElementById('configCardModal')).hide();
        showToast('✅ Configuración actualizada');
    }
}

// --- PAGOS Y TRANSACCIONES ---
function openPayCardModal() {
    const idx = document.getElementById('card-selector').value;
    if(!appData.cards[idx]) return;
    document.getElementById('pay-card-target-name').innerText = appData.cards[idx].name;
    const s = document.getElementById('pay-source-account'); s.innerHTML = '';
    const gd = document.createElement('optgroup'); gd.label = "Débito"; appData.debit.forEach((d,i)=>gd.appendChild(new Option(`${d.name} (${fmt(d.balance)})`, `debit_${i}`)));
    const ga = document.createElement('optgroup'); ga.label = "Efectivo"; appData.assets.forEach((a,i)=>ga.appendChild(new Option(`${a.name} (${fmt(a.amount)})`, `asset_${i}`)));
    s.add(gd); s.add(ga);
    new bootstrap.Modal(document.getElementById('payCardModal')).show();
}

function calcRemainingBalance() {
    const val = document.getElementById('pay-source-account').value;
    const amt = parseFloat(document.getElementById('pay-card-amount').value)||0;
    if(val){ 
        const [t,i] = val.split('_'); 
        const curr = t==='debit' ? appData.debit[i].balance : appData.assets[i].amount; 
        const res = curr - amt;
        const sp = document.getElementById('pay-remaining-balance'); sp.innerText = fmt(res);
        sp.className = res<0 ? 'fw-bold text-danger' : 'fw-bold text-success';
    }
}

function processCardPayment() {
    const idx = document.getElementById('card-selector').value;
    const amt = parseFloat(document.getElementById('pay-card-amount').value);
    const src = document.getElementById('pay-source-account').value;
    if(amt>0 && src) {
        const [t,i] = src.split('_');
        if(t==='debit'){ if(appData.debit[i].balance<amt){showToast('Saldo insuficiente','error');return;} appData.debit[i].balance-=amt; }
        else { if(appData.assets[i].amount<amt){showToast('Saldo insuficiente','error');return;} appData.assets[i].amount-=amt; }
        
        const card = appData.cards[idx];
        const s = calcCard(card);
        // Lógica simplificada de pago: va directo a saldo a favor si cubre mensualidad
        card.creditBalance = (card.creditBalance||0) + amt; 
        // Si cubre mensualidad, actualizar compras... (Simplificado para brevedad, expandir según lógica anterior si necesario)
        
        saveData(); updateUI(); renderCardDetail(idx);
        bootstrap.Modal.getInstance(document.getElementById('payCardModal')).hide();
        showToast('Pago realizado');
    }
}

function openPurchaseModal() { document.getElementById('new-purch-desc').value=''; document.getElementById('new-purch-amount').value=''; new bootstrap.Modal(document.getElementById('addPurchaseModal')).show(); }
function savePurchase() {
    const idx = document.getElementById('card-selector').value;
    const d = document.getElementById('new-purch-desc').value;
    const a = parseFloat(document.getElementById('new-purch-amount').value);
    const m = parseInt(document.getElementById('new-purch-months').value);
    if(d&&a>0) { appData.cards[idx].transactions.push({desc:d, amount:a, months:m, paidCycles:0}); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addPurchaseModal')).hide(); }
}

function delTransaction(ix) { document.getElementById('del-trans-index').value = ix; new bootstrap.Modal(document.getElementById('deleteTransModal')).show(); }
function confirmDeleteTransaction() {
    const cIdx = document.getElementById('card-selector').value;
    const tIdx = document.getElementById('del-trans-index').value;
    appData.cards[cIdx].transactions.splice(tIdx, 1);
    saveData(); updateUI(); renderCardDetail(cIdx);
    bootstrap.Modal.getInstance(document.getElementById('deleteTransModal')).hide();
}

// --- CREAR CRÉDITO MANUAL ---
function openCreditModal() { document.getElementById('new-cc-name').value=''; document.getElementById('new-cc-limit').value=''; updateCCPreview(); new bootstrap.Modal(document.getElementById('addCreditModal')).show(); }
function updateCCPreview() {
    const n = document.getElementById('new-cc-name').value || 'NOMBRE';
    const l = document.getElementById('new-cc-limit').value || 0;
    const c = document.querySelector('input[name="cc-color"]:checked').value;
    document.getElementById('prev-cc-name').innerText = n; document.getElementById('prev-cc-limit').innerText = fmt(parseFloat(l));
    document.getElementById('new-credit-preview-box').style.background = c==='purple'?'#82269e':c==='blue'?'#00b4db':c==='gold'?'#f7971e':'#333';
}
function createCreditCard() {
    const n = document.getElementById('new-cc-name').value;
    const l = parseFloat(document.getElementById('new-cc-limit').value);
    if(n&&l>0) {
        appData.cards.push({ name:n, limit:l, balance:0, network: document.getElementById('new-cc-network').value, color: document.querySelector('input[name="cc-color"]:checked').value, transactions:[], cutDay: parseInt(document.getElementById('new-cc-cut-day').value)||14, payDays: parseInt(document.getElementById('new-cc-pay-days').value)||20 });
        saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addCreditModal')).hide();
    }
}
function deleteCurrentCreditCard() { document.getElementById('del-confirm-idx').value = document.getElementById('card-selector').value; new bootstrap.Modal(document.getElementById('deleteCardConfirmModal')).show(); }
function executeCardDelete() { appData.cards.splice(document.getElementById('del-confirm-idx').value, 1); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('deleteCardConfirmModal')).hide(); document.getElementById('credit-card-detail-panel').classList.add('d-none'); }

// --- UTILS ---
function showToast(msg, type='success') {
    const t = document.getElementById('liveToast');
    t.className = `toast align-items-center text-white bg-${type} border-0`;
    document.getElementById('toast-msg').innerText = msg;
    new bootstrap.Toast(t).show();
}
function togglePrivacy() { document.body.classList.toggle('privacy-active'); const i = document.getElementById('privacy-icon'); i.classList.toggle('fa-eye'); i.classList.toggle('fa-eye-slash'); }
function downloadBackup() { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData)); a.download = `backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); }
function openRestoreModal() { document.getElementById('backup-file-input').value=''; new bootstrap.Modal(document.getElementById('restoreBackupModal')).show(); }
function processRestoreFile() { const f = document.getElementById('backup-file-input').files[0]; if(f) { const r = new FileReader(); r.onload=e=>{ appData=JSON.parse(e.target.result); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('restoreBackupModal')).hide(); }; r.readAsText(f); } }
function saveData() { localStorage.setItem('finanzasApp_Split_v1', JSON.stringify(appData)); }
function loadData() { const s = localStorage.getItem('finanzasApp_Split_v1'); if(s) appData = JSON.parse(s); }
function shakeModal(el) { const c = el.querySelector('.modal-content'); c.classList.add('modal-shake'); setTimeout(()=>c.classList.remove('modal-shake'),500); }
function removeErrorVisuals(c) { c.classList.remove('modal-shake'); const m = c.querySelector('.error-msg-inline'); if(m) m.style.display='none'; }

// --- EXCEL TEMPLATE DOWNLOAD (Actualizado con Débito) ---
function downloadSmartTemplate() {
    const wb = XLSX.utils.book_new();
    const resumenRows = [
        ["GUÍA RÁPIDA:", "Sustituye los datos de ejemplo por los tuyos."],
        ["NOTA:", "NO borres las filas en mayúsculas (ej. 'RESUMEN DE INGRESOS')."],
        [""], 
        ["--- TUS TARJETAS DE CRÉDITO ---", ""],
        ["Nombre del Banco", "Límite de Crédito"], 
        ["Nu", 20000], ["BBVA Azul", 50000], 
        [""], 
        ["OTRAS CUENTAS", ""], 
        ["Nombre de quien te debe", "Cuánto le prestaste", "Cuánto te ha pagado ya"],
        ["Tío Juan", 5000, 1000], 
        [""],
        ["RESUMEN DE INGRESOS", ""], 
        ["Nombre de la Cuenta / Efectivo", "Saldo Disponible"],
        ["Nómina Santander", 12500.50],
        ["Efectivo en Cartera", 800],
        ["Guardadito bajo el colchón", 2000]
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
    wsResumen['!cols'] = [{wch: 35}, {wch: 25}, {wch: 25}];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    const detalleRows = [
        ["INSTRUCCIONES:", "El nombre de esta pestaña debe ser IGUAL al de la tarjeta de crédito."],
        [""],
        ["", "", "", "", "", "Saldo a Favor ->", 0], 
        [""],
        ["--- TUS COMPRAS Y GASTOS ---", "", "", ""],
        ["Descripción", "Monto Total", "Meses", "Pagos Hechos"],
        ["iPhone 15", 25000, 18, 5],
        ["Netflix", 199, 1, 0]
    ];
    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows);
    wsDetalle['!cols'] = [{wch: 30}, {wch: 20}, {wch: 15}, {wch: 20}, {wch: 5}, {wch: 35}, {wch: 15}];
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Nu");
    XLSX.utils.book_append_sheet(wb, wsDetalle, "BBVA Azul");

    XLSX.writeFile(wb, "Formato_Finanzas_Personal.xlsx");
    showToast("✅ Formato descargado.");
}

// --- WIDGET PROYECCIÓN Y GRÁFICAS ADICIONALES ---
function initProjectionWidget() {
    globalProjection = [];
    let activeDebts = [];
    appData.cards.forEach(card => {
        card.transactions.forEach(t => {
            const m = parseInt(t.months) || 1;
            const remaining = m - (t.paidCycles || 0);
            if (remaining > 0) {
                activeDebts.push({ name: t.desc, monthlyPayment: t.amount / m, monthsLeft: remaining, cardName: card.name, color: getBankColorHex(card.name) });
            }
        });
    });

    if (activeDebts.length === 0) { setupEmptyState(); return; }

    let maxMonths = 0; activeDebts.forEach(d => { if (d.monthsLeft > maxMonths) maxMonths = d.monthsLeft; });
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    let today = new Date();

    for (let i = 0; i < maxMonths; i++) {
        let futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        let label = `${monthNames[futureDate.getMonth()]} ${futureDate.getFullYear()}`;
        let monthTotal = 0;
        let details = [];
        let cardGroups = {};

        activeDebts.forEach(d => {
            if (i < d.monthsLeft) {
                if (!cardGroups[d.cardName]) cardGroups[d.cardName] = { amount: 0, color: d.color, items: 0 };
                cardGroups[d.cardName].amount += d.monthlyPayment;
                cardGroups[d.cardName].items += 1;
                monthTotal += d.monthlyPayment;
            }
        });
        for (const [cName, data] of Object.entries(cardGroups)) details.push({ name: cName, total: data.amount, count: data.items, color: data.color });
        globalProjection.push({ label: label, total: monthTotal, details: details, isLast: (i === maxMonths - 1) });
    }
    const slider = document.getElementById('time-slider');
    slider.min = 0; slider.max = globalProjection.length - 1; slider.value = 0; slider.disabled = false;
    if(globalProjection.length>0) { document.getElementById('proj-end-date').innerText = "Fin: " + globalProjection[globalProjection.length-1].label; document.getElementById('proj-freedom-msg').innerText = "Desliza para ver el futuro."; }
    renderProjectionStep(0);
}

function renderProjectionStep(index) {
    if (!globalProjection || globalProjection.length === 0) return;
    const data = globalProjection[index];
    const listContainer = document.getElementById('proj-details-list');
    document.getElementById('proj-month-label').innerText = data.label;
    document.getElementById('proj-total-label').innerText = fmt(data.total);
    document.getElementById('proj-freedom-msg').innerHTML = data.isLast ? `<span class="text-success fw-bold">¡Libertad!</span>` : `Faltan ${(globalProjection.length - 1) - index} meses.`;
    listContainer.innerHTML = '';
    data.details.sort((a, b) => b.total - a.total);
    data.details.forEach(item => {
        const percent = (item.total / data.total) * 100;
        listContainer.innerHTML += `<div class="mb-3"><div class="d-flex justify-content-between align-items-end mb-1"><div><span class="fw-bold text-dark"><i class="fas fa-credit-card me-2" style="color: ${item.color}"></i>${item.name}</span><span class="badge bg-light text-muted border ms-2 rounded-pill">${item.count}</span></div><div class="fw-bold text-dark">${fmt(item.total)}</div></div><div class="progress" style="height: 6px;"><div class="progress-bar" style="width: ${percent}%; background-color: ${item.color};"></div></div></div>`;
    });
}
function setupEmptyState() {
    document.getElementById('proj-month-label').innerText = "Libre"; document.getElementById('proj-total-label').innerText = "$0.00"; document.getElementById('proj-end-date').innerText = "Sin Deudas"; document.getElementById('time-slider').disabled = true;
    document.getElementById('proj-details-list').innerHTML = `<div class="h-100 d-flex flex-column align-items-center justify-content-center text-success opacity-75"><i class="fas fa-glass-cheers fa-3x mb-3"></i><h5>¡Felicidades!</h5></div>`;
}
function updateSummaryWidgets() { renderLoansWidget(); renderIncomesWidget(); }
function renderLoansWidget() {
    const list = document.getElementById('widget-loans-list'); list.innerHTML = ''; let totalPending = 0;
    appData.loans.forEach(l => { const rem = l.original - l.paid; if (rem > 0.1) { totalPending += rem; const pct = (l.paid/l.original)*100; list.innerHTML += `<div class="mb-3"><div class="d-flex justify-content-between"><span>${l.name}</span><span class="text-danger">${fmt(rem)}</span></div><div class="progress" style="height:6px"><div class="progress-bar bg-warning" style="width:${pct}%"></div></div></div>`; } });
    document.getElementById('widget-loans-total').innerText = fmt(totalPending);
    if(totalPending===0) list.innerHTML = `<div class="text-center text-muted py-4">Sin cobros pendientes</div>`;
}
function renderIncomesWidget() {
    const list = document.getElementById('widget-income-list'); list.innerHTML = ''; let monthTotal = 0; const viewDate = calendarViewDate;
    document.getElementById('widget-income-month').innerText = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][viewDate.getMonth()];
    let groups = {};
    appData.incomes.forEach(inc => {
        const d = new Date(inc.date + 'T00:00:00');
        if (d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear()) {
            const t = inc.type || 'other'; if(!groups[t]) groups[t] = {amount:0, ...incomeConfig[t]||incomeConfig['other']};
            groups[t].amount += inc.amount; monthTotal += inc.amount;
        }
    });
    Object.values(groups).sort((a,b)=>b.amount-a.amount).forEach(g => {
        list.innerHTML += `<div class="d-flex align-items-center mb-2"><div class="rounded-circle me-2 d-flex align-items-center justify-content-center" style="width:30px;height:30px;background:${g.color}20;color:${g.color}"><i class="fas ${g.icon} small"></i></div><div class="w-100"><div class="d-flex justify-content-between"><span class="small fw-bold">${g.label}</span><span class="small fw-bold text-success">${fmt(g.amount)}</span></div></div></div>`;
    });
    document.getElementById('widget-income-total').innerText = fmt(monthTotal);
}
// --- WIDGETS DE GRÁFICAS DE PASTEL (LIQUIDEZ) ---
// ACTUALIZADO: Gráficas centradas y más grandes

let debitPieInstance = null;
let assetPieInstance = null;

function updateLiquidityCharts() {
    // 1. PREPARAR DATOS DE CUENTAS (DÉBITO)
    let debitLabels = [];
    let debitData = [];
    let debitColors = [];
    let totalDebit = 0;

    appData.debit.forEach(d => {
        if (d.balance > 0) {
            debitLabels.push(d.name);
            debitData.push(d.balance);
            debitColors.push(getBankColorHex(d.name));
            totalDebit += d.balance;
        }
    });

    // 2. PREPARAR DATOS DE EFECTIVO
    let assetLabels = [];
    let assetData = [];
    let assetColors = [];
    let totalAssets = 0;
    const greenPalette = ['#2ecc71', '#27ae60', '#1abc9c', '#f1c40f'];

    appData.assets.forEach((a, i) => {
        if (a.amount > 0) {
            assetLabels.push(a.name);
            assetData.push(a.amount);
            assetColors.push(greenPalette[i % greenPalette.length]);
            totalAssets += a.amount;
        }
    });

    // Recuperado de Deudas
    let recoveredDebt = 0;
    if (appData.loans) appData.loans.forEach(l => { recoveredDebt += (l.paid || 0); });
    if (recoveredDebt > 0) {
        assetLabels.push("Recuperado");
        assetData.push(recoveredDebt);
        assetColors.push("#3498db");
        totalAssets += recoveredDebt;
    }

    // 3. ACTUALIZAR TOTALES TEXTO
    document.getElementById('chart-total-debit').innerText = fmt(totalDebit);
    document.getElementById('chart-total-assets').innerText = fmt(totalAssets);

    // Estado Vacío (Gris)
    let isDebitEmpty = false, isAssetEmpty = false;
    if (totalDebit === 0) { isDebitEmpty = true; debitLabels = ["Sin Fondos"]; debitData = [1]; debitColors = ["#e9ecef"]; }
    if (totalAssets === 0) { isAssetEmpty = true; assetLabels = ["Sin Efectivo"]; assetData = [1]; assetColors = ["#e9ecef"]; }

    // OPCIONES COMUNES PARA AMBAS GRÁFICAS (Aquí está el truco del tamaño)
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false, // Permite que crezca según el contenedor
        cutout: '60%',              // <--- Hace el anillo más grueso (antes 70%)
        layout: {
            padding: 10             // Un poco de aire para que no se corten las sombras
        },
        plugins: {
            legend: {
                display: true,      // Siempre mostrar leyenda (excepto si está vacío, controlado abajo)
                position: 'bottom', // <--- ESTO LA CENTRA (Pone los textos abajo)
                labels: {
                    boxWidth: 12,
                    padding: 15,    // Espacio entre etiquetas
                    usePointStyle: true,
                    font: { size: 11 }
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed !== null) {
                            label += new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(context.parsed);
                        }
                        return label;
                    }
                }
            }
        }
    };

    // 4. RENDERIZAR GRÁFICA DÉBITO
    const ctxD = document.getElementById('debitPieChart').getContext('2d');
    if (debitPieInstance) debitPieInstance.destroy();
    
    // Ajuste específico para cuando está vacío (ocultar leyenda)
    const debitOptions = JSON.parse(JSON.stringify(commonOptions)); // Copia limpia
    if(isDebitEmpty) { 
        debitOptions.plugins.legend.display = false; 
        debitOptions.plugins.tooltip.enabled = false; 
    }

    debitPieInstance = new Chart(ctxD, {
        type: 'doughnut',
        data: { labels: debitLabels, datasets: [{ data: debitData, backgroundColor: debitColors, borderWidth: 0, hoverOffset: isDebitEmpty ? 0 : 5 }] },
        options: debitOptions
    });

    // 5. RENDERIZAR GRÁFICA ACTIVOS
    const ctxA = document.getElementById('assetPieChart').getContext('2d');
    if (assetPieInstance) assetPieInstance.destroy();

    const assetOptions = JSON.parse(JSON.stringify(commonOptions));
    if(isAssetEmpty) { 
        assetOptions.plugins.legend.display = false; 
        assetOptions.plugins.tooltip.enabled = false; 
    }

    assetPieInstance = new Chart(ctxA, {
        type: 'doughnut',
        data: { labels: assetLabels, datasets: [{ data: assetData, backgroundColor: assetColors, borderWidth: 0, hoverOffset: isAssetEmpty ? 0 : 5 }] },
        options: assetOptions
    });
}