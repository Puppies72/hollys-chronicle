/* Holly's Chronicle v1.9 — existing Supabase campaign/snapshot integration. */
(()=>{'use strict';
const KEY='holly-sw25-v3',CFG='holly-cloud-config-v1',AUTH='holly-cloud-session-v1',TRACK='holly-existing-snapshot-track-v1';
const el=id=>document.getElementById(id);
let config=JSON.parse(localStorage.getItem(CFG)||'null'),session=JSON.parse(localStorage.getItem(AUTH)||'null');
let tracking=JSON.parse(localStorage.getItem(TRACK)||'null'),dirty=false,busy=false,ready=false,debounce;
function status(t){el('cloud-status').textContent=t}
function configure(){config={url:el('cloud-url').value.trim().replace(/\/$/,''),key:el('cloud-key').value.trim()};if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url)||!config.key)throw Error('Enter the existing project URL and publishable/anon key.');localStorage.setItem(CFG,JSON.stringify(config))}
function setSession(s){session={...s,expires_at:Date.now()+1000*(s.expires_in||3600)};localStorage.setItem(AUTH,JSON.stringify(session))}
async function req(path,{method='GET',body,auth=true,headers={}}={}){
 if(!config)throw Error('Save cloud settings first');
 if(auth){if(!session)throw Error('Sign in first');if(Date.now()>session.expires_at-90000){const s=await req('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token},auth:false});setSession(s)}}
 const r=await fetch(config.url+path,{method,headers:{apikey:config.key,...(auth?{Authorization:'Bearer '+session.access_token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await r.text();let result;try{result=JSON.parse(raw)}catch{result=raw}
 if(!r.ok)throw Error((result?.message||result?.error_description||result?.msg||raw||'Request failed')+' ('+r.status+')');return result;
}
function data(){const d=JSON.parse(localStorage.getItem(KEY)||'null');if(!d?.character||!d?.journal||!d?.meta)throw Error('Local Chronicle state is incomplete');return d}
async function campaign(){const rows=await req('/rest/v1/chronicle_campaigns?select=id,name,owner_id&order=created_at.asc&limit=100');const matches=rows.filter(x=>x.name==="Holly's Chronicle");if(matches.length!==1)throw Error('Expected one existing Holly’s Chronicle campaign; found '+matches.length+'. No data changed.');if(matches[0].owner_id!==session.user.id)throw Error('Campaign owner differs from signed-in user.');return matches[0]}
async function latest(id){const rows=await req('/rest/v1/chronicle_snapshots?select=id,version,state&campaign_id=eq.'+encodeURIComponent(id)+'&order=version.desc&limit=1');return rows[0]||null}
function track(c,s){tracking={campaign_id:c.id,version:s.version,id:s.id};localStorage.setItem(TRACK,JSON.stringify(tracking))}
function validate(s){return s&&typeof s==='object'&&s.character&&Array.isArray(s.journal)&&s.meta}
function adopt(c,s){if(!validate(s.state))throw Error('Remote snapshot is not a complete v1.9 Chronicle state; no changes made.');localStorage.setItem(KEY,JSON.stringify(s.state));track(c,s);dirty=false;status('Downloaded snapshot v'+s.version+'. Reloading…');location.reload()}
async function upload({force=false}={}){if(busy)return;busy=true;try{
 const c=await campaign(),r=await latest(c.id);
 if(!force&&(!tracking||tracking.campaign_id!==c.id)){status('Existing snapshots found. Choose “Start from this device” after exporting a backup.');return}
 if(!force&&r&&r.version!==tracking.version){status('Cloud changed since last sync. No upload performed; review copies.');return}
 if(force&&r&&!confirm('Create a NEW snapshot from this device? Older snapshots will remain untouched. Ensure you have exported a JSON backup first.'))return;
 // Append only. Never patch or delete existing snapshots.
 const next=(r?.version||0)+1;
 const result=await req('/rest/v1/chronicle_snapshots',{method:'POST',body:{campaign_id:c.id,version:next,state:data(),created_by:session.user.id},headers:{Prefer:'return=representation'}});
 if(!result?.[0])throw Error('Snapshot was not confirmed by Supabase');
 track(c,result[0]);dirty=false;status('Saved new snapshot v'+next+' to your existing campaign.');
 }catch(e){status('Sync paused: '+e.message)}finally{busy=false}}
async function sync(){if(busy||!session||!navigator.onLine)return;try{
 const c=await campaign(),r=await latest(c.id);
 if(!r){status('No snapshots found. Choose Start from this device.');return}
 if(!tracking||tracking.campaign_id!==c.id){status('Existing campaign found (snapshot v'+r.version+'). Choose which copy to start from.');return}
 if(r.version!==tracking.version){status('Newer cloud snapshot v'+r.version+' detected. '+(dirty?'Local changes also exist: export backups and resolve conflict.':'Select Download latest to load it.'));return}
 if(dirty)await upload();else status('In sync with snapshot v'+r.version);
 }catch(e){status('Sync paused: '+e.message)}}
function changed(){dirty=true;status('Local changes pending cloud sync…');clearTimeout(debounce);debounce=setTimeout(sync,1800)}
const original=Storage.prototype.setItem;
Storage.prototype.setItem=function(k,v){original.call(this,k,v);if(this===localStorage&&k===KEY&&ready)changed()};
const panel=document.createElement('section');panel.id='cloud-panel';
panel.innerHTML=`<details><summary>☁ Cloud sync — existing campaign</summary><div class="cloud-body">
<p id="cloud-status">Not connected</p>
<label>Supabase project URL<input id="cloud-url" placeholder="https://project.supabase.co"></label>
<label>Supabase publishable / anon key<input id="cloud-key" type="password" autocomplete="off"></label>
<button id="cloud-config">Save settings</button><hr>
<label>Email<input id="cloud-email" type="email" autocomplete="email"></label>
<label>Password<input id="cloud-password" type="password" autocomplete="current-password"></label>
<div class="cloud-buttons"><button id="cloud-login">Sign in</button><button id="cloud-logout">Sign out</button></div><hr>
<div class="cloud-buttons"><button id="cloud-download">Download latest</button><button id="cloud-start">Start from this device</button><button id="cloud-sync">Sync now</button></div>
<p class="cloud-small">Uses your existing chronicle_campaigns and chronicle_snapshots tables. Creates new snapshots only; never deletes or overwrites old ones. Export a JSON backup before choosing a starting copy. Session updates remain unchanged. If two devices edit at once, resolve the conflict manually. No passwords or secret/service-role keys belong in GitHub.</p>
</div></details>`;document.body.append(panel);
el('cloud-url').value=config?.url||'';el('cloud-key').value=config?.key||'';
function action(id,fn){el(id).addEventListener('click',async()=>{try{await fn()}catch(e){status('Error: '+e.message)}})}
action('cloud-config',async()=>{configure();status('Settings saved. Sign in with existing account.')});
action('cloud-login',async()=>{configure();const s=await req('/auth/v1/token?grant_type=password',{method:'POST',body:{email:el('cloud-email').value.trim(),password:el('cloud-password').value},auth:false});setSession(s);tracking=null;localStorage.removeItem(TRACK);dirty=false;await sync()});
action('cloud-logout',async()=>{session=null;localStorage.removeItem(AUTH);tracking=null;localStorage.removeItem(TRACK);status('Signed out. Local data retained.')});
action('cloud-download',async()=>{const c=await campaign(),s=await latest(c.id);if(!s)throw Error('No snapshots exist');if(!validate(s.state))throw Error('Latest snapshot is a legacy/test format; cannot import into current app. Use Start from this device to append current Chronicle without altering older snapshots.');if(confirm('Replace this device’s local Chronicle with snapshot v'+s.version+'? Export your JSON backup first.'))adopt(c,s)});
action('cloud-start',async()=>upload({force:true}));
action('cloud-sync',sync);
ready=true;status(session?'Signed in. Checking existing campaign…':'Save settings and sign in with existing account.');
if(session)sync();
window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});setInterval(()=>{if(session&&!document.hidden)sync()},30000);
})();
