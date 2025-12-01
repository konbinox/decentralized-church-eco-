export function renderScripture(data) {
  const template = document.getElementById("scripture").innerHTML;
  return template
    .replace("{{text}}", data.text || "")
    .replace("{{reference}}", data.reference || "");
}
