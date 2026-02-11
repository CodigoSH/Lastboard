var Zo=Object.defineProperty;var U=(t,o)=>{for(var r in o)Zo(t,r,{get:o[r],enumerable:!0,configurable:!0,set:(i)=>o[r]=()=>i})};var M=(t,o)=>()=>(t&&(o=t(t=0)),o);class mt{baseUrl;constructor(){this.baseUrl=window.LASTBOARD_CONFIG?.API_BASE_URL||""}getCsrfToken(){let t=document.cookie.split("; ").find((o)=>o.startsWith("csrf_token="));return t?decodeURIComponent(t.split("=")[1]):""}async request(t,o){let r=`${this.baseUrl}${t}`,i=(o.method||"GET").toUpperCase(),n={"Content-Type":"application/json","Cache-Control":"no-cache, no-store, must-revalidate",Pragma:"no-cache",Expires:"0",...o.headers};if(i==="POST"||i==="PUT"||i==="PATCH"||i==="DELETE"){let e=this.getCsrfToken();if(e)n["X-CSRF-Token"]=e}try{let e=await fetch(r,{...o,headers:n,cache:"no-store"});if(!e.ok){let d=await e.json().catch(()=>({}));throw Error(d.error||`HTTP ${e.status}: ${e.statusText}`)}let s=await e.text();return s?JSON.parse(s):{}}catch(e){throw console.error(`[ApiService] Request failed: ${r}`,e),e}}async get(t){return this.request(t,{method:"GET"})}async post(t,o){return this.request(t,{method:"POST",body:JSON.stringify(o)})}async patch(t,o){return this.request(t,{method:"PATCH",body:JSON.stringify(o)})}async put(t,o){return this.request(t,{method:"PUT",body:JSON.stringify(o)})}async delete(t){return this.request(t,{method:"DELETE"})}}var $;var at=M(()=>{$=new mt});var H;var nt=M(()=>{at();H={async getCurrentUser(){return $.get("/api/me")},async updateProfile(t){return $.post("/api/user/update-profile",t)},async updatePreferences(t){return $.post("/api/user/preferences",t)},async changePassword(t){return $.post("/api/user/change-password",t)},async getUsers(){return $.get("/api/users")},async createUser(t){return $.post("/api/users",t)},async adminUpdateUser(t){return $.put("/api/users",t)},async deleteUser(t){return $.delete(`/api/users?id=${t}`)}}});var Z;var yt=M(()=>{Z=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}]});class Y{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let t=localStorage.getItem("lastboard_lang"),o=navigator.language.split("-")[0],r="en";if(t&&Z.find((i)=>i.code===t))r=t;else if(Z.find((i)=>i.code===o))r=o;if(r!=="en")await this.loadLocale(r);this.currentLanguage=r,this.notifyListeners()}static getInstance(){if(!Y.instance)Y.instance=new Y;return Y.instance}getLocale(){return{...Z.find((o)=>o.code===this.currentLanguage)||Z[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let t=(r)=>/^[a-zA-Z]/.test(r);return[...Z].sort((r,i)=>{let n=t(r.name),e=t(i.name);if(n&&!e)return-1;if(!n&&e)return 1;return r.name.localeCompare(i.name,void 0,{sensitivity:"base"})})}async loadLocale(t){if(this.cache.has(t))return;try{let o=await fetch(`/locales/${t}.json?v=${new Date().getTime()}`);if(!o.ok)throw Error(`Failed to load locale ${t}`);let r=await o.json();this.cache.set(t,r)}catch(o){console.error(o)}}async setLanguage(t){if(Z.find((o)=>o.code===t))await this.loadLocale(t),this.currentLanguage=t,localStorage.setItem("lastboard_lang",t),this.notifyListeners();else console.warn(`[I18n] Language ${t} not supported`)}t(t,o){let r=this.cache.get(this.currentLanguage),i=this.cache.get("en"),n=r?.[t];if(!n&&i)n=i[t];if(!n)return t;if(o)Object.keys(o).forEach((e)=>{n=n.replace(`{${e}}`,o[e])});return n}subscribe(t){return this.listeners.push(t),t(this.getLocale()),()=>{this.listeners=this.listeners.filter((o)=>o!==t)}}notifyListeners(){let t=this.getLocale();this.listeners.forEach((o)=>o(t))}async ensureInitialized(){return this.initialized}}var a;var y=M(()=>{yt();a=Y.getInstance()});var S={};U(S,{userStore:()=>w});class kt{user=null;listeners=[];constructor(){this.loadFromStorage()}loadFromStorage(){let t=localStorage.getItem("lastboard_user_cache");if(t)try{this.user=JSON.parse(t),this.applyAesthetics(),this.notify()}catch(o){console.error("Failed to parse user cache",o)}}saveToStorage(){if(this.user)localStorage.setItem("lastboard_user_cache",JSON.stringify(this.user))}subscribe(t){if(this.listeners.push(t),this.user)t(this.user);return()=>{this.listeners=this.listeners.filter((o)=>o!==t)}}notify(){this.listeners.forEach((t)=>t(this.user)),this.saveToStorage()}setUser(t){if(!t)return;this.user={...t,preferences:{accent_color:t.accent_color||"blue",language:t.language||"en",theme:t.theme,grid_columns:t.grid_columns||12,project_name:t.project_name||"Lastboard",beta_updates:t.beta_updates},project_name:t.project_name||"Lastboard"},this.applyAesthetics(),this.notify()}applyAesthetics(){if(!this.user||!this.user.preferences)return;let t=this.user.preferences,o=document.documentElement;if(t.grid_columns)o.style.setProperty("--user-preferred-columns",`${t.grid_columns}`);else o.style.setProperty("--user-preferred-columns","12");if(t.accent_color){let r=this.getAccentHex(t.accent_color);o.style.setProperty("--accent",r),localStorage.setItem("lastboard_accent",r)}if(t.theme==="light")o.classList.add("light-theme");else o.classList.remove("light-theme")}getAccentHex(t){if(t.startsWith("#"))return t;return{blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"}[t]||"#0078D4"}async updatePreferences(t){if(!this.user||!this.user.preferences)return;let o={...this.user.preferences};if(this.user.preferences={...this.user.preferences,...t},t.accent_color)this.user.accent_color=t.accent_color;if(t.language)this.user.language=t.language;if(t.project_name)this.user.project_name=t.project_name;if(t.theme)this.user.preferences.theme=t.theme;if(t.grid_columns)this.user.preferences.grid_columns=t.grid_columns;if(t.beta_updates!==void 0)this.user.preferences.beta_updates=t.beta_updates;this.applyAesthetics(),this.notify();try{let r={accent_color:this.user.accent_color,language:this.user.language,theme:this.user.preferences.theme,grid_columns:this.user.preferences.grid_columns,project_name:this.user.project_name,beta_updates:this.user.preferences.beta_updates};if(await H.updatePreferences(r),window.notifier)window.notifier.show(a.t("general.success")||"Preferences saved")}catch(r){if(console.error("[UserStore] Failed to sync preferences, rolling back",r),this.user.preferences=o,this.applyAesthetics(),this.notify(),window.notifier)window.notifier.show(a.t("notifier.save_error"),"error");throw r}}async updateProfile(t){if(!this.user)return;try{if(await H.updateProfile(t),this.user={...this.user,...t},this.notify(),window.notifier)window.notifier.show(a.t("notifier.profile_updated"))}catch(o){if(console.error("[UserStore] Update profile failed",o),window.notifier)window.notifier.show(a.t("notifier.profile_error"),"error")}}async changePassword(t){try{await H.changePassword(t)}catch(o){throw console.error("[UserStore] Change password failed",o),o}}getUser(){return this.user}async fetchUser(){try{let t=await H.getCurrentUser();this.setUser(t)}catch(t){if(console.error("[UserStore] Error fetching user",t),!this.user){if(window.notifier)window.notifier.show(a.t("auth.session_expired"),"error")}}}}var w;var K=M(()=>{nt();y();w=new kt});var q;var et=M(()=>{at();q={async getItems(){return $.get("/api/dashboard")},async updateItem(t){let o={...t};if(t.parent_id===void 0&&"parent_id"in t)o.clear_parent=!0;return $.patch(`/api/dashboard/item/${t.id}`,o)},async createItem(t){return $.post("/api/dashboard/item",t)},async deleteItem(t){return $.delete(`/api/dashboard/item/${t}`)},async checkHealth(t){return $.get(`/api/dashboard/health?url=${encodeURIComponent(t)}`)}}});var wt={};U(wt,{socketService:()=>Ko});class st{socket=null;statsListeners=[];notificationListeners=[];reconnectTimeout;reconnectDelay=1000;static MAX_DELAY=30000;constructor(){this.connect()}connect(){let t=window.location.protocol==="https:"?"wss:":"ws:",o=window.location.host,r=`${t}//${o}/ws`;this.socket=new WebSocket(r),this.socket.onopen=()=>{this.reconnectDelay=1000},this.socket.onmessage=(i)=>{try{let n=JSON.parse(i.data);if(n.type==="stats")this.notifyStats(n.payload);else this.notifyNotification(n.type,n.payload)}catch(n){console.error("[SocketService] Failed to parse message",n)}},this.socket.onclose=()=>{console.warn("[SocketService] WebSocket closed. Reconnecting..."),this.scheduleReconnect()},this.socket.onerror=(i)=>{console.error("[SocketService] WebSocket error",i),this.socket?.close()}}scheduleReconnect(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);let t=Math.random()*this.reconnectDelay*0.5;this.reconnectTimeout=setTimeout(()=>this.connect(),this.reconnectDelay+t),this.reconnectDelay=Math.min(this.reconnectDelay*2,st.MAX_DELAY)}destroy(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);if(this.socket)this.socket.onclose=null,this.socket.close(),this.socket=null}subscribe(t){return this.statsListeners.push(t),()=>{this.statsListeners=this.statsListeners.filter((o)=>o!==t)}}subscribeNotification(t){return this.notificationListeners.push(t),()=>{this.notificationListeners=this.notificationListeners.filter((o)=>o!==t)}}notifyStats(t){this.statsListeners.forEach((o)=>o(t))}notifyNotification(t,o){this.notificationListeners.forEach((r)=>r(t,o))}}var Ko;var zt=M(()=>{Ko=new st});var dt={};U(dt,{updateService:()=>Bo});class $t{version="";compareVersions(t,o){let r=t.replace(/^v/,""),i=o.replace(/^v/,""),n=r.split("-"),e=i.split("-"),s=n[0].split(".").map(Number),d=e[0].split(".").map(Number);for(let l=0;l<3;l++){if(s[l]>d[l])return!0;if(s[l]<d[l])return!1}if(!n[1]&&e[1])return!0;if(n[1]&&!e[1])return!1;if(!n[1]&&!e[1])return!1;let p=n[1].toLowerCase(),c=e[1].toLowerCase();return p>c}async check(t){try{let o=await fetch("/api/system/update/check"),r={current_version:"v0.0.0",is_docker:!1,available:!1,os:"linux",arch:"amd64"};if(o.ok)r=await o.json(),this.version=r.current_version;if(r.is_docker)return{available:!1,current_version:this.version,latest_version:this.version,is_docker:!0};try{let i=`https://api-updates.codigosh.com/api/v1/check-update?beta=${t}`,n=await fetch(i);if(n.ok){let e=await n.json();if(this.compareVersions(e.latest_version,this.version)){let d=r.os||"linux",p=r.arch||"amd64",c=`lastboard-${d}-${p}.tar.gz`;return{available:!0,current_version:this.version,latest_version:e.latest_version,asset_url:`https://github.com/CodigoSH/Lastboard/releases/download/${e.latest_version}/${c}`,is_docker:!1}}}}catch(i){console.error("[UpdateService] Proxy check failed",i)}return{available:!1,current_version:this.version,latest_version:this.version,is_docker:!1}}catch(o){return console.error("[UpdateService] Failed to check for updates",o),{available:!1,current_version:this.version||"v0.0.0",latest_version:"v0.0.0",is_docker:!1}}}}var Bo;var pt=M(()=>{Bo=new $t});var N={};U(N,{collisionService:()=>F});var F;var B=M(()=>{F={isOverlap(t,o){return t.x<o.x+o.w&&t.x+t.w>o.x&&t.y<o.y+o.h&&t.y+t.h>o.y},calculateDropValidity(t,o,r=12){let i=Number(t.x),n=Number(t.y),e=Number(t.w),s=Number(t.h);if(i<1||i+e-1>r||n<1)return{valid:!1,x:i,y:n};let p=o.find((l)=>l.id===t.id)?.type==="section",c={x:i,y:n,w:e,h:s};for(let l of o){if(l.id===t.id)continue;let f=Number(l.x),v=Number(l.y),x=Number(l.w||1),m=Number(l.h||1),k={x:f,y:v,w:x,h:m};if(l.parent_id){let u=o.find((b)=>b.id===l.parent_id);if(u)k.x=Number(u.x)+f-1,k.y=Number(u.y)+v-1;else continue}if(this.isOverlap(c,k)){if(p&&l.parent_id===t.id){let u=Number(l.x),b=Number(l.y),A=Number(l.w||1),R=Number(l.h||1);if(u+A-1>e)return{valid:!1,x:i,y:n};if(b+R-1>s)return{valid:!1,x:i,y:n};continue}if(!p&&l.type==="section"){let u=i-Number(l.x)+1,b=n-Number(l.y)+1;if(u<1||u+e-1>Number(l.w||1)||b<1||b+s-1>Number(l.h||1))return{valid:!1,x:i,y:n};let A=o.filter((h)=>h.parent_id===l.id),R=!1;for(let h of A){let C={x:Number(h.x),y:Number(h.y),w:Number(h.w||1),h:Number(h.h||1)},J={x:u,y:b,w:e,h:s};if(this.isOverlap(J,C)){R=!0;break}}if(!R)return{valid:!0,x:i,y:n,targetGroup:l}}return{valid:!1,x:i,y:n}}}return{valid:!0,x:i,y:n}},snapToGrid(t,o,r,i){let n=r+i,e=Math.max(1,Math.floor(t/n)+1),s=r+i,d=Math.max(1,Math.floor(o/s)+1);return{x:e,y:d}},findFirstAvailableSlot(t,o,r,i=12){return this.findCompactPosition(t,o,r,i)},findAvailableSlot(t,o,r,i){let n=1;while(!0){for(let e=1;e<=i-t+1;e++){let s={x:e,y:n,w:t,h:o},d=!1;for(let p of r)if(this.isOverlap(s,p)){d=!0;break}if(!d)return{x:e,y:n}}if(n++,n>500)return console.warn("[CollisionService] Grid exhausted, no available slot found. Grid may be full."),{x:1,y:500}}},findCompactPosition(t,o,r,i,n){let e=1,s=1;while(!0){for(let d=1;d<=i-t+1;d++){let p={x:d,y:e,w:t,h:o},c=!1;for(let l of r){if(n&&l.id===n)continue;let f={x:l.x,y:l.y,w:l.w||1,h:l.h||1};if(this.isOverlap(p,f)){c=!0;break}}if(!c)return{x:d,y:e}}if(e++,e>500)return console.warn("[CollisionService] Grid exhausted, no compact position found. Grid may be full."),{x:1,y:500}}}}});var Lt={};U(Lt,{dashboardStore:()=>g});class jt{state={isEditing:!1,items:[],searchQuery:"",isOffline:!1,updateAvailable:!1,loading:!0,stats:null,availableWidth:1200,gridColumns:12};listeners=[];userId=0;getStorageKey(){return this.userId?`lastboard-items-${this.userId}`:"lastboard-items"}setUserId(t){this.userId=t}constructor(){this.initSocket(),this.checkSystemUpdate()}initSocket(){Promise.resolve().then(() => (zt(),wt)).then(({socketService:t})=>{t.subscribe((o)=>{this.state.stats={cpu_usage:o.cpu_usage,ram_usage:o.ram_usage,temperature:o.temperature},this.notify()}),t.subscribeNotification((o,r)=>{if(o==="update_available")console.log("[DashboardStore] Real-time update detected:",r.latest_version),this.checkSystemUpdate()})})}async checkSystemUpdate(){try{setTimeout(async()=>{let{userStore:t}=await Promise.resolve().then(() => (K(),S)),{updateService:o}=await Promise.resolve().then(() => (pt(),dt)),i=t.getUser()?.preferences?.beta_updates||!1;if((await o.check(i)).available)this.state.updateAvailable=!0,this.notify()},2000)}catch(t){}}saveToLocalStorage(){try{let t=JSON.stringify(this.state.items);localStorage.setItem(this.getStorageKey(),t)}catch(t){if(console.error("[DashboardStore] Failed to save to localStorage",t),t.name==="QuotaExceededError"||t.code===22)this.sanitizeStorage()}}loadFromLocalStorage(){try{this.sanitizeStorage();let t=localStorage.getItem(this.getStorageKey());if(t){let o=JSON.parse(t);if(Array.isArray(o)&&o.length>0)this.state.items=o}}catch(t){console.error("[DashboardStore] Failed to load from localStorage",t)}}sanitizeStorage(){try{let t=[];for(let o=0;o<localStorage.length;o++){let r=localStorage.key(o);if(r&&(r.includes("user_cache")||r.includes("old_dashboard_")))t.push(r)}t.forEach((o)=>localStorage.removeItem(o))}catch(t){}}subscribe(t){return this.listeners.push(t),this.ensureItemsIsArray(),t({...this.state,items:this.deepCopyItems(this.state.items)}),()=>{this.listeners=this.listeners.filter((o)=>o!==t)}}ensureItemsIsArray(){if(!Array.isArray(this.state.items))console.error("[DashboardStore] CRITICAL: items is not an array, resetting to empty array",typeof this.state.items),this.state.items=[]}deepCopyItems(t){return t.map((o)=>{let r=o.content;if(typeof o.content==="string")try{let i=JSON.parse(o.content);if(typeof i==="object"&&i!==null)r=JSON.stringify(i)}catch{}return{...o,content:r,status:o.status}})}setItemStatus(t,o){let r=this.state.items.findIndex((i)=>i.id===t);if(r===-1)return;if(this.state.items[r].status===o)return;this.state.items[r].status=o,this.notify()}notify(){this.ensureItemsIsArray();let t={...this.state,items:this.deepCopyItems(this.state.items)};this.listeners.forEach((o)=>o(t))}setEditMode(t){this.state.isEditing=t,this.notify()}toggleEditMode(){this.setEditMode(!this.state.isEditing)}setSearchQuery(t){this.state.searchQuery=t.toLowerCase().trim(),this.notify()}setGridMetrics(t,o){if(t===this.state.availableWidth&&o===this.state.gridColumns)return;this.state.availableWidth=t,this.state.gridColumns=o,this.notify()}async fetchItems(){let t=localStorage.getItem(this.getStorageKey());if(t)try{let o=JSON.parse(t);if(Array.isArray(o)&&o.length>0)this.state.items=o,this.state.loading=!1,this.notify()}catch(o){console.warn("[DashboardStore] Failed to parse cached items",o)}try{let o=await q.getItems();if(Array.isArray(o)){let r=JSON.stringify(this.state.items)!==JSON.stringify(o);if(this.state.items=o,this.state.isOffline=!1,this.state.loading=!1,this.saveToLocalStorage(),r)this.notify()}else throw Error("Backend returned invalid data")}catch(o){if(console.error("[DashboardStore] API fetch failed",o),this.state.isOffline=!0,this.state.loading=!1,this.state.items.length===0)this.state.items=[...Uo],this.saveToLocalStorage(),this.notify();else this.notify()}}async updateItem(t){try{this.ensureItemsIsArray();let o=this.state.items.findIndex((i)=>i.id===t.id);if(o===-1){console.warn("[DashboardStore] Item not found for update:",t.id);return}let r={...this.state.items[o]};this.state.items[o]={...this.state.items[o],...t},this.saveToLocalStorage(),this.notify();try{await q.updateItem(t),this.state.isOffline=!1,this.notify()}catch(i){console.error("[DashboardStore] Failed to sync item update (offline?), keeping local state",i),this.state.isOffline=!0,this.saveToLocalStorage(),this.notify()}}catch(o){console.error("[DashboardStore] Error updating item",o)}}async resizeItem(t,o,r){let i=this.state.items.find((n)=>n.id===t);if(!i)return;if(await this.updateItem({id:t,w:o,h:r}),i.type==="section")await this.reflowChildren(t,o)}async reflowChildren(t,o){let{collisionService:r}=await Promise.resolve().then(() => (B(),N)),i=this.state.items.filter((e)=>e.parent_id===t).sort((e,s)=>e.y-s.y||e.x-s.x);if(i.length===0)return;let n=[];for(let e of i){let s=r.findAvailableSlot(e.w,e.h,n,o);if(n.push({x:s.x,y:s.y,w:e.w,h:e.h}),e.x!==s.x||e.y!==s.y)await this.updateItem({id:e.id,x:s.x,y:s.y})}}async addItem(t){try{this.ensureItemsIsArray();try{let o={...t};if(o.type==="widget"&&!o.url)o.url="";let{userStore:r}=await Promise.resolve().then(() => (K(),S)),n=r.getUser()?.preferences,e=this.state.gridColumns;if(!e||e<1){let d=n?.widget_min_width||140,p=16,c=document.querySelector("bookmark-grid"),l=this.state.availableWidth||c?.clientWidth||window.innerWidth;e=Math.floor((l+16)/(d+16))}if(e<1)e=1;if(e>24)e=24;if(!o.x||!o.y){let{collisionService:d}=await Promise.resolve().then(() => (B(),N)),p=d.findFirstAvailableSlot(o.w||1,o.h||1,this.state.items,e);o.x=p.x,o.y=p.y}let s=await q.createItem(o);return this.state.isOffline=!1,this.state.items.push(s),this.saveToLocalStorage(),this.notify(),s}catch(o){console.error("[DashboardStore] Failed to add item to backend",o);return}}catch(o){console.error("[DashboardStore] Error adding item",o);return}}async deleteItem(t){try{this.ensureItemsIsArray();let o=this.state.items.findIndex((i)=>i.id===t);if(o===-1){console.warn("[DashboardStore] Item not found for deletion:",t);return}let r=this.state.items[o];this.state.items.splice(o,1),this.saveToLocalStorage(),this.notify();try{await q.deleteItem(t)}catch(i){console.error("[DashboardStore] Failed to delete item, rolling back",i),this.state.items.push(r),this.saveToLocalStorage(),this.notify()}}catch(o){console.error("[DashboardStore] Error deleting item",o)}}getState(){return this.ensureItemsIsArray(),{...this.state,items:[...this.state.items]}}}var Uo,g;var L=M(()=>{et();Uo=[{id:1,type:"bookmark",x:1,y:1,w:1,h:1,content:{label:"CodigoSH",url:"https://github.com/CodigoSH/Lastboard",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/git.png",iconName:"git"}}];g=new jt});var xt={};U(xt,{eventBus:()=>X,EVENTS:()=>O});var O,go,X;var tt=M(()=>{O={SHOW_CONFIRMATION:"lastboard:show-confirmation",SHOW_WIDGET_CONFIG:"lastboard:show-widget-config",NOTIFY:"lastboard:notify"};go=class go extends EventTarget{emit(t,o){this.dispatchEvent(new CustomEvent(t,{detail:o}))}on(t,o){this.addEventListener(t,o)}off(t,o){this.removeEventListener(t,o)}};X=new go});K();L();L();et();class Mt{interval=null;checkFrequency=300000;start(){if(this.interval)return;setTimeout(()=>this.checkAll(),2000),this.interval=window.setInterval(()=>{this.checkAll()},this.checkFrequency)}stop(){if(this.interval)clearInterval(this.interval),this.interval=null}async checkAll(){let o=g.getState().items.filter((s)=>{if(s.type!=="bookmark")return!1;let d=s.content;if(typeof d==="string")try{d=JSON.parse(d)}catch(p){return!1}return d&&d.statusCheck===!0});o.forEach((s)=>this.updateUIStatus(s.id,"pending"));let r=5,i=[...o],n=async()=>{while(i.length>0){let s=i.shift();if(s)await this.checkItem(s)}},e=Array(Math.min(o.length,r)).fill(null).map(()=>n());await Promise.all(e)}async checkItem(t){let o=t.content;if(typeof o==="string")try{o=JSON.parse(o)}catch(i){return}let r=o.url;if(!r||r==="#"||r.startsWith("javascript:"))return;try{if((await q.checkHealth(r)).status==="up")this.updateUIStatus(t.id,"up");else this.updateUIStatus(t.id,"down")}catch(i){console.warn(`[StatusService] ${r} health check failed:`,i),this.updateUIStatus(t.id,"down")}}updateUIStatus(t,o){g.setItemStatus(t,o)}}var W=new Mt;class G{static STORAGE_KEY="lastboard_theme";static CLASS_NAME="dark-mode";static init(){let t=localStorage.getItem(this.STORAGE_KEY);if(t==="dark")this.enableDark();else if(t==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(t,o,r){let i="";if(r){let n=new Date;n.setTime(n.getTime()+r*24*60*60*1000),i="; expires="+n.toUTCString()}document.cookie=t+"="+(o||"")+i+"; path=/"}static async sync(){try{let t=await fetch("/api/me");if(t.ok){let o=await t.json();if(o.theme==="dark")this.enableDark();else if(o.theme==="light")this.enableLight()}}catch(t){}}}y();var At=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var Ht=`:host {
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
}`;class Gt extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${Ht}</style>
            ${At()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",Gt);var Rt=`:host {
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
}`;y();class qt extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(t){if(this.getAttribute("type")==="submit"){let o=this.closest("form");if(o)if(o.requestSubmit)o.requestSubmit();else o.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(t){this._loading=t,this.render()}get loading(){return this._loading}render(){let t=this.getAttribute("variant")||"ghost",o=this._loading?a.t("general.loading"):"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${Rt}</style>
            <button class="btn btn--${t}" ${this._loading?"disabled":""}>
                ${o}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",qt);var Ft=({src:t,initials:o,alt:r})=>`
    <div class="avatar" title="${r}">
        ${t?`<img src="${t}" alt="${r}" class="avatar__img">`:`<span class="avatar__initials">${o}</span>`}
    </div>
`;var Qt=`:host {
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
}`;class Et extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(t,o,r){if(o!==r)this.render()}render(){let t=this.getAttribute("src"),o=this.getAttribute("initials")||"??",r=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${Qt}</style>
            ${Ft({src:t||void 0,initials:o,alt:r})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",Et);y();K();nt();y();var Jt=(t)=>`
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
                        ${(()=>{let o=(t.role||"").toLowerCase();if(t.is_superadmin)return a.t("settings.role_super_admin");if(o==="admin"||o==="administrator")return a.t("settings.role_admin");if(o==="user")return a.t("settings.role_user");return t.role||a.t("settings.default_role")})()}
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
`,Zt=(t,o,r)=>`
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">${a.t("settings.appearance")}</div>
             <h3 class="settings-content__title">${a.t("settings.studio_accent")}</h3>
             <div class="settings-content__color-grid">
                ${r.map((i)=>`
                    <div class="settings-content__color-swatch ${t.accent_color===i?"settings-content__color-swatch--active":""}" 
                         style="background-color: ${o[i]}"
                         onclick="this.getRootNode().host.savePrefs({accent_color: '${i}'})">
                         ${t.accent_color===i?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>':""}
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
                        <app-select id="language-select" value="${t.language}"></app-select>
                    </div>
                    <div style="flex: 1;">
                        <label class="settings-content__label">${a.t("settings.theme_mode")}</label>
                         <div class="settings-content__segmented-control">
                            <button class="settings-content__segment ${!t.theme||t.theme==="system"||t.theme==="dark"?"active":""}" 
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
`,Kt=(t)=>`
    <div class="bento-grid">
        <div class="bento-card" style="grid-column: span 2;">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.fluid_grid_architecture")}</div>
            
            <!-- Project Name -->
            <div class="settings-content__form-group" style="margin-bottom: 24px;">
                <label class="settings-content__label">${a.t("settings.project_name")}</label>
                <div style="display: flex; gap: 8px;">
                     <input type="text" 
                            id="project-name-input"
                            class="settings-content__input" 
                            value="${t.project_name||"Lastboard"}" 
                            placeholder="Lastboard">
                     <app-button variant="primary" onclick="this.getRootNode().host.savePrefs({project_name: this.getRootNode().getElementById('project-name-input').value})">${a.t("action.update")}</app-button>
                </div>
            </div>

            <div class="settings-content__personalization-grid">
                <div class="settings-content__slider-group">
                    <div class="settings-content__slider-header">
                        <label class="settings-content__slider-label">${a.t("settings.grid_columns")}</label>
                        <span class="settings-content__slider-value" id="val-grid_columns">${t.grid_columns||12}</span>
                    </div>
                    <input type="range" 
                           min="3" max="16" step="1"
                           value="${t.grid_columns||12}"
                           oninput="this.getRootNode().host.updateColumns(this.value)"
                           onchange="this.getRootNode().host.commitColumns(this.value)">
                </div>
            </div>
            
            <p class="settings-content__text-dim" style="font-size: 11px; margin-top: 24px; font-family: var(--font-mono);">
                ${a.t("settings.density_desc")}
            </p>
        </div>
    </div>
`,Bt=(t)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.admin_section")}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${a.t("settings.user_management")}</h3>
                <app-button variant="primary" onclick="this.getRootNode().host.openAddUserModal()" style="width: auto; padding: 0 16px;">+ ${a.t("action.add_user")}</app-button>
            </div>

            <div class="settings-content__user-list">
                ${(t||[]).map((o)=>`
                    <div class="settings-content__user-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <app-avatar 
                                initials="${o.username.substring(0,2).toUpperCase()}" 
                                src="${o.avatar_url||""}" 
                                style="width: 32px; height: 32px; font-size: 12px; border-radius: 50%; object-fit: cover;">
                            </app-avatar>
                            <div>
                                <div style="font-weight: 500; font-size: 14px;">${o.username}</div>
                                <div class="mono-tag" style="font-size: 10px;">
                                    ${(()=>{let r=(o.role||"").toLowerCase();if(o.is_superadmin)return a.t("settings.role_super_admin");if(r==="admin"||r==="administrator")return a.t("settings.role_admin");if(r==="user")return a.t("settings.role_user");return o.role})()}
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
             ${(t||[]).length===0?`<p class="settings-content__text-dim">${a.t("settings.no_users")}</p>`:""}
        </div>
    </div>
    
     <dialog id="add-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${a.t("action.add_new_user")}</h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('add-user-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
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
            <app-select id="new-user-role" value="user"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.createUser()">${a.t("general.save")}</app-button>
        </div>
    </dialog>

    <dialog id="edit-user-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 400px; backdrop-filter: blur(20px);">
        <div class="modal-header">
            <h3 class="modal-title">${a.t("action.edit_user")}</h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('edit-user-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
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
            <app-select id="edit-user-role"></app-select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
            <app-button variant="primary" onclick="this.getRootNode().host.updateAdminUser()">${a.t("action.save_changes")}</app-button>
        </div>
    </dialog>
`,Ut=()=>`
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
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: var(--danger-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    ${a.t("settings.factory_reset")}
                </div>
                <p class="settings-content__text-dim" style="font-size: 13px; color: var(--danger-color); opacity: 0.8;">
                    ${a.t("settings.reset_desc")}
                </p>
             </div>
             <app-button onclick="this.getRootNode().host.openResetModal()" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent; transition: all 0.2s;">
                ${a.t("action.reset_system")}
             </app-button>
        </div>
    </div>

    <!-- Factory Reset Confirmation Modal -->
    <dialog id="reset-confirm-modal" style="background: var(--surface-solid); color: var(--text-main); border: 1px solid var(--border); border-radius: 12px; padding: 32px; width: 440px; backdrop-filter: blur(20px); box-shadow: var(--paper-shadow);">
        <div class="modal-header">
            <h3 class="modal-title" style="color: var(--danger-color); font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: var(--danger-color);"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                ${a.t("settings.confirm_reset_title")}
            </h3>
            <button class="modal-close" onclick="this.getRootNode().getElementById('reset-confirm-modal').close()">
                <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="settings-content__text-dim" style="font-size: 14px; margin-bottom: 24px; line-height: 1.6;">
            ${a.t("settings.confirm_reset_msg")}
            ${a.t("settings.type_delete")}
        </p>

        <div class="settings-content__form-group">
            <input type="text" id="reset-confirm-input" class="settings-content__input" placeholder="${a.t("settings.type_delete_placeholder")}" style="border-color: var(--danger-color); opacity: 0.6; font-family: monospace;">
        </div>

        <div style="display: flex; gap: 12px; margin-top: 32px; width: 100%;">
            <app-button id="btn-reset-confirm" variant="danger" onclick="this.getRootNode().host.executeFactoryReset()" style="flex: 1; justify-content: center;">
                ${a.t("action.erase_everything")}
            </app-button>
        </div>
    </dialog>
`,Vo=(t,o)=>{if(!t)return"";if(!o)return"";if(o.is_docker)return`
            <div style="background: rgba(var(--info-rgb), 0.1); border: 1px solid rgba(var(--info-rgb), 0.3); padding: 16px; border-radius: var(--radius); width: 100%; text-align: left;">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: var(--accent); flex-shrink: 0;"><path d="M21 12l-4.37-6.16c-.37-.52-.98-.84-1.63-.84h-3V4c0-1.1-.9-2-2-2s-2 .9-2 2v1H5c-.65 0-1.26.32-1.63.84L-1 12v3h2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v-3zm-11 7H7v-3h3v3zm-5 0H2v-3h3v3zm12 0h-3v-3h3v3z"/></svg>
                    <div>
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-main);">${a.t("settings.docker_mode")}</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
                            ${a.t("settings.docker_desc")}<br>
                            ${o.available?`<strong style="color: var(--accent);">${a.t("settings.new_version_notif")} (${o.latest_version})</strong>`:a.t("settings.up_to_date_docker_msg")}
                        </p>
                    </div>
                    </div>
            </div>
        `;if(o.available)return`
            <div class="update-modal">
                <div class="update-modal__glow"></div>
                
                <div class="update-modal__content">
                    <div class="update-modal__header">
                        <div class="update-modal__badge">${a.t("settings.update_available")}</div>
                        <h3 class="update-modal__version">${o.latest_version}</h3>
                    </div>
                    
                    <div class="update-modal__footer">
                        <app-button variant="primary" id="btn-update-now" style="flex: 1; justify-content: center;" onclick="this.getRootNode().host.performUpdate('${o.asset_url}')">
                            ${a.t("action.download_install")}
                        </app-button>
                        <a href="https://github.com/CodigoSH/Lastboard/releases" target="_blank" style="text-decoration: none;">
                            <app-button variant="ghost" style="height: 100%;">${a.t("general.changelog")}</app-button>
                        </a>
                    </div>
                    <p id="update-status" style="margin: 0; font-size: 12px; color: var(--text-dim); display: none; text-align: center;">${a.t("notifier.downloading_secure")}</p>
                </div>
            </div>
        `;return`
        <div style="color: var(--success-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span>${a.t("settings.up_to_date")}</span>
        </div>
    `},lt=(t,o,r)=>{return`
        <div id="update-status-container" style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 400px; min-height: 48px;">
            ${Vo(t,o)}
        </div>

        ${t?`
        <div style="margin-top: 16px;">
            <app-button variant="ghost" 
                        id="btn-check-updates"
                        ?loading="${r}"
                        onclick="this.getRootNode().host.handleManualCheckUpdates()">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                ${a.t("action.check_updates")}
            </app-button>
        </div>
        `:""}
    `},Yt=(t,o,r,i,n)=>{let e=r?.toLowerCase()==="admin"||r?.toLowerCase()==="administrator";return`
    <div style="position: relative;">
        ${e?`
            <div class="beta-badge">
                <span id="beta-text" class="beta-badge__pill ${i?"active":""}">
                    ${a.t("settings.beta_tester")}
                </span>
                <label class="toggle-switch">
                    <input type="checkbox" id="beta-updates-toggle-badge" onchange="this.getRootNode().host.handleBetaToggle(this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
        `:""}

        <div class="bento-grid" style="grid-template-columns: 1fr;">
            <div class="bento-card" style="text-align: center; padding: 24px;">
            
            <div style="margin: 24px 0;">
                <!-- Logo Placeholder -->
                <img src="/images/logo.png" alt="Lastboard" style="max-width: 100px; height: auto; border-radius: 18px; margin: 0 auto 24px auto; display: block;">
                
                <h2 style="margin: 0 0 8px 0; font-size: 24px; color: var(--text-main);">${a.t("app.title")}</h2>
                <p class="settings-content__text-dim" style="margin: 0;">${t}</p>
            </div>

              <div id="update-zone-wrapper" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                ${lt(e,o,n)}
              </div>
             </div>

             <div style="margin-top: 64px; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: center; gap: 24px;">
                 <a href="https://github.com/CodigoSH/Lastboard" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z"/></svg>
                     ${a.t("settings.github")}
                 </a>
                 <a href="https://github.com/CodigoSH/Lastboard/issues" target="_blank" style="color: var(--text-dim); text-decoration: none; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: color 0.2s;">
                     <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                     ${a.t("action.report_issue")}
                 </a>
             </div>
         </div>
     </div>
        `};var ct=`:host {
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
}`;class Nt extends HTMLElement{_options=[];_value="";isOpen=!1;_boundOutsideClick;dropdownEl=null;_boundScroll;_boundResize;isInsideDialog=!1;static get observedAttributes(){return["value"]}constructor(){super();this.attachShadow({mode:"open"}),this._boundOutsideClick=this.handleOutsideClick.bind(this),this._boundScroll=(t)=>{if(this.dropdownEl&&this.dropdownEl.contains(t.target))return;this.close()},this._boundResize=this.close.bind(this)}connectedCallback(){this.ensureGlobalStyles(),this.render(),this.isInsideDialog=!!this.closest("dialog"),document.addEventListener("click",this._boundOutsideClick,!0),window.addEventListener("scroll",this._boundScroll,!0),window.addEventListener("resize",this._boundResize)}disconnectedCallback(){this.close(),document.removeEventListener("click",this._boundOutsideClick,!0),window.removeEventListener("scroll",this._boundScroll,!0),window.removeEventListener("resize",this._boundResize)}ensureGlobalStyles(){if(!document.getElementById("app-select-portal-css")){let t=document.createElement("style");t.id="app-select-portal-css",t.textContent=ct,document.head.appendChild(t)}}get value(){return this._value}set value(t){if(this._value!==t)this._value=t,this.setAttribute("value",t),this.updateTriggerDisplay()}set options(t){this._options=t,this.updateTriggerDisplay()}attributeChangedCallback(t,o,r){if(t==="value"&&o!==r)this._value=r,this.updateTriggerDisplay()}updateTriggerDisplay(){if(!this.shadowRoot)return;let t=this.shadowRoot.querySelector(".select-value");if(t){let o=this._options.find((r)=>r.value===this._value)||this._options[0];t.textContent=o?o.label:"Select..."}}toggle(){if(this.isOpen)this.close();else this.open()}open(){if(this.isOpen)return;if(this.close(),this.isOpen=!0,this.setAttribute("open",""),this.dropdownEl=document.createElement("div"),this.dropdownEl.className="select-dropdown",this.dropdownEl.innerHTML=this._options.map((t)=>`
            <div class="select-option ${t.value===this._value?"selected":""}" 
                 data-value="${t.value}">
                 ${t.label}
            </div>
        `).join(""),this.dropdownEl.querySelectorAll(".select-option").forEach((t)=>{t.addEventListener("click",(o)=>{o.stopPropagation();let r=o.currentTarget.dataset.value;if(r)this.selectOption(r)})}),this.isInsideDialog)this.dropdownEl.style.position="absolute",this.dropdownEl.style.left="0",this.dropdownEl.style.right="0",this.dropdownEl.style.top="100%",this.dropdownEl.style.marginTop="6px",this.shadowRoot.appendChild(this.dropdownEl);else{let t=this.shadowRoot.getElementById("trigger");if(t){let o=t.getBoundingClientRect();this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${o.bottom+6}px`,this.dropdownEl.style.left=`${o.left}px`,this.dropdownEl.style.width=`${o.width}px`,this.dropdownEl.style.zIndex="99999"}document.body.appendChild(this.dropdownEl)}requestAnimationFrame(()=>{if(this.dropdownEl)this.dropdownEl.classList.add("open")})}positionPortal(){if(!this.dropdownEl||!this.shadowRoot)return;let t=this.shadowRoot.getElementById("trigger");if(!t)return;let o=t.getBoundingClientRect(),r=o.bottom+6,i=o.left,n=300;if(r+n>window.innerHeight&&o.top-n>0)r=o.top-6-n;this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${r}px`,this.dropdownEl.style.left=`${i}px`,this.dropdownEl.style.width=`${o.width}px`,this.dropdownEl.style.zIndex="99999"}close(){if(this.dropdownEl)this.dropdownEl.remove(),this.dropdownEl=null;this.isOpen=!1,this.removeAttribute("open")}handleOutsideClick(t){if(!this.isOpen)return;let o=t.composedPath();if(o.includes(this))return;if(this.dropdownEl&&o.includes(this.dropdownEl))return;this.close()}selectOption(t){this._value=t,this.setAttribute("value",t),this.updateTriggerDisplay(),this.dispatchEvent(new CustomEvent("change",{detail:t,bubbles:!0})),this.close()}render(){if(!this.shadowRoot)return;let t=this._options.find((r)=>r.value===this._value)||this._options[0],o=t?t.label:"Select...";this.shadowRoot.innerHTML=`
            <style>${ct}</style>
            <div class="select-wrapper">
                <div class="select-trigger" id="trigger">
                    <div class="select-value">
                        ${o}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `,this.shadowRoot.getElementById("trigger")?.addEventListener("click",(r)=>{r.stopPropagation(),this.toggle()})}}if(!customElements.get("app-select"))customElements.define("app-select",Nt);var Tt=`:host {
    display: block;
    color: var(--text-main);
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px;
    position: relative;
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

/* Bento Layout */
.bento-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 32px;
}

.bento-card {
    background: transparent;
    border: none;
    padding: 0;
    position: relative;
    transition: all 0.2s ease;
}

.bento-card h3 {
    margin: 0 0 8px 0;
    font-size: 15px;
    font-weight: 600;
}

.bento-card p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
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

/* Beta Badge Styling */
.beta-badge {
    position: absolute;
    top: 6px;
    right: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    z-index: 100;
}

.beta-badge__pill {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 0.3s;
    user-select: none;
    border: 2px solid transparent;
    padding: 2px 8px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-dim);
}

.beta-badge__pill.active {
    color: #2fb344;
    border-color: #2fb344;
    box-shadow: 0 0 10px rgba(47, 179, 68, 0.2);
}

.beta-badge .toggle-switch {
    transform: scale(0.8);
    transform-origin: top center;
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

/* Responsive Overrides */
@media (max-width: 1400px) {
    :host {
        padding: 24px 16px;
    }

    .settings-content__action-row,
    .settings-content__danger-zone {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
        padding-left: 0;
        padding-right: 0;
    }

    .settings-content__action-info p {
        max-width: none;
    }

    .settings-content__reset-btn,
    .settings-content__button,
    app-button {
        width: 100%;
        justify-content: center;
    }

    .settings-content__profile-header {
        flex-direction: column;
        text-align: center;
    }

    .settings-content__personalization-grid {
        grid-template-columns: 1fr;
    }

    /* Target specific flex layouts in templates */
    .settings-content__form-group div[style*="display: flex"] {
        flex-direction: column !important;
        gap: 12px !important;
    }

    .settings-content__form-group div[style*="display: flex"]>* {
        width: 100% !important;
        flex: none !important;
    }
}`;class Vt extends HTMLElement{prefs;users=[];getCsrfToken(){let t=document.cookie.split("; ").find((o)=>o.startsWith("csrf_token="));return t?decodeURIComponent(t.split("=")[1]):""}static get observedAttributes(){return["section"]}constructor(){super();this.attachShadow({mode:"open"}),this.prefs={accent_color:"#0078D4",language:"en",widget_min_width:140,beta_updates:!1}}unsubscribe=null;_renderPending=!1;connectedCallback(){this.unsubscribe=w.subscribe((o)=>{if(o&&o.preferences)this.prefs={...o.preferences,project_name:o.project_name||o.preferences.project_name||"Lastboard"},this.render()}),this.fetchPrefs();let t=this.getAttribute("section");if(t==="users")this.fetchUsers();this.render()}disconnectedCallback(){if(this.unsubscribe)this.unsubscribe(),this.unsubscribe=null}async fetchPrefs(){let t=w.getUser();if(t&&t.preferences)this.prefs={...t.preferences,project_name:t.project_name||t.preferences.project_name||"Lastboard"},this.render()}async fetchUsers(){try{this.users=await H.getUsers(),this.render()}catch(t){console.error("Failed to fetch users",t)}}attributeChangedCallback(t,o,r){if(t==="section"&&o!==r){if(r==="users")this.fetchUsers();this.render()}}async savePrefs(t){let o={...this.prefs};if(this.prefs={...this.prefs,...t},t.accent_color)this.applyAccent(t.accent_color);if(t.language)a.setLanguage(t.language);if(t.theme)if(t.theme==="dark")G.enableDark();else G.enableLight();try{await w.updatePreferences(t)}catch{if(this.prefs=o,t.language&&o.language)a.setLanguage(o.language)}this.render()}applyAccent(t){let o=t,r={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"};if(!t.startsWith("#"))o=r[t]||"#0078D4";document.documentElement.style.setProperty("--accent",o);let i=parseInt(o.slice(1,3),16),n=parseInt(o.slice(3,5),16),e=parseInt(o.slice(5,7),16);if(!isNaN(i)&&!isNaN(n)&&!isNaN(e))document.documentElement.style.setProperty("--accent-rgb",`${i}, ${n}, ${e}`)}async handleBetaToggle(t){this.savePrefs({beta_updates:t}),this.render()}updateDensity(t){let o=this.shadowRoot.getElementById("val-widget_min_width");if(o)o.textContent=t+"px";document.documentElement.style.setProperty("--widget-min-size",t+"px")}commitDensity(t){let o=parseInt(t);w.updatePreferences({widget_min_width:o})}updateColumns(t){let o=this.shadowRoot.getElementById("val-grid_columns");if(o)o.textContent=t;document.documentElement.style.setProperty("--user-preferred-columns",t)}commitColumns(t){let o=parseInt(t);w.updatePreferences({grid_columns:o})}async updateUsername(t){let o=w.getUser();if(!o)return;if(await w.updateProfile({username:t,avatar_url:this.prefs.avatar_url||o.avatar_url}),window.notifier)window.notifier.show(a.t("notifier.username_updated"))}async updatePassword(){let t=this.shadowRoot.getElementById("current-password")?.value,o=this.shadowRoot.getElementById("new-password")?.value,r=this.shadowRoot.getElementById("confirm-password")?.value;if(!t){if(window.notifier)window.notifier.show(a.t("notifier.password_required"),"error");return}if(o!==r){if(window.notifier)window.notifier.show(a.t("notifier.password_mismatch"),"error");return}if(!o){if(window.notifier)window.notifier.show(a.t("notifier.password_empty"),"error");return}try{if(await w.changePassword({current_password:t,new_password:o}),window.notifier)window.notifier.show(a.t("notifier.password_changed"));this.shadowRoot.getElementById("current-password").value="",this.shadowRoot.getElementById("new-password").value="",this.shadowRoot.getElementById("confirm-password").value="",setTimeout(async()=>{try{await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()}})}catch(i){}document.body.style.opacity="0",window.location.href="/login"},1500)}catch(i){if(window.notifier)window.notifier.show(a.t("notifier.password_incorrect"),"error")}}async handleAvatarChange(t){let o=t.target.files?.[0];if(!o)return;let r=new FileReader;r.onload=async(i)=>{let n=i.target?.result,e=w.getUser();if(!e)return;if(this.prefs.avatar_url=n,await w.updateProfile({username:e.username,avatar_url:n}),this.render(),window.notifier)window.notifier.show(a.t("notifier.avatar_updated"))},r.readAsDataURL(o)}openAddUserModal(){let t=this.shadowRoot.getElementById("add-user-modal");if(t){t.showModal();let o=this.shadowRoot.getElementById("new-user-role");if(o)o.options=[{value:"user",label:a.t("settings.role_user")},{value:"admin",label:a.t("settings.role_admin")}]}}async createUser(){let t=this.shadowRoot.getElementById("new-user-username").value,o=this.shadowRoot.getElementById("new-user-password").value,r=this.shadowRoot.getElementById("new-user-role").value;if(!t||!o){if(window.notifier)window.notifier.show(a.t("notifier.fields_required"),"error");return}try{if(await H.createUser({username:t,password:o,role:r}),window.notifier)window.notifier.show(a.t("notifier.user_created"));let i=this.shadowRoot.getElementById("add-user-modal");if(i)i.close();this.fetchUsers()}catch(i){if(window.notifier)window.notifier.show(a.t("notifier.user_create_error"),"error")}}openEditUserModal(t,o,r){let i=this.shadowRoot.getElementById("edit-user-modal");if(i){this.shadowRoot.getElementById("edit-user-id").value=t.toString(),this.shadowRoot.getElementById("edit-user-username").value=o,this.shadowRoot.getElementById("edit-user-password").value="",i.showModal();let n=this.shadowRoot.getElementById("edit-user-role");if(n)n.options=[{value:"user",label:a.t("settings.role_user")},{value:"admin",label:a.t("settings.role_admin")}],n.value=r}}async updateAdminUser(){let t=parseInt(this.shadowRoot.getElementById("edit-user-id").value),o=this.shadowRoot.getElementById("edit-user-username").value,r=this.shadowRoot.getElementById("edit-user-password").value,i=this.shadowRoot.getElementById("edit-user-role").value;if(!o){if(window.notifier)window.notifier.show(a.t("notifier.username_required"),"error");return}try{if(await H.adminUpdateUser({id:t,username:o,role:i,password:r||void 0}),window.notifier)window.notifier.show(a.t("notifier.user_updated"));let n=this.shadowRoot.getElementById("edit-user-modal");if(n)n.close();this.fetchUsers()}catch(n){if(window.notifier)window.notifier.show(a.t("notifier.user_update_error"),"error")}}async deleteUser(t){let o=document.querySelector("confirmation-modal");if(o){if(!await o.confirm(a.t("general.delete"),a.t("notifier.user_delete_confirm")))return}try{let r=[...this.users];if(this.users=this.users.filter((i)=>i.id!==t),this.render(),await H.deleteUser(t),window.notifier)window.notifier.show(a.t("notifier.user_deleted"));this.fetchUsers()}catch(r){this.fetchUsers();let i=a.t("notifier.user_delete_error");if(r.message&&r.message.includes("error.cannot_delete_superadmin"))i=a.t("notifier.user_delete_superadmin");if(window.notifier)window.notifier.show(i,"error")}}getContent(t){let o=w.getUser()||{username:"Guest",initials:"??",role:"View Only",avatar_url:"",accent_color:"#0078D4",language:"en",preferences:{}};switch(t){case"account":return Jt(o);case"theme":{let r={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"},i=Object.keys(r);return Zt(this.prefs,r,i)}case"personalization":return Kt(this.prefs);case"advanced":return Ut();case"users":return Bt(this.users);case"about":return Yt(this.version,this.updateInfo,o.role||"user",o.preferences?.beta_updates||!1,this.isCheckingUpdates);default:return`<div class="bento-card"><h3>${t}</h3><p class="settings-content__text-dim">${a.t("settings.default_module_desc")}</p></div>`}}version="v1.2.0-Beta.17";updateInfo=null;checkUpdatesPromise=null;isCheckingUpdates=!1;async handleManualCheckUpdates(){if(this.isCheckingUpdates)return;this.isCheckingUpdates=!0,this.updateUpdateUI();try{if(await this.checkForUpdates(),this.updateInfo&&!this.updateInfo.available){if(window.notifier)window.notifier.show(a.t("settings.up_to_date"))}}finally{this.isCheckingUpdates=!1,this.updateUpdateUI()}}async checkForUpdates(){if(this.checkUpdatesPromise)return this.checkUpdatesPromise;return this.checkUpdatesPromise=(async()=>{try{let{updateService:t}=await Promise.resolve().then(() => (pt(),dt)),o=this.prefs.beta_updates||!1;if(this.updateInfo=await t.check(o),this.updateInfo)this.version=this.updateInfo.current_version,this.updateUpdateUI()}catch(t){console.error("Check update failed",t)}finally{this.checkUpdatesPromise=null}})(),this.checkUpdatesPromise}async performUpdate(t){let o=document.querySelector("confirmation-modal");if(o){if(!await o.confirm(a.t("settings.update_available"),a.t("notifier.update_start_confirm")))return}let r=this.shadowRoot.getElementById("btn-update-now"),i=this.shadowRoot.getElementById("update-status");if(r)r.loading=!0;if(i)i.style.display="block",i.textContent=a.t("notifier.update_downloading");try{let n=await fetch("/api/system/update/perform",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":this.getCsrfToken()},body:JSON.stringify({asset_url:t})});if(n.ok){if(i)i.textContent=a.t("notifier.update_verified");setTimeout(()=>{window.location.reload()},5000)}else{let e=await n.text();if(i)i.style.color="var(--danger-color)",i.textContent=a.t("notifier.update_failed")+e;if(r)r.loading=!1}}catch(n){if(console.error("Update failed",n),i)i.style.color="var(--danger-color)",i.textContent=a.t("notifier.update_error");if(r)r.loading=!1}}downloadBackup(){window.location.href="/api/system/backup"}async restoreBackup(t){if(!t)return;let o=document.querySelector("confirmation-modal");if(o){if(!await o.confirm(a.t("general.restore"),a.t("notifier.restore_confirm")))return}let r=new FormData;r.append("backup_file",t);try{if((await fetch("/api/system/restore",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()},body:r})).ok){if(window.notifier)window.notifier.show(a.t("notifier.restore_success"));setTimeout(()=>window.location.reload(),2000)}else if(window.notifier)window.notifier.show(a.t("notifier.restore_failed"),"error")}catch(i){if(console.error("Restore error",i),window.notifier)window.notifier.show(a.t("notifier.restore_failed"),"error")}}openResetModal(){let t=this.shadowRoot.getElementById("reset-confirm-modal"),o=this.shadowRoot.getElementById("reset-confirm-input");if(t){if(o)o.value="";t.showModal()}}async executeFactoryReset(){let t=this.shadowRoot.getElementById("reset-confirm-input");if(!t||t.value.trim()!=="delete"){if(window.notifier)window.notifier.show(a.t("notifier.reset_confirm_text"),"error");t.focus();return}let o=this.shadowRoot.getElementById("btn-reset-confirm");try{if(o)o.disabled=!0,o.textContent=a.t("settings.restoring")||"Restoring...";if((await fetch("/api/system/reset",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()}})).ok){let i=document.createElement("div");Object.assign(i.style,{position:"fixed",top:"0",left:"0",width:"100%",height:"100%",backgroundColor:"rgba(0,0,0,0.9)",zIndex:"9999",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"var(--font-main, sans-serif)"}),i.innerHTML=`
                    <div style="border: 4px solid #333; border-top: 4px solid var(--accent, #0078d4); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 24px;"></div>
                    <h2 style="margin: 0; font-weight: 500;">${a.t("notifier.system_restarting")}</h2>
                    <p style="opacity: 0.7; margin-top: 8px;">${a.t("notifier.please_wait")}</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `,document.body.appendChild(i);let n=0,e=async()=>{n++;try{if((await fetch("/",{method:"HEAD",cache:"no-store"})).ok){window.location.href="/setup";return}}catch(s){}if(n<60)setTimeout(e,1000);else window.location.href="/setup"};setTimeout(e,2000)}else if(window.notifier)window.notifier.show(a.t("notifier.reset_failed"),"error")}catch(r){if(console.error("Reset error",r),window.notifier)window.notifier.show(a.t("notifier.reset_error"),"error")}}render(){if(this._renderPending)return;this._renderPending=!0,requestAnimationFrame(()=>{this._renderPending=!1,this._doRender()})}_doRender(){if(this.shadowRoot.innerHTML=`
            <style>${Tt}</style>
            <div class="fade-in">
                ${this.getContent(this.getAttribute("section")||"account")}
            </div>
        `,this.shadowRoot.querySelectorAll(".settings-content__checkbox").forEach((t)=>{t.addEventListener("click",()=>t.classList.toggle("settings-content__checkbox--checked"))}),this.initSelects(),this.getAttribute("section")==="about")this.updateBetaBadgeVisuals()}initSelects(){let t=this.shadowRoot.getElementById("language-select");if(t){let n=a.getAvailableLocales();t.options=n.map((e)=>({value:e.code,label:`${e.flag} ${e.name}`})),t.addEventListener("change",(e)=>{this.savePrefs({language:e.detail})})}let o=[{value:"user",label:a.t("settings.role_user")},{value:"admin",label:a.t("settings.role_admin")}],r=this.shadowRoot.getElementById("new-user-role");if(r)r.options=o;let i=this.shadowRoot.getElementById("edit-user-role");if(i)i.options=o}updateBetaBadgeVisuals(){setTimeout(()=>{let t=this.shadowRoot.getElementById("beta-updates-toggle-badge");if(t)t.checked=this.prefs.beta_updates||!1},0)}updateUpdateUI(){let t=this.shadowRoot.getElementById("update-zone-wrapper");if(t){let o=w.getUser(),r=o?.role?.toLowerCase()==="admin"||o?.role?.toLowerCase()==="administrator";t.innerHTML=lt(r,this.updateInfo,this.isCheckingUpdates)}}}if(!customElements.get("settings-content"))customElements.define("settings-content",Vt);K();y();var Ot=({user:t,isOpen:o,selectedSection:r,updateAvailable:i})=>`
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
                    ${(()=>{let n=(t.role||"").toLowerCase();if(t.is_superadmin)return a.t("settings.role_super_admin");if(n==="admin"||n==="administrator")return a.t("settings.role_admin");if(n==="user")return a.t("settings.role_user");return t.role||a.t("settings.default_role")})()}
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
                <div class="right-drawer__menu-item ${r==="personalization"?"right-drawer__menu-item--active":""}" data-section="personalization">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span>${a.t("settings.personalization")}</span>
                </div>

                ${t.role?.toLowerCase()==="admin"||t.role==="Administrator"?`
                    <div class="right-drawer__menu-item ${r==="users"?"right-drawer__menu-item--active":""}" data-section="users">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span>${a.t("settings.users")}</span>
                    </div>

                    <div class="right-drawer__menu-item ${r==="advanced"?"right-drawer__menu-item--active":""}" data-section="advanced">
                        <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                        <span>${a.t("settings.advanced")}</span>
                    </div>
                `:""}
                <div class="right-drawer__menu-item ${r==="about"?"right-drawer__menu-item--active":""}" data-section="about" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <span>${a.t("settings.about")}</span>
                    </div>
                    ${i&&(t.role?.toLowerCase()==="admin"||t.role==="Administrator")?`
                        <span style="font-size: 10px; font-weight: 600; color: var(--danger-color); background: rgba(var(--danger-rgb), 0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(var(--danger-rgb), 0.2); animation: blink-badge 2s infinite;">${a.t("settings.update_available")}</span>
                        <style>@keyframes blink-badge { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }</style>
                    `:""}
                </div>
            </nav>
        </div>

        <div class="right-drawer__footer">
            <button type="button" id="logout-btn" class="right-drawer__menu-item right-drawer__menu-item--logout" style="background:none;border:none;color:inherit;font:inherit;cursor:pointer;width:100%;padding:0;">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/></svg>
                <span>${a.t("auth.logout")}</span>
            </button>
        </div>
    </div>
`;y();var Xt=`:host {
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
}`;class Pt extends HTMLElement{isOpen;selectedSection;_unsubscribe;_unsubscribeI18n;_keydownHandler;updateAvailable;_unsubscribeDashboard;constructor(){super();this.attachShadow({mode:"open"}),this.isOpen=!1,this.selectedSection=null,this.updateAvailable=!1}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribe=w.subscribe((t)=>{if(this.isOpen)this.render()}),Promise.resolve().then(() => (L(),Lt)).then(({dashboardStore:t})=>{this._unsubscribeDashboard=t.subscribe((o)=>{if(this.updateAvailable!==o.updateAvailable)this.updateAvailable=o.updateAvailable,this.render()})}),this._unsubscribeI18n=a.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._keydownHandler)window.removeEventListener("keydown",this._keydownHandler)}open(){this.isOpen=!0,this.setAttribute("open",""),this.render(),document.body.style.overflow="hidden",this.dispatchEvent(new CustomEvent("drawer-open",{bubbles:!0,composed:!0}))}close(){this.isOpen=!1,this.removeAttribute("open"),this.selectedSection=null,this.render(),document.body.style.overflow="",this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}selectSection(t){if(this.selectedSection===t)this.selectedSection=null;else this.selectedSection=t;this.render()}async performLogout(){let t=document.cookie.split("; ").find((r)=>r.startsWith("csrf_token=")),o=t?decodeURIComponent(t.split("=")[1]):"";try{await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":o}})}catch(r){}document.body.style.opacity="0",window.location.href="/login"}setupListeners(){this.shadowRoot.addEventListener("click",(t)=>{let o=t.target;if(o.classList.contains("right-drawer__overlay"))this.close();if(o.closest("#logout-btn")){t.preventDefault(),this.performLogout();return}let r=o.closest(".right-drawer__menu-item");if(r&&r.dataset.section)t.preventDefault(),this.selectSection(r.dataset.section)}),this._keydownHandler=(t)=>{if(t.key==="Escape"&&this.isOpen)this.close()},window.addEventListener("keydown",this._keydownHandler)}render(){let t=w.getUser()||{username:"Guest",initials:"??",role:"Viewer"};this.shadowRoot.innerHTML=`
            <style>${Xt}</style>
            ${Ot({user:t,isOpen:this.isOpen,selectedSection:this.selectedSection,updateAvailable:this.updateAvailable})}
        `}}if(!customElements.get("app-right-drawer"))customElements.define("app-right-drawer",Pt);y();var Ct=({title:t,editMode:o,searchActive:r,addMenuActive:i,drawerOpen:n,searchQuery:e,user:s,updateAvailable:d})=>{return`
    <div class="top-bar">
        <div class="top-bar__title">${t}</div>
        <div class="top-bar__actions">
            <!-- Offline Indicator -->
            <offline-badge></offline-badge>

            <!-- Search Bar -->
            <div id="search-wrapper" class="search-wrapper ${r?"search-wrapper--active":""}">
                <input type="text" id="search-input" class="search-input" placeholder="${a.t("general.search")}" 
                       value="${e||""}" onclick="event.stopPropagation()">
                <div id="search-clear" class="search-clear" style="display: ${e?"flex":"none"};">×</div>
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Item Toggle -->
            <div id="add-toggle" class="top-bar__toggle" title="${a.t("topbar.add_tooltip")}" 
                 style="${o?"display: flex;":"display: none;"} margin-right: -6px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 5v14M5 12h14" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </div>

            <!-- Add Menu Dropdown -->
            <div id="add-menu" class="add-menu ${i?"add-menu--active":""}">
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

            <!-- Sidebar Toggle Icon -->
            <div id="drawer-toggle" class="top-bar__toggle" style="position: relative;">
                ${d?'<div class="notification-dot"></div>':""}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" />
                    <rect class="top-bar__indicator ${n?"top-bar__indicator--active":""}" 
                          x="15" y="3" width="6" height="18" fill="white" />
                    <path d="M15 3V21" stroke-width="1.5" />
                </svg>
            </div>
        </div>
    </div>
`};L();y();var Dt=`:host {
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
}`;class Wt extends HTMLElement{state;_unsubscribeDashboard;_unsubscribeI18n;_windowClickHandler;static get observedAttributes(){return["title"]}constructor(){super();this.attachShadow({mode:"open"}),this.state={editMode:!1,searchActive:!1,addMenuActive:!1,drawerOpen:!1,searchQuery:""}}attributeChangedCallback(t,o,r){if(t==="title"&&o!==r)this.render()}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeDashboard=g.subscribe((t)=>{if(this.state.editMode!==t.isEditing||this.state.updateAvailable!==t.updateAvailable)this.setState({editMode:t.isEditing,updateAvailable:t.updateAvailable})}),this._unsubscribeI18n=a.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._windowClickHandler)window.removeEventListener("click",this._windowClickHandler)}setState(t){let o=this.state.editMode;if(this.state={...this.state,...t},this.render(),t.editMode!==void 0&&t.editMode!==o)this.dispatchEvent(new CustomEvent("edit-mode-change",{detail:{active:this.state.editMode},bubbles:!0,composed:!0}))}setupListeners(){this.shadowRoot.addEventListener("click",(t)=>{let o=t.target;if(o.closest("#search-clear")){t.stopPropagation(),this.state.searchQuery="";let p=this.shadowRoot.getElementById("search-input");if(p)p.value="",p.focus();this.render(),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0}));return}if(o.closest("#search-wrapper")&&!this.state.searchActive)t.stopPropagation(),this.setState({searchActive:!0}),this.shadowRoot.getElementById("search-input")?.focus();if(o.closest("#edit-toggle"))g.toggleEditMode();if(o.closest("#add-toggle"))t.stopPropagation(),this.setState({addMenuActive:!this.state.addMenuActive});let s=o.closest(".add-menu-item");if(s){let p=s.dataset.action;if(p)this.setState({addMenuActive:!1}),this.dispatchEvent(new CustomEvent("add-item",{detail:{action:p},bubbles:!0,composed:!0}));return}if(o.closest("#drawer-toggle")){let p=this.state.drawerOpen?"close":"open";this.dispatchEvent(new CustomEvent("drawer-toggle",{detail:{action:p},bubbles:!0,composed:!0}));return}}),this.shadowRoot.addEventListener("input",(t)=>{let o=t.target;if(o.id==="search-input"){let r=o.value;this.state.searchQuery=r;let i=this.shadowRoot.getElementById("search-clear");if(i)i.style.display=r?"flex":"none";this.dispatchEvent(new CustomEvent("search-input",{detail:{query:r},bubbles:!0,composed:!0}))}}),this.shadowRoot.addEventListener("keydown",(t)=>{let o=t.target,r=t;if(o.id==="search-input"&&r.key==="Escape")o.value="",this.setState({searchActive:!1}),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0})),o.blur()}),this._windowClickHandler=(t)=>{if(this.state.addMenuActive)this.setState({addMenuActive:!1});let o=t.composedPath(),r=this.shadowRoot.getElementById("search-wrapper");if(this.state.searchActive&&r&&!o.includes(r)){let i=this.shadowRoot.getElementById("search-input");if(i&&i.value==="")this.setState({searchActive:!1})}},window.addEventListener("click",this._windowClickHandler)}render(){let t=this.getAttribute("title")||"Lastboard";this.shadowRoot.innerHTML=`
            <style>${Dt}</style>
            ${Ct({title:t,editMode:this.state.editMode,searchActive:this.state.searchActive,addMenuActive:this.state.addMenuActive,drawerOpen:this.state.drawerOpen,searchQuery:this.state.searchQuery,user:this.state.user,updateAvailable:this.state.updateAvailable})}
        `}}if(!customElements.get("app-topbar"))customElements.define("app-topbar",Wt);y();var It=({title:t,dropdownOpen:o})=>`
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
                    <div class="header__dropdown-item" style="border-top: 1px solid var(--border-color); color: var(--danger-color);">${a.t("auth.sign_out")}</div>
                </div>
            </div>
        </div>
    </header>
`;var St=`.header {
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
}`;class to extends HTMLElement{dropdownOpen;constructor(){super();this.attachShadow({mode:"open"}),this.dropdownOpen=!1}connectedCallback(){this.render(),this.setupListeners()}toggleDropdown(t){this.dropdownOpen=typeof t==="boolean"?t:!this.dropdownOpen,this.render()}setupListeners(){this.shadowRoot.addEventListener("click",(t)=>{let o=t.target,r=o.closest(".header__btn-changelog");if(r)r.style.display="none";if(o.closest("#profile-trigger"))t.stopPropagation(),this.toggleDropdown()}),window.addEventListener("click",()=>{if(this.dropdownOpen)this.toggleDropdown(!1)})}render(){let t=this.getAttribute("title")||"Task";this.shadowRoot.innerHTML=`
            <style>${St}</style>
            ${It({title:t,dropdownOpen:this.dropdownOpen})}
        `}}if(!customElements.get("app-header"))customElements.define("app-header",to);y();var T=(t)=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),Wo=(t)=>{if(!t)return"#";let o=t.trim().toLowerCase();if(o.startsWith("http://")||o.startsWith("https://")||o==="#")return T(t);return"#"},oo=({bookmarks:t,isEditing:o,isLoading:r,isSearching:i,isTouchDevice:n,maxCols:e=12})=>{let s=Array.isArray(t)?t:[];if(r&&s.length===0)return So(e);let d=(c)=>s.filter((l)=>l.parent_id===c);return`
    ${(n?s:i?s:s.filter((c)=>!c.parent_id)).map((c)=>{let l={};try{l=typeof c.content==="string"?JSON.parse(c.content):c.content}catch(k){console.error("Failed to parse content for item",c.id,k)}let f=c.type==="section",v={x:c.x||1,y:c.y||1},x=Math.min(c.w||1,e),m=c.h||1;if(f){let k=d(c.id),u=(l.title||"").trim();return`
            <fieldset class="bookmark-grid__section"
               data-id="${c.id}"
               data-orig-x="${c.x}" data-orig-y="${c.y}"
               draggable="${o}"
               style="--x: ${v.x}; --y: ${v.y}; --w: ${x}; --h: ${m};">
               ${u?`<legend class="section-title">${T(u)}</legend>`:""}
               <div class="bookmark-grid__nested-content" style="width: 100%; height: 100%;">
                   ${Io(k,o,!0,x,n)}
               </div>
               ${o?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
                <div class="resize-handle"></div>
               `:""}
            </fieldset>`}return ro(c,l,o,v,x,m,n)}).join("")}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
    `};function ro(t,o,r,i,n,e=0,s=!1){let d=e||t.h||1;if(t.type==="widget"){let v=o.widgetId,m={clock:"widget-clock",notepad:"widget-notepad",telemetry:"widget-telemetry",weather:"widget-weather",markdown:"widget-markdown"}[v]||"div",u=(o.text||"").replace(/"/g,"&quot;");return`
        <div class="bookmark-grid__card"
            draggable="${r}"
            data-id="${t.id}"
            data-type="${t.type}"
            data-orig-x="${t.x}" data-orig-y="${t.y}"
            ${!s?`style="--x: ${i.x}; --y: ${i.y}; --w: ${n}; --h: ${d};"`:""}>

            <${m}
                item-id="${t.id}"
                ${v==="notepad"?`content="${u}"`:""}
            ></${m}>

            ${r?`
            <div class="bookmark-actions">
                 ${["clock","telemetry","weather"].includes(v)?`<button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>`:""}
                 <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
            </div>
            ${["clock","telemetry"].includes(v)?"":'<div class="resize-handle"></div>'}
            `:""}
        </div>
    `}let p=o.icon||"",l=p.startsWith("http")||p.startsWith("/")?`<img src="${T(p)}" alt="${T(o.label)}" class="bookmark-grid__icon-img" draggable="false" />`:p?T(p):'<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>';return`
        <a ${r?'role="button"':`href="${Wo(o.url)}" target="_blank"`} class="bookmark-grid__card"
           draggable="${r}"
           data-id="${t.id}"
           data-type="${t.type}"
           data-orig-x="${t.x}" data-orig-y="${t.y}"
           ${!s?`style="--x: ${i.x}; --y: ${i.y}; --w: ${n}; --h: ${d};"`:""}>
            
            ${r?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
            `:""}

            <div class="bookmark-grid__icon-container">
                ${l}
            </div>
            <span class="bookmark-grid__label">${T(o.label)||"Bookmark"}</span>
            
            ${r&&t.type==="section"?'<div class="resize-handle"></div>':""}
            
            ${o.statusCheck?`
                <div class="status-indicator ${t.status?`status-${t.status}`:""}" 
                     title="${t.status==="up"?a.t("status.online"):t.status==="down"?a.t("status.unreachable"):t.status==="pending"?a.t("status.checking"):a.t("general.pinging")}">
                </div>
            `:""}
        </a>
    `}function Io(t,o,r=!1,i=12,n=!1){return t.map((e)=>{let s={};try{s=typeof e.content==="string"?JSON.parse(e.content):e.content}catch(l){console.error("Failed to parse content for item (nested)",e.id,l)}let d={x:e.x||1,y:e.y||1},p=e.h||1,c=Math.min(e.w||1,i);return ro(e,s,o,d,c,p,n)}).join("")}function So(t){return`
        <style>
            .skeleton {
                background: var(--surface);
                pointer-events: none;
                animation: skeleton-shimmer 1.5s infinite linear;
                background: linear-gradient(
                    90deg,
                    var(--surface) 25%,
                    var(--border) 50%,
                    var(--surface) 75%
                );
                background-size: 200% 100%;
            }
            .skeleton-icon {
                width: 40px;
                height: 40px;
                background: var(--border);
                border-radius: 50%;
                margin-bottom: 12px;
            }
            .skeleton-text {
                width: 60%;
                height: 8px;
                background: var(--border);
                border-radius: 4px;
            }
            @keyframes skeleton-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        </style>
        ${Array(8).fill(null).map((r,i)=>`
            <div class="bookmark-grid__card skeleton" style="--x: ${i%t+1}; --y: ${Math.floor(i/t)+1}; --w: 1; --h: 1;">
                <div class="skeleton-icon"></div>
                <div class="skeleton-text"></div>
            </div>
        `).join("")}
    `}L();B();y();y();L();class io extends HTMLElement{timer;timeEl=null;dateEl=null;_unsubscribe=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}isEditing=!1;configMode=!1;_config={timezone:"local",hour12:!1,showDate:!0};_itemId=0;static get observedAttributes(){return["item-id","content","mode"]}attributeChangedCallback(t,o,r){if(t==="item-id")this._itemId=parseInt(r);if(t==="content")try{let i=typeof r==="string"?JSON.parse(r):r;if(i&&typeof i==="object")this._config={...this._config,...i},this.updateTime()}catch(i){}}connectedCallback(){this.render(),this.updateTime(),this.timer=setInterval(()=>{this.updateTime()},1000),this._unsubscribe=g.subscribe((t)=>{if(this.isEditing!==t.isEditing)this.isEditing=t.isEditing,this.render();if(this._itemId){let o=t.items.find((r)=>r.id===this._itemId);if(o&&o.content)try{let r=typeof o.content==="string"?JSON.parse(o.content):o.content;if(r.widgetId==="clock")this._config={...this._config,...r},this.updateTime()}catch(r){}}}),this._unsubscribeI18n=a.subscribe(()=>{this.updateTime()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this.timer)clearInterval(this.timer)}updateTime(){if(!this.timeEl||!this.dateEl)return;let t=new Date,o={hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:this._config.hour12},r=void 0;if(this._config.timezone&&this._config.timezone!=="local")r=this._config.timezone;let i=a.getLocale().code;try{let s=new Intl.DateTimeFormat(i,{...o,timeZone:r}).formatToParts(t).map((d)=>{if(d.type==="dayPeriod")return`<span class="ampm">${d.value.toUpperCase().replace(/\./g,"").trim()}</span>`;return d.value}).join("");this.timeEl.innerHTML=s}catch(n){this.timeEl.textContent=t.toLocaleTimeString()}if(this._config.showDate){let n={weekday:"long",day:"numeric",month:"long",timeZone:r};this.dateEl.textContent=t.toLocaleDateString(i,n),this.dateEl.style.display="block"}else this.dateEl.style.display="none"}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    color: var(--text-main);
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
        `,this.timeEl=this.shadowRoot.querySelector(".time"),this.dateEl=this.shadowRoot.querySelector(".date")}}customElements.define("widget-clock",io);L();y();class Q{static parse(t){try{if(typeof t==="object"&&t!==null)return t;if(typeof t==="string"){let o=JSON.parse(t);if(typeof o==="object"&&o!==null)return o}return{widgetId:"unknown"}}catch(o){return console.warn("[WidgetContentHelper] Failed to parse content:",o),{widgetId:"unknown"}}}static serialize(t){try{return JSON.stringify(t)}catch(o){return console.error("[WidgetContentHelper] Failed to serialize content:",o),"{}"}}static getNotepadText(t){return this.parse(t).text||""}static setNotepadText(t,o){let i={...this.parse(t),widgetId:"notepad",text:o};return this.serialize(i)}static merge(t,o){let i={...this.parse(t),...o};return this.serialize(i)}static validate(t,o){return this.parse(t).widgetId===o}static getMarkdownText(t){return this.parse(t).text||""}static setMarkdownText(t,o){let i={...this.parse(t),widgetId:"markdown",text:o};return this.serialize(i)}}var _={undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M5 12l6-6"/><path d="M5 12l6 6"/></svg>',redo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M19 12l-6-6"/><path d="M19 12l-6 6"/></svg>',h1:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M19 18V6l-2 2"/></svg>',h2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-5 4-8a2 2 0 0 0-4 0"/></svg>',h3:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0-5H20"/></svg>',bold:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>',italic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',underline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',strike:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.3 19c-1.4 1.4-3.5 1.4-5.2-.2-1.9-1.9-1.9-5.2 0-7.2l.6-.6c2.2-2.2 6.6-2.2 9.1.5"/><line x1="4" y1="12" x2="20" y2="12"/><path d="M10.2 6c1.6-1.5 3.9-1.5 5.5.1"/></svg>',color:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',alignLeft:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',alignCenter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>',alignRight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',alignJustify:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',ordered:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 12l2 2 4-4"/></svg>',quote:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>',code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',eraser_clean:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"/><path d="M11 3L20 12"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',unlock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',resize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 9V6a2 2 0 0 0-2-2h-3"/><path d="M3 15v3a2 2 0 0 0 2 2h3"/><path d="M16 20h3a2 2 0 0 0 2-2v-3"/><path d="M8 4H5a2 2 0 0 0-2 2v3"/></svg>'},tr=`
:host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    /* V10: Allow dock to overlap parent padding */
    overflow: visible !important;
    position: relative;
    
    --lb-bg: var(--bg-card, #1a1a1a);
    --lb-text: var(--text-main, #ffffff);
    --lb-text-dim: var(--text-dim, rgba(255,255,255,0.5));
    --lb-accent: var(--accent, #0078D4);
    --lb-accent-rgb: var(--accent-rgb, 0, 120, 212);
    --lb-border: var(--border, rgba(255,255,255,0.1));

    /* Clean fix - remove redundant host padding hack */
    color: var(--lb-text);
    font-family: 'Inter', system-ui, sans-serif;
}

/* ── Editor Container ──────────────────────────────────────────────── */
.editor-container {
    flex: 1;
    overflow-y: auto;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    outline: none;
    position: relative;
}

/* ── ContentEditable ───────────────────────────────────────────────── */
.editor {
    background: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    
    padding: 12px 14px 40px 14px !important; 
    
    min-height: calc(100% - 52px); /* 12px top + 40px bottom */
    line-height: 1.6;
    font-size: 0.95rem;
    color: var(--lb-text);
    caret-color: var(--lb-accent);
    position: relative; /* Context for absolute placeholder */
}

.editor:empty::before,
.editor.is-empty::before {
    content: attr(data-placeholder);
    color: var(--lb-text-dim);
    opacity: 0.4;
    pointer-events: none;
    position: absolute;
    top: 12px;
    left: 14px;
}

/* Hide placeholder when locked */
:host(.locked) .editor::before,
.editorContext.locked .editor::before,
.editor-container.locked .editor::before {
    display: none !important;
}

.editor[contenteditable="false"] { opacity: 1; cursor: default; }


.editor a { color: var(--lb-accent); text-decoration: underline; cursor: pointer; }
.editor img { max-width: 100%; height: auto; border-radius: 8px; margin: 4px 0; }

/* Blocks */
.editor h1 { font-size: 1.7em; font-weight: 700; margin: 0.6em 0 0.3em 0; color: var(--lb-text); line-height: 1.2; }
.editor h2 { font-size: 1.4em; font-weight: 600; margin: 0.6em 0 0.3em 0; color: var(--lb-text); opacity: 0.95; }
.editor h3 { font-size: 1.15em; font-weight: 600; margin: 0.5em 0 0.3em 0; color: var(--lb-text); opacity: 0.9; }
.editor p { margin: 0.5em 0; }
.editor ul, .editor ol { margin: 0.5em 0; padding-left: 1.4em; color: var(--lb-text-dim); }
.editor li { margin-bottom: 0.2em; padding-left: 0.2em; color: var(--lb-text); }
.editor blockquote {
    border-left: 3px solid var(--lb-accent);
    margin: 0.8em 0;
    padding: 6px 12px;
    background: linear-gradient(90deg, rgba(var(--lb-accent-rgb), 0.1) 0%, transparent 100%);
    color: var(--lb-text-dim);
    font-style: italic;
    border-radius: 0 6px 6px 0;
}
.editor pre {
    background: rgba(0,0,0,0.3);
    padding: 10px;
    border-radius: 6px;
    font-family: monospace;
    overflow-x: auto;
    border: 1px solid var(--lb-border);
    margin: 0.8em 0;
    font-size: 0.9em;
}

.checkbox-char { cursor: pointer; font-family: 'Inter', sans-serif; margin-right: 6px; user-select: none; display: inline-block; vertical-align: middle; font-size: 1.1em; }
.checkbox-char.checked { color: var(--lb-accent); }

/* ── "Dock" (Transparent) ──────────────────────────────────── */
.glass-dock {
    position: absolute;
    /* V11: Extreme Negative bottom to consume parent padding */
    bottom: -25px; 
    left: 8px; right: 8px; 
    margin-bottom: 0 !important;
    
    display: flex;
    flex-wrap: wrap; 
    justify-content: center;
    align-items: center;
    gap: 2px; 
    
    background: rgba(20, 20, 20, 0.95);
    /* Reduced border radius so it sits flatter */
    border-radius: 8px; 
    border: 1px solid rgba(255,255,255,0.06); 
    /* Minimal padding */
    padding: 2px 4px;
    
    transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    opacity: 0.95;
    z-index: 100;
}
.glass-dock:hover, .glass-dock:focus-within {
    opacity: 1;
    background: rgba(20, 20, 20, 1);
    /* REMOVED translateY so it doesn't jump up */
    transform: none; 
}
.glass-dock.hidden {
    opacity: 0; pointer-events: none; transform: translateY(20px);
}

.dock-group {
    display: flex; align-items: center; gap: 0; 
    padding: 0 2px;
    border-right: 1px solid rgba(255,255,255,0.08); 
    flex-shrink: 0; 
}
.dock-group:last-child { border-right: none; }

.dock-btn {
    background: transparent; border: none; color: var(--lb-text-dim);
    width: 26px; height: 26px; 
    border-radius: 4px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.1s;
    flex-shrink: 0;
    position: relative; 
}
.dock-btn svg { width: 14px; height: 14px; }
.dock-btn:hover { background: rgba(255,255,255,0.08); color: var(--lb-text); }
.dock-btn input[type="color"] {
    position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;
}

/* ── Glass Modal ────────────────────────────────────────────────── */
.glass-modal {
    position: absolute; top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
    display: flex; align-items: center; justify-content: center;
    z-index: 500; opacity: 0; pointer-events: none; transition: opacity 0.2s;
}
.glass-modal.visible { opacity: 1; pointer-events: all; }
.modal-content {
    background: #1a1a1a; border: 1px solid var(--lb-border);
    border-radius: 10px; padding: 14px; width: 260px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.7);
    display: flex; flex-direction: column; gap: 10px;
}
.modal-title { font-weight: 600; font-size: 0.85em; margin-bottom: 2px; letter-spacing: 0.02em; text-transform: uppercase; opacity: 0.7; }
.modal-input {
    background: rgba(20,20,20,0.5); border: 1px solid var(--lb-border);
    border-radius: 6px; padding: 8px; color: var(--lb-text);
    font-family: inherit; outline: none; font-size: 0.9em;
}
.modal-input:focus { border-color: var(--lb-accent); background: rgba(0,0,0,0.2); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
.modal-btn {
    padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;
    font-size: 0.8em; font-weight: 600;
}
.modal-btn.cancel { background: transparent; color: var(--lb-text-dim); }
.modal-btn.confirm { background: var(--lb-accent); color: white; }

/* ── Lock Button ──────────────────────────────────────────────────── */
.top-lock-btn {
    position: absolute; top: 8px; right: 8px;
    width: 28px; height: 28px;
    border: none; background: rgba(0,0,0,0.2); 
    backdrop-filter: blur(4px); border-radius: 6px;
    color: var(--lb-text-dim); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; z-index: 200;
    border: 1px solid rgba(255,255,255,0.05); opacity: 0; 
}
:host(:hover) .top-lock-btn { opacity: 1; }
.top-lock-btn:hover { background: rgba(255,255,255,0.2); color: var(--lb-text); transform:scale(1.05); }
.top-lock-btn.locked { color: #ff453a; background: rgba(255, 69, 58, 0.15); border-color: rgba(255, 69, 58, 0.3); }

/* ── Sync Indicator ───────────────────────────────────────────────── */
.sync-status {
    position: absolute; bottom: 12px; right: 12px;
    display: flex; align-items: center; gap: 8px;
    pointer-events: none; opacity: 0; transition: opacity 0.3s;
}
.sync-status.visible { opacity: 1; }
.sync-dot { width: 5px; height: 5px; border-radius: 50%; background-color: var(--lb-text-dim); transition: background-color 0.3s; }
.sync-status.saving .sync-dot { background-color: var(--lb-accent); box-shadow: 0 0 6px var(--lb-accent); animation: pulse 1.5s infinite; }
.sync-status.saved .sync-dot { background-color: #2ecc71; box-shadow: 0 0 6px #2ecc71; }
.sync-status.dirty .sync-dot { background-color: #e67e22; transform: scale(0.9); }
.sync-status.error .sync-dot { background-color: #e74c3c; }

/* ── Image Resizer Button ────────────────────────────────────────── */
.img-resizer {
    position: absolute;
    width: 28px; height: 28px;
    background: rgba(var(--lb-accent-rgb), 0.95);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 6px;
    color: white; cursor: pointer;
    display: none; align-items: center; justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 400;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.img-resizer.visible { display: flex; }
.img-resizer:hover { transform: scale(1.1); background: var(--lb-accent); }
.img-resizer svg { width: 14px; height: 14px; }

@keyframes pulse { 0% { opacity: 0.5; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } 100% { opacity: 0.5; transform: scale(0.9); } }
`;class ao extends HTMLElement{_itemId=0;_content="";_isDirty=!1;_isLocked=!0;_isSaving=!1;_lastLockTime=0;_editor=null;_syncStatus=null;_dock=null;_editorContainer=null;_modal=null;_imgResizer=null;_activeImage=null;_pendingAction=null;static get observedAttributes(){return["item-id"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.loadContent(),window.addEventListener("beforeunload",this.handleBeforeUnload.bind(this)),a.subscribe(()=>{if(this._editor)this._editor.dataset.placeholder=a.t("widget.notepad.placeholder")})}disconnectedCallback(){window.removeEventListener("beforeunload",this.handleBeforeUnload.bind(this))}attributeChangedCallback(t,o,r){if(t==="item-id")this._itemId=parseInt(r),this.loadContent()}handleBeforeUnload(t){if(this._isDirty)t.preventDefault(),t.returnValue=""}render(){if(!this.shadowRoot)return;let t=this._isLocked?"locked":"unlocked",o=this._isLocked?"locked":"",r=this._isLocked?"hidden":"";this.shadowRoot.innerHTML=`
            <style>
                ${tr}
                /* V13: Override colors for inverted logic */
                .top-lock-btn {
                    /* Default (Unlocked/Edit Mode) -> Red/Alert */
                    color: #ff453a; 
                    background: rgba(255, 69, 58, 0.15); 
                    border-color: rgba(255, 69, 58, 0.3);
                }
                .top-lock-btn.locked {
                    /* Locked (Safe Mode) -> Dim/Gray */
                    color: var(--lb-text-dim); 
                    background: rgba(0,0,0,0.2); 
                    border-color: rgba(255,255,255,0.05);
                }
                .top-lock-btn.locked:hover {
                    background: rgba(255,255,255,0.1);
                    color: var(--lb-text);
                }
            </style>
            
             <button class="top-lock-btn ${t}" id="lock-btn" title="${this._isLocked?a.t("widget.notepad.tool.unlock"):a.t("widget.notepad.tool.lock")}">
                ${this._isLocked?_.lock:_.unlock}
            </button>

            <div class="editor-container ${o}">
                <div class="editor" contenteditable="${!this._isLocked}" data-placeholder="${a.t("widget.notepad.placeholder")}"></div>
            </div>

            <div class="glass-dock ${r}" id="glass-dock">
                <div class="dock-group">
                    <button class="dock-btn" data-fmt="undo" title="${a.t("widget.notepad.tool.undo")}">${_.undo}</button>
                    <button class="dock-btn" data-fmt="redo" title="${a.t("widget.notepad.tool.redo")}">${_.redo}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="formatBlock:H1" title="${a.t("widget.notepad.tool.h1")}" style="width:30px;">${_.h1}</button>
                    <button class="dock-btn" data-fmt="formatBlock:H2" title="${a.t("widget.notepad.tool.h2")}" style="width:30px;">${_.h2}</button>
                    <button class="dock-btn" data-fmt="formatBlock:H3" title="${a.t("widget.notepad.tool.h3")}" style="width:30px;">${_.h3}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="bold" title="${a.t("widget.notepad.tool.bold")}">${_.bold}</button>
                    <button class="dock-btn" data-fmt="italic" title="${a.t("widget.notepad.tool.italic")}">${_.italic}</button>
                    <button class="dock-btn" data-fmt="underline" title="${a.t("widget.notepad.tool.underline")}">${_.underline}</button>
                    <button class="dock-btn" data-fmt="strikeThrough" title="${a.t("widget.notepad.tool.strike")}">${_.strike}</button>
                    <button class="dock-btn" title="${a.t("widget.notepad.tool.color")}">
                        ${_.color}
                        <input type="color" id="color-picker">
                    </button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="justifyLeft" title="${a.t("widget.notepad.tool.left")}">${_.alignLeft}</button>
                    <button class="dock-btn" data-fmt="justifyCenter" title="${a.t("widget.notepad.tool.center")}">${_.alignCenter}</button>
                    <button class="dock-btn" data-fmt="justifyRight" title="${a.t("widget.notepad.tool.right")}">${_.alignRight}</button>
                    <button class="dock-btn" data-fmt="justifyFull" title="${a.t("widget.notepad.tool.justify")}">${_.alignJustify}</button>
                </div>

                <div class="dock-group">
                     <button class="dock-btn" id="btn-link" title="${a.t("widget.notepad.tool.link")}">${_.link}</button>
                     <button class="dock-btn" id="btn-image" title="${a.t("widget.notepad.tool.image")}">${_.image}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="insertUnorderedList" title="${a.t("widget.notepad.tool.bullet")}">${_.list}</button>
                    <button class="dock-btn" data-fmt="insertOrderedList" title="${a.t("widget.notepad.tool.number")}">${_.ordered}</button>
                    <button class="dock-btn" data-fmt="insertChecklist" title="${a.t("widget.notepad.tool.check")}">${_.check}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="formatBlock:BLOCKQUOTE" title="${a.t("widget.notepad.tool.quote")}">${_.quote}</button>
                     <button class="dock-btn" data-fmt="formatBlock:PRE" title="${a.t("widget.notepad.tool.code")}">${_.code}</button>
                    <button class="dock-btn" data-fmt="removeFormat" title="${a.t("widget.notepad.tool.clear")}">${_.eraser_clean}</button>
                </div>
            </div>

            <div class="glass-modal" id="glass-modal">
                <div class="modal-content">
                    <div class="modal-title" id="modal-title">${a.t("widget.notepad.modal.title")}</div>
                    <input type="text" class="modal-input" id="modal-input-1">
                    <input type="text" class="modal-input" id="modal-input-2" style="display:none">
                    <div class="modal-actions">
                        <button class="modal-btn cancel" id="modal-cancel">${a.t("general.cancel")}</button>
                        <button class="modal-btn confirm" id="modal-confirm">${a.t("general.confirm")}</button>
                    </div>
                </div>
            </div>

            <div class="sync-status" id="sync-status">
                <div class="sync-dot"></div>
            </div>

             <button class="img-resizer" id="img-resizer" title="${a.t("widget.notepad.tool.update_image")}">
                ${_.resize}
             </button>
        `,this._editor=this.shadowRoot.querySelector(".editor"),this._editorContainer=this.shadowRoot.querySelector(".editor-container"),this._syncStatus=this.shadowRoot.querySelector("#sync-status"),this._dock=this.shadowRoot.querySelector("#glass-dock"),this._modal=this.shadowRoot.querySelector("#glass-modal"),this._imgResizer=this.shadowRoot.querySelector("#img-resizer"),this.bindEvents()}bindEvents(){if(!this._editor)return;this._editor.addEventListener("input",(r)=>this.handleInput(r)),this._editor.addEventListener("keydown",(r)=>this.handleKeydown(r)),this._editor.addEventListener("paste",(r)=>this.handlePaste(r)),this._editor.addEventListener("click",(r)=>this.handleEditorClick(r));let t=this.shadowRoot?.querySelector("#lock-btn");if(t)t.addEventListener("click",(r)=>{r.preventDefault(),r.stopImmediatePropagation();let i=Date.now();if(i-this._lastLockTime<300)return;this._lastLockTime=i,this.toggleLock()}),t.addEventListener("mousedown",(r)=>r.stopPropagation());this.shadowRoot?.querySelectorAll(".dock-btn[data-fmt]").forEach((r)=>{r.addEventListener("mousedown",(i)=>{if(i.preventDefault(),this._isLocked)return;let n=i.currentTarget.dataset.fmt;if(n)if(n.includes(":")){let[e,s]=n.split(":");this.executeFormat(e,s)}else this.executeFormat(n)})});let o=this.shadowRoot?.querySelector("#color-picker");if(o)o.addEventListener("input",(r)=>{let i=r.target.value;this.executeFormat("foreColor",i)});this.shadowRoot?.querySelector("#btn-link")?.addEventListener("click",()=>this.openModal("link")),this.shadowRoot?.querySelector("#btn-image")?.addEventListener("click",()=>this.openModal("image")),this.shadowRoot?.querySelector("#modal-cancel")?.addEventListener("click",()=>this.closeModal()),this.shadowRoot?.querySelector("#modal-confirm")?.addEventListener("click",()=>this.handleModalConfirm()),this._imgResizer?.addEventListener("click",()=>this.openModal("image-edit")),this._editorContainer?.addEventListener("scroll",()=>this.hideResizer())}openModal(t){if(!this._modal||this._isLocked)return;this._pendingAction=t;let o=this.shadowRoot?.querySelector("#modal-title"),r=this.shadowRoot?.querySelector("#modal-input-1"),i=this.shadowRoot?.querySelector("#modal-input-2");if(r)r.value="";if(i)i.value="";if(t==="link"){if(o)o.textContent=a.t("widget.notepad.modal.link_title");if(r)r.placeholder=a.t("widget.notepad.modal.placeholder_url");if(i)i.style.display="none"}else if(t==="image"){if(o)o.textContent=a.t("widget.notepad.modal.image_title");if(r)r.placeholder=a.t("widget.notepad.modal.placeholder_img");if(i)i.style.display="block",i.placeholder=a.t("widget.notepad.modal.placeholder_width")}else if(t==="image-edit"&&this._activeImage){if(o)o.textContent=a.t("widget.notepad.modal.image_edit_title");if(r)r.placeholder=a.t("widget.notepad.modal.placeholder_img"),r.value=this._activeImage.src;if(i)i.style.display="block",i.placeholder=a.t("widget.notepad.modal.placeholder_width"),i.value=this._activeImage.style.width||""}this._modal.classList.add("visible"),setTimeout(()=>r?.focus(),50)}closeModal(){if(this._modal)this._modal.classList.remove("visible");this._pendingAction=null,this._editor?.focus()}handleModalConfirm(){let t=this.shadowRoot?.querySelector("#modal-input-1"),o=this.shadowRoot?.querySelector("#modal-input-2"),r=t?.value,i=o?.value;if(!r){this.closeModal();return}if(this._editor?.focus(),this._pendingAction==="link")document.execCommand("createLink",!1,r);else if(this._pendingAction==="image"){let n=i?` style="width:${i}; max-width:100%;"`:' style="max-width:100%;"',e=`<img src="${r}"${n} />`;document.execCommand("insertHTML",!1,e)}else if(this._pendingAction==="image-edit"&&this._activeImage){if(this._activeImage.src=r,i)this._activeImage.style.width=i;else this._activeImage.style.width="";this._isDirty=!0,this.setStatus("dirty")}this.closeModal(),this.hideResizer()}executeFormat(t,o){if(this._editor?.focus(),t==="insertChecklist")document.execCommand("insertHTML",!1,'<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;');else if(t==="removeFormat")document.execCommand("removeFormat"),document.execCommand("formatBlock",!1,"p"),document.execCommand("unlink");else document.execCommand(t,!1,o)}toggleLock(){if(this._isLocked=!this._isLocked,this.updateLockState(),this._isLocked&&this._isDirty)this.save()}updateLockState(){if(this._editor)this._editor.contentEditable=this._isLocked?"false":"true";let t=this.shadowRoot?.querySelector("#lock-btn");if(t)t.classList.toggle("locked",this._isLocked),t.innerHTML=this._isLocked?_.lock:_.unlock,t.setAttribute("title",this._isLocked?a.t("widget.notepad.tool.unlock"):a.t("widget.notepad.tool.lock"));if(this._dock)if(this._isLocked)this._dock.classList.add("hidden");else this._dock.classList.remove("hidden");if(this._editorContainer)this._editorContainer.classList.toggle("locked",this._isLocked);if(!this._isLocked&&this._editor)setTimeout(()=>{this._editor?.focus()},10)}handleInput(t){if(this._isLocked)return;this.hideResizer(),this.checkPlaceholder(),this._isDirty=!0,this.setStatus("dirty"),this.checkInputRules()}handleEditorClick(t){if(this._isLocked)return;let o=t.target;if(o instanceof HTMLImageElement){this._activeImage=o,this.showResizer(o);return}else if(!o.closest("#img-resizer"))this.hideResizer(),this._activeImage=null;if(o.classList.contains("checkbox-char")){if(t.preventDefault(),t.stopPropagation(),o.textContent==="☐")o.textContent="☑",o.classList.add("checked");else o.textContent="☐",o.classList.remove("checked");this._isDirty=!0,this.setStatus("dirty")}}showResizer(t){if(!this._imgResizer)return;let o=t.getBoundingClientRect(),r=this.getBoundingClientRect(),i=o.top-r.top,n=o.right-r.left;this._imgResizer.style.top=`${i+8}px`,this._imgResizer.style.left=`${n-36}px`,this._imgResizer.classList.add("visible")}hideResizer(){this._imgResizer?.classList.remove("visible")}handleKeydown(t){if(this._isLocked)return;if(t.key==="Tab")t.preventDefault(),document.execCommand("insertText",!1,"  ");let o=(i)=>/^[☐☑]/.test(i.trim()),r=(i)=>i.replace(/[☐☑\s\u00A0\u200B]/g,"").length===0;if(t.key==="Enter"){let i=this.getSelection();if(i&&i.anchorNode){let n=i.anchorNode,e=n.nodeType===Node.TEXT_NODE?n.parentElement:n,s=e?.textContent||"";if(o(s)){if(r(s))if(t.preventDefault(),document.execCommand("delete"),e.tagName==="DIV"||e.tagName==="P")e.innerHTML="<br>";else document.execCommand("insertHTML",!1,"<br>");else{t.preventDefault();let d=e;while(d&&d!==this._editor&&d.tagName!=="DIV"&&d.tagName!=="P")d=d.parentElement;if(!d||d===this._editor)document.execCommand("insertHTML",!1,'<br><span class="checkbox-char" contenteditable="false">☐</span>&nbsp;');else{let p=document.createElement(d.tagName);if(d instanceof HTMLElement)p.style.textAlign=d.style.textAlign;if(p.innerHTML='<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;',d.nextSibling)d.parentNode?.insertBefore(p,d.nextSibling);else d.parentNode?.appendChild(p);let c=document.createRange();c.selectNodeContents(p),c.collapse(!1);let l=this.getSelection();l.removeAllRanges(),l.addRange(c)}}return}}}if(t.key==="Backspace"){let i=this.getSelection();if(i&&i.isCollapsed&&i.anchorNode){let n=i.anchorNode,e=n.nodeType===Node.TEXT_NODE?n.parentElement:n,s=e?.textContent||"";if(o(s)&&r(s)){if(t.preventDefault(),e.tagName==="DIV"||e.tagName==="P")e.innerHTML="<br>";else document.execCommand("delete");return}if(i.anchorOffset===0){if(n.nodeType===Node.TEXT_NODE){let d=n.previousSibling;if(d&&d.nodeType===Node.ELEMENT_NODE&&d.classList.contains("checkbox-char")){t.preventDefault(),d.remove();return}}}if(n.nodeType===Node.ELEMENT_NODE&&i.anchorOffset>0){let d=n.childNodes[i.anchorOffset-1];if(d&&d.nodeType===Node.ELEMENT_NODE&&d.classList.contains("checkbox-char")){t.preventDefault(),d.remove();return}}}}if((t.ctrlKey||t.metaKey)&&t.key==="s")t.preventDefault(),this.save()}handlePaste(t){if(this._isLocked)return;t.preventDefault();let o=t.clipboardData?.getData("text/plain")??"";document.execCommand("insertText",!1,o)}checkInputRules(){let t=this.getSelection();if(!t||!t.isCollapsed)return;let o=t.anchorNode;if(!o||o.nodeType!==Node.TEXT_NODE)return;let r=o.textContent||"",i=t.anchorOffset,n=r.slice(0,i),e=[{match:/^#\s$/,cmd:"formatBlock",val:"H1"},{match:/^##\s$/,cmd:"formatBlock",val:"H2"},{match:/^###\s$/,cmd:"formatBlock",val:"H3"},{match:/^>\s$/,cmd:"formatBlock",val:"BLOCKQUOTE"},{match:/^-\s$/,cmd:"insertUnorderedList",val:null},{match:/^\*\s$/,cmd:"insertUnorderedList",val:null},{match:/^1\.\s$/,cmd:"insertOrderedList",val:null},{match:/^\[\]\s$/,cmd:"insertChecklist",val:null},{match:/^---\s$/,cmd:"insertHorizontalRule",val:null}];for(let s of e)if(s.match.test(n)){let d=document.createRange();if(d.setStart(o,0),d.setEnd(o,i),d.deleteContents(),s.cmd==="insertChecklist")document.execCommand("insertHTML",!1,'<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;');else if(s.cmd==="insertHorizontalRule")document.execCommand("insertHorizontalRule");else document.execCommand(s.cmd,!1,s.val);return}}checkPlaceholder(){if(!this._editor)return;if(this._editor.innerText.trim()===""&&this._editor.querySelectorAll("img").length===0)this._editor.classList.add("is-empty");else this._editor.classList.remove("is-empty")}async loadContent(){if(!this._itemId)return;let o=g.getState().items.find((r)=>r.id===this._itemId);if(o){let i=Q.parse(o.content).text||"";if(this._editor&&this._editor.innerHTML!==i)this._editor.innerHTML=i;this._content=i,this.checkPlaceholder()}}async save(t=!1){if(!this._itemId||!this._editor)return;let o=this._editor.innerHTML;this._isSaving=!0,this.setStatus("saving");try{let i=g.getState().items.find((n)=>n.id===this._itemId);if(i){let n=Q.setNotepadText(i.content,o);g.updateItem({...i,content:n}).then(()=>{this._isDirty=!1,this.setStatus("saved")})}}catch(r){console.error(r),this.setStatus("error")}finally{this._isSaving=!1}}setStatus(t){if(!this._syncStatus)return;switch(this._syncStatus.className="sync-status",this._syncStatus.classList.add("visible"),t){case"saving":this._syncStatus.classList.add("saving");break;case"saved":this._syncStatus.classList.add("saved"),setTimeout(()=>{this._syncStatus?.classList.remove("visible")},2000);break;case"dirty":this._syncStatus.classList.add("dirty");break;case"error":this._syncStatus.classList.add("error");break;case"idle":this._syncStatus.classList.remove("visible");break}}getSelection(){let t=this.shadowRoot;return t.getSelection?t.getSelection():document.getSelection()}}customElements.define("widget-notepad",ao);y();L();class no extends HTMLElement{cpuBar=null;ramBar=null;tempBar=null;cpuText=null;ramText=null;tempText=null;_unsubscribe;_unsubscribeI18n;_itemId=0;_interval=1000;lastUpdate=0;static get observedAttributes(){return["item-id","content"]}attributeChangedCallback(t,o,r){if(t==="item-id")this._itemId=parseInt(r);if(t==="content")try{let i=typeof r==="string"?JSON.parse(r):r;if(i&&i.interval)this._interval=parseInt(i.interval)}catch(i){}}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:"open"});if(!this.cpuBar)this.render();if(this._unsubscribe)return;if(this._unsubscribe=g.subscribe((t)=>{if(this._itemId){let r=(Array.isArray(t.items)?t.items:[]).find((i)=>i.id===this._itemId);if(r&&r.content)try{let i=typeof r.content==="string"?JSON.parse(r.content):r.content;if(i.interval&&i.interval!==this._interval)this._interval=parseInt(i.interval)}catch(i){}}if(t.stats)this.update(t.stats)}),!this._unsubscribeI18n)this._unsubscribeI18n=a.subscribe(()=>{this.render();let t=g.getState();if(t.stats)this.update(t.stats)})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n()}lastKnownStats={cpu_usage:0,ram_usage:0,temperature:0};update(t){if(!this.shadowRoot)return;let o=Date.now(),r=100;if(o-this.lastUpdate<this._interval-r)return;if(this.lastUpdate=o,typeof t.cpu_usage==="number")this.lastKnownStats.cpu_usage=t.cpu_usage;if(typeof t.ram_usage==="number")this.lastKnownStats.ram_usage=t.ram_usage;if(typeof t.temperature==="number")this.lastKnownStats.temperature=t.temperature;let i=typeof t.cpu_usage==="number"?t.cpu_usage:this.lastKnownStats.cpu_usage,n=typeof t.ram_usage==="number"?t.ram_usage:this.lastKnownStats.ram_usage,e=typeof t.temperature==="number"?t.temperature:this.lastKnownStats.temperature;requestAnimationFrame(()=>{let s=Math.min(100,Math.max(0,Math.round(i)));if(this.cpuBar)this.cpuBar.style.strokeDasharray=`${s}, 100`;if(this.cpuText)this.cpuText.textContent=`${s}%`;let d=Math.min(100,Math.max(0,Math.round(n)));if(this.ramBar)this.ramBar.style.strokeDasharray=`${d}, 100`;if(this.ramText)this.ramText.textContent=`${d}%`;let p=Math.round(e),c=Math.min(100,Math.max(0,p));if(this.tempBar)this.tempBar.style.strokeDasharray=`${c}, 100`;if(this.tempText)this.tempText.textContent=`${p}°C`})}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: space-around;
                    width: 100%;
                    height: 100%;
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
        `,this.cpuBar=this.shadowRoot.querySelector(".cpu-bar"),this.ramBar=this.shadowRoot.querySelector(".ram-bar"),this.tempBar=this.shadowRoot.querySelector(".temp-bar"),this.cpuText=this.shadowRoot.querySelector(".cpu-text"),this.ramText=this.shadowRoot.querySelector(".ram-text"),this.tempText=this.shadowRoot.querySelector(".temp-text")}}customElements.define("widget-telemetry",no);y();L();var eo=new Map,po=900000,so={widgetId:"weather",latitude:0,longitude:0,city:"",unit:"celsius",showForecast:!1,forecastDays:5};function V(t){if(t===0)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="32" cy="32" r="11"/>
            <line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/>
            <line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/>
            <line x1="13.6" y1="13.6" x2="19.3" y2="19.3"/><line x1="44.7" y1="44.7" x2="50.4" y2="50.4"/>
            <line x1="13.6" y1="50.4" x2="19.3" y2="44.7"/><line x1="44.7" y1="19.3" x2="50.4" y2="13.6"/>
        </svg>`;if(t<=2)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="24" cy="20" r="8"/>
            <line x1="24" y1="5" x2="24" y2="9"/><line x1="9" y1="20" x2="13" y2="20"/>
            <line x1="13.3" y1="9.3" x2="16.2" y2="12.2"/><line x1="34.7" y1="9.3" x2="31.8" y2="12.2"/>
            <line x1="13.3" y1="30.7" x2="16.2" y2="27.8"/>
            <path d="M22 46 Q22 38 30 38 Q30 30 40 30 Q50 30 50 38 Q56 38 56 44 Q56 50 50 50 L26 50 Q22 50 22 46Z"/>
        </svg>`;if(t===3)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 42 Q14 34 22 34 Q22 24 34 24 Q46 24 46 34 Q54 34 54 42 Q54 48 46 48 L20 48 Q14 48 14 42Z"/>
            <path d="M10 36 Q10 30 16 30 Q16 24 24 24" opacity="0.35"/>
        </svg>`;if(t===45||t===48)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M16 30 Q16 22 24 22 Q24 14 36 14 Q48 14 48 22 Q54 22 54 30 Q54 36 48 36 L22 36 Q16 36 16 30Z"/>
            <line x1="14" y1="42" x2="50" y2="42" opacity="0.5"/>
            <line x1="18" y1="48" x2="46" y2="48" opacity="0.35"/>
            <line x1="22" y1="54" x2="42" y2="54" opacity="0.2"/>
        </svg>`;if(t>=51&&t<=57)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 34 Q14 26 22 26 Q22 18 34 18 Q46 18 46 26 Q54 26 54 34 Q54 40 46 40 L20 40 Q14 40 14 34Z"/>
            <line x1="24" y1="46" x2="22" y2="52" opacity="0.6"/><line x1="34" y1="46" x2="32" y2="52" opacity="0.6"/>
            <line x1="44" y1="46" x2="42" y2="52" opacity="0.6"/>
        </svg>`;if(t>=61&&t<=67||t>=80&&t<=82)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 32 Q14 24 22 24 Q22 16 34 16 Q46 16 46 24 Q54 24 54 32 Q54 38 46 38 L20 38 Q14 38 14 32Z"/>
            <line x1="22" y1="44" x2="18" y2="54"/><line x1="32" y1="44" x2="28" y2="54"/>
            <line x1="42" y1="44" x2="38" y2="54"/><line x1="50" y1="44" x2="48" y2="50" opacity="0.5"/>
        </svg>`;if(t>=71&&t<=77||t>=85&&t<=86)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 32 Q14 24 22 24 Q22 16 34 16 Q46 16 46 24 Q54 24 54 32 Q54 38 46 38 L20 38 Q14 38 14 32Z"/>
            <circle cx="24" cy="48" r="2" fill="currentColor" stroke="none"/>
            <circle cx="34" cy="46" r="2" fill="currentColor" stroke="none"/>
            <circle cx="44" cy="50" r="2" fill="currentColor" stroke="none"/>
            <circle cx="30" cy="54" r="2" fill="currentColor" stroke="none"/>
        </svg>`;if(t>=95)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 30 Q14 22 22 22 Q22 14 34 14 Q46 14 46 22 Q54 22 54 30 Q54 36 46 36 L20 36 Q14 36 14 30Z"/>
            <polyline points="35,38 28,48 36,48 29,58" stroke-width="2.5"/>
        </svg>`;return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M14 40 Q14 32 22 32 Q22 22 34 22 Q46 22 46 32 Q54 32 54 40 Q54 46 46 46 L20 46 Q14 46 14 40Z"/>
    </svg>`}function gt(t){let o={0:"clear_sky",1:"mainly_clear",2:"partly_cloudy",3:"overcast",45:"fog",48:"fog",51:"light_drizzle",53:"drizzle",55:"heavy_drizzle",56:"freezing_drizzle",57:"freezing_drizzle",61:"light_rain",63:"rain",65:"heavy_rain",66:"freezing_rain",67:"freezing_rain",71:"light_snow",73:"snow",75:"heavy_snow",77:"snow_grains",80:"light_showers",81:"showers",82:"heavy_showers",85:"snow_showers",86:"heavy_snow_showers",95:"thunderstorm",96:"thunderstorm_hail",99:"thunderstorm_hail"};return a.t(`widget.weather.${o[t]||"unknown"}`)}function E(t,o){if(o==="fahrenheit")return`${Math.round(t*9/5+32)}°F`;return`${Math.round(t)}°C`}async function or(t,o){let r=`${t.toFixed(2)},${o.toFixed(2)}`,i=eo.get(r);if(i&&Date.now()-i.timestamp<po)return i.data;let n=`https://api.open-meteo.com/v1/forecast?latitude=${t}&longitude=${o}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max&timezone=auto&forecast_days=7`,e=await fetch(n);if(!e.ok)throw Error("Weather API error");let s=await e.json();return eo.set(r,{data:s,timestamp:Date.now()}),s}class lo extends HTMLElement{_config={...so};_itemId=0;_unsubscribe=null;_unsubscribeI18n;_weatherData=null;_refreshTimer=null;_loading=!1;_error=!1;constructor(){super();this.attachShadow({mode:"open"})}static get observedAttributes(){return["item-id"]}attributeChangedCallback(t,o,r){if(t==="item-id")this._itemId=parseInt(r)}connectedCallback(){this.render(),this.loadWeather(),this._refreshTimer=setInterval(()=>this.loadWeather(),po),this._unsubscribe=g.subscribe((t)=>{if(!this._itemId)return;let o=t.items.find((r)=>r.id===this._itemId);if(!o?.content)return;try{let r=typeof o.content==="string"?JSON.parse(o.content):o.content;if(r.widgetId!=="weather")return;let i=this._config.latitude,n=this._config.longitude;if(this._config={...so,...r},i!==this._config.latitude||n!==this._config.longitude)this.loadWeather();else this.updateDisplay()}catch(r){}}),this._unsubscribeI18n=a.subscribe(()=>this.updateDisplay())}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._refreshTimer)clearInterval(this._refreshTimer)}async loadWeather(){if(!this._config.latitude&&!this._config.longitude){this._loading=!1,this._error=!1,this.updateDisplay();return}this._loading=!0,this._error=!1,this.updateDisplay();try{this._weatherData=await or(this._config.latitude,this._config.longitude),this._loading=!1}catch(t){this._loading=!1,this._error=!0}this.updateDisplay()}updateDisplay(){let t=this.shadowRoot?.querySelector(".weather-body");if(!t){this.render();return}if(!this._config.latitude&&!this._config.longitude){t.innerHTML=this.emptyState(V(0),a.t("widget.weather.no_location"));return}if(this._loading){t.innerHTML=this.emptyState(V(3),a.t("general.loading"),!0);return}if(this._error||!this._weatherData){t.innerHTML=this.emptyState(V(-1),a.t("general.error"));return}let o=this._weatherData.current_weather,r=this._weatherData.daily,i=this._config.unit||"celsius";if(this._config.showForecast&&r)t.innerHTML=this.forecastView(o,r,i);else t.innerHTML=this.simpleView(o,r,i)}emptyState(t,o,r=!1){return`<div class="state"><div class="state-icon${r?" pulse":""}">${t}</div><span class="state-text">${o}</span></div>`}simpleView(t,o,r){return`
            <div class="icon-main">${V(t.weathercode)}</div>
            <div class="temp-main">${E(t.temperature,r)}</div>
            <div class="desc">${gt(t.weathercode)}</div>
            ${o?`<div class="minmax"><span class="hi">${E(o.temperature_2m_max[0],r)}</span><span class="lo">${E(o.temperature_2m_min[0],r)}</span></div>`:""}
            ${this._config.city?`<div class="city">${this._config.city}</div>`:""}
        `}forecastView(t,o,r){let i=a.getLocale().code,n=Math.min(this._config.forecastDays||5,o.time.length-1),e="";for(let s=1;s<=n;s++){let d=new Date(o.time[s]+"T00:00:00"),p=d.toLocaleDateString(i,{weekday:"short"}),c=d.toLocaleDateString(i,{weekday:"long",day:"numeric",month:"long"}),l=gt(o.weathercode[s]),f=E(o.temperature_2m_max[s],r),v=E(o.temperature_2m_min[s],r),x=o.sunrise?.[s]?.split("T")[1]||"",m=o.sunset?.[s]?.split("T")[1]||"",k=o.wind_speed_10m_max?.[s]!=null?`${Math.round(o.wind_speed_10m_max[s])} km/h`:"";e+=`<div class="fc-day">
                <span class="fc-name">${p}</span>
                <span class="fc-icon">${V(o.weathercode[s])}</span>
                <span class="fc-temp">${f}</span>
                <div class="fc-tooltip">
                    <div class="tt-date">${c}</div>
                    <div class="tt-desc">${l}</div>
                    <div class="tt-row"><span class="tt-label">${a.t("widget.weather.max_min")}</span><span>${f} / ${v}</span></div>
                    ${x?`<div class="tt-row"><span class="tt-label">${a.t("widget.weather.sunrise")}</span><span>${x}</span></div>`:""}
                    ${m?`<div class="tt-row"><span class="tt-label">${a.t("widget.weather.sunset")}</span><span>${m}</span></div>`:""}
                    ${k?`<div class="tt-row"><span class="tt-label">${a.t("widget.weather.wind")}</span><span>${k}</span></div>`:""}
                </div>
            </div>`}return`
            <div class="fc-header">
                <div class="fc-h-icon">${V(t.weathercode)}</div>
                <div class="fc-h-info">
                    <div class="fc-h-temp">${E(t.temperature,r)}</div>
                    <div class="fc-h-desc">${gt(t.weathercode)}</div>
                </div>
                ${this._config.city?`<div class="fc-h-city">${this._config.city}</div>`:""}
            </div>
            <div class="minmax compact"><span class="hi">${E(o.temperature_2m_max[0],r)}</span><span class="lo">${E(o.temperature_2m_min[0],r)}</span></div>
            <div class="fc-row">${e}</div>
        `}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`<style>${rr}</style><div class="weather-body"></div>`,this.updateDisplay()}}var rr=`
:host {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--text-main);
    box-sizing: border-box;
    padding: 6%;
    user-select: none;
    position: relative;
    container-type: inline-size;
    overflow: visible;
}
.weather-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%; height: 100%;
    gap: 3%;
}

/* ── State (empty / loading / error) ── */
.state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; height:100%; opacity:.5; }
.state-icon { width:clamp(28px,18cqi,56px); height:clamp(28px,18cqi,56px); }
.state-icon svg { width:100%; height:100%; }
.state-text { font-size:clamp(.6rem,5cqi,.85rem); color:var(--text-dim); text-align:center; }
.pulse { animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.8} }

/* ── Simple view ── */
.icon-main { width:clamp(32px,22cqi,72px); height:clamp(32px,22cqi,72px); color:var(--accent); }
.icon-main svg { width:100%; height:100%; }
.temp-main {
    font-size: clamp(1.4rem,18cqi,4rem);
    font-weight: 700;
    letter-spacing: -.03em;
    line-height: 1;
}
.desc {
    font-size: clamp(.55rem,5.5cqi,.95rem);
    color: var(--text-dim);
    text-transform: capitalize;
}
.minmax {
    display: flex;
    gap: clamp(8px,4cqi,20px);
    font-size: clamp(.6rem,5cqi,.9rem);
    font-weight: 500;
}
.minmax.compact { font-size: clamp(.5rem,4cqi,.8rem); }
.hi::before { content:"\\2191 "; opacity:.6; }
.lo { color: var(--text-dim); }
.lo::before { content:"\\2193 "; opacity:.6; }
.city {
    font-size: clamp(.85rem,7.5cqi,1.3rem);
    color: var(--text-main);
    font-weight: 700;
    margin-top: 1%;
}

/* ── Forecast header ── */
.fc-header {
    display: flex;
    align-items: center;
    gap: clamp(6px,3cqi,14px);
    width: 100%;
}
.fc-h-icon { width:clamp(26px,12cqi,44px); height:clamp(26px,12cqi,44px); color:var(--accent); flex-shrink:0; }
.fc-h-icon svg { width:100%; height:100%; }
.fc-h-info { flex:1; min-width:0; }
.fc-h-temp { font-size:clamp(.9rem,9cqi,2rem); font-weight:700; letter-spacing:-.03em; line-height:1.1; }
.fc-h-desc { font-size:clamp(.45rem,3.5cqi,.75rem); color:var(--text-dim); text-transform:capitalize; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fc-h-city { font-size:clamp(.7rem,5.5cqi,1.1rem); color:var(--text-main); font-weight:700; text-align:right; flex-shrink:0; }

/* ── Forecast row ── */
.fc-row {
    display: flex;
    justify-content: space-evenly;
    width: 100%;
    border-top: 1px solid var(--border);
    padding-top: 4%;
    margin-top: auto;
}
.fc-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(2px,1.5cqi,5px);
    position: relative;
    cursor: default;
}
.fc-name { font-size:clamp(.45rem,3cqi,.7rem); color:var(--text-dim); text-transform:capitalize; font-weight:500; }
.fc-icon { width:clamp(14px,7cqi,26px); height:clamp(14px,7cqi,26px); }
.fc-icon svg { width:100%; height:100%; }
.fc-temp { font-size:clamp(.45rem,3.5cqi,.8rem); font-weight:600; }

/* ── Forecast tooltip ── */
.fc-tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface-solid, #fff);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg, 0 10px 25px rgba(0,0,0,.15));
    padding: 12px 14px;
    min-width: 180px;
    z-index: 100;
    pointer-events: none;
}
.fc-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: var(--border);
}
.fc-day:hover .fc-tooltip {
    display: block;
}
.fc-day:hover {
    z-index: 101;
}
.tt-date {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 6px;
    text-transform: capitalize;
}
.tt-desc {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: capitalize;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
}
.tt-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    padding: 2px 0;
    color: var(--text-main);
}
.tt-label {
    color: var(--text-dim);
    margin-right: 12px;
}
`;customElements.define("widget-weather",lo);var co=`:host {
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

/* ═══════════════════════════════════════════════════════════════
   Touch Mode / Mobile & Tablet — Horizontal Card List
   ═══════════════════════════════════════════════════════════════
   On touch devices the grid is replaced by a simple vertical list
   of full-width horizontal cards.  Each card shows the icon on the
   left, the label in the centre, and the optional status indicator
   on the right.  This layout completely avoids the desktop column-
   flex + percentage-max-height chain that caused cards to collapse
   on mobile browsers.
   ═══════════════════════════════════════════════════════════════ */

:host(.touch-mode) {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    /* Remove layout containment — it can interfere with flex height
       resolution on some mobile browsers */
    contain: none;
    will-change: auto;
}

:host(.touch-mode) .bookmark-grid__card {
    /* Reset grid positioning */
    grid-column: auto !important;
    grid-row: auto !important;

    /* Full-width horizontal card */
    width: 100%;
    height: auto;
    min-height: 52px;
    max-height: none;
    aspect-ratio: auto;

    /* Horizontal layout: [Icon] [Label] [Status●] */
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    align-self: stretch;
    gap: 12px;
    padding: 12px 16px !important;

    /* Remove container-query context (avoids implicit containment
       and undefined cqi units in a non-grid context) */
    container-type: normal;
}

/* Icon container — fixed size, no flex-grow */
:host(.touch-mode) .bookmark-grid__icon-container {
    flex: 0 0 auto;
    width: auto;
}

/* Icons — fixed pixel size avoids the max-height:80% circular
   dependency that collapsed icons on mobile */
:host(.touch-mode) .bookmark-grid__icon-img,
:host(.touch-mode) .bookmark-grid__icon-svg {
    width: 40px;
    height: 40px;
    max-height: none;
}

/* Label — fills remaining space, left-aligned */
:host(.touch-mode) .bookmark-grid__label {
    font-size: 14px;
    text-align: left;
    padding: 0;
    flex: 1;
    min-width: 0;
    /* allow text-overflow ellipsis in flex */
}

/* Status indicator — inline at end of card instead of absolute */
:host(.touch-mode) .status-indicator {
    position: static;
    flex-shrink: 0;
    width: 10px;
    height: 10px;
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

/* Allow widget tooltips to overflow the card */
.bookmark-grid__card[data-type="widget"] {
    overflow: visible;
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
    right: 12px;
    display: block;
    width: fit-content;
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

    /* Professional Truncation */
    max-width: calc(100% - 24px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    box-sizing: border-box;

    transition: all 0.3s ease;
}

/* In edit mode, leave room for action buttons on the right */
:host(.edit-mode) .section-title {
    max-width: calc(100% - 84px);
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
}

/* ═══════════════════════════════════════════════════════════════
   Nested Cards — compact layout so label is never clipped
   ═══════════════════════════════════════════════════════════════ */
.bookmark-grid__nested-content .bookmark-grid__card {
    padding: 6% 4% !important;
}

/* Icon container: shrinkable so label always fits */
.bookmark-grid__nested-content .bookmark-grid__icon-container {
    flex: 1 1 0%;
    min-height: 0;
    overflow: hidden;
}

/* Label: never shrinks, always visible */
.bookmark-grid__nested-content .bookmark-grid__label {
    flex-shrink: 0;
    font-size: clamp(9px, 9cqi, 14px);
}

/* ═══════════════════════════════════════════════════════════════
   Skeleton Loading Effects
   ═══════════════════════════════════════════════════════════════ */
.skeleton {
    background: var(--surface);
    pointer-events: none;
    border: 1px solid var(--border);
    animation: skeleton-shimmer 1.5s infinite linear;
    background: linear-gradient(90deg,
            var(--surface) 25%,
            var(--border) 50%,
            var(--surface) 75%);
    background-size: 200% 100%;
}

.skeleton-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--border);
    margin-bottom: 12px;
}

.skeleton-text {
    width: 60%;
    height: 10px;
    border-radius: 4px;
    background: var(--border);
}

@keyframes skeleton-shimmer {
    0% {
        background-position: 200% 0;
    }

    100% {
        background-position: -200% 0;
    }
}`;class xo extends HTMLElement{bookmarks=[];allItems=[];isEditing=!1;isLoading=!0;searchQuery="";_unsubscribe;_unsubscribeI18n;_resizeObserver;_resizeDebounce=null;dragTargetId=null;ghostEl=null;dragOffsetX=0;dragOffsetY=0;isResizing=!1;resizeTargetId=null;initialResizeX=0;initialResizeY=0;initialResizeW=0;initialResizeH=0;currentColWidth=0;currentGridCols=12;isTouchDevice=!1;constructor(){super();this.attachShadow({mode:"open"})}_widgetModal;_boundActionClick=this.handleActionClick.bind(this);_boundMouseMove=this.handleWindowMouseMove.bind(this);_boundMouseUp=this.handleWindowMouseUp.bind(this);applyFilters(){let t=this.isTouchDevice,o=!!this.searchQuery;if(o&&!t)this.classList.add("search-active");else this.classList.remove("search-active");if(t||o)this.bookmarks=this.allItems.filter((r)=>{let i=r.content;if(typeof r.content==="string")try{i=JSON.parse(r.content)}catch{return!1}if(t&&r.type!=="bookmark")return!1;if(t&&i.visibleTouch===!1)return!1;if(o)return(i.label||"").toLowerCase().includes(this.searchQuery);return!0});else this.bookmarks=this.allItems}connectedCallback(){let t=()=>{let r=window.innerWidth<768,i=window.matchMedia("(pointer: coarse)").matches||"ontouchstart"in window||navigator.maxTouchPoints>0;return r&&i},o=()=>{let r=t();if(this.isTouchDevice!==r){if(this.isTouchDevice=r,r)this.classList.add("touch-mode");else this.classList.remove("touch-mode");this.applyFilters(),this.render()}};if(window.addEventListener("resize",o),window.addEventListener("orientationchange",o),this.isTouchDevice=t(),this.isTouchDevice)this.classList.add("touch-mode");this.applyFilters(),this.render(),this.updateGridMetrics(),this._resizeObserver=new ResizeObserver(()=>{if(this._resizeDebounce)return;this._resizeDebounce=setTimeout(()=>{this._resizeDebounce=null,this.updateGridMetrics();let r=this.getBoundingClientRect();g.setGridMetrics(r.width,this.currentGridCols),this.applyFilters(),this.render()},16)}),this._resizeObserver.observe(this),this._unsubscribe=g.subscribe((r)=>{let i=!1;if(this.isEditing!==r.isEditing)this.isEditing=r.isEditing,i=!0;if(this.isLoading!==r.loading)this.isLoading=r.loading,i=!0;if(this.searchQuery!==r.searchQuery)this.searchQuery=r.searchQuery,i=!0;let n=Array.isArray(r.items)?r.items:[];if(JSON.stringify(this.allItems)!==JSON.stringify(n)||i)this.allItems=n,this.applyFilters(),i=!0;if(i)this.render()}),this.setupDragListeners(),this.setupResizeListeners(),this.setupActionListeners(),W.start(),this._unsubscribeI18n=a.subscribe(()=>this.render()),Promise.resolve().then(() => (K(),S)).then(({userStore:r})=>{this._unsubscribeUser=r.subscribe(()=>{requestAnimationFrame(()=>{this.updateGridMetrics(),this.render()})})})}_unsubscribeUser=null;setupActionListeners(){let t=this.shadowRoot;t.removeEventListener("click",this._boundActionClick),t.addEventListener("click",this._boundActionClick)}async handleActionClick(t){if(!this.isEditing)return;let o=t.target;if(!o)return;let r=o.closest(".btn-delete"),i=o.closest(".btn-edit");if(r||i)t.preventDefault(),t.stopPropagation();else if(o.closest("a"))t.preventDefault();if(r){let n=r.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!n)return;let e=parseInt(n.dataset.id||"0"),s=this.allItems.find((l)=>l.id===e);if(!s)return;let d=s.type==="section"?a.t("type.section"):s.type==="widget"?a.t("type.widget"):a.t("type.bookmark"),{eventBus:p,EVENTS:c}=await Promise.resolve().then(() => (tt(),xt));p.emit(c.SHOW_CONFIRMATION,{title:`${a.t("general.delete")} ${d}`,message:a.t("bookmark.delete_confirm_message"),onConfirm:()=>{g.deleteItem(e)}});return}if(i){let n=i.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!n)return;let e=parseInt(n.dataset.id||"0"),s=this.allItems.find((d)=>d.id===e);if(s){let{eventBus:d,EVENTS:p}=await Promise.resolve().then(() => (tt(),xt));if(s.type==="widget")d.emit(p.SHOW_WIDGET_CONFIG,{item:s,type:"widget"});else if(s.type==="section")d.emit(p.SHOW_WIDGET_CONFIG,{item:s,type:"section"});else d.emit(p.SHOW_WIDGET_CONFIG,{item:s,type:"bookmark"})}return}}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._unsubscribeUser)this._unsubscribeUser();if(this._resizeObserver)this._resizeObserver.disconnect();if(this._resizeDebounce)clearTimeout(this._resizeDebounce);if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout);window.removeEventListener("mousemove",this._boundMouseMove),window.removeEventListener("mouseup",this._boundMouseUp),W.stop()}updateGridMetrics(){let t=this.getBoundingClientRect(),o=getComputedStyle(this),r=o.getPropertyValue("--grid-cols").trim(),i=parseInt(r)||12,n=o.columnGap||o.gap||"16px",e=parseFloat(n)||16;if(t.width<=0){this.currentGridCols=i,this.currentColWidth=100,this.style.setProperty("--current-grid-cols",i.toString()),this.style.setProperty("--row-height","100px");return}let s=(i-1)*e,d=(t.width-s)/i;if(d<10)d=10;this.currentGridCols=i,this.currentColWidth=d,this.style.setProperty("--current-grid-cols",String(i)),this.style.setProperty("--row-height",`${d}px`),this.ensureGridBuffer()}ensureGridBuffer(){if(this.isTouchDevice){this.style.minHeight="";return}let t=0;this.bookmarks.forEach((s)=>{let d=(s.y||1)+(s.h||1);if(d>t)t=d});let r=t+1,i=this.currentColWidth||100,n=16,e=r*i+(r-1)*n;this.style.minHeight=`${e}px`}setupResizeListeners(){window.addEventListener("mousemove",this._boundMouseMove),window.addEventListener("mouseup",this._boundMouseUp),this.shadowRoot.addEventListener("mousedown",(t)=>{let o=t;if(!this.isEditing)return;let r=o.target;if(r.classList.contains("resize-handle")){o.preventDefault(),o.stopPropagation();let i=r.closest(".bookmark-grid__card, .bookmark-grid__section");if(!i||!i.dataset.id)return;let n=parseInt(i.dataset.id),e=this.bookmarks.find((x)=>x.id===n);if(!e)return;this.isResizing=!0,this.resizeTargetId=n,this.initialResizeX=o.clientX,this.initialResizeY=o.clientY,this.initialResizeW=e.w,this.initialResizeH=e.h;let s=this,d=s.getBoundingClientRect(),c=getComputedStyle(s).getPropertyValue("--current-grid-cols").trim(),l=c?parseInt(c,10):9,f=isNaN(l)?9:l,v=16;this.currentColWidth=(d.width-(f-1)*v)/f,this.updateGhost({x:e.x,y:e.y,w:e.w,h:e.h},!0)}})}_updateGhostTimeout=null;handleWindowMouseMove(t){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)return;this._updateGhostTimeout=setTimeout(()=>{this._updateGhostTimeout=null,this.processResizeMove(t)},16)}processResizeMove(t){if(!this.isResizing||!this.resizeTargetId)return;let o=t.clientX-this.initialResizeX,r=t.clientY-this.initialResizeY,i=Math.round(o/(this.currentColWidth+16)),n=Math.round(r/(this.currentColWidth+16)),e=this.initialResizeW+i,s=this.initialResizeH+n,d=this.bookmarks.find((p)=>p.id===this.resizeTargetId);if(d){let p=this.applyResizeConstraints(e,s,d),c={x:d.x,y:d.y,w:p.w,h:p.h,id:d.id,parent_id:d.parent_id},l=F.calculateDropValidity(c,this.bookmarks,this.currentGridCols);this.updateGhost(c,l.valid)}}applyResizeConstraints(t,o,r){let i=1,n=1;if(r.type==="widget"){let e=r.content;if(typeof r.content==="string")try{e=JSON.parse(r.content)}catch{return{w:Math.max(1,Math.min(12,t)),h:Math.max(1,Math.min(12,o))}}let s=(e.widgetId||"").toLowerCase();if(s==="notepad")i=2,n=2;else if(s==="clock")return{w:2,h:1};else if(s==="telemetry")return{w:2,h:1};let d=Math.max(i,Math.min(12,t)),p=Math.max(n,Math.min(12,o));return{w:d,h:p}}else if(r.type==="section"){let e=Math.max(1,Math.min(12,t)),s=Math.max(1,Math.min(12,o));return{w:e,h:s}}else{let e=Math.max(1,Math.min(2,t)),s=Math.max(1,Math.min(2,o));return{w:e,h:s}}}async handleWindowMouseUp(t){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout),this._updateGhostTimeout=null;let o=t.clientX-this.initialResizeX,r=t.clientY-this.initialResizeY,i=Math.round(o/(this.currentColWidth+16)),n=Math.round(r/(this.currentColWidth+16)),e=this.initialResizeW+i,s=this.initialResizeH+n,d=this.bookmarks.find((f)=>f.id===this.resizeTargetId);if(!d)return;let p=this.applyResizeConstraints(e,s,d);e=p.w,s=p.h;let c={x:d.x,y:d.y,w:e,h:s,id:d.id,parent_id:d.parent_id};if(F.calculateDropValidity(c,this.bookmarks,this.currentGridCols).valid&&(d.w!==e||d.h!==s)){if(d.type==="section"){let f=e*s,v=this.bookmarks.filter((x)=>x.parent_id===d.id);if(v.sort((x,m)=>x.y-m.y||x.x-m.x),v.length>f){let x=v.slice(f),m=[...this.bookmarks],k=x.map((u)=>{let b=F.findFirstAvailableSlot(u.w,u.h,m,this.currentGridCols);return m.push({...u,x:b.x,y:b.y,parent_id:void 0}),{id:u.id,x:b.x,y:b.y,parent_id:void 0}});await Promise.all(k.map((u)=>g.updateItem(u)))}}await g.resizeItem(d.id,e,s)}if(this.isResizing=!1,this.resizeTargetId=null,this.ghostEl)this.ghostEl.style.display="none"}setupDragListeners(){let t=this.shadowRoot,o=this;t.addEventListener("dragstart",(i)=>{let n=i;if(!this.isEditing){n.preventDefault();return}let e=n.target.closest('[draggable="true"]');if(e&&e.dataset.id){this.dragTargetId=parseInt(e.dataset.id),n.dataTransfer.effectAllowed="move",e.style.opacity="0.5";let s=e.getBoundingClientRect();if(this.dragOffsetX=n.clientX-s.left,this.dragOffsetY=n.clientY-s.top,n.dataTransfer)n.dataTransfer.setDragImage(e,this.dragOffsetX,this.dragOffsetY)}}),t.addEventListener("dragend",(i)=>{let n=i.target.closest('[draggable="true"]');if(n)n.style.opacity="1";if(this.dragTargetId=null,this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((s)=>s.classList.remove("drop-target"))});let r=null;o.addEventListener("dragover",(i)=>{let n=i;if(!this.isEditing||!this.dragTargetId)return;if(n.preventDefault(),n.dataTransfer.dropEffect="move",r)return;r=setTimeout(()=>{r=null,this.processDragOver(n,o)},16)}),o.addEventListener("drop",async(i)=>{let n=i;if(r)clearTimeout(r),r=null;await this.handleDrop(n,o)})}processDragOver(t,o){let n=document.querySelector(".main-content");if(n){let z=n.getBoundingClientRect(),D=t.clientY;if(D>z.bottom-100)n.scrollBy(0,15);else if(D<z.top+100)n.scrollBy(0,-15)}let e=o.getBoundingClientRect(),s=this.currentGridCols||12,d=e.width,p=16,c=(d-(s-1)*p)/s,l=this.bookmarks.find((z)=>z.id===this.dragTargetId);if(!l)return;let f=t.clientX-this.dragOffsetX,v=t.clientY-this.dragOffsetY,x=f-e.left,m=v-e.top,k=Math.floor(x/(c+p)),u=Math.floor(m/(c+p)),b=Math.max(1,Math.min(s-l.w+1,k+1)),A=Math.max(1,u+1),R={x:b,y:A,w:l.w,h:l.h,id:l.id,parent_id:l.parent_id},h=F.calculateDropValidity(R,this.bookmarks,s),J=!this.bookmarks.some((z)=>{if(z.id===l.id)return!1;if(z.parent_id!==l.parent_id&&!h.targetGroup)return!1;let D=z.x||1,_t=z.y||1,Eo=z.w||1,Jo=z.h||1;if(h.targetGroup&&z.id===h.targetGroup.id)return!1;return b<D+Eo&&b+l.w>D&&A<_t+Jo&&A+l.h>_t})&&h.valid;if(this.updateGhost(R,J),this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((z)=>z.classList.remove("drop-target")),h.targetGroup&&J){let z=this.shadowRoot.querySelector(`.bookmark-grid__section[data-id="${h.targetGroup.id}"]`);if(z)z.classList.add("drop-target")}}async handleDrop(t,o){if(!this.isEditing||!this.dragTargetId)return;t.preventDefault();let r=this.bookmarks.find((h)=>h.id===this.dragTargetId);if(!r)return;let i=o.getBoundingClientRect(),n=this.currentGridCols||12,e=i.width,s=16,d=(e-(n-1)*s)/n,p=t.clientX-this.dragOffsetX,c=t.clientY-this.dragOffsetY,l=p-i.left,f=c-i.top,v=Math.floor(l/(d+s)),x=Math.floor(f/(d+s)),m=Math.max(1,Math.min(n-r.w+1,v+1)),k=Math.max(1,x+1),u={x:m,y:k,w:r.w,h:r.h,id:r.id,parent_id:r.parent_id},b=F.calculateDropValidity(u,this.bookmarks,n);if(this.bookmarks.some((h)=>{if(h.id===r.id)return!1;if(h.parent_id!==r.parent_id&&!b.targetGroup)return!1;let C=h.x||1,J=h.y||1,ut=h.w||1,z=h.h||1;if(b.targetGroup&&h.id===b.targetGroup.id)return!1;return m<C+ut&&m+r.w>C&&k<J+z&&k+r.h>J})&&!b.targetGroup){if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".drop-target").forEach((h)=>h.classList.remove("drop-target"));return}if(b.valid){let h={id:r.id,x:b.x,y:b.y};if(b.targetGroup)h.parent_id=b.targetGroup.id,h.x=b.x-b.targetGroup.x+1,h.y=b.y-b.targetGroup.y+1;else h.parent_id=void 0;await g.updateItem(h)}if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((h)=>h.classList.remove("drop-target"))}updateGhost(t,o){if(!this.ghostEl)this.ghostEl=this.shadowRoot.getElementById("ghost-element");if(!this.ghostEl)return;if(this.ghostEl.style.display="block",this.ghostEl.style.setProperty("--ghost-x",String(t.x)),this.ghostEl.style.setProperty("--ghost-y",String(t.y)),this.ghostEl.style.setProperty("--ghost-w",String(t.w)),this.ghostEl.style.setProperty("--ghost-h",String(t.h)),o)this.ghostEl.classList.remove("invalid");else this.ghostEl.classList.add("invalid")}render(){if(this.isEditing)this.classList.add("edit-mode");else this.classList.remove("edit-mode");this.shadowRoot.innerHTML=`
            <style>${co}</style>
            ${oo({bookmarks:this.bookmarks,isEditing:this.isEditing,isLoading:this.isLoading,isSearching:!!this.searchQuery,isTouchDevice:this.isTouchDevice,maxCols:this.currentGridCols})}
        `,this.setupActionListeners(),this.ghostEl=this.shadowRoot.getElementById("ghost-element")}}if(!customElements.get("bookmark-grid"))customElements.define("bookmark-grid",xo);var bo=()=>`
    <div class="toast-container"></div>
`;var ho=`.toast-container {
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
}`;class vo extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",()=>this.shift(!0)),window.addEventListener("drawer-close",()=>this.shift(!1))}shift(t){let o=this.shadowRoot.querySelector(".toast-container");if(o)if(t)o.classList.add("toast-container--shifted");else o.classList.remove("toast-container--shifted")}show(t,o="success"){let r=this.shadowRoot.querySelector(".toast-container");if(!r)return;let i=document.createElement("div");i.className=`toast toast--${o}`,i.textContent=t,r.appendChild(i),requestAnimationFrame(()=>{i.style.opacity="1",i.style.transform="translateY(0)"}),setTimeout(()=>{i.style.opacity="0",i.style.transform="translateY(20px)",setTimeout(()=>i.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${ho}</style>
            ${bo()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",vo);y();var fo=()=>`
    <div class="icon-picker">
        <div class="icon-picker__header">
            <div id="selected-container"></div>
            <div class="icon-picker__search">
                <input type="text"
                       id="icon-search"
                       class="icon-picker__search-input"
                       placeholder="${a.t("general.search")}" />
            </div>
        </div>

        <div id="grid-container" class="icon-picker__grid"></div>
    </div>
`,uo=(t)=>t?`
    <div class="icon-picker__selected">
        <img src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${t}.png"
             alt="${t}"
             class="icon-picker__preview" />
    </div>
`:`
    <div class="icon-picker__placeholder">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
    </div>
`,_o=(t,o,r)=>{if(r)return`<div class="icon-picker__loading">${a.t("general.loading")}</div>`;if(t.length===0)return`<div class="icon-picker__empty">${a.t("general.no_icons")}</div>`;return t.map((i)=>`
        <div class="icon-picker__item ${o===i.name?"icon-picker__item--selected":""}"
             data-icon="${i.name}"
             title="${i.name}">
            <img src="${i.url}" alt="${i.name}" loading="lazy" />
        </div>
    `).join("")};class mo{icons=[];loaded=!1;loading=!1;BASE_URL="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";FALLBACK_URL="https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main";async loadIcons(){if(this.loaded)return this.icons;if(this.loading)return await new Promise((t)=>setTimeout(t,100)),this.loadIcons();this.loading=!0;try{let t=await fetch(`${this.BASE_URL}/tree.json`);if(!t.ok)console.log("[IconService] CDN failed, trying GitHub raw"),t=await fetch(`${this.FALLBACK_URL}/tree.json`);if(!t.ok)throw Error("Failed to fetch icon list");let o=await t.json(),r=Array.isArray(o)?o:o.png||[];if(Array.isArray(r)&&r.length>0)this.icons=r.filter((i)=>i.endsWith(".png")||i.endsWith(".svg")).map((i)=>{let n=i.replace(/\.(png|svg)$/,"");return{name:n,url:`${this.BASE_URL}/png/${n}.png`}}).sort((i,n)=>i.name.localeCompare(n.name));else console.warn("[IconService] Unexpected tree.json structure, using fallback",o),this.icons=this.getFallbackIcons();return this.loaded=!0,this.loading=!1,console.log(`[IconService] Loaded ${this.icons.length} icons`),this.icons}catch(t){return console.error("[IconService] Failed to load icons:",t),this.loading=!1,this.icons=this.getFallbackIcons(),this.loaded=!0,this.icons}}getFallbackIcons(){return["github","gitlab","docker","proxmox","truenas","plex","jellyfin","nextcloud","cloudflare","nginx","traefik","portainer","grafana","prometheus","influxdb","pihole","adguard","homeassistant","esphome","frigate","unraid","synology","opnsense","pfsense","wireguard","openvpn","bitwarden","vaultwarden","sonarr","radarr","lidarr","bazarr","prowlarr","overseerr","tautulli","transmission","qbittorrent","deluge","sabnzbd","nzbget","calibre","paperless","photoprism","immich","mealie","freshrss","miniflux","wallabag","linkding","shiori","firefox","chrome","vscode","code-server","jupyter","portainer"].map((o)=>({name:o,url:`${this.BASE_URL}/png/${o}.png`}))}searchIcons(t,o=50){if(!t.trim())return this.icons.slice(0,o);let r=t.toLowerCase().trim();return this.icons.filter((i)=>i.name.toLowerCase().includes(r)).slice(0,o)}getIconUrl(t){return`${this.BASE_URL}/png/${t}.png`}}var bt=new mo;var yo=`:host {
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
}`;class ko extends HTMLElement{icons=[];filteredIcons=[];selectedIcon="";searchQuery="";isLoading=!0;debounceTimer=null;inputElement=null;constructor(){super();this.attachShadow({mode:"open"})}async connectedCallback(){if(this.shadowRoot.childElementCount>0)return;if(this.renderBase(),this.setupListeners(),this.icons.length===0)await this.loadIcons()}async loadIcons(){try{this.icons=await bt.loadIcons(),this.filteredIcons=this.icons.slice(0,50),this.isLoading=!1,this.updateGrid()}catch(t){console.error("[IconPicker] Failed to load icons",t),this.isLoading=!1,this.updateGrid()}}setupListeners(){let t=this.shadowRoot;this.inputElement=t.getElementById("icon-search"),this.inputElement?.addEventListener("input",(r)=>{let i=r.target;if(this.searchQuery=i.value,this.debounceTimer)window.clearTimeout(this.debounceTimer);this.debounceTimer=window.setTimeout(()=>{this.performSearch()},100)}),t.getElementById("grid-container")?.addEventListener("click",(r)=>{let n=r.target.closest(".icon-picker__item");if(n&&n.dataset.icon)this.selectedIcon=n.dataset.icon,this.updateSelected(),this.updateGrid(),this.dispatchEvent(new CustomEvent("icon-selected",{detail:{iconName:this.selectedIcon},bubbles:!0,composed:!0}))})}performSearch(){this.filteredIcons=bt.searchIcons(this.searchQuery,50),this.updateGrid()}getSelectedIcon(){return this.selectedIcon}setSelectedIcon(t){this.selectedIcon=t,this.updateSelected(),this.updateGrid()}renderBase(){this.shadowRoot.innerHTML=`
            <style>${yo}</style>
            ${fo()}
        `}updateGrid(){let t=this.shadowRoot.getElementById("grid-container");if(t){if(!this.searchQuery.trim()&&!this.isLoading){t.style.display="none",t.innerHTML="";return}t.style.display="grid",t.innerHTML=_o(this.filteredIcons,this.selectedIcon,this.isLoading)}}updateSelected(){let t=this.shadowRoot.getElementById("selected-container");if(t)t.innerHTML=uo(this.selectedIcon)}}if(!customElements.get("icon-picker"))customElements.define("icon-picker",ko);y();var wo=({isOpen:t,isEditMode:o})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h2 class="modal-title">${o?a.t("bookmark.edit"):a.t("bookmark.add")}</h2>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
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

            <!-- Status Check & Touch Visibility on same row -->
            <div class="visibility-row">
                <div class="checkbox-group">
                    <label for="bookmark-status">${a.t("bookmark.monitor_status")}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-status" name="statusCheck" />
                        <span class="slider"></span>
                    </label>
                </div>

                <div class="checkbox-group">
                    <label for="bookmark-touch">${a.t("bookmark.visible_touch")}</label>
                    <label class="toggle-switch">
                        <input type="checkbox" id="bookmark-touch" name="visibleTouch" checked />
                        <span class="slider"></span>
                    </label>
                </div>
            </div>

            <div class="form-actions">
                <app-button type="submit" variant="primary" class="btn-submit">${a.t("general.save")}</app-button>
            </div>
        </form>
    </dialog>
`;L();y();var zo=`:host {
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
}`;class $o extends HTMLElement{dialog=null;iconPicker=null;selectedIconName="";clickHandler=null;submitHandler=null;escapeHandler=null;_unsubscribeI18n;isEditMode=!1;currentItemId=null;constructor(){super();this.attachShadow({mode:"open"}),this.setupHandlers()}setupHandlers(){this.clickHandler=(t)=>{if(t.target.closest("#modal-close")){t.preventDefault(),t.stopPropagation(),this.close();return}if(t.target===this.dialog){this.close();return}},this.submitHandler=async(t)=>{t.preventDefault(),t.stopPropagation();let o=t.target,r=new FormData(o),i=r.get("label"),n=r.get("url"),e=r.get("statusCheck")==="on",s=r.get("visibleTouch")==="on",d=this.iconPicker?this.iconPicker.getSelectedIcon():"",p=d?`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${d}.png`:"";try{let c=JSON.stringify({label:i,url:n,icon:p,iconName:d,statusCheck:e,visibleTouch:s});if(this.isEditMode&&this.currentItemId){if(await g.updateItem({id:this.currentItemId,content:c}),window.notifier)window.notifier.show(a.t("notifier.bookmark_updated"))}else{let l=g.getState(),f=Array.isArray(l.items)?l.items:[],{collisionService:v}=await Promise.resolve().then(() => (B(),N)),x=v.findFirstAvailableSlot(1,1,f);if(await g.addItem({type:"bookmark",x:x.x,y:x.y,w:1,h:1,content:c}),window.notifier)window.notifier.show(a.t("notifier.bookmark_added"))}this.close()}catch(c){if(console.error("[Modal] Error:",c),window.notifier)window.notifier.show(a.t("notifier.bookmark_error"),"error")}},this.escapeHandler=(t)=>{if(t.key==="Escape"&&this.dialog?.open)this.close()}}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeI18n=a.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n();let t=this.shadowRoot;if(this.clickHandler)t.removeEventListener("click",this.clickHandler);if(this.submitHandler)t.removeEventListener("submit",this.submitHandler);if(this.escapeHandler)document.removeEventListener("keydown",this.escapeHandler)}setupListeners(){let t=this.shadowRoot;t.addEventListener("click",this.clickHandler),t.addEventListener("submit",this.submitHandler),document.addEventListener("keydown",this.escapeHandler)}open(){this.isEditMode=!1,this.currentItemId=null,this.selectedIconName="",this.render(),this.dialog?.showModal(),requestAnimationFrame(()=>{this.resetForm(),this.initializeIconPicker()})}openForEdit(t){this.isEditMode=!0,this.currentItemId=t.id;let o=t.content;if(typeof o==="string")try{o=JSON.parse(o)}catch(r){console.error("Failed to parse item content",r)}this.selectedIconName=o.iconName||"",this.render(),this.dialog?.showModal(),this.initializeIconPicker(),setTimeout(()=>{let r=this.shadowRoot.getElementById("bookmark-form");if(r){let i=r.elements.namedItem("label"),n=r.elements.namedItem("url"),e=r.elements.namedItem("statusCheck"),s=r.elements.namedItem("visibleTouch");if(i)i.value=o.label||"";if(n)n.value=o.url||"";if(e)e.checked=!!o.statusCheck;if(s)s.checked=o.visibleTouch!==!1}if(this.iconPicker)this.iconPicker.setSelectedIcon(this.selectedIconName)},100)}close(){this.dialog?.close(),this.selectedIconName="",this.resetForm()}resetForm(){setTimeout(()=>{let t=this.shadowRoot.getElementById("bookmark-form");if(t)t.reset();if(this.iconPicker)this.iconPicker.setSelectedIcon("")},100)}initializeIconPicker(){requestAnimationFrame(()=>{let t=this.shadowRoot.getElementById("icon-picker-container");if(!t){console.error("[Modal] Icon picker container not found");return}if(!this.iconPicker)this.iconPicker=document.createElement("icon-picker"),this.iconPicker.addEventListener("icon-selected",(o)=>{this.selectedIconName=o.detail.iconName});t.innerHTML="",t.appendChild(this.iconPicker)})}render(){this.shadowRoot.innerHTML=`
            <style>${zo}</style>
            ${wo({isOpen:!0,isEditMode:this.isEditMode})}
        `,this.dialog=this.shadowRoot.getElementById("modal"),this.setupListeners()}}if(!customElements.get("add-bookmark-modal"))customElements.define("add-bookmark-modal",$o);y();var ht=[{id:"clock",name:"Clock",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',description:"Digital clock with date",defaultW:2,defaultH:1,componentTag:"widget-clock"},{id:"notepad",name:"Notepad",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',description:"Markdown notepad",defaultW:2,defaultH:2,componentTag:"widget-notepad"},{id:"telemetry",name:"System Status",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><circle cx="6" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="17.5" r="1" fill="currentColor" stroke="none"/><line x1="10" y1="6.5" x2="18" y2="6.5"/><line x1="10" y1="17.5" x2="18" y2="17.5"/></svg>',description:"CPU, RAM and Temp",defaultW:2,defaultH:1,componentTag:"widget-telemetry"},{id:"weather",name:"Weather",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="4"/><line x1="9" y1="1" x2="9" y2="3"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="3.3" y1="3.3" x2="4.7" y2="4.7"/><line x1="14.7" y1="3.3" x2="13.3" y2="4.7"/><line x1="3.3" y1="14.7" x2="4.7" y2="13.3"/><path d="M10 19 Q10 15 14 15 Q14 11 18 11 Q22 11 22 15 Q24 15 24 18 Q24 21 21 21 L12 21 Q10 21 10 19Z"/></svg>',description:"Current weather & forecast",defaultW:2,defaultH:2,componentTag:"widget-weather"},{id:"markdown",name:"Markdown",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',description:"Native Markdown Editor",defaultW:2,defaultH:2,componentTag:"widget-markdown"}];class jo extends HTMLElement{dialog=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(){if(this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close()}selectWidget(t){this.dispatchEvent(new CustomEvent("widget-selected",{detail:t,bubbles:!0,composed:!0})),this.close()}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
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
                    stroke: #fff;
                    fill: none;
                }
                .card:hover .icon-container svg circle[fill="currentColor"] {
                    fill: #fff;
                }
                .icon-container svg {
                    width: 32px;
                    height: 32px;
                    stroke: var(--accent, #3b82f6);
                    fill: none;
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
                        <h3>${a.t("widget.add_title")||"Add Widget"}</h3>
                        <p>${a.t("widget.add_subtitle")||"Enhance your dashboard with dynamic components"}</p>
                    </div>
                    <button class="close-btn" onclick="this.getRootNode().host.close()">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div class="grid">
                    ${ht.map((t)=>`
                        <div class="card" data-id="${t.id}">
                            <div class="icon-container">${t.icon}</div>
                            <div class="name">${a.t(`widget.${t.id}.name`)||t.name}</div>
                            <div class="desc">${a.t(`widget.${t.id}.description`)||t.description}</div>
                        </div>
                    `).join("")}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog"),this.shadowRoot.querySelectorAll(".card").forEach((t)=>{t.addEventListener("click",()=>{let o=t.getAttribute("data-id"),r=ht.find((i)=>i.id===o);if(r)this.selectWidget(r)})})}}customElements.define("add-widget-modal",jo);L();y();var Lo=`:host {
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
}

/* Number input spinner */
.field-group input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}

.field-group input[type="number"]::-webkit-inner-spin-button,
.field-group input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
}

.stepper-wrap {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--input-bg);
}

.stepper-wrap input[type="number"] {
    border: none !important;
    border-radius: 0 !important;
    text-align: center;
    width: 44px;
    padding: 8px 4px;
    font-weight: 600;
    font-size: 14px;
}

.stepper-wrap input[type="number"]:focus {
    box-shadow: none !important;
}

.stepper-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 38px;
    background: var(--surface);
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.15s;
    font-family: var(--font-sans);
    user-select: none;
}

.stepper-btn:hover {
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
}

.stepper-btn:active {
    background: rgba(var(--accent-rgb), 0.18);
}

/* Weather city search results */
.weather-results {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 180px;
    overflow-y: auto;
}

.city-result {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    font-family: var(--font-sans);
    color: var(--text-main);
}

.city-result:hover {
    background: rgba(var(--accent-rgb), 0.08);
    border-color: rgba(var(--accent-rgb), 0.3);
}

.city-name {
    font-size: 14px;
    font-weight: 500;
}

.city-detail {
    font-size: 12px;
    color: var(--text-dim);
}

.search-loading,
.search-empty {
    font-size: 13px;
    color: var(--text-dim);
    text-align: center;
    padding: 12px;
}`;var vt=new Map;async function Mo(t,o){try{let r=await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${t}&longitude=${o}`);if(!r.ok)throw Error("TimeAPI failed");return(await r.json()).timeZone||"local"}catch(r){return console.error("[Timezone] TimeAPI error:",r),"local"}}async function dr(t){if(!t||t.trim()==="")return"local";let o=t.toLowerCase().trim();if(vt.has(o))return vt.get(o);try{let r=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(t)}&limit=1`,i=await fetch(r,{headers:{"User-Agent":"Lastboard/1.0"}});if(!i.ok)throw Error("Geocoding failed");let n=await i.json();if(n.length===0)return"local";let{lat:e,lon:s}=n[0],d=await Mo(parseFloat(e),parseFloat(s));return vt.set(o,d),d}catch(r){return console.error("[Timezone] Error resolving city:",t,r),"local"}}class Ao extends HTMLElement{dialog=null;currentItem=null;_clockSelectedLat=null;_clockSelectedLon=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(t){if(this.currentItem=t,this.render(),this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close();this.currentItem=null}async save(){if(!this.currentItem)return;let t=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,o=t.widgetId,r={...t};if(o==="clock"){let i=this.shadowRoot?.getElementById("clock-city"),n=this.shadowRoot?.getElementById("clock-12h"),e=this.shadowRoot?.getElementById("clock-date"),s=this.shadowRoot?.getElementById("save-btn"),d=i?.value||"";if(s)s.disabled=!0,s.textContent=a.t("general.loading");let p="local";if(this._clockSelectedLat!=null&&this._clockSelectedLon!=null)p=await Mo(this._clockSelectedLat,this._clockSelectedLon);else if(d)p=await dr(d);if(r.city=d,r.timezone=p,r.hour12=n?.checked||!1,r.showDate=e?.checked||!1,this._clockSelectedLat=null,this._clockSelectedLon=null,s)s.disabled=!1,s.textContent=a.t("general.save")}else if(o==="weather"){let i=this.shadowRoot?.getElementById("weather-city"),n=this.shadowRoot?.getElementById("weather-lat"),e=this.shadowRoot?.getElementById("weather-lon"),s=this.shadowRoot?.getElementById("weather-fahrenheit"),d=this.shadowRoot?.getElementById("weather-forecast"),p=this.shadowRoot?.getElementById("weather-days");r.city=i?.value||"",r.latitude=parseFloat(n?.value)||0,r.longitude=parseFloat(e?.value)||0,r.unit=s?.checked?"fahrenheit":"celsius",r.showForecast=d?.checked||!1,r.forecastDays=parseInt(p?.value)||5}else if(o==="telemetry"){let i=this.shadowRoot?.getElementById("telemetry-interval");r.interval=i?parseInt(i.value):1000}if(this.currentItem.type==="section"){let i=this.shadowRoot?.getElementById("section-title");r.title=i?i.value:"",delete r.name}await g.updateItem({id:this.currentItem.id,content:JSON.stringify(r)}),this.close()}render(){if(!this.shadowRoot)return;let t={},o="";if(this.currentItem)t=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,o=t.widgetId;let r=(x)=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),i=()=>{if(!this.currentItem)return"";if(o==="clock"){let x=t.city||"",m=t.hour12||!1,k=t.showDate!==!1;return`
                    <div class="field-group">
                        <label>${a.t("widget.clock.city")}</label>
                        <div class="input-row">
                            <input type="text" id="clock-city" value="${r(x)}" placeholder="${a.t("widget.clock.city_placeholder")}"/>
                            <app-button variant="ghost" id="clock-search-btn">${a.t("widget.weather.search")}</app-button>
                        </div>
                        <small>${a.t("widget.clock.city_desc")}</small>
                    </div>

                    <div class="field-group" id="clock-results-container" style="display:none;">
                        <label>${a.t("widget.weather.results")}</label>
                        <div id="clock-results" class="weather-results"></div>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${m?"checked":""} />
                        <label for="clock-12h">${a.t("widget.clock.use_12h")}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${k?"checked":""} />
                        <label for="clock-date">${a.t("widget.clock.show_date")}</label>
                    </div>
                `}else if(o==="weather"){let x=t.city||"",m=t.latitude||"",k=t.longitude||"",u=t.unit==="fahrenheit",b=t.showForecast||!1,A=t.forecastDays||5;return`
                    <div class="field-group">
                        <label>${a.t("widget.weather.city")}</label>
                        <div class="input-row">
                            <input type="text" id="weather-city" value="${r(x)}" placeholder="${a.t("widget.weather.city_placeholder")}"/>
                            <app-button variant="ghost" id="weather-search-btn">${a.t("widget.weather.search")}</app-button>
                        </div>
                        <small>${a.t("widget.weather.city_desc")}</small>
                    </div>

                    <div class="field-group" id="weather-results-container" style="display:none;">
                        <label>${a.t("widget.weather.results")}</label>
                        <div id="weather-results" class="weather-results"></div>
                    </div>

                    <div class="field-group">
                        <label>${a.t("widget.weather.coordinates")}</label>
                        <div class="input-row">
                            <input type="number" id="weather-lat" value="${m}" placeholder="Lat" step="0.0001" />
                            <input type="number" id="weather-lon" value="${k}" placeholder="Lon" step="0.0001" />
                        </div>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="weather-fahrenheit" ${u?"checked":""} />
                        <label for="weather-fahrenheit">${a.t("widget.weather.use_fahrenheit")}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="weather-forecast" ${b?"checked":""} />
                        <label for="weather-forecast">${a.t("widget.weather.show_forecast")}</label>
                    </div>

                    <div class="field-group row-aligned" id="weather-days-row" ${!b?'style="display:none;"':""}>
                        <label>${a.t("widget.weather.forecast_days")}</label>
                        <div class="stepper-wrap">
                            <button type="button" class="stepper-btn" id="weather-days-dec">&minus;</button>
                            <input type="number" id="weather-days" value="${A}" min="1" max="6" />
                            <button type="button" class="stepper-btn" id="weather-days-inc">+</button>
                        </div>
                    </div>
                `}else if(o==="telemetry"){let x=t.interval||1000;return`
                    <div class="field-group row-aligned">
                        <label>${a.t("widget.telemetry.update_interval")}</label>
                        <app-select id="telemetry-interval" value="${x}"></app-select>
                    </div>
                `}else if(this.currentItem.type==="section"){let x=t.title||"";return`
                    <div class="field-group">
                        <label>${a.t("bookmark.label")}</label>
                        <div class="input-row">
                            <input type="text" id="section-title" value="${r(x)}" placeholder="${a.t("section.placeholder_title")}" />
                        </div>
                        <small>${a.t("section.leave_empty")}</small>
                    </div>
                `}return`<p>${a.t("widget.config.no_config")}</p>`},n=()=>{if(this.currentItem?.type==="section")return a.t("section.edit_title");return a.t("widget.config.title")};this.shadowRoot.innerHTML=`
            <style>${Lo}</style>
            <dialog id="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${n()}</h3>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="content">
                    ${i()}
                </div>
                <div class="actions">
                    ${["clock","telemetry","weather"].includes(o)||this.currentItem?.type==="section"?`<app-button variant="primary" id="save-btn">${a.t("general.save")}</app-button>`:""}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog");let e=this.shadowRoot.getElementById("telemetry-interval");if(e)e.options=[{value:"1000",label:"1s"},{value:"2000",label:"2s"},{value:"5000",label:"5s"},{value:"10000",label:"10s"}];this.shadowRoot.getElementById("close-btn")?.addEventListener("click",()=>this.close()),this.shadowRoot.getElementById("save-btn")?.addEventListener("click",()=>this.save());let s=this.shadowRoot.getElementById("clock-search-btn");if(s)s.addEventListener("click",()=>this.searchClockCity());let d=this.shadowRoot.getElementById("weather-search-btn");if(d)d.addEventListener("click",()=>this.searchWeatherCity());let p=this.shadowRoot.getElementById("weather-forecast"),c=this.shadowRoot.getElementById("weather-days-row");if(p&&c)p.addEventListener("change",()=>{c.style.display=p.checked?"":"none"});let l=this.shadowRoot.getElementById("weather-days"),f=this.shadowRoot.getElementById("weather-days-dec"),v=this.shadowRoot.getElementById("weather-days-inc");if(l&&f&&v)f.addEventListener("click",()=>{let x=parseInt(l.value)||1;if(x>1)l.value=String(x-1)}),v.addEventListener("click",()=>{let x=parseInt(l.value)||1;if(x<6)l.value=String(x+1)})}async searchClockCity(){let t=this.shadowRoot?.getElementById("clock-city"),o=this.shadowRoot?.getElementById("clock-results-container"),r=this.shadowRoot?.getElementById("clock-results");if(!t||!o||!r)return;let i=t.value.trim();if(!i)return;r.innerHTML=`<div class="search-loading">${a.t("general.loading")}</div>`,o.style.display="";try{let e=await(await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(i)}&count=5&language=${a.getLocale().code}`)).json();if(!e.results||e.results.length===0){r.innerHTML=`<div class="search-empty">${a.t("general.no_icons")}</div>`;return}r.innerHTML=e.results.map((s)=>`
                <button class="city-result" data-lat="${s.latitude}" data-lon="${s.longitude}" data-name="${s.name}">
                    <span class="city-name">${s.name}</span>
                    <span class="city-detail">${[s.admin1,s.country].filter(Boolean).join(", ")}</span>
                </button>
            `).join(""),r.querySelectorAll(".city-result").forEach((s)=>{s.addEventListener("click",()=>{let d=parseFloat(s.getAttribute("data-lat")||"0"),p=parseFloat(s.getAttribute("data-lon")||"0"),c=s.getAttribute("data-name")||"";(this.shadowRoot?.getElementById("clock-city")).value=c,this._clockSelectedLat=d,this._clockSelectedLon=p,o.style.display="none"})})}catch(n){r.innerHTML=`<div class="search-empty">${a.t("general.error")}</div>`}}async searchWeatherCity(){let t=this.shadowRoot?.getElementById("weather-city"),o=this.shadowRoot?.getElementById("weather-results-container"),r=this.shadowRoot?.getElementById("weather-results");if(!t||!o||!r)return;let i=t.value.trim();if(!i)return;r.innerHTML=`<div class="search-loading">${a.t("general.loading")}</div>`,o.style.display="";try{let e=await(await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(i)}&count=5&language=${a.getLocale().code}`)).json();if(!e.results||e.results.length===0){r.innerHTML=`<div class="search-empty">${a.t("general.no_icons")}</div>`;return}r.innerHTML=e.results.map((s)=>`
                <button class="city-result" data-lat="${s.latitude}" data-lon="${s.longitude}" data-name="${s.name}">
                    <span class="city-name">${s.name}</span>
                    <span class="city-detail">${[s.admin1,s.country].filter(Boolean).join(", ")}</span>
                </button>
            `).join(""),r.querySelectorAll(".city-result").forEach((s)=>{s.addEventListener("click",()=>{let d=parseFloat(s.getAttribute("data-lat")||"0"),p=parseFloat(s.getAttribute("data-lon")||"0"),c=s.getAttribute("data-name")||"";(this.shadowRoot?.getElementById("weather-lat")).value=d.toString(),(this.shadowRoot?.getElementById("weather-lon")).value=p.toString(),(this.shadowRoot?.getElementById("weather-city")).value=c,o.style.display="none"})})}catch(n){r.innerHTML=`<div class="search-empty">${a.t("general.error")}</div>`}}}customElements.define("widget-config-modal",Ao);y();var Ho=({isOpen:t,title:o,message:r})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h3 class="modal-title">${o}</h3>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="modal-message">${r}</p>
        <div class="modal-actions">
            <app-button variant="danger" id="btn-confirm">${a.t("general.confirm")}</app-button>
        </div>
    </dialog>
`;y();var Go=`:host {
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
}`;class Ro extends HTMLElement{dialog=null;titleText="Confirm Action";messageText="Are you sure?";resolvePromise=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this._unsubscribeI18n=a.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n()}setupDynamicListeners(){let t=this.shadowRoot.getElementById("modal-close"),o=this.shadowRoot.getElementById("btn-confirm");this.dialog=this.shadowRoot.getElementById("modal");let r=(i)=>{if(this.resolvePromise)this.resolvePromise(i),this.resolvePromise=null;this.dialog?.close()};if(t)t.onclick=()=>r(!1);if(o)o.onclick=()=>r(!0);if(this.dialog)this.dialog.onclick=(i)=>{if(i.target===this.dialog)r(!1)}}async confirm(t,o){return this.titleText=t,this.messageText=o,this.render(),this.dialog?.showModal(),new Promise((r)=>{this.resolvePromise=r})}render(){this.shadowRoot.innerHTML=`
            <style>${Go}</style>
            ${Ho({isOpen:!0,title:this.titleText,message:this.messageText})}
        `,this.setupDynamicListeners()}}if(!customElements.get("confirmation-modal"))customElements.define("confirmation-modal",Ro);L();class ft{static parse(t){if(!t)return"";let o=t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");return o=o.replace(/```(\w+)?\n([\s\S]*?)```/g,'<pre><code class="language-$1">$2</code></pre>'),o=o.replace(/^> (.*$)/gim,"<blockquote>$1</blockquote>"),o=o.replace(/^### (.*$)/gim,"<h3>$1</h3>"),o=o.replace(/^## (.*$)/gim,"<h2>$1</h2>"),o=o.replace(/^# (.*$)/gim,"<h1>$1</h1>"),o=o.replace(/^---$/gim,"<hr />"),o=o.replace(/^\s*[-*]\s+(.*$)/gim,"<ul><li>$1</li></ul>"),o=o.replace(/<\/ul>\s*<ul>/gim,""),o=o.replace(/^\s*\d+\.\s+(.*$)/gim,"<ol><li>$1</li></ol>"),o=o.replace(/<\/ol>\s*<ol>/gim,""),o=o.replace(/^\s*\[ \]\s+(.*$)/gim,'<div class="checklist-item"><input type="checkbox" disabled> $1</div>'),o=o.replace(/^\s*\[x\]\s+(.*$)/gim,'<div class="checklist-item"><input type="checkbox" checked disabled> $1</div>'),o=o.replace(/`([^`]+)`/gim,"<code>$1</code>"),o=o.replace(/!\[([^\]]+)\]\(([^)]+)\)/gim,'<img src="$2" alt="$1" style="max-width:100%"/>'),o=o.replace(/\[([^\]]+)\]\(([^)]+)\)/gim,'<a href="$2" target="_blank">$1</a>'),o=o.replace(/\*\*([^*]+)\*\*/gim,"<strong>$1</strong>"),o=o.replace(/__([^_]+)__/gim,"<strong>$1</strong>"),o=o.replace(/\*([^*]+)\*/gim,"<em>$1</em>"),o=o.replace(/_([^_]+)_/gim,"<em>$1</em>"),o=o.replace(/\n\n/gim,"<br><br>"),o=o.replace(/\n/gim,"<br>"),o}}y();var I={lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',unlock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',preview:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'};class qo extends HTMLElement{_itemId=0;_content="";_isPreviewMode=!1;_isLocked=!0;_isDirty=!1;_isSaving=!1;_editor=null;_preview=null;_headerActions=null;_lockBtn=null;_togglePreviewBtn=null;static get observedAttributes(){return["item-id"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.loadContent()}attributeChangedCallback(t,o,r){if(t==="item-id"&&o!==r)this._itemId=parseInt(r,10),this.loadContent()}render(){if(!this.shadowRoot)return;let t=this._isLocked?"locked":"unlocked";this.shadowRoot.innerHTML=`
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    background: var(--lb-bg-card);
                    color: var(--lb-text-main);
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                    --lb-accent: var(--accent, #0078D4);
                    --lb-border: var(--border, rgba(255,255,255,0.1));
                    --lb-text-dim: var(--text-dim, rgba(255,255,255,0.5));
                }

                /* Header Actions (Top Right) */
                .header-actions {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    display: flex;
                    gap: 6px; /* Closer gap */
                    z-index: 10;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                :host(:hover) .header-actions {
                    opacity: 1;
                }
                
                :host(.locked) .header-actions {
                    opacity: 1;
                }

                .action-btn {
                    /* Match Notepad .dock-btn / .top-lock-btn style base */
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    color: var(--lb-text-dim);
                    cursor: pointer;
                    width: 28px; /* Match Notepad 28px */
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    backdrop-filter: blur(4px);
                }

                .action-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: var(--lb-text-main);
                    transform: scale(1.05); /* Match Notepad hover effect */
                }

                .action-btn.active {
                    background: var(--lb-accent);
                    color: #fff;
                    border-color: var(--lb-accent);
                }

                /* Lock Button Specifics - Match Notepad .top-lock-btn */
                .action-btn.lock-btn {
                    /* Default (Unlocked/Edit Mode) -> Red/Alert hint */
                    color: #ff453a; 
                    background: rgba(255, 69, 58, 0.15); 
                    border-color: rgba(255, 69, 58, 0.3);
                }
                .action-btn.lock-btn.locked {
                    /* Locked (Safe Mode) -> Dim/Gray */
                    color: var(--lb-text-dim); 
                    background: rgba(0,0,0,0.2); 
                    border-color: rgba(255,255,255,0.05);
                }
                .action-btn.lock-btn.locked:hover {
                    background: rgba(255,255,255,0.1);
                    color: var(--lb-text-main);
                }

                .action-btn svg {
                    width: 14px; /* Match Notepad icon size */
                    height: 14px;
                }

                .editor-container {
                    flex-grow: 1;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    padding-top: 20px; 
                }

                textarea.editor {
                    flex-grow: 1;
                    width: 100%;
                    height: 100%;
                    background: transparent !important;
                    background-color: transparent !important;
                    border: none !important;
                    color: var(--lb-text-main);
                    caret-color: var(--lb-accent);
                    font-family: 'JetBrains Mono', 'Fira Code', monospace;
                    font-size: 14px;
                    padding: 16px;
                    resize: none;
                    outline: none !important;
                    box-shadow: none !important;
                    box-sizing: border-box;
                    line-height: 1.6;
                }

                textarea.editor:disabled {
                    opacity: 0.7; 
                    cursor: default;
                }

                .preview {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    padding: 16px;
                    padding-top: 36px; 
                    overflow-y: auto;
                    box-sizing: border-box;
                    display: none;
                    font-family: var(--lb-font-sans, system-ui, sans-serif);
                    line-height: 1.6;
                    background: var(--lb-bg-card); 
                    z-index: 5;
                }

                /* Markdown Styles for Preview */
                .preview h1, .preview h2, .preview h3 { margin-top: 1em; margin-bottom: 0.5em; color: var(--lb-text-header); font-weight: 600; }
                .preview h1 { font-size: 1.6em; border-bottom: 1px solid var(--lb-border); padding-bottom: 0.3em; }
                .preview h2 { font-size: 1.4em; }
                .preview h3 { font-size: 1.2em; }
                .preview p { margin-bottom: 1em; }
                .preview ul, .preview ol { padding-left: 24px; margin-bottom: 1em; }
                .preview li { margin-bottom: 4px; }
                .preview blockquote { border-left: 3px solid var(--lb-accent); margin: 0 0 1em 0; padding-left: 12px; color: var(--lb-text-dim); font-style: italic; }
                .preview code { background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
                .preview pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; }
                .preview pre code { background: transparent; padding: 0; }
                .preview img { max-width: 100%; border-radius: 6px; margin: 8px 0; }
                .preview a { color: var(--lb-accent); text-decoration: none; }
                .preview a:hover { text-decoration: underline; }
                .preview hr { border: none; border-top: 1px solid var(--lb-border); margin: 16px 0; }
                .preview .checklist-item { display: flex; align-items: start; gap: 8px; margin-bottom: 6px; }
                .preview .checklist-item input { margin-top: 5px; cursor: default; }

                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
            </style>

            <div class="header-actions">
                <button class="action-btn toggle-preview" title="${a.t("widget.markdown.tool.toggle_preview")}" style="${this._isLocked?"display:none":""}">
                    ${I.preview}
                </button>
                <button class="action-btn lock-btn ${t}" title="${this._isLocked?a.t("widget.markdown.tool.unlock"):a.t("widget.markdown.tool.lock")}">
                    ${this._isLocked?I.lock:I.unlock}
                </button>
            </div>

            <div class="editor-container">
                <textarea class="editor" placeholder="${a.t("widget.markdown.placeholder")}" style="${this._isLocked?"display:none":""}"></textarea>
                <div class="preview ${this._isLocked?"visible":""}"></div>
            </div>
        `,this._editor=this.shadowRoot.querySelector(".editor"),this._preview=this.shadowRoot.querySelector(".preview"),this._headerActions=this.shadowRoot.querySelector(".header-actions"),this._lockBtn=this.shadowRoot.querySelector(".lock-btn"),this._togglePreviewBtn=this.shadowRoot.querySelector(".toggle-preview"),this.bindEvents()}bindEvents(){this._editor?.addEventListener("input",()=>this.handleInput()),this._editor?.addEventListener("keydown",(t)=>this.handleKeydown(t)),this._headerActions?.addEventListener("click",(t)=>{let o=t.target.closest(".action-btn");if(!o)return;if(o.classList.contains("toggle-preview"))this.togglePreview();else if(o.classList.contains("lock-btn"))this.toggleLock()})}handleInput(){if(this._isLocked)return;if(this._isDirty=!0,this._isPreviewMode)this.updatePreview()}handleKeydown(t){if(this._isLocked)return;if(t.key==="Tab")t.preventDefault(),this.insertText("  ");if((t.ctrlKey||t.metaKey)&&t.key==="s")t.preventDefault(),this.save()}insertText(t){if(!this._editor)return;let o=this._editor.selectionStart,r=this._editor.selectionEnd,i=this._editor.value;this._editor.value=i.substring(0,o)+t+i.substring(r),this._editor.selectionStart=this._editor.selectionEnd=o+t.length,this.handleInput()}togglePreview(){if(this._isPreviewMode=!this._isPreviewMode,this._togglePreviewBtn)this._togglePreviewBtn.classList.toggle("active",this._isPreviewMode);this.applyViewState()}updatePreview(){if(this._editor&&this._preview)try{this._preview.innerHTML=ft.parse(this._editor.value)}catch(t){console.error("Markdown parsing failed",t),this._preview.innerHTML=`<div class="error">${a.t("widget.markdown.error.preview")}</div>`}}applyViewState(){if(this._isPreviewMode){if(this.updatePreview(),this._preview)this._preview.classList.add("visible"),this._preview.style.display="block";if(this._editor)this._editor.style.display="none",this._editor.style.visibility="hidden"}else{if(this._preview)this._preview.classList.remove("visible"),this._preview.style.display="none";if(this._editor)this._editor.style.display="block",this._editor.style.visibility="visible"}}toggleLock(){if(this._isLocked=!this._isLocked,this._editor)this._editor.disabled=this._isLocked;if(this._lockBtn)if(this._lockBtn.innerHTML=this._isLocked?I.lock:I.unlock,this._lockBtn.title=this._isLocked?a.t("widget.markdown.tool.unlock"):a.t("widget.markdown.tool.lock"),this._isLocked)this._lockBtn.classList.add("locked"),this._lockBtn.classList.remove("unlocked");else this._lockBtn.classList.remove("locked"),this._lockBtn.classList.add("unlocked");if(this._isLocked){if(this._isPreviewMode=!0,this._togglePreviewBtn)this._togglePreviewBtn.style.display="none"}else{if(this._isPreviewMode=!1,this._togglePreviewBtn)this._togglePreviewBtn.style.display="flex",this._togglePreviewBtn.classList.remove("active");this._editor?.focus()}if(this.applyViewState(),this._isLocked&&this._isDirty)this.save()}async loadContent(){if(!this._itemId)return;let o=g.getState().items.find((r)=>r.id===this._itemId);if(o){let r=Q.getMarkdownText(o.content);if(this._content=r,this._editor)this._editor.value=r;if(this._isLocked)this.updatePreview()}}async save(){if(!this._itemId||!this._editor)return;this._isSaving=!0;let t=this._editor.value;this._content=t;try{let r=g.getState().items.find((i)=>i.id===this._itemId);if(r){let i=Q.setMarkdownText(r.content,t);await g.updateItem({...r,content:i}),this._isDirty=!1}}catch(o){console.error(o)}finally{this._isSaving=!1}}}customElements.define("widget-markdown",qo);y();async function Fo(t){try{await a.ensureInitialized(),await t()}catch(o){console.error("[Bootstrap] Critical failure:",o),document.body.innerHTML=`
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
        `}}tt();var j=document.getElementById("main-topbar"),Qo=document.getElementById("right-drawer"),ot=document.getElementById("dashboard-root"),P,rt,it;Fo(async()=>{G.init();let[t,o]=await Promise.all([w.fetchUser(),g.fetchItems()]),r=w.getUser();if(r){if(r.language)await a.setLanguage(r.language);if(r.preferences&&r.preferences.grid_columns)document.documentElement.style.setProperty("--user-preferred-columns",r.preferences.grid_columns.toString());if(r.theme==="dark")G.enableDark();else if(r.theme==="light")G.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)G.enableDark();else G.enableLight();if(r.id)g.setUserId(r.id)}if(j){if(j.setState({user:r}),r&&r.project_name)j.setAttribute("title",r.project_name);w.subscribe((n)=>{if(n){if(j.setState({user:n}),n.project_name)j.setAttribute("title",n.project_name)}})}lr(),W.start(),P=document.createElement("add-bookmark-modal"),document.body.appendChild(P),rt=document.createElement("add-widget-modal"),document.body.appendChild(rt),it=document.createElement("confirmation-modal"),document.body.appendChild(it);let i=document.createElement("widget-config-modal");document.body.appendChild(i)});X.on(O.SHOW_CONFIRMATION,async(t)=>{let{title:o,message:r,onConfirm:i}=t.detail;if(it){if(await it.confirm(o,r)&&i)i()}});X.on(O.SHOW_WIDGET_CONFIG,(t)=>{let{item:o,type:r}=t.detail;if(r==="bookmark"){if(P)P.openForEdit(o)}else{let i=document.querySelector("widget-config-modal");if(i)i.open(o)}});X.on(O.NOTIFY,(t)=>{let o=document.querySelector("app-notifier");if(o)o.show(t.detail.message,t.detail.type)});if(j)j.addEventListener("drawer-toggle",(t)=>{if(t.detail.action==="open")Qo.open(),j.setState({drawerOpen:!0});else Qo.close(),j.setState({drawerOpen:!1})}),j.addEventListener("edit-mode-change",(t)=>{let o=t.detail.active;if(ot.classList.toggle("edit-mode",o),!o)window.location.reload()}),j.addEventListener("search-input",(t)=>{let o=t.detail.query;g.setSearchQuery(o)}),j.addEventListener("add-item",async(t)=>{let o=t.detail.action;if(o==="add-bookmark"){if(P)P.open()}else if(o==="add-widget"){if(rt)rt.open()}else if(o==="add-section"){let i=g.getState().items||[],{collisionService:n}=await Promise.resolve().then(() => (B(),N)),e=n.findFirstAvailableSlot(1,1,i),s={type:"section",x:e.x,y:e.y,w:1,h:1,content:JSON.stringify({title:""})},d=await g.addItem(s);if(d)X.emit(O.SHOW_WIDGET_CONFIG,{item:d,type:"section"})}});window.addEventListener("widget-selected",async(t)=>{let r=t.detail,n=g.getState().items||[],{collisionService:e}=await Promise.resolve().then(() => (B(),N)),s=e.findFirstAvailableSlot(r.defaultW,r.defaultH,n),d={type:"widget",x:s.x,y:s.y,w:r.defaultW,h:r.defaultH,content:JSON.stringify({widgetId:r.id,text:r.id==="notepad"||r.id==="markdown"?"":void 0})};await g.addItem(d)});window.addEventListener("drawer-close",()=>{if(j)j.setState({drawerOpen:!1})});window.addEventListener("click",(t)=>{let o=t.target,r=document.getElementById("add-menu"),i=document.getElementById("add-toggle");if(r&&r.classList.contains("active")&&!r.contains(o)&&i&&!i.contains(o))r.classList.remove("active")});function lr(){if(!ot)return;ot.innerHTML="";let t=document.createElement("bookmark-grid");ot.appendChild(t)}
