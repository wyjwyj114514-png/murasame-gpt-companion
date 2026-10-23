import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {syncNativeViewport,confinedViewport} = createRequire(import.meta.url)('../packages/desktop/native-viewport.cjs');
test('96 DPI 宿主在 133% 屏幕上不会让桌宠区域放大到页面外', () => {
  const calls = [], current = {x:391,y:56,width:1396,height:1061};
  const window = {getBounds:()=>current,setBounds:(bounds)=>calls.push(bounds)};
  const host = {nativeFollowing:true,visible:true,window:'page',dpi:96,bounds:{x:520,y:74,width:1394,height:1060}};
  const screen = {getDisplayMatching:()=>({scaleFactor:1.33})};
  const key = syncNativeViewport(host,window,screen);
  assert.deepEqual(calls,[{width:1048,height:796}]);
  assert.ok(calls[0].width*1.33 <= host.bounds.width);
  assert.ok(calls[0].height*1.33 <= host.bounds.height);
  syncNativeViewport(host,window,screen,key); assert.equal(calls.length,1);
  host.dpi=144; syncNativeViewport(host,window,{getDisplayMatching:()=>({scaleFactor:1.5})},key);
  assert.deepEqual(calls[1],{width:929,height:706});
});
test('原生区域不采用向外取整后的窗口包围框，阻止额外两像素越界', () => {
  const host={nativeFollowing:true,bounds:{width:1394,height:1060}};
  const window={getBounds:()=>({}),getContentBounds:()=>({width:1050,height:797})};
  assert.deepEqual(confinedViewport(host,window,{getDisplayMatching:()=>({scaleFactor:1.33})}),{width:1048,height:796});
});
