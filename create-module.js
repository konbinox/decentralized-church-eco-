const fs = require('fs');
const path = require('path');

// 字段映射表（你已有）
const fieldMap = {
  scripture: "textarea",
  title: "text",
  default: "text"
};

// 模块生成函数（你已有）
function createModule(name, fieldType) {
  const moduleDir = path.join(__dirname, 'modules', name);
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir, { recursive: true });
  }

  // 写 manifest.json
  const manifest = {
    fields: [{ name, type: fieldType }],
    template: `${name}.html`
  };
  fs.writeFileSync(
    path.join(moduleDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  // 写模板文件
  fs.writeFileSync(
    path.join(moduleDir, `${name}.html`),
    `<div class="${name}">内容占位符</div>`,
    'utf-8'
  );
}

function main() {
  // ① 读取 presets.json
  const presetsPath = path.join(__dirname, 'data', 'presets.json');
  const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf-8'));

  // ② 提取模块名，定义 allModules
  const allModules = new Set(Object.keys(presets));

  console.log("🟢 从 presets.json 解析到的模块:", Array.from(allModules));

  // ③ 生成模块
  Array.from(allModules).forEach(m => {
    const key = Object.keys(fieldMap).find(k => m.includes(k)) || "default";
    const fieldType = fieldMap[key];
    createModule(m, fieldType);
  });

  // ④ 生成 modules/index.json
  const modulesDir = path.join(__dirname, 'modules');
  const moduleDirs = fs.readdirSync(modulesDir).filter(dir => {
    const fullPath = path.join(modulesDir, dir);
    return fs.statSync(fullPath).isDirectory();
  });

  fs.writeFileSync(
    path.join(modulesDir, 'index.json'),
    JSON.stringify(moduleDirs, null, 2),
    'utf-8'
  );

  console.log('✅ 已生成 modules/index.json');
}

main();
