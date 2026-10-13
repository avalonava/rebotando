// Shared by the site and the edit page: text formatting and post styles
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// **bold**, *italic*, [text](https://link) and bare URLs
function fmt(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<]+/g,
      (m, t, u) => t ? `<a href="${u}">${t}</a>` : `<a href="${m}">${m}</a>`);
}

function styled(style, text) {
  if (!style || style === "auto") style = /^["“«]/.test(text) ? "cita" : "normal";
  const t = fmt(text);
  return ({
    cita: `<blockquote>${t}</blockquote>`,
    grande: `<div class="big">${t}</div>`,
    centrado: `<div class="center">${t}</div>`,
    pequeno: `<div class="sm">${t}</div>`,
    mono: `<div class="mono">${t}</div>`,
  })[style] || `<div>${t}</div>`;
}
