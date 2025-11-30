// 加载页面与预设
async function loadPagesAndPresets() {
  const [pagesRes, presetsRes] = await Promise.all([
    fetch("data/pages.json"),
    fetch("data/presets.json")
  ]);

  const pages = await pagesRes.json();
  const presets = await presetsRes.json();

  const selector = document.getElementById("pageSelector");
  selector.innerHTML = pages.map(p =>
    `<label><input type="checkbox" value="${p.id}"> ${p.name}</label>`
  ).join("<br>");

  // 单独绑定预览与导出
  document.getElementById("previewBtn").addEventListener("click", async () => {
    const selectedIds = getSelectedPageIds(selector);
    const fullPage = await buildFullPage(selectedIds, presets);
    previewPage(fullPage);
  });

  document.getElementById("exportBtn").addEventListener("click", async () => {
    const selectedIds = getSelectedPageIds(selector);
    const fullPage = await buildFullPage(selectedIds, presets);
    downloadPage(fullPage, "generated-page.html");
  });
}

// 获取选中的页面 ID
function getSelectedPageIds(selector) {
  return Array.from(selector.querySelectorAll("input:checked")).map(i => i.value);
}

// 构建完整页面（仅负责组合 HTML 与样式）
async function buildFullPage(pageIds, presets) {
  const allHtml = [];
  const allStyles = new Set();

  for (const pageId of pageIds) {
    const elementIds = presets[pageId] || [];
    for (const elementId of elementIds) {
      const manifest = await (await fetch(`modules/${elementId}/manifest.json`)).json();
      const templateHtml = await (await fetch(`modules/${elementId}/${manifest.template}`)).text();

      // 收集数据（可以改造成表单而不是 prompt）
      const data = collectDataForElement(elementId, manifest);

      // 替换占位符
      let rendered = templateHtml;
      manifest.inputs.forEach(input => {
        rendered = rendered.replaceAll(`{{${input.key}}}`, data[input.key] || "");
      });

      allHtml.push(rendered);
      allStyles.add(`<link rel="stylesheet" href="modules/${elementId}/${manifest.style}">`);
    }
  }

  return `
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
  `;
}

// 数据收集（当前用 prompt；可替换为动态表单）
function collectDataForElement(elementId, manifest) {
  const data = {};
  manifest.inputs.forEach(input => {
    const val = prompt(`请输入 ${elementId} 的 ${input.label}`) || "";
    data[input.key] = val;
  });
  return data;
}

// 仅负责预览
function previewPage(fullPageHtml) {
  const doc = document.getElementById("preview").contentDocument;
  doc.open();
  doc.write(fullPageHtml);
  doc.close();
}

// 仅负责下载
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

// 初始化
loadPagesAndPresets();
