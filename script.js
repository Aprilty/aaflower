/*************************
 * CONFIG
 *************************/
const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL';

/*************************
 * STATE
 *************************/
let orders = [];
const state = {
  fColors: [],
  bColors: []
};

/*************************
 * COLOR MAP
 *************************/
const COLOR_MAP = {
  '#ef4444': 'แดง',
  '#f97316': 'ส้ม',
  '#f59e0b': 'เหลือง',
  '#84cc16': 'เขียวอ่อน',
  '#10b981': 'เขียว',
  '#06b6d4': 'ฟ้า',
  '#3b82f6': 'น้ำเงิน',
  '#8b5cf6': 'ม่วง',
  '#d946ef': 'ชมพูเข้ม',
  '#f43f5e': 'ชมพู',
  '#1f2937': 'ดำ',
  '#ffffff': 'ขาว'
};

const NAME_TO_HEX = Object.fromEntries(
  Object.entries(COLOR_MAP).map(([hex, name]) => [name, hex])
);

function colorsToNames(list) {
  return list.map(c => COLOR_MAP[c]).join(', ');
}

/*************************
 * LOADING / EMPTY
 *************************/
function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  if (!el) return;
  el.classList.toggle('hidden', !show);
}

function showEmptyState(text) {
  const el = document.getElementById('empty-state');
  if (!el) return;
  el.innerHTML = text;
  el.classList.remove('hidden');
}

/*************************
 * FETCH ORDERS
 *************************/
async function fetchOrders() {
  showLoading(true);
  showEmptyState('กำลังโหลดข้อมูล...');

  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    orders = data || [];
    renderTable();
  } catch (err) {
    console.error(err);
    showEmptyState('โหลดข้อมูลไม่สำเร็จ');
  } finally {
    // ⭐ แก้โหลดค้าง
    showLoading(false);
  }
}

/*************************
 * RENDER TABLE
 *************************/
function renderTable() {
  showLoading(false);

  const tbody = document.getElementById('orders-list-body');
  const emptyState = document.getElementById('empty-state');
  const tableWrapper = document.getElementById('table-wrapper');

  if (!orders || orders.length === 0) {
    showEmptyState('ยังไม่มีออเดอร์');
    return;
  }

  emptyState.classList.add('hidden');
  tableWrapper.classList.remove('hidden');

  tbody.innerHTML = '';

  orders
    .sort((a, b) => (a.queue_number || 0) - (b.queue_number || 0))
    .forEach(o => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="text-center">${o.queue_number}</td>
        <td>${o.customer_name}</td>
        <td class="text-center">${o.flower_count}</td>
        <td>
          ${renderDotsFromName(o.flower_colors)}
          ${renderDotsFromName(o.bouquet_colors)}
        </td>
        <td class="text-right font-bold">฿${o.price}</td>
        <td class="text-center">
          <input type="checkbox" ${o.is_paid ? 'checked' : ''}
            onchange="togglePaid('${o.id}', this.checked)">
        </td>
        <td class="text-center">
          <button onclick="askDelete('${o.id}')" class="text-red-500">×</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
}

/*************************
 * RENDER COLOR DOTS
 *************************/
function renderDotsFromName(nameStr) {
  if (!nameStr) return '';
  return nameStr
    .split(',')
    .map(n => {
      const hex = NAME_TO_HEX[n.trim()] || '#ccc';
      return `<span class="table-dot" style="background:${hex}"></span>`;
    })
    .join('');
}

/*************************
 * ADD ORDER
 *************************/
async function handleAdd(form) {
  showLoading(true);

  const payload = {
    id: 'id_' + Date.now(),
    customer_name: form.name,
    queue_number: parseInt(form.queue),
    flower_count: parseInt(form.count),
    order_date: form.date,
    price: parseFloat(form.price),
    notes: form.notes || '',
    flower_colors: colorsToNames(state.fColors),
    bouquet_colors: colorsToNames(state.bColors),
    is_paid: false
  };

  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    orders.push(payload);
    renderTable();
  } catch (err) {
    alert('บันทึกไม่สำเร็จ');
    console.error(err);
  } finally {
    showLoading(false);
  }
}

/*************************
 * TOGGLE PAID
 *************************/
async function togglePaid(id, paid) {
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ id, is_paid: paid, type: 'paid' })
  });
}

/*************************
 * DELETE
 *************************/
function askDelete(id) {
  if (!confirm('ลบออเดอร์นี้?')) return;
  deleteOrder(id);
}

async function deleteOrder(id) {
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ id, type: 'delete' })
  });
  orders = orders.filter(o => o.id !== id);
  renderTable();
}

/*************************
 * INIT
 *************************/
document.addEventListener('DOMContentLoaded', fetchOrders);
