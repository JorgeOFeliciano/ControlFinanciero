// --- ESTADO GLOBAL ---
const defaultData = {
    cards: [],
    loans: [],
    debit: [
        { name: 'Mercado Pago', balance: 0 },
        { name: 'Nu', balance: 0 },
        { name: 'Klar', balance: 0 },
        { name: 'BBVA', balance: 0 },
        { name: 'Cashi', balance: 0 },
        { name: 'Uala', balance: 0 }
    ],
    assets: [],
    incomes: []
};

let appData = JSON.parse(JSON.stringify(defaultData));
let myChart = null;
let calendarViewDate = new Date();

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

// --- INICIALIZACIÓN SORTABLE (Drag & Drop) ---
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
            saveData(); updateUI(); alert("¡Datos actualizados!");
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
    rows.forEach(r => { if (r[0] && typeof r[1] === 'number') card.transactions.push({ desc: r[0], amount: r[1], months: r[2] || 1, paidCycles: r[3] || 0 }); });
}

// --- 2. CÁLCULOS ---
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

    return {
        debt: finalDebt,
        raw: rawDebt,
        avail: c.limit - finalDebt,
        monthly: monthlyPay
    };
}

// --- COLORES ---
// 1. Para clases CSS (Gradientes)
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

// 2. Para Chart.js (Colores Sólidos/RGBA) - NUEVA FUNCIÓN
function getBankColorHex(name) {
    const n = name.toLowerCase();
    if (n.includes('nu')) return '#82269e'; // Morado Nu
    if (n.includes('bbva') || n.includes('azul')) return '#004481'; // Azul BBVA
    if (n.includes('santander')) return '#ec0000'; // Rojo
    if (n.includes('mercado')) return '#009ee3'; // Azul MP
    if (n.includes('stori')) return '#00a5a3'; // Verde Stori
    if (n.includes('amex') || n.includes('oro')) return '#bf953f'; // Dorado
    if (n.includes('didi')) return '#ff7e00'; // Naranja Didi
    if (n.includes('rappi')) return '#ff414d'; // Rosa Rappi
    if (n.includes('klar')) return '#333333'; // Negro Klar
    if (n.includes('cashi')) return '#ff005e'; // Rosa Cashi
    if (n.includes('uala')) return '#ff3333'; // Rojo Uala
    return '#4b6cb7'; // Default Azul
}

// Helper: Icono de Categoría (NUEVO V0.11)
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

// --- 3. UI UPDATE ---
function updateUI() {
    // A. Dashboard - Tabla y Totales
    let tDebt = 0, tLimit = 0, tMonthlyGlobal = 0;
    const dt = document.getElementById('dashboard-table');
    dt.innerHTML = '';

    appData.cards.forEach(c => {
        const s = calcCard(c);
        tDebt += s.debt;
        tLimit += c.limit;
        tMonthlyGlobal += s.monthly;

        dt.innerHTML += `
        <tr>
            <td class="ps-4">${c.name}</td>
            <td class="text-end text-primary fw-bold">${fmt(s.monthly)}</td>
            <td class="pe-4 text-end fw-bold text-dark">${fmt(s.debt)}</td>
        </tr>`;
    });

    const totalMonthEl = document.getElementById('total-monthly-payment');
    if (totalMonthEl) totalMonthEl.innerText = fmt(tMonthlyGlobal);

    // B. Préstamos
    let tLoansRem = 0; let tCollected = 0; const lb = document.getElementById('loans-body'); lb.innerHTML = '';
    appData.loans.forEach((l, i) => {
        let rem = l.original - l.paid; tLoansRem += rem; tCollected += l.paid;
        let percent = l.original > 0 ? (l.paid / l.original) * 100 : 0;

        lb.innerHTML += `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <i class="fas fa-grip-vertical drag-handle me-2"></i>
                    <div class="w-100">
                        <div class="fw-bold">${l.name}</div>
                        <div class="small text-muted" style="font-size:0.75rem">
                            Orig: ${fmt(l.original)} | Pagado: ${fmt(l.paid)}
                        </div>
                        <div class="progress mt-1" style="height: 4px; width: 100%; max-width: 120px; border-radius: 2px;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${percent}%"></div>
                        </div>
                    </div>
                </div>
            </td>
            <td class="text-end fw-bold text-danger">${fmt(rem)}</td>
            <td class="text-end">
                <button class="btn-icon btn-light text-warning me-1" onclick="openEditModal('loan',${i})"><i class="fas fa-pen" style="font-size:0.8rem"></i></button>
                ${rem > 0 ? `<button class="btn-icon btn-icon-pay me-1" onclick="openPayModal(${i},'${l.name}')"><i class="fas fa-dollar-sign"></i></button>` : '<span class="badge bg-success me-1">Pagado</span>'}
                <button class="btn-icon btn-icon-del" onclick="delItem('loan',${i})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    // C. DÉBITO
    let tDebit = 0; const dGrid = document.getElementById('debit-grid'); dGrid.innerHTML = '';
    if (!appData.debit) appData.debit = defaultData.debit;

    appData.debit.forEach((d, i) => {
        tDebit += d.balance;
        const colorClass = getBankClass(d.name);
        dGrid.innerHTML += `
        <div class="col-6 col-md-4">
            <div class="mini-card ${colorClass}" onclick="openEditModal('debit', ${i})" title="Clic para editar saldo">
                <i class="fas fa-wifi card-contactless"></i>
                <div class="card-chip-icon"></div>
                <div class="mini-card-name mt-2">${d.name}</div>
                <div class="mt-auto text-end">
                    <div class="small opacity-75">Saldo</div>
                    <div class="mini-card-balance">${fmt(d.balance)}</div>
                </div>
            </div>
        </div>`;
    });
    dGrid.innerHTML += `<div class="col-6 col-md-4"><div class="mini-card mini-card-add h-100" onclick="openDebitModal()"><i class="fas fa-plus-circle fa-2x mb-2"></i><span class="small fw-bold">Nueva Tarjeta</span></div></div>`;

    // D. ACTIVOS
    let tAssets = 0; const ab = document.getElementById('assets-body'); ab.innerHTML = '';
    if (tCollected > 0) {
        ab.innerHTML += `<tr class="static-row table-light"><td><div class="d-flex align-items-center"><span class="fw-bold text-primary"><i class="fas fa-undo-alt me-2"></i>Recuperado de Deudas</span></div></td><td class="text-end text-success fw-bold">${fmt(tCollected)}</td><td class="text-end"><button class="btn-icon btn-icon-del" style="cursor: not-allowed; opacity: 0.5;"><i class="fas fa-lock"></i></button></td></tr>`;
    }
    if (tDebit > 0) {
        ab.innerHTML += `<tr class="static-row table-light"><td><div class="d-flex align-items-center"><span class="fw-bold text-dark"><i class="fas fa-credit-card me-2 text-primary"></i>Saldo en Tarjetas (Débito)</span></div></td><td class="text-end text-success fw-bold">${fmt(tDebit)}</td><td class="text-end"><button class="btn-icon btn-icon-del" style="cursor: not-allowed; opacity: 0.5;"><i class="fas fa-lock"></i></button></td></tr>`;
    }
    appData.assets.forEach((a, i) => {
        tAssets += a.amount;
        ab.innerHTML += `<tr><td><div class="d-flex align-items-center"><i class="fas fa-grip-vertical drag-handle me-2"></i><span class="fw-bold">${a.name}</span></div></td><td class="text-end text-success fw-bold">${fmt(a.amount)}</td><td class="text-end"><button class="btn-icon btn-light text-warning me-1" onclick="openEditModal('asset',${i})"><i class="fas fa-pen" style="font-size:0.8rem"></i></button><button class="btn-icon btn-icon-del" onclick="delItem('asset',${i})"><i class="fas fa-trash"></i></button></td></tr>`;
    });

    // E. Ingresos
    let tInc = 0; const il = document.getElementById('income-list-body'); il.innerHTML = '';
    const visInc = appData.incomes.filter(inc => {
        const d = new Date(inc.date + 'T00:00:00');
        return d.getMonth() === calendarViewDate.getMonth() && d.getFullYear() === calendarViewDate.getFullYear();
    });
    visInc.sort((a, b) => new Date(a.date) - new Date(b.date));
    visInc.forEach(inc => { tInc += inc.amount; il.innerHTML += `<tr><td><i class="fas fa-calendar-check text-success me-2"></i>${inc.date}</td><td class="text-end fw-bold text-dark">${fmt(inc.amount)}</td></tr>`; });

    // F. Totales
    document.getElementById('kpi-debt').innerText = fmt(tDebt);
    document.getElementById('kpi-available').innerText = fmt(tLimit - tDebt);
    document.getElementById('kpi-loans').innerText = fmt(tLoansRem);
    const granTotal = tAssets + tDebit + tCollected + appData.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    document.getElementById('kpi-assets').innerText = fmt(granTotal);
    document.getElementById('total-assets-sum').innerText = fmt(tAssets + tCollected + tDebit);
    document.getElementById('total-income-display').innerText = fmt(tInc);

    renderCalendar(); updateSelectors(); updateChart();
}

// --- ACTUALIZACIÓN GRÁFICA (COLORES DINÁMICOS) ---
function updateChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (myChart) myChart.destroy();

    // Generar array de colores basado en los nombres de las tarjetas
    const bgColors = appData.cards.map(c => getBankColorHex(c.name));

    // Versión con opacidad para el fondo y sólido para el borde
    const bgColorsAlpha = bgColors.map(c => {
        // Convertir HEX a RGBA simple (truco rápido para opacidad)
        // Nota: Para simplicidad usamos el color sólido, ChartJS lo maneja bien.
        return c;
    });

    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: appData.cards.map(x => x.name),
            datasets: [{
                label: 'Deuda Actual',
                data: appData.cards.map(x => calcCard(x).debt),
                backgroundColor: bgColorsAlpha, // Colores personalizados
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// --- MODALES ---
function openDebitModal() { document.getElementById('new-debit-name').value = ''; document.getElementById('new-debit-balance').value = ''; new bootstrap.Modal(document.getElementById('addDebitModal')).show(); }
function saveNewDebit() { const name = document.getElementById('new-debit-name').value; const balance = parseFloat(document.getElementById('new-debit-balance').value); if (name && balance >= 0) { appData.debit.push({ name: name, balance: balance }); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addDebitModal')).hide(); } else { alert("Datos inválidos"); } }
function openAssetModal(forcedType) { const sel = document.getElementById('asset-type-select'); document.getElementById('asset-custom-name').value = ''; document.getElementById('asset-amount').value = ''; sel.value = 'Billetes'; toggleCustomAssetInput(); new bootstrap.Modal(document.getElementById('addAssetModal')).show(); }
function toggleCustomAssetInput() { const type = document.getElementById('asset-type-select').value; const input = document.getElementById('asset-custom-name'); if (type === 'Otro') { input.classList.remove('d-none'); input.focus(); } else { input.classList.add('d-none'); } }
function saveNewAsset() { const type = document.getElementById('asset-type-select').value; let name = type; if (type === 'Otro') { name = document.getElementById('asset-custom-name').value.trim(); if (!name) return; } const amount = parseFloat(document.getElementById('asset-amount').value); if (amount > 0) { const idx = appData.assets.findIndex(a => a.name === name); if (idx >= 0) appData.assets[idx].amount += amount; else appData.assets.push({ name: name, amount: amount }); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addAssetModal')).hide(); } }
function openEditModal(type, idx) { const header = document.getElementById('edit-modal-header'); const btn = document.getElementById('edit-save-btn'); const nameIn = document.getElementById('edit-name'); const amtIn = document.getElementById('edit-amount'); document.getElementById('edit-type').value = type; document.getElementById('edit-idx').value = idx; let item; if (type === 'loan') { item = appData.loans[idx]; header.className = "modal-header border-bottom-0 text-white bg-danger"; btn.className = "btn w-100 rounded-pill fw-bold text-white bg-danger"; nameIn.value = item.name; amtIn.value = item.original; } else if (type === 'debit') { item = appData.debit[idx]; header.className = "modal-header border-bottom-0 text-white bg-primary"; btn.className = "btn w-100 rounded-pill fw-bold text-white bg-primary"; nameIn.value = item.name; amtIn.value = item.balance; } else { item = appData.assets[idx]; header.className = "modal-header border-bottom-0 text-white bg-success"; btn.className = "btn w-100 rounded-pill fw-bold text-white bg-success"; nameIn.value = item.name; amtIn.value = item.amount; } new bootstrap.Modal(document.getElementById('editModal')).show(); }
function saveEdit() { const type = document.getElementById('edit-type').value; const idx = document.getElementById('edit-idx').value; const name = document.getElementById('edit-name').value; const amt = parseFloat(document.getElementById('edit-amount').value); if (name && amt >= 0) { if (type === 'loan') { appData.loans[idx].name = name; appData.loans[idx].original = amt; } else if (type === 'debit') { appData.debit[idx].name = name; appData.debit[idx].balance = amt; } else { appData.assets[idx].name = name; appData.assets[idx].amount = amt; } saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('editModal')).hide(); } }
function delItem(type, idx) { document.getElementById('del-type').value = type; document.getElementById('del-idx').value = idx; new bootstrap.Modal(document.getElementById('deleteModal')).show(); }
function confirmDelete() { const type = document.getElementById('del-type').value; const idx = parseInt(document.getElementById('del-idx').value); if (type === 'loan') appData.loans.splice(idx, 1); else if (type === 'debit') appData.debit.splice(idx, 1); else if (type === 'asset') appData.assets.splice(idx, 1); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide(); }

// --- CALENDARIO Y OTROS ---
function changeMonth(n) { calendarViewDate.setMonth(calendarViewDate.getMonth() + n); updateUI() }
function renderCalendar() { const now = new Date(); const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); const cd = today.getDay(); const dist = cd === 0 ? 6 : cd - 1; const mon = new Date(today); mon.setDate(today.getDate() - dist); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); const y = calendarViewDate.getFullYear(); const m = calendarViewDate.getMonth(); const names = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]; document.getElementById('month-label').innerText = `${names[m]} ${y}`; const first = new Date(y, m, 1).getDay(); const dim = new Date(y, m + 1, 0).getDate(); const off = first === 0 ? 6 : first - 1; const g = document.getElementById('calendar-days'); g.innerHTML = ''; for (let i = 0; i < off; i++)g.innerHTML += `<div></div>`; for (let i = 1; i <= dim; i++) { const dObj = new Date(y, m, i); const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`; const isSun = dObj.getDay() === 0; const has = appData.incomes.some(x => x.date === iso); const amount = has ? appData.incomes.find(x => x.date === iso).amount : ''; const isPast = dObj < today; const isFuture = dObj > sun; const isCur = dObj >= mon && dObj <= sun; let c = `calendar-day ${has ? 'has-income' : ''} `; if (isSun && isPast) c += 'sunday past '; else if (isSun) c += 'sunday '; if (isCur && !isPast) c += 'current-week '; if (isFuture) c += 'future '; g.innerHTML += `<div class="${c}" data-amount="${fmt(amount)}" onclick="dateClick('${iso}',${isSun},${isPast},${isFuture})">${i}</div>` } }
function dateClick(d, s, p, f) { if (f) { const m = ["🔮 ¡Aún no viajas en el tiempo!", "🚫 Spoilers no permitidos.", "🧘 Paciencia.", "⏳ El futuro no está escrito."]; const t = document.getElementById('cal-modal-title'); t.innerText = "Futuro Bloqueado"; t.className = "modal-title fw-bold text-warning"; document.getElementById('cal-modal-msg').innerText = m[Math.floor(Math.random() * m.length)]; const b = document.getElementById('cal-modal-btn'); b.innerText = "Entendido"; b.className = "btn btn-warning w-100 rounded-pill text-white"; b.onclick = () => bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide(); document.getElementById('cal-modal-input-wrapper').classList.add('d-none'); new bootstrap.Modal(document.getElementById('calendarModal')).show(); return } const ex = appData.incomes.find(x => x.date === d); if (p) { const t = document.getElementById('cal-modal-title'); t.innerText = `Detalle del ${d}`; t.className = "modal-title fw-bold text-secondary"; document.getElementById('cal-modal-msg').innerHTML = ex ? `✅ Registrado: <strong class="text-success">${fmt(ex.amount)}</strong>` : "⚠️ Nada registrado."; const b = document.getElementById('cal-modal-btn'); b.innerText = "Cerrar"; b.className = "btn btn-secondary w-100 rounded-pill"; b.onclick = () => bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide(); document.getElementById('cal-modal-input-wrapper').classList.add('d-none'); new bootstrap.Modal(document.getElementById('calendarModal')).show() } else { const t = document.getElementById('cal-modal-title'); const w = document.getElementById('cal-modal-input-wrapper'); const i = document.getElementById('cal-modal-amount'); const b = document.getElementById('cal-modal-btn'); document.getElementById('cal-modal-date').value = d; w.classList.remove('d-none'); b.classList.remove('d-none'); t.innerText = s ? "Domingo de Cobro" : "Ingreso Extra"; t.className = s ? "modal-title fw-bold text-success" : "modal-title fw-bold text-primary"; document.getElementById('cal-modal-msg').innerText = `Monto ${d}:`; i.value = ex ? ex.amount : ''; b.innerText = "Guardar"; b.className = "btn btn-primary w-100 rounded-pill"; b.onclick = saveCalendarIncome; new bootstrap.Modal(document.getElementById('calendarModal')).show() } }
function saveCalendarIncome() { const d = document.getElementById('cal-modal-date').value; const v = parseFloat(document.getElementById('cal-modal-amount').value); if (document.getElementById('cal-modal-amount').value === '') { appData.incomes = appData.incomes.filter(x => x.date !== d) } else if (v > 0) { appData.incomes = appData.incomes.filter(x => x.date !== d); appData.incomes.push({ date: d, amount: v }) } saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('calendarModal')).hide() }
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

            // Icono basado en categoría (o General si viene de Excel)
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
function updateChart() {
    const c = document.getElementById('mainChart').getContext('2d'); if (myChart) myChart.destroy();
    const bg = appData.cards.map(c => getBankColorHex(c.name));
    myChart = new Chart(c, { type: 'bar', data: { labels: appData.cards.map(x => x.name), datasets: [{ label: 'Deuda', data: appData.cards.map(x => calcCard(x).debt), backgroundColor: bg, borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } } } })
}

// --- V0.12: FUNCIONES DE SISTEMA (BACKUP & PRIVACIDAD) ---

// 1. MODO PRIVACIDAD
function togglePrivacy() {
    document.body.classList.toggle('privacy-active');
    const icon = document.getElementById('privacy-icon');

    if (document.body.classList.contains('privacy-active')) {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// 2. DESCARGAR RESPALDO (EXPORTAR JSON)
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
    // Limpiamos el input por si había un archivo seleccionado antes
    document.getElementById('backup-file-input').value = '';
    new bootstrap.Modal(document.getElementById('restoreBackupModal')).show();
}

function processRestoreFile() {
    const input = document.getElementById('backup-file-input');
    const file = input.files[0];

    if (!file) {
        alert("Por favor selecciona un archivo .json primero.");
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // A. Convertir texto a Objeto JSON
            const json = JSON.parse(e.target.result);
            
            // B. Validación básica (¿Es un archivo de esta app?)
            // Verificamos si tiene las propiedades clave
            if (json.cards && json.loans && json.debit) {
                
                // C. Actualizar Memoria
                appData = json;
                
                // D. Guardar en LocalStorage (Persistencia)
                saveData();
                
                // E. Refrescar la Interfaz (Visual)
                updateUI();
                
                // F. Cerrar Modal y Avisar
                bootstrap.Modal.getInstance(document.getElementById('restoreBackupModal')).hide();
                
                // --- CAMBIO AQUÍ ---
                // Reemplazamos el alert feo por el Toast bonito
                showToast('<i class="fas fa-check-circle me-2"></i>¡Copia de seguridad restaurada con éxito!');
                
            } else {
                // También podemos usarlo para errores
                showToast('<i class="fas fa-times-circle me-2"></i>El archivo no es válido.', 'error');
            }
        } catch (error) {
            console.error(error);
            alert("❌ Ocurrió un error al leer el archivo. Asegúrate de que sea un JSON válido.");
        }
    };

    reader.readAsText(file);
}

// 3. RESTAURAR RESPALDO (IMPORTAR JSON)
document.getElementById('backupInput').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);

            // Validación básica para asegurar que es un archivo válido de nuestra app
            if (json.cards && json.loans && json.debit) {
                if (confirm("⚠️ ¿Estás seguro? Esto reemplazará todos tus datos actuales con los del respaldo.")) {
                    appData = json;
                    saveData();
                    updateUI();
                    alert("✅ ¡Respaldo restaurado con éxito!");
                }
            } else {
                alert("❌ El archivo no tiene el formato correcto.");
            }
        } catch (error) {
            alert("❌ Error al leer el archivo JSON.");
            console.error(error);
        }
    };
    reader.readAsText(file);
    // Limpiar el input para permitir cargar el mismo archivo si es necesario
    e.target.value = '';
});

// --- LÓGICA DE BORRADO DE TRANSACCIONES ---

// 1. Abrir el Modal al dar clic en el icono de basura
function delTransaction(ix) {
    const cardIdx = document.getElementById('card-selector').value;

    // Verificamos que la tarjeta exista
    if (appData.cards[cardIdx] && appData.cards[cardIdx].transactions[ix]) {
        const transaction = appData.cards[cardIdx].transactions[ix];

        // Llenamos el modal con datos
        document.getElementById('del-trans-name').innerText = transaction.desc;
        document.getElementById('del-trans-index').value = ix;

        // Abrimos el modal
        new bootstrap.Modal(document.getElementById('deleteTransModal')).show();
    }
}

// 2. Ejecutar el borrado al confirmar en el modal
function confirmDeleteTransaction() {
    const cardIdx = document.getElementById('card-selector').value;
    const transIdx = document.getElementById('del-trans-index').value;

    if (cardIdx !== "" && transIdx !== "") {
        // Borrar del Array
        appData.cards[cardIdx].transactions.splice(transIdx, 1);

        saveData(); // Guardar

        // Actualizar UI
        updateUI();
        renderCardDetail(cardIdx); // Refrescar la tabla visualmente

        // Cerrar modal
        const modalEl = document.getElementById('deleteTransModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    }
}

// --- UTILIDAD: MOSTRAR NOTIFICACIÓN (TOAST) ---
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const msgContainer = document.getElementById('toast-msg');
    
    // Cambiar color según tipo (éxito o error)
    if (type === 'error') {
        toastEl.classList.remove('bg-success');
        toastEl.classList.add('bg-danger');
    } else {
        toastEl.classList.remove('bg-danger');
        toastEl.classList.add('bg-success');
    }

    msgContainer.innerHTML = message; // Insertar mensaje
    
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 }); // Dura 3 segundos
    toast.show();
}

function openPurchaseModal() { const s = document.getElementById('card-selector'); const i = s.value; if (!appData.cards[i]) { alert("Carga Excel primero"); return } document.getElementById('purchase-card-name').innerText = appData.cards[i].name; document.getElementById('new-purch-desc').value = ''; document.getElementById('new-purch-amount').value = ''; document.getElementById('new-purch-months').value = '1'; new bootstrap.Modal(document.getElementById('addPurchaseModal')).show() }
function savePurchase() {
    const i = document.getElementById('card-selector').value;
    const cat = document.getElementById('new-purch-cat').value; // Nueva Categoría
    const d = document.getElementById('new-purch-desc').value;
    const a = parseFloat(document.getElementById('new-purch-amount').value);
    const m = parseInt(document.getElementById('new-purch-months').value);

    if (d && a > 0) {
        appData.cards[i].transactions.push({
            desc: d, amount: a, months: m, paidCycles: 0, category: cat // Guardamos categoría
        });
        saveData(); updateUI();
        bootstrap.Modal.getInstance(document.getElementById('addPurchaseModal')).hide();
    } else { alert("Completa datos"); }
}
function addNewLoan() { const n = document.getElementById('nl-name').value; const a = parseFloat(document.getElementById('nl-amount').value); if (n && a) { appData.loans.push({ name: n, original: a, paid: 0 }); saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('addLoanModal')).hide(); document.getElementById('nl-name').value = ''; document.getElementById('nl-amount').value = '' } }
function openPayModal(i, n) { document.getElementById('pay-label').innerText = `Abonar a: ${n}`; document.getElementById('pay-idx').value = i; document.getElementById('pay-amount').value = ''; new bootstrap.Modal(document.getElementById('payModal')).show() }
function submitPay() { const i = document.getElementById('pay-idx').value; const a = parseFloat(document.getElementById('pay-amount').value); if (a > 0) { appData.loans[i].paid += a; saveData(); updateUI(); bootstrap.Modal.getInstance(document.getElementById('payModal')).hide() } }

function loadData() { const s = localStorage.getItem('finanzasApp_Split_v1'); if (s) appData = JSON.parse(s); }
function saveData() { localStorage.setItem('finanzasApp_Split_v1', JSON.stringify(appData)); }