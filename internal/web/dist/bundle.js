var cr=Object.defineProperty;var mt=(t,o)=>{for(var r in o)cr(t,r,{get:o[r],enumerable:!0,configurable:!0,set:(e)=>o[r]=()=>e})};var R=function(t,o,r,e){var i=arguments.length,n=i<3?o:e===null?e=Object.getOwnPropertyDescriptor(o,r):e,s;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")n=Reflect.decorate(t,o,r,e);else for(var l=t.length-1;l>=0;l--)if(s=t[l])n=(i<3?s(n):i>3?s(o,r,n):s(o,r))||n;return i>3&&n&&Object.defineProperty(o,r,n),n};var q=(t,o)=>{if(typeof Reflect==="object"&&typeof Reflect.metadata==="function")return Reflect.metadata(t,o)},ft=(t,o)=>()=>(t&&(o=t(t=0)),o);var Gt={};mt(Gt,{socketService:()=>dr});class Ct{socket=null;listeners=[];reconnectTimeout;constructor(){this.connect()}connect(){let t=window.location.protocol==="https:"?"wss:":"ws:",o=window.location.host,r=`${t}//${o}/ws`;this.socket=new WebSocket(r),this.socket.onmessage=(e)=>{try{let i=JSON.parse(e.data);this.notify(i)}catch(i){console.error("[SocketService] Failed to parse message",i)}},this.socket.onclose=()=>{console.warn("[SocketService] WebSocket closed. Reconnecting..."),this.scheduleReconnect()},this.socket.onerror=(e)=>{console.error("[SocketService] WebSocket error",e),this.socket?.close()}}scheduleReconnect(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);this.reconnectTimeout=setTimeout(()=>this.connect(),5000)}subscribe(t){return this.listeners.push(t),()=>{this.listeners=this.listeners.filter((o)=>o!==t)}}notify(t){this.listeners.forEach((o)=>o(t))}}var dr;var Kt=ft(()=>{dr=new Ct});var X={};mt(X,{collisionService:()=>j});var j;var O=ft(()=>{j={isOverlap(t,o){return t.x<o.x+o.w&&t.x+t.w>o.x&&t.y<o.y+o.h&&t.y+t.h>o.y},calculateDropValidity(t,o,r=12){let e=Number(t.x),i=Number(t.y),n=Number(t.w),s=Number(t.h);if(e<1||e+n-1>r||i<1)return{valid:!1,x:e,y:i};let c=o.find((d)=>d.id===t.id)?.type==="section",p={x:e,y:i,w:n,h:s};for(let d of o){if(d.id===t.id)continue;let g=Number(d.x),h=Number(d.y),b=Number(d.w||1),m=Number(d.h||1),_={x:g,y:h,w:b,h:m};if(d.parent_id){let w=o.find((f)=>f.id===d.parent_id);if(w)_.x=Number(w.x)+g-1,_.y=Number(w.y)+h-1;else continue}if(this.isOverlap(p,_)){if(!c&&d.type==="section"){let w=e-Number(d.x)+1,f=i-Number(d.y)+1;if(w<1||w+n-1>Number(d.w||1)||f<1||f+s-1>Number(d.h||1))return{valid:!1,x:e,y:i};let _t=o.filter((Y)=>Y.parent_id===d.id),u=!1;for(let Y of _t){let sr={x:Number(Y.x),y:Number(Y.y),w:Number(Y.w||1),h:Number(Y.h||1)},lr={x:w,y:f,w:n,h:s};if(this.isOverlap(lr,sr)){u=!0;break}}if(!u)return{valid:!0,x:e,y:i,targetGroup:d}}return{valid:!1,x:e,y:i}}}return{valid:!0,x:e,y:i}},snapToGrid(t,o,r,e){let i=r+e,n=Math.max(1,Math.floor(t/i)+1),s=r+e,l=Math.max(1,Math.floor(o/s)+1);return{x:n,y:l}},findFirstAvailableSlot(t,o,r,e=12){let i=1;while(!0){for(let n=1;n<=e-t+1;n++){let s={x:n,y:i,w:t,h:o},l=!1;for(let c of r){let{x:p,y:d}=c,g=c.w||1,h=c.h||1;if(c.parent_id){let m=r.find((_)=>_.id===c.parent_id);if(m)p=m.x+c.x-1,d=m.y+c.y-1;else continue}let b={x:p,y:d,w:g,h};if(this.isOverlap(s,b)){l=!0;break}}if(!l)return{x:n,y:i}}if(i++,i>100)return{x:1,y:100}}},findAvailableSlot(t,o,r,e){let i=1;while(!0){for(let n=1;n<=e-t+1;n++){let s={x:n,y:i,w:t,h:o},l=!1;for(let c of r)if(this.isOverlap(s,c)){l=!0;break}if(!l)return{x:n,y:i}}if(i++,i>100)return{x:1,y:100}}}}});var At={};mt(At,{eventBus:()=>at,EVENTS:()=>it});var it,Yo,at;var xt=ft(()=>{it={SHOW_CONFIRMATION:"kashboard:show-confirmation",SHOW_WIDGET_CONFIG:"kashboard:show-widget-config",NOTIFY:"kashboard:notify"};Yo=class Yo extends EventTarget{emit(t,o){this.dispatchEvent(new CustomEvent(t,{detail:o}))}on(t,o){this.addEventListener(t,o)}off(t,o){this.removeEventListener(t,o)}};at=new Yo});class Ft{baseUrl;constructor(){this.baseUrl=window.CSH_CONFIG?.API_BASE_URL||""}async request(t,o){let r=`${this.baseUrl}${t}`;try{let e=await fetch(r,{...o,headers:{"Content-Type":"application/json",...o.headers}});if(!e.ok){let n=await e.json().catch(()=>({}));throw Error(n.error||`HTTP ${e.status}: ${e.statusText}`)}let i=await e.text();return i?JSON.parse(i):{}}catch(e){throw console.error(`[ApiService] Request failed: ${r}`,e),e}}async get(t){return this.request(t,{method:"GET"})}async post(t,o){return this.request(t,{method:"POST",body:JSON.stringify(o)})}async patch(t,o){return this.request(t,{method:"PATCH",body:JSON.stringify(o)})}async put(t,o){return this.request(t,{method:"PUT",body:JSON.stringify(o)})}async delete(t){return this.request(t,{method:"DELETE"})}}var z=new Ft;var T={async getCurrentUser(){return z.get("/api/me")},async updateProfile(t){return z.post("/api/user/update-profile",t)},async updatePreferences(t){return z.post("/api/user/preferences",t)},async changePassword(t){return z.post("/api/user/change-password",t)},async getUsers(){return z.get("/api/users")},async createUser(t){return z.post("/api/users",t)},async adminUpdateUser(t){return z.put("/api/users",t)},async deleteUser(t){return z.delete(`/api/users?id=${t}`)}};var F=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class J{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let t=localStorage.getItem("csh_lang"),o=navigator.language.split("-")[0],r="en";if(t&&F.find((e)=>e.code===t))r=t;else if(F.find((e)=>e.code===o))r=o;if(r!=="en")await this.loadLocale(r);this.currentLanguage=r,this.notifyListeners()}static getInstance(){if(!J.instance)J.instance=new J;return J.instance}getLocale(){return{...F.find((o)=>o.code===this.currentLanguage)||F[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){return F}async loadLocale(t){if(this.cache.has(t))return;try{let o=await fetch(`/locales/${t}.json?v=${new Date().getTime()}`);if(!o.ok)throw Error(`Failed to load locale ${t}`);let r=await o.json();this.cache.set(t,r)}catch(o){console.error(o)}}async setLanguage(t){if(F.find((o)=>o.code===t))await this.loadLocale(t),this.currentLanguage=t,localStorage.setItem("csh_lang",t),this.notifyListeners();else console.warn(`[I18n] Language ${t} not supported`)}t(t,o){let r=this.cache.get(this.currentLanguage),e=this.cache.get("en"),i=r?.[t];if(!i&&e)i=e[t];if(!i)return t;if(o)Object.keys(o).forEach((n)=>{i=i.replace(`{${n}}`,o[n])});return i}subscribe(t){return this.listeners.push(t),t(this.getLocale()),()=>{this.listeners=this.listeners.filter((o)=>o!==t)}}notifyListeners(){let t=this.getLocale();this.listeners.forEach((o)=>o(t))}async ensureInitialized(){return this.initialized}}var a=J.getInstance();class Bt{user=null;listeners=[];constructor(){this.loadFromStorage()}loadFromStorage(){let t=localStorage.getItem("csh_user_cache");if(t)try{this.user=JSON.parse(t),this.applyAesthetics(),this.notify()}catch(o){console.error("Failed to parse user cache",o)}}saveToStorage(){if(this.user)localStorage.setItem("csh_user_cache",JSON.stringify(this.user))}subscribe(t){if(this.listeners.push(t),this.user)t(this.user);return()=>{this.listeners=this.listeners.filter((o)=>o!==t)}}notify(){this.listeners.forEach((t)=>t(this.user)),this.saveToStorage()}setUser(t){if(!t)return;let o={grid_columns_pc:9,grid_columns_tablet:4,grid_columns_mobile:2};this.user={...t,preferences:{accent_color:t.accent_color||"blue",language:t.language||"en",theme:t.theme,grid_columns_pc:t.grid_columns_pc||o.grid_columns_pc,grid_columns_tablet:t.grid_columns_tablet||o.grid_columns_tablet,grid_columns_mobile:t.grid_columns_mobile||o.grid_columns_mobile,project_name:t.project_name||"CSH Dashboard"},project_name:t.project_name||"CSH Dashboard"},this.applyAesthetics(),this.notify()}applyAesthetics(){if(!this.user||!this.user.preferences)return;let t=this.user.preferences,o=document.documentElement;if(t.grid_columns_pc)o.style.setProperty("--grid-columns-pc",String(t.grid_columns_pc));if(t.grid_columns_tablet)o.style.setProperty("--grid-columns-tablet",String(t.grid_columns_tablet));if(t.grid_columns_mobile)o.style.setProperty("--grid-columns-mobile",String(t.grid_columns_mobile));if(t.accent_color){let r=this.getAccentHex(t.accent_color);o.style.setProperty("--accent",r)}if(t.theme==="light")o.classList.add("light-theme");else o.classList.remove("light-theme")}getAccentHex(t){if(t.startsWith("#"))return t;return{blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"}[t]||"#0078D4"}async updatePreferences(t){if(!this.user||!this.user.preferences)return;let o={...this.user.preferences};if(this.user.preferences={...this.user.preferences,...t},t.accent_color)this.user.accent_color=t.accent_color;if(t.language)this.user.language=t.language;if(t.project_name)this.user.project_name=t.project_name;if(t.theme)this.user.preferences.theme=t.theme;this.applyAesthetics(),this.notify();try{if(await T.updatePreferences({accent_color:this.user.accent_color,language:this.user.language,theme:this.user.preferences.theme,grid_columns_pc:this.user.preferences.grid_columns_pc,grid_columns_tablet:this.user.preferences.grid_columns_tablet,grid_columns_mobile:this.user.preferences.grid_columns_mobile,project_name:this.user.project_name}),window.notifier)window.notifier.show(a.t("general.success")||"Preferences saved")}catch(r){if(console.error("[UserStore] Failed to sync preferences, rolling back",r),this.user.preferences=o,this.applyAesthetics(),this.notify(),window.notifier)window.notifier.show("Failed to save settings","error")}}async updateProfile(t){if(!this.user)return;try{if(await T.updateProfile(t),this.user={...this.user,...t},this.notify(),window.notifier)window.notifier.show("Profile updated")}catch(o){if(console.error("[UserStore] Update profile failed",o),window.notifier)window.notifier.show("Failed to update profile","error")}}async changePassword(t){try{await T.changePassword(t)}catch(o){throw console.error("[UserStore] Change password failed",o),o}}getUser(){return this.user}async fetchUser(){try{let t=await T.getCurrentUser();this.setUser(t)}catch(t){if(console.error("[UserStore] Error fetching user",t),!this.user){if(window.notifier)window.notifier.show("Session expired or server unreachable","error")}}}}var $=new Bt;var E={async getItems(){return z.get("/api/dashboard")},async updateItem(t){let o={...t};if(t.parent_id===void 0&&"parent_id"in t)o.clear_parent=!0;return z.patch(`/api/dashboard/item/${t.id}`,o)},async createItem(t){return z.post("/api/dashboard/item",t)},async deleteItem(t){return z.delete(`/api/dashboard/item/${t}`)},async checkHealth(t){return z.get(`/api/dashboard/health?url=${encodeURIComponent(t)}`)}};var nt="kashboard-items",ut=[{id:1,type:"bookmark",x:1,y:1,w:1,h:1,content:{label:"Proxmox",url:"#",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png",iconName:"proxmox"}},{id:2,type:"bookmark",x:2,y:1,w:1,h:1,content:{label:"TrueNAS",url:"#",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/truenas.png",iconName:"truenas"}},{id:3,type:"bookmark",x:3,y:1,w:1,h:1,content:{label:"Cloudflare",url:"#",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/cloudflare.png",iconName:"cloudflare"}},{id:4,type:"bookmark",x:1,y:2,w:1,h:1,content:{label:"GitHub",url:"#",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/github.png",iconName:"github"}},{id:5,type:"bookmark",x:2,y:2,w:1,h:1,content:{label:"VS Code",url:"#",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/vscode.png",iconName:"vscode"}},{id:6,type:"bookmark",x:3,y:2,w:1,h:1,content:{label:"Documentation",url:"#",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docs.png",iconName:"docs"}}];class Nt{state={isEditing:!1,items:[...ut],searchQuery:"",isOffline:!1,stats:null};listeners=[];constructor(){this.loadFromLocalStorage(),this.initSocket()}initSocket(){Promise.resolve().then(() => (Kt(),Gt)).then(({socketService:t})=>{t.subscribe((o)=>{this.state.stats={cpu_usage:o.cpu_usage,ram_usage:o.ram_usage,temperature:o.temperature},this.notify()})})}saveToLocalStorage(){try{if(this.state.items.filter((r)=>r.parent_id!==void 0).length>0);let o=JSON.stringify(this.state.items);localStorage.setItem(nt,o)}catch(t){console.error("[DashboardStore] Failed to save to localStorage",t)}}loadFromLocalStorage(){try{let t=localStorage.getItem(nt);if(t){let o=JSON.parse(t);if(Array.isArray(o)&&o.length>0)this.state.items=o}}catch(t){console.error("[DashboardStore] Failed to load from localStorage",t)}}subscribe(t){return this.listeners.push(t),this.ensureItemsIsArray(),t({...this.state,items:[...this.state.items]}),()=>{this.listeners=this.listeners.filter((o)=>o!==t)}}ensureItemsIsArray(){if(!Array.isArray(this.state.items))console.error("[DashboardStore] CRITICAL: items is not an array, resetting to empty array",typeof this.state.items),this.state.items=[]}notify(){this.ensureItemsIsArray();let t={...this.state,items:[...this.state.items]};this.listeners.forEach((o)=>o(t))}setEditMode(t){this.state.isEditing=t,this.notify()}toggleEditMode(){this.setEditMode(!this.state.isEditing)}setSearchQuery(t){this.state.searchQuery=t.toLowerCase().trim(),this.notify()}async fetchItems(){try{try{let t=await E.getItems();if(Array.isArray(t)&&t.length>0){let o=localStorage.getItem(nt);if(o){let r=JSON.parse(o);t.forEach((e)=>{if(e.parent_id===void 0){let i=r.find((n)=>n.id===e.id);if(i&&i.parent_id!==void 0)e.parent_id=i.parent_id}})}this.state.items=t,this.state.isOffline=!1,this.saveToLocalStorage()}else throw Error("Backend returned empty or invalid data")}catch(t){this.state.isOffline=!0;let o=localStorage.getItem(nt);if(o){let r=JSON.parse(o);if(Array.isArray(r)&&r.length>0)this.state.items=r;else this.state.items=[...ut],this.saveToLocalStorage()}else this.state.items=[...ut],this.saveToLocalStorage()}this.ensureItemsIsArray(),this.notify()}catch(t){console.error("[DashboardStore] Failed to fetch dashboard items",t),this.state.items=[]}}async updateItem(t){try{this.ensureItemsIsArray();let o=this.state.items.findIndex((e)=>e.id==t.id);if(o===-1){console.warn("[DashboardStore] Item not found for update:",t.id);return}let r={...this.state.items[o]};this.state.items[o]={...this.state.items[o],...t},this.saveToLocalStorage(),this.notify();try{await E.updateItem(t),this.state.isOffline=!1,this.notify()}catch(e){console.error("[DashboardStore] Failed to sync item update (offline?), keeping local state",e),this.state.isOffline=!0,this.saveToLocalStorage(),this.notify()}}catch(o){console.error("[DashboardStore] Error updating item",o)}}async resizeItem(t,o,r){let e=this.state.items.find((i)=>i.id===t);if(!e)return;if(console.log(`[DashboardStore] Resizing item ${t} to ${o}x${r}`),await this.updateItem({id:t,w:o,h:r}),e.type==="section")await this.reflowChildren(t,o)}async reflowChildren(t,o){Promise.resolve().then(() => (O(),X)).then(async({collisionService:r})=>{let e=this.state.items.filter((n)=>n.parent_id===t).sort((n,s)=>n.y-s.y||n.x-s.x);if(e.length===0)return;console.log(`[DashboardStore] Reflowing ${e.length} children for parent ${t}`);let i=[];for(let n of e){let s=r.findAvailableSlot(n.w,n.h,i,o);if(i.push({x:s.x,y:s.y,w:n.w,h:n.h}),n.x!==s.x||n.y!==s.y)console.log(`[DashboardStore] Reflow moving child ${n.id} to ${s.x},${s.y}`),await this.updateItem({id:n.id,x:s.x,y:s.y})}})}async addItem(t){try{console.log("[DashboardStore] Adding item:",t),this.ensureItemsIsArray();try{let o={...t};if(o.type==="widget"&&!o.url)o.url="";let r=await E.createItem(o);this.state.isOffline=!1,this.state.items.push(r),console.log("[DashboardStore] Item added (Synced), new length:",this.state.items.length),this.saveToLocalStorage(),this.notify()}catch(o){console.error("[DashboardStore] Failed to add item to backend",o)}}catch(o){console.error("[DashboardStore] Error adding item",o)}}async deleteItem(t){try{this.ensureItemsIsArray();let o=this.state.items.findIndex((e)=>e.id==t);if(console.log("[DashboardStore] Deleting item",t,"Found index:",o),o===-1){console.warn("[DashboardStore] Item not found for deletion:",t);return}let r=this.state.items[o];this.state.items.splice(o,1),this.saveToLocalStorage(),this.notify();try{await E.deleteItem(t)}catch(e){console.error("[DashboardStore] Failed to delete item, rolling back",e),this.state.items.push(r),this.saveToLocalStorage(),this.notify()}}catch(o){console.error("[DashboardStore] Error deleting item",o)}}getState(){return this.ensureItemsIsArray(),{...this.state,items:[...this.state.items]}}}var x=new Nt;class Mt{interval=null;checkFrequency=300000;start(){if(this.interval)return;setTimeout(()=>this.checkAll(),2000),this.interval=window.setInterval(()=>{this.checkAll()},this.checkFrequency)}stop(){if(this.interval)clearInterval(this.interval),this.interval=null}async checkAll(){let o=x.getState().items.filter((r)=>{if(r.type!=="bookmark")return!1;let e=r.content;if(typeof e==="string")try{e=JSON.parse(e)}catch(i){return!1}return e&&e.statusCheck===!0});for(let r of o)this.checkItem(r)}async checkItem(t){let o=t.content;if(typeof o==="string")try{o=JSON.parse(o)}catch(e){return}let r=o.url;if(!r||r==="#"||r.startsWith("javascript:"))return;try{if((await E.checkHealth(r)).status==="up")this.updateUIStatus(t.id,"up");else this.updateUIStatus(t.id,"down")}catch(e){console.warn(`[StatusService] ${r} health check failed:`,e),this.updateUIStatus(t.id,"down")}}updateUIStatus(t,o){let r=document.querySelector("bookmark-grid");if(!r||!r.shadowRoot)return;let e=r.shadowRoot.querySelector(`.bookmark-grid__card[data-id="${t}"]`);if(!e)return;let i=e.querySelector(".status-indicator");if(!i)return;i.classList.remove("status-pending","status-up","status-down"),i.classList.add(`status-${o}`);let n=o==="up"?"Online":o==="down"?"Offline / Unreachable":"Checking...";i.setAttribute("title",n)}}var D=new Mt;class Q{static STORAGE_KEY="kashboard_theme";static CLASS_NAME="dark-mode";static init(){let t=localStorage.getItem(this.STORAGE_KEY);if(t==="dark")this.enableDark();else if(t==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(t,o,r){let e="";if(r){let i=new Date;i.setTime(i.getTime()+r*24*60*60*1000),e="; expires="+i.toUTCString()}document.cookie=t+"="+(o||"")+e+"; path=/"}}var Yt=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var qt=`:host {
    display: block;
}

.paper {
    /* Neutralized to allow components.css to control styling via Host */
    background-color: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    color: inherit;
    box-sizing: border-box;
    height: 100%;
}`;class Jt extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${qt}</style>
            ${Yt()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",Jt);var Ot=`:host {
    display: inline-block;
    width: 100%;
}

.btn {
    width: 100%;
    height: 38px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    outline: none;
    box-sizing: border-box;
    padding: 0 16px;
}

/* Variant: Ghost (Default) */
.btn--ghost {
    background: transparent;
    color: var(--text-dim);
    border: 1px solid var(--border);
}

.btn--ghost:hover {
    color: var(--text-main);
    border-color: var(--border-bright);
    background: var(--panel);
}

/* Variant: Primary */
.btn--primary {
    background: var(--surface-solid);
    color: var(--accent);
    border: 1px solid var(--accent);
}

.btn--primary:hover {
    background: var(--surface-solid);
    /* Maintain solid background */
    box-shadow: 0 0 12px rgba(0, 120, 212, 0.2);
    /* Using primary blue var shade */
    border-color: var(--accent);
}

.btn:active {
    transform: translateY(1px);
}`;class Qt extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(t){if(this.getAttribute("type")==="submit"){let o=this.closest("form");if(o)if(o.requestSubmit)o.requestSubmit();else o.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(t){this._loading=t,this.render()}get loading(){return this._loading}render(){let t=this.getAttribute("variant")||"ghost",o=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${Ot}</style>
            <button class="btn btn--${t}" ${this._loading?"disabled":""}>
                ${o}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",Qt);var Zt=({src:t,initials:o,alt:r})=>`
    <div class="avatar" title="${r}">
        ${t?`<img src="${t}" alt="${r}" class="avatar__img">`:`<span class="avatar__initials">${o}</span>`}
    </div>
`;var Ut=`:host {
    display: block;
    margin-left: auto;
    margin-right: auto;
    box-sizing: border-box;
}

.avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 1px solid var(--border);
    overflow: hidden;
    background-color: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-main);
    font-weight: 600;
    font-size: inherit;
    transition: border-color 150ms ease;
    box-sizing: border-box;
}

.avatar:hover {
    border-color: var(--accent);
}

.avatar__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar__initials {
    user-select: none;
}`;class Xt extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(t,o,r){if(o!==r)this.render()}render(){let t=this.getAttribute("src"),o=this.getAttribute("initials")||"??",r=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${Ut}</style>
            ${Zt({src:t||void 0,initials:o,alt:r})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",Xt);var Dt=(t)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.profile")}</div>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" onclick="this.nextElementSibling.click()">
                    <app-avatar initials="${t.initials||"??"}" src="${t.avatar_url||""}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">${a.t("action.change_image")}</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" onchange="this.getRootNode().host.handleAvatarChange(event)">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${t.username||a.t("settings.default_user")}</span>
                    <span class="mono-tag">
                        ${(()=>{let o=(t.role||"").toLowerCase();if(o==="admin"||o==="administrator")return a.t("settings.role_admin");if(o==="user")return a.t("settings.role_user");return t.role||a.t("settings.default_role")})()}
                    </span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${a.t("settings.display_username")}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${t.username||""}" placeholder="${a.t("settings.display_username")}">
                        <app-button variant="primary" onclick="this.getRootNode().host.updateUsername(document.getElementById('username-input').value)">${a.t("action.update")}</app-button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("auth.password")}</div>
            <h3 class="settings-content__title">${a.t("settings.system_password")}</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${a.t("settings.current_password")}</label>
                <input type="password" id="current-password" class="settings-content__input" placeholder="${a.t("settings.password_placeholder")}">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${a.t("settings.new_password")}</label>
                <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${a.t("settings.confirm_password")}</label>
                <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div style="margin-top: 32px;">
                <app-button variant="primary" onclick="this.getRootNode().host.updatePassword()">${a.t("general.save")}</app-button>
            </div>
        </div>
    </div>
`,Vt=(t,o,r)=>`
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">${a.t("settings.appearance")}</div>
             <h3 class="settings-content__title">${a.t("settings.studio_accent")}</h3>
             <div class="settings-content__color-grid">
                ${r.map((e)=>`
                    <div class="settings-content__color-swatch ${t.accent_color===e?"settings-content__color-swatch--active":""}" 
                         style="background-color: ${o[e]}"
                         onclick="this.getRootNode().host.savePrefs({accent_color: '${e}'})">
                         ${t.accent_color===e?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>':""}
                    </div>
                `).join("")}
                <div class="settings-content__color-swatch settings-content__color-swatch--custom ${t.accent_color.startsWith("#")?"settings-content__color-swatch--active":""}" 
                     style="background-color: ${t.accent_color.startsWith("#")?t.accent_color:"#333"}">
                     <svg viewBox="0 0 24 24" style="opacity: 0.8; fill: ${t.accent_color.startsWith("#")?"#fff":"rgba(255,255,255,0.4)"};">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                     </svg>
                     <input type="color" class="settings-content__swatch-picker" value="${t.accent_color.startsWith("#")?t.accent_color:"#0078D4"}" 
                            onchange="this.getRootNode().host.savePrefs({accent_color: this.value})">
                </div>
             </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag settings-content__section-spacer" style="margin-bottom: 8px;">${a.t("settings.system_locale")}</div>
            <h3 class="settings-content__title">${a.t("settings.localization")}</h3>
            <div class="settings-content__form-group">
                <div style="display: flex; gap: 16px;">
                    <div style="flex: 1;">
                        <label class="settings-content__label">${a.t("settings.language")}</label>
                        <select class="settings-content__select" onchange="this.getRootNode().host.savePrefs({language: this.value})">
                            ${a.getAvailableLocales().map((e)=>`<option value="${e.code}" ${t.language===e.code?"selected":""}>${e.flag} ${e.name}</option>`).join("")}
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label class="settings-content__label">${a.t("settings.theme_mode")}</label>
                         <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!t.theme||t.theme==="dark"?"active":""}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'dark'})">
                                \uD83C\uDF19 ${a.t("settings.dark")}
                            </button>
                            <button class="settings-content__segment ${t.theme==="light"?"active":""}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'light'})">
                                ☀️ ${a.t("settings.light")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`,Pt=(t,o)=>`
    <div class="bento-grid">
        <div class="bento-card" style="grid-column: span 2;">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.interface_title")}</div>
            
            <!-- Project Name -->
            <div class="settings-content__form-group" style="margin-bottom: 24px;">
                <label class="settings-content__label">${a.t("settings.project_name")}</label>
                <div style="display: flex; gap: 8px;">
                     <input type="text" 
                            id="project-name-input"
                            class="settings-content__input" 
                            value="${t.project_name||"Kashboard"}" 
                            placeholder="Kashboard">
                     <app-button variant="primary" onclick="this.getRootNode().host.savePrefs({project_name: this.getRootNode().getElementById('project-name-input').value})">${a.t("action.update")}</app-button>
                </div>
            </div>

            <div class="settings-content__personalization-grid">
                ${o.map((r)=>`
                    <div class="settings-content__slider-group">
                        <div class="settings-content__slider-header">
                            <label class="settings-content__slider-label">${r.label}</label>
                            <span class="settings-content__slider-value" id="val-${r.key}">${t[r.key]||r.min}</span>
                        </div>
                        <input type="range" 
                               min="${r.min}" max="${r.max}" 
                               value="${t[r.key]||r.min}"
                               oninput="this.getRootNode().host.updateGridPref('${r.key}', this.value)"
                               onchange="this.getRootNode().host.commitGridPref('${r.key}', this.value)">
                    </div>
                `).join("")}
            </div>
            </div>
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                ${a.t("settings.adaptive_msg")}
            </p>
        </div>
    </div>
`,Wt=(t)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.admin_section")}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${a.t("settings.user_management")}</h3>
                <app-button variant="primary" onclick="this.getRootNode().host.openAddUserModal()" style="width: auto; padding: 0 16px;">+ ${a.t("action.add_user")}</app-button>
            </div>

            <div class="settings-content__user-list">
                ${t.map((o)=>`
                    <div class="settings-content__user-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <app-avatar initials="${o.username.substring(0,2).toUpperCase()}" src="${o.avatar_url}" style="width: 32px; height: 32px; font-size: 12px;"></app-avatar>
                            <div>
                                <div style="font-weight: 500; font-size: 14px;">${o.username}</div>
                                <div class="mono-tag" style="font-size: 10px;">
                                    ${(()=>{let r=(o.role||"").toLowerCase();if(r==="admin"||r==="administrator")return a.t("settings.role_admin");if(r==="user")return a.t("settings.role_user");return o.role})()}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                             <app-button variant="ghost" onclick="this.getRootNode().host.openEditUserModal(${o.id}, '${o.username}', '${o.role}')">${a.t("general.edit")}</app-button>
                            <app-button variant="ghost" onclick="this.getRootNode().host.deleteUser(${o.id})">${a.t("general.delete")}</app-button>
                        </div>
                    </div>
                `).join("")}
            </div>
             ${t.length===0?`<p class="settings-content__text-dim">${a.t("settings.no_users")}</p>`:""}
        </div>
    </div>
    
     <dialog id="add-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <h3 style="margin-top: 0; margin-bottom: 16px;">${a.t("action.add_new_user")}</h3>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${a.t("auth.username")}</label>
            <input type="text" id="new-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${a.t("auth.password")}</label>
            <input type="password" id="new-user-password" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${a.t("settings.role")}</label>
            <select id="new-user-role" class="settings-content__select">
                <option value="user">${a.t("settings.role_user")}</option>
                <option value="admin">${a.t("settings.role_admin")}</option>
            </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button onclick="this.getRootNode().getElementById('add-user-modal').close()">${a.t("general.cancel")}</app-button>
            <app-button variant="primary" onclick="this.getRootNode().host.createUser()">${a.t("general.save")}</app-button>
        </div>
    </dialog>

    <dialog id="edit-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <h3 style="margin-top: 0; margin-bottom: 16px;">${a.t("action.edit_user")}</h3>
        <input type="hidden" id="edit-user-id">
        <div class="settings-content__form-group">
            <label class="settings-content__label">${a.t("auth.username")}</label>
            <input type="text" id="edit-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${a.t("settings.new_password")}</label>
            <input type="password" id="edit-user-password" class="settings-content__input" placeholder="${a.t("settings.password_leave_blank")}">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${a.t("settings.role")}</label>
            <select id="edit-user-role" class="settings-content__select">
                <option value="user">${a.t("settings.role_user")}</option>
                <option value="admin">${a.t("settings.role_admin")}</option>
            </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button onclick="this.getRootNode().getElementById('edit-user-modal').close()">${a.t("general.cancel")}</app-button>
            <app-button variant="primary" onclick="this.getRootNode().host.updateAdminUser()">${a.t("action.save_changes")}</app-button>
        </div>
    </dialog>
`,St=()=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <!-- System Migration Section -->
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 24px;">${a.t("settings.system_data")}</div>
            
            <div class="settings-content__action-group">
                <!-- Export -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${a.t("settings.export_db")}</h3>
                        <p>${a.t("settings.export_desc")}</p>
                    </div>
                    <app-button variant="primary" onclick="this.getRootNode().host.downloadBackup()">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        ${a.t("action.download_backup")}
                    </app-button>
                </div>

                <!-- Import -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${a.t("settings.import_db")}</h3>
                        <p>${a.t("settings.import_desc")} <br><span style="color: var(--accent); font-weight: 500;">${a.t("settings.import_warn")}</span></p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                         <input type="file" id="backup-upload" accept=".json" style="display: none;" onchange="this.getRootNode().host.restoreBackup(this.files[0])">
                         <app-button variant="primary" onclick="this.getRootNode().getElementById('backup-upload').click()">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                            ${a.t("action.select_file")}
                         </app-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-content__danger-zone">
             <div>
                <div class="settings-content__danger-title">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: #fa5252;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    ${a.t("settings.factory_reset")}
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: rgba(250, 82, 82, 0.8);">
                    ${a.t("settings.reset_desc")}
                </p>
             </div>
             <app-button onclick="this.getRootNode().host.openResetModal()" style="border-color: rgba(250, 82, 82, 0.4); color: #fa5252; background: transparent; transition: all 0.2s;">
                ${a.t("action.reset_system")}
             </app-button>
        </div>
    </div>

    <!-- Factory Reset Confirmation Modal -->
    <dialog id="reset-confirm-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 440px; backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
        <h3 style="margin-top: 0; margin-bottom: 16px; color: #fa5252; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: #fa5252;"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            ${a.t("settings.confirm_reset_title")}
        </h3>
        <p class="settings-content__text-dim" style="font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
            ${a.t("settings.confirm_reset_msg")}
            ${a.t("settings.type_delete")}
        </p>

        <div class="settings-content__form-group">
            <input type="text" id="reset-confirm-input" class="settings-content__input" placeholder="Type 'delete'" style="border-color: rgba(250, 82, 82, 0.3); font-family: monospace;">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 32px; width: 100%;">
            <app-button onclick="this.getRootNode().getElementById('reset-confirm-modal').close()" style="width: auto;">${a.t("general.cancel")}</app-button>
            <button class="settings-content__reset-btn" onclick="this.getRootNode().host.executeFactoryReset()" style="flex: 1;">
                ${a.t("action.erase_everything")}
            </button>
        </div>
    </dialog>
`,It=(t,o)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card" style="text-align: center; padding: 48px 24px;">
             <!-- Logo Placeholder -->
             <div style="width: 64px; height: 64px; background: linear-gradient(135deg, var(--accent), #888); border-radius: 16px; margin: 0 auto 24px auto; display: flex; align-items: center; justify-content: center; font-size: 32px; color: white; font-weight: bold; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                KB
             </div>
             
             <h2 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-main);">${a.t("app.title")}</h2>
             <p class="settings-content__text-dim" style="margin: 0 0 32px 0;">${a.t("settings.version")} ${t}</p>

             <div style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 400px;">
                ${o?`
                    ${o.is_docker?`
                        <div style="background: rgba(0, 120, 212, 0.1); border: 1px solid rgba(0, 120, 212, 0.3); padding: 16px; border-radius: var(--radius); width: 100%; text-align: left;">
                             <div style="display: flex; gap: 12px; align-items: flex-start;">
                                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: var(--accent); flex-shrink: 0;"><path d="M21 12l-4.37-6.16c-.37-.52-.98-.84-1.63-.84h-3V4c0-1.1-.9-2-2-2s-2 .9-2 2v1H5c-.65 0-1.26.32-1.63.84L-1 12v3h2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v-3zm-11 7H7v-3h3v3zm-5 0H2v-3h3v3zm12 0h-3v-3h3v3z"/></svg>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-main);">${a.t("settings.docker_mode")}</h4>
                                    <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
                                        ${a.t("settings.docker_desc")}<br>
                                        ${o.available?`<strong style="color: var(--accent);">New version ${o.latest_version} available!</strong>`:"You are strictly up to date."}
                                    </p>
                                </div>
                             </div>
                        </div>
                    `:`
                        <!-- Native Update Logic -->
                        ${o.available?`
                             <div style="background: rgba(18, 184, 134, 0.1); border: 1px solid rgba(18, 184, 134, 0.3); padding: 24px; border-radius: var(--radius); width: 100%;">
                                <h3 style="margin: 0 0 12px 0; color: #12b886; font-size: 16px;">${a.t("settings.update_available")}: ${o.latest_version}</h3>
                                <div style="text-align: left; background: var(--surface); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: var(--text-dim); margin-bottom: 24px; max-height: 150px; overflow-y: auto; white-space: pre-wrap;">${o.release_notes}</div>
                                
                                <app-button variant="primary" id="btn-update-now" style="width: 100%; justify-content: center;" onclick="this.getRootNode().host.performUpdate('${o.asset_url}')">
                                    ${a.t("action.download_install")} ${o.latest_version}
                                </app-button>
                                <p id="update-status" style="margin-top: 12px; font-size: 12px; color: var(--text-dim); display: none;">${a.t("notifier.downloading_secure")}</p>
                            </div>
                        `:`
                            <div style="color: var(--text-dim); font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #12b886;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                ${a.t("settings.up_to_date")}
                            </div>
                            <app-button variant="primary" onclick="this.getRootNode().host.checkForUpdates()">${a.t("action.check_again")}</app-button>
                        `}
                    `}
                `:`
                    <app-button variant="primary" onclick="this.getRootNode().host.checkForUpdates()">${a.t("action.check_updates")}</app-button>
                `}
             </div>
             
             <div style="margin-top: 64px; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: center; gap: 24px;">
                <a href="https://github.com/codigosh/Kashboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>
                    ${a.t("settings.github")}
                </a>
                <a href="https://github.com/codigosh/Kashboard/issues" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                    ${a.t("action.report_issue")}
                </a>
             </div>
        </div>
    </div>
`;var to=`:host {
    display: block;
    color: var(--text-main);
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
}

.settings-content__text-dim {
    color: var(--text-dim);
}

.settings-content__section-spacer {
    margin-top: 16px;
}

.settings-content__title {
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 15px;
    margin: 0 0 24px 0;
    color: var(--text-main);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Form Controls */
.settings-content__form-group {
    margin-bottom: 24px;
}

.settings-content__label {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-dim);
    margin-bottom: 8px;
    display: block;
}

.settings-content__select,
.settings-content__input {
    background: var(--surface-solid);
    border: 1px solid var(--border);
    color: var(--text-main);
    padding: 12px 16px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: 13px;
    width: 100%;
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
}

.settings-content__select:focus,
.settings-content__input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 10px rgba(0, 120, 212, 0.1);
    background: var(--surface);
}

/* Color Grid */
.settings-content__color-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.settings-content__color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    background-clip: padding-box;
}

.settings-content__color-swatch:hover {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.2);
    z-index: 2;
}

.settings-content__color-swatch--active {
    border-color: #fff;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
}

.settings-content__color-swatch svg {
    width: 18px;
    height: 18px;
    fill: #fff;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.settings-content__color-swatch--custom {
    background-image: conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red);
    opacity: 0.9;
}

.settings-content__color-swatch--custom.settings-content__color-swatch--active {
    opacity: 1;
    background-image: none;
}

.settings-content__swatch-picker {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
}

/* Personalization Sliders */
.settings-content__personalization-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 32px;
    margin-top: 16px;
}

.settings-content__slider-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.settings-content__slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.settings-content__slider-label {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-dim);
    text-transform: uppercase;
}

.settings-content__slider-value {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--accent);
    background: rgba(0, 120, 212, 0.05);
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid rgba(0, 120, 212, 0.1);
}

/* Profile specific */
.settings-content__profile-header {
    display: flex;
    align-items: center;
    gap: 20px;
}

.settings-content__avatar-container {
    position: relative;
}

.settings-content__edit-overlay {
    position: absolute;
    bottom: -2px;
    right: -2px;
    background: var(--canvas);
    border: 1px solid var(--border);
    color: var(--text-dim);
    font-family: var(--font-mono);
    font-size: 9px;
    padding: 1px 4px;
    border-radius: 2px;
    text-transform: uppercase;
}

.settings-content__profile-name {
    font-size: 18px;
    font-weight: 600;
    display: block;
    margin-bottom: 2px;
}

/* Custom Checkbox */
.settings-content__checkbox {
    width: 14px;
    height: 14px;
    border: 1px solid #333;
    border-radius: 2px;
    background: transparent;
    cursor: pointer;
    display: inline-block;
    position: relative;
    transition: all 150ms;
}

.settings-content__checkbox--checked {
    background: var(--accent);
    border-color: var(--accent);
}

.settings-content__checkbox--checked::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0px;
    width: 4px;
    height: 8px;
    border: solid #000;
    border-width: 0 1.5px 1.5px 0;
    transform: rotate(45deg);
}

.fade-in {
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Theme Toggle Segmented Control */
.settings-content__segmented-control {
    display: flex;
    background: var(--surface-solid);
    border: 1px solid var(--border);
    padding: 2px;
    border-radius: var(--radius);
    gap: 2px;
}

.settings-content__segment {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-dim);
    font-family: var(--font-sans);
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 6px;
    /* Slightly less than container */
    cursor: pointer;
    transition: all 0.2s;
}

.settings-content__segment:hover {
    color: var(--text-main);
    background: var(--border);
    /* Slightly darker than surface */
}

.settings-content__segment.active {
    background: var(--panel);
    color: var(--text-main);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border);
    border: 1px solid var(--border);
    font-weight: 500;
}

/* Generic Settings Buttons */
.settings-content__button {
    background: var(--surface-solid);
    color: var(--text-main);
    border: 1px solid var(--border);
    padding: 8px 16px;
    border-radius: var(--radius);
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: 13px;
    transition: all 0.2s;
}

.settings-content__button:hover {
    background: var(--border);
    border-color: var(--text-dim);
}

button {
    /* Fallback for unclassed buttons in settings */
    background: var(--surface-solid);
    color: var(--text-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
}

/* Range Input Styling */
.settings-content__slider-group input[type="range"] {
    accent-color: var(--accent);
    width: 100%;
    cursor: pointer;
    margin-top: 4px;
}

/* Professional Advanced UI */
.settings-content__action-group {
    display: flex;
    flex-direction: column;
}

.settings-content__reset-btn {
    background: #fa5252;
    color: white;
    border: none;
    height: 38px;
    padding: 0 32px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(250, 82, 82, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    min-width: 160px;
}

.settings-content__reset-btn:hover {
    background: #ff6b6b;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(250, 82, 82, 0.4);
}

.settings-content__reset-btn:active {
    transform: translateY(0);
}

.settings-content__action-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 0;
    border-bottom: 1px solid var(--border);
}

.settings-content__action-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.settings-content__action-row:first-child {
    padding-top: 0;
}

.settings-content__action-info h3 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-main);
}

.settings-content__action-info p {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
    line-height: 1.5;
    max-width: 480px;
}

.settings-content__danger-zone {
    border: 1px solid rgba(250, 82, 82, 0.3);
    background: rgba(250, 82, 82, 0.04);
    border-radius: var(--radius);
    padding: 24px;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
}

.settings-content__danger-zone:hover {
    background: rgba(250, 82, 82, 0.08);
    border-color: rgba(250, 82, 82, 0.5);
}

.settings-content__danger-title {
    color: #fa5252;
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
}`;class oo extends HTMLElement{prefs;users=[];static get observedAttributes(){return["section"]}constructor(){super();this.attachShadow({mode:"open"}),this.prefs={accent_color:"#0078D4",language:"en",grid_columns_pc:9,grid_columns_tablet:4,grid_columns_mobile:2}}connectedCallback(){if(this.fetchPrefs(),this.getAttribute("section")==="users")this.fetchUsers();this.render()}async fetchPrefs(){let t=$.getUser();if(t&&t.preferences)this.prefs={...t.preferences,project_name:t.project_name||t.preferences.project_name||"Kashboard"},this.render()}async fetchUsers(){try{this.users=await T.getUsers(),this.render()}catch(t){console.error("Failed to fetch users",t)}}attributeChangedCallback(t,o,r){if(t==="section"&&o!==r){if(r==="users")this.fetchUsers();if(r==="about")this.checkForUpdates();this.render()}}async savePrefs(t){if(this.prefs={...this.prefs,...t},t.accent_color)this.applyAccent(t.accent_color);if(t.language)a.setLanguage(t.language);if(t.theme)if(t.theme==="dark")Q.enableDark();else Q.enableLight();await $.updatePreferences(t),this.render()}applyAccent(t){if(t&&t.startsWith("#")){document.documentElement.style.setProperty("--accent",t);return}let r={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"}[t]||"#0078D4";document.documentElement.style.setProperty("--accent",r)}updateGridPref(t,o){let r=this.shadowRoot.getElementById(`val-${t}`);if(r)r.textContent=o;let e={grid_columns_pc:"--grid-columns-pc",grid_columns_tablet:"--grid-columns-tablet",grid_columns_mobile:"--grid-columns-mobile"};if(e[t])document.documentElement.style.setProperty(e[t],o)}commitGridPref(t,o){$.updatePreferences({[t]:parseInt(o)})}async updateUsername(t){let o=$.getUser();if(!o)return;if(await $.updateProfile({username:t,avatar_url:this.prefs.avatar_url||o.avatar_url}),window.notifier)window.notifier.show(a.t("notifier.username_updated"))}async updatePassword(){let t=this.shadowRoot.getElementById("current-password")?.value,o=this.shadowRoot.getElementById("new-password")?.value,r=this.shadowRoot.getElementById("confirm-password")?.value;if(!t){if(window.notifier)window.notifier.show(a.t("notifier.password_required"),"error");return}if(o!==r){if(window.notifier)window.notifier.show(a.t("notifier.password_mismatch"),"error");return}if(!o){if(window.notifier)window.notifier.show(a.t("notifier.password_empty"),"error");return}try{if(await $.changePassword({current_password:t,new_password:o}),window.notifier)window.notifier.show(a.t("notifier.password_changed"));this.shadowRoot.getElementById("current-password").value="",this.shadowRoot.getElementById("new-password").value="",this.shadowRoot.getElementById("confirm-password").value=""}catch(e){if(window.notifier)window.notifier.show(a.t("notifier.password_incorrect"),"error")}}async handleAvatarChange(t){let o=t.target.files?.[0];if(!o)return;let r=new FileReader;r.onload=async(e)=>{let i=e.target?.result,n=$.getUser();if(!n)return;if(this.prefs.avatar_url=i,await $.updateProfile({username:n.username,avatar_url:i}),this.render(),window.notifier)window.notifier.show(a.t("notifier.avatar_updated"))},r.readAsDataURL(o)}openAddUserModal(){let t=this.shadowRoot.getElementById("add-user-modal");if(t)t.showModal()}async createUser(){let t=this.shadowRoot.getElementById("new-user-username").value,o=this.shadowRoot.getElementById("new-user-password").value,r=this.shadowRoot.getElementById("new-user-role").value;if(!t||!o){if(window.notifier)window.notifier.show(a.t("notifier.fields_required"),"error");return}try{if(await T.createUser({username:t,password:o,role:r}),window.notifier)window.notifier.show(a.t("notifier.user_created"));let e=this.shadowRoot.getElementById("add-user-modal");if(e)e.close();this.fetchUsers()}catch(e){if(window.notifier)window.notifier.show(a.t("notifier.user_create_error"),"error")}}openEditUserModal(t,o,r){let e=this.shadowRoot.getElementById("edit-user-modal");if(e)this.shadowRoot.getElementById("edit-user-id").value=t.toString(),this.shadowRoot.getElementById("edit-user-username").value=o,this.shadowRoot.getElementById("edit-user-role").value=r,this.shadowRoot.getElementById("edit-user-password").value="",e.showModal()}async updateAdminUser(){let t=parseInt(this.shadowRoot.getElementById("edit-user-id").value),o=this.shadowRoot.getElementById("edit-user-username").value,r=this.shadowRoot.getElementById("edit-user-password").value,e=this.shadowRoot.getElementById("edit-user-role").value;if(!o){if(window.notifier)window.notifier.show("Username required","error");return}try{if(await T.adminUpdateUser({id:t,username:o,role:e,password:r||void 0}),window.notifier)window.notifier.show(a.t("notifier.user_updated"));let i=this.shadowRoot.getElementById("edit-user-modal");if(i)i.close();this.fetchUsers()}catch(i){if(window.notifier)window.notifier.show(a.t("notifier.user_update_error"),"error")}}async deleteUser(t){let o=document.querySelector("confirmation-modal");if(o){if(!await o.confirm(a.t("general.delete"),a.t("notifier.user_delete_confirm")))return}try{if(await T.deleteUser(t),window.notifier)window.notifier.show(a.t("notifier.user_deleted"));this.fetchUsers()}catch(r){if(window.notifier)window.notifier.show(a.t("notifier.user_delete_error"),"error")}}getContent(t){let o=$.getUser()||{username:"Guest",initials:"??",role:"View Only",avatar_url:"",accent_color:"#0078D4",language:"en",preferences:{}};switch(t){case"account":return Dt(o);case"theme":{let r={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"},e=Object.keys(r);return Vt(this.prefs,r,e)}case"personalization":{let r=[{label:a.t("settings.grid_pc"),key:"grid_columns_pc",min:4,max:12},{label:a.t("settings.grid_tablet"),key:"grid_columns_tablet",min:2,max:6},{label:a.t("settings.grid_mobile"),key:"grid_columns_mobile",min:1,max:3}];return Pt(this.prefs,r)}case"advanced":return St();case"users":return Wt(this.users);case"about":return It(this.version,this.updateInfo);default:return`<div class="bento-card"><h3>${t}</h3><p class="settings-content__text-dim">${a.t("settings.default_module_desc")}</p></div>`}}version="v0.0.1";updateInfo=null;async checkForUpdates(){try{let t=await fetch("/api/system/update/check");if(t.ok)this.updateInfo=await t.json(),this.version=this.updateInfo.current_version,this.render()}catch(t){console.error("Check update failed",t)}}async performUpdate(t){let o=document.querySelector("confirmation-modal");if(o){if(!await o.confirm(a.t("settings.update_available"),a.t("notifier.update_start_confirm")))return}let r=this.shadowRoot.getElementById("btn-update-now"),e=this.shadowRoot.getElementById("update-status");if(r)r.loading=!0;if(e)e.style.display="block",e.textContent=a.t("notifier.update_downloading");try{let i=await fetch("/api/system/update/perform",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({asset_url:t})});if(i.ok){if(e)e.textContent=a.t("notifier.update_verified");setTimeout(()=>{window.location.reload()},5000)}else{let n=await i.text();if(e)e.style.color="#fa5252",e.textContent=a.t("notifier.update_failed")+n;if(r)r.loading=!1}}catch(i){if(console.error("Update failed",i),e)e.style.color="#fa5252",e.textContent=a.t("notifier.update_error");if(r)r.loading=!1}}downloadBackup(){window.location.href="/api/system/backup"}async restoreBackup(t){if(!t)return;let o=document.querySelector("confirmation-modal");if(o){if(!await o.confirm(a.t("general.restore"),a.t("notifier.restore_confirm")))return}let r=new FormData;r.append("backup_file",t);try{if((await fetch("/api/system/restore",{method:"POST",body:r})).ok){if(window.notifier)window.notifier.show(a.t("notifier.restore_success"));setTimeout(()=>window.location.reload(),2000)}else if(window.notifier)window.notifier.show(a.t("notifier.restore_failed"),"error")}catch(e){if(console.error("Restore error",e),window.notifier)window.notifier.show(a.t("notifier.restore_failed"),"error")}}openResetModal(){let t=this.shadowRoot.getElementById("reset-confirm-modal"),o=this.shadowRoot.getElementById("reset-confirm-input");if(t){if(o)o.value="";t.showModal()}}async executeFactoryReset(){let t=this.shadowRoot.getElementById("reset-confirm-input");if(!t||t.value.trim()!=="delete"){if(window.notifier)window.notifier.show(a.t("notifier.reset_confirm_text"),"error");t.focus();return}try{if((await fetch("/api/system/reset",{method:"POST"})).ok)window.location.href="/setup";else if(window.notifier)window.notifier.show(a.t("notifier.reset_failed"),"error")}catch(o){if(console.error("Reset error",o),window.notifier)window.notifier.show(a.t("notifier.reset_error"),"error")}}render(){this.shadowRoot.innerHTML=`
            <style>${to}</style>
            <div class="fade-in">
                ${this.getContent(this.getAttribute("section")||"account")}
            </div>
        `,this.shadowRoot.querySelectorAll(".settings-content__checkbox").forEach((t)=>{t.addEventListener("click",()=>t.classList.toggle("settings-content__checkbox--checked"))})}}if(!customElements.get("settings-content"))customElements.define("settings-content",oo);var ro=({user:t,isOpen:o,selectedSection:r})=>`
    <div class="right-drawer__overlay"></div>
    
    <div class="right-drawer__content-panel ${r?"":"right-drawer__content-panel--closed"}">
        <div class="right-drawer__content-body">
            ${r?`<settings-content section="${r}"></settings-content>`:""}
        </div>
    </div>

    <div class="right-drawer__panel">
        <div class="right-drawer__header">
            <app-avatar class="right-drawer__avatar" initials="${t.initials}" src="${t.avatar_url||""}"></app-avatar>
            <div class="right-drawer__user-info">
                <span class="right-drawer__username">${t.username}</span>
                ${t.role?.toLowerCase()==="admin"||t.role?.toLowerCase()==="administrator"?`<span class="right-drawer__role">
                    ${(()=>{let e=(t.role||"").toLowerCase();if(e==="admin"||e==="administrator")return a.t("settings.role_admin");if(e==="user")return a.t("settings.role_user");return t.role||a.t("settings.default_role")})()}
                </span>`:""}
            </div>
        </div>
        
        <div class="right-drawer__body">
            <div class="right-drawer__section-label">${a.t("settings.title")}</div>
            <nav class="right-drawer__menu">
                <div class="right-drawer__menu-item ${r==="account"?"right-drawer__menu-item--active":""}" data-section="account">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    <span>${a.t("settings.profile")}</span>
                </div>
                <div class="right-drawer__menu-item ${r==="theme"?"right-drawer__menu-item--active":""}" data-section="theme">
                    <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>
                    <span>${a.t("settings.theme")}</span>
                </div>
                ${t.role?.toLowerCase()==="admin"||t.role==="Administrator"?`
                    <div class="right-drawer__menu-item ${r==="personalization"?"right-drawer__menu-item--active":""}" data-section="personalization">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        <span>${a.t("settings.personalization")}</span>
                    </div>

                    <div class="right-drawer__menu-item ${r==="users"?"right-drawer__menu-item--active":""}" data-section="users">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span>${a.t("settings.users")}</span>
                    </div>

                    <div class="right-drawer__menu-item ${r==="advanced"?"right-drawer__menu-item--active":""}" data-section="advanced">
                        <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                        <span>${a.t("settings.advanced")}</span>
                    </div>
                `:""}
                <div class="right-drawer__menu-item ${r==="about"?"right-drawer__menu-item--active":""}" data-section="about">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    <span>${a.t("settings.about")}</span>
                </div>
            </nav>
        </div>

        <div class="right-drawer__footer">
            <a href="/logout" class="right-drawer__menu-item right-drawer__menu-item--logout">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
                <span>${a.t("auth.logout")}</span>
            </a>
        </div>
    </div>
`;var eo=`:host {
    position: fixed;
    top: 48px;
    /* Below top-bar */
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1000;
    font-family: var(--font-sans);

    /* Animation base state */
    visibility: hidden;
    pointer-events: none;
    transition: visibility 0.4s;
}

:host([open]) {
    visibility: visible;
    pointer-events: auto;
}

.right-drawer__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
    opacity: 0;
    transition: opacity 0.4s ease, backdrop-filter 0.4s ease, -webkit-backdrop-filter 0.4s ease;
}

:host([open]) .right-drawer__overlay {
    opacity: 1;
    backdrop-filter: blur(8px);
    /* Increased for a more professional look */
    -webkit-backdrop-filter: blur(8px);
}

.right-drawer__panel {
    position: absolute;
    top: 0;
    right: 0;
    width: 320px;
    height: 100%;
    background: var(--surface-solid);
    /* Was fixed dark */
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-left: 1px solid var(--border);
    z-index: 2;
    display: flex;
    flex-direction: column;
    color: var(--text-main);

    /* Animation state */
    transform: translateX(100%);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

:host([open]) .right-drawer__panel {
    transform: translateX(0);
}

.right-drawer__content-panel {
    position: absolute;
    top: 24px;
    right: 344px;
    /* 320px drawer + 24px gap */
    bottom: auto;
    width: calc(50vw - 368px);
    max-height: calc(100vh - 96px);
    /* Viewport - header - margins */
    background: var(--surface);
    /* Was fixed dark rgba */
    /* Slightly darker/more opaque for readability */
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 10;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    opacity: 1;
    transform: translateX(0);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.right-drawer__content-panel--closed {
    opacity: 0;
    transform: translateX(20px) scale(0.95);
    pointer-events: none;
}

.right-drawer__content-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

.right-drawer__header {
    padding: 48px 24px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--border);
    text-align: center;
}

.right-drawer__avatar {
    width: 64px;
    height: 64px;
    font-size: 24px;
    margin-bottom: 12px;
    cursor: default;
    flex-shrink: 0;
}

.right-drawer__user-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}

.right-drawer__username {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-main);
    line-height: 1.2;
}

.right-drawer__role {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    background: rgba(0, 120, 212, 0.05);
    padding: 2px 10px;
    border: 1px solid rgba(0, 120, 212, 0.2);
    border-radius: 2px;
}

.right-drawer__body {
    flex: 1;
    padding: 24px 8px;
    overflow-y: auto;
}

.right-drawer__section-label {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-dim);
    padding: 0 16px 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.right-drawer__menu {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.right-drawer__menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    color: var(--text-dim);
    text-decoration: none;
    font-size: 13px;
    border-radius: 6px;
    transition: all 0.15s ease;
    cursor: pointer;
    margin: 0 8px;
    box-sizing: border-box;
}

.right-drawer__menu-item:hover {
    color: var(--text-main);
    background: rgba(128, 128, 128, 0.1);
}

.right-drawer__menu-item--active {
    color: var(--text-main);
    background: rgba(0, 120, 212, 0.08);
    border-right: 2px solid var(--accent);
    border-radius: 6px 0 0 6px;
    margin-right: 0;
}

.right-drawer__menu-item svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    stroke-width: 1.5px;
    fill: none;
}

.right-drawer__menu-item--active svg {
    color: var(--accent);
}

.right-drawer__footer {
    padding: 16px 8px;
    border-top: 1px solid var(--border);
}

.right-drawer__menu-item--logout {
    color: #fa5252 !important;
}

.right-drawer__menu-item--logout:hover {
    background: rgba(250, 82, 82, 0.05) !important;
}`;class io extends HTMLElement{isOpen;selectedSection;_unsubscribe;_unsubscribeI18n;_keydownHandler;constructor(){super();this.attachShadow({mode:"open"}),this.isOpen=!1,this.selectedSection=null}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribe=$.subscribe((t)=>{if(this.isOpen)this.render()}),this._unsubscribeI18n=a.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._keydownHandler)window.removeEventListener("keydown",this._keydownHandler)}open(){this.isOpen=!0,this.setAttribute("open",""),this.render(),document.body.style.overflow="hidden",this.dispatchEvent(new CustomEvent("drawer-open",{bubbles:!0,composed:!0}))}close(){this.isOpen=!1,this.removeAttribute("open"),this.selectedSection=null,this.render(),document.body.style.overflow="",this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}selectSection(t){if(this.selectedSection===t)this.selectedSection=null;else this.selectedSection=t;this.render()}setupListeners(){this.shadowRoot.addEventListener("click",(t)=>{let o=t.target;if(o.classList.contains("right-drawer__overlay"))this.close();let r=o.closest(".right-drawer__menu-item");if(r&&r.dataset.section)t.preventDefault(),this.selectSection(r.dataset.section)}),this._keydownHandler=(t)=>{if(t.key==="Escape"&&this.isOpen)this.close()},window.addEventListener("keydown",this._keydownHandler)}render(){let t=$.getUser()||{username:"Guest",initials:"??",role:"Viewer"};this.shadowRoot.innerHTML=`
            <style>${eo}</style>
            ${ro({user:t,isOpen:this.isOpen,selectedSection:this.selectedSection})}
        `}}if(!customElements.get("app-right-drawer"))customElements.define("app-right-drawer",io);var ao=({title:t,editMode:o,searchActive:r,addMenuActive:e,drawerOpen:i,searchQuery:n,user:s})=>{let l=s?.role?.toLowerCase()==="admin"||s?.role==="Administrator";return`
    <div class="top-bar">
        <div class="top-bar__title">${t}</div>
        <div class="top-bar__actions">
            <!-- Offline Indicator -->
            <offline-badge></offline-badge>

            <!-- Search Bar -->
            <div id="search-wrapper" class="search-wrapper ${r?"search-wrapper--active":""}">
                <input type="text" id="search-input" class="search-input" placeholder="${a.t("general.search")}" 
                       value="${n||""}" onclick="event.stopPropagation()">
                <div id="search-clear" class="search-clear" style="display: ${n?"flex":"none"};">×</div>
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Item Toggle -->
            ${l?`
            <div id="add-toggle" class="top-bar__toggle" title="${a.t("topbar.add_tooltip")}" 
                 style="${o?"display: flex;":"display: none;"} margin-right: -6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Menu Dropdown -->
            <div id="add-menu" class="add-menu ${e?"add-menu--active":""}">
                <div class="add-menu-item" data-action="add-bookmark">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    ${a.t("action.add_bookmark")}
                </div>
                <div class="add-menu-item" data-action="add-section">
                     <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon" style="stroke-dasharray: 4 2;"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                    ${a.t("action.add_section")}
                </div>
                <div class="add-menu-item" data-action="add-widget">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/></svg>
                    ${a.t("action.add_widget")}
                </div>
            </div>

            <!-- Edit Mode Toggle -->
            <div id="edit-toggle" class="top-bar__toggle" title="${a.t("topbar.edit_tooltip")}" 
                 style="margin-right: -6px; ${o?"color: var(--accent);":""}">
                <svg id="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    ${o?`
                        <!-- Checkmark Icon -->
                        <path d="M5 13l4 4L19 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    `:`
                        <!-- Geometric Pencil Icon -->
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="1.5" stroke-linecap="round" />
                    `}
                </svg>
            </div>
            `:""}

            <!-- Sidebar Toggle Icon -->
            <div id="drawer-toggle" class="top-bar__toggle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" />
                    <rect class="top-bar__indicator ${i?"top-bar__indicator--active":""}" 
                          x="15" y="3" width="6" height="18" fill="white" />
                    <path d="M15 3V21" stroke-width="1.5" />
                </svg>
            </div>
        </div>
    </div>
`};var no=`:host {
    display: block;
    height: 48px;
    width: 100%;
}

.top-bar {
    height: 48px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background-color: var(--panel);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 1100;
    color: var(--text-main);
    box-sizing: border-box;
}

.top-bar__title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    flex-shrink: 0;
    /* Guard the title from shrinking */
    margin-right: 16px;
}

.top-bar__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
    /* Take remaining space */
    justify-content: flex-end;
}

.top-bar__toggle {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-main);
    transition: opacity 0.2s;
    position: relative;
    flex-shrink: 0;
}

.top-bar__toggle:hover {
    opacity: 0.7;
    background: rgba(128, 128, 128, 0.1);
    border-radius: 4px;
}

.top-bar__toggle svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
    stroke-width: 1.5px;
}

.top-bar__indicator {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 6px;
    height: 18px;
    background: var(--accent);
    opacity: 0;
    transition: opacity 0.2s;
}

.top-bar__indicator--active {
    opacity: 1;
}

/* Search Styles */
.search-wrapper {
    display: flex;
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 20px;
    padding: 0;
    height: 32px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    width: 32px;
    overflow: hidden;
    cursor: pointer;
    justify-content: center;
    flex-shrink: 0;
}

.search-wrapper--active {
    flex: 1;
    /* Allow to grow into available space */
    max-width: 300px;
    /* But don't go too wide on desktop */
    background: var(--surface-solid);
    border-color: var(--border);
    cursor: default;
    padding: 0 4px 0 12px;
    justify-content: space-between;
    /* Icon to the right */
}

.search-input {
    background: none;
    border: none;
    color: var(--text-main);
    font-family: var(--font-mono);
    font-size: 11px;
    outline: none;
    padding: 0;
    /* Clean state when closed */
    width: 0;
    flex: 0;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
}

.search-wrapper--active .search-input {
    flex: 1;
    width: auto;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}

.search-clear {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(128, 128, 128, 0.2);
    color: var(--text-dim);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    margin: 0 8px;
    transition: all 0.2s;
    flex-shrink: 0;
}

.search-clear:hover {
    background: var(--accent);
    color: #fff;
}

.search-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--text-main);
    stroke: currentColor;
    stroke-width: 1.5px;
    transition: color 0.2s;
    order: 2;
    /* Ensure icon is visually after everything */
}

.search-wrapper:hover .search-icon,
.search-wrapper--active .search-icon {
    color: var(--accent);
}

.add-menu {
    position: absolute;
    top: 42px;
    right: 80px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px;
    display: none;
    flex-direction: column;
    gap: 2px;
    min-width: 140px;
    z-index: 2000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(12px);
}

.add-menu--active {
    display: flex;
}

.add-menu-item {
    padding: 8px 12px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--text-dim);
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
}

.add-menu-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--accent);
    padding-left: 14px;
}

.add-menu-icon {
    width: 14px;
    height: 14px;
    margin-right: 8px;
    opacity: 0.7;
    flex-shrink: 0;
}

.add-menu-item:hover .add-menu-icon {
    opacity: 1;
    color: var(--accent);
}

/* Mobile Responsiveness */
@media (max-width: 640px) {

    #edit-toggle,
    #add-toggle,
    #drawer-toggle {
        display: none !important;
    }

    .top-bar__title {
        margin-right: 8px;
    }
}`;class so extends HTMLElement{state;_unsubscribeDashboard;_unsubscribeI18n;_windowClickHandler;static get observedAttributes(){return["title"]}constructor(){super();this.attachShadow({mode:"open"}),this.state={editMode:!1,searchActive:!1,addMenuActive:!1,drawerOpen:!1,searchQuery:""}}attributeChangedCallback(t,o,r){if(t==="title"&&o!==r)this.render()}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeDashboard=x.subscribe((t)=>{if(this.state.editMode!==t.isEditing)this.setState({editMode:t.isEditing})}),this._unsubscribeI18n=a.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._windowClickHandler)window.removeEventListener("click",this._windowClickHandler)}setState(t){let o=this.state.editMode;if(this.state={...this.state,...t},this.render(),t.editMode!==void 0&&t.editMode!==o)this.dispatchEvent(new CustomEvent("edit-mode-change",{detail:{active:this.state.editMode},bubbles:!0,composed:!0}))}setupListeners(){this.shadowRoot.addEventListener("click",(t)=>{let o=t.target;if(o.closest("#search-clear")){t.stopPropagation(),this.state.searchQuery="";let c=this.shadowRoot.getElementById("search-input");if(c)c.value="",c.focus();this.render(),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0}));return}if(o.closest("#search-wrapper")&&!this.state.searchActive)t.stopPropagation(),this.setState({searchActive:!0}),this.shadowRoot.getElementById("search-input")?.focus();if(o.closest("#edit-toggle"))x.toggleEditMode();if(o.closest("#add-toggle"))t.stopPropagation(),this.setState({addMenuActive:!this.state.addMenuActive});let s=o.closest(".add-menu-item");if(s){let c=s.dataset.action;if(c)this.setState({addMenuActive:!1}),this.dispatchEvent(new CustomEvent("add-item",{detail:{action:c},bubbles:!0,composed:!0}));return}if(o.closest("#drawer-toggle")){let c=this.state.drawerOpen?"close":"open";this.dispatchEvent(new CustomEvent("drawer-toggle",{detail:{action:c},bubbles:!0,composed:!0}));return}}),this.shadowRoot.addEventListener("input",(t)=>{let o=t.target;if(o.id==="search-input"){let r=o.value;this.state.searchQuery=r;let e=this.shadowRoot.getElementById("search-clear");if(e)e.style.display=r?"flex":"none";this.dispatchEvent(new CustomEvent("search-input",{detail:{query:r},bubbles:!0,composed:!0}))}}),this.shadowRoot.addEventListener("keydown",(t)=>{let o=t.target,r=t;if(o.id==="search-input"&&r.key==="Escape")o.value="",this.setState({searchActive:!1}),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0})),o.blur()}),this._windowClickHandler=(t)=>{if(this.state.addMenuActive)this.setState({addMenuActive:!1});let o=t.composedPath(),r=this.shadowRoot.getElementById("search-wrapper");if(this.state.searchActive&&r&&!o.includes(r)){let e=this.shadowRoot.getElementById("search-input");if(e&&e.value==="")this.setState({searchActive:!1})}},window.addEventListener("click",this._windowClickHandler)}render(){let t=this.getAttribute("title")||"CSH Dashboard";this.shadowRoot.innerHTML=`
            <style>${no}</style>
            ${ao({title:t,editMode:this.state.editMode,searchActive:this.state.searchActive,addMenuActive:this.state.addMenuActive,drawerOpen:this.state.drawerOpen,searchQuery:this.state.searchQuery,user:this.state.user})}
        `}}if(!customElements.get("app-topbar"))customElements.define("app-topbar",so);var lo=({title:t,dropdownOpen:o})=>`
    <header class="header">
        <div class="header__left">
            ${t}
        </div>

        <div class="header__group">
            <button class="header__btn-changelog">
                <span>${a.t("header.view_changelog")}</span>
                <svg class="header__icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <div class="header__action" title="Layouts">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            </div>

            <div class="header__action" title="Search">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>

            <div class="header__separator"></div>

            <div class="header__action" title="Chrome">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                    <line x1="21.17" y1="8" x2="12" y2="8"></line>
                    <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
                    <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
                </svg>
            </div>

            <div class="header__action" title="Settings">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </div>

            <div class="header__profile-container">
                <div class="header__action" id="profile-trigger" title="Profile">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="header__dropdown ${o?"header__dropdown--active":""}" id="profile-dropdown">
                    <div class="header__dropdown-item">${a.t("header.view_profile")}</div>
                    <div class="header__dropdown-item">${a.t("header.preferences")}</div>
                    <div class="header__dropdown-item" style="border-top: 1px solid var(--border-color); color: #ff4d4d;">${a.t("auth.sign_out")}</div>
                </div>
            </div>
        </div>
    </header>
`;var co=`.header {
    background-color: var(--header-bg, #121212);
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    color: var(--text-main);
    font-family: var(--font-sans);
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
}

.header__left {
    font-weight: 600;
    font-size: 14px;
}

.header__group {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header__btn-changelog {
    background-color: var(--primary-blue, #0078D4);
    color: white;
    border: none;
    border-radius: 100px;
    padding: 4px 12px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: background-color 0.2s;
    height: 28px;
}

.header__btn-changelog:hover {
    filter: brightness(1.1);
}

.header__icon-close {
    width: 14px;
    height: 14px;
}

.header__action {
    width: 20px;
    height: 20px;
    color: var(--text-dim);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.2s, background-color 0.2s;
}

.header__action:hover {
    color: var(--text-main);
    background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
}

.header__separator {
    width: 1px;
    height: 20px;
    background-color: var(--border-color, rgba(255, 255, 255, 0.1));
    margin: 0 4px;
}

.header__profile-container {
    position: relative;
}

.header__dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background-color: #1e1e1e;
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    border-radius: 6px;
    width: 200px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    display: none;
    overflow: hidden;
    z-index: 100;
}

.header__dropdown--active {
    display: block;
}

.header__dropdown-item {
    padding: 10px 16px;
    font-size: 13px;
    color: var(--text-dim);
    cursor: pointer;
}

.header__dropdown-item:hover {
    background-color: var(--hover-bg, rgba(255, 255, 255, 0.05));
    color: var(--text-main);
}

@media (pointer: coarse),
(max-width: 1024px) {

    /* Hide Changelog Button */
    .header__btn-changelog,
    /* Hide Specific Icons by Title Attribute Selector */
    .header__action[title="Layouts"],
    .header__action[title="Chrome"],
    .header__action[title="Settings"],
    .header__action[title="Profile"],
    /* Hide Separator */
    .header__separator,
    /* Hide Profile Container entirely just in case */
    .header__profile-container {
        display: none !important;
    }
}`;class po extends HTMLElement{dropdownOpen;constructor(){super();this.attachShadow({mode:"open"}),this.dropdownOpen=!1}connectedCallback(){this.render(),this.setupListeners()}toggleDropdown(t){this.dropdownOpen=typeof t==="boolean"?t:!this.dropdownOpen,this.render()}setupListeners(){this.shadowRoot.addEventListener("click",(t)=>{let o=t.target,r=o.closest(".header__btn-changelog");if(r)console.log("Changelog closed"),r.style.display="none";if(o.closest("#profile-trigger"))t.stopPropagation(),this.toggleDropdown()}),window.addEventListener("click",()=>{if(this.dropdownOpen)this.toggleDropdown(!1)})}render(){let t=this.getAttribute("title")||"Task";this.shadowRoot.innerHTML=`
            <style>${co}</style>
            ${lo({title:t,dropdownOpen:this.dropdownOpen})}
        `}}if(!customElements.get("app-header"))customElements.define("app-header",po);var go=({bookmarks:t,isEditing:o,isSearching:r,isTouchDevice:e})=>{let i=Array.isArray(t)?t:[],n=(c)=>i.filter((p)=>p.parent_id===c);return`
    ${(r||e?i:i.filter((c)=>!c.parent_id)).map((c)=>{let p={};try{p=typeof c.content==="string"?JSON.parse(c.content):c.content}catch(g){console.error("Failed to parse content for item",c.id,g)}if(c.type==="section"){let g=n(c.id);return`
            <div class="bookmark-grid__section"
               data-id="${c.id}"
               draggable="${o}"
               style="--x: ${c.x}; --y: ${c.y}; --w: ${c.w}; --h: ${c.h};">
               <div class="bookmark-grid__nested-content">
                   ${mr(g,o,!0)}
               </div>
               ${o?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
                <div class="resize-handle"></div>
               `:""}
            </div>`}return xo(c,p,o)}).join("")}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
`};function xo(t,o,r){if(t.type==="widget"){let l=o.widgetId,p={clock:"widget-clock",notepad:"widget-notepad",telemetry:"widget-telemetry"}[l]||"div",g=(o.text||"").replace(/"/g,"&quot;");return`
            <div class="bookmark-grid__card"
                draggable="${r}"
                data-id="${t.id}"
                style="--x: ${t.x}; --y: ${t.y}; --w: ${t.w}; --h: ${t.h}; cursor: ${r?"move":"default"};">
                
                <${p} 
                    item-id="${t.id}"
                    ${l==="notepad"?`content="${g}"`:""}
                ></${p}>

                ${r?`
                <div class="bookmark-actions">
                     ${["clock","telemetry"].includes(l)?`<button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>`:""}
                     <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
                ${["clock","telemetry"].includes(l)?"":'<div class="resize-handle"></div>'}
                `:""}
            </div>
         `}let e=o.icon||"",n=e.startsWith("http")||e.startsWith("/")?`<img src="${e}" alt="${o.label}" class="bookmark-grid__icon-img" draggable="false" />`:e||'<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';return`
        <a ${r?'role="button"':`href="${o.url||"#"}" target="_blank"`} class="bookmark-grid__card"
           draggable="${r}"
           data-id="${t.id}"
           style="--x: ${t.x||"auto"}; --y: ${t.y||"auto"}; --w: ${t.w||1}; --h: ${t.h||1};">
            
            ${r?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
            `:""}

            <div class="bookmark-grid__icon-container">
                ${n}
            </div>
            <span class="bookmark-grid__label">${o.label||"Bookmark"}</span>
            
            ${r&&t.type==="section"?'<div class="resize-handle"></div>':""}
            
            ${o.statusCheck?`
                <div class="status-indicator" title="${a.t("general.pinging")}"></div>
            `:""}
        </a>
    `}function mr(t,o,r=!1){return t.map((e)=>{let i={};try{i=typeof e.content==="string"?JSON.parse(e.content):e.content}catch(n){console.error("Failed to parse content for item (nested)",e.id,n)}return xo(e,i,o)}).join("")}O();class ho extends HTMLElement{timer;timeEl=null;dateEl=null;_unsubscribe=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}isEditing=!1;configMode=!1;_config={timezone:"local",hour12:!1,showDate:!0};_itemId=0;static get observedAttributes(){return["item-id","content","mode"]}attributeChangedCallback(t,o,r){if(t==="item-id")this._itemId=parseInt(r);if(t==="content")try{let e=typeof r==="string"?JSON.parse(r):r;if(e&&typeof e==="object")this._config={...this._config,...e},this.updateTime()}catch(e){}}connectedCallback(){this.render(),this.updateTime(),this.timer=setInterval(()=>{this.updateTime()},1000),this._unsubscribe=x.subscribe((t)=>{if(this.isEditing!==t.isEditing)this.isEditing=t.isEditing,this.render();if(this._itemId){let o=t.items.find((r)=>r.id===this._itemId);if(o&&o.content)try{let r=typeof o.content==="string"?JSON.parse(o.content):o.content;if(r.widgetId==="clock")this._config={...this._config,...r},this.updateTime()}catch(r){}}}),this._unsubscribeI18n=a.subscribe(()=>{this.updateTime()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this.timer)clearInterval(this.timer)}updateTime(){if(!this.timeEl||!this.dateEl)return;let t=new Date,o={hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:this._config.hour12},r=void 0;if(this._config.timezone&&this._config.timezone!=="local")r=this._config.timezone;let e=a.getLocale().code;try{let s=new Intl.DateTimeFormat(e,{...o,timeZone:r}).formatToParts(t).map((l)=>{if(l.type==="dayPeriod")return`<span class="ampm">${l.value.toUpperCase().replace(/\./g,"").trim()}</span>`;return l.value}).join("");this.timeEl.innerHTML=s}catch(i){this.timeEl.textContent=t.toLocaleTimeString()}if(this._config.showDate){let i={weekday:"long",day:"numeric",month:"long",timeZone:r};this.dateEl.textContent=t.toLocaleDateString(e,i),this.dateEl.style.display="block"}else this.dateEl.style.display="none"}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    background: rgba(30, 30, 35, 0.6);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    
                    color: var(--text-main);
                    border-radius: var(--radius);
                    box-sizing: border-box;
                    padding: 16px;
                    user-select: none;
                    position: relative;
                }
                .time {
                    font-size: 2.5rem;
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    line-height: 1;
                    font-variant-numeric: tabular-nums;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .date {
                    font-size: 0.9rem;
                    color: var(--text-dim);
                    margin-top: 4px;
                    font-weight: 500;
                }
            </style>
            
            <div class="time">--:--:--</div>
            <div class="date">-- --</div>
        `,this.timeEl=this.shadowRoot.querySelector(".time"),this.dateEl=this.shadowRoot.querySelector(".date")}}customElements.define("widget-clock",ho);var st=globalThis,lt=st.ShadowRoot&&(st.ShadyCSS===void 0||st.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,yt=Symbol(),bo=new WeakMap;class ct{constructor(t,o,r){if(this._$cssResult$=!0,r!==yt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=o}get styleSheet(){let t=this.o,o=this.t;if(lt&&t===void 0){let r=o!==void 0&&o.length===1;r&&(t=bo.get(o)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&bo.set(o,t))}return t}toString(){return this.cssText}}var vo=(t)=>new ct(typeof t=="string"?t:t+"",void 0,yt),kt=(t,...o)=>{let r=t.length===1?t[0]:o.reduce((e,i,n)=>e+((s)=>{if(s._$cssResult$===!0)return s.cssText;if(typeof s=="number")return s;throw Error("Value passed to 'css' function must be a 'css' function result: "+s+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[n+1],t[0]);return new ct(r,t,yt)},_o=(t,o)=>{if(lt)t.adoptedStyleSheets=o.map((r)=>r instanceof CSSStyleSheet?r:r.styleSheet);else for(let r of o){let e=document.createElement("style"),i=st.litNonce;i!==void 0&&e.setAttribute("nonce",i),e.textContent=r.cssText,t.appendChild(e)}},wt=lt?(t)=>t:(t)=>t instanceof CSSStyleSheet?((o)=>{let r="";for(let e of o.cssRules)r+=e.cssText;return vo(r)})(t):t;var{is:fr,defineProperty:ur,getOwnPropertyDescriptor:yr,getOwnPropertyNames:kr,getOwnPropertySymbols:wr,getPrototypeOf:$r}=Object,dt=globalThis,mo=dt.trustedTypes,zr=mo?mo.emptyScript:"",Lr=dt.reactiveElementPolyfillSupport,V=(t,o)=>t,P={toAttribute(t,o){switch(o){case Boolean:t=t?zr:null;break;case Object:case Array:t=t==null?t:JSON.stringify(t)}return t},fromAttribute(t,o){let r=t;switch(o){case Boolean:r=t!==null;break;case Number:r=t===null?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(e){r=null}}return r}},pt=(t,o)=>!fr(t,o),fo={attribute:!0,type:String,converter:P,reflect:!1,useDefault:!1,hasChanged:pt};Symbol.metadata??=Symbol("metadata"),dt.litPropertyMetadata??=new WeakMap;class A extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,o=fo){if(o.state&&(o.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((o=Object.create(o)).wrapped=!0),this.elementProperties.set(t,o),!o.noAccessor){let r=Symbol(),e=this.getPropertyDescriptor(t,r,o);e!==void 0&&ur(this.prototype,t,e)}}static getPropertyDescriptor(t,o,r){let{get:e,set:i}=yr(this.prototype,t)??{get(){return this[o]},set(n){this[o]=n}};return{get:e,set(n){let s=e?.call(this);i?.call(this,n),this.requestUpdate(t,s,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??fo}static _$Ei(){if(this.hasOwnProperty(V("elementProperties")))return;let t=$r(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(V("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(V("properties"))){let o=this.properties,r=[...kr(o),...wr(o)];for(let e of r)this.createProperty(e,o[e])}let t=this[Symbol.metadata];if(t!==null){let o=litPropertyMetadata.get(t);if(o!==void 0)for(let[r,e]of o)this.elementProperties.set(r,e)}this._$Eh=new Map;for(let[o,r]of this.elementProperties){let e=this._$Eu(o,r);e!==void 0&&this._$Eh.set(e,o)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let o=[];if(Array.isArray(t)){let r=new Set(t.flat(1/0).reverse());for(let e of r)o.unshift(wt(e))}else t!==void 0&&o.push(wt(t));return o}static _$Eu(t,o){let r=o.attribute;return r===!1?void 0:typeof r=="string"?r:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise((t)=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach((t)=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,o=this.constructor.elementProperties;for(let r of o.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return _o(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach((t)=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach((t)=>t.hostDisconnected?.())}attributeChangedCallback(t,o,r){this._$AK(t,r)}_$ET(t,o){let r=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,r);if(e!==void 0&&r.reflect===!0){let i=(r.converter?.toAttribute!==void 0?r.converter:P).toAttribute(o,r.type);this._$Em=t,i==null?this.removeAttribute(e):this.setAttribute(e,i),this._$Em=null}}_$AK(t,o){let r=this.constructor,e=r._$Eh.get(t);if(e!==void 0&&this._$Em!==e){let i=r.getPropertyOptions(e),n=typeof i.converter=="function"?{fromAttribute:i.converter}:i.converter?.fromAttribute!==void 0?i.converter:P;this._$Em=e;let s=n.fromAttribute(o,i.type);this[e]=s??this._$Ej?.get(e)??s,this._$Em=null}}requestUpdate(t,o,r,e=!1,i){if(t!==void 0){let n=this.constructor;if(e===!1&&(i=this[t]),r??=n.getPropertyOptions(t),!((r.hasChanged??pt)(i,o)||r.useDefault&&r.reflect&&i===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,r))))return;this.C(t,o,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,o,{useDefault:r,reflect:e,wrapped:i},n){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??o??this[t]),i!==!0||n!==void 0)||(this._$AL.has(t)||(this.hasUpdated||r||(o=void 0),this._$AL.set(t,o)),e===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(o){Promise.reject(o)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,i]of this._$Ep)this[e]=i;this._$Ep=void 0}let r=this.constructor.elementProperties;if(r.size>0)for(let[e,i]of r){let{wrapped:n}=i,s=this[e];n!==!0||this._$AL.has(e)||s===void 0||this.C(e,void 0,i,s)}}let t=!1,o=this._$AL;try{t=this.shouldUpdate(o),t?(this.willUpdate(o),this._$EO?.forEach((r)=>r.hostUpdate?.()),this.update(o)):this._$EM()}catch(r){throw t=!1,this._$EM(),r}t&&this._$AE(o)}willUpdate(t){}_$AE(t){this._$EO?.forEach((o)=>o.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach((o)=>this._$ET(o,this[o])),this._$EM()}updated(t){}firstUpdated(t){}}A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[V("elementProperties")]=new Map,A[V("finalized")]=new Map,Lr?.({ReactiveElement:A}),(dt.reactiveElementVersions??=[]).push("2.1.2");var $t=globalThis,uo=(t)=>t,gt=$t.trustedTypes,yo=gt?gt.createPolicy("lit-html",{createHTML:(t)=>t}):void 0;var H=`lit$${Math.random().toFixed(9).slice(2)}$`,To="?"+H,Tr=`<${To}>`,G=document,S=()=>G.createComment(""),I=(t)=>t===null||typeof t!="object"&&typeof t!="function",zt=Array.isArray,jr=(t)=>zt(t)||typeof t?.[Symbol.iterator]=="function";var W=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ko=/-->/g,wo=/>/g,B=RegExp(`>|[ 	
\f\r](?:([^\\s"'>=/]+)([ 	
\f\r]*=[ 	
\f\r]*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),$o=/'/g,zo=/"/g,jo=/^(?:script|style|textarea|title)$/i,Lt=(t)=>(o,...r)=>({_$litType$:t,strings:o,values:r}),v=Lt(1),Pe=Lt(2),We=Lt(3),K=Symbol.for("lit-noChange"),k=Symbol.for("lit-nothing"),Lo=new WeakMap,C=G.createTreeWalker(G,129);function Eo(t,o){if(!zt(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return yo!==void 0?yo.createHTML(o):o}var Er=(t,o)=>{let r=t.length-1,e=[],i,n=o===2?"<svg>":o===3?"<math>":"",s=W;for(let l=0;l<r;l++){let c=t[l],p,d,g=-1,h=0;for(;h<c.length&&(s.lastIndex=h,d=s.exec(c),d!==null);)h=s.lastIndex,s===W?d[1]==="!--"?s=ko:d[1]!==void 0?s=wo:d[2]!==void 0?(jo.test(d[2])&&(i=RegExp("</"+d[2],"g")),s=B):d[3]!==void 0&&(s=B):s===B?d[0]===">"?(s=i??W,g=-1):d[1]===void 0?g=-2:(g=s.lastIndex-d[2].length,p=d[1],s=d[3]===void 0?B:d[3]==='"'?zo:$o):s===zo||s===$o?s=B:s===ko||s===wo?s=W:(s=B,i=void 0);let b=s===B&&t[l+1].startsWith("/>")?" ":"";n+=s===W?c+Tr:g>=0?(e.push(p),c.slice(0,g)+"$lit$"+c.slice(g)+H+b):c+H+(g===-2?l:b)}return[Eo(t,n+(t[r]||"<?>")+(o===2?"</svg>":o===3?"</math>":"")),e]};class tt{constructor({strings:t,_$litType$:o},r){let e;this.parts=[];let i=0,n=0,s=t.length-1,l=this.parts,[c,p]=Er(t,o);if(this.el=tt.createElement(c,r),C.currentNode=this.el.content,o===2||o===3){let d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(e=C.nextNode())!==null&&l.length<s;){if(e.nodeType===1){if(e.hasAttributes())for(let d of e.getAttributeNames())if(d.endsWith("$lit$")){let g=p[n++],h=e.getAttribute(d).split(H),b=/([.?@])?(.*)/.exec(g);l.push({type:1,index:i,name:b[2],strings:h,ctor:b[1]==="."?Ho:b[1]==="?"?Ro:b[1]==="@"?Fo:rt}),e.removeAttribute(d)}else d.startsWith(H)&&(l.push({type:6,index:i}),e.removeAttribute(d));if(jo.test(e.tagName)){let d=e.textContent.split(H),g=d.length-1;if(g>0){e.textContent=gt?gt.emptyScript:"";for(let h=0;h<g;h++)e.append(d[h],S()),C.nextNode(),l.push({type:2,index:++i});e.append(d[g],S())}}}else if(e.nodeType===8)if(e.data===To)l.push({type:2,index:i});else{let d=-1;for(;(d=e.data.indexOf(H,d+1))!==-1;)l.push({type:7,index:i}),d+=H.length-1}i++}}static createElement(t,o){let r=G.createElement("template");return r.innerHTML=t,r}}function Z(t,o,r=t,e){if(o===K)return o;let i=e!==void 0?r._$Co?.[e]:r._$Cl,n=I(o)?void 0:o._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(t),i._$AT(t,r,e)),e!==void 0?(r._$Co??=[])[e]=i:r._$Cl=i),i!==void 0&&(o=Z(t,i._$AS(t,o.values),i,e)),o}class Ao{constructor(t,o){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=o}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:o},parts:r}=this._$AD,e=(t?.creationScope??G).importNode(o,!0);C.currentNode=e;let i=C.nextNode(),n=0,s=0,l=r[0];for(;l!==void 0;){if(n===l.index){let c;l.type===2?c=new ot(i,i.nextSibling,this,t):l.type===1?c=new l.ctor(i,l.name,l.strings,this,t):l.type===6&&(c=new Bo(i,this,t)),this._$AV.push(c),l=r[++s]}n!==l?.index&&(i=C.nextNode(),n++)}return C.currentNode=G,e}p(t){let o=0;for(let r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(t,r,o),o+=r.strings.length-2):r._$AI(t[o])),o++}}class ot{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,o,r,e){this.type=2,this._$AH=k,this._$AN=void 0,this._$AA=t,this._$AB=o,this._$AM=r,this.options=e,this._$Cv=e?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,o=this._$AM;return o!==void 0&&t?.nodeType===11&&(t=o.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,o=this){t=Z(this,t,o),I(t)?t===k||t==null||t===""?(this._$AH!==k&&this._$AR(),this._$AH=k):t!==this._$AH&&t!==K&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):jr(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==k&&I(this._$AH)?this._$AA.nextSibling.data=t:this.T(G.createTextNode(t)),this._$AH=t}$(t){let{values:o,_$litType$:r}=t,e=typeof r=="number"?this._$AC(t):(r.el===void 0&&(r.el=tt.createElement(Eo(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===e)this._$AH.p(o);else{let i=new Ao(e,this),n=i.u(this.options);i.p(o),this.T(n),this._$AH=i}}_$AC(t){let o=Lo.get(t.strings);return o===void 0&&Lo.set(t.strings,o=new tt(t)),o}k(t){zt(this._$AH)||(this._$AH=[],this._$AR());let o=this._$AH,r,e=0;for(let i of t)e===o.length?o.push(r=new ot(this.O(S()),this.O(S()),this,this.options)):r=o[e],r._$AI(i),e++;e<o.length&&(this._$AR(r&&r._$AB.nextSibling,e),o.length=e)}_$AR(t=this._$AA.nextSibling,o){for(this._$AP?.(!1,!0,o);t!==this._$AB;){let r=uo(t).nextSibling;uo(t).remove(),t=r}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class rt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,o,r,e,i){this.type=1,this._$AH=k,this._$AN=void 0,this.element=t,this.name=o,this._$AM=e,this.options=i,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=k}_$AI(t,o=this,r,e){let i=this.strings,n=!1;if(i===void 0)t=Z(this,t,o,0),n=!I(t)||t!==this._$AH&&t!==K,n&&(this._$AH=t);else{let s=t,l,c;for(t=i[0],l=0;l<i.length-1;l++)c=Z(this,s[r+l],o,l),c===K&&(c=this._$AH[l]),n||=!I(c)||c!==this._$AH[l],c===k?t=k:t!==k&&(t+=(c??"")+i[l+1]),this._$AH[l]=c}n&&!e&&this.j(t)}j(t){t===k?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Ho extends rt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===k?void 0:t}}class Ro extends rt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==k)}}class Fo extends rt{constructor(t,o,r,e,i){super(t,o,r,e,i),this.type=5}_$AI(t,o=this){if((t=Z(this,t,o,0)??k)===K)return;let r=this._$AH,e=t===k&&r!==k||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,i=t!==k&&(r===k||e);e&&this.element.removeEventListener(this.name,this,r),i&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Bo{constructor(t,o,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=o,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){Z(this,t)}}var Ar=$t.litHtmlPolyfillSupport;Ar?.(tt,ot),($t.litHtmlVersions??=[]).push("3.3.2");var Co=(t,o,r)=>{let e=r?.renderBefore??o,i=e._$litPart$;if(i===void 0){let n=r?.renderBefore??null;e._$litPart$=i=new ot(o.insertBefore(S(),n),n,void 0,r??{})}return i._$AI(t),i};var Tt=globalThis;class N extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let o=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Co(o,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return K}}N._$litElement$=!0,N.finalized=!0,Tt.litElementHydrateSupport?.({LitElement:N});var Hr=Tt.litElementPolyfillSupport;Hr?.({LitElement:N});(Tt.litElementVersions??=[]).push("4.2.2");var Go=(t)=>(o,r)=>{r!==void 0?r.addInitializer(()=>{customElements.define(t,o)}):customElements.define(t,o)};var Rr={attribute:!0,type:String,converter:P,reflect:!1,hasChanged:pt},Fr=(t=Rr,o,r)=>{let{kind:e,metadata:i}=r,n=globalThis.litPropertyMetadata.get(i);if(n===void 0&&globalThis.litPropertyMetadata.set(i,n=new Map),e==="setter"&&((t=Object.create(t)).wrapped=!0),n.set(r.name,t),e==="accessor"){let{name:s}=r;return{set(l){let c=o.get.call(this);o.set.call(this,l),this.requestUpdate(s,c,t,!0,l)},init(l){return l!==void 0&&this.C(s,void 0,t,l),l}}}if(e==="setter"){let{name:s}=r;return function(l){let c=this[s];o.call(this,l),this.requestUpdate(s,c,t,!0,l)}}throw Error("Unsupported decorator location: "+e)};function et(t){return(o,r)=>typeof r=="object"?Fr(t,o,r):((e,i,n)=>{let s=i.hasOwnProperty(n);return i.constructor.createProperty(n,e),s?Object.getOwnPropertyDescriptor(i,n):void 0})(t,o,r)}function jt(t){return et({...t,state:!0,attribute:!1})}var M=(t,o,r)=>(r.configurable=!0,r.enumerable=!0,Reflect.decorate&&typeof o!="object"&&Object.defineProperty(t,o,r),r);function Ko(t,o){return(r,e,i)=>{let n=(s)=>s.renderRoot?.querySelector(t)??null;if(o){let{get:s,set:l}=typeof e=="object"?r:i??(()=>{let c=Symbol();return{get(){return this[c]},set(p){this[c]=p}}})();return M(r,e,{get(){let c=s.call(this);return c===void 0&&(c=n(this),(c!==null||this.hasUpdated)&&l.call(this,c)),c}})}return M(r,e,{get(){return n(this)}})}}var y={bold:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`,italic:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,underline:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,strike:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,h1:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,h2:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,list:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,listOrdered:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,checklist:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`,link:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,image:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,color:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>`,undo:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,redo:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>`,alignLeft:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,alignCenter:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>`,alignRight:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,code:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,clear:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,edit:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,save:v`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`};class Et extends N{constructor(){super(...arguments);this.itemId=0;this.content="";this.isInternalEditing=!1;this.isDashboardEditing=!1}_unsubscribe;static styles=kt`
        :host {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: rgba(30, 30, 35, 0.7);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            overflow: hidden;
            color: #fff;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            box-sizing: border-box;
            position: relative;
        }

        .container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            width: 100%;
            height: 100%;
        }

        /* Toolbar */
        .toolbar {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            overflow-x: auto;
            flex-shrink: 0;
            min-height: 44px;
            /* Visual Continuity Hint */
            mask-image: linear-gradient(to right, black 92%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black 92%, transparent 100%);
            transition: background 0.2s ease;
        }
        .toolbar:hover {
            background: rgba(255, 255, 255, 0.06);
        }
        .toolbar::-webkit-scrollbar { height: 0px; }
        
        .group {
            display: flex;
            align-items: center;
            gap: 2px;
            padding-right: 6px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            margin-right: 4px;
            flex-shrink: 0;
        }
        .group:last-child { border-right: none; }
        
        button {
            background: transparent;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
        }
        button:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
        button svg { width: 16px; height: 16px; }
        button.text-icon { font-weight: 700; font-size: 11px; width: auto; padding: 0 6px;}

        .color-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
        .color-input { 
            position: absolute; 
            top: 0; left: 0; 
            width: 100%; height: 100%; 
            opacity: 0; 
            cursor: pointer; 
        }

        /* Content Area */
        .content-area {
            flex: 1;
            padding: 16px;
            padding-bottom: 60px;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #ffffff !important;
            word-break: break-word;
            outline: none;
            display: block;
            width: 100%;
            height: 100%;
            min-height: 0; /* Flexbox scroll fix */
        }
        
        .content-area:empty::before {
            content: attr(data-placeholder);
            color: rgba(255, 255, 255, 0.3);
            font-style: italic;
            pointer-events: none;
        }

        /* FABs */
        .fab-btn {
            position: absolute;
            bottom: 15px;
            right: 15px;
            z-index: 100; /* Ensure it's on top */
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            /* High Visibility Style */
            background: var(--accent, #0078d4);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0; /* Hidden by default */
            transform: translateY(10px); /* Slide up effect */
        }
        
        :host(:hover) .fab-btn,
        .fab-btn:focus-visible {
            opacity: 1;
            transform: translateY(0);
        }

        .fab-btn:hover {
            transform: translateY(-2px) scale(1.05); /* Override the :host hover transform */
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            filter: brightness(1.1);
        }

        .edit-btn {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(4px);
            color: rgba(255,255,255,0.8);
        }
        .edit-btn:hover { background: var(--accent, #ff4757); color: white; }

        .save-btn {
            background: var(--accent, #ff4757);
            color: white;
        }
        .save-btn:hover { background: #ff6b81; }

        /* Typography Styles */
        h1 { font-size: 1.6em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.2em; margin-top:0;}
        h2 { font-size: 1.4em; margin-top:0.5em;}
        a { color: var(--accent, #ff4757); }
        blockquote { border-left: 3px solid var(--accent, #ff4757); padding-left: 1em; color: rgba(255,255,255,0.6); }
        img { max-width: 100%; border-radius: 8px; }
    `;connectedCallback(){super.connectedCallback(),this._unsubscribe=x.subscribe((o)=>{let r=this.isDashboardEditing;if(this.isDashboardEditing=o.isEditing||!1,r!==this.isDashboardEditing)if(this.isDashboardEditing)this.isInternalEditing=!1,this.requestUpdate();else this.loadFromStore()});let t=x.getState();this.isDashboardEditing=t.isEditing||!1,this.loadFromStore()}disconnectedCallback(){if(super.disconnectedCallback(),this._unsubscribe)this._unsubscribe()}updated(t){if(t.has("content")&&!this.isInternalEditing&&this.editorElement){if(this.editorElement.innerHTML!==this.content)this.editorElement.innerHTML=this.content||""}}loadFromStore(){if(!this.itemId)return;let o=x.getState().items.find((r)=>r.id===this.itemId);if(o)this.parseAndSetContent(o.content)}parseAndSetContent(t){try{let o=t;if(typeof t==="string")try{let r=JSON.parse(t);if(r&&typeof r==="object")o=r.text||""}catch(r){}else if(typeof t==="object")o=t.text||"";this.content=o||""}catch(o){this.content=""}}exec(t,o){if(document.execCommand(t,!1,o),this.editorElement)this.editorElement.focus()}saveContent(){try{let t=this.shadowRoot?.querySelector(".editor")||this.shadowRoot?.querySelector("[contenteditable]");if(!t)throw Error("Critical: Editor div missing");let o=t.innerHTML;this.content=o,this.isInternalEditing=!1,this.requestUpdate(),setTimeout(()=>{if(this.itemId){let r=x.getState().items.find((n)=>n.id===this.itemId),e={};try{e=typeof r?.content==="string"?JSON.parse(r.content):r?.content||{}}catch(n){console.warn("Failed to parse existing content",n)}let i={...e,text:o};x.updateItem({id:this.itemId,content:JSON.stringify(i)}).catch((n)=>console.error("[Store Update Failed]",n))}},0)}catch(t){console.error("[Notepad Save Error]",t),alert(a.t("widget.notepad.error.save")+t)}}startEditing(){if(this.isDashboardEditing)return;this.isInternalEditing=!0,setTimeout(()=>{if(this.editorElement){if(this.editorElement.focus(),this.editorElement.innerHTML!==this.content)this.editorElement.innerHTML=this.content||""}},0)}handleColor(t){let o=t.target;this.exec("foreColor",o.value)}handleToolbarWheel(t){t.preventDefault();let o=t.currentTarget;o.scrollLeft+=t.deltaY}insertChecklist(){let t="chk-"+Math.random().toString(36).substr(2,9),o=`<div style="display:flex; align-items:center; margin: 4px 0;"><input type="checkbox" id="${t}" style="margin-right:8px;"><label for="${t}">${a.t("widget.notepad.prompt.new_item")}</label></div>`;this.exec("insertHTML",o)}insertCode(){let o=`<pre style="background:rgba(0,0,0,0.3); padding:8px; border-radius:4px; font-family:monospace; margin:8px 0;"><code>${a.t("widget.notepad.prompt.code_block")}</code></pre><p><br></p>`;this.exec("insertHTML",o)}render(){try{if(!this.isInternalEditing)return v`
                    <div 
                        class="viewer" 
                        style="flex: 1; width: 100%; height: 100%; min-height: 100px; color: #ffffff !important; overflow-y: auto; padding: 16px; word-wrap: break-word;"
                        .innerHTML="${this.content||`<span style='opacity:0.5; font-style:italic'>${a.t("widget.notepad.placeholder")}</span>`}"
                    ></div>

                    <button class="fab-btn" @click="${()=>this.isInternalEditing=!0}" style="position: absolute; bottom: 10px; right: 10px; z-index: 10;">
                        ${y.edit}
                    </button>
                `;return v`
                <div class="container">
                    <div class="toolbar" @wheel="${this.handleToolbarWheel}" title="${a.t("widget.notepad.tool.scroll_hint")}">
                        <!-- History Group -->
                        <div class="group">
                             <button @click="${(t)=>{t.preventDefault(),this.exec("undo")}}" title="${a.t("widget.notepad.tool.undo")}">${y.undo}</button>
                             <button @click="${(t)=>{t.preventDefault(),this.exec("redo")}}" title="${a.t("widget.notepad.tool.redo")}">${y.redo}</button>
                        </div>
                        
                        <!-- Text Group -->
                        <div class="group">
                            <button @click="${(t)=>{t.preventDefault(),this.exec("formatBlock","H1")}}" title="${a.t("widget.notepad.tool.h1")}">${y.h1}</button>
                            <button @click="${(t)=>{t.preventDefault(),this.exec("formatBlock","H2")}}" title="${a.t("widget.notepad.tool.h2")}">${y.h2}</button>
                            <button @click="${(t)=>{t.preventDefault(),this.exec("bold")}}" title="${a.t("widget.notepad.tool.bold")}">${y.bold}</button>
                            <button @click="${(t)=>{t.preventDefault(),this.exec("italic")}}" title="${a.t("widget.notepad.tool.italic")}">${y.italic}</button>
                            
                            <!-- Color Picker -->
                            <div class="color-wrapper">
                                <button title="${a.t("widget.notepad.tool.color")}">${y.color}</button>
                                <input type="color" class="color-input" @change="${this.handleColor}" title="${a.t("widget.notepad.tool.color")}" />
                            </div>
                        </div>

                        <!-- Paragraph Group -->
                        <div class="group">
                             <button @click="${(t)=>{t.preventDefault(),this.exec("justifyLeft")}}" title="${a.t("widget.notepad.tool.align_left")}">${y.alignLeft}</button>
                             <button @click="${(t)=>{t.preventDefault(),this.exec("justifyCenter")}}" title="${a.t("widget.notepad.tool.align_center")}">${y.alignCenter}</button>
                             <button @click="${(t)=>{t.preventDefault(),this.exec("justifyRight")}}" title="${a.t("widget.notepad.tool.align_right")}">${y.alignRight}</button>
                        </div>
                        
                        <div class="group">
                            <button @click="${(t)=>{t.preventDefault(),this.insertChecklist()}}" title="${a.t("widget.notepad.tool.checklist")}">${y.checklist}</button>
                            <button @click="${(t)=>{t.preventDefault(),this.exec("insertUnorderedList")}}" title="${a.t("widget.notepad.tool.list_bullet")}">${y.list}</button>
                            <button @click="${(t)=>{t.preventDefault(),this.exec("insertOrderedList")}}" title="${a.t("widget.notepad.tool.list_ordered")}">${y.listOrdered}</button>
                        </div>

                        <!-- Insert Group -->
                        <div class="group">
                            <button @click="${(t)=>{t.preventDefault(),this.insertCode()}}" title="${a.t("widget.notepad.tool.code")}">${y.code}</button>
                            <button @click="${(t)=>{t.preventDefault();let o=prompt(a.t("widget.notepad.prompt.url"));if(o)this.exec("createLink",o)}}" title="${a.t("widget.notepad.tool.link")}">${y.link}</button>
                            <button @click="${(t)=>{t.preventDefault();let o=prompt(a.t("widget.notepad.prompt.image_url"));if(o)this.exec("insertImage",o)}}" title="${a.t("widget.notepad.tool.image")}">${y.image}</button>
                             <button @click="${(t)=>{t.preventDefault(),this.exec("removeFormat")}}" title="${a.t("widget.notepad.tool.clear_format")}">${y.clear}</button>
                        </div>
                    </div>

                    <!-- Note: using .innerHTML binding for initial content, contenteditable will manage changes -->
                    <div class="content-area editor" 
                         contenteditable="true" 
                         spellcheck="false"
                         data-placeholder="${a.t("widget.notepad.placeholder")}"
                         .innerHTML="${this.content}">
                    </div>

                    <button class="fab-btn save-btn" @click="${this.saveContent}" title="${a.t("widget.notepad.tool.save")}">${y.save}</button>
                </div>
            `}catch(t){return v`
                <div style="background: blue; color: white; padding: 20px; height: 100%; overflow:auto;">
                    <h3>CRITICAL ERROR</h3>
                    <pre>${t.toString()}</pre>
                    <pre>${t.stack}</pre>
                </div>
            `}}}R([et({type:Number,attribute:"item-id"}),q("design:type",Number)],Et.prototype,"itemId",void 0),R([et({type:String}),q("design:type",String)],Et.prototype,"content",void 0),R([jt(),q("design:type",Boolean)],Et.prototype,"isInternalEditing",void 0),R([jt(),q("design:type",Boolean)],Et.prototype,"isDashboardEditing",void 0),R([Ko(".editor-content"),q("design:type",typeof HTMLElement==="undefined"?Object:HTMLElement)],Et.prototype,"editorElement",void 0),Et=R([Go("widget-notepad")],Et);class No extends HTMLElement{cpuBar=null;ramBar=null;tempBar=null;cpuText=null;ramText=null;tempText=null;_unsubscribe;_unsubscribeI18n;_itemId=0;_interval=1000;lastUpdate=0;static get observedAttributes(){return["item-id","content"]}attributeChangedCallback(t,o,r){if(t==="item-id")this._itemId=parseInt(r);if(t==="content")try{let e=typeof r==="string"?JSON.parse(r):r;if(e&&e.interval)this._interval=parseInt(e.interval)}catch(e){}}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:"open"});if(!this.cpuBar)this.render();if(this._unsubscribe)return;if(this._unsubscribe=x.subscribe((t)=>{if(this._itemId){let o=t.items.find((r)=>r.id===this._itemId);if(o&&o.content)try{let r=typeof o.content==="string"?JSON.parse(o.content):o.content;if(r.interval&&r.interval!==this._interval)this._interval=parseInt(r.interval)}catch(r){}}if(t.stats)this.update(t.stats)}),!this._unsubscribeI18n)this._unsubscribeI18n=a.subscribe(()=>{this.render();let t=x.getState();if(t.stats)this.update(t.stats)})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n()}lastKnownStats={cpu_usage:0,ram_usage:0,temperature:0};update(t){if(!this.shadowRoot)return;let o=Date.now(),r=100;if(o-this.lastUpdate<this._interval-r)return;if(this.lastUpdate=o,typeof t.cpu_usage==="number")this.lastKnownStats.cpu_usage=t.cpu_usage;if(typeof t.ram_usage==="number")this.lastKnownStats.ram_usage=t.ram_usage;if(typeof t.temperature==="number")this.lastKnownStats.temperature=t.temperature;let e=typeof t.cpu_usage==="number"?t.cpu_usage:this.lastKnownStats.cpu_usage,i=typeof t.ram_usage==="number"?t.ram_usage:this.lastKnownStats.ram_usage,n=typeof t.temperature==="number"?t.temperature:this.lastKnownStats.temperature;requestAnimationFrame(()=>{let s=Math.min(100,Math.max(0,Math.round(e)));if(this.cpuBar)this.cpuBar.style.strokeDasharray=`${s}, 100`;if(this.cpuText)this.cpuText.textContent=`${s}%`;let l=Math.min(100,Math.max(0,Math.round(i)));if(this.ramBar)this.ramBar.style.strokeDasharray=`${l}, 100`;if(this.ramText)this.ramText.textContent=`${l}%`;let c=Math.round(n),p=Math.min(100,Math.max(0,c));if(this.tempBar)this.tempBar.style.strokeDasharray=`${p}, 100`;if(this.tempText)this.tempText.textContent=`${c}°C`})}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    width: 100%;
                    height: 100%;
                    background: rgba(40, 44, 52, 0.4);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    box-sizing: border-box;
                    padding: 12px;
                    color: white;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                :host(:hover) {
                    background: rgba(40, 44, 52, 0.5);
                    border-color: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
                .gauge-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                }
                .wrapper {
                    position: relative;
                    width: 64px;
                    height: 64px;
                }
                .circular-chart {
                    width: 100%;
                    height: 100%;
                    display: block;
                    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
                }
                .circle-bg {
                    fill: none;
                    stroke: rgba(255, 255, 255, 0.05);
                    stroke-width: 3;
                }
                .circle {
                    fill: none;
                    stroke-width: 3;
                    stroke-linecap: round;
                    transition: stroke-dasharray 0.5s ease-in-out, stroke 0.5s ease;
                }
                .cpu-bar { stroke: url(#grad-cpu); }
                .ram-bar { stroke: url(#grad-ram); }
                .temp-bar { stroke: url(#grad-temp); }

                .value-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: var(--font-mono, 'JetBrains Mono', monospace);
                    font-size: 13px;
                    font-weight: 800;
                    text-align: center;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5);
                    user-select: none;
                }
                .sub {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                }
            </style>

            <svg style="width:0;height:0;position:absolute;">
                <defs>
                    <linearGradient id="grad-cpu" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#00f2fe" />
                        <stop offset="100%" stop-color="#4facfe" />
                    </linearGradient>
                    <linearGradient id="grad-ram" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#f093fb" />
                        <stop offset="100%" stop-color="#f5576c" />
                    </linearGradient>
                    <linearGradient id="grad-temp" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#2196f3" /> <!-- Blue -->
                        <stop offset="50%" stop-color="#ffeb3b" /> <!-- Yellow -->
                        <stop offset="100%" stop-color="#f44336" /> <!-- Red -->
                    </linearGradient>
                </defs>
            </svg>

            <!-- CPU -->
            <div class="gauge-container">
                <div class="wrapper">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle cpu-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="value-overlay cpu-text">0%</div>
                </div>
                <div class="sub">${a.t("widget.telemetry.cpu")}</div>
            </div>

            <!-- RAM -->
            <div class="gauge-container">
                <div class="wrapper">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle ram-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="value-overlay ram-text">0%</div>
                </div>
                <div class="sub">${a.t("widget.telemetry.ram")}</div>
            </div>

            <!-- TEMP -->
            <div class="gauge-container">
                <div class="wrapper">
                    <svg viewBox="0 0 36 36" class="circular-chart">
                        <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path class="circle temp-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div class="value-overlay temp-text">0°C</div>
                </div>
                <div class="sub">${a.t("widget.telemetry.temp")}</div>
            </div>
        `,this.cpuBar=this.shadowRoot.querySelector(".cpu-bar"),this.ramBar=this.shadowRoot.querySelector(".ram-bar"),this.tempBar=this.shadowRoot.querySelector(".temp-bar"),this.cpuText=this.shadowRoot.querySelector(".cpu-text"),this.ramText=this.shadowRoot.querySelector(".ram-text"),this.tempText=this.shadowRoot.querySelector(".temp-text")}}customElements.define("widget-telemetry",No);var Mo=`:host {
    /* Grid columns from user preferences */
    --current-grid-cols: var(--grid-columns-pc, 9);
    --grid-gap: 12px;

    display: grid;
    /* 1. Use 1fr to fill available width dynamically */
    grid-template-columns: repeat(var(--current-grid-cols), 1fr);
    /* 2. Enforce minimum row height, but allow expansion */
    grid-auto-rows: var(--row-height, minmax(100px, auto));
    gap: var(--grid-gap);

    /* 3. Force full width */
    width: 100%;
    max-width: 100%;
    margin: 0 auto;

    /* Ensure drop zone covers screen minus header/padding (Math: 48px Header + 16px Padding * 2 = ~80px) */
    min-height: calc(100vh - 80px);
    position: relative;
    align-content: start;
    padding-bottom: 20px;

    /* Hide scrollbars on component level */
    scrollbar-width: none !important;
}

:host::-webkit-scrollbar {
    display: none !important;
}

@media (pointer: coarse),
(max-width: 1024px) {

    /* Trigger on Touch Devices OR Small Screens (as backup if detection fails) */
    :host {
        --current-grid-cols: var(--grid-columns-tablet, 4);
        --cell-size: 90px;
    }

    /* FORCE STACK LAYOUT */
    .bookmark-grid__card,
    .bookmark-grid__section {
        grid-column: auto / span 1 !important;
        grid-row: auto / span 1 !important;
        width: 100% !important;
    }

    /* Ensure aspect ratio is maintained but width fills column */
    .bookmark-grid__card {
        aspect-ratio: 1 / 1;
        height: auto;
    }

    /* Sections should just flow naturally, height auto */
    .bookmark-grid__section {
        height: auto !important;
        min-height: 100px;
        /* Disable dragging in this mode to prevent confusion/bugs? 
           Or allow sorting but it won't save positions accurately relative to PC.
           For now, visual fix is priority. */
    }

    /* Hide resize handles on touch/tablet */
    .resize-handle {
        display: none !important;
    }
}

@media (max-width: 640px) {
    :host {
        --current-grid-cols: var(--grid-columns-mobile, 2);
        --cell-size: 80px;
        --grid-gap: 12px;
    }
}

/* Items positioned by coordinates */
.bookmark-grid__card {
    grid-column: var(--x) / span var(--w);
    grid-row: var(--y) / span var(--h);

    width: 100%;
    /* Fill the grid cell */

    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    position: relative;
    /* CRITICAL: Enforce square aspect ratio */
    aspect-ratio: 1 / 1;
    height: auto;

    /* CRITICAL: Prevent overflow in tight sections (like 1x4) */
    max-width: 100%;
    max-height: 100%;
    min-height: 0;
    justify-self: center;
    align-self: center;
    /* Allow aspect-ratio to drive height */

    /* CRITICAL: Required for status-indicator positioning */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(8px, 4cqmin, 24px);
    text-decoration: none;
    color: var(--text-main);
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
    box-sizing: border-box;
    overflow: hidden;
    container-type: size;
    /* CRITICAL FIX: Ensure Bookmarks always float above Sections */
    z-index: 10;
}

/* SEARCH OVERRIDE: Remove fixed positions during search to pack items at top */
:host(.search-active) .bookmark-grid__card {
    grid-column: auto / span 1 !important;
    grid-row: auto / span 1 !important;
    grid-column: auto / span 1 !important;
    grid-row: auto / span 1 !important;
    aspect-ratio: 1 / 1 !important;
    width: 100% !important;
    height: auto !important;
    /* Reset height override */
}

.bookmark-grid__card:hover {
    border-color: var(--border-bright);
    background: var(--surface-solid);
    /* Removed card lift, moved to icon */
}

/* Status Indicator */
.status-indicator {
    position: absolute;
    bottom: clamp(10px, 6cqmin, 24px);
    right: clamp(10px, 6cqmin, 24px);
    width: clamp(10px, 5cqmin, 20px);
    height: clamp(10px, 5cqmin, 20px);
    border-radius: 50%;
    background-color: var(--text-dim);
    border: 1.5px solid var(--panel);
    /* Use panel color instead of fixed white for ring */
    /* Light effect border */
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    z-index: 5;
    transition: all 0.3s ease;
}

.status-up {
    background-color: #2ecc71;
    box-shadow: 0 0 8px rgba(46, 204, 113, 0.8), 0 0 0 0px rgba(46, 204, 113, 0.4);
    animation: status-pulse-up 2s infinite;
}

.status-down {
    background-color: #e74c3c;
    box-shadow: 0 0 8px rgba(231, 76, 60, 0.8), 0 0 0 0px rgba(231, 76, 60, 0.4);
    animation: status-pulse-down 2s infinite;
}

@keyframes status-pulse-up {
    0% {
        box-shadow: 0 0 0 0px rgba(46, 204, 113, 0.7), 0 0 8px rgba(46, 204, 113, 0.8);
    }

    70% {
        box-shadow: 0 0 0 6px rgba(46, 204, 113, 0), 0 0 8px rgba(46, 204, 113, 0.8);
    }

    100% {
        box-shadow: 0 0 0 0px rgba(46, 204, 113, 0), 0 0 8px rgba(46, 204, 113, 0.8);
    }
}

@keyframes status-pulse-down {
    0% {
        box-shadow: 0 0 0 0px rgba(231, 76, 60, 0.7), 0 0 8px rgba(231, 76, 60, 0.8);
    }

    70% {
        box-shadow: 0 0 0 6px rgba(231, 76, 60, 0), 0 0 8px rgba(231, 76, 60, 0.8);
    }

    100% {
        box-shadow: 0 0 0 0px rgba(231, 76, 60, 0), 0 0 8px rgba(231, 76, 60, 0.8);
    }
}

/* Action Buttons (Edit Mode) */
.bookmark-actions {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 4px;
    z-index: 999;
    /* Above everything else in the card */
    pointer-events: auto;
}

.action-btn {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    color: var(--text-main);
    transition: all 0.2s;
    padding: 0;
    pointer-events: auto;
}

.action-btn:hover {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.btn-delete:hover {
    background: #e74c3c;
    border-color: #e74c3c;
}

/* Edit Mode Styles */
:host(.edit-mode) .bookmark-grid__card,
:host(.edit-mode) .bookmark-grid__section {
    border: 1px dashed var(--accent);
    background: rgba(0, 120, 212, 0.1);
    /* Increased opacity for light mode visibility */
    cursor: grab;
    position: relative;
    /* Ensure handle positioning context */
}

/* Resize Handle */
.resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 0;
    height: 0;
    cursor: nwse-resize;
    z-index: 20;

    /* Visual indicator: Solid technical triangle */
    border-style: solid;
    border-width: 0 0 12px 12px;
    border-color: transparent transparent var(--accent) transparent;
    opacity: 0.8;
    transition: all 0.2s;
}

.resize-handle:hover {
    opacity: 1;
    transform: scale(1.1);
}

:host(.edit-mode) .bookmark-grid__card:active,
:host(.edit-mode) .bookmark-grid__section:active {
    cursor: grabbing;
    background: rgba(0, 120, 212, 0.2);
    border-style: solid;
}

/* Edit Mode Grid Guide - (Visuals removed for cleanliness) */

.bookmark-grid__icon-container {
    width: clamp(48px, 50cqmin, 180px);
    height: clamp(48px, 50cqmin, 180px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    transition: color 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    /* Bouncy transition */
}

.bookmark-grid__card:hover .bookmark-grid__icon-container {
    /* No movement, just rotate and scale */
    transform: rotate(-5deg) scale(1.1);
    color: var(--text-main);
}

.bookmark-grid__label {
    font-size: clamp(14px, 10cqmin, 32px);
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    padding: 0 8px;
    font-family: var(--font-sans);
}

.bookmark-grid__icon-svg {
    width: 100%;
    height: 100%;
    stroke: currentColor;
    stroke-width: 1.5px;
    fill: none;
}

.bookmark-grid__icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

/* Ensure all injected SVGs inherit hover colors */
.bookmark-grid__icon-container svg,
.bookmark-grid__icon-container svg path {
    fill: currentColor;
    stroke: none;
    transition: all 0.2s;
}

.bookmark-grid__card:hover .bookmark-grid__icon-container svg,
.bookmark-grid__card:hover .bookmark-grid__icon-container svg path {
    fill: var(--accent);
}

/* Group Styles */
/* Section (Resizable Box) */
/* Section (Resizable Box) - Premium Glassmorphism */
.bookmark-grid__section {
    background: var(--surface);
    /* Use theme surface instead of fixed dark rgba */
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--border);
    /* Use theme border */
    border-radius: var(--radius);
    grid-column: var(--x) / span var(--w);
    grid-row: var(--y) / span var(--h);
    padding: 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: visible;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
    /* Lighter shadow */
    /* CRITICAL FIX: Sections are containers/backgrounds, should be below cards */
    z-index: 1;
}

.bookmark-grid__section:hover {
    border-color: var(--border-bright);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.bookmark-grid__section.drop-target {
    background: rgba(0, 120, 212, 0.15);
    border: 2px solid var(--accent);
    box-shadow: 0 0 15px rgba(0, 120, 212, 0.3);
}

.bookmark-grid__group-header {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-dim);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Ghost Styles */
.bookmark-grid__ghost {
    background: rgba(0, 255, 0, 0.1);
    border: 2px dashed #00ff00;
    border-radius: var(--radius);
    position: absolute;
    /* Move out of grid flow to prevent layout thrashing */
    top: calc(var(--y-px, 0) * 1px);
    left: calc(var(--x-px, 0) * 1px);
    width: calc(var(--w-px, 0) * 1px);
    height: calc(var(--h-px, 0) * 1px);

    pointer-events: none;
    transition: all 0.1s;
    z-index: 100;

}

.bookmark-grid__ghost.invalid {
    background: rgba(255, 0, 0, 0.1);
    border-color: #ff0000;
}

/* Group Content Layout */
/* Nested Content Layout */
/* Nested Content Layout - Large & Responsive */

.bookmark-grid__nested-content {
    display: grid;
    /* Use the section's width and height for local grid */
    grid-template-columns: repeat(var(--w), 1fr);
    grid-template-rows: repeat(var(--h), 1fr);
    gap: 12px;
    width: 100%;
    height: 100%;
    align-content: start;
}

/* Premium Nested Card Style */
/* Nested Card Style - Removed to enforce consistency with root cards */
/* They will now inherit .bookmark-grid__card styles */`;class qo extends HTMLElement{bookmarks=[];allItems=[];isEditing=!1;searchQuery="";_unsubscribe;_unsubscribeI18n;_resizeObserver;dragTargetId=null;ghostEl=null;dragOffsetX=0;dragOffsetY=0;isResizing=!1;resizeTargetId=null;initialResizeX=0;initialResizeY=0;initialResizeW=0;initialResizeH=0;currentColWidth=0;currentGridCols=12;isTouchDevice=!1;constructor(){super();this.attachShadow({mode:"open"});let t=window.matchMedia("(pointer: coarse)");this.isTouchDevice=t.matches,t.addEventListener("change",(o)=>{this.isTouchDevice=o.matches,this.render()})}_widgetModal;_boundActionClick=this.handleActionClick.bind(this);connectedCallback(){this.render(),this.updateGridMetrics(),this._resizeObserver=new ResizeObserver(()=>{this.updateGridMetrics()}),this._resizeObserver.observe(this),this._unsubscribe=x.subscribe((t)=>{let o=!1;if(this.isEditing!==t.isEditing)this.isEditing=t.isEditing,o=!0;if(this.searchQuery!==t.searchQuery)this.searchQuery=t.searchQuery,o=!0;let r=Array.isArray(t.items)?t.items:[];if(JSON.stringify(this.allItems)!==JSON.stringify(r)||o){if(this.allItems=r,this.searchQuery)this.classList.add("search-active"),this.bookmarks=this.allItems.filter((i)=>{if(i.type!=="bookmark")return!1;return((typeof i.content==="string"?JSON.parse(i.content):i.content).label||"").toLowerCase().includes(this.searchQuery)});else this.classList.remove("search-active"),this.bookmarks=this.allItems;o=!0}if(o)this.render()}),this.setupDragListeners(),this.setupResizeListeners(),this.setupActionListeners(),D.start(),this._unsubscribeI18n=a.subscribe(()=>this.render())}setupActionListeners(){let t=this.shadowRoot;t.removeEventListener("click",this._boundActionClick),t.addEventListener("click",this._boundActionClick)}async handleActionClick(t){if(!this.isEditing)return;let o=t.target;if(!o)return;let r=o.closest(".btn-delete"),e=o.closest(".btn-edit");if(r||e)t.preventDefault(),t.stopPropagation();else if(o.closest("a"))t.preventDefault();if(r){let i=r.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!i)return;let n=parseInt(i.dataset.id||"0"),s=this.allItems.find((d)=>d.id==n);if(!s)return;let l=s.type==="group"?a.t("type.group"):s.type==="section"?a.t("type.section"):a.t("type.bookmark"),{eventBus:c,EVENTS:p}=await Promise.resolve().then(() => (xt(),At));c.emit(p.SHOW_CONFIRMATION,{title:`${a.t("general.delete")} ${l}`,message:a.t("bookmark.delete_confirm_message"),onConfirm:()=>{x.deleteItem(n)}});return}if(e){let i=e.closest(".bookmark-grid__card, .bookmark-grid__group");if(!i)return;let n=parseInt(i.dataset.id||"0"),s=this.allItems.find((l)=>l.id==n);if(s){let{eventBus:l,EVENTS:c}=await Promise.resolve().then(() => (xt(),At));if(s.type==="widget")l.emit(c.SHOW_WIDGET_CONFIG,{item:s,type:"widget"});else l.emit(c.SHOW_WIDGET_CONFIG,{item:s,type:"bookmark"})}return}}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._resizeObserver)this._resizeObserver.disconnect();D.stop()}updateGridMetrics(){let t=this.getBoundingClientRect(),o=getComputedStyle(this),r=o.getPropertyValue("--current-grid-cols").trim(),e=r?parseInt(r,10):12,i=o.getPropertyValue("--grid-gap").trim(),n=i?parseInt(i,10):16,s=(t.width-(e-1)*n)/e;this.currentGridCols=e,this.currentColWidth=s,this.style.setProperty("--row-height",`${s}px`)}setupResizeListeners(){window.addEventListener("mousemove",this.handleWindowMouseMove.bind(this)),window.addEventListener("mouseup",this.handleWindowMouseUp.bind(this)),this.shadowRoot.addEventListener("mousedown",(t)=>{let o=t;if(!this.isEditing)return;let r=o.target;if(r.classList.contains("resize-handle")){o.preventDefault(),o.stopPropagation();let e=r.closest(".bookmark-grid__card, .bookmark-grid__section");if(!e||!e.dataset.id)return;let i=parseInt(e.dataset.id),n=this.bookmarks.find((b)=>b.id==i);if(!n)return;this.isResizing=!0,this.resizeTargetId=i,this.initialResizeX=o.clientX,this.initialResizeY=o.clientY,this.initialResizeW=n.w,this.initialResizeH=n.h;let s=this,l=s.getBoundingClientRect(),p=getComputedStyle(s).getPropertyValue("--current-grid-cols").trim(),d=p?parseInt(p,10):9,g=isNaN(d)?9:d,h=16;this.currentColWidth=(l.width-(g-1)*h)/g,this.updateGhost({x:n.x,y:n.y,w:n.w,h:n.h},!0)}})}handleWindowMouseMove(t){if(!this.isResizing||!this.resizeTargetId)return;let o=t.clientX-this.initialResizeX,r=t.clientY-this.initialResizeY,e=Math.round(o/(this.currentColWidth+16)),i=Math.round(r/(this.currentColWidth+16)),n=this.initialResizeW+e,s=this.initialResizeH+i,l=this.bookmarks.find((c)=>c.id===this.resizeTargetId);if(l){let c=this.applyResizeConstraints(n,s,l),p={x:l.x,y:l.y,w:c.w,h:c.h,id:l.id,parent_id:l.parent_id},d=j.calculateDropValidity(p,this.bookmarks,this.currentGridCols);this.updateGhost(p,d.valid)}}applyResizeConstraints(t,o,r){let e=1,i=1;if(r.type==="widget"){let s=((typeof r.content==="string"?JSON.parse(r.content):r.content).widgetId||"").toLowerCase();if(s==="notepad")e=2,i=2;else if(s==="clock")return{w:2,h:1};else if(s==="telemetry")return{w:2,h:1};let l=Math.max(e,Math.min(12,t)),c=Math.max(i,Math.min(12,o));return{w:l,h:c}}else if(r.type==="section"){let n=Math.max(1,Math.min(12,t)),s=Math.max(1,Math.min(12,o));return{w:n,h:s}}else{let n=Math.max(1,Math.min(2,t)),s=Math.max(1,Math.min(2,o));return{w:n,h:s}}}async handleWindowMouseUp(t){if(!this.isResizing||!this.resizeTargetId)return;let o=t.clientX-this.initialResizeX,r=t.clientY-this.initialResizeY,e=Math.round(o/(this.currentColWidth+16)),i=Math.round(r/(this.currentColWidth+16)),n=this.initialResizeW+e,s=this.initialResizeH+i,l=this.bookmarks.find((g)=>g.id===this.resizeTargetId);if(!l)return;let c=this.applyResizeConstraints(n,s,l);n=c.w,s=c.h;let p={x:l.x,y:l.y,w:n,h:s,id:l.id,parent_id:l.parent_id};if(j.calculateDropValidity(p,this.bookmarks,this.currentGridCols).valid&&(l.w!==n||l.h!==s)){if(l.type==="section"){let g=n*s,h=this.bookmarks.filter((b)=>b.parent_id===l.id);if(h.sort((b,m)=>b.y-m.y||b.x-m.x),h.length>g){let b=h.slice(g),m=[...this.bookmarks];for(let _ of b){let w=j.findFirstAvailableSlot(_.w,_.h,m,this.currentGridCols);await x.updateItem({id:_.id,x:w.x,y:w.y,parent_id:void 0}),m.push({..._,x:w.x,y:w.y,parent_id:void 0})}}}await x.resizeItem(l.id,n,s)}if(this.isResizing=!1,this.resizeTargetId=null,this.ghostEl)this.ghostEl.style.display="none"}setupDragListeners(){let t=this.shadowRoot,o=this;t.addEventListener("dragstart",(r)=>{let e=r;if(!this.isEditing){e.preventDefault();return}let i=e.target.closest('[draggable="true"]');if(i&&i.dataset.id){this.dragTargetId=parseInt(i.dataset.id),e.dataTransfer.effectAllowed="move",i.style.opacity="0.5";let n=i.getBoundingClientRect();if(this.dragOffsetX=e.clientX-n.left,this.dragOffsetY=e.clientY-n.top,e.dataTransfer)e.dataTransfer.setDragImage(i,this.dragOffsetX,this.dragOffsetY)}}),t.addEventListener("dragend",(r)=>{let e=r.target.closest('[draggable="true"]');if(e)e.style.opacity="1";if(this.dragTargetId=null,this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((n)=>n.classList.remove("drop-target"))}),o.addEventListener("dragover",(r)=>{let e=r;if(!this.isEditing||!this.dragTargetId)return;e.preventDefault(),e.dataTransfer.dropEffect="move";let i=o.getBoundingClientRect(),s=getComputedStyle(this.shadowRoot.host).getPropertyValue("--current-grid-cols").trim(),l=s?parseInt(s,10):12,c=isNaN(l)?12:l,p=i.width,d=16,g=(p-(c-1)*d)/c,h=e.clientX-this.dragOffsetX-i.left,b=e.clientY-this.dragOffsetY-i.top,m=j.snapToGrid(h,b,g,d),_=this.bookmarks.find((u)=>u.id===this.dragTargetId);if(!_)return;let w={x:m.x,y:m.y,w:_.w,h:_.h,id:_.id,parent_id:_.parent_id},f=j.calculateDropValidity(w,this.bookmarks,c);if(this.updateGhost(w,f.valid),this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((u)=>u.classList.remove("drop-target")),f.targetGroup){let u=this.shadowRoot.querySelector(`.bookmark-grid__section[data-id="${f.targetGroup.id}"]`);if(u)u.classList.add("drop-target")}}),o.addEventListener("drop",async(r)=>{let e=r;if(!this.isEditing||!this.dragTargetId)return;e.preventDefault();let i=o.getBoundingClientRect(),s=getComputedStyle(o).getPropertyValue("--current-grid-cols").trim(),l=s?parseInt(s,10):12,c=isNaN(l)?12:l,p=i.width,d=16,g=(p-(c-1)*d)/c,h=e.clientX-this.dragOffsetX-i.left,b=e.clientY-this.dragOffsetY-i.top,m=j.snapToGrid(h,b,g,d),_=this.bookmarks.find((u)=>u.id===this.dragTargetId);if(!_)return;let w={x:m.x,y:m.y,w:_.w,h:_.h,id:_.id,parent_id:_.parent_id},f=j.calculateDropValidity(w,this.bookmarks,c);if(f.valid){let u={id:_.id,x:f.x,y:f.y};if(f.targetGroup)u.parent_id=f.targetGroup.id,u.x=f.x-f.targetGroup.x+1,u.y=f.y-f.targetGroup.y+1;else u.parent_id=void 0;await x.updateItem(u)}if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((u)=>u.classList.remove("drop-target"))})}updateGhost(t,o){if(!this.ghostEl)this.ghostEl=this.shadowRoot.getElementById("ghost-element");if(!this.ghostEl)return;let r=getComputedStyle(this),e=r.getPropertyValue("--grid-gap").trim(),i=e?parseInt(e,10):16,n=this.getBoundingClientRect(),s=r.getPropertyValue("--current-grid-cols").trim(),l=s?parseInt(s,10):12,p=(n.width-(l-1)*i)/l,d=p,g=(t.x-1)*(p+i),h=(t.y-1)*(d+i),b=t.w*p+(t.w-1)*i,m=t.h*d+(t.h-1)*i;if(this.ghostEl.style.display="block",this.ghostEl.style.setProperty("--x-px",String(g)),this.ghostEl.style.setProperty("--y-px",String(h)),this.ghostEl.style.setProperty("--w-px",String(b)),this.ghostEl.style.setProperty("--h-px",String(m)),o)this.ghostEl.classList.remove("invalid");else this.ghostEl.classList.add("invalid")}render(){if(this.isEditing)this.classList.add("edit-mode");else this.classList.remove("edit-mode");this.shadowRoot.innerHTML=`
            <style>${Mo}</style>
            ${go({bookmarks:this.bookmarks,isEditing:this.isEditing,isSearching:!!this.searchQuery,isTouchDevice:this.isTouchDevice})}
        `,this.setupActionListeners(),this.ghostEl=this.shadowRoot.getElementById("ghost-element")}}if(!customElements.get("bookmark-grid"))customElements.define("bookmark-grid",qo);var Jo=()=>`
    <div class="toast-container"></div>
`;var Oo=`.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    background-color: var(--surface);
    color: var(--text-main);
    padding: 12px 20px;
    border-radius: var(--radius);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    font-size: 14px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 300ms, transform 300ms;
    border-left: 4px solid var(--accent);
}

.toast--success {
    border-left-color: #00f5a0;
}

.toast--error {
    border-left-color: #fa5252;
}`;class Qo extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this}show(t,o="success"){let r=this.shadowRoot.querySelector(".toast-container");if(!r)return;let e=document.createElement("div");e.className=`toast toast--${o}`,e.textContent=t,r.appendChild(e),requestAnimationFrame(()=>{e.style.opacity="1",e.style.transform="translateY(0)"}),setTimeout(()=>{e.style.opacity="0",e.style.transform="translateY(20px)",setTimeout(()=>e.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${Oo}</style>
            ${Jo()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",Qo);var Zo=()=>`
    <div class="icon-picker">
        <div id="selected-container"></div>

        <div class="icon-picker__search">
            <input type="text"
                   id="icon-search"
                   class="icon-picker__search-input"
                   placeholder="${a.t("general.search")}" />
        </div>

        <div id="grid-container" class="icon-picker__grid"></div>
    </div>
`,Uo=(t)=>t?`
    <div class="icon-picker__selected">
        <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${t}.png"
             alt="${t}"
             class="icon-picker__preview" />
        <span class="icon-picker__selected-name">${t}</span>
    </div>
`:"",Xo=(t,o,r)=>{if(r)return`<div class="icon-picker__loading">${a.t("general.loading")}</div>`;if(t.length===0)return`<div class="icon-picker__empty">${a.t("general.no_icons")}</div>`;return t.map((e)=>`
        <div class="icon-picker__item ${o===e.name?"icon-picker__item--selected":""}"
             data-icon="${e.name}"
             title="${e.name}">
            <img src="${e.url}" alt="${e.name}" loading="lazy" />
        </div>
    `).join("")};class Do{icons=[];loaded=!1;loading=!1;BASE_URL="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";FALLBACK_URL="https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main";async loadIcons(){if(this.loaded)return this.icons;if(this.loading)return await new Promise((t)=>setTimeout(t,100)),this.loadIcons();this.loading=!0;try{let t=await fetch(`${this.BASE_URL}/tree.json`);if(!t.ok)console.log("[IconService] CDN failed, trying GitHub raw"),t=await fetch(`${this.FALLBACK_URL}/tree.json`);if(!t.ok)throw Error("Failed to fetch icon list");let o=await t.json(),r=Array.isArray(o)?o:o.png||[];if(Array.isArray(r)&&r.length>0)this.icons=r.filter((e)=>e.endsWith(".png")||e.endsWith(".svg")).map((e)=>{let i=e.replace(/\.(png|svg)$/,"");return{name:i,url:`${this.BASE_URL}/png/${i}.png`}}).sort((e,i)=>e.name.localeCompare(i.name));else console.warn("[IconService] Unexpected tree.json structure, using fallback",o),this.icons=this.getFallbackIcons();return this.loaded=!0,this.loading=!1,console.log(`[IconService] Loaded ${this.icons.length} icons`),this.icons}catch(t){return console.error("[IconService] Failed to load icons:",t),this.loading=!1,this.icons=this.getFallbackIcons(),this.loaded=!0,this.icons}}getFallbackIcons(){return["github","gitlab","docker","proxmox","truenas","plex","jellyfin","nextcloud","cloudflare","nginx","traefik","portainer","grafana","prometheus","influxdb","pihole","adguard","homeassistant","esphome","frigate","unraid","synology","opnsense","pfsense","wireguard","openvpn","bitwarden","vaultwarden","sonarr","radarr","lidarr","bazarr","prowlarr","overseerr","tautulli","transmission","qbittorrent","deluge","sabnzbd","nzbget","calibre","paperless","photoprism","immich","mealie","freshrss","miniflux","wallabag","linkding","shiori","firefox","chrome","vscode","code-server","jupyter","portainer"].map((o)=>({name:o,url:`${this.BASE_URL}/png/${o}.png`}))}searchIcons(t,o=50){if(!t.trim())return this.icons.slice(0,o);let r=t.toLowerCase().trim();return this.icons.filter((e)=>e.name.toLowerCase().includes(r)).slice(0,o)}getIconUrl(t){return`${this.BASE_URL}/png/${t}.png`}}var Ht=new Do;var Vo=`:host {
    display: block;
}

.icon-picker {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.icon-picker__selected {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-height: 64px;
}

.icon-picker__preview {
    width: 48px;
    height: 48px;
    object-fit: contain;
}

.icon-picker__placeholder {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    opacity: 0.3;
}

.icon-picker__placeholder svg {
    width: 32px;
    height: 32px;
}

.icon-picker__selected-name {
    font-size: 13px;
    color: var(--text-dim);
    font-family: var(--font-mono);
}

.icon-picker__search {
    position: relative;
}

.icon-picker__search-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
    color: var(--text-main);
    font-family: var(--font-sans);
    font-size: 14px;
    transition: border-color 0.2s;
}

.icon-picker__search-input:focus {
    outline: none;
    border-color: var(--accent);
}

.icon-picker__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
    padding: 4px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border);
    border-radius: var(--radius);
}

.icon-picker__grid::-webkit-scrollbar {
    width: 6px;
}

.icon-picker__grid::-webkit-scrollbar-track {
    background: transparent;
}

.icon-picker__grid::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 3px;
}

.icon-picker__item {
    aspect-ratio: 1;
    padding: 8px;
    background: var(--surface);
    border: 2px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-picker__item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--border-bright);
    transform: scale(1.05);
}

.icon-picker__item--selected {
    border-color: var(--accent);
    background: rgba(0, 120, 212, 0.1);
}

.icon-picker__item img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.icon-picker__loading,
.icon-picker__empty {
    grid-column: 1 / -1;
    padding: 32px;
    text-align: center;
    color: var(--text-dim);
    font-size: 13px;
}

.icon-picker__loading {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% {
        opacity: 0.5;
    }
    50% {
        opacity: 1;
    }
}
`;class Po extends HTMLElement{icons=[];filteredIcons=[];selectedIcon="";searchQuery="";isLoading=!0;debounceTimer=null;inputElement=null;id_debug=Math.random().toString(36).substr(2,5);constructor(){super();this.attachShadow({mode:"open"})}async connectedCallback(){if(this.shadowRoot.childElementCount>0)return;if(this.renderBase(),this.setupListeners(),this.icons.length===0)await this.loadIcons()}async loadIcons(){try{this.icons=await Ht.loadIcons(),this.filteredIcons=this.icons.slice(0,50),this.isLoading=!1,this.updateGrid()}catch(t){console.error(`[IconPicker:${this.id_debug}] Failed to load icons`,t),this.isLoading=!1,this.updateGrid()}}setupListeners(){let t=this.shadowRoot;this.inputElement=t.getElementById("icon-search"),this.inputElement?.addEventListener("input",(r)=>{let e=r.target;if(this.searchQuery=e.value,this.debounceTimer)window.clearTimeout(this.debounceTimer);this.debounceTimer=window.setTimeout(()=>{this.performSearch()},100)}),t.getElementById("grid-container")?.addEventListener("click",(r)=>{let i=r.target.closest(".icon-picker__item");if(i&&i.dataset.icon)this.selectedIcon=i.dataset.icon,this.updateSelected(),this.updateGrid(),this.dispatchEvent(new CustomEvent("icon-selected",{detail:{iconName:this.selectedIcon},bubbles:!0,composed:!0}))})}performSearch(){this.filteredIcons=Ht.searchIcons(this.searchQuery,50),this.updateGrid()}getSelectedIcon(){return this.selectedIcon}setSelectedIcon(t){this.selectedIcon=t,this.updateSelected(),this.updateGrid()}renderBase(){this.shadowRoot.innerHTML=`
            <style>${Vo}</style>
            ${Zo()}
        `}updateGrid(){let t=this.shadowRoot.getElementById("grid-container");if(t){if(!this.searchQuery.trim()&&!this.isLoading){t.style.display="none",t.innerHTML="";return}t.style.display="grid",t.innerHTML=Xo(this.filteredIcons,this.selectedIcon,this.isLoading)}}updateSelected(){let t=this.shadowRoot.getElementById("selected-container");if(t)t.innerHTML=Uo(this.selectedIcon)}}if(!customElements.get("icon-picker"))customElements.define("icon-picker",Po);var Wo=({isOpen:t,isEditMode:o})=>`
    <div class="modal-overlay ${t?"modal-overlay--active":""}" id="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">${o?a.t("bookmark.edit"):a.t("bookmark.add")}</h2>
                <button class="modal-close" id="modal-close">
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
            <form class="modal-form" id="bookmark-form">
                <div class="form-group">
                    <label for="bookmark-label">${a.t("bookmark.label")}</label>
                    <input type="text" id="bookmark-label" name="label" placeholder="${a.t("bookmark.placeholder_label")}" required />
                </div>
                <div class="form-group">
                    <label for="bookmark-url">${a.t("bookmark.url")}</label>
                    <input type="url" id="bookmark-url" name="url" placeholder="${a.t("bookmark.placeholder_url")}" required />
                </div>
                <div class="form-group">
                    <label>${a.t("bookmark.icon")}</label>
                    <div id="icon-picker-container"></div>
                </div>
                <div class="form-group checkbox-group" style="flex-direction: row; align-items: center; gap: 8px;">
                    <input type="checkbox" id="bookmark-status" name="statusCheck" />
                    <label for="bookmark-status" style="margin: 0; cursor: pointer;">${a.t("bookmark.monitor_status")}</label>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-submit">${a.t("general.save")}</button>
                </div>
            </form>
        </div>
    </div>
`;var So=`:host {
    display: block;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
}

.modal-overlay--active {
    opacity: 1;
    pointer-events: all;
}

.modal-content {
    background: var(--panel);
    border: 1px solid var(--border-bright);
    border-radius: var(--radius);
    width: 90%;
    max-width: 500px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transform: scale(0.9);
    transition: transform 0.2s ease;
}

.modal-overlay--active .modal-content {
    transform: scale(1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
    margin: 0;
}

.modal-close {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-dim);
    padding: 8px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
}

.modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: rotate(90deg);
    color: #ff4757;
    border-color: rgba(255, 71, 87, 0.3);
}

.modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.form-group label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.form-group input,
.form-group textarea {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
    color: var(--text-main);
    font-family: var(--font-sans);
    font-size: 14px;
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--accent);
}

.form-group textarea {
    resize: vertical;
    font-family: var(--font-mono);
    font-size: 12px;
}

.form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
}

.btn-cancel,
.btn-submit {
    padding: 10px 20px;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn-cancel {
    background: transparent;
    color: var(--text-dim);
    border: 1px solid var(--border);
}

.btn-cancel:hover {
    background: var(--surface);
    color: var(--text-main);
}

.btn-submit {
    background: var(--accent);
    color: white;
}

.btn-submit:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}`;class Io extends HTMLElement{isOpen=!1;iconPicker=null;selectedIconName="";clickHandler=null;submitHandler=null;escapeHandler=null;_unsubscribeI18n;isEditMode=!1;currentItemId=null;constructor(){super();this.attachShadow({mode:"open"}),this.setupHandlers()}setupHandlers(){this.clickHandler=(t)=>{let o=t.target;if(o.id==="modal-overlay"){this.close();return}if(o.closest("#modal-close")){t.preventDefault(),t.stopPropagation(),this.close();return}},this.submitHandler=async(t)=>{t.preventDefault(),t.stopPropagation();let o=t.target,r=new FormData(o),e=r.get("label"),i=r.get("url"),n=r.get("statusCheck")==="on",s=this.iconPicker?this.iconPicker.getSelectedIcon():"",l=s?`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${s}.png`:"";try{let c=JSON.stringify({label:e,url:i,icon:l,iconName:s,statusCheck:n});if(this.isEditMode&&this.currentItemId){if(await x.updateItem({id:this.currentItemId,content:c}),window.notifier)window.notifier.show(a.t("notifier.bookmark_updated"))}else{let p=x.getState(),d=Array.isArray(p.items)?p.items:[];Promise.resolve().then(() => (O(),X)).then(async({collisionService:g})=>{let h=g.findFirstAvailableSlot(1,1,d);if(await x.addItem({type:"bookmark",x:h.x,y:h.y,w:1,h:1,content:c}),window.notifier)window.notifier.show(a.t("notifier.bookmark_added"))})}this.close()}catch(c){if(console.error("[Modal] Error:",c),window.notifier)window.notifier.show(a.t("notifier.bookmark_error"),"error")}},this.escapeHandler=(t)=>{if(t.key==="Escape"&&this.isOpen)this.close()}}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeI18n=a.subscribe(()=>{if(this.isOpen)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n();let t=this.shadowRoot;if(this.clickHandler)t.removeEventListener("click",this.clickHandler);if(this.submitHandler)t.removeEventListener("submit",this.submitHandler);if(this.escapeHandler)document.removeEventListener("keydown",this.escapeHandler)}setupListeners(){let t=this.shadowRoot;t.addEventListener("click",this.clickHandler),t.addEventListener("submit",this.submitHandler),document.addEventListener("keydown",this.escapeHandler)}open(){this.isOpen=!0,this.isEditMode=!1,this.currentItemId=null,this.render(),this.initializeIconPicker(),setTimeout(()=>{let t=this.shadowRoot.getElementById("bookmark-label");if(t)t.focus()},100)}openForEdit(t){this.isOpen=!0,this.isEditMode=!0,this.currentItemId=t.id;let o=t.content;if(typeof o==="string")try{o=JSON.parse(o)}catch(r){console.error("Failed to parse item content",r)}this.selectedIconName=o.iconName||"",this.render(),this.initializeIconPicker(),setTimeout(()=>{let r=this.shadowRoot.getElementById("bookmark-form");if(r){let e=r.elements.namedItem("label"),i=r.elements.namedItem("url"),n=r.elements.namedItem("statusCheck");if(e)e.value=o.label||"";if(i)i.value=o.url||"";if(n)n.checked=!!o.statusCheck}if(this.iconPicker)this.iconPicker.setSelectedIcon(this.selectedIconName)},100)}close(){this.isOpen=!1,this.selectedIconName="",this.resetForm(),this.render()}resetForm(){setTimeout(()=>{let t=this.shadowRoot.getElementById("bookmark-form");if(t)t.reset();if(this.iconPicker)this.iconPicker.setSelectedIcon("")},100)}initializeIconPicker(){requestAnimationFrame(()=>{let t=this.shadowRoot.getElementById("icon-picker-container");if(!t){console.error("[Modal] Icon picker container not found");return}if(!this.iconPicker)this.iconPicker=document.createElement("icon-picker"),this.iconPicker.addEventListener("icon-selected",(o)=>{this.selectedIconName=o.detail.iconName});t.innerHTML="",t.appendChild(this.iconPicker)})}render(){this.shadowRoot.innerHTML=`
            <style>${So}</style>
            ${Wo({isOpen:this.isOpen,isEditMode:this.isEditMode})}
        `}}if(!customElements.get("add-bookmark-modal"))customElements.define("add-bookmark-modal",Io);var Rt=[{id:"clock",name:"Clock",icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',description:"Digital clock with date",defaultW:2,defaultH:1,componentTag:"widget-clock"},{id:"notepad",name:"Notepad",icon:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',description:"Simple sticky note",defaultW:2,defaultH:2,componentTag:"widget-notepad"},{id:"telemetry",name:"System Status",icon:'<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',description:"CPU, RAM and Temp",defaultW:2,defaultH:1,componentTag:"widget-telemetry"}];class tr extends HTMLElement{dialog=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(){if(this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close()}selectWidget(t){this.dispatchEvent(new CustomEvent("widget-selected",{detail:t,bubbles:!0,composed:!0})),this.close()}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: contents;
                }
                dialog {
                    background: rgba(23, 23, 27, 0.85);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    padding: 32px;
                    width: 720px;
                    max-width: 95vw;
                    backdrop-filter: blur(32px);
                    -webkit-backdrop-filter: blur(32px);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
                    animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                dialog::backdrop {
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 28px;
                }
                .title-group h3 {
                    margin: 0;
                    font-size: 26px;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .title-group p {
                    margin: 4px 0 0 0;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 14px;
                }
                .close-btn {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 8px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .close-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: rotate(90deg);
                    color: #ff4757;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                .card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    padding: 24px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }
                .card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: radial-gradient(circle at center, var(--accent, #3b82f6) 0%, transparent 70%);
                    opacity: 0;
                    transition: opacity 0.3s;
                    z-index: 0;
                }
                .card:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-4px);
                    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
                }
                .card:hover::before {
                    opacity: 0.05;
                }
                .icon-container {
                    width: 56px;
                    height: 56px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    transition: transform 0.3s;
                    z-index: 1;
                }
                .card:hover .icon-container {
                    transform: scale(1.1);
                    background: rgba(255, 255, 255, 0.1);
                }
                .icon-container svg {
                    width: 32px;
                    height: 32px;
                    fill: var(--accent, #3b82f6);
                }
                .name {
                    font-weight: 700;
                    font-size: 18px;
                    margin-bottom: 8px;
                    z-index: 1;
                }
                .desc {
                    font-size: 13px;
                    color: rgba(255, 255, 255, 0.5);
                    line-height: 1.5;
                    z-index: 1;
                }
            </style>
            <dialog id="modal">
                <div class="header">
                    <div class="title-group">
                        <h3>${a.t("widget.add_title")||"Add Widget"}</h3>
                        <p>${a.t("widget.add_subtitle")||"Enhance your dashboard with dynamic components"}</p>
                    </div>
                    <button class="close-btn" onclick="this.getRootNode().host.close()">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div class="grid">
                    ${Rt.map((t)=>`
                        <div class="card" data-id="${t.id}">
                            <div class="icon-container">${t.icon}</div>
                            <div class="name">${a.t(`widget.${t.id}.name`)||t.name}</div>
                            <div class="desc">${a.t(`widget.${t.id}.description`)||t.description}</div>
                        </div>
                    `).join("")}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog"),this.shadowRoot.querySelectorAll(".card").forEach((t)=>{t.addEventListener("click",()=>{let o=t.getAttribute("data-id"),r=Rt.find((e)=>e.id===o);if(r)this.selectWidget(r)})})}}customElements.define("add-widget-modal",tr);class or extends HTMLElement{dialog=null;currentItem=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(t){if(this.currentItem=t,this.render(),this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close();this.currentItem=null}async save(){if(!this.currentItem)return;let t=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,o=t.widgetId,r={...t};if(o==="clock"){let e=this.shadowRoot?.getElementById("clock-tz"),i=this.shadowRoot?.getElementById("clock-12h"),n=this.shadowRoot?.getElementById("clock-date");r.timezone=e?.value||"local",r.hour12=i?.checked||!1,r.showDate=n?.checked||!1,r.timezone=e?.value||"local",r.hour12=i?.checked||!1,r.showDate=n?.checked||!1}else if(o==="telemetry"){let e=this.shadowRoot?.getElementById("telemetry-interval");r.interval=e?parseInt(e.value):1000}await x.updateItem({id:this.currentItem.id,content:JSON.stringify(r)}),this.close()}render(){if(!this.shadowRoot)return;let t={},o="";if(this.currentItem)t=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,o=t.widgetId;let r=()=>{if(!this.currentItem)return"";if(o==="clock"){let i=t.timezone||"local",n=t.hour12||!1,s=t.showDate!==!1;return`
                    <div class="field-group">
                        <label>${a.t("widget.clock.timezone")}</label>
                        <div class="input-row">
                            <input type="text" id="clock-tz" value="${i}" placeholder="local"/>
                            <button id="clock-auto-tz" class="btn-ghost">${a.t("widget.clock.auto_detect")}</button>
                        </div>
                        <small>${a.t("widget.clock.timezone_desc")}</small>
                    </div>
                    
                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${n?"checked":""} />
                        <label for="clock-12h">${a.t("widget.clock.use_12h")}</label>
                    </div>
        
                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${s?"checked":""} />
                        <label for="clock-date">${a.t("widget.clock.show_date")}</label>
                    </div>
                `}else if(o==="telemetry"){let i=t.interval||1000;return`
                    <div class="field-group row-aligned">
                        <label>${a.t("widget.telemetry.update_interval")}</label>
                        <select id="telemetry-interval" class="select-input">
                            <option value="1000" ${i===1000?"selected":""}>1s</option>
                            <option value="2000" ${i===2000?"selected":""}>2s</option>
                            <option value="5000" ${i===5000?"selected":""}>5s</option>
                            <option value="10000" ${i===1e4?"selected":""}>10s</option>
                        </select>
                    </div>
                `}return"<p>No configuration available for this widget.</p>"};this.shadowRoot.innerHTML=`
            <style>
                :host { display: contents; }
                dialog {
                    background: var(--surface-solid, #1e1e23);
                    color: var(--text-main, #fff);
                    border: 1px solid var(--border, #333);
                    border-radius: 12px;
                    padding: 24px;
                    width: 500px;
                    max-width: 90vw;
                    backdrop-filter: blur(20px);
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                dialog::backdrop {
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border);
                    margin-bottom: 20px;
                    padding-bottom: 12px;
                }
                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                }
                .modal-close {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-dim);
                    padding: 8px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                }
                .modal-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: rotate(90deg);
                    color: #ff4757;
                    border-color: rgba(255, 71, 87, 0.3);
                }
                
                .field-group { margin-bottom: 16px; }
                .field-group.row-aligned {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                }
                .field-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; }
                .field-group.row-aligned label { margin-bottom: 0; }
                .field-group small { display: block; margin-top: 4px; color: var(--text-dim); font-size: 0.8rem; }
                
                .input-row { display: flex; gap: 8px; }
                input[type="text"], .select-input {
                    flex: 1;
                    background: rgba(0,0,0,0.2);
                    border: 1px solid var(--border);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                }
                .select-input {
                    cursor: pointer;
                    appearance: none;
                    background-image: url('data:image/svg+xml;utf8,<svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
                    background-repeat: no-repeat;
                    background-position: right 8px center;
                    padding-right: 32px;
                    width: 120px;
                    background-color: rgba(255, 255, 255, 0.05);
                }
                .select-input option {
                    background: var(--surface-solid, #1e1e23);
                    color: white;
                    padding: 8px;
                }
                .select-input:focus, input[type="text"]:focus {
                    border-color: var(--accent);
                    outline: none;
                    background-color: rgba(255, 255, 255, 0.1);
                }
                
                .check-row { display: flex; align-items: center; gap: 10px; cursor: pointer; }
                .check-row input { width: 18px; height: 18px; cursor: pointer; }
                .check-row label { margin: 0; cursor: pointer; }

                .btn-ghost {
                    background: transparent;
                    border: 1px solid var(--accent);
                    color: var(--accent);
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                }
                .btn-ghost:hover { background: var(--accent); color: white; }

                .actions {
                    display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;
                }
                .btn-save {
                    background: var(--accent);
                    color: white;
                    border: none;
                    padding: 8px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 600;
                }

            </style>
            <dialog id="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${a.t("widget.config.title")}</h3>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="content">
                    ${r()}
                </div>
                <div class="actions">
                    ${["clock","telemetry"].includes(o)?`<button class="btn-save" id="save-btn">${a.t("general.save")}</button>`:""}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog"),this.shadowRoot.getElementById("close-btn")?.addEventListener("click",()=>this.close()),this.shadowRoot.getElementById("save-btn")?.addEventListener("click",()=>this.save());let e=this.shadowRoot.getElementById("clock-auto-tz");if(e)e.addEventListener("click",()=>{let i=Intl.DateTimeFormat().resolvedOptions().timeZone,n=this.shadowRoot?.getElementById("clock-tz");if(n)n.value=i})}}customElements.define("widget-config-modal",or);var rr=({isOpen:t,title:o,message:r})=>`
    <div class="modal-overlay ${t?"modal-overlay--active":""}" id="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${o}</h3>
                <button class="modal-close" id="modal-close">
                    <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            </div>
            <p class="modal-message">${r}</p>
            <div class="modal-actions">
                <button class="btn-confirm" id="btn-confirm">${a.t("general.confirm")}</button>
            </div>
        </div>
    </div>
`;var er=`:host {
    display: block;
    z-index: 9999;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.modal-overlay--active {
    opacity: 1;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    pointer-events: auto;
}

.modal-content {
    background: rgba(30, 30, 35, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 32px;
    width: 90%;
    max-width: 420px;
    box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.5),
        inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    transform: scale(0.9) translateY(20px);
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-overlay--active .modal-content {
    transform: scale(1) translateY(0);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.modal-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.02em;
}

.modal-close {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-dim);
    padding: 8px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
}

.modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: rotate(90deg);
    color: #ff4757;
    border-color: rgba(255, 71, 87, 0.3);
}

.modal-message {
    margin: 0 0 32px 0;
    font-size: 15px;
    color: var(--text-dim);
    line-height: 1.6;
    font-weight: 500;
    text-align: left;
}

.modal-actions {
    display: flex;
    gap: 12px;
}

.modal-actions button {
    flex: 1;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.modal-actions .btn-confirm {
    flex: 1;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: linear-gradient(135deg, #ff4757, #ff6b81);
    color: white;
    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.modal-actions .btn-confirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(231, 76, 60, 0.4);
    filter: brightness(1.1);
}

.btn-confirm {
    background: linear-gradient(135deg, #ff4757, #ff6b81);
    color: white;
    box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.btn-confirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(231, 76, 60, 0.4);
    filter: brightness(1.1);
}

.btn-confirm:active {
    transform: translateY(0);
}`;class ir extends HTMLElement{isOpen=!1;titleText="Confirm Action";messageText="Are you sure?";resolvePromise=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeI18n=a.subscribe(()=>{if(this.isOpen)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n()}setupListeners(){}setupDynamicListeners(){let t=this.shadowRoot.getElementById("modal-close"),o=this.shadowRoot.getElementById("btn-confirm"),r=this.shadowRoot.getElementById("modal-overlay"),e=(i)=>{if(this.resolvePromise)this.resolvePromise(i),this.resolvePromise=null;this.isOpen=!1,this.render()};if(t)t.onclick=()=>e(!1);if(r)r.onclick=(i)=>{if(i.target===r)e(!1)};if(o)o.onclick=()=>e(!0)}async confirm(t,o){return this.titleText=t,this.messageText=o,this.isOpen=!0,this.render(),new Promise((r)=>{this.resolvePromise=r})}render(){this.shadowRoot.innerHTML=`
            <style>${er}</style>
            ${rr({isOpen:this.isOpen,title:this.titleText,message:this.messageText})}
        `,this.setupDynamicListeners()}}if(!customElements.get("confirmation-modal"))customElements.define("confirmation-modal",ir);async function ar(t){try{await a.ensureInitialized(),await t()}catch(o){console.error("[Bootstrap] Critical failure:",o),document.body.innerHTML=`
            <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                background: #111; 
                color: #fff; 
                font-family: sans-serif;
                text-align: center;
            ">
                <h1 style="color: #fa5252;">System Error</h1>
                <p>Failed to initialize application resources.</p>
                <p style="opacity: 0.7; font-size: 0.9em;">Check console for details.</p>
                <button onclick="window.location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #333;
                    color: white;
                    border: 1px solid #555;
                    cursor: pointer;
                    border-radius: 4px;
                ">Reload</button>
            </div>
        `}}xt();var L=document.getElementById("main-topbar"),nr=document.getElementById("right-drawer"),ht=document.getElementById("dashboard-root"),U,bt,vt;ar(async()=>{if(Q.init(),await $.fetchUser(),L){let o=$.getUser();if(L.setState({user:o}),o&&o.project_name)L.setAttribute("title",o.project_name);$.subscribe((r)=>{if(r){if(L.setState({user:r}),r.project_name)L.setAttribute("title",r.project_name)}})}await x.fetchItems(),Mr(),D.start(),U=document.createElement("add-bookmark-modal"),document.body.appendChild(U),bt=document.createElement("add-widget-modal"),document.body.appendChild(bt),vt=document.createElement("confirmation-modal"),document.body.appendChild(vt);let t=document.createElement("widget-config-modal");document.body.appendChild(t)});at.on(it.SHOW_CONFIRMATION,async(t)=>{let{title:o,message:r,onConfirm:e}=t.detail;if(vt){if(await vt.confirm(o,r)&&e)e()}});at.on(it.SHOW_WIDGET_CONFIG,(t)=>{let{item:o,type:r}=t.detail;if(r==="bookmark"){if(U)U.openForEdit(o)}else{let e=document.querySelector("widget-config-modal");if(e)e.open(o)}});at.on(it.NOTIFY,(t)=>{let o=document.querySelector("app-notifier");if(o)o.show(t.detail.message,t.detail.type)});if(L)L.addEventListener("drawer-toggle",(t)=>{if(t.detail.action==="open")nr.open(),L.setState({drawerOpen:!0});else nr.close(),L.setState({drawerOpen:!1})}),L.addEventListener("edit-mode-change",(t)=>{let o=t.detail.active;if(ht.classList.toggle("edit-mode",o),!o)window.location.reload()}),L.addEventListener("search-input",(t)=>{let o=t.detail.query;x.setSearchQuery(o)}),L.addEventListener("add-item",(t)=>{let o=t.detail.action;if(o==="add-bookmark"){if(U)U.open()}else if(o==="add-widget"){if(bt)bt.open()}else if(o==="add-section"){let e=x.getState().items||[];Promise.resolve().then(() => (O(),X)).then(({collisionService:i})=>{let n=i.findFirstAvailableSlot(1,1,e),s={type:"section",x:n.x,y:n.y,w:1,h:1,content:JSON.stringify({name:""})};x.addItem(s)})}});window.addEventListener("widget-selected",(t)=>{let r=t.detail,i=x.getState().items||[];Promise.resolve().then(() => (O(),X)).then(({collisionService:n})=>{let s=n.findFirstAvailableSlot(r.defaultW,r.defaultH,i),l={type:"widget",x:s.x,y:s.y,w:r.defaultW,h:r.defaultH,content:JSON.stringify({widgetId:r.id,text:r.id==="notepad"?"":void 0})};x.addItem(l)})});window.addEventListener("drawer-close",()=>{if(L)L.setState({drawerOpen:!1})});window.addEventListener("click",(t)=>{let o=t.target,r=document.getElementById("add-menu"),e=document.getElementById("add-toggle");if(r&&r.classList.contains("active")&&!r.contains(o)&&e&&!e.contains(o))r.classList.remove("active")});function Mr(){if(!ht)return;ht.innerHTML="";let t=document.createElement("bookmark-grid");ht.appendChild(t)}
