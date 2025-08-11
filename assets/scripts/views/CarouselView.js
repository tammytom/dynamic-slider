class CarouselView {
  constructor() {
    this.cardsContainer = document.getElementById("cardsContainer");
    this.cardsGrid = document.getElementById("cardsGrid");
    this.carouselLayout = document.getElementById("carouselLayout");
    this.carouselContainer = document.getElementById("carouselContainer");
    this.detailsContent = document.getElementById("detailsContent");
    this.cardCounter = document.getElementById("cardCounter");
    this.mobileModal = document.getElementById("mobileModal");
    this.mobileDetails = document.getElementById("mobileDetails");
    this.mobileCounter = document.getElementById("mobileCounter");

    this.carouselTrack = document.createElement("div");
    this.carouselTrack.className = "carousel-track";

    this.isMobile = window.innerWidth <= 768;
    this.isTransitioning = false;
    this.isInitialSetup = false;
    this.modalOpen = false;

    this.animationTimeout = null;
    this.pendingIndex = null;
    this.syncTimeout = null;
    this.lastClickTime = 0;
    this.clickThrottle = 140;

    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.touchMoved = false;
    this.tapMaxMove = 10;
    this.tapMaxTime = 250;

    this.scaleMap = { center: 1, side: 0.9, far: 0.8 };

    this.trackDelegationBound = false;

    this.heightSyncEnabled = false;
  }

  // Observer entrypoint
  update(event, data) {
    switch (event) {
      case "initCards":
        this.renderGrid(data.cards);
        break;
      case "openCarousel":
        const isRestored = data.restored === true;
        this.mountCarousel(data.index, data.cards, data.total, isRestored);
        break;
      case "indexChanged":
        this.onIndexChanged(data.index, data.card, data.total);
        break;
      case "closeCarousel":
        this.unmountCarousel();
        break;
    }
  }

  // Grid
  renderGrid(cards) {
    this.cardsGrid.innerHTML = "";
    cards.forEach((card, i) => {
      const el = document.createElement("div");
      el.className = `initial-card ${card.themeClass}`;
      el.dataset.index = i;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.innerHTML = `
        <i class="card-icon ${card.icon}" aria-hidden="true"></i>
        <p class="card-description">${card.title}</p>
      `;
      this.cardsGrid.appendChild(el);
    });

    // Show grid if desktop; hide on mobile
    if (this.isMobile) {
      this.cardsContainer.classList.add("hidden");
      this.cardsContainer.setAttribute("aria-hidden", "true");
    } else {
      this.cardsContainer.classList.remove("hidden");
      this.cardsContainer.setAttribute("aria-hidden", "false");
    }

    if (this.isMobile) {
      setTimeout(() => {
        const autoEvent = new CustomEvent("request-initial-carousel");
        window.dispatchEvent(autoEvent);
      }, 100);
    }
  }

  // Carousel mount
  mountCarousel(index, cards, total, isRestored = false) {
    if (this.animationTimeout) clearTimeout(this.animationTimeout);
    this.isInitialSetup = !isRestored;

    // Hide grid, show carousel
    this.cardsContainer.classList.add("hidden");
    this.cardsContainer.setAttribute("aria-hidden", "true");
    this.carouselLayout.classList.add("active");
    this.carouselLayout.setAttribute("aria-hidden", "false");

    // Build carousel track
    this.carouselContainer.innerHTML = "";
    this.carouselContainer.appendChild(this.carouselTrack);
    this.carouselTrack.innerHTML = "";

    cards.forEach((c, i) => {
      const el = document.createElement("div");
      el.className = `carousel-card ${c.themeClass}`;
      el.dataset.index = i;
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", `${c.title}`);
      el.innerHTML = `
        <i class="card-icon ${c.icon}" aria-hidden="true"></i>
        <p class="card-description">${c.title}</p>
      `;
      this.carouselTrack.appendChild(el);
    });

    // Position cards
    const items = [...this.carouselTrack.children];
    this.positionCards(items, index);
    this.carouselContainer.offsetHeight;

    if (isRestored) {
      items.forEach((e) => e.classList.add("positioned"));
      this.ensureVisible();
      this.carouselContainer.classList.add("carousel-ready");
      this.bindDelegatedInteractions();
      this.isInitialSetup = false;
      this.isTransitioning = false;
      this.updateDesktopDetails(cards[index], index, total);
      return;
    }

    setTimeout(() => {
      items.forEach((e) => e.classList.add("positioned"));
      this.ensureVisible();
      this.animationTimeout = setTimeout(() => {
        this.carouselContainer.classList.add("carousel-ready");
        this.bindDelegatedInteractions();
        setTimeout(() => {
          this.isInitialSetup = false;
          this.isTransitioning = false;
        }, 360);
      }, 40);
    }, 20);

    // Update details
    this.updateDesktopDetails(cards[index], index, total);
  }

  // Carousel unmount
  unmountCarousel() {
    this.carouselLayout.classList.remove("active");
    this.carouselLayout.setAttribute("aria-hidden", "true");
    if (!this.isMobile) {
      this.cardsContainer.classList.remove("hidden");
      this.cardsContainer.setAttribute("aria-hidden", "false");
    }
    this.carouselContainer.classList.remove("carousel-ready");
    this.isInitialSetup = false;
    this.isTransitioning = false;
    this.pendingIndex = null;
    if (this.modalOpen) this.hideMobileModalImmediate();
  }

  // On navigation
  onIndexChanged(index, card, total) {
    const now = Date.now();
    if (now - this.lastClickTime < this.clickThrottle) {
      this.pendingIndex = { index, card, total };
      if (this.syncTimeout) clearTimeout(this.syncTimeout);
      this.syncTimeout = setTimeout(() => {
        if (this.pendingIndex) {
          const p = this.pendingIndex;
          this.pendingIndex = null;
          this.onIndexChanged(p.index, p.card, p.total);
        }
      }, this.clickThrottle);
      return;
    }
    this.lastClickTime = now;
    if (this.isTransitioning) {
      this.pendingIndex = { index, card, total };
      return;
    }
    this.isTransitioning = true;

    const items = [...this.carouselTrack.querySelectorAll(".carousel-card")];
    this.positionCards(items, index);
    this.ensureVisible();
    // Remove syncHeights call
    this.updateDesktopDetails(card, index, total);

    setTimeout(() => {
      this.isTransitioning = false;
      if (this.pendingIndex) {
        const p = this.pendingIndex;
        this.pendingIndex = null;
        setTimeout(() => this.onIndexChanged(p.index, p.card, p.total), 40);
      }
    }, 280);
  }

  // Positioning
  positionCards(items, centerIndex) {
    const total = items.length;
    items.forEach((card, i) => {
      card.classList.remove(
        "center",
        "left-adjacent",
        "left-second",
        "right-adjacent",
        "right-second"
      );
      if (i === centerIndex) {
        card.classList.add("center");
        card.style.left = "50%";
      } else if (i === (centerIndex - 1 + total) % total) {
        card.classList.add("left-adjacent");
        card.style.left = "32.5%";
      } else if (i === (centerIndex - 2 + total) % total) {
        card.classList.add("left-second");
        card.style.left = "15%";
      } else if (i === (centerIndex + 1) % total) {
        card.classList.add("right-adjacent");
        card.style.left = "67.5%";
      } else {
        card.classList.add("right-second");
        card.style.left = "85%";
      }
    });
  }

  ensureVisible() {
    this.carouselTrack
      .querySelectorAll(".carousel-card.positioned")
      .forEach((el) => {
        el.style.opacity = "1";
        el.style.visibility = "visible";
      });
  }

  syncHeights() {
    if (!this.heightSyncEnabled) return;

    const nodes = [
      ...this.carouselTrack.querySelectorAll(".carousel-card.positioned"),
    ];
    if (!nodes.length) return;

    nodes.forEach((n) => {
      n.style.height = "";
      n.style.minHeight = "";
      n.style.maxHeight = "";
    });
  }

  updateDesktopDetails(card, index, total) {
    if (this.cardCounter)
      this.cardCounter.textContent = `${index + 1}/${total}`;
    const points = (card.details.points || []).slice(0, 3);
    this.detailsContent.innerHTML = `
      <h2 class="details-title" id="detailsTitle">${card.details.title}</h2>
      <ul class="details-points">${points
        .map((p) => `<li>${p}</li>`)
        .join("")}</ul>
      <a href="#" class="details-link">${card.details.link}</a>
    `;
    if (this.modalOpen) this.updateMobileModal(card, index, total);
  }

  bindDelegatedInteractions() {
    if (this.trackDelegationBound) return;
    this.trackDelegationBound = true;

    this.carouselTrack.addEventListener(
      "click",
      (e) => {
        const card = e.target.closest(".carousel-card");
        if (!card || this.isTransitioning) return;
        if (this.isMobile) {
          const idx = parseInt(card.dataset.index, 10);
          if (!Number.isNaN(idx)) this.openMobileModalByIndex(idx);
        }
      },
      { passive: true }
    );

    let startX = 0,
      startY = 0,
      swiped = false;
    this.carouselContainer.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length > 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swiped = false;
        this.touchStartX = startX;
        this.touchStartY = startY;
        this.touchStartTime = performance.now();
        this.touchMoved = false;
      },
      { passive: true }
    );

    this.carouselContainer.addEventListener(
      "touchmove",
      (e) => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy)) swiped = true;
        if (
          Math.abs(e.touches[0].clientX - this.touchStartX) > this.tapMaxMove ||
          Math.abs(e.touches[0].clientY - this.touchStartY) > this.tapMaxMove
        ) {
          this.touchMoved = true;
        }
      },
      { passive: true }
    );

    this.carouselContainer.addEventListener(
      "touchend",
      (e) => {
        if (swiped) {
          const dx = e.changedTouches[0].clientX - startX;
          const custom = new CustomEvent("carousel-swipe", {
            detail: { dir: dx < 0 ? "next" : "prev" },
          });
          this.carouselContainer.dispatchEvent(custom);
          return;
        }
        if (!this.isMobile) return;
        const dt = performance.now() - this.touchStartTime;
        if (this.touchMoved || dt > this.tapMaxTime) return;
        const target = document.elementFromPoint(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY
        );
        const card = target ? target.closest(".carousel-card") : null;
        if (!card) return;
        const idx = parseInt(card.dataset.index, 10);
        if (!Number.isNaN(idx) && !this.isTransitioning)
          this.openMobileModalByIndex(idx);
      },
      { passive: true }
    );
  }

  openMobileModalByIndex(idx) {
    if (!this.isMobile || this.modalOpen) return;
    const event = new CustomEvent("request-card-data", {
      detail: { index: idx },
    });
    window.dispatchEvent(event);
  }

  updateMobileModal(card, index, total) {
    if (this.mobileCounter)
      this.mobileCounter.textContent = `${index + 1}/${total}`;
    const pts = (card.details.points || []).slice(0, 3);
    this.mobileDetails.innerHTML = `
      <h2 class="mobile-title" id="mobileTitle">${card.details.title}</h2>
      <ul class="mobile-points">${pts.map((p) => `<li>${p}</li>`).join("")}</ul>
      <a href="#" class="mobile-link">${card.details.link}</a>
    `;
  }

  showMobileModal(card, index, total) {
    this.mobileModal.style.display = "flex";
    this.mobileModal.style.opacity = "0";
    this.mobileModal.style.visibility = "hidden";
    queueMicrotask(() => {
      this.updateMobileModal(card, index, total);
      this.mobileModal.setAttribute("aria-hidden", "false");
      this.mobileModal.classList.add("active");
      this.mobileModal.style.opacity = "";
      this.mobileModal.style.visibility = "";
      this.modalOpen = true;
      document.body.classList.add("body-locked");
      const closeBtn = document.getElementById("mobileClose");
      if (closeBtn) closeBtn.focus({ preventScroll: true });
    });
  }
  hideMobileModalImmediate() {
    this.mobileModal.classList.remove("active");
    this.mobileModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("body-locked");
    queueMicrotask(() => {
      this.mobileModal.style.display = "none";
      this.modalOpen = false;
    });
  }

  handleResponsiveSwitch(model) {
    const onResize = () => {
      const nowMobile = window.innerWidth <= 768;
      if (nowMobile === this.isMobile) return;

      const wasMobile = this.isMobile;
      this.isMobile = nowMobile;

      if (this.isMobile) {
        this.cardsContainer.classList.add("hidden");
        this.cardsContainer.setAttribute("aria-hidden", "true");
        if (!this.carouselLayout.classList.contains("active")) {
          model.openCarouselAt(model.currentIndex || 0);
        }
      } else {
        this.carouselLayout.classList.add("active");
        this.carouselLayout.setAttribute("aria-hidden", "false");
      }
    };
    window.addEventListener("resize", onResize, { passive: true });
    onResize();
  }
}
