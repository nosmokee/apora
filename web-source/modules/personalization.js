/** Appearance is device-local; resetting it never removes notes or favorites. */
(() => {
  const api = OporaV2;
  const defaults = {
    size: "normal",
    shape: "soft",
    font: "normal",
    wallpaper: "paper",
    image: "",
  };
  const sizes = ["normal", "large", "extra"];
  const shapes = ["square", "soft", "round"];
  const fonts = ["normal", "large", "extra"];
  const wallpapers = ["paper", "blue", "sage", "night", "image"];
  const valid = (value) =>
    value &&
    sizes.includes(value.size) &&
    shapes.includes(value.shape) &&
    fonts.includes(value.font) &&
    wallpapers.includes(value.wallpaper) &&
    typeof value.image === "string" &&
    value.image.length < 750000 &&
    (!value.image ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value.image));
  const store = api.createStore("opora-appearance-v2", defaults, valid);
  function apply() {
    const value = store.get(),
      root = document.documentElement;
    root.dataset.buttonSize = value.size;
    root.dataset.buttonShape = value.shape;
    root.dataset.textSize = value.font;
    root.dataset.wallpaper = value.wallpaper;
    root.style.setProperty(
      "--user-wallpaper",
      value.wallpaper === "image" && value.image
        ? `url("${value.image}")`
        : "none",
    );
    root.style.setProperty(
      "--radius",
      { square: "0px", soft: "6px", round: "20px" }[value.shape],
    );
  }
  async function resizePhoto(file) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 10 * 1048576)
      throw new Error("Выбери PNG, JPEG или WebP до 10 МиБ.");
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f5f2ea";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.65);
      if (data.length >= 750000)
        throw new Error(
          "Изображение слишком сложное. Выбери другую фотографию.",
        );
      return data;
    } finally {
      bitmap.close();
    }
  }
  function render() {
    const value = store.get();
    $("#view").innerHTML =
      `<section class="panel v2-panel"><h2>Настрой под себя</h2><p>Размер и форма кнопок, текст и фон. Настройки сохраняются только на этом устройстве.</p>
      <div class="v2-form"><div class="v2-fields">
      <div class="field"><label for="appearance-size">Размер кнопок</label><select id="appearance-size"><option value="normal">Обычные · от 44 px</option><option value="large">Крупные · от 52 px</option><option value="extra">Очень крупные · от 60 px</option></select></div>
      <div class="field"><label for="appearance-shape">Форма кнопок</label><select id="appearance-shape"><option value="square">Прямые углы</option><option value="soft">Мягкое скругление</option><option value="round">Округлые</option></select></div>
      <div class="field"><label for="appearance-font">Размер текста</label><select id="appearance-font"><option value="normal">Обычный</option><option value="large">Крупный</option><option value="extra">Очень крупный</option></select></div>
      <div class="field"><label for="appearance-theme">Тема</label><select id="appearance-theme"><option value="system">Как на устройстве</option><option value="light">Светлая</option><option value="dark">Тёмная</option></select></div>
      <div class="field"><label for="appearance-wallpaper">Обои</label><select id="appearance-wallpaper"><option value="paper">Бумага</option><option value="blue">Лазурь</option><option value="sage">Шалфей</option><option value="night">Сумерки</option><option value="image">Своя фотография</option></select></div>
      <div class="field"><label for="appearance-image">Фото для фона · до 10 МиБ</label><input type="file" id="appearance-image" accept="image/png,image/jpeg,image/webp"></div></div>
      <p class="fine">Фотография уменьшается и хранится локально. Карточки остаются непрозрачными для читаемости. Фото из галереи никуда не отправляется.</p>
      <div class="actions"><button type="button" id="appearance-reset">Сбросить только оформление</button><button type="button" data-view="schedule">Открыть расписание</button></div><p id="appearance-status" role="status">${esc(store.error())}</p></div></section>`;
    for (const [id, key] of [
      ["size", "size"],
      ["shape", "shape"],
      ["font", "font"],
      ["wallpaper", "wallpaper"],
    ]) {
      $("#appearance-" + id).value = value[key];
      $("#appearance-" + id).onchange = (event) => {
        try {
          store.set({ ...store.get(), [key]: event.target.value });
          apply();
          $("#appearance-status").textContent = "Оформление сохранено.";
        } catch (error) {
          $("#appearance-status").textContent = error.message;
        }
      };
    }
    $("#appearance-theme").value = manualTheme
      ? document.documentElement.dataset.theme
      : "system";
    $("#appearance-theme").onchange = (event) => {
      try {
        if (event.target.value === "system") {
          localStorage.removeItem("opora-theme");
          manualTheme = false;
          applyTheme(
            matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light",
          );
        } else applyTheme(event.target.value, true);
      } catch (_) {
        $("#appearance-status").textContent =
          "Тема не сохранена: хранилище недоступно.";
      }
    };
    $("#appearance-image").onchange = async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) return;
        $("#appearance-status").textContent =
          "Подготавливаю фото на устройстве…";
        const image = await resizePhoto(file);
        store.set({ ...store.get(), wallpaper: "image", image });
        apply();
        $("#appearance-wallpaper").value = "image";
        $("#appearance-status").textContent =
          "Фото сохранено на этом устройстве.";
      } catch (error) {
        $("#appearance-status").textContent = error.message;
      }
    };
    $("#appearance-reset").onclick = () => {
      if (
        !confirm("Сбросить оформление? ДЗ, расписание и избранное останутся.")
      )
        return;
      try {
        store.set(defaults);
        apply();
        render();
        $("#appearance-status").textContent =
          "Оформление сброшено. Остальные данные сохранены.";
      } catch (error) {
        $("#appearance-status").textContent = error.message;
      }
    };
  }
  apply();
  api.appearance = { render, apply, get: store.get };
})();
