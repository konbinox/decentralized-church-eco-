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

  // Bind actions
  document.getElementById("previewBtn").addEventListener("click", async () => {
    clearLog();
    const selectedIds = getSelectedPageIds(selector);
    if (selectedIds.length === 0) return logError("请至少选择一个页面");
    const fullPage = await buildFullPage(selectedIds, presets);
    if (fullPage) previewPage(fullPage);
  });

  document.getElementById("exportBtn").addEventListener("click", async () => {
    clearLog();
    const selectedIds = getSelectedPageIds(selector);
    if (selectedIds.length === 0) return logError("请至少选择一个页面");
    const fullPage = await buildFullPage(selectedIds, presets);
    if (fullPage) downloadPage(fullPage, "generated-page.html");
  });
}

// --- Build full page from selected pages + presets ---
async function buildFullPage(pageIds, presets) {
  const allHtml = [];
  const allStyles = new Set();

  try {
    for (const pageId of pageIds) {
      const elementIds = presets[pageId] || [];
      if (!Array.isArray(elementIds) || elementIds.length === 0) {
        logError(`页面 ${pageId} 未在 presets 中配置元素或为空`);
        continue;
      }

      for (const elementId of elementIds) {
        // Load manifest
        const manifestUrl = `modules/${elementId}/manifest.json`;
        const manifestRes = await fetch(manifestUrl);
        if (!manifestRes.ok) throw new Error(`无法加载 ${manifestUrl}`);
        const manifest = await manifestRes.json();

        // Validate manifest
        assert(manifest && typeof manifest === "object", `manifest(${elementId}) 格式错误`);
        assert(typeof manifest.style === "string", `manifest(${elementId}) 缺少 style`);
        assert(Array.isArray(manifest.inputs), `manifest(${elementId}) inputs 必须是数组`);

        // Collect data via dynamic form
        const data = {};
        for (const input of manifest.inputs) {
          const el = document.querySelector(`[name="${elementId}-${input.key}"]`);
          data[input.key] = el ? el.value : "";
        }

        // Load module script dynamically
        const moduleScript = await import(`./modules/${elementId}/${manifest.script}`);
        const rendered = moduleScript.default(data);

        // Track styles
        allStyles.add(`<link rel="stylesheet" href="modules/${elementId}/${manifest.style}">`);

        allHtml.push(rendered);
      }
    }
  } catch (e) {
    logError("构建页面失败：请检查元素包路径、manifest、模板占位符", e.message);
    return null;
  }

  // Assemble final HTML
  const fullPage = `
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

  if (allHtml.length === 0) {
    logError("未产生任何元素内容：请确认所选页面的 presets 与模块存在");
    return null;
  }

  return fullPage;
}

// --- Preview ---
function previewPage(fullPageHtml) {
  const iframe = document.getElementById("preview");
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(fullPageHtml);
  doc.close();
}

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
