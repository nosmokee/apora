/** Weekly lessons are local records, independent of homework and its reminder key. */
(() => {
  const api = OporaV2;
  const days = [
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
  ];
  const timeValid = (value) =>
    typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  function validLesson(row) {
    return (
      row &&
      typeof row.id === "string" &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(row.id) &&
      Number.isInteger(row.day) &&
      row.day >= 0 &&
      row.day < 7 &&
      typeof row.subject === "string" &&
      row.subject.trim().length > 0 &&
      row.subject.length <= 100 &&
      timeValid(row.start) &&
      timeValid(row.end) &&
      row.end > row.start &&
      typeof row.room === "string" &&
      row.room.length <= 80 &&
      typeof row.note === "string" &&
      row.note.length <= 1000
    );
  }
  const validRows = (rows) =>
    Array.isArray(rows) &&
    rows.length <= 500 &&
    rows.every(validLesson) &&
    new Set(rows.map((row) => row.id)).size === rows.length;
  const store = api.createStore("opora-schedule-v2", [], validRows);
  let editing = null,
    dayFilter = "",
    favoritesOnly = false,
    message = "";
  function render() {
    const lesson = store.get().find((row) => row.id === editing);
    $("#view").innerHTML =
      `<section class="panel v2-panel"><h2>${lesson ? "Изменить занятие" : "Добавить занятие"}</h2>
      <p class="fine">Еженедельное расписание на этом устройстве. Автоматической синхронизации и фоновых уведомлений здесь нет; напоминания о заданиях — во вкладке ДЗ.</p>
      <form id="schedule-form" class="v2-form"><div class="v2-fields">
        <div class="field"><label for="schedule-day">День недели</label><select id="schedule-day">${days.map((day, i) => `<option value="${i}">${day}</option>`).join("")}</select></div>
        <div class="field"><label for="schedule-subject">Предмет</label><input id="schedule-subject" list="schedule-subjects" maxlength="100" required><datalist id="schedule-subjects">${subjects.map((subject) => `<option value="${esc(subject)}">`).join("")}</datalist></div>
        <div class="field"><label for="schedule-start">Начало</label><input id="schedule-start" type="time" required value="09:00"></div>
        <div class="field"><label for="schedule-end">Конец</label><input id="schedule-end" type="time" required value="09:45"></div>
        <div class="field"><label for="schedule-room">Кабинет / ссылка</label><input id="schedule-room" maxlength="80"></div>
        <div class="field"><label for="schedule-note">Заметка</label><input id="schedule-note" maxlength="1000"></div></div>
        <div class="actions"><button class="primary" type="submit">Сохранить занятие</button>${lesson ? '<button id="schedule-cancel" type="button">Отмена</button>' : ""}</div></form>
      <p id="schedule-message" role="status">${esc(store.error() || message)}</p></section>
      <section class="panel v2-panel"><h2>Моя неделя</h2><div class="v2-fields"><div class="field"><label for="schedule-filter">День</label><select id="schedule-filter"><option value="">Вся неделя</option>${days.map((day, i) => `<option value="${i}">${day}</option>`).join("")}</select></div>
      <label class="v2-checkbox"><input id="schedule-favorites" type="checkbox" ${favoritesOnly ? "checked" : ""}> Только избранные</label></div>
      <div id="schedule-list"></div><div class="actions"><button id="schedule-export" type="button">Скачать резервную копию</button><label class="v2-file">Загрузить копию<input id="schedule-import" type="file" accept="application/json,.json"></label></div></section>`;
    if (lesson)
      for (const key of ["day", "subject", "start", "end", "room", "note"])
        $("#schedule-" + key).value = lesson[key];
    else
      $("#schedule-day").value =
        dayFilter || String((new Date().getDay() + 6) % 7);
    $("#schedule-filter").value = dayFilter;
    $("#schedule-filter").onchange = (event) => {
      dayFilter = event.target.value;
      draw();
    };
    $("#schedule-favorites").onchange = (event) => {
      favoritesOnly = event.target.checked;
      draw();
    };
    $("#schedule-cancel")?.addEventListener("click", () => {
      editing = null;
      message = "";
      render();
    });
    $("#schedule-form").onsubmit = (event) => {
      event.preventDefault();
      try {
        const row = {
          id:
            lesson?.id || "lesson_" + crypto.randomUUID().replaceAll("-", "_"),
        };
        for (const key of ["subject", "start", "end", "room", "note"])
          row[key] = $("#schedule-" + key).value.trim();
        row.day = Number($("#schedule-day").value);
        if (!validLesson(row))
          throw new Error(
            "Предмет обязателен; конец занятия должен быть позже начала в тот же день.",
          );
        const rows = store.get();
        if (
          rows.some(
            (other) =>
              other.id !== row.id &&
              other.day === row.day &&
              row.start < other.end &&
              row.end > other.start,
          )
        )
          throw new Error("Это время пересекается с другим занятием.");
        store.set(
          lesson
            ? rows.map((other) => (other.id === lesson.id ? row : other))
            : [...rows, row],
        );
        editing = null;
        message = "Занятие сохранено на устройстве.";
        render();
      } catch (error) {
        $("#schedule-message").textContent = error.message;
      }
    };
    $("#schedule-export").onclick = () =>
      saveLocalFile(
        "opora-schedule.json",
        JSON.stringify(
          { app: "opora-schedule", version: 1, lessons: store.get() },
          null,
          2,
        ),
        "application/json",
      );
    $("#schedule-import").onchange = async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 1048576) throw new Error("Максимум 1 МиБ.");
        const parsed = JSON.parse(await file.text());
        if (
          parsed.app !== "opora-schedule" ||
          parsed.version !== 1 ||
          !validRows(parsed.lessons)
        )
          throw new Error("Неверная резервная копия.");
        const merged = new Map(store.get().map((row) => [row.id, row]));
        parsed.lessons.forEach((row) => {
          if (!merged.has(row.id)) merged.set(row.id, row);
        });
        store.set([...merged.values()]);
        message =
          "Новые занятия добавлены. Проверь возможные пересечения времени.";
        render();
      } catch (error) {
        $("#schedule-message").textContent = error.message;
      }
    };
    draw();
  }
  function draw() {
    const rows = store
      .get()
      .filter(
        (row) =>
          (dayFilter === "" || row.day === Number(dayFilter)) &&
          (!favoritesOnly || api.isFavorite("schedule:" + row.id)),
      )
      .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
    $("#schedule-list").innerHTML = rows.length
      ? rows
          .map(
            (row) =>
              `<article class="v2-row"><p class="fine">${days[row.day]} · ${row.start}–${row.end}</p><h3>${esc(row.subject)}</h3>${row.room ? `<p>${esc(row.room)}</p>` : ""}${row.note ? `<p>${esc(row.note)}</p>` : ""}<div class="actions">${api.favoriteButton("schedule:" + row.id)}<button type="button" data-lesson-edit="${row.id}">Изменить</button><button type="button" data-lesson-delete="${row.id}">Удалить</button></div></article>`,
          )
          .join("")
      : '<p class="empty">Нет занятий по выбранным фильтрам.</p>';
    api.bindFavorites($("#schedule-list"), draw);
    $$("[data-lesson-edit]").forEach(
      (button) =>
        (button.onclick = () => {
          editing = button.dataset.lessonEdit;
          render();
          $("#schedule-subject").focus();
        }),
    );
    $$("[data-lesson-delete]").forEach(
      (button) =>
        (button.onclick = () => {
          if (!confirm("Удалить занятие из расписания?")) return;
          try {
            store.set(
              store
                .get()
                .filter((row) => row.id !== button.dataset.lessonDelete),
            );
            if (editing === button.dataset.lessonDelete) editing = null;
            message = "Занятие удалено.";
            render();
          } catch (error) {
            $("#schedule-message").textContent = error.message;
          }
        }),
    );
  }
  api.schedule = { render, get: store.get, validLesson };
})();
