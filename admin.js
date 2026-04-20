const createIdForm = document.getElementById("createIdForm");
const newPersonIdInput = document.getElementById("newPersonId");
const personNameInput = document.getElementById("personName");
const createIdMessage = document.getElementById("createIdMessage");
const createIdError = document.getElementById("createIdError");
const uploadForm = document.getElementById("uploadForm");
const personIdInput = document.getElementById("personId");
const filesInput = document.getElementById("mediaFiles");
const eventNameInput = document.getElementById("eventName");
const eventDateInput = document.getElementById("eventDate");
const contentNoteInput = document.getElementById("contentNote");
const uploadDrop = document.querySelector(".upload-drop");
const uploadPreview = document.getElementById("uploadPreview");
const uploadPreviewMedia = document.getElementById("uploadPreviewMedia");
const uploadPreviewName = document.getElementById("uploadPreviewName");
const uploadPreviewMeta = document.getElementById("uploadPreviewMeta");
const uploadProgress = document.getElementById("uploadProgress");
const uploadProgressSummary = document.getElementById("uploadProgressSummary");
const uploadChecklist = document.getElementById("uploadChecklist");
const uploadMessage = document.getElementById("uploadMessage");
const uploadError = document.getElementById("uploadError");
const adminGallery = document.getElementById("adminGallery");
const idSearchInput = document.getElementById("idSearch");
const logoutBtn = document.getElementById("logoutBtn");
const MAX_MP4_DURATION_SECONDS = 1800;
const MAX_MP4_SIZE_BYTES = 1.5 * 1024 * 1024 * 1024;
let uploadPreviewObjectUrl = "";

if (!isAdminLoggedIn()) {
  window.location.replace("./login.html");
}

logoutBtn?.addEventListener("click", () => {
  setAdminSession(false);
  window.location.href = "./index.html";
});

createIdForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessages();

  const personId = (newPersonIdInput?.value || "").trim();
  const personName = (personNameInput?.value || "").trim();

  if (!/^\d+$/.test(personId)) {
    createIdError.textContent = "El ID debe ser numérico.";
    return;
  }

  if (!personName) {
    createIdError.textContent = "El nombre es obligatorio para crear el ID.";
    return;
  }

  const db = getAdminDatabase();

  if (db[personId]) {
    createIdError.textContent = "Ese ID ya existe.";
    return;
  }

  db[personId] = {
    id: personId,
    name: personName,
    media: []
  };

  saveAdminDatabase(db);
  createIdForm.reset();
  createIdMessage.textContent = "ID creado correctamente.";
  populatePersonOptions(personId);
  renderAdminGallery(idSearchInput?.value.trim() || "");
});

uploadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const personId = personIdInput.value.trim();
  const eventName = eventNameInput?.value.trim() || "";
  const eventDate = eventDateInput?.value || "";
  const description = contentNoteInput?.value.trim() || "";
  const file = filesInput.files?.[0];
  const db = getAdminDatabase();
  const personRecord = db[personId];

  if (!personId) {
    uploadError.textContent = "Debes seleccionar un ID registrado.";
    return;
  }

  if (!personRecord || !personRecord.name.trim()) {
    uploadError.textContent = "El archivo debe asociarse a un ID previamente creado con nombre.";
    return;
  }

  if (!file) {
    uploadError.textContent = "Selecciona un archivo.";
    return;
  }

  if (!isAllowedFile(file)) {
    uploadError.textContent = `Archivo no válido: ${file.name}. Solo se permite MP4, JPG o PNG.`;
    return;
  }

  try {
    await validateMediaFile(file);
  } catch (error) {
    uploadError.textContent = error.message || "El archivo no cumple con las restricciones permitidas.";
    return;
  }

  if (!eventName) {
    uploadError.textContent = "El nombre del evento es obligatorio.";
    return;
  }

  if (!eventDate) {
    uploadError.textContent = "La fecha del evento es obligatoria.";
    return;
  }

  if (!description) {
    uploadError.textContent = "La descripción del evento es obligatoria.";
    return;
  }

  try {
    const mediaRecord = await fileToMediaRecord(file, {
      eventName,
      eventDate,
      description
    });

    personRecord.media = Array.isArray(personRecord.media) ? personRecord.media : [];
    personRecord.media.push(mediaRecord);
    db[personId] = personRecord;
    saveAdminDatabase(db);

    uploadForm.reset();
    personIdInput.value = personId;
    uploadMessage.textContent = "Contenido guardado correctamente.";
    updateUploadDropState();
    renderAdminGallery(idSearchInput?.value.trim() || "");
  } catch (error) {
    uploadError.textContent = "No se pudo procesar el archivo.";
  }
});
idSearchInput?.addEventListener("input", () => {
  renderAdminGallery(idSearchInput.value.trim());
});

filesInput?.addEventListener("change", () => {
  updateUploadDropState();
});

personIdInput?.addEventListener("change", () => {
  updateUploadDropState();
});

eventNameInput?.addEventListener("input", () => {
  updateUploadDropState();
});

eventDateInput?.addEventListener("change", () => {
  updateUploadDropState();
});

contentNoteInput?.addEventListener("input", () => {
  updateUploadDropState();
});

uploadForm?.addEventListener("reset", () => {
  window.setTimeout(() => {
    updateUploadDropState();
  }, 0);
});

function clearMessages() {
  if (createIdMessage) createIdMessage.textContent = "";
  if (createIdError) createIdError.textContent = "";
  if (uploadMessage) uploadMessage.textContent = "";
  if (uploadError) uploadError.textContent = "";
}

function populatePersonOptions(selectedId = "") {
  if (!personIdInput) return;

  const db = getAdminDatabase();
  const entries = Object.values(db)
    .filter((entry) => entry && typeof entry.name === "string" && entry.name.trim())
    .sort((a, b) => String(a.id).localeCompare(String(b.id), "es"));

  personIdInput.innerHTML = '<option value="">Selecciona un ID con nombre</option>';

  entries.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${entry.id} - ${entry.name}`;
    option.selected = entry.id === selectedId;
    personIdInput.appendChild(option);
  });

  updateUploadDropState();
}

function updateUploadDropState() {
  const selectedFile = filesInput?.files?.[0] || null;
  const checklistItems = [
    {
      label: "Seleccionar un ID registrado",
      complete: Boolean(personIdInput?.value.trim())
    },
    {
      label: "Seleccionar un archivo multimedia",
      complete: Boolean(selectedFile)
    },
    {
      label: "Agregar nombre del evento",
      complete: Boolean(eventNameInput?.value.trim())
    },
    {
      label: "Agregar fecha del evento",
      complete: Boolean(eventDateInput?.value)
    },
    {
      label: "Agregar descripcion del evento",
      complete: Boolean(contentNoteInput?.value.trim())
    }
  ];

  renderUploadPreview(selectedFile);
  renderUploadChecklist(checklistItems);
}

function renderUploadPreview(file) {
  if (!uploadPreview || !uploadPreviewMedia || !uploadPreviewName || !uploadPreviewMeta) {
    return;
  }

  clearUploadPreviewObjectUrl();
  uploadPreviewMedia.replaceChildren();

  if (!file) {
    uploadPreview.classList.add("is-empty");
    uploadPreviewName.textContent = "Aun no hay archivo multimedia";
    uploadPreviewMeta.textContent = "Selecciona una imagen o un video para ver la previsualizacion aqui.";
    uploadPreviewMedia.appendChild(createUploadPreviewPlaceholder("Sin archivo seleccionado"));
    return;
  }

  uploadPreview.classList.remove("is-empty");
  uploadPreviewName.textContent = file.name;
  uploadPreviewMeta.textContent = `${getUploadFileLabel(file.type)} - ${formatReadableFileSize(file.size)}`;

  if (!isAllowedFile(file)) {
    uploadPreviewMedia.appendChild(createUploadPreviewPlaceholder("Formato no compatible"));
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  uploadPreviewObjectUrl = objectUrl;

  if (file.type.startsWith("image/")) {
    const image = document.createElement("img");
    image.src = objectUrl;
    image.alt = file.name || "Vista previa de la imagen seleccionada";
    uploadPreviewMedia.appendChild(image);
    return;
  }

  if (file.type.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.preload = "metadata";
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-label", file.name || "Vista previa del video seleccionado");
    uploadPreviewMedia.appendChild(video);
    return;
  }

  uploadPreviewMedia.appendChild(createUploadPreviewPlaceholder("Vista previa no disponible"));
}

function renderUploadChecklist(items) {
  if (!uploadChecklist || !uploadProgressSummary || !uploadProgress) {
    return;
  }

  uploadChecklist.replaceChildren();

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.className = `upload-checklist-item ${item.complete ? "is-complete" : "is-pending"}`;

    const mark = document.createElement("span");
    mark.className = "upload-checklist-mark";
    mark.textContent = item.complete ? "OK" : "-";
    mark.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = item.label;

    listItem.appendChild(mark);
    listItem.appendChild(text);
    uploadChecklist.appendChild(listItem);
  });

  const pendingItems = items.filter((item) => !item.complete);
  const isComplete = pendingItems.length === 0;

  uploadProgress.classList.toggle("is-complete", isComplete);
  uploadDrop?.classList.toggle("is-ready", isComplete);

  if (isComplete) {
    uploadProgressSummary.textContent = "Todo listo para guardar el archivo multimedia.";
    return;
  }

  uploadProgressSummary.textContent = `Faltan ${pendingItems.length} elemento${pendingItems.length === 1 ? "" : "s"} obligatorio${pendingItems.length === 1 ? "" : "s"} por completar.`;
}

function createUploadPreviewPlaceholder(message) {
  const placeholder = document.createElement("div");
  placeholder.className = "upload-preview-placeholder";
  placeholder.textContent = message;
  return placeholder;
}

function clearUploadPreviewObjectUrl() {
  if (!uploadPreviewObjectUrl) {
    return;
  }

  URL.revokeObjectURL(uploadPreviewObjectUrl);
  uploadPreviewObjectUrl = "";
}

function getUploadFileLabel(fileType) {
  if (fileType === "image/jpeg") {
    return "Imagen JPG";
  }

  if (fileType === "image/png") {
    return "Imagen PNG";
  }

  if (fileType === "video/mp4") {
    return "Video MP4";
  }

  return "Archivo";
}

function formatReadableFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** unitIndex);
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function fileToMediaRecord(file, metadata) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: generateId(),
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
        eventName: metadata.eventName,
        eventDate: metadata.eventDate,
        description: metadata.description,
        createdAt: new Date().toISOString()
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function validateMediaFile(file) {
  if (file.type !== "video/mp4") {
    return Promise.resolve();
  }

  if (file.size > MAX_MP4_SIZE_BYTES) {
    return Promise.reject(
      new Error(`El archivo MP4 supera el tamaÃ±o mÃ¡ximo permitido de ${formatFileSize(MAX_MP4_SIZE_BYTES)}.`)
    );
  }

  return getVideoDuration(file).then((durationInSeconds) => {
    if (durationInSeconds > MAX_MP4_DURATION_SECONDS) {
      throw new Error(
        `El video MP4 supera la duraciÃ³n mÃ¡xima permitida de ${formatDuration(MAX_MP4_DURATION_SECONDS)}.`
      );
    }
  });
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("No se pudo leer la duraciÃ³n del video MP4."));
        return;
      }

      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("No se pudo validar el video MP4 seleccionado."));
    };

    video.src = objectUrl;
  });
}

function renderAdminGallery(searchTerm = "") {
  if (!adminGallery) return;

  const db = getAdminDatabase();
  const records = Object.values(db).sort((a, b) => String(a.id).localeCompare(String(b.id), "es"));
  const normalizedQuery = normalizeText(searchTerm);
  adminGallery.innerHTML = "";

  if (!records.length) {
    adminGallery.innerHTML = '<p class="empty-msg">Aún no hay IDs registrados.</p>';
    return;
  }

  const filteredRecords = records.filter((record) => {
    if (!normalizedQuery) return true;
    return normalizeText(`${record.id} ${record.name}`).includes(normalizedQuery);
  });

  if (!filteredRecords.length) {
    adminGallery.innerHTML = '<p class="empty-msg">No hay resultados para la búsqueda actual.</p>';
    return;
  }

  filteredRecords.forEach((record) => {
    const personId = String(record.id);
    const personName = record.name || "Sin nombre";
    const mediaList = Array.isArray(record.media) ? record.media : [];
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

    const meta = document.createElement("p");
    meta.className = "person-meta";
    meta.innerHTML = `<strong>Nombre:</strong> ${escapeHtml(personName)}`;
    detail.appendChild(meta);

    if (!mediaList.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-msg";
      emptyState.textContent = "Este ID aún no tiene archivos cargados.";
      detail.appendChild(emptyState);
    } else {
      const grid = document.createElement("div");
      grid.className = "person-media-grid";

      mediaList.forEach((media) => {
        const card = document.createElement("div");
        card.className = "media-card";

        if (media.type.startsWith("image/")) {
          const img = document.createElement("img");
          img.src = media.dataUrl;
          img.alt = media.eventName || media.name || "Imagen";
          card.appendChild(img);
        } else if (media.type.startsWith("video/")) {
          const video = document.createElement("video");
          video.src = media.dataUrl;
          video.controls = true;
          card.appendChild(video);
        }

        const eventTitle = document.createElement("p");
        eventTitle.className = "media-title";
        eventTitle.textContent = media.eventName || media.name || "Archivo sin título";
        card.appendChild(eventTitle);

        const caption = document.createElement("p");
        caption.className = "media-caption";
        caption.textContent = (media.description || "").trim() || "Sin descripción";
        card.appendChild(caption);

        const eventDate = document.createElement("p");
        eventDate.className = "media-date";
        eventDate.textContent = `Evento: ${formatEventDate(media.eventDate)}`;
        card.appendChild(eventDate);

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
          const nextEventName = window.prompt("Modifica el nombre del evento:", media.eventName || "");
          if (nextEventName === null) return;

          const nextEventDate = window.prompt("Modifica la fecha del evento (AAAA-MM-DD):", media.eventDate || "");
          if (nextEventDate === null) return;

          const nextDescription = window.prompt("Modifica la descripción del evento:", media.description || "");
          if (nextDescription === null) return;

          if (!nextEventName.trim() || !nextEventDate.trim() || !nextDescription.trim()) {
            window.alert("Todos los datos del evento son obligatorios.");
            return;
          }

          const latest = getAdminDatabase();
          latest[personId].media = (latest[personId].media || []).map((item) => {
            if (item.id !== media.id) return item;
            return {
              ...item,
              eventName: nextEventName.trim(),
              eventDate: nextEventDate.trim(),
              description: nextDescription.trim()
            };
          });
          saveAdminDatabase(latest);
          renderAdminGallery(idSearchInput?.value.trim() || "");
        });
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "Eliminar";
        deleteBtn.addEventListener("click", () => {
          const shouldDelete = window.confirm("¿Quieres eliminar este archivo?");
          if (!shouldDelete) return;

          const latest = getAdminDatabase();
          latest[personId].media = (latest[personId].media || []).filter((item) => item.id !== media.id);
          saveAdminDatabase(latest);
          renderAdminGallery(idSearchInput?.value.trim() || "");
        });
        actions.appendChild(deleteBtn);

        card.appendChild(actions);
        grid.appendChild(card);
      });

      detail.appendChild(grid);
    }

    block.appendChild(detail);

    showMoreBtn.addEventListener("click", () => {
      const isHidden = detail.classList.contains("is-hidden");
      detail.classList.toggle("is-hidden");
      showMoreBtn.textContent = isHidden ? "Ocultar" : "Ver más";
    });

    adminGallery.appendChild(block);
  });
}

function isAllowedFile(file) {
  return ["image/jpeg", "image/png", "video/mp4"].includes(file.type);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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

function formatEventDate(rawDate) {
  if (!rawDate) return "Fecha no disponible";
  const parsedDate = new Date(`${rawDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return rawDate;
  return parsedDate.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function formatFileSize(bytes) {
  const gigabytes = bytes / (1024 * 1024 * 1024);
  return `${gigabytes.toFixed(1)} GB`;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min${seconds ? ` ${seconds} s` : ""}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

populatePersonOptions();
renderAdminGallery();
updateUploadDropState();
