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

const NAME_TO_HEX = Object.fromEntries(Object.entries(COLOR_MAP).map(a => a.reverse()));
const COLORS = Object.keys(COLOR_MAP);

let orders = [];
let state = { fColors: [], bColors: [] };
let pendingDelete = null;

/* --- INIT --- */
function init() {
  createFallingFlowers();

  const dateInput = document.getElementById('order-date');
  if (dateInput) dateInput.valueAsDate = new Date();

  renderPicker('flower', COLORS);
  renderPicker('bouquet', COLORS);

  document.getElementById('add-order-btn').onclick = handleAdd;
  document.getElementById('cancel-delete-btn').onclick = () => toggleModal(false);
  document.getElementById('confirm-delete-btn').onclick = handleDelete;

  fetchOrders(); // โหลดข้อมูลจาก Google Sheet
}

/* --- FETCH ORDERS (แก้โหลดค้างแล้ว) --- */
async function fetchOrders() {
  showLoading(true);
  showEmptyState("กำลังโหลดข้อมูล...");

  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    orders = Array.isArray(data) ? data : [];
    renderTable();
  } catch (e) {
    console.error(e);
    showEmptyState("โหลดข้อมูลไม่สำเร็จ");
  } finally {
    showLoading(false);
  }
}

/* --- ADD ORDER --- */
async function handleAdd() {
  const form = {
    name: document.getElementById('customer-name').value,
    queue: document.getElementById('queue-number').value,
    count: document.getElementById('flower-count').value,
    date: document.getElementById('order-date').value,
    price: document.getElementById('price').value,
    notes: document.getElementById('notes').value
  };

  if (!form.name || !form.price) {
    alert('⚠️ ใส่ชื่อกับราคาหน่อยน้า');
    return;
  }

  const btn = document.getElementById('add-order-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '✅ บันทึกแล้ว!';
  btn.disabled = true;

  const payload = {
    id: 'id_' + Date.now(),
    customer_name: form.name,
    queue_number: parseInt(form.queue) || 0,
    flower_count: parseInt(form.count) || 1,
    order_date: form.date,
    price: parseFloat(form.price),
    notes: form.notes,
    flower_colors: colorsToNames(state.fColors),
    bouquet_colors: colorsToNames(state.bColors),
    is_paid: false
  };

  orders.push(payload);
  renderTable();
  resetForm();

  // ส่งไป Google Sheet แบบ background (ไม่รอ)
  fetch(API_URL + "?action=create", {
    method: 'POST',
    mode: 'no-cors',
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  }).catch(() => {});

  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }, 1000);
}

/* --- RENDER TABLE --- */
function renderTable() {
  const tbody = document.getElementById('orders-list-body');
  const emptyState = document.getElementById('empty-state');
  const tableWrapper = document.getElementById('table-wrapper');

  if (orders.length === 0) {
    showEmptyState("ยังไม่มีออเดอร์จ้า<br>รอรับลูกค้าคนแรกอยู่น้า...");
    document.getElementById('order-count').innerText = 0;
    document.getElementById('total-revenue').innerText = '฿0';
    return;
  }

  emptyState.classList.add('hidden');
  tableWrapper.classList.remove('hidden');

  const sorted = [...orders].sort((a,b) => (a.queue_number||0) - (b.queue_number||0));
  document.getElementById('order-count').innerText = orders.length;
  document.getElementById('total-revenue').innerText =
    '฿' + orders.reduce((s,o)=>s+(o.price||0),0).toLocaleString();

  tbody.innerHTML = '';
  sorted.forEach(o => {
    const tr = document.createElement('tr');
    tr.className = 'pop-row';

    const statusColor = o.is_paid ? 'text-green-600' : 'text-red-500';

    tr.innerHTML = `
      <td class="text-center">${o.queue_number}</td>
      <td>${o.customer_name}</td>
      <td class="text-center">${o.flower_count}</td>
      <td>${renderDotsFromName(o.flower_colors)} ${renderDotsFromName(o.bouquet_colors)}</td>
      <td class="text-right ${statusColor}">฿${o.price}</td>
      <td class="text-center">
        <input type="checkbox" ${o.is_paid ? 'checked':''}
          onchange="togglePaid('${o.id}', this.checked)">
      </td>
      <td class="text-center">
        <button onclick="askDelete('${o.id}')">×</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* --- HELPERS --- */
function colorsToNames(arr) {
  return arr.map(c => COLOR_MAP[c]).join(', ');
}

function renderDotsFromName(str) {
  if (!str) return '';
  return str.split(',').map(n => {
    const hex = NAME_TO_HEX[n.trim()] || '#ccc';
    return `<span class="table-dot" style="background:${hex}"></span>`;
  }).join('');
}

function resetForm() {
  document.getElementById('customer-name').value = '';
  document.getElementById('price').value = '';
  document.getElementById('flower-count').value = '';
  document.getElementById('notes').value = '';
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  state.fColors = [];
  state.bColors = [];
}

/* --- PICKER / UI --- */
function renderPicker(type, colors) {
  const container = document.getElementById(`${type}-colors-picker`);
  colors.forEach(c => {
    const btn = document.createElement('div');
    btn.className = 'color-btn';
    btn.style.backgroundColor = c;
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
  document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

function showEmptyState(msg) {
  const empty = document.getElementById('empty-state');
  empty.querySelector('p').innerHTML = msg;
  empty.classList.remove('hidden');
  document.getElementById('table-wrapper').classList.add('hidden');
}

function toggleModal(show) {
  document.getElementById('delete-modal').classList.toggle('hidden', !show);
}

/* --- DELETE / PAID --- */
window.togglePaid = async (id, isPaid) => {
  const i = orders.findIndex(o => o.id === id);
  if (i > -1) {
    orders[i].is_paid = isPaid;
    renderTable();
    fetch(API_URL + "?action=update", {
      method:'POST', mode:'no-cors',
      body: JSON.stringify({id, is_paid:isPaid})
    });
  }
};

window.askDelete = id => {
  pendingDelete = orders.find(o => o.id === id);
  toggleModal(true);
};

window.handleDelete = async () => {
  if (!pendingDelete) return;
  const id = pendingDelete.id;
  orders = orders.filter(o => o.id !== id);
  renderTable();
  toggleModal(false);
  fetch(API_URL + "?action=delete&id=" + id, { mode:'no-cors' });
};

/* --- EFFECT --- */
function createFallingFlowers() {
  const c = document.getElementById('falling-container');
  const items = ['🌸','🍃','💮','✨'];
  for (let i=0;i<15;i++){
    const el = document.createElement('div');
    el.className='falling-item';
    el.innerText=items[Math.floor(Math.random()*items.length)];
    el.style.left=Math.random()*100+'%';
    el.style.fontSize=(Math.random()*15+15)+'px';
    el.style.animationDuration=(Math.random()*5+5)+'s';
    el.style.animationDelay=(Math.random()*5)+'s';
    c.appendChild(el);
  }
}

init();
