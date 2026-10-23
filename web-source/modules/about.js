/** One current About screen: do not stack outdated release notices. */
(() => {
  const cacheName = "opora-2.0.0-nav3";
  function render() {
    const essays = DB.cards.filter((card) => card.kind === "essay").length;
    const biology = DB.cards.filter((card) => card.subject === "Биология");
    const history = DB.cards.filter(
      (card) => card.subject === "История",
    ).length;
    $("#view").innerHTML =
      `<section class="creator-credit"><span class="fine">Автор проекта</span><p>Создано NoSmoke</p><a href="https://t.me/nosmokke" target="_blank" rel="noopener noreferrer">Telegram · @nosmokke ↗</a></section>
      <section class="panel v2-panel"><h2>Опора · 2.0.0</h2><p>${DB.cards.length} материалов, ${history} тем истории, ${essays} тем сочинений и ${essays * 2} учебных образца. ${biology.length} тем биологии с разобранными заданиями, 10 расширенных литературных разборов и 2 полных произведения Пушкина.</p>
      <p>Расписание, удобное меню разделов, избранное, домашние задания и читалка с закладками.</p><p class="fine">Это пополняемый справочник, не полный комплект школьных учебников и не официальный банк ФИПИ. Разборы книг могут быть сгруппированы по частям и диапазонам глав — заголовки прямо указывают это. Страницы читалки не совпадают с печатными изданиями.</p>
      <div class="actions"><button data-view="more" type="button">Все разделы</button><button data-view="schedule" type="button">Моё расписание</button><button data-view="reader" type="button">Полные книги</button></div></section>
      <section class="panel v2-panel"><h2>Без интернета</h2><p>Материалы, расписание, ДЗ, настройки, избранное, книги и поддерживаемые числовые решатели работают локально. На iPhone один раз открой приложение с сетью и дождись «Офлайн готов».</p><p>Перевод EN ↔ RU работает только в Android-приложении после отдельной загрузки языкового пакета Google ML Kit. На Windows и iPhone офлайн-перевод пока недоступен. Онлайн-перевод удалён.</p><p class="fine">ML Kit может отправлять служебную диагностику согласно правилам Google. Текст офлайн-перевода обрабатывается на устройстве; пакет загружается только по явной кнопке. Универсального ИИ-решения произвольных заданий в приложении нет.</p><p><a href="https://developers.google.com/ml-kit/android-data-disclosure" target="_blank" rel="noopener noreferrer">Правила данных SDK Google ↗</a></p></section>
      <section class="panel v2-panel"><h2>Твои данные</h2><p>ДЗ, расписание, избранное и закладки сохраняются на этом устройстве и не синхронизируются автоматически. Не удаляй приложение перед обновлением, если хочешь сохранить данные. Для ДЗ и расписания доступны отдельные резервные копии.</p><p class="fine">Системная очистка данных, удаление приложения или очистка данных сайта может удалить локальные записи. Напоминания ДЗ внутри приложения не гарантируют фоновые уведомления; для фона используй экспорт в календарь.</p></section>
      <section class="panel v2-panel"><h2>Память и кеш</h2><p>Учебная база встроена. Размер приложения, данные, оперативная память и HTTP-кеш — разные показатели. Языковой пакет и выбранное фото занимают место в данных.</p><p id="cache-estimate" class="fine"></p><button id="cache-clean" type="button">Очистить лишний кеш</button><p id="cache-clean-status" role="status"></p><p class="fine">Удаляются только старые кеши «Опоры» или HTTP-кеш Android WebView. Текущая офлайн-копия и локальные записи не удаляются.</p></section>
      <section class="panel v2-panel"><h2>Установка и источники</h2><p id="install-help">Android: установи APK поверх предыдущей версии с той же подписью. Windows: запусти portable EXE. iPhone: открой сайт в Safari, затем «Поделиться → На экран Домой».</p><p class="fine">Оригинальные тексты Пушкина находятся в общественном достоянии; источник транскрипции — Интернет-библиотека Алексея Комарова. Современные редакторские примечания исключены. Собственные пересказы не являются оригинальным текстом книг.</p><div class="actions"><button data-view="textbooks" type="button">Учебные маршруты</button><button data-view="homework" type="button">Мои ДЗ</button></div><p><a href="https://github.com/nosmokee/apora/releases/tag/v2.0.0" target="_blank" rel="noopener noreferrer">Сборки 2.0.0 ↗</a></p></section>`;
    $("#cache-clean").onclick = async () => {
      try {
        if (typeof window.OporaFiles?.clearHttpCache === "function") {
          window.OporaFiles.clearHttpCache();
          $("#cache-clean-status").textContent =
            "Запрошена очистка HTTP-кеша. Локальные записи сохранены.";
          return;
        }
        if (!("caches" in window) || location.protocol === "file:") {
          $("#cache-clean-status").textContent =
            "У локального HTML нет отдельной офлайн-копии в кеше сайта. Данные не изменены.";
          return;
        }
        let removed = 0;
        for (const key of await caches.keys())
          if (key.startsWith("opora-") && key !== cacheName) {
            await caches.delete(key);
            removed++;
          }
        $("#cache-clean-status").textContent =
          `Удалено старых кешей: ${removed}. Текущая офлайн-копия и записи сохранены.`;
      } catch (_) {
        $("#cache-clean-status").textContent =
          "Очистка недоступна. Локальные записи не изменены.";
      }
    };
    if (navigator.storage?.estimate)
      navigator.storage
        .estimate()
        .then((value) => {
          const target = $("#cache-estimate");
          if (target)
            target.textContent = `Оценка всего хранилища сайта: ${Math.round(((value.usage || 0) / 1048576) * 10) / 10} МиБ. Это не только кеш.`;
        })
        .catch(() => {});
  }
  OporaV2.about = { render };
  renderAbout = render;
})();
