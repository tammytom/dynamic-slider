document.addEventListener('DOMContentLoaded', () => {
  const model = new CarouselModel();
  const view = new CarouselView();
  const controller = new CarouselController(model, view);
});
