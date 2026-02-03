// 🔗 ใส่ URL Google Apps Script ของคุณตรงนี้
const API_URL = "PUT_YOUR_GOOGLE_SCRIPT_URL_HERE";

let orders = [];

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  renderTable();      // แสดงตารางว่างก่อน (กันค้าง)
  fetchOrders();      // ค่อยโหลด Google Sheet
});

/* ---------- UI ---------- */
function showLoading(show) {
  document.getElementById("loadingOverlay").style.display =
    show ? "flex" : "none";
}

function showEmptyState(text = "") {
  document.getElementById("emptyState").innerText = text;
}

function renderTable() {
  const tbody = document.querySelector("#orderTable tbody");
  tbody.innerHTML = "";

  if (orders.length === 0) {
    showEmptyState("ยังไม่มีข้อมูล");
    return;
  }

  showEmptyState("");

  orders.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.name}</td>
      <td>${o.product}</td>
      <td>${o.qty}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ---------- FETCH FROM GOOGLE SHEET ---------- */
async function fetchOrders() {
  showLoading(true);
  showEmptyState("กำลังโหลดข้อมูล...");

  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    const data = await res.json();

    orders = Array.isArray(data) ? data : [];
    renderTable();
  } catch (err) {
    console.error(err);
    showEmptyState("โหลดข้อมูลไม่สำเร็จ");
  } finally {
    // 🔥 ตัวนี้แหละที่ทำให้ไม่ค้าง
    showLoading(false);
  }
}

/* ---------- ADD DATA ---------- */
async function handleAdd() {
  const newOrder = {
    name: "ทดสอบ",
    product: "สินค้า A",
    qty: 1
  };

  // ✅ แสดงผลทันที (ไม่รอ Sheet)
  orders.unshift(newOrder);
  renderTable();

  // 🔄 ส่งไป Google Sheet (ช้าก็ช่างมัน)
  fetch(API_URL + "?action=create", {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(newOrder)
  });
}
