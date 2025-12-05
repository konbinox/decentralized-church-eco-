// --- Utilities ---
function logError(msg, detail) {
  const el = document.getElementById("log");
  el.textContent = `[错误] ${msg}${detail ? `\n详情: ${detail}` : ""}`;
  console.error(msg, detail || "");
}
function clearLog() {
  const el = document.getElementById("log");
  el.textContent = "";
}
function getSelectedPageIds(selector) {
  return Array.from(selector.querySelectorAll("input:checked")).map(i => i.value);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- Load pages and presets, bind actions ---
async function loadPagesAndPresets() {
  clearLog();
  let pages, presets;

  try {
    const [pagesRes, presetsRes] = await Promise.all([
      fetch("data/pages.json"),
      fetch("data/presets.json")
    ]);

    assert(pagesRes.ok, "无法加载 data/pages.json");
    assert(presetsRes.ok, "无法加载 data/presets.json");

    pages = await pagesRes.json();
    presets = await presetsRes.json();

    assert(Array.isArray(pages), "pages.json 格式应为数组");
    assert(typeof presets === "object" && presets, "presets.json 格式应为对象映射");
  } catch (e) {
    return logError("初始化失败：请检查 pages/presets 路径和 JSON 格式", e.message);
  }

  // Render page selector
  const selector = document.getElementById("pageSelector");
  selector.innerHTML = pages.map(p =>
    `<label><input type="checkbox" value="${p.id}"> ${p.name}</label>`
  ).join("");

  // 每次选择变化时渲染动态表单
  selector.addEventListener("change", () => {
    const selectedIds = getSelectedPageIds(selector);
    renderForm(selectedIds, presets);
  });

  // Bind actions
  /*
  document.getElementById("previewBtn").addEventListener("click", async () => {
    clearLog();
    const selectedIds = getSelectedPageIds(selector);
    const fullPage = await buildFullPage(selectedIds, presets);
    if (fullPage) previewPage(fullPage);
  });
  */
  document.getElementById("exportBtn").addEventListener("click", async () => {
    clearLog();
    const selectedIds = getSelectedPageIds(selector);
    const fullPage = await buildFullPage(selectedIds, presets);
    if (fullPage) downloadPage(fullPage, "generated-page.html");
  });
}

// --- Build full page from selected pages + presets ---
async function buildFullPage(pageIds, presets) {
  if (!pageIds || pageIds.length === 0) {
    logError("未选择任何页面，无法生成预览");
    return null;
  }

  const allHtml = [];
  const allStyles = new Set();

  for (const pageId of pageIds) {
    const elementIds = presets[pageId];
    if (!Array.isArray(elementIds) || elementIds.length === 0) {
      logError(`页面 ${pageId} 未配置元素`);
      continue;
    }

    for (const elementId of elementIds) {
      try {
        // Step 1: Load manifest
        const manifestUrl = `./modules/${elementId}/manifest.json`;
        const manifestRes = await fetch(manifestUrl);
        if (!manifestRes.ok) throw new Error(`加载失败: ${manifestUrl}`);
        const manifest = await manifestRes.json();

        if (!manifest || typeof manifest !== "object") throw new Error(`manifest(${elementId}) 格式错误`);
        if (!manifest.script || !manifest.style || !Array.isArray(manifest.inputs)) {
          throw new Error(`manifest(${elementId}) 缺少必要字段`);
        }

        // Step 2: Collect form data
        const data = {};
        for (const input of manifest.inputs) {
          const el = document.querySelector(`[name="${elementId}-${input.key}"]`);
          data[input.key] = el ? el.value : "";
        }

        // Step 3: Load module and render
        const modulePath = `./modules/${elementId}/${manifest.script}`;
        const moduleScript = await import(modulePath);
        if (typeof moduleScript.default !== "function") {
          throw new Error(`模块 ${elementId} 未导出默认函数`);
        }

        const rendered = moduleScript.default(data);
        if (!rendered || typeof rendered !== "string") {
          throw new Error(`模块 ${elementId} 渲染失败`);
        }

        allStyles.add(`<link rel="stylesheet" href="./modules/${elementId}/${manifest.style}">`);
        allHtml.push(rendered);

      } catch (e) {
        logError(`元素 ${elementId} 构建失败`, e.message);
      }
    }
  }

  if (allHtml.length === 0) {
    logError("未产生任何元素内容：请确认 presets 与模块是否存在");
    return null;
  }

  // Assemble final HTML
  const fullPageHtml = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
      <meta charset="UTF-8">
      <title>生成的聚会页面</title>
      ${Array.from(allStyles).join("\n")}
    </head>
    <body>
      ${allHtml.join("\n")}
    </body>
    </html>
  `.trim();

  console.log("✅ 构建完成:", fullPageHtml);
  return fullPageHtml;
}
/*
// --- Preview ---
function previewPage(fullPageHtml) {
  const iframe = document.getElementById("preview");
  const doc = iframe.contentDocument || iframe.contentWindow.document;

  if (!fullPageHtml || typeof fullPageHtml !== "string") {
    doc.open();
    doc.write("<p style='color:#c0392b;margin:12px 8px'>请先选择页面再预览</p>");
    doc.close();
    return;
  }

  doc.open();
  doc.write(fullPageHtml);
  doc.close();
}
*/
// --- Download ---
function downloadPage(fullPageHtml, filename) {
  const blob = new Blob([fullPageHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Render dynamic form ---
async function renderForm(pageIds, presets) {
  const formContainer = document.getElementById("pageFields");
  formContainer.innerHTML = "";

  for (const pageId of pageIds) {
    const elementIds = presets[pageId] || [];
    for (const elementId of elementIds) {
      const manifestUrl = `modules/${elementId}/manifest.json`;
      const manifestRes = await fetch(manifestUrl);
      if (!manifestRes.ok) continue;
      const manifest = await manifestRes.json();

      const group = document.createElement("fieldset");
      group.innerHTML = `<legend>${manifest.name}</legend>`;
      for (const input of manifest.inputs) {
        const label = document.createElement("label");
        label.textContent = input.label || input.key;
        const field = document.createElement("input");
        field.name = `${elementId}-${input.key}`;
        field.type = input.type || "text";
        label.appendChild(field);
        group.appendChild(label);
      }
      formContainer.appendChild(group);
    }
  }
}

// --- Init ---
loadPagesAndPresets();
