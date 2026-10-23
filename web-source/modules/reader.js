/** Reflowable offline reader. Page numbers are app pages, never printed editions. */
(() => {
  const api = OporaV2;
  const bookmarks = api.createStore(
    "opora-reading-v2",
    {},
    (data) =>
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      Object.values(data).every(
        (value) => Number.isInteger(value) && value >= 0 && value < 100000,
      ),
  );
  let selected = DB.classics?.[0]?.id || "",
    pageNumber = 0,
    favoritesOnly = false;
  const pageCache = new Map();
  function paginate(book) {
    if (pageCache.has(book.id)) return pageCache.get(book.id);
    const pages = [];
    book.chapters.forEach((chapter, chapterIndex) => {
      let paragraphs = [],
        length = 0;
      const commit = () => {
        if (paragraphs.length)
          pages.push({
            chapter: chapterIndex,
            title: chapter.title,
            paragraphs,
          });
        paragraphs = [];
        length = 0;
      };
      chapter.paragraphs.forEach((paragraph) => {
        // Never cut a word or lose text; long paragraphs get a page of their own.
        if (length + paragraph.length > 2200) commit();
        paragraphs.push(paragraph);
        length += paragraph.length;
      });
      commit();
    });
    pageCache.set(book.id, pages);
    return pages;
  }
  function render() {
    const books = (DB.classics || []).filter(
      (book) => !favoritesOnly || favorites.has(book.id),
    );
    if (!books.some((book) => book.id === selected)) {
      selected = books[0]?.id || "";
      pageNumber = 0;
    }
    const book = books.find((book) => book.id === selected);
    $("#view").innerHTML =
      `<section class="panel v2-panel"><h2>Полные тексты · офлайн</h2><p class="fine">Оригинальные произведения в общественном достоянии. Это не пересказы. Номера страниц условные: они созданы приложением и не совпадают с бумажными учебниками.</p>
      <label class="v2-checkbox"><input id="reader-favorites" type="checkbox" ${favoritesOnly ? "checked" : ""}> Только избранные книги</label>
      <div class="field"><label for="reader-book">Книга</label><select id="reader-book">${books.map((item) => `<option value="${item.id}">${esc(item.title)} · ${esc(item.author)}</option>`).join("")}</select></div><div id="reader-content"></div></section>`;
    $("#reader-favorites").onchange = (event) => {
      favoritesOnly = event.target.checked;
      render();
    };
    $("#reader-book").value = selected;
    $("#reader-book").onchange = (event) => {
      selected = event.target.value;
      pageNumber = bookmarks.get()[selected] || 0;
      render();
    };
    if (!book) {
      $("#reader-content").innerHTML =
        '<p class="empty">Нет книг по выбранному фильтру. Сохрани книгу звёздочкой в литературе.</p>';
      return;
    }
    const pages = paginate(book);
    pageNumber = Math.min(pageNumber, pages.length - 1);
    const page = pages[pageNumber];
    $("#reader-content").innerHTML =
      `<div class="v2-fields"><div class="field"><label for="reader-chapter">Глава / раздел</label><select id="reader-chapter">${book.chapters.map((chapter, index) => `<option value="${index}">${esc(chapter.title)}</option>`).join("")}</select></div><div class="field"><label for="reader-page-number">Страница приложения · всего ${pages.length}</label><input id="reader-page-number" type="number" min="1" max="${pages.length}" value="${pageNumber + 1}"></div></div>
      <div class="actions reader-navigation"><button type="button" id="reader-prev" ${pageNumber ? "" : "disabled"}>← Предыдущая</button><button type="button" id="reader-next" ${pageNumber + 1 < pages.length ? "" : "disabled"}>Следующая →</button><button type="button" id="reader-save">Запомнить страницу</button><button type="button" id="reader-resume">Моя закладка</button><button type="button" id="reader-star" aria-pressed="${favorites.has(book.id)}">${favorites.has(book.id) ? "★ Сохранено" : "☆ Книга в избранное"}</button></div>
      <p id="reader-status" role="status"></p><article class="reader-page"><h3>${esc(page.title)}</h3>${page.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}</article>
      <p class="fine">Страница приложения ${pageNumber + 1} из ${pages.length} · ${esc(book.rights)}</p><p class="fine"><a href="${esc(book.source)}" target="_blank" rel="noopener noreferrer">Источник полного текста ↗</a></p>`;
    $("#reader-chapter").value = String(page.chapter);
    const go = (number) => {
      if (!Number.isInteger(number) || number < 0 || number >= pages.length) {
        $("#reader-status").textContent =
          "Укажи страницу от 1 до " + pages.length;
        return;
      }
      pageNumber = number;
      render();
      $("#reader-content").scrollIntoView({ block: "start" });
    };
    $("#reader-prev").onclick = () => go(pageNumber - 1);
    $("#reader-next").onclick = () => go(pageNumber + 1);
    $("#reader-page-number").onchange = (event) =>
      go(Number(event.target.value) - 1);
    $("#reader-chapter").onchange = (event) =>
      go(
        pages.findIndex((item) => item.chapter === Number(event.target.value)),
      );
    $("#reader-save").onclick = () => {
      try {
        bookmarks.set({ ...bookmarks.get(), [selected]: pageNumber });
        $("#reader-status").textContent =
          "Страница сохранена на этом устройстве.";
      } catch (error) {
        $("#reader-status").textContent = error.message;
      }
    };
    $("#reader-resume").onclick = () => go(bookmarks.get()[selected] || 0);
    $("#reader-star").onclick = () => {
      toggleFavorite(book.id);
      render();
    };
  }
  api.reader = {
    render,
    paginate,
    open(id) {
      selected = id;
      pageNumber = bookmarks.get()[id] || 0;
      setView("reader");
    },
  };
})();
