const form = document.getElementById("reportForm");
const previewRoot = document.getElementById("previewRoot");
const reportTemplate = document.getElementById("reportTemplate");
const generateBtn = document.getElementById("generateBtn");
const printBtn = document.getElementById("printBtn");
const activeList = document.getElementById("activeList");
const addActiveBtn = document.getElementById("addActiveBtn");
const pageSummary = document.getElementById("pageSummary");
const previewSummary = document.getElementById("previewSummary");
const presetSelect = document.getElementById("presetSelect");
const draftNameInput = document.getElementById("draftName");
const draftSelect = document.getElementById("draftSelect");
const saveDraftBtn = document.getElementById("saveDraftBtn");
const loadDraftBtn = document.getElementById("loadDraftBtn");
const duplicateDraftBtn = document.getElementById("duplicateDraftBtn");
const reuseBatchBtn = document.getElementById("reuseBatchBtn");
const deleteDraftBtn = document.getElementById("deleteDraftBtn");
const formulaNameInput = document.getElementById("formulaName");
const formulaSelect = document.getElementById("formulaSelect");
const saveFormulaBtn = document.getElementById("saveFormulaBtn");
const loadFormulaBtn = document.getElementById("loadFormulaBtn");
const duplicateFormulaBtn = document.getElementById("duplicateFormulaBtn");
const deleteFormulaBtn = document.getElementById("deleteFormulaBtn");
const bulkInput = document.getElementById("bulkInput");
const generateBulkBtn = document.getElementById("generateBulkBtn");
const downloadBulkTemplateBtn = document.getElementById("downloadBulkTemplateBtn");
const clearBulkBtn = document.getElementById("clearBulkBtn");
const exportModeSelect = document.getElementById("exportMode");
const validationHeadline = document.getElementById("validationHeadline");
const validationList = document.getElementById("validationList");
const defaultDocumentTitle = document.title;
const DRAFT_STORAGE_KEY = "hplc-report-drafts-v2";
const FORMULA_STORAGE_KEY = "hplc-report-formulas-v1";
const FORMULA_VARIABLE_FIELDS = [
  "reportNo",
  "sampleName",
  "submittedBy",
  "address",
  "manufacturedBy",
  "suppliedBy",
  "mfgLicNo",
  "refNo",
  "receivedOn",
  "refDate",
  "analysisStartedDate",
  "analysisCompletedDate",
  "mfgDate",
  "expDate",
  "batchNo",
  "batchSize",
  "sampleQty",
  "descriptionResult",
  "assayResult",
];
const BULK_ACTIVE_FIELD_MAP = {
  SampleFileNo: "sampleFileNo",
  BlankRt: "blankRt",
  BlankHeight: "blankHeight",
  BlankArea: "blankArea",
  ReferenceRt: "referenceRt",
  ReferenceHeight: "referenceHeight",
  ReferenceArea: "referenceArea",
  SampleRt: "sampleRt",
  SampleHeight: "sampleHeight",
  SampleArea: "sampleArea",
  CompositionResult: "compositionResult",
  LabelClaim: "labelClaim",
  Limits: "limits",
  Method: "method",
};
const BULK_BASE_COLUMNS = [
  "reportNo",
  "sampleName",
  "submittedBy",
  "address",
  "batchNo",
  "batchSize",
  "sampleQty",
  "receivedOn",
  "refDate",
  "analysisStartedDate",
  "analysisCompletedDate",
  "mfgDate",
  "expDate",
  "mfgLicNo",
  "refNo",
  "descriptionResult",
  "assayResult",
];
let bulkPreviewRows = [];
let currentRenderDataSet = [];
const PRESETS = {
  krishna: {
    graphHeader: "SHREE KRISHNA ANALYTICAL SERVICES PVT. LTD.",
    acquiredBy: "Admin",
    detectorLabel: "Detector A Ch1",
    sequenceIntervalMin: "12",
  },
  roorkee: {
    graphHeader: "Roorkee Research & Analytical Labs Pvt. Ltd.",
    acquiredBy: "Admin",
    detectorLabel: "Detector A Ch1",
    sequenceIntervalMin: "12",
  },
  compact: {
    graphHeader: "BIOWIL FORMULATION HPLC SECTION",
    acquiredBy: "QC Analyst",
    detectorLabel: "Detector A Ch1",
    sequenceIntervalMin: "10",
  },
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createPeakRow(entry = {}) {
  const row = document.createElement("div");
  row.className = "graph-fields peak-row";
  row.innerHTML = `
    <label>RT (min)<input type="number" step="0.001" data-peak-field="rt" value="${escapeHtml(entry.rt || "")}" /></label>
    <label>Height<input type="number" step="0.01" data-peak-field="height" value="${escapeHtml(entry.height || "")}" /></label>
    <label>Area<input type="number" step="0.01" data-peak-field="area" value="${escapeHtml(entry.area || "")}" /></label>
    <label class="full-span">Label<input data-peak-field="label" value="${escapeHtml(entry.label || "")}" /></label>
    <button type="button" class="secondary-btn remove-peak-btn full-span">Remove Peak</button>
  `;
  return row;
}

function parsePeakRowsString(value) {
  if (!value) return [];
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rt = "", height = "", area = "", label = ""] = entry.split(",").map((part) => part.trim());
      return { rt, height, area, label };
    });
}

function mountPeakEditor(card, kind, initialValue = "") {
  const editor = card.querySelector(`[data-peak-editor="${kind}"]`);
  const addBtn = card.querySelector(`[data-add-peak="${kind}"]`);
  const seedRows = parsePeakRowsString(initialValue);

  function attachRow(row) {
    row.querySelectorAll("input").forEach((field) => {
      field.addEventListener("input", () => generatePages());
    });
    row.querySelector(".remove-peak-btn").addEventListener("click", () => {
      row.remove();
      generatePages();
    });
    editor.appendChild(row);
  }

  seedRows.forEach((entry) => attachRow(createPeakRow(entry)));
  addBtn.addEventListener("click", () => {
    attachRow(createPeakRow());
    generatePages();
  });
}

function serializePeakEditor(card, kind) {
  return [...card.querySelectorAll(`[data-peak-editor="${kind}"] .peak-row`)]
    .map((row) => ({
      rt: row.querySelector('[data-peak-field="rt"]').value.trim(),
      height: row.querySelector('[data-peak-field="height"]').value.trim(),
      area: row.querySelector('[data-peak-field="area"]').value.trim(),
      label: row.querySelector('[data-peak-field="label"]').value.trim(),
    }))
    .filter((entry) => entry.rt || entry.height || entry.area || entry.label)
    .map((entry) => [entry.rt, entry.height, entry.area, entry.label].join(","))
    .join("; ");
}

function createActiveCard(values = {}) {
  const card = document.createElement("section");
  card.className = "active-card";
  card.innerHTML = `
    <div class="active-card-header">
      <div class="active-card-title">
        <h3>Active</h3>
        <p>One active creates 3 graph pages: Blank, Standard, and Test.</p>
      </div>
      <div class="active-card-actions">
        <button type="button" class="toggle-btn">Collapse</button>
        <button type="button" class="remove-btn">Remove</button>
      </div>
    </div>
    <div class="active-grid">
      <label>Active Name<input name="compositionName" value="${escapeHtml(values.name || "")}" /></label>
      <label>Assay Result (% w/w)<input name="compositionResult" value="${escapeHtml(values.result || "")}" /></label>
      <label>Strength Claim<input name="labelClaim" value="${escapeHtml(values.labelClaim || "")}" /></label>
      <label>Limits / Spec<input name="limits" value="${escapeHtml(values.limits || "")}" /></label>
      <label>Method<input name="method" value="${escapeHtml(values.method || "")}" /></label>
      <label>Lambda (nm)<input type="number" step="0.01" name="lambda" value="${escapeHtml(values.lambda || "")}" /></label>
      <label>Test File No.<input type="number" step="1" min="1" name="sampleFileNo" value="${escapeHtml(values.sampleFileNo || "")}" /></label>
      <div></div>

      <div class="calc-card full-span">
        <div class="calc-header">
          <div>
            <h4>Calculation Engine</h4>
            <p>Assay can be estimated from Standard and Test peak areas.</p>
          </div>
          <span class="calc-status">Waiting</span>
        </div>
        <div class="calc-summary">
          <div class="calc-stat"><span>Calculated Assay</span><strong data-calc-result>--</strong></div>
          <div class="calc-stat"><span>Final Status</span><strong data-calc-final>--</strong></div>
          <div class="calc-stat"><span>RT Delta</span><strong data-calc-rt>--</strong></div>
        </div>
        <div class="calc-grid">
          <label>Std Factor<input type="number" step="0.0001" name="calcStandardFactor" value="${escapeHtml(values.calcStandardFactor || "1")}" /></label>
          <label>Sample Factor<input type="number" step="0.0001" name="calcSampleFactor" value="${escapeHtml(values.calcSampleFactor || "1")}" /></label>
          <label>Std Purity %<input type="number" step="0.01" name="calcPurityPercent" value="${escapeHtml(values.calcPurityPercent || "100")}" /></label>
          <label>Response Factor<input type="number" step="0.0001" name="calcResponseFactor" value="${escapeHtml(values.calcResponseFactor || "1")}" /></label>
          <label>Claim % Override<input type="number" step="0.0001" name="calcClaimPercent" value="${escapeHtml(values.calcClaimPercent || "")}" /></label>
          <label>Use Calculated Result
            <select name="useCalculatedResult">
              <option value="no" ${values.useCalculatedResult === "yes" ? "" : "selected"}>No</option>
              <option value="yes" ${values.useCalculatedResult === "yes" ? "selected" : ""}>Yes</option>
            </select>
          </label>
        </div>
      </div>

      <section class="graph-group full-span">
        <div class="graph-group-head">
          <h4>Blank Graph</h4>
          <p>Flat or noisy baseline used before the active peak.</p>
        </div>
        <div class="graph-fields">
          <label>RT (min)<input type="number" step="0.001" name="blankRt" value="${escapeHtml(values.blankRt || "")}" /></label>
          <label>Height<input type="number" step="0.01" name="blankHeight" value="${escapeHtml(values.blankHeight || "")}" /></label>
          <label>Area<input type="number" step="0.01" name="blankArea" value="${escapeHtml(values.blankArea || "")}" /></label>
        </div>
        <div class="graph-group-head">
          <h4>Editable Peak Rows</h4>
          <p>Add extra blank peaks only if the chromatogram shows them.</p>
        </div>
        <div data-peak-editor="blank"></div>
        <button type="button" class="secondary-btn" data-add-peak="blank">Add Blank Peak</button>
      </section>

      <section class="graph-group full-span">
        <div class="graph-group-head">
          <h4>Standard Graph</h4>
          <p>Reference chromatogram for this active ingredient.</p>
        </div>
        <div class="graph-fields">
          <label>RT (min)<input type="number" step="0.001" name="referenceRt" value="${escapeHtml(values.referenceRt || "")}" /></label>
          <label>Height<input type="number" step="0.01" name="referenceHeight" value="${escapeHtml(values.referenceHeight || "")}" /></label>
          <label>Area<input type="number" step="0.01" name="referenceArea" value="${escapeHtml(values.referenceArea || "")}" /></label>
        </div>
        <div class="graph-group-head">
          <h4>Editable Peak Rows</h4>
          <p>Add secondary standard peaks when they appear in the chromatogram.</p>
        </div>
        <div data-peak-editor="reference"></div>
        <button type="button" class="secondary-btn" data-add-peak="reference">Add Standard Peak</button>
      </section>

      <section class="graph-group full-span">
        <div class="graph-group-head">
          <h4>Test Graph</h4>
          <p>Actual sample chromatogram used for the report.</p>
        </div>
        <div class="graph-fields">
          <label>RT (min)<input type="number" step="0.001" name="sampleRt" value="${escapeHtml(values.sampleRt || "")}" /></label>
          <label>Height<input type="number" step="0.01" name="sampleHeight" value="${escapeHtml(values.sampleHeight || "")}" /></label>
          <label>Area<input type="number" step="0.01" name="sampleArea" value="${escapeHtml(values.sampleArea || "")}" /></label>
        </div>
        <div class="graph-group-head">
          <h4>Editable Peak Rows</h4>
          <p>Add other sample peaks if the test chromatogram shows more than one.</p>
        </div>
        <div data-peak-editor="sample"></div>
        <button type="button" class="secondary-btn" data-add-peak="sample">Add Test Peak</button>
      </section>
    </div>
  `;

  mountPeakEditor(card, "blank", values.blankExtraPeaks || "");
  mountPeakEditor(card, "reference", values.referenceExtraPeaks || "");
  mountPeakEditor(card, "sample", values.sampleExtraPeaks || "");

  const removeBtn = card.querySelector(".remove-btn");
  const toggleBtn = card.querySelector(".toggle-btn");
  removeBtn.addEventListener("click", () => {
    if (activeList.children.length > 1) {
      card.remove();
      updateActiveTitles();
      generatePages();
    }
  });
  toggleBtn.addEventListener("click", () => {
    card.classList.toggle("collapsed");
    toggleBtn.textContent = card.classList.contains("collapsed") ? "Expand" : "Collapse";
  });
  card.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      updateActiveTitles();
      generatePages();
    });
    field.addEventListener("change", () => {
      updateActiveTitles();
      generatePages();
    });
  });
  return card;
}

function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setDrafts(drafts) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function renderDraftOptions() {
  const drafts = getDrafts();
  draftSelect.innerHTML = drafts.length
    ? drafts.map((draft) => `<option value="${escapeHtml(draft.id)}">${escapeHtml(draft.name)}</option>`).join("")
    : '<option value="">No saved drafts</option>';
}

function getFormulas() {
  try {
    return JSON.parse(localStorage.getItem(FORMULA_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function setFormulas(formulas) {
  localStorage.setItem(FORMULA_STORAGE_KEY, JSON.stringify(formulas));
}

function renderFormulaOptions() {
  const formulas = getFormulas();
  formulaSelect.innerHTML = formulas.length
    ? formulas.map((formula) => `<option value="${escapeHtml(formula.id)}">${escapeHtml(formula.name)}</option>`).join("")
    : '<option value="">No saved formulas</option>';
}

function collectActives() {
  return [...activeList.querySelectorAll(".active-card")].map((card) => ({
    compositionName: card.querySelector('[name="compositionName"]').value,
    compositionResult: card.querySelector('[name="compositionResult"]').value,
    labelClaim: card.querySelector('[name="labelClaim"]').value,
    limits: card.querySelector('[name="limits"]').value,
    method: card.querySelector('[name="method"]').value,
    lambda: card.querySelector('[name="lambda"]').value,
    sampleFileNo: card.querySelector('[name="sampleFileNo"]').value,
    calcStandardFactor: card.querySelector('[name="calcStandardFactor"]').value,
    calcSampleFactor: card.querySelector('[name="calcSampleFactor"]').value,
    calcPurityPercent: card.querySelector('[name="calcPurityPercent"]').value,
    calcResponseFactor: card.querySelector('[name="calcResponseFactor"]').value,
    calcClaimPercent: card.querySelector('[name="calcClaimPercent"]').value,
    useCalculatedResult: card.querySelector('[name="useCalculatedResult"]').value,
    blankRt: card.querySelector('[name="blankRt"]').value,
    blankHeight: card.querySelector('[name="blankHeight"]').value,
    blankArea: card.querySelector('[name="blankArea"]').value,
    blankExtraPeaks: serializePeakEditor(card, "blank"),
    referenceRt: card.querySelector('[name="referenceRt"]').value,
    referenceHeight: card.querySelector('[name="referenceHeight"]').value,
    referenceArea: card.querySelector('[name="referenceArea"]').value,
    referenceExtraPeaks: serializePeakEditor(card, "reference"),
    sampleRt: card.querySelector('[name="sampleRt"]').value,
    sampleHeight: card.querySelector('[name="sampleHeight"]').value,
    sampleArea: card.querySelector('[name="sampleArea"]').value,
    sampleExtraPeaks: serializePeakEditor(card, "sample"),
  }));
}

function updateActiveTitles() {
  const cards = [...activeList.querySelectorAll(".active-card")];
  cards.forEach((card, index) => {
    const title = card.querySelector("h3");
    const name = card.querySelector('[name="compositionName"]').value.trim();
    title.textContent = name || `Active ${index + 1}`;
  });
}

function updatePreviewSummary(activeCount) {
  const totalPages = 1 + activeCount * 3;
  const activeLabel = `${activeCount} active${activeCount === 1 ? "" : "s"}`;
  const pageLabel = `${totalPages} page${totalPages === 1 ? "" : "s"}`;
  pageSummary.textContent = `${activeLabel}, ${pageLabel}`;
  previewSummary.textContent = `${activeLabel} will generate ${pageLabel}: 1 report page and ${activeCount * 3} graph pages.`;
}

function updateBatchPreviewSummary(dataSet) {
  const reportCount = dataSet.length;
  const activeCount = dataSet.reduce((sum, item) => sum + item.actives.length, 0);
  const pageCount = dataSet.reduce((sum, item) => sum + 1 + item.actives.length * 3, 0);
  const reportLabel = `${reportCount} report${reportCount === 1 ? "" : "s"}`;
  const activeLabel = `${activeCount} active chromatogram set${activeCount === 1 ? "" : "s"}`;
  const pageLabel = `${pageCount} page${pageCount === 1 ? "" : "s"}`;
  pageSummary.textContent = `${reportLabel}, ${pageLabel}`;
  previewSummary.textContent = `${reportLabel} are ready in bulk mode with ${activeLabel} across ${pageLabel}.`;
}

function getPrintTitle() {
  const data = collectFormData();
  const sampleName = (data.sampleName || "").trim();
  const reportNo = (data.reportNo || "").trim();
  if (sampleName && reportNo) return `${sampleName} ${reportNo}`.trim();
  if (sampleName) return sampleName;
  if (reportNo) return reportNo;
  return " ";
}

function restoreDocumentTitle() {
  document.title = defaultDocumentTitle;
}

function buildExportFilename() {
  const data = currentRenderDataSet[0] || collectFormData();
  const sampleName =
    currentRenderDataSet.length > 1
      ? `Bulk_${currentRenderDataSet.length}_Reports`
      : (data.sampleName || "HPLC Report").trim().replace(/[\\/:*?"<>|]+/g, " ");
  const reportNo =
    currentRenderDataSet.length > 1
      ? "BATCH"
      : (data.reportNo || "NO-REPORT").trim().replace(/[\\/:*?"<>|]+/g, " ");
  const dateTag = (data.analysisCompletedDate || data.receivedOn || "").replace(/-/g, "") || formatDateFromDate(getGraphDate(data)).replace(/\//g, "");
  const modeTag = exportModeSelect.value === "report" ? "report" : exportModeSelect.value === "graphs" ? "graphs" : "full";
  return `${sampleName}_${reportNo}_${dateTag}_${modeTag}.pdf`.replace(/\s+/g, "_");
}

function syncCanvasContent(sourcePage, clonedPage) {
  const sourceCanvases = sourcePage.querySelectorAll("canvas");
  const clonedCanvases = clonedPage.querySelectorAll("canvas");

  sourceCanvases.forEach((sourceCanvas, index) => {
    const clonedCanvas = clonedCanvases[index];
    if (!clonedCanvas) return;

    const image = document.createElement("img");
    image.src = sourceCanvas.toDataURL("image/png");
    image.alt = "Chromatogram";
    image.className = clonedCanvas.className;
    image.style.display = "block";
    image.style.width = clonedCanvas.style.width || "100%";
    image.style.height = clonedCanvas.style.height || "auto";
    if (clonedCanvas.width) image.width = clonedCanvas.width;
    if (clonedCanvas.height) image.height = clonedCanvas.height;
    clonedCanvas.replaceWith(image);
  });
}

async function exportCleanPdf() {
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    window.alert("PDF export tools did not load. Please refresh and try again.");
    return;
  }
  const originalLabel = printBtn.textContent;
  printBtn.disabled = true;
  printBtn.textContent = "Preparing PDF...";
  try {
    const mode = exportModeSelect.value;
    const pages = [...previewRoot.children];
    const exportPages =
      mode === "report" ? pages.slice(0, 1) : mode === "graphs" ? pages.slice(1) : pages;
    if (!exportPages.length) {
      window.alert("There are no pages to export yet.");
      return;
    }

    const previousScrollTop = previewRoot.scrollTop;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    });
    const pdfWidth = 210;
    const pdfHeight = 297;

    for (let index = 0; index < exportPages.length; index += 1) {
      const page = exportPages[index];
      const sandbox = document.createElement("div");
      sandbox.className = "export-sandbox";
      const clonedPage = page.cloneNode(true);
      clonedPage.style.margin = "0";
      clonedPage.style.boxShadow = "none";
      clonedPage.style.border = "0";
      syncCanvasContent(page, clonedPage);
      sandbox.appendChild(clonedPage);
      document.body.appendChild(sandbox);

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await window.html2canvas(clonedPage, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: clonedPage.offsetWidth,
        height: clonedPage.offsetHeight,
        windowWidth: clonedPage.scrollWidth,
        windowHeight: clonedPage.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const imageData = canvas.toDataURL("image/png");
      if (index > 0) pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      sandbox.remove();
    }

    previewRoot.scrollTop = previousScrollTop;
    pdf.save(buildExportFilename());
  } finally {
    printBtn.disabled = false;
    printBtn.textContent = originalLabel;
  }
}


function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
}

function formatDateFromDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatDateTimeFromDate(date, timeValue = "") {
  const base = formatDateFromDate(date);
  if (!timeValue) return `${base} 12:00:00 PM`;
  const [hoursRaw, minutesRaw = "00", secondsRaw = "00"] = timeValue.split(":");
  const hours24 = Number(hoursRaw);
  const minutes = String(minutesRaw).padStart(2, "0");
  const seconds = String(secondsRaw).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${base} ${hours12}:${minutes}:${seconds} ${ampm}`;
}

function formatDateTimeValue(date) {
  const base = formatDateFromDate(date);
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = ((hours24 + 11) % 12) + 1;
  return `${base} ${hours12}:${minutes}:${seconds} ${ampm}`;
}

function collectFormData() {
  const fd = new FormData(form);
  return {
    ...Object.fromEntries(fd.entries()),
    actives: collectActives(),
    preset: presetSelect.value,
    exportMode: exportModeSelect.value,
    draftName: draftNameInput.value.trim(),
    formulaName: formulaNameInput.value.trim(),
  };
}

function extractFirstNumber(value) {
  const match = String(value || "").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function parseLimitRange(value) {
  const matches = String(value || "").match(/-?\d+(\.\d+)?/g) || [];
  if (matches.length < 2) return null;
  return { min: Number(matches[0]), max: Number(matches[1]) };
}

function formatAssayValue(value) {
  return Number.isFinite(value) ? `${value.toFixed(4)}% w/w` : "--";
}

function calculateActiveMetrics(active) {
  const claimPercent = toNumber(active.calcClaimPercent || extractFirstNumber(active.labelClaim), 0);
  const stdFactor = Math.max(toNumber(active.calcStandardFactor, 1), 0.000001);
  const sampleFactor = Math.max(toNumber(active.calcSampleFactor, 1), 0.000001);
  const purityFactor = Math.max(toNumber(active.calcPurityPercent, 100), 0) / 100;
  const responseFactor = Math.max(toNumber(active.calcResponseFactor, 1), 0);
  const stdArea = toNumber(active.referenceArea, 0);
  const sampleArea = toNumber(active.sampleArea, 0);
  const calculatedAssay =
    stdArea > 0 && claimPercent > 0
      ? (sampleArea / stdArea) * (stdFactor / sampleFactor) * purityFactor * responseFactor * claimPercent
      : null;
  const manualAssay = extractFirstNumber(active.compositionResult);
  const finalAssay = active.useCalculatedResult === "yes" && Number.isFinite(calculatedAssay) ? calculatedAssay : manualAssay;
  const limitRange = parseLimitRange(active.limits);
  const rtDelta =
    Number.isFinite(toNumber(active.sampleRt, NaN)) && Number.isFinite(toNumber(active.referenceRt, NaN))
      ? Math.abs(toNumber(active.sampleRt, 0) - toNumber(active.referenceRt, 0))
      : null;
  let status = "warn";
  let message = "Needs review";
  if (limitRange && Number.isFinite(finalAssay)) {
    if (finalAssay >= limitRange.min && finalAssay <= limitRange.max) {
      status = "pass";
      message = "Complies";
    } else {
      status = "fail";
      message = "Out of spec";
    }
  } else if (Number.isFinite(finalAssay)) {
    status = "pass";
    message = "Calculated";
  }
  return {
    claimPercent,
    calculatedAssay,
    finalAssay,
    limitRange,
    rtDelta,
    status,
    message,
  };
}

function summarizeReportStatus(metricsList) {
  if (metricsList.some((item) => item.status === "fail")) {
    return { className: "fail", text: "Does Not Comply" };
  }
  if (metricsList.some((item) => item.status === "warn")) {
    return { className: "warn", text: "Needs Review" };
  }
  return { className: "", text: "Complies" };
}

function validateData(data) {
  const issues = [];
  const requiredFields = [
    ["Report No.", data.reportNo],
    ["Submitted By", data.submittedBy],
    ["Sample / Product Name", data.sampleName],
    ["Batch No.", data.batchNo],
    ["Received On", data.receivedOn],
  ];
  requiredFields.forEach(([label, value]) => {
    if (!String(value || "").trim()) issues.push({ level: "error", text: `${label} is required.` });
  });
  const received = data.receivedOn ? new Date(data.receivedOn) : null;
  const started = data.analysisStartedDate ? new Date(data.analysisStartedDate) : null;
  const completed = data.analysisCompletedDate ? new Date(data.analysisCompletedDate) : null;
  if (received && started && started < received) issues.push({ level: "error", text: "Analysis start date is before sample received date." });
  if (started && completed && completed < started) issues.push({ level: "error", text: "Analysis completed date is before analysis start date." });

  data.actives.forEach((active, index) => {
    const name = active.compositionName || `Active ${index + 1}`;
    const metrics = calculateActiveMetrics(active);
    if (!active.lambda) issues.push({ level: "warning", text: `${name}: Lambda is missing.` });
    if (toNumber(active.blankArea, 0) > 0 || toNumber(active.blankHeight, 0) > 0 || toNumber(active.blankRt, 0) > 0) {
      issues.push({ level: "warning", text: `${name}: Blank graph has a recorded peak. Verify if blank should be flat.` });
    }
    if (metrics.rtDelta !== null && metrics.rtDelta > 0.2) {
      issues.push({ level: "warning", text: `${name}: Standard and test RT differ by ${metrics.rtDelta.toFixed(3)} min.` });
    }
    if (metrics.status === "fail") {
      issues.push({ level: "error", text: `${name}: Assay is outside the configured limit range.` });
    }
    if (metrics.calculatedAssay === null) {
      issues.push({ level: "warning", text: `${name}: Calculation engine is incomplete because reference area, sample area, or claim is missing.` });
    }
  });
  if (!issues.length) issues.push({ level: "ok", text: "No validation issues found." });
  return issues;
}

function updateValidationPanel(data) {
  const issues = validateData(data);
  const errorCount = issues.filter((item) => item.level === "error").length;
  const warningCount = issues.filter((item) => item.level === "warning").length;
  validationHeadline.textContent = errorCount
    ? `${errorCount} issue${errorCount === 1 ? "" : "s"} need attention`
    : warningCount
    ? `${warningCount} warning${warningCount === 1 ? "" : "s"} to review`
    : "Ready to export";
  validationList.innerHTML = issues.map((item) => `<li class="${item.level}">${escapeHtml(item.text)}</li>`).join("");
}

function refreshActiveCardStates(data) {
  [...activeList.querySelectorAll(".active-card")].forEach((card, index) => {
    const metrics = calculateActiveMetrics(data.actives[index]);
    const status = card.querySelector(".calc-status");
    const result = card.querySelector("[data-calc-result]");
    const final = card.querySelector("[data-calc-final]");
    const rt = card.querySelector("[data-calc-rt]");
    status.className = `calc-status ${metrics.status === "pass" ? "" : metrics.status === "fail" ? "fail" : "warn"}`.trim();
    status.textContent = metrics.message;
    result.textContent = formatAssayValue(metrics.calculatedAssay);
    final.textContent = metrics.finalAssay !== null ? formatAssayValue(metrics.finalAssay) : "--";
    rt.textContent = metrics.rtDelta !== null ? `${metrics.rtDelta.toFixed(3)} min` : "--";
  });
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  Object.entries(preset).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) field.value = value;
  });
  generatePages();
}

function clearBatchFields(data) {
  return {
    ...data,
    reportNo: "",
    batchNo: "",
    receivedOn: "",
    refDate: "",
    analysisStartedDate: "",
    analysisCompletedDate: "",
    acquiredTime: data.acquiredTime || "15:30:01",
  };
}

function clearFormulaVariableFields(data) {
  const cleared = {
    ...data,
    draftName: "",
  };
  FORMULA_VARIABLE_FIELDS.forEach((key) => {
    cleared[key] = "";
  });
  return cleared;
}

function setFormState(data) {
  const baseEntries = { ...data };
  delete baseEntries.actives;
  Object.entries(baseEntries).forEach(([key, value]) => {
    const field = document.getElementById(key) || form.querySelector(`[name="${key}"]`);
    if (field && key !== "draftName") field.value = value ?? "";
  });
  presetSelect.value = data.preset || presetSelect.value;
  exportModeSelect.value = data.exportMode || exportModeSelect.value;
  draftNameInput.value = data.draftName || "";
  formulaNameInput.value = data.formulaName || "";
  activeList.innerHTML = "";
  (data.actives || []).forEach((active) => {
    activeList.appendChild(
      createActiveCard({
        name: active.compositionName,
        result: active.compositionResult,
        labelClaim: active.labelClaim,
        limits: active.limits,
        method: active.method,
        lambda: active.lambda,
        sampleFileNo: active.sampleFileNo,
        calcStandardFactor: active.calcStandardFactor,
        calcSampleFactor: active.calcSampleFactor,
        calcPurityPercent: active.calcPurityPercent,
        calcResponseFactor: active.calcResponseFactor,
        calcClaimPercent: active.calcClaimPercent,
        useCalculatedResult: active.useCalculatedResult,
        blankRt: active.blankRt,
        blankHeight: active.blankHeight,
        blankArea: active.blankArea,
        blankExtraPeaks: active.blankExtraPeaks,
        referenceRt: active.referenceRt,
        referenceHeight: active.referenceHeight,
        referenceArea: active.referenceArea,
        referenceExtraPeaks: active.referenceExtraPeaks,
        sampleRt: active.sampleRt,
        sampleHeight: active.sampleHeight,
        sampleArea: active.sampleArea,
        sampleExtraPeaks: active.sampleExtraPeaks,
      })
    );
  });
  if (!activeList.children.length) {
    activeList.appendChild(createActiveCard());
  }
  updateActiveTitles();
  generatePages();
}

function saveCurrentDraft() {
  const name = draftNameInput.value.trim() || `Draft ${new Date().toLocaleString()}`;
  const draft = { id: crypto.randomUUID(), name, data: collectFormData() };
  const drafts = getDrafts();
  const existingIndex = drafts.findIndex((item) => item.name === name || item.id === draftSelect.value);
  if (existingIndex >= 0) drafts[existingIndex] = { ...drafts[existingIndex], name, data: draft.data };
  else drafts.unshift(draft);
  setDrafts(drafts);
  renderDraftOptions();
  draftSelect.value = existingIndex >= 0 ? drafts[existingIndex].id : draft.id;
}

function loadSelectedDraft() {
  const selected = getDrafts().find((draft) => draft.id === draftSelect.value);
  if (!selected) return;
  bulkPreviewRows = [];
  setFormState({ ...selected.data, draftName: selected.name });
}

function duplicateSelectedDraft() {
  const selected = getDrafts().find((draft) => draft.id === draftSelect.value);
  if (!selected) return;
  const duplicateName = `${selected.name} Copy`;
  const drafts = getDrafts();
  const draft = { id: crypto.randomUUID(), name: duplicateName, data: { ...selected.data, draftName: duplicateName } };
  drafts.unshift(draft);
  setDrafts(drafts);
  renderDraftOptions();
  draftSelect.value = draft.id;
  draftNameInput.value = duplicateName;
}

function reuseCurrentForBatch() {
  const reused = clearBatchFields(collectFormData());
  reused.draftName = `${(draftNameInput.value || "Draft").trim()} New Batch`;
  bulkPreviewRows = [];
  setFormState(reused);
}

function deleteSelectedDraft() {
  const filtered = getDrafts().filter((draft) => draft.id !== draftSelect.value);
  setDrafts(filtered);
  renderDraftOptions();
}

function saveCurrentFormula() {
  const name = formulaNameInput.value.trim() || collectFormData().sampleName.trim() || `Formula ${new Date().toLocaleString()}`;
  const formula = { id: crypto.randomUUID(), name, data: collectFormData() };
  const formulas = getFormulas();
  const existingIndex = formulas.findIndex((item) => item.name === name || item.id === formulaSelect.value);
  if (existingIndex >= 0) formulas[existingIndex] = { ...formulas[existingIndex], name, data: formula.data };
  else formulas.unshift(formula);
  setFormulas(formulas);
  renderFormulaOptions();
  formulaSelect.value = existingIndex >= 0 ? formulas[existingIndex].id : formula.id;
}

function loadSelectedFormula() {
  const selected = getFormulas().find((formula) => formula.id === formulaSelect.value);
  if (!selected) return;
  bulkPreviewRows = [];
  setFormState({ ...clearFormulaVariableFields(selected.data), formulaName: selected.name });
}

function duplicateSelectedFormula() {
  const selected = getFormulas().find((formula) => formula.id === formulaSelect.value);
  if (!selected) return;
  const duplicateName = `${selected.name} Copy`;
  const formulas = getFormulas();
  const formula = {
    id: crypto.randomUUID(),
    name: duplicateName,
    data: { ...selected.data, formulaName: duplicateName },
  };
  formulas.unshift(formula);
  setFormulas(formulas);
  renderFormulaOptions();
  formulaSelect.value = formula.id;
  formulaNameInput.value = duplicateName;
}

function deleteSelectedFormula() {
  const filtered = getFormulas().filter((formula) => formula.id !== formulaSelect.value);
  setFormulas(filtered);
  renderFormulaOptions();
}

function detectBulkDelimiter(headerLine) {
  return headerLine.includes("\t") ? "\t" : ",";
}

function parseDelimitedLine(line, delimiter) {
  if (delimiter === "\t") return line.split("\t").map((item) => item.trim());
  const parts = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

function parseBulkRows(input) {
  const lines = String(input || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "Paste a header row and at least one bulk data row." };

  const delimiter = detectBulkDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
  return { rows, error: "" };
}

function applyBulkRowToData(baseData, row) {
  const merged = {
    ...baseData,
    actives: baseData.actives.map((active) => ({ ...active })),
  };

  Object.entries(row).forEach(([rawKey, rawValue]) => {
    const key = String(rawKey || "").trim();
    const value = String(rawValue ?? "").trim();
    if (!key || value === "") return;

    const activeMatch = key.match(/^active(\d+)([A-Za-z].*)$/);
    if (activeMatch) {
      const activeIndex = Number(activeMatch[1]) - 1;
      const suffix = activeMatch[2];
      const mappedField = BULK_ACTIVE_FIELD_MAP[suffix];
      if (merged.actives[activeIndex] && mappedField) {
        merged.actives[activeIndex][mappedField] = value;
      }
      return;
    }

    if (key in merged) merged[key] = value;
  });

  return merged;
}

function generateBulkPreview() {
  const parsed = parseBulkRows(bulkInput.value);
  if (parsed.error) {
    window.alert(parsed.error);
    return;
  }
  bulkPreviewRows = parsed.rows;
  generatePages();
}

function clearBulkPreview() {
  bulkInput.value = "";
  bulkPreviewRows = [];
  generatePages();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildBulkTemplateColumns(activeCount) {
  const columns = [...BULK_BASE_COLUMNS];
  for (let index = 1; index <= activeCount; index += 1) {
    columns.push(
      `active${index}SampleFileNo`,
      `active${index}CompositionResult`,
      `active${index}LabelClaim`,
      `active${index}Limits`,
      `active${index}Method`,
      `active${index}BlankRt`,
      `active${index}BlankHeight`,
      `active${index}BlankArea`,
      `active${index}ReferenceRt`,
      `active${index}ReferenceHeight`,
      `active${index}ReferenceArea`,
      `active${index}SampleRt`,
      `active${index}SampleHeight`,
      `active${index}SampleArea`
    );
  }
  return columns;
}

function buildBulkTemplateRow(data) {
  const row = {};
  BULK_BASE_COLUMNS.forEach((column) => {
    row[column] = data[column] ?? "";
  });
  data.actives.forEach((active, index) => {
    const prefix = `active${index + 1}`;
    row[`${prefix}SampleFileNo`] = active.sampleFileNo ?? "";
    row[`${prefix}CompositionResult`] = active.compositionResult ?? "";
    row[`${prefix}LabelClaim`] = active.labelClaim ?? "";
    row[`${prefix}Limits`] = active.limits ?? "";
    row[`${prefix}Method`] = active.method ?? "";
    row[`${prefix}BlankRt`] = active.blankRt ?? "";
    row[`${prefix}BlankHeight`] = active.blankHeight ?? "";
    row[`${prefix}BlankArea`] = active.blankArea ?? "";
    row[`${prefix}ReferenceRt`] = active.referenceRt ?? "";
    row[`${prefix}ReferenceHeight`] = active.referenceHeight ?? "";
    row[`${prefix}ReferenceArea`] = active.referenceArea ?? "";
    row[`${prefix}SampleRt`] = active.sampleRt ?? "";
    row[`${prefix}SampleHeight`] = active.sampleHeight ?? "";
    row[`${prefix}SampleArea`] = active.sampleArea ?? "";
  });
  return row;
}

function downloadBulkTemplate() {
  const data = collectFormData();
  const activeCount = Math.max(data.actives.length, 1);
  const columns = buildBulkTemplateColumns(activeCount);
  const sampleRow = buildBulkTemplateRow(data);
  const csvLines = [
    columns.join(","),
    columns.map((column) => csvEscape(sampleRow[column] ?? "")).join(","),
  ];
  const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const formulaTag = (formulaNameInput.value.trim() || data.sampleName || "bulk-template").replace(/[^A-Za-z0-9]+/g, "_");
  link.href = URL.createObjectURL(blob);
  link.download = `${formulaTag}_bulk_template.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function addMetaRow(tbody, label, value) {
  const tr = document.createElement("tr");
  const td1 = document.createElement("td");
  td1.textContent = label;
  const td2 = document.createElement("td");
  td2.textContent = value || "-";
  tr.append(td1, td2);
  tbody.appendChild(tr);
}

function getDisplayText(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getDisplayHtml(value, fallback = "-") {
  return escapeHtml(getDisplayText(value, fallback)).replace(/\r?\n/g, "<br />");
}

function getIssueDateText(data) {
  return formatDate(data.analysisCompletedDate || data.refDate || data.receivedOn) || formatDateFromDate(getGraphDate(data));
}

function buildKrishnaReportPage(data) {
  const page = document.createElement("article");
  page.className = "page a4 krishna-report-page";
  const metricsList = data.actives.map((active) => calculateActiveMetrics(active));
  const overallStatus = summarizeReportStatus(metricsList);
  const qualityText = overallStatus.text === "Does Not Comply" ? "NOT OF STANDARD QUALITY" : "STANDARD QUALITY";
  const complyText = overallStatus.text === "Does Not Comply" ? "Does not comply w.r.t above tests." : "Complies w.r.t above tests.";
  const activeRows = (data.actives.length ? data.actives : [{}])
    .map((active, index) => {
      const metrics = metricsList[index] || calculateActiveMetrics(active);
      const resultValue =
        active.useCalculatedResult === "yes" && Number.isFinite(metrics.calculatedAssay)
          ? formatAssayValue(metrics.calculatedAssay)
          : getDisplayText(active.compositionResult);
      return `
        <tr>
          <td colspan="2">${getDisplayHtml(active.compositionName)}</td>
          <td>${escapeHtml(resultValue || "-")}</td>
          <td>${getDisplayHtml(active.labelClaim)}</td>
          <td>${getDisplayHtml(active.limits)}</td>
          <td>${getDisplayHtml(active.method)}</td>
        </tr>
      `;
    })
    .join("");

  page.innerHTML = `
    <div class="krishna-content">
      <section class="krishna-meta-grid">
        <div class="krishna-meta-column">
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Submitted By</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(data.submittedBy)}<br />${getDisplayHtml(data.address)}</span>
          </div>
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Sample</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(data.sampleName)}</span>
          </div>
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Manufactured By</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(data.manufacturedBy)}</span>
          </div>
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Supplied By</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(data.suppliedBy)}</span>
          </div>
          <div class="krishna-batch-grid">
            <div class="krishna-batch-cell krishna-batch-main">
              <span class="krishna-batch-label">Batch No.</span>
              <span class="krishna-batch-value">${getDisplayHtml(data.batchNo)}</span>
            </div>
            <div class="krishna-batch-cell">
              <span class="krishna-batch-label">Mfg.Date</span>
              <span class="krishna-batch-value">${getDisplayHtml(data.mfgDate)}</span>
            </div>
            <div class="krishna-batch-cell">
              <span class="krishna-batch-label">Exp.Date</span>
              <span class="krishna-batch-value">${getDisplayHtml(data.expDate)}</span>
            </div>
          </div>
          <div class="krishna-date-line">
            <span class="krishna-date-label">Analysis Started Date</span>
            <span class="krishna-date-sep">:</span>
            <span class="krishna-date-value">${getDisplayHtml(formatDate(data.analysisStartedDate))}</span>
          </div>
        </div>

        <div class="krishna-meta-column">
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Report No.</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(data.reportNo)}</span>
          </div>
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Received on</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(formatDate(data.receivedOn))}</span>
          </div>
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Mfg.Lic.No.</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(data.mfgLicNo)}</span>
          </div>
          <div class="krishna-meta-row">
            <span class="krishna-meta-label">Ref. No.</span>
            <span class="krishna-meta-sep">:</span>
            <span class="krishna-meta-value">${getDisplayHtml(data.refNo)}</span>
          </div>
          <div class="krishna-side-grid">
            <div class="krishna-side-cell">
              <span class="krishna-side-label">Ref. Date</span>
              <span class="krishna-side-value">${getDisplayHtml(formatDate(data.refDate))}</span>
            </div>
            <div class="krishna-side-cell">
              <span class="krishna-side-label">Batch Size</span>
              <span class="krishna-side-value">${getDisplayHtml(data.batchSize)}</span>
            </div>
            <div class="krishna-side-cell">
              <span class="krishna-side-label">Sample Qty.</span>
              <span class="krishna-side-value">${getDisplayHtml(data.sampleQty)}</span>
            </div>
          </div>
          <div class="krishna-date-line">
            <span class="krishna-date-label">Analysis Completed Date</span>
            <span class="krishna-date-sep">:</span>
            <span class="krishna-date-value">${getDisplayHtml(formatDate(data.analysisCompletedDate))}</span>
          </div>
        </div>
      </section>

      <section class="krishna-protocol">
        <span class="krishna-protocol-label">Reference to protocol</span>
        <span class="krishna-protocol-sep">:</span>
        <span class="krishna-protocol-value">${getDisplayHtml(data.protocolReference, "In House Specification")}</span>
      </section>

      <section class="krishna-table-wrap">
        <table class="krishna-result-table">
          <colgroup>
            <col class="krishna-col-serial" />
            <col class="krishna-col-param" />
            <col class="krishna-col-result" />
            <col class="krishna-col-claim" />
            <col class="krishna-col-limit" />
            <col class="krishna-col-method" />
          </colgroup>
          <thead>
            <tr>
              <th class="krishna-col-serial">S.No.</th>
              <th class="krishna-col-param">PARAMETERS/TEST</th>
              <th colspan="2">RESULTS/OBSERVATIONS</th>
              <th colspan="2">LIMITS/SPECIFICATION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Description</td>
              <td colspan="2">${getDisplayHtml(data.descriptionResult)}</td>
              <td colspan="2"></td>
            </tr>
            <tr>
              <td>2</td>
              <td>Assay</td>
              <td colspan="2">${getDisplayHtml(data.assayResult || "--")}</td>
              <td colspan="2"></td>
            </tr>
            <tr class="krishna-comp-head">
              <th colspan="2">COMPOSITION</th>
              <th>RESULTS</th>
              <th>LABEL CLAIM</th>
              <th>LIMITS</th>
              <th>METHOD</th>
            </tr>
            ${activeRows}
          </tbody>
        </table>
      </section>

      <section class="krishna-remarks">
        <p><strong>Remarks:</strong> In the opinion of the undersigned the sample referred to above is of <strong>${qualityText}</strong> as defined in the Act and the rules made thereunder for the reason given below.</p>
        <p>${complyText}</p>
        <div class="krishna-endline">***End of Report***</div>
      </section>

      <section class="krishna-footer-meta">
        <div class="krishna-footer-block">
          <div class="krishna-footer-date">${getDisplayHtml(getIssueDateText(data))}</div>
          <div class="krishna-footer-label">DATE OF ISSUE</div>
        </div>
        <div class="krishna-footer-block krishna-footer-center">
          <div class="krishna-footer-sign-gap"></div>
          <div class="krishna-footer-label">REVIEWED BY</div>
        </div>
      </section>
    </div>
  `;
  return page;
}

function buildGenericReportPage(data) {
  const frag = reportTemplate.content.cloneNode(true);
  const page = frag.querySelector(".page");
  const reportStatus = frag.querySelector("#reportStatus");
  const metaBody = frag.querySelector(".meta-table tbody");
  const resultBody = frag.querySelector(".result-table tbody");
  const compBody = frag.querySelector(".composition-table tbody");
  const metricsList = data.actives.map((active) => calculateActiveMetrics(active));
  const overallStatus = summarizeReportStatus(metricsList);
  reportStatus.textContent = overallStatus.text;
  reportStatus.className = `report-status ${overallStatus.className}`.trim();

  const fields = [
    ["Report No.", data.reportNo],
    ["Received On", formatDate(data.receivedOn)],
    ["Mfg. Lic. No.", data.mfgLicNo],
    ["Ref. No.", data.refNo],
    ["Ref. Date", formatDate(data.refDate)],
    ["Submitted By", data.submittedBy],
    ["Address", data.address],
    ["Sample", data.sampleName],
    ["Manufactured By", data.manufacturedBy],
    ["Supplied By", data.suppliedBy],
    ["Batch No.", data.batchNo],
    ["Mfg. Date", data.mfgDate],
    ["Exp. Date", data.expDate],
    ["Batch Size", data.batchSize],
    ["Sample Qty.", data.sampleQty],
    ["Analysis Started Date", formatDate(data.analysisStartedDate)],
    ["Analysis Completed Date", formatDate(data.analysisCompletedDate)],
    ["Reference to Protocol", data.protocolReference],
  ];
  fields.forEach(([label, value]) => addMetaRow(metaBody, label, value));

  const rows = [
    ["1", "Description", data.descriptionResult || "-", "-"],
    ["2", "Assay", overallStatus.text.toUpperCase(), "-"],
  ];
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    r.forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val;
      tr.appendChild(td);
    });
    resultBody.appendChild(tr);
  });

  const actives = data.actives.length ? data.actives : [{}];
  actives.forEach((active, index) => {
    const metrics = metricsList[index] || calculateActiveMetrics(active);
    const resultValue =
      active.useCalculatedResult === "yes" && Number.isFinite(metrics.calculatedAssay)
        ? formatAssayValue(metrics.calculatedAssay)
        : active.compositionResult;
    const compTr = document.createElement("tr");
    [
      active.compositionName,
      resultValue,
      active.labelClaim,
      active.limits,
      active.method,
      metrics.message,
    ].forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v || "-";
      compTr.appendChild(td);
    });
    compBody.appendChild(compTr);
  });
  return page;
}

function buildReportPage(data) {
  if (data.preset === "krishna") {
    return buildKrishnaReportPage(data);
  }
  return buildGenericReportPage(data);
}

function gaussian(x, mean, sigma, height) {
  const z = (x - mean) / sigma;
  return height * Math.exp(-0.5 * z * z);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatGraphValue(value, digits = 3) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "0.000";
}

function formatRtLabel(value) {
  return `RT ${formatGraphValue(value)}`;
}

function formatAreaValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : "0.0";
}

function formatHeightValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed).toString() : "0";
}

function estimateHeightFromArea(area) {
  const parsedArea = toNumber(area, 0);
  return parsedArea > 0 ? Math.max(Math.round(parsedArea / 17.2), 1) : 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getNiceStep(span, targetSteps = 6) {
  const safeSpan = Math.max(span, 0.0001);
  const rough = safeSpan / targetSteps;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  let nice;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 2.5) nice = 2.5;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * power;
}

function getAdaptiveXMax(peaks, kind) {
  if (kind === "blank") return 10;
  const maxRt = Math.max(...peaks.map((peak) => peak.rt || 0), 0);
  if (maxRt <= 2.2) return 5;
  if (maxRt <= 5.2) return 10;
  const margin = Math.max(1.5, maxRt * 0.35);
  const rawMax = maxRt + margin;
  const step = getNiceStep(rawMax / 10, 5);
  return Math.ceil(rawMax / step) * step;
}

function getPeakWidth(peak) {
  const height = Math.max(Math.abs(toNumber(peak.height, 0)), 1);
  const area = Math.max(toNumber(peak.area, 0), 0);
  const ratio = area > 0 ? Math.sqrt(area / (height * 900)) : 1;
  return clamp(ratio, 0.65, 1.85);
}

function getDisplayPeakHeight(peak, kind) {
  const rawHeight = Math.abs(toNumber(peak.height, 0));
  const rawArea = Math.max(toNumber(peak.area, 0), 0);
  if (kind === "blank") return rawHeight;
  if (rawHeight >= 2000) return rawHeight / 1000;
  if (rawHeight > 0) return rawHeight;
  if (rawArea > 0) return Math.sqrt(rawArea) / 4;
  return 0;
}

function getBlankBaseline(xVal) {
  const injectionRise = 0.95 * gaussian(xVal, 0.08, 0.12, 1);
  const decay = -1.15 + 0.75 * Math.exp(-xVal / 0.9);
  const dip = -2.85 * gaussian(xVal, 2.12, 0.075, 1);
  const rebound1 = 0.9 * gaussian(xVal, 2.42, 0.06, 1);
  const rebound2 = 0.65 * gaussian(xVal, 2.87, 0.09, 1);
  const lateStep = -0.85 / (1 + Math.exp(-(xVal - 7.15) * 9));
  const drift = -0.08 * Math.log1p(xVal);
  const noise = 0.03 * Math.sin(xVal * 8.4) + 0.015 * Math.cos(xVal * 21.7);
  return injectionRise + decay + dip + rebound1 + rebound2 + lateStep + drift + noise;
}

function getNonBlankBaseline(xVal, peaks) {
  const seed = peaks.reduce((sum, peak, index) => sum + (peak.rt || 0) * (index + 1), 0) || 1;
  const drift = 2 + 0.28 * xVal + 0.6 * Math.sin((xVal + seed) * 0.45);
  const ripple = 0.9 * Math.sin((xVal + seed) * 7.5) + 0.35 * Math.cos((xVal + seed) * 13.2);
  return drift + ripple;
}

function formatMonthFolder(date) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  return `${month}.${date.getFullYear()}`;
}

function formatDayFolder(date) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day}`;
}

function getGraphDate(data) {
  const raw = data.analysisCompletedDate || data.refDate || data.receivedOn;
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

function getGraphSequenceIndex(activeIndex, kind) {
  const order = { blank: 0, reference: 1, sample: 2 };
  return activeIndex * 3 + (order[kind] ?? 0);
}

function buildGraphAcquiredDateTime(data, activeIndex, kind) {
  const baseDate = getGraphDate(data);
  const acquiredTime = data.acquiredTime || "12:00:00";
  const [hoursRaw = "12", minutesRaw = "00", secondsRaw = "00"] = acquiredTime.split(":");
  const dt = new Date(baseDate);
  dt.setHours(Number(hoursRaw), Number(minutesRaw), Number(secondsRaw), 0);
  const intervalMinutes = Math.max(1, toNumber(data.sequenceIntervalMin, 12));
  const sequenceIndex = getGraphSequenceIndex(activeIndex, kind);
  dt.setMinutes(dt.getMinutes() + sequenceIndex * intervalMinutes);
  return dt;
}

function sanitizeStem(value) {
  return (value || "Active").replace(/[^A-Za-z0-9]+/g, "");
}

function buildHplcPath(data, active, kind) {
  const date = getGraphDate(data);
  const year = String(date.getFullYear());
  const monthFolder = formatMonthFolder(date);
  const dayFolder = formatDayFolder(date);
  const day = String(date.getDate()).padStart(2, "0");
  const stem = sanitizeStem(active.compositionName);
  const suffix =
    kind === "blank"
      ? `${day}Blank.lcd`
      : kind === "reference"
      ? `${day}Std.lcd`
      : `${day}Spl${Math.max(1, toNumber(active.sampleFileNo, 1))}.lcd`;
  const root = (data.hplcDataRoot || "D:\\Data").replace(/[\\\/]+$/, "");
  return `${root}\\${year}\\${monthFolder}\\${dayFolder}\\${stem}.${suffix}`;
}

function getFilenameFromPath(path) {
  return path.split("\\").pop() || path;
}

function buildMethodFilename(active) {
  return `${sanitizeStem(active.compositionName)}.lcm`;
}

function buildSampleId(data, active, kind) {
  const stem = sanitizeStem(active.compositionName);
  if (kind === "blank") return `${stem}.Blank.`;
  if (kind === "reference") return `${stem}.Std.`;
  return `${stem}.Spl.${data.batchNo || "Sample"}`;
}

function parseExtraPeaks(value) {
  if (!value) return [];
  return value
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [rt = "", height = "", area = "", label = ""] = entry.split(",").map((part) => part.trim());
      return {
        id: index + 2,
        rt: toNumber(rt, 0),
        height: toNumber(height, 0),
        area: toNumber(area, 0),
        label: label || formatRtLabel(rt || index + 2),
      };
    });
}

function buildPeakSet(active, kind) {
  const configMap = {
    blank: {
      rt: active.blankRt,
      height: active.blankHeight,
      area: active.blankArea,
      label: `${sanitizeStem(active.compositionName)}Blank`,
      extras: active.blankExtraPeaks,
    },
    reference: {
      rt: active.referenceRt,
      height: active.referenceHeight,
      area: active.referenceArea,
      label: formatRtLabel(active.referenceRt),
      extras: active.referenceExtraPeaks,
    },
    sample: {
      rt: active.sampleRt,
      height: active.sampleHeight,
      area: active.sampleArea,
      label: formatRtLabel(active.sampleRt),
      extras: active.sampleExtraPeaks,
    },
  };
  const config = configMap[kind];
  const primaryPeak = {
    id: 1,
    rt: toNumber(config.rt, 0),
    height: toNumber(config.height, estimateHeightFromArea(config.area)),
    area: toNumber(config.area, 0),
    label: config.label,
  };
  const peaks = [primaryPeak, ...parseExtraPeaks(config.extras)]
    .filter((peak) => peak.rt > 0 || peak.height !== 0 || peak.area !== 0);
  return peaks.sort((a, b) => a.rt - b.rt).map((peak, index) => ({ ...peak, id: index + 1 }));
}

function asymmetricPeak(x, center, height, width = 1) {
  if (height <= 0) return 0;
  const leftSigma = 0.05 * width;
  const rightSigma = 0.14 * width;
  const sigma = x <= center ? leftSigma : rightSigma;
  const main = gaussian(x, center, sigma, height);
  const shoulder = x > center ? gaussian(x, center + 0.05 * width, 0.18 * width, height * 0.12) : 0;
  return main + shoulder;
}

function drawChromatogram(canvas, { peaks, kind }) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const left = 88;
  const top = 18;
  const right = 36;
  const bottom = 58;
  const plotWidth = w - left - right;
  const plotHeight = h - top - bottom;
  const plotPeaks = peaks.map((peak) => ({
    ...peak,
    displayHeight: getDisplayPeakHeight(peak, kind),
  }));
  const xMin = 0;
  const xMax = getAdaptiveXMax(plotPeaks, kind);
  const samples = [];
  for (let px = 0; px <= plotWidth; px++) {
    const xVal = xMin + (px / plotWidth) * (xMax - xMin);
    let yVal = kind === "blank" ? getBlankBaseline(xVal) : getNonBlankBaseline(xVal, peaks);
    plotPeaks.forEach((peak) => {
      yVal += asymmetricPeak(xVal, peak.rt, peak.displayHeight, getPeakWidth(peak));
    });
    samples.push({ xVal, yVal });
  }

  const yValues = samples.map((sample) => sample.yVal);
  const dataMin = Math.min(...yValues, kind === "blank" ? -3 : 0);
  const dataMax = Math.max(...yValues, kind === "blank" ? 1 : 50);
  const padding = Math.max((dataMax - dataMin) * 0.12, kind === "blank" ? 0.35 : 8);
  const rawMin = kind === "blank" ? dataMin - padding * 0.5 : Math.min(0, dataMin - padding * 0.15);
  const rawMax = dataMax + padding;
  const yStep = getNiceStep(rawMax - rawMin, kind === "blank" ? 4 : 6);
  const yMin = Math.floor(rawMin / yStep) * yStep;
  const yMax = Math.ceil(rawMax / yStep) * yStep;
  const xStep = getNiceStep(xMax - xMin, xMax <= 5 ? 10 : 10);
  const xMinorStep = xStep / 5;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#9b9b9b";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, plotWidth, plotHeight);

  ctx.strokeStyle = "#555";
  ctx.fillStyle = "#111";
  ctx.font = "11px Arial";

  for (let tick = xMin; tick <= xMax + xStep * 0.2; tick += xMinorStep) {
    const x = left + ((tick - xMin) / (xMax - xMin)) * plotWidth;
    const isMajor = Math.abs((tick / xStep) - Math.round(tick / xStep)) < 0.0001;
    ctx.beginPath();
    ctx.moveTo(x, top + plotHeight);
    ctx.lineTo(x, top + plotHeight + (isMajor ? 7 : 4));
    ctx.stroke();
    if (isMajor) {
      const label = xMax <= 5 ? tick.toFixed(1) : tick.toFixed(0);
      ctx.fillText(label, x - (xMax <= 5 ? 8 : 3), top + plotHeight + 18);
    }
  }

  for (let tick = yMin; tick <= yMax + yStep * 0.2; tick += yStep) {
    const ratio = (tick - yMin) / (yMax - yMin);
    const y = top + plotHeight - ratio * plotHeight;
    ctx.beginPath();
    ctx.moveTo(left - 7, y);
    ctx.lineTo(left, y);
    ctx.stroke();
    const label = kind === "blank" ? tick.toFixed(1) : tick.toFixed(0);
    ctx.fillText(label, 26, y + 4);
  }

  ctx.font = "12px Arial";
  ctx.fillText("mAu", 18, top + 6);
  ctx.fillText("Time", left + plotWidth / 2 - 12, top + plotHeight + 34);
  ctx.fillText("min", w - 32, top + plotHeight + 18);

  if (0 >= yMin && 0 <= yMax) {
    const axisZero = top + plotHeight - ((0 - yMin) / (yMax - yMin)) * plotHeight;
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(left, axisZero);
    ctx.lineTo(left + plotWidth, axisZero);
    ctx.stroke();
  }

  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = left + ((sample.xVal - xMin) / (xMax - xMin)) * plotWidth;
    const ratio = (sample.yVal - yMin) / (yMax - yMin);
    const y = top + plotHeight - ratio * plotHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  if (kind !== "blank" && plotPeaks.length) {
    const maxPeakHeight = Math.max(...plotPeaks.map((peak) => Math.abs(peak.displayHeight)), 0);
    const labeledPeaks = plotPeaks
      .filter((peak) => Math.abs(peak.displayHeight) >= maxPeakHeight * 0.16)
      .slice(0, 3);
    labeledPeaks.forEach((peak) => {
      const peakX = left + ((peak.rt - xMin) / (xMax - xMin)) * plotWidth;
      const peakValue = getNonBlankBaseline(peak.rt, peaks) + peak.displayHeight;
      const peakY = top + plotHeight - ((peakValue - yMin) / (yMax - yMin)) * plotHeight;
      ctx.save();
      ctx.translate(peakX + 8, peakY + 6);
      ctx.rotate(-Math.PI / 2);
      ctx.font = "10px Arial";
      ctx.fillStyle = "#111";
      ctx.fillText(peak.label || formatRtLabel(peak.rt), 0, 0);
      ctx.restore();
    });
  }
}

function getGraphConfig(active, kind) {
  if (kind === "blank") {
    return {
      title: `${active.compositionName || "Active"} - Blank Graph`,
      batchLabel: "BLK",
    };
  }
  if (kind === "reference") {
    return {
      title: `${active.compositionName || "Active"} - Respective Salt Reference Graph`,
      batchLabel: "STD",
    };
  }
  return {
    title: `${active.compositionName || "Active"} - Respective Salt Sample Graph`,
    batchLabel: "SMP",
  };
}

function getGraphSheetMeta(data, active, kind, graphDate) {
  if (kind === "blank") {
    return {
      sampleName: `${active.compositionName || "-"}.`,
      batchNo: "NS",
      source: "NS",
      reportNo: "NS",
      date: graphDate,
    };
  }
  if (kind === "reference") {
    return {
      sampleName: `${active.compositionName || "-"}.`,
      batchNo: "STD",
      source: "NS",
      reportNo: "NS",
      date: graphDate,
    };
  }
  return {
    sampleName: `${active.compositionName || "-"}.(${data.sampleName || "-"})`,
    batchNo: data.batchNo || "-",
    source: data.submittedBy || "-",
    reportNo: data.reportNo || "-",
    date: graphDate,
  };
}

function buildGraphPage(data, active, kind, activeIndex) {
  const graph = getGraphConfig(active, kind);
  const graphDate = formatDateFromDate(getGraphDate(data));
  const sheetMeta = getGraphSheetMeta(data, active, kind, graphDate);
  const graphDateTime = formatDateTimeValue(buildGraphAcquiredDateTime(data, activeIndex, kind));
  const peaks = buildPeakSet(active, kind);
  const totalArea = peaks.reduce((sum, peak) => sum + Math.max(0, peak.area), 0);
  const totalHeight = peaks.reduce((sum, peak) => sum + Math.max(0, peak.height), 0);
  const detectorText = `${data.detectorLabel || "Detector A Ch1"} ${active.lambda || ""}nm`.trim();
  const hplcPath = buildHplcPath(data, active, kind);
  const page = document.createElement("article");
  page.className = "page a4 lab-graph-page";

  const header = document.createElement("section");
  header.className = "lab-graph-header";

  const title = document.createElement("p");
  title.className = "lab-graph-title";
  title.textContent = data.graphHeader || "SHREE KRISHNA ANALYTICAL SERVICES PVT. LTD.";

  const meta = document.createElement("div");
  meta.className = "lab-graph-meta";
  const metaRows = [
    ["Acquired by", data.acquiredBy || "Admin"],
    ["Sample Name", sheetMeta.sampleName],
    ["Sample ID", buildSampleId(data, active, kind)],
    ["Data Filename", getFilenameFromPath(hplcPath)],
    ["Method Filename", buildMethodFilename(active)],
    ["Date Acquired", graphDateTime],
  ];
  metaRows.forEach(([label, value]) => {
    const key = document.createElement("strong");
    key.textContent = label;
    const colon = document.createElement("span");
    colon.textContent = ":";
    const val = document.createElement("span");
    val.textContent = value;
    meta.append(key, colon, val);
  });
  header.append(title, meta);

  const chromatogramHeading = document.createElement("div");
  chromatogramHeading.className = "graph-section-line";
  chromatogramHeading.textContent = "<Chromatogram>";

  const pathLine = document.createElement("div");
  pathLine.className = "graph-path";
  pathLine.textContent = hplcPath;

  const canvas = document.createElement("canvas");
  canvas.width = 980;
  canvas.height = 620;
  canvas.className = "lab-graph-canvas";

  drawChromatogram(canvas, {
    peaks,
    kind,
  });

  const detectorNote = document.createElement("div");
  detectorNote.className = "detector-note";
  detectorNote.textContent = `1 ${detectorText}`;

  const peakHeading = document.createElement("div");
  peakHeading.className = "peak-heading";
  peakHeading.textContent = "<Peak Table>";

  const peakDetector = document.createElement("div");
  peakDetector.className = "peak-detector";
  peakDetector.textContent = detectorText;

  const table = document.createElement("table");
  table.className = "peak-table";
  const tableHead = `
    <thead>
      <tr>
        <th>Peak#</th>
        <th>Name</th>
        <th>Ret. Time</th>
        <th>Area</th>
        <th>Height</th>
        <th>Area %</th>
        <th>Height %</th>
      </tr>
    </thead>
  `;
  const peakRows = peaks
    .map(
      (peak) => `
      <tr>
        <td>${peak.id}</td>
        <td>${peak.label || formatRtLabel(peak.rt)}</td>
        <td>${formatGraphValue(peak.rt)}</td>
        <td>${formatAreaValue(peak.area)}</td>
        <td>${formatHeightValue(peak.height)}</td>
        <td>${totalArea > 0 ? ((peak.area / totalArea) * 100).toFixed(4) : "0.0000"}</td>
        <td>${totalHeight > 0 ? ((peak.height / totalHeight) * 100).toFixed(4) : "0.0000"}</td>
      </tr>`
    )
    .join("");
  const totalRow = `
    <tr>
      <td colspan="3">Total</td>
      <td>${formatAreaValue(totalArea)}</td>
      <td>${formatHeightValue(totalHeight)}</td>
      <td>${totalArea > 0 ? "100.0000" : "0.0000"}</td>
      <td>${totalHeight > 0 ? "100.0000" : "0.0000"}</td>
    </tr>
  `;
  table.innerHTML = `${tableHead}<tbody>${peakRows}${totalRow}</tbody>`;

  const signatureRow = document.createElement("div");
  signatureRow.className = "signature-row";
  signatureRow.innerHTML = `
    <div class="signature-label">Analysed By</div>
    <div class="signature-label">Checked By</div>
  `;

  page.append(header, chromatogramHeading, pathLine, canvas, detectorNote, peakHeading, peakDetector, table, signatureRow);
  return page;
}

function buildPreviewDataSet() {
  const baseData = collectFormData();
  if (!bulkPreviewRows.length) return [baseData];
  return bulkPreviewRows.map((row) => applyBulkRowToData(baseData, row));
}

function generatePages() {
  const dataSet = buildPreviewDataSet();
  const baseData = dataSet[0] || collectFormData();
  currentRenderDataSet = dataSet;
  previewRoot.innerHTML = "";
  if (dataSet.length > 1) updateBatchPreviewSummary(dataSet);
  else updatePreviewSummary(baseData.actives.length);
  refreshActiveCardStates(baseData);
  updateValidationPanel(baseData);
  dataSet.forEach((data) => {
    previewRoot.appendChild(buildReportPage(data));
    data.actives.forEach((active, activeIndex) => {
      previewRoot.appendChild(buildGraphPage(data, active, "blank", activeIndex));
      previewRoot.appendChild(buildGraphPage(data, active, "reference", activeIndex));
      previewRoot.appendChild(buildGraphPage(data, active, "sample", activeIndex));
    });
  });
}

generateBtn.addEventListener("click", () => {
  bulkPreviewRows = [];
  generatePages();
});
printBtn.addEventListener("click", exportCleanPdf);
presetSelect.addEventListener("change", () => applyPreset(presetSelect.value));
saveDraftBtn.addEventListener("click", saveCurrentDraft);
loadDraftBtn.addEventListener("click", loadSelectedDraft);
duplicateDraftBtn.addEventListener("click", duplicateSelectedDraft);
reuseBatchBtn.addEventListener("click", reuseCurrentForBatch);
deleteDraftBtn.addEventListener("click", deleteSelectedDraft);
saveFormulaBtn.addEventListener("click", saveCurrentFormula);
loadFormulaBtn.addEventListener("click", loadSelectedFormula);
duplicateFormulaBtn.addEventListener("click", duplicateSelectedFormula);
deleteFormulaBtn.addEventListener("click", deleteSelectedFormula);
generateBulkBtn.addEventListener("click", generateBulkPreview);
downloadBulkTemplateBtn.addEventListener("click", downloadBulkTemplate);
clearBulkBtn.addEventListener("click", clearBulkPreview);
addActiveBtn.addEventListener("click", () => {
  activeList.appendChild(
    createActiveCard({
      name: "",
      result: "",
      labelClaim: "",
      limits: "",
      method: "",
      lambda: "",
      sampleFileNo: "",
      calcStandardFactor: "1",
      calcSampleFactor: "1",
      calcPurityPercent: "100",
      calcResponseFactor: "1",
      calcClaimPercent: "",
      useCalculatedResult: "no",
      blankRt: "",
      blankHeight: "",
      blankArea: "",
      blankExtraPeaks: "",
      referenceRt: "",
      referenceHeight: "",
      referenceArea: "",
      referenceExtraPeaks: "",
      sampleRt: "",
      sampleHeight: "",
      sampleArea: "",
      sampleExtraPeaks: "",
    })
  );
  updateActiveTitles();
  generatePages();
});

form.querySelectorAll("input, textarea, select").forEach((field) => {
  field.addEventListener("input", () => generatePages());
  field.addEventListener("change", () => generatePages());
});

activeList.appendChild(
  createActiveCard({
    name: "Ketoconazole",
    result: "1.998% w/w",
    labelClaim: "2.0% w/w",
    limits: "1.8% to 2.2% w/w",
    method: "SK-001",
    lambda: "225",
    sampleFileNo: "2",
    calcStandardFactor: "1",
    calcSampleFactor: "1",
    calcPurityPercent: "100",
    calcResponseFactor: "1",
    calcClaimPercent: "2",
    useCalculatedResult: "no",
    blankRt: "0",
    blankHeight: "0",
    blankArea: "0",
    blankExtraPeaks: "",
    referenceRt: "5.892",
    referenceHeight: "106517",
    referenceArea: "1823385.3",
    referenceExtraPeaks: "",
    sampleRt: "5.438",
    sampleHeight: "104200",
    sampleArea: "1769000.0",
    sampleExtraPeaks: "",
  })
);
updateActiveTitles();
renderDraftOptions();
renderFormulaOptions();
generatePages();
