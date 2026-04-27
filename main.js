const searchForm = document.getElementById("searchForm");
const familyIdInput = document.getElementById("familyIdInput");
const familyResults = document.getElementById("familyResults");
const resultsStatus = document.getElementById("resultsStatus");
const resultsSection = document.getElementById("resultsSection");
const CARD_ACCENTS = ["#7b4b34", "#8d5a3e", "#a46a47", "#6a3d2a", "#8b6846"];
let resultsSectionAnimationTimer = 0;
let imagePreviewElements = null;
let lastImagePreviewTrigger = null;
let videoPreviewElements = null;
let lastVideoPreviewTrigger = null;

if (searchForm) {
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const personId = familyIdInput.value.trim();
    await renderFamilyContent(personId);
  });
}

async function renderFamilyContent(personId) {
  if (!familyResults) {
    return;
  }

  familyResults.replaceChildren();

  if (!personId) {
    updateResultsStatus("Ingresa una identificacion para ver los recuerdos disponibles.");
    return;
  }

  try {
    const payload = await fetchPublicMemories(personId);
    const personName = getPersonName(payload?.person);
    const items = Array.isArray(payload?.media) ? payload.media : [];

    if (!items.length) {
      updateResultsStatus(`No encontramos recuerdos asociados al ID "${personId}".`);
      renderEmptyMessage(`No hay contenido disponible para el ID ${personId}.`);
      highlightResultsSection();
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

    highlightResultsSection();
  } catch (error) {
    if (error?.status === 404) {
      updateResultsStatus(`No encontramos recuerdos asociados al ID "${personId}".`);
      renderEmptyMessage(`No hay contenido disponible para el ID ${personId}.`);
      highlightResultsSection();
      return;
    }

    updateResultsStatus("No se pudo consultar el backend en este momento.");
    renderEmptyMessage("La consulta no pudo completarse. Intenta nuevamente.");
    highlightResultsSection();
  }
}

function createResultCard(item, index, personId, personName) {
  const card = document.createElement("section");
  const title = (item?.eventName || item?.originalName || "Recuerdo sin titulo").trim();
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

  const actionControl = createActionControl(item, mediaLabel, title, description);
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
    baseImage.src = item.fileUrl;
    baseImage.alt = "";
    baseImage.loading = "lazy";

    const hoverImage = document.createElement("img");
    hoverImage.className = "result-media result-media-hover";
    hoverImage.src = item.fileUrl;
    hoverImage.alt = title || "Imagen del recuerdo";
    hoverImage.loading = "lazy";

    stack.appendChild(baseImage);
    stack.appendChild(hoverImage);
    return { stack };
  }

  if (item?.type?.startsWith("video/")) {
    const baseVideo = document.createElement("video");
    baseVideo.className = "result-media result-media-base result-video-cover";
    baseVideo.src = item.fileUrl;
    baseVideo.preload = "metadata";
    baseVideo.muted = true;
    baseVideo.setAttribute("playsinline", "");
    baseVideo.setAttribute("aria-hidden", "true");

    const hoverVideo = document.createElement("video");
    hoverVideo.className = "result-media result-media-hover result-video-cover";
    hoverVideo.src = item.fileUrl;
    hoverVideo.preload = "metadata";
    hoverVideo.muted = true;
    hoverVideo.setAttribute("playsinline", "");
    hoverVideo.setAttribute("aria-label", title || "Caratula del video");

    stack.appendChild(baseVideo);
    stack.appendChild(hoverVideo);
    return { stack };
  }

  const fallback = document.createElement("div");
  fallback.className = "result-media result-fallback";
  fallback.textContent = "Archivo no compatible";
  stack.appendChild(fallback);
  return { stack };
}

function createActionControl(item, mediaLabel, title, description) {
  if (item?.type?.startsWith("video/") && item?.fileUrl) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scope purchase-button";
    button.textContent = "Abrir video";

    button.addEventListener("click", () => {
      openVideoPreview(item.fileUrl, title, description, button);
    });

    return button;
  }

  if (mediaLabel === "Imagen" && item?.fileUrl) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scope purchase-button";
    button.textContent = "Ver imagen completa";

    button.addEventListener("click", () => {
      openImagePreview(item.fileUrl, title, description, button);
    });

    return button;
  }

  const actionLink = document.createElement("a");
  actionLink.href = item?.fileUrl || "#";
  actionLink.className = "scope purchase-button";
  actionLink.target = "_blank";
  actionLink.rel = "noopener noreferrer";
  actionLink.textContent = mediaLabel === "Imagen" ? "Abrir imagen" : "Abrir recuerdo";
  return actionLink;
}

function ensureImagePreviewElements() {
  if (imagePreviewElements) {
    return imagePreviewElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "image-preview";
  overlay.setAttribute("hidden", "");
  overlay.setAttribute("aria-hidden", "true");

  const dialog = document.createElement("div");
  dialog.className = "image-preview__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Vista ampliada de la imagen");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "image-preview__close";
  closeButton.setAttribute("aria-label", "Cerrar visor de imagen");
  closeButton.textContent = "Cerrar";

  const figure = document.createElement("figure");
  figure.className = "image-preview__figure";

  const image = document.createElement("img");
  image.className = "image-preview__image";
  image.alt = "";

  const caption = document.createElement("figcaption");
  caption.className = "image-preview__caption";

  figure.appendChild(image);
  figure.appendChild(caption);
  dialog.appendChild(closeButton);
  dialog.appendChild(figure);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeImagePreview();
    }
  });

  closeButton.addEventListener("click", () => {
    closeImagePreview();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeImagePreview();
    }
  });

  imagePreviewElements = { overlay, dialog, image, caption, closeButton };
  return imagePreviewElements;
}

function ensureVideoPreviewElements() {
  if (videoPreviewElements) {
    return videoPreviewElements;
  }

  const overlay = document.createElement("div");
  overlay.className = "video-preview";
  overlay.setAttribute("hidden", "");
  overlay.setAttribute("aria-hidden", "true");

  const dialog = document.createElement("div");
  dialog.className = "video-preview__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Reproductor de video");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "video-preview__close";
  closeButton.setAttribute("aria-label", "Cerrar reproductor de video");
  closeButton.textContent = "Cerrar";

  const figure = document.createElement("figure");
  figure.className = "video-preview__figure";

  const video = document.createElement("video");
  video.className = "video-preview__video";
  video.controls = true;
  video.preload = "metadata";
  video.setAttribute("playsinline", "");

  const caption = document.createElement("figcaption");
  caption.className = "video-preview__caption";

  figure.appendChild(video);
  figure.appendChild(caption);
  dialog.appendChild(closeButton);
  dialog.appendChild(figure);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeVideoPreview();
    }
  });

  closeButton.addEventListener("click", () => {
    closeVideoPreview();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeVideoPreview();
    }
  });

  videoPreviewElements = { overlay, dialog, video, caption, closeButton };
  return videoPreviewElements;
}

function openImagePreview(imageUrl, title, description, triggerElement) {
  if (!imageUrl) {
    return;
  }

  const { overlay, image, caption, closeButton } = ensureImagePreviewElements();
  const captionParts = [title, description].filter(Boolean);

  image.src = imageUrl;
  image.alt = title || "Imagen ampliada del recuerdo";
  caption.textContent = captionParts.join(" - ");
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
  document.body.classList.add("is-image-preview-open");
  lastImagePreviewTrigger = triggerElement || null;

  requestAnimationFrame(() => {
    closeButton.focus();
  });
}

function openVideoPreview(videoUrl, title, description, triggerElement) {
  if (!videoUrl) {
    return;
  }

  const { overlay, video, caption, closeButton } = ensureVideoPreviewElements();
  const captionParts = [title, description].filter(Boolean);

  video.src = videoUrl;
  video.setAttribute("aria-label", title || "Video del recuerdo");
  caption.textContent = captionParts.join(" - ");
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");
  overlay.classList.add("is-open");
  document.body.classList.add("is-video-preview-open");
  lastVideoPreviewTrigger = triggerElement || null;
  video.play().catch(() => {});

  requestAnimationFrame(() => {
    closeButton.focus();
  });
}

function closeImagePreview() {
  if (!imagePreviewElements) {
    return;
  }

  const { overlay, image, caption } = imagePreviewElements;

  if (overlay.hidden) {
    return;
  }

  overlay.classList.remove("is-open");
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-image-preview-open");
  image.removeAttribute("src");
  image.alt = "";
  caption.textContent = "";

  if (lastImagePreviewTrigger instanceof HTMLElement) {
    lastImagePreviewTrigger.focus();
  }

  lastImagePreviewTrigger = null;
}

function closeVideoPreview() {
  if (!videoPreviewElements) {
    return;
  }

  const { overlay, video, caption } = videoPreviewElements;

  if (overlay.hidden) {
    return;
  }

  overlay.classList.remove("is-open");
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-video-preview-open");
  video.pause();
  video.removeAttribute("src");
  video.removeAttribute("aria-label");
  video.load();
  caption.textContent = "";

  if (lastVideoPreviewTrigger instanceof HTMLElement) {
    lastVideoPreviewTrigger.focus();
  }

  lastVideoPreviewTrigger = null;
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

function highlightResultsSection() {
  if (!resultsSection) {
    return;
  }

  window.clearTimeout(resultsSectionAnimationTimer);
  resultsSection.classList.remove("is-transitioning");
  void resultsSection.offsetWidth;
  resultsSection.classList.add("is-transitioning");

  requestAnimationFrame(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultsSection.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });
  });

  resultsSectionAnimationTimer = window.setTimeout(() => {
    resultsSection.classList.remove("is-transitioning");
  }, 950);
}

updateResultsStatus("Ingresa una identificacion para ver los recuerdos disponibles.");
