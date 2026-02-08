var nt=Object.defineProperty;var ko=(o,r)=>{for(var i in r)nt(o,i,{get:r[i],enumerable:!0,configurable:!0,set:(t)=>r[i]=()=>t})};var G=function(o,r,i,t){var a=arguments.length,n=a<3?r:t===null?t=Object.getOwnPropertyDescriptor(r,i):t,d;if(typeof Reflect==="object"&&typeof Reflect.decorate==="function")n=Reflect.decorate(o,r,i,t);else for(var c=o.length-1;c>=0;c--)if(d=o[c])n=(a<3?d(n):a>3?d(r,i,n):d(r,i))||n;return a>3&&n&&Object.defineProperty(r,i,n),n};var F=(o,r)=>{if(typeof Reflect==="object"&&typeof Reflect.metadata==="function")return Reflect.metadata(o,r)},U=(o,r)=>()=>(o&&(r=o(o=0)),r);class yr{baseUrl;constructor(){this.baseUrl=window.LASTBOARD_CONFIG?.API_BASE_URL||""}getCsrfToken(){let o=document.cookie.split("; ").find((r)=>r.startsWith("csrf_token="));return o?decodeURIComponent(o.split("=")[1]):""}async request(o,r){let i=`${this.baseUrl}${o}`,t=(r.method||"GET").toUpperCase(),a={"Content-Type":"application/json","Cache-Control":"no-cache, no-store, must-revalidate",Pragma:"no-cache",Expires:"0",...r.headers};if(t==="POST"||t==="PUT"||t==="PATCH"||t==="DELETE"){let n=this.getCsrfToken();if(n)a["X-CSRF-Token"]=n}try{let n=await fetch(i,{...r,headers:a,cache:"no-store"});if(!n.ok){let c=await n.json().catch(()=>({}));throw Error(c.error||`HTTP ${n.status}: ${n.statusText}`)}let d=await n.text();return d?JSON.parse(d):{}}catch(n){throw console.error(`[ApiService] Request failed: ${i}`,n),n}}async get(o){return this.request(o,{method:"GET"})}async post(o,r){return this.request(o,{method:"POST",body:JSON.stringify(r)})}async patch(o,r){return this.request(o,{method:"PATCH",body:JSON.stringify(r)})}async put(o,r){return this.request(o,{method:"PUT",body:JSON.stringify(r)})}async delete(o){return this.request(o,{method:"DELETE"})}}var q;var Wo=U(()=>{q=new yr});var X;var Vo=U(()=>{Wo();X={async getCurrentUser(){return q.get("/api/me")},async updateProfile(o){return q.post("/api/user/update-profile",o)},async updatePreferences(o){return q.post("/api/user/preferences",o)},async changePassword(o){return q.post("/api/user/change-password",o)},async getUsers(){return q.get("/api/users")},async createUser(o){return q.post("/api/users",o)},async adminUpdateUser(o){return q.put("/api/users",o)},async deleteUser(o){return q.delete(`/api/users?id=${o}`)}}});var S;var ur=U(()=>{S=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}]});class co{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("lastboard_lang"),r=navigator.language.split("-")[0],i="en";if(o&&S.find((t)=>t.code===o))i=o;else if(S.find((t)=>t.code===r))i=r;if(i!=="en")await this.loadLocale(i);this.currentLanguage=i,this.notifyListeners()}static getInstance(){if(!co.instance)co.instance=new co;return co.instance}getLocale(){return{...S.find((r)=>r.code===this.currentLanguage)||S[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let o=(i)=>/^[a-zA-Z]/.test(i);return[...S].sort((i,t)=>{let a=o(i.name),n=o(t.name);if(a&&!n)return-1;if(!a&&n)return 1;return i.name.localeCompare(t.name,void 0,{sensitivity:"base"})})}async loadLocale(o){if(this.cache.has(o))return;try{let r=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!r.ok)throw Error(`Failed to load locale ${o}`);let i=await r.json();this.cache.set(o,i)}catch(r){console.error(r)}}async setLanguage(o){if(S.find((r)=>r.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("lastboard_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,r){let i=this.cache.get(this.currentLanguage),t=this.cache.get("en"),a=i?.[o];if(!a&&t)a=t[o];if(!a)return o;if(r)Object.keys(r).forEach((n)=>{a=a.replace(`{${n}}`,r[n])});return a}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((r)=>r(o))}async ensureInitialized(){return this.initialized}}var s;var u=U(()=>{ur();s=co.getInstance()});var To={};ko(To,{userStore:()=>m});class wr{user=null;listeners=[];constructor(){this.loadFromStorage()}loadFromStorage(){let o=localStorage.getItem("lastboard_user_cache");if(o)try{this.user=JSON.parse(o),this.applyAesthetics(),this.notify()}catch(r){console.error("Failed to parse user cache",r)}}saveToStorage(){if(this.user)localStorage.setItem("lastboard_user_cache",JSON.stringify(this.user))}subscribe(o){if(this.listeners.push(o),this.user)o(this.user);return()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notify(){this.listeners.forEach((o)=>o(this.user)),this.saveToStorage()}setUser(o){if(!o)return;this.user={...o,preferences:{accent_color:o.accent_color||"blue",language:o.language||"en",theme:o.theme,grid_columns:o.grid_columns||12,project_name:o.project_name||"Lastboard",beta_updates:o.beta_updates},project_name:o.project_name||"Lastboard"},this.applyAesthetics(),this.notify()}applyAesthetics(){if(!this.user||!this.user.preferences)return;let o=this.user.preferences,r=document.documentElement;if(o.grid_columns)r.style.setProperty("--user-preferred-columns",`${o.grid_columns}`);else r.style.setProperty("--user-preferred-columns","12");if(o.accent_color){let i=this.getAccentHex(o.accent_color);r.style.setProperty("--accent",i),localStorage.setItem("lastboard_accent",i)}if(o.theme==="light")r.classList.add("light-theme");else r.classList.remove("light-theme")}getAccentHex(o){if(o.startsWith("#"))return o;return{blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"}[o]||"#0078D4"}async updatePreferences(o){if(!this.user||!this.user.preferences)return;let r={...this.user.preferences};if(this.user.preferences={...this.user.preferences,...o},o.accent_color)this.user.accent_color=o.accent_color;if(o.language)this.user.language=o.language;if(o.project_name)this.user.project_name=o.project_name;if(o.theme)this.user.preferences.theme=o.theme;if(o.grid_columns)this.user.preferences.grid_columns=o.grid_columns;if(o.beta_updates!==void 0)this.user.preferences.beta_updates=o.beta_updates;this.applyAesthetics(),this.notify();try{let i={accent_color:this.user.accent_color,language:this.user.language,theme:this.user.preferences.theme,grid_columns:this.user.preferences.grid_columns,project_name:this.user.project_name,beta_updates:this.user.preferences.beta_updates};if(await X.updatePreferences(i),window.notifier)window.notifier.show(s.t("general.success")||"Preferences saved")}catch(i){if(console.error("[UserStore] Failed to sync preferences, rolling back",i),this.user.preferences=r,this.applyAesthetics(),this.notify(),window.notifier)window.notifier.show(s.t("notifier.save_error"),"error");throw i}}async updateProfile(o){if(!this.user)return;try{if(await X.updateProfile(o),this.user={...this.user,...o},this.notify(),window.notifier)window.notifier.show(s.t("notifier.profile_updated"))}catch(r){if(console.error("[UserStore] Update profile failed",r),window.notifier)window.notifier.show(s.t("notifier.profile_error"),"error")}}async changePassword(o){try{await X.changePassword(o)}catch(r){throw console.error("[UserStore] Change password failed",r),r}}getUser(){return this.user}async fetchUser(){try{let o=await X.getCurrentUser();this.setUser(o)}catch(o){if(console.error("[UserStore] Error fetching user",o),!this.user){if(window.notifier)window.notifier.show(s.t("auth.session_expired"),"error")}}}}var m;var po=U(()=>{Vo();u();m=new wr});var D;var Oo=U(()=>{Wo();D={async getItems(){return q.get("/api/dashboard")},async updateItem(o){let r={...o};if(o.parent_id===void 0&&"parent_id"in o)r.clear_parent=!0;return q.patch(`/api/dashboard/item/${o.id}`,r)},async createItem(o){return q.post("/api/dashboard/item",o)},async deleteItem(o){return q.delete(`/api/dashboard/item/${o}`)},async checkHealth(o){return q.get(`/api/dashboard/health?url=${encodeURIComponent(o)}`)}}});var $r={};ko($r,{socketService:()=>dt});class Do{socket=null;listeners=[];reconnectTimeout;reconnectDelay=1000;static MAX_DELAY=30000;constructor(){this.connect()}connect(){let o=window.location.protocol==="https:"?"wss:":"ws:",r=window.location.host,i=`${o}//${r}/ws`;this.socket=new WebSocket(i),this.socket.onopen=()=>{this.reconnectDelay=1000},this.socket.onmessage=(t)=>{try{let a=JSON.parse(t.data);this.notify(a)}catch(a){console.error("[SocketService] Failed to parse message",a)}},this.socket.onclose=()=>{console.warn("[SocketService] WebSocket closed. Reconnecting..."),this.scheduleReconnect()},this.socket.onerror=(t)=>{console.error("[SocketService] WebSocket error",t),this.socket?.close()}}scheduleReconnect(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);let o=Math.random()*this.reconnectDelay*0.5;this.reconnectTimeout=setTimeout(()=>this.connect(),this.reconnectDelay+o),this.reconnectDelay=Math.min(this.reconnectDelay*2,Do.MAX_DELAY)}destroy(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);if(this.socket)this.socket.onclose=null,this.socket.close(),this.socket=null}subscribe(o){return this.listeners.push(o),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notify(o){this.listeners.forEach((r)=>r(o))}}var dt;var mr=U(()=>{dt=new Do});var lo={};ko(lo,{collisionService:()=>E});var E;var oo=U(()=>{E={isOverlap(o,r){return o.x<r.x+r.w&&o.x+o.w>r.x&&o.y<r.y+r.h&&o.y+o.h>r.y},calculateDropValidity(o,r,i=12){let t=Number(o.x),a=Number(o.y),n=Number(o.w),d=Number(o.h);if(t<1||t+n-1>i||a<1)return{valid:!1,x:t,y:a};let p=r.find((l)=>l.id===o.id)?.type==="section",g={x:t,y:a,w:n,h:d};for(let l of r){if(l.id===o.id)continue;let b=Number(l.x),e=Number(l.y),h=Number(l.w||1),y=Number(l.h||1),H={x:b,y:e,w:h,h:y};if(l.parent_id){let w=r.find((k)=>k.id===l.parent_id);if(w)H.x=Number(w.x)+b-1,H.y=Number(w.y)+e-1;else continue}if(this.isOverlap(g,H)){if(p&&l.parent_id===o.id){let w=Number(l.x),k=Number(l.y),T=Number(l.w||1),O=Number(l.h||1);if(w+T-1>n)return{valid:!1,x:t,y:a};if(k+O-1>d)return{valid:!1,x:t,y:a};continue}if(!p&&l.type==="section"){let w=t-Number(l.x)+1,k=a-Number(l.y)+1;if(w<1||w+n-1>Number(l.w||1)||k<1||k+d-1>Number(l.h||1))return{valid:!1,x:t,y:a};let T=r.filter((_)=>_.parent_id===l.id),O=!1;for(let _ of T){let eo={x:Number(_.x),y:Number(_.y),w:Number(_.w||1),h:Number(_.h||1)},I={x:w,y:k,w:n,h:d};if(this.isOverlap(I,eo)){O=!0;break}}if(!O)return{valid:!0,x:t,y:a,targetGroup:l}}return{valid:!1,x:t,y:a}}}return{valid:!0,x:t,y:a}},snapToGrid(o,r,i,t){let a=i+t,n=Math.max(1,Math.floor(o/a)+1),d=i+t,c=Math.max(1,Math.floor(r/d)+1);return{x:n,y:c}},findFirstAvailableSlot(o,r,i,t=12){return this.findCompactPosition(o,r,i,t)},findAvailableSlot(o,r,i,t){let a=1;while(!0){for(let n=1;n<=t-o+1;n++){let d={x:n,y:a,w:o,h:r},c=!1;for(let p of i)if(this.isOverlap(d,p)){c=!0;break}if(!c)return{x:n,y:a}}if(a++,a>500)return console.warn("[CollisionService] Grid exhausted, no available slot found. Grid may be full."),{x:1,y:500}}},findCompactPosition(o,r,i,t,a){let n=1,d=1;while(!0){for(let c=1;c<=t-o+1;c++){let p={x:c,y:n,w:o,h:r},g=!1;for(let l of i){if(a&&l.id===a)continue;let b={x:l.x,y:l.y,w:l.w||1,h:l.h||1};if(this.isOverlap(p,b)){g=!0;break}}if(!g)return{x:c,y:n}}if(n++,n>500)return console.warn("[CollisionService] Grid exhausted, no compact position found. Grid may be full."),{x:1,y:500}}}}});var Gr={};ko(Gr,{dashboardStore:()=>x});class jr{state={isEditing:!1,items:[],searchQuery:"",isOffline:!1,updateAvailable:!1,stats:null,availableWidth:1200,gridColumns:12};listeners=[];userId=0;getStorageKey(){return this.userId?`lastboard-items-${this.userId}`:"lastboard-items"}setUserId(o){this.userId=o}constructor(){this.initSocket(),this.checkSystemUpdate()}initSocket(){Promise.resolve().then(() => (mr(),$r)).then(({socketService:o})=>{o.subscribe((r)=>{this.state.stats={cpu_usage:r.cpu_usage,ram_usage:r.ram_usage,temperature:r.temperature},this.notify()})})}async checkSystemUpdate(){try{let o=await fetch("/api/system/update/check");if(o.ok){if((await o.json()).available)this.state.updateAvailable=!0,this.notify()}}catch(o){}}saveToLocalStorage(){try{let o=JSON.stringify(this.state.items);localStorage.setItem(this.getStorageKey(),o)}catch(o){if(console.error("[DashboardStore] Failed to save to localStorage",o),o.name==="QuotaExceededError"||o.code===22)this.sanitizeStorage()}}loadFromLocalStorage(){try{this.sanitizeStorage();let o=localStorage.getItem(this.getStorageKey());if(o){let r=JSON.parse(o);if(Array.isArray(r)&&r.length>0)this.state.items=r}}catch(o){console.error("[DashboardStore] Failed to load from localStorage",o)}}sanitizeStorage(){try{let o=[];for(let r=0;r<localStorage.length;r++){let i=localStorage.key(r);if(i&&(i.startsWith("kashboard")||i.includes("user_cache")))o.push(i)}o.forEach((r)=>localStorage.removeItem(r))}catch(o){}}subscribe(o){return this.listeners.push(o),this.ensureItemsIsArray(),o({...this.state,items:this.deepCopyItems(this.state.items)}),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}ensureItemsIsArray(){if(!Array.isArray(this.state.items))console.error("[DashboardStore] CRITICAL: items is not an array, resetting to empty array",typeof this.state.items),this.state.items=[]}deepCopyItems(o){return o.map((r)=>{let i=r.content;if(typeof r.content==="string")try{let t=JSON.parse(r.content);if(typeof t==="object"&&t!==null)i=JSON.stringify(t)}catch{}return{...r,content:i,status:r.status}})}setItemStatus(o,r){let i=this.state.items.findIndex((t)=>t.id===o);if(i===-1)return;if(this.state.items[i].status===r)return;this.state.items[i].status=r,this.notify()}notify(){this.ensureItemsIsArray();let o={...this.state,items:this.deepCopyItems(this.state.items)};this.listeners.forEach((r)=>r(o))}setEditMode(o){this.state.isEditing=o,this.notify()}toggleEditMode(){this.setEditMode(!this.state.isEditing)}setSearchQuery(o){this.state.searchQuery=o.toLowerCase().trim(),this.notify()}setGridMetrics(o,r){if(o===this.state.availableWidth&&r===this.state.gridColumns)return;this.state.availableWidth=o,this.state.gridColumns=r,this.notify()}async fetchItems(){try{try{let o=await D.getItems();if(Array.isArray(o))this.state.items=o,this.state.isOffline=!1,this.saveToLocalStorage();else throw Error("Backend returned invalid data")}catch(o){this.state.isOffline=!0;let r=localStorage.getItem(this.getStorageKey());if(r){let i=JSON.parse(r);if(Array.isArray(i)&&i.length>0)this.state.items=i;else this.state.items=[...zr],this.saveToLocalStorage()}else this.state.items=[...zr],this.saveToLocalStorage()}this.ensureItemsIsArray(),this.notify()}catch(o){console.error("[DashboardStore] Failed to fetch dashboard items",o),this.state.items=[]}}async updateItem(o){try{this.ensureItemsIsArray();let r=this.state.items.findIndex((t)=>t.id===o.id);if(r===-1){console.warn("[DashboardStore] Item not found for update:",o.id);return}let i={...this.state.items[r]};this.state.items[r]={...this.state.items[r],...o},this.saveToLocalStorage(),this.notify();try{await D.updateItem(o),this.state.isOffline=!1,this.notify()}catch(t){console.error("[DashboardStore] Failed to sync item update (offline?), keeping local state",t),this.state.isOffline=!0,this.saveToLocalStorage(),this.notify()}}catch(r){console.error("[DashboardStore] Error updating item",r)}}async resizeItem(o,r,i){let t=this.state.items.find((a)=>a.id===o);if(!t)return;if(await this.updateItem({id:o,w:r,h:i}),t.type==="section")await this.reflowChildren(o,r)}async reflowChildren(o,r){let{collisionService:i}=await Promise.resolve().then(() => (oo(),lo)),t=this.state.items.filter((n)=>n.parent_id===o).sort((n,d)=>n.y-d.y||n.x-d.x);if(t.length===0)return;let a=[];for(let n of t){let d=i.findAvailableSlot(n.w,n.h,a,r);if(a.push({x:d.x,y:d.y,w:n.w,h:n.h}),n.x!==d.x||n.y!==d.y)await this.updateItem({id:n.id,x:d.x,y:d.y})}}async addItem(o){try{this.ensureItemsIsArray();try{let r={...o};if(r.type==="widget"&&!r.url)r.url="";let{userStore:i}=await Promise.resolve().then(() => (po(),To)),a=i.getUser()?.preferences,n=this.state.gridColumns;if(!n||n<1){let c=a?.widget_min_width||140,p=16,g=document.querySelector("bookmark-grid"),l=this.state.availableWidth||g?.clientWidth||window.innerWidth;n=Math.floor((l+16)/(c+16))}if(n<1)n=1;if(n>24)n=24;if(!r.x||!r.y){let{collisionService:c}=await Promise.resolve().then(() => (oo(),lo)),p=c.findFirstAvailableSlot(r.w||1,r.h||1,this.state.items,n);r.x=p.x,r.y=p.y}let d=await D.createItem(r);return this.state.isOffline=!1,this.state.items.push(d),this.saveToLocalStorage(),this.notify(),d}catch(r){console.error("[DashboardStore] Failed to add item to backend",r);return}}catch(r){console.error("[DashboardStore] Error adding item",r);return}}async deleteItem(o){try{this.ensureItemsIsArray();let r=this.state.items.findIndex((t)=>t.id===o);if(r===-1){console.warn("[DashboardStore] Item not found for deletion:",o);return}let i=this.state.items[r];this.state.items.splice(r,1),this.saveToLocalStorage(),this.notify();try{await D.deleteItem(o)}catch(t){console.error("[DashboardStore] Failed to delete item, rolling back",t),this.state.items.push(i),this.saveToLocalStorage(),this.notify()}}catch(r){console.error("[DashboardStore] Error deleting item",r)}}getState(){return this.ensureItemsIsArray(),{...this.state,items:[...this.state.items]}}}var zr,x;var Y=U(()=>{Oo();zr=[{id:1,type:"bookmark",x:1,y:1,w:1,h:1,content:{label:"CodigoSH",url:"https://github.com/CodigoSH/Lastboard",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/git.png",iconName:"git"}}];x=new jr});var hr={};ko(hr,{eventBus:()=>fo,EVENTS:()=>ho});var ho,Yi,fo;var Lo=U(()=>{ho={SHOW_CONFIRMATION:"lastboard:show-confirmation",SHOW_WIDGET_CONFIG:"lastboard:show-widget-config",NOTIFY:"lastboard:notify"};Yi=class Yi extends EventTarget{emit(o,r){this.dispatchEvent(new CustomEvent(o,{detail:r}))}on(o,r){this.addEventListener(o,r)}off(o,r){this.removeEventListener(o,r)}};fo=new Yi});po();Y();Y();Oo();class Hr{interval=null;checkFrequency=300000;start(){if(this.interval)return;setTimeout(()=>this.checkAll(),2000),this.interval=window.setInterval(()=>{this.checkAll()},this.checkFrequency)}stop(){if(this.interval)clearInterval(this.interval),this.interval=null}async checkAll(){let r=x.getState().items.filter((d)=>{if(d.type!=="bookmark")return!1;let c=d.content;if(typeof c==="string")try{c=JSON.parse(c)}catch(p){return!1}return c&&c.statusCheck===!0});r.forEach((d)=>this.updateUIStatus(d.id,"pending"));let i=5,t=[...r],a=async()=>{while(t.length>0){let d=t.shift();if(d)await this.checkItem(d)}},n=Array(Math.min(r.length,i)).fill(null).map(()=>a());await Promise.all(n)}async checkItem(o){let r=o.content;if(typeof r==="string")try{r=JSON.parse(r)}catch(t){return}let i=r.url;if(!i||i==="#"||i.startsWith("javascript:"))return;try{if((await D.checkHealth(i)).status==="up")this.updateUIStatus(o.id,"up");else this.updateUIStatus(o.id,"down")}catch(t){console.warn(`[StatusService] ${i} health check failed:`,t),this.updateUIStatus(o.id,"down")}}updateUIStatus(o,r){x.setItemStatus(o,r)}}var yo=new Hr;class L{static STORAGE_KEY="lastboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,r,i){let t="";if(i){let a=new Date;a.setTime(a.getTime()+i*24*60*60*1000),t="; expires="+a.toUTCString()}document.cookie=o+"="+(r||"")+t+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let r=await o.json();if(r.theme==="dark")this.enableDark();else if(r.theme==="light")this.enableLight()}}catch(o){}}}u();var Fr=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var qr=`:host {
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
}`;class Br extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${qr}</style>
            ${Fr()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",Br);var Kr=`:host {
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
}`;class Jr extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(o){if(this.getAttribute("type")==="submit"){let r=this.closest("form");if(r)if(r.requestSubmit)r.requestSubmit();else r.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(o){this._loading=o,this.render()}get loading(){return this._loading}render(){let o=this.getAttribute("variant")||"ghost",r=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${Kr}</style>
            <button class="btn btn--${o}" ${this._loading?"disabled":""}>
                ${r}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",Jr);var Qr=({src:o,initials:r,alt:i})=>`
    <div class="avatar" title="${i}">
        ${o?`<img src="${o}" alt="${i}" class="avatar__img">`:`<span class="avatar__initials">${r}</span>`}
    </div>
`;var Zr=`:host {
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
}`;class Yr extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(o,r,i){if(r!==i)this.render()}render(){let o=this.getAttribute("src"),r=this.getAttribute("initials")||"??",i=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${Zr}</style>
            ${Qr({src:o||void 0,initials:r,alt:i})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",Yr);u();po();Vo();u();var Ar=(o)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${s.t("settings.profile")}</div>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" onclick="this.nextElementSibling.click()">
                    <app-avatar initials="${o.initials||"??"}" src="${o.avatar_url||""}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">${s.t("action.change_image")}</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" onchange="this.getRootNode().host.handleAvatarChange(event)">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${o.username||s.t("settings.default_user")}</span>
                    <span class="mono-tag">
                        ${(()=>{let r=(o.role||"").toLowerCase();if(o.is_superadmin)return s.t("settings.role_super_admin");if(r==="admin"||r==="administrator")return s.t("settings.role_admin");if(r==="user")return s.t("settings.role_user");return o.role||s.t("settings.default_role")})()}
                    </span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${s.t("settings.display_username")}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${o.username||""}" placeholder="${s.t("settings.display_username")}">
                        <app-button variant="primary" onclick="this.getRootNode().host.updateUsername(document.getElementById('username-input').value)">${s.t("action.update")}</app-button>
                    </div>
                </div>
            </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${s.t("auth.password")}</div>
            <h3 class="settings-content__title">${s.t("settings.system_password")}</h3>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${s.t("settings.current_password")}</label>
                <input type="password" id="current-password" class="settings-content__input" placeholder="${s.t("settings.password_placeholder")}">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${s.t("settings.new_password")}</label>
                <input type="password" id="new-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div class="settings-content__form-group">
                <label class="settings-content__label">${s.t("settings.confirm_password")}</label>
                <input type="password" id="confirm-password" class="settings-content__input" placeholder="••••••••">
            </div>
            <div style="margin-top: 32px;">
                <app-button variant="primary" onclick="this.getRootNode().host.updatePassword()">${s.t("general.save")}</app-button>
            </div>
        </div>
    </div>
`,Mr=(o,r,i)=>`
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">${s.t("settings.appearance")}</div>
             <h3 class="settings-content__title">${s.t("settings.studio_accent")}</h3>
             <div class="settings-content__color-grid">
                ${i.map((t)=>`
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
            <div class="mono-tag settings-content__section-spacer" style="margin-bottom: 8px;">${s.t("settings.system_locale")}</div>
            <h3 class="settings-content__title">${s.t("settings.localization")}</h3>
            <div class="settings-content__form-group">
                <div style="display: flex; gap: 16px;">
                    <div style="flex: 1;">
                        <label class="settings-content__label">${s.t("settings.language")}</label>
                        <app-select id="language-select" value="${o.language}"></app-select>
                    </div>
                    <div style="flex: 1;">
                        <label class="settings-content__label">${s.t("settings.theme_mode")}</label>
                         <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!o.theme||o.theme==="system"||o.theme==="dark"?"active":""}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'dark'})">
                                \uD83C\uDF19 ${s.t("settings.dark")}
                            </button>
                            <button class="settings-content__segment ${o.theme==="light"?"active":""}" 
                                    onclick="this.getRootNode().host.savePrefs({theme: 'light'})">
                                ☀️ ${s.t("settings.light")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`,Ur=(o)=>`
    <div class="bento-grid">
        <div class="bento-card" style="grid-column: span 2;">
            <div class="mono-tag" style="margin-bottom: 12px;">${s.t("settings.fluid_grid_architecture")}</div>
            
            <!-- Project Name -->
            <div class="settings-content__form-group" style="margin-bottom: 24px;">
                <label class="settings-content__label">${s.t("settings.project_name")}</label>
                <div style="display: flex; gap: 8px;">
                     <input type="text" 
                            id="project-name-input"
                            class="settings-content__input" 
                            value="${o.project_name||"Lastboard"}" 
                            placeholder="Lastboard">
                     <app-button variant="primary" onclick="this.getRootNode().host.savePrefs({project_name: this.getRootNode().getElementById('project-name-input').value})">${s.t("action.update")}</app-button>
                </div>
            </div>

            <div class="settings-content__personalization-grid">
                <div class="settings-content__slider-group">
                    <div class="settings-content__slider-header">
                        <label class="settings-content__slider-label">${s.t("settings.grid_columns")}</label>
                        <span class="settings-content__slider-value" id="val-grid_columns">${o.grid_columns||12}</span>
                    </div>
                    <input type="range" 
                           min="3" max="16" step="1"
                           value="${o.grid_columns||12}"
                           oninput="this.getRootNode().host.updateColumns(this.value)"
                           onchange="this.getRootNode().host.commitColumns(this.value)">
                </div>
            </div>
            
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                ${s.t("settings.density_desc")}
            </p>
        </div>
    </div>
`,Xr=(o)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${s.t("settings.admin_section")}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${s.t("settings.user_management")}</h3>
                <app-button variant="primary" onclick="this.getRootNode().host.openAddUserModal()" style="width: auto; padding: 0 16px;">+ ${s.t("action.add_user")}</app-button>
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
                                    ${(()=>{let i=(r.role||"").toLowerCase();if(r.is_superadmin)return s.t("settings.role_super_admin");if(i==="admin"||i==="administrator")return s.t("settings.role_admin");if(i==="user")return s.t("settings.role_user");return r.role})()}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                             <app-button variant="ghost" onclick="this.getRootNode().host.openEditUserModal(${r.id}, '${r.username}', '${r.role}')">${s.t("general.edit")}</app-button>
                            <app-button variant="ghost" onclick="this.getRootNode().host.deleteUser(${r.id})">${s.t("general.delete")}</app-button>
                        </div>
                    </div>
                `).join("")}
            </div>
             ${(o||[]).length===0?`<p class="settings-content__text-dim">${s.t("settings.no_users")}</p>`:""}
        </div>
    </div>
    
     <dialog id="add-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${s.t("action.add_new_user")}</h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('add-user-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${s.t("auth.username")}</label>
            <input type="text" id="new-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${s.t("auth.password")}</label>
            <input type="password" id="new-user-password" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${s.t("settings.role")}</label>
            <app-select id="new-user-role" value="user"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.createUser()">${s.t("general.save")}</app-button>
        </div>
    </dialog>

    <dialog id="edit-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${s.t("action.edit_user")}</h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('edit-user-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <input type="hidden" id="edit-user-id">
        <div class="settings-content__form-group">
            <label class="settings-content__label">${s.t("auth.username")}</label>
            <input type="text" id="edit-user-username" class="settings-content__input">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${s.t("settings.new_password")}</label>
            <input type="password" id="edit-user-password" class="settings-content__input" placeholder="${s.t("settings.password_leave_blank")}">
        </div>
        <div class="settings-content__form-group">
            <label class="settings-content__label">${s.t("settings.role")}</label>
            <app-select id="edit-user-role"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.updateAdminUser()">${s.t("action.save_changes")}</app-button>
        </div>
    </dialog>
`,Lr=()=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <!-- System Migration Section -->
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 24px;">${s.t("settings.system_data")}</div>
            
            <div class="settings-content__action-group">
                <!-- Export -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${s.t("settings.export_db")}</h3>
                        <p>${s.t("settings.export_desc")}</p>
                    </div>
                    <app-button variant="primary" onclick="this.getRootNode().host.downloadBackup()">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        ${s.t("action.download_backup")}
                    </app-button>
                </div>

                <!-- Import -->
                <div class="settings-content__action-row">
                    <div class="settings-content__action-info">
                        <h3>${s.t("settings.import_db")}</h3>
                        <p>${s.t("settings.import_desc")} <br><span style="color: var(--accent); font-weight: 500;">${s.t("settings.import_warn")}</span></p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                         <input type="file" id="backup-upload" accept=".json" style="display: none;" onchange="this.getRootNode().host.restoreBackup(this.files[0])">
                         <app-button variant="primary" onclick="this.getRootNode().getElementById('backup-upload').click()">
                            <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
                            ${s.t("action.select_file")}
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
                    ${s.t("settings.factory_reset")}
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: var(--danger-color); opacity: 0.8;">
                    ${s.t("settings.reset_desc")}
                </p>
             </div>
             <app-button onclick="this.getRootNode().host.openResetModal()" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent; transition: all 0.2s;">
                ${s.t("action.reset_system")}
             </app-button>
        </div>
    </div>

    <!-- Factory Reset Confirmation Modal -->
    <dialog id="reset-confirm-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 440px; backdrop-filter: blur(20px); box-shadow: var(--paper-shadow);">
        <div class="modal-header">
            <h3 class="modal-title" style="color: var(--danger-color); font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: var(--danger-color);"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                ${s.t("settings.confirm_reset_title")}
            </h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('reset-confirm-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="settings-content__text-dim" style="font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
            ${s.t("settings.confirm_reset_msg")}
            ${s.t("settings.type_delete")}
        </p>

        <div class="settings-content__form-group">
            <input type="text" id="reset-confirm-input" class="settings-content__input" placeholder="${s.t("settings.type_delete_placeholder")}" style="border-color: var(--danger-color); opacity: 0.6; font-family: monospace;">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 32px; width: 100%;">
            <app-button id="btn-reset-confirm" variant="danger" onclick="this.getRootNode().host.executeFactoryReset()" style="flex: 1; justify-content: center;">
                ${s.t("action.erase_everything")}
            </app-button>
        </div>
    </dialog>
`,Rr=(o,r,i)=>{let t=i?.toLowerCase()==="admin"||i?.toLowerCase()==="administrator";return`
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
             
             <h2 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-main);">${s.t("app.title")}</h2>
             <p class="settings-content__text-dim" style="margin: 0 0 32px 0;">${o}</p>

             <div style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 400px;">
                ${t?r?`
                    ${r.is_docker?`
                        <div style="background: rgba(var(--info-rgb), 0.1); border: 1px solid rgba(var(--info-rgb), 0.3); padding: 16px; border-radius: var(--radius); width: 100%; text-align: left;">
                             <div style="display: flex; gap: 12px; align-items: flex-start;">
                                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: var(--accent); flex-shrink: 0;"><path d="M21 12l-4.37-6.16c-.37-.52-.98-.84-1.63-.84h-3V4c0-1.1-.9-2-2-2s-2 .9-2 2v1H5c-.65 0-1.26.32-1.63.84L-1 12v3h2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v-3zm-11 7H7v-3h3v3zm-5 0H2v-3h3v3zm12 0h-3v-3h3v3z"/></svg>
                                <div>
                                    <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-main);">${s.t("settings.docker_mode")}</h4>
                                    <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
                                        ${s.t("settings.docker_desc")}<br>
                                        ${r.available?`<strong style="color: var(--accent);">${s.t("settings.new_version_notif")} (${r.latest_version})</strong>`:s.t("settings.up_to_date_docker_msg")}
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
                                        <div class="update-modal__badge">${s.t("settings.update_available")}</div>
                                        <h3 class="update-modal__version">${r.latest_version}</h3>
                                    </div>
                                    
                                    <div class="update-modal__footer">
                                        <app-button variant="primary" id="btn-update-now" style="flex: 1; justify-content: center;" onclick="this.getRootNode().host.performUpdate('${r.asset_url}')">
                                            ${s.t("action.download_install")}
                                        </app-button>
                                        <a href="https://github.com/Codigo SH/Lastboard/releases" target="_blank" style="text-decoration: none;">
                                            <app-button variant="ghost" style="height: 100%;">${s.t("general.changelog")}</app-button>
                                        </a>
                                    </div>
                                    <p id="update-status" style="margin: 0; font-size: 12px; color: var(--text-dim); display: none; text-align: center;">${s.t("notifier.downloading_secure")}</p>
                                </div>
                            </div>
                        `:`
                            <div style="color: var(--success-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
                                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                <span>${s.t("settings.up_to_date")}</span>
                            </div>
                        `}
                    `}
                `:"":""}
             </div>

             <div style="margin-top: 64px; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: center; gap: 24px;">
                 <a href="https://github.com/Codigo SH/Lastboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>
                     ${s.t("settings.github")}
                 </a>
                 <a href="https://github.com/Codigo SH/Lastboard/issues" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                     ${s.t("action.report_issue")}
                 </a>
             </div>
         </div>
     </div>
        `};var Eo=`:host {
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
}`;class Nr extends HTMLElement{_options=[];_value="";isOpen=!1;_boundOutsideClick;dropdownEl=null;_boundScroll;_boundResize;isInsideDialog=!1;static get observedAttributes(){return["value"]}constructor(){super();this.attachShadow({mode:"open"}),this._boundOutsideClick=this.handleOutsideClick.bind(this),this._boundScroll=(o)=>{if(this.dropdownEl&&this.dropdownEl.contains(o.target))return;this.close()},this._boundResize=this.close.bind(this)}connectedCallback(){this.ensureGlobalStyles(),this.render(),this.isInsideDialog=!!this.closest("dialog"),document.addEventListener("click",this._boundOutsideClick,!0),window.addEventListener("scroll",this._boundScroll,!0),window.addEventListener("resize",this._boundResize)}disconnectedCallback(){this.close(),document.removeEventListener("click",this._boundOutsideClick,!0),window.removeEventListener("scroll",this._boundScroll,!0),window.removeEventListener("resize",this._boundResize)}ensureGlobalStyles(){if(!document.getElementById("app-select-portal-css")){let o=document.createElement("style");o.id="app-select-portal-css",o.textContent=Eo,document.head.appendChild(o)}}get value(){return this._value}set value(o){if(this._value!==o)this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay()}set options(o){this._options=o,this.updateTriggerDisplay()}attributeChangedCallback(o,r,i){if(o==="value"&&r!==i)this._value=i,this.updateTriggerDisplay()}updateTriggerDisplay(){if(!this.shadowRoot)return;let o=this.shadowRoot.querySelector(".select-value");if(o){let r=this._options.find((i)=>i.value===this._value)||this._options[0];o.textContent=r?r.label:"Select..."}}toggle(){if(this.isOpen)this.close();else this.open()}open(){if(this.isOpen)return;if(this.close(),this.isOpen=!0,this.setAttribute("open",""),this.dropdownEl=document.createElement("div"),this.dropdownEl.className="select-dropdown",this.dropdownEl.innerHTML=this._options.map((o)=>`
            <div class="select-option ${o.value===this._value?"selected":""}" 
                 data-value="${o.value}">
                 ${o.label}
            </div>
        `).join(""),this.dropdownEl.querySelectorAll(".select-option").forEach((o)=>{o.addEventListener("click",(r)=>{r.stopPropagation();let i=r.currentTarget.dataset.value;if(i)this.selectOption(i)})}),this.isInsideDialog)this.dropdownEl.style.position="absolute",this.dropdownEl.style.left="0",this.dropdownEl.style.right="0",this.dropdownEl.style.top="100%",this.dropdownEl.style.marginTop="6px",this.shadowRoot.appendChild(this.dropdownEl);else{let o=this.shadowRoot.getElementById("trigger");if(o){let r=o.getBoundingClientRect();this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${r.bottom+6}px`,this.dropdownEl.style.left=`${r.left}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}document.body.appendChild(this.dropdownEl)}requestAnimationFrame(()=>{if(this.dropdownEl)this.dropdownEl.classList.add("open")})}positionPortal(){if(!this.dropdownEl||!this.shadowRoot)return;let o=this.shadowRoot.getElementById("trigger");if(!o)return;let r=o.getBoundingClientRect(),i=r.bottom+6,t=r.left,a=300;if(i+a>window.innerHeight&&r.top-a>0)i=r.top-6-a;this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${i}px`,this.dropdownEl.style.left=`${t}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}close(){if(this.dropdownEl)this.dropdownEl.remove(),this.dropdownEl=null;this.isOpen=!1,this.removeAttribute("open")}handleOutsideClick(o){if(!this.isOpen)return;let r=o.composedPath();if(r.includes(this))return;if(this.dropdownEl&&r.includes(this.dropdownEl))return;this.close()}selectOption(o){this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay(),this.dispatchEvent(new CustomEvent("change",{detail:o,bubbles:!0})),this.close()}render(){if(!this.shadowRoot)return;let o=this._options.find((i)=>i.value===this._value)||this._options[0],r=o?o.label:"Select...";this.shadowRoot.innerHTML=`
            <style>${Eo}</style>
            <div class="select-wrapper">
                <div class="select-trigger" id="trigger">
                    <div class="select-value">
                        ${r}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `,this.shadowRoot.getElementById("trigger")?.addEventListener("click",(i)=>{i.stopPropagation(),this.toggle()})}}if(!customElements.get("app-select"))customElements.define("app-select",Nr);var Cr=`:host {
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
}`;class Wr extends HTMLElement{prefs;users=[];getCsrfToken(){let o=document.cookie.split("; ").find((r)=>r.startsWith("csrf_token="));return o?decodeURIComponent(o.split("=")[1]):""}static get observedAttributes(){return["section"]}constructor(){super();this.attachShadow({mode:"open"}),this.prefs={accent_color:"#0078D4",language:"en",widget_min_width:140,beta_updates:!1}}unsubscribe=null;connectedCallback(){this.unsubscribe=m.subscribe((r)=>{if(r&&r.preferences)this.prefs={...r.preferences,project_name:r.project_name||r.preferences.project_name||"Lastboard"},this.render()}),this.fetchPrefs();let o=this.getAttribute("section");if(o==="users")this.fetchUsers();if(o==="about")this.checkForUpdates();this.render()}disconnectedCallback(){if(this.unsubscribe)this.unsubscribe(),this.unsubscribe=null}async fetchPrefs(){let o=m.getUser();if(o&&o.preferences)this.prefs={...o.preferences,project_name:o.project_name||o.preferences.project_name||"Lastboard"},this.render()}async fetchUsers(){try{this.users=await X.getUsers(),this.render()}catch(o){console.error("Failed to fetch users",o)}}attributeChangedCallback(o,r,i){if(o==="section"&&r!==i){if(i==="users")this.fetchUsers();if(i==="about")this.checkForUpdates();this.render()}}async savePrefs(o){let r={...this.prefs};if(this.prefs={...this.prefs,...o},o.accent_color)this.applyAccent(o.accent_color);if(o.language)s.setLanguage(o.language);if(o.theme)if(o.theme==="dark")L.enableDark();else L.enableLight();try{await m.updatePreferences(o)}catch{if(this.prefs=r,o.language&&r.language)s.setLanguage(r.language)}this.render()}applyAccent(o){let r=o,i={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"};if(!o.startsWith("#"))r=i[o]||"#0078D4";document.documentElement.style.setProperty("--accent",r);let t=parseInt(r.slice(1,3),16),a=parseInt(r.slice(3,5),16),n=parseInt(r.slice(5,7),16);if(!isNaN(t)&&!isNaN(a)&&!isNaN(n))document.documentElement.style.setProperty("--accent-rgb",`${t}, ${a}, ${n}`)}async handleBetaToggle(o){this.savePrefs({beta_updates:o});let r=this.shadowRoot.getElementById("beta-text");if(r)if(o)r.style.color="#2fb344",r.style.borderColor="#2fb344",r.style.boxShadow="0 0 10px rgba(47, 179, 68, 0.2)";else r.style.color="var(--text-dim)",r.style.borderColor="var(--border)",r.style.boxShadow="none";await this.checkForUpdates()}updateDensity(o){let r=this.shadowRoot.getElementById("val-widget_min_width");if(r)r.textContent=o+"px";document.documentElement.style.setProperty("--widget-min-size",o+"px")}commitDensity(o){let r=parseInt(o);m.updatePreferences({widget_min_width:r})}updateColumns(o){let r=this.shadowRoot.getElementById("val-grid_columns");if(r)r.textContent=o;document.documentElement.style.setProperty("--user-preferred-columns",o)}commitColumns(o){let r=parseInt(o);m.updatePreferences({grid_columns:r})}async updateUsername(o){let r=m.getUser();if(!r)return;if(await m.updateProfile({username:o,avatar_url:this.prefs.avatar_url||r.avatar_url}),window.notifier)window.notifier.show(s.t("notifier.username_updated"))}async updatePassword(){let o=this.shadowRoot.getElementById("current-password")?.value,r=this.shadowRoot.getElementById("new-password")?.value,i=this.shadowRoot.getElementById("confirm-password")?.value;if(!o){if(window.notifier)window.notifier.show(s.t("notifier.password_required"),"error");return}if(r!==i){if(window.notifier)window.notifier.show(s.t("notifier.password_mismatch"),"error");return}if(!r){if(window.notifier)window.notifier.show(s.t("notifier.password_empty"),"error");return}try{if(await m.changePassword({current_password:o,new_password:r}),window.notifier)window.notifier.show(s.t("notifier.password_changed"));this.shadowRoot.getElementById("current-password").value="",this.shadowRoot.getElementById("new-password").value="",this.shadowRoot.getElementById("confirm-password").value="",setTimeout(async()=>{try{await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()}})}catch(t){}document.body.style.opacity="0",window.location.href="/login"},1500)}catch(t){if(window.notifier)window.notifier.show(s.t("notifier.password_incorrect"),"error")}}async handleAvatarChange(o){let r=o.target.files?.[0];if(!r)return;let i=new FileReader;i.onload=async(t)=>{let a=t.target?.result,n=m.getUser();if(!n)return;if(this.prefs.avatar_url=a,await m.updateProfile({username:n.username,avatar_url:a}),this.render(),window.notifier)window.notifier.show(s.t("notifier.avatar_updated"))},i.readAsDataURL(r)}openAddUserModal(){let o=this.shadowRoot.getElementById("add-user-modal");if(o){o.showModal();let r=this.shadowRoot.getElementById("new-user-role");if(r)r.options=[{value:"user",label:s.t("settings.role_user")},{value:"admin",label:s.t("settings.role_admin")}]}}async createUser(){let o=this.shadowRoot.getElementById("new-user-username").value,r=this.shadowRoot.getElementById("new-user-password").value,i=this.shadowRoot.getElementById("new-user-role").value;if(!o||!r){if(window.notifier)window.notifier.show(s.t("notifier.fields_required"),"error");return}try{if(await X.createUser({username:o,password:r,role:i}),window.notifier)window.notifier.show(s.t("notifier.user_created"));let t=this.shadowRoot.getElementById("add-user-modal");if(t)t.close();this.fetchUsers()}catch(t){if(window.notifier)window.notifier.show(s.t("notifier.user_create_error"),"error")}}openEditUserModal(o,r,i){let t=this.shadowRoot.getElementById("edit-user-modal");if(t){this.shadowRoot.getElementById("edit-user-id").value=o.toString(),this.shadowRoot.getElementById("edit-user-username").value=r,this.shadowRoot.getElementById("edit-user-password").value="",t.showModal();let a=this.shadowRoot.getElementById("edit-user-role");if(a)a.options=[{value:"user",label:s.t("settings.role_user")},{value:"admin",label:s.t("settings.role_admin")}],a.value=i}}async updateAdminUser(){let o=parseInt(this.shadowRoot.getElementById("edit-user-id").value),r=this.shadowRoot.getElementById("edit-user-username").value,i=this.shadowRoot.getElementById("edit-user-password").value,t=this.shadowRoot.getElementById("edit-user-role").value;if(!r){if(window.notifier)window.notifier.show(s.t("notifier.username_required"),"error");return}try{if(await X.adminUpdateUser({id:o,username:r,role:t,password:i||void 0}),window.notifier)window.notifier.show(s.t("notifier.user_updated"));let a=this.shadowRoot.getElementById("edit-user-modal");if(a)a.close();this.fetchUsers()}catch(a){if(window.notifier)window.notifier.show(s.t("notifier.user_update_error"),"error")}}async deleteUser(o){let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(s.t("general.delete"),s.t("notifier.user_delete_confirm")))return}try{let i=[...this.users];if(this.users=this.users.filter((t)=>t.id!==o),this.render(),await X.deleteUser(o),window.notifier)window.notifier.show(s.t("notifier.user_deleted"));this.fetchUsers()}catch(i){this.fetchUsers();let t=s.t("notifier.user_delete_error");if(i.message&&i.message.includes("error.cannot_delete_superadmin"))t=s.t("notifier.user_delete_superadmin");if(window.notifier)window.notifier.show(t,"error")}}getContent(o){let r=m.getUser()||{username:"Guest",initials:"??",role:"View Only",avatar_url:"",accent_color:"#0078D4",language:"en",preferences:{}};switch(o){case"account":return Ar(r);case"theme":{let i={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"},t=Object.keys(i);return Mr(this.prefs,i,t)}case"personalization":return Ur(this.prefs);case"advanced":return Lr();case"users":return Xr(this.users);case"about":return Rr(this.version,this.updateInfo,r.role||"");default:return`<div class="bento-card"><h3>${o}</h3><p class="settings-content__text-dim">${s.t("settings.default_module_desc")}</p></div>`}}version="v1.1.7-Beta.7";updateInfo=null;checkUpdatesPromise=null;async checkForUpdates(){if(this.checkUpdatesPromise)return this.checkUpdatesPromise;return this.checkUpdatesPromise=(async()=>{try{let o=await fetch("/api/system/update/check");if(o.ok)this.updateInfo=await o.json(),this.version=this.updateInfo.current_version}catch(o){console.error("Check update failed",o)}finally{this.checkUpdatesPromise=null,this.render()}})(),this.checkUpdatesPromise}async performUpdate(o){let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(s.t("settings.update_available"),s.t("notifier.update_start_confirm")))return}let i=this.shadowRoot.getElementById("btn-update-now"),t=this.shadowRoot.getElementById("update-status");if(i)i.loading=!0;if(t)t.style.display="block",t.textContent=s.t("notifier.update_downloading");try{let a=await fetch("/api/system/update/perform",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":this.getCsrfToken()},body:JSON.stringify({asset_url:o})});if(a.ok){if(t)t.textContent=s.t("notifier.update_verified");setTimeout(()=>{window.location.reload()},5000)}else{let n=await a.text();if(t)t.style.color="var(--danger-color)",t.textContent=s.t("notifier.update_failed")+n;if(i)i.loading=!1}}catch(a){if(console.error("Update failed",a),t)t.style.color="var(--danger-color)",t.textContent=s.t("notifier.update_error");if(i)i.loading=!1}}downloadBackup(){window.location.href="/api/system/backup"}async restoreBackup(o){if(!o)return;let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(s.t("general.restore"),s.t("notifier.restore_confirm")))return}let i=new FormData;i.append("backup_file",o);try{if((await fetch("/api/system/restore",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()},body:i})).ok){if(window.notifier)window.notifier.show(s.t("notifier.restore_success"));setTimeout(()=>window.location.reload(),2000)}else if(window.notifier)window.notifier.show(s.t("notifier.restore_failed"),"error")}catch(t){if(console.error("Restore error",t),window.notifier)window.notifier.show(s.t("notifier.restore_failed"),"error")}}openResetModal(){let o=this.shadowRoot.getElementById("reset-confirm-modal"),r=this.shadowRoot.getElementById("reset-confirm-input");if(o){if(r)r.value="";o.showModal()}}async executeFactoryReset(){let o=this.shadowRoot.getElementById("reset-confirm-input");if(!o||o.value.trim()!=="delete"){if(window.notifier)window.notifier.show(s.t("notifier.reset_confirm_text"),"error");o.focus();return}let r=this.shadowRoot.getElementById("btn-reset-confirm");try{if(r)r.disabled=!0,r.textContent=s.t("settings.restoring")||"Restoring...";if((await fetch("/api/system/reset",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()}})).ok){let t=document.createElement("div");Object.assign(t.style,{position:"fixed",top:"0",left:"0",width:"100%",height:"100%",backgroundColor:"rgba(0,0,0,0.9)",zIndex:"9999",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"var(--font-main, sans-serif)"}),t.innerHTML=`
                    <div style="border: 4px solid #333; border-top: 4px solid var(--accent, #0078d4); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 24px;"></div>
                    <h2 style="margin: 0; font-weight: 500;">${s.t("notifier.system_restarting")}</h2>
                    <p style="opacity: 0.7; margin-top: 8px;">${s.t("notifier.please_wait")}</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `,document.body.appendChild(t);let a=0,n=async()=>{a++;try{if((await fetch("/",{method:"HEAD",cache:"no-store"})).ok){window.location.href="/setup";return}}catch(d){}if(a<60)setTimeout(n,1000);else window.location.href="/setup"};setTimeout(n,2000)}else if(window.notifier)window.notifier.show(s.t("notifier.reset_failed"),"error")}catch(i){if(console.error("Reset error",i),window.notifier)window.notifier.show(s.t("notifier.reset_error"),"error")}}render(){if(this.shadowRoot.innerHTML=`
            <style>${Cr}</style>
            <div class="fade-in">
                ${this.getContent(this.getAttribute("section")||"account")}
            </div>
        `,this.shadowRoot.querySelectorAll(".settings-content__checkbox").forEach((o)=>{o.addEventListener("click",()=>o.classList.toggle("settings-content__checkbox--checked"))}),this.initSelects(),this.getAttribute("section")==="about")this.updateBetaBadgeVisuals()}initSelects(){let o=this.shadowRoot.getElementById("language-select");if(o){let a=s.getAvailableLocales();o.options=a.map((n)=>({value:n.code,label:`${n.flag} ${n.name}`})),o.addEventListener("change",(n)=>{this.savePrefs({language:n.detail})})}let r=[{value:"user",label:s.t("settings.role_user")},{value:"admin",label:s.t("settings.role_admin")}],i=this.shadowRoot.getElementById("new-user-role");if(i)i.options=r;let t=this.shadowRoot.getElementById("edit-user-role");if(t)t.options=r}updateBetaBadgeVisuals(){setTimeout(()=>{let o=this.shadowRoot.getElementById("beta-updates-toggle-badge"),r=this.shadowRoot.getElementById("beta-text"),i=this.prefs.beta_updates||!1;if(o&&r)if(o.checked=i,i)r.style.color="#2fb344",r.style.borderColor="#2fb344",r.style.boxShadow="0 0 10px rgba(47, 179, 68, 0.2)";else r.style.color="var(--text-dim)",r.style.borderColor="var(--border)",r.style.boxShadow="none"},0)}}if(!customElements.get("settings-content"))customElements.define("settings-content",Wr);po();u();var Vr=({user:o,isOpen:r,selectedSection:i,updateAvailable:t})=>`
    <div class="right-drawer__overlay"></div>
    
    <div class="right-drawer__content-panel ${i?"":"right-drawer__content-panel--closed"}">
        <div class="right-drawer__content-body">
            ${i?`<settings-content section="${i}"></settings-content>`:""}
        </div>
    </div>

    <div class="right-drawer__panel">
        <div class="right-drawer__header">
            <app-avatar class="right-drawer__avatar" initials="${o.initials}" src="${o.avatar_url||""}"></app-avatar>
            <div class="right-drawer__user-info">
                <span class="right-drawer__username">${o.username}</span>
                ${o.role?.toLowerCase()==="admin"||o.role?.toLowerCase()==="administrator"?`<span class="right-drawer__role">
                    ${(()=>{let a=(o.role||"").toLowerCase();if(o.is_superadmin)return s.t("settings.role_super_admin");if(a==="admin"||a==="administrator")return s.t("settings.role_admin");if(a==="user")return s.t("settings.role_user");return o.role||s.t("settings.default_role")})()}
                </span>`:""}
            </div>
        </div>
        
        <div class="right-drawer__body">
            <div class="right-drawer__section-label">${s.t("settings.title")}</div>
            <nav class="right-drawer__menu">
                <div class="right-drawer__menu-item ${i==="account"?"right-drawer__menu-item--active":""}" data-section="account">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    <span>${s.t("settings.profile")}</span>
                </div>
                <div class="right-drawer__menu-item ${i==="theme"?"right-drawer__menu-item--active":""}" data-section="theme">
                    <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>
                    <span>${s.t("settings.theme")}</span>
                </div>
                <div class="right-drawer__menu-item ${i==="personalization"?"right-drawer__menu-item--active":""}" data-section="personalization">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span>${s.t("settings.personalization")}</span>
                </div>

                ${o.role?.toLowerCase()==="admin"||o.role==="Administrator"?`
                    <div class="right-drawer__menu-item ${i==="users"?"right-drawer__menu-item--active":""}" data-section="users">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span>${s.t("settings.users")}</span>
                    </div>

                    <div class="right-drawer__menu-item ${i==="advanced"?"right-drawer__menu-item--active":""}" data-section="advanced">
                        <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                        <span>${s.t("settings.advanced")}</span>
                    </div>
                `:""}
                <div class="right-drawer__menu-item ${i==="about"?"right-drawer__menu-item--active":""}" data-section="about" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <span>${s.t("settings.about")}</span>
                    </div>
                    ${t&&(o.role?.toLowerCase()==="admin"||o.role==="Administrator")?`
                        <span style="font-size: 10px; font-weight: 600; color: var(--danger-color); background: rgba(var(--danger-rgb), 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(var(--danger-rgb), 0.2); animation: blink-badge 2s infinite;">${s.t("settings.update_available")}</span>
                        <style>@keyframes blink-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }</style>
                    `:""}
                </div>
            </nav>
        </div>

        <div class="right-drawer__footer">
            <button type="button" id="logout-btn" class="right-drawer__menu-item right-drawer__menu-item--logout" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;width:100%;padding:0;">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
                <span>${s.t("auth.logout")}</span>
            </button>
        </div>
    </div>
`;u();var Tr=`:host {
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
}`;class Or extends HTMLElement{isOpen;selectedSection;_unsubscribe;_unsubscribeI18n;_keydownHandler;updateAvailable;_unsubscribeDashboard;constructor(){super();this.attachShadow({mode:"open"}),this.isOpen=!1,this.selectedSection=null,this.updateAvailable=!1}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribe=m.subscribe((o)=>{if(this.isOpen)this.render()}),Promise.resolve().then(() => (Y(),Gr)).then(({dashboardStore:o})=>{this._unsubscribeDashboard=o.subscribe((r)=>{if(this.updateAvailable!==r.updateAvailable)this.updateAvailable=r.updateAvailable,this.render()})}),this._unsubscribeI18n=s.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._keydownHandler)window.removeEventListener("keydown",this._keydownHandler)}open(){this.isOpen=!0,this.setAttribute("open",""),this.render(),document.body.style.overflow="hidden",this.dispatchEvent(new CustomEvent("drawer-open",{bubbles:!0,composed:!0}))}close(){this.isOpen=!1,this.removeAttribute("open"),this.selectedSection=null,this.render(),document.body.style.overflow="",this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}selectSection(o){if(this.selectedSection===o)this.selectedSection=null;else this.selectedSection=o;this.render()}async performLogout(){let o=document.cookie.split("; ").find((i)=>i.startsWith("csrf_token=")),r=o?decodeURIComponent(o.split("=")[1]):"";try{await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":r}})}catch(i){}document.body.style.opacity="0",window.location.href="/login"}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target;if(r.classList.contains("right-drawer__overlay"))this.close();if(r.closest("#logout-btn")){o.preventDefault(),this.performLogout();return}let i=r.closest(".right-drawer__menu-item");if(i&&i.dataset.section)o.preventDefault(),this.selectSection(i.dataset.section)}),this._keydownHandler=(o)=>{if(o.key==="Escape"&&this.isOpen)this.close()},window.addEventListener("keydown",this._keydownHandler)}render(){let o=m.getUser()||{username:"Guest",initials:"??",role:"Viewer"};this.shadowRoot.innerHTML=`
            <style>${Tr}</style>
            ${Vr({user:o,isOpen:this.isOpen,selectedSection:this.selectedSection,updateAvailable:this.updateAvailable})}
        `}}if(!customElements.get("app-right-drawer"))customElements.define("app-right-drawer",Or);u();var Dr=({title:o,editMode:r,searchActive:i,addMenuActive:t,drawerOpen:a,searchQuery:n,user:d,updateAvailable:c})=>{return`
    <div class="top-bar">
        <div class="top-bar__title">${o}</div>
        <div class="top-bar__actions">
            <!-- Offline Indicator -->
            <offline-badge></offline-badge>

            <!-- Search Bar -->
            <div id="search-wrapper" class="search-wrapper ${i?"search-wrapper--active":""}">
                <input type="text" id="search-input" class="search-input" placeholder="${s.t("general.search")}" 
                       value="${n||""}" onclick="event.stopPropagation()">
                <div id="search-clear" class="search-clear" style="display: ${n?"flex":"none"};">×</div>
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Item Toggle -->
            <div id="add-toggle" class="top-bar__toggle" title="${s.t("topbar.add_tooltip")}" 
                 style="${r?"display: flex;":"display: none;"} margin-right: -6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Menu Dropdown -->
            <div id="add-menu" class="add-menu ${t?"add-menu--active":""}">
                <div class="add-menu-item" data-action="add-bookmark">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    ${s.t("action.add_bookmark")}
                </div>
                <div class="add-menu-item" data-action="add-section">
                     <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon" style="stroke-dasharray: 4 2;"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/></svg>
                    ${s.t("action.add_section")}
                </div>
                <div class="add-menu-item" data-action="add-widget">
                    <svg viewBox="0 0 24 24" fill="none" class="add-menu-icon"><rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/></svg>
                    ${s.t("action.add_widget")}
                </div>
            </div>

            <!-- Edit Mode Toggle -->
            <div id="edit-toggle" class="top-bar__toggle" title="${s.t("topbar.edit_tooltip")}" 
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
                ${c?'<div class="notification-dot"></div>':""}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" />
                    <rect class="top-bar__indicator ${a?"top-bar__indicator--active":""}" 
                          x="15" y="3" width="6" height="18" fill="white" />
                    <path d="M15 3V21" stroke-width="1.5" />
                </svg>
            </div>
        </div>
    </div>
`};Y();u();var Er=`:host {
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
}`;class Pr extends HTMLElement{state;_unsubscribeDashboard;_unsubscribeI18n;_windowClickHandler;static get observedAttributes(){return["title"]}constructor(){super();this.attachShadow({mode:"open"}),this.state={editMode:!1,searchActive:!1,addMenuActive:!1,drawerOpen:!1,searchQuery:""}}attributeChangedCallback(o,r,i){if(o==="title"&&r!==i)this.render()}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeDashboard=x.subscribe((o)=>{if(this.state.editMode!==o.isEditing||this.state.updateAvailable!==o.updateAvailable)this.setState({editMode:o.isEditing,updateAvailable:o.updateAvailable})}),this._unsubscribeI18n=s.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._windowClickHandler)window.removeEventListener("click",this._windowClickHandler)}setState(o){let r=this.state.editMode;if(this.state={...this.state,...o},this.render(),o.editMode!==void 0&&o.editMode!==r)this.dispatchEvent(new CustomEvent("edit-mode-change",{detail:{active:this.state.editMode},bubbles:!0,composed:!0}))}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target;if(r.closest("#search-clear")){o.stopPropagation(),this.state.searchQuery="";let p=this.shadowRoot.getElementById("search-input");if(p)p.value="",p.focus();this.render(),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0}));return}if(r.closest("#search-wrapper")&&!this.state.searchActive)o.stopPropagation(),this.setState({searchActive:!0}),this.shadowRoot.getElementById("search-input")?.focus();if(r.closest("#edit-toggle"))x.toggleEditMode();if(r.closest("#add-toggle"))o.stopPropagation(),this.setState({addMenuActive:!this.state.addMenuActive});let d=r.closest(".add-menu-item");if(d){let p=d.dataset.action;if(p)this.setState({addMenuActive:!1}),this.dispatchEvent(new CustomEvent("add-item",{detail:{action:p},bubbles:!0,composed:!0}));return}if(r.closest("#drawer-toggle")){let p=this.state.drawerOpen?"close":"open";this.dispatchEvent(new CustomEvent("drawer-toggle",{detail:{action:p},bubbles:!0,composed:!0}));return}}),this.shadowRoot.addEventListener("input",(o)=>{let r=o.target;if(r.id==="search-input"){let i=r.value;this.state.searchQuery=i;let t=this.shadowRoot.getElementById("search-clear");if(t)t.style.display=i?"flex":"none";this.dispatchEvent(new CustomEvent("search-input",{detail:{query:i},bubbles:!0,composed:!0}))}}),this.shadowRoot.addEventListener("keydown",(o)=>{let r=o.target,i=o;if(r.id==="search-input"&&i.key==="Escape")r.value="",this.setState({searchActive:!1}),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0})),r.blur()}),this._windowClickHandler=(o)=>{if(this.state.addMenuActive)this.setState({addMenuActive:!1});let r=o.composedPath(),i=this.shadowRoot.getElementById("search-wrapper");if(this.state.searchActive&&i&&!r.includes(i)){let t=this.shadowRoot.getElementById("search-input");if(t&&t.value==="")this.setState({searchActive:!1})}},window.addEventListener("click",this._windowClickHandler)}render(){let o=this.getAttribute("title")||"Lastboard";this.shadowRoot.innerHTML=`
            <style>${Er}</style>
            ${Dr({title:o,editMode:this.state.editMode,searchActive:this.state.searchActive,addMenuActive:this.state.addMenuActive,drawerOpen:this.state.drawerOpen,searchQuery:this.state.searchQuery,user:this.state.user,updateAvailable:this.state.updateAvailable})}
        `}}if(!customElements.get("app-topbar"))customElements.define("app-topbar",Pr);u();var Ir=({title:o,dropdownOpen:r})=>`
    <header class="header">
        <div class="header__left">
            ${o}
        </div>

        <div class="header__group">
            <button class="header__btn-changelog">
                <span>${s.t("header.view_changelog")}</span>
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
                    <div class="header__dropdown-item">${s.t("header.view_profile")}</div>
                    <div class="header__dropdown-item">${s.t("header.preferences")}</div>
                    <div class="header__dropdown-item" style="border-top: 1px solid var(--border-color); color: var(--danger-color);">${s.t("auth.sign_out")}</div>
                </div>
            </div>
        </div>
    </header>
`;var Sr=`.header {
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
}`;class oi extends HTMLElement{dropdownOpen;constructor(){super();this.attachShadow({mode:"open"}),this.dropdownOpen=!1}connectedCallback(){this.render(),this.setupListeners()}toggleDropdown(o){this.dropdownOpen=typeof o==="boolean"?o:!this.dropdownOpen,this.render()}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target,i=r.closest(".header__btn-changelog");if(i)i.style.display="none";if(r.closest("#profile-trigger"))o.stopPropagation(),this.toggleDropdown()}),window.addEventListener("click",()=>{if(this.dropdownOpen)this.toggleDropdown(!1)})}render(){let o=this.getAttribute("title")||"Task";this.shadowRoot.innerHTML=`
            <style>${Sr}</style>
            ${Ir({title:o,dropdownOpen:this.dropdownOpen})}
        `}}if(!customElements.get("app-header"))customElements.define("app-header",oi);u();var go=(o)=>String(o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),_t=(o)=>{if(!o)return"#";let r=o.trim().toLowerCase();if(r.startsWith("http://")||r.startsWith("https://")||r==="#")return go(o);return"#"},ri=({bookmarks:o,isEditing:r,isSearching:i,isTouchDevice:t,maxCols:a=12})=>{let n=Array.isArray(o)?o:[],d=(p)=>n.filter((g)=>g.parent_id===p);return`
    ${(t?n:i?n:n.filter((p)=>!p.parent_id)).map((p)=>{let g={};try{g=typeof p.content==="string"?JSON.parse(p.content):p.content}catch(y){console.error("Failed to parse content for item",p.id,y)}let l=p.type==="section",b={x:p.x||1,y:p.y||1},e=Math.min(p.w||1,a),h=p.h||1;if(l){let y=d(p.id),H=(g.title||"").trim();return`
            <fieldset class="bookmark-grid__section"
               data-id="${p.id}"
               data-orig-x="${p.x}" data-orig-y="${p.y}"
               draggable="${r}"
               style="--x: ${b.x}; --y: ${b.y}; --w: ${e}; --h: ${h};">
               ${H?`<legend class="section-title">${go(H)}</legend>`:""}
               <div class="bookmark-grid__nested-content" style="width: 100%; height: 100%;">
                   ${et(y,r,!0,e,t)}
               </div>
               ${r?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${s.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${s.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
                <div class="resize-handle"></div>
               `:""}
            </fieldset>`}return ii(p,g,r,b,e,h,t)}).join("")}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
    `};function ii(o,r,i,t,a,n=0,d=!1){let c=n||o.h||1;if(o.type==="widget"){let e=r.widgetId,y={clock:"widget-clock",notepad:"widget-notepad",telemetry:"widget-telemetry"}[e]||"div",w=(r.text||"").replace(/"/g,"&quot;");return`
        <div class="bookmark-grid__card"
            draggable="${i}"
            data-id="${o.id}"
            data-type="${o.type}"
            data-orig-x="${o.x}" data-orig-y="${o.y}"
            ${!d?`style="--x: ${t.x}; --y: ${t.y}; --w: ${a}; --h: ${c};"`:""}>

            <${y}
                item-id="${o.id}"
                ${e==="notepad"?`content="${w}"`:""}
            ></${y}>

            ${i?`
            <div class="bookmark-actions">
                 ${["clock","telemetry"].includes(e)?`<button class="action-btn btn-edit" title="${s.t("general.edit")}">✎</button>`:""}
                 <button class="action-btn btn-delete" title="${s.t("general.delete")}">\uD83D\uDDD1</button>
            </div>
            ${["clock","telemetry"].includes(e)?"":'<div class="resize-handle"></div>'}
            `:""}
        </div>
    `}let p=r.icon||"",l=p.startsWith("http")||p.startsWith("/")?`<img src="${go(p)}" alt="${go(r.label)}" class="bookmark-grid__icon-img" draggable="false" />`:p?go(p):'<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';return`
        <a ${i?'role="button"':`href="${_t(r.url)}" target="_blank"`} class="bookmark-grid__card"
           draggable="${i}"
           data-id="${o.id}"
           data-type="${o.type}"
           data-orig-x="${o.x}" data-orig-y="${o.y}"
           ${!d?`style="--x: ${t.x}; --y: ${t.y}; --w: ${a}; --h: ${c};"`:""}>
            
            ${i?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${s.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${s.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
            `:""}

            <div class="bookmark-grid__icon-container">
                ${l}
            </div>
            <span class="bookmark-grid__label">${go(r.label)||"Bookmark"}</span>
            
            ${i&&o.type==="section"?'<div class="resize-handle"></div>':""}
            
            ${r.statusCheck?`
                <div class="status-indicator ${o.status?`status-${o.status}`:""}" 
                     title="${o.status==="up"?s.t("status.online"):o.status==="down"?s.t("status.unreachable"):o.status==="pending"?s.t("status.checking"):s.t("general.pinging")}">
                </div>
            `:""}
        </a>
    `}function et(o,r,i=!1,t=12,a=!1){return o.map((n)=>{let d={};try{d=typeof n.content==="string"?JSON.parse(n.content):n.content}catch(l){console.error("Failed to parse content for item (nested)",n.id,l)}let c={x:n.x||1,y:n.y||1},p=n.h||1,g=Math.min(n.w||1,t);return ii(n,d,r,c,g,p,a)}).join("")}Y();oo();u();u();Y();class ti extends HTMLElement{timer;timeEl=null;dateEl=null;_unsubscribe=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}isEditing=!1;configMode=!1;_config={timezone:"local",hour12:!1,showDate:!0};_itemId=0;static get observedAttributes(){return["item-id","content","mode"]}attributeChangedCallback(o,r,i){if(o==="item-id")this._itemId=parseInt(i);if(o==="content")try{let t=typeof i==="string"?JSON.parse(i):i;if(t&&typeof t==="object")this._config={...this._config,...t},this.updateTime()}catch(t){}}connectedCallback(){this.render(),this.updateTime(),this.timer=setInterval(()=>{this.updateTime()},1000),this._unsubscribe=x.subscribe((o)=>{if(this.isEditing!==o.isEditing)this.isEditing=o.isEditing,this.render();if(this._itemId){let r=o.items.find((i)=>i.id===this._itemId);if(r&&r.content)try{let i=typeof r.content==="string"?JSON.parse(r.content):r.content;if(i.widgetId==="clock")this._config={...this._config,...i},this.updateTime()}catch(i){}}}),this._unsubscribeI18n=s.subscribe(()=>{this.updateTime()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this.timer)clearInterval(this.timer)}updateTime(){if(!this.timeEl||!this.dateEl)return;let o=new Date,r={hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:this._config.hour12},i=void 0;if(this._config.timezone&&this._config.timezone!=="local")i=this._config.timezone;let t=s.getLocale().code;try{let d=new Intl.DateTimeFormat(t,{...r,timeZone:i}).formatToParts(o).map((c)=>{if(c.type==="dayPeriod")return`<span class="ampm">${c.value.toUpperCase().replace(/\./g,"").trim()}</span>`;return c.value}).join("");this.timeEl.innerHTML=d}catch(a){this.timeEl.textContent=o.toLocaleTimeString()}if(this._config.showDate){let a={weekday:"long",day:"numeric",month:"long",timeZone:i};this.dateEl.textContent=o.toLocaleDateString(t,a),this.dateEl.style.display="block"}else this.dateEl.style.display="none"}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
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
        `,this.timeEl=this.shadowRoot.querySelector(".time"),this.dateEl=this.shadowRoot.querySelector(".date")}}customElements.define("widget-clock",ti);var qo=globalThis,Po=qo.ShadowRoot&&(qo.ShadyCSS===void 0||qo.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Io=Symbol(),ai=new WeakMap;class So{constructor(o,r,i){if(this._$cssResult$=!0,i!==Io)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=o,this._strings=r}get styleSheet(){let o=this._styleSheet,r=this._strings;if(Po&&o===void 0){let i=r!==void 0&&r.length===1;if(i)o=ai.get(r);if(o===void 0){if((this._styleSheet=o=new CSSStyleSheet).replaceSync(this.cssText),i)ai.set(r,o)}}return o}toString(){return this.cssText}}var vt=(o)=>{if(o._$cssResult$===!0)return o.cssText;else if(typeof o==="number")return o;else throw Error(`Value passed to 'css' function must be a 'css' function result: ${o}. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)},kt=(o)=>new So(typeof o==="string"?o:String(o),void 0,Io),Bo=(o,...r)=>{let i=o.length===1?o[0]:r.reduce((t,a,n)=>t+vt(a)+o[n+1],o[0]);return new So(i,o,Io)},si=(o,r)=>{if(Po)o.adoptedStyleSheets=r.map((i)=>i instanceof CSSStyleSheet?i:i.styleSheet);else for(let i of r){let t=document.createElement("style"),a=qo.litNonce;if(a!==void 0)t.setAttribute("nonce",a);t.textContent=i.cssText,o.appendChild(t)}},yt=(o)=>{let r="";for(let i of o.cssRules)r+=i.cssText;return kt(r)},or=Po?(o)=>o:(o)=>o instanceof CSSStyleSheet?yt(o):o;var{is:ut,defineProperty:wt,getOwnPropertyDescriptor:ni,getOwnPropertyNames:$t,getOwnPropertySymbols:mt,getPrototypeOf:di}=Object,zt=!1,B=globalThis;if(zt)B.customElements??=customElements;var J=!0,A,ci=B.trustedTypes,jt=ci?ci.emptyScript:"",li=J?B.reactiveElementPolyfillSupportDevMode:B.reactiveElementPolyfillSupport;if(J)B.litIssuedWarnings??=new Set,A=(o,r)=>{if(r+=` See https://lit.dev/msg/${o} for more information.`,!B.litIssuedWarnings.has(r)&&!B.litIssuedWarnings.has(o))console.warn(r),B.litIssuedWarnings.add(r)},queueMicrotask(()=>{if(A("dev-mode","Lit is in dev mode. Not recommended for production!"),B.ShadyDOM?.inUse&&li===void 0)A("polyfill-support-missing","Shadow DOM is being polyfilled via `ShadyDOM` but the `polyfill-support` module has not been loaded.")});var Gt=J?(o)=>{if(!B.emitLitDebugLogEvents)return;B.dispatchEvent(new CustomEvent("lit-debug",{detail:o}))}:void 0,xo=(o,r)=>o,uo={toAttribute(o,r){switch(r){case Boolean:o=o?jt:null;break;case Object:case Array:o=o==null?o:JSON.stringify(o);break}return o},fromAttribute(o,r){let i=o;switch(r){case Boolean:i=o!==null;break;case Number:i=o===null?null:Number(o);break;case Object:case Array:try{i=JSON.parse(o)}catch(t){i=null}break}return i}},Ko=(o,r)=>!ut(o,r),pi={attribute:!0,type:String,converter:uo,reflect:!1,useDefault:!1,hasChanged:Ko};Symbol.metadata??=Symbol("metadata");B.litPropertyMetadata??=new WeakMap;class Q extends HTMLElement{static addInitializer(o){this.__prepare(),(this._initializers??=[]).push(o)}static get observedAttributes(){return this.finalize(),this.__attributeToPropertyMap&&[...this.__attributeToPropertyMap.keys()]}static createProperty(o,r=pi){if(r.state)r.attribute=!1;if(this.__prepare(),this.prototype.hasOwnProperty(o))r=Object.create(r),r.wrapped=!0;if(this.elementProperties.set(o,r),!r.noAccessor){let i=J?Symbol.for(`${String(o)} (@property() cache)`):Symbol(),t=this.getPropertyDescriptor(o,i,r);if(t!==void 0)wt(this.prototype,o,t)}}static getPropertyDescriptor(o,r,i){let{get:t,set:a}=ni(this.prototype,o)??{get(){return this[r]},set(n){this[r]=n}};if(J&&t==null){if("value"in(ni(this.prototype,o)??{}))throw Error(`Field ${JSON.stringify(String(o))} on ${this.name} was declared as a reactive property but it's actually declared as a value on the prototype. Usually this is due to using @property or @state on a method.`);A("reactive-property-without-getter",`Field ${JSON.stringify(String(o))} on ${this.name} was declared as a reactive property but it does not have a getter. This will be an error in a future version of Lit.`)}return{get:t,set(n){let d=t?.call(this);a?.call(this,n),this.requestUpdate(o,d,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(o){return this.elementProperties.get(o)??pi}static __prepare(){if(this.hasOwnProperty(xo("elementProperties",this)))return;let o=di(this);if(o.finalize(),o._initializers!==void 0)this._initializers=[...o._initializers];this.elementProperties=new Map(o.elementProperties)}static finalize(){if(this.hasOwnProperty(xo("finalized",this)))return;if(this.finalized=!0,this.__prepare(),this.hasOwnProperty(xo("properties",this))){let r=this.properties,i=[...$t(r),...mt(r)];for(let t of i)this.createProperty(t,r[t])}let o=this[Symbol.metadata];if(o!==null){let r=litPropertyMetadata.get(o);if(r!==void 0)for(let[i,t]of r)this.elementProperties.set(i,t)}this.__attributeToPropertyMap=new Map;for(let[r,i]of this.elementProperties){let t=this.__attributeNameForProperty(r,i);if(t!==void 0)this.__attributeToPropertyMap.set(t,r)}if(this.elementStyles=this.finalizeStyles(this.styles),J){if(this.hasOwnProperty("createProperty"))A("no-override-create-property","Overriding ReactiveElement.createProperty() is deprecated. The override will not be called with standard decorators");if(this.hasOwnProperty("getPropertyDescriptor"))A("no-override-get-property-descriptor","Overriding ReactiveElement.getPropertyDescriptor() is deprecated. The override will not be called with standard decorators")}}static finalizeStyles(o){let r=[];if(Array.isArray(o)){let i=new Set(o.flat(1/0).reverse());for(let t of i)r.unshift(or(t))}else if(o!==void 0)r.push(or(o));return r}static __attributeNameForProperty(o,r){let i=r.attribute;return i===!1?void 0:typeof i==="string"?i:typeof o==="string"?o.toLowerCase():void 0}constructor(){super();this.__instanceProperties=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this.__reflectingProperty=null,this.__initialize()}__initialize(){this.__updatePromise=new Promise((o)=>this.enableUpdating=o),this._$changedProperties=new Map,this.__saveInstanceProperties(),this.requestUpdate(),this.constructor._initializers?.forEach((o)=>o(this))}addController(o){if((this.__controllers??=new Set).add(o),this.renderRoot!==void 0&&this.isConnected)o.hostConnected?.()}removeController(o){this.__controllers?.delete(o)}__saveInstanceProperties(){let o=new Map,r=this.constructor.elementProperties;for(let i of r.keys())if(this.hasOwnProperty(i))o.set(i,this[i]),delete this[i];if(o.size>0)this.__instanceProperties=o}createRenderRoot(){let o=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return si(o,this.constructor.elementStyles),o}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this.__controllers?.forEach((o)=>o.hostConnected?.())}enableUpdating(o){}disconnectedCallback(){this.__controllers?.forEach((o)=>o.hostDisconnected?.())}attributeChangedCallback(o,r,i){this._$attributeToProperty(o,i)}__propertyToAttribute(o,r){let t=this.constructor.elementProperties.get(o),a=this.constructor.__attributeNameForProperty(o,t);if(a!==void 0&&t.reflect===!0){let d=(t.converter?.toAttribute!==void 0?t.converter:uo).toAttribute(r,t.type);if(J&&this.constructor.enabledWarnings.includes("migration")&&d===void 0)A("undefined-attribute-value",`The attribute value for the ${o} property is undefined on element ${this.localName}. The attribute will be removed, but in the previous version of \`ReactiveElement\`, the attribute would not have changed.`);if(this.__reflectingProperty=o,d==null)this.removeAttribute(a);else this.setAttribute(a,d);this.__reflectingProperty=null}}_$attributeToProperty(o,r){let i=this.constructor,t=i.__attributeToPropertyMap.get(o);if(t!==void 0&&this.__reflectingProperty!==t){let a=i.getPropertyOptions(t),n=typeof a.converter==="function"?{fromAttribute:a.converter}:a.converter?.fromAttribute!==void 0?a.converter:uo;this.__reflectingProperty=t;let d=n.fromAttribute(r,a.type);this[t]=d??this.__defaultValues?.get(t)??d,this.__reflectingProperty=null}}requestUpdate(o,r,i,t=!1,a){if(o!==void 0){if(J&&o instanceof Event)A("","The requestUpdate() method was called with an Event as the property name. This is probably a mistake caused by binding this.requestUpdate as an event listener. Instead bind a function that will call it with no arguments: () => this.requestUpdate()");let n=this.constructor;if(t===!1)a=this[o];if(i??=n.getPropertyOptions(o),(i.hasChanged??Ko)(a,r)||i.useDefault&&i.reflect&&a===this.__defaultValues?.get(o)&&!this.hasAttribute(n.__attributeNameForProperty(o,i)))this._$changeProperty(o,r,i);else return}if(this.isUpdatePending===!1)this.__updatePromise=this.__enqueueUpdate()}_$changeProperty(o,r,{useDefault:i,reflect:t,wrapped:a},n){if(i&&!(this.__defaultValues??=new Map).has(o)){if(this.__defaultValues.set(o,n??r??this[o]),a!==!0||n!==void 0)return}if(!this._$changedProperties.has(o)){if(!this.hasUpdated&&!i)r=void 0;this._$changedProperties.set(o,r)}if(t===!0&&this.__reflectingProperty!==o)(this.__reflectingProperties??=new Set).add(o)}async __enqueueUpdate(){this.isUpdatePending=!0;try{await this.__updatePromise}catch(r){Promise.reject(r)}let o=this.scheduleUpdate();if(o!=null)await o;return!this.isUpdatePending}scheduleUpdate(){let o=this.performUpdate();if(J&&this.constructor.enabledWarnings.includes("async-perform-update")&&typeof o?.then==="function")A("async-perform-update",`Element ${this.localName} returned a Promise from performUpdate(). This behavior is deprecated and will be removed in a future version of ReactiveElement.`);return o}performUpdate(){if(!this.isUpdatePending)return;if(Gt?.({kind:"update"}),!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),J){let a=[...this.constructor.elementProperties.keys()].filter((n)=>this.hasOwnProperty(n)&&(n in di(this)));if(a.length)throw Error(`The following properties on element ${this.localName} will not trigger updates as expected because they are set using class fields: ${a.join(", ")}. Native class fields and some compiled output will overwrite accessors used for detecting changes. See https://lit.dev/msg/class-field-shadowing for more information.`)}if(this.__instanceProperties){for(let[t,a]of this.__instanceProperties)this[t]=a;this.__instanceProperties=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[t,a]of i){let{wrapped:n}=a,d=this[t];if(n===!0&&!this._$changedProperties.has(t)&&d!==void 0)this._$changeProperty(t,void 0,a,d)}}let o=!1,r=this._$changedProperties;try{if(o=this.shouldUpdate(r),o)this.willUpdate(r),this.__controllers?.forEach((i)=>i.hostUpdate?.()),this.update(r);else this.__markUpdated()}catch(i){throw o=!1,this.__markUpdated(),i}if(o)this._$didUpdate(r)}willUpdate(o){}_$didUpdate(o){if(this.__controllers?.forEach((r)=>r.hostUpdated?.()),!this.hasUpdated)this.hasUpdated=!0,this.firstUpdated(o);if(this.updated(o),J&&this.isUpdatePending&&this.constructor.enabledWarnings.includes("change-in-update"))A("change-in-update",`Element ${this.localName} scheduled an update (generally because a property was set) after an update completed, causing a new update to be scheduled. This is inefficient and should be avoided unless the next update can only be scheduled as a side effect of the previous update.`)}__markUpdated(){this._$changedProperties=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this.__updatePromise}shouldUpdate(o){return!0}update(o){this.__reflectingProperties&&=this.__reflectingProperties.forEach((r)=>this.__propertyToAttribute(r,this[r])),this.__markUpdated()}updated(o){}firstUpdated(o){}}Q.elementStyles=[];Q.shadowRootOptions={mode:"open"};Q[xo("elementProperties",Q)]=new Map;Q[xo("finalized",Q)]=new Map;li?.({ReactiveElement:Q});if(J){Q.enabledWarnings=["change-in-update","async-perform-update"];let o=function(r){if(!r.hasOwnProperty(xo("enabledWarnings",r)))r.enabledWarnings=r.enabledWarnings.slice()};Q.enableWarning=function(r){if(o(this),!this.enabledWarnings.includes(r))this.enabledWarnings.push(r)},Q.disableWarning=function(r){o(this);let i=this.enabledWarnings.indexOf(r);if(i>=0)this.enabledWarnings.splice(i,1)}}(B.reactiveElementVersions??=[]).push("2.1.2");if(J&&B.reactiveElementVersions.length>1)queueMicrotask(()=>{A("multiple-versions","Multiple versions of Lit loaded. Loading multiple versions is not recommended.")});var Z=globalThis,v=(o)=>{if(!Z.emitLitDebugLogEvents)return;Z.dispatchEvent(new CustomEvent("lit-debug",{detail:o}))},Ht=0,mo;Z.litIssuedWarnings??=new Set,mo=(o,r)=>{if(r+=o?` See https://lit.dev/msg/${o} for more information.`:"",!Z.litIssuedWarnings.has(r)&&!Z.litIssuedWarnings.has(o))console.warn(r),Z.litIssuedWarnings.add(r)},queueMicrotask(()=>{mo("dev-mode","Lit is in dev mode. Not recommended for production!")});var M=Z.ShadyDOM?.inUse&&Z.ShadyDOM?.noPatch===!0?Z.ShadyDOM.wrap:(o)=>o,Jo=Z.trustedTypes,gi=Jo?Jo.createPolicy("lit-html",{createHTML:(o)=>o}):void 0,Ft=(o)=>o,Ao=(o,r,i)=>Ft,qt=(o)=>{if(ao!==Ao)throw Error("Attempted to overwrite existing lit-html security policy. setSanitizeDOMValueFactory should be called at most once.");ao=o},Bt=()=>{ao=Ao},sr=(o,r,i)=>{return ao(o,r,i)},vi="$lit$",N=`lit$${Math.random().toFixed(9).slice(2)}$`,ki="?"+N,Kt=`<${ki}>`,io=document,zo=()=>io.createComment(""),jo=(o)=>o===null||typeof o!="object"&&typeof o!="function",nr=Array.isArray,Jt=(o)=>nr(o)||typeof o?.[Symbol.iterator]==="function",rr=`[ 	
\f\r]`,Qt=`[^ 	
\f\r"'\`<>=]`,Zt=`[^\\s"'>=/]`,wo=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,xi=1,ir=2,Yt=3,bi=/-->/g,hi=/>/g,P=new RegExp(`>|${rr}(?:(${Zt}+)(${rr}*=${rr}*(?:${Qt}|("|')|))|$)`,"g"),At=0,fi=1,Mt=2,_i=3,tr=/'/g,ar=/"/g,yi=/^(?:script|style|textarea|title)$/i,Ut=1,Qo=2,Zo=3,dr=1,Yo=2,Xt=3,Lt=4,Rt=5,cr=6,Nt=7,pr=(o)=>(r,...i)=>{if(r.some((t)=>t===void 0))console.warn(`Some template strings are undefined.
This is probably caused by illegal octal escape sequences.`);if(i.some((t)=>t?._$litStatic$))mo("",`Static values 'literal' or 'unsafeStatic' cannot be used as values to non-static templates.
Please use the static 'html' tag function. See https://lit.dev/docs/templates/expressions/#static-expressions`);return{["_$litType$"]:o,strings:r,values:i}},f=pr(Ut),ks=pr(Qo),ys=pr(Zo),to=Symbol.for("lit-noChange"),j=Symbol.for("lit-nothing"),ei=new WeakMap,ro=io.createTreeWalker(io,129),ao=Ao;function ui(o,r){if(!nr(o)||!o.hasOwnProperty("raw")){let i="invalid template strings array";throw i=`
          Internal Error: expected template strings to be an array
          with a 'raw' field. Faking a template strings array by
          calling html or svg like an ordinary function is effectively
          the same as calling unsafeHtml and can lead to major security
          issues, e.g. opening your code up to XSS attacks.
          If you're using the html or svg tagged template functions normally
          and still seeing this error, please file a bug at
          https://github.com/lit/lit/issues/new?template=bug_report.md
          and include information about your build tooling, if any.
        `.trim().replace(/\n */g,`
`),Error(i)}return gi!==void 0?gi.createHTML(r):r}var Ct=(o,r)=>{let i=o.length-1,t=[],a=r===Qo?"<svg>":r===Zo?"<math>":"",n,d=wo;for(let p=0;p<i;p++){let g=o[p],l=-1,b,e=0,h;while(e<g.length){if(d.lastIndex=e,h=d.exec(g),h===null)break;if(e=d.lastIndex,d===wo){if(h[xi]==="!--")d=bi;else if(h[xi]!==void 0)d=hi;else if(h[ir]!==void 0){if(yi.test(h[ir]))n=new RegExp(`</${h[ir]}`,"g");d=P}else if(h[Yt]!==void 0)throw Error("Bindings in tag names are not supported. Please use static templates instead. See https://lit.dev/docs/templates/expressions/#static-expressions")}else if(d===P)if(h[At]===">")d=n??wo,l=-1;else if(h[fi]===void 0)l=-2;else l=d.lastIndex-h[Mt].length,b=h[fi],d=h[_i]===void 0?P:h[_i]==='"'?ar:tr;else if(d===ar||d===tr)d=P;else if(d===bi||d===hi)d=wo;else d=P,n=void 0}console.assert(l===-1||d===P||d===tr||d===ar,"unexpected parse state B");let y=d===P&&o[p+1].startsWith("/>")?" ":"";a+=d===wo?g+Kt:l>=0?(t.push(b),g.slice(0,l)+vi+g.slice(l))+N+y:g+N+(l===-2?p:y)}let c=a+(o[i]||"<?>")+(r===Qo?"</svg>":r===Zo?"</math>":"");return[ui(o,c),t]};class Go{constructor({strings:o,["_$litType$"]:r},i){this.parts=[];let t,a=0,n=0,d=o.length-1,c=this.parts,[p,g]=Ct(o,r);if(this.el=Go.createElement(p,i),ro.currentNode=this.el.content,r===Qo||r===Zo){let l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}while((t=ro.nextNode())!==null&&c.length<d){if(t.nodeType===1){{let l=t.localName;if(/^(?:textarea|template)$/i.test(l)&&t.innerHTML.includes(N)){let b=`Expressions are not supported inside \`${l}\` elements. See https://lit.dev/msg/expression-in-${l} for more information.`;if(l==="template")throw Error(b);else mo("",b)}}if(t.hasAttributes()){for(let l of t.getAttributeNames())if(l.endsWith(vi)){let b=g[n++],h=t.getAttribute(l).split(N),y=/([.?@])?(.*)/.exec(b);c.push({type:dr,index:a,name:y[2],strings:h,ctor:y[1]==="."?$i:y[1]==="?"?mi:y[1]==="@"?zi:Fo}),t.removeAttribute(l)}else if(l.startsWith(N))c.push({type:cr,index:a}),t.removeAttribute(l)}if(yi.test(t.tagName)){let l=t.textContent.split(N),b=l.length-1;if(b>0){t.textContent=Jo?Jo.emptyScript:"";for(let e=0;e<b;e++)t.append(l[e],zo()),ro.nextNode(),c.push({type:Yo,index:++a});t.append(l[b],zo())}}}else if(t.nodeType===8)if(t.data===ki)c.push({type:Yo,index:a});else{let b=-1;while((b=t.data.indexOf(N,b+1))!==-1)c.push({type:Nt,index:a}),b+=N.length-1}a++}if(g.length!==n)throw Error('Detected duplicate attribute bindings. This occurs if your template has duplicate attributes on an element tag. For example "<input ?disabled=${true} ?disabled=${false}>" contains a duplicate "disabled" attribute. The error was detected in the following template: \n`'+o.join("${...}")+"`");v&&v({kind:"template prep",template:this,clonableTemplate:this.el,parts:this.parts,strings:o})}static createElement(o,r){let i=io.createElement("template");return i.innerHTML=o,i}}function bo(o,r,i=o,t){if(r===to)return r;let a=t!==void 0?i.__directives?.[t]:i.__directive,n=jo(r)?void 0:r._$litDirective$;if(a?.constructor!==n){if(a?._$notifyDirectiveConnectionChanged?.(!1),n===void 0)a=void 0;else a=new n(o),a._$initialize(o,i,t);if(t!==void 0)(i.__directives??=[])[t]=a;else i.__directive=a}if(a!==void 0)r=bo(o,a._$resolve(o,r.values),a,t);return r}class wi{constructor(o,r){this._$parts=[],this._$disconnectableChildren=void 0,this._$template=o,this._$parent=r}get parentNode(){return this._$parent.parentNode}get _$isConnected(){return this._$parent._$isConnected}_clone(o){let{el:{content:r},parts:i}=this._$template,t=(o?.creationScope??io).importNode(r,!0);ro.currentNode=t;let a=ro.nextNode(),n=0,d=0,c=i[0];while(c!==void 0){if(n===c.index){let p;if(c.type===Yo)p=new Ho(a,a.nextSibling,this,o);else if(c.type===dr)p=new c.ctor(a,c.name,c.strings,this,o);else if(c.type===cr)p=new ji(a,this,o);this._$parts.push(p),c=i[++d]}if(n!==c?.index)a=ro.nextNode(),n++}return ro.currentNode=io,t}_update(o){let r=0;for(let i of this._$parts){if(i!==void 0)if(v&&v({kind:"set part",part:i,value:o[r],valueIndex:r,values:o,templateInstance:this}),i.strings!==void 0)i._$setValue(o,i,r),r+=i.strings.length-2;else i._$setValue(o[r]);r++}}}class Ho{get _$isConnected(){return this._$parent?._$isConnected??this.__isConnected}constructor(o,r,i,t){this.type=Yo,this._$committedValue=j,this._$disconnectableChildren=void 0,this._$startNode=o,this._$endNode=r,this._$parent=i,this.options=t,this.__isConnected=t?.isConnected??!0,this._textSanitizer=void 0}get parentNode(){let o=M(this._$startNode).parentNode,r=this._$parent;if(r!==void 0&&o?.nodeType===11)o=r.parentNode;return o}get startNode(){return this._$startNode}get endNode(){return this._$endNode}_$setValue(o,r=this){if(this.parentNode===null)throw Error("This `ChildPart` has no `parentNode` and therefore cannot accept a value. This likely means the element containing the part was manipulated in an unsupported way outside of Lit's control such that the part's marker nodes were ejected from DOM. For example, setting the element's `innerHTML` or `textContent` can do this.");if(o=bo(this,o,r),jo(o)){if(o===j||o==null||o===""){if(this._$committedValue!==j)v&&v({kind:"commit nothing to child",start:this._$startNode,end:this._$endNode,parent:this._$parent,options:this.options}),this._$clear();this._$committedValue=j}else if(o!==this._$committedValue&&o!==to)this._commitText(o)}else if(o._$litType$!==void 0)this._commitTemplateResult(o);else if(o.nodeType!==void 0){if(this.options?.host===o){this._commitText("[probable mistake: rendered a template's host in itself (commonly caused by writing ${this} in a template]"),console.warn("Attempted to render the template host",o,"inside itself. This is almost always a mistake, and in dev mode ","we render some warning text. In production however, we'll ","render it, which will usually result in an error, and sometimes ","in the element disappearing from the DOM.");return}this._commitNode(o)}else if(Jt(o))this._commitIterable(o);else this._commitText(o)}_insert(o){return M(M(this._$startNode).parentNode).insertBefore(o,this._$endNode)}_commitNode(o){if(this._$committedValue!==o){if(this._$clear(),ao!==Ao){let r=this._$startNode.parentNode?.nodeName;if(r==="STYLE"||r==="SCRIPT"){let i="Forbidden";if(r==="STYLE")i="Lit does not support binding inside style nodes. This is a security risk, as style injection attacks can exfiltrate data and spoof UIs. Consider instead using css`...` literals to compose styles, and do dynamic styling with css custom properties, ::parts, <slot>s, and by mutating the DOM rather than stylesheets.";else i="Lit does not support binding inside script nodes. This is a security risk, as it could allow arbitrary code execution.";throw Error(i)}}v&&v({kind:"commit node",start:this._$startNode,parent:this._$parent,value:o,options:this.options}),this._$committedValue=this._insert(o)}}_commitText(o){if(this._$committedValue!==j&&jo(this._$committedValue)){let r=M(this._$startNode).nextSibling;if(this._textSanitizer===void 0)this._textSanitizer=sr(r,"data","property");o=this._textSanitizer(o),v&&v({kind:"commit text",node:r,value:o,options:this.options}),r.data=o}else{let r=io.createTextNode("");if(this._commitNode(r),this._textSanitizer===void 0)this._textSanitizer=sr(r,"data","property");o=this._textSanitizer(o),v&&v({kind:"commit text",node:r,value:o,options:this.options}),r.data=o}this._$committedValue=o}_commitTemplateResult(o){let{values:r,["_$litType$"]:i}=o,t=typeof i==="number"?this._$getTemplate(o):(i.el===void 0&&(i.el=Go.createElement(ui(i.h,i.h[0]),this.options)),i);if(this._$committedValue?._$template===t)v&&v({kind:"template updating",template:t,instance:this._$committedValue,parts:this._$committedValue._$parts,options:this.options,values:r}),this._$committedValue._update(r);else{let a=new wi(t,this),n=a._clone(this.options);v&&v({kind:"template instantiated",template:t,instance:a,parts:a._$parts,options:this.options,fragment:n,values:r}),a._update(r),v&&v({kind:"template instantiated and updated",template:t,instance:a,parts:a._$parts,options:this.options,fragment:n,values:r}),this._commitNode(n),this._$committedValue=a}}_$getTemplate(o){let r=ei.get(o.strings);if(r===void 0)ei.set(o.strings,r=new Go(o));return r}_commitIterable(o){if(!nr(this._$committedValue))this._$committedValue=[],this._$clear();let r=this._$committedValue,i=0,t;for(let a of o){if(i===r.length)r.push(t=new Ho(this._insert(zo()),this._insert(zo()),this,this.options));else t=r[i];t._$setValue(a),i++}if(i<r.length)this._$clear(t&&M(t._$endNode).nextSibling,i),r.length=i}_$clear(o=M(this._$startNode).nextSibling,r){this._$notifyConnectionChanged?.(!1,!0,r);while(o!==this._$endNode){let i=M(o).nextSibling;M(o).remove(),o=i}}setConnected(o){if(this._$parent===void 0)this.__isConnected=o,this._$notifyConnectionChanged?.(o);else throw Error("part.setConnected() may only be called on a RootPart returned from render().")}}class Fo{get tagName(){return this.element.tagName}get _$isConnected(){return this._$parent._$isConnected}constructor(o,r,i,t,a){if(this.type=dr,this._$committedValue=j,this._$disconnectableChildren=void 0,this.element=o,this.name=r,this._$parent=t,this.options=a,i.length>2||i[0]!==""||i[1]!=="")this._$committedValue=Array(i.length-1).fill(new String),this.strings=i;else this._$committedValue=j;this._sanitizer=void 0}_$setValue(o,r=this,i,t){let a=this.strings,n=!1;if(a===void 0){if(o=bo(this,o,r,0),n=!jo(o)||o!==this._$committedValue&&o!==to,n)this._$committedValue=o}else{let d=o;o=a[0];let c,p;for(c=0;c<a.length-1;c++){if(p=bo(this,d[i+c],r,c),p===to)p=this._$committedValue[c];if(n||=!jo(p)||p!==this._$committedValue[c],p===j)o=j;else if(o!==j)o+=(p??"")+a[c+1];this._$committedValue[c]=p}}if(n&&!t)this._commitValue(o)}_commitValue(o){if(o===j)M(this.element).removeAttribute(this.name);else{if(this._sanitizer===void 0)this._sanitizer=ao(this.element,this.name,"attribute");o=this._sanitizer(o??""),v&&v({kind:"commit attribute",element:this.element,name:this.name,value:o,options:this.options}),M(this.element).setAttribute(this.name,o??"")}}}class $i extends Fo{constructor(){super(...arguments);this.type=Xt}_commitValue(o){if(this._sanitizer===void 0)this._sanitizer=ao(this.element,this.name,"property");o=this._sanitizer(o),v&&v({kind:"commit property",element:this.element,name:this.name,value:o,options:this.options}),this.element[this.name]=o===j?void 0:o}}class mi extends Fo{constructor(){super(...arguments);this.type=Lt}_commitValue(o){v&&v({kind:"commit boolean attribute",element:this.element,name:this.name,value:!!(o&&o!==j),options:this.options}),M(this.element).toggleAttribute(this.name,!!o&&o!==j)}}class zi extends Fo{constructor(o,r,i,t,a){super(o,r,i,t,a);if(this.type=Rt,this.strings!==void 0)throw Error(`A \`<${o.localName}>\` has a \`@${r}=...\` listener with invalid content. Event listeners in templates must have exactly one expression and no surrounding text.`)}_$setValue(o,r=this){if(o=bo(this,o,r,0)??j,o===to)return;let i=this._$committedValue,t=o===j&&i!==j||o.capture!==i.capture||o.once!==i.once||o.passive!==i.passive,a=o!==j&&(i===j||t);if(v&&v({kind:"commit event listener",element:this.element,name:this.name,value:o,options:this.options,removeListener:t,addListener:a,oldListener:i}),t)this.element.removeEventListener(this.name,this,i);if(a)this.element.addEventListener(this.name,this,o);this._$committedValue=o}handleEvent(o){if(typeof this._$committedValue==="function")this._$committedValue.call(this.options?.host??this.element,o);else this._$committedValue.handleEvent(o)}}class ji{constructor(o,r,i){this.element=o,this.type=cr,this._$disconnectableChildren=void 0,this._$parent=r,this.options=i}get _$isConnected(){return this._$parent._$isConnected}_$setValue(o){v&&v({kind:"commit to element binding",element:this.element,value:o,options:this.options}),bo(this,o)}}var Wt=Z.litHtmlPolyfillSupportDevMode;Wt?.(Go,Ho);(Z.litHtmlVersions??=[]).push("3.3.2");if(Z.litHtmlVersions.length>1)queueMicrotask(()=>{mo("multiple-versions","Multiple versions of Lit loaded. Loading multiple versions is not recommended.")});var $o=(o,r,i)=>{if(r==null)throw TypeError(`The container to render into may not be ${r}`);let t=Ht++,a=i?.renderBefore??r,n=a._$litPart$;if(v&&v({kind:"begin render",id:t,value:o,container:r,options:i,part:n}),n===void 0){let d=i?.renderBefore??null;a._$litPart$=n=new Ho(r.insertBefore(zo(),d),d,void 0,i??{})}return n._$setValue(o),v&&v({kind:"end render",id:t,value:o,container:r,options:i,part:n}),n};$o.setSanitizer=qt,$o.createSanitizer=sr,$o._testOnlyClearSanitizerFactoryDoNotCallOrElse=Bt;var Vt=(o,r)=>o,lr=!0,C=globalThis,Gi;if(lr)C.litIssuedWarnings??=new Set,Gi=(o,r)=>{if(r+=` See https://lit.dev/msg/${o} for more information.`,!C.litIssuedWarnings.has(r)&&!C.litIssuedWarnings.has(o))console.warn(r),C.litIssuedWarnings.add(r)};class R extends Q{constructor(){super(...arguments);this.renderOptions={host:this},this.__childPart=void 0}createRenderRoot(){let o=super.createRenderRoot();return this.renderOptions.renderBefore??=o.firstChild,o}update(o){let r=this.render();if(!this.hasUpdated)this.renderOptions.isConnected=this.isConnected;super.update(o),this.__childPart=$o(r,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this.__childPart?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this.__childPart?.setConnected(!1)}render(){return to}}R._$litElement$=!0;R[Vt("finalized",R)]=!0;C.litElementHydrateSupport?.({LitElement:R});var Tt=lr?C.litElementPolyfillSupportDevMode:C.litElementPolyfillSupport;Tt?.({LitElement:R});(C.litElementVersions??=[]).push("4.2.2");if(lr&&C.litElementVersions.length>1)queueMicrotask(()=>{Gi("multiple-versions","Multiple versions of Lit loaded. Loading multiple versions is not recommended.")});var Mo=(o)=>(r,i)=>{if(i!==void 0)i.addInitializer(()=>{customElements.define(o,r)});else customElements.define(o,r)};var Hi=!0,Fi;if(Hi)globalThis.litIssuedWarnings??=new Set,Fi=(o,r)=>{if(r+=` See https://lit.dev/msg/${o} for more information.`,!globalThis.litIssuedWarnings.has(r)&&!globalThis.litIssuedWarnings.has(o))console.warn(r),globalThis.litIssuedWarnings.add(r)};var Ot=(o,r,i)=>{let t=r.hasOwnProperty(i);return r.constructor.createProperty(i,o),t?Object.getOwnPropertyDescriptor(r,i):void 0},Dt={attribute:!0,type:String,converter:uo,reflect:!1,hasChanged:Ko},Et=(o=Dt,r,i)=>{let{kind:t,metadata:a}=i;if(Hi&&a==null)Fi("missing-class-metadata",`The class ${r} is missing decorator metadata. This could mean that you're using a compiler that supports decorators but doesn't support decorator metadata, such as TypeScript 5.1. Please update your compiler.`);let n=globalThis.litPropertyMetadata.get(a);if(n===void 0)globalThis.litPropertyMetadata.set(a,n=new Map);if(t==="setter")o=Object.create(o),o.wrapped=!0;if(n.set(i.name,o),t==="accessor"){let{name:d}=i;return{set(c){let p=r.get.call(this);r.set.call(this,c),this.requestUpdate(d,p,o,!0,c)},init(c){if(c!==void 0)this._$changeProperty(d,void 0,o,c);return c}}}else if(t==="setter"){let{name:d}=i;return function(c){let p=this[d];r.call(this,c),this.requestUpdate(d,p,o,!0,c)}}throw Error(`Unsupported decorator location: ${t}`)};function W(o){return(r,i)=>{return typeof i==="object"?Et(o,r,i):Ot(o,r,i)}}function V(o){return W({...o,state:!0,attribute:!1})}var so=(o,r,i)=>{if(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&typeof r!=="object")Object.defineProperty(o,r,i);return i};var gr=!0,qi;if(gr)globalThis.litIssuedWarnings??=new Set,qi=(o,r)=>{if(r+=o?` See https://lit.dev/msg/${o} for more information.`:"",!globalThis.litIssuedWarnings.has(r)&&!globalThis.litIssuedWarnings.has(o))console.warn(r),globalThis.litIssuedWarnings.add(r)};function Bi(o,r){return(i,t,a)=>{let n=(d)=>{let c=d.renderRoot?.querySelector(o)??null;if(gr&&c===null&&r&&!d.hasUpdated){let p=typeof t==="object"?t.name:t;qi("",`@query'd field ${JSON.stringify(String(p))} with the 'cache' flag set for selector '${o}' has been accessed before the first update and returned null. This is expected if the renderRoot tree has not been provided beforehand (e.g. via Declarative Shadow DOM). Therefore the value hasn't been cached.`)}return c};if(r){let{get:d,set:c}=typeof t==="object"?i:a??(()=>{let p=gr?Symbol(`${String(t)} (@query() cache)`):Symbol();return{get(){return this[p]},set(g){this[p]=g}}})();return so(i,t,{get(){let p=d.call(this);if(p===void 0){if(p=n(this),p!==null||this.hasUpdated)c.call(this,p)}return p}})}else return so(i,t,{get(){return n(this)}})}}Y();u();var Pt={allowedTags:["h1","h2","h3","h4","h5","h6","p","br","div","span","strong","b","em","i","u","s","strike","a","img","ul","ol","li","pre","code","blockquote","label","input"],allowedAttrs:{"*":["style","class"],a:["href","title","target"],img:["src","alt","title","width","height"],input:["type","id","checked"],label:["for"]},allowedSchemes:["http","https","data","mailto"]};class Ki{config;constructor(o){this.config={...Pt,...o}}sanitize(o){if(!o||typeof o!=="string")return"";let i=new DOMParser().parseFromString(o,"text/html");return this.cleanNode(i.body),i.body.innerHTML}cleanNode(o){let r=Array.from(o.childNodes);for(let i=r.length-1;i>=0;i--){let t=r[i];if(t.nodeType===Node.TEXT_NODE)continue;if(t.nodeType===Node.COMMENT_NODE){o.removeChild(t);continue}if(t.nodeType===Node.ELEMENT_NODE){let a=t,n=a.tagName.toLowerCase();if(!this.config.allowedTags.includes(n)){o.removeChild(t);continue}this.cleanAttributes(a),this.cleanNode(a)}else o.removeChild(t)}}cleanAttributes(o){let r=o.tagName.toLowerCase(),i=[...this.config.allowedAttrs["*"]||[],...this.config.allowedAttrs[r]||[]],t=Array.from(o.attributes);for(let a of t){let n=a.name.toLowerCase();if(!i.includes(n)){o.removeAttribute(a.name);continue}if(n==="href"||n==="src"){let d=a.value.trim();if(this.isDangerousUrl(d)){o.removeAttribute(a.name);continue}}if(n==="style"){let d=this.sanitizeStyle(a.value);if(d!==a.value)o.setAttribute("style",d)}if(r==="input"&&n==="type"){if(a.value.toLowerCase()!=="checkbox")o.setAttribute("type","checkbox")}}}isDangerousUrl(o){let r=o.toLowerCase().trim();if(r.startsWith("javascript:"))return!0;if(r.startsWith("data:")&&r.includes("script"))return!0;if(r.startsWith("vbscript:"))return!0;if(r.includes(":")){let i=r.split(":")[0];if(!this.config.allowedSchemes.includes(i))return!0}return!1}sanitizeStyle(o){let r=["behavior","expression","moz-binding","-o-link","-o-link-source","import","@import"],i=o;for(let t of r){let a=new RegExp(t,"gi");i=i.replace(a,"")}return i=i.replace(/url\s*\(\s*['"]?javascript:/gi,"url(about:blank"),i}}var no=new Ki;class Uo{static parse(o){try{if(typeof o==="object"&&o!==null)return o;if(typeof o==="string"){let r=JSON.parse(o);if(typeof r==="object"&&r!==null)return r}return{widgetId:"unknown"}}catch(r){return console.warn("[WidgetContentHelper] Failed to parse content:",r),{widgetId:"unknown"}}}static serialize(o){try{return JSON.stringify(o)}catch(r){return console.error("[WidgetContentHelper] Failed to serialize content:",r),"{}"}}static getNotepadText(o){return this.parse(o).text||""}static setNotepadText(o,r){let t={...this.parse(o),widgetId:"notepad",text:r};return this.serialize(t)}static merge(o,r){let t={...this.parse(o),...r};return this.serialize(t)}static validate(o,r){return this.parse(o).widgetId===r}}u();class xr extends R{constructor(){super(...arguments);this.blockId="";this.items=[];this.readonly=!1;this.focusedItemId=null}static styles=Bo`
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
    `;generateId(){return"item-"+Math.random().toString(36).substring(2,11)}addItem(){let o={id:this.generateId(),checked:!1,text:""};this.items=[...this.items,o],this.focusedItemId=o.id,this.dispatchChangeEvent(),this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`input[data-item-id="${o.id}"]`)?.focus()})}addItemAfter(o){let r=this.items.findIndex((a)=>a.id===o);if(r===-1)return;let i={id:this.generateId(),checked:!1,text:""},t=[...this.items];t.splice(r+1,0,i),this.items=t,this.focusedItemId=i.id,this.dispatchChangeEvent(),this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`input[data-item-id="${i.id}"]`)?.focus()})}deleteItem(o){if(this.items.length===1){this.updateItemText(o,"");return}let r=this.items.findIndex((a)=>a.id===o);if(r===-1)return;let i=r>0?r-1:r+1,t=this.items[i]?.id;if(this.items=this.items.filter((a)=>a.id!==o),this.dispatchChangeEvent(),t)this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`input[data-item-id="${t}"]`)?.focus()})}toggleItem(o){this.items=this.items.map((r)=>r.id===o?{...r,checked:!r.checked}:r),this.dispatchChangeEvent()}updateItemText(o,r){this.items=this.items.map((i)=>i.id===o?{...i,text:r}:i),this.dispatchChangeEvent()}handleItemKeydown(o,r){let i=o.target,t=this.items.find((a)=>a.id===r);if(!t)return;if(o.key==="Enter"){if(o.preventDefault(),!t.text.trim())return;this.addItemAfter(r)}else if(o.key==="Backspace"&&i.selectionStart===0&&i.selectionEnd===0){if(!t.text.trim())o.preventDefault(),this.deleteItem(r)}else if(o.key==="ArrowUp"){o.preventDefault();let a=this.items.findIndex((n)=>n.id===r);if(a>0){let n=this.items[a-1].id;this.shadowRoot?.querySelector(`input[data-item-id="${n}"]`)?.focus()}}else if(o.key==="ArrowDown"){o.preventDefault();let a=this.items.findIndex((n)=>n.id===r);if(a<this.items.length-1){let n=this.items[a+1].id;this.shadowRoot?.querySelector(`input[data-item-id="${n}"]`)?.focus()}}}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("checklist-change",{detail:{blockId:this.blockId,items:this.items},bubbles:!0,composed:!0}))}render(){if(this.items.length===0)return f`
                <div class="empty-state">
                    ${s.t("widget.notepad.checklist.empty")}
                </div>
                ${!this.readonly?f`
                    <button class="add-item-btn" @click="${()=>this.addItem()}">
                        + ${s.t("widget.notepad.checklist.add_first")}
                    </button>
                `:""}
            `;return f`
            <div class="checklist-items">
                ${this.items.map((o)=>f`
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
                            placeholder="${s.t("widget.notepad.checklist.placeholder")}"
                            ?readonly="${this.readonly}"
                            @input="${(r)=>this.updateItemText(o.id,r.target.value)}"
                            @keydown="${(r)=>this.handleItemKeydown(r,o.id)}"
                        />
                        ${!this.readonly?f`
                            <button
                                class="delete-btn"
                                @click="${()=>this.deleteItem(o.id)}"
                                title="${s.t("widget.notepad.checklist.delete_item")}"
                            >
                                ×
                            </button>
                        `:""}
                    </div>
                `)}
            </div>
            ${!this.readonly?f`
                <button class="add-item-btn" @click="${()=>this.addItem()}">
                    + ${s.t("widget.notepad.checklist.add_item")}
                </button>
            `:""}
        `}}G([W({type:String}),F("design:type",String)],xr.prototype,"blockId",void 0),G([W({type:Array}),F("design:type",Array)],xr.prototype,"items",void 0),G([W({type:Boolean}),F("design:type",Boolean)],xr.prototype,"readonly",void 0),G([V(),F("design:type",String)],xr.prototype,"focusedItemId",void 0),xr=G([Mo("checklist-block")],xr);var $={bold:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`,italic:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,underline:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,strike:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,h1:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,h2:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,list:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,listOrdered:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,checklist:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`,link:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,image:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,color:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>`,undo:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,redo:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>`,alignLeft:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,alignCenter:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>`,alignRight:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,alignJustify:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,code:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,clear:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,edit:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,save:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,loader:f`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`},Xo=50000,Ji=1e4;class br extends R{constructor(){super(...arguments);this.itemId=0;this.content="";this.isInternalEditing=!1;this.isDashboardEditing=!1;this.isSaving=!1;this.characterCount=0;this.hasUnsavedChanges=!1;this.checklistBlocks=[]}_unsubscribe;_autosaveTimeout=null;_savePromise=null;_lastSavedContent="";static styles=Bo`
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
    `;connectedCallback(){super.connectedCallback(),this._unsubscribe=x.subscribe((r)=>{let i=this.isDashboardEditing;if(this.isDashboardEditing=r.isEditing||!1,i!==this.isDashboardEditing)if(this.isDashboardEditing)if(this.hasUnsavedChanges&&this.isInternalEditing)if(confirm(s.t("widget.notepad.confirm_discard")))this.isInternalEditing=!1,this.hasUnsavedChanges=!1,this.cancelAutosave(),this.requestUpdate();else setTimeout(()=>x.toggleEditMode(),0);else this.isInternalEditing=!1,this.cancelAutosave(),this.requestUpdate();else this.loadFromStore()});let o=x.getState();this.isDashboardEditing=o.isEditing||!1,this.loadFromStore()}disconnectedCallback(){if(super.disconnectedCallback(),this._unsubscribe)this._unsubscribe();this.cancelAutosave()}updated(o){if(super.updated(o),o.has("content")&&!this.isInternalEditing&&this.editorElement){let r=no.sanitize(this.content);if(this.editorElement.innerHTML!==r)this.editorElement.innerHTML=r}}loadFromStore(){if(!this.itemId)return;let r=x.getState().items.find((i)=>i.id===this.itemId);if(r){let i=Uo.getNotepadText(r.content);try{let t=JSON.parse(i);if(t&&typeof t==="object"&&"html"in t)this.content=t.html||"",this.checklistBlocks=t.checklists||[];else this.content=i,this.checklistBlocks=[]}catch{this.content=i,this.checklistBlocks=[]}this.characterCount=this.content.length,this._lastSavedContent=i}}exec(o,r){if(document.execCommand(o,!1,r),this.editorElement)this.editorElement.focus()}cancelAutosave(){if(this._autosaveTimeout)clearTimeout(this._autosaveTimeout),this._autosaveTimeout=null}async saveContent(o=!1){if(this._savePromise){await this._savePromise;return}try{let r=this.shadowRoot?.querySelector(".editor")||this.shadowRoot?.querySelector("[contenteditable]");if(!r)throw Error("Critical: Editor element missing");let i=r.innerHTML;if(i.length>Xo){alert(s.t("widget.notepad.error.too_large"));return}let t=no.sanitize(i),a=JSON.stringify({html:t,checklists:this.checklistBlocks});if(!o)this.content=t,this.characterCount=t.length,this.isInternalEditing=!1,this.hasUnsavedChanges=!1,this.requestUpdate();this._savePromise=(async()=>{if(!this.itemId)return;if(!o)this.isSaving=!0,this.requestUpdate();try{let n=x.getState().items.find((c)=>c.id===this.itemId);if(!n){console.warn("[NotepadWidget] Item no longer exists");return}let d=Uo.setNotepadText(n.content,a);if(await x.updateItem({id:this.itemId,content:d}),this._lastSavedContent=a,o)this.hasUnsavedChanges=!1}catch(n){if(console.error("[NotepadWidget] Save failed:",n),!o)alert(s.t("widget.notepad.error.save")+n)}finally{if(!o)this.isSaving=!1,this.requestUpdate()}})(),await this._savePromise}catch(r){if(console.error("[NotepadWidget] Save error:",r),!o)alert(s.t("widget.notepad.error.save")+r)}finally{this._savePromise=null}}startEditing(){if(this.isDashboardEditing)return;this.isInternalEditing=!0,setTimeout(()=>{if(this.editorElement){this.editorElement.focus();let o=no.sanitize(this.content);if(this.editorElement.innerHTML!==o)this.editorElement.innerHTML=o;this.focusEditor(!0)}},0)}focusEditor(o=!0){if(!this.editorElement)return;if(this.editorElement.focus(),o){let r=window.getSelection();if(r){let i=document.createRange();i.selectNodeContents(this.editorElement),i.collapse(!1),r.removeAllRanges(),r.addRange(i)}}}handleColor(o){let r=o.target;this.exec("foreColor",r.value)}handleToolbarWheel(o){o.preventDefault();let r=o.currentTarget;r.scrollLeft+=o.deltaY}insertChecklist(){let o="block-"+Math.random().toString(36).substring(2,11),r={id:o,items:[{id:"item-"+Math.random().toString(36).substring(2,11),checked:!1,text:""}]};this.checklistBlocks=[...this.checklistBlocks,r],this.hasUnsavedChanges=!0,this.scheduleAutosave(),this.updateComplete.then(()=>{this.shadowRoot?.querySelector(`checklist-block[block-id="${o}"]`)?.shadowRoot?.querySelector('input[type="text"]')?.focus()})}insertCode(){let r=`<pre><code>${s.t("widget.notepad.prompt.code_block")}</code></pre><p><br></p>`;this.exec("insertHTML",r),setTimeout(()=>{let i=window.getSelection();if(i&&this.editorElement){let t=this.editorElement.querySelectorAll("code"),a=t[t.length-1];if(a){let n=document.createRange();n.selectNodeContents(a),i.removeAllRanges(),i.addRange(n)}}},0)}handleChecklistChange(o){let{blockId:r,items:i}=o.detail;this.checklistBlocks=this.checklistBlocks.map((t)=>t.id===r?{...t,items:i}:t),this.hasUnsavedChanges=!0,this.scheduleAutosave()}deleteChecklistBlock(o){this.checklistBlocks=this.checklistBlocks.filter((r)=>r.id!==o),this.hasUnsavedChanges=!0,this.scheduleAutosave()}handleEditorInput(o){let r=o.target;if(this.characterCount=r.innerHTML.length,this.hasUnsavedChanges=r.innerHTML!==this._lastSavedContent,this.cancelAutosave(),Ji>0)this._autosaveTimeout=setTimeout(()=>{if(this.hasUnsavedChanges)this.saveContent(!0)},Ji)}handleEditorKeydown(o){if(o.ctrlKey||o.metaKey)switch(o.key.toLowerCase()){case"b":o.preventDefault(),this.exec("bold");return;case"i":o.preventDefault(),this.exec("italic");return;case"s":o.preventDefault(),this.saveContent(!1);return;case"z":if(o.shiftKey)o.preventDefault(),this.exec("redo");else o.preventDefault(),this.exec("undo");return;case"k":o.preventDefault();let r=prompt(s.t("widget.notepad.prompt.url"));if(r)this.exec("createLink",r);return}}handlePaste(o){let r=o.clipboardData?.items;if(!r)return;for(let i of Array.from(r))if(i.type.indexOf("image")!==-1){o.preventDefault();let t=i.getAsFile();if(!t)continue;let a=new FileReader;a.onload=(n)=>{let d=n.target?.result;if(d.length>1e6){alert(s.t("widget.notepad.error.image_too_large"));return}this.exec("insertImage",d)},a.readAsDataURL(t);return}}render(){try{if(!this.isInternalEditing){let t=no.sanitize(this.content)||`<span style='opacity:0.5; font-style:italic; color: var(--text-dim);'>${s.t("widget.notepad.placeholder")}</span>`;return f`
                    <div style="flex: 1; width: 100%; height: 100%; min-height: 100px; overflow-y: auto; display: flex; flex-direction: column;">
                        <div
                            class="viewer"
                            style="padding: 16px; color: var(--text-main) !important; word-wrap: break-word;"
                            .innerHTML="${t}"
                        ></div>

                        <!-- Render checklist blocks in view mode (read-only) -->
                        ${this.checklistBlocks.map((a)=>f`
                            <div class="checklist-block-wrapper">
                                <checklist-block
                                    .blockId="${a.id}"
                                    .items="${a.items}"
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
                        title="${s.t("widget.notepad.tool.edit")}"
                    >
                        ${$.edit}
                    </button>
                `}let o=this.characterCount>Xo*0.9,r=this.characterCount>Xo;return f`
                <div class="container">
                    <div class="toolbar" @wheel="${this.handleToolbarWheel}" title="${s.t("widget.notepad.tool.scroll_hint")}">
                        <!-- History Group -->
                        <div class="group">
                             <button @click="${(i)=>{i.preventDefault(),this.exec("undo")}}" title="${s.t("widget.notepad.tool.undo")} (Ctrl+Z)">${$.undo}</button>
                             <button @click="${(i)=>{i.preventDefault(),this.exec("redo")}}" title="${s.t("widget.notepad.tool.redo")} (Ctrl+Shift+Z)">${$.redo}</button>
                        </div>

                        <!-- Text Group -->
                        <div class="group">
                            <button @click="${(i)=>{i.preventDefault(),this.exec("formatBlock","H1")}}" title="${s.t("widget.notepad.tool.h1")}">${$.h1}</button>
                            <button @click="${(i)=>{i.preventDefault(),this.exec("formatBlock","H2")}}" title="${s.t("widget.notepad.tool.h2")}">${$.h2}</button>
                            <button @click="${(i)=>{i.preventDefault(),this.exec("bold")}}" title="${s.t("widget.notepad.tool.bold")} (Ctrl+B)">${$.bold}</button>
                            <button @click="${(i)=>{i.preventDefault(),this.exec("italic")}}" title="${s.t("widget.notepad.tool.italic")} (Ctrl+I)">${$.italic}</button>

                            <!-- Color Picker -->
                            <div class="color-wrapper">
                                <button title="${s.t("widget.notepad.tool.color")}">${$.color}</button>
                                <input type="color" class="color-input" @change="${this.handleColor}" title="${s.t("widget.notepad.tool.color")}" />
                            </div>
                        </div>

                        <!-- Paragraph Group -->
                        <div class="group">
                             <button @click="${(i)=>{i.preventDefault(),this.exec("justifyLeft")}}" title="${s.t("widget.notepad.tool.align_left")}">${$.alignLeft}</button>
                             <button @click="${(i)=>{i.preventDefault(),this.exec("justifyCenter")}}" title="${s.t("widget.notepad.tool.align_center")}">${$.alignCenter}</button>
                             <button @click="${(i)=>{i.preventDefault(),this.exec("justifyRight")}}" title="${s.t("widget.notepad.tool.align_right")}">${$.alignRight}</button>
                             <button @click="${(i)=>{i.preventDefault(),this.exec("justifyFull")}}" title="${s.t("widget.notepad.tool.align_justify")}">${$.alignJustify}</button>
                        </div>

                        <div class="group">
                            <button @click="${(i)=>{i.preventDefault(),this.insertChecklist()}}" title="${s.t("widget.notepad.tool.checklist")}">${$.checklist}</button>
                            <button @click="${(i)=>{i.preventDefault(),this.exec("insertUnorderedList")}}" title="${s.t("widget.notepad.tool.list_bullet")}">${$.list}</button>
                            <button @click="${(i)=>{i.preventDefault(),this.exec("insertOrderedList")}}" title="${s.t("widget.notepad.tool.list_ordered")}">${$.listOrdered}</button>
                        </div>

                        <!-- Insert Group -->
                        <div class="group">
                            <button @click="${(i)=>{i.preventDefault(),this.insertCode()}}" title="${s.t("widget.notepad.tool.code")}">${$.code}</button>
                            <button @click="${(i)=>{i.preventDefault();let t=prompt(s.t("widget.notepad.prompt.url"));if(t)this.exec("createLink",t)}}" title="${s.t("widget.notepad.tool.link")} (Ctrl+K)">${$.link}</button>
                            <button @click="${(i)=>{i.preventDefault();let t=prompt(s.t("widget.notepad.prompt.image_url"));if(t)this.exec("insertImage",t)}}" title="${s.t("widget.notepad.tool.image")}">${$.image}</button>
                             <button @click="${(i)=>{i.preventDefault(),this.exec("removeFormat")}}" title="${s.t("widget.notepad.tool.clear_format")}">${$.clear}</button>
                        </div>

                        <!-- Status Group -->
                        <div class="autosave-indicator ${this.isSaving?"visible saving":""}">
                            ${this.isSaving?s.t("widget.notepad.status.saving"):""}
                        </div>
                    </div>

                    <div class="content-area editor"
                         contenteditable="true"
                         spellcheck="false"
                         data-placeholder="${s.t("widget.notepad.placeholder")}"
                         @keydown="${this.handleEditorKeydown}"
                         @input="${this.handleEditorInput}"
                         @paste="${this.handlePaste}"
                         .innerHTML="${no.sanitize(this.content)}">
                    </div>

                    <!-- Checklist Blocks (independent from contenteditable) -->
                    ${this.checklistBlocks.map((i)=>f`
                        <div class="checklist-block-wrapper">
                            <checklist-block
                                .blockId="${i.id}"
                                .items="${i.items}"
                                @checklist-change="${this.handleChecklistChange}"
                            ></checklist-block>
                            <button
                                class="delete-block-btn"
                                @click="${()=>this.deleteChecklistBlock(i.id)}"
                                title="${s.t("widget.notepad.checklist.delete_block")}"
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
                        title="${s.t("widget.notepad.tool.save")} (Ctrl+S)"
                    >
                        ${this.isSaving?$.loader:$.save}
                    </button>

                    <!-- Character Counter (bottom right, below save button) -->
                    <div class="char-counter-bottom ${o?"warning":""} ${r?"error":""}">
                        ${this.characterCount} / ${Xo}
                    </div>
                </div>
            `}catch(o){return console.error("[NotepadWidget] Render error:",o),fetch("/api/log-error",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({component:"NotepadWidget",error:o.toString(),stack:o.stack,itemId:this.itemId})}).catch(()=>{}),f`
                <div class="error-state">
                    <h3>${s.t("general.error")}</h3>
                    <p>${s.t("widget.notepad.error.render")}</p>
                    <button @click="${()=>this.loadFromStore()}">
                        ${s.t("general.restore")}
                    </button>
                    <details>
                        <summary>Technical Details</summary>
                        <pre>${o.toString()}\n${o.stack}</pre>
                    </details>
                </div>
            `}}}G([W({type:Number,attribute:"item-id"}),F("design:type",Number)],br.prototype,"itemId",void 0),G([W({type:String}),F("design:type",String)],br.prototype,"content",void 0),G([V(),F("design:type",Boolean)],br.prototype,"isInternalEditing",void 0),G([V(),F("design:type",Boolean)],br.prototype,"isDashboardEditing",void 0),G([V(),F("design:type",Boolean)],br.prototype,"isSaving",void 0),G([V(),F("design:type",Number)],br.prototype,"characterCount",void 0),G([V(),F("design:type",Boolean)],br.prototype,"hasUnsavedChanges",void 0),G([V(),F("design:type",typeof Array==="undefined"?Object:Array)],br.prototype,"checklistBlocks",void 0),G([Bi(".content-area.editor"),F("design:type",typeof HTMLElement==="undefined"?Object:HTMLElement)],br.prototype,"editorElement",void 0),br=G([Mo("widget-notepad")],br);u();Y();class Qi extends HTMLElement{cpuBar=null;ramBar=null;tempBar=null;cpuText=null;ramText=null;tempText=null;_unsubscribe;_unsubscribeI18n;_itemId=0;_interval=1000;lastUpdate=0;static get observedAttributes(){return["item-id","content"]}attributeChangedCallback(o,r,i){if(o==="item-id")this._itemId=parseInt(i);if(o==="content")try{let t=typeof i==="string"?JSON.parse(i):i;if(t&&t.interval)this._interval=parseInt(t.interval)}catch(t){}}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:"open"});if(!this.cpuBar)this.render();if(this._unsubscribe)return;if(this._unsubscribe=x.subscribe((o)=>{if(this._itemId){let i=(Array.isArray(o.items)?o.items:[]).find((t)=>t.id===this._itemId);if(i&&i.content)try{let t=typeof i.content==="string"?JSON.parse(i.content):i.content;if(t.interval&&t.interval!==this._interval)this._interval=parseInt(t.interval)}catch(t){}}if(o.stats)this.update(o.stats)}),!this._unsubscribeI18n)this._unsubscribeI18n=s.subscribe(()=>{this.render();let o=x.getState();if(o.stats)this.update(o.stats)})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n()}lastKnownStats={cpu_usage:0,ram_usage:0,temperature:0};update(o){if(!this.shadowRoot)return;let r=Date.now(),i=100;if(r-this.lastUpdate<this._interval-i)return;if(this.lastUpdate=r,typeof o.cpu_usage==="number")this.lastKnownStats.cpu_usage=o.cpu_usage;if(typeof o.ram_usage==="number")this.lastKnownStats.ram_usage=o.ram_usage;if(typeof o.temperature==="number")this.lastKnownStats.temperature=o.temperature;let t=typeof o.cpu_usage==="number"?o.cpu_usage:this.lastKnownStats.cpu_usage,a=typeof o.ram_usage==="number"?o.ram_usage:this.lastKnownStats.ram_usage,n=typeof o.temperature==="number"?o.temperature:this.lastKnownStats.temperature;requestAnimationFrame(()=>{let d=Math.min(100,Math.max(0,Math.round(t)));if(this.cpuBar)this.cpuBar.style.strokeDasharray=`${d}, 100`;if(this.cpuText)this.cpuText.textContent=`${d}%`;let c=Math.min(100,Math.max(0,Math.round(a)));if(this.ramBar)this.ramBar.style.strokeDasharray=`${c}, 100`;if(this.ramText)this.ramText.textContent=`${c}%`;let p=Math.round(n),g=Math.min(100,Math.max(0,p));if(this.tempBar)this.tempBar.style.strokeDasharray=`${g}, 100`;if(this.tempText)this.tempText.textContent=`${p}°C`})}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
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
                <div class="sub">${s.t("widget.telemetry.cpu")}</div>
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
                <div class="sub">${s.t("widget.telemetry.ram")}</div>
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
                <div class="sub">${s.t("widget.telemetry.temp")}</div>
            </div>
        `,this.cpuBar=this.shadowRoot.querySelector(".cpu-bar"),this.ramBar=this.shadowRoot.querySelector(".ram-bar"),this.tempBar=this.shadowRoot.querySelector(".temp-bar"),this.cpuText=this.shadowRoot.querySelector(".cpu-text"),this.ramText=this.shadowRoot.querySelector(".ram-text"),this.tempText=this.shadowRoot.querySelector(".temp-text")}}customElements.define("widget-telemetry",Qi);var Zi=`:host {
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

/* SEARCH OVERRIDE (Desktop only): Auto-flow grid for search results */
:host(.search-active) .bookmark-grid__card {
    grid-column: auto / span 1 !important;
    grid-row: auto / span 1 !important;
    aspect-ratio: 1 / 1 !important;
    width: 100% !important;
    height: auto !important;
}

.bookmark-grid__card:hover {
    border-color: var(--border-bright);
    background: var(--surface-solid);
    /* Removed card lift, moved to icon */
}

/* Status Indicator - Responsive Position & Size */
.status-indicator {
    position: absolute;
    /* Position scales with card width, but never too close to edge */
    top: clamp(6px, 6cqi, 12px);
    right: clamp(6px, 6cqi, 12px);

    /* Size scales with card width */
    width: clamp(8px, 9cqi, 14px);
    height: clamp(8px, 9cqi, 14px);

    border-radius: 50%;
    background-color: var(--text-dim);
    /* Border scales slightly for visual weight */
    border: clamp(1px, 1.2cqi, 2px) solid var(--panel);

    /* Light effect shadow scales slightly */
    box-shadow: 0 0 clamp(2px, 2cqi, 6px) rgba(0, 0, 0, 0.5);
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
}`;class Ai extends HTMLElement{bookmarks=[];allItems=[];isEditing=!1;searchQuery="";_unsubscribe;_unsubscribeI18n;_resizeObserver;_resizeDebounce=null;dragTargetId=null;ghostEl=null;dragOffsetX=0;dragOffsetY=0;isResizing=!1;resizeTargetId=null;initialResizeX=0;initialResizeY=0;initialResizeW=0;initialResizeH=0;currentColWidth=0;currentGridCols=12;isTouchDevice=!1;constructor(){super();this.attachShadow({mode:"open"});let o=()=>{let r=window.innerWidth<768||window.matchMedia("(pointer: coarse)").matches;if(this.isTouchDevice!==r){if(this.isTouchDevice=r,r)this.classList.add("touch-mode");else this.classList.remove("touch-mode");this.applyFilters(),this.render()}};window.addEventListener("resize",o),window.addEventListener("orientationchange",o),o()}_widgetModal;_boundActionClick=this.handleActionClick.bind(this);_boundMouseMove=this.handleWindowMouseMove.bind(this);_boundMouseUp=this.handleWindowMouseUp.bind(this);applyFilters(){let o=this.isTouchDevice,r=!!this.searchQuery;if(r&&!o)this.classList.add("search-active");else this.classList.remove("search-active");if(o||r)this.bookmarks=this.allItems.filter((i)=>{let t=i.content;if(typeof i.content==="string")try{t=JSON.parse(i.content)}catch{return console.warn("[BookmarkGrid] Skipping item with invalid content:",i.id),!1}if(o&&i.type!=="bookmark")return!1;if(o&&t.visibleTouch===!1)return!1;if(r)return(t.label||"").toLowerCase().includes(this.searchQuery);return!0});else this.bookmarks=this.allItems}connectedCallback(){this.applyFilters(),this.render(),this.updateGridMetrics(),this._resizeObserver=new ResizeObserver(()=>{if(this._resizeDebounce)return;this._resizeDebounce=setTimeout(()=>{this._resizeDebounce=null,this.updateGridMetrics();let o=this.getBoundingClientRect();x.setGridMetrics(o.width,this.currentGridCols),this.applyFilters(),this.render()},16)}),this._resizeObserver.observe(this),this._unsubscribe=x.subscribe((o)=>{let r=!1;if(this.isEditing!==o.isEditing)this.isEditing=o.isEditing,r=!0;if(this.searchQuery!==o.searchQuery)this.searchQuery=o.searchQuery,r=!0;let i=Array.isArray(o.items)?o.items:[];if(JSON.stringify(this.allItems)!==JSON.stringify(i)||r)this.allItems=i,this.applyFilters(),r=!0;if(r)this.render()}),this.setupDragListeners(),this.setupResizeListeners(),this.setupActionListeners(),yo.start(),this._unsubscribeI18n=s.subscribe(()=>this.render()),Promise.resolve().then(() => (po(),To)).then(({userStore:o})=>{this._unsubscribeUser=o.subscribe(()=>{requestAnimationFrame(()=>{this.updateGridMetrics(),this.render()})})})}_unsubscribeUser=null;setupActionListeners(){let o=this.shadowRoot;o.removeEventListener("click",this._boundActionClick),o.addEventListener("click",this._boundActionClick)}async handleActionClick(o){if(!this.isEditing)return;let r=o.target;if(!r)return;let i=r.closest(".btn-delete"),t=r.closest(".btn-edit");if(i||t)o.preventDefault(),o.stopPropagation();else if(r.closest("a"))o.preventDefault();if(i){let a=i.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!a)return;let n=parseInt(a.dataset.id||"0"),d=this.allItems.find((l)=>l.id===n);if(!d)return;let c=d.type==="section"?s.t("type.section"):d.type==="widget"?s.t("type.widget"):s.t("type.bookmark"),{eventBus:p,EVENTS:g}=await Promise.resolve().then(() => (Lo(),hr));p.emit(g.SHOW_CONFIRMATION,{title:`${s.t("general.delete")} ${c}`,message:s.t("bookmark.delete_confirm_message"),onConfirm:()=>{x.deleteItem(n)}});return}if(t){let a=t.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!a)return;let n=parseInt(a.dataset.id||"0"),d=this.allItems.find((c)=>c.id===n);if(d){let{eventBus:c,EVENTS:p}=await Promise.resolve().then(() => (Lo(),hr));if(d.type==="widget")c.emit(p.SHOW_WIDGET_CONFIG,{item:d,type:"widget"});else if(d.type==="section")c.emit(p.SHOW_WIDGET_CONFIG,{item:d,type:"section"});else c.emit(p.SHOW_WIDGET_CONFIG,{item:d,type:"bookmark"})}return}}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._unsubscribeUser)this._unsubscribeUser();if(this._resizeObserver)this._resizeObserver.disconnect();if(this._resizeDebounce)clearTimeout(this._resizeDebounce);if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout);window.removeEventListener("mousemove",this._boundMouseMove),window.removeEventListener("mouseup",this._boundMouseUp),yo.stop()}updateGridMetrics(){let o=this.getBoundingClientRect(),r=getComputedStyle(this),i=r.getPropertyValue("--grid-cols").trim(),t=parseInt(i)||12,a=r.columnGap||r.gap||"16px",n=parseFloat(a)||16;if(o.width<=0){this.currentGridCols=t,this.currentColWidth=100,this.style.setProperty("--current-grid-cols",t.toString()),this.style.setProperty("--row-height","100px");return}let d=(t-1)*n,c=(o.width-d)/t;if(c<10)c=10;this.currentGridCols=t,this.currentColWidth=c,this.style.setProperty("--current-grid-cols",String(t)),this.style.setProperty("--row-height",`${c}px`),this.ensureGridBuffer()}ensureGridBuffer(){if(this.isTouchDevice){this.style.minHeight="";return}let o=0;this.bookmarks.forEach((d)=>{let c=(d.y||1)+(d.h||1);if(c>o)o=c});let i=o+1,t=this.currentColWidth||100,a=16,n=i*t+(i-1)*a;this.style.minHeight=`${n}px`}setupResizeListeners(){window.addEventListener("mousemove",this._boundMouseMove),window.addEventListener("mouseup",this._boundMouseUp),this.shadowRoot.addEventListener("mousedown",(o)=>{let r=o;if(!this.isEditing)return;let i=r.target;if(i.classList.contains("resize-handle")){r.preventDefault(),r.stopPropagation();let t=i.closest(".bookmark-grid__card, .bookmark-grid__section");if(!t||!t.dataset.id)return;let a=parseInt(t.dataset.id),n=this.bookmarks.find((h)=>h.id===a);if(!n)return;this.isResizing=!0,this.resizeTargetId=a,this.initialResizeX=r.clientX,this.initialResizeY=r.clientY,this.initialResizeW=n.w,this.initialResizeH=n.h;let d=this,c=d.getBoundingClientRect(),g=getComputedStyle(d).getPropertyValue("--current-grid-cols").trim(),l=g?parseInt(g,10):9,b=isNaN(l)?9:l,e=16;this.currentColWidth=(c.width-(b-1)*e)/b,this.updateGhost({x:n.x,y:n.y,w:n.w,h:n.h},!0)}})}_updateGhostTimeout=null;handleWindowMouseMove(o){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)return;this._updateGhostTimeout=setTimeout(()=>{this._updateGhostTimeout=null,this.processResizeMove(o)},16)}processResizeMove(o){if(!this.isResizing||!this.resizeTargetId)return;let r=o.clientX-this.initialResizeX,i=o.clientY-this.initialResizeY,t=Math.round(r/(this.currentColWidth+16)),a=Math.round(i/(this.currentColWidth+16)),n=this.initialResizeW+t,d=this.initialResizeH+a,c=this.bookmarks.find((p)=>p.id===this.resizeTargetId);if(c){let p=this.applyResizeConstraints(n,d,c),g={x:c.x,y:c.y,w:p.w,h:p.h,id:c.id,parent_id:c.parent_id},l=E.calculateDropValidity(g,this.bookmarks,this.currentGridCols);this.updateGhost(g,l.valid)}}applyResizeConstraints(o,r,i){let t=1,a=1;if(i.type==="widget"){let n=i.content;if(typeof i.content==="string")try{n=JSON.parse(i.content)}catch{return{w:Math.max(1,Math.min(12,o)),h:Math.max(1,Math.min(12,r))}}let d=(n.widgetId||"").toLowerCase();if(d==="notepad")t=2,a=2;else if(d==="clock")return{w:2,h:1};else if(d==="telemetry")return{w:2,h:1};let c=Math.max(t,Math.min(12,o)),p=Math.max(a,Math.min(12,r));return{w:c,h:p}}else if(i.type==="section"){let n=Math.max(1,Math.min(12,o)),d=Math.max(1,Math.min(12,r));return{w:n,h:d}}else{let n=Math.max(1,Math.min(2,o)),d=Math.max(1,Math.min(2,r));return{w:n,h:d}}}async handleWindowMouseUp(o){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout),this._updateGhostTimeout=null;let r=o.clientX-this.initialResizeX,i=o.clientY-this.initialResizeY,t=Math.round(r/(this.currentColWidth+16)),a=Math.round(i/(this.currentColWidth+16)),n=this.initialResizeW+t,d=this.initialResizeH+a,c=this.bookmarks.find((b)=>b.id===this.resizeTargetId);if(!c)return;let p=this.applyResizeConstraints(n,d,c);n=p.w,d=p.h;let g={x:c.x,y:c.y,w:n,h:d,id:c.id,parent_id:c.parent_id};if(E.calculateDropValidity(g,this.bookmarks,this.currentGridCols).valid&&(c.w!==n||c.h!==d)){if(c.type==="section"){let b=n*d,e=this.bookmarks.filter((h)=>h.parent_id===c.id);if(e.sort((h,y)=>h.y-y.y||h.x-y.x),e.length>b){let h=e.slice(b),y=[...this.bookmarks],H=h.map((w)=>{let k=E.findFirstAvailableSlot(w.w,w.h,y,this.currentGridCols);return y.push({...w,x:k.x,y:k.y,parent_id:void 0}),{id:w.id,x:k.x,y:k.y,parent_id:void 0}});await Promise.all(H.map((w)=>x.updateItem(w)))}}await x.resizeItem(c.id,n,d)}if(this.isResizing=!1,this.resizeTargetId=null,this.ghostEl)this.ghostEl.style.display="none"}setupDragListeners(){let o=this.shadowRoot,r=this;o.addEventListener("dragstart",(t)=>{let a=t;if(!this.isEditing){a.preventDefault();return}let n=a.target.closest('[draggable="true"]');if(n&&n.dataset.id){this.dragTargetId=parseInt(n.dataset.id),a.dataTransfer.effectAllowed="move",n.style.opacity="0.5";let d=n.getBoundingClientRect();if(this.dragOffsetX=a.clientX-d.left,this.dragOffsetY=a.clientY-d.top,a.dataTransfer)a.dataTransfer.setDragImage(n,this.dragOffsetX,this.dragOffsetY)}}),o.addEventListener("dragend",(t)=>{let a=t.target.closest('[draggable="true"]');if(a)a.style.opacity="1";if(this.dragTargetId=null,this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((d)=>d.classList.remove("drop-target"))});let i=null;r.addEventListener("dragover",(t)=>{let a=t;if(!this.isEditing||!this.dragTargetId)return;if(a.preventDefault(),a.dataTransfer.dropEffect="move",i)return;i=setTimeout(()=>{i=null,this.processDragOver(a,r)},16)}),r.addEventListener("drop",async(t)=>{let a=t;if(i)clearTimeout(i),i=null;await this.handleDrop(a,r)})}processDragOver(o,r){let a=document.querySelector(".main-content");if(a){let z=a.getBoundingClientRect(),vo=o.clientY;if(vo>z.bottom-100)a.scrollBy(0,15);else if(vo<z.top+100)a.scrollBy(0,-15)}let n=r.getBoundingClientRect(),d=this.currentGridCols||12,c=n.width,p=16,g=(c-(d-1)*p)/d,l=this.bookmarks.find((z)=>z.id===this.dragTargetId);if(!l)return;let b=o.clientX-this.dragOffsetX,e=o.clientY-this.dragOffsetY,h=b-n.left,y=e-n.top,H=Math.floor(h/(g+p)),w=Math.floor(y/(g+p)),k=Math.max(1,Math.min(d-l.w+1,H+1)),T=Math.max(1,w+1),O={x:k,y:T,w:l.w,h:l.h,id:l.id,parent_id:l.parent_id},_=E.calculateDropValidity(O,this.bookmarks,d),I=!this.bookmarks.some((z)=>{if(z.id===l.id)return!1;if(z.parent_id!==l.parent_id&&!_.targetGroup)return!1;let vo=z.x||1,kr=z.y||1,at=z.w||1,st=z.h||1;if(_.targetGroup&&z.id===_.targetGroup.id)return!1;return k<vo+at&&k+l.w>vo&&T<kr+st&&T+l.h>kr})&&_.valid;if(this.updateGhost(O,I),this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((z)=>z.classList.remove("drop-target")),_.targetGroup&&I){let z=this.shadowRoot.querySelector(`.bookmark-grid__section[data-id="${_.targetGroup.id}"]`);if(z)z.classList.add("drop-target")}}async handleDrop(o,r){if(!this.isEditing||!this.dragTargetId)return;o.preventDefault();let i=this.bookmarks.find((_)=>_.id===this.dragTargetId);if(!i)return;let t=r.getBoundingClientRect(),a=this.currentGridCols||12,n=t.width,d=16,c=(n-(a-1)*d)/a,p=o.clientX-this.dragOffsetX,g=o.clientY-this.dragOffsetY,l=p-t.left,b=g-t.top,e=Math.floor(l/(c+d)),h=Math.floor(b/(c+d)),y=Math.max(1,Math.min(a-i.w+1,e+1)),H=Math.max(1,h+1),w={x:y,y:H,w:i.w,h:i.h,id:i.id,parent_id:i.parent_id},k=E.calculateDropValidity(w,this.bookmarks,a);if(this.bookmarks.some((_)=>{if(_.id===i.id)return!1;if(_.parent_id!==i.parent_id&&!k.targetGroup)return!1;let eo=_.x||1,I=_.y||1,vr=_.w||1,z=_.h||1;if(k.targetGroup&&_.id===k.targetGroup.id)return!1;return y<eo+vr&&y+i.w>eo&&H<I+z&&H+i.h>I})&&!k.targetGroup){if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".drop-target").forEach((_)=>_.classList.remove("drop-target"));return}if(k.valid){let _={id:i.id,x:k.x,y:k.y};if(k.targetGroup)_.parent_id=k.targetGroup.id,_.x=k.x-k.targetGroup.x+1,_.y=k.y-k.targetGroup.y+1;else _.parent_id=void 0;await x.updateItem(_)}if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((_)=>_.classList.remove("drop-target"))}updateGhost(o,r){if(!this.ghostEl)this.ghostEl=this.shadowRoot.getElementById("ghost-element");if(!this.ghostEl)return;if(this.ghostEl.style.display="block",this.ghostEl.style.setProperty("--ghost-x",String(o.x)),this.ghostEl.style.setProperty("--ghost-y",String(o.y)),this.ghostEl.style.setProperty("--ghost-w",String(o.w)),this.ghostEl.style.setProperty("--ghost-h",String(o.h)),r)this.ghostEl.classList.remove("invalid");else this.ghostEl.classList.add("invalid")}render(){if(this.isEditing)this.classList.add("edit-mode");else this.classList.remove("edit-mode");this.shadowRoot.innerHTML=`
            <style>${Zi}</style>
            ${ri({bookmarks:this.bookmarks,isEditing:this.isEditing,isSearching:!!this.searchQuery,isTouchDevice:this.isTouchDevice,maxCols:this.currentGridCols})}
        `,this.setupActionListeners(),this.ghostEl=this.shadowRoot.getElementById("ghost-element")}}if(!customElements.get("bookmark-grid"))customElements.define("bookmark-grid",Ai);var Mi=()=>`
    <div class="toast-container"></div>
`;var Ui=`.toast-container {
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
}`;class Xi extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",()=>this.shift(!0)),window.addEventListener("drawer-close",()=>this.shift(!1))}shift(o){let r=this.shadowRoot.querySelector(".toast-container");if(r)if(o)r.classList.add("toast-container--shifted");else r.classList.remove("toast-container--shifted")}show(o,r="success"){let i=this.shadowRoot.querySelector(".toast-container");if(!i)return;let t=document.createElement("div");t.className=`toast toast--${r}`,t.textContent=o,i.appendChild(t),requestAnimationFrame(()=>{t.style.opacity="1",t.style.transform="translateY(0)"}),setTimeout(()=>{t.style.opacity="0",t.style.transform="translateY(20px)",setTimeout(()=>t.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${Ui}</style>
            ${Mi()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",Xi);u();var Li=()=>`
    <div class="icon-picker">
        <div class="icon-picker__header">
            <div id="selected-container"></div>
            <div class="icon-picker__search">
                <input type="text"
                       id="icon-search"
                       class="icon-picker__search-input"
                       placeholder="${s.t("general.search")}" />
            </div>
        </div>

        <div id="grid-container" class="icon-picker__grid"></div>
    </div>
`,Ri=(o)=>o?`
    <div class="icon-picker__selected">
        <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${o}.png"
             alt="${o}"
             class="icon-picker__preview" />
    </div>
`:`
    <div class="icon-picker__placeholder">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
    </div>
`,Ni=(o,r,i)=>{if(i)return`<div class="icon-picker__loading">${s.t("general.loading")}</div>`;if(o.length===0)return`<div class="icon-picker__empty">${s.t("general.no_icons")}</div>`;return o.map((t)=>`
        <div class="icon-picker__item ${r===t.name?"icon-picker__item--selected":""}"
             data-icon="${t.name}"
             title="${t.name}">
            <img src="${t.url}" alt="${t.name}" loading="lazy" />
        </div>
    `).join("")};class Ci{icons=[];loaded=!1;loading=!1;BASE_URL="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";FALLBACK_URL="https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main";async loadIcons(){if(this.loaded)return this.icons;if(this.loading)return await new Promise((o)=>setTimeout(o,100)),this.loadIcons();this.loading=!0;try{let o=await fetch(`${this.BASE_URL}/tree.json`);if(!o.ok)console.log("[IconService] CDN failed, trying GitHub raw"),o=await fetch(`${this.FALLBACK_URL}/tree.json`);if(!o.ok)throw Error("Failed to fetch icon list");let r=await o.json(),i=Array.isArray(r)?r:r.png||[];if(Array.isArray(i)&&i.length>0)this.icons=i.filter((t)=>t.endsWith(".png")||t.endsWith(".svg")).map((t)=>{let a=t.replace(/\.(png|svg)$/,"");return{name:a,url:`${this.BASE_URL}/png/${a}.png`}}).sort((t,a)=>t.name.localeCompare(a.name));else console.warn("[IconService] Unexpected tree.json structure, using fallback",r),this.icons=this.getFallbackIcons();return this.loaded=!0,this.loading=!1,console.log(`[IconService] Loaded ${this.icons.length} icons`),this.icons}catch(o){return console.error("[IconService] Failed to load icons:",o),this.loading=!1,this.icons=this.getFallbackIcons(),this.loaded=!0,this.icons}}getFallbackIcons(){return["github","gitlab","docker","proxmox","truenas","plex","jellyfin","nextcloud","cloudflare","nginx","traefik","portainer","grafana","prometheus","influxdb","pihole","adguard","homeassistant","esphome","frigate","unraid","synology","opnsense","pfsense","wireguard","openvpn","bitwarden","vaultwarden","sonarr","radarr","lidarr","bazarr","prowlarr","overseerr","tautulli","transmission","qbittorrent","deluge","sabnzbd","nzbget","calibre","paperless","photoprism","immich","mealie","freshrss","miniflux","wallabag","linkding","shiori","firefox","chrome","vscode","code-server","jupyter","portainer"].map((r)=>({name:r,url:`${this.BASE_URL}/png/${r}.png`}))}searchIcons(o,r=50){if(!o.trim())return this.icons.slice(0,r);let i=o.toLowerCase().trim();return this.icons.filter((t)=>t.name.toLowerCase().includes(i)).slice(0,r)}getIconUrl(o){return`${this.BASE_URL}/png/${o}.png`}}var fr=new Ci;var Wi=`:host {
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
}`;class Vi extends HTMLElement{icons=[];filteredIcons=[];selectedIcon="";searchQuery="";isLoading=!0;debounceTimer=null;inputElement=null;id_debug=Math.random().toString(36).substr(2,5);constructor(){super();this.attachShadow({mode:"open"})}async connectedCallback(){if(this.shadowRoot.childElementCount>0)return;if(this.renderBase(),this.setupListeners(),this.icons.length===0)await this.loadIcons()}async loadIcons(){try{this.icons=await fr.loadIcons(),this.filteredIcons=this.icons.slice(0,50),this.isLoading=!1,this.updateGrid()}catch(o){console.error(`[IconPicker:${this.id_debug}] Failed to load icons`,o),this.isLoading=!1,this.updateGrid()}}setupListeners(){let o=this.shadowRoot;this.inputElement=o.getElementById("icon-search"),this.inputElement?.addEventListener("input",(i)=>{let t=i.target;if(this.searchQuery=t.value,this.debounceTimer)window.clearTimeout(this.debounceTimer);this.debounceTimer=window.setTimeout(()=>{this.performSearch()},100)}),o.getElementById("grid-container")?.addEventListener("click",(i)=>{let a=i.target.closest(".icon-picker__item");if(a&&a.dataset.icon)this.selectedIcon=a.dataset.icon,this.updateSelected(),this.updateGrid(),this.dispatchEvent(new CustomEvent("icon-selected",{detail:{iconName:this.selectedIcon},bubbles:!0,composed:!0}))})}performSearch(){this.filteredIcons=fr.searchIcons(this.searchQuery,50),this.updateGrid()}getSelectedIcon(){return this.selectedIcon}setSelectedIcon(o){this.selectedIcon=o,this.updateSelected(),this.updateGrid()}renderBase(){this.shadowRoot.innerHTML=`
            <style>${Wi}</style>
            ${Li()}
        `}updateGrid(){let o=this.shadowRoot.getElementById("grid-container");if(o){if(!this.searchQuery.trim()&&!this.isLoading){o.style.display="none",o.innerHTML="";return}o.style.display="grid",o.innerHTML=Ni(this.filteredIcons,this.selectedIcon,this.isLoading)}}updateSelected(){let o=this.shadowRoot.getElementById("selected-container");if(o)o.innerHTML=Ri(this.selectedIcon)}}if(!customElements.get("icon-picker"))customElements.define("icon-picker",Vi);u();var Ti=({isOpen:o,isEditMode:r})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h2 class="modal-title">${r?s.t("bookmark.edit"):s.t("bookmark.add")}</h2>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <form class="modal-form" id="bookmark-form">
            <div class="form-group">
                <label for="bookmark-label">${s.t("bookmark.label")}</label>
                <input type="text" id="bookmark-label" name="label" placeholder="${s.t("bookmark.placeholder_label")}" required />
            </div>
            <div class="form-group">
                <label for="bookmark-url">${s.t("bookmark.url")}</label>
                <input type="url" id="bookmark-url" name="url" placeholder="${s.t("bookmark.placeholder_url")}" required />
            </div>
            <div class="form-group">
                <label>${s.t("bookmark.icon")}</label>
                <div id="icon-picker-container"></div>
            </div>

            <!-- Status Check & Touch Visibility on same row -->
            <div class="visibility-row">
                <div class="checkbox-group">
                    <label for="bookmark-status">${s.t("bookmark.monitor_status")}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-status" name="statusCheck" />
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="checkbox-group">
                    <label for="bookmark-touch">${s.t("bookmark.visible_touch")}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-touch" name="visibleTouch" checked />
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="form-actions">
                <app-button type="submit" variant="primary" class="btn-submit">${s.t("general.save")}</app-button>
            </div>
        </form>
    </dialog>
`;Y();u();var Oi=`:host {
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
}`;class Di extends HTMLElement{dialog=null;iconPicker=null;selectedIconName="";clickHandler=null;submitHandler=null;escapeHandler=null;_unsubscribeI18n;isEditMode=!1;currentItemId=null;constructor(){super();this.attachShadow({mode:"open"}),this.setupHandlers()}setupHandlers(){this.clickHandler=(o)=>{if(o.target.closest("#modal-close")){o.preventDefault(),o.stopPropagation(),this.close();return}if(o.target===this.dialog){this.close();return}},this.submitHandler=async(o)=>{o.preventDefault(),o.stopPropagation();let r=o.target,i=new FormData(r),t=i.get("label"),a=i.get("url"),n=i.get("statusCheck")==="on",d=i.get("visibleTouch")==="on",c=this.iconPicker?this.iconPicker.getSelectedIcon():"",p=c?`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${c}.png`:"";try{let g=JSON.stringify({label:t,url:a,icon:p,iconName:c,statusCheck:n,visibleTouch:d});if(this.isEditMode&&this.currentItemId){if(await x.updateItem({id:this.currentItemId,content:g}),window.notifier)window.notifier.show(s.t("notifier.bookmark_updated"))}else{let l=x.getState(),b=Array.isArray(l.items)?l.items:[],{collisionService:e}=await Promise.resolve().then(() => (oo(),lo)),h=e.findFirstAvailableSlot(1,1,b);if(await x.addItem({type:"bookmark",x:h.x,y:h.y,w:1,h:1,content:g}),window.notifier)window.notifier.show(s.t("notifier.bookmark_added"))}this.close()}catch(g){if(console.error("[Modal] Error:",g),window.notifier)window.notifier.show(s.t("notifier.bookmark_error"),"error")}},this.escapeHandler=(o)=>{if(o.key==="Escape"&&this.dialog?.open)this.close()}}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeI18n=s.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n();let o=this.shadowRoot;if(this.clickHandler)o.removeEventListener("click",this.clickHandler);if(this.submitHandler)o.removeEventListener("submit",this.submitHandler);if(this.escapeHandler)document.removeEventListener("keydown",this.escapeHandler)}setupListeners(){let o=this.shadowRoot;o.addEventListener("click",this.clickHandler),o.addEventListener("submit",this.submitHandler),document.addEventListener("keydown",this.escapeHandler)}open(){this.isEditMode=!1,this.currentItemId=null,this.selectedIconName="",this.render(),this.dialog?.showModal(),requestAnimationFrame(()=>{this.resetForm(),this.initializeIconPicker()})}openForEdit(o){this.isEditMode=!0,this.currentItemId=o.id;let r=o.content;if(typeof r==="string")try{r=JSON.parse(r)}catch(i){console.error("Failed to parse item content",i)}this.selectedIconName=r.iconName||"",this.render(),this.dialog?.showModal(),this.initializeIconPicker(),setTimeout(()=>{let i=this.shadowRoot.getElementById("bookmark-form");if(i){let t=i.elements.namedItem("label"),a=i.elements.namedItem("url"),n=i.elements.namedItem("statusCheck"),d=i.elements.namedItem("visibleTouch");if(t)t.value=r.label||"";if(a)a.value=r.url||"";if(n)n.checked=!!r.statusCheck;if(d)d.checked=r.visibleTouch!==!1}if(this.iconPicker)this.iconPicker.setSelectedIcon(this.selectedIconName)},100)}close(){this.dialog?.close(),this.selectedIconName="",this.resetForm()}resetForm(){setTimeout(()=>{let o=this.shadowRoot.getElementById("bookmark-form");if(o)o.reset();if(this.iconPicker)this.iconPicker.setSelectedIcon("")},100)}initializeIconPicker(){requestAnimationFrame(()=>{let o=this.shadowRoot.getElementById("icon-picker-container");if(!o){console.error("[Modal] Icon picker container not found");return}if(!this.iconPicker)this.iconPicker=document.createElement("icon-picker"),this.iconPicker.addEventListener("icon-selected",(r)=>{this.selectedIconName=r.detail.iconName});o.innerHTML="",o.appendChild(this.iconPicker)})}render(){this.shadowRoot.innerHTML=`
            <style>${Oi}</style>
            ${Ti({isOpen:!0,isEditMode:this.isEditMode})}
        `,this.dialog=this.shadowRoot.getElementById("modal"),this.setupListeners()}}if(!customElements.get("add-bookmark-modal"))customElements.define("add-bookmark-modal",Di);u();var _r=[{id:"clock",name:"Clock",icon:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',description:"Digital clock with date",defaultW:2,defaultH:1,componentTag:"widget-clock"},{id:"notepad",name:"Notepad",icon:'<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',description:"Simple sticky note",defaultW:2,defaultH:2,componentTag:"widget-notepad"},{id:"telemetry",name:"System Status",icon:'<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>',description:"CPU, RAM and Temp",defaultW:2,defaultH:1,componentTag:"widget-telemetry"}];class Ei extends HTMLElement{dialog=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(){if(this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close()}selectWidget(o){this.dispatchEvent(new CustomEvent("widget-selected",{detail:o,bubbles:!0,composed:!0})),this.close()}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
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
                        <h3>${s.t("widget.add_title")||"Add Widget"}</h3>
                        <p>${s.t("widget.add_subtitle")||"Enhance your dashboard with dynamic components"}</p>
                    </div>
                    <button class="close-btn" onclick="this.getRootNode().host.close()">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div class="grid">
                    ${_r.map((o)=>`
                        <div class="card" data-id="${o.id}">
                            <div class="icon-container">${o.icon}</div>
                            <div class="name">${s.t(`widget.${o.id}.name`)||o.name}</div>
                            <div class="desc">${s.t(`widget.${o.id}.description`)||o.description}</div>
                        </div>
                    `).join("")}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog"),this.shadowRoot.querySelectorAll(".card").forEach((o)=>{o.addEventListener("click",()=>{let r=o.getAttribute("data-id"),i=_r.find((t)=>t.id===r);if(i)this.selectWidget(i)})})}}customElements.define("add-widget-modal",Ei);Y();u();var Pi=`:host {
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
}`;var er=new Map;async function ta(o,r){try{let i=await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${o}&longitude=${r}`);if(!i.ok)throw Error("TimeAPI failed");return(await i.json()).timeZone||"local"}catch(i){return console.error("[Timezone] TimeAPI error:",i),"local"}}async function aa(o){if(!o||o.trim()==="")return"local";let r=o.toLowerCase().trim();if(er.has(r))return er.get(r);try{let i=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(o)}&limit=1`,t=await fetch(i,{headers:{"User-Agent":"Lastboard/1.0"}});if(!t.ok)throw Error("Geocoding failed");let a=await t.json();if(a.length===0)return"local";let{lat:n,lon:d}=a[0],c=await ta(parseFloat(n),parseFloat(d));return er.set(r,c),c}catch(i){return console.error("[Timezone] Error resolving city:",o,i),"local"}}class Ii extends HTMLElement{dialog=null;currentItem=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(o){if(this.currentItem=o,this.render(),this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close();this.currentItem=null}async save(){if(!this.currentItem)return;let o=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,r=o.widgetId,i={...o};if(r==="clock"){let t=this.shadowRoot?.getElementById("clock-city"),a=this.shadowRoot?.getElementById("clock-12h"),n=this.shadowRoot?.getElementById("clock-date"),d=this.shadowRoot?.getElementById("save-btn"),c=t?.value||"";if(d)d.disabled=!0,d.textContent=s.t("general.loading");let p=await aa(c);if(i.city=c,i.timezone=p,i.hour12=a?.checked||!1,i.showDate=n?.checked||!1,d)d.disabled=!1,d.textContent=s.t("general.save")}else if(r==="telemetry"){let t=this.shadowRoot?.getElementById("telemetry-interval");i.interval=t?parseInt(t.value):1000}if(this.currentItem.type==="section"){let t=this.shadowRoot?.getElementById("section-title");i.title=t?t.value:"",delete i.name}await x.updateItem({id:this.currentItem.id,content:JSON.stringify(i)}),this.close()}render(){if(!this.shadowRoot)return;let o={},r="";if(this.currentItem)o=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,r=o.widgetId;let i=(d)=>String(d).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),t=()=>{if(!this.currentItem)return"";if(r==="clock"){let d=o.city||"",c=o.hour12||!1,p=o.showDate!==!1;return`
                    <div class="field-group">
                        <label>${s.t("widget.clock.city")}</label>
                        <input type="text" id="clock-city" value="${i(d)}" placeholder="${s.t("widget.clock.city_placeholder")}"/>
                        <small>${s.t("widget.clock.city_desc")}</small>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${c?"checked":""} />
                        <label for="clock-12h">${s.t("widget.clock.use_12h")}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${p?"checked":""} />
                        <label for="clock-date">${s.t("widget.clock.show_date")}</label>
                    </div>
                `}else if(r==="telemetry"){let d=o.interval||1000;return`
                    <div class="field-group row-aligned">
                        <label>${s.t("widget.telemetry.update_interval")}</label>
                        <app-select id="telemetry-interval" value="${d}"></app-select>
                    </div>
                `}else if(this.currentItem.type==="section"){let d=o.title||"";return`
                    <div class="field-group">
                        <label>${s.t("bookmark.label")}</label>
                        <div class="input-row">
                            <input type="text" id="section-title" value="${i(d)}" placeholder="${s.t("section.placeholder_title")}" />
                        </div>
                        <small>${s.t("section.leave_empty")}</small>
                    </div>
                `}return`<p>${s.t("widget.config.no_config")}</p>`},a=()=>{if(this.currentItem?.type==="section")return s.t("section.edit_title");return s.t("widget.config.title")};this.shadowRoot.innerHTML=`
            <style>${Pi}</style>
            <dialog id="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${a()}</h3>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="content">
                    ${t()}
                </div>
                <div class="actions">
                    ${["clock","telemetry"].includes(r)||this.currentItem?.type==="section"?`<app-button variant="primary" id="save-btn">${s.t("general.save")}</app-button>`:""}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog");let n=this.shadowRoot.getElementById("telemetry-interval");if(n)n.options=[{value:"1000",label:"1s"},{value:"2000",label:"2s"},{value:"5000",label:"5s"},{value:"10000",label:"10s"}];this.shadowRoot.getElementById("close-btn")?.addEventListener("click",()=>this.close()),this.shadowRoot.getElementById("save-btn")?.addEventListener("click",()=>this.save())}}customElements.define("widget-config-modal",Ii);u();var Si=({isOpen:o,title:r,message:i})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h3 class="modal-title">${r}</h3>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="modal-message">${i}</p>
        <div class="modal-actions">
            <app-button variant="danger" id="btn-confirm">${s.t("general.confirm")}</app-button>
        </div>
    </dialog>
`;u();var ot=`:host {
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
}`;class rt extends HTMLElement{dialog=null;titleText="Confirm Action";messageText="Are you sure?";resolvePromise=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this._unsubscribeI18n=s.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n()}setupDynamicListeners(){let o=this.shadowRoot.getElementById("modal-close"),r=this.shadowRoot.getElementById("btn-confirm");this.dialog=this.shadowRoot.getElementById("modal");let i=(t)=>{if(this.resolvePromise)this.resolvePromise(t),this.resolvePromise=null;this.dialog?.close()};if(o)o.onclick=()=>i(!1);if(r)r.onclick=()=>i(!0);if(this.dialog)this.dialog.onclick=(t)=>{if(t.target===this.dialog)i(!1)}}async confirm(o,r){return this.titleText=o,this.messageText=r,this.render(),this.dialog?.showModal(),new Promise((i)=>{this.resolvePromise=i})}render(){this.shadowRoot.innerHTML=`
            <style>${ot}</style>
            ${Si({isOpen:!0,title:this.titleText,message:this.messageText})}
        `,this.setupDynamicListeners()}}if(!customElements.get("confirmation-modal"))customElements.define("confirmation-modal",rt);u();async function it(o){try{await s.ensureInitialized(),await o()}catch(r){console.error("[Bootstrap] Critical failure:",r),document.body.innerHTML=`
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
        `}}Lo();var K=document.getElementById("main-topbar"),tt=document.getElementById("right-drawer"),Ro=document.getElementById("dashboard-root"),_o,No,Co;it(async()=>{L.init(),await m.fetchUser();let o=m.getUser();if(o){if(o.language)await s.setLanguage(o.language);if(o.preferences&&o.preferences.grid_columns)document.documentElement.style.setProperty("--user-preferred-columns",o.preferences.grid_columns.toString());if(o.theme==="dark")L.enableDark();else if(o.theme==="light")L.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)L.enableDark();else L.enableLight();if(o.id)x.setUserId(o.id)}if(K){if(K.setState({user:o}),o&&o.project_name)K.setAttribute("title",o.project_name);m.subscribe((i)=>{if(i){if(K.setState({user:i}),i.project_name)K.setAttribute("title",i.project_name)}})}await x.fetchItems(),na(),yo.start(),_o=document.createElement("add-bookmark-modal"),document.body.appendChild(_o),No=document.createElement("add-widget-modal"),document.body.appendChild(No),Co=document.createElement("confirmation-modal"),document.body.appendChild(Co);let r=document.createElement("widget-config-modal");document.body.appendChild(r)});fo.on(ho.SHOW_CONFIRMATION,async(o)=>{let{title:r,message:i,onConfirm:t}=o.detail;if(Co){if(await Co.confirm(r,i)&&t)t()}});fo.on(ho.SHOW_WIDGET_CONFIG,(o)=>{let{item:r,type:i}=o.detail;if(i==="bookmark"){if(_o)_o.openForEdit(r)}else{let t=document.querySelector("widget-config-modal");if(t)t.open(r)}});fo.on(ho.NOTIFY,(o)=>{let r=document.querySelector("app-notifier");if(r)r.show(o.detail.message,o.detail.type)});if(K)K.addEventListener("drawer-toggle",(o)=>{if(o.detail.action==="open")tt.open(),K.setState({drawerOpen:!0});else tt.close(),K.setState({drawerOpen:!1})}),K.addEventListener("edit-mode-change",(o)=>{let r=o.detail.active;if(Ro.classList.toggle("edit-mode",r),!r)window.location.reload()}),K.addEventListener("search-input",(o)=>{let r=o.detail.query;x.setSearchQuery(r)}),K.addEventListener("add-item",async(o)=>{let r=o.detail.action;if(r==="add-bookmark"){if(_o)_o.open()}else if(r==="add-widget"){if(No)No.open()}else if(r==="add-section"){let t=x.getState().items||[],{collisionService:a}=await Promise.resolve().then(() => (oo(),lo)),n=a.findFirstAvailableSlot(1,1,t),d={type:"section",x:n.x,y:n.y,w:1,h:1,content:JSON.stringify({title:""})},c=await x.addItem(d);if(c)fo.emit(ho.SHOW_WIDGET_CONFIG,{item:c,type:"section"})}});window.addEventListener("widget-selected",async(o)=>{let i=o.detail,a=x.getState().items||[],{collisionService:n}=await Promise.resolve().then(() => (oo(),lo)),d=n.findFirstAvailableSlot(i.defaultW,i.defaultH,a),c={type:"widget",x:d.x,y:d.y,w:i.defaultW,h:i.defaultH,content:JSON.stringify({widgetId:i.id,text:i.id==="notepad"?"":void 0})};await x.addItem(c)});window.addEventListener("drawer-close",()=>{if(K)K.setState({drawerOpen:!1})});window.addEventListener("click",(o)=>{let r=o.target,i=document.getElementById("add-menu"),t=document.getElementById("add-toggle");if(i&&i.classList.contains("active")&&!i.contains(r)&&t&&!t.contains(r))i.classList.remove("active")});function na(){if(!Ro)return;Ro.innerHTML="";let o=document.createElement("bookmark-grid");Ro.appendChild(o)}
