async function loadManifest() {
  const res = await fetch("modules/title-explosive/manifest.json");
  const manifest = await res.json();
  
  // 渲染选择框
  const selector = document.getElementById("elementSelector");
  selector.innerHTML = `<label><input type="checkbox" id="titleExplosiveCheck"> ${manifest.name}</label>`;
  
  // 渲染表单
  const form = document.getElementById("elementForm");
  form.innerHTML = manifest.inputs.map(input =>
    `<label>${input.label}: <input id="${input.key}" type="text"></label>`
  ).join("<br>");
  
  // 绑定预览
  document.getElementById("titleExplosiveCheck").addEventListener("change", () => preview(manifest));
  document.getElementById("exportBtn").addEventListener("click", () => exportPage(manifest));
}

function preview(manifest) {
  const data = {};
  manifest.inputs.forEach(input => {
    data[input.key] = document.getElementById(input.key).value;
  });
  
  fetch(`modules/${manifest.name}/${manifest.template}`)
    .then(res => res.text())
    .then(html => {
      const rendered = html.replace("{{text}}", data.text || "")
                           .replace("{{subtitle}}", data.subtitle || "");
      const previewFrame = document.getElementById("preview").contentDocument;
      previewFrame.open();
      previewFrame.write(`
        <html>
        <head>
          <link rel="stylesheet" href="modules/${manifest.name}/${manifest.style}">
        </head>
        <body>${rendered}</body>
        </html>
      `);
      previewFrame.close();
    });
}

function exportPage(manifest) {
  const data = {};
  manifest.inputs.forEach(input => {
    data[input.key] = document.getElementById(input.key).value;
  });

  fetch(`modules/${manifest.name}/${manifest.template}`)
    .then(res => res.text())
    .then(html => {
      const rendered = html.replace("{{text}}", data.text || "")
                           .replace("{{subtitle}}", data.subtitle || "");
      
      const fullPage = `
        <!DOCTYPE html>
        <html lang="zh">
        <head>
          <meta charset="UTF-8">
          <title>生成的聚会页面</title>
          <link rel="stylesheet" href="modules/${manifest.name}/${manifest.style}">
        </head>
        <body>
          ${rendered}
        </body>
        </html>
      `;
      
      const blob = new Blob([fullPage], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = "generated-page.html";
      a.click();
      URL.revokeObjectURL(url);
    });
}

loadManifest();
