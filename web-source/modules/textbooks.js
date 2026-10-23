/** Routes are our own topical notes, not replicas of unspecified publishers' books. */
(() => {
  const api = OporaV2;
  let subject = "История",
    grade = "9",
    favoritesOnly = false,
    query = "";
  function render() {
    const school = [
      "Русский язык",
      "Литература",
      "Алгебра",
      "Геометрия",
      "Английский язык",
      "История",
      "Обществознание",
      "Биология",
      "География",
      "Физика",
      "Химия",
      "Информатика",
      "ОБЗР",
      "Физкультура",
    ];
    $("#view").innerHTML =
      `<section class="panel v2-panel"><h2>Выбери предмет и класс</h2><p>Учебные маршруты «Опоры» — авторские конспекты и разборы. Это не полный комплект школьных учебников и не их оглавления.</p>
      <p class="fine">Для точного выбора издательского учебника, его параграфов и печатных страниц нужны авторы и год издания. Пока издание не указано, номера параграфов и страниц не выдумываются.</p>
      <div class="v2-fields"><div class="field"><label for="textbook-subject">Предмет</label><select id="textbook-subject">${school.map((name) => `<option>${esc(name)}</option>`).join("")}</select></div>
      <div class="field"><label for="textbook-grade">Класс</label><select id="textbook-grade"><option>9</option><option>10</option><option>11</option></select></div></div>
      <div class="field"><label for="textbook-query">Найти тему</label><input id="textbook-query" type="search" maxlength="150" value="${esc(query)}"></div>
      <label class="v2-checkbox"><input id="textbook-favorites" type="checkbox" ${favoritesOnly ? "checked" : ""}> Только избранные темы</label><p id="textbook-count" role="status" class="fine"></p><div id="textbook-sections"></div></section>`;
    $("#textbook-subject").value = subject;
    $("#textbook-grade").value = grade;
    $("#textbook-subject").onchange = (event) => {
      subject = event.target.value;
      draw();
    };
    $("#textbook-grade").onchange = (event) => {
      grade = event.target.value;
      draw();
    };
    $("#textbook-query").oninput = (event) => {
      query = event.target.value;
      draw();
    };
    $("#textbook-favorites").onchange = (event) => {
      favoritesOnly = event.target.checked;
      draw();
    };
    draw();
  }
  function draw() {
    const rows = DB.cards.filter(
      (card) =>
        card.subject === subject &&
        card.grades.includes(Number(grade)) &&
        card.kind !== "essay" &&
        (!favoritesOnly || favorites.has(card.id)) &&
        norm(card.title + " " + card.summary).includes(norm(query).trim()),
    );
    $("#textbook-count").textContent =
      `${rows.length} тем · ${subject} · ${grade} класс. Подборка не исчерпывает программу.`;
    $("#textbook-sections").innerHTML = rows.length
      ? rows
          .map(
            (card) =>
              `<article class="v2-row"><h3>${esc(card.title)}</h3><p>${esc(card.summary)}</p><div class="actions"><button type="button" data-route-open="${card.id}">Открыть тему</button><button type="button" data-route-star="${card.id}" aria-pressed="${favorites.has(card.id)}">${favorites.has(card.id) ? "★ Сохранено" : "☆ Сохранить"}</button></div></article>`,
          )
          .join("")
      : '<p class="empty">По этим фильтрам тем пока нет. Выбери другой класс или сбрось избранное.</p>';
    $$("[data-route-open]").forEach(
      (button) => (button.onclick = () => openCard(button.dataset.routeOpen)),
    );
    $$("[data-route-star]").forEach(
      (button) =>
        (button.onclick = () => {
          toggleFavorite(button.dataset.routeStar);
          draw();
        }),
    );
  }
  api.textbooks = { render };
})();
