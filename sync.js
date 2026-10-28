/* Holly's Chronicle cloud synchronisation: Supabase REST + Auth. No secret service-role keys. */
(()=>{'use strict';
const KEY='holly-sw25-v3', SETTINGS='holly-cloud-config-v1',SESSION='holly-cloud-session-v1',REV='holly-cloud-revision-v1';
let config=JSON.parse(localStorage.getItem(SETTINGS)||'null'), session=JSON.parse(localStorage.getItem(SESSION)||'null');
let revision=localStorage.getItem(REV),dirty=false,busy=false,timer=null,ready=false;
const $=id=>document.getElementById(id);
function status(s){$('cloud-status').textContent=s}
function saveConfig(){config={url:$('cloud-url').value.trim().replace(/\/$/,''),key:$('cloud-key').value.trim()};if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url))throw Error('Use your Supabase project HTTPS URL.');if(!config.key)throw Error('Enter your Supabase publishable/anon key.');localStorage.setItem(SETTINGS,JSON.stringify(config));}
async function req(path,{method='GET',body,auth=true,headers={}}={}){
if(!config)throw Error('Configure Supabase first.');
if(auth)await refresh();
const r=await fetch(config.url+path,{method,headers:{apikey:config.key,...(auth&&session?{Authorization:'Bearer '+session.access_token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
const raw=await r.text();let result;try{result=raw?JSON.parse(raw):null}catch{result=raw}
if(!r.ok)throw Error((result?.msg||result?.message||result?.error_description||result?.error||raw||'Request failed')+' ('+r.status+')');return result;
}
async function refresh(){if(!session)throw Error('Sign in first.');if(Date.now() < session.expires_at-90000)return;
const s=await req(config.url?'/auth/v1/token?grant_type=refresh_token':'',{method:'POST',body:{refresh_token:session.refresh_token},auth:false});setSession(s);}
function setSession(s){session={...s,expires_at:Date.now()+(s.expires_in||3600)*1000};localStorage.setItem(SESSION,JSON.stringify(session));}
function localData(){const x=localStorage.getItem(KEY);if(!x)throw Error('No local campaign data.');return JSON.parse(x)}
function adopt(payload,rev){if(!payload?.character||!payload?.journal||!payload?.meta)throw Error('Cloud data is not a valid Chronicle backup.');localStorage.setItem(KEY,JSON.stringify(payload));revision=String(rev);localStorage.setItem(REV,revision);dirty=false;status('Cloud campaign downloaded. Reloading…');location.reload();}
async function row(){const rows=await req('/rest/v1/chronicle_saves?select=revision,payload&limit=1');return rows[0]||null;}
async function sync({manual=false}={}){if(busy||!session||!navigator.onLine)return;busy=true;try{
const remote=await row();
if(!remote){if(!manual){status('No cloud save yet — select Sync now to upload your campaign.');return;}
await req('/rest/v1/chronicle_saves',{method:'POST',body:{user_id:session.user.id,revision:1,payload:localData()},headers:{Prefer:'return=minimal'}});revision='1';localStorage.setItem(REV,revision);dirty=false;status('First cloud backup uploaded.');return;}
if(revision===null){status('Cloud save exists. Choose Download cloud or Upload local in Cloud settings.');return;}
if(Number(revision)!==Number(remote.revision)){
if(dirty){status('Sync conflict: both devices changed. Export a backup, then choose which copy to keep.');return;}
adopt(remote.payload,remote.revision);return;
}
if(dirty){const updated=await req('/rest/v1/chronicle_saves?user_id=eq.'+encodeURIComponent(session.user.id)+'&revision=eq.'+revision,{method:'PATCH',body:{payload:localData(),revision:Number(revision)+1,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});
if(!updated.length){status('Sync conflict: cloud changed. Choose which copy to keep.');return;}
revision=String(updated[0].revision);localStorage.setItem(REV,revision);dirty=false;status('Saved to cloud.');
}else status('Up to date across devices.');
}catch(e){status('Sync paused: '+e.message)}finally{busy=false;}}
function changed(){dirty=true;status('Local changes waiting to sync…');clearTimeout(timer);timer=setTimeout(()=>sync(),1500)}
// Observe only Chronicle's own key; never upload credentials or unrelated browser storage.
const original=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){original.call(this,k,v);if(this===localStorage&&k===KEY&&ready)changed()};
function panel(){const el=document.createElement('section');el.id='cloud-panel';el.innerHTML=`<details><summary>☁ Cloud sync <span id="cloud-dot">●</span></summary><div class="cloud-body"><p id="cloud-status">Not connected</p><label>Supabase project URL<input id="cloud-url" placeholder="https://your-project.supabase.co"></label><label>Supabase publishable / anon key<input id="cloud-key" type="password" autocomplete="off"></label><button id="cloud-config">Save cloud settings</button><hr><label>Email<input id="cloud-email" type="email" autocomplete="email"></label><label>Password<input id="cloud-password" type="password" autocomplete="current-password"></label><div class="cloud-buttons"><button id="cloud-signup">Create account</button><button id="cloud-login">Sign in</button><button id="cloud-logout">Sign out</button></div><hr><div class="cloud-buttons"><button id="cloud-sync">Sync now</button><button id="cloud-download">Download cloud copy</button><button id="cloud-upload">Upload local copy</button></div><p class="cloud-small">Before replacing either copy, export a JSON backup in Data & backup. Never paste a Supabase service-role key here. Requires an HTTPS-hosted app and your own Supabase project.</p></div></details>`;document.body.append(el);
$('cloud-url').value=config?.url||'';$('cloud-key').value=config?.key||'';
function action(id,fn){$(id).addEventListener('click',async()=>{try{await fn()}catch(e){status('Error: '+e.message)}})}
action('cloud-config',async()=>{saveConfig();status('Cloud settings saved. Sign in next.')});
action('cloud-signup',async()=>{saveConfig();const s=await req('/auth/v1/signup',{method:'POST',body:{email:$('cloud-email').value.trim(),password:$('cloud-password').value},auth:false});if(s.access_token){setSession(s);revision=null;localStorage.removeItem(REV);status('Account created and signed in. Select Sync now.')}else status('Account created. Confirm your email, then sign in.')});
action('cloud-login',async()=>{saveConfig();const s=await req('/auth/v1/token?grant_type=password',{method:'POST',body:{email:$('cloud-email').value.trim(),password:$('cloud-password').value},auth:false});setSession(s);revision=null;localStorage.removeItem(REV);dirty=false;status('Signed in. Select Download cloud or Upload local to choose the starting copy.')});
action('cloud-logout',async()=>{session=null;localStorage.removeItem(SESSION);revision=null;localStorage.removeItem(REV);dirty=false;status('Signed out. Local data retained.')});
action('cloud-sync',async()=>{if(revision===null){const r=await row();if(r){status('Cloud copy found. Choose Download cloud or Upload local.');return}}dirty=true;await sync({manual:true})});
action('cloud-download',async()=>{const r=await row();if(!r){status('No cloud save found.');return}if(confirm('Replace local campaign with the cloud version? Export a JSON backup first.'))adopt(r.payload,r.revision)});
action('cloud-upload',async()=>{if(!session)throw Error('Sign in first.');const r=await row();if(r&&!confirm('Replace the cloud campaign with THIS device’s local copy? This overwrites changes from other devices. Export backups first.'))return;
if(r){const result=await req('/rest/v1/chronicle_saves?user_id=eq.'+encodeURIComponent(session.user.id)+'&revision=eq.'+r.revision,{method:'PATCH',body:{payload:localData(),revision:r.revision+1,updated_at:new Date().toISOString()},headers:{Prefer:'return=representation'}});if(!result.length)throw Error('Cloud changed during upload. Try again after checking backups.');revision=String(result[0].revision)}else{await req('/rest/v1/chronicle_saves',{method:'POST',body:{user_id:session.user.id,revision:1,payload:localData()},headers:{Prefer:'return=minimal'}});revision='1'}localStorage.setItem(REV,revision);dirty=false;status('Local campaign uploaded to cloud.');});
status(session?'Signed in. '+(revision===null?'Choose initial cloud/local copy.':'Checking sync…'):'Configure Supabase and sign in.');}
window.addEventListener('online',()=>sync());document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
panel();ready=true;if(session&&revision!==null)sync();setInterval(()=>{if(session&&!document.hidden)sync()},30000);
})();
