import test from 'node:test';
import assert from 'node:assert/strict';
import {BubbleTimer} from '../packages/desktop/bubble-timer.mjs';
test('气泡重新打开取消旧计时、0秒禁用、修改时长保存并重置当前期限',()=>{
  let next=0,stored=null;const jobs=new Map(),storage={getItem:()=>stored,setItem:(_key,v)=>stored=v};
  const timers={setTimeout(fn,ms){jobs.set(++next,{fn,ms});return next;},clearTimeout(id){jobs.delete(id);}};
  const timer=new BubbleTimer({storage,timers});let count=0;
  timer.open(()=>count++);assert.equal(jobs.get(next).ms,8000);
  const first=next;timer.open(()=>count++);assert.equal(jobs.has(first),false);
  timer.configure(3);assert.equal(stored,'3');assert.equal(jobs.get(next).ms,3000);
  jobs.get(next).fn();assert.equal(count,1);
  timer.configure(0);timer.open(()=>count++);assert.equal(timer.handle,null);
  assert.equal(new BubbleTimer({storage,timers}).seconds,0);
  assert.equal(timer.configure(-10),0);assert.equal(timer.configure(900),600);timer.cancel();
});
