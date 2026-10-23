const {ipcRenderer}=require('electron');
window.addEventListener('message',async event=>{
  const message=event.data;
  if(event.source!==window||message?.jsonrpc!=='2.0'||!message.method||!message.id)return;
  try{const result=await ipcRenderer.invoke('murasame-test-bridge',message.method,message.params);window.postMessage({jsonrpc:'2.0',id:message.id,result},'*');}
  catch{window.postMessage({jsonrpc:'2.0',id:message.id,error:{code:-32000,message:'Test bridge failed'}},'*');}
});
