/** Integrate focused modules with the legacy screens without changing saved keys. */
(() => {
  const api = OporaV2;
  const views = {
    schedule: [
      "Расписание",
      "Предмет, время и заметки на неделю.",
      api.schedule.render,
    ],
    personalization: [
      "Персонализация",
      "Кнопки, размер текста, тема и обои.",
      api.appearance.render,
    ],
    reader: [
      "Читать книги",
      "Полные классические тексты с главами и закладками.",
      api.reader.render,
    ],
    textbooks: [
      "Учебные маршруты",
      "Темы по предметам и классам; не копии издательских учебников.",
      api.textbooks.render,
    ],
  };
  const previousSetView = setView;
  setView = function (view) {
    if (views[view]) {
      const [title, intro, render] = views[view];
      api.heading(view, title, intro);
      render();
      window.scrollTo(0, 0);
    } else previousSetView(view);
    if (view === "subjects") {
      $(".quick-learning")?.insertAdjacentHTML(
        "beforeend",
        '<button type="button" data-view="schedule">Расписание →</button><button type="button" data-view="personalization">Персонализация →</button><button type="button" data-view="textbooks">Учебные маршруты →</button><button type="button" data-view="reader">Полные книги →</button>',
      );
    }
  };
  const previousOpenCard = openCard;
  openCard = function (id) {
    previousOpenCard(id);
    if ((DB.classics || []).some((book) => book.id === id)) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Читать полный текст · главы и страницы";
      button.onclick = () => {
        $("#knowledge-dialog").close();
        api.reader.open(id);
      };
      $("#dialog-body .dialog-foot")?.prepend(button);
    }
  };
  // Favorites for the authored exam bank live separately from library-card IDs.
  let examFavoritesOnly = false;
  const previousExamRender = renderOfflineExams,
    previousExamDraw = drawOfflineExamTasks;
  renderOfflineExams = function () {
    previousExamRender();
    $("#exam-search")
      .closest(".field")
      .insertAdjacentHTML(
        "afterend",
        `<label class="v2-checkbox"><input id="exam-favorites-only" type="checkbox" ${examFavoritesOnly ? "checked" : ""}> Только избранные задания</label>`,
      );
    $("#exam-favorites-only").onchange = (event) => {
      examFavoritesOnly = event.target.checked;
      drawOfflineExamTasks();
    };
    drawOfflineExamTasks();
  };
  drawOfflineExamTasks = function () {
    previousExamDraw();
    let visible = 0;
    $$("#exam-tasks .exam-task").forEach((article) => {
      const id = article.querySelector("[data-exam-try]")?.dataset.examTry;
      if (!id) return;
      article.hidden = examFavoritesOnly && !api.isFavorite("exam:" + id);
      if (!article.hidden) visible++;
      article.insertAdjacentHTML(
        "beforeend",
        `<div class="actions v2-row-actions">${api.favoriteButton("exam:" + id)}</div>`,
      );
    });
    api.bindFavorites($("#exam-tasks"), drawOfflineExamTasks);
    if (examFavoritesOnly)
      $("#exam-count").textContent = `Избранных по фильтрам: ${visible}`;
  };
  let homeworkFavoritesOnly = false;
  const previousHomeworkRender = renderHomework,
    previousHomeworkDraw = hwDraw;
  renderHomework = function () {
    previousHomeworkRender();
    $("#hw-items").insertAdjacentHTML(
      "beforebegin",
      `<label class="v2-checkbox"><input id="hw-favorites-only" type="checkbox" ${homeworkFavoritesOnly ? "checked" : ""}> Только избранные ДЗ</label>`,
    );
    $("#hw-favorites-only").onchange = (event) => {
      homeworkFavoritesOnly = event.target.checked;
      hwDraw();
    };
    hwDraw();
  };
  hwDraw = function () {
    previousHomeworkDraw();
    $$("#hw-items .hw-note").forEach((article) => {
      const id = article.querySelector("[data-hw-edit]")?.dataset.hwEdit;
      if (!id) return;
      article.hidden =
        homeworkFavoritesOnly && !api.isFavorite("homework:" + id);
      article
        .querySelector(".actions")
        ?.insertAdjacentHTML("beforeend", api.favoriteButton("homework:" + id));
    });
    api.bindFavorites($("#hw-items"), hwDraw);
  };
  const previousSubjectRender = renderSubjects;
  renderSubjects = function () {
    previousSubjectRender();
    $(".subject-search").insertAdjacentHTML(
      "afterend",
      '<label class="v2-checkbox"><input id="subjects-favorites-only" type="checkbox"> Предметы с избранными материалами</label>',
    );
    function filterSubjects() {
      $$("#subject-groups [data-subject]").forEach((button) => {
        const subjectsInTile =
          button.dataset.subject === "Математика"
            ? ["Алгебра", "Геометрия"]
            : [button.dataset.subject];
        button.hidden =
          $("#subjects-favorites-only").checked &&
          !DB.cards.some(
            (card) =>
              subjectsInTile.includes(card.subject) && favorites.has(card.id),
          );
      });
    }
    $("#subjects-favorites-only").onchange = filterSubjects;
    $("#subject-search").addEventListener("input", filterSubjects);
  };
})();
