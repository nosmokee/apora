// v0.4.1: standalone keypad calculator and expression-based angles.
function evaluateAngle(source, kValue = "") {
  let s = String(source).replaceAll("°", "").trim(),
    sub = [];
  if (/[kк]/i.test(s)) {
    const raw = String(kValue ?? "").trim();
    if (!raw)
      throw Error(
        "В выражении есть k. Введи его целое значение в поле «Значение k», например 0 или 1.",
      );
    if (!/^[+-]?\d{1,5}$/.test(raw) || Math.abs(Number(raw)) > 10000)
      throw Error("k должно быть целым числом от −10000 до 10000.");
    s = s
      .replace(/(\d|\))\s*([kк])/gi, "$1*$2")
      .replace(/[kк]/gi, "(" + raw + ")");
    sub.push(`Подставляем k = ${raw}: ${s}.`);
  }
  const r = calculateExpression(s);
  if (Math.abs(r.value.n) > 360000)
    throw Error("Полученный угол должен быть в пределах ±360000°.");
  return {
    value: r.value,
    steps: [...sub, ...r.steps, `Угол α = ${evText(r.value)}°.`],
  };
}
tools.trigonometry.description =
  "Угол в градусах: число или выражение, например 30+90*k. Если есть k, укажи его значение. Это вычисление при конкретном k, не решение тригонометрического уравнения.";
tools.trigonometry.fields = [
  ["angle", "Угол или выражение в градусах", "30"],
  ["k", "Значение k (если есть в выражении)", ""],
];
function decimalText(v) {
  if (!v.q) return "≈ " + approx(v.n);
  const q = v.q,
    sign = q.n < 0n ? "-" : "",
    n = abs(q.n);
  if (q.d === 1n) return String(q.n);
  let rem = n % q.d,
    str = sign + (n / q.d).toString(),
    digits = "";
  for (let i = 0; i < 12 && rem; i++) {
    rem *= 10n;
    digits += (rem / q.d).toString();
    rem %= q.d;
  }
  return (rem ? "≈ " : "") + str + (digits ? "," + digits : "");
}
let calculatorText = "",
  calculatorLast = null,
  calculatorFinished = false,
  calculatorHistory = [];
function renderCalculator() {
  const keys = [
    ["C", "Очистить"],
    ["⌫", "Удалить символ"],
    ["(", null],
    [")", null],
    ["7", null],
    ["8", null],
    ["9", null],
    ["÷", null],
    ["4", null],
    ["5", null],
    ["6", null],
    ["×", null],
    ["1", null],
    ["2", null],
    ["3", null],
    ["−", null],
    ["±", "Сменить знак"],
    ["0", null],
    [",", null],
    ["+", null],
    ["√", "Квадратный корень"],
    ["x²", "Возвести в квадрат"],
    ["%", "Процент: разделить на 100"],
    ["=", "Вычислить"],
  ];
  $("#view").innerHTML =
    `<div class="calc-switch"><button type="button" class="primary" data-view="calculator">Калькулятор</button><button type="button" data-view="solver">Решение по шагам ↗</button></div><section class="calculator panel" aria-label="Обычный калькулятор"><label for="calc-input">Выражение</label><input id="calc-input" type="text" autocomplete="off" spellcheck="false" inputmode="text" maxlength="160" placeholder="Например, 25 × 4 + 10" value="${esc(calculatorText)}"><output id="calc-display" class="calc-display" aria-live="polite">0</output><p id="calc-exact" class="fine"></p><div id="calc-error" class="error" role="alert" hidden></div><div class="calc-keypad">${keys.map(([k, l]) => `<button type="button" data-calc-key="${k}" class="${k === "=" ? "primary calc-equals" : ""}" ${l ? `aria-label="${l}"` : ""}>${k === "⌫" ? "←" : k}</button>`).join("")}</div><details class="calc-steps"><summary>Шаги вычисления</summary><ol id="calc-steps"></ol></details><p class="fine">Enter — вычислить. % означает деление на 100. Корень: √(число). Умножение со скобками записывай явно.</p></section><section class="calculator-history" ${calculatorHistory.length ? "" : "hidden"}><h2>Последние вычисления</h2><ol>${calculatorHistory
      .slice(-5)
      .reverse()
      .map(
        (h) =>
          `<li><span>${esc(h.expression)}</span><strong>${esc(h.result)}</strong></li>`,
      )
      .join("")}</ol></section>`;
  const input = $("#calc-input");
  input.oninput = () => {
    calculatorText = input.value;
    calculatorFinished = false;
    $("#calc-error").hidden = true;
  };
  input.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      computeCalculator();
    }
    if (e.key === "Escape") {
      calculatorText = "";
      renderCalculator();
      $("#calc-input").focus();
    }
  };
  $$("[data-calc-key]").forEach(
    (b) => (b.onclick = () => calculatorKey(b.dataset.calcKey)),
  );
}
function computeCalculator() {
  calculatorText = $("#calc-input").value;
  $("#calc-error").hidden = true;
  try {
    const r = calculateExpression(calculatorText);
    calculatorLast = r.value;
    calculatorFinished = true;
    $("#calc-display").textContent = decimalText(r.value);
    $("#calc-exact").textContent =
      r.value.q && r.value.q.d !== 1n ? "Дробью: " + qstr(r.value.q) : "";
    $("#calc-steps").innerHTML = r.steps
      .map((s) => "<li>" + esc(s) + "</li>")
      .join("");
    calculatorHistory.push({
      expression: calculatorText,
      result: decimalText(r.value),
    });
    calculatorHistory = calculatorHistory.slice(-5);
    const history = $(".calculator-history");
    history.hidden = false;
    history.querySelector("ol").innerHTML = calculatorHistory
      .slice()
      .reverse()
      .map(
        (h) =>
          `<li><span>${esc(h.expression)}</span><strong>${esc(h.result)}</strong></li>`,
      )
      .join("");
  } catch (e) {
    calculatorFinished = false;
    calculatorLast = null;
    $("#calc-display").textContent = "—";
    $("#calc-exact").textContent = "";
    $("#calc-steps").innerHTML = "";
    $("#calc-error").textContent = e.message;
    $("#calc-error").hidden = false;
  }
}
function calculatorKey(key) {
  const input = $("#calc-input");
  calculatorText = input.value;
  $("#calc-error").hidden = true;
  if (key === "=") {
    computeCalculator();
    return;
  }
  if (key === "C") {
    calculatorText = "";
    calculatorLast = null;
    calculatorFinished = false;
    $("#calc-display").textContent = "0";
    $("#calc-exact").textContent = "";
    $("#calc-steps").innerHTML = "";
  } else if (key === "⌫") {
    calculatorText = calculatorText.slice(0, -1);
    calculatorFinished = false;
  } else {
    if (calculatorFinished) {
      if (
        ["+", "−", "×", "÷", "x²", "%", "±"].includes(key) &&
        calculatorLast
      ) {
        const val = calculatorLast.q
          ? qstr(calculatorLast.q)
          : calculatorLast.n.toFixed(12).replace(/\.?0+$/, "");
        calculatorText = "(" + val + ")";
      } else calculatorText = "";
      calculatorFinished = false;
    }
    if (key === "±")
      calculatorText = calculatorText ? "−(" + calculatorText + ")" : "−";
    else if (key === "x²") calculatorText = "(" + calculatorText + ")^2";
    else if (key === "%") calculatorText = "(" + calculatorText + ")/100";
    else if (key === "√") calculatorText += "√(";
    else calculatorText += key;
  }
  input.value = calculatorText.slice(0, 160);
  calculatorText = input.value;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
const priorSetView = setView;
setView = function (v) {
  document.body.dataset.screen = v;
  if (v !== "calculator") return priorSetView(v);
  activeView = "calculator";
  filters = { query: "", subject: "", grade: "", kind: "" };
  $("#page-title").textContent = "Калькулятор";
  $("#page-intro").textContent = "Обычные вычисления, степени и корни.";
  $$("[data-view]").forEach((b) => {
    const on = b.dataset.view === "calculator";
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  renderCalculator();
  window.scrollTo(0, 0);
};
const priorSubjects = renderSubjects;
renderSubjects = function () {
  priorSubjects();
  $(".subject-search").insertAdjacentHTML(
    "beforebegin",
    '<div class="calc-home"><button type="button" data-view="calculator"><strong>Обычный калькулятор</strong><span>+ − × ÷ · проценты · корни ↗</span></button><button type="button" data-view="solver">Решение по шагам ↗</button></div>',
  );
};
const priorSolver = renderSolver;
renderSolver = function () {
  priorSolver();
  $("#view").insertAdjacentHTML(
    "afterbegin",
    '<div class="calc-switch"><button type="button" data-view="calculator">Обычный калькулятор ↗</button><span class="fine">Инструменты с пояснением</span></div>',
  );
  const error = $("#solver-error");
  $("#solver-form .actions").before(error);
  if (currentTool === "trigonometry") {
    const k = $("#input-k");
    k.required = false;
    k.inputMode = "numeric";
    k.placeholder = "Например, 0 или 1";
    $("#input-angle").maxLength = 160;
    $("#input-angle").placeholder = "30 + 90*k";
  }
};
window.ExtendedMath.evaluateAngle = evaluateAngle;
