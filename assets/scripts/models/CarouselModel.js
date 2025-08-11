class CarouselModel {
  constructor() {
    this.cards = [
      { title:"Global Payments", icon:"fas fa-globe", themeClass:"theme-green",
        details:{ title:"Global Payment Solutions", points:["Multi-currency processing worldwide","Optimized real-time FX rates","Secure international transactions"], link:"Learn More" } },
      { title:"User Portal", icon:"fas fa-user", themeClass:"theme-purple",
        details:{ title:"Branded Payee Portal", points:["Self-service payment control","Personalized dashboards","Advanced user analytics"], link:"Explore Features" } },
      { title:"Tax Compliance", icon:"fas fa-shield-alt", themeClass:"theme-red",
        details:{ title:"Automated Tax Engine", points:["Accurate tax calculations","Live compliance updates","Multi-jurisdiction support"], link:"View Details" } },
      { title:"API Integration", icon:"fas fa-code", themeClass:"theme-blue",
        details:{ title:"Seamless API Solutions", points:["Complete REST documentation","Webhooks for real-time events","Developer sandbox environment"], link:"Access Docs" } },
      { title:"Analytics Suite", icon:"fas fa-chart-bar", themeClass:"theme-orange",
        details:{ title:"Advanced Analytics", points:["Real-time insights","Automated reporting","Custom dashboard creation"], link:"Explore Platform" } }
    ];
    this.currentIndex = 0;
    this.state = 'grid';
    this.observers = [];

    this.storageKey = 'carouselState:v2';
    this._restoreState();
  }

  addObserver(o){ this.observers.push(o); }
  notify(event,data){ this.observers.forEach(o => o.update(event,data)); }

  init(){ 
    this.notify('initCards', { cards:this.cards, state:this.state, index:this.currentIndex, total:this.cards.length });
    
    if (this.state === 'carousel') {
      requestAnimationFrame(() => {
        this.notify('openCarousel', { index:this.currentIndex, cards:this.cards, total:this.cards.length, restored:true });
      });
    }
  }

  openCarouselAt(index){
    this.currentIndex = index;
    this.state = 'carousel';
    this._persistState();
    this.notify('openCarousel', { index, cards:this.cards, total:this.cards.length, restored:false });
  }

  closeCarousel(){
    this.state = 'grid';
    this._persistState();
    this.notify('closeCarousel', {});
  }

  next(){
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this._persistState();
    this.notify('indexChanged', { index:this.currentIndex, card:this.cards[this.currentIndex], total:this.cards.length });
  }

  prev(){
    this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
    this._persistState();
    this.notify('indexChanged', { index:this.currentIndex, card:this.cards[this.currentIndex], total:this.cards.length });
  }

  _persistState(){
    queueMicrotask(() => {
      try {
        const payload = JSON.stringify({ 
          index: this.currentIndex, 
          state: this.state, 
          ts: Date.now() 
        });
        localStorage.setItem(this.storageKey, payload);
      } catch(e) {
        // Fail silently if storage is unavailable
      }
    });
  }

  _restoreState(){
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.index === 'number' && 
          (parsed.state === 'grid' || parsed.state === 'carousel')) {
        this.currentIndex = Math.min(Math.max(parsed.index, 0), this.cards.length - 1);
        this.state = parsed.state;
      }
    } catch(e) {
      // Ignore malformed storage data
    }
  }
}
