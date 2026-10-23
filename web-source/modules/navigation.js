/** One searchable secondary menu, shared by desktop and mobile. */
(() => {
  const groups = [
    [
      "Учёба",
      [
        ["schedule", "Расписание", "Предметы, время и заметки на неделю"],
        ["reader", "Полные книги", "Читать по главам, сохранять страницу"],
        ["textbooks", "Учебные маршруты", "Темы по предмету и классу"],
        ["offline-exams", "ОГЭ / ЕГЭ · офлайн", "Учебные задания с разборами"],
        ["geography", "География", "Карты и справочные материалы"],
        ["periodic", "Химия", "Периодическая таблица элементов"],
      ],
    ],
    [
      "Инструменты",
      [
        ["calculator", "Калькулятор", "Быстрые вычисления"],
        ["solver", "Решатель", "Поддерживаемые задачи по шагам"],
        ["subject-practice", "Задачи по предметам", "Расчёты и учебные модели"],
        ["practice", "Практика", "Тренировочные примеры"],
        ["mathref", "Формулы и теоремы", "Математический справочник"],
      ],
    ],
    [
      "Моё",
      [
        ["favorites", "Избранное", "Сохранённые учебные материалы"],
        ["homework", "Домашние задания", "Записи, сроки и напоминания"],
        ["about", "О приложении", "Версия, установка и управление кешем"],
      ],
    ],
  ];
  function render() {
    $("#view").innerHTML =
      `<div class="field"><label for="more-search">Найти раздел</label><input id="more-search" type="search" placeholder="Расписание, решатель, избранное…" autocomplete="off"></div>${groups.map(([name, links]) => `<section class="more-group"><h2>${esc(name)}</h2><div class="more-grid">${links.map(([view, title, text]) => `<button type="button" class="more-link" data-view="${view}"><strong>${esc(title)}</strong><small>${esc(text)}</small></button>`).join("")}</div></section>`).join("")}<p id="more-empty" class="empty" hidden>Такого раздела нет. Попробуй другое название.</p>`;
    $("#more-search").oninput = (event) => {
      const query = event.target.value.toLocaleLowerCase("ru").trim();
      let visible = 0;
      $$(".more-group").forEach((group) => {
        let count = 0;
        group.querySelectorAll(".more-link").forEach((button) => {
          button.hidden = !button.textContent
            .toLocaleLowerCase("ru")
            .includes(query);
          if (!button.hidden) count++;
        });
        group.hidden = count === 0;
        visible += count;
      });
      $("#more-empty").hidden = visible > 0;
    };
  }
  OporaV2.navigation = { render };
})();
