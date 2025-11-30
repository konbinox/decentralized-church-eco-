console.log("✅ admin.js 已加载");

// 初始化页面选择器和按钮绑定
async function init() {
  try {
    const [pagesRes, presetsRes] = await Promise.all([
      fetch("data/pages.json"),
      fetch("data/presets.json")
    ]);

    const pages = await pagesRes.json();
    const presets = await presetsRes.json();

    console.log("✅ pages.json 加载成功:", pages);
    console.log("✅ presets.json 加载成功:", presets);

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
      console.log("🟡 点击了预览按钮");
      const selectedIds = getSelectedPageIds(selector);
      if (selectedIds.length === 0) return alert("⚠️ 请至少选择一个页面");
      const html = await buildPage(selectedIds, presets);
      if (html) previewPage(html);
    });

    document.getElementById("exportBtn")?.addEventListener("click", async () => {
      console.log("🟡 点击了导出按钮");
      const selectedIds = getSelectedPageIds(selector);
      if (selectedIds.length === 0) return alert("⚠️ 请至少选择一个页面");
      const html = await buildPage(selectedIds, presets);
      if (html) downloadPage(html, "generated-page.html");
    });
  } catch (err) {
    console.error("❌ 初始化失败:", err);
    alert("页面加载失败，请检查 JSON 文件路径或格式");
  }
}

function getSelectedPageIds(container) {
  return Array.from(container.querySelectorAll("input:checked")).map(i => i.value);
}

function clearPreviewIfNone(pageIds) {
  if (pageIds.length === 0) {
    document.getElementById("preview").srcdoc = "";
  }
}

async function renderForm(pageIds, presets) {
  const formArea = document.getElementById("formArea");
  formArea.innerHTML = "";

  for (const pageId of pageIds) {
    const elementIds = presets[pageId] || [];
    for (const elementId of elementIds) {
      try {
        const manifest = await (await fetch(`modules/${elementId}/manifest.json`)).json();

        const group = document.createElement("fieldset");
        group.innerHTML = `<legend>${elementId}</legend>` +
          manifest.inputs.map(input =>
            `<label>${input.label}: <input name="${elementId}__${input.key}" type="text"></label>`
          ).join("");
        formArea.appendChild(group);
      } catch (err) {
        console.warn(`⚠️ 模块 ${elementId} 加载失败`, err);
        const errorBox = document.createElement("div");
        errorBox.textContent = `⚠️ 模块 ${elementId} 加载失败`;
        errorBox.style.color = "red";
        formArea.appendChild(errorBox);
      }
    }
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

async function buildPage(pageIds, presets) {
  console.log("🟢 开始构建页面，页面ID:", pageIds);
  const allHtml = [];
  const allStyles = new Set();

  for (const pageId of pageIds) {
    const elementIds = presets[pageId] || [];
    for (const elementId of elementIds) {
      try {
        const manifest = await (await fetch(`modules/${elementId}/manifest.json`)).json();
        let template = await (await fetch(`modules/${elementId}/${manifest.template}`)).text();

        const data = collectData(elementId, manifest);
        manifest.inputs.forEach(input => {
          const re = new RegExp(`\\{\\{\\s*${input.key}\\s*\\}\\}`, "g");
          template = template.replace(re, data[input.key] || "");
        });

        allStyles.add(`<link rel="stylesheet" href="modules/${elementId}/${manifest.style}">`);
        const m = template.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
        const clean = m ? m[1] : template;

        allHtml.push(`<div class="module">${clean}</div>`);
      } catch (err) {
        console.warn(`⚠️ 跳过模块 ${elementId}：加载失败`, err);
      }
    }
  }

  if (allHtml.length === 0) {
    alert("⚠️ 所选页面未生成任何内容，请检查 presets 或模块是否存在");
    return "";
  }

  const fullPage = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
      <meta charset="UTF-8">
      <title>生成的聚会页面</title>
      ${Array.from(allStyles).join("\n")}
      <style>.module { margin-bottom: 2rem; border-bottom: 1px dashed #ccc; padding-bottom: 1rem; }</style>
    </head>
    <body>
      ${allHtml.join("\n")}
    </body>
    </html>
  `.trim();

  console.log("✅ 页面构建完成，模块数:", allHtml.length);
  return fullPage;
}

function previewPage(html) {
  const doc = document.getElementById("preview").contentDocument;
  doc.open(); doc.write(html || "<p style='color:red;'>⚠️ 无内容可预览</p>"); doc.close();
}

function downloadPage(html, filename) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

init();
