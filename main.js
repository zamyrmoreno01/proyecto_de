const searchForm = document.getElementById("searchForm");
const familyIdInput = document.getElementById("familyIdInput");
const familyResults = document.getElementById("familyResults");
const resultsStatus = document.getElementById("resultsStatus");
const searchButton = searchForm ? searchForm.querySelector(".search-button") : null;
const resultsSection = document.querySelector(".results-section");
const resultsShell = document.querySelector(".results-shell");
const CARD_ACCENTS = ["#8B5E3C"];
const SEARCH_TRANSITION_OUT_MS = 220;
const SEARCH_TRANSITION_IN_MS = 520;
const IMAGE_VIEWER_CLOSE_MS = 220;
const reduceMotionQuery =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

let activeSearchTransitionToken = 0;
let pendingSearchRenderTimer = 0;
let pendingSearchCleanupTimer = 0;
let imageViewerRefs = null;
let imageViewerLastTrigger = null;
let pendingImageViewerHideTimer = 0;

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const personId = familyIdInput.value.trim();
    runSearchTransition(personId);
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

function runSearchTransition(personId) {
  const shouldAnimate = shouldAnimateSearchTransition();
  const searchToken = ++activeSearchTransitionToken;

  clearSearchTransitionTimers();
  resetResultsTransitionClasses();
  setSearchPendingState(true);

  if (personId) {
    updateResultsStatus(`Buscando recuerdos para el ID "${personId}"...`);
  }

  if (!resultsShell || !shouldAnimate) {
    renderAndRevealSearchResults(personId, shouldAnimate, searchToken);
    return;
  }

  void resultsShell.offsetWidth;
  resultsShell.classList.add("is-transitioning-out");

  pendingSearchRenderTimer = window.setTimeout(() => {
    if (searchToken !== activeSearchTransitionToken) {
      return;
    }

    renderAndRevealSearchResults(personId, shouldAnimate, searchToken);
  }, SEARCH_TRANSITION_OUT_MS);
}

function renderAndRevealSearchResults(personId, shouldAnimate, searchToken) {
  renderFamilyContent(personId);
  scrollResultsIntoView(shouldAnimate);

  if (!resultsShell || !shouldAnimate) {
    setSearchPendingState(false);
    return;
  }

  resultsShell.classList.remove("is-transitioning-out");
  resultsShell.classList.add("is-transitioning-in");

  pendingSearchCleanupTimer = window.setTimeout(() => {
    if (searchToken !== activeSearchTransitionToken) {
      return;
    }

    resetResultsTransitionClasses();
    setSearchPendingState(false);
  }, SEARCH_TRANSITION_IN_MS);
}

function clearSearchTransitionTimers() {
  if (pendingSearchRenderTimer) {
    window.clearTimeout(pendingSearchRenderTimer);
    pendingSearchRenderTimer = 0;
  }

  if (pendingSearchCleanupTimer) {
    window.clearTimeout(pendingSearchCleanupTimer);
    pendingSearchCleanupTimer = 0;
  }
}

function resetResultsTransitionClasses() {
  if (!resultsShell) {
    return;
  }

  resultsShell.classList.remove("is-transitioning-out", "is-transitioning-in");
}

function setSearchPendingState(isSearching) {
  if (searchForm) {
    searchForm.classList.toggle("is-searching", isSearching);
    searchForm.setAttribute("aria-busy", String(isSearching));
  }

  if (searchButton) {
    searchButton.classList.toggle("is-loading", isSearching);
    searchButton.textContent = isSearching ? "Buscando..." : "Buscar";
  }
}

function scrollResultsIntoView(shouldAnimate) {
  if (!resultsSection) {
    return;
  }

  window.requestAnimationFrame(() => {
    resultsSection.scrollIntoView({
      behavior: shouldAnimate ? "smooth" : "auto",
      block: "start"
    });
  });
}

function shouldAnimateSearchTransition() {
  return !(reduceMotionQuery && reduceMotionQuery.matches);
}

function createResultCard(item, index, personId, personName) {
  const card = document.createElement("section");
  const title = (item?.eventName || item?.name || "Recuerdo sin titulo").trim();
  const mediaLabel = getMediaLabel(item?.type);
  const description = (item?.description || "Este recuerdo aun no tiene una descripcion registrada.").trim();
  const safePersonId = String(personId || "resultado").replace(/[^a-zA-Z0-9_-]/g, "-");
  const headingId = `memory-title-${safePersonId}-${index}`;
  const descriptionId = `${headingId}-description`;
  const mediaContent = createThumbnail(item, title, mediaLabel);

  card.className = "_card is-entering";
  card.style.animationDelay = `${index * 90}ms`;
  card.style.setProperty("--product-card--accent", CARD_ACCENTS[index % CARD_ACCENTS.length]);
  card.setAttribute("aria-labelledby", headingId);
  card.setAttribute("aria-describedby", descriptionId);

  const heading = document.createElement("h2");
  heading.className = "_heading -fluid-text -trim-both";
  heading.id = headingId;
  heading.textContent = title;

  const category = document.createElement("p");
  category.className = "_category -trim-both";
  category.textContent = personName || `Familiar ID ${personId}`;

  const eventDate = document.createElement("p");
  eventDate.className = "_price -trim-both";
  eventDate.textContent = formatEventDate(item?.eventDate);

  const descriptionNode = document.createElement("p");
  descriptionNode.className = "_description";
  descriptionNode.id = descriptionId;
  descriptionNode.textContent = description;

  const buttonWrap = document.createElement("div");
  buttonWrap.className = "_button";

  const actionControl = createActionControl(item, mediaLabel, mediaContent.video, title);
  buttonWrap.appendChild(actionControl);

  const contentPanel = document.createElement("div");
  contentPanel.className = "_content-panel";

  const copyPanel = document.createElement("div");
  copyPanel.className = "_copy-panel";

  const contentHead = document.createElement("div");
  contentHead.className = "_content-head";
  contentHead.appendChild(eventDate);
  contentHead.appendChild(heading);

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
    const image = document.createElement("img");
    image.className = "result-media result-media-image";
    image.src = item.dataUrl;
    image.alt = title || "Imagen del recuerdo";
    image.loading = "lazy";

    stack.appendChild(image);
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
  fallback.textContent = "Contenido no disponible";
  stack.appendChild(fallback);
  return { stack, video: null };
}

function createActionControl(item, mediaLabel, videoElement, title) {
  if (videoElement) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scope purchase-button";
    button.dataset.mediaControl = "video";
    button.dataset.eventTitle = title || "este recuerdo";
    button.setAttribute("aria-label", buildVideoActionLabel(title, false));
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Abrir video";
    setupVideoPlayback(button, videoElement);
    return button;
  }

  if (typeof item?.type === "string" && item.type.startsWith("image/")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scope purchase-button";
    button.dataset.mediaControl = "image";
    button.textContent = "Abrir imagen";
    button.setAttribute("aria-label", `Abrir imagen del evento ${title || "recuerdo"} en una ventana`);
    button.addEventListener("click", () => {
      openImageViewer(item?.dataUrl, title);
    });
    return button;
  }

  const actionLink = document.createElement("a");
  actionLink.href = item?.dataUrl || "#";
  actionLink.className = "scope purchase-button";
  actionLink.target = "_blank";
  actionLink.rel = "noopener noreferrer";
  actionLink.textContent = mediaLabel === "Imagen" ? "Abrir imagen" : "Abrir recuerdo";
  actionLink.setAttribute(
    "aria-label",
    `Abrir ${mediaLabel.toLowerCase()} del evento ${title || "recuerdo"} en una nueva ventana`
  );
  return actionLink;
}

function ensureImageViewer() {
  if (imageViewerRefs || !document.body) {
    return imageViewerRefs;
  }

  const viewer = document.createElement("div");
  viewer.className = "image-viewer";
  viewer.hidden = true;
  viewer.setAttribute("aria-hidden", "true");

  const dialog = document.createElement("div");
  dialog.className = "image-viewer__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "imageViewerTitle");

  const header = document.createElement("div");
  header.className = "image-viewer__header";

  const copy = document.createElement("div");
  copy.className = "image-viewer__copy";

  const eyebrow = document.createElement("p");
  eyebrow.className = "image-viewer__eyebrow";
  eyebrow.textContent = "Vista previa";

  const titleNode = document.createElement("h3");
  titleNode.className = "image-viewer__title";
  titleNode.id = "imageViewerTitle";
  titleNode.textContent = "Imagen del recuerdo";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "image-viewer__close";
  closeButton.setAttribute("aria-label", "Cerrar visor de imagen");
  closeButton.textContent = "Cerrar";

  const frame = document.createElement("div");
  frame.className = "image-viewer__frame";

  const image = document.createElement("img");
  image.className = "image-viewer__image";
  image.alt = "Imagen del recuerdo";

  copy.appendChild(eyebrow);
  copy.appendChild(titleNode);
  header.appendChild(copy);
  header.appendChild(closeButton);
  frame.appendChild(image);
  dialog.appendChild(header);
  dialog.appendChild(frame);
  viewer.appendChild(dialog);
  document.body.appendChild(viewer);

  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) {
      closeImageViewer();
    }
  });

  closeButton.addEventListener("click", () => {
    closeImageViewer();
  });

  imageViewerRefs = {
    viewer,
    dialog,
    closeButton,
    titleNode,
    image
  };

  return imageViewerRefs;
}

function openImageViewer(imageSrc, title) {
  if (!imageSrc) {
    return;
  }

  const viewer = ensureImageViewer();

  if (!viewer) {
    return;
  }

  if (pendingImageViewerHideTimer) {
    window.clearTimeout(pendingImageViewerHideTimer);
    pendingImageViewerHideTimer = 0;
  }

  imageViewerLastTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  viewer.titleNode.textContent = title || "Imagen del recuerdo";
  viewer.image.src = imageSrc;
  viewer.image.alt = title || "Imagen del recuerdo";
  viewer.viewer.hidden = false;
  viewer.viewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("image-viewer-open");
  document.addEventListener("keydown", handleImageViewerKeydown);

  window.requestAnimationFrame(() => {
    viewer.viewer.classList.add("is-open");
    viewer.closeButton.focus();
  });
}

function closeImageViewer(options = {}) {
  const { restoreFocus = true } = options;

  if (!imageViewerRefs || imageViewerRefs.viewer.hidden) {
    return;
  }

  if (pendingImageViewerHideTimer) {
    window.clearTimeout(pendingImageViewerHideTimer);
    pendingImageViewerHideTimer = 0;
  }

  imageViewerRefs.viewer.classList.remove("is-open");
  imageViewerRefs.viewer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("image-viewer-open");
  document.removeEventListener("keydown", handleImageViewerKeydown);

  const hideDelay = shouldAnimateSearchTransition() ? IMAGE_VIEWER_CLOSE_MS : 0;

  pendingImageViewerHideTimer = window.setTimeout(() => {
    if (!imageViewerRefs) {
      return;
    }

    imageViewerRefs.viewer.hidden = true;
    imageViewerRefs.image.removeAttribute("src");

    if (restoreFocus && imageViewerLastTrigger && imageViewerLastTrigger.isConnected) {
      imageViewerLastTrigger.focus();
    }

    imageViewerLastTrigger = null;
    pendingImageViewerHideTimer = 0;
  }, hideDelay);
}

function handleImageViewerKeydown(event) {
  if (event.key === "Escape") {
    closeImageViewer();
  }
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
  const eventTitle = button.dataset.eventTitle || "este recuerdo";

  video.classList.toggle("is-playing", isPlaying);
  video.classList.toggle("is-idle", !isPlaying);
  button.textContent = isPlaying ? "Pausar video" : "Abrir video";
  button.setAttribute("aria-label", buildVideoActionLabel(eventTitle, isPlaying));
  button.setAttribute("aria-pressed", String(isPlaying));
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

function buildVideoActionLabel(title, isPlaying) {
  const action = isPlaying ? "Pausar" : "Abrir";
  return `${action} video del evento ${title || "recuerdo"}`;
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
