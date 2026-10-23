// Local homework notebook. No notes are included in the public build or sent to a server.
const HW_KEY = "opora-homework-v1";
let hwNotes = [],
  hwReadError = "",
  hwFilter = "active",
  hwQuery = "",
  hwEditing = null;
function hwValid(x) {
  return (
    x &&
    typeof x.id === "string" &&
    /^[a-zA-Z0-9_-]{1,80}$/.test(x.id) &&
    typeof x.title === "string" &&
    x.title.trim().length > 0 &&
    x.title.length <= 120 &&
    typeof x.subject === "string" &&
    x.subject.length <= 100 &&
    typeof x.text === "string" &&
    x.text.length <= 20000 &&
    typeof x.done === "boolean" &&
    (!x.due || /^\d{4}-\d{2}-\d{2}$/.test(x.due)) &&
    (!x.remindAt || Number.isFinite(Date.parse(x.remindAt))) &&
    (!x.notifiedAt || Number.isFinite(Date.parse(x.notifiedAt)))
  );
}
try {
  const saved = JSON.parse(localStorage.getItem(HW_KEY) || "[]");
  if (
    !Array.isArray(saved) ||
    saved.length > 1000 ||
    !saved.every(hwValid) ||
    new Set(saved.map((x) => x.id)).size !== saved.length
  )
    throw Error();
  hwNotes = saved;
} catch (e) {
  hwReadError =
    "Не удалось прочитать ДЗ. Существующие данные не перезаписаны. Проверь доступ к хранилищу или восстанови резервную копию.";
}
function hwSave(next) {
  if (hwReadError) throw Error(hwReadError);
  if (next.length > 1000)
    throw Error("Максимум 1000 заметок. Сохрани копию и удали ненужные.");
  localStorage.setItem(HW_KEY, JSON.stringify(next));
  hwNotes = next;
}
function hwLocalDate(iso) {
  if (!iso) return "";
  const d = new Date(iso),
    pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}
function hwDateLabel(day) {
  if (!day) return "Без срока";
  return new Date(day + "T12:00:00").toLocaleDateString("ru");
}
function hwPending(now = Date.now()) {
  return hwNotes.filter(
    (n) =>
      !n.done && n.remindAt && !n.notifiedAt && Date.parse(n.remindAt) <= now,
  );
}
function hwMessage(s) {
  const el = $("#hw-message");
  if (el) el.textContent = s;
}
const hwBaseSetView = setView;
setView = function (v) {
  if (v !== "homework") return hwBaseSetView(v);
  if (translationAbort) {
    translationAbort.abort();
    translationAbort = null;
  }
  translationRun++;
  activeView = v;
  document.body.dataset.screen = v;
  $("#page-title").textContent = "Домашние задания";
  $("#page-intro").textContent = "Заметки, сроки и напоминания.";
  $$("[data-view]").forEach((b) => {
    const on = b.dataset.view === v;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  renderHomework();
  window.scrollTo(0, 0);
};
function renderHomework() {
  const editing = hwNotes.find((n) => n.id === hwEditing);
  $("#view").innerHTML =
    `<section class="panel homework-form"><h2>${editing ? "Редактировать ДЗ" : "Записать ДЗ"}</h2><p class="fine">Записи хранятся только на этом устройстве и в этом браузере. Между телефоном и компьютером не синхронизируются. Сделай резервную копию перед очисткой данных.</p><form id="hw-form"><div class="hw-fields"><div class="field"><label for="hw-subject">Предмет</label><input id="hw-subject" list="hw-subjects" maxlength="100" placeholder="Например, литература" value="${esc(editing?.subject || "")}"><datalist id="hw-subjects">${subjects.map((s) => `<option value="${esc(s)}"></option>`).join("")}</datalist></div><div class="field"><label for="hw-title">Название задания</label><input id="hw-title" maxlength="120" required value="${esc(editing?.title || "")}" placeholder="Прочитать главу и ответить на вопросы"></div></div><div class="field"><label for="hw-text">Заметка / условие</label><textarea id="hw-text" rows="5" maxlength="20000" placeholder="Страницы, номера заданий, вопросы преподавателя…">${esc(editing?.text || "")}</textarea></div><div class="hw-fields"><div class="field"><label for="hw-due">Сдать к дате</label><input id="hw-due" type="date" value="${esc(editing?.due || "")}"></div><div class="field"><label for="hw-remind">Напомнить (время устройства)</label><input id="hw-remind" type="datetime-local" value="${hwLocalDate(editing?.remindAt)}"></div></div><p class="fine">В «Опоре» напоминание показывается при открытом приложении или при следующем открытии. Для напоминания при закрытом приложении экспортируй событие в календарь и проверь его уведомление там. На iPhone установка веб-приложения сама по себе не включает фоновые напоминания.</p><div class="actions"><button class="primary" type="submit">${editing ? "Сохранить изменения" : "Добавить ДЗ"}</button>${editing ? '<button id="hw-cancel" type="button">Отмена</button>' : ""}</div></form><p id="hw-message" role="status" aria-live="polite">${esc(hwReadError)}</p></section><section class="panel homework-list"><div class="hw-toolbar"><div class="field"><label for="hw-search">Поиск в ДЗ</label><input id="hw-search" type="search" maxlength="200" value="${esc(hwQuery)}" placeholder="Предмет, название или текст"></div><div class="field"><label for="hw-filter">Показать</label><select id="hw-filter"><option value="active">Не выполнено</option><option value="all">Всё</option><option value="done">Выполнено</option></select></div></div><div class="actions"><button type="button" id="hw-export">Сохранить резервную копию</button><label class="hw-import">Восстановить из файла<input type="file" id="hw-import" accept="application/json,.json"></label><button type="button" id="hw-notifications">Разрешить уведомления при открытом приложении</button></div><p class="fine">Импорт добавляет отсутствующие записи; существующие с тем же ID остаются без изменений. Импортированные напоминания в календарь автоматически не добавляются.</p><div id="hw-items"></div></section>`;
  $("#hw-filter").value = hwFilter;
  $("#hw-filter").onchange = (e) => {
    hwFilter = e.target.value;
    hwDraw();
  };
  $("#hw-search").oninput = (e) => {
    hwQuery = e.target.value;
    hwDraw();
  };
  $("#hw-cancel")?.addEventListener("click", () => {
    hwEditing = null;
    renderHomework();
  });
  $("#hw-form").onsubmit = (e) => {
    e.preventDefault();
    try {
      const title = $("#hw-title").value.trim();
      if (!title) throw Error("Добавь название задания.");
      const local = $("#hw-remind").value,
        remindAt = local ? new Date(local).toISOString() : null;
      if (local && hwLocalDate(remindAt) !== local)
        throw Error(
          "Это местное время не существует из-за перевода часов. Выбери другое.",
        );
      const note = {
        id:
          editing?.id ||
          "hw_" +
            Date.now().toString(36) +
            "_" +
            Math.random().toString(36).slice(2, 10),
        title,
        subject: $("#hw-subject").value.trim(),
        text: $("#hw-text").value,
        due: $("#hw-due").value || null,
        remindAt,
        done: editing?.done || false,
        createdAt: editing?.createdAt || new Date().toISOString(),
        notifiedAt:
          editing?.remindAt === remindAt ? editing?.notifiedAt || null : null,
      };
      if (!hwValid(note)) throw Error("Проверь заполненные поля.");
      hwSave(
        editing
          ? hwNotes.map((n) => (n.id === editing.id ? note : n))
          : [...hwNotes, note],
      );
      hwEditing = null;
      renderHomework();
      hwMessage("ДЗ сохранено на этом устройстве.");
      hwCheckReminders();
    } catch (err) {
      hwMessage(
        err.name === "QuotaExceededError"
          ? "Недостаточно места. Запись не сохранена; сделай резервную копию."
          : err.message || "Не удалось сохранить ДЗ.",
      );
    }
  };
  $("#hw-export").onclick = () => {
    try {
      saveLocalFile(
        "opora-homework-backup.json",
        JSON.stringify(
          {
            app: "opora-homework",
            version: 1,
            exportedAt: new Date().toISOString(),
            notes: hwNotes,
          },
          null,
          2,
        ),
        "application/json",
      );
      hwMessage(
        "Файл резервной копии подготовлен. Он содержит текст твоих заданий — храни его безопасно.",
      );
    } catch (e) {
      hwMessage("Не удалось скачать копию.");
    }
  };
  $("#hw-import").onchange = async (e) => {
    try {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 5 * 1048576)
        throw Error("Файл слишком большой (максимум 5 МиБ).");
      const data = JSON.parse(await f.text());
      if (
        data.app !== "opora-homework" ||
        data.version !== 1 ||
        !Array.isArray(data.notes) ||
        data.notes.length > 1000 ||
        !data.notes.every(hwValid)
      )
        throw Error("Формат резервной копии не распознан.");
      if (hwReadError)
        throw Error(
          "Сначала сохрани исходные данные или проверь хранилище: автоматическая перезапись повреждённых данных отключена.",
        );
      const ids = new Set(hwNotes.map((n) => n.id)),
        next = [...hwNotes];
      let added = 0;
      for (const n of data.notes)
        if (!ids.has(n.id)) {
          next.push(n);
          ids.add(n.id);
          added++;
        }
      hwSave(next);
      hwDraw();
      hwMessage("Добавлено записей: " + added + ".");
    } catch (err) {
      hwMessage(err.message || "Импорт не удался.");
    } finally {
      e.target.value = "";
    }
  };
  $("#hw-notifications").onclick = async () => {
    try {
      if (!("Notification" in window))
        throw Error(
          "Системные уведомления здесь недоступны. Напоминания внутри приложения работают; для фона используй календарь.",
        );
      const result = await Notification.requestPermission();
      hwMessage(
        result === "granted"
          ? "Разрешено. Проверка времени работает только пока приложение открыто; в фоне точность не гарантируется."
          : "Уведомления не разрешены. Напоминания останутся внутри приложения.",
      );
    } catch (e) {
      hwMessage(e.message);
    }
  };
  hwDraw();
}
function hwDraw() {
  const host = $("#hw-items");
  if (!host) return;
  const query = norm(hwQuery).trim();
  const rows = hwNotes
    .filter(
      (n) =>
        (hwFilter === "all" || (hwFilter === "done" ? n.done : !n.done)) &&
        norm([n.subject, n.title, n.text].join(" ")).includes(query),
    )
    .sort(
      (a, b) =>
        Number(a.done) - Number(b.done) ||
        (a.due || "9999").localeCompare(b.due || "9999") ||
        a.id.localeCompare(b.id),
    );
  host.innerHTML = rows.length
    ? rows
        .map(
          (n) =>
            `<article class="hw-note ${n.done ? "hw-done" : ""}"><p class="fine">${esc(n.subject || "Без предмета")} · ${hwDateLabel(n.due)}</p><h3>${esc(n.title)}</h3><p class="hw-note-text">${esc(n.text)}</p>${n.remindAt ? `<p class="fine">Напомнить: ${esc(new Date(n.remindAt).toLocaleString("ru"))}${n.notifiedAt ? " · показано" : Date.parse(n.remindAt) <= Date.now() && !n.done ? " · время наступило" : ""}</p>` : ""}<div class="actions"><button data-hw-toggle="${n.id}" type="button">${n.done ? "Вернуть в работу" : "✓ Выполнено"}</button><button data-hw-edit="${n.id}" type="button">Изменить</button>${n.remindAt || n.due ? `<button data-hw-calendar="${n.id}" type="button">В календарь (.ics)</button>` : ""}<button data-hw-delete="${n.id}" type="button">Удалить</button></div></article>`,
        )
        .join("")
    : '<p class="empty">Заданий пока нет. Запиши первое выше.</p>';
  $$("[data-hw-toggle]").forEach(
    (b) =>
      (b.onclick = () => {
        try {
          hwSave(
            hwNotes.map((n) =>
              n.id === b.dataset.hwToggle ? { ...n, done: !n.done } : n,
            ),
          );
          hwDraw();
        } catch (e) {
          hwMessage("Не удалось сохранить изменение.");
        }
      }),
  );
  $$("[data-hw-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        hwEditing = b.dataset.hwEdit;
        renderHomework();
        $("#hw-title").focus();
        $(".homework-form").scrollIntoView({ block: "start" });
      }),
  );
  $$("[data-hw-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!confirm("Удалить это ДЗ?")) return;
        try {
          hwSave(hwNotes.filter((n) => n.id !== b.dataset.hwDelete));
          if (hwEditing === b.dataset.hwDelete) hwEditing = null;
          renderHomework();
          hwMessage("Задание удалено.");
        } catch (e) {
          hwMessage("Удалить не удалось.");
        }
      }),
  );
  $$("[data-hw-calendar]").forEach(
    (b) =>
      (b.onclick = () => {
        const n = hwNotes.find((n) => n.id === b.dataset.hwCalendar);
        saveLocalFile("opora-" + n.id + ".ics", hwCalendar(n), "text/calendar");
        hwMessage(
          "Открой .ics в поддерживаемом календаре и подтверди импорт. Проверь дату, часовой пояс и уведомление. На iPhone, если импорт файла не предлагается, создай событие вручную в «Календаре».",
        );
      }),
  );
}
function hwIcsEscape(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r/g, "");
}
function hwIcsFold(line) {
  let out = "",
    part = "";
  const enc = new TextEncoder();
  for (const ch of line) {
    if (enc.encode(part + ch).length > 74) {
      out += part + "\r\n";
      part = " ";
    }
    part += ch;
  }
  return out + part;
}
function hwCalendar(n) {
  const utc = (s) =>
    new Date(s)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NoSmoke//Opora homework//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + n.id + "@opora.local",
    "DTSTAMP:" + utc(Date.now()),
    "SUMMARY:" + hwIcsEscape((n.subject ? n.subject + ": " : "") + n.title),
    "DESCRIPTION:" +
      hwIcsEscape(
        n.text + (n.due ? "\nСрок сдачи: " + hwDateLabel(n.due) : ""),
      ),
  ];
  if (n.remindAt) {
    lines.push(
      "DTSTART:" + utc(n.remindAt),
      "DURATION:PT15M",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "TRIGGER:PT0M",
      "DESCRIPTION:Напоминание о ДЗ",
      "END:VALARM",
    );
  } else lines.push("DTSTART;VALUE=DATE:" + n.due.replace(/-/g, ""));
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(hwIcsFold).join("\r\n") + "\r\n";
}
function hwCheckReminders() {
  const pending = hwPending();
  const banner = $("#homework-reminder");
  if (banner) {
    banner.hidden = !pending.length;
    banner.textContent = pending.length
      ? "Пора заняться ДЗ: " +
        pending
          .slice(0, 3)
          .map((n) => n.title)
          .join(" · ") +
        (pending.length > 3 ? " и ещё " + (pending.length - 3) : "")
      : "";
  }
  if (!pending.length) return;
  // The banner is a durable catch-up reminder; acknowledgement only happens explicitly.
  if (
    document.visibilityState === "visible" &&
    "Notification" in window &&
    Notification.permission === "granted"
  )
    for (const n of pending) {
      if (hwSystemShown.has(n.id + "|" + n.remindAt)) continue;
      hwSystemShown.add(n.id + "|" + n.remindAt);
      try {
        new Notification("Опора · ДЗ", {
          body: (n.subject ? n.subject + ": " : "") + n.title,
          tag: n.id,
        });
      } catch (e) {
        /* Safari requires push infrastructure; retain in-app reminder instead. */
      }
    }
}
const hwSystemShown = new Set();
const hwBanner = document.createElement("button");
hwBanner.id = "homework-reminder";
hwBanner.type = "button";
hwBanner.className = "hw-reminder";
hwBanner.hidden = true;
hwBanner.setAttribute("role", "status");
$("main header").after(hwBanner);
hwBanner.onclick = () => {
  setView("homework");
  hwMessage(
    "Показаны задания, время напоминания которых наступило. Чтобы убрать напоминание, отметь ДЗ выполненным, измени время или нажми «Напоминание просмотрено».",
  );
  const due = hwPending();
  if (due.length) {
    const ack = document.createElement("button");
    ack.type = "button";
    ack.textContent = "Напоминание просмотрено";
    ack.onclick = () => {
      try {
        const ids = new Set(due.map((n) => n.id));
        hwSave(
          hwNotes.map((n) =>
            ids.has(n.id) ? { ...n, notifiedAt: new Date().toISOString() } : n,
          ),
        );
        hwCheckReminders();
        hwDraw();
        ack.remove();
        hwMessage("Напоминания отмечены просмотренными.");
      } catch (e) {
        hwMessage("Не удалось сохранить отметку.");
      }
    };
    $("#hw-message").after(ack);
  }
};
setInterval(hwCheckReminders, 15000);
document.addEventListener("visibilitychange", hwCheckReminders);
window.addEventListener("focus", hwCheckReminders);
window.addEventListener("storage", (e) => {
  if (e.key === HW_KEY) {
    try {
      const rows = JSON.parse(e.newValue || "[]");
      if (!Array.isArray(rows) || rows.length > 1000 || !rows.every(hwValid))
        return;
      hwNotes = rows;
      hwCheckReminders();
      if (activeView === "homework" && !hwEditing) hwDraw();
    } catch (e) {}
  }
});
hwCheckReminders();
const hwSubjects = renderSubjects;
renderSubjects = function () {
  hwSubjects();
  $(".quick-learning")?.insertAdjacentHTML(
    "afterbegin",
    '<button type="button" data-view="homework">✎ · Домашние задания</button>',
  );
};
window.OporaHomework = {
  getNotes: () => hwNotes.map((n) => ({ ...n })),
  hwCalendar,
  hwPending,
  hwCheckReminders,
};
