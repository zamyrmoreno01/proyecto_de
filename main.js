const searchForm = document.getElementById("searchForm");
const familyIdInput = document.getElementById("familyIdInput");
const familyResults = document.getElementById("familyResults");
const resultsStatus = document.getElementById("resultsStatus");
const CARD_ACCENTS = ["#9b513a", "#4e8397", "#c56a45", "#2f6f8f", "#7a7055"];

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const personId = familyIdInput.value.trim();
    renderFamilyContent(personId);
  });
}

/*
function renderFamilyContent(personId) {
  familyResults.innerHTML = "";
  if (!personId) {
    updateResultsStatus("Ingresa una identificación para ver los recuerdos disponibles.");
    return;
  }

  const database = getMediaDatabase();
  const items = database[personId] || [];

  if (!items.length) {
    updateResultsStatus(`No encontramos recuerdos asociados a la identificación "${personId}".`);
    familyResults.innerHTML = `<p class="empty-msg">No hay contenido para la identificación "${escapeHtml(personId)}".</p>`;
    return;
  }

  updateResultsStatus(
    `Mostrando ${items.length} recuerdo${items.length === 1 ? "" : "s"} para la identificación "${personId}".`
  );

  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "media-card is-entering";
    card.style.animationDelay = `${index * 90}ms`;

    if (item.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = item.dataUrl;
      img.alt = item.eventName || item.name || "Imagen familiar";
      card.appendChild(img);
    } else if (item.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = item.dataUrl;
      video.controls = true;
      card.appendChild(video);
    }

    const caption = document.createElement("p");
    caption.textContent = item.eventName || item.name || "Archivo";
    card.appendChild(caption);

    if (item.eventDate || item.description) {
      const detail = document.createElement("p");
      const detailParts = [];

      if (item.eventDate) {
        detailParts.push(`Fecha: ${item.eventDate}`);
      }

      if (item.description) {
        detailParts.push(item.description);
      }

      detail.textContent = detailParts.join(" | ");
      card.appendChild(detail);
    }

    familyResults.appendChild(card);

    card.addEventListener(
      "animationend",
      () => {
        card.classList.remove("is-entering");
        card.style.animationDelay = "";
      },
      { once: true }
    );
  });
}

function updateResultsStatus(message) {
  if (resultsStatus) {
    resultsStatus.textContent = message;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
*/

function renderFamilyContent(personId) {
  if (!familyResults) {
    return;
  }

  familyResults.replaceChildren();

  if (!personId) {
    updateResultsStatus("Ingresa una identificacion para ver los recuerdos disponibles.");
    return;
  }

  const database = getAdminDatabase();
  const personRecord = database[personId];
  const personName = getPersonName(personRecord);
  const items = personRecord && Array.isArray(personRecord.media) ? personRecord.media : [];

  if (!items.length) {
    updateResultsStatus(`No encontramos recuerdos asociados al ID "${personId}".`);
    renderEmptyMessage(`No hay contenido disponible para el ID ${personId}.`);
    return;
  }

  updateResultsStatus(buildResultsStatus(items.length, personId, personName));

  items.forEach((item, index) => {
    const card = createResultCard(item, index, personId, personName);
    familyResults.appendChild(card);

    card.addEventListener(
      "animationend",
      () => {
        card.classList.remove("is-entering");
        card.style.animationDelay = "";
      },
      { once: true }
    );
  });
}

function createResultCard(item, index, personId, personName) {
  const card = document.createElement("section");
  const title = (item?.eventName || item?.name || "Recuerdo sin titulo").trim();
  const mediaLabel = getMediaLabel(item?.type);
  const description = (item?.description || "Este recuerdo aun no tiene una descripcion registrada.").trim();
  const mediaContent = createThumbnail(item, title, mediaLabel);

  card.className = "_card is-entering";
  card.style.animationDelay = `${index * 90}ms`;
  card.style.setProperty("--product-card--accent", CARD_ACCENTS[index % CARD_ACCENTS.length]);

  const heading = document.createElement("h2");
  heading.className = "_heading -fluid-text -trim-both";
  heading.textContent = title;

  const category = document.createElement("p");
  category.className = "_category -trim-both";
  category.textContent = personName || `Familiar ID ${personId}`;

  const eventDate = document.createElement("p");
  eventDate.className = "_price -trim-both";
  eventDate.textContent = formatEventDate(item?.eventDate);

  const descriptionNode = document.createElement("p");
  descriptionNode.className = "_description";
  descriptionNode.textContent = description;

  const buttonWrap = document.createElement("div");
  buttonWrap.className = "_button";
  buttonWrap.style.setProperty("--purchase-button--background", "var(--_accent)");
  buttonWrap.style.setProperty("--purchase-button--foreground", "var(--_accent-contrast)");

  const actionControl = createActionControl(item, mediaLabel, mediaContent.video);
  buttonWrap.appendChild(actionControl);

  const contentPanel = document.createElement("div");
  contentPanel.className = "_content-panel";

  const copyPanel = document.createElement("div");
  copyPanel.className = "_copy-panel";

  const contentHead = document.createElement("div");
  contentHead.className = "_content-head";
  contentHead.appendChild(heading);
  contentHead.appendChild(eventDate);

  copyPanel.appendChild(contentHead);
  copyPanel.appendChild(descriptionNode);

  contentPanel.appendChild(copyPanel);
  contentPanel.appendChild(buttonWrap);

  card.appendChild(mediaContent.stack);
  card.appendChild(category);
  card.appendChild(contentPanel);

  return card;
}

function createThumbnail(item, title, mediaLabel) {
  const stack = document.createElement("div");
  stack.className = "_thumbnail-stack";
  stack.dataset.mediaLabel = mediaLabel;

  if (item?.type?.startsWith("image/")) {
    const baseImage = document.createElement("img");
    baseImage.className = "result-media result-media-base";
    baseImage.src = item.dataUrl;
    baseImage.alt = "";
    baseImage.loading = "lazy";

    const hoverImage = document.createElement("img");
    hoverImage.className = "result-media result-media-hover";
    hoverImage.src = item.dataUrl;
    hoverImage.alt = title || "Imagen del recuerdo";
    hoverImage.loading = "lazy";

    stack.appendChild(baseImage);
    stack.appendChild(hoverImage);
    return { stack, video: null };
  }

  if (item?.type?.startsWith("video/")) {
    const video = document.createElement("video");
    video.className = "result-media result-video is-idle";
    video.src = item.dataUrl;
    video.controls = true;
    video.preload = "metadata";
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-label", title || "Video del recuerdo");
    stack.appendChild(video);
    return { stack, video };
  }

  const fallback = document.createElement("div");
  fallback.className = "result-media result-fallback";
  fallback.textContent = "Archivo no compatible";
  stack.appendChild(fallback);
  return { stack, video: null };
}

function createActionControl(item, mediaLabel, videoElement) {
  if (videoElement) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scope purchase-button";
    button.textContent = "Abrir video";
    setupVideoPlayback(button, videoElement);
    return button;
  }

  const actionLink = document.createElement("a");
  actionLink.href = item?.dataUrl || "#";
  actionLink.className = "scope purchase-button";
  actionLink.target = "_blank";
  actionLink.rel = "noopener noreferrer";
  actionLink.textContent = mediaLabel === "Imagen" ? "Abrir imagen" : "Abrir recuerdo";
  return actionLink;
}

function setupVideoPlayback(button, video) {
  syncVideoPresentation(video, button);

  button.addEventListener("click", () => {
    if (video.paused || video.ended) {
      if (video.ended) {
        video.currentTime = 0;
      }

      video.play().catch(() => {
        syncVideoPresentation(video, button);
      });
      return;
    }

    video.pause();
  });

  video.addEventListener("play", () => {
    syncVideoPresentation(video, button);
  });

  video.addEventListener("pause", () => {
    syncVideoPresentation(video, button);
  });

  video.addEventListener("ended", () => {
    video.currentTime = 0;
    syncVideoPresentation(video, button);
  });
}

function syncVideoPresentation(video, button) {
  const isPlaying = !video.paused && !video.ended;

  video.classList.toggle("is-playing", isPlaying);
  video.classList.toggle("is-idle", !isPlaying);
  button.textContent = isPlaying ? "Pausar video" : "Abrir video";
}

function renderEmptyMessage(message) {
  if (!familyResults) {
    return;
  }

  const emptyMessage = document.createElement("p");
  emptyMessage.className = "empty-msg";
  emptyMessage.textContent = message;
  familyResults.appendChild(emptyMessage);
}

function updateResultsStatus(message) {
  if (resultsStatus) {
    resultsStatus.textContent = message;
  }
}

function buildResultsStatus(totalItems, personId, personName) {
  const memoriesLabel = `${totalItems} recuerdo${totalItems === 1 ? "" : "s"}`;

  if (personName) {
    return `Mostrando ${memoriesLabel} de ${personName} para el ID "${personId}".`;
  }

  return `Mostrando ${memoriesLabel} para el ID "${personId}".`;
}

function getPersonName(personRecord) {
  if (!personRecord || typeof personRecord.name !== "string") {
    return "";
  }

  return personRecord.name.trim();
}

function getMediaLabel(type) {
  if (typeof type === "string" && type.startsWith("video/")) {
    return "Video";
  }

  if (typeof type === "string" && type.startsWith("image/")) {
    return "Imagen";
  }

  return "Archivo";
}

function formatEventDate(rawDate) {
  if (!rawDate) {
    return "Sin fecha";
  }

  const parsedDate = new Date(`${rawDate}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawDate;
  }

  return parsedDate.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

updateResultsStatus("Ingresa una identificacion para ver los recuerdos disponibles.");
