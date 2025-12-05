export default function render(data) {
  const ref = data.reference || "";
  const text = data.text || "";

  return `
    <section class="scripture">
      <h3 class="scripture-ref">${ref}</h3>
      <p class="scripture-text">${text}</p>
    </section>
  `;
}
