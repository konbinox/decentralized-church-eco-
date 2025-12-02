export default function render(data) {
  const el = document.getElementById("title-explosive");
  const template = el ? el.innerHTML : "<h1 class='explosive'></h1>";
  return template.replace("{{text}}", data?.text ?? "");
}
