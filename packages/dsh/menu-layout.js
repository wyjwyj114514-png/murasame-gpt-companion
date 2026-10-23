function positionMenu() {
  if(murasameScaling)return;
  try {
    var vp=viewport(),pad=8,gap=8,pet=img.getBoundingClientRect();
    var put=function(key,value){if(menuBox.style[key]!==value)menuBox.style[key]=value;};
    put('background','rgb(252, 252, 255)');put('boxSizing','border-box');
    put('width',Math.min(340,vp.w-pad*2)+'px');put('minWidth','0');
    put('maxWidth',(vp.w-pad*2)+'px');put('maxHeight',(vp.h-pad*2)+'px');
    put('overflowY','auto');put('overflowX','hidden');
    var width=menuBox.offsetWidth,height=Math.min(menuBox.scrollHeight+2,vp.h-pad*2),x,y;
    if(pet.left-gap-pad>=width){x=pet.left-gap-width;y=clamp(pet.bottom-height,pad,vp.h-pad-height);}
    else if(vp.w-pad-pet.right-gap>=width){x=pet.right+gap;y=clamp(pet.bottom-height,pad,vp.h-pad-height);}
    else {
      x=clamp(pet.right-width,pad,Math.max(pad,vp.w-pad-width));
      var above=Math.max(0,pet.top-gap-pad),below=Math.max(0,vp.h-pad-pet.bottom-gap);
      if(Math.max(above,below)>=120){
        var available=Math.max(above,below);put('maxHeight',Math.floor(available)+'px');height=Math.min(height,available);
        y=above>=below?pet.top-gap-height:pet.bottom+gap;
      }else y=pad;
    }
    x=clamp(x,pad,Math.max(pad,vp.w-pad-width));y=clamp(y,pad,Math.max(pad,vp.h-pad-height));
    put('left',Math.round(x)+'px');put('top',Math.round(y)+'px');put('right','auto');put('bottom','auto');put('transformOrigin','top left');
  } catch(err) {}
}
var murasameMenuFrame=0;
var murasameScaling=false;
scaleInput.setAttribute('aria-label','丛雨大小');
scaleNumber.setAttribute('aria-label','丛雨大小级别');
scaleInput.addEventListener('pointerdown',function(event){
  murasameScaling=true;
  try{scaleInput.setPointerCapture(event.pointerId);}catch(err){}
});
function murasameFinishScaling(){murasameScaling=false;murasameFitMenu();}
scaleInput.addEventListener('pointerup',murasameFinishScaling);
scaleInput.addEventListener('pointercancel',murasameFinishScaling);
scaleInput.addEventListener('lostpointercapture',murasameFinishScaling);
function murasameFitMenu(){
  if(murasameMenuFrame)return;
  murasameMenuFrame=requestAnimationFrame(function(){murasameMenuFrame=0;if(menuOpen)positionMenu();});
}
new ResizeObserver(murasameFitMenu).observe(menuBox);
new ResizeObserver(murasameFitMenu).observe(root);
new MutationObserver(murasameFitMenu).observe(root,{attributes:true,attributeFilter:['style','class']});
window.addEventListener('murasame-voice-layout',murasameFitMenu);
window.addEventListener('resize',murasameFitMenu);
