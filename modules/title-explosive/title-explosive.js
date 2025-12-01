export function renderExplosive(data) {
  const template = document.getElementById("title-explosive").innerHTML;
  return template.replace("{{text}}", data.text || "");
}
