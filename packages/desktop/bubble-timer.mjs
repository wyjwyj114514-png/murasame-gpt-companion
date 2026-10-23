// A single timer per visible bubble; refresh/reopen replaces its deadline.
export class BubbleTimer {
  constructor({storage,timers=globalThis}={}){this.storage=storage;this.timers=timers;this.seconds=8;this.handle=null;this.dismiss=null;try{const raw=storage?.getItem('murasame-bubble-seconds');if(raw!==null&&raw!==undefined)this.seconds=this.normalize(raw);}catch{}}
  normalize(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(600,Math.round(n))):8;}
  configure(value){this.seconds=this.normalize(value);try{this.storage?.setItem('murasame-bubble-seconds',String(this.seconds));}catch{}if(this.dismiss)this.open(this.dismiss);if(typeof window!=='undefined')window.dispatchEvent(new Event('murasame-bubble-timeout-changed'));return this.seconds;}
  open(dismiss){this.cancel();this.dismiss=dismiss;if(this.seconds>0)this.handle=this.timers.setTimeout(()=>{this.handle=null;this.dismiss=null;dismiss();},this.seconds*1000);}
  cancel(){if(this.handle!==null)this.timers.clearTimeout(this.handle);this.handle=null;this.dismiss=null;}
}
