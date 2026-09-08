const API_BASE = "";

const originInput = document.getElementById("originCount");
const destinationInput = document.getElementById("destinationCount");
const generateBtn = document.getElementById("generateBtn");
const minCostBtn = document.getElementById("minCostBtn");
const vogelBtn = document.getElementById("vogelBtn");
const compareBtn = document.getElementById("compareBtn");
const clearBtn = document.getElementById("clearBtn");
const pdfBtn = document.getElementById("pdfBtn");
const excelBtn = document.getElementById("excelBtn");
const themeToggle = document.getElementById("themeToggle");

const message = document.getElementById("message");
const inputTable = document.getElementById("inputTable");
const balanceStatus = document.getElementById("balanceStatus");
const balancePreview = document.getElementById("balancePreview");
const summary = document.getElementById("summary");
const balancedCostTable = document.getElementById("balancedCostTable");
const allocationTable = document.getElementById("allocationTable");
const comparisonTable = document.getElementById("comparisonTable");
const history = document.getElementById("history");

let currentExport = null;

generateBtn.addEventListener("click", generateTable);
originInput.addEventListener("input", handleConfigurationInput);
destinationInput.addEventListener("input", handleConfigurationInput);
inputTable.addEventListener("focusin", handleTableFocus);
inputTable.addEventListener("focusout", clearInputHighlights);
minCostBtn.addEventListener("click", () => runMethod("/costo-minimo", "Costo Minimo"));
vogelBtn.addEventListener("click", () => runMethod("/vogel", "Vogel"));
compareBtn.addEventListener("click", compareMethods);
clearBtn.addEventListener("click", clearAll);
pdfBtn.addEventListener("click", () => exportResults("/export/pdf", "resultados_transporte.pdf"));
excelBtn.addEventListener("click", () => exportResults("/export/excel", "resultados_transporte.xlsx"));
themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", themeToggle.checked);
  localStorage.setItem("transport-theme", themeToggle.checked ? "dark" : "light");
});

init();

function init() {
  const savedTheme = localStorage.getItem("transport-theme");
  themeToggle.checked = savedTheme === "dark";
  document.body.classList.toggle("dark", themeToggle.checked);
  generateTable();
}

function generateTable() {
  hideMessage();
  const origins = readConfigurationCount(originInput, "origenes");
  const destinations = readConfigurationCount(destinationInput, "destinos");
  if (origins === null || destinations === null) return;

  originInput.value = origins;
  destinationInput.value = destinations;

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.appendChild(th("Origen"));
  for (let col = 0; col < destinations; col += 1) {
    const header = th(`D${col + 1}`);
    header.dataset.colHeader = col;
    header.dataset.colIndex = col;
    headerRow.appendChild(header);
  }
  const supplyHeader = th("Oferta");
  supplyHeader.dataset.supplyHeader = "true";
  headerRow.appendChild(supplyHeader);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (let row = 0; row < origins; row += 1) {
    const tr = document.createElement("tr");
    tr.dataset.rowIndex = row;
    const rowHeader = th(`O${row + 1}`);
    rowHeader.dataset.rowHeader = row;
    tr.appendChild(rowHeader);
    for (let col = 0; col < destinations; col += 1) {
      tr.appendChild(tdInput("cost", row, col, 0));
    }
    tr.appendChild(tdInput("supply", row, null, 0));
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const demandRow = document.createElement("tr");
  const demandHeader = th("Demanda");
  demandHeader.dataset.demandHeader = "true";
  demandRow.appendChild(demandHeader);
  for (let col = 0; col < destinations; col += 1) {
    demandRow.appendChild(tdInput("demand", null, col, 0));
  }
  demandRow.appendChild(th(""));
  tfoot.appendChild(demandRow);
  table.appendChild(tfoot);

  inputTable.replaceChildren(table);
  resetResults();
  updateBalanceStatus();
}

function readConfigurationCount(input, label) {
  const value = Number(input.value);
  input.classList.remove("invalid-input");

  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    input.classList.add("invalid-input");
    showMessage(`El numero de ${label} debe ser un entero positivo.`);
    return null;
  }

  if (value < 1) {
    input.classList.add("invalid-input");
    showMessage(`El numero de ${label} es negativo o cero; solo se aceptan enteros positivos.`);
    return null;
  }

  if (value > 12) {
    input.classList.add("invalid-input");
    showMessage(`El numero de ${label} no puede ser mayor que 12.`);
    return null;
  }

  return value;
}

function handleConfigurationInput(event) {
  const input = event.target;
  const label = input === originInput ? "origenes" : "destinos";
  const value = Number(input.value);
  input.classList.remove("invalid-input");

  if (input.value.trim() === "") {
    showMessage(`El numero de ${label} debe ser un entero positivo.`);
    return;
  }

  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    input.classList.add("invalid-input");
    showMessage(`El numero de ${label} debe ser un entero positivo.`);
    return;
  }

  if (value < 1) {
    input.classList.add("invalid-input");
    showMessage(`El numero de ${label} es negativo o cero; solo se aceptan enteros positivos.`);
    return;
  }

  if (value > 12) {
    input.classList.add("invalid-input");
    showMessage(`El numero de ${label} no puede ser mayor que 12.`);
    return;
  }

  hideMessage();
}

function th(text) {
  const cell = document.createElement("th");
  cell.textContent = text;
  return cell;
}

function tdInput(type, row, col, value) {
  const td = document.createElement("td");
  td.dataset.cellType = type;
  if (row !== null) td.dataset.rowIndex = row;
  if (col !== null) td.dataset.colIndex = col;
  const input = document.createElement("input");
  input.type = "number";
  input.step = "any";
  input.min = "0";
  input.value = value;
  input.dataset.type = type;
  if (row !== null) input.dataset.row = row;
  if (col !== null) input.dataset.col = col;
  input.addEventListener("input", handleTableInput);
  td.appendChild(input);
  return td;
}

function handleTableFocus(event) {
  if (event.target.tagName !== "INPUT") return;
  highlightInputContext(event.target);
}

function clearInputHighlights() {
  inputTable.querySelectorAll(".active-guide, .axis-guide").forEach((element) => {
    element.classList.remove("active-guide", "axis-guide");
  });
}

function highlightInputContext(input) {
  clearInputHighlights();

  const row = input.dataset.row;
  const col = input.dataset.col;
  const type = input.dataset.type;
  const table = input.closest("table");
  const activeCell = input.closest("td");

  if (!table || !activeCell) return;

  activeCell.classList.add("active-guide");

  if (row !== undefined) {
    table.querySelector(`[data-row-header="${row}"]`)?.classList.add("axis-guide");
  }

  if (col !== undefined) {
    table.querySelector(`[data-col-header="${col}"]`)?.classList.add("axis-guide");
  }

  if (type === "supply") {
    table.querySelector("[data-supply-header='true']")?.classList.add("axis-guide");
  }

  if (type === "demand") {
    table.querySelector("[data-demand-header='true']")?.classList.add("axis-guide");
  }
}

function readProblem() {
  const origins = readConfigurationCount(originInput, "origenes");
  const destinations = readConfigurationCount(destinationInput, "destinos");
  if (origins === null || destinations === null) {
    throw new Error("Corrige la configuracion antes de ejecutar el metodo.");
  }

  const costs = Array.from({ length: origins }, () => Array(destinations).fill(0));
  const supply = Array(origins).fill(0);
  const demand = Array(destinations).fill(0);

  const inputs = inputTable.querySelectorAll("input");
  for (const input of inputs) {
    if (input.value.trim() === "") {
      throw new Error("Todos los campos deben tener un valor numerico.");
    }
    const value = Number(input.value);
    if (!Number.isFinite(value)) {
      throw new Error("Todos los campos deben ser numericos.");
    }
    if (value < 0) {
      input.classList.add("invalid-input");
      throw new Error(`El campo ${fieldLabel(input)} es negativo; solo se aceptan valores positivos o cero.`);
    }

    const type = input.dataset.type;
    if (type === "cost") costs[Number(input.dataset.row)][Number(input.dataset.col)] = value;
    if (type === "supply") supply[Number(input.dataset.row)] = value;
    if (type === "demand") demand[Number(input.dataset.col)] = value;
  }

  if (supply.reduce((sum, value) => sum + value, 0) <= 0) {
    throw new Error("La oferta total debe ser mayor que cero.");
  }
  if (demand.reduce((sum, value) => sum + value, 0) <= 0) {
    throw new Error("La demanda total debe ser mayor que cero.");
  }

  return { costs, supply, demand };
}

function handleTableInput(event) {
  const input = event.target;
  input.classList.remove("invalid-input");

  if (input.value.trim() === "") {
    updateBalanceStatus();
    return;
  }

  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    input.classList.add("invalid-input");
    showMessage(`El campo ${fieldLabel(input)} debe ser numerico.`);
    updateBalanceStatus();
    return;
  }

  if (value < 0) {
    input.classList.add("invalid-input");
    showMessage(`El campo ${fieldLabel(input)} es negativo; solo se aceptan valores positivos o cero.`);
    updateBalanceStatus();
    return;
  }

  hideMessage();
  updateBalanceStatus();
}

function updateBalanceStatus() {
  const inputs = inputTable.querySelectorAll("input");
  let totalSupply = 0;
  let totalDemand = 0;
  let hasNegative = false;

  for (const input of inputs) {
    const value = input.value.trim() === "" ? 0 : Number(input.value);
    if (!Number.isFinite(value)) continue;
    if (value < 0) hasNegative = true;
    if (input.dataset.type === "supply") totalSupply += value;
    if (input.dataset.type === "demand") totalDemand += value;
  }

  const difference = Math.abs(totalSupply - totalDemand);
  let state = "Pendiente";
  let detail = "Ingresa oferta y demanda para comprobar el balance.";
  let tone = "neutral";

  if (hasNegative) {
    state = "Dato invalido";
    detail = "Hay un valor negativo; solo se aceptan valores positivos o cero.";
    tone = "error";
  } else if (totalSupply === 0 && totalDemand === 0) {
    state = "Sin datos";
  } else if (difference === 0) {
    state = "Coinciden";
    detail = "La oferta total y la demanda total coinciden. No se agrega fila ni columna ficticia.";
    tone = "ok";
  } else if (totalSupply > totalDemand) {
    state = "No coinciden";
    detail = `Sobra oferta por ${formatNumber(difference)}. El algoritmo agregara un destino ficticio con costo 0.`;
    tone = "warn";
  } else {
    state = "No coinciden";
    detail = `Falta oferta por ${formatNumber(difference)}. El algoritmo agregara un origen ficticio con costo 0.`;
    tone = "warn";
  }

  balanceStatus.className = `balance-status ${tone}`;
  balanceStatus.innerHTML = `
    <div><span>Suma oferta</span><strong>${formatNumber(totalSupply)}</strong></div>
    <div><span>Suma demanda</span><strong>${formatNumber(totalDemand)}</strong></div>
    <div><span>Estado</span><strong>${state}</strong></div>
    <p>${detail}</p>
  `;

  renderBalancePreview();
}

function renderBalancePreview() {
  const snapshot = readProblemSnapshot();
  if (!snapshot) {
    balancePreview.innerHTML = "";
    return;
  }

  const balanced = buildBalancedSnapshot(snapshot);
  const fakeRowIndex = balanced.addedType === "row" ? snapshot.supply.length : -1;
  const fakeColIndex = balanced.addedType === "column" ? snapshot.demand.length : -1;

  const destinationHeaders = balanced.destinationLabels
    .map((label, index) => `<th class="${index === fakeColIndex ? "fake-column" : ""}">${escapeHtml(label)}</th>`)
    .join("");

  const bodyRows = balanced.costs
    .map((row, rowIndex) => {
      const cells = row
        .map(
          (value, colIndex) =>
            `<td class="${colIndex === fakeColIndex ? "fake-column" : ""}">${formatNumber(value)}</td>`
        )
        .join("");
      return `
        <tr class="${rowIndex === fakeRowIndex ? "fake-row" : ""}">
          <td>${escapeHtml(balanced.originLabels[rowIndex])}</td>
          ${cells}
          <td>${formatNumber(balanced.supply[rowIndex])}</td>
        </tr>
      `;
    })
    .join("");

  const demandCells = balanced.demand
    .map(
      (value, colIndex) => `<td class="${colIndex === fakeColIndex ? "fake-column" : ""}">${formatNumber(value)}</td>`
    )
    .join("");

  balancePreview.innerHTML = `
    <h4 class="table-title">Matriz balanceada que usara el algoritmo</h4>
    <table>
      <thead>
        <tr><th>Origen</th>${destinationHeaders}<th>Oferta</th></tr>
      </thead>
      <tbody>${bodyRows}</tbody>
      <tfoot>
        <tr><th>Demanda</th>${demandCells}<th>${formatNumber(balanced.totalSupply)}</th></tr>
      </tfoot>
    </table>
  `;
}

function readProblemSnapshot() {
  const origins = Number(originInput.value);
  const destinations = Number(destinationInput.value);
  if (!Number.isInteger(origins) || origins < 1 || !Number.isInteger(destinations) || destinations < 1) {
    return null;
  }

  const costs = Array.from({ length: origins }, () => Array(destinations).fill(0));
  const supply = Array(origins).fill(0);
  const demand = Array(destinations).fill(0);

  for (const input of inputTable.querySelectorAll("input")) {
    if (input.value.trim() === "") {
      return null;
    }

    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    if (input.dataset.type === "cost") costs[Number(input.dataset.row)][Number(input.dataset.col)] = value;
    if (input.dataset.type === "supply") supply[Number(input.dataset.row)] = value;
    if (input.dataset.type === "demand") demand[Number(input.dataset.col)] = value;
  }

  return { costs, supply, demand };
}

function buildBalancedSnapshot(problem) {
  const costs = problem.costs.map((row) => [...row]);
  const supply = [...problem.supply];
  const demand = [...problem.demand];
  const originLabels = supply.map((_, index) => `O${index + 1}`);
  const destinationLabels = demand.map((_, index) => `D${index + 1}`);
  const totalSupply = supply.reduce((sum, value) => sum + value, 0);
  const totalDemand = demand.reduce((sum, value) => sum + value, 0);

  let addedType = null;
  if (totalSupply > totalDemand) {
    const difference = totalSupply - totalDemand;
    demand.push(difference);
    destinationLabels.push("Destino ficticio");
    costs.forEach((row) => row.push(0));
    addedType = "column";
  } else if (totalDemand > totalSupply) {
    const difference = totalDemand - totalSupply;
    supply.push(difference);
    originLabels.push("Origen ficticio");
    costs.push(Array(demand.length).fill(0));
    addedType = "row";
  }

  return {
    costs,
    supply,
    demand,
    originLabels,
    destinationLabels,
    totalSupply: Math.max(totalSupply, totalDemand),
    addedType,
  };
}

async function runMethod(endpoint, title) {
  try {
    hideMessage();
    const problem = readProblem();
    const result = await postJson(endpoint, problem);
    currentExport = { title: `Resultado ${title}`, result };
    renderSingleResult(result);
    comparisonTable.innerHTML = "";
    setExportEnabled(true);
  } catch (error) {
    showMessage(error.message);
  }
}

async function compareMethods() {
  try {
    hideMessage();
    const problem = readProblem();
    const result = await postJson("/comparar", problem);
    currentExport = { title: "Comparacion de metodos", result };
    renderComparison(result);
    renderSingleResult(result.results.vogel);
    setExportEnabled(true);
  } catch (error) {
    showMessage(error.message);
  }
}

async function postJson(endpoint, body) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "No se pudo procesar la solicitud.");
  }
  return payload;
}

function renderSingleResult(result) {
  const balance = result.balance;
  const balanceText = balance.balanced
    ? "Problema balanceado"
    : `${balance.added_label} agregado por ${formatNumber(balance.added_amount)} unidades`;

  summary.className = "summary-card";
  summary.innerHTML = `
    <div class="metric"><span>Metodo</span><strong>${escapeHtml(result.method)}</strong></div>
    <div class="metric"><span>Costo total</span><strong>${formatNumber(result.total_cost)}</strong></div>
    <div class="metric"><span>Balanceo</span><strong>${escapeHtml(balanceText)}</strong></div>
  `;

  allocationTable.innerHTML = buildMatrixTable(result);
  balancedCostTable.innerHTML = `
    <h4 class="table-title">Matriz de costos balanceada</h4>
    ${buildCostMatrixTable(result)}
    ${buildFictitiousMeaning(result)}
    <h4 class="table-title">Matriz de asignacion final</h4>
  `;
  history.innerHTML = buildHistory(result.history);
}

function renderComparison(result) {
  const bestMethod = result.methods.find((item) => item.is_best) || result.methods[0];
  const rows = result.methods
    .map(
      (item) => `
        <tr class="${item.is_best ? "best-row" : ""}">
          <td>${escapeHtml(item.method)}</td>
          <td>${formatNumber(item.total_cost)}</td>
        </tr>
      `
    )
    .join("");

  comparisonTable.innerHTML = `
    <table>
      <thead>
        <tr><th>Metodo</th><th>Costo total</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="comparison-note">El menor costo corresponde a ${escapeHtml(bestMethod.method)} con Z = ${formatNumber(
      bestMethod.total_cost
    )}.</p>
  `;
}

function buildMatrixTable(result) {
  const fakeRowIndex = result.balance.added_type === "row" ? result.balance.original_rows : -1;
  const fakeColIndex = result.balance.added_type === "column" ? result.balance.original_cols : -1;

  const head = result.destination_labels
    .map((label, index) => `<th class="${index === fakeColIndex ? "fake-column" : ""}">${escapeHtml(label)}</th>`)
    .join("");

  const rows = result.allocations
    .map((row, rowIndex) => {
      const cells = row
        .map(
          (value, colIndex) =>
            `<td class="${colIndex === fakeColIndex ? "fake-column" : ""}">${formatNumber(value)}</td>`
        )
        .join("");
      return `
        <tr class="${rowIndex === fakeRowIndex ? "fake-row" : ""}">
          <td>${escapeHtml(result.origin_labels[rowIndex])}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  return `
    <table>
      <thead><tr><th></th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildCostMatrixTable(result) {
  const fakeRowIndex = result.balance.added_type === "row" ? result.balance.original_rows : -1;
  const fakeColIndex = result.balance.added_type === "column" ? result.balance.original_cols : -1;

  const head = result.destination_labels
    .map((label, index) => `<th class="${index === fakeColIndex ? "fake-column" : ""}">${escapeHtml(label)}</th>`)
    .join("");

  const rows = result.costs
    .map((row, rowIndex) => {
      const cells = row
        .map(
          (value, colIndex) =>
            `<td class="${colIndex === fakeColIndex ? "fake-column" : ""}">${formatNumber(value)}</td>`
        )
        .join("");
      return `
        <tr class="${rowIndex === fakeRowIndex ? "fake-row" : ""}">
          <td>${escapeHtml(result.origin_labels[rowIndex])}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  return `
    <table>
      <thead><tr><th></th>${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function buildFictitiousMeaning(result) {
  const balance = result.balance;
  if (balance.balanced) {
    return '<p class="analysis-note">Oferta y demanda coinciden; no existe asignacion ficticia.</p>';
  }

  const text =
    balance.added_type === "column"
      ? "La cantidad asignada al destino ficticio representa inventario sobrante que no se envia a un destino real."
      : "La cantidad asignada al origen ficticio representa demanda insatisfecha cubierta solo para equilibrar el modelo.";

  return `<p class="analysis-note">${text}</p>`;
}

function buildHistory(steps) {
  if (!steps.length) {
    return '<p class="summary-empty">No hay iteraciones para mostrar.</p>';
  }

  return steps
    .map((step) => {
      const assignment = step.assignment;
      const penalties = buildPenaltyPills(step);
      return `
        <article class="history-item">
          <h4>Iteracion ${step.iteration}</h4>
          <p>${escapeHtml(step.decision)}</p>
          <p>Asignacion = ${formatNumber(assignment.quantity)} en ${escapeHtml(assignment.row_label)} -> ${escapeHtml(
            assignment.column_label
          )}. Costo acumulado = ${formatNumber(step.accumulated_cost)}.</p>
          ${penalties}
        </article>
      `;
    })
    .join("");
}

function buildPenaltyPills(step) {
  const penalties = [...(step.row_penalties || []), ...(step.column_penalties || [])];
  if (!penalties.length) return "";

  const pills = penalties
    .map((item) => `<span class="pill">${escapeHtml(item.label)}: ${formatNumber(item.penalty)}</span>`)
    .join("");
  return `<div class="penalties">${pills}</div>`;
}

async function exportResults(endpoint, filename) {
  if (!currentExport) return;

  try {
    hideMessage();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentExport),
    });

    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.detail || "No se pudo exportar el archivo.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showMessage(error.message);
  }
}

function clearAll() {
  inputTable.querySelectorAll("input").forEach((input) => {
    input.value = 0;
    input.classList.remove("invalid-input");
  });
  resetResults();
  hideMessage();
  updateBalanceStatus();
}

function resetResults() {
  currentExport = null;
  summary.className = "summary-empty";
  summary.textContent = "Ejecuta un metodo para ver resultados.";
  balancedCostTable.innerHTML = "";
  allocationTable.innerHTML = "";
  comparisonTable.innerHTML = "";
  history.innerHTML = "";
  setExportEnabled(false);
}

function fieldLabel(input) {
  const type = input.dataset.type;
  if (type === "cost") {
    return `costo O${Number(input.dataset.row) + 1}-D${Number(input.dataset.col) + 1}`;
  }
  if (type === "supply") {
    return `oferta O${Number(input.dataset.row) + 1}`;
  }
  if (type === "demand") {
    return `demanda D${Number(input.dataset.col) + 1}`;
  }
  return "seleccionado";
}

function setExportEnabled(enabled) {
  pdfBtn.disabled = !enabled;
  excelBtn.disabled = !enabled;
}

function showMessage(text) {
  message.textContent = text;
  message.classList.remove("hidden");
}

function hideMessage() {
  message.textContent = "";
  message.classList.add("hidden");
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return new Intl.NumberFormat("es-GT", { maximumFractionDigits: 4 }).format(number);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
