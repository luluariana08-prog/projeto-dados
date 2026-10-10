/*
 * Dados de exemplo, cálculos, filtros e gráficos ficam neste arquivo para que
 * a demonstração funcione ao abrir index.html como arquivo local (file://).
 */
const PRODUCTS = [
  { produto: "Hambúrguer clássico", categoria: "Lanches", preco: 28.9 },
  { produto: "X-Bacon", categoria: "Lanches", preco: 34.9 },
  { produto: "Veggie burger", categoria: "Lanches", preco: 32.5 },
  { produto: "Batata frita", categoria: "Acompanhamentos", preco: 14.9 },
  { produto: "Onion rings", categoria: "Acompanhamentos", preco: 16.5 },
  { produto: "Refrigerante", categoria: "Bebidas", preco: 7.5 },
  { produto: "Milkshake", categoria: "Sobremesas", preco: 18.9 },
  { produto: "Brownie", categoria: "Sobremesas", preco: 13.9 }
];
const REGIONS = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const REQUIRED_HEADERS = ["id_venda", "data", "quantidade", "preco_unitario"];
const CHART_PALETTE = {
  principal: "#893F45",
  categorias: ["#893F45", "#A8575E", "#BF7175", "#8E6872", "#BA8F77"],
  regiao: "#A8575E",
  tooltip: "#542833"
};
const CURRENCY = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const elements = {
  baseStatus: document.querySelector("#base-status"),
  baseBadgeLabel: document.querySelector("#base-badge-label"),
  notice: document.querySelector("#data-notice"),
  count: document.querySelector("#record-count"),
  tableCount: document.querySelector("#table-count"),
  tableBody: document.querySelector("#sales-table-body"),
  tableEmpty: document.querySelector("#table-empty"),
  emptyState: document.querySelector("#empty-state"),
  from: document.querySelector("#date-from"),
  to: document.querySelector("#date-to"),
  category: document.querySelector("#category-filter"),
  region: document.querySelector("#region-filter"),
  search: document.querySelector("#table-search"),
  file: document.querySelector("#csv-file"),
  export: document.querySelector("#export-csv")
};

let allSales = makeDemoData();
let salesSource = "demo";
let monthlyChart;
let categoryChart;
let regionChart;
let sortKey = "data";
let sortDirection = -1;
let loadNotice = "";

// Gera 200 vendas determinísticas. O mesmo cálculo cria dados-exemplo.csv.
function makeDemoData() {
  return Array.from({ length: 200 }, (_, index) => {
    const month = Math.floor(index * 12 / 200);
    const day = (index * 7 + 2) % 28 + 1;
    const item = PRODUCTS[(index * 7 + Math.floor(index / 3)) % PRODUCTS.length];
    const quantity = (index * 5 + Math.floor(index / 7)) % 4 + 1;
    const region = REGIONS[(index * 3 + Math.floor(index / 5)) % REGIONS.length];
    return {
      id_venda: String(index + 1),
      data: `2025-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      produto: item.produto,
      categoria: item.categoria,
      regiao: region,
      quantidade: quantity,
      preco_unitario: item.preco,
      faturamento: quantity * item.preco
    };
  });
}

function parseNumber(value) {
  if (value === null || value === undefined || String(value).trim() === "") return { value: null, missing: true };
  let text = String(value).trim().replace(/\s/g, "").replace(/^R\$/i, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma !== -1 && dot !== -1) {
    text = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (comma !== -1) {
    text = text.replace(",", ".");
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? { value: parsed, missing: false } : { value: null, missing: false };
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function normalizeRows(rows) {
  const discarded = { semId: 0, data: 0, quantidadeAusente: 0, quantidadeInvalida: 0, precoAusente: 0, precoInvalido: 0 };
  const missingDetails = { produto: 0, categoria: 0, regiao: 0 };
  const normalized = [];

  rows.forEach((raw) => {
    const id = String(raw.id_venda ?? "").trim();
    const date = String(raw.data ?? "").trim();
    const quantity = parseNumber(raw.quantidade);
    const price = parseNumber(raw.preco_unitario);
    // Registra uma causa principal por linha para que as contagens não se sobreponham.
    if (!id) { discarded.semId += 1; return; }
    if (!isValidDate(date)) { discarded.data += 1; return; }
    if (quantity.missing) { discarded.quantidadeAusente += 1; return; }
    if (quantity.value === null) { discarded.quantidadeInvalida += 1; return; }
    if (price.missing) { discarded.precoAusente += 1; return; }
    if (price.value === null) { discarded.precoInvalido += 1; return; }

    const product = String(raw.produto ?? "").trim();
    const category = String(raw.categoria ?? "").trim();
    const region = String(raw.regiao ?? "").trim();
    if (!product) missingDetails.produto += 1;
    if (!category) missingDetails.categoria += 1;
    if (!region) missingDetails.regiao += 1;
    normalized.push({
      id_venda: id,
      data: date,
      produto: product || "Não informado",
      categoria: category || "Não informado",
      regiao: region || "Não informado",
      quantidade: quantity.value,
      preco_unitario: price.value,
      faturamento: quantity.value * price.value
    });
  });
  return { normalized, discarded, missingDetails };
}

function updateDateBounds() {
  if (!allSales.length) {
    elements.from.removeAttribute("min"); elements.from.removeAttribute("max");
    elements.to.removeAttribute("min"); elements.to.removeAttribute("max");
    return;
  }
  const dates = allSales.map((sale) => sale.data).sort();
  elements.from.min = dates[0]; elements.from.max = dates[dates.length - 1];
  elements.to.min = dates[0]; elements.to.max = dates[dates.length - 1];
}

function refreshSelect(select, label, values) {
  const selected = select.value;
  select.replaceChildren(new Option(label, ""));
  [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach((value) => select.add(new Option(value, value)));
  select.value = values.includes(selected) ? selected : "";
}

function getFilteredSales() {
  return allSales.filter((sale) => {
    if (elements.from.value && sale.data < elements.from.value) return false;
    if (elements.to.value && sale.data > elements.to.value) return false;
    if (elements.category.value && sale.categoria !== elements.category.value) return false;
    if (elements.region.value && sale.regiao !== elements.region.value) return false;
    return true;
  });
}

function calculateMetrics(sales) {
  const revenue = sales.reduce((sum, sale) => sum + sale.faturamento, 0);
  const units = sales.reduce((sum, sale) => sum + sale.quantidade, 0);
  const saleCount = new Set(sales.map((sale) => sale.id_venda)).size;
  return { revenue, units, saleCount, ticket: saleCount ? revenue / saleCount : 0 };
}

function aggregate(sales, key) {
  const totals = new Map();
  sales.forEach((sale) => totals.set(sale[key], (totals.get(sale[key]) || 0) + sale.faturamento));
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
}

function monthlyTotals(sales) {
  if (!sales.length) return { labels: [], values: [] };
  const totals = new Map();
  sales.forEach((sale) => {
    const month = sale.data.slice(0, 7);
    totals.set(month, (totals.get(month) || 0) + sale.faturamento);
  });
  const months = [...totals.keys()].sort();
  const first = new Date(`${months[0]}-01T00:00:00Z`);
  const last = new Date(`${months[months.length - 1]}-01T00:00:00Z`);
  const labels = [];
  const values = [];
  for (let current = new Date(first); current <= last; current.setUTCMonth(current.getUTCMonth() + 1)) {
    const key = current.toISOString().slice(0, 7);
    labels.push(`${MONTHS_PT[current.getUTCMonth()]}/${String(current.getUTCFullYear()).slice(-2)}`);
    values.push(totals.get(key) || 0);
  }
  return { labels, values };
}

function chartOptions(horizontal = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? "y" : "x",
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: CHART_PALETTE.tooltip, padding: 10, displayColors: false, callbacks: { label: (context) => CURRENCY.format(context.chart.options.indexAxis === "y" ? context.parsed.x : context.parsed.y) } }
    },
    scales: {
      x: { beginAtZero: horizontal, grid: { display: horizontal, color: "#edf1f5" }, border: { display: false }, ticks: { color: "#8795a5", font: { size: 10 }, callback: horizontal ? (value) => CURRENCY.format(value) : undefined } },
      y: { beginAtZero: true, grid: { color: "#edf1f5" }, border: { display: false }, ticks: { color: "#8795a5", font: { size: 10 }, callback: horizontal ? undefined : (value) => CURRENCY.format(value) } }
    }
  };
}

function createCharts() {
  if (!window.Chart) return false;
  const monthlyContext = document.querySelector("#monthly-chart");
  const categoryContext = document.querySelector("#category-chart");
  const regionContext = document.querySelector("#region-chart");
  monthlyChart = new Chart(monthlyContext, {
    type: "line", data: { labels: [], datasets: [{ label: "Faturamento", data: [], borderColor: CHART_PALETTE.principal, backgroundColor: "rgba(137, 63, 69, .12)", borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: "#fff", pointBorderWidth: 2, tension: .35, fill: true }] },
    options: { ...chartOptions(), scales: { ...chartOptions().scales, x: { grid: { display: false }, border: { display: false }, ticks: { color: "#8795a5", font: { size: 10 } } } } }
  });
  categoryChart = new Chart(categoryContext, {
    type: "bar", data: { labels: [], datasets: [{ label: "Faturamento", data: [], backgroundColor: [], borderRadius: 5, maxBarThickness: 28 }] },
    options: { ...chartOptions(true), scales: { ...chartOptions(true).scales, y: { grid: { display: false }, border: { display: false }, ticks: { color: "#708197", font: { size: 10 } } } } }
  });
  regionChart = new Chart(regionContext, {
    type: "bar", data: { labels: [], datasets: [{ label: "Faturamento", data: [], backgroundColor: CHART_PALETTE.regiao, borderRadius: 5, maxBarThickness: 28 }] },
    options: chartOptions(true)
  });
  return true;
}

function refreshCharts(sales) {
  if (!monthlyChart) return;
  const monthly = monthlyTotals(sales);
  monthlyChart.data.labels = monthly.labels;
  monthlyChart.data.datasets[0].data = monthly.values;
  monthlyChart.update();
  const categories = aggregate(sales, "categoria");
  categoryChart.data.labels = categories.map(([label]) => label);
  categoryChart.data.datasets[0].data = categories.map(([, total]) => total);
  categoryChart.data.datasets[0].backgroundColor = categories.map((_, index) => CHART_PALETTE.categorias[index % CHART_PALETTE.categorias.length]);
  categoryChart.update();
  const regions = aggregate(sales, "regiao");
  regionChart.data.labels = regions.map(([label]) => label);
  regionChart.data.datasets[0].data = regions.map(([, total]) => total);
  regionChart.update();
}

function visibleTableRows(filteredSales) {
  const query = elements.search.value.trim().toLocaleLowerCase("pt-BR");
  return filteredSales.filter((sale) => {
    if (!query) return true;
    return [sale.id_venda, sale.data, sale.produto, sale.categoria, sale.regiao, sale.quantidade, sale.preco_unitario, sale.faturamento]
      .some((value) => String(value).toLocaleLowerCase("pt-BR").includes(query));
  }).sort((a, b) => {
    let left = a[sortKey]; let right = b[sortKey];
    if (typeof left === "number" && typeof right === "number") return (left - right) * sortDirection;
    return String(left).localeCompare(String(right), "pt-BR", { numeric: true, sensitivity: "base" }) * sortDirection;
  });
}

function renderTable(rows, filteredCount) {
  elements.tableBody.replaceChildren();
  const fragment = document.createDocumentFragment();
  rows.forEach((sale) => {
    const row = document.createElement("tr");
    const cells = [sale.id_venda, formatDate(sale.data), sale.produto, sale.categoria, sale.regiao, NUMBER.format(sale.quantidade), CURRENCY.format(sale.preco_unitario), CURRENCY.format(sale.faturamento)];
    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      if (index >= 5) cell.className = "numeric";
      row.append(cell);
    });
    fragment.append(row);
  });
  elements.tableBody.append(fragment);
  elements.tableEmpty.hidden = rows.length > 0 || filteredCount === 0;
  elements.tableCount.textContent = `Exibindo ${NUMBER.format(rows.length)} de ${NUMBER.format(filteredCount)} registros filtrados.`;
  elements.export.disabled = rows.length === 0;
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function showDataNotice() {
  const discardedCount = Object.values(loadNotice.discarded || {}).reduce((sum, value) => sum + value, 0);
  const missing = loadNotice.missingDetails || {};
  const missingParts = Object.entries(missing).filter(([, count]) => count > 0).map(([key, count]) => {
    const labels = { produto: "produto(s)", categoria: "categoria(s)", regiao: "região(ões)" };
    return `${count} ${labels[key]} sem valor, classificados como “Não informado”`;
  });
  const discardLabels = {
    semId: "sem id_venda", data: "com data ausente ou inválida", quantidadeAusente: "sem quantidade", quantidadeInvalida: "com quantidade inválida", precoAusente: "sem preço unitário", precoInvalido: "com preço unitário inválido"
  };
  const discardParts = Object.entries(loadNotice.discarded || {}).filter(([, count]) => count > 0).map(([key, count]) => `${count} ${discardLabels[key]}`);
  const notes = [];
  if (discardedCount) notes.push(`${discardedCount} linha(s) descartada(s): ${discardParts.join(", ")}.`);
  if (missingParts.length) notes.push(`Linhas mantidas: ${missingParts.join("; ")}.`);
  if (loadNotice.parseWarnings) notes.push(`${loadNotice.parseWarnings} aviso(s) de estrutura foram sinalizados na leitura do CSV.`);
  if (!notes.length) { elements.notice.hidden = true; return; }
  elements.notice.textContent = notes.join(" ");
  elements.notice.classList.toggle("warning", discardedCount > 0 || loadNotice.parseWarnings > 0);
  elements.notice.hidden = false;
}

function render() {
  const filteredSales = getFilteredSales();
  const metrics = calculateMetrics(filteredSales);
  document.querySelector("#metric-revenue").textContent = CURRENCY.format(metrics.revenue);
  document.querySelector("#metric-sales").textContent = NUMBER.format(metrics.saleCount);
  document.querySelector("#metric-units").textContent = NUMBER.format(metrics.units);
  document.querySelector("#metric-ticket").textContent = CURRENCY.format(metrics.ticket);
  elements.count.innerHTML = `<strong>${NUMBER.format(filteredSales.length)}</strong> registros correspondem aos filtros.`;
  elements.emptyState.hidden = filteredSales.length > 0;
  refreshCharts(filteredSales);
  renderTable(visibleTableRows(filteredSales), filteredSales.length);
  document.querySelectorAll(".sort-button").forEach((button) => {
    button.closest("th").setAttribute("aria-sort", button.dataset.sort === sortKey ? (sortDirection === 1 ? "ascending" : "descending") : "none");
    const symbol = button.querySelector("span");
    symbol.textContent = button.dataset.sort === sortKey ? (sortDirection === 1 ? "↑" : "↓") : "↕";
  });
}

function setBase(data, sourceName, sourceKind, notice = {}) {
  allSales = data;
  salesSource = sourceKind;
  loadNotice = notice;
  elements.from.value = ""; elements.to.value = "";
  elements.search.value = "";
  sortKey = "data"; sortDirection = -1;
  updateDateBounds();
  refreshSelect(elements.category, "Todas as categorias", allSales.map((sale) => sale.categoria));
  refreshSelect(elements.region, "Todas as regiões", allSales.map((sale) => sale.regiao));
  elements.baseStatus.textContent = sourceKind === "demo"
    ? `${allSales.length} registros fictícios de jan. a dez. de 2025.`
    : `${allSales.length} registros válidos · ${sourceName}`;
  elements.baseBadgeLabel.textContent = sourceKind === "demo" ? "BASE DEMONSTRATIVA" : "CSV IMPORTADO";
  showDataNotice();
  render();
}

function importCsv(file) {
  if (!window.Papa) {
    elements.notice.textContent = "Não foi possível carregar o leitor de CSV. Verifique a conexão com a internet e tente novamente.";
    elements.notice.classList.add("warning"); elements.notice.hidden = false;
    elements.file.value = "";
    return;
  }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim().toLocaleLowerCase("pt-BR"),
    complete: (results) => {
      const headers = (results.meta.fields || []).map((header) => header.trim().toLocaleLowerCase("pt-BR"));
      const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
      if (missingHeaders.length) {
        elements.notice.textContent = `CSV não importado. Colunas obrigatórias ausentes: ${missingHeaders.join(", ")}. Use os cabeçalhos id_venda, data, quantidade e preco_unitario; produto, categoria e regiao complementam a análise.`;
        elements.notice.classList.add("warning"); elements.notice.hidden = false;
        elements.file.value = "";
        return;
      }
      const result = normalizeRows(results.data);
      const parseWarnings = results.errors.length;
      setBase(result.normalized, file.name, "upload", { ...result, parseWarnings });
      elements.file.value = "";
    },
    error: () => {
      elements.notice.textContent = "Não foi possível ler esse arquivo. Confira se ele está em formato CSV e tente novamente.";
      elements.notice.classList.add("warning"); elements.notice.hidden = false;
      elements.file.value = "";
    }
  });
}

function exportVisibleRows() {
  const rows = visibleTableRows(getFilteredSales()).map((sale) => ({
    id_venda: sale.id_venda,
    data: sale.data,
    produto: sale.produto,
    categoria: sale.categoria,
    regiao: sale.regiao,
    quantidade: sale.quantidade,
    preco_unitario: sale.preco_unitario,
    faturamento: sale.faturamento
  }));
  if (!rows.length || !window.Papa) return;
  const csv = "\uFEFF" + Papa.unparse(rows, { delimiter: "," });
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = "vendas-filtradas.csv";
  document.body.append(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}

elements.from.addEventListener("change", render);
elements.to.addEventListener("change", render);
elements.category.addEventListener("change", render);
elements.region.addEventListener("change", render);
elements.search.addEventListener("input", render);
elements.file.addEventListener("change", () => { if (elements.file.files[0]) importCsv(elements.file.files[0]); });
elements.export.addEventListener("click", exportVisibleRows);
document.querySelector("#clear-filters").addEventListener("click", () => {
  elements.from.value = ""; elements.to.value = ""; elements.category.value = ""; elements.region.value = ""; elements.search.value = "";
  render();
});
document.querySelectorAll(".sort-button").forEach((button) => button.addEventListener("click", () => {
  if (sortKey === button.dataset.sort) sortDirection *= -1;
  else { sortKey = button.dataset.sort; sortDirection = 1; }
  render();
}));

setBase(allSales, "dados-exemplo.csv", "demo");
if (!createCharts()) {
  elements.notice.textContent = "A demonstração de dados está disponível, mas os gráficos precisam de acesso à internet para carregar o Chart.js.";
  elements.notice.classList.add("warning"); elements.notice.hidden = false;
} else {
  render();
}
