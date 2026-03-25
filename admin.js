const uploadForm = document.getElementById("uploadForm");
const personIdInput = document.getElementById("personId");
const filesInput = document.getElementById("mediaFiles");
const contentNoteInput = document.getElementById("contentNote");
const uploadMessage = document.getElementById("uploadMessage");
const uploadError = document.getElementById("uploadError");
const adminGallery = document.getElementById("adminGallery");
const logoutBtn = document.getElementById("logoutBtn");

if (!isAdminLoggedIn()) {
  window.location.replace("./login.html");
}

logoutBtn?.addEventListener("click", () => {
  setAdminSession(false);
  window.location.href = "./index.html";
});

uploadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  uploadMessage.textContent = "";
  uploadError.textContent = "";

  const personId = personIdInput.value.trim();
  const note = contentNoteInput?.value.trim() || "";
  const files = Array.from(filesInput.files || []);

  if (!personId) {
    uploadError.textContent = "La identificación es obligatoria.";
    return;
  }

  if (!files.length) {
    uploadError.textContent = "Selecciona al menos un archivo.";
    return;
  }

  const invalidFile = files.find(
    (file) => !file.type.startsWith("image/") && !file.type.startsWith("video/")
  );

  if (invalidFile) {
    uploadError.textContent = `Archivo no válido: ${invalidFile.name}`;
    return;
  }

  try {
    const convertedFiles = await Promise.all(files.map((file) => fileToMediaRecord(file, note)));
    const db = getMediaDatabase();
    if (!Array.isArray(db[personId])) {
      db[personId] = [];
    }

    db[personId].push(...convertedFiles);
    saveMediaDatabase(db);

    uploadMessage.textContent = "Contenido guardado correctamente.";
    uploadForm.reset();
    renderAdminGallery();
  } catch (error) {
    uploadError.textContent = "No se pudo procesar los archivos.";
  }
});

function fileToMediaRecord(file, description) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: generateId(),
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
        description,
        createdAt: new Date().toISOString()
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function renderAdminGallery() {
  const db = getMediaDatabase();
  const personIds = Object.keys(db).sort();
  adminGallery.innerHTML = "";

  if (!personIds.length) {
    adminGallery.innerHTML = '<p class="empty-msg">Aún no hay contenido registrado.</p>';
    return;
  }

  personIds.forEach((personId) => {
    const mediaList = Array.isArray(db[personId]) ? db[personId] : [];
    const block = document.createElement("article");
    block.className = "person-block";

    const header = document.createElement("div");
    header.className = "person-header";

    const title = document.createElement("h3");
    title.textContent = `ID: ${personId}`;
    header.appendChild(title);

    const tools = document.createElement("div");
    tools.className = "person-tools";

    const count = document.createElement("span");
    count.className = "person-count";
    count.textContent = `${mediaList.length} archivo${mediaList.length === 1 ? "" : "s"}`;
    tools.appendChild(count);

    const showMoreBtn = document.createElement("button");
    showMoreBtn.className = "show-more-btn";
    showMoreBtn.type = "button";
    showMoreBtn.textContent = "Ver más";
    tools.appendChild(showMoreBtn);
    header.appendChild(tools);
    block.appendChild(header);

    const detail = document.createElement("div");
    detail.className = "person-detail is-hidden";

    const grid = document.createElement("div");
    grid.className = "person-media-grid";

    mediaList.forEach((media) => {
      const card = document.createElement("div");
      card.className = "media-card";

      if (media.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = media.dataUrl;
        img.alt = media.name;
        card.appendChild(img);
      } else if (media.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = media.dataUrl;
        video.controls = true;
        card.appendChild(video);
      }

      const caption = document.createElement("p");
      caption.className = "media-caption";
      caption.textContent = (media.description || "").trim() || "Sin descripción";
      card.appendChild(caption);

      const uploadedAt = document.createElement("p");
      uploadedAt.className = "media-date";
      uploadedAt.textContent = `Subido: ${formatDate(media.createdAt)}`;
      card.appendChild(uploadedAt);

      const actions = document.createElement("div");
      actions.className = "media-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "edit-btn";
      editBtn.textContent = "Modificar";
      editBtn.addEventListener("click", () => {
        const currentText = (media.description || "").trim();
        const nextText = window.prompt("Modifica el texto del archivo:", currentText);
        if (nextText === null) {
          return;
        }
        const latest = getMediaDatabase();
        latest[personId] = (latest[personId] || []).map((item) => {
          if (item.id !== media.id) return item;
          return {
            ...item,
            description: nextText.trim()
          };
        });
        saveMediaDatabase(latest);
        renderAdminGallery();
      });
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Eliminar";
      deleteBtn.addEventListener("click", () => {
        const shouldDelete = window.confirm("¿Quieres eliminar este archivo?");
        if (!shouldDelete) {
          return;
        }
        const latest = getMediaDatabase();
        latest[personId] = (latest[personId] || []).filter((item) => item.id !== media.id);
        if (!latest[personId].length) {
          delete latest[personId];
        }
        saveMediaDatabase(latest);
        renderAdminGallery();
      });

      actions.appendChild(deleteBtn);
      card.appendChild(actions);
      grid.appendChild(card);
    });

    detail.appendChild(grid);
    block.appendChild(detail);

    showMoreBtn.addEventListener("click", () => {
      const isHidden = detail.classList.contains("is-hidden");
      detail.classList.toggle("is-hidden");
      showMoreBtn.textContent = isHidden ? "Ocultar" : "Ver más";
    });

    adminGallery.appendChild(block);
  });
}

renderAdminGallery();

function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatDate(isoDate) {
  if (!isoDate) return "Fecha no disponible";
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return "Fecha no disponible";
  return parsedDate.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
