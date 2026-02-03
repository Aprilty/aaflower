/* --- CONFIGURATION --- */
const API_URL = "https://script.google.com/macros/s/AKfycbxIrAI31xYNrCboyNNoOBDxA1k3n7WZzKn9Hg-sYLmReAZ7K58MTbIVaHi-xFRhL2oE/exec";

/* --- ตั้งค่าสี และ ชื่อไทย --- */
const COLOR_MAP = {
    '#ef4444': 'แดง',
    '#f97316': 'ส้ม',
    '#f59e0b': 'เหลือง',
    '#84cc16': 'เขียวอ่อน',
    '#10b981': 'เขียว',
    '#06b6d4': 'ฟ้าคราม',
    '#3b82f6': 'น้ำเงิน',
    '#8b5cf6': 'ม่วง',
    '#d946ef': 'ชมพูเข้ม',
    '#f43f5e': 'ชมพู',
    '#1f2937': 'ดำ',
    '#ffffff': 'ขาว'
};

// สร้างตัวแปลงกลับ (ชื่อไทย -> รหัสสี Hex) สำหรับแสดงผล
const NAME_TO_HEX = Object.fromEntries(Object.entries(COLOR_MAP).map(a => a.reverse()));
const COLORS = Object.keys(COLOR_MAP);

let orders = [];
let state = { fColors: [], bColors: [] };
let pendingDelete = null;

/* --- Initialization --- */
function init() {
    createFallingFlowers();
    const dateInput = document.getElementById('order-date');
    if(dateInput) dateInput.valueAsDate = new Date();

    renderPicker('flower', COLORS);
    renderPicker('bouquet', COLORS);
    
    // ผูก Event Listeners
    const addBtn = document.getElementById('add-order-btn');
    if(addBtn) addBtn.onclick = handleAdd;

    const cancelDelBtn = document.getElementById('cancel-delete-btn');
    if(cancelDelBtn) cancelDelBtn.onclick = () => toggleModal(false);

    const confirmDelBtn = document.getElementById('confirm-delete-btn');
    if(confirmDelBtn) confirmDelBtn.onclick = handleDelete;
    
    // โหลดข้อมูลเริ่มต้น
    fetchOrders();
}

/* --- Functions --- */

async function fetchOrders() {
    showLoading(true);
    showEmptyState("กำลังโหลดข้อมูล...");
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        orders = data.map(d => ({
            ...d, 
            is_paid: (d.is_paid === true || d.is_paid === 'TRUE' || d.is_paid === 'true')
        }));
        renderTable();
    } catch (e) {
        console.error(e);
        showEmptyState("โหลดไม่สำเร็จ T_T<br>ลองรีเฟรชใหม่นะ");
    }
    showLoading(false);
}

// แปลงรหัสสี -> ชื่อไทย (สำหรับส่ง Google Sheet)
function colorsToNames(hexList) {
    return hexList.map(h => COLOR_MAP[h] || h).join(', ');
}

// แปลงชื่อไทย -> จุดสี (สำหรับแสดงผลหน้าเว็บ)
function renderDotsFromName(nameStr) {
    if(!nameStr) return '';
    return nameStr.split(',').map(name => {
        const trimName = name.trim();
        const hex = NAME_TO_HEX[trimName] || '#cccccc'; 
        return `<div class="table-dot" style="background:${hex}" title="${trimName}"></div>`;
    }).join(' ');
}

async function handleAdd() {
    const form = {
        name: document.getElementById('customer-name').value,
        queue: document.getElementById('queue-number').value,
        count: document.getElementById('flower-count').value,
        date: document.getElementById('order-date').value,
        price: document.getElementById('price').value,
        notes: document.getElementById('notes').value
    };

    if (!form.name || !form.price) { alert('⚠️ ใส่ชื่อกับราคาหน่อยน้า'); return; }

    const btn = document.getElementById('add-order-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ กำลังส่ง...';
    btn.disabled = true;
    
    // ข้อมูลสำหรับแสดงผลทันที (Optimistic UI)
    const payloadDisplay = {
        id: 'id_' + Date.now(),
        customer_name: form.name,
        queue_number: parseInt(form.queue) || 0,
        flower_count: parseInt(form.count) || 1,
        order_date: form.date,
        price: parseFloat(form.price),
        notes: form.notes,
        flower_colors: colorsToNames(state.fColors), // แปลงเป็นไทย
        bouquet_colors: colorsToNames(state.bColors), // แปลงเป็นไทย
        is_paid: false
    };

    orders.push(payloadDisplay);
    renderTable();
    resetForm();

    try {
        // ใช้ mode: 'no-cors' เพื่อส่งแล้วไม่ต้องรอ Google ตอบกลับ (แก้ปัญหาโหลดค้าง)
        await fetch(API_URL + "?action=create", {
            method: 'POST',
            mode: 'no-cors', 
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payloadDisplay)
        });
    } catch (e) {
        console.log("Send Attempted (no-cors mode)"); 
    }

    // คืนค่าปุ่มทันที
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 500);
}

function resetForm() {
    document.getElementById('customer-name').value = '';
    document.getElementById('price').value = '';
    document.getElementById('flower-count').value = '';
    document.getElementById('notes').value = '';
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    state.fColors = []; state.bColors = [];
}

// ต้องประกาศ window.function เพื่อให้ HTML เรียกใช้ได้
window.togglePaid = async (id, isPaid) => {
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex > -1) {
        orders[orderIndex].is_paid = isPaid;
        renderTable();
        try {
            await fetch(API_URL + "?action=update", {
                method: 'POST',
                mode: 'no-cors',
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({id: id, is_paid: isPaid})
            });
        } catch(e) {}
    }
};

window.askDelete = (id) => { 
    pendingDelete = orders.find(o => o.id === id); 
    toggleModal(true); 
};

window.handleDelete = async () => {
    if(pendingDelete) {
        const idToDelete = pendingDelete.id;
        orders = orders.filter(o => o.id !== idToDelete);
        renderTable();
        toggleModal(false);
        try {
            await fetch(API_URL + "?action=delete&id=" + idToDelete, { mode: 'no-cors' });
        } catch(e) {}
    }
};

function renderTable() {
    const tbody = document.getElementById('orders-list-body');
    const emptyState = document.getElementById('empty-state');
    const tableWrapper = document.getElementById('table-wrapper');
    
    if (orders.length === 0) {
        showEmptyState("ยังไม่มีออเดอร์จ้า<br>รอรับลูกค้าคนแรกอยู่น้า...");
        document.getElementById('order-count').innerText = 0;
        document.getElementById('total-revenue').innerText = '฿0';
        return;
    } else {
        emptyState.classList.add('hidden');
        tableWrapper.classList.remove('hidden');
    }

    const sorted = [...orders].sort((a,b) => (a.queue_number||0) - (b.queue_number||0));
    document.getElementById('order-count').innerText = orders.length;
    document.getElementById('total-revenue').innerText = '฿' + orders.reduce((s,o)=>s+(o.price||0),0).toLocaleString();

    tbody.innerHTML = '';
    sorted.forEach(o => {
        const tr = document.createElement('tr');
        tr.className = 'pop-row'; 
        
        let colorDisplay = '';
        if (o.flower_colors && o.flower_colors.length > 0) 
            colorDisplay += `<div class="flex items-center gap-1 mb-1"><span class="text-[9px] bg-pink-100 text-pink-600 px-1 rounded w-6 text-center">ดอก</span><div class="flex -space-x-1 ml-1">${renderDotsFromName(o.flower_colors)}</div></div>`;
        if (o.bouquet_colors && o.bouquet_colors.length > 0) 
            colorDisplay += `<div class="flex items-center gap-1"><span class="text-[9px] bg-purple-100 text-purple-600 px-1 rounded w-6 text-center">ช่อ</span><div class="flex -space-x-1 ml-1">${renderDotsFromName(o.bouquet_colors)}</div></div>`;
        if (!colorDisplay) colorDisplay = '<span class="text-gray-300 text-[10px]">- ไม่ระบุ -</span>';

        const statusColor = o.is_paid ? 'text-green-600' : 'text-red-500';

        tr.innerHTML = `
            <td class="text-center">
            <span class="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-md text-xs border border-gray-200">${o.queue_number}</span>
            </td>
            <td class="font-medium text-gray-700 relative">
            ${o.customer_name}
            ${o.notes ? `<div class="text-[10px] text-gray-400 mt-0.5 bg-yellow-50 px-1 rounded inline-block border border-yellow-100">📝 ${o.notes}</div>` : ''}
            </td>
            <td class="text-center text-sm font-semibold text-gray-600">${o.flower_count}</td>
            <td>${colorDisplay}</td>
            <td class="text-right">
                <div class="font-bold ${statusColor} text-sm">฿${o.price}</div>
            </td>
            <td class="text-center align-middle">
                <label class="tgl-wrap">
                <input type="checkbox" class="tgl-inp" ${o.is_paid ? 'checked' : ''} onchange="togglePaid('${o.id}', this.checked)">
                <div class="tgl-bg"><div class="tgl-ball"></div></div>
                </label>
            </td>
            <td class="text-center align-middle">
                <button onclick="askDelete('${o.id}')" class="text-gray-300 hover:text-red-500 transition-colors font-bold text-lg px-2">×</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderPicker(type, colors) {
    const container = document.getElementById(`${type}-colors-picker`);
    if(!container) return;
    colors.forEach(c => {
        const btn = document.createElement('div');
        btn.className = 'color-btn';
        btn.style.backgroundColor = c;
        if(c==='#ffffff') btn.style.border = '1px solid #ddd';
        btn.onclick = () => {
            const list = state[`${type.charAt(0)}Colors`];
            const idx = list.indexOf(c);
            if (idx > -1) { list.splice(idx,1); btn.classList.remove('selected'); }
            else { list.push(c); btn.classList.add('selected'); }
        };
        container.appendChild(btn);
    });
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) {
        if(show) overlay.classList.remove('hidden'); else overlay.classList.add('hidden');
    }
}

function showEmptyState(msg) {
    const emptyState = document.getElementById('empty-state');
    const tableWrapper = document.getElementById('table-wrapper');
    if(emptyState && tableWrapper) {
        emptyState.querySelector('p').innerHTML = msg;
        emptyState.classList.remove('hidden');
        tableWrapper.classList.add('hidden');
    }
}

function toggleModal(show) { 
    const el = document.getElementById('delete-modal'); 
    if(el) {
        if(show) el.classList.remove('hidden'); else el.classList.add('hidden'); 
    }
}

function createFallingFlowers() {
    const container = document.getElementById('falling-container');
    if(!container) return;
    const items = ['🌸', '🍃', '💮', '🌸', '✨'];
    const count = 15;
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'falling-item';
        el.innerText = items[Math.floor(Math.random() * items.length)];
        el.style.left = Math.random() * 100 + '%';
        el.style.fontSize = (Math.random() * 15 + 15) + 'px';
        el.style.animationDuration = (Math.random() * 5 + 5) + 's';
        el.style.animationDelay = (Math.random() * 5) + 's';
        container.appendChild(el);
    }
}

// เริ่มทำงานเมื่อโหลดเสร็จ
init();
