console.log("✅ 正在运行 modules/js/admin.js");

async function init() {
  const [pagesRes, presetsRes] = await Promise.all([
    fetch("data/pages.json"),
    fetch("data/presets.json")
  ]);
  const pages = await pagesRes.json();
  const presets = await presetsRes.json();

  const selector = document.getElementById("pageSelector");
  selector.innerHTML = pages.map(p =>
    `<label><input type="checkbox" value="${p.id}"> ${p.name}</label>`
  ).join("");

  selector.addEventListener("change", () => {
    const selectedIds = getSelectedPageIds(selector);
    renderForm(selectedIds, presets);
    clearPreviewIfNone(selectedIds);
  });

  document.getElementById("previewBtn")?.addEventListener("click", async () => {
    const html = await buildPage(presets);
    if (html) previewPage(html);
  });

  document.getElementById("exportBtn")?.addEventListener("click", async () => {
    const html = await buildPage(presets);
    if (html) downloadPage(html, "generated-page.html");
  });
}

function getSelectedPageIds(container) {
  return Array.from(container.querySelectorAll("input:checked")).map(i => i.value);
}

async function renderForm(pageIds, presets) {
  const formArea = document.getElementById("formArea");
  formArea.innerHTML = "";

  for (const pageId of pageIds) {
    const elementIds = presets[pageId] || [];
    for (const elementId of elementIds) {
      const manifest = await (await fetch(`modules/${elementId}/manifest.json`)).json();

      const group = document.createElement("fieldset");
      group.innerHTML = `<legend>${elementId}</legend>` +
        manifest.inputs.map(input =>
          `<label>${input.label}: <input name="${elementId}__${input.key}" type="text"></label>`
        ).join("");
      formArea.appendChild(group);
    }
  }
}

function clearPreviewIfNone(pageIds) {
  if (pageIds.length === 0) {
    document.getElementById("preview").srcdoc = "";
  }
}

function collectData(elementId, manifest) {
  const data = {};
  manifest.inputs.forEach(input => {
    const el = document.querySelector(`input[name="${elementId}__${input.key}"]`);
    data[input.key] = el ? el.value : "";
  });
  return data;
}

async function buildPage(presets) {
  const selector = document.getElementById("pageSelector");
  const selectedIds = getSelectedPageIds(selector);
  if (selectedIds.length === 0) {
    alert("请至少选择一个页面");
    return "";
  }

  const styles = new Set();
  const parts = [];

  for (const pageId of selectedIds) {
    const elementIds = presets[pageId] || [];
    for (const elementId of elementIds) {
      const manifest = await (await fetch(`modules/${elementId}/manifest.json`)).json();
      let template = await (await fetch(`modules/${elementId}/${manifest.template}`)).text();

      const data = collectData(elementId, manifest);
      manifest.inputs.forEach(input => {
        const re = new RegExp(`\\{\\{\\s*${input.key}\\s*\\}\\}`, "g");
        template = template.replace(re, data[input.key] || "");
      });

      styles.add(`<link rel="stylesheet" href="modules/${elementId}/${manifest.style}">`);
      template = stripTemplate(template);
      parts.push(`<div class="module">${template}</div>`);
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
      <meta charset="UTF-8">
      <title>生成页面</title>
      ${Array.from(styles).join("\n")}
      <style>.module { margin-bottom: 2rem; border-bottom: 1px dashed #ccc; padding-bottom: 1rem; }</style>
    </head>
    <body>
      ${parts.join("\n")}
    </body>
    </html>
  `.trim();
}

function stripTemplate(html) {
  const m = html.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  return m ? m[1] : html;
}

function previewPage(html) {
  const doc = document.getElementById("preview").contentDocument;
  doc.open(); doc.write(html); doc.close();
}

function downloadPage(html, filename) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

init();
