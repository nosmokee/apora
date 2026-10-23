/** Versioned local stores. Writes commit only after persistent storage succeeds. */
window.OporaV2 = (() => {
  // Store values are JSON data; this also works in older mobile WebViews.
  const clone = (value) => JSON.parse(JSON.stringify(value));
  function createStore(key, fallback, validate) {
    let value = clone(fallback);
    let readError = "";
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!validate(parsed)) throw new Error("Invalid stored data");
        value = parsed;
      }
    } catch (_) {
      readError = `Не удалось прочитать ${key}. Данные не перезаписаны. Сохрани резервную копию перед восстановлением.`;
    }
    return {
      get: () => clone(value),
      error: () => readError,
      set(next) {
        if (readError) throw new Error(readError);
        if (!validate(next)) throw new Error("Проверь формат данных.");
        localStorage.setItem(key, JSON.stringify(next));
        value = clone(next);
      },
    };
  }
  const extras = createStore(
    "opora-extra-favorites-v2",
    [],
    (value) =>
      Array.isArray(value) &&
      value.length <= 5000 &&
      value.every((id) => typeof id === "string" && id.length <= 160),
  );
  const isFavorite = (id) => extras.get().includes(id);
  function toggleExtra(id) {
    const next = new Set(extras.get());
    next.has(id) ? next.delete(id) : next.add(id);
    extras.set([...next]);
  }
  function favoriteButton(id, title = "Сохранить") {
    return `<button type="button" data-extra-favorite="${esc(id)}" aria-pressed="${isFavorite(id)}">${isFavorite(id) ? "★ Сохранено" : "☆ " + esc(title)}</button>`;
  }
  function bindFavorites(root, redraw) {
    root.querySelectorAll("[data-extra-favorite]").forEach((button) => {
      button.onclick = () => {
        try {
          toggleExtra(button.dataset.extraFavorite);
          redraw();
        } catch (error) {
          alert("Не удалось сохранить избранное: " + error.message);
        }
      };
    });
  }
  function heading(view, title, intro) {
    if (translationAbort) {
      translationAbort.abort();
      translationAbort = null;
    }
    translationRun++;
    activeView = view;
    document.body.dataset.screen = view;
    $("#page-title").textContent = title;
    $("#page-intro").textContent = intro;
    $$("[data-view]").forEach((button) => {
      const selected = button.dataset.view === view;
      button.classList.toggle("active", selected);
      if (selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  return {
    createStore,
    isFavorite,
    toggleExtra,
    favoriteButton,
    bindFavorites,
    heading,
  };
})();
