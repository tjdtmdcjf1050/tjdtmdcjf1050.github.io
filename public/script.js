(() => {
  "use strict";

  const body = document.body;
  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector("[data-menu-button]");
  const navigation = document.querySelector("[data-navigation]");
  const navigationLinks = navigation?.querySelectorAll("a") ?? [];

  const closeMenu = () => {
    if (!(menuButton instanceof HTMLButtonElement) || !navigation) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.querySelector(".sr-only").textContent = "메뉴 열기";
    navigation.classList.remove("is-open");
    body.classList.remove("menu-open");
  };

  const toggleMenu = () => {
    if (!(menuButton instanceof HTMLButtonElement) || !navigation) return;
    const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(willOpen));
    menuButton.querySelector(".sr-only").textContent = willOpen
      ? "메뉴 닫기"
      : "메뉴 열기";
    navigation.classList.toggle("is-open", willOpen);
    body.classList.toggle("menu-open", willOpen);
  };

  menuButton?.addEventListener("click", toggleMenu);
  navigationLinks.forEach((link) => link.addEventListener("click", closeMenu));

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) closeMenu();
  });

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const stepButtons = Array.from(
    document.querySelectorAll("[data-journey-step]"),
  );
  const journeyPanel = document.querySelector("[data-journey-panel]");
  const panelStep = document.querySelector("[data-panel-step]");
  const panelKicker = document.querySelector("[data-panel-kicker]");
  const panelTitle = document.querySelector("[data-panel-title]");
  const panelDescription = document.querySelector("[data-panel-description]");
  const panelMeta = document.querySelector("[data-panel-meta]");

  const setText = (element, value) => {
    if (element) element.textContent = value;
  };

  const selectStep = (button, shouldFocus = false) => {
    if (!(button instanceof HTMLButtonElement) || !journeyPanel) return;

    stepButtons.forEach((stepButton) => {
      const isCurrent = stepButton === button;
      stepButton.setAttribute("aria-selected", String(isCurrent));
      stepButton.tabIndex = isCurrent ? 0 : -1;
    });

    setText(panelStep, button.dataset.step ?? "");
    setText(panelKicker, button.dataset.kicker ?? "");
    setText(panelTitle, button.dataset.title ?? "");
    setText(panelDescription, button.dataset.description ?? "");
    setText(panelMeta, button.dataset.meta ?? "");
    journeyPanel.setAttribute("aria-labelledby", button.id);
    journeyPanel.setAttribute("data-active-step", button.dataset.step ?? "01");

    if (shouldFocus) button.focus();
  };

  stepButtons.forEach((button, index) => {
    button.addEventListener("click", () => selectStep(button));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
      const nextIndex = (index + direction + stepButtons.length) % stepButtons.length;
      selectStep(stepButtons[nextIndex], true);
    });
  });
})();
