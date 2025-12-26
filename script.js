// ============================================
// HIMA Cash Management System - Frontend Logic
// Sketchy B&W Edition
// ============================================

// Configuration - Replace with your deployed Web App URL
const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzr_NJpTc_3moEQgbUOBQ_3KArHuTOJW0sk9gurVvpYiowZH05JkoHw0c-n9MWh4TOgkg/exec";

// Authentication Configuration
const APP_PIN = "123456"; // PIN untuk akses (ganti dengan PIN yang aman)
const SECRET_KEY = "hima_si_secret_2024"; // Key untuk API (harus sama di Code.gs)
const SESSION_KEY = "kas_hima_session";

// ============================================
// STATE MANAGEMENT
// ============================================
let membersData = [];
let filteredMembers = [];
let historyData = [];
let classesData = [];
let currentTab = "masuk";
let currentEditId = null;
let currentDeleteId = null;
let currentDeleteType = null;
let currentIncomeMode = "iuran"; // 'iuran' or 'lain'
let isAuthenticated = false;

// ============================================
// DOM ELEMENTS
// ============================================
const $ = (id) => document.getElementById(id);

const el = {
  // Login Gate
  loginGate: $("loginGate"),
  loginForm: $("loginForm"),
  pinInput: $("pinInput"),
  loginError: $("loginError"),
  mainApp: $("mainApp"),
  logoutBtn: $("logoutBtn"),

  // Theme
  themeToggle: $("themeToggle"),

  // Tabs
  tabMasuk: $("tabMasuk"),
  tabKeluar: $("tabKeluar"),
  tabRiwayat: $("tabRiwayat"),
  panelMasuk: $("panelMasuk"),
  panelKeluar: $("panelKeluar"),
  panelRiwayat: $("panelRiwayat"),

  // Mode Toggle (Dual Mode)
  modeIuran: $("modeIuran"),
  modeLain: $("modeLain"),
  containerIuran: $("container-iuran"),
  containerLain: $("container-lain"),

  // Masuk Form - Iuran
  filterKelas: $("filterKelas"),
  minggu: $("minggu"),
  tanggal: $("tanggal"),
  defaultAmount: $("defaultAmount"),
  applyDefaultBtn: $("applyDefaultBtn"),
  searchInput: $("searchInput"),
  memberList: $("memberList"),
  loadingList: $("loadingList"),
  emptyState: $("emptyState"),

  // Masuk Form - Pemasukan Lain
  otherTanggal: $("otherTanggal"),
  otherSumber: $("otherSumber"),
  otherKeterangan: $("otherKeterangan"),
  otherNominal: $("otherNominal"),
  otherPJ: $("otherPJ"),
  submitOtherIncomeBtn: $("submitOtherIncomeBtn"),

  // Keluar Form
  expTanggal: $("expTanggal"),
  expKategori: $("expKategori"),
  expKeterangan: $("expKeterangan"),
  expNominal: $("expNominal"),
  expPJ: $("expPJ"),
  submitExpenseBtn: $("submitExpenseBtn"),

  // Riwayat
  historyFilter: $("historyFilter"),
  historySearch: $("historySearch"),
  refreshHistoryBtn: $("refreshHistoryBtn"),
  historyList: $("historyList"),
  loadingHistory: $("loadingHistory"),
  emptyHistory: $("emptyHistory"),
  summaryMasuk: $("summaryMasuk"),
  summaryKeluar: $("summaryKeluar"),
  summarySaldo: $("summarySaldo"),

  // Footer
  stickyFooter: $("stickyFooter"),
  totalCount: $("totalCount"),
  totalAmount: $("totalAmount"),
  submitBtn: $("submitBtn"),

  // Modals
  loadingOverlay: $("loadingOverlay"),
  loadingText: $("loadingText"),
  successModal: $("successModal"),
  successMessage: $("successMessage"),
  errorModal: $("errorModal"),
  errorMessage: $("errorMessage"),
  editModal: $("editModal"),
  editNama: $("editNama"),
  editNim: $("editNim"),
  editMinggu: $("editMinggu"),
  editNominal: $("editNominal"),
  saveEditBtn: $("saveEditBtn"),
  deleteModal: $("deleteModal"),
  deleteMessage: $("deleteMessage"),
  confirmDeleteBtn: $("confirmDeleteBtn"),
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  // Load saved theme (works even before login)
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  // Setup authentication first
  setupAuth();

  // Check if user is already authenticated (session exists)
  checkSession();
}

function initMainApp() {
  // Set today's date
  const today = new Date().toISOString().split("T")[0];
  el.tanggal.value = today;
  el.expTanggal.value = today;
  el.otherTanggal.value = today;

  // Load initial data
  loadClasses();
  loadMembers();

  // Setup event listeners
  setupThemeToggle();
  setupTabs();
  setupModeToggle();
  setupFilters();
  setupSearch();
  setupDefaultAmount();
  setupMasukSubmit();
  setupKeluarSubmit();
  setupOtherIncomeSubmit();
  setupEditModal();
  setupDeleteModal();
}

// ============================================
// AUTHENTICATION
// ============================================
function setupAuth() {
  // Login form submit
  el.loginForm.addEventListener("submit", handleLogin);

  // Logout button
  el.logoutBtn.addEventListener("click", handleLogout);
}

function checkSession() {
  const session = localStorage.getItem(SESSION_KEY);
  if (session === "authenticated") {
    showApp();
  }
}

function handleLogin(e) {
  e.preventDefault();

  const pin = el.pinInput.value;

  if (pin === APP_PIN) {
    // Success - save session and show app
    localStorage.setItem(SESSION_KEY, "authenticated");
    isAuthenticated = true;
    el.loginError.style.display = "none";
    el.pinInput.value = "";
    showApp();
  } else {
    // Error - show message
    el.loginError.style.display = "block";
    el.pinInput.value = "";
    el.pinInput.focus();
  }
}

function handleLogout() {
  if (confirm("Yakin ingin logout?")) {
    localStorage.removeItem(SESSION_KEY);
    isAuthenticated = false;
    hideApp();
  }
}

function showApp() {
  el.loginGate.style.display = "none";
  el.mainApp.style.display = "flex";
  isAuthenticated = true;

  // Initialize main app after showing
  initMainApp();
}

function hideApp() {
  el.loginGate.style.display = "flex";
  el.mainApp.style.display = "none";
  isAuthenticated = false;
}

// ============================================
// THEME TOGGLE
// ============================================
function setupThemeToggle() {
  el.themeToggle.addEventListener("click", () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

// ============================================
// TAB NAVIGATION
// ============================================
function setupTabs() {
  el.tabMasuk.addEventListener("click", () => switchTab("masuk"));
  el.tabKeluar.addEventListener("click", () => switchTab("keluar"));
  el.tabRiwayat.addEventListener("click", () => switchTab("riwayat"));
}

function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  [el.tabMasuk, el.tabKeluar, el.tabRiwayat].forEach((t) =>
    t.classList.remove("active")
  );

  // Update panels
  [el.panelMasuk, el.panelKeluar, el.panelRiwayat].forEach((p) =>
    p.classList.remove("active")
  );

  if (tab === "masuk") {
    el.tabMasuk.classList.add("active");
    el.panelMasuk.classList.add("active");
    document.body.classList.remove("hide-footer");
  } else if (tab === "keluar") {
    el.tabKeluar.classList.add("active");
    el.panelKeluar.classList.add("active");
    document.body.classList.add("hide-footer");
  } else if (tab === "riwayat") {
    el.tabRiwayat.classList.add("active");
    el.panelRiwayat.classList.add("active");
    document.body.classList.add("hide-footer");
    loadHistory();
  }
}

// ============================================
// MODE TOGGLE (Dual Mode in Masuk Tab)
// ============================================
function setupModeToggle() {
  el.modeIuran.addEventListener("click", () => switchIncomeMode("iuran"));
  el.modeLain.addEventListener("click", () => switchIncomeMode("lain"));
}

function switchIncomeMode(mode) {
  currentIncomeMode = mode;

  // Update buttons
  el.modeIuran.classList.toggle("active", mode === "iuran");
  el.modeLain.classList.toggle("active", mode === "lain");

  // Update containers
  if (mode === "iuran") {
    el.containerIuran.classList.remove("hidden");
    el.containerLain.classList.add("hidden");
    document.body.classList.remove("hide-footer");
  } else {
    el.containerIuran.classList.add("hidden");
    el.containerLain.classList.remove("hidden");
    document.body.classList.add("hide-footer");
  }
}

// ============================================
// DATA LOADING
// ============================================
async function loadClasses() {
  try {
    const res = await fetch(`${WEBAPP_URL}?action=getClasses`);
    const data = await res.json();
    if (data.success) {
      classesData = data.data;
      const options = classesData
        .map((k) => `<option value="${k}">${k}</option>`)
        .join("");
      el.filterKelas.innerHTML = '<option value="">Semua</option>' + options;
    }
  } catch (err) {
    console.error("Error loading classes:", err);
  }
}

async function loadMembers(classFilter = "") {
  showMemberLoading(true);

  try {
    let url = `${WEBAPP_URL}?action=getMembers`;
    if (classFilter) url += `&kelas=${encodeURIComponent(classFilter)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      membersData = data.data;
      filteredMembers = [...membersData];
      renderMembers();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showMemberError(err.message);
  }
}

async function loadHistory() {
  showHistoryLoading(true);

  try {
    const res = await fetch(`${WEBAPP_URL}?action=getHistory&limit=50`);
    const data = await res.json();

    if (data.success) {
      historyData = data.data;

      // Update summary
      if (data.summary) {
        el.summaryMasuk.textContent = formatRupiah(data.summary.masuk);
        el.summaryKeluar.textContent = formatRupiah(data.summary.keluar);
        el.summarySaldo.textContent = formatRupiah(data.summary.saldo);
      }

      renderHistory();
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    showHistoryError(err.message);
  }
}

// ============================================
// MEMBER LIST RENDERING
// ============================================
function showMemberLoading(show) {
  el.loadingList.style.display = show ? "block" : "none";
  el.memberList.style.display = show ? "none" : "flex";
  el.emptyState.style.display = "none";
}

function showMemberError(msg) {
  el.loadingList.innerHTML = `
    <p>[ERROR]</p>
    <p style="font-size: 0.75rem; margin-top: 8px;">${msg}</p>
    <button class="btn btn-outline" onclick="loadMembers()" style="margin-top: 16px;">RETRY</button>
  `;
}

function renderMembers() {
  showMemberLoading(false);

  if (filteredMembers.length === 0) {
    el.memberList.style.display = "none";
    el.emptyState.style.display = "block";
    updateTotals();
    return;
  }

  el.emptyState.style.display = "none";

  el.memberList.innerHTML = filteredMembers
    .map(
      (m) => `
    <div class="member-item" data-nim="${m.nim}">
      <div class="member-info">
        <div class="member-name">${escapeHtml(m.nama)}</div>
        <div class="member-nim">${m.nim}</div>
        <span class="member-class">${escapeHtml(m.kelas)}</span>
      </div>
      <div class="nominal-wrapper">
        <span class="prefix">Rp</span>
        <input
          type="text"
          class="nominal-input"
          data-nim="${m.nim}"
          data-nama="${escapeHtml(m.nama)}"
          data-kelas="${escapeHtml(m.kelas)}"
          placeholder="0"
          inputmode="numeric"
          onchange="updateMemberStyle(this)"
          oninput="formatCurrencyInput(this)"
        />
      </div>
    </div>
  `
    )
    .join("");

  el.memberList.style.display = "flex";

  // Add input listeners
  document.querySelectorAll(".nominal-input").forEach((input) => {
    input.addEventListener("input", updateTotals);
  });

  updateTotals();
}

function updateMemberStyle(input) {
  const item = input.closest(".member-item");
  const val = parseCurrency(input.value);
  item.classList.toggle("has-value", val > 0);
}

// ============================================
// HISTORY RENDERING
// ============================================
function showHistoryLoading(show) {
  el.loadingHistory.style.display = show ? "block" : "none";
  el.historyList.style.display = show ? "none" : "flex";
  el.emptyHistory.style.display = "none";
}

function showHistoryError(msg) {
  el.loadingHistory.innerHTML = `
    <p>[ERROR]</p>
    <p style="font-size: 0.75rem; margin-top: 8px;">${msg}</p>
    <button class="btn btn-outline" onclick="loadHistory()" style="margin-top: 16px;">RETRY</button>
  `;
}

function renderHistory() {
  showHistoryLoading(false);

  // Filter by type
  const typeFilter = el.historyFilter.value;
  let filtered = historyData;

  if (typeFilter !== "all") {
    filtered = historyData.filter((t) => t.type === typeFilter);
  }

  // Filter by search term
  const searchTerm = el.historySearch
    ? el.historySearch.value.toLowerCase()
    : "";
  if (searchTerm) {
    filtered = filtered.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const subtitle = (t.subtitle || "").toLowerCase();
      const dateStr = formatTanggal(t.date).toLowerCase();
      return (
        title.includes(searchTerm) ||
        subtitle.includes(searchTerm) ||
        dateStr.includes(searchTerm)
      );
    });
  }

  if (filtered.length === 0) {
    el.historyList.style.display = "none";
    el.emptyHistory.style.display = "block";
    return;
  }

  el.emptyHistory.style.display = "none";

  el.historyList.innerHTML = filtered
    .map((t) => {
      // Determine income vs expense based on type
      const isIncome = t.type.startsWith("in"); // 'in_member' or 'in_other'
      const nominalClass = isIncome ? "text-success" : "text-danger";
      const nominalPrefix = isIncome ? "+" : "-";
      const typeLabel = getTypeLabel(t.type);
      const deleteType =
        t.type === "out"
          ? "keluar"
          : t.type === "in_member"
          ? "masuk"
          : "other";

      return `
      <div class="history-item type-${t.type}" data-id="${t.id}">
        <div class="history-header">
          <div class="history-info">
            <div class="history-title">${escapeHtml(t.title)}</div>
            <div class="history-meta">${escapeHtml(t.subtitle)}</div>
          </div>
          <div class="history-nominal ${nominalClass}">
            ${nominalPrefix}${formatRupiah(t.nominal)}
          </div>
        </div>
        <div class="history-footer">
          <div>
            <span class="type-badge ${t.type}">${typeLabel}</span>
            <span class="history-date">${formatTanggal(t.date)}</span>
          </div>
          <div class="history-actions">
            ${
              t.type === "in_member"
                ? `<button class="btn btn-sm btn-outline" onclick="openEditModal('${t.id}', 'masuk')">EDIT</button>`
                : ""
            }
            <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${
              t.id
            }', '${deleteType}')">DEL</button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  el.historyList.style.display = "flex";
}

function getTypeLabel(type) {
  switch (type) {
    case "in_member":
      return "🟢 IURAN";
    case "in_other":
      return "🔵 LAIN";
    case "out":
      return "🔴 KELUAR";
    default:
      return type;
  }
}

// ============================================
// FILTERS & SEARCH
// ============================================
function setupFilters() {
  el.filterKelas.addEventListener("change", () =>
    loadMembers(el.filterKelas.value)
  );
  el.historyFilter.addEventListener("change", renderHistory);
  el.refreshHistoryBtn.addEventListener("click", loadHistory);

  // History search
  if (el.historySearch) {
    el.historySearch.addEventListener("input", renderHistory);
  }
}

function setupSearch() {
  el.searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    filteredMembers =
      term === ""
        ? [...membersData]
        : membersData.filter(
            (m) =>
              m.nama.toLowerCase().includes(term) ||
              m.nim.toLowerCase().includes(term)
          );
    renderMembers();
  });
}

// ============================================
// DEFAULT AMOUNT
// ============================================
function setupDefaultAmount() {
  el.defaultAmount.addEventListener("input", function () {
    formatCurrencyInput(this);
  });

  el.applyDefaultBtn.addEventListener("click", () => {
    const val = parseCurrency(el.defaultAmount.value);
    if (val <= 0) {
      showError("Masukkan nominal yang valid");
      return;
    }

    document.querySelectorAll(".nominal-input").forEach((input) => {
      input.value = formatNumber(val);
      updateMemberStyle(input);
    });

    updateTotals();
  });
}

// ============================================
// TOTALS
// ============================================
function updateTotals() {
  const inputs = document.querySelectorAll(".nominal-input");
  let count = 0;
  let total = 0;

  inputs.forEach((input) => {
    const val = parseCurrency(input.value);
    if (val > 0) {
      count++;
      total += val;
    }
  });

  el.totalCount.textContent = count;
  el.totalAmount.textContent = formatRupiah(total);

  // Enable/disable submit
  const week = el.minggu.value;
  const date = el.tanggal.value;
  el.submitBtn.disabled = !(week && date && count > 0);
}

el.minggu.addEventListener("change", updateTotals);
el.tanggal.addEventListener("change", updateTotals);

// ============================================
// SUBMIT MASUK (Income)
// ============================================
function setupMasukSubmit() {
  el.submitBtn.addEventListener("click", submitIncome);
}

async function submitIncome() {
  const week = el.minggu.value;
  const date = el.tanggal.value;

  if (!week || !date) {
    showError("Lengkapi minggu dan tanggal");
    return;
  }

  const transactions = [];
  document.querySelectorAll(".nominal-input").forEach((input) => {
    const nominal = parseCurrency(input.value);
    if (nominal > 0) {
      transactions.push({
        nim: input.dataset.nim,
        nama: input.dataset.nama,
        kelas: input.dataset.kelas,
        minggu: parseInt(week),
        tanggal: date,
        nominal: nominal,
      });
    }
  });

  if (transactions.length === 0) {
    showError("Tidak ada pembayaran");
    return;
  }

  showLoading("Menyimpan...");

  try {
    await fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createIncome",
        secretKey: SECRET_KEY,
        transactions,
      }),
    });

    hideLoading();

    const total = transactions.reduce((s, t) => s + t.nominal, 0);
    showSuccess(
      `Data tersimpan!\n\nMinggu: ${week}\n${
        transactions.length
      } anggota\nTotal: ${formatRupiah(total)}`
    );
    resetMasukForm();
  } catch (err) {
    hideLoading();
    showError("Cek Google Sheet untuk konfirmasi.");
  }
}

function resetMasukForm() {
  el.minggu.value = "";
  el.tanggal.value = new Date().toISOString().split("T")[0];
  el.defaultAmount.value = "";
  el.searchInput.value = "";

  document.querySelectorAll(".nominal-input").forEach((input) => {
    input.value = "";
    updateMemberStyle(input);
  });

  updateTotals();
}

// ============================================
// SUBMIT KELUAR (Expense)
// ============================================
function setupKeluarSubmit() {
  el.expNominal.addEventListener("input", function () {
    formatCurrencyInput(this);
  });

  el.submitExpenseBtn.addEventListener("click", submitExpense);
}

async function submitExpense() {
  const tanggal = el.expTanggal.value;
  const kategori = el.expKategori.value;
  const keterangan = el.expKeterangan.value;
  const nominal = parseCurrency(el.expNominal.value);
  const pj = el.expPJ.value;

  // Validation
  if (!tanggal) {
    showError("Pilih tanggal");
    return;
  }
  if (!kategori) {
    showError("Pilih kategori");
    return;
  }
  if (nominal <= 0) {
    showError("Masukkan nominal");
    return;
  }
  if (!pj.trim()) {
    showError("Masukkan PJ");
    return;
  }

  showLoading("Menyimpan...");

  try {
    await fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createExpense",
        secretKey: SECRET_KEY,
        tanggal,
        kategori,
        keterangan,
        nominal,
        pj,
      }),
    });

    hideLoading();
    showSuccess(
      `Pengeluaran tersimpan!\n\n${kategori}\n${formatRupiah(
        nominal
      )}\nPJ: ${pj}`
    );
    resetKeluarForm();
  } catch (err) {
    hideLoading();
    showError("Cek Google Sheet untuk konfirmasi.");
  }
}

function resetKeluarForm() {
  el.expTanggal.value = new Date().toISOString().split("T")[0];
  el.expKategori.value = "";
  el.expKeterangan.value = "";
  el.expNominal.value = "";
  el.expPJ.value = "";
}

// ============================================
// SUBMIT OTHER INCOME (Pemasukan Lain)
// ============================================
function setupOtherIncomeSubmit() {
  el.otherNominal.addEventListener("input", function () {
    formatCurrencyInput(this);
  });

  el.submitOtherIncomeBtn.addEventListener("click", submitOtherIncome);
}

async function submitOtherIncome() {
  const tanggal = el.otherTanggal.value;
  const sumber = el.otherSumber.value;
  const keterangan = el.otherKeterangan.value;
  const nominal = parseCurrency(el.otherNominal.value);
  const pj = el.otherPJ.value;

  // Validation
  if (!tanggal) {
    showError("Pilih tanggal");
    return;
  }
  if (!sumber) {
    showError("Pilih sumber");
    return;
  }
  if (nominal <= 0) {
    showError("Masukkan nominal");
    return;
  }
  if (!pj.trim()) {
    showError("Masukkan PJ");
    return;
  }

  showLoading("Menyimpan...");

  try {
    await fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createOtherIncome",
        secretKey: SECRET_KEY,
        tanggal,
        sumber,
        keterangan,
        nominal,
        pj,
      }),
    });

    hideLoading();
    showSuccess(
      `Pemasukan Lain tersimpan!\n\n${sumber}\n${formatRupiah(
        nominal
      )}\nPJ: ${pj}`
    );
    resetOtherIncomeForm();
  } catch (err) {
    hideLoading();
    showError("Cek Google Sheet untuk konfirmasi.");
  }
}

function resetOtherIncomeForm() {
  el.otherTanggal.value = new Date().toISOString().split("T")[0];
  el.otherSumber.value = "";
  el.otherKeterangan.value = "";
  el.otherNominal.value = "";
  el.otherPJ.value = "";
}

// ============================================
// EDIT MODAL (Income only for now)
// ============================================
function setupEditModal() {
  el.saveEditBtn.addEventListener("click", saveEdit);
  el.editNominal.addEventListener("input", function () {
    formatCurrencyInput(this);
  });
}

function openEditModal(id, type) {
  const tx = historyData.find((t) => t.id === id);
  if (!tx || type !== "masuk") return;

  currentEditId = id;

  el.editNama.textContent = tx.nama;
  el.editNim.textContent = tx.nim;
  el.editMinggu.textContent = `Minggu ${tx.minggu}`;
  el.editNominal.value = formatNumber(tx.nominal);

  el.editModal.classList.add("active");
}

function closeEditModal() {
  el.editModal.classList.remove("active");
  currentEditId = null;
}

async function saveEdit() {
  if (!currentEditId) return;

  const nominal = parseCurrency(el.editNominal.value);
  if (nominal <= 0) {
    showError("Nominal tidak valid");
    return;
  }

  closeEditModal();
  showLoading("Updating...");

  // Optimistic update
  const idx = historyData.findIndex((t) => t.id === currentEditId);
  const oldVal = historyData[idx].nominal;
  historyData[idx].nominal = nominal;
  renderHistory();

  try {
    await fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateIncome",
        secretKey: SECRET_KEY,
        id: currentEditId,
        nominal,
      }),
    });

    hideLoading();
    showSuccess("Berhasil diupdate");
  } catch (err) {
    historyData[idx].nominal = oldVal;
    renderHistory();
    hideLoading();
    showError("Gagal update");
  }

  currentEditId = null;
}

window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;

// ============================================
// DELETE MODAL
// ============================================
function setupDeleteModal() {
  el.confirmDeleteBtn.addEventListener("click", confirmDelete);
}

function openDeleteModal(id, type) {
  const tx = historyData.find((t) => t.id === id);
  if (!tx) return;

  currentDeleteId = id;
  currentDeleteType = type;

  const label =
    type === "masuk"
      ? `${tx.nama} - ${formatRupiah(tx.nominal)}`
      : `${tx.kategori} - ${formatRupiah(tx.nominal)}`;

  el.deleteMessage.textContent = `Hapus: ${label}?`;
  el.deleteModal.classList.add("active");
}

function closeDeleteModal() {
  el.deleteModal.classList.remove("active");
  currentDeleteId = null;
  currentDeleteType = null;
}

async function confirmDelete() {
  if (!currentDeleteId) return;

  closeDeleteModal();
  showLoading("Menghapus...");

  // Optimistic delete
  const idx = historyData.findIndex((t) => t.id === currentDeleteId);
  const deleted = historyData.splice(idx, 1)[0];
  renderHistory();

  const action =
    currentDeleteType === "masuk" ? "deleteIncome" : "deleteExpense";

  try {
    await fetch(WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        secretKey: SECRET_KEY,
        id: currentDeleteId,
      }),
    });

    hideLoading();
    showSuccess("Berhasil dihapus");
  } catch (err) {
    historyData.splice(idx, 0, deleted);
    renderHistory();
    hideLoading();
    showError("Gagal hapus");
  }

  currentDeleteId = null;
  currentDeleteType = null;
}

window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatNumber(num) {
  return new Intl.NumberFormat("id-ID").format(num);
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseCurrency(str) {
  if (!str) return 0;
  return parseInt(str.replace(/[^\d]/g, "")) || 0;
}

function formatCurrencyInput(input) {
  const val = parseCurrency(input.value);
  input.value = val > 0 ? formatNumber(val) : "";
}

function formatTanggal(dateString) {
  if (!dateString) return "-";

  // Handle YYYY-MM-DD format from backend
  if (
    typeof dateString === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Fallback for other formats
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return dateString;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// MODALS & OVERLAYS
// ============================================
function showLoading(text = "Processing...") {
  el.loadingText.textContent = text;
  el.loadingOverlay.classList.add("active");
}

function hideLoading() {
  el.loadingOverlay.classList.remove("active");
}

function showSuccess(msg) {
  el.successMessage.style.whiteSpace = "pre-line";
  el.successMessage.textContent = msg;
  el.successModal.classList.add("active");
}

function closeSuccessModal() {
  el.successModal.classList.remove("active");
}

function showError(msg) {
  el.errorMessage.style.whiteSpace = "pre-line";
  el.errorMessage.textContent = msg;
  el.errorModal.classList.add("active");
}

function closeErrorModal() {
  el.errorModal.classList.remove("active");
}

window.closeSuccessModal = closeSuccessModal;
window.closeErrorModal = closeErrorModal;

// Close on backdrop click
window.addEventListener("click", (e) => {
  if (e.target === el.successModal) closeSuccessModal();
  if (e.target === el.errorModal) closeErrorModal();
  if (e.target === el.editModal) closeEditModal();
  if (e.target === el.deleteModal) closeDeleteModal();
});

// ============================================
// DEBUG
// ============================================
window.testConnection = async function () {
  console.log("Testing:", WEBAPP_URL);
  try {
    const res = await fetch(`${WEBAPP_URL}?action=getMembers`);
    const text = await res.text();
    console.log("Response:", text);
    alert("OK! Check console.");
  } catch (err) {
    console.error(err);
    alert("Failed: " + err.message);
  }
};
