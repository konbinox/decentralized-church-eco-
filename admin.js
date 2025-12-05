import presets from "./data/presets.json" assert { type: "json" };

async function loadManifest(moduleId) {
  const manifest = await fetch(`./modules/${moduleId}/manifest.json`).then(r => r.json());
  return manifest;
}

async function buildModule(moduleId, data) {
  const manifest = await loadManifest(moduleId);
  const moduleScript = await import(`./modules/${moduleId}/${manifest.script}`);
  return moduleScript.default(data);
}

async function buildFullPage(selectedModules) {
  const allHtml = [];
  for (const moduleId of selectedModules) {
    const manifest = await loadManifest(moduleId);
    const data = {};
    for (const input of manifest.inputs) {
      const field = document.querySelector(`[name="${moduleId}-${input.key}"]`);
      if (field) data[input.key] = field.value;
    }
    const html = await buildModule(moduleId, data);
    allHtml.push(html);
  }

  return `
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>生成的聚会页面</title>
  ${selectedModules.map(m => `<link rel="stylesheet" href="./modules/${m}/${m}.css">`).join("\n")}
</head>
<body>
  ${allHtml.join("\n")}
</body>
</html>
  `;
}

// 预览按钮：新窗口打开
document.getElementById("previewPage").addEventListener("click", async () => {
  const selectedModules = Array.from(document.querySelectorAll("#pageForm input:checked"))
    .map(el => el.value);

  const html = await buildFullPage(selectedModules);
  const newWin = window.open("", "_blank");
  newWin.document.write(html);
  newWin.document.close();
});

// 导出按钮：下载 HTML 文件
document.getElementById("exportPage").addEventListener("click", async () => {
  const selectedModules = Array.from(document.querySelectorAll("#pageForm input:checked"))
    .map(el => el.value);

  const html = await buildFullPage(selectedModules);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "page.html";
  a.click();
  URL.revokeObjectURL(url);
});
