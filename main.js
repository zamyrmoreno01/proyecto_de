const searchForm = document.getElementById("searchForm");
const familyIdInput = document.getElementById("familyIdInput");
const familyResults = document.getElementById("familyResults");
const resultsStatus = document.getElementById("resultsStatus");

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const personId = familyIdInput.value.trim();
    renderFamilyContent(personId);
  });
}

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
      img.alt = item.name || "Imagen familiar";
      card.appendChild(img);
    } else if (item.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = item.dataUrl;
      video.controls = true;
      card.appendChild(video);
    }

    const caption = document.createElement("p");
    caption.textContent = item.name || "Archivo";
    card.appendChild(caption);
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
