'use strict';
const $=id=>document.getElementById(id);
const SCOPES='https://www.googleapis.com/auth/gmail.compose';
let accessToken='',tokenClient=null,dbPromise;
let contacts=[], selectedContacts=new Set(), saving=Promise.resolve(),busy=false;
function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('joon-mail-v1',1);req.onupgradeneeded=()=>{let d=req.result;if(!d.objectStoreNames.contains('data'))d.createObjectStore('data')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
async function get(key){const d=await db();return new Promise((res,rej)=>{let r=d.transaction('data').objectStore('data').get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(key,value){const d=await db();return new Promise((res,rej)=>{let t=d.transaction('data','readwrite');t.objectStore('data').put(value,key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
const setStatus=(s,bad=false)=>{$('status').textContent=s;$('status').style.color=bad?'#b42318':'#157347'};
function showSavedCheck(){let el=document.getElementById('savedCheckOverlay');if(!el){el=document.createElement('div');el.id='savedCheckOverlay';el.setAttribute('aria-label','저장 완료');el.style.cssText='position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.08)';const circle=document.createElement('div');circle.textContent='✓';circle.style.cssText='width:92px;height:92px;border-radius:50%;background:#148552;color:white;font-size:58px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px #0003';el.append(circle);document.body.append(el)}el.style.display='flex';clearTimeout(showSavedCheck.timer);showSavedCheck.timer=setTimeout(()=>{el.style.display='none'},1800)}
function queueSave(task){const next=saving.catch(()=>{}).then(task);saving=next;return next}
function composerData(){return {to:$('to').value.trim(),subject:$('subject').value,body:$('body').value}}
async function saveComposer({newFiles=null,showCheck=false}={}){
  return queueSave(async()=>{
    const old=await get('message')||{files:[]};
    const files=newFiles??old.files??[];
    if(files.reduce((n,f)=>n+(f.size||0),0)>10*1024*1024)throw Error('첨부파일 총 용량은 10MB 이내여야 합니다.');
    await put('message',{...composerData(),files});
    showFiles(files);
    $('autosaveStatus').textContent='✓ 자동 저장됨';
    if(showCheck)showSavedCheck();
  });
}
function validEmail(v){return /^[^\s@,<>\r\n]+@[^\s@,<>\r\n]+\.[^\s@,<>\r\n]+$/.test(v)}
function showContactCount(){$('contactCount').textContent='저장 '+contacts.length+'명 · 선택 '+selectedContacts.size+'명 (선택 시 직접 입력한 받는 사람 대신 사용)'}
function renderContacts(){
 const list=$('contactsList');list.replaceChildren();
 if(!contacts.length){const p=document.createElement('p');p.className='muted';p.textContent='저장된 주소가 없습니다.';list.append(p)}
 for(const contact of contacts){
   const row=document.createElement('div');row.className='contactRow';
   const label=document.createElement('label');label.className='contactLabel';
   const ck=document.createElement('input');ck.type='checkbox';ck.checked=selectedContacts.has(contact.id);
   ck.addEventListener('change',()=>{if(ck.checked)selectedContacts.add(contact.id);else selectedContacts.delete(contact.id);showContactCount()});
   const info=document.createElement('span');const title=document.createElement('strong');title.textContent=contact.name||contact.email;
   const email=document.createElement('small');email.textContent=contact.email;
   info.append(title,email);label.append(ck,info);row.append(label);
   const edit=document.createElement('button');edit.className='secondary';edit.textContent='수정';
   edit.addEventListener('click',()=>editContact(contact.id));row.append(edit);list.append(row)
 }
 showContactCount();
}
async function loadContacts(){
 contacts=await get('contacts')||[];
 contacts=contacts.filter(c=>c&&typeof c.email==='string'&&validEmail(c.email)&&typeof c.id==='string');
 selectedContacts=new Set();renderContacts();
}
async function addContact(){
 const name=$('contactName').value.trim(),email=cleanEmail($('contactEmail').value);
 if(!validEmail(email))throw Error('주소록의 이메일 주소를 확인하세요.');
 if(contacts.some(c=>c.email===email))throw Error('이미 등록된 이메일 주소입니다.');
 contacts.push({id:crypto.randomUUID(),name,email});
 await put('contacts',contacts);
 $('contactName').value='';$('contactEmail').value='';
 renderContacts();showSavedCheck();setStatus('✓ 주소록에 저장했습니다.');
}
async function editContact(id){
 const c=contacts.find(x=>x.id===id);if(!c)return;
 const name=prompt('이름 또는 구분을 수정하세요.',c.name);if(name===null)return;
 const emailInput=prompt('이메일 주소를 수정하세요.',c.email);if(emailInput===null)return;
 const email=cleanEmail(emailInput);
 if(!validEmail(email)||contacts.some(x=>x.id!==id&&x.email===email)){setStatus('이메일 형식이 잘못됐거나 중복 주소입니다.',true);return}
 const updated=contacts.map(x=>x.id===id?{...x,name:name.trim(),email}:x);
 await put('contacts',updated);contacts=updated;renderContacts();showSavedCheck();
}
async function deleteContacts(){
 if(!selectedContacts.size){setStatus('삭제할 주소를 먼저 체크하세요.',true);return}
 if(!confirm('선택한 주소 '+selectedContacts.size+'개를 삭제할까요?'))return;
 const next=contacts.filter(c=>!selectedContacts.has(c.id));await put('contacts',next);contacts=next;selectedContacts.clear();renderContacts();showSavedCheck();
}
function selectedRecipients(saved){
 if(selectedContacts.size){
   const list=contacts.filter(c=>selectedContacts.has(c.id)).map(c=>c.email);
   return [...new Set(list)];
 }
 return [...new Set(validateRecipients(saved.to))];
}
function showFiles(files){$('attachments').textContent=files?.length?files.map(f=>`${f.name} (${(f.size/1024/1024).toFixed(2)} MB)`).join(' · '):'저장된 첨부 없음'}
async function load(){try{const saved=await get('message')||{};$('to').value=saved.to||'';$('subject').value=saved.subject||'';$('body').value=saved.body||'';showFiles(saved.files||[]);$('clientId').value=localStorage.getItem('joon_client_id')||'';await renderHistory();await loadContacts()}catch(e){setStatus('저장소를 열 수 없습니다: '+e.message,true)}}
async function save(){const selected=[...$('files').files];await saveComposer({newFiles:selected.length?selected:null,showCheck:true});$('files').value='';setStatus('✓ 저장 완료 (첨부 포함)')}
async function connect(){const clientId=$('clientId').value.trim();if(!clientId.endsWith('.apps.googleusercontent.com'))throw Error('Google OAuth 웹 클라이언트 ID를 먼저 설정하세요.');if(!window.google?.accounts?.oauth2)throw Error('Google 인증 스크립트를 불러오지 못했습니다. Safari에서 인터넷 연결을 확인하세요.');tokenClient=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:SCOPES,callback:response=>{if(response.error){$('authStatus').textContent='연결 실패: '+response.error;return}accessToken=response.access_token;$('authStatus').textContent='✓ Gmail 권한 연결 완료 (현재 세션)';setStatus('Gmail 연결 완료')}});tokenClient.requestAccessToken({prompt:accessToken?'':'consent'});}
function encodeHeader(str){return /[^\x20-\x7e]/.test(str)?'=?UTF-8?B?'+bytesToBase64(new TextEncoder().encode(str))+'?=':str}
function bytesToBase64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)}
function base64url(bytes){return bytesToBase64(bytes).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function fold64(str){return str.match(/.{1,76}/g)?.join('\r\n')||''}
function cleanEmail(s){return s.trim().toLowerCase()}
function validateRecipients(to){const recipients=to.split(',').map(cleanEmail).filter(Boolean);if(!recipients.length||recipients.length>30||recipients.some(x=>!(/^[^\s@,<>\r\n]+@[^\s@,<>\r\n]+\.[^\s@,<>\r\n]+$/.test(x))))throw Error('받는 사람 이메일 주소를 확인하세요 (최대 30명).');return recipients}
function sanitizeFilename(name){return name.replace(/[\r\n"\\]/g,'_').slice(0,150)}
async function mime(saved){const recipients=validateRecipients(saved.to);if(!saved.subject.trim())throw Error('제목을 입력하세요.');const boundary='joonmail_'+crypto.randomUUID().replace(/-/g,'');const lines=[`To: ${recipients.join(', ')}`,`Subject: ${encodeHeader(saved.subject.replace(/[\r\n]/g,' '))}`,'MIME-Version: 1.0',`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',fold64(bytesToBase64(new TextEncoder().encode(saved.body||'')))];for(const f of (saved.files||[])){const buf=new Uint8Array(await f.arrayBuffer());lines.push(`--${boundary}`,`Content-Type: ${/^[\w.+-]+\/[\w.+-]+$/.test(f.type)?f.type:'application/octet-stream'}`,'Content-Transfer-Encoding: base64',`Content-Disposition: attachment; filename="${sanitizeFilename(f.name)}"`,'',fold64(bytesToBase64(buf)))}lines.push(`--${boundary}--`,'');return base64url(new TextEncoder().encode(lines.join('\r\n')))}
async function gmailCall(path,payload){const res=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});let data=await res.json().catch(()=>({}));if(!res.ok)throw Error(`Gmail 오류 ${res.status}: ${data.error?.message||'권한 또는 네트워크 확인'}`);return data}
async function record(mode,saved,result){const history=await get('history')||[];history.unshift({at:new Date().toISOString(),mode,to:saved.to,subject:saved.subject,id:result.id||''});await put('history',history.slice(0,100));await renderHistory()}
async function renderHistory(){const list=$('history');list.replaceChildren();let history=await get('history')||[];if(!history.length){let li=document.createElement('li');li.textContent='기록 없음';list.append(li)}for(let h of history){let li=document.createElement('li');li.textContent=`${new Date(h.at).toLocaleString('ko-KR')} · ${h.mode==='send'?'전송':'초안'} · ${h.to} · ${h.subject}`;list.append(li)}}
async function prepare(){
 if(busy)return;
 $('submit').disabled=true;
 try {
  await saving;
  await saveComposer();
  const saved=await get('message');
  if(!saved)throw Error('작성 내용이 없습니다.');
  if(!saved.subject.trim())throw Error('제목을 입력하세요.');
  if(!accessToken)throw Error('먼저 Gmail 연결 버튼으로 권한을 승인하세요.');
  const recipients=selectedRecipients(saved);
  if(!recipients.length||recipients.length>30)throw Error('수신자는 1~30명까지 선택할 수 있습니다.');
  const mode=document.querySelector('input[name=mode]:checked').value;
  const size=(saved.files||[]).reduce((n,f)=>n+f.size,0);
  $('confirmTitle').textContent=mode==='send'?'개별 메일을 실제 발송할까요?':'Gmail에 개별 초안을 만들까요?';
  $('confirmInfo').textContent='수신자 '+recipients.length+'명 (각자 주소만 표시)\n'+recipients.join('\n')+'\n제목: '+saved.subject+'\n첨부: '+(saved.files||[]).length+'개 / '+(size/1048576).toFixed(2)+'MB\n\n'+(mode==='send'?'확인을 누르면 각 수신자에게 개별 발송됩니다.':'확인을 누르면 각 수신자별 Gmail 초안이 생성됩니다. 실제 발송은 Gmail에서 직접 해야 합니다.');
  const dialog=$('confirmDialog');
  dialog.onclose=async()=>{
    if(dialog.returnValue!=='ok'){$('submit').disabled=false;return}
    busy=true;
    let done=0;
    const failures=[];
    try{
      for(const email of recipients){
        setStatus((mode==='send'?'개별 발송':'초안 생성')+' 중: '+(done+failures.length+1)+' / '+recipients.length);
        try{
          const raw=await mime({...saved,to:email});
          const result=mode==='send'?await gmailCall('messages/send',{raw}):await gmailCall('drafts',{message:{raw}});
          await record(mode,{...saved,to:email},result);
          done++;
        }catch(e){
          failures.push(email+' — '+(e.message||String(e)));
          if(/Gmail 오류 401|Gmail 오류 403/.test(String(e.message)))break;
        }
      }
      const verb=mode==='send'?'전송':'초안 생성';
      setStatus('✓ '+verb+' 성공 '+done+'명 / 요청 '+recipients.length+'명'+(failures.length?' · 실패 '+failures.length+'명: '+failures.join('; '):'')+(mode==='draft'?' · Gmail 임시보관함에서 직접 발송하세요.':' · Gmail 보낸편지함에서 확인하세요.'),!!failures.length);
      if(mode==='draft'&&done){const link=document.createElement('a');link.href='https://mail.google.com/mail/u/0/#drafts';link.target='_blank';link.rel='noopener';link.textContent='Gmail 임시보관함 열기';$('status').append(' ',link)}
    }finally{busy=false;$('submit').disabled=false}
  };
  dialog.showModal();
 }catch(e){setStatus(e.message||String(e),true);$('submit').disabled=false}
}
async function exportBackup(){let obj={format:'joon-mail-v1',message:await get('message')||{},history:await get('history')||[],contacts:await get('contacts')||[]};if(obj.message.files?.length)obj.message.files=await Promise.all(obj.message.files.map(async f=>({name:f.name,type:f.type,lastModified:f.lastModified,base64:bytesToBase64(new Uint8Array(await f.arrayBuffer()))})));const b=new Blob([JSON.stringify(obj)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='JOON_Mail_Backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),60000);setStatus('백업 파일 다운로드를 요청했습니다. 파일 앱에서 저장 위치를 확인하세요.')}
async function restoreBackup(file){if(!confirm('현재 저장된 메일과 기록을 백업 파일로 교체할까요?'))return;const data=JSON.parse(await file.text());if(data.format!=='joon-mail-v1'||!data.message||!Array.isArray(data.history))throw Error('지원되지 않는 백업 파일입니다.');const m=data.message;if(m.files)m.files=m.files.map(f=>{const binary=atob(f.base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new File([bytes],f.name,{type:f.type,lastModified:f.lastModified})});await put('message',m);await put('history',data.history);if(Array.isArray(data.contacts)){const safe=data.contacts.filter(c=>c&&typeof c.email==='string'&&validEmail(c.email)).map(c=>({id:String(c.id||crypto.randomUUID()),name:String(c.name||''),email:cleanEmail(c.email)}));await put('contacts',safe)}await load();setStatus('✓ 백업 복원 완료')}
function bind(id,fn){$(id).addEventListener('click',async()=>{try{await fn()}catch(e){setStatus(e.message||String(e),true)}})}
let composerDebounce;
for(const id of ['to','subject','body'])$(id).addEventListener('input',()=>{
 $('autosaveStatus').textContent='자동 저장 중...';
 clearTimeout(composerDebounce);
 composerDebounce=setTimeout(()=>saveComposer().catch(e=>setStatus('자동 저장 실패: '+e.message,true)),350);
});
bind('addContact',addContact);
bind('selectAllContacts',async()=>{selectedContacts=new Set(contacts.map(c=>c.id));renderContacts()});
bind('unselectContacts',async()=>{selectedContacts.clear();renderContacts()});
bind('deleteContacts',deleteContacts);
bind('saveConfig',()=>{const c=$('clientId').value.trim();if(!c.endsWith('.apps.googleusercontent.com'))throw Error('올바른 Google 웹 클라이언트 ID를 입력하세요.');localStorage.setItem('joon_client_id',c);accessToken='';$('authStatus').textContent='설정 저장 완료 · Gmail 연결을 누르세요';setStatus('✓ 설정 저장 완료')});bind('connect',connect);bind('clear',async()=>{if(!confirm('새 메일을 작성할까요? 현재 작성 내용과 첨부파일을 비웁니다. 주소록과 발송 기록은 유지됩니다.'))return;clearTimeout(composerDebounce);await saving;await put('message',{to:'',subject:'',body:'',files:[]});$('to').value='';$('subject').value='';$('body').value='';$('files').value='';showFiles([]);selectedContacts.clear();renderContacts();$('autosaveStatus').textContent='새 메일 작성 준비됨';showSavedCheck();setStatus('새 메일 작성 준비 완료')});bind('submit',prepare);bind('export',exportBackup);$('restore').addEventListener('change',async e=>{try{if(e.target.files[0])await restoreBackup(e.target.files[0])}catch(err){setStatus(err.message,true)}e.target.value=''});$('files').addEventListener('change',async()=>{const selected=[...$('files').files];if(!selected.length)return;$('submit').disabled=true;setStatus('첨부파일 자동 저장 중...');try{await save();setStatus('✓ 첨부파일 자동 저장 완료 (내용 포함)')}catch(e){setStatus('첨부파일 자동 저장 실패: '+(e.message||String(e)),true)}finally{$('submit').disabled=false}});load();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
