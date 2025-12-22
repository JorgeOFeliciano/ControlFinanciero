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
    ],
    // AÑADIR ESTO:
    // Dentro de defaultData o appData
    expenseSources: [
        { id: 'food', label: 'Comida', icon: 'fa-utensils', color: '#ff4757' },
        { id: 'transport', label: 'Transporte', icon: 'fa-car', color: '#3742fa' },
        { id: 'services', label: 'Servicios', icon: 'fa-bolt', color: '#ffa502' },
        { id: 'health', label: 'Salud', icon: 'fa-heartbeat', color: '#ff6b81' },
        { id: 'other_exp', label: 'Otro', icon: 'fa-shopping-bag', color: '#747d8c' }
    ],

    subscriptions: [
        { id: 1, name: 'Netflix', amount: 219, payDay: 15, category: 'Entertainment', linkedAccount: 'debit_0', active: true },
        { id: 2, name: 'Spotify', amount: 129, payDay: 5, category: 'Entertainment', linkedAccount: 'debit_1', active: true }
    ],

    savingsGoals: []
};

/**
 * Lanza una ráfaga de confeti en la pantalla
 */
function triggerSuccessCelebration() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#0d6efd', '#11998e', '#38ef7d']
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#0d6efd', '#11998e', '#38ef7d']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

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
let editingGoalIdx = null;
let extraMonthlySim = 0;
let tempSimValue = 0;

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

// Agrega esto donde inicializas tus variables globales
if (!appData.archives) appData.archives = [];
if (appData.lastSessionMonth === undefined) appData.lastSessionMonth = new Date().getMonth();

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DE MENÚ Y SIDEBAR (Sin cambios) ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const navLinks = document.querySelectorAll('.nav-link');

    function toggleMenu() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    if(menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if(overlay) overlay.addEventListener('click', toggleMenu);

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // --- INICIALIZACIÓN DE SORTABLE (Sin cambios) ---
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

    const debitGrid = document.getElementById('debit-grid');
    if (debitGrid) {
        new Sortable(debitGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            // --- AGREGA ESTAS LÍNEAS ---
            delay: 100, // Retraso de 100ms antes de empezar a arrastrar
            delayOnTouchOnly: true, // El retraso solo aplica en tablets/celulares
            touchStartThreshold: 5,
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

    // --- FLUJO DE DATOS (ORDEN CRÍTICO) ---

    loadData(); // 1. Traer datos de LocalStorage

    // 2. Preparar el terreno para el archivado si es la primera vez
    if (!appData.archives) appData.archives = [];
    if (appData.lastSessionMonth === undefined) {
        appData.lastSessionMonth = new Date().getMonth();
        saveData();
    }

    // 3. Ejecutar el "limpiador" mensual antes de mostrar nada
    checkMonthlyArchive(); 

    // 4. Mostrar la UI final ya procesada
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

function askConfirmation(message, callback, btnText = "Confirmar", btnClass = "btn-dark") {
    pendingActionCallback = callback; 
    document.getElementById('confirm-msg-text').innerHTML = message;
    const actionBtn = document.getElementById('confirm-btn-action');
    actionBtn.innerText = btnText;
    actionBtn.className = `btn ${btnClass} w-100 rounded-pill fw-bold`;
    
    const modalElem = document.getElementById('confirmActionModal');
    bootstrap.Modal.getOrCreateInstance(modalElem).show();
}

function executePendingAction() {
    if (typeof pendingActionCallback === 'function') pendingActionCallback();
    bootstrap.Modal.getInstance(document.getElementById('confirmActionModal')).hide();
    pendingActionCallback = null;
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

function compactFmt(value) {
    if (value === 0) return '$0.00';
    
    // Si es menor a 1,000, usamos tu formato normal con decimales
    if (Math.abs(value) < 1000) {
        return fmt(value); 
    }

    const suffixes = ["", "k", "M", "B", "T"];
    const suffixNum = Math.floor(("" + Math.floor(Math.abs(value))).length / 3);
    
    let shortValue = parseFloat((suffixNum !== 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(3));
    
    if (shortValue % 1 !== 0) {
        shortValue = shortValue.toFixed(1);
    }
    
    return '$' + shortValue + suffixes[suffixNum];
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

        // ... dentro de tu appData.debit.forEach ...
        dGrid.innerHTML += `
    <div class="col-6 col-md-6 col-lg-4 p-2">
        <div class="mini-card text-white shadow-sm" onclick="openEditModal('debit', ${i})" style="background: ${bgStyle};">
            <div class="d-flex justify-content-between align-items-start">
                <div class="opacity-75"><i class="${netIconClass}"></i></div>
                <div class="mini-card-name fw-bold">${d.name}</div>
            </div>
            
            <div class="text-end mt-auto">
                <div class="small opacity-75 d-none d-md-block" style="font-size: 0.55rem; letter-spacing: 0.5px;">SALDO</div>
                <div class="mini-card-balance fw-bold">${compactFmt(d.balance)}</div>
            </div>
        </div>
    </div>`;
    });
    
    // Botón de agregar nueva tarjeta
    dGrid.innerHTML += `
    <div class="col-6 col-md-6 col-lg-4 p-2">
        <div class="mini-card mini-card-add shadow-sm" onclick="openDepositModal()">
            <div class="d-flex flex-column align-items-center justify-content-center h-100">
                <i class="fas fa-plus-circle fa-2x mb-2 opacity-50"></i>
                <span class="small fw-bold text-uppercase" style="letter-spacing: 1px;">Nueva Tarjeta</span>
            </div>
        </div>
    </div>`;    // 4. Activos
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

    updateSummaryWidgets();
    renderCalendar();
    renderSubscriptions();   
    renderSavingsGoals();
    updateSelectors();
    updateChart();
    initProjectionWidget();
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
        
        // 1. Buscar Ingresos
        const inc = appData.incomes.find(x => x.date === iso);
        
        // 2. Buscar Suscripciones del día
        const hasSub = (appData.subscriptions || []).some(s => s.payDay === i);
        
        // 3. Buscar Fechas de Tarjetas (Corte y Pago)
        let cardAlert = '';
        appData.cards.forEach(c => {
            const d = getCardDates(c);
            if (d.displayCutoff.getDate() === i && d.displayCutoff.getMonth() === m) 
                cardAlert = '<i class="fas fa-cut text-primary" style="font-size:0.6rem"></i>';
            if (d.displayLimit.getDate() === i && d.displayLimit.getMonth() === m) 
                cardAlert = '<i class="fas fa-exclamation-triangle text-warning" style="font-size:0.6rem"></i>';
        });

        let content = `<div class="d-flex flex-column align-items-center justify-content-center h-100">
                        <span class="small">${i}</span>
                        <div class="d-flex gap-1">
                            ${hasSub ? '<div class="bg-danger rounded-circle" style="width:4px; height:4px;"></div>' : ''}
                            ${cardAlert}
                        </div>
                       </div>`;
        let styles = '';

        if (inc) {
            const src = appData.incomeSources.find(s => s.id === inc.type) || appData.incomeSources[0];
            styles = `border: 1px solid ${src.color}; background-color: ${src.color}10;`;
            content = `<div class="d-flex flex-column align-items-center justify-content-center h-100">
                        <span style="font-size:0.65rem; opacity:0.7;">${i}</span>
                        <i class="fas ${src.icon}" style="color:${src.color}; font-size:0.8rem;"></i>
                        <span style="font-size:0.55rem; color:${src.color}; font-weight:bold;">${fmt(inc.amount).split('.')[0]}</span>
                        <div class="d-flex gap-1">${hasSub ? '<div class="bg-danger rounded-circle" style="width:3px; height:3px;"></div>' : ''}${cardAlert}</div>
                       </div>`;
        }
        
        g.innerHTML += `<div class="calendar-day" style="${styles}" onclick="dateClick('${iso}')">${content}</div>`;
    }
}
function dateClick(dateStr) {
    document.getElementById('cal-modal-date').value = dateStr;
    const dateObj = new Date(dateStr + 'T00:00:00');
    const day = dateObj.getDate();
    const month = dateObj.getMonth();
    
    document.getElementById('cal-modal-title').innerText = dateObj.toLocaleDateString('es-MX', { 
        weekday: 'long', day: 'numeric', month: 'long' 
    });

    // 1. Llenar Selectores (Ingreso y Gasto) - Incluyendo Tarjetas de Crédito
    const targetSelect = document.getElementById('cal-target-account');
    const sourceSelect = document.getElementById('cal-expense-source');
    
    [targetSelect, sourceSelect].forEach(sel => {
        if (!sel) return;
        sel.innerHTML = '';
        
        // Grupo: Bancos (Débito)
        const gDeb = document.createElement('optgroup'); gDeb.label = "Cuentas de Débito";
        appData.debit.forEach((d, i) => gDeb.appendChild(new Option(d.name, `debit_${i}`)));
        
        // Grupo: Tarjetas de Crédito (NUEVO)
        const gCred = document.createElement('optgroup'); gCred.label = "Tarjetas de Crédito";
        appData.cards.forEach((c, i) => gCred.appendChild(new Option(c.name, `card_${i}`)));
        
        // Grupo: Efectivo
        const gAss = document.createElement('optgroup'); gAss.label = "Efectivo / Activos";
        appData.assets.forEach((a, i) => gAss.appendChild(new Option(a.name, `asset_${i}`)));
        
        sel.add(gDeb); sel.add(gCred); sel.add(gAss);
    });

    // 2. Cargar Ingreso Existente
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

    // 3. Llenar la pestaña de AGENDA (Suscripciones + Fechas de Corte)
    const agendaList = document.getElementById('cal-agenda-list');
    if (agendaList) {
        agendaList.innerHTML = '';
        
        // Buscar Suscripciones que caen este día y verificar si usan tarjeta
        const daySubs = (appData.subscriptions || []).filter(s => parseInt(s.payDay) === day);
        daySubs.forEach(s => {
            let cardInfo = "";
            // Si la suscripción está ligada a una tarjeta (card_X)
            if (s.linkedAccount && s.linkedAccount.startsWith('card_')) {
                const cardIdx = s.linkedAccount.split('_')[1];
                const card = appData.cards[cardIdx];
                if (card) {
                    const dates = getCardDates(card);
                    cardInfo = `<div class="text-info mt-1" style="font-size:0.65rem;">
                                    <i class="fas fa-credit-card me-1"></i>Paga con ${card.name} (Corte: día ${dates.displayCutoff.getDate()})
                                </div>`;
                }
            }

            agendaList.innerHTML += `
                <div class="border-bottom py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="fw-bold"><i class="fas ${s.icon || 'fa-tag'} text-primary me-2"></i>${s.name}</span>
                        <span class="fw-bold text-danger">${fmt(s.amount)}</span>
                    </div>
                    ${cardInfo}
                </div>`;
        });

        // Buscar Fechas de Tarjetas (Corte y Pago)
        appData.cards.forEach(c => {
            const dates = getCardDates(c);
            if (dates.displayCutoff.getDate() === day && dates.displayCutoff.getMonth() === month) {
                agendaList.innerHTML += `<div class="py-2 text-primary fw-bold border-bottom small"><i class="fas fa-cut me-2"></i>Fecha de Corte: ${c.name}</div>`;
            }
            if (dates.displayLimit.getDate() === day && dates.displayLimit.getMonth() === month) {
                agendaList.innerHTML += `<div class="py-2 text-danger fw-bold border-bottom small"><i class="fas fa-exclamation-triangle me-2"></i>Límite Pago: ${c.name}</div>`;
            }
        });

        if (agendaList.innerHTML === '') agendaList.innerHTML = '<div class="text-center text-muted py-3">No hay eventos para este día.</div>';
    }

    // 4. Inicializar categorías de gasto
    if (typeof renderExpenseOptions === 'function') renderExpenseOptions();

    // 5. Mostrar Modal
    new bootstrap.Modal(document.getElementById('calendarModal')).show();
}

function renderIncomeOptions(selectedId = null) {
    const container = document.getElementById('income-options-container');
    if (!container) return;
    container.innerHTML = '';

    if (!appData.incomeSources || appData.incomeSources.length === 0) appData.incomeSources = [...defaultData.incomeSources];

    // 1. Renderizar categorías existentes
    appData.incomeSources.forEach((src, index) => {
        const checked = (selectedId === src.id) || (!selectedId && index === 0) ? 'checked' : '';
        const canDelete = appData.incomeSources.length > 1;

        container.insertAdjacentHTML('beforeend', `
            <div class="income-option-wrapper">
                <input type="radio" class="btn-check" name="income-type" id="inc_${src.id}" value="${src.id}" ${checked} onchange="updateSourceStyles()">
                <label class="income-option-label" for="inc_${src.id}" data-color="${src.color}">
                    <i class="fas ${src.icon} mb-1"></i>
                    <span class="small fw-bold" style="font-size:0.65rem">${src.label}</span>
                </label>
                ${canDelete ? `<div class="btn-delete-source" onclick="deleteSource(${index}, event)"><i class="fas fa-times"></i></div>` : ''}
            </div>`);
    });

    // 2. AGREGAR TARJETA DE "AÑADIR MÁS" AL FINAL
    container.insertAdjacentHTML('beforeend', `
        <div class="income-option-wrapper" onclick="openSourceManager('income')">
            <div class="add-category-card shadow-sm">
                <i class="fas fa-plus-circle mb-1"></i>
                <span class="small fw-bold" style="font-size:0.65rem">Añadir</span>
            </div>
        </div>`);
    
    updateSourceStyles();
}

function renderExpenseOptions(selectedId = null) {
    const container = document.getElementById('expense-options-container');
    if (!container) return;
    container.innerHTML = '';

    // Inicializar si el arreglo no existe
    if (!appData.expenseSources || appData.expenseSources.length === 0) {
        appData.expenseSources = [...defaultData.expenseSources];
    }

    // 1. Renderizar categorías existentes de GASTOS
    appData.expenseSources.forEach((src, index) => {
        const checked = (selectedId === src.id) || (!selectedId && index === 0) ? 'checked' : '';
        const canDelete = appData.expenseSources.length > 1;

        container.insertAdjacentHTML('beforeend', `
            <div class="income-option-wrapper">
                <input type="radio" class="btn-check" name="expense-type" id="exp_${src.id}" value="${src.id}" ${checked} onchange="updateExpenseSourceStyles()">
                <label class="income-option-label" for="exp_${src.id}" data-color="${src.color}">
                    <i class="fas ${src.icon} mb-1"></i>
                    <span class="small fw-bold" style="font-size:0.65rem">${src.label}</span>
                </label>
                ${canDelete ? `<div class="btn-delete-source" onclick="deleteExpenseSource(${index}, event)"><i class="fas fa-times"></i></div>` : ''}
            </div>`);
    });

    // 2. AGREGAR TARJETA DE "AÑADIR MÁS" AL FINAL (para Gastos)
    container.insertAdjacentHTML('beforeend', `
        <div class="income-option-wrapper" onclick="openSourceManager('expense')">
            <div class="add-category-card shadow-sm">
                <i class="fas fa-plus-circle mb-1"></i>
                <span class="small fw-bold" style="font-size:0.65rem">Añadir</span>
            </div>
        </div>`);
    
    updateExpenseSourceStyles();
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

function saveCalendarEvent(mode) {
    const dateStr = document.getElementById('cal-modal-date').value;
    
    if (mode === 'income') {
        saveCalendarIncome(); // Llama a tu función de ingreso que ya tienes
    } 
    else if (mode === 'expense') {
        const amount = parseFloat(document.getElementById('cal-expense-amount').value);
        const source = document.getElementById('cal-expense-source').value;
        const typeInp = document.querySelector('input[name="expense-type"]:checked');

        if (amount > 0 && source) {
            const [accType, idx] = source.split('_');
            const categoryLabel = typeInp ? appData.expenseSources.find(s => s.id === typeInp.value).label : "Gasto";

            // Restar saldo de la cuenta elegida
            if (accType === 'debit') {
                if (appData.debit[idx].balance < amount) { showToast("Saldo insuficiente", "danger"); return; }
                appData.debit[idx].balance -= amount;
            } else {
                if (appData.assets[idx].amount < amount) { showToast("Saldo insuficiente", "danger"); return; }
                appData.assets[idx].amount -= amount;
            }

            addLog('pago', `Gasto: ${categoryLabel} (${dateStr})`, amount);
            saveData();
            updateUI();
            bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
            showToast("💸 Gasto registrado correctamente");
        } else {
            alert("Por favor ingresa un monto y selecciona la cuenta.");
        }
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

function saveCalendarExpense() {
    const amount = parseFloat(document.getElementById('cal-expense-amount').value);
    const source = document.getElementById('cal-expense-source').value;
    const typeInp = document.querySelector('input[name="expense-type"]:checked');

    if (amount > 0 && source && typeInp) {
        const [accType, idx] = source.split('_');
        const categoryId = typeInp.value;
        const category = appData.expenseSources.find(s => s.id === categoryId);

        // 1. Restar saldo (Validación de saldo)
        const account = accType === 'debit' ? appData.debit[idx] : appData.assets[idx];
        const currentBalance = accType === 'debit' ? account.balance : account.amount;

        if (amount > currentBalance) {
            showToast("Saldo insuficiente", "danger");
            return;
        }

        if (accType === 'debit') appData.debit[idx].balance -= amount;
        else appData.assets[idx].amount -= amount;

        // 2. Log e Historial
        addLog('pago', `Gasto: ${category.label}`, amount);
        
        saveData();
        updateUI();
        bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide();
        showToast(`💸 ${category.label} registrado correctamente`);
    } else {
        alert("Por favor completa el monto y selecciona una categoría");
    }
}


// Actualización para que cada tarjeta use su color asignado
function updateExpenseSourceStyles() {
    document.querySelectorAll('#expense-options-container .income-option-label').forEach(lbl => {
        const inp = document.getElementById(lbl.getAttribute('for'));
        const col = lbl.getAttribute('data-color'); // Lee el color dinámico

        if (inp && inp.checked) {
            // Estilo Seleccionado: Fondo de color y texto blanco
            lbl.style.background = col;
            lbl.style.color = 'white';
            lbl.style.borderColor = 'transparent';
            lbl.style.boxShadow = `0 4px 10px ${col}40`; 
        } else {
            // Estilo Desactivado: Fondo blanco y texto gris
            lbl.style.background = 'white';
            lbl.style.color = '#6c757d';
            lbl.style.borderColor = '#eee';
            lbl.style.boxShadow = 'none';
        }
    });
}
// Alerta de eliminación
function deleteExpenseSource(idx, e) {
    e.preventDefault(); e.stopPropagation();
    const name = appData.expenseSources[idx].label;
    
    askConfirmation(`¿Eliminar categoría de gasto: <b>${name}</b>?`, () => {
        appData.expenseSources.splice(idx, 1);
        saveData();
        renderExpenseOptions();
        showToast("Categoría eliminada", "info");
    });
}

// Añadir nueva categoría rápida
function addExpenseCategory() {
    const name = prompt("Nombre de la nueva categoría de gasto:");
    if (name) {
        appData.expenseSources.push({
            id: 'exp_' + Date.now(),
            label: name,
            icon: 'fa-shopping-bag',
            color: '#747d8c'
        });
        saveData();
        renderExpenseOptions();
    }
}

// --- FUENTES PERSONALIZADAS ---
let currentManagerType = 'income'; // Controla si es Ingreso o Egreso

function openSourceManager(type = 'income') {
    currentManagerType = type;
    
    // 1. Configurar interfaz del modal
    document.getElementById('source-manager-title').innerText = type === 'income' ? 'Nueva Fuente de Ingreso' : 'Nueva Categoría de Gasto';
    document.getElementById('new-source-name').value = '';
    
    // 2. Resetear a valores por defecto
    setSourceIcon('fa-briefcase');
    document.getElementById('sc_green').checked = true;
    
    // 3. Cerrar calendario y abrir manager
    const calModal = bootstrap.Modal.getInstance(document.getElementById('calendarModal'));
    if (calModal) calModal.hide();
    
    new bootstrap.Modal(document.getElementById('manageSourceModal')).show();
    updateSourcePreview();
}

function setSourceIcon(icon) {
    // 1. Actualizar el valor oculto para el guardado
    document.getElementById('new-source-icon').value = icon;

    // 2. Feedback Visual: Resaltar el botón clickeado
    document.querySelectorAll('.btn-icon-select').forEach(btn => {
        btn.classList.remove('btn-dark', 'text-white');
        btn.classList.add('btn-outline-light', 'text-dark');
    });

    // Usamos currentTarget para identificar el botón exacto
    const clickedBtn = event.currentTarget;
    clickedBtn.classList.remove('btn-outline-light', 'text-dark');
    clickedBtn.classList.add('btn-dark', 'text-white');

    // 3. Actualizar la vista previa inmediatamente
    updateSourcePreview();
}

function updateSourcePreview() {
    const name = document.getElementById('new-source-name').value.trim() || 'Nombre';
    const icon = document.getElementById('new-source-icon').value;
    const color = document.querySelector('input[name="source-color"]:checked').value;

    const previewBox = document.getElementById('source-preview-box');
    const previewIcon = document.getElementById('source-preview-icon');
    const previewText = document.getElementById('source-preview-text');

    // Aplicar el color y el icono seleccionado al preview
    previewBox.style.background = color;
    previewBox.style.color = 'white';
    previewIcon.className = `fas ${icon} fa-lg mb-2`;
    previewText.innerText = name;
}

function updateSourcePreview() {
    const name = document.getElementById('new-source-name').value.trim() || 'Nombre';
    const icon = document.getElementById('new-source-icon').value;
    const color = document.querySelector('input[name="source-color"]:checked').value;

    const previewBox = document.getElementById('source-preview-box');
    const previewIcon = document.getElementById('source-preview-icon');
    const previewText = document.getElementById('source-preview-text');

    // Aplicar estilos y contenido
    previewBox.style.background = color;
    previewBox.style.color = 'white';
    previewIcon.className = `fas ${icon} fa-lg mb-2`;
    previewText.innerText = name;
}

function saveNewSource() {
    const name = document.getElementById('new-source-name').value.trim();
    const icon = document.getElementById('new-source-icon').value;
    const color = document.querySelector('input[name="source-color"]:checked').value;

    if (!name) { alert("Ingresa un nombre"); return; }

    // --- VALIDACIÓN DE DUPLICADOS ---
    // Selecciona la lista activa según el tipo de manager abierto (Ingreso o Gasto)
    const listToSearch = currentManagerType === 'income' ? appData.incomeSources : appData.expenseSources;
    const isDuplicate = listToSearch.some(s => s.label.toLowerCase() === name.toLowerCase());

    if (isDuplicate) {
        alert(`La categoría "${name}" ya existe. Intenta con otro nombre para mantener tu base de datos limpia.`);
        return;
    }

    const newCategory = {
        id: (currentManagerType === 'income' ? 'inc_' : 'exp_') + Date.now(),
        label: name,
        icon: icon,
        color: color
    };

    // Guardar en el array correspondiente
    if (currentManagerType === 'income') {
        appData.incomeSources.push(newCategory);
    } else {
        if (!appData.expenseSources) appData.expenseSources = [];
        appData.expenseSources.push(newCategory);
    }

    saveData();
    bootstrap.Modal.getInstance(document.getElementById('manageSourceModal')).hide();
    
    // Regresar al calendario y refrescar la vista
    dateClick(document.getElementById('cal-modal-date').value);
    showToast("Categoría creada con éxito");
}

// Reemplazo de funciones de eliminar para que sean simétricas
function deleteSource(idx, e) { 
    e.preventDefault(); e.stopPropagation(); 
    if(appData.incomeSources.length > 1 && confirm('¿Borrar fuente de ingreso?')) { 
        appData.incomeSources.splice(idx, 1); 
        saveData(); renderIncomeOptions(); 
    } 
}

function deleteExpenseSource(idx, e) { 
    e.preventDefault(); e.stopPropagation(); 
    if(appData.expenseSources.length > 1 && confirm('¿Borrar categoría de gasto?')) { 
        appData.expenseSources.splice(idx, 1); 
        saveData(); renderExpenseOptions(); 
    } 
}

function deleteSource(idx, e) { e.preventDefault(); e.stopPropagation(); if(appData.incomeSources.length>1 && confirm('¿Borrar categoria de ingreso?')) { appData.incomeSources.splice(idx, 1); saveData(); renderIncomeOptions(appData.incomeSources[0].id); }}

function deleteExpenseSource(idx, e) { e.preventDefault(); e.stopPropagation(); if(appData.expenseSources.length>1 && confirm('¿Borrar categoría de gastos?')) { appData.expenseSources.splice(idx, 1); saveData(); renderExpenseOptions(appData.expenseSources[0].id); }}

// --- MAPEO DE LOGOS ONLINE (URLs Públicas) ---
function getBankLogoUrl(name) {
    const n = name.toLowerCase();
    let domain = '';

    // Asignamos el dominio web real de cada banco
    // Usamos dominios oficiales para que Google encuentre el logo exacto
    if (n.includes('nu')) domain = 'nu.com.mx';
    else if (n.includes('bbva')) domain = 'bbva.mx';
    else if (n.includes('santander')) domain = 'santander.com.mx';
    else if (n.includes('mercado')) domain = 'mercadopago.com.mx';
    else if (n.includes('banamex')) domain = 'banamex.com';
    else if (n.includes('hsbc')) domain = 'hsbc.com.mx';
    else if (n.includes('scotia')) domain = 'scotiabank.com.mx';
    else if (n.includes('liverpool')) domain = 'liverpool.com.mx';
    else if (n.includes('coppel')) domain = 'coppel.com';
    else if (n.includes('azteca')) domain = 'bancoazteca.com.mx';
    else if (n.includes('amex') || n.includes('american')) domain = 'americanexpress.com';
    else if (n.includes('rappi')) domain = 'rappicard.mx';
    else if (n.includes('didi')) domain = 'didi-food.com';
    else if (n.includes('uala')) domain = 'uala.mx';
    else if (n.includes('stori')) domain = 'storicard.com';
    else if (n.includes('klar')) domain = 'klar.mx';
    else if (n.includes('hey')) domain = 'heybanco.com';
    else if (n.includes('cashi')) domain = 'cashi.com.mx';
    else if (n.includes('plata')) domain = 'platacard.mx'; // <--- AGREGADO PLATA

    // Si encontramos un dominio, pedimos el logo a Google (No se bloquea)
    if (domain) {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
    
    return null;
}

function updateSelectors() {
    const s = document.getElementById('card-selector');
    const cOpt = document.getElementById('custom-select-options');
    const currentVal = s.value; 

    s.innerHTML = '';
    cOpt.innerHTML = '';

    appData.cards.forEach((c, i) => {
        // 1. Select Oculto
        let o = document.createElement('option');
        o.value = i;
        o.text = c.name;
        s.add(o);

        // 2. PREPARAR EL ÍCONO OFFLINE (BACKUP)
        // Se usa si falla la carga de la imagen de Google
        let iconClass = 'fa-credit-card'; 
        let iconColor = '#6c757d';
        const n = c.name.toLowerCase();

        if (n.includes('nu')) { iconClass = 'fa-cube'; iconColor = '#82269e'; }
        else if (n.includes('bbva')) { iconClass = 'fa-university'; iconColor = '#004481'; }
        else if (n.includes('mercado')) { iconClass = 'fa-handshake'; iconColor = '#009ee3'; }
        else if (n.includes('santander')) { iconClass = 'fa-fire'; iconColor = '#ec0000'; }
        else if (n.includes('coppel')) { iconClass = 'fa-key'; iconColor = '#f7971e'; }
        else if (n.includes('cashi')) { iconClass = 'fa-mobile-alt'; iconColor = '#ff005e'; }
        else if (n.includes('azteca')) { iconClass = 'fa-leaf'; iconColor = '#27ae60'; }
        else if (n.includes('amex')) { iconClass = 'fa-globe-americas'; iconColor = '#2c3e50'; }
        else if (n.includes('liverpool')) { iconClass = 'fa-shopping-bag'; iconColor = '#e0006c'; }
        else if (n.includes('plata')) { iconClass = 'fa-layer-group'; iconColor = '#bdc3c7'; } // <--- AGREGADO PLATA (Gris)

        // HTML del ícono de respaldo
        const backupIconHTML = `<i class="fas ${iconClass} me-2" style="color: ${iconColor}; font-size: 1.1rem; width: 24px; text-align: center;"></i>`;

        // 3. INTENTAR OBTENER URL ONLINE
        const logoUrl = getBankLogoUrl(c.name);

        // 4. CREAR LA OPCIÓN VISUAL
        let co = document.createElement('span');
        co.className = 'custom-option';
        if (i == (currentVal || 0)) co.classList.add('selected');

        // Lógica Híbrida: Imagen con error handler
        if (logoUrl) {
            // Si la imagen de Google falla, se reemplaza por el ícono de FontAwesome
            co.innerHTML = `
                <img src="${logoUrl}" 
                     alt="icon" 
                     class="me-2 rounded-circle" 
                     style="width: 24px; height: 24px; object-fit: contain; background: white;"
                     onerror="this.outerHTML='${backupIconHTML.replace(/"/g, "'")}'">
                ${c.name}
            `;
        } else {
            // Si no hay URL, usa directo el ícono
            co.innerHTML = `${backupIconHTML} ${c.name}`;
        }

        // 5. Evento Click
        co.addEventListener('click', function () {
            s.value = i;
            
            // Copiar el contenido visual al selector principal
            const mainText = document.getElementById('custom-select-text');
            mainText.innerHTML = this.innerHTML;
            
            document.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('custom-card-select').classList.remove('open');
            renderCardDetail(i);
        });
        
        cOpt.appendChild(co);
    });

    // Inicializar visualización
    s.value = currentVal || 0;
    if (appData.cards.length > 0) {
        const idx = s.value;
        const ops = cOpt.querySelectorAll('.custom-option');
        if (ops[idx]) {
            document.getElementById('custom-select-text').innerHTML = ops[idx].innerHTML;
            ops[idx].classList.add('selected');
        }
        renderCardDetail(s.value);
    } else {
        document.getElementById('custom-select-text').innerHTML = 'Sin tarjetas';
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

// Inicializar el modal
const depositModal = new bootstrap.Modal(document.getElementById('depositModal'));

function openDepositModal() {
    const sourceSelect = document.getElementById('dep-source-asset');
    const targetSelect = document.getElementById('dep-target-account');
    const amountInput = document.getElementById('dep-amount');

    // Limpiar selectores
    sourceSelect.innerHTML = '<option value="">-- Seleccionar Efectivo --</option>';
    targetSelect.innerHTML = '<option value="">-- Seleccionar Tarjeta --</option>';
    amountInput.value = '';

    // 1. Llenar ORIGEN con appData.assets (Tus efectivos)
    appData.assets.forEach((asset, index) => {
        const option = document.createElement('option');
        option.value = index; // Usamos el índice del arreglo
        option.textContent = `💵 ${asset.name} (${fmt(asset.amount)})`;
        sourceSelect.appendChild(option);
    });

    // 2. Llenar DESTINO con appData.debit (Tus tarjetas de débito)
    appData.debit.forEach((card, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `💳 ${card.name} (${fmt(card.balance)})`;
        targetSelect.appendChild(option);
    });

    // 3. Abrir el modal de Bootstrap
    const modalElement = document.getElementById('depositModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

function processDeposit() {
    const sourceIdx = document.getElementById('dep-source-asset').value;
    const targetIdx = document.getElementById('dep-target-account').value;
    const amount = parseFloat(document.getElementById('dep-amount').value);

    // Validaciones
    if (sourceIdx === "" || targetIdx === "") {
        showToast("Por favor selecciona origen y destino", "danger");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showToast("Ingresa un monto válido", "danger");
        return;
    }

    const source = appData.assets[sourceIdx];
    const target = appData.debit[targetIdx];

    // Verificar si hay saldo suficiente en efectivo
    if (amount > source.amount) {
        showToast(`Saldo insuficiente en ${source.name}`, "danger");
        return;
    }

    // EJECUTAR MOVIMIENTO
    source.amount -= amount;    // Restar de efectivo
    target.balance += amount;   // Sumar a tarjeta de débito

    // Registrar en el historial (usando tu sistema de logs)
    addLog('deposito', `Depósito: ${source.name} 📥 ${target.name}`, amount);

    // Guardar y Refrescar
    saveData();
    updateUI();

    // Cerrar Modal
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('depositModal'));
    modalInstance.hide();

    showToast(`✅ Depósito de ${fmt(amount)} realizado con éxito`);
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
    const list = document.getElementById('widget-loans-list');
    const totalHeader = document.getElementById('widget-loans-total');
    const collectedElem = document.getElementById('widget-loans-collected');
    const remainingElem = document.getElementById('widget-loans-remaining');

    if (!list) return;

    let totalOriginal = 0, totalCollected = 0, totalRemaining = 0, activeCount = 0;
    list.innerHTML = '';

    appData.loans.forEach((l, idx) => {
        const rem = l.original - l.paid;
        totalOriginal += l.original;
        totalCollected += l.paid;
        totalRemaining += rem;

        if (rem > 0.1) {
            activeCount++;
            const pct = (l.paid / l.original) * 100;
            list.innerHTML += `
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-1" style="font-size: 0.75rem;">
                        <span class="fw-bold text-dark">${l.name}</span>
                        <span class="text-muted">${fmt(l.paid)} / <b>${fmt(l.original)}</b></span>
                    </div>
                    <div class="progress" style="height:5px;">
                        <div class="progress-bar bg-success" style="width:${pct}%"></div>
                    </div>
                </div>`;
        }
    });

    totalHeader.innerText = fmt(totalOriginal); // Header ahora muestra el CAPITAL prestado
    collectedElem.innerText = fmt(totalCollected);
    remainingElem.innerText = fmt(totalRemaining);
    
    const countBadge = document.getElementById('widget-loans-count');
    if (countBadge) countBadge.innerText = `${activeCount} Activos`;
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

// --- LÓGICA DE COBRANZA (PRÉSTAMOS) ---

// 1. Función para ABRIR el modal (Se llama desde el botón de la lista)
function openPayModal(index, name) {
    // A. Llenamos los textos del modal con la info del deudor
    document.getElementById('pay-label').innerText = `Abonar a: ${name}`;
    document.getElementById('pay-idx').value = index; // Guardamos el índice oculto
    document.getElementById('pay-amount').value = ''; // Limpiamos el campo de monto

    // B. Abrimos el modal usando Bootstrap
    const modalElement = document.getElementById('payModal');
    const myModal = new bootstrap.Modal(modalElement);
    myModal.show();
    
    // C. Ponemos el cursor en el input para escribir rápido
    setTimeout(() => document.getElementById('pay-amount').focus(), 500);
}

// 2. Función para GUARDAR el abono (Se llama desde el botón "Confirmar Pago")
function submitPay() {
    const index = document.getElementById('pay-idx').value;
    const amount = parseFloat(document.getElementById('pay-amount').value);

    // Validamos que el monto sea real
    if (amount > 0 && appData.loans[index]) {
        
        // A. Sumamos el dinero a lo "pagado"
        appData.loans[index].paid += amount;

        // B. Verificamos si ya terminó de pagar (Opcional: Muestra modal de éxito)
        if (appData.loans[index].paid >= appData.loans[index].original) {
            // Si quieres borrarlo automáticamente o mostrar aviso
            // Por ahora solo actualizamos
        }

        // C. Guardamos y actualizamos la pantalla
        saveData();
        updateUI();

        // D. Cerramos el modal
        const modalElement = document.getElementById('payModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();

        if (typeof showToast === 'function') showToast("✅ Abono registrado correctamente");

    } else {
        alert("Por favor ingresa un monto mayor a 0");
    }
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

// --- LÓGICA DE SUSCRIPCIONES v0.36 ---
// ================================================================
// --- LÓGICA DE SUSCRIPCIONES v0.36 ---
// ================================================================

/**
 * Muestra la lista de suscripciones con su estado de pago mensual
 */
function renderSubscriptions() {
    const list = document.getElementById('subscription-list');
    if (!list) return;

    const currentMonthKey = calendarViewDate.getMonth() + '-' + calendarViewDate.getFullYear();
    let total = 0;
    list.innerHTML = '';

    if (!appData.subscriptions) appData.subscriptions = [];

    appData.subscriptions.forEach((sub, idx) => {
        total += sub.amount;
        const isPaid = sub.lastPaidMonth === currentMonthKey;
        
        // Identificar nombre de cuenta (Débito, Crédito o Activo)
        const parts = sub.linkedAccount ? sub.linkedAccount.split('_') : ['asset', '0'];
        const type = parts[0];
        const accIdx = parseInt(parts[1]);
        let accountName = "Cuenta";

        // Mapeo seguro de nombres
        if (type === 'debit') accountName = appData.debit[accIdx]?.name || 'Banco';
        else if (type === 'card') accountName = appData.cards[accIdx]?.name || 'Tarjeta';
        else accountName = appData.assets[accIdx]?.name || 'Efectivo';

        list.innerHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center px-0 border-0 mb-2 shadow-sm rounded-3 p-2 bg-white">
                <div class="d-flex align-items-center">
                    <div class="rounded-circle d-flex align-items-center justify-content-center me-3 ${isPaid ? 'bg-success text-white' : 'bg-light text-primary'}" style="width: 40px; height: 40px;">
                        <i class="fas ${sub.icon || 'fa-tag'}"></i>
                    </div>
                    <div>
                        <div class="fw-bold small" style="font-size:0.8rem">${sub.name}</div>
                        <div class="text-muted" style="font-size: 0.65rem;">Día ${sub.payDay} • ${accountName}</div>
                        <span class="badge ${isPaid ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}" style="font-size:0.55rem">
                            ${isPaid ? 'CUBIERTO' : 'PENDIENTE'}
                        </span>
                    </div>
                </div>
                <div class="text-end pe-2">
                    <div class="fw-bold text-dark small" style="font-size:0.8rem">${fmt(sub.amount)}</div>
                    <div class="d-flex gap-1 justify-content-end mt-1">
                        ${!isPaid ? `<button class="btn btn-sm btn-outline-success py-0 px-2" onclick="paySubscription(${idx})" style="font-size: 0.6rem;">Pagar</button>` : ''}
                        <button class="btn btn-sm text-danger py-0 px-1" onclick="deleteSubscription(${idx})"><i class="fas fa-trash-alt" style="font-size:0.7rem"></i></button>
                    </div>
                </div>
            </div>`;
    });

    const totalElem = document.getElementById('total-subscriptions');
    if (totalElem) totalElem.innerText = fmt(total);
}

/**
 * Ejecuta el proceso de pago restando saldo o añadiendo deuda a crédito
 */
function paySubscription(idx) {
    const sub = appData.subscriptions[idx];
    if (!sub) return;

    const accountStr = sub.linkedAccount || "asset_0";
    const [type, accIdxStr] = accountStr.split('_');
    const accIdx = parseInt(accIdxStr);
    const currentMonthKey = calendarViewDate.getMonth() + '-' + calendarViewDate.getFullYear();

    // Invocamos el modal con texto y color verde (btn-success)
    askConfirmation(
        `¿Confirmas el pago de <b>${sub.name}</b> por ${fmt(sub.amount)}?`, 
        () => {
            // 1. Asegurar categoría de gasto para el reporte
            if (!appData.expenseSources) appData.expenseSources = [];
            let subCategory = appData.expenseSources.find(c => c.label === 'Suscripciones');
            if (!subCategory) {
                subCategory = { id: 'exp_subs', label: 'Suscripciones', icon: 'fa-sync', color: '#6f42c1' };
                appData.expenseSources.push(subCategory);
            }

            let success = false;
            let accountName = "";

            // 2. Ejecutar según tipo de cuenta
            if (type === 'card') {
                const card = appData.cards[accIdx];
                if (card) {
                    if (!card.transactions) card.transactions = [];
                    card.transactions.push({
                        desc: `Suscripción: ${sub.name}`,
                        amount: sub.amount,
                        date: new Date().toISOString().split('T')[0],
                        months: 1,
                        paidCycles: 0
                    });
                    accountName = card.name;
                    success = true;
                }
            } 
            else if (type === 'debit') {
                const acc = appData.debit[accIdx];
                if (acc && acc.balance >= sub.amount) {
                    acc.balance -= sub.amount;
                    accountName = acc.name;
                    success = true;
                } else { 
                    showToast("Saldo insuficiente en cuenta", "danger"); 
                    return; 
                }
            } 
            else if (type === 'asset') {
                const acc = appData.assets[accIdx];
                if (acc && acc.amount >= sub.amount) {
                    acc.amount -= sub.amount;
                    accountName = acc.name;
                    success = true;
                } else { 
                    showToast("Saldo insuficiente en efectivo", "danger"); 
                    return; 
                }
            }

            // 3. Finalizar y Actualizar
            if (success) {
                sub.lastPaidMonth = currentMonthKey;
                addLog('pago', `Pago suscripción (${accountName}): ${sub.name}`, sub.amount);
                saveData();
                updateUI(); // Refresca lista y balances
                showToast(`✅ ${sub.name} pagada correctamente`);
            }
        }, 
        "Sí, pagar",  // Texto personalizado para el botón
        "btn-success" // Color verde para la confirmación de pago
    );
}z
/**
 * Prepara el modal para añadir nuevas suscripciones
 */
function openSubscriptionModal() {
    const select = document.getElementById('sub-account-select');
    if (!select) return;
    select.innerHTML = '';

    // Llenar por grupos para mejor UX
    const groups = [
        { label: "Cuentas de Débito", data: appData.debit, prefix: "debit" },
        { label: "Tarjetas de Crédito", data: appData.cards, prefix: "card" },
        { label: "Efectivo", data: appData.assets, prefix: "asset" }
    ];

    groups.forEach(g => {
        if (g.data && g.data.length > 0) {
            const optGroup = document.createElement('optgroup');
            optGroup.label = g.label;
            g.data.forEach((item, i) => {
                optGroup.appendChild(new Option(item.name, `${g.prefix}_${i}`));
            });
            select.add(optGroup);
        }
    });

    new bootstrap.Modal(document.getElementById('addSubscriptionModal')).show();
}

/**
 * Guarda una nueva suscripción en la base de datos
 */
function saveNewSubscription() {
    const name = document.getElementById('sub-name').value;
    const amount = parseFloat(document.getElementById('sub-amount').value);
    const day = parseInt(document.getElementById('sub-payday').value);
    const account = document.getElementById('sub-account-select').value;
    const iconInp = document.querySelector('input[name="sub-icon"]:checked');
    const icon = iconInp ? iconInp.value : 'fa-tag';

    if (name && amount > 0 && day > 0 && day <= 31) {
        if (!appData.subscriptions) appData.subscriptions = [];
        appData.subscriptions.push({ 
            id: Date.now(), 
            name, 
            amount, 
            payDay: day, 
            linkedAccount: account, 
            icon, 
            lastPaidMonth: '', 
            active: true 
        });
        saveData(); 
        updateUI();
        bootstrap.Modal.getInstance(document.getElementById('addSubscriptionModal')).hide();
        showToast("✅ Suscripción guardada");
    } else {
        alert("Por favor completa los campos correctamente (Día 1-31)");
    }
}

function deleteSubscription(idx) {
    const sub = appData.subscriptions[idx];
    
    askConfirmation(
        `¿Deseas eliminar definitivamente la suscripción a <b>${sub.name}</b>?`, 
        () => {
            appData.subscriptions.splice(idx, 1);
            saveData();
            updateUI();
            showToast("Suscripción eliminada", "info");
        },
        "Sí, eliminar", // Cambia el texto del botón
        "btn-danger"    // Cambia el color a ROJO
    );
}
// No olvides llamar a renderSubscriptions() dentro de tu updateUI() principal

// 1. Inicialización
if (!appData.savingsGoals) appData.savingsGoals = [];

// 2. Motor Predictivo (Ajustado)
function getProjectedDate(remainingAmount) {
    const monthlySavingsAverage = (appData.totalIncome - appData.totalExpense) || 1000;
    if (monthlySavingsAverage <= 0) return "Ahorro insuficiente";

    const monthsToGoal = Math.ceil(remainingAmount / monthlySavingsAverage);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsToGoal);

    return targetDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

// --- 1. RENDERIZADO CON SALÓN DE LA FAMA ---
function renderSavingsGoals() {
    const container = document.getElementById('savings-goals-list');
    const completedContainer = document.getElementById('completed-goals-list');
    const completedSection = document.getElementById('completed-goals-section');
    
    if (!container || !completedContainer) {
        console.error("Error: Contenedores de metas no encontrados en el HTML.");
        return;
    }

    container.innerHTML = '';
    completedContainer.innerHTML = '';
    
    if (!appData.savingsGoals || appData.savingsGoals.length === 0) {
        container.innerHTML = `<div class="text-center py-4 text-muted small">Sin metas activas.</div>`;
        if (completedSection) completedSection.classList.add('d-none');
        return;
    }

    appData.savingsGoals.sort((a, b) => b.priority - a.priority);
    const hoy = new Date();
    let completedCount = 0;

    appData.savingsGoals.forEach((goal, idx) => {
        const remaining = goal.target - goal.current;
        const progress = Math.min((goal.current / goal.target) * 100, 100);
        const isCompleted = remaining <= 0;

        if (isCompleted) {
            completedCount++;
            completedContainer.innerHTML += `
                <div class="p-3 mb-2 rounded-3 border d-flex justify-content-between align-items-center shadow-sm animate__animated animate__fadeInUp" 
                    style="background: linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%); border-color: #d4af37 !important;">
                    <div>
                        <div class="fw-bold text-dark small"><i class="fas fa-medal text-warning me-1"></i> ${goal.name}</div>
                        <div class="text-muted" style="font-size: 0.55rem;">META LOGRADA EL ${goal.lastDepositDate ? new Date(goal.lastDepositDate).toLocaleDateString() : 'RECIENTE'}</div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success small">${fmt(goal.target)}</div>
                        <span class="badge bg-warning text-dark rounded-pill" style="font-size:0.45rem;">GOLD STATUS</span>
                    </div>
                </div>`;
        } else {
            let daysInactive = goal.lastDepositDate ? Math.floor((hoy - new Date(goal.lastDepositDate)) / (1000 * 60 * 60 * 24)) : 0;
            const isInactiveAlert = (goal.priority == "3" && daysInactive > 7);
            const p = { "3": "bg-danger", "2": "bg-warning text-dark", "1": "bg-info" }[goal.priority] || "bg-secondary";

            container.innerHTML += `
                <div class="mb-4 p-3 rounded-3 shadow-sm bg-white border goal-item-card" onclick="openGoalDetail(${idx})" style="cursor:pointer; ${isInactiveAlert ? 'border-left: 5px solid #ffc107 !important;' : ''}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <span class="badge ${p} mb-1" style="font-size: 0.55rem;">PRIORIDAD ${goal.priority}</span>
                            ${isInactiveAlert ? `<span class="badge bg-warning text-dark ms-1" style="font-size: 0.55rem;"><i class="fas fa-clock"></i> INACTIVA ${daysInactive}D</span>` : ''}
                            <div class="fw-bold text-dark" style="font-size: 0.95rem;">${goal.name}</div>
                        </div>
                        <div class="d-flex gap-2" onclick="event.stopPropagation();">
                            <button class="btn btn-sm p-0 text-muted" onclick="openGoalModal(${idx})"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm p-0 text-danger" onclick="deleteGoal(${idx})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="progress mb-3" style="height: 8px; border-radius: 10px; background-color: #f0f2f5;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             style="width: ${progress}%; background-color: ${goal.priority == 3 ? '#dc3545' : '#0d6efd'}"></div>
                    </div>
                    <div class="row g-1 text-center mb-2">
                        <div class="col-4"><div class="py-2 bg-light rounded-2 border"><div class="text-muted small-text" style="font-size:0.5rem">OBJETIVO</div><div class="fw-bold small">${fmt(goal.target)}</div></div></div>
                        <div class="col-4"><div class="py-2 bg-light rounded-2 border"><div class="text-muted small-text" style="font-size:0.5rem">AHORRADO</div><div class="fw-bold text-primary small">${fmt(goal.current)}</div></div></div>
                        <div class="col-4"><div class="py-2 bg-light rounded-2 border"><div class="text-muted small-text" style="font-size:0.5rem">RESTANTE</div><div class="fw-bold text-danger small">${fmt(remaining)}</div></div></div>
                    </div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted" style="font-size: 0.6rem;"><i class="fas fa-calendar-alt me-1"></i>Estimado: <b>${getProjectedDate(remaining, 0)}</b></small>
                        <small class="fw-bold text-dark" style="font-size: 0.7rem;">${progress.toFixed(0)}%</small>
                    </div>
                </div>`;
        }
    });

    if (completedSection) completedSection.className = completedCount > 0 ? "mt-4 d-block" : "d-none";
}

// FUNCIÓN PARA EL MODAL DE DETALLE (SIMULADOR INTERNO)
function openGoalDetail(idx) {
    const goal = appData.savingsGoals[idx];
    const remaining = goal.target - goal.current;
    const progress = Math.min((goal.current / goal.target) * 100, 100);
    const isCompleted = remaining <= 0;

    // 1. GESTIÓN DE NOTAS Y ÁNIMO (Inyección de Ánimo Dinámica)
    const notesCont = document.getElementById('detail-notes-container');
    const notesText = document.getElementById('detail-notes-text');
    
    if (goal.notes) {
        notesCont.classList.remove('d-none');
        notesText.innerHTML = `<i class="fas fa-quote-left me-2 opacity-25"></i>${goal.notes}`;
    } else if (isCompleted) {
        notesCont.classList.remove('d-none');
        notesText.innerHTML = `<i class="fas fa-trophy me-2 text-warning"></i>¡Lo lograste! Este dinero ya es tuyo.`;
    } else if (progress > 80) { // <-- NUEVO: Mensaje de recta final
        notesCont.classList.remove('d-none');
        notesText.innerHTML = `<i class="fas fa-flag-checkered me-2 text-success"></i>¡Estás en la recta final! Solo un poco más.`;
    } else if (progress > 50) {
        notesCont.classList.remove('d-none');
        notesText.innerHTML = `<i class="fas fa-rocket me-2 text-primary"></i>¡Ya pasaste la mitad! Mantén el ritmo.`;
    } else {
        notesCont.classList.add('d-none');
    }

    // 2. LLENADO DE DATOS ESTÁTICOS
    document.getElementById('detail-goal-name').innerText = goal.name;
    document.getElementById('detail-target').innerText = fmt(goal.target);
    document.getElementById('detail-current').innerText = fmt(goal.current);
    document.getElementById('detail-remaining').innerText = isCompleted ? "$0.00" : fmt(remaining);
    document.getElementById('detail-percent-text').innerText = `${progress.toFixed(0)}%`;

    // 3. BARRA Y PRIORIDAD
    const bar = document.getElementById('detail-progress-bar');
    const badgePrio = document.getElementById('detail-badge-prio');
    bar.style.width = progress + '%';
    
    const prioData = {
        "3": { label: "ALTA (3)", class: "bg-danger text-white" },
        "2": { label: "MEDIA (2)", class: "bg-warning text-dark" },
        "1": { label: "BAJA (1)", class: "bg-info text-white" }
    }[goal.priority] || { label: "SIN PRIORIDAD", class: "bg-secondary text-white" };

    badgePrio.innerText = isCompleted ? "COMPLETADA" : prioData.label;
    badgePrio.className = `badge rounded-pill ${isCompleted ? 'bg-success' : prioData.class}`;
    bar.className = `progress-bar progress-bar-striped progress-bar-animated ${isCompleted ? 'bg-success' : (goal.priority == 3 ? 'bg-danger' : 'bg-primary')}`;

    // 4. FUNCIÓN REACTIVA DE MÉTRICAS (Días + Urgencia)
    const updateDaysMetric = (extraSim = 0) => {
        const baseSaving = (appData.totalIncome - appData.totalExpense) || 1000;
        const totalMonthly = baseSaving + extraSim;
        const daysElem = document.getElementById('detail-days-left');
        
        // Limpiar estados previos <-- IMPORTANTE PARA UX
        daysElem.classList.remove('urgency-blink', 'text-danger', 'text-success', 'text-dark');

        if (isCompleted) {
            daysElem.innerText = "¡META CUMPLIDA!";
            daysElem.classList.add('text-success', 'fw-bold');
            return;
        }

        if (totalMonthly <= 0) {
            daysElem.innerText = "Ajusta tu capacidad de ahorro";
            daysElem.classList.add('text-muted');
            return;
        }

        const monthsLeft = remaining / totalMonthly;
        const daysLeft = Math.ceil(monthsLeft * 30.44);
        daysElem.innerText = `${daysLeft.toLocaleString()} días approx.`;
        
        if (daysLeft <= 30) {
            daysElem.classList.add('fw-bold', 'text-danger', 'urgency-blink');
        } else {
            daysElem.classList.add('fw-bold', 'text-dark');
        }
    };

    // 5. MÉTRICAS DE CONSISTENCIA Y ÚLTIMO MOVIMIENTO
    document.getElementById('detail-last-move').innerText = goal.lastDepositDate 
        ? new Date(goal.lastDepositDate).toLocaleDateString('es-MX', {day:'numeric', month:'short'}) 
        : "Sin registros";

    const daysInactive = goal.lastDepositDate ? Math.floor((new Date() - new Date(goal.lastDepositDate)) / (1000 * 60 * 60 * 24)) : 99;
    const consistBadge = document.getElementById('detail-consistency-badge');
    
    if (isCompleted) {
        consistBadge.innerText = "GOLD STATUS"; consistBadge.className = "badge bg-warning text-dark"; // <-- CAMBIO A ORO
    } else if (daysInactive <= 7) {
        consistBadge.innerText = "¡MUY ACTIVA!"; consistBadge.className = "badge bg-primary";
    } else {
        consistBadge.innerText = "REQUIERE ATENCIÓN"; consistBadge.className = "badge bg-warning text-dark";
    }

    // --- 6. SIMULADOR REACTIVO CON LÍMITE Y RECOMPENSA VISUAL ---
    const slider = document.getElementById('detail-sim-slider');
    const simValLabel = document.getElementById('detail-sim-value');
    const projDateLabel = document.getElementById('detail-projected-date');

    // REPARACIÓN: Usamos la variable btnAbono sin 'const' para evitar el error de redeclaración
    // O asegúrate de que btnAbono esté declarada una sola vez al inicio de la función.
    const btnAbonoElement = document.getElementById('detail-btn-abono'); 

    // Configuración dinámica del slider
    slider.max = Math.max(0, remaining); 
    slider.value = 0;

    // FIX: Usamos step de 1 para que siempre pueda llegar al monto exacto restante
    slider.step = 1; 

    simValLabel.innerText = `+ $0/mes`;
    projDateLabel.innerText = getProjectedDate(remaining, 0);
    updateDaysMetric(0); 

    slider.oninput = function() {
        const val = parseInt(this.value);
        simValLabel.innerText = `+ ${fmt(val)}/mes`;
        projDateLabel.innerText = getProjectedDate(remaining, val);
        updateDaysMetric(val); 

        // Lógica de "Brillo de Meta Alcanzada"
        // Si el usuario desliza hasta el total restante (o muy cerca por redondeo)
        if (val >= remaining && remaining > 0) {
            btnAbonoElement.classList.remove('btn-primary', 'shadow-blue');
            btnAbonoElement.classList.add('btn-success', 'glow-finish');
            btnAbonoElement.innerHTML = `<i class="fas fa-check-circle me-2 animate__animated animate__bounceIn"></i> ¡LIQUIDAR META AHORA!`;
        } else {
            btnAbonoElement.classList.add('btn-primary', 'shadow-blue');
            btnAbonoElement.classList.remove('btn-success', 'glow-finish');
            btnAbonoElement.innerHTML = `<i class="fas fa-coins me-2"></i> Abonar a esta meta`;
        }
    };
    // 7. BOTÓN DE HISTORIAL Y ABONO
    // Dentro de openGoalDetail(idx)...

    const historySection = document.getElementById('detail-history-link-container');
    if (historySection) {
        const totalAbonos = goal.history ? goal.history.length : 0;
        
        if (totalAbonos > 0) {
            historySection.innerHTML = `
                <button class="btn btn-sm btn-link p-0 text-decoration-none fw-bold text-primary" 
                        onclick="openGoalHistory(${idx})">
                    <i class="fas fa-list-ul me-1"></i> Ver historial (${totalAbonos} abonos)
                </button>`;
        } else {
            historySection.innerHTML = `<small class="text-muted italic">Aún no hay abonos registrados</small>`;
        }
    }

    const btnAbono = document.getElementById('detail-btn-abono');
    const simBlock = slider.closest('.bg-primary'); // <-- NUEVO: Referencia al bloque del simulador

    if(isCompleted) {
        btnAbonoElement.classList.add('d-none');
        if(simBlock) simBlock.classList.add('d-none'); // Ocultar simulador si ya se cumplió
        projDateLabel.innerHTML = "<span class='text-success fw-bold'>✨ Dinero listo en el Salón de la Fama</span>";
    } else {
        btnAbonoElement.classList.remove('d-none');
        if(simBlock) simBlock.classList.remove('d-none');
        btnAbonoElement.onclick = () => {
            bootstrap.Modal.getInstance(document.getElementById('goalDetailModal')).hide();
            openGoalAbonoModal(idx);
        };
    }

    new bootstrap.Modal(document.getElementById('goalDetailModal')).show();
}

// Ajustar getProjectedDate para aceptar simulación
function getProjectedDate(remainingAmount, extraSim = 0) {
    const monthlySavingsAverage = (appData.totalIncome - appData.totalExpense) || 1000;
    const totalCapacidad = monthlySavingsAverage + extraSim;

    if (totalCapacidad <= 0) return "Ahorro insuficiente";

    const monthsToGoal = Math.ceil(remainingAmount / totalCapacidad);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsToGoal);

    return targetDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}
/**
 * Procesa la transferencia del saldo a la meta
 */
function processGoalDeposit() {
    const idx = document.getElementById('deposit-goal-idx').value;
    const amount = parseFloat(document.getElementById('deposit-goal-amount').value);
    const source = document.getElementById('deposit-goal-source').value;

    if (isNaN(amount) || amount <= 0) return;

    const [type, accIdx] = source.split('_');
    const account = type === 'debit' ? appData.debit[accIdx] : appData.assets[accIdx];
    const balance = type === 'debit' ? account.balance : account.amount;

    if (amount > balance) { showToast("Saldo insuficiente", "danger"); return; }

    const goal = appData.savingsGoals[idx];

    // REGISTRO TÉCNICO EN EL HISTORIAL DE LA META
    if (!goal.history) goal.history = [];
    goal.history.unshift({
        date: new Date().toLocaleDateString('es-MX'),
        timestamp: new Date().toISOString(),
        amount: amount,
        from: account.name
    });

    // Ejecutar movimiento real
    if (type === 'debit') appData.debit[accIdx].balance -= amount;
    else appData.assets[accIdx].amount -= amount;
    goal.current += amount;
    goal.lastDepositDate = new Date().toISOString();

    saveData();
    updateUI();
    bootstrap.Modal.getInstance(document.getElementById('depositGoalModal')).hide();
    
    if (goal.current >= goal.target) {
        triggerSuccessCelebration(); // Confetti
        showToast("🏆 ¡Meta cumplida y enviada al Salón de la Fama!");
    } else {
        showToast("✅ Abono registrado en el historial");
    }
}

function openGoalHistory(idx) {
    // 1. OBTENER Y CERRAR EL MODAL DE DETALLE (El que está abierto)
    const detailModalEl = document.getElementById('goalDetailModal');
    const detailInstance = bootstrap.Modal.getInstance(detailModalEl);
    if (detailInstance) {
        detailInstance.hide();
    }

    // 2. POBLAR LOS DATOS (Lo que ya tenías)
    const goal = appData.savingsGoals[idx];
    const list = document.getElementById('goal-history-list');
    document.getElementById('goal-history-title').innerText = "Historial: " + goal.name;
    
    list.innerHTML = '';

    if (!goal.history || goal.history.length === 0) {
        list.innerHTML = `<div class="text-center py-4 text-muted small">No hay abonos registrados todavía.</div>`;
    } else {
        goal.history.forEach(h => {
            list.innerHTML += `
                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div>
                        <div class="fw-bold small" style="font-size: 0.75rem;">${h.from}</div>
                        <div class="text-muted" style="font-size: 0.6rem;">${h.date}</div>
                    </div>
                    <div class="text-success fw-bold small">+${fmt(h.amount)}</div>
                </div>`;
        });
    }
    
    // 3. ABRIR EL MODAL DE HISTORIAL
    const historyModalEl = document.getElementById('goalHistoryModal');
    const historyInstance = new bootstrap.Modal(historyModalEl);
    historyInstance.show();
}
// 4. Funciones de Gestión
function openGoalModal(idx = null) {
    editingGoalIdx = idx;
    const form = document.getElementById('goal-form');
    if (form) form.reset();
    
    document.getElementById('goalModalLabel').innerText = idx !== null ? "Editar Meta" : "Nueva Meta";
    
    if (idx !== null) {
        const g = appData.savingsGoals[idx];
        document.getElementById('goal-name').value = g.name;
        document.getElementById('goal-target').value = g.target;
        document.getElementById('goal-current').value = g.current;
        document.getElementById('goal-priority').value = g.priority;
    }
    
    const modalEl = document.getElementById('goalModal');
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

function saveGoal() {
    // 1. Obtener referencias a los elementos
    const nameEl = document.getElementById('goal-name');
    const targetEl = document.getElementById('goal-target');
    const currentEl = document.getElementById('goal-current');
    const priorityEl = document.getElementById('goal-priority');
    const notes = document.getElementById('goal-notes').value.trim();

    // 2. Validar que los elementos existan en el HTML
    if (!nameEl || !targetEl) {
        console.error("Error: No se encontraron los inputs del modal en el HTML.");
        return;
    }

    const name = nameEl.value.trim();
    const target = parseFloat(targetEl.value);
    const current = currentEl ? (parseFloat(currentEl.value) || 0) : 0;
    const priority = priorityEl ? priorityEl.value : "2"; // Default "Media" si no existe el select

    // 3. Validar datos
    if (name && target > 0) {
        const goalData = { 
            name, target, current, priority, notes, // <--- Se añade 'notes'
            lastDepositDate: editingGoalIdx !== null ? appData.savingsGoals[editingGoalIdx].lastDepositDate : null
        };

        if (editingGoalIdx !== null) {
            appData.savingsGoals[editingGoalIdx] = goalData;
        } else {
            if (!appData.savingsGoals) appData.savingsGoals = [];
            appData.savingsGoals.push(goalData);
        }

        // 4. Guardar y Refrescar
        saveData(); 
        updateUI();
        
        // 5. Cerrar Modal de forma segura
        const modalEl = document.getElementById('goalModal');
        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.hide();
        
        showToast("✅ Meta guardada");
    } else {
        showToast("Ingresa nombre y monto válido", "warning");
    }
}

function deleteGoal(idx) {
    askConfirmation(`¿Borrar meta <b>${appData.savingsGoals[idx].name}</b>?`, () => {
        appData.savingsGoals.splice(idx, 1);
        updateUI();
    }, "Sí, eliminar", "btn-danger");
}

/**
 * Abre el modal y carga las cuentas de donde puedes sacar dinero
 */
function openGoalAbonoModal(idx) {
    const goal = appData.savingsGoals[idx];
    if (!goal) return;

    // 1. Llenar datos básicos en el modal
    document.getElementById('deposit-goal-idx').value = idx;
    document.getElementById('deposit-goal-name').innerText = goal.name;
    document.getElementById('deposit-goal-amount').value = '';

    // 2. Cargar las fuentes de dinero (Débito y Efectivo)
    const select = document.getElementById('deposit-goal-source');
    select.innerHTML = '';

    // Grupo Débito
    const gDeb = document.createElement('optgroup'); gDeb.label = "Cuentas de Débito";
    appData.debit.forEach((d, i) => gDeb.appendChild(new Option(`${d.name} (${fmt(d.balance)})`, `debit_${i}`)));

    // Grupo Efectivo
    const gAss = document.createElement('optgroup'); gAss.label = "Efectivo";
    appData.assets.forEach((a, i) => gAss.appendChild(new Option(`${a.name} (${fmt(a.amount)})`, `asset_${i}`)));

    select.add(gDeb); select.add(gAss);

    // 3. Mostrar el modal
    new bootstrap.Modal(document.getElementById('depositGoalModal')).show();
}

function checkMonthlyArchive() {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    // 1. Verificar si cambiamos de mes desde la última vez
    if (appData.lastSessionMonth !== currentMonth) {
        
        // 2. Identificar las metas que ya están en el Salón de la Fama (completadas)
        const toArchive = appData.savingsGoals.filter(goal => goal.current >= goal.target);

        if (toArchive.length > 0) {
            toArchive.forEach(goal => {
                // Añadimos metadata de cierre antes de archivar
                goal.archivedDate = today.toISOString();
                goal.finalStatus = "SUCCESS";
                
                // Mover al baúl de recuerdos
                appData.archives.push(goal);
            });

            // 3. Limpiar la lista activa: Dejamos solo las que NO se han terminado
            appData.savingsGoals = appData.savingsGoals.filter(goal => goal.current < goal.target);

            // 4. Feedback al usuario
            setTimeout(() => {
                showToast(`📦 ¡Nuevo mes! ${toArchive.length} metas completadas se movieron a tu historial anual.`, "info");
            }, 1500);
        }

        // 5. Actualizar el mes de control para que no se repita hasta el próximo mes
        appData.lastSessionMonth = currentMonth;
        saveData();
        updateUI();
    }
}

function showArchives() {
    if (!appData.archives || appData.archives.length === 0) {
        showToast("Aún no tienes metas archivadas.", "info");
        return;
    }
    
    console.table(appData.archives); // Por ahora, puedes verlas en la consola
    // Opcional: Podrías crear un modal que liste appData.archives similar al historial
    alert(`Tienes ${appData.archives.length} metas guardadas en tu histórico de éxito.`);
}

window.addEventListener('resize', () => {
    if (myChart) myChart.resize();
    if (debitPieInstance) debitPieInstance.resize();
    if (assetPieInstance) assetPieInstance.resize();
});