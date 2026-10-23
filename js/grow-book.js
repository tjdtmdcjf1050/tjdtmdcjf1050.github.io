"use strict";
(() => {
  const query = document.querySelector("#query");
  const filters = [...document.querySelectorAll("[data-category][aria-pressed]")];
  const cards = [...document.querySelectorAll(".book-card")];
  let category = "전체";
  function filterBooks() {
    const term = query.value.trim().toLocaleLowerCase("ko");
    let count = 0;
    cards.forEach(card => {
      const match = (category === "전체" || category === card.dataset.category) &&
        (card.dataset.title + " " + card.dataset.author).toLocaleLowerCase("ko").includes(term);
      card.hidden = !match;
      if (match) count++;
    });
    document.querySelector("#result-status").textContent = count + "개의 예시 작품";
    document.querySelector("#empty").hidden = count !== 0;
  }
  filters.forEach(button => button.addEventListener("click", () => {
    category = button.dataset.category;
    filters.forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    filterBooks();
  }));
  query.addEventListener("input", filterBooks);
  document.querySelector("#search-form").addEventListener("submit", event => {
    event.preventDefault();
    filterBooks();
  });
  const reader = document.querySelector("#reader");
  let opener;
  if (typeof reader.showModal === "function") {
    document.documentElement.classList.add("reader-ready");
    document.querySelectorAll("[data-story]").forEach(link => {
      link.addEventListener("click", event => {
        event.preventDefault();
        opener = link;
        const story = document.querySelector(link.getAttribute("href"));
        document.querySelector("#reader-title").textContent = story.querySelector("h2").textContent;
        document.querySelector("#reader-category").textContent = story.querySelector(".eyebrow").textContent;
        document.querySelector("#reader-text").textContent = story.querySelector("p:last-child").textContent;
        reader.showModal();
        document.body.classList.add("reading");
        document.querySelector("#reader-title").focus();
      });
    });
    document.querySelector("#reader-close").addEventListener("click", () => reader.close());
    reader.addEventListener("close", () => {
      document.body.classList.remove("reading");
      if (opener) opener.focus();
    });
  }
  const title = document.querySelector("#draft-title");
  const body = document.querySelector("#draft-body");
  const status = document.querySelector("#draft-status");
  const key = "growbook.home.draft.v1";
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved && typeof saved.title === "string" && typeof saved.body === "string") {
      title.value = saved.title.slice(0, 100);
      body.value = saved.body.slice(0, 20000);
      status.textContent = "저장된 초안을 불러왔습니다.";
    }
  } catch {
    storageAvailable = false;
    status.textContent = "초안을 불러올 수 없습니다. 저장이 제한될 수 있습니다.";
  }
  [title, body].forEach(field => field.addEventListener("input", () => {
    status.textContent = "변경 사항이 있습니다. 초안을 저장해 주세요.";
  }));
  document.querySelector("#draft-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!title.value.trim() || !body.value.trim()) {
      status.textContent = "제목과 첫 문장을 모두 입력해 주세요.";
      (!title.value.trim() ? title : body).focus();
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify({ title: title.value, body: body.value }));
      storageAvailable = true;
      status.textContent = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) + " · 이 브라우저에 저장했습니다.";
    } catch {
      storageAvailable = false;
      status.textContent = "저장하지 못했습니다. 내용을 복사해 별도로 보관해 주세요.";
    }
  });
  window.addEventListener("beforeunload", event => {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(key) || "null"); } catch { saved = null; }
    const dirty = (title.value || body.value) && (!storageAvailable || !saved || saved.title !== title.value || saved.body !== body.value);
    if (dirty) { event.preventDefault(); event.returnValue = ""; }
  });
})();
