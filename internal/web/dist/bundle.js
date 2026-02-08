var Ra=Object.defineProperty;var po=(o,r)=>{for(var a in r)Ra(o,a,{get:r[a],enumerable:!0,configurable:!0,set:(t)=>r[a]=()=>t})};var j=function(o,r,a,t){var i=arguments.length,e=i<3?r:t===null?t=Object.getOwnPropertyDescriptor(r,a):t,s;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")e=Reflect.decorate(o,r,a,t);else for(var d=o.length-1;d>=0;d--)if(s=o[d])e=(i<3?s(e):i>3?s(r,a,e):s(r,a))||e;return i>3&&e&&Object.defineProperty(r,a,e),e};var F=(o,r)=>{if(typeof Reflect==="object"&&typeof Reflect.metadata==="function")return Reflect.metadata(o,r)},J=(o,r)=>()=>(o&&(r=o(o=0)),r);class or{baseUrl;constructor(){this.baseUrl=window.LASTBOARD_CONFIG?.API_BASE_URL||""}getCsrfToken(){let o=document.cookie.split("; ").find((r)=>r.startsWith("csrf_token="));return o?decodeURIComponent(o.split("=")[1]):""}async request(o,r){let a=`${this.baseUrl}${o}`,t=(r.method||"GET").toUpperCase(),i={"Content-Type":"application/json","Cache-Control":"no-cache, no-store, must-revalidate",Pragma:"no-cache",Expires:"0",...r.headers};if(t==="POST"||t==="PUT"||t==="PATCH"||t==="DELETE"){let e=this.getCsrfToken();if(e)i["X-CSRF-Token"]=e}try{let e=await fetch(a,{...r,headers:i,cache:"no-store"});if(!e.ok){let d=await e.json().catch(()=>({}));throw Error(d.error||`HTTP ${e.status}: ${e.statusText}`)}let s=await e.text();return s?JSON.parse(s):{}}catch(e){throw console.error(`[ApiService] Request failed: ${a}`,e),e}}async get(o){return this.request(o,{method:"GET"})}async post(o,r){return this.request(o,{method:"POST",body:JSON.stringify(r)})}async patch(o,r){return this.request(o,{method:"PATCH",body:JSON.stringify(r)})}async put(o,r){return this.request(o,{method:"PUT",body:JSON.stringify(r)})}async delete(o){return this.request(o,{method:"DELETE"})}}var L;var Ro=J(()=>{L=new or});var M;var Ko=J(()=>{Ro();M={async getCurrentUser(){return L.get("/api/me")},async updateProfile(o){return L.post("/api/user/update-profile",o)},async updatePreferences(o){return L.post("/api/user/preferences",o)},async changePassword(o){return L.post("/api/user/change-password",o)},async getUsers(){return L.get("/api/users")},async createUser(o){return L.post("/api/users",o)},async adminUpdateUser(o){return L.put("/api/users",o)},async deleteUser(o){return L.delete(`/api/users?id=${o}`)}}});var O;var rr=J(()=>{O=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}]});class S{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("lastboard_lang"),r=navigator.language.split("-")[0],a="en";if(o&&O.find((t)=>t.code===o))a=o;else if(O.find((t)=>t.code===r))a=r;if(a!=="en")await this.loadLocale(a);this.currentLanguage=a,this.notifyListeners()}static getInstance(){if(!S.instance)S.instance=new S;return S.instance}getLocale(){return{...O.find((r)=>r.code===this.currentLanguage)||O[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let o=(a)=>/^[a-zA-Z]/.test(a);return[...O].sort((a,t)=>{let i=o(a.name),e=o(t.name);if(i&&!e)return-1;if(!i&&e)return 1;return a.name.localeCompare(t.name,void 0,{sensitivity:"base"})})}async loadLocale(o){if(this.cache.has(o))return;try{let r=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!r.ok)throw Error(`Failed to load locale ${o}`);let a=await r.json();this.cache.set(o,a)}catch(r){console.error(r)}}async setLanguage(o){if(O.find((r)=>r.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("lastboard_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,r){let a=this.cache.get(this.currentLanguage),t=this.cache.get("en"),i=a?.[o];if(!i&&t)i=t[o];if(!i)return o;if(r)Object.keys(r).forEach((e)=>{i=i.replace(`{${e}}`,r[e])});return i}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((r)=>r(o))}async ensureInitialized(){return this.initialized}}var n;var _=J(()=>{rr();n=S.getInstance()});var Qo={};po(Qo,{userStore:()=>$});class ar{user=null;listeners=[];constructor(){this.loadFromStorage()}loadFromStorage(){let o=localStorage.getItem("lastboard_user_cache");if(o)try{this.user=JSON.parse(o),this.applyAesthetics(),this.notify()}catch(r){console.error("Failed to parse user cache",r)}}saveToStorage(){if(this.user)localStorage.setItem("lastboard_user_cache",JSON.stringify(this.user))}subscribe(o){if(this.listeners.push(o),this.user)o(this.user);return()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notify(){this.listeners.forEach((o)=>o(this.user)),this.saveToStorage()}setUser(o){if(!o)return;this.user={...o,preferences:{accent_color:o.accent_color||"blue",language:o.language||"en",theme:o.theme,grid_columns:o.grid_columns||12,project_name:o.project_name||"Lastboard",beta_updates:o.beta_updates},project_name:o.project_name||"Lastboard"},this.applyAesthetics(),this.notify()}applyAesthetics(){if(!this.user||!this.user.preferences)return;let o=this.user.preferences,r=document.documentElement;if(o.grid_columns)r.style.setProperty("--user-preferred-columns",`${o.grid_columns}`);else r.style.setProperty("--user-preferred-columns","12");if(o.accent_color){let a=this.getAccentHex(o.accent_color);r.style.setProperty("--accent",a),localStorage.setItem("lastboard_accent",a)}if(o.theme==="light")r.classList.add("light-theme");else r.classList.remove("light-theme")}getAccentHex(o){if(o.startsWith("#"))return o;return{blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"}[o]||"#0078D4"}async updatePreferences(o){if(!this.user||!this.user.preferences)return;let r={...this.user.preferences};if(this.user.preferences={...this.user.preferences,...o},o.accent_color)this.user.accent_color=o.accent_color;if(o.language)this.user.language=o.language;if(o.project_name)this.user.project_name=o.project_name;if(o.theme)this.user.preferences.theme=o.theme;if(o.grid_columns)this.user.preferences.grid_columns=o.grid_columns;if(o.beta_updates!==void 0)this.user.preferences.beta_updates=o.beta_updates;this.applyAesthetics(),this.notify();try{let a={accent_color:this.user.accent_color,language:this.user.language,theme:this.user.preferences.theme,grid_columns:this.user.preferences.grid_columns,project_name:this.user.project_name,beta_updates:this.user.preferences.beta_updates};if(await M.updatePreferences(a),window.notifier)window.notifier.show(n.t("general.success")||"Preferences saved")}catch(a){if(console.error("[UserStore] Failed to sync preferences, rolling back",a),this.user.preferences=r,this.applyAesthetics(),this.notify(),window.notifier)window.notifier.show(n.t("notifier.save_error"),"error");throw a}}async updateProfile(o){if(!this.user)return;try{if(await M.updateProfile(o),this.user={...this.user,...o},this.notify(),window.notifier)window.notifier.show(n.t("notifier.profile_updated"))}catch(r){if(console.error("[UserStore] Update profile failed",r),window.notifier)window.notifier.show(n.t("notifier.profile_error"),"error")}}async changePassword(o){try{await M.changePassword(o)}catch(r){throw console.error("[UserStore] Change password failed",r),r}}getUser(){return this.user}async fetchUser(){try{let o=await M.getCurrentUser();this.setUser(o)}catch(o){if(console.error("[UserStore] Error fetching user",o),!this.user){if(window.notifier)window.notifier.show(n.t("auth.session_expired"),"error")}}}}var $;var oo=J(()=>{Ko();_();$=new ar});var Z;var qo=J(()=>{Ro();Z={async getItems(){return L.get("/api/dashboard")},async updateItem(o){let r={...o};if(o.parent_id===void 0&&"parent_id"in o)r.clear_parent=!0;return L.patch(`/api/dashboard/item/${o.id}`,r)},async createItem(o){return L.post("/api/dashboard/item",o)},async deleteItem(o){return L.delete(`/api/dashboard/item/${o}`)},async checkHealth(o){return L.get(`/api/dashboard/health?url=${encodeURIComponent(o)}`)}}});var tr={};po(tr,{socketService:()=>Ka});class Ao{socket=null;listeners=[];reconnectTimeout;reconnectDelay=1000;static MAX_DELAY=30000;constructor(){this.connect()}connect(){let o=window.location.protocol==="https:"?"wss:":"ws:",r=window.location.host,a=`${o}//${r}/ws`;this.socket=new WebSocket(a),this.socket.onopen=()=>{this.reconnectDelay=1000},this.socket.onmessage=(t)=>{try{let i=JSON.parse(t.data);this.notify(i)}catch(i){console.error("[SocketService] Failed to parse message",i)}},this.socket.onclose=()=>{console.warn("[SocketService] WebSocket closed. Reconnecting..."),this.scheduleReconnect()},this.socket.onerror=(t)=>{console.error("[SocketService] WebSocket error",t),this.socket?.close()}}scheduleReconnect(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);let o=Math.random()*this.reconnectDelay*0.5;this.reconnectTimeout=setTimeout(()=>this.connect(),this.reconnectDelay+o),this.reconnectDelay=Math.min(this.reconnectDelay*2,Ao.MAX_DELAY)}destroy(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);if(this.socket)this.socket.onclose=null,this.socket.close(),this.socket=null}subscribe(o){return this.listeners.push(o),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notify(o){this.listeners.forEach((r)=>r(o))}}var Ka;var ir=J(()=>{Ka=new Ao});var ro={};po(ro,{collisionService:()=>E});var E;var N=J(()=>{E={isOverlap(o,r){return o.x<r.x+r.w&&o.x+o.w>r.x&&o.y<r.y+r.h&&o.y+o.h>r.y},calculateDropValidity(o,r,a=12){let t=Number(o.x),i=Number(o.y),e=Number(o.w),s=Number(o.h);if(t<1||t+e-1>a||i<1)return{valid:!1,x:t,y:i};let l=r.find((p)=>p.id===o.id)?.type==="section",c={x:t,y:i,w:e,h:s};for(let p of r){if(p.id===o.id)continue;let g=Number(p.x),u=Number(p.y),h=Number(p.w||1),m=Number(p.h||1),G={x:g,y:u,w:h,h:m};if(p.parent_id){let k=r.find((f)=>f.id===p.parent_id);if(k)G.x=Number(k.x)+g-1,G.y=Number(k.y)+u-1;else continue}if(this.isOverlap(c,G)){if(l&&p.parent_id===o.id){let k=Number(p.x),f=Number(p.y),A=Number(p.w||1),T=Number(p.h||1);if(k+A-1>e)return{valid:!1,x:t,y:i};if(f+T-1>s)return{valid:!1,x:t,y:i};continue}if(!l&&p.type==="section"){let k=t-Number(p.x)+1,f=i-Number(p.y)+1;if(k<1||k+e-1>Number(p.w||1)||f<1||f+s-1>Number(p.h||1))return{valid:!1,x:t,y:i};let A=r.filter((v)=>v.parent_id===p.id),T=!1;for(let v of A){let so={x:Number(v.x),y:Number(v.y),w:Number(v.w||1),h:Number(v.h||1)},C={x:k,y:f,w:e,h:s};if(this.isOverlap(C,so)){T=!0;break}}if(!T)return{valid:!0,x:t,y:i,targetGroup:p}}return{valid:!1,x:t,y:i}}}return{valid:!0,x:t,y:i}},snapToGrid(o,r,a,t){let i=a+t,e=Math.max(1,Math.floor(o/i)+1),s=a+t,d=Math.max(1,Math.floor(r/s)+1);return{x:e,y:d}},findFirstAvailableSlot(o,r,a,t=12){return this.findCompactPosition(o,r,a,t)},findAvailableSlot(o,r,a,t){let i=1;while(!0){for(let e=1;e<=t-o+1;e++){let s={x:e,y:i,w:o,h:r},d=!1;for(let l of a)if(this.isOverlap(s,l)){d=!0;break}if(!d)return{x:e,y:i}}if(i++,i>500)return console.warn("[CollisionService] Grid exhausted, no available slot found. Grid may be full."),{x:1,y:500}}},findCompactPosition(o,r,a,t,i){let e=1,s=1;while(!0){for(let d=1;d<=t-o+1;d++){let l={x:d,y:e,w:o,h:r},c=!1;for(let p of a){if(i&&p.id===i)continue;let g={x:p.x,y:p.y,w:p.w||1,h:p.h||1};if(this.isOverlap(l,g)){c=!0;break}}if(!c)return{x:d,y:e}}if(e++,e>500)return console.warn("[CollisionService] Grid exhausted, no compact position found. Grid may be full."),{x:1,y:500}}}}});var sr={};po(sr,{dashboardStore:()=>x});class er{state={isEditing:!1,items:[],searchQuery:"",isOffline:!1,updateAvailable:!1,stats:null,availableWidth:1200,gridColumns:12};listeners=[];userId=0;getStorageKey(){return this.userId?`lastboard-items-${this.userId}`:"lastboard-items"}setUserId(o){this.userId=o}constructor(){this.initSocket(),this.checkSystemUpdate()}initSocket(){Promise.resolve().then(() => (ir(),tr)).then(({socketService:o})=>{o.subscribe((r)=>{this.state.stats={cpu_usage:r.cpu_usage,ram_usage:r.ram_usage,temperature:r.temperature},this.notify()})})}async checkSystemUpdate(){try{let o=await fetch("/api/system/update/check");if(o.ok){if((await o.json()).available)this.state.updateAvailable=!0,this.notify()}}catch(o){}}saveToLocalStorage(){try{let o=JSON.stringify(this.state.items);localStorage.setItem(this.getStorageKey(),o)}catch(o){console.error("[DashboardStore] Failed to save to localStorage",o)}}loadFromLocalStorage(){try{let o=localStorage.getItem(this.getStorageKey());if(o){let r=JSON.parse(o);if(Array.isArray(r)&&r.length>0)this.state.items=r}}catch(o){console.error("[DashboardStore] Failed to load from localStorage",o)}}subscribe(o){return this.listeners.push(o),this.ensureItemsIsArray(),o({...this.state,items:this.deepCopyItems(this.state.items)}),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}ensureItemsIsArray(){if(!Array.isArray(this.state.items))console.error("[DashboardStore] CRITICAL: items is not an array, resetting to empty array",typeof this.state.items),this.state.items=[]}deepCopyItems(o){return o.map((r)=>{let a=r.content;if(typeof r.content==="string")try{let t=JSON.parse(r.content);if(typeof t==="object"&&t!==null)a=JSON.stringify(t)}catch{}return{...r,content:a}})}notify(){this.ensureItemsIsArray();let o={...this.state,items:this.deepCopyItems(this.state.items)};this.listeners.forEach((r)=>r(o))}setEditMode(o){this.state.isEditing=o,this.notify()}toggleEditMode(){this.setEditMode(!this.state.isEditing)}setSearchQuery(o){this.state.searchQuery=o.toLowerCase().trim(),this.notify()}setGridMetrics(o,r){if(o===this.state.availableWidth&&r===this.state.gridColumns)return;this.state.availableWidth=o,this.state.gridColumns=r,this.notify()}async fetchItems(){try{try{let o=await Z.getItems();if(Array.isArray(o))this.state.items=o,this.state.isOffline=!1,this.saveToLocalStorage();else throw Error("Backend returned invalid data")}catch(o){this.state.isOffline=!0;let r=localStorage.getItem(this.getStorageKey());if(r){let a=JSON.parse(r);if(Array.isArray(a)&&a.length>0)this.state.items=a;else this.state.items=[...nr],this.saveToLocalStorage()}else this.state.items=[...nr],this.saveToLocalStorage()}this.ensureItemsIsArray(),this.notify()}catch(o){console.error("[DashboardStore] Failed to fetch dashboard items",o),this.state.items=[]}}async updateItem(o){try{this.ensureItemsIsArray();let r=this.state.items.findIndex((t)=>t.id===o.id);if(r===-1){console.warn("[DashboardStore] Item not found for update:",o.id);return}let a={...this.state.items[r]};this.state.items[r]={...this.state.items[r],...o},this.saveToLocalStorage(),this.notify();try{await Z.updateItem(o),this.state.isOffline=!1,this.notify()}catch(t){console.error("[DashboardStore] Failed to sync item update (offline?), keeping local state",t),this.state.isOffline=!0,this.saveToLocalStorage(),this.notify()}}catch(r){console.error("[DashboardStore] Error updating item",r)}}async resizeItem(o,r,a){let t=this.state.items.find((i)=>i.id===o);if(!t)return;if(await this.updateItem({id:o,w:r,h:a}),t.type==="section")await this.reflowChildren(o,r)}async reflowChildren(o,r){let{collisionService:a}=await Promise.resolve().then(() => (N(),ro)),t=this.state.items.filter((e)=>e.parent_id===o).sort((e,s)=>e.y-s.y||e.x-s.x);if(t.length===0)return;let i=[];for(let e of t){let s=a.findAvailableSlot(e.w,e.h,i,r);if(i.push({x:s.x,y:s.y,w:e.w,h:e.h}),e.x!==s.x||e.y!==s.y)await this.updateItem({id:e.id,x:s.x,y:s.y})}}async addItem(o){try{this.ensureItemsIsArray();try{let r={...o};if(r.type==="widget"&&!r.url)r.url="";let{userStore:a}=await Promise.resolve().then(() => (oo(),Qo)),i=a.getUser()?.preferences,e=this.state.gridColumns;if(!e||e<1){let d=i?.widget_min_width||140,l=16,c=document.querySelector("bookmark-grid"),p=this.state.availableWidth||c?.clientWidth||window.innerWidth;e=Math.floor((p+16)/(d+16))}if(e<1)e=1;if(e>24)e=24;if(!r.x||!r.y){let{collisionService:d}=await Promise.resolve().then(() => (N(),ro)),l=d.findFirstAvailableSlot(r.w||1,r.h||1,this.state.items,e);r.x=l.x,r.y=l.y}let s=await Z.createItem(r);return this.state.isOffline=!1,this.state.items.push(s),this.saveToLocalStorage(),this.notify(),s}catch(r){console.error("[DashboardStore] Failed to add item to backend",r);return}}catch(r){console.error("[DashboardStore] Error adding item",r);return}}async deleteItem(o){try{this.ensureItemsIsArray();let r=this.state.items.findIndex((t)=>t.id===o);if(r===-1){console.warn("[DashboardStore] Item not found for deletion:",o);return}let a=this.state.items[r];this.state.items.splice(r,1),this.saveToLocalStorage(),this.notify();try{await Z.deleteItem(o)}catch(t){console.error("[DashboardStore] Failed to delete item, rolling back",t),this.state.items.push(a),this.saveToLocalStorage(),this.notify()}}catch(r){console.error("[DashboardStore] Error deleting item",r)}}getState(){return this.ensureItemsIsArray(),{...this.state,items:[...this.state.items]}}}var nr,x;var B=J(()=>{qo();nr=[{id:1,type:"bookmark",x:1,y:1,w:1,h:1,content:{label:"CodigoSH",url:"https://github.com/CodigoSH/Lastboard",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/git.png",iconName:"git"}}];x=new er});var Do={};po(Do,{eventBus:()=>no,EVENTS:()=>io});var io,pa,no;var Ho=J(()=>{io={SHOW_CONFIRMATION:"lastboard:show-confirmation",SHOW_WIDGET_CONFIG:"lastboard:show-widget-config",NOTIFY:"lastboard:notify"};pa=class pa extends EventTarget{emit(o,r){this.dispatchEvent(new CustomEvent(o,{detail:r}))}on(o,r){this.addEventListener(o,r)}off(o,r){this.removeEventListener(o,r)}};no=new pa});oo();B();B();qo();_();class dr{interval=null;checkFrequency=300000;start(){if(this.interval)return;setTimeout(()=>this.checkAll(),2000),this.interval=window.setInterval(()=>{this.checkAll()},this.checkFrequency)}stop(){if(this.interval)clearInterval(this.interval),this.interval=null}async checkAll(){let r=x.getState().items.filter((s)=>{if(s.type!=="bookmark")return!1;let d=s.content;if(typeof d==="string")try{d=JSON.parse(d)}catch(l){return!1}return d&&d.statusCheck===!0});r.forEach((s)=>this.updateUIStatus(s.id,"pending"));let a=5,t=[...r],i=async()=>{while(t.length>0){let s=t.shift();if(s)await this.checkItem(s)}},e=Array(Math.min(r.length,a)).fill(null).map(()=>i());await Promise.all(e)}async checkItem(o){let r=o.content;if(typeof r==="string")try{r=JSON.parse(r)}catch(t){return}let a=r.url;if(!a||a==="#"||a.startsWith("javascript:"))return;try{if((await Z.checkHealth(a)).status==="up")this.updateUIStatus(o.id,"up");else this.updateUIStatus(o.id,"down")}catch(t){console.warn(`[StatusService] ${a} health check failed:`,t),this.updateUIStatus(o.id,"down")}}updateUIStatus(o,r){let a=document.querySelector("bookmark-grid");if(!a||!a.shadowRoot)return;let t=a.shadowRoot.querySelector(`.bookmark-grid__card[data-id="${o}"]`);if(!t)return;let i=t.querySelector(".status-indicator");if(!i)return;i.classList.remove("status-pending","status-up","status-down"),i.classList.add(`status-${r}`);let e=r==="up"?n.t("status.online"):r==="down"?n.t("status.unreachable"):n.t("status.checking");i.setAttribute("title",e)}}var co=new dr;class R{static STORAGE_KEY="lastboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,r,a){let t="";if(a){let i=new Date;i.setTime(i.getTime()+a*24*60*60*1000),t="; expires="+i.toUTCString()}document.cookie=o+"="+(r||"")+t+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let r=await o.json();if(r.theme==="dark")this.enableDark();else if(r.theme==="light")this.enableLight()}}catch(o){}}}_();var lr=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var pr=`:host {
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
}`;class cr extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${pr}</style>
            ${lr()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",cr);var gr=`:host {
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
    background: transparent;
    color: var(--accent);
    border: 2px solid var(--accent);
}

.btn--primary:hover {
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
    border-color: var(--accent);
}

.btn:active {
    transform: translateY(1px);
}

/* Variant: Danger (same style as Primary for consistency) */
.btn--danger {
    background: transparent;
    color: var(--accent);
    border: 2px solid var(--accent);
}

.btn--danger:hover {
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
    border-color: var(--accent);
}`;class xr extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(o){if(this.getAttribute("type")==="submit"){let r=this.closest("form");if(r)if(r.requestSubmit)r.requestSubmit();else r.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(o){this._loading=o,this.render()}get loading(){return this._loading}render(){let o=this.getAttribute("variant")||"ghost",r=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${gr}</style>
            <button class="btn btn--${o}" ${this._loading?"disabled":""}>
                ${r}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",xr);var br=({src:o,initials:r,alt:a})=>`
    <div class="avatar" title="${a}">
        ${o?`<img src="${o}" alt="${a}" class="avatar__img">`:`<span class="avatar__initials">${r}</span>`}
    </div>
`;var vr=`:host {
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
}`;class hr extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(o,r,a){if(r!==a)this.render()}render(){let o=this.getAttribute("src"),r=this.getAttribute("initials")||"??",a=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${vr}</style>
            ${br({src:o||void 0,initials:r,alt:a})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",hr);_();oo();Ko();_();var fr=(o)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${n.t("settings.profile")}</div>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" onclick="this.nextElementSibling.click()">
                    <app-avatar initials="${o.initials||"??"}" src="${o.avatar_url||""}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">${n.t("action.change_image")}</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" onchange="this.getRootNode().host.handleAvatarChange(event)">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${o.username||n.t("settings.default_user")}</span>
                    <span class="mono-tag">
                        ${(()=>{let r=(o.role||"").toLowerCase();if(o.is_superadmin)return n.t("settings.role_super_admin");if(r==="admin"||r==="administrator")return n.t("settings.role_admin");if(r==="user")return n.t("settings.role_user");return o.role||n.t("settings.default_role")})()}
                    </span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${n.t("settings.display_username")}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${o.username||""}" placeholder="${n.t("settings.display_username")}">
                        <app-button variant="primary" onclick="this.getRootNode().host.updateUsername(document.getElementById('username-input').value)">${n.t("action.update")}</app-button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${n.t("auth.password")}</div>
            <h3 class="settings-content__title">${n.t("settings.system_password")}</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${n.t("settings.current_password")}</label>
                <input type="password" id="current-password" class="settings-content__input" placeholder="${n.t("settings.password_placeholder")}">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${n.t("settings.new_password")}</label>
                <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${n.t("settings.confirm_password")}</label>
                <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div style="margin-top: 32px;">
                <app-button variant="primary" onclick="this.getRootNode().host.updatePassword()">${n.t("general.save")}</app-button>
            </div>
        </div>
    </div>
`,ur=(o,r,a)=>`
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">${n.t("settings.appearance")}</div>
             <h3 class="settings-content__title">${n.t("settings.studio_accent")}</h3>
             <div class="settings-content__color-grid">
                ${a.map((t)=>`
                    <div class="settings-content__color-swatch ${o.accent_color===t?"settings-content__color-swatch--active":""}" 
                         style="background-color: ${r[t]}"
                         onclick="this.getRootNode().host.savePrefs({accent_color: '${t}'})">
                         ${o.accent_color===t?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>':""}
                    </div>
                `).join("")}
                <div class="settings-content__color-swatch settings-content__color-swatch--custom ${o.accent_color.startsWith("#")?"settings-content__color-swatch--active":""}" 
                     style="background-color: ${o.accent_color.startsWith("#")?o.accent_color:"#333"}">
                     <svg viewBox="0 0 24 24" style="opacity: 0.8; fill: ${o.accent_color.startsWith("#")?"#fff":"rgba(255,255,255,0.4)"};">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                     </svg>
                     <input type="color" class="settings-content__swatch-picker" value="${o.accent_color.startsWith("#")?o.accent_color:"#0078D4"}" 
                            onchange="this.getRootNode().host.savePrefs({accent_color: this.value})">
                </div>
             </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag settings-content__section-spacer" style="margin-bottom: 8px;">${n.t("settings.system_locale")}</div>
            <h3 class="settings-content__title">${n.t("settings.localization")}</h3>
            <div class="settings-content__form-group">
                <div style="display: flex; gap: 16px;">
                    <div style="flex: 1;">
                        <label class="settings-content__label">${n.t("settings.language")}</label>
                        <app-select id="language-select" value="${o.language}"></app-select>
                    </div>
                    <div style="flex: 1;">
                        <label class="settings-content__label">${n.t("settings.theme_mode")}</label>
                         <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!o.theme||o.theme==="system"||o.theme==="dark"?"active":""}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'dark'})">
                                \uD83C\uDF19 ${n.t("settings.dark")}
                            </button>
                            <button class="settings-content__segment ${o.theme==="light"?"active":""}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'light'})">
                                ☀️ ${n.t("settings.light")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`,_r=(o)=>`
    <div class="bento-grid">
        <div class="bento-card" style="grid-column: span 2;">
            <div class="mono-tag" style="margin-bottom: 12px;">${n.t("settings.fluid_grid_architecture")}</div>
            
            <!-- Project Name -->
            <div class="settings-content__form-group" style="margin-bottom: 24px;">
                <label class="settings-content__label">${n.t("settings.project_name")}</label>
                <div style="display: flex; gap: 8px;">
                     <input type="text" 
                            id="project-name-input"
                            class="settings-content__input" 
                            value="${o.project_name||"Lastboard"}" 
                            placeholder="Lastboard">
                     <app-button variant="primary" onclick="this.getRootNode().host.savePrefs({project_name: this.getRootNode().getElementById('project-name-input').value})">${n.t("action.update")}</app-button>
                </div>
            </div>

            <div class="settings-content__personalization-grid">
                <div class="settings-content__slider-group">
                    <div class="settings-content__slider-header">
                        <label class="settings-content__slider-label">${n.t("settings.widget_min_size")}</label>
                        <span class="settings-content__slider-value" id="val-widget_min_width">${o.widget_min_width||140}px</span>
                    </div>
                    <input type="range" 
                           min="80" max="300" step="10"
                           value="${o.widget_min_width||140}"
                           oninput="this.getRootNode().host.updateDensity(this.value)"
                           onchange="this.getRootNode().host.commitDensity(this.value)">
                </div>
            </div>
            
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                ${n.t("settings.density_desc")}
            </p>
        </div>
    </div>
`,mr=(o)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${n.t("settings.admin_section")}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${n.t("settings.user_management")}</h3>
                <app-button variant="primary" onclick="this.getRootNode().host.openAddUserModal()" style="width: auto; padding: 0 16px;">+ ${n.t("action.add_user")}</app-button>
            </div>

            <div class="settings-content__user-list">
                ${(o||[]).map((r)=>`
                    <div class="settings-content__user-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <app-avatar 
                                initials="${r.username.substring(0,2).toUpperCase()}" 
                                src="${r.avatar_url||""}" 
                                style="width: 32px; height: 32px; font-size: 12px; border-radius: 50%; object-fit: cover;">
                            </app-avatar>
                            <div>
                                <div style="font-weight: 500; font-size: 14px;">${r.username}</div>
                                <div class="mono-tag" style="font-size: 10px;">
                                    ${(()=>{let a=(r.role||"").toLowerCase();if(r.is_superadmin)return n.t("settings.role_super_admin");if(a==="admin"||a==="administrator")return n.t("settings.role_admin");if(a==="user")return n.t("settings.role_user");return r.role})()}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                             <app-button variant="ghost" onclick="this.getRootNode().host.openEditUserModal(${r.id}, '${r.username}', '${r.role}')">${n.t("general.edit")}</app-button>
                            <app-button variant="ghost" onclick="this.getRootNode().host.deleteUser(${r.id})">${n.t("general.delete")}</app-button>
                        </div>
                    </div>
                `).join("")}
            </div>
             ${(o||[]).length===0?`<p class="settings-content__text-dim">${n.t("settings.no_users")}</p>`:""}
        </div>
    </div>
    
     <dialog id="add-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${n.t("action.add_new_user")}</h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('add-user-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${n.t("auth.username")}</label>
            <input type="text" id="new-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${n.t("auth.password")}</label>
            <input type="password" id="new-user-password" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${n.t("settings.role")}</label>
            <app-select id="new-user-role" value="user"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.createUser()">${n.t("general.save")}</app-button>
        </div>
    </dialog>

    <dialog id="edit-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${n.t("action.edit_user")}</h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('edit-user-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <input type="hidden" id="edit-user-id">
        <div class="settings-content__form-group">
            <label class="settings-content__label">${n.t("auth.username")}</label>
            <input type="text" id="edit-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${n.t("settings.new_password")}</label>
            <input type="password" id="edit-user-password" class="settings-content__input" placeholder="${n.t("settings.password_leave_blank")}">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${n.t("settings.role")}</label>
            <app-select id="edit-user-role"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.updateAdminUser()">${n.t("action.save_changes")}</app-button>
        </div>
    </dialog>
`,yr=()=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <!-- System Migration Section -->
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 24px;">${n.t("settings.system_data")}</div>
            
            <div class="settings-content__action-group">
                <!-- Export -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${n.t("settings.export_db")}</h3>
                        <p>${n.t("settings.export_desc")}</p>
                    </div>
                    <app-button variant="primary" onclick="this.getRootNode().host.downloadBackup()">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        ${n.t("action.download_backup")}
                    </app-button>
                </div>

                <!-- Import -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${n.t("settings.import_db")}</h3>
                        <p>${n.t("settings.import_desc")} <br><span style="color: var(--accent); font-weight: 500;">${n.t("settings.import_warn")}</span></p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                         <input type="file" id="backup-upload" accept=".json" style="display: none;" onchange="this.getRootNode().host.restoreBackup(this.files[0])">
                         <app-button variant="primary" onclick="this.getRootNode().getElementById('backup-upload').click()">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                            ${n.t("action.select_file")}
                         </app-button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-content__danger-zone">
             <div>
                <div class="settings-content__danger-title">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: var(--danger-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    ${n.t("settings.factory_reset")}
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: var(--danger-color); opacity: 0.8;">
                    ${n.t("settings.reset_desc")}
                </p>
             </div>
             <app-button onclick="this.getRootNode().host.openResetModal()" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent; transition: all 0.2s;">
                ${n.t("action.reset_system")}
             </app-button>
        </div>
    </div>

    <!-- Factory Reset Confirmation Modal -->
    <dialog id="reset-confirm-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 440px; backdrop-filter: blur(20px); box-shadow: var(--paper-shadow);">
        <div class="modal-header">
            <h3 class="modal-title" style="color: var(--danger-color); font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: var(--danger-color);"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                ${n.t("settings.confirm_reset_title")}
            </h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('reset-confirm-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="settings-content__text-dim" style="font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
            ${n.t("settings.confirm_reset_msg")}
            ${n.t("settings.type_delete")}
        </p>

        <div class="settings-content__form-group">
            <input type="text" id="reset-confirm-input" class="settings-content__input" placeholder="${n.t("settings.type_delete_placeholder")}" style="border-color: var(--danger-color); opacity: 0.6; font-family: monospace;">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 32px; width: 100%;">
            <app-button id="btn-reset-confirm" variant="danger" onclick="this.getRootNode().host.executeFactoryReset()" style="flex: 1; justify-content: center;">
                ${n.t("action.erase_everything")}
            </app-button>
        </div>
    </dialog>
`,kr=(o,r,a)=>{let t=a?.toLowerCase()==="admin"||a?.toLowerCase()==="administrator";return`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card" style="text-align: center; padding: 48px 24px; position: relative;">
             ${t?`
                <div style="position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <span id="beta-text" style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.3s; user-select: none; border: 2px solid transparent; padding: 4px 10px; border-radius: 20px;">
                        Beta Tester
                    </span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="beta-updates-toggle-badge" onchange="this.getRootNode().host.handleBetaToggle(this.checked)">
                        <span class="slider"></span>
                    </label>
                </div>
             `:""}
             
             <!-- Logo Placeholder -->
             <img src="/images/logo.png" alt="Lastboard" style="max-width: 100px; height: auto; border-radius: 18px; margin: 0 auto 24px auto; display: block;">
             
             <h2 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-main);">${n.t("app.title")}</h2>
             <p class="settings-content__text-dim" style="margin: 0 0 32px 0;">${o}</p>

             <div style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 400px;">
                ${t?r?`
                    ${r.is_docker?`
                        <div style="background: rgba(var(--info-rgb), 0.1); border: 1px solid rgba(var(--info-rgb), 0.3); padding: 16px; border-radius: var(--radius); width: 100%; text-align: left;">
                             <div style="display: flex; gap: 12px; align-items: flex-start;">
                                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: var(--accent); flex-shrink: 0;"><path d="M21 12l-4.37-6.16c-.37-.52-.98-.84-1.63-.84h-3V4c0-1.1-.9-2-2-2s-2 .9-2 2v1H5c-.65 0-1.26.32-1.63.84L-1 12v3h2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v-3zm-11 7H7v-3h3v3zm-5 0H2v-3h3v3zm12 0h-3v-3h3v3z"/></svg>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-main);">${n.t("settings.docker_mode")}</h4>
                                    <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
                                        ${n.t("settings.docker_desc")}<br>
                                        ${r.available?`<strong style="color: var(--accent);">${n.t("settings.new_version_notif")} (${r.latest_version})</strong>`:n.t("settings.up_to_date_docker_msg")}
                                    </p>
                                </div>
                             </div>
                        </div>
                    `:`
                        <!-- Native Update Logic -->
                        <!-- Native Update Logic -->
                        ${r.available?`
                             <div class="update-modal">
                                <div class="update-modal__glow"></div>
                                
                                <div class="update-modal__content">
                                    <div class="update-modal__header">
                                        <div class="update-modal__badge">${n.t("settings.update_available")}</div>
                                        <h3 class="update-modal__version">${r.latest_version}</h3>
                                    </div>
                                    
                                    <div class="update-modal__footer">
                                        <app-button variant="primary" id="btn-update-now" style="flex: 1; justify-content: center;" onclick="this.getRootNode().host.performUpdate('${r.asset_url}')">
                                            ${n.t("action.download_install")}
                                        </app-button>
                                        <a href="https://github.com/Codigo SH/Lastboard/releases" target="_blank" style="text-decoration: none;">
                                            <app-button variant="ghost" style="height: 100%;">${n.t("general.changelog")}</app-button>
                                        </a>
                                    </div>
                                    <p id="update-status" style="margin: 0; font-size: 12px; color: var(--text-dim); display: none; text-align: center;">${n.t("notifier.downloading_secure")}</p>
                                </div>
                            </div>
                        `:`
                            <div style="color: var(--success-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
                                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                <span>${n.t("settings.up_to_date")}</span>
                            </div>
                        `}
                    `}
                `:"":""}
             </div>

             <div style="margin-top: 64px; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: center; gap: 24px;">
                 <a href="https://github.com/Codigo SH/Lastboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>
                     ${n.t("settings.github")}
                 </a>
                 <a href="https://github.com/Codigo SH/Lastboard/issues" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                     ${n.t("action.report_issue")}
                 </a>
             </div>
         </div>
     </div>
        `};var To=`:host {
    display: inline-block;
    width: 100%;
    font-family: var(--font-sans);
    position: relative;
    outline: none;
}

.select-wrapper {
    position: relative;
}

.select-trigger {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    color: var(--text-main);
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 14px;
    width: 100%;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.select-trigger:hover {
    border-color: var(--text-dim);
    background: rgba(255, 255, 255, 0.08);
}

:host([open]) .select-trigger {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.05);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15);
}

.select-value {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.select-icon {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.2s;
    opacity: 0.5;
    flex-shrink: 0;
}

:host([open]) .select-icon {
    transform: rotate(180deg);
    opacity: 1;
    color: var(--accent);
}

/* Dropdown Menu - positioned absolutely within wrapper */
.select-dropdown {
    position: absolute;
    left: 0;
    right: 0;
    background: var(--surface-solid);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    z-index: 99999;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
    transform: translateY(-8px);
}

.select-dropdown.open {
    max-height: 300px;
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
    overflow-y: auto;
}

/* Scrollbar styling */
.select-dropdown::-webkit-scrollbar {
    width: 6px;
}

.select-dropdown::-webkit-scrollbar-track {
    background: transparent;
}

.select-dropdown::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
}

.select-option {
    padding: 10px 16px;
    font-size: 14px;
    color: var(--text-main);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.1s;
}

.select-option:hover {
    background: var(--surface-hover);
    color: var(--text-main);
}

.select-option.selected {
    color: var(--accent);
    background: rgba(var(--accent-rgb), 0.1);
    font-weight: 500;
}

.select-option.selected:hover {
    background: rgba(var(--accent-rgb), 0.15);
}`;class wr extends HTMLElement{_options=[];_value="";isOpen=!1;_boundOutsideClick;dropdownEl=null;_boundScroll;_boundResize;isInsideDialog=!1;static get observedAttributes(){return["value"]}constructor(){super();this.attachShadow({mode:"open"}),this._boundOutsideClick=this.handleOutsideClick.bind(this),this._boundScroll=(o)=>{if(this.dropdownEl&&this.dropdownEl.contains(o.target))return;this.close()},this._boundResize=this.close.bind(this)}connectedCallback(){this.ensureGlobalStyles(),this.render(),this.isInsideDialog=!!this.closest("dialog"),document.addEventListener("click",this._boundOutsideClick,!0),window.addEventListener("scroll",this._boundScroll,!0),window.addEventListener("resize",this._boundResize)}disconnectedCallback(){this.close(),document.removeEventListener("click",this._boundOutsideClick,!0),window.removeEventListener("scroll",this._boundScroll,!0),window.removeEventListener("resize",this._boundResize)}ensureGlobalStyles(){if(!document.getElementById("app-select-portal-css")){let o=document.createElement("style");o.id="app-select-portal-css",o.textContent=To,document.head.appendChild(o)}}get value(){return this._value}set value(o){if(this._value!==o)this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay()}set options(o){this._options=o,this.updateTriggerDisplay()}attributeChangedCallback(o,r,a){if(o==="value"&&r!==a)this._value=a,this.updateTriggerDisplay()}updateTriggerDisplay(){if(!this.shadowRoot)return;let o=this.shadowRoot.querySelector(".select-value");if(o){let r=this._options.find((a)=>a.value===this._value)||this._options[0];o.textContent=r?r.label:"Select..."}}toggle(){if(this.isOpen)this.close();else this.open()}open(){if(this.isOpen)return;if(this.close(),this.isOpen=!0,this.setAttribute("open",""),this.dropdownEl=document.createElement("div"),this.dropdownEl.className="select-dropdown",this.dropdownEl.innerHTML=this._options.map((o)=>`
            <div class="select-option ${o.value===this._value?"selected":""}" 
                 data-value="${o.value}">
                 ${o.label}
            </div>
        `).join(""),this.dropdownEl.querySelectorAll(".select-option").forEach((o)=>{o.addEventListener("click",(r)=>{r.stopPropagation();let a=r.currentTarget.dataset.value;if(a)this.selectOption(a)})}),this.isInsideDialog)this.dropdownEl.style.position="absolute",this.dropdownEl.style.left="0",this.dropdownEl.style.right="0",this.dropdownEl.style.top="100%",this.dropdownEl.style.marginTop="6px",this.shadowRoot.appendChild(this.dropdownEl);else{let o=this.shadowRoot.getElementById("trigger");if(o){let r=o.getBoundingClientRect();this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${r.bottom+6}px`,this.dropdownEl.style.left=`${r.left}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}document.body.appendChild(this.dropdownEl)}requestAnimationFrame(()=>{if(this.dropdownEl)this.dropdownEl.classList.add("open")})}positionPortal(){if(!this.dropdownEl||!this.shadowRoot)return;let o=this.shadowRoot.getElementById("trigger");if(!o)return;let r=o.getBoundingClientRect(),a=r.bottom+6,t=r.left,i=300;if(a+i>window.innerHeight&&r.top-i>0)a=r.top-6-i;this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${a}px`,this.dropdownEl.style.left=`${t}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}close(){if(this.dropdownEl)this.dropdownEl.remove(),this.dropdownEl=null;this.isOpen=!1,this.removeAttribute("open")}handleOutsideClick(o){if(!this.isOpen)return;let r=o.composedPath();if(r.includes(this))return;if(this.dropdownEl&&r.includes(this.dropdownEl))return;this.close()}selectOption(o){this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay(),this.dispatchEvent(new CustomEvent("change",{detail:o,bubbles:!0})),this.close()}render(){if(!this.shadowRoot)return;let o=this._options.find((a)=>a.value===this._value)||this._options[0],r=o?o.label:"Select...";this.shadowRoot.innerHTML=`
            <style>${To}</style>
            <div class="select-wrapper">
                <div class="select-trigger" id="trigger">
                    <div class="select-value">
                        ${r}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `,this.shadowRoot.getElementById("trigger")?.addEventListener("click",(a)=>{a.stopPropagation(),this.toggle()})}}if(!customElements.get("app-select"))customElements.define("app-select",wr);var $r=`:host {
    display: block;
    color: var(--text-main);
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
}

.settings-content__text-dim {
    color: var(--text-dim);
}

/* Ensure dialogs allow dropdowns to overflow */
dialog {
    overflow: visible !important;
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

/* Modal Headers */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
}

.modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
    margin: 0;
}

.modal-close {
    background: transparent;
    border: 1px solid var(--border);
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
    background: rgba(var(--accent-rgb), 0.1);
    transform: rotate(90deg);
    color: var(--accent);
    border-color: rgba(var(--accent-rgb), 0.3);
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
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    color: var(--text-main);
    padding: 12px 16px;
    border-radius: 12px;
    font-family: var(--font-sans);
    font-size: 14px;
    width: 100%;
    outline: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.settings-content__select {
    appearance: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 42px;
}

.settings-content__select option {
    background-color: var(--surface-solid, #1e1e23);
    color: var(--text-main);
    padding: 12px;
}

.settings-content__select option:hover,
.settings-content__select option:focus,
.settings-content__select option:checked {
    background: linear-gradient(0deg, var(--accent) 0%, var(--accent) 100%);
    background-color: var(--accent) !important;
    color: white;
}

.settings-content__select:focus,
.settings-content__input:focus {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.05);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.05);
    transform: translateY(-1px);
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
    background: rgba(var(--accent-rgb), 0.05);
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid rgba(var(--accent-rgb), 0.1);
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
    background: var(--danger-color);
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
    box-shadow: 0 4px 12px rgba(var(--danger-rgb), 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    min-width: 160px;
}

.settings-content__reset-btn:hover {
    background: var(--danger-color);
    filter: brightness(1.1);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(var(--danger-rgb), 0.4);
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
    border: 1px solid rgba(var(--danger-rgb), 0.3);
    background: rgba(var(--danger-rgb), 0.04);
    border-radius: var(--radius);
    padding: 24px;
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
}

.settings-content__danger-zone:hover {
    background: rgba(var(--danger-rgb), 0.08);
    border-color: rgba(var(--danger-rgb), 0.5);
}

.settings-content__danger-title {
    color: var(--danger-color);
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
    align-items: center;
    gap: 8px;
}

/* --- PREMIUM UPDATE MODAL STYLES --- */

.update-modal {
    position: relative;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.update-modal__glow {
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, var(--accent) 0%, transparent 60%);
    opacity: 0.1;
    pointer-events: none;
    z-index: 0;
    transition: opacity 0.5s ease;
}

.update-modal__content {
    position: relative;
    z-index: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.update-modal__header {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
}

.update-modal__badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
    border: 1px solid rgba(var(--accent-rgb), 0.2);
    padding: 4px 10px;
    border-radius: 100px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
    box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.1);
}

.update-modal__badge::before {
    content: '';
    display: block;
    width: 6px;
    height: 6px;
    background: var(--accent);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--accent);
    animation: pulse 2s infinite;
}

.update-modal__version {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    line-height: 1;
    letter-spacing: 0.02em;
    background: linear-gradient(135deg, var(--text-main) 0%, var(--text-dim) 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    color: var(--text-main);
    /* Fallback */
}

.update-modal__footer {
    display: flex;
    gap: 12px;
    margin-top: 4px;
}

@keyframes pulse {
    0% {
        transform: scale(0.95);
        opacity: 0.7;
    }

    50% {
        transform: scale(1.1);
        opacity: 1;
    }

    100% {
        transform: scale(0.95);
        opacity: 0.7;
    }
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

/* Spinner for update button */
.spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
    margin-right: 8px;
}

/* Standard Toggle Switch */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--surface-active);
    transition: 0.3s;
    border-radius: 24px;
    border: 1px solid var(--border);
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 2px;
    bottom: 2px;
    background-color: var(--text-dim);
    transition: 0.3s;
    border-radius: 50%;
}

input:checked+.slider {
    background-color: var(--accent);
    border-color: var(--accent);
}

input:checked+.slider:before {
    transform: translateX(20px);
    background-color: white;
}`;class zr extends HTMLElement{prefs;users=[];getCsrfToken(){let o=document.cookie.split("; ").find((r)=>r.startsWith("csrf_token="));return o?decodeURIComponent(o.split("=")[1]):""}static get observedAttributes(){return["section"]}constructor(){super();this.attachShadow({mode:"open"}),this.prefs={accent_color:"#0078D4",language:"en",widget_min_width:140,beta_updates:!1}}unsubscribe=null;connectedCallback(){this.unsubscribe=$.subscribe((r)=>{if(r&&r.preferences)this.prefs={...r.preferences,project_name:r.project_name||r.preferences.project_name||"Lastboard"},this.render()}),this.fetchPrefs();let o=this.getAttribute("section");if(o==="users")this.fetchUsers();if(o==="about")this.checkForUpdates();this.render()}disconnectedCallback(){if(this.unsubscribe)this.unsubscribe(),this.unsubscribe=null}async fetchPrefs(){let o=$.getUser();if(o&&o.preferences)this.prefs={...o.preferences,project_name:o.project_name||o.preferences.project_name||"Lastboard"},this.render()}async fetchUsers(){try{this.users=await M.getUsers(),this.render()}catch(o){console.error("Failed to fetch users",o)}}attributeChangedCallback(o,r,a){if(o==="section"&&r!==a){if(a==="users")this.fetchUsers();if(a==="about")this.checkForUpdates();this.render()}}async savePrefs(o){let r={...this.prefs};if(this.prefs={...this.prefs,...o},o.accent_color)this.applyAccent(o.accent_color);if(o.language)n.setLanguage(o.language);if(o.theme)if(o.theme==="dark")R.enableDark();else R.enableLight();try{await $.updatePreferences(o)}catch{if(this.prefs=r,o.language&&r.language)n.setLanguage(r.language)}this.render()}applyAccent(o){let r=o,a={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"};if(!o.startsWith("#"))r=a[o]||"#0078D4";document.documentElement.style.setProperty("--accent",r);let t=parseInt(r.slice(1,3),16),i=parseInt(r.slice(3,5),16),e=parseInt(r.slice(5,7),16);if(!isNaN(t)&&!isNaN(i)&&!isNaN(e))document.documentElement.style.setProperty("--accent-rgb",`${t}, ${i}, ${e}`)}handleBetaToggle(o){this.savePrefs({beta_updates:o});let r=this.shadowRoot.getElementById("beta-text");if(r)if(o)r.style.color="#2fb344",r.style.borderColor="#2fb344",r.style.boxShadow="0 0 10px rgba(47, 179, 68, 0.2)";else r.style.color="var(--text-dim)",r.style.borderColor="var(--border)",r.style.boxShadow="none"}updateDensity(o){let r=this.shadowRoot.getElementById("val-widget_min_width");if(r)r.textContent=o+"px";document.documentElement.style.setProperty("--widget-min-size",o+"px")}commitDensity(o){let r=parseInt(o);$.updatePreferences({widget_min_width:r})}async updateUsername(o){let r=$.getUser();if(!r)return;if(await $.updateProfile({username:o,avatar_url:this.prefs.avatar_url||r.avatar_url}),window.notifier)window.notifier.show(n.t("notifier.username_updated"))}async updatePassword(){let o=this.shadowRoot.getElementById("current-password")?.value,r=this.shadowRoot.getElementById("new-password")?.value,a=this.shadowRoot.getElementById("confirm-password")?.value;if(!o){if(window.notifier)window.notifier.show(n.t("notifier.password_required"),"error");return}if(r!==a){if(window.notifier)window.notifier.show(n.t("notifier.password_mismatch"),"error");return}if(!r){if(window.notifier)window.notifier.show(n.t("notifier.password_empty"),"error");return}try{if(await $.changePassword({current_password:o,new_password:r}),window.notifier)window.notifier.show(n.t("notifier.password_changed"));this.shadowRoot.getElementById("current-password").value="",this.shadowRoot.getElementById("new-password").value="",this.shadowRoot.getElementById("confirm-password").value="",setTimeout(async()=>{try{await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()}})}catch(t){}document.body.style.opacity="0",window.location.href="/login"},1500)}catch(t){if(window.notifier)window.notifier.show(n.t("notifier.password_incorrect"),"error")}}async handleAvatarChange(o){let r=o.target.files?.[0];if(!r)return;let a=new FileReader;a.onload=async(t)=>{let i=t.target?.result,e=$.getUser();if(!e)return;if(this.prefs.avatar_url=i,await $.updateProfile({username:e.username,avatar_url:i}),this.render(),window.notifier)window.notifier.show(n.t("notifier.avatar_updated"))},a.readAsDataURL(r)}openAddUserModal(){let o=this.shadowRoot.getElementById("add-user-modal");if(o){o.showModal();let r=this.shadowRoot.getElementById("new-user-role");if(r)r.options=[{value:"user",label:n.t("settings.role_user")},{value:"admin",label:n.t("settings.role_admin")}]}}async createUser(){let o=this.shadowRoot.getElementById("new-user-username").value,r=this.shadowRoot.getElementById("new-user-password").value,a=this.shadowRoot.getElementById("new-user-role").value;if(!o||!r){if(window.notifier)window.notifier.show(n.t("notifier.fields_required"),"error");return}try{if(await M.createUser({username:o,password:r,role:a}),window.notifier)window.notifier.show(n.t("notifier.user_created"));let t=this.shadowRoot.getElementById("add-user-modal");if(t)t.close();this.fetchUsers()}catch(t){if(window.notifier)window.notifier.show(n.t("notifier.user_create_error"),"error")}}openEditUserModal(o,r,a){let t=this.shadowRoot.getElementById("edit-user-modal");if(t){this.shadowRoot.getElementById("edit-user-id").value=o.toString(),this.shadowRoot.getElementById("edit-user-username").value=r,this.shadowRoot.getElementById("edit-user-password").value="",t.showModal();let i=this.shadowRoot.getElementById("edit-user-role");if(i)i.options=[{value:"user",label:n.t("settings.role_user")},{value:"admin",label:n.t("settings.role_admin")}],i.value=a}}async updateAdminUser(){let o=parseInt(this.shadowRoot.getElementById("edit-user-id").value),r=this.shadowRoot.getElementById("edit-user-username").value,a=this.shadowRoot.getElementById("edit-user-password").value,t=this.shadowRoot.getElementById("edit-user-role").value;if(!r){if(window.notifier)window.notifier.show(n.t("notifier.username_required"),"error");return}try{if(await M.adminUpdateUser({id:o,username:r,role:t,password:a||void 0}),window.notifier)window.notifier.show(n.t("notifier.user_updated"));let i=this.shadowRoot.getElementById("edit-user-modal");if(i)i.close();this.fetchUsers()}catch(i){if(window.notifier)window.notifier.show(n.t("notifier.user_update_error"),"error")}}async deleteUser(o){let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(n.t("general.delete"),n.t("notifier.user_delete_confirm")))return}try{let a=[...this.users];if(this.users=this.users.filter((t)=>t.id!==o),this.render(),await M.deleteUser(o),window.notifier)window.notifier.show(n.t("notifier.user_deleted"));this.fetchUsers()}catch(a){this.fetchUsers();let t=n.t("notifier.user_delete_error");if(a.message&&a.message.includes("error.cannot_delete_superadmin"))t=n.t("notifier.user_delete_superadmin");if(window.notifier)window.notifier.show(t,"error")}}getContent(o){let r=$.getUser()||{username:"Guest",initials:"??",role:"View Only",avatar_url:"",accent_color:"#0078D4",language:"en",preferences:{}};switch(o){case"account":return fr(r);case"theme":{let a={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"},t=Object.keys(a);return ur(this.prefs,a,t)}case"personalization":return _r(this.prefs);case"advanced":return yr();case"users":return mr(this.users);case"about":return kr(this.version,this.updateInfo,r.role||"");default:return`<div class="bento-card"><h3>${o}</h3><p class="settings-content__text-dim">${n.t("settings.default_module_desc")}</p></div>`}}version="v1.1.4-beta.9";updateInfo=null;checkUpdatesPromise=null;async checkForUpdates(){if(this.checkUpdatesPromise)return this.checkUpdatesPromise;return this.checkUpdatesPromise=(async()=>{try{let o=await fetch("/api/system/update/check");if(o.ok)this.updateInfo=await o.json(),this.version=this.updateInfo.current_version}catch(o){console.error("Check update failed",o)}finally{this.checkUpdatesPromise=null,this.render()}})(),this.checkUpdatesPromise}async performUpdate(o){let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(n.t("settings.update_available"),n.t("notifier.update_start_confirm")))return}let a=this.shadowRoot.getElementById("btn-update-now"),t=this.shadowRoot.getElementById("update-status");if(a)a.loading=!0;if(t)t.style.display="block",t.textContent=n.t("notifier.update_downloading");try{let i=await fetch("/api/system/update/perform",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":this.getCsrfToken()},body:JSON.stringify({asset_url:o})});if(i.ok){if(t)t.textContent=n.t("notifier.update_verified");setTimeout(()=>{window.location.reload()},5000)}else{let e=await i.text();if(t)t.style.color="var(--danger-color)",t.textContent=n.t("notifier.update_failed")+e;if(a)a.loading=!1}}catch(i){if(console.error("Update failed",i),t)t.style.color="var(--danger-color)",t.textContent=n.t("notifier.update_error");if(a)a.loading=!1}}downloadBackup(){window.location.href="/api/system/backup"}async restoreBackup(o){if(!o)return;let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(n.t("general.restore"),n.t("notifier.restore_confirm")))return}let a=new FormData;a.append("backup_file",o);try{if((await fetch("/api/system/restore",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()},body:a})).ok){if(window.notifier)window.notifier.show(n.t("notifier.restore_success"));setTimeout(()=>window.location.reload(),2000)}else if(window.notifier)window.notifier.show(n.t("notifier.restore_failed"),"error")}catch(t){if(console.error("Restore error",t),window.notifier)window.notifier.show(n.t("notifier.restore_failed"),"error")}}openResetModal(){let o=this.shadowRoot.getElementById("reset-confirm-modal"),r=this.shadowRoot.getElementById("reset-confirm-input");if(o){if(r)r.value="";o.showModal()}}async executeFactoryReset(){let o=this.shadowRoot.getElementById("reset-confirm-input");if(!o||o.value.trim()!=="delete"){if(window.notifier)window.notifier.show(n.t("notifier.reset_confirm_text"),"error");o.focus();return}let r=this.shadowRoot.getElementById("btn-reset-confirm");try{if(r)r.disabled=!0,r.textContent=n.t("settings.restoring")||"Restoring...";if((await fetch("/api/system/reset",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()}})).ok){let t=document.createElement("div");Object.assign(t.style,{position:"fixed",top:"0",left:"0",width:"100%",height:"100%",backgroundColor:"rgba(0,0,0,0.9)",zIndex:"9999",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"var(--font-main, sans-serif)"}),t.innerHTML=`
                    <div style="border: 4px solid #333; border-top: 4px solid var(--accent, #0078d4); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 24px;"></div>
                    <h2 style="margin: 0; font-weight: 500;">${n.t("notifier.system_restarting")}</h2>
                    <p style="opacity: 0.7; margin-top: 8px;">${n.t("notifier.please_wait")}</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `,document.body.appendChild(t);let i=0,e=async()=>{i++;try{if((await fetch("/",{method:"HEAD",cache:"no-store"})).ok){window.location.href="/setup";return}}catch(s){}if(i<60)setTimeout(e,1000);else window.location.href="/setup"};setTimeout(e,2000)}else if(window.notifier)window.notifier.show(n.t("notifier.reset_failed"),"error")}catch(a){if(console.error("Reset error",a),window.notifier)window.notifier.show(n.t("notifier.reset_error"),"error")}}render(){if(this.shadowRoot.innerHTML=`
            <style>${$r}</style>
            <div class="fade-in">
                ${this.getContent(this.getAttribute("section")||"account")}
            </div>
        `,this.shadowRoot.querySelectorAll(".settings-content__checkbox").forEach((o)=>{o.addEventListener("click",()=>o.classList.toggle("settings-content__checkbox--checked"))}),this.initSelects(),this.getAttribute("section")==="about")this.updateBetaBadgeVisuals()}initSelects(){let o=this.shadowRoot.getElementById("language-select");if(o){let i=n.getAvailableLocales();o.options=i.map((e)=>({value:e.code,label:`${e.flag} ${e.name}`})),o.addEventListener("change",(e)=>{this.savePrefs({language:e.detail})})}let r=[{value:"user",label:n.t("settings.role_user")},{value:"admin",label:n.t("settings.role_admin")}],a=this.shadowRoot.getElementById("new-user-role");if(a)a.options=r;let t=this.shadowRoot.getElementById("edit-user-role");if(t)t.options=r}updateBetaBadgeVisuals(){setTimeout(()=>{let o=this.shadowRoot.getElementById("beta-updates-toggle-badge"),r=this.shadowRoot.getElementById("beta-text"),a=this.prefs.beta_updates||!1;if(o&&r)if(o.checked=a,a)r.style.color="#2fb344",r.style.borderColor="#2fb344",r.style.boxShadow="0 0 10px rgba(47, 179, 68, 0.2)";else r.style.color="var(--text-dim)",r.style.borderColor="var(--border)",r.style.boxShadow="none"},0)}}if(!customElements.get("settings-content"))customElements.define("settings-content",zr);oo();_();var jr=({user:o,isOpen:r,selectedSection:a,updateAvailable:t})=>`
    <div class="right-drawer__overlay"></div>
    
    <div class="right-drawer__content-panel ${a?"":"right-drawer__content-panel--closed"}">
        <div class="right-drawer__content-body">
            ${a?`<settings-content section="${a}"></settings-content>`:""}
        </div>
    </div>

    <div class="right-drawer__panel">
        <div class="right-drawer__header">
            <app-avatar class="right-drawer__avatar" initials="${o.initials}" src="${o.avatar_url||""}"></app-avatar>
            <div class="right-drawer__user-info">
                <span class="right-drawer__username">${o.username}</span>
                ${o.role?.toLowerCase()==="admin"||o.role?.toLowerCase()==="administrator"?`<span class="right-drawer__role">
                    ${(()=>{let i=(o.role||"").toLowerCase();if(o.is_superadmin)return n.t("settings.role_super_admin");if(i==="admin"||i==="administrator")return n.t("settings.role_admin");if(i==="user")return n.t("settings.role_user");return o.role||n.t("settings.default_role")})()}
                </span>`:""}
            </div>
        </div>
        
        <div class="right-drawer__body">
            <div class="right-drawer__section-label">${n.t("settings.title")}</div>
            <nav class="right-drawer__menu">
                <div class="right-drawer__menu-item ${a==="account"?"right-drawer__menu-item--active":""}" data-section="account">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    <span>${n.t("settings.profile")}</span>
                </div>
                <div class="right-drawer__menu-item ${a==="theme"?"right-drawer__menu-item--active":""}" data-section="theme">
                    <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>
                    <span>${n.t("settings.theme")}</span>
                </div>
                <div class="right-drawer__menu-item ${a==="personalization"?"right-drawer__menu-item--active":""}" data-section="personalization">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span>${n.t("settings.personalization")}</span>
                </div>

                ${o.role?.toLowerCase()==="admin"||o.role==="Administrator"?`
                    <div class="right-drawer__menu-item ${a==="users"?"right-drawer__menu-item--active":""}" data-section="users">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span>${n.t("settings.users")}</span>
                    </div>

                    <div class="right-drawer__menu-item ${a==="advanced"?"right-drawer__menu-item--active":""}" data-section="advanced">
                        <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                        <span>${n.t("settings.advanced")}</span>
                    </div>
                `:""}
                <div class="right-drawer__menu-item ${a==="about"?"right-drawer__menu-item--active":""}" data-section="about" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <span>${n.t("settings.about")}</span>
                    </div>
                    ${t&&(o.role?.toLowerCase()==="admin"||o.role==="Administrator")?`
                        <span style="font-size: 10px; font-weight: 600; color: var(--danger-color); background: rgba(var(--danger-rgb), 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(var(--danger-rgb), 0.2); animation: blink-badge 2s infinite;">${n.t("settings.update_available")}</span>
                        <style>@keyframes blink-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }</style>
                    `:""}
                </div>
            </nav>
        </div>

        <div class="right-drawer__footer">
            <button type="button" id="logout-btn" class="right-drawer__menu-item right-drawer__menu-item--logout" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;width:100%;padding:0;">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
                <span>${n.t("auth.logout")}</span>
            </button>
        </div>
    </div>
`;_();var Gr=`:host {
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
    background: rgba(var(--accent-rgb), 0.1);
    padding: 2px 10px;
    border: 1px solid rgba(var(--accent-rgb), 0.2);
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
    background: var(--surface-hover);
}

.right-drawer__menu-item--active {
    color: var(--text-main);
    background: var(--surface-active);
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
    color: var(--danger-color) !important;
}

.right-drawer__menu-item--logout:hover {
    background: rgba(var(--danger-rgb), 0.05) !important;
}`;class Fr extends HTMLElement{isOpen;selectedSection;_unsubscribe;_unsubscribeI18n;_keydownHandler;updateAvailable;_unsubscribeDashboard;constructor(){super();this.attachShadow({mode:"open"}),this.isOpen=!1,this.selectedSection=null,this.updateAvailable=!1}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribe=$.subscribe((o)=>{if(this.isOpen)this.render()}),Promise.resolve().then(() => (B(),sr)).then(({dashboardStore:o})=>{this._unsubscribeDashboard=o.subscribe((r)=>{if(this.updateAvailable!==r.updateAvailable)this.updateAvailable=r.updateAvailable,this.render()})}),this._unsubscribeI18n=n.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._keydownHandler)window.removeEventListener("keydown",this._keydownHandler)}open(){this.isOpen=!0,this.setAttribute("open",""),this.render(),document.body.style.overflow="hidden",this.dispatchEvent(new CustomEvent("drawer-open",{bubbles:!0,composed:!0}))}close(){this.isOpen=!1,this.removeAttribute("open"),this.selectedSection=null,this.render(),document.body.style.overflow="",this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}selectSection(o){if(this.selectedSection===o)this.selectedSection=null;else this.selectedSection=o;this.render()}async performLogout(){let o=document.cookie.split("; ").find((a)=>a.startsWith("csrf_token=")),r=o?decodeURIComponent(o.split("=")[1]):"";try{await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":r}})}catch(a){}document.body.style.opacity="0",window.location.href="/login"}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target;if(r.classList.contains("right-drawer__overlay"))this.close();if(r.closest("#logout-btn")){o.preventDefault(),this.performLogout();return}let a=r.closest(".right-drawer__menu-item");if(a&&a.dataset.section)o.preventDefault(),this.selectSection(a.dataset.section)}),this._keydownHandler=(o)=>{if(o.key==="Escape"&&this.isOpen)this.close()},window.addEventListener("keydown",this._keydownHandler)}render(){let o=$.getUser()||{username:"Guest",initials:"??",role:"Viewer"};this.shadowRoot.innerHTML=`
            <style>${Gr}</style>
            ${jr({user:o,isOpen:this.isOpen,selectedSection:this.selectedSection,updateAvailable:this.updateAvailable})}
        `}}if(!customElements.get("app-right-drawer"))customElements.define("app-right-drawer",Fr);_();var Lr=({title:o,editMode:r,searchActive:a,addMenuActive:t,drawerOpen:i,searchQuery:e,user:s,updateAvailable:d})=>{return`
    <div class="top-bar">
        <div class="top-bar__title">${o}</div>
        <div class="top-bar__actions">
            <!-- Offline Indicator -->
            <offline-badge></offline-badge>

            <!-- Search Bar -->
            <div id="search-wrapper" class="search-wrapper ${a?"search-wrapper--active":""}">
                <input type="text" id="search-input" class="search-input" placeholder="${n.t("general.search")}" 
                       value="${e||""}" onclick="event.stopPropagation()">
                <div id="search-clear" class="search-clear" style="display: ${e?"flex":"none"};">×</div>
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Item Toggle -->
            <div id="add-toggle" class="top-bar__toggle" title="${n.t("topbar.add_tooltip")}" 
                 style="${r?"display: flex;":"display: none;"} margin-right: -6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Menu Dropdown -->
            <div id="add-menu" class="add-menu ${t?"add-menu--active":""}">
                <div class="add-menu-item" data-action="add-bookmark">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    ${n.t("action.add_bookmark")}
                </div>
                <div class="add-menu-item" data-action="add-section">
                     <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon" style="stroke-dasharray: 4 2;"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                    ${n.t("action.add_section")}
                </div>
                <div class="add-menu-item" data-action="add-widget">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/></svg>
                    ${n.t("action.add_widget")}
                </div>
            </div>

            <!-- Edit Mode Toggle -->
            <div id="edit-toggle" class="top-bar__toggle" title="${n.t("topbar.edit_tooltip")}" 
                 style="margin-right: -6px; ${r?"color: var(--accent);":""}">
                <svg id="edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    ${r?`
                        <!-- Checkmark Icon -->
                        <path d="M5 13l4 4L19 7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    `:`
                        <!-- Geometric Pencil Icon -->
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke-width="1.5" stroke-linecap="round" />
                    `}
                </svg>
            </div>

            <!-- Sidebar Toggle Icon -->
            <div id="drawer-toggle" class="top-bar__toggle" style="position: relative;">
                ${d?'<div class="notification-dot"></div>':""}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" />
                    <rect class="top-bar__indicator ${i?"top-bar__indicator--active":""}" 
                          x="15" y="3" width="6" height="18" fill="white" />
                    <path d="M15 3V21" stroke-width="1.5" />
                </svg>
            </div>
        </div>
    </div>
`};B();_();var Hr=`:host {
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
    fill: var(--text-main);
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
    background: var(--surface-solid, #1a1b1e);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px;
    display: none;
    flex-direction: column;
    gap: 2px;
    min-width: 140px;
    z-index: 2000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
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

/* Mobile & Tablet Responsiveness (Touch or Small Screen) */
@media (pointer: coarse),
(max-width: 1024px) {

    #edit-toggle,
    #add-toggle,
    #drawer-toggle {
        display: none !important;
    }

    .top-bar__title {
        margin-right: 8px;
    }
}

/* Notification Dot */
.notification-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    background-color: var(--danger-color);
    border-radius: 50%;
    border: 2px solid var(--panel);
    animation: blink 2s infinite;
}

@keyframes blink {
    0% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.5;
        transform: scale(0.8);
    }

    100% {
        opacity: 1;
        transform: scale(1);
    }
}`;class Br extends HTMLElement{state;_unsubscribeDashboard;_unsubscribeI18n;_windowClickHandler;static get observedAttributes(){return["title"]}constructor(){super();this.attachShadow({mode:"open"}),this.state={editMode:!1,searchActive:!1,addMenuActive:!1,drawerOpen:!1,searchQuery:""}}attributeChangedCallback(o,r,a){if(o==="title"&&r!==a)this.render()}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeDashboard=x.subscribe((o)=>{if(this.state.editMode!==o.isEditing||this.state.updateAvailable!==o.updateAvailable)this.setState({editMode:o.isEditing,updateAvailable:o.updateAvailable})}),this._unsubscribeI18n=n.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._windowClickHandler)window.removeEventListener("click",this._windowClickHandler)}setState(o){let r=this.state.editMode;if(this.state={...this.state,...o},this.render(),o.editMode!==void 0&&o.editMode!==r)this.dispatchEvent(new CustomEvent("edit-mode-change",{detail:{active:this.state.editMode},bubbles:!0,composed:!0}))}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target;if(r.closest("#search-clear")){o.stopPropagation(),this.state.searchQuery="";let l=this.shadowRoot.getElementById("search-input");if(l)l.value="",l.focus();this.render(),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0}));return}if(r.closest("#search-wrapper")&&!this.state.searchActive)o.stopPropagation(),this.setState({searchActive:!0}),this.shadowRoot.getElementById("search-input")?.focus();if(r.closest("#edit-toggle"))x.toggleEditMode();if(r.closest("#add-toggle"))o.stopPropagation(),this.setState({addMenuActive:!this.state.addMenuActive});let s=r.closest(".add-menu-item");if(s){let l=s.dataset.action;if(l)this.setState({addMenuActive:!1}),this.dispatchEvent(new CustomEvent("add-item",{detail:{action:l},bubbles:!0,composed:!0}));return}if(r.closest("#drawer-toggle")){let l=this.state.drawerOpen?"close":"open";this.dispatchEvent(new CustomEvent("drawer-toggle",{detail:{action:l},bubbles:!0,composed:!0}));return}}),this.shadowRoot.addEventListener("input",(o)=>{let r=o.target;if(r.id==="search-input"){let a=r.value;this.state.searchQuery=a;let t=this.shadowRoot.getElementById("search-clear");if(t)t.style.display=a?"flex":"none";this.dispatchEvent(new CustomEvent("search-input",{detail:{query:a},bubbles:!0,composed:!0}))}}),this.shadowRoot.addEventListener("keydown",(o)=>{let r=o.target,a=o;if(r.id==="search-input"&&a.key==="Escape")r.value="",this.setState({searchActive:!1}),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0})),r.blur()}),this._windowClickHandler=(o)=>{if(this.state.addMenuActive)this.setState({addMenuActive:!1});let r=o.composedPath(),a=this.shadowRoot.getElementById("search-wrapper");if(this.state.searchActive&&a&&!r.includes(a)){let t=this.shadowRoot.getElementById("search-input");if(t&&t.value==="")this.setState({searchActive:!1})}},window.addEventListener("click",this._windowClickHandler)}render(){let o=this.getAttribute("title")||"Lastboard";this.shadowRoot.innerHTML=`
            <style>${Hr}</style>
            ${Lr({title:o,editMode:this.state.editMode,searchActive:this.state.searchActive,addMenuActive:this.state.addMenuActive,drawerOpen:this.state.drawerOpen,searchQuery:this.state.searchQuery,user:this.state.user,updateAvailable:this.state.updateAvailable})}
        `}}if(!customElements.get("app-topbar"))customElements.define("app-topbar",Br);_();var Jr=({title:o,dropdownOpen:r})=>`
    <header class="header">
        <div class="header__left">
            ${o}
        </div>

        <div class="header__group">
            <button class="header__btn-changelog">
                <span>${n.t("header.view_changelog")}</span>
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
                <div class="header__dropdown ${r?"header__dropdown--active":""}" id="profile-dropdown">
                    <div class="header__dropdown-item">${n.t("header.view_profile")}</div>
                    <div class="header__dropdown-item">${n.t("header.preferences")}</div>
                    <div class="header__dropdown-item" style="border-top: 1px solid var(--border-color); color: var(--danger-color);">${n.t("auth.sign_out")}</div>
                </div>
            </div>
        </div>
    </header>
`;var Mr=`.header {
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
}`;class Rr extends HTMLElement{dropdownOpen;constructor(){super();this.attachShadow({mode:"open"}),this.dropdownOpen=!1}connectedCallback(){this.render(),this.setupListeners()}toggleDropdown(o){this.dropdownOpen=typeof o==="boolean"?o:!this.dropdownOpen,this.render()}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target,a=r.closest(".header__btn-changelog");if(a)a.style.display="none";if(r.closest("#profile-trigger"))o.stopPropagation(),this.toggleDropdown()}),window.addEventListener("click",()=>{if(this.dropdownOpen)this.toggleDropdown(!1)})}render(){let o=this.getAttribute("title")||"Task";this.shadowRoot.innerHTML=`
            <style>${Mr}</style>
            ${Jr({title:o,dropdownOpen:this.dropdownOpen})}
        `}}if(!customElements.get("app-header"))customElements.define("app-header",Rr);_();var ao=(o)=>String(o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),Ca=(o)=>{if(!o)return"#";let r=o.trim().toLowerCase();if(r.startsWith("http://")||r.startsWith("https://")||r==="#")return ao(o);return"#"},Kr=({bookmarks:o,isEditing:r,isSearching:a,isTouchDevice:t,maxCols:i=12})=>{let e=Array.isArray(o)?o:[],s=(l)=>e.filter((c)=>c.parent_id===l);return`
    ${(t?e.filter((l)=>l.type!=="section"):a?e:e.filter((l)=>!l.parent_id)).map((l)=>{let c={};try{c=typeof l.content==="string"?JSON.parse(l.content):l.content}catch(m){console.error("Failed to parse content for item",l.id,m)}let p=l.type==="section",g={x:l.x||1,y:l.y||1},u=Math.min(l.w||1,i),h=l.h||1;if(p){let m=s(l.id),G=(c.title||"").trim();return`
            <fieldset class="bookmark-grid__section"
               data-id="${l.id}"
               data-orig-x="${l.x}" data-orig-y="${l.y}"
               draggable="${r}"
               style="--x: ${g.x}; --y: ${g.y}; --w: ${u}; --h: ${h};">
               ${G?`<legend class="section-title">${ao(G)}</legend>`:""}
               <div class="bookmark-grid__nested-content" style="width: 100%; height: 100%;">
                   ${Oa(m,r,!0,u)}
               </div>
               ${r?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${n.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${n.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
                <div class="resize-handle"></div>
               `:""}
            </fieldset>`}return Qr(l,c,r,g,u,h)}).join("")}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
    `};function Qr(o,r,a,t,i,e=0){let s=e||o.h||1;if(o.type==="widget"){let g=r.widgetId,h={clock:"widget-clock",notepad:"widget-notepad",telemetry:"widget-telemetry"}[g]||"div",G=(r.text||"").replace(/"/g,"&quot;");return`
        <div class="bookmark-grid__card"
            draggable="${a}"
            data-id="${o.id}"
            data-type="${o.type}"
            data-orig-x="${o.x}" data-orig-y="${o.y}"
            style="--x: ${t.x}; --y: ${t.y}; --w: ${i}; --h: ${s}; cursor: ${a?"move":"default"};">

            <${h}
                item-id="${o.id}"
                ${g==="notepad"?`content="${G}"`:""}
            ></${h}>

            ${a?`
            <div class="bookmark-actions">
                 ${["clock","telemetry"].includes(g)?`<button class="action-btn btn-edit" title="${n.t("general.edit")}">✎</button>`:""}
                 <button class="action-btn btn-delete" title="${n.t("general.delete")}">\uD83D\uDDD1</button>
            </div>
            ${["clock","telemetry"].includes(g)?"":'<div class="resize-handle"></div>'}
            `:""}
        </div>
    `}let d=r.icon||"",c=d.startsWith("http")||d.startsWith("/")?`<img src="${ao(d)}" alt="${ao(r.label)}" class="bookmark-grid__icon-img" draggable="false" />`:d?ao(d):'<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';return`
        <a ${a?'role="button"':`href="${Ca(r.url)}" target="_blank"`} class="bookmark-grid__card"
           draggable="${a}"
           data-id="${o.id}"
           data-type="${o.type}"
           data-orig-x="${o.x}" data-orig-y="${o.y}"
           style="--x: ${t.x}; --y: ${t.y}; --w: ${i}; --h: ${s};">
            
            ${a?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${n.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${n.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
            `:""}

            <div class="bookmark-grid__icon-container">
                ${c}
            </div>
            <span class="bookmark-grid__label">${ao(r.label)||"Bookmark"}</span>
            
            ${a&&o.type==="section"?'<div class="resize-handle"></div>':""}
            
            ${r.statusCheck?`
                <div class="status-indicator" title="${n.t("general.pinging")}"></div>
            `:""}
        </a>
    `}function Oa(o,r,a=!1,t=12){return o.map((i)=>{let e={};try{e=typeof i.content==="string"?JSON.parse(i.content):i.content}catch(c){console.error("Failed to parse content for item (nested)",i.id,c)}let s={x:i.x||1,y:i.y||1},d=i.h||1,l=Math.min(i.w||1,t);return Qr(i,e,r,s,l,d)}).join("")}B();N();_();_();B();class qr extends HTMLElement{timer;timeEl=null;dateEl=null;_unsubscribe=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}isEditing=!1;configMode=!1;_config={timezone:"local",hour12:!1,showDate:!0};_itemId=0;static get observedAttributes(){return["item-id","content","mode"]}attributeChangedCallback(o,r,a){if(o==="item-id")this._itemId=parseInt(a);if(o==="content")try{let t=typeof a==="string"?JSON.parse(a):a;if(t&&typeof t==="object")this._config={...this._config,...t},this.updateTime()}catch(t){}}connectedCallback(){this.render(),this.updateTime(),this.timer=setInterval(()=>{this.updateTime()},1000),this._unsubscribe=x.subscribe((o)=>{if(this.isEditing!==o.isEditing)this.isEditing=o.isEditing,this.render();if(this._itemId){let r=o.items.find((a)=>a.id===this._itemId);if(r&&r.content)try{let a=typeof r.content==="string"?JSON.parse(r.content):r.content;if(a.widgetId==="clock")this._config={...this._config,...a},this.updateTime()}catch(a){}}}),this._unsubscribeI18n=n.subscribe(()=>{this.updateTime()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this.timer)clearInterval(this.timer)}updateTime(){if(!this.timeEl||!this.dateEl)return;let o=new Date,r={hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:this._config.hour12},a=void 0;if(this._config.timezone&&this._config.timezone!=="local")a=this._config.timezone;let t=n.getLocale().code;try{let s=new Intl.DateTimeFormat(t,{...r,timeZone:a}).formatToParts(o).map((d)=>{if(d.type==="dayPeriod")return`<span class="ampm">${d.value.toUpperCase().replace(/\./g,"").trim()}</span>`;return d.value}).join("");this.timeEl.innerHTML=s}catch(i){this.timeEl.textContent=o.toLocaleTimeString()}if(this._config.showDate){let i={weekday:"long",day:"numeric",month:"long",timeZone:a};this.dateEl.textContent=o.toLocaleDateString(t,i),this.dateEl.style.display="block"}else this.dateEl.style.display="none"}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    background: var(--surface);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    
                    color: var(--text-main);
                    border-radius: var(--radius);
                    box-sizing: border-box;
                    padding: 8%; /* Percentage padding */
                    user-select: none;
                    position: relative;
                    container-type: inline-size; /* Enable CQ */
                }
                .time {
                    font-size: clamp(1.5rem, 22cqi, 5rem); /* Proportional scaling */
                    font-weight: 700;
                    letter-spacing: -0.05em;
                    line-height: 1;
                    font-variant-numeric: tabular-nums;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    white-space: nowrap;
                }
                .date {
                    font-size: clamp(0.6rem, 7cqi, 1.4rem); /* Proportional scaling */
                    color: var(--text-dim);
                    margin-top: 4%;
                    font-weight: 500;
                    white-space: nowrap;
                }
            </style>
            
            <div class="time">--:--:--</div>
            <div class="date">-- --</div>
        `,this.timeEl=this.shadowRoot.querySelector(".time"),this.dateEl=this.shadowRoot.querySelector(".date")}}customElements.define("widget-clock",qr);var yo=globalThis,ko=yo.ShadowRoot&&(yo.ShadyCSS===void 0||yo.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Zo=Symbol(),Ar=new WeakMap;class wo{constructor(o,r,a){if(this._$cssResult$=!0,a!==Zo)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=o,this.t=r}get styleSheet(){let o=this.o,r=this.t;if(ko&&o===void 0){let a=r!==void 0&&r.length===1;a&&(o=Ar.get(r)),o===void 0&&((this.o=o=new CSSStyleSheet).replaceSync(this.cssText),a&&Ar.set(r,o))}return o}toString(){return this.cssText}}var Tr=(o)=>new wo(typeof o=="string"?o:o+"",void 0,Zo),go=(o,...r)=>{let a=o.length===1?o[0]:r.reduce((t,i,e)=>t+((s)=>{if(s._$cssResult$===!0)return s.cssText;if(typeof s=="number")return s;throw Error("Value passed to 'css' function must be a 'css' function result: "+s+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+o[e+1],o[0]);return new wo(a,o,Zo)},Zr=(o,r)=>{if(ko)o.adoptedStyleSheets=r.map((a)=>a instanceof CSSStyleSheet?a:a.styleSheet);else for(let a of r){let t=document.createElement("style"),i=yo.litNonce;i!==void 0&&t.setAttribute("nonce",i),t.textContent=a.cssText,o.appendChild(t)}},Eo=ko?(o)=>o:(o)=>o instanceof CSSStyleSheet?((r)=>{let a="";for(let t of r.cssRules)a+=t.cssText;return Tr(a)})(o):o;var{is:Na,defineProperty:Va,getOwnPropertyDescriptor:Da,getOwnPropertyNames:Xa,getOwnPropertySymbols:Pa,getPrototypeOf:Wa}=Object,$o=globalThis,Er=$o.trustedTypes,Ia=Er?Er.emptyScript:"",Sa=$o.reactiveElementPolyfillSupport,xo=(o,r)=>o,bo={toAttribute(o,r){switch(r){case Boolean:o=o?Ia:null;break;case Object:case Array:o=o==null?o:JSON.stringify(o)}return o},fromAttribute(o,r){let a=o;switch(r){case Boolean:a=o!==null;break;case Number:a=o===null?null:Number(o);break;case Object:case Array:try{a=JSON.parse(o)}catch(t){a=null}}return a}},zo=(o,r)=>!Na(o,r),Ur={attribute:!0,type:String,converter:bo,reflect:!1,useDefault:!1,hasChanged:zo};Symbol.metadata??=Symbol("metadata"),$o.litPropertyMetadata??=new WeakMap;class U extends HTMLElement{static addInitializer(o){this._$Ei(),(this.l??=[]).push(o)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(o,r=Ur){if(r.state&&(r.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(o)&&((r=Object.create(r)).wrapped=!0),this.elementProperties.set(o,r),!r.noAccessor){let a=Symbol(),t=this.getPropertyDescriptor(o,a,r);t!==void 0&&Va(this.prototype,o,t)}}static getPropertyDescriptor(o,r,a){let{get:t,set:i}=Da(this.prototype,o)??{get(){return this[r]},set(e){this[r]=e}};return{get:t,set(e){let s=t?.call(this);i?.call(this,e),this.requestUpdate(o,s,a)},configurable:!0,enumerable:!0}}static getPropertyOptions(o){return this.elementProperties.get(o)??Ur}static _$Ei(){if(this.hasOwnProperty(xo("elementProperties")))return;let o=Wa(this);o.finalize(),o.l!==void 0&&(this.l=[...o.l]),this.elementProperties=new Map(o.elementProperties)}static finalize(){if(this.hasOwnProperty(xo("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(xo("properties"))){let r=this.properties,a=[...Xa(r),...Pa(r)];for(let t of a)this.createProperty(t,r[t])}let o=this[Symbol.metadata];if(o!==null){let r=litPropertyMetadata.get(o);if(r!==void 0)for(let[a,t]of r)this.elementProperties.set(a,t)}this._$Eh=new Map;for(let[r,a]of this.elementProperties){let t=this._$Eu(r,a);t!==void 0&&this._$Eh.set(t,r)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(o){let r=[];if(Array.isArray(o)){let a=new Set(o.flat(1/0).reverse());for(let t of a)r.unshift(Eo(t))}else o!==void 0&&r.push(Eo(o));return r}static _$Eu(o,r){let a=r.attribute;return a===!1?void 0:typeof a=="string"?a:typeof o=="string"?o.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise((o)=>this.enableUpdating=o),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach((o)=>o(this))}addController(o){(this._$EO??=new Set).add(o),this.renderRoot!==void 0&&this.isConnected&&o.hostConnected?.()}removeController(o){this._$EO?.delete(o)}_$E_(){let o=new Map,r=this.constructor.elementProperties;for(let a of r.keys())this.hasOwnProperty(a)&&(o.set(a,this[a]),delete this[a]);o.size>0&&(this._$Ep=o)}createRenderRoot(){let o=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Zr(o,this.constructor.elementStyles),o}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach((o)=>o.hostConnected?.())}enableUpdating(o){}disconnectedCallback(){this._$EO?.forEach((o)=>o.hostDisconnected?.())}attributeChangedCallback(o,r,a){this._$AK(o,a)}_$ET(o,r){let a=this.constructor.elementProperties.get(o),t=this.constructor._$Eu(o,a);if(t!==void 0&&a.reflect===!0){let i=(a.converter?.toAttribute!==void 0?a.converter:bo).toAttribute(r,a.type);this._$Em=o,i==null?this.removeAttribute(t):this.setAttribute(t,i),this._$Em=null}}_$AK(o,r){let a=this.constructor,t=a._$Eh.get(o);if(t!==void 0&&this._$Em!==t){let i=a.getPropertyOptions(t),e=typeof i.converter=="function"?{fromAttribute:i.converter}:i.converter?.fromAttribute!==void 0?i.converter:bo;this._$Em=t;let s=e.fromAttribute(r,i.type);this[t]=s??this._$Ej?.get(t)??s,this._$Em=null}}requestUpdate(o,r,a,t=!1,i){if(o!==void 0){let e=this.constructor;if(t===!1&&(i=this[o]),a??=e.getPropertyOptions(o),!((a.hasChanged??zo)(i,r)||a.useDefault&&a.reflect&&i===this._$Ej?.get(o)&&!this.hasAttribute(e._$Eu(o,a))))return;this.C(o,r,a)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(o,r,{useDefault:a,reflect:t,wrapped:i},e){a&&!(this._$Ej??=new Map).has(o)&&(this._$Ej.set(o,e??r??this[o]),i!==!0||e!==void 0)||(this._$AL.has(o)||(this.hasUpdated||a||(r=void 0),this._$AL.set(o,r)),t===!0&&this._$Em!==o&&(this._$Eq??=new Set).add(o))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(r){Promise.reject(r)}let o=this.scheduleUpdate();return o!=null&&await o,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[t,i]of this._$Ep)this[t]=i;this._$Ep=void 0}let a=this.constructor.elementProperties;if(a.size>0)for(let[t,i]of a){let{wrapped:e}=i,s=this[t];e!==!0||this._$AL.has(t)||s===void 0||this.C(t,void 0,i,s)}}let o=!1,r=this._$AL;try{o=this.shouldUpdate(r),o?(this.willUpdate(r),this._$EO?.forEach((a)=>a.hostUpdate?.()),this.update(r)):this._$EM()}catch(a){throw o=!1,this._$EM(),a}o&&this._$AE(r)}willUpdate(o){}_$AE(o){this._$EO?.forEach((r)=>r.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(o)),this.updated(o)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(o){return!0}update(o){this._$Eq&&=this._$Eq.forEach((r)=>this._$ET(r,this[r])),this._$EM()}updated(o){}firstUpdated(o){}}U.elementStyles=[],U.shadowRootOptions={mode:"open"},U[xo("elementProperties")]=new Map,U[xo("finalized")]=new Map,Sa?.({ReactiveElement:U}),($o.reactiveElementVersions??=[]).push("2.1.2");var Uo=globalThis,Yr=(o)=>o,jo=Uo.trustedTypes,Cr=jo?jo.createPolicy("lit-html",{createHTML:(o)=>o}):void 0;var Y=`lit$${Math.random().toFixed(9).slice(2)}$`,Pr="?"+Y,ot=`<${Pr}>`,X=document,ho=()=>X.createComment(""),fo=(o)=>o===null||typeof o!="object"&&typeof o!="function",Yo=Array.isArray,rt=(o)=>Yo(o)||typeof o?.[Symbol.iterator]=="function";var vo=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Or=/-->/g,Nr=/>/g,V=RegExp(`>|[ 	
\f\r](?:([^\\s"'>=/]+)([ 	
\f\r]*=[ 	
\f\r]*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Vr=/'/g,Dr=/"/g,Wr=/^(?:script|style|textarea|title)$/i,Co=(o)=>(r,...a)=>({_$litType$:o,strings:r,values:a}),b=Co(1),Hi=Co(2),Bi=Co(3),P=Symbol.for("lit-noChange"),z=Symbol.for("lit-nothing"),Xr=new WeakMap,D=X.createTreeWalker(X,129);function Ir(o,r){if(!Yo(o)||!o.hasOwnProperty("raw"))throw Error("invalid template strings array");return Cr!==void 0?Cr.createHTML(r):r}var at=(o,r)=>{let a=o.length-1,t=[],i,e=r===2?"<svg>":r===3?"<math>":"",s=vo;for(let d=0;d<a;d++){let l=o[d],c,p,g=-1,u=0;for(;u<l.length&&(s.lastIndex=u,p=s.exec(l),p!==null);)u=s.lastIndex,s===vo?p[1]==="!--"?s=Or:p[1]!==void 0?s=Nr:p[2]!==void 0?(Wr.test(p[2])&&(i=RegExp("</"+p[2],"g")),s=V):p[3]!==void 0&&(s=V):s===V?p[0]===">"?(s=i??vo,g=-1):p[1]===void 0?g=-2:(g=s.lastIndex-p[2].length,c=p[1],s=p[3]===void 0?V:p[3]==='"'?Dr:Vr):s===Dr||s===Vr?s=V:s===Or||s===Nr?s=vo:(s=V,i=void 0);let h=s===V&&o[d+1].startsWith("/>")?" ":"";e+=s===vo?l+ot:g>=0?(t.push(c),l.slice(0,g)+"$lit$"+l.slice(g)+Y+h):l+Y+(g===-2?d:h)}return[Ir(o,e+(o[a]||"<?>")+(r===2?"</svg>":r===3?"</math>":"")),t]};class uo{constructor({strings:o,_$litType$:r},a){let t;this.parts=[];let i=0,e=0,s=o.length-1,d=this.parts,[l,c]=at(o,r);if(this.el=uo.createElement(l,a),D.currentNode=this.el.content,r===2||r===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(t=D.nextNode())!==null&&d.length<s;){if(t.nodeType===1){if(t.hasAttributes())for(let p of t.getAttributeNames())if(p.endsWith("$lit$")){let g=c[e++],u=t.getAttribute(p).split(Y),h=/([.?@])?(.*)/.exec(g);d.push({type:1,index:i,name:h[2],strings:u,ctor:h[1]==="."?oa:h[1]==="?"?ra:h[1]==="@"?aa:mo}),t.removeAttribute(p)}else p.startsWith(Y)&&(d.push({type:6,index:i}),t.removeAttribute(p));if(Wr.test(t.tagName)){let p=t.textContent.split(Y),g=p.length-1;if(g>0){t.textContent=jo?jo.emptyScript:"";for(let u=0;u<g;u++)t.append(p[u],ho()),D.nextNode(),d.push({type:2,index:++i});t.append(p[g],ho())}}}else if(t.nodeType===8)if(t.data===Pr)d.push({type:2,index:i});else{let p=-1;for(;(p=t.data.indexOf(Y,p+1))!==-1;)d.push({type:7,index:i}),p+=Y.length-1}i++}}static createElement(o,r){let a=X.createElement("template");return a.innerHTML=o,a}}function to(o,r,a=o,t){if(r===P)return r;let i=t!==void 0?a._$Co?.[t]:a._$Cl,e=fo(r)?void 0:r._$litDirective$;return i?.constructor!==e&&(i?._$AO?.(!1),e===void 0?i=void 0:(i=new e(o),i._$AT(o,a,t)),t!==void 0?(a._$Co??=[])[t]=i:a._$Cl=i),i!==void 0&&(r=to(o,i._$AS(o,r.values),i,t)),r}class Sr{constructor(o,r){this._$AV=[],this._$AN=void 0,this._$AD=o,this._$AM=r}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(o){let{el:{content:r},parts:a}=this._$AD,t=(o?.creationScope??X).importNode(r,!0);D.currentNode=t;let i=D.nextNode(),e=0,s=0,d=a[0];for(;d!==void 0;){if(e===d.index){let l;d.type===2?l=new _o(i,i.nextSibling,this,o):d.type===1?l=new d.ctor(i,d.name,d.strings,this,o):d.type===6&&(l=new ta(i,this,o)),this._$AV.push(l),d=a[++s]}e!==d?.index&&(i=D.nextNode(),e++)}return D.currentNode=X,t}p(o){let r=0;for(let a of this._$AV)a!==void 0&&(a.strings!==void 0?(a._$AI(o,a,r),r+=a.strings.length-2):a._$AI(o[r])),r++}}class _o{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(o,r,a,t){this.type=2,this._$AH=z,this._$AN=void 0,this._$AA=o,this._$AB=r,this._$AM=a,this.options=t,this._$Cv=t?.isConnected??!0}get parentNode(){let o=this._$AA.parentNode,r=this._$AM;return r!==void 0&&o?.nodeType===11&&(o=r.parentNode),o}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(o,r=this){o=to(this,o,r),fo(o)?o===z||o==null||o===""?(this._$AH!==z&&this._$AR(),this._$AH=z):o!==this._$AH&&o!==P&&this._(o):o._$litType$!==void 0?this.$(o):o.nodeType!==void 0?this.T(o):rt(o)?this.k(o):this._(o)}O(o){return this._$AA.parentNode.insertBefore(o,this._$AB)}T(o){this._$AH!==o&&(this._$AR(),this._$AH=this.O(o))}_(o){this._$AH!==z&&fo(this._$AH)?this._$AA.nextSibling.data=o:this.T(X.createTextNode(o)),this._$AH=o}$(o){let{values:r,_$litType$:a}=o,t=typeof a=="number"?this._$AC(o):(a.el===void 0&&(a.el=uo.createElement(Ir(a.h,a.h[0]),this.options)),a);if(this._$AH?._$AD===t)this._$AH.p(r);else{let i=new Sr(t,this),e=i.u(this.options);i.p(r),this.T(e),this._$AH=i}}_$AC(o){let r=Xr.get(o.strings);return r===void 0&&Xr.set(o.strings,r=new uo(o)),r}k(o){Yo(this._$AH)||(this._$AH=[],this._$AR());let r=this._$AH,a,t=0;for(let i of o)t===r.length?r.push(a=new _o(this.O(ho()),this.O(ho()),this,this.options)):a=r[t],a._$AI(i),t++;t<r.length&&(this._$AR(a&&a._$AB.nextSibling,t),r.length=t)}_$AR(o=this._$AA.nextSibling,r){for(this._$AP?.(!1,!0,r);o!==this._$AB;){let a=Yr(o).nextSibling;Yr(o).remove(),o=a}}setConnected(o){this._$AM===void 0&&(this._$Cv=o,this._$AP?.(o))}}class mo{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(o,r,a,t,i){this.type=1,this._$AH=z,this._$AN=void 0,this.element=o,this.name=r,this._$AM=t,this.options=i,a.length>2||a[0]!==""||a[1]!==""?(this._$AH=Array(a.length-1).fill(new String),this.strings=a):this._$AH=z}_$AI(o,r=this,a,t){let i=this.strings,e=!1;if(i===void 0)o=to(this,o,r,0),e=!fo(o)||o!==this._$AH&&o!==P,e&&(this._$AH=o);else{let s=o,d,l;for(o=i[0],d=0;d<i.length-1;d++)l=to(this,s[a+d],r,d),l===P&&(l=this._$AH[d]),e||=!fo(l)||l!==this._$AH[d],l===z?o=z:o!==z&&(o+=(l??"")+i[d+1]),this._$AH[d]=l}e&&!t&&this.j(o)}j(o){o===z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,o??"")}}class oa extends mo{constructor(){super(...arguments),this.type=3}j(o){this.element[this.name]=o===z?void 0:o}}class ra extends mo{constructor(){super(...arguments),this.type=4}j(o){this.element.toggleAttribute(this.name,!!o&&o!==z)}}class aa extends mo{constructor(o,r,a,t,i){super(o,r,a,t,i),this.type=5}_$AI(o,r=this){if((o=to(this,o,r,0)??z)===P)return;let a=this._$AH,t=o===z&&a!==z||o.capture!==a.capture||o.once!==a.once||o.passive!==a.passive,i=o!==z&&(a===z||t);t&&this.element.removeEventListener(this.name,this,a),i&&this.element.addEventListener(this.name,this,o),this._$AH=o}handleEvent(o){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,o):this._$AH.handleEvent(o)}}class ta{constructor(o,r,a){this.element=o,this.type=6,this._$AN=void 0,this._$AM=r,this.options=a}get _$AU(){return this._$AM._$AU}_$AI(o){to(this,o)}}var tt=Uo.litHtmlPolyfillSupport;tt?.(uo,_o),(Uo.litHtmlVersions??=[]).push("3.3.2");var ia=(o,r,a)=>{let t=a?.renderBefore??r,i=t._$litPart$;if(i===void 0){let e=a?.renderBefore??null;t._$litPart$=i=new _o(r.insertBefore(ho(),e),e,void 0,a??{})}return i._$AI(o),i};var Oo=globalThis;class K extends U{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let o=super.createRenderRoot();return this.renderOptions.renderBefore??=o.firstChild,o}update(o){let r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(o),this._$Do=ia(r,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return P}}K._$litElement$=!0,K.finalized=!0,Oo.litElementHydrateSupport?.({LitElement:K});var it=Oo.litElementPolyfillSupport;it?.({LitElement:K});(Oo.litElementVersions??=[]).push("4.2.2");var Go=(o)=>(r,a)=>{a!==void 0?a.addInitializer(()=>{customElements.define(o,r)}):customElements.define(o,r)};var nt={attribute:!0,type:String,converter:bo,reflect:!1,hasChanged:zo},et=(o=nt,r,a)=>{let{kind:t,metadata:i}=a,e=globalThis.litPropertyMetadata.get(i);if(e===void 0&&globalThis.litPropertyMetadata.set(i,e=new Map),t==="setter"&&((o=Object.create(o)).wrapped=!0),e.set(a.name,o),t==="accessor"){let{name:s}=a;return{set(d){let l=r.get.call(this);r.set.call(this,d),this.requestUpdate(s,l,o,!0,d)},init(d){return d!==void 0&&this.C(s,void 0,o,d),d}}}if(t==="setter"){let{name:s}=a;return function(d){let l=this[s];r.call(this,d),this.requestUpdate(s,l,o,!0,d)}}throw Error("Unsupported decorator location: "+t)};function Q(o){return(r,a)=>typeof a=="object"?et(o,r,a):((t,i,e)=>{let s=i.hasOwnProperty(e);return i.constructor.createProperty(e,t),s?Object.getOwnPropertyDescriptor(i,e):void 0})(o,r,a)}function q(o){return Q({...o,state:!0,attribute:!1})}var W=(o,r,a)=>(a.configurable=!0,a.enumerable=!0,Reflect.decorate&&typeof r!="object"&&Object.defineProperty(o,r,a),a);function na(o,r){return(a,t,i)=>{let e=(s)=>s.renderRoot?.querySelector(o)??null;if(r){let{get:s,set:d}=typeof t=="object"?a:i??(()=>{let l=Symbol();return{get(){return this[l]},set(c){this[l]=c}}})();return W(a,t,{get(){let l=s.call(this);return l===void 0&&(l=e(this),(l!==null||this.hasUpdated)&&d.call(this,l)),l}})}return W(a,t,{get(){return e(this)}})}}B();_();var st={allowedTags:["h1","h2","h3","h4","h5","h6","p","br","div","span","strong","b","em","i","u","s","strike","a","img","ul","ol","li","pre","code","blockquote","label","input"],allowedAttrs:{"*":["style","class"],a:["href","title","target"],img:["src","alt","title","width","height"],input:["type","id","checked"],label:["for"]},allowedSchemes:["http","https","data","mailto"]};class ea{config;constructor(o){this.config={...st,...o}}sanitize(o){if(!o||typeof o!=="string")return"";let a=new DOMParser().parseFromString(o,"text/html");return this.cleanNode(a.body),a.body.innerHTML}cleanNode(o){let r=Array.from(o.childNodes);for(let a=r.length-1;a>=0;a--){let t=r[a];if(t.nodeType===Node.TEXT_NODE)continue;if(t.nodeType===Node.COMMENT_NODE){o.removeChild(t);continue}if(t.nodeType===Node.ELEMENT_NODE){let i=t,e=i.tagName.toLowerCase();if(!this.config.allowedTags.includes(e)){o.removeChild(t);continue}this.cleanAttributes(i),this.cleanNode(i)}else o.removeChild(t)}}cleanAttributes(o){let r=o.tagName.toLowerCase(),a=[...this.config.allowedAttrs["*"]||[],...this.config.allowedAttrs[r]||[]],t=Array.from(o.attributes);for(let i of t){let e=i.name.toLowerCase();if(!a.includes(e)){o.removeAttribute(i.name);continue}if(e==="href"||e==="src"){let s=i.value.trim();if(this.isDangerousUrl(s)){o.removeAttribute(i.name);continue}}if(e==="style"){let s=this.sanitizeStyle(i.value);if(s!==i.value)o.setAttribute("style",s)}if(r==="input"&&e==="type"){if(i.value.toLowerCase()!=="checkbox")o.setAttribute("type","checkbox")}}}isDangerousUrl(o){let r=o.toLowerCase().trim();if(r.startsWith("javascript:"))return!0;if(r.startsWith("data:")&&r.includes("script"))return!0;if(r.startsWith("vbscript:"))return!0;if(r.includes(":")){let a=r.split(":")[0];if(!this.config.allowedSchemes.includes(a))return!0}return!1}sanitizeStyle(o){let r=["behavior","expression","moz-binding","-o-link","-o-link-source","import","@import"],a=o;for(let t of r){let i=new RegExp(t,"gi");a=a.replace(i,"")}return a=a.replace(/url\s*\(\s*['"]?javascript:/gi,"url(about:blank"),a}}var I=new ea;class Fo{static parse(o){try{if(typeof o==="object"&&o!==null)return o;if(typeof o==="string"){let r=JSON.parse(o);if(typeof r==="object"&&r!==null)return r}return{widgetId:"unknown"}}catch(r){return console.warn("[WidgetContentHelper] Failed to parse content:",r),{widgetId:"unknown"}}}static serialize(o){try{return JSON.stringify(o)}catch(r){return console.error("[WidgetContentHelper] Failed to serialize content:",r),"{}"}}static getNotepadText(o){return this.parse(o).text||""}static setNotepadText(o,r){let t={...this.parse(o),widgetId:"notepad",text:r};return this.serialize(t)}static merge(o,r){let t={...this.parse(o),...r};return this.serialize(t)}static validate(o,r){return this.parse(o).widgetId===r}}_();class No extends K{constructor(){super(...arguments);this.blockId="";this.items=[];this.readonly=!1;this.focusedItemId=null}static styles=go`
        :host {
            display: block;
            background: var(--surface);
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
            position: relative;
            isolation: isolate;
            z-index: 1;
        }

        /* Reset all potential inherited styles */
        * {
            box-sizing: border-box;
        }

        .checklist-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .checklist-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
        }

        .checklist-item input[type="checkbox"] {
            flex-shrink: 0;
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--accent);
        }

        .checklist-item input[type="text"] {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: var(--text);
            font-size: 14px;
            font-family: inherit;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .checklist-item input[type="text"]:focus {
            background: var(--surface-hover);
        }

        .checklist-item input[type="text"].checked {
            text-decoration: line-through;
            opacity: 0.6;
        }

        .checklist-item .delete-btn {
            flex-shrink: 0;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s, background 0.2s;
            font-size: 16px;
            line-height: 1;
        }

        .checklist-item:hover .delete-btn {
            opacity: 1;
        }

        .checklist-item .delete-btn:hover {
            background: var(--error);
            color: white;
        }

        .add-item-btn {
            all: unset;
            display: block;
            box-sizing: border-box;
            background: transparent;
            border: 1px dashed var(--border);
            color: var(--text-secondary);
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
            margin-top: 8px;
            transition: all 0.2s;
            width: 100%;
            text-align: left;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            position: relative;
            z-index: 2;
            isolation: isolate;
        }

        .add-item-btn::before,
        .add-item-btn::after {
            content: none;
        }

        .add-item-btn:hover {
            background: var(--surface-hover);
            border-color: var(--accent);
            color: var(--accent);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .add-item-btn:active {
            transform: scale(0.98);
        }

        .empty-state {
            text-align: center;
            color: var(--text-secondary);
            font-size: 13px;
            padding: 20px;
        }
    `;generateId(){return"item-"+Math.random().toString(36).substring(2,11)}addItem(){let o={id:this.generateId(),checked:!1,text:""};this.items=[...this.items,o],this.focusedItemId=o.id,this.dispatchChangeEvent(),this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`input[data-item-id="${o.id}"]`)?.focus()})}addItemAfter(o){let r=this.items.findIndex((i)=>i.id===o);if(r===-1)return;let a={id:this.generateId(),checked:!1,text:""},t=[...this.items];t.splice(r+1,0,a),this.items=t,this.focusedItemId=a.id,this.dispatchChangeEvent(),this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`input[data-item-id="${a.id}"]`)?.focus()})}deleteItem(o){if(this.items.length===1){this.updateItemText(o,"");return}let r=this.items.findIndex((i)=>i.id===o);if(r===-1)return;let a=r>0?r-1:r+1,t=this.items[a]?.id;if(this.items=this.items.filter((i)=>i.id!==o),this.dispatchChangeEvent(),t)this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`input[data-item-id="${t}"]`)?.focus()})}toggleItem(o){this.items=this.items.map((r)=>r.id===o?{...r,checked:!r.checked}:r),this.dispatchChangeEvent()}updateItemText(o,r){this.items=this.items.map((a)=>a.id===o?{...a,text:r}:a),this.dispatchChangeEvent()}handleItemKeydown(o,r){let a=o.target,t=this.items.find((i)=>i.id===r);if(!t)return;if(o.key==="Enter"){if(o.preventDefault(),!t.text.trim())return;this.addItemAfter(r)}else if(o.key==="Backspace"&&a.selectionStart===0&&a.selectionEnd===0){if(!t.text.trim())o.preventDefault(),this.deleteItem(r)}else if(o.key==="ArrowUp"){o.preventDefault();let i=this.items.findIndex((e)=>e.id===r);if(i>0){let e=this.items[i-1].id;this.shadowRoot?.querySelector(`input[data-item-id="${e}"]`)?.focus()}}else if(o.key==="ArrowDown"){o.preventDefault();let i=this.items.findIndex((e)=>e.id===r);if(i<this.items.length-1){let e=this.items[i+1].id;this.shadowRoot?.querySelector(`input[data-item-id="${e}"]`)?.focus()}}}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("checklist-change",{detail:{blockId:this.blockId,items:this.items},bubbles:!0,composed:!0}))}render(){if(this.items.length===0)return b`
                <div class="empty-state">
                    ${n.t("widget.notepad.checklist.empty")}
                </div>
                ${!this.readonly?b`
                    <button class="add-item-btn" @click="${()=>this.addItem()}">
                        + ${n.t("widget.notepad.checklist.add_first")}
                    </button>
                `:""}
            `;return b`
            <div class="checklist-items">
                ${this.items.map((o)=>b`
                    <div class="checklist-item">
                        <input
                            type="checkbox"
                            .checked="${o.checked}"
                            @change="${()=>this.toggleItem(o.id)}"
                        />
                        <input
                            type="text"
                            class="${o.checked?"checked":""}"
                            .value="${o.text}"
                            data-item-id="${o.id}"
                            placeholder="${n.t("widget.notepad.checklist.placeholder")}"
                            ?readonly="${this.readonly}"
                            @input="${(r)=>this.updateItemText(o.id,r.target.value)}"
                            @keydown="${(r)=>this.handleItemKeydown(r,o.id)}"
                        />
                        ${!this.readonly?b`
                            <button
                                class="delete-btn"
                                @click="${()=>this.deleteItem(o.id)}"
                                title="${n.t("widget.notepad.checklist.delete_item")}"
                            >
                                ×
                            </button>
                        `:""}
                    </div>
                `)}
            </div>
            ${!this.readonly?b`
                <button class="add-item-btn" @click="${()=>this.addItem()}">
                    + ${n.t("widget.notepad.checklist.add_item")}
                </button>
            `:""}
        `}}j([Q({type:String}),F("design:type",String)],No.prototype,"blockId",void 0),j([Q({type:Array}),F("design:type",Array)],No.prototype,"items",void 0),j([Q({type:Boolean}),F("design:type",Boolean)],No.prototype,"readonly",void 0),j([q(),F("design:type",String)],No.prototype,"focusedItemId",void 0),No=j([Go("checklist-block")],No);var y={bold:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`,italic:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,underline:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,strike:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,h1:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,h2:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,list:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,listOrdered:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,checklist:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`,link:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,image:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,color:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>`,undo:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,redo:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>`,alignLeft:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,alignCenter:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>`,alignRight:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,alignJustify:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,code:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,clear:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,edit:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,save:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,loader:b`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`},Lo=50000,sa=1e4;class Vo extends K{constructor(){super(...arguments);this.itemId=0;this.content="";this.isInternalEditing=!1;this.isDashboardEditing=!1;this.isSaving=!1;this.characterCount=0;this.hasUnsavedChanges=!1;this.checklistBlocks=[]}_unsubscribe;_autosaveTimeout=null;_savePromise=null;_lastSavedContent="";static styles=go`
        :host {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: var(--surface);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            color: var(--text-main);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            position: relative;
        }

        .container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
            width: 100%;
            height: 100%;
            /* Ocultar scrollbar pero mantener funcionalidad */
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
        }

        .container::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
        }

        /* Ocultar scrollbars en todos los elementos scrollables */
        * {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
        }

        *::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
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
            color: var(--text-dim);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            transition: all 0.15s ease;
        }
        button:hover:not(:disabled) {
            background: var(--surface-hover);
            color: var(--text-main);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
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

        /* Fixed Controls Container */
        .fixed-controls {
            position: absolute;
            bottom: 0;
            right: 0;
            pointer-events: none;
            z-index: 200;
        }

        .fixed-controls > * {
            pointer-events: auto;
        }

        /* Character Counter (bottom right, below FAB button) */
        .char-counter-bottom {
            position: absolute;
            bottom: 15px;
            right: 15px;
            font-size: 11px;
            color: var(--text-secondary);
            background: var(--surface);
            padding: 4px 10px;
            border-radius: 12px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            opacity: 0.7;
            transition: opacity 0.2s;
            z-index: 100;
        }
        .char-counter-bottom:hover {
            opacity: 1;
        }
        .char-counter-bottom.warning {
            color: #ffa500;
            font-weight: 600;
        }
        .char-counter-bottom.error {
            color: #ff4757;
            font-weight: 700;
            opacity: 1;
        }

        /* Autosave Indicator */
        .autosave-indicator {
            font-size: 10px;
            color: var(--text-dim);
            padding: 0 6px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .autosave-indicator.visible {
            opacity: 1;
        }
        .autosave-indicator.saving {
            color: #ffa500;
        }
        .autosave-indicator.saved {
            color: #2ecc71;
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
            color: var(--text-main) !important;
            word-break: break-word;
            outline: none;
            display: block;
            width: 100%;
            height: 100%;
            min-height: 0;
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
            bottom: 70px; /* Moved up to make space for counter below */
            right: 15px;
            z-index: 100;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--accent, #0078d4);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            transform: translateY(10px);
        }

        :host(:hover) .fab-btn:not(:disabled),
        .fab-btn:focus-visible {
            opacity: 1;
            transform: translateY(0);
        }

        .fab-btn:hover:not(:disabled) {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            filter: brightness(1.1);
        }

        .fab-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
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
        .save-btn:hover:not(:disabled) { background: #ff6b81; }

        /* Spinner Animation */
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .fab-btn.saving svg {
            animation: spin 1s linear infinite;
        }

        /* Typography Styles */
        h1 { font-size: 1.6em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.2em; margin-top:0;}
        h2 { font-size: 1.4em; margin-top:0.5em;}
        a { color: var(--accent, #ff4757); }
        blockquote { border-left: 3px solid var(--accent, #ff4757); padding-left: 1em; color: rgba(255,255,255,0.6); }
        img { max-width: 100%; border-radius: 8px; }

        /* Code Block Styles */
        pre {
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 4px;
            font-family: monospace;
            margin: 8px 0;
            width: fit-content;
            max-width: 100%;
            overflow-x: auto;
            display: block;
        }
        pre code {
            background: transparent;
            padding: 0;
            display: block;
            width: fit-content;
        }

        /* Checklist Styles */
        .content-area input[type="checkbox"] {
            cursor: pointer;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }
        .content-area label {
            flex: 1;
            min-width: 0;
        }

        /* Error State */
        .error-state {
            padding: 20px;
            color: var(--text-main);
            text-align: center;
        }
        .error-state h3 {
            color: #ff4757;
            margin-top: 0;
        }
        .error-state button {
            margin-top: 16px;
            padding: 8px 16px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            min-width: auto;
            height: auto;
        }
        .error-state details {
            margin-top: 16px;
            text-align: left;
        }
        .error-state pre {
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 4px;
            overflow: auto;
            font-size: 11px;
        }

        /* Checklist Block Wrapper */
        .checklist-block-wrapper {
            position: relative;
            width: 85%;
            margin: 12px 0;
            padding: 0 8px;
        }

        .delete-block-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s, background 0.2s;
            font-size: 20px;
            line-height: 1;
            z-index: 10;
        }

        .checklist-block-wrapper:hover .delete-block-btn {
            opacity: 1;
        }

        .delete-block-btn:hover {
            background: var(--error);
            color: white;
        }
    `;connectedCallback(){super.connectedCallback(),this._unsubscribe=x.subscribe((r)=>{let a=this.isDashboardEditing;if(this.isDashboardEditing=r.isEditing||!1,a!==this.isDashboardEditing)if(this.isDashboardEditing)if(this.hasUnsavedChanges&&this.isInternalEditing)if(confirm(n.t("widget.notepad.confirm_discard")))this.isInternalEditing=!1,this.hasUnsavedChanges=!1,this.cancelAutosave(),this.requestUpdate();else setTimeout(()=>x.toggleEditMode(),0);else this.isInternalEditing=!1,this.cancelAutosave(),this.requestUpdate();else this.loadFromStore()});let o=x.getState();this.isDashboardEditing=o.isEditing||!1,this.loadFromStore()}disconnectedCallback(){if(super.disconnectedCallback(),this._unsubscribe)this._unsubscribe();this.cancelAutosave()}updated(o){if(super.updated(o),o.has("content")&&!this.isInternalEditing&&this.editorElement){let r=I.sanitize(this.content);if(this.editorElement.innerHTML!==r)this.editorElement.innerHTML=r}}loadFromStore(){if(!this.itemId)return;let r=x.getState().items.find((a)=>a.id===this.itemId);if(r){let a=Fo.getNotepadText(r.content);try{let t=JSON.parse(a);if(t&&typeof t==="object"&&"html"in t)this.content=t.html||"",this.checklistBlocks=t.checklists||[];else this.content=a,this.checklistBlocks=[]}catch{this.content=a,this.checklistBlocks=[]}this.characterCount=this.content.length,this._lastSavedContent=a}}exec(o,r){if(document.execCommand(o,!1,r),this.editorElement)this.editorElement.focus()}cancelAutosave(){if(this._autosaveTimeout)clearTimeout(this._autosaveTimeout),this._autosaveTimeout=null}async saveContent(o=!1){if(this._savePromise){await this._savePromise;return}try{let r=this.shadowRoot?.querySelector(".editor")||this.shadowRoot?.querySelector("[contenteditable]");if(!r)throw Error("Critical: Editor element missing");let a=r.innerHTML;if(a.length>Lo){alert(n.t("widget.notepad.error.too_large"));return}let t=I.sanitize(a),i=JSON.stringify({html:t,checklists:this.checklistBlocks});if(!o)this.content=t,this.characterCount=t.length,this.isInternalEditing=!1,this.hasUnsavedChanges=!1,this.requestUpdate();this._savePromise=(async()=>{if(!this.itemId)return;if(!o)this.isSaving=!0,this.requestUpdate();try{let e=x.getState().items.find((d)=>d.id===this.itemId);if(!e){console.warn("[NotepadWidget] Item no longer exists");return}let s=Fo.setNotepadText(e.content,i);if(await x.updateItem({id:this.itemId,content:s}),this._lastSavedContent=i,o)this.hasUnsavedChanges=!1}catch(e){if(console.error("[NotepadWidget] Save failed:",e),!o)alert(n.t("widget.notepad.error.save")+e)}finally{if(!o)this.isSaving=!1,this.requestUpdate()}})(),await this._savePromise}catch(r){if(console.error("[NotepadWidget] Save error:",r),!o)alert(n.t("widget.notepad.error.save")+r)}finally{this._savePromise=null}}startEditing(){if(this.isDashboardEditing)return;this.isInternalEditing=!0,setTimeout(()=>{if(this.editorElement){this.editorElement.focus();let o=I.sanitize(this.content);if(this.editorElement.innerHTML!==o)this.editorElement.innerHTML=o;this.focusEditor(!0)}},0)}focusEditor(o=!0){if(!this.editorElement)return;if(this.editorElement.focus(),o){let r=window.getSelection();if(r){let a=document.createRange();a.selectNodeContents(this.editorElement),a.collapse(!1),r.removeAllRanges(),r.addRange(a)}}}handleColor(o){let r=o.target;this.exec("foreColor",r.value)}handleToolbarWheel(o){o.preventDefault();let r=o.currentTarget;r.scrollLeft+=o.deltaY}insertChecklist(){let o="block-"+Math.random().toString(36).substring(2,11),r={id:o,items:[{id:"item-"+Math.random().toString(36).substring(2,11),checked:!1,text:""}]};this.checklistBlocks=[...this.checklistBlocks,r],this.hasUnsavedChanges=!0,this.scheduleAutosave(),this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`checklist-block[block-id="${o}"]`)?.shadowRoot?.querySelector('input[type="text"]')?.focus()})}insertCode(){let r=`<pre><code>${n.t("widget.notepad.prompt.code_block")}</code></pre><p><br></p>`;this.exec("insertHTML",r),setTimeout(()=>{let a=window.getSelection();if(a&&this.editorElement){let t=this.editorElement.querySelectorAll("code"),i=t[t.length-1];if(i){let e=document.createRange();e.selectNodeContents(i),a.removeAllRanges(),a.addRange(e)}}},0)}handleChecklistChange(o){let{blockId:r,items:a}=o.detail;this.checklistBlocks=this.checklistBlocks.map((t)=>t.id===r?{...t,items:a}:t),this.hasUnsavedChanges=!0,this.scheduleAutosave()}deleteChecklistBlock(o){this.checklistBlocks=this.checklistBlocks.filter((r)=>r.id!==o),this.hasUnsavedChanges=!0,this.scheduleAutosave()}handleEditorInput(o){let r=o.target;if(this.characterCount=r.innerHTML.length,this.hasUnsavedChanges=r.innerHTML!==this._lastSavedContent,this.cancelAutosave(),sa>0)this._autosaveTimeout=setTimeout(()=>{if(this.hasUnsavedChanges)this.saveContent(!0)},sa)}handleEditorKeydown(o){if(o.ctrlKey||o.metaKey)switch(o.key.toLowerCase()){case"b":o.preventDefault(),this.exec("bold");return;case"i":o.preventDefault(),this.exec("italic");return;case"s":o.preventDefault(),this.saveContent(!1);return;case"z":if(o.shiftKey)o.preventDefault(),this.exec("redo");else o.preventDefault(),this.exec("undo");return;case"k":o.preventDefault();let r=prompt(n.t("widget.notepad.prompt.url"));if(r)this.exec("createLink",r);return}}handlePaste(o){let r=o.clipboardData?.items;if(!r)return;for(let a of Array.from(r))if(a.type.indexOf("image")!==-1){o.preventDefault();let t=a.getAsFile();if(!t)continue;let i=new FileReader;i.onload=(e)=>{let s=e.target?.result;if(s.length>1e6){alert(n.t("widget.notepad.error.image_too_large"));return}this.exec("insertImage",s)},i.readAsDataURL(t);return}}render(){try{if(!this.isInternalEditing){let t=I.sanitize(this.content)||`<span style='opacity:0.5; font-style:italic; color: var(--text-dim);'>${n.t("widget.notepad.placeholder")}</span>`;return b`
                    <div style="flex: 1; width: 100%; height: 100%; min-height: 100px; overflow-y: auto; display: flex; flex-direction: column;">
                        <div
                            class="viewer"
                            style="padding: 16px; color: var(--text-main) !important; word-wrap: break-word;"
                            .innerHTML="${t}"
                        ></div>

                        <!-- Render checklist blocks in view mode (read-only) -->
                        ${this.checklistBlocks.map((i)=>b`
                            <div class="checklist-block-wrapper">
                                <checklist-block
                                    .blockId="${i.id}"
                                    .items="${i.items}"
                                    .readonly="${!0}"
                                    @checklist-change="${()=>{}}"
                                ></checklist-block>
                            </div>
                        `)}
                    </div>

                    <button
                        class="fab-btn edit-btn"
                        @click="${this.startEditing}"
                        ?disabled="${this.isDashboardEditing}"
                        title="${n.t("widget.notepad.tool.edit")}"
                    >
                        ${y.edit}
                    </button>
                `}let o=this.characterCount>Lo*0.9,r=this.characterCount>Lo;return b`
                <div class="container">
                    <div class="toolbar" @wheel="${this.handleToolbarWheel}" title="${n.t("widget.notepad.tool.scroll_hint")}">
                        <!-- History Group -->
                        <div class="group">
                             <button @click="${(a)=>{a.preventDefault(),this.exec("undo")}}" title="${n.t("widget.notepad.tool.undo")} (Ctrl+Z)">${y.undo}</button>
                             <button @click="${(a)=>{a.preventDefault(),this.exec("redo")}}" title="${n.t("widget.notepad.tool.redo")} (Ctrl+Shift+Z)">${y.redo}</button>
                        </div>

                        <!-- Text Group -->
                        <div class="group">
                            <button @click="${(a)=>{a.preventDefault(),this.exec("formatBlock","H1")}}" title="${n.t("widget.notepad.tool.h1")}">${y.h1}</button>
                            <button @click="${(a)=>{a.preventDefault(),this.exec("formatBlock","H2")}}" title="${n.t("widget.notepad.tool.h2")}">${y.h2}</button>
                            <button @click="${(a)=>{a.preventDefault(),this.exec("bold")}}" title="${n.t("widget.notepad.tool.bold")} (Ctrl+B)">${y.bold}</button>
                            <button @click="${(a)=>{a.preventDefault(),this.exec("italic")}}" title="${n.t("widget.notepad.tool.italic")} (Ctrl+I)">${y.italic}</button>

                            <!-- Color Picker -->
                            <div class="color-wrapper">
                                <button title="${n.t("widget.notepad.tool.color")}">${y.color}</button>
                                <input type="color" class="color-input" @change="${this.handleColor}" title="${n.t("widget.notepad.tool.color")}" />
                            </div>
                        </div>

                        <!-- Paragraph Group -->
                        <div class="group">
                             <button @click="${(a)=>{a.preventDefault(),this.exec("justifyLeft")}}" title="${n.t("widget.notepad.tool.align_left")}">${y.alignLeft}</button>
                             <button @click="${(a)=>{a.preventDefault(),this.exec("justifyCenter")}}" title="${n.t("widget.notepad.tool.align_center")}">${y.alignCenter}</button>
                             <button @click="${(a)=>{a.preventDefault(),this.exec("justifyRight")}}" title="${n.t("widget.notepad.tool.align_right")}">${y.alignRight}</button>
                             <button @click="${(a)=>{a.preventDefault(),this.exec("justifyFull")}}" title="${n.t("widget.notepad.tool.align_justify")}">${y.alignJustify}</button>
                        </div>

                        <div class="group">
                            <button @click="${(a)=>{a.preventDefault(),this.insertChecklist()}}" title="${n.t("widget.notepad.tool.checklist")}">${y.checklist}</button>
                            <button @click="${(a)=>{a.preventDefault(),this.exec("insertUnorderedList")}}" title="${n.t("widget.notepad.tool.list_bullet")}">${y.list}</button>
                            <button @click="${(a)=>{a.preventDefault(),this.exec("insertOrderedList")}}" title="${n.t("widget.notepad.tool.list_ordered")}">${y.listOrdered}</button>
                        </div>

                        <!-- Insert Group -->
                        <div class="group">
                            <button @click="${(a)=>{a.preventDefault(),this.insertCode()}}" title="${n.t("widget.notepad.tool.code")}">${y.code}</button>
                            <button @click="${(a)=>{a.preventDefault();let t=prompt(n.t("widget.notepad.prompt.url"));if(t)this.exec("createLink",t)}}" title="${n.t("widget.notepad.tool.link")} (Ctrl+K)">${y.link}</button>
                            <button @click="${(a)=>{a.preventDefault();let t=prompt(n.t("widget.notepad.prompt.image_url"));if(t)this.exec("insertImage",t)}}" title="${n.t("widget.notepad.tool.image")}">${y.image}</button>
                             <button @click="${(a)=>{a.preventDefault(),this.exec("removeFormat")}}" title="${n.t("widget.notepad.tool.clear_format")}">${y.clear}</button>
                        </div>

                        <!-- Status Group -->
                        <div class="autosave-indicator ${this.isSaving?"visible saving":""}">
                            ${this.isSaving?n.t("widget.notepad.status.saving"):""}
                        </div>
                    </div>

                    <div class="content-area editor"
                         contenteditable="true"
                         spellcheck="false"
                         data-placeholder="${n.t("widget.notepad.placeholder")}"
                         @keydown="${this.handleEditorKeydown}"
                         @input="${this.handleEditorInput}"
                         @paste="${this.handlePaste}"
                         .innerHTML="${I.sanitize(this.content)}">
                    </div>

                    <!-- Checklist Blocks (independent from contenteditable) -->
                    ${this.checklistBlocks.map((a)=>b`
                        <div class="checklist-block-wrapper">
                            <checklist-block
                                .blockId="${a.id}"
                                .items="${a.items}"
                                @checklist-change="${this.handleChecklistChange}"
                            ></checklist-block>
                            <button
                                class="delete-block-btn"
                                @click="${()=>this.deleteChecklistBlock(a.id)}"
                                title="${n.t("widget.notepad.checklist.delete_block")}"
                            >
                                ×
                            </button>
                        </div>
                    `)}
                </div>

                <!-- Fixed Controls (outside scrollable container) -->
                <div class="fixed-controls">
                    <button
                        class="fab-btn save-btn ${this.isSaving?"saving":""}"
                        @click="${()=>this.saveContent(!1)}"
                        ?disabled="${this.isSaving||r}"
                        title="${n.t("widget.notepad.tool.save")} (Ctrl+S)"
                    >
                        ${this.isSaving?y.loader:y.save}
                    </button>

                    <!-- Character Counter (bottom right, below save button) -->
                    <div class="char-counter-bottom ${o?"warning":""} ${r?"error":""}">
                        ${this.characterCount} / ${Lo}
                    </div>
                </div>
            `}catch(o){return console.error("[NotepadWidget] Render error:",o),fetch("/api/log-error",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({component:"NotepadWidget",error:o.toString(),stack:o.stack,itemId:this.itemId})}).catch(()=>{}),b`
                <div class="error-state">
                    <h3>${n.t("general.error")}</h3>
                    <p>${n.t("widget.notepad.error.render")}</p>
                    <button @click="${()=>this.loadFromStore()}">
                        ${n.t("general.restore")}
                    </button>
                    <details>
                        <summary>Technical Details</summary>
                        <pre>${o.toString()}\n${o.stack}</pre>
                    </details>
                </div>
            `}}}j([Q({type:Number,attribute:"item-id"}),F("design:type",Number)],Vo.prototype,"itemId",void 0),j([Q({type:String}),F("design:type",String)],Vo.prototype,"content",void 0),j([q(),F("design:type",Boolean)],Vo.prototype,"isInternalEditing",void 0),j([q(),F("design:type",Boolean)],Vo.prototype,"isDashboardEditing",void 0),j([q(),F("design:type",Boolean)],Vo.prototype,"isSaving",void 0),j([q(),F("design:type",Number)],Vo.prototype,"characterCount",void 0),j([q(),F("design:type",Boolean)],Vo.prototype,"hasUnsavedChanges",void 0),j([q(),F("design:type",typeof Array==="undefined"?Object:Array)],Vo.prototype,"checklistBlocks",void 0),j([na(".content-area.editor"),F("design:type",typeof HTMLElement==="undefined"?Object:HTMLElement)],Vo.prototype,"editorElement",void 0),Vo=j([Go("widget-notepad")],Vo);_();B();class da extends HTMLElement{cpuBar=null;ramBar=null;tempBar=null;cpuText=null;ramText=null;tempText=null;_unsubscribe;_unsubscribeI18n;_itemId=0;_interval=1000;lastUpdate=0;static get observedAttributes(){return["item-id","content"]}attributeChangedCallback(o,r,a){if(o==="item-id")this._itemId=parseInt(a);if(o==="content")try{let t=typeof a==="string"?JSON.parse(a):a;if(t&&t.interval)this._interval=parseInt(t.interval)}catch(t){}}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:"open"});if(!this.cpuBar)this.render();if(this._unsubscribe)return;if(this._unsubscribe=x.subscribe((o)=>{if(this._itemId){let a=(Array.isArray(o.items)?o.items:[]).find((t)=>t.id===this._itemId);if(a&&a.content)try{let t=typeof a.content==="string"?JSON.parse(a.content):a.content;if(t.interval&&t.interval!==this._interval)this._interval=parseInt(t.interval)}catch(t){}}if(o.stats)this.update(o.stats)}),!this._unsubscribeI18n)this._unsubscribeI18n=n.subscribe(()=>{this.render();let o=x.getState();if(o.stats)this.update(o.stats)})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n()}lastKnownStats={cpu_usage:0,ram_usage:0,temperature:0};update(o){if(!this.shadowRoot)return;let r=Date.now(),a=100;if(r-this.lastUpdate<this._interval-a)return;if(this.lastUpdate=r,typeof o.cpu_usage==="number")this.lastKnownStats.cpu_usage=o.cpu_usage;if(typeof o.ram_usage==="number")this.lastKnownStats.ram_usage=o.ram_usage;if(typeof o.temperature==="number")this.lastKnownStats.temperature=o.temperature;let t=typeof o.cpu_usage==="number"?o.cpu_usage:this.lastKnownStats.cpu_usage,i=typeof o.ram_usage==="number"?o.ram_usage:this.lastKnownStats.ram_usage,e=typeof o.temperature==="number"?o.temperature:this.lastKnownStats.temperature;requestAnimationFrame(()=>{let s=Math.min(100,Math.max(0,Math.round(t)));if(this.cpuBar)this.cpuBar.style.strokeDasharray=`${s}, 100`;if(this.cpuText)this.cpuText.textContent=`${s}%`;let d=Math.min(100,Math.max(0,Math.round(i)));if(this.ramBar)this.ramBar.style.strokeDasharray=`${d}, 100`;if(this.ramText)this.ramText.textContent=`${d}%`;let l=Math.round(e),c=Math.min(100,Math.max(0,l));if(this.tempBar)this.tempBar.style.strokeDasharray=`${c}, 100`;if(this.tempText)this.tempText.textContent=`${l}°C`})}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    width: 100%;
                    height: 100%;
                    background: var(--surface);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    box-sizing: border-box;
                    padding: 4%; /* Proportional padding */
                    color: var(--text-main);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    container-type: inline-size; /* Enable CQ */
                }
                /* Combined with container hover, we don't need specific host hover */
                .gauge-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8%;
                    flex: 1;
                    height: 100%; /* Ensure full height usage */
                }
                .wrapper {
                    position: relative;
                    width: 70%;  /* Relative to gauge-container */
                    height: auto;
                    aspect-ratio: 1/1; /* Square */
                    max-height: 80%; /* Don't overflow */
                }
                .circular-chart {
                    width: 100%;
                    height: 100%;
                    display: block;
                    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
                }
                .circle-bg {
                    fill: none;
                    stroke: var(--border-bright);
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
                    font-size: clamp(10px, 3.5cqi, 16px); /* Proportional Font */
                    font-weight: 800;
                    text-align: center;
                    text-shadow: 0 4px 8px rgba(0,0,0,0.5);
                    user-select: none;
                }
                .sub {
                    font-size: clamp(8px, 2.5cqi, 12px); /* Proportional Font */
                    color: var(--text-dim);
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
                <div class="sub">${n.t("widget.telemetry.cpu")}</div>
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
                <div class="sub">${n.t("widget.telemetry.ram")}</div>
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
                <div class="sub">${n.t("widget.telemetry.temp")}</div>
            </div>
        `,this.cpuBar=this.shadowRoot.querySelector(".cpu-bar"),this.ramBar=this.shadowRoot.querySelector(".ram-bar"),this.tempBar=this.shadowRoot.querySelector(".temp-bar"),this.cpuText=this.shadowRoot.querySelector(".cpu-text"),this.ramText=this.shadowRoot.querySelector(".ram-text"),this.tempText=this.shadowRoot.querySelector(".temp-text")}}customElements.define("widget-telemetry",da);var la=`:host {
    /* Fixed Grid System */
    /* --user-preferred-columns is set by JS on :root (Default: 12) */
    --grid-cols: var(--user-preferred-columns, 12);

    display: grid;
    /* Fixed columns based on user preference */
    grid-template-columns: repeat(var(--grid-cols), 1fr);

    /* Rows track auto, but generally square via aspect ratio */
    /* FORCE Square cells: row-height is synced to colWidth in JS */
    grid-auto-rows: var(--row-height, 100px);

    gap: 16px;
    width: 100%;
    margin: 0 auto;
    padding-bottom: 6rem;

    /* Hide scrollbars */
    scrollbar-width: none !important;

    /* Optimize dynamic height changes during drag */
    will-change: min-height;
    contain: layout style;
}

:host::-webkit-scrollbar {
    display: none !important;
}

/* Touch Mode / Mobile (Flat List) */
:host(.touch-mode) {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
}

:host(.touch-mode) .bookmark-grid__card {
    /* Auto-flow on mobile */
    grid-column: auto !important;
    grid-row: auto !important;
    width: 100%;
    height: auto;
    aspect-ratio: auto;
    min-height: 80px;
    /* Optimize touch targets */
}

/* Hide sections in touch mode (content is flattened) */
:host(.touch-mode) .bookmark-grid__section {
    display: none !important;
}

/* Items positioned by coordinates */
/* Items positioned by Flow (Order) or Coordinates (if we keep strict mode, but requested Flow) */
.bookmark-grid__card {
    /* Items positioned by Coordinates (Strict) */
    grid-column: var(--x, auto) / span var(--w, 1);
    grid-row: var(--y, auto) / span var(--h, 1);

    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);

    /* Responsive Padding */
    padding: 8% 4% !important;

    position: relative;
    /* aspect-ratio: 1 / 1;  <-- REMOVED: let grid-auto-rows control height */
    height: 100%;
    /* Fill the grid area */

    max-width: 100%;
    max-height: 100%;

    justify-self: center;
    align-self: center;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    /* Start from top, let flex-1 push down */
    gap: 0;

    text-decoration: none;
    color: var(--text-main);
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
    box-sizing: border-box;
    overflow: hidden;
    container-type: inline-size;
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
    top: 8%;
    right: 8%;
    width: 8%;
    height: 8%;
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
    /* Layout: Takes remaining space to center icon vertically */
    width: 100%;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;

    color: var(--text-dim);
    transition: color 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bookmark-grid__card:hover .bookmark-grid__icon-container {
    /* No movement, just rotate and scale */
    transform: rotate(-5deg) scale(1.1);
    color: var(--text-main);
}

.bookmark-grid__label {
    /* wrapper restored */
    /* Responsive Font Size: Controlled scaling for elegance */
    /* Never smaller than 11px, never larger than 18px (standard desktop icon size) */
    font-size: clamp(11px, 11cqi, 18px);

    font-weight: 500;
    text-align: center;
    line-height: 1.4;
    width: 100%;

    /* Spacing */
    padding: 0 6px;
    margin-top: 0;
    /* Handled by flex gap/grow */

    /* Professional Truncation (No multi-line mess) */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    /* Typography Polish */
    font-family: var(--font-sans);
    letter-spacing: -0.01em;
    color: var(--text-dim);
    transition: color 0.2s;
}

/* Highlight label on hover */
.bookmark-grid__card:hover .bookmark-grid__label {
    color: var(--text-main);
}

.bookmark-grid__icon-svg {
    /* Icon Size: 45% of CARD width */
    width: 45%;
    height: auto;
    aspect-ratio: 1/1;
    stroke: currentColor;
    stroke-width: 1.5px;
    fill: none;
    max-height: 80%;
}

.bookmark-grid__icon-img {
    /* Icon Size: 45% of CARD width */
    width: 45%;
    height: auto;
    aspect-ratio: 1/1;
    object-fit: contain;
    max-height: 80%;
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
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
    /* Lighter shadow */
    /* CRITICAL FIX: Sections are containers/backgrounds, should be below cards */
    z-index: 1;

    /* Reset margins & Force Fill */
    margin: 0;
    width: 100%;
    height: 100%;
    min-width: 0;
}

.bookmark-grid__section:hover {
    border-color: var(--border-bright);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.section-title {
    position: absolute;
    top: 0;
    transform: translateY(calc(-50% - 1px));
    /* Lift half-way up to interrupt border */
    left: 12px;
    z-index: 2;

    color: var(--text-dim);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 2px 8px;
    /* Pill padding */
    font-family: var(--font-mono, monospace);
    opacity: 0.9;

    /* Premium "Button/Pill" Look */
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface-solid);
    /* Opaque match to hide border line behind */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    line-height: 1.4;
    width: fit-content;
    white-space: nowrap;

    transition: all 0.3s ease;
}

/* Hover state for title to match section consistency */
.bookmark-grid__section:hover .section-title {
    border-color: var(--border-bright);
    color: var(--text-dim);
    background: var(--surface-solid);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.bookmark-grid__section:hover .section-title:hover {
    /* Allow individual highlight if interacting directly */
    color: var(--text-main);
    border-color: var(--border-bright);
}

/* Ghost Styles */
.bookmark-grid__ghost {
    background: rgba(0, 255, 0, 0.1);
    border: 2px dashed #00ff00;
    border-radius: var(--radius);

    /* Use Grid Positioning to perfectly align with other items */
    grid-column: var(--ghost-x, 1) / span var(--ghost-w, 1);
    grid-row: var(--ghost-y, 1) / span var(--ghost-h, 1);

    /* Ensure it appears in the grid */
    width: 100%;
    height: 100%;

    pointer-events: none;
    /* Removed transition to prevent jitter during rapid resize/drag */
    z-index: 100;
    will-change: grid-column, grid-row;
    /* Force GPU acceleration for smoother rendering */
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
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
}`;class ca extends HTMLElement{bookmarks=[];allItems=[];isEditing=!1;searchQuery="";_unsubscribe;_unsubscribeI18n;_resizeObserver;_resizeDebounce=null;dragTargetId=null;ghostEl=null;dragOffsetX=0;dragOffsetY=0;isResizing=!1;resizeTargetId=null;initialResizeX=0;initialResizeY=0;initialResizeW=0;initialResizeH=0;currentColWidth=0;currentGridCols=12;isTouchDevice=!1;constructor(){super();this.attachShadow({mode:"open"});let o=window.matchMedia("(pointer: coarse)");this.isTouchDevice=o.matches,this.updateTouchMode(),o.addEventListener("change",(r)=>{this.isTouchDevice=r.matches,this.updateTouchMode(),this.applyFilters(),this.render()})}updateTouchMode(){if(this.isTouchDevice)this.classList.add("touch-mode");else this.classList.remove("touch-mode")}_widgetModal;_boundActionClick=this.handleActionClick.bind(this);_boundMouseMove=this.handleWindowMouseMove.bind(this);_boundMouseUp=this.handleWindowMouseUp.bind(this);applyFilters(){if(this.searchQuery||this.isTouchDevice)this.classList.add("search-active"),this.bookmarks=this.allItems.filter((o)=>{if(o.type!=="bookmark")return!1;if(this.searchQuery){let r=o.content;if(typeof o.content==="string")try{r=JSON.parse(o.content)}catch{return!1}return(r.label||"").toLowerCase().includes(this.searchQuery)}return!0});else this.classList.remove("search-active"),this.bookmarks=this.allItems}connectedCallback(){this.render(),this.updateGridMetrics(),this._resizeObserver=new ResizeObserver(()=>{if(this._resizeDebounce)return;this._resizeDebounce=setTimeout(()=>{this._resizeDebounce=null,this.updateGridMetrics();let o=this.getBoundingClientRect();x.setGridMetrics(o.width,this.currentGridCols),this.render()},16)}),this._resizeObserver.observe(this),this._unsubscribe=x.subscribe((o)=>{let r=!1;if(this.isEditing!==o.isEditing)this.isEditing=o.isEditing,r=!0;if(this.searchQuery!==o.searchQuery)this.searchQuery=o.searchQuery,r=!0;let a=Array.isArray(o.items)?o.items:[];if(JSON.stringify(this.allItems)!==JSON.stringify(a)||r)this.allItems=a,this.applyFilters(),r=!0;if(r)this.render()}),this.setupDragListeners(),this.setupResizeListeners(),this.setupActionListeners(),co.start(),this._unsubscribeI18n=n.subscribe(()=>this.render()),Promise.resolve().then(() => (oo(),Qo)).then(({userStore:o})=>{this._unsubscribeUser=o.subscribe(()=>{requestAnimationFrame(()=>{this.updateGridMetrics(),this.render()})})})}_unsubscribeUser=null;setupActionListeners(){let o=this.shadowRoot;o.removeEventListener("click",this._boundActionClick),o.addEventListener("click",this._boundActionClick)}async handleActionClick(o){if(!this.isEditing)return;let r=o.target;if(!r)return;let a=r.closest(".btn-delete"),t=r.closest(".btn-edit");if(a||t)o.preventDefault(),o.stopPropagation();else if(r.closest("a"))o.preventDefault();if(a){let i=a.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!i)return;let e=parseInt(i.dataset.id||"0"),s=this.allItems.find((p)=>p.id===e);if(!s)return;let d=s.type==="section"?n.t("type.section"):s.type==="widget"?n.t("type.widget"):n.t("type.bookmark"),{eventBus:l,EVENTS:c}=await Promise.resolve().then(() => (Ho(),Do));l.emit(c.SHOW_CONFIRMATION,{title:`${n.t("general.delete")} ${d}`,message:n.t("bookmark.delete_confirm_message"),onConfirm:()=>{x.deleteItem(e)}});return}if(t){let i=t.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!i)return;let e=parseInt(i.dataset.id||"0"),s=this.allItems.find((d)=>d.id===e);if(s){let{eventBus:d,EVENTS:l}=await Promise.resolve().then(() => (Ho(),Do));if(s.type==="widget")d.emit(l.SHOW_WIDGET_CONFIG,{item:s,type:"widget"});else if(s.type==="section")d.emit(l.SHOW_WIDGET_CONFIG,{item:s,type:"section"});else d.emit(l.SHOW_WIDGET_CONFIG,{item:s,type:"bookmark"})}return}}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._unsubscribeUser)this._unsubscribeUser();if(this._resizeObserver)this._resizeObserver.disconnect();if(this._resizeDebounce)clearTimeout(this._resizeDebounce);if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout);window.removeEventListener("mousemove",this._boundMouseMove),window.removeEventListener("mouseup",this._boundMouseUp),co.stop()}updateGridMetrics(){let o=this.getBoundingClientRect(),r=getComputedStyle(this),a=r.getPropertyValue("--grid-cols").trim(),t=parseInt(a)||12,i=r.columnGap||r.gap||"16px",e=parseFloat(i)||16;if(o.width<=0){this.currentGridCols=t,this.currentColWidth=100,this.style.setProperty("--current-grid-cols",t.toString()),this.style.setProperty("--row-height","100px");return}let s=(t-1)*e,d=(o.width-s)/t;if(d<10)d=10;this.currentGridCols=t,this.currentColWidth=d,this.style.setProperty("--current-grid-cols",String(t)),this.style.setProperty("--row-height",`${d}px`),this.ensureGridBuffer()}ensureGridBuffer(){let o=0;this.bookmarks.forEach((s)=>{let d=(s.y||1)+(s.h||1);if(d>o)o=d});let a=o+1,t=this.currentColWidth||100,i=16,e=a*t+(a-1)*i;this.style.minHeight=`${e}px`}setupResizeListeners(){window.addEventListener("mousemove",this._boundMouseMove),window.addEventListener("mouseup",this._boundMouseUp),this.shadowRoot.addEventListener("mousedown",(o)=>{let r=o;if(!this.isEditing)return;let a=r.target;if(a.classList.contains("resize-handle")){r.preventDefault(),r.stopPropagation();let t=a.closest(".bookmark-grid__card, .bookmark-grid__section");if(!t||!t.dataset.id)return;let i=parseInt(t.dataset.id),e=this.bookmarks.find((h)=>h.id===i);if(!e)return;this.isResizing=!0,this.resizeTargetId=i,this.initialResizeX=r.clientX,this.initialResizeY=r.clientY,this.initialResizeW=e.w,this.initialResizeH=e.h;let s=this,d=s.getBoundingClientRect(),c=getComputedStyle(s).getPropertyValue("--current-grid-cols").trim(),p=c?parseInt(c,10):9,g=isNaN(p)?9:p,u=16;this.currentColWidth=(d.width-(g-1)*u)/g,this.updateGhost({x:e.x,y:e.y,w:e.w,h:e.h},!0)}})}_updateGhostTimeout=null;handleWindowMouseMove(o){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)return;this._updateGhostTimeout=setTimeout(()=>{this._updateGhostTimeout=null,this.processResizeMove(o)},16)}processResizeMove(o){if(!this.isResizing||!this.resizeTargetId)return;let r=o.clientX-this.initialResizeX,a=o.clientY-this.initialResizeY,t=Math.round(r/(this.currentColWidth+16)),i=Math.round(a/(this.currentColWidth+16)),e=this.initialResizeW+t,s=this.initialResizeH+i,d=this.bookmarks.find((l)=>l.id===this.resizeTargetId);if(d){let l=this.applyResizeConstraints(e,s,d),c={x:d.x,y:d.y,w:l.w,h:l.h,id:d.id,parent_id:d.parent_id},p=E.calculateDropValidity(c,this.bookmarks,this.currentGridCols);this.updateGhost(c,p.valid)}}applyResizeConstraints(o,r,a){let t=1,i=1;if(a.type==="widget"){let e=a.content;if(typeof a.content==="string")try{e=JSON.parse(a.content)}catch{return{w:Math.max(1,Math.min(12,o)),h:Math.max(1,Math.min(12,r))}}let s=(e.widgetId||"").toLowerCase();if(s==="notepad")t=2,i=2;else if(s==="clock")return{w:2,h:1};else if(s==="telemetry")return{w:2,h:1};let d=Math.max(t,Math.min(12,o)),l=Math.max(i,Math.min(12,r));return{w:d,h:l}}else if(a.type==="section"){let e=Math.max(1,Math.min(12,o)),s=Math.max(1,Math.min(12,r));return{w:e,h:s}}else{let e=Math.max(1,Math.min(2,o)),s=Math.max(1,Math.min(2,r));return{w:e,h:s}}}async handleWindowMouseUp(o){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout),this._updateGhostTimeout=null;let r=o.clientX-this.initialResizeX,a=o.clientY-this.initialResizeY,t=Math.round(r/(this.currentColWidth+16)),i=Math.round(a/(this.currentColWidth+16)),e=this.initialResizeW+t,s=this.initialResizeH+i,d=this.bookmarks.find((g)=>g.id===this.resizeTargetId);if(!d)return;let l=this.applyResizeConstraints(e,s,d);e=l.w,s=l.h;let c={x:d.x,y:d.y,w:e,h:s,id:d.id,parent_id:d.parent_id};if(E.calculateDropValidity(c,this.bookmarks,this.currentGridCols).valid&&(d.w!==e||d.h!==s)){if(d.type==="section"){let g=e*s,u=this.bookmarks.filter((h)=>h.parent_id===d.id);if(u.sort((h,m)=>h.y-m.y||h.x-m.x),u.length>g){let h=u.slice(g),m=[...this.bookmarks],G=h.map((k)=>{let f=E.findFirstAvailableSlot(k.w,k.h,m,this.currentGridCols);return m.push({...k,x:f.x,y:f.y,parent_id:void 0}),{id:k.id,x:f.x,y:f.y,parent_id:void 0}});await Promise.all(G.map((k)=>x.updateItem(k)))}}await x.resizeItem(d.id,e,s)}if(this.isResizing=!1,this.resizeTargetId=null,this.ghostEl)this.ghostEl.style.display="none"}setupDragListeners(){let o=this.shadowRoot,r=this;o.addEventListener("dragstart",(t)=>{let i=t;if(!this.isEditing){i.preventDefault();return}let e=i.target.closest('[draggable="true"]');if(e&&e.dataset.id){this.dragTargetId=parseInt(e.dataset.id),i.dataTransfer.effectAllowed="move",e.style.opacity="0.5";let s=e.getBoundingClientRect();if(this.dragOffsetX=i.clientX-s.left,this.dragOffsetY=i.clientY-s.top,i.dataTransfer)i.dataTransfer.setDragImage(e,this.dragOffsetX,this.dragOffsetY)}}),o.addEventListener("dragend",(t)=>{let i=t.target.closest('[draggable="true"]');if(i)i.style.opacity="1";if(this.dragTargetId=null,this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((s)=>s.classList.remove("drop-target"))});let a=null;r.addEventListener("dragover",(t)=>{let i=t;if(!this.isEditing||!this.dragTargetId)return;if(i.preventDefault(),i.dataTransfer.dropEffect="move",a)return;a=setTimeout(()=>{a=null,this.processDragOver(i,r)},16)}),r.addEventListener("drop",async(t)=>{let i=t;if(a)clearTimeout(a),a=null;await this.handleDrop(i,r)})}processDragOver(o,r){let i=document.querySelector(".main-content");if(i){let w=i.getBoundingClientRect(),lo=o.clientY;if(lo>w.bottom-100)i.scrollBy(0,15);else if(lo<w.top+100)i.scrollBy(0,-15)}let e=r.getBoundingClientRect(),s=this.currentGridCols||12,d=e.width,l=16,c=(d-(s-1)*l)/s,p=this.bookmarks.find((w)=>w.id===this.dragTargetId);if(!p)return;let g=o.clientX-this.dragOffsetX,u=o.clientY-this.dragOffsetY,h=g-e.left,m=u-e.top,G=Math.floor(h/(c+l)),k=Math.floor(m/(c+l)),f=Math.max(1,Math.min(s-p.w+1,G+1)),A=Math.max(1,k+1),T={x:f,y:A,w:p.w,h:p.h,id:p.id,parent_id:p.parent_id},v=E.calculateDropValidity(T,this.bookmarks,s),C=!this.bookmarks.some((w)=>{if(w.id===p.id)return!1;if(w.parent_id!==p.parent_id&&!v.targetGroup)return!1;let lo=w.x||1,So=w.y||1,Ja=w.w||1,Ma=w.h||1;if(v.targetGroup&&w.id===v.targetGroup.id)return!1;return f<lo+Ja&&f+p.w>lo&&A<So+Ma&&A+p.h>So})&&v.valid;if(this.updateGhost(T,C),this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((w)=>w.classList.remove("drop-target")),v.targetGroup&&C){let w=this.shadowRoot.querySelector(`.bookmark-grid__section[data-id="${v.targetGroup.id}"]`);if(w)w.classList.add("drop-target")}}async handleDrop(o,r){if(!this.isEditing||!this.dragTargetId)return;o.preventDefault();let a=this.bookmarks.find((v)=>v.id===this.dragTargetId);if(!a)return;let t=r.getBoundingClientRect(),i=this.currentGridCols||12,e=t.width,s=16,d=(e-(i-1)*s)/i,l=o.clientX-this.dragOffsetX,c=o.clientY-this.dragOffsetY,p=l-t.left,g=c-t.top,u=Math.floor(p/(d+s)),h=Math.floor(g/(d+s)),m=Math.max(1,Math.min(i-a.w+1,u+1)),G=Math.max(1,h+1),k={x:m,y:G,w:a.w,h:a.h,id:a.id,parent_id:a.parent_id},f=E.calculateDropValidity(k,this.bookmarks,i);if(this.bookmarks.some((v)=>{if(v.id===a.id)return!1;if(v.parent_id!==a.parent_id&&!f.targetGroup)return!1;let so=v.x||1,C=v.y||1,Io=v.w||1,w=v.h||1;if(f.targetGroup&&v.id===f.targetGroup.id)return!1;return m<so+Io&&m+a.w>so&&G<C+w&&G+a.h>C})&&!f.targetGroup){if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".drop-target").forEach((v)=>v.classList.remove("drop-target"));return}if(f.valid){let v={id:a.id,x:f.x,y:f.y};if(f.targetGroup)v.parent_id=f.targetGroup.id,v.x=f.x-f.targetGroup.x+1,v.y=f.y-f.targetGroup.y+1;else v.parent_id=void 0;await x.updateItem(v)}if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((v)=>v.classList.remove("drop-target"))}updateGhost(o,r){if(!this.ghostEl)this.ghostEl=this.shadowRoot.getElementById("ghost-element");if(!this.ghostEl)return;if(this.ghostEl.style.display="block",this.ghostEl.style.setProperty("--ghost-x",String(o.x)),this.ghostEl.style.setProperty("--ghost-y",String(o.y)),this.ghostEl.style.setProperty("--ghost-w",String(o.w)),this.ghostEl.style.setProperty("--ghost-h",String(o.h)),r)this.ghostEl.classList.remove("invalid");else this.ghostEl.classList.add("invalid")}render(){if(this.isEditing)this.classList.add("edit-mode");else this.classList.remove("edit-mode");this.shadowRoot.innerHTML=`
            <style>${la}</style>
            ${Kr({bookmarks:this.bookmarks,isEditing:this.isEditing,isSearching:!!this.searchQuery,isTouchDevice:this.isTouchDevice,maxCols:this.currentGridCols})}
        `,this.setupActionListeners(),this.ghostEl=this.shadowRoot.getElementById("ghost-element")}}if(!customElements.get("bookmark-grid"))customElements.define("bookmark-grid",ca);var ga=()=>`
    <div class="toast-container"></div>
`;var xa=`.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-container--shifted {
    right: 340px;
    /* 320px drawer + 20px gap */
}

.toast {
    background-color: var(--surface);
    color: var(--text-main);
    padding: 12px 20px;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    font-size: 14px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 300ms, transform 300ms;
    border-left: 4px solid var(--accent);
}

.toast--success {
    border-left-color: var(--success-color);
}

.toast--error {
    border-left-color: var(--danger-color);
}`;class ba extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",()=>this.shift(!0)),window.addEventListener("drawer-close",()=>this.shift(!1))}shift(o){let r=this.shadowRoot.querySelector(".toast-container");if(r)if(o)r.classList.add("toast-container--shifted");else r.classList.remove("toast-container--shifted")}show(o,r="success"){let a=this.shadowRoot.querySelector(".toast-container");if(!a)return;let t=document.createElement("div");t.className=`toast toast--${r}`,t.textContent=o,a.appendChild(t),requestAnimationFrame(()=>{t.style.opacity="1",t.style.transform="translateY(0)"}),setTimeout(()=>{t.style.opacity="0",t.style.transform="translateY(20px)",setTimeout(()=>t.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${xa}</style>
            ${ga()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",ba);_();var va=()=>`
    <div class="icon-picker">
        <div class="icon-picker__header">
            <div id="selected-container"></div>
            <div class="icon-picker__search">
                <input type="text"
                       id="icon-search"
                       class="icon-picker__search-input"
                       placeholder="${n.t("general.search")}" />
            </div>
        </div>

        <div id="grid-container" class="icon-picker__grid"></div>
    </div>
`,ha=(o)=>o?`
    <div class="icon-picker__selected">
        <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${o}.png"
             alt="${o}"
             class="icon-picker__preview" />
    </div>
`:`
    <div class="icon-picker__placeholder">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
    </div>
`,fa=(o,r,a)=>{if(a)return`<div class="icon-picker__loading">${n.t("general.loading")}</div>`;if(o.length===0)return`<div class="icon-picker__empty">${n.t("general.no_icons")}</div>`;return o.map((t)=>`
        <div class="icon-picker__item ${r===t.name?"icon-picker__item--selected":""}"
             data-icon="${t.name}"
             title="${t.name}">
            <img src="${t.url}" alt="${t.name}" loading="lazy" />
        </div>
    `).join("")};class ua{icons=[];loaded=!1;loading=!1;BASE_URL="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";FALLBACK_URL="https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main";async loadIcons(){if(this.loaded)return this.icons;if(this.loading)return await new Promise((o)=>setTimeout(o,100)),this.loadIcons();this.loading=!0;try{let o=await fetch(`${this.BASE_URL}/tree.json`);if(!o.ok)console.log("[IconService] CDN failed, trying GitHub raw"),o=await fetch(`${this.FALLBACK_URL}/tree.json`);if(!o.ok)throw Error("Failed to fetch icon list");let r=await o.json(),a=Array.isArray(r)?r:r.png||[];if(Array.isArray(a)&&a.length>0)this.icons=a.filter((t)=>t.endsWith(".png")||t.endsWith(".svg")).map((t)=>{let i=t.replace(/\.(png|svg)$/,"");return{name:i,url:`${this.BASE_URL}/png/${i}.png`}}).sort((t,i)=>t.name.localeCompare(i.name));else console.warn("[IconService] Unexpected tree.json structure, using fallback",r),this.icons=this.getFallbackIcons();return this.loaded=!0,this.loading=!1,console.log(`[IconService] Loaded ${this.icons.length} icons`),this.icons}catch(o){return console.error("[IconService] Failed to load icons:",o),this.loading=!1,this.icons=this.getFallbackIcons(),this.loaded=!0,this.icons}}getFallbackIcons(){return["github","gitlab","docker","proxmox","truenas","plex","jellyfin","nextcloud","cloudflare","nginx","traefik","portainer","grafana","prometheus","influxdb","pihole","adguard","homeassistant","esphome","frigate","unraid","synology","opnsense","pfsense","wireguard","openvpn","bitwarden","vaultwarden","sonarr","radarr","lidarr","bazarr","prowlarr","overseerr","tautulli","transmission","qbittorrent","deluge","sabnzbd","nzbget","calibre","paperless","photoprism","immich","mealie","freshrss","miniflux","wallabag","linkding","shiori","firefox","chrome","vscode","code-server","jupyter","portainer"].map((r)=>({name:r,url:`${this.BASE_URL}/png/${r}.png`}))}searchIcons(o,r=50){if(!o.trim())return this.icons.slice(0,r);let a=o.toLowerCase().trim();return this.icons.filter((t)=>t.name.toLowerCase().includes(a)).slice(0,r)}getIconUrl(o){return`${this.BASE_URL}/png/${o}.png`}}var Xo=new ua;var _a=`:host {
    display: block;
}

.icon-picker {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.icon-picker__header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.icon-picker__selected {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    height: 42px;
    /* Match input height roughly */
    width: 42px;
    box-sizing: border-box;
    flex-shrink: 0;
}

.icon-picker__preview {
    width: 28px;
    height: 28px;
    object-fit: contain;
}

.icon-picker__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    opacity: 0.5;
    background: var(--surface);
    border: 1px solid var(--border);
    /* Dashed maybe? or just solid */
    border-radius: var(--radius);
    height: 42px;
    width: 42px;
    box-sizing: border-box;
    flex-shrink: 0;
}

.icon-picker__placeholder svg {
    width: 24px;
    height: 24px;
}

/* Hide name */
.icon-picker__selected-name {
    display: none;
}

.icon-picker__search {
    position: relative;
    flex: 1;
    /* Grow to fill space */
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
    height: 42px;
    /* Force height match */
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
    background: var(--surface);
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
    background: var(--border);
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
    background: var(--surface-hover);
    border-color: var(--border-bright);
    transform: scale(1.05);
}

.icon-picker__item--selected {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.15);
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

    0%,
    100% {
        opacity: 0.5;
    }

    50% {
        opacity: 1;
    }
}`;class ma extends HTMLElement{icons=[];filteredIcons=[];selectedIcon="";searchQuery="";isLoading=!0;debounceTimer=null;inputElement=null;id_debug=Math.random().toString(36).substr(2,5);constructor(){super();this.attachShadow({mode:"open"})}async connectedCallback(){if(this.shadowRoot.childElementCount>0)return;if(this.renderBase(),this.setupListeners(),this.icons.length===0)await this.loadIcons()}async loadIcons(){try{this.icons=await Xo.loadIcons(),this.filteredIcons=this.icons.slice(0,50),this.isLoading=!1,this.updateGrid()}catch(o){console.error(`[IconPicker:${this.id_debug}] Failed to load icons`,o),this.isLoading=!1,this.updateGrid()}}setupListeners(){let o=this.shadowRoot;this.inputElement=o.getElementById("icon-search"),this.inputElement?.addEventListener("input",(a)=>{let t=a.target;if(this.searchQuery=t.value,this.debounceTimer)window.clearTimeout(this.debounceTimer);this.debounceTimer=window.setTimeout(()=>{this.performSearch()},100)}),o.getElementById("grid-container")?.addEventListener("click",(a)=>{let i=a.target.closest(".icon-picker__item");if(i&&i.dataset.icon)this.selectedIcon=i.dataset.icon,this.updateSelected(),this.updateGrid(),this.dispatchEvent(new CustomEvent("icon-selected",{detail:{iconName:this.selectedIcon},bubbles:!0,composed:!0}))})}performSearch(){this.filteredIcons=Xo.searchIcons(this.searchQuery,50),this.updateGrid()}getSelectedIcon(){return this.selectedIcon}setSelectedIcon(o){this.selectedIcon=o,this.updateSelected(),this.updateGrid()}renderBase(){this.shadowRoot.innerHTML=`
            <style>${_a}</style>
            ${va()}
        `}updateGrid(){let o=this.shadowRoot.getElementById("grid-container");if(o){if(!this.searchQuery.trim()&&!this.isLoading){o.style.display="none",o.innerHTML="";return}o.style.display="grid",o.innerHTML=fa(this.filteredIcons,this.selectedIcon,this.isLoading)}}updateSelected(){let o=this.shadowRoot.getElementById("selected-container");if(o)o.innerHTML=ha(this.selectedIcon)}}if(!customElements.get("icon-picker"))customElements.define("icon-picker",ma);_();var ya=({isOpen:o,isEditMode:r})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h2 class="modal-title">${r?n.t("bookmark.edit"):n.t("bookmark.add")}</h2>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <form class="modal-form" id="bookmark-form">
            <div class="form-group">
                <label for="bookmark-label">${n.t("bookmark.label")}</label>
                <input type="text" id="bookmark-label" name="label" placeholder="${n.t("bookmark.placeholder_label")}" required />
            </div>
            <div class="form-group">
                <label for="bookmark-url">${n.t("bookmark.url")}</label>
                <input type="url" id="bookmark-url" name="url" placeholder="${n.t("bookmark.placeholder_url")}" required />
            </div>
            <div class="form-group">
                <label>${n.t("bookmark.icon")}</label>
                <div id="icon-picker-container"></div>
            </div>
            <div class="form-group checkbox-group">
                <label for="bookmark-status">${n.t("bookmark.monitor_status")}</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="bookmark-status" name="statusCheck" />
                    <span class="slider"></span>
                </label>
            </div>

            <div class="visibility-row">
                <div class="checkbox-group">
                    <label for="bookmark-mobile">${n.t("bookmark.visible_mobile")}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-mobile" name="visibleMobile" checked />
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="checkbox-group">
                    <label for="bookmark-tablet">${n.t("bookmark.visible_tablet")}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-tablet" name="visibleTablet" checked />
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            <div class="form-actions">
                <app-button type="submit" variant="primary" class="btn-submit">${n.t("general.save")}</app-button>
            </div>
        </form>
    </dialog>
`;B();_();var ka=`:host {
    display: contents;
}

dialog {
    background: var(--surface-solid);
    color: var(--text-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px;
    width: 90%;
    max-width: 500px;
    backdrop-filter: blur(20px);
    box-shadow: var(--paper-shadow);
    overflow: visible;
}

dialog::backdrop {
    background: var(--overlay-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

dialog[open] {
    animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
}

.modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
    margin: 0;
}

.modal-close {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 8px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
}

.modal-close:hover {
    background: rgba(var(--accent-rgb), 0.1);
    transform: rotate(90deg);
    color: var(--accent);
    border-color: rgba(var(--accent-rgb), 0.3);
}

.modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-size: 12px;
    font-weight: 500;
    color: var(--label-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.form-group input,
.form-group textarea {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    padding: 12px 16px;
    color: var(--input-text);
    font-family: var(--font-sans);
    font-size: 14px;
    transition: all 0.2s;
    outline: none;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
    color: var(--input-placeholder);
}

.form-group input:focus,
.form-group textarea:focus {
    border-color: var(--input-focus-border);
    box-shadow: var(--input-focus-shadow);
}

.form-group textarea {
    resize: vertical;
    font-family: var(--font-mono);
    font-size: 12px;
    min-height: 80px;
}

.form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
}

/* Toggle Switch */
.toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
}

.toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--surface-active);
    transition: 0.3s;
    border-radius: 24px;
    border: 1px solid var(--border);
}

.slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 2px;
    bottom: 2px;
    background-color: var(--text-dim);
    transition: 0.3s;
    border-radius: 50%;
}

input:checked+.slider {
    background-color: var(--accent);
    border-color: var(--accent);
}

input:checked+.slider:before {
    transform: translateX(20px);
    background-color: white;
}

/* Checkbox Group Row */
.checkbox-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0;
    justify-content: space-between;
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 14px 16px;
    border-radius: var(--radius);
    margin-bottom: 8px;
    width: 100%;
    box-sizing: border-box;
}

.checkbox-group .toggle-switch {
    margin-left: auto;
}

.checkbox-group label {
    margin: 0;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-main);
    text-transform: none;
    font-weight: 400;
    letter-spacing: 0;
}

/* Visibility toggles row */
.visibility-row {
    display: flex;
    gap: 12px;
}

.visibility-row .checkbox-group {
    flex: 1;
    margin-bottom: 0;
}`;class wa extends HTMLElement{dialog=null;iconPicker=null;selectedIconName="";clickHandler=null;submitHandler=null;escapeHandler=null;_unsubscribeI18n;isEditMode=!1;currentItemId=null;constructor(){super();this.attachShadow({mode:"open"}),this.setupHandlers()}setupHandlers(){this.clickHandler=(o)=>{if(o.target.closest("#modal-close")){o.preventDefault(),o.stopPropagation(),this.close();return}if(o.target===this.dialog){this.close();return}},this.submitHandler=async(o)=>{o.preventDefault(),o.stopPropagation();let r=o.target,a=new FormData(r),t=a.get("label"),i=a.get("url"),e=a.get("statusCheck")==="on",s=a.get("visibleMobile")==="on",d=a.get("visibleTablet")==="on",l=this.iconPicker?this.iconPicker.getSelectedIcon():"",c=l?`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${l}.png`:"";try{let p=JSON.stringify({label:t,url:i,icon:c,iconName:l,statusCheck:e,visibleMobile:s,visibleTablet:d});if(this.isEditMode&&this.currentItemId){if(await x.updateItem({id:this.currentItemId,content:p}),window.notifier)window.notifier.show(n.t("notifier.bookmark_updated"))}else{let g=x.getState(),u=Array.isArray(g.items)?g.items:[],{collisionService:h}=await Promise.resolve().then(() => (N(),ro)),m=h.findFirstAvailableSlot(1,1,u);if(await x.addItem({type:"bookmark",x:m.x,y:m.y,w:1,h:1,content:p}),window.notifier)window.notifier.show(n.t("notifier.bookmark_added"))}this.close()}catch(p){if(console.error("[Modal] Error:",p),window.notifier)window.notifier.show(n.t("notifier.bookmark_error"),"error")}},this.escapeHandler=(o)=>{if(o.key==="Escape"&&this.dialog?.open)this.close()}}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeI18n=n.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n();let o=this.shadowRoot;if(this.clickHandler)o.removeEventListener("click",this.clickHandler);if(this.submitHandler)o.removeEventListener("submit",this.submitHandler);if(this.escapeHandler)document.removeEventListener("keydown",this.escapeHandler)}setupListeners(){let o=this.shadowRoot;o.addEventListener("click",this.clickHandler),o.addEventListener("submit",this.submitHandler),document.addEventListener("keydown",this.escapeHandler)}open(){this.isEditMode=!1,this.currentItemId=null,this.selectedIconName="",this.render(),this.dialog?.showModal(),requestAnimationFrame(()=>{this.resetForm(),this.initializeIconPicker()})}openForEdit(o){this.isEditMode=!0,this.currentItemId=o.id;let r=o.content;if(typeof r==="string")try{r=JSON.parse(r)}catch(a){console.error("Failed to parse item content",a)}this.selectedIconName=r.iconName||"",this.render(),this.dialog?.showModal(),this.initializeIconPicker(),setTimeout(()=>{let a=this.shadowRoot.getElementById("bookmark-form");if(a){let t=a.elements.namedItem("label"),i=a.elements.namedItem("url"),e=a.elements.namedItem("statusCheck"),s=a.elements.namedItem("visibleMobile"),d=a.elements.namedItem("visibleTablet");if(t)t.value=r.label||"";if(i)i.value=r.url||"";if(e)e.checked=!!r.statusCheck;if(s)s.checked=r.visibleMobile!==!1;if(d)d.checked=r.visibleTablet!==!1}if(this.iconPicker)this.iconPicker.setSelectedIcon(this.selectedIconName)},100)}close(){this.dialog?.close(),this.selectedIconName="",this.resetForm()}resetForm(){setTimeout(()=>{let o=this.shadowRoot.getElementById("bookmark-form");if(o)o.reset();if(this.iconPicker)this.iconPicker.setSelectedIcon("")},100)}initializeIconPicker(){requestAnimationFrame(()=>{let o=this.shadowRoot.getElementById("icon-picker-container");if(!o){console.error("[Modal] Icon picker container not found");return}if(!this.iconPicker)this.iconPicker=document.createElement("icon-picker"),this.iconPicker.addEventListener("icon-selected",(r)=>{this.selectedIconName=r.detail.iconName});o.innerHTML="",o.appendChild(this.iconPicker)})}render(){this.shadowRoot.innerHTML=`
            <style>${ka}</style>
            ${ya({isOpen:!0,isEditMode:this.isEditMode})}
        `,this.dialog=this.shadowRoot.getElementById("modal"),this.setupListeners()}}if(!customElements.get("add-bookmark-modal"))customElements.define("add-bookmark-modal",wa);_();var Po=[{id:"clock",name:"Clock",icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',description:"Digital clock with date",defaultW:2,defaultH:1,componentTag:"widget-clock"},{id:"notepad",name:"Notepad",icon:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',description:"Simple sticky note",defaultW:2,defaultH:2,componentTag:"widget-notepad"},{id:"telemetry",name:"System Status",icon:'<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',description:"CPU, RAM and Temp",defaultW:2,defaultH:1,componentTag:"widget-telemetry"}];class $a extends HTMLElement{dialog=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(){if(this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close()}selectWidget(o){this.dispatchEvent(new CustomEvent("widget-selected",{detail:o,bubbles:!0,composed:!0})),this.close()}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: contents;
                }
                dialog {
                    background: var(--surface);
                    color: var(--text-main);
                    border: 1px solid var(--border);
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
                    background: linear-gradient(135deg, var(--text-main) 0%, var(--text-dim) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .title-group p {
                    margin: 4px 0 0 0;
                    color: var(--text-dim);
                    font-size: 14px;
                }
                .close-btn {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-dim);
                    padding: 8px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .close-btn:hover {
                    background: rgba(var(--accent-rgb), 0.1);
                    transform: rotate(90deg);
                    color: var(--accent);
                    border-color: rgba(var(--accent-rgb), 0.3);
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                .card {
                    background: var(--card-bg-inactive);
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    padding: 24px;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                }
                .card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: radial-gradient(circle at top right, var(--accent), transparent 70%);
                    opacity: 0;
                    transition: opacity 0.5s;
                    z-index: 0;
                }
                .card:hover {
                    background: rgba(var(--accent-rgb), 0.08);
                    border-color: var(--accent);
                    transform: translateY(-8px) scale(1.02);
                    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.2), 0 0 20px rgba(var(--accent-rgb), 0.1);
                }
                .card:hover::before {
                    opacity: 0.15;
                }
                .icon-container {
                    width: 64px;
                    height: 64px;
                    background: var(--surface-solid);
                    border: 1px solid var(--border);
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    transition: all 0.3s;
                    z-index: 1;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
                }
                .card:hover .icon-container {
                    transform: translateY(-4px) rotate(-5deg);
                    background: var(--accent);
                    border-color: #fff;
                    box-shadow: 0 10px 20px rgba(var(--accent-rgb), 0.4);
                }
                .card:hover .icon-container svg {
                    fill: #fff;
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
                    color: var(--text-main);
                }
                .desc {
                    font-size: 13px;
                    color: var(--text-dim);
                    line-height: 1.5;
                    z-index: 1;
                }
            </style>
            <dialog id="modal">
                <div class="header">
                    <div class="title-group">
                        <h3>${n.t("widget.add_title")||"Add Widget"}</h3>
                        <p>${n.t("widget.add_subtitle")||"Enhance your dashboard with dynamic components"}</p>
                    </div>
                    <button class="close-btn" onclick="this.getRootNode().host.close()">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div class="grid">
                    ${Po.map((o)=>`
                        <div class="card" data-id="${o.id}">
                            <div class="icon-container">${o.icon}</div>
                            <div class="name">${n.t(`widget.${o.id}.name`)||o.name}</div>
                            <div class="desc">${n.t(`widget.${o.id}.description`)||o.description}</div>
                        </div>
                    `).join("")}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog"),this.shadowRoot.querySelectorAll(".card").forEach((o)=>{o.addEventListener("click",()=>{let r=o.getAttribute("data-id"),a=Po.find((t)=>t.id===r);if(a)this.selectWidget(a)})})}}customElements.define("add-widget-modal",$a);B();_();var za=`:host {
    display: contents;
}

dialog {
    background: var(--paper-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--paper-border);
    border-top: 1px solid var(--paper-border-top);
    border-radius: var(--radius);
    padding: 0;
    width: 90%;
    max-width: 420px;
    box-shadow: var(--paper-shadow);
    overflow: visible;
    color: var(--text-main);
}

dialog::backdrop {
    background: var(--overlay-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
}

dialog[open] {
    animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid var(--border);
}

.modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
}

.modal-close {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 8px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
}

.modal-close:hover {
    background: rgba(var(--accent-rgb), 0.1);
    transform: rotate(90deg);
    color: var(--accent);
    border-color: rgba(var(--accent-rgb), 0.3);
}

.content {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.field-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field-group label {
    font-size: 13px;
    font-weight: 500;
    color: var(--label-text);
}

.field-group input[type="text"],
.field-group input[type="number"] {
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--input-text);
    padding: 12px 16px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: 14px;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: all 0.2s;
}

.field-group input[type="text"]::placeholder,
.field-group input[type="number"]::placeholder {
    color: var(--input-placeholder);
}

.field-group input[type="text"]:focus,
.field-group input[type="number"]:focus {
    border-color: var(--input-focus-border);
    box-shadow: var(--input-focus-shadow);
}

.field-group small {
    font-size: 12px;
    color: var(--text-dim);
    opacity: 0.7;
}

.input-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.input-row input[type="text"] {
    flex: 1;
    width: auto;
    min-width: 0;
}

.input-row app-button {
    width: auto;
    flex: 0 0 auto;
}

.check-row {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 12px 16px;
    border-radius: var(--radius);
}

.check-row input[type="checkbox"] {
    appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid var(--border);
    border-radius: 4px;
    background: var(--input-bg);
    cursor: pointer;
    position: relative;
    transition: all 0.2s;
}

.check-row input[type="checkbox"]:checked {
    background: var(--accent);
    border-color: var(--accent);
}

.check-row input[type="checkbox"]:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.check-row label {
    color: var(--text-main);
    font-size: 14px;
    cursor: pointer;
}

.row-aligned {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.row-aligned label {
    flex-shrink: 0;
}

.row-aligned app-select {
    flex: 1;
    max-width: 150px;
}

.actions {
    padding: 16px 24px 24px 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.actions app-button {
    min-width: 120px;
}`;var Wo=new Map;async function xt(o,r){try{let a=await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${o}&longitude=${r}`);if(!a.ok)throw Error("TimeAPI failed");return(await a.json()).timeZone||"local"}catch(a){return console.error("[Timezone] TimeAPI error:",a),"local"}}async function bt(o){if(!o||o.trim()==="")return"local";let r=o.toLowerCase().trim();if(Wo.has(r))return Wo.get(r);try{let a=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(o)}&limit=1`,t=await fetch(a,{headers:{"User-Agent":"Lastboard/1.0"}});if(!t.ok)throw Error("Geocoding failed");let i=await t.json();if(i.length===0)return"local";let{lat:e,lon:s}=i[0],d=await xt(parseFloat(e),parseFloat(s));return Wo.set(r,d),d}catch(a){return console.error("[Timezone] Error resolving city:",o,a),"local"}}class ja extends HTMLElement{dialog=null;currentItem=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(o){if(this.currentItem=o,this.render(),this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close();this.currentItem=null}async save(){if(!this.currentItem)return;let o=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,r=o.widgetId,a={...o};if(r==="clock"){let t=this.shadowRoot?.getElementById("clock-city"),i=this.shadowRoot?.getElementById("clock-12h"),e=this.shadowRoot?.getElementById("clock-date"),s=this.shadowRoot?.getElementById("save-btn"),d=t?.value||"";if(s)s.disabled=!0,s.textContent=n.t("general.loading");let l=await bt(d);if(a.city=d,a.timezone=l,a.hour12=i?.checked||!1,a.showDate=e?.checked||!1,s)s.disabled=!1,s.textContent=n.t("general.save")}else if(r==="telemetry"){let t=this.shadowRoot?.getElementById("telemetry-interval");a.interval=t?parseInt(t.value):1000}if(this.currentItem.type==="section"){let t=this.shadowRoot?.getElementById("section-title");a.title=t?t.value:"",delete a.name}await x.updateItem({id:this.currentItem.id,content:JSON.stringify(a)}),this.close()}render(){if(!this.shadowRoot)return;let o={},r="";if(this.currentItem)o=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,r=o.widgetId;let a=(s)=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),t=()=>{if(!this.currentItem)return"";if(r==="clock"){let s=o.city||"",d=o.hour12||!1,l=o.showDate!==!1;return`
                    <div class="field-group">
                        <label>${n.t("widget.clock.city")}</label>
                        <input type="text" id="clock-city" value="${a(s)}" placeholder="${n.t("widget.clock.city_placeholder")}"/>
                        <small>${n.t("widget.clock.city_desc")}</small>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${d?"checked":""} />
                        <label for="clock-12h">${n.t("widget.clock.use_12h")}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${l?"checked":""} />
                        <label for="clock-date">${n.t("widget.clock.show_date")}</label>
                    </div>
                `}else if(r==="telemetry"){let s=o.interval||1000;return`
                    <div class="field-group row-aligned">
                        <label>${n.t("widget.telemetry.update_interval")}</label>
                        <app-select id="telemetry-interval" value="${s}"></app-select>
                    </div>
                `}else if(this.currentItem.type==="section"){let s=o.title||"";return`
                    <div class="field-group">
                        <label>${n.t("bookmark.label")}</label>
                        <div class="input-row">
                            <input type="text" id="section-title" value="${a(s)}" placeholder="${n.t("section.placeholder_title")}" />
                        </div>
                        <small>${n.t("section.leave_empty")}</small>
                    </div>
                `}return`<p>${n.t("widget.config.no_config")}</p>`},i=()=>{if(this.currentItem?.type==="section")return n.t("section.edit_title");return n.t("widget.config.title")};this.shadowRoot.innerHTML=`
            <style>${za}</style>
            <dialog id="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${i()}</h3>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="content">
                    ${t()}
                </div>
                <div class="actions">
                    ${["clock","telemetry"].includes(r)||this.currentItem?.type==="section"?`<app-button variant="primary" id="save-btn">${n.t("general.save")}</app-button>`:""}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog");let e=this.shadowRoot.getElementById("telemetry-interval");if(e)e.options=[{value:"1000",label:"1s"},{value:"2000",label:"2s"},{value:"5000",label:"5s"},{value:"10000",label:"10s"}];this.shadowRoot.getElementById("close-btn")?.addEventListener("click",()=>this.close()),this.shadowRoot.getElementById("save-btn")?.addEventListener("click",()=>this.save())}}customElements.define("widget-config-modal",ja);_();var Ga=({isOpen:o,title:r,message:a})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h3 class="modal-title">${r}</h3>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="modal-message">${a}</p>
        <div class="modal-actions">
            <app-button variant="danger" id="btn-confirm">${n.t("general.confirm")}</app-button>
        </div>
    </dialog>
`;_();var Fa=`:host {
    display: contents;
}

dialog {
    background: var(--surface-solid);
    color: var(--text-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px;
    width: 90%;
    max-width: 420px;
    backdrop-filter: blur(20px);
    box-shadow: var(--paper-shadow);
}

dialog::backdrop {
    background: var(--overlay-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

dialog[open] {
    animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(20px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
}

.modal-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-main);
}

.modal-close {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 8px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
}

.modal-close:hover {
    background: rgba(var(--accent-rgb), 0.1);
    transform: rotate(90deg);
    color: var(--accent);
    border-color: rgba(var(--accent-rgb), 0.3);
}

.modal-message {
    margin: 0 0 28px 0;
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.6;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}`;class La extends HTMLElement{dialog=null;titleText="Confirm Action";messageText="Are you sure?";resolvePromise=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this._unsubscribeI18n=n.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n()}setupDynamicListeners(){let o=this.shadowRoot.getElementById("modal-close"),r=this.shadowRoot.getElementById("btn-confirm");this.dialog=this.shadowRoot.getElementById("modal");let a=(t)=>{if(this.resolvePromise)this.resolvePromise(t),this.resolvePromise=null;this.dialog?.close()};if(o)o.onclick=()=>a(!1);if(r)r.onclick=()=>a(!0);if(this.dialog)this.dialog.onclick=(t)=>{if(t.target===this.dialog)a(!1)}}async confirm(o,r){return this.titleText=o,this.messageText=r,this.render(),this.dialog?.showModal(),new Promise((a)=>{this.resolvePromise=a})}render(){this.shadowRoot.innerHTML=`
            <style>${Fa}</style>
            ${Ga({isOpen:!0,title:this.titleText,message:this.messageText})}
        `,this.setupDynamicListeners()}}if(!customElements.get("confirmation-modal"))customElements.define("confirmation-modal",La);_();async function Ha(o){try{await n.ensureInitialized(),await o()}catch(r){console.error("[Bootstrap] Critical failure:",r),document.body.innerHTML=`
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
        `}}Ho();var H=document.getElementById("main-topbar"),Ba=document.getElementById("right-drawer"),Bo=document.getElementById("dashboard-root"),eo,Jo,Mo;Ha(async()=>{R.init(),await $.fetchUser();let o=$.getUser();if(o){if(o.language)await n.setLanguage(o.language);if(o.theme==="dark")R.enableDark();else if(o.theme==="light")R.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)R.enableDark();else R.enableLight();if(o.id)x.setUserId(o.id)}if(H){if(H.setState({user:o}),o&&o.project_name)H.setAttribute("title",o.project_name);$.subscribe((a)=>{if(a){if(H.setState({user:a}),a.project_name)H.setAttribute("title",a.project_name)}})}await x.fetchItems(),ht(),co.start(),eo=document.createElement("add-bookmark-modal"),document.body.appendChild(eo),Jo=document.createElement("add-widget-modal"),document.body.appendChild(Jo),Mo=document.createElement("confirmation-modal"),document.body.appendChild(Mo);let r=document.createElement("widget-config-modal");document.body.appendChild(r)});no.on(io.SHOW_CONFIRMATION,async(o)=>{let{title:r,message:a,onConfirm:t}=o.detail;if(Mo){if(await Mo.confirm(r,a)&&t)t()}});no.on(io.SHOW_WIDGET_CONFIG,(o)=>{let{item:r,type:a}=o.detail;if(a==="bookmark"){if(eo)eo.openForEdit(r)}else{let t=document.querySelector("widget-config-modal");if(t)t.open(r)}});no.on(io.NOTIFY,(o)=>{let r=document.querySelector("app-notifier");if(r)r.show(o.detail.message,o.detail.type)});if(H)H.addEventListener("drawer-toggle",(o)=>{if(o.detail.action==="open")Ba.open(),H.setState({drawerOpen:!0});else Ba.close(),H.setState({drawerOpen:!1})}),H.addEventListener("edit-mode-change",(o)=>{let r=o.detail.active;if(Bo.classList.toggle("edit-mode",r),!r)window.location.reload()}),H.addEventListener("search-input",(o)=>{let r=o.detail.query;x.setSearchQuery(r)}),H.addEventListener("add-item",async(o)=>{let r=o.detail.action;if(r==="add-bookmark"){if(eo)eo.open()}else if(r==="add-widget"){if(Jo)Jo.open()}else if(r==="add-section"){let t=x.getState().items||[],{collisionService:i}=await Promise.resolve().then(() => (N(),ro)),e=i.findFirstAvailableSlot(1,1,t),s={type:"section",x:e.x,y:e.y,w:1,h:1,content:JSON.stringify({title:""})},d=await x.addItem(s);if(d)no.emit(io.SHOW_WIDGET_CONFIG,{item:d,type:"section"})}});window.addEventListener("widget-selected",async(o)=>{let a=o.detail,i=x.getState().items||[],{collisionService:e}=await Promise.resolve().then(() => (N(),ro)),s=e.findFirstAvailableSlot(a.defaultW,a.defaultH,i),d={type:"widget",x:s.x,y:s.y,w:a.defaultW,h:a.defaultH,content:JSON.stringify({widgetId:a.id,text:a.id==="notepad"?"":void 0})};await x.addItem(d)});window.addEventListener("drawer-close",()=>{if(H)H.setState({drawerOpen:!1})});window.addEventListener("click",(o)=>{let r=o.target,a=document.getElementById("add-menu"),t=document.getElementById("add-toggle");if(a&&a.classList.contains("active")&&!a.contains(r)&&t&&!t.contains(r))a.classList.remove("active")});function ht(){if(!Bo)return;Bo.innerHTML="";let o=document.createElement("bookmark-grid");Bo.appendChild(o)}
