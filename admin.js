// 自动加载所有模块并生成选择器
async function loadModules() {
  const modules = [
    "title-welcome",
    "title-king-arrival",
    "scripture",
    "music-player",
    "qr-code",
    "title-border",
    "title-review",
    "title-report",
    "title-academy",
    "title-deep",
    "custom-slide",
    "group-stats",
    "grouping-panel",
    "birthday",
    "communion",
    "farewell",
    "intercession-items",
    "host-script",
    "background-image",
    "teaching-slide"
    // …继续列出所有模块
  ];

  const form = document.getElementById("pageForm");
  form.innerHTML = "";

  for (const modId of modules) {
    const manifest = await fetch(`./modules/${modId}/manifest.json`).then(r => r.json());
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${modId}"> ${manifest.name || modId}`;
    form.appendChild(label);
    form.appendChild(document.createElement("br"));
  }
}

// 构建模块 HTML
async function buildModule(moduleId, data) {
  const manifest = await fetch(`./modules/${moduleId}/manifest.json`).then(r => r.json());
  const moduleScript = await import(`./modules/${moduleId}/${manifest.script}`);
  return moduleScript.default(data);
}

// 构建完整页面
async function buildFullPage(selectedModules) {
  const allHtml = [];
  for (const moduleId of selectedModules) {
    const manifest = await fetch(`./modules/${moduleId}/manifest.json`).then(r => r.json());
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

// 初始化
loadModules();
