// v0.5.1: calculations never navigate or submit a form to a server.
// Embedded viewers may allow scripts but forbid native form submission.
function runLocalForm(form) {
  if (!form || typeof form.onsubmit !== "function") return;
  const invalid = [...form.elements].find(
    (el) => el.willValidate && !el.validity.valid,
  );
  if (invalid) {
    const result =
      form.id === "topic-form"
        ? $("#topic-result")
        : form.id === "solver-form"
          ? $("#solver-result")
          : null;
    if (result) result.innerHTML = "";
    const box =
      form.id === "topic-form"
        ? $("#topic-error")
        : form.id === "solver-form"
          ? $("#solver-error")
          : null;
    const label =
      invalid.labels?.[0]?.textContent?.trim() || invalid.name || "Поле";
    if (box) {
      box.textContent =
        "Проверь поле «" +
        label +
        "»: " +
        (invalid.validity.valueMissing
          ? "введи значение."
          : invalid.validationMessage);
      box.hidden = false;
      box.scrollIntoView({ block: "center" });
    }
    invalid.focus({ preventScroll: true });
    return;
  }
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  if (form.id === "solver-form") {
    const error = $("#solver-error"),
      out = error && !error.hidden ? error : $("#solver-result");
    if (out && out.textContent.trim()) out.scrollIntoView({ block: "nearest" });
  }
}
document.addEventListener(
  "click",
  (event) => {
    const button = event.target.closest('button,input[type="submit"]');
    if (
      !button ||
      button.type !== "submit" ||
      !button.form ||
      button.disabled ||
      typeof button.form.onsubmit !== "function"
    )
      return;
    event.preventDefault();
    runLocalForm(button.form);
  },
  true,
);
document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key !== "Enter" ||
      event.isComposing ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;
    const field = event.target;
    if (
      field.tagName !== "INPUT" ||
      !field.form ||
      typeof field.form.onsubmit !== "function"
    )
      return;
    event.preventDefault();
    runLocalForm(field.form);
  },
  true,
);

const gradeRenderCards = renderCards;
renderCards = function (limit) {
  gradeRenderCards(limit);
  const select = $("#grade");
  if (!select) return;
  $("#grade-feedback")?.remove();
  if (!filters.grade) return;
  const ids = $$("#cards [data-open]").map((el) => el.dataset.open),
    rows = DB.cards.filter((c) => ids.includes(c.id));
  const common = rows.filter((c) => c.grades.length > 1).length;
  const text =
    filters.grade === "profile"
      ? "Показаны профильные материалы без привязки к школьному классу."
      : "Выбран " +
        filters.grade +
        " класс. " +
        (common
          ? "Включены общие темы для нескольких классов: " +
            common +
            ". При смене класса такие темы остаются в списке."
          : "Показаны материалы с отметкой этого класса.");
  $(".results-heading").insertAdjacentHTML(
    "afterend",
    '<p id="grade-feedback" class="grade-feedback" role="status">' +
      esc(text) +
      "</p>",
  );
};
