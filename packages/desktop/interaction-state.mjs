// Retain only kind, call identity and time. Never persist question text,
// shell commands, answers or approval payloads in the companion state.
export class InteractionState {
  constructor(onChange=()=>{}){this.pending=new Map();this.onChange=onChange;}
  publish(){this.current=[...this.pending.values()].sort((a,b)=>b.ts-a.ts)[0]||null;this.onChange(this.current);}
  accept(record,{sessionId='',isSubagent=false}={}){
    if(isSubagent)return;
    const p=record.payload||{},now=Date.parse(record.timestamp)||Date.now();
    if(record.type==='response_item'&&p.type==='function_call'){
      const name=String(p.name||'');let kind,async=false;
      if(/(?:^|\.)request_user_input(?:_async)?$/.test(name)){kind='question';async=name.endsWith('_async');}
      else if(/(?:exec_command|apply_patch)$/.test(name)&&typeof p.arguments==='string'&&p.arguments.includes('require_escalated')){
        try{if(JSON.parse(p.arguments).sandbox_permissions==='require_escalated')kind='approval';}catch{}
      }
      if(kind&&p.call_id){this.pending.set(p.call_id,{kind,id:p.call_id,ts:now,session:sessionId,async});this.publish();}
    }
    if(record.type==='response_item'&&p.type==='function_call_output'){
      const item=this.pending.get(p.call_id);if(item&&!item.async){this.pending.delete(p.call_id);this.publish();}
    }
    const text=record.type==='event_msg'&&p.type==='user_message'?p.message:
      record.type==='response_item'&&p.type==='message'&&p.role==='user'?(p.content||[]).map(x=>x.text||'').join('\n'):'';
    if(typeof text==='string'&&text.includes('<send_user_message_question_reply>')){
      const ids=[];
      try{const raw=text.split('<send_user_message_question_reply>')[1].split('</send_user_message_question_reply>')[0];for(const item of JSON.parse(raw)){const id=JSON.parse(item.questionItemId);if(Array.isArray(id))ids.push(id[1]);}}catch{}
      for(const [id,item]of this.pending)if(item.kind==='question'&&(!ids.length||ids.includes(id)))this.pending.delete(id);
      this.publish();
    }
    if(record.type==='event_msg'){
      if(['approval_requested','exec_approval_request','apply_patch_approval_request'].includes(p.type)&&p.id){this.pending.set(p.id,{kind:'approval',id:p.id,ts:now,session:sessionId});this.publish();}
      if(['approval_resolved','approval_cancelled','request_approval_response'].includes(p.type)){if(p.id)this.pending.delete(p.id);else for(const [id,v]of this.pending)if(v.kind==='approval')this.pending.delete(id);this.publish();}
      if(['task_started','turn_started','turn_aborted','task_aborted'].includes(p.type)){this.pending.clear();this.publish();}
      else if(['task_complete','turn_completed'].includes(p.type)){for(const [id,v]of this.pending)if(!v.async)this.pending.delete(id);this.publish();}
    }
  }
}
