export function renderTitleExplosive(data) {
  const template = document.getElementById("title-explosive").innerHTML;
  return template
    .replace("{{text}}", data.text || "")
    .replace("{{subtitle}}", data.subtitle || "");
}
