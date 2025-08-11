class CarouselController {
  constructor(model, view){
    this.model = model;
    this.view = view;
    this.bind();
  }

  bind(){
    this.model.addObserver(this.view);
    this.model.init();
    this.view.handleResponsiveSwitch(this.model);

    document.addEventListener('click', (e) => {
      const card = e.target.closest('.initial-card');
      if (!card) return;
      const index = parseInt(card.dataset.index, 10);
      if (!Number.isNaN(index)) this.model.openCarouselAt(index);
    });

    const prev = document.getElementById('carouselPrev');
    const next = document.getElementById('carouselNext');
    if (prev) prev.addEventListener('click', (e) => { e.preventDefault(); this.model.prev(); });
    if (next) next.addEventListener('click', (e) => { e.preventDefault(); this.model.next(); });

    const up = document.getElementById('detailsUp');
    const down = document.getElementById('detailsDown');
    if (up) up.addEventListener('click', (e) => { e.preventDefault(); this.model.prev(); });
    if (down) down.addEventListener('click', (e) => { e.preventDefault(); this.model.next(); });

    const closeBtn = document.getElementById('closeDetails');
    if (closeBtn) closeBtn.addEventListener('click', () => this.model.closeCarousel());

    document.addEventListener('keydown', (e) => {
      const active = document.getElementById('carouselLayout').classList.contains('active');
      if (!active) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.model.prev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this.model.next(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.model.closeCarousel(); }
    });

    const container = document.getElementById('carouselContainer');
    container.addEventListener('carousel-swipe', (e) => {
      const dir = e.detail.dir;
      if (dir === 'next') this.model.next(); else this.model.prev();
    });

    const mobUp = document.getElementById('mobileUp');
    const mobDown = document.getElementById('mobileDown');
    const mobClose = document.getElementById('mobileClose');
    if (mobUp) mobUp.addEventListener('click', (e) => { e.preventDefault(); this.model.prev(); });
    if (mobDown) mobDown.addEventListener('click', (e) => { e.preventDefault(); this.model.next(); });
    if (mobClose) mobClose.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.view.hideMobileModalImmediate();
    });

    window.addEventListener('request-card-data', (e) => {
      const idx = e.detail.index;
      const card = this.model.cards[idx];
      if (!card) return;
      this.model.currentIndex = idx;
      this.view.showMobileModal(card, idx, this.model.cards.length);
      this.view.updateDesktopDetails(card, idx, this.model.cards.length);
    });

    window.addEventListener('request-initial-carousel', () => {
      if (window.innerWidth <= 768 && !document.getElementById('carouselLayout').classList.contains('active')) {
        this.model.openCarouselAt(this.model.currentIndex || 0);
      }
    });
  }
}
