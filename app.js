'use strict';
const $=id=>document.getElementById(id);
const SCOPES='https://www.googleapis.com/auth/gmail.compose';
let accessToken='',tokenClient=null,dbPromise;
let contacts=[], selectedContacts=new Set(), saving=Promise.resolve(),busy=false;
let historySelection=false,selectedHistory=new Set();
const DEFAULT_CATEGORIES=['회사','친구','쇼핑','거래처'];
let categories=[...DEFAULT_CATEGORIES],openCategories=new Set(),editingContactId=null;
function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('joon-mail-v1',1);req.onupgradeneeded=()=>{let d=req.result;if(!d.objectStoreNames.contains('data'))d.createObjectStore('data')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
async function get(key){const d=await db();return new Promise((res,rej)=>{let r=d.transaction('data').objectStore('data').get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function put(key,value){const d=await db();return new Promise((res,rej)=>{let t=d.transaction('data','readwrite');t.objectStore('data').put(value,key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
const setStatus=(s,bad=false)=>{$('status').textContent=s;$('status').style.color=bad?'#b42318':'#157347'};
function showTemporaryStatus(message,ms=2000){setStatus(message);setTimeout(()=>{if($('status').textContent===message)$('status').textContent=''},ms)}
function showSavedCheck(){let el=document.getElementById('savedCheckOverlay');if(!el){el=document.createElement('div');el.id='savedCheckOverlay';el.setAttribute('aria-label','저장 완료');el.style.cssText='position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;pointer-events:none;background:rgba(0,0,0,.08)';const circle=document.createElement('div');circle.textContent='✓';circle.style.cssText='width:92px;height:92px;border-radius:50%;background:#148552;color:white;font-size:58px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px #0003';el.append(circle);document.body.append(el)}el.style.display='flex';clearTimeout(showSavedCheck.timer);showSavedCheck.timer=setTimeout(()=>{el.style.display='none'},1800)}
function queueSave(task){const next=saving.catch(()=>{}).then(task);saving=next;return next}
function composerData(){return {to:$('to').value.trim(),subject:$('subject').value,body:$('body').value}}
async function saveComposer({newFiles=null,showCheck=false}={}){
  return queueSave(async()=>{
    const old=await get('message')||{files:[]};
    const files=newFiles?await packFiles(newFiles):(old.files??[]);
    if(files.reduce((n,f)=>n+(f.size||0),0)>10*1024*1024)throw Error('첨부파일 총 용량은 10MB 이내여야 합니다.');
    await put('message',{...composerData(),files});
    showFiles(files);
    $('autosaveStatus').textContent='✓ 자동 저장됨';
    if(showCheck)showSavedCheck();
  });
}
function validEmail(v){return /^[^\s@,<>\r\n]+@[^\s@,<>\r\n]+\.[^\s@,<>\r\n]+$/.test(v)}
function showContactCount(){
 $('contactCount').textContent='저장 '+contacts.length+'명 · 선택 '+selectedContacts.size+'명 (주소록 선택 시 직접 입력 주소 대신 사용)';
 $('contactSummary').textContent=selectedContacts.size+'명 선택';
 $('categoryBookCount').textContent=contacts.length+'명 저장';
}
function categoryNamesFor(contact){
 const names=Array.isArray(contact.categories)?contact.categories:(contact.category?[contact.category]:[]);
 const valid=names.filter(n=>categories.includes(n));
 return valid.length?[...new Set(valid)]:['미분류'];
}
function chosenCategoryNames(){
 return [...$('contactCategoryOptions').querySelectorAll('input[type=checkbox]:checked')].map(x=>x.value);
}
function updateCategoryPickerText(){}
function renderCategoryPicker(selected=[]){
 const list=$('contactCategoryOptions');list.replaceChildren();
 for(const category of categories){
  const label=document.createElement('label');label.className='categoryOption';
  const ck=document.createElement('input');ck.type='checkbox';ck.value=category;ck.checked=selected.includes(category);
  ck.addEventListener('change',updateCategoryPickerText);
  const txt=document.createElement('span');txt.textContent=category;label.append(ck,txt);list.append(label);
 }
 if(!categories.length){const p=document.createElement('p');p.className='muted';p.textContent='카테고리를 추가하면 선택할 수 있어요.';list.append(p)}
 updateCategoryPickerText();
}
function renderCategoryManager(){
 const list=$('categoryManageList');list.replaceChildren();
 for(const category of categories){
  const row=document.createElement('div');row.className='categoryManageRow';
  const name=document.createElement('span');name.textContent=category;
  const rename=document.createElement('button');rename.className='secondary smallButton';rename.textContent='이름 변경';
  rename.addEventListener('click',()=>renameCategory(category));
  const remove=document.createElement('button');remove.className='secondary smallButton categoryRemove';remove.textContent='삭제';
  remove.addEventListener('click',()=>removeCategory(category));
  row.append(name,rename,remove);list.append(row);
 }
}
function contactRow(contact){
 const row=document.createElement('div');row.className='contactRow';
 const label=document.createElement('label');label.className='contactLabel';
 const ck=document.createElement('input');ck.type='checkbox';ck.checked=selectedContacts.has(contact.id);
 ck.addEventListener('change',()=>{if(ck.checked)selectedContacts.add(contact.id);else selectedContacts.delete(contact.id);showContactCount();renderContacts()});
 const info=document.createElement('span');info.className='contactInfo';
 const title=document.createElement('strong');title.className='markerName';title.textContent=contact.name||contact.email;
 const email=document.createElement('small');email.className='contactEmail';email.textContent=contact.email;
 info.append(title,email);label.append(ck,info);row.append(label);
 const edit=document.createElement('button');edit.className='secondary editBtn';edit.textContent='수정';
 edit.addEventListener('click',()=>editContact(contact.id));row.append(edit);return row;
}
function renderContacts(){
 const list=$('contactsList');list.replaceChildren();
 const grouped=[...categories,'미분류'];
 let anyOpen=false;
 for(const category of grouped){
  const groupContacts=contacts.filter(c=>categoryNamesFor(c).includes(category)).sort((a,b)=>(a.name||a.email).localeCompare(b.name||b.email,'ko'));
  if(!groupContacts.length&&category==='미분류')continue;
  const details=document.createElement('details');details.className='accordion categoryGroup';details.open=openCategories.has(category);
  if(details.open)anyOpen=true;
  details.addEventListener('toggle',()=>{if(details.open)openCategories.add(category);else openCategories.delete(category);updateCategoryToggleLabel()});
  const summary=document.createElement('summary');
  const title=document.createElement('span');title.className='categoryGroupTitle';title.textContent=category;
  const count=document.createElement('span');count.className='summaryCounter';count.textContent=groupContacts.length+'명';
  summary.append(title,count);details.append(summary);
  const body=document.createElement('div');body.className='accordionBody';
  if(groupContacts.length){
   const allLabel=document.createElement('label');allLabel.className='categorySelectAll';
   const text=document.createElement('span');text.textContent='이 카테고리 전체 선택';
   const check=document.createElement('input');check.type='checkbox';check.checked=groupContacts.every(c=>selectedContacts.has(c.id));
   check.addEventListener('change',()=>{for(const c of groupContacts){if(check.checked)selectedContacts.add(c.id);else selectedContacts.delete(c.id)}renderContacts()});
   allLabel.append(text,check);body.append(allLabel);
   for(const contact of groupContacts)body.append(contactRow(contact));
  }else{const empty=document.createElement('p');empty.className='muted';empty.textContent='등록된 이메일 주소가 없습니다.';body.append(empty)}
  details.append(body);list.append(details);
 }
 if(!contacts.length){const p=document.createElement('p');p.className='muted';p.textContent='주소록이 비어 있어요. 위에서 이메일을 등록해 주세요.';list.prepend(p)}
 showContactCount();updateCategoryToggleLabel();
}
function updateCategoryToggleLabel(){
 const displayed=[...categories,'미분류'].filter(c=>c!=='미분류'||contacts.some(x=>categoryNamesFor(x).includes('미분류')));
 $('toggleCategories').textContent=displayed.length&&displayed.every(c=>openCategories.has(c))?'전체 접기':'전체 펼치기';
}
async function loadContacts(){
 const storedCategories=await get('categories');
 categories=Array.isArray(storedCategories)?[...new Set(storedCategories.filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))]:[...DEFAULT_CATEGORIES];
 const saved=await get('contacts')||[];
 contacts=saved.filter(c=>c&&typeof c.email==='string'&&validEmail(c.email)&&typeof c.id==='string').map(c=>({...c,categories:Array.isArray(c.categories)?c.categories:(c.category?[c.category]:[])}));
 selectedContacts=new Set();editingContactId=null;
 $('addContact').textContent='주소록에 추가';$('cancelContactEdit').hidden=true;
 openCategories=new Set();$('categoryBookAccordion').open=false;$('categoryManagerAccordion').open=false;
 renderCategoryPicker();renderCategoryManager();renderContacts();
}
function addContact(){
 const email=cleanEmail($('contactEmail').value);
 if(!validEmail(email)){$('contactError').hidden=false;$('contactError').textContent='이메일 주소를 입력하거나 형식을 확인하세요.';return}
 if(contacts.some(c=>c.email===email&&c.id!==editingContactId)){$('contactError').hidden=false;$('contactError').textContent='이미 등록된 이메일 주소입니다.';return}
 $('contactError').hidden=true;
 const previous=editingContactId?contacts.find(c=>c.id===editingContactId):null;
 renderCategoryPicker(previous?categoryNamesFor(previous).filter(c=>c!=='미분류'):[]);
 $('contactCategoryDialog').showModal();
}
async function confirmContactCategories(){
 const button=$('confirmContactCategory');button.disabled=true;
 try{
  const name=$('contactName').value.trim(),email=cleanEmail($('contactEmail').value),assigned=chosenCategoryNames();
  if(!validEmail(email)||contacts.some(c=>c.email===email&&c.id!==editingContactId))throw Error('이메일 주소를 확인하세요.');
  const updated=editingContactId?contacts.map(c=>c.id===editingContactId?{...c,name,email,categories:assigned}:c):[...contacts,{id:crypto.randomUUID(),name,email,categories:assigned}];
  await put('contacts',updated);contacts=updated;
  const wasEdit=!!editingContactId;editingContactId=null;
  $('contactCategoryDialog').close();
  $('contactName').value='';$('contactEmail').value='';$('addContact').textContent='주소록에 추가';$('cancelContactEdit').hidden=true;
  renderContacts();showSavedCheck();showTemporaryStatus(wasEdit?'✓ 주소록 수정 완료':'✓ 주소록에 저장했습니다.');
 }finally{button.disabled=false}
}
function editContact(id){
 const contact=contacts.find(c=>c.id===id);if(!contact)return;
 editingContactId=id;
 $('contactName').value=contact.name||'';$('contactEmail').value=contact.email;
 $('addContact').textContent='수정 내용 저장';$('cancelContactEdit').hidden=false;
 $('contactError').hidden=true;
 $('contactName').scrollIntoView({behavior:'smooth',block:'center'});
}
function cancelContactEdit(){
 editingContactId=null;$('contactName').value='';$('contactEmail').value='';
 $('addContact').textContent='주소록에 추가';$('cancelContactEdit').hidden=true;
 $('contactError').hidden=true;
}
async function deleteContacts(){
 if(!selectedContacts.size){setStatus('삭제할 주소를 먼저 체크하세요.',true);return}
 if(!confirm('선택한 주소 '+selectedContacts.size+'개를 삭제할까요?'))return;
 const next=contacts.filter(c=>!selectedContacts.has(c.id));await put('contacts',next);contacts=next;selectedContacts.clear();renderContacts();showSavedCheck();
}
async function addCategory(){
 const input=$('newCategoryName'),name=input.value.trim();
 if(!name){setStatus('카테고리 이름을 입력하세요.',true);return}
 if(name==='미분류'||categories.includes(name)){setStatus('이미 있거나 사용할 수 없는 이름입니다.',true);return}
 if(categories.length>=50){setStatus('카테고리는 최대 50개까지 만들 수 있습니다.',true);return}
 const next=[...categories,name];await put('categories',next);categories=next;openCategories.add(name);
 input.value='';renderCategoryPicker();renderCategoryManager();renderContacts();showSavedCheck();
}
async function renameCategory(previous){
 const input=prompt('카테고리 이름 변경',previous);if(input===null)return;
 const name=input.trim();
 if(!name||name==='미분류'||(name!==previous&&categories.includes(name))){setStatus('카테고리 이름을 확인하세요.',true);return}
 if(name===previous)return;
 const next=categories.map(c=>c===previous?name:c);
 const updated=contacts.map(c=>({...c,categories:(c.categories||[]).map(x=>x===previous?name:x)}));
 await put('categories',next);await put('contacts',updated);
 categories=next;contacts=updated;
 if(openCategories.delete(previous))openCategories.add(name);
 renderCategoryPicker();renderCategoryManager();renderContacts();showSavedCheck();
}
async function removeCategory(category){
 if(!confirm('‘'+category+'’ 카테고리를 삭제할까요? 저장된 이메일 주소는 삭제되지 않고 다른 카테고리가 없다면 미분류로 이동합니다.'))return;
 const next=categories.filter(c=>c!==category);
 const updated=contacts.map(c=>({...c,categories:(c.categories||[]).filter(x=>x!==category)}));
 await put('categories',next);await put('contacts',updated);
 categories=next;contacts=updated;openCategories.delete(category);
 renderCategoryPicker();renderCategoryManager();renderContacts();showSavedCheck();
}
function selectedRecipients(saved){
 if(selectedContacts.size){
   const list=contacts.filter(c=>selectedContacts.has(c.id)).map(c=>c.email);
   return [...new Set(list)];
 }
 return [...new Set(validateRecipients(saved.to))];
}
function showFiles(files){
 const count=files?.length||0;
 $('attachments').textContent=count?files.map(f=>`${f.name} (${((f.size||0)/1024/1024).toFixed(2)} MB)`).join(' · '):'저장된 첨부 없음';
 $('attachmentCount').textContent='첨부 '+count+'개';
}
async function packFiles(files){
 const packed=[];
 for(const f of files){
  try{
   const bytes=new Uint8Array(await f.arrayBuffer());
   packed.push({name:f.name,type:f.type||'application/octet-stream',lastModified:f.lastModified||Date.now(),size:bytes.length,base64:bytesToBase64(bytes)});
  }catch(e){throw Error('첨부파일을 읽을 수 없습니다. 파일을 다시 선택해 주세요. ('+(e.message||e)+')')}
 }
 return packed;
}
function attachmentBase64(f){
 if(typeof f.base64==='string'){
  if(f.size>0&&!f.base64.length)throw Error('첨부 데이터가 비어 있습니다. 파일을 다시 선택해 주세요.');
  return f.base64;
 }
 throw Error('이전 방식으로 저장된 첨부파일입니다. 파일을 다시 선택해 저장하면 안전한 형식으로 변환됩니다.');
}
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
async function mime(saved){const recipients=validateRecipients(saved.to);if(!saved.subject.trim())throw Error('제목을 입력하세요.');const boundary='joonmail_'+crypto.randomUUID().replace(/-/g,'');const lines=[`To: ${recipients.join(', ')}`,`Subject: ${encodeHeader(saved.subject.replace(/[\r\n]/g,' '))}`,'MIME-Version: 1.0',`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',fold64(bytesToBase64(new TextEncoder().encode(saved.body||'')))];for(const f of (saved.files||[])){const fileBase64=attachmentBase64(f);lines.push(`--${boundary}`,`Content-Type: ${/^[\w.+-]+\/[\w.+-]+$/.test(f.type)?f.type:'application/octet-stream'}`,'Content-Transfer-Encoding: base64',`Content-Disposition: attachment; filename="${sanitizeFilename(f.name)}"`,'',fold64(fileBase64))}lines.push(`--${boundary}--`,'');return base64url(new TextEncoder().encode(lines.join('\r\n')))}
async function gmailCall(path,payload){const res=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});let data=await res.json().catch(()=>({}));if(!res.ok)throw Error(`Gmail 오류 ${res.status}: ${data.error?.message||'권한 또는 네트워크 확인'}`);return data}
async function record(mode,saved,result){
 const history=await get('history')||[];
 history.unshift({key:crypto.randomUUID(),at:new Date().toISOString(),mode,to:saved.to,subject:saved.subject,id:result.id||'',state:'success'});
 await put('history',history.slice(0,1000));await renderHistory();
}
async function recordFailure(mode,saved,error){
 try{const history=await get('history')||[];
 history.unshift({key:crypto.randomUUID(),at:new Date().toISOString(),mode,to:saved.to,subject:saved.subject,state:'failed',error:String(error).slice(0,200)});
 await put('history',history.slice(0,1000));await renderHistory()}catch(e){console.warn('Failed to persist error log',e)}
}
function historyKey(h,i){return h.key||[h.at,h.to,h.subject,h.id||'',i].join('|')}
async function renderHistory(){
 const list=$('history');list.replaceChildren();
 const history=await get('history')||[];
 $('historyCount').textContent=history.length+'건';
 $('deleteSelectedHistory').hidden=!historySelection;
 $('selectHistory').textContent=historySelection?'선택 완료':'다중 선택';
 $('clearHistory').disabled=!history.length;
 if(!history.length){const p=document.createElement('p');p.className='muted';p.textContent='기록 없음';list.append(p);return}
 let lastDay='';
 for(let i=0;i<history.length;i++){
  const h=history[i],key=historyKey(h,i),day=new Date(h.at).toLocaleDateString('ko-KR');
  if(day!==lastDay){const heading=document.createElement('h3');heading.className='historyDay';heading.textContent=day;list.append(heading);lastDay=day}
  const row=document.createElement('div');row.className='historyRow';
  if(historySelection){const ck=document.createElement('input');ck.type='checkbox';ck.checked=selectedHistory.has(key);ck.setAttribute('aria-label','발송 기록 선택');
   ck.addEventListener('change',()=>{if(ck.checked)selectedHistory.add(key);else selectedHistory.delete(key)});row.append(ck)}
  const info=document.createElement('div');info.className='historyInfo';
  const tag=document.createElement('span');tag.className='historyTag '+(h.state==='failed'?'isFailed':h.mode==='draft'?'isDraft':'isSent');
  tag.textContent=h.state==='failed'?'실패':h.mode==='draft'?'초안 생성':'전송 성공';
  const time=document.createElement('small');time.textContent=' '+new Date(h.at).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
  const title=document.createElement('strong');title.textContent=h.subject||'(제목 없음)';
  const email=document.createElement('small');email.textContent=h.to;
  info.append(tag,time,title,email);
  if(h.error){const err=document.createElement('small');err.className='inlineError';err.textContent=h.error;info.append(err)}
  const del=document.createElement('button');del.className='historyDelete';del.textContent='삭제';del.setAttribute('aria-label','해당 발송 기록 삭제');
  del.addEventListener('click',()=>deleteHistoryKeys([key]));
  let touchStart=0;
  row.addEventListener('touchstart',e=>{touchStart=e.touches[0].clientX},{passive:true});
  row.addEventListener('touchend',e=>{if(touchStart-e.changedTouches[0].clientX>55)row.classList.add('swiped');else if(e.changedTouches[0].clientX-touchStart>55)row.classList.remove('swiped')},{passive:true});
  row.append(info,del);list.append(row)
 }
}
async function deleteHistoryKeys(keys){
 if(!keys.length)return;
 if(!confirm('선택한 발송 기록 '+keys.length+'건을 삭제할까요? Gmail 메일은 삭제되지 않습니다.'))return;
 const history=await get('history')||[];
 const set=new Set(keys);
 const next=history.filter((h,i)=>!set.has(historyKey(h,i)));
 await put('history',next);selectedHistory.clear();await renderHistory();showSavedCheck();
}
let sendProgressStartedAt=0;
function startSendProgress(mode){
 const overlay=$('sendProgressOverlay');
 sendProgressStartedAt=performance.now();
 overlay.classList.remove('finishing');
 $('sendProgressTitle').textContent=mode==='send'?'메일 전송 중':'Gmail 초안 생성 중';
 $('sendProgressFill').style.width='0%';
 $('sendProgressTrack').setAttribute('aria-valuenow','0');
 overlay.hidden=false;
}
function updateSendProgress(completed,total){
 const percent=total?Math.min(100,Math.round(completed/total*100)):0;
 $('sendProgressFill').style.width=percent+'%';
 $('sendProgressTrack').setAttribute('aria-valuenow',String(percent));
}
async function finishSendProgress(){
 const minimumMs=1500;
 const elapsed=performance.now()-sendProgressStartedAt;
 if(elapsed<minimumMs)await new Promise(resolve=>setTimeout(resolve,minimumMs-elapsed));
 const overlay=$('sendProgressOverlay');
 overlay.classList.add('finishing');
 await new Promise(resolve=>setTimeout(resolve,260));
 overlay.hidden=true;
 overlay.classList.remove('finishing');
}
async function prepare(){
 if(busy||$('submit').disabled||$('confirmDialog').open)return;
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
  // Build and validate MIME before confirmation; if a legacy iOS file reference is gone, block the entire batch.
  // The encoded data is reused for each recipient, changing only the To header in the per-recipient MIME.
  const size=(saved.files||[]).reduce((n,f)=>n+f.size,0);
  $('confirmTitle').textContent=mode==='send'?'개별 메일을 실제 발송할까요?':'Gmail에 개별 초안을 만들까요?';
  $('confirmInfo').textContent='수신자 '+recipients.length+'명 (각자 주소만 표시)\n'+recipients.join('\n')+'\n제목: '+saved.subject+'\n첨부: '+(saved.files||[]).length+'개 / '+(size/1048576).toFixed(2)+'MB\n\n'+(mode==='send'?'확인을 누르면 각 수신자에게 개별 발송됩니다.':'확인을 누르면 각 수신자별 Gmail 초안이 생성됩니다. 실제 발송은 Gmail에서 직접 해야 합니다.');
  const dialog=$('confirmDialog');
  dialog.onclose=async()=>{
    if(dialog.returnValue!=='ok'){$('submit').disabled=false;return}
    busy=true;
    let done=0;
    const failures=[];
    let fullSendSuccess=false;
    startSendProgress(mode);
    try{
      for(const email of recipients){
        setStatus((mode==='send'?'개별 발송':'초안 생성')+' 중: '+(done+failures.length+1)+' / '+recipients.length);
        try{
          const raw=await mime({...saved,to:email});
          const result=mode==='send'?await gmailCall('messages/send',{raw}):await gmailCall('drafts',{message:{raw}});
          await record(mode,{...saved,to:email},result);
          done++;
          updateSendProgress(done,recipients.length);
        }catch(e){
          failures.push(email+' — '+(e.message||String(e)));
          await recordFailure(mode,{...saved,to:email},e.message||String(e));
          if(/Gmail 오류 401|Gmail 오류 403/.test(String(e.message)))break;
        }
      }
      const verb=mode==='send'?'전송':'초안 생성';
      const statusText=verb+' 성공 '+done+'명 / 요청 '+recipients.length+'명'+(failures.length?' · 실패 '+failures.length+'명: '+failures.join('; '):'')+(mode==='draft'&&done?' · Gmail 임시보관함에서 직접 발송하세요.':'');
      setStatus((done?'✓ ':'⚠ ')+statusText,!!failures.length);
      fullSendSuccess=mode==='send'&&done===recipients.length&&failures.length===0;
      if(mode==='draft'&&done){const link=document.createElement('a');link.href='https://mail.google.com/mail/u/0/#drafts';link.target='_blank';link.rel='noopener';link.textContent='Gmail 임시보관함 열기';$('status').append(' ',link)}
    }catch(e){setStatus('전송 처리 오류: '+(e.message||String(e)),true)}finally{try{await finishSendProgress();if(fullSendSuccess)showSavedCheck()}finally{busy=false;$('submit').disabled=false}}
  };
  // Validate all attachments once before showing the final send button.
  if((saved.files||[]).length){
   try{await mime({...saved,to:recipients[0]})}
   catch(e){throw Error('첨부파일 확인 실패: '+(e.message||e)+'. 원본 파일을 다시 선택해 주세요.')}
  }
  dialog.showModal();
 }catch(e){setStatus(e.message||String(e),true);$('submit').disabled=false}
}
async function exportBackup(){
 await saving;
 const obj={format:'joon-mail-v1',message:await get('message')||{},history:await get('history')||[],contacts:await get('contacts')||[],categories:await get('categories')||[...DEFAULT_CATEGORIES]};
 if(obj.message.files?.length){
  const normalized=[];
  for(const f of obj.message.files){
   if(typeof f.base64==='string')normalized.push({...f});
   else {
    const packed=await packFiles([f]);
    normalized.push(packed[0]);
   }
  }
  obj.message.files=normalized;
 }
 const b=new Blob([JSON.stringify(obj)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='JOON_Mail_Backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),60000);
 setStatus('백업 파일 다운로드를 요청했습니다. 파일 앱에서 저장 위치를 확인하세요.');
}
async function restoreBackup(file){if(!confirm('현재 저장된 메일과 기록을 백업 파일로 교체할까요?'))return;const data=JSON.parse(await file.text());if(data.format!=='joon-mail-v1'||!data.message||!Array.isArray(data.history))throw Error('지원되지 않는 백업 파일입니다.');const m=data.message;if(m.files)m.files=m.files.map(f=>{if(typeof f.base64!=='string')throw Error('백업 파일 첨부 데이터가 없습니다.');return {name:String(f.name||'attachment'),type:String(f.type||'application/octet-stream'),size:Number(f.size)||Math.floor(f.base64.length*3/4),lastModified:Number(f.lastModified)||Date.now(),base64:f.base64}});await put('message',m);await put('history',data.history);if(Array.isArray(data.contacts)){const safe=data.contacts.filter(c=>c&&typeof c.email==='string'&&validEmail(c.email)).map(c=>({id:String(c.id||crypto.randomUUID()),name:String(c.name||''),email:cleanEmail(c.email),categories:Array.isArray(c.categories)?c.categories.filter(x=>typeof x==='string'):(typeof c.category==='string'?[c.category]:[])}));await put('contacts',safe)}if(Array.isArray(data.categories)){const normalized=[...new Set(data.categories.filter(c=>typeof c==='string'&&c.trim()).map(c=>c.trim()))];await put('categories',normalized)}else{await put('categories',[...DEFAULT_CATEGORIES])}await load();setStatus('✓ 백업 복원 완료')}
function bind(id,fn){$(id).addEventListener('click',async()=>{try{await fn()}catch(e){setStatus(e.message||String(e),true)}})}
// Only the most recently tapped, currently open accordion tab is highlighted.
document.addEventListener('click',event=>{
 const summary=event.target.closest('summary');
 if(!summary||!summary.parentElement?.matches('details.accordion'))return;
 const wasOpen=summary.parentElement.open;
 document.querySelectorAll('details.accordion > summary.tabActive').forEach(el=>el.classList.remove('tabActive'));
 if(!wasOpen)summary.classList.add('tabActive');
});
document.addEventListener('toggle',event=>{
 const details=event.target;
 if(details.matches?.('details.accordion')&&!details.open){
  details.querySelector(':scope > summary')?.classList.remove('tabActive');
 }
},true);
let composerDebounce;
for(const id of ['to','subject','body'])$(id).addEventListener('input',()=>{
 $('autosaveStatus').textContent='자동 저장 중...';
 clearTimeout(composerDebounce);
 composerDebounce=setTimeout(()=>saveComposer().catch(e=>setStatus('자동 저장 실패: '+e.message,true)),350);
});
bind('addContact',addContact);
bind('confirmContactCategory',confirmContactCategories);
bind('cancelContactCategory',()=>$('contactCategoryDialog').close());
bind('cancelContactEdit',cancelContactEdit);
bind('addCategory',addCategory);
bind('toggleCategories',async()=>{const all=[...categories,'미분류'].filter(c=>c!=='미분류'||contacts.some(x=>categoryNamesFor(x).includes('미분류')));const shouldOpen=!all.every(c=>openCategories.has(c));openCategories=new Set(shouldOpen?all:[]);renderContacts()});
bind('selectAllContacts',async()=>{selectedContacts=new Set(contacts.map(c=>c.id));renderContacts()});
bind('unselectContacts',async()=>{selectedContacts.clear();renderContacts()});
bind('deleteContacts',deleteContacts);
bind('selectHistory',async()=>{historySelection=!historySelection;selectedHistory.clear();await renderHistory()});
bind('deleteSelectedHistory',async()=>deleteHistoryKeys([...selectedHistory]));
bind('clearHistory',async()=>{const history=await get('history')||[];if(!history.length)return;if(!confirm('발송 기록 '+history.length+'건을 모두 삭제할까요? Gmail의 실제 메일은 그대로 남습니다.'))return;await put('history',[]);selectedHistory.clear();await renderHistory();showSavedCheck()});
$('contactEmail').addEventListener('input',()=>{$('contactError').hidden=true});
bind('saveConfig',()=>{const c=$('clientId').value.trim();if(!c.endsWith('.apps.googleusercontent.com'))throw Error('올바른 Google 웹 클라이언트 ID를 입력하세요.');localStorage.setItem('joon_client_id',c);accessToken='';$('authStatus').textContent='설정 저장 완료 · Gmail 연결을 누르세요';setStatus('✓ 설정 저장 완료')});bind('connect',connect);bind('clear',async()=>{if(!confirm('새 메일을 작성할까요? 현재 작성 내용과 첨부파일을 비웁니다. 주소록과 발송 기록은 유지됩니다.'))return;clearTimeout(composerDebounce);await saving;await put('message',{to:'',subject:'',body:'',files:[]});$('to').value='';$('subject').value='';$('body').value='';$('files').value='';showFiles([]);selectedContacts.clear();renderContacts();$('autosaveStatus').textContent='새 메일 작성 준비됨';showSavedCheck();setStatus('새 메일 작성 준비 완료')});bind('submit',prepare);bind('export',exportBackup);$('restore').addEventListener('change',async e=>{try{if(e.target.files[0])await restoreBackup(e.target.files[0])}catch(err){setStatus(err.message,true)}e.target.value=''});$('files').addEventListener('change',async()=>{const selected=[...$('files').files];if(!selected.length)return;$('submit').disabled=true;setStatus('첨부파일 자동 저장 중...');try{await save();setStatus('✓ 첨부파일 자동 저장 완료 (내용 포함)')}catch(e){setStatus('첨부파일 자동 저장 실패: '+(e.message||String(e)),true)}finally{$('submit').disabled=false}});load();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
