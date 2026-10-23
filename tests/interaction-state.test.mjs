import test from 'node:test';
import assert from 'node:assert/strict';
import {InteractionState} from '../packages/desktop/interaction-state.mjs';
const call=(name,id,args={})=>({type:'response_item',payload:{type:'function_call',name,call_id:id,arguments:JSON.stringify(args)}});
test('同步提问结果解除等待，异步提问在 accepted 后保留并由对应用户回复解除',()=>{
  let current;const state=new InteractionState(x=>current=x);
  state.accept(call('functions.request_user_input','sync'));assert.equal(current.kind,'question');
  state.accept({type:'response_item',payload:{type:'function_call_output',call_id:'sync'}});assert.equal(current,null);
  state.accept(call('functions.request_user_input_async','a'));state.accept(call('functions.request_user_input_async','b'));
  state.accept({type:'response_item',payload:{type:'function_call_output',call_id:'b',output:'accepted'}});assert.equal(state.pending.size,2);
  state.accept({type:'event_msg',payload:{type:'user_message',message:'<send_user_message_question_reply>'+JSON.stringify([{questionItemId:JSON.stringify(['request_user_input_async','b',0])}])+'</send_user_message_question_reply>'}});
  assert.equal(state.pending.size,1);assert.equal(current.id,'a');
});
test('仅真正需授权的请求进入等待；同一 id 不重复，结束/取消清理，子代理不打扰',()=>{
  let current;const state=new InteractionState(x=>current=x);
  state.accept(call('exec_command','ordinary'));assert.equal(state.pending.size,0);
  state.accept(call('exec_command','approve',{sandbox_permissions:'require_escalated',cmd:'PRIVATE-COMMAND'}));assert.equal(current.kind,'approval');assert.ok(!JSON.stringify(current).includes('PRIVATE'));
  state.accept(call('exec_command','approve',{sandbox_permissions:'require_escalated'}));assert.equal(state.pending.size,1);
  state.accept({type:'event_msg',payload:{type:'task_complete'}});assert.equal(current,null);
  state.accept(call('functions.request_user_input','child'),{isSubagent:true});assert.equal(state.pending.size,0);
});
