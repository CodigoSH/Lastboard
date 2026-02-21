var et=Object.defineProperty;var Y=(o,r)=>{for(var t in r)et(o,t,{get:r[t],enumerable:!0,configurable:!0,set:(i)=>r[t]=()=>i})};var q=(o,r)=>()=>(o&&(r=o(o=0)),r);var po,lo;var Ho=q(()=>{po={id:999,username:"Demo User",initials:"DU",role:"admin",avatar_url:"",accent_color:"blue",language:"en",theme:"dark",grid_columns:12,project_name:"Lastboard",beta_updates:!1,preferences:{accent_color:"blue",language:"en",theme:"dark",grid_columns:12,project_name:"Lastboard",beta_updates:!1}},lo=[{id:1,type:"widget",x:1,y:1,w:2,h:1,content:JSON.stringify({widgetId:"clock",timezone:"local",hour12:!1,showDate:!0,showSeconds:!0})},{id:2,type:"widget",x:1,y:2,w:2,h:1,content:JSON.stringify({widgetId:"telemetry",interval:2000})},{id:3,type:"widget",x:3,y:1,w:3,h:2,content:JSON.stringify({widgetId:"weather",city:"Madrid",latitude:40.4168,longitude:-3.7038,unit:"celsius",showForecast:!0,forecastDays:3})},{id:4,type:"section",x:6,y:1,w:2,h:2,content:JSON.stringify({title:"Project Links"})},{id:5,parent_id:4,type:"bookmark",x:1,y:1,w:1,h:1,content:JSON.stringify({label:"GitHub",url:"https://github.com/CodigoSH/Lastboard",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/git.png"})},{id:6,parent_id:4,type:"bookmark",x:2,y:1,w:1,h:1,content:JSON.stringify({label:"Wiki",url:"https://github.com/CodigoSH/Lastboard/wiki",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bookstack.png"})},{id:7,type:"section",x:8,y:1,w:3,h:2,content:JSON.stringify({title:"Media Services"})},{id:8,parent_id:7,type:"bookmark",x:1,y:1,w:1,h:1,content:JSON.stringify({label:"Plex",url:"https://plex.tv",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/plex.png"})},{id:9,parent_id:7,type:"bookmark",x:2,y:1,w:1,h:1,content:JSON.stringify({label:"Sonarr",url:"https://sonarr.tv",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png"})},{id:10,parent_id:7,type:"bookmark",x:3,y:1,w:1,h:1,content:JSON.stringify({label:"Radarr",url:"https://radarr.video",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png"})},{id:11,parent_id:7,type:"bookmark",x:1,y:2,w:1,h:1,content:JSON.stringify({label:"Jellyfin",url:"https://jellyfin.org",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jellyfin.png"})},{id:12,parent_id:7,type:"bookmark",x:2,y:2,w:1,h:1,content:JSON.stringify({label:"Tautulli",url:"https://tautulli.com",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/tautulli.png"})},{id:13,type:"section",x:11,y:1,w:2,h:3,content:JSON.stringify({title:"Infrastructure"})},{id:14,parent_id:13,type:"bookmark",x:1,y:1,w:1,h:1,content:JSON.stringify({label:"Proxmox",url:"https://proxmox.com",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/proxmox.png"})},{id:15,parent_id:13,type:"bookmark",x:2,y:1,w:1,h:1,content:JSON.stringify({label:"Pi-hole",url:"https://pi-hole.net",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/pi-hole.png"})},{id:16,parent_id:13,type:"bookmark",x:1,y:2,w:1,h:1,content:JSON.stringify({label:"Home Assistant",url:"https://home-assistant.io",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png"})},{id:17,parent_id:13,type:"bookmark",x:2,y:2,w:1,h:1,content:JSON.stringify({label:"Portainer",url:"https://portainer.io",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png"})},{id:18,parent_id:13,type:"bookmark",x:1,y:3,w:1,h:1,content:JSON.stringify({label:"NPM",url:"https://nginxproxymanager.com",icon:"https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nginx-proxy-manager.png"})}]});var Mo={};Y(Mo,{demoService:()=>Q});class Fo{constructor(){this.checkTTL()}checkTTL(){if(!window.LASTBOARD_CONFIG?.demo_mode)return;let o=localStorage.getItem(Ao),r=Date.now();if(!o||r-parseInt(o)>st)console.log("[DemoService] Session expired or new. Resetting demo environment."),this.resetDemo()}resetDemo(){localStorage.setItem(co,JSON.stringify(lo)),localStorage.setItem(go,JSON.stringify(po)),localStorage.setItem(Ao,Date.now().toString())}getItems(){let o=localStorage.getItem(co);return o?JSON.parse(o):lo}saveItems(o){localStorage.setItem(co,JSON.stringify(o))}getUser(){let o=localStorage.getItem(go);return o?JSON.parse(o):po}saveUser(o){localStorage.setItem(go,JSON.stringify(o))}async fetchItems(){return await this.simulateDelay(),this.getItems()}async saveItem(o){await this.simulateDelay();let r=this.getItems();if(o.id){let t=r.findIndex((i)=>i.id===o.id);if(t!==-1)r[t]={...r[t],...o}}else o.id=Date.now(),r.push(o);return this.saveItems(r),o}async deleteItem(o){await this.simulateDelay();let r=this.getItems().filter((t)=>t.id!==o);this.saveItems(r)}async fetchUser(){return await this.simulateDelay(),this.getUser()}async updateUser(o){await this.simulateDelay();let t={...this.getUser(),...o};if(!t.preferences)t.preferences={accent_color:"blue",language:"en",theme:"system",grid_columns:12};if(o.accent_color)t.preferences.accent_color=o.accent_color;if(o.language)t.preferences.language=o.language;if(o.project_name)t.preferences.project_name=o.project_name;this.saveUser(t)}async updatePreferences(o){await this.simulateDelay();let r=this.getUser();if(r.preferences={...r.preferences,...o},o.accent_color)r.accent_color=o.accent_color;if(o.language)r.language=o.language;if(o.project_name)r.project_name=o.project_name;if(o.theme)r.theme=o.theme;this.saveUser(r)}simulateDelay(o=300){return new Promise((r)=>setTimeout(r,o))}}var co="lastboard_demo_items",go="lastboard_demo_user",Ao="lastboard_demo_start",st=3600000,Q;var oo=q(()=>{Ho();Q=new Fo});class Qo{baseUrl;constructor(){this.baseUrl=window.LASTBOARD_CONFIG?.API_BASE_URL||""}getCsrfToken(){let o=document.cookie.split("; ").find((r)=>r.startsWith("csrf_token="));return o?decodeURIComponent(o.split("=")[1]):""}async request(o,r){if(window.LASTBOARD_CONFIG?.demo_mode){let{demoService:e}=await Promise.resolve().then(() => (oo(),Mo)),s=(r.method||"GET").toUpperCase(),p=r.body?JSON.parse(r.body):{};try{if(o==="/api/me")return e.fetchUser();if(o==="/api/user/update-profile")return await e.updateUser(p),{message:"Profile updated (Demo)"};if(o==="/api/user/preferences")return await e.updatePreferences(p),{message:"Preferences updated (Demo)"};if(o==="/api/user/change-password")return{message:"Password changed (Demo)"};if(o==="/api/dashboard")return e.fetchItems();if(o.startsWith("/api/dashboard/item")&&s==="POST")return e.saveItem(p);if(o.startsWith("/api/dashboard/item/")&&s==="PATCH"){let d=parseInt(o.split("/").pop()||"0");return e.saveItem({...p,id:d})}if(o.startsWith("/api/dashboard/item/")&&s==="DELETE"){let d=parseInt(o.split("/").pop()||"0");return await e.deleteItem(d),{message:"Item deleted (Demo)"}}if(o.startsWith("/api/dashboard/health"))return{status:200};if(o==="/api/users"&&s==="GET")return[await e.fetchUser()];if(o==="/api/users")return{message:"Admin action simulated (Demo)"};return console.warn("[DemoMode] Unhandled URL, returning empty object:",o),{}}catch(d){throw console.error("[DemoMode] Error:",d),d}}let t=`${this.baseUrl}${o}`,i=(r.method||"GET").toUpperCase(),n={"Content-Type":"application/json","Cache-Control":"no-cache, no-store, must-revalidate",Pragma:"no-cache",Expires:"0",...r.headers};if(i==="POST"||i==="PUT"||i==="PATCH"||i==="DELETE"){let e=this.getCsrfToken();if(e)n["X-CSRF-Token"]=e}try{let e=await fetch(t,{...r,headers:n,cache:"no-store"});if(!e.ok){let p=await e.json().catch(()=>({}));throw Error(p.error||`HTTP ${e.status}: ${e.statusText}`)}let s=await e.text();return s?JSON.parse(s):{}}catch(e){throw console.error(`[ApiService] Request failed: ${t}`,e),e}}async get(o){return this.request(o,{method:"GET"})}async post(o,r){return this.request(o,{method:"POST",body:JSON.stringify(r)})}async patch(o,r){return this.request(o,{method:"PATCH",body:JSON.stringify(r)})}async put(o,r){return this.request(o,{method:"PUT",body:JSON.stringify(r)})}async delete(o){return this.request(o,{method:"DELETE"})}}var $;var xo=q(()=>{$=new Qo});var F;var bo=q(()=>{xo();F={async getCurrentUser(){return $.get("/api/me")},async updateProfile(o){return $.post("/api/user/update-profile",o)},async updatePreferences(o){return $.post("/api/user/preferences",o)},async changePassword(o){return $.post("/api/user/change-password",o)},async getUsers(){return $.get("/api/users")},async createUser(o){return $.post("/api/users",o)},async adminUpdateUser(o){return $.put("/api/users",o)},async deleteUser(o,r){if(r)return $.post("/api/users/delete",{id:o,admin_password:r});return $.delete(`/api/users?id=${o}`)}}});var X;var Go=q(()=>{X=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}]});class V{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("lastboard_lang"),r=navigator.language.split("-")[0],t="en";if(o&&X.find((i)=>i.code===o))t=o;else if(X.find((i)=>i.code===r))t=r;if(t!=="en")await this.loadLocale(t);this.currentLanguage=t,this.notifyListeners()}static getInstance(){if(!V.instance)V.instance=new V;return V.instance}getLocale(){return{...X.find((r)=>r.code===this.currentLanguage)||X[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let o=(t)=>/^[a-zA-Z]/.test(t);return[...X].sort((t,i)=>{let n=o(t.name),e=o(i.name);if(n&&!e)return-1;if(!n&&e)return 1;return t.name.localeCompare(i.name,void 0,{sensitivity:"base"})})}async loadLocale(o){if(this.cache.has(o))return;try{let r=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!r.ok)throw Error(`Failed to load locale ${o}`);let t=await r.json();this.cache.set(o,t)}catch(r){console.error(r)}}async setLanguage(o){if(X.find((r)=>r.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("lastboard_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,r){let t=this.cache.get(this.currentLanguage),i=this.cache.get("en"),n=t?.[o];if(!n&&i)n=i[o];if(!n)return o;if(r)Object.keys(r).forEach((e)=>{n=n.replace(`{${e}}`,r[e])});return n}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((r)=>r(o))}async ensureInitialized(){return this.initialized}}var a;var f=q(()=>{Go();a=V.getInstance()});var ro={};Y(ro,{userStore:()=>w});class Jo{user=null;listeners=[];isDemo(){return window.LASTBOARD_CONFIG?.demo_mode===!0}constructor(){this.loadFromStorage()}loadFromStorage(){let o=localStorage.getItem("lastboard_user_cache");if(o)try{this.user=JSON.parse(o),this.applyAesthetics(),this.notify()}catch(r){console.error("Failed to parse user cache",r)}}saveToStorage(){if(this.user)localStorage.setItem("lastboard_user_cache",JSON.stringify(this.user))}subscribe(o){if(this.listeners.push(o),this.user)o(this.user);return()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notify(){this.listeners.forEach((o)=>o(this.user)),this.saveToStorage()}setUser(o){if(!o)return;this.user={...o,preferences:{accent_color:o.accent_color||"blue",language:o.language||"en",theme:o.theme,grid_columns:o.grid_columns||12,project_name:o.project_name||"Lastboard",beta_updates:o.beta_updates},project_name:o.project_name||"Lastboard"},this.applyAesthetics(),this.notify()}applyAesthetics(){if(!this.user||!this.user.preferences)return;let o=this.user.preferences,r=document.documentElement;if(o.grid_columns)r.style.setProperty("--user-preferred-columns",`${o.grid_columns}`);else r.style.setProperty("--user-preferred-columns","12");if(o.accent_color){let t=this.getAccentHex(o.accent_color);r.style.setProperty("--accent",t),localStorage.setItem("lastboard_accent",t)}if(o.theme==="light")r.classList.add("light-theme");else r.classList.remove("light-theme")}getAccentHex(o){if(o.startsWith("#"))return o;return{blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"}[o]||"#0078D4"}async updatePreferences(o){if(!this.user||!this.user.preferences)return;if(this.isDemo()){if(this.user.preferences={...this.user.preferences,...o},o.accent_color)this.user.accent_color=o.accent_color;if(o.language)this.user.language=o.language;if(o.project_name)this.user.project_name=o.project_name;if(o.theme)this.user.preferences.theme=o.theme;if(o.grid_columns)this.user.preferences.grid_columns=o.grid_columns;if(await Q.updatePreferences(o),this.applyAesthetics(),this.notify(),window.notifier)window.notifier.show(a.t("general.success")||"Preferences saved");return}let r={...this.user.preferences};if(this.user.preferences={...this.user.preferences,...o},o.accent_color)this.user.accent_color=o.accent_color;if(o.language)this.user.language=o.language;if(o.project_name)this.user.project_name=o.project_name;if(o.theme)this.user.preferences.theme=o.theme;if(o.grid_columns)this.user.preferences.grid_columns=o.grid_columns;if(o.beta_updates!==void 0)this.user.preferences.beta_updates=o.beta_updates;this.applyAesthetics(),this.notify();try{let t={accent_color:this.user.accent_color,language:this.user.language,theme:this.user.preferences.theme,grid_columns:this.user.preferences.grid_columns,project_name:this.user.project_name,beta_updates:this.user.preferences.beta_updates};if(await F.updatePreferences(t),window.notifier)window.notifier.show(a.t("general.success")||"Preferences saved")}catch(t){if(console.error("[UserStore] Failed to sync preferences, rolling back",t),this.user.preferences=r,this.applyAesthetics(),this.notify(),window.notifier)window.notifier.show(a.t("notifier.save_error"),"error");throw t}}async updateProfile(o){if(!this.user)return;try{let r=await F.updateProfile(o);if(r&&r.session_invalidated){if(localStorage.removeItem("lastboard_user_cache"),window.notifier)window.notifier.show(a.t("notifier.username_changed_relogin"));setTimeout(()=>{document.body.style.opacity="0",window.location.href="/login"},2000);return}if(this.user={...this.user,...o},this.notify(),window.notifier)window.notifier.show(a.t("notifier.profile_updated"))}catch(r){if(console.error("[UserStore] Update profile failed",r),window.notifier)window.notifier.show(a.t("notifier.profile_error"),"error")}}async changePassword(o){try{return await F.changePassword(o)}catch(r){throw console.error("[UserStore] Change password failed",r),r}}getUser(){return this.user}async fetchUser(){if(this.isDemo()){let o=await Q.fetchUser();this.setUser(o);return}try{let o=await F.getCurrentUser();this.setUser(o)}catch(o){if(console.error("[UserStore] Error fetching user",o),!this.user){if(window.notifier)window.notifier.show(a.t("auth.session_expired"),"error")}}}}var w;var O=q(()=>{bo();oo();f();w=new Jo});var G;var ho=q(()=>{xo();G={async getItems(){return $.get("/api/dashboard")},async updateItem(o){let r={...o};if(o.parent_id===void 0&&"parent_id"in o)r.clear_parent=!0;return $.patch(`/api/dashboard/item/${o.id}`,r)},async createItem(o){return $.post("/api/dashboard/item",o)},async deleteItem(o){return $.delete(`/api/dashboard/item/${o}`)},async checkHealth(o){return $.get(`/api/dashboard/health?url=${encodeURIComponent(o)}`)}}});var Ro={};Y(Ro,{socketService:()=>pt});class fo{socket=null;statsListeners=[];notificationListeners=[];reconnectTimeout;reconnectDelay=1000;static MAX_DELAY=30000;constructor(){this.connect()}connect(){let o=window.location.protocol==="https:"?"wss:":"ws:",r=window.location.host,t=`${o}//${r}/ws`;this.socket=new WebSocket(t),this.socket.onopen=()=>{this.reconnectDelay=1000},this.socket.onmessage=(i)=>{try{let n=JSON.parse(i.data);if(n.type==="stats")this.notifyStats(n.payload);else this.notifyNotification(n.type,n.payload)}catch(n){console.error("[SocketService] Failed to parse message",n)}},this.socket.onclose=()=>{console.warn("[SocketService] WebSocket closed. Reconnecting..."),this.scheduleReconnect()},this.socket.onerror=(i)=>{console.error("[SocketService] WebSocket error",i),this.socket?.close()}}scheduleReconnect(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);let o=Math.random()*this.reconnectDelay*0.5;this.reconnectTimeout=setTimeout(()=>this.connect(),this.reconnectDelay+o),this.reconnectDelay=Math.min(this.reconnectDelay*2,fo.MAX_DELAY)}destroy(){if(this.reconnectTimeout)clearTimeout(this.reconnectTimeout);if(this.socket)this.socket.onclose=null,this.socket.close(),this.socket=null}subscribe(o){return this.statsListeners.push(o),()=>{this.statsListeners=this.statsListeners.filter((r)=>r!==o)}}subscribeNotification(o){return this.notificationListeners.push(o),()=>{this.notificationListeners=this.notificationListeners.filter((r)=>r!==o)}}notifyStats(o){this.statsListeners.forEach((r)=>r(o))}notifyNotification(o,r){this.notificationListeners.forEach((t)=>t(o,r))}}var pt;var Zo=q(()=>{pt=new fo});var vo={};Y(vo,{updateService:()=>dt});class Bo{version="";compareVersions(o,r){let t=o.replace(/^v/,""),i=r.replace(/^v/,""),n=t.split("-"),e=i.split("-"),s=n[0].split(".").map(Number),p=e[0].split(".").map(Number);for(let l=0;l<3;l++){if(s[l]>p[l])return!0;if(s[l]<p[l])return!1}if(!n[1]&&e[1])return!0;if(n[1]&&!e[1])return!1;if(!n[1]&&!e[1])return!1;let d=n[1].toLowerCase(),c=e[1].toLowerCase();return d>c}async check(o){if(window.LASTBOARD_CONFIG?.demo_mode===!0)return{available:!1,current_version:"v1.3.2",latest_version:"v1.3.2",is_docker:!1};try{let r=await fetch("/api/system/update/check"),t={current_version:"v0.0.0",is_docker:!1,available:!1,os:"linux",arch:"amd64"};if(r.ok)t=await r.json(),this.version=t.current_version;if(t.is_docker)return{available:!1,current_version:this.version,latest_version:this.version,is_docker:!0};try{let i=`https://api-updates.codigosh.com/api/v1/check-update?beta=${o}`,n=await fetch(i);if(n.ok){let e=await n.json();if(this.compareVersions(e.latest_version,this.version)){let p=t.os||"linux",d=t.arch||"amd64",c=`lastboard-${p}-${d}.tar.gz`;return{available:!0,current_version:this.version,latest_version:e.latest_version,asset_url:`https://github.com/CodigoSH/Lastboard/releases/download/${e.latest_version}/${c}`,is_docker:!1}}}}catch(i){console.error("[UpdateService] Proxy check failed",i)}return{available:!1,current_version:this.version,latest_version:this.version,is_docker:!1}}catch(r){return console.error("[UpdateService] Failed to check for updates",r),{available:!1,current_version:this.version||"v0.0.0",latest_version:"v0.0.0",is_docker:!1}}}}var dt;var uo=q(()=>{dt=new Bo});var T={};Y(T,{collisionService:()=>J});var J;var U=q(()=>{J={isOverlap(o,r){return o.x<r.x+r.w&&o.x+o.w>r.x&&o.y<r.y+r.h&&o.y+o.h>r.y},calculateDropValidity(o,r,t=12){let i=Number(o.x),n=Number(o.y),e=Number(o.w),s=Number(o.h);if(i<1||i+e-1>t||n<1)return{valid:!1,x:i,y:n};let d=r.find((l)=>l.id===o.id)?.type==="section",c={x:i,y:n,w:e,h:s};for(let l of r){if(l.id===o.id)continue;let x=Number(l.x),u=Number(l.y),v=Number(l.w||1),y=Number(l.h||1),_={x,y:u,w:v,h:y};if(l.parent_id){let k=r.find((b)=>b.id===l.parent_id);if(k)_.x=Number(k.x)+x-1,_.y=Number(k.y)+u-1;else continue}if(this.isOverlap(c,_)){if(d&&l.parent_id===o.id){let k=Number(l.x),b=Number(l.y),H=Number(l.w||1),A=Number(l.h||1);if(k+H-1>e)return{valid:!1,x:i,y:n};if(b+A-1>s)return{valid:!1,x:i,y:n};continue}if(!d&&l.type==="section"){let k=i-Number(l.x)+1,b=n-Number(l.y)+1;if(k<1||k+e-1>Number(l.w||1)||b<1||b+s-1>Number(l.h||1))return{valid:!1,x:i,y:n};let H=r.filter((h)=>h.parent_id===l.id),A=!1;for(let h of H){let B={x:Number(h.x),y:Number(h.y),w:Number(h.w||1),h:Number(h.h||1)},K={x:k,y:b,w:e,h:s};if(this.isOverlap(K,B)){A=!0;break}}if(!A)return{valid:!0,x:i,y:n,targetGroup:l}}return{valid:!1,x:i,y:n}}}return{valid:!0,x:i,y:n}},snapToGrid(o,r,t,i){let n=t+i,e=Math.max(1,Math.floor(o/n)+1),s=t+i,p=Math.max(1,Math.floor(r/s)+1);return{x:e,y:p}},findFirstAvailableSlot(o,r,t,i=12){return this.findCompactPosition(o,r,t,i)},findAvailableSlot(o,r,t,i){let n=1;while(!0){for(let e=1;e<=i-o+1;e++){let s={x:e,y:n,w:o,h:r},p=!1;for(let d of t)if(this.isOverlap(s,d)){p=!0;break}if(!p)return{x:e,y:n}}if(n++,n>500)return console.warn("[CollisionService] Grid exhausted, no available slot found. Grid may be full."),{x:1,y:500}}},findCompactPosition(o,r,t,i,n){let e=1,s=1;while(!0){for(let p=1;p<=i-o+1;p++){let d={x:p,y:e,w:o,h:r},c=!1;for(let l of t){if(n&&l.id===n)continue;let x={x:l.x,y:l.y,w:l.w||1,h:l.h||1};if(this.isOverlap(d,x)){c=!0;break}}if(!c)return{x:p,y:e}}if(e++,e>500)return console.warn("[CollisionService] Grid exhausted, no compact position found. Grid may be full."),{x:1,y:500}}}}});var Yo={};Y(Yo,{dashboardStore:()=>g});class Ko{state={isEditing:!1,items:[],searchQuery:"",isOffline:!1,updateAvailable:!1,loading:!0,stats:null,availableWidth:1200,gridColumns:12};listeners=[];userId=0;getStorageKey(){return this.userId?`lastboard-items-${this.userId}`:"lastboard-items"}setUserId(o){this.userId=o}isDemo(){return window.LASTBOARD_CONFIG?.demo_mode===!0}constructor(){if(!this.isDemo())this.initSocket(),this.checkSystemUpdate()}initSocket(){Promise.resolve().then(() => (Zo(),Ro)).then(({socketService:o})=>{o.subscribe((r)=>{this.state.stats={cpu_usage:r.cpu_usage,ram_usage:r.ram_usage,temperature:r.temperature},this.notify()}),o.subscribeNotification((r,t)=>{if(r==="update_available")console.log("[DashboardStore] Real-time update detected:",t.latest_version),this.checkSystemUpdate()})})}async checkSystemUpdate(){try{setTimeout(async()=>{let{userStore:o}=await Promise.resolve().then(() => (O(),ro)),{updateService:r}=await Promise.resolve().then(() => (uo(),vo)),i=o.getUser()?.preferences?.beta_updates||!1;if((await r.check(i)).available)this.state.updateAvailable=!0,this.notify()},2000)}catch(o){}}saveToLocalStorage(){try{let o=JSON.stringify(this.state.items);localStorage.setItem(this.getStorageKey(),o)}catch(o){if(console.error("[DashboardStore] Failed to save to localStorage",o),o.name==="QuotaExceededError"||o.code===22)this.sanitizeStorage()}}loadFromLocalStorage(){try{this.sanitizeStorage();let o=localStorage.getItem(this.getStorageKey());if(o){let r=JSON.parse(o);if(Array.isArray(r)&&r.length>0)this.state.items=r}}catch(o){console.error("[DashboardStore] Failed to load from localStorage",o)}}sanitizeStorage(){try{let o=[];for(let r=0;r<localStorage.length;r++){let t=localStorage.key(r);if(t&&(t.includes("user_cache")||t.includes("old_dashboard_")))o.push(t)}o.forEach((r)=>localStorage.removeItem(r))}catch(o){}}subscribe(o){return this.listeners.push(o),this.ensureItemsIsArray(),o({...this.state,items:this.deepCopyItems(this.state.items)}),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}ensureItemsIsArray(){if(!Array.isArray(this.state.items))console.error("[DashboardStore] CRITICAL: items is not an array, resetting to empty array",typeof this.state.items),this.state.items=[]}deepCopyItems(o){return o.map((r)=>{let t=r.content;if(typeof r.content==="string")try{let i=JSON.parse(r.content);if(typeof i==="object"&&i!==null)t=JSON.stringify(i)}catch{}return{...r,content:t,status:r.status}})}setItemStatus(o,r){let t=this.state.items.findIndex((i)=>i.id===o);if(t===-1)return;if(this.state.items[t].status===r)return;this.state.items[t].status=r,this.notify()}notify(){this.ensureItemsIsArray();let o={...this.state,items:this.deepCopyItems(this.state.items)};this.listeners.forEach((r)=>r(o))}setEditMode(o){this.state.isEditing=o,this.notify()}toggleEditMode(){this.setEditMode(!this.state.isEditing)}setSearchQuery(o){this.state.searchQuery=o.toLowerCase().trim(),this.notify()}setGridMetrics(o,r){if(o===this.state.availableWidth&&r===this.state.gridColumns)return;this.state.availableWidth=o,this.state.gridColumns=r,this.notify()}async fetchItems(){if(this.isDemo()){let r=await Q.fetchItems();this.state.items=r,this.state.loading=!1,this.notify();return}let o=localStorage.getItem(this.getStorageKey());if(o)try{let r=JSON.parse(o);if(Array.isArray(r)&&r.length>0)this.state.items=r,this.state.loading=!1,this.notify()}catch(r){console.warn("[DashboardStore] Failed to parse cached items",r)}try{let r=await G.getItems();if(Array.isArray(r)){let t=JSON.stringify(this.state.items)!==JSON.stringify(r);if(this.state.items=r,this.state.isOffline=!1,this.state.loading=!1,this.saveToLocalStorage(),t)this.notify()}else throw Error("Backend returned invalid data")}catch(r){if(console.error("[DashboardStore] API fetch failed",r),this.state.isOffline=!0,this.state.loading=!1,this.state.items.length===0)this.state.items=[...lt],this.saveToLocalStorage(),this.notify();else this.notify()}}async updateItem(o){if(this.isDemo()){let r=this.state.items.findIndex((t)=>t.id===o.id);if(r!==-1)this.state.items[r]={...this.state.items[r],...o},await Q.saveItem(this.state.items[r]),this.notify();return}try{this.ensureItemsIsArray();let r=this.state.items.findIndex((i)=>i.id===o.id);if(r===-1){console.warn("[DashboardStore] Item not found for update:",o.id);return}let t={...this.state.items[r]};this.state.items[r]={...this.state.items[r],...o},this.saveToLocalStorage(),this.notify();try{await G.updateItem(o),this.state.isOffline=!1,this.notify()}catch(i){console.error("[DashboardStore] Failed to sync item update (offline?), keeping local state",i),this.state.isOffline=!0,this.saveToLocalStorage(),this.notify()}}catch(r){console.error("[DashboardStore] Error updating item",r)}}async resizeItem(o,r,t){let i=this.state.items.find((n)=>n.id===o);if(!i)return;if(await this.updateItem({id:o,w:r,h:t}),i.type==="section")await this.reflowChildren(o,r)}async reflowChildren(o,r){let{collisionService:t}=await Promise.resolve().then(() => (U(),T)),i=this.state.items.filter((e)=>e.parent_id===o).sort((e,s)=>e.y-s.y||e.x-s.x);if(i.length===0)return;let n=[];for(let e of i){let s=t.findAvailableSlot(e.w,e.h,n,r);if(n.push({x:s.x,y:s.y,w:e.w,h:e.h}),e.x!==s.x||e.y!==s.y)await this.updateItem({id:e.id,x:s.x,y:s.y})}}async addItem(o){if(this.isDemo()){let r=await Q.saveItem(o);return this.state.items.push(r),this.notify(),r}try{this.ensureItemsIsArray();try{let r={...o};if(r.type==="widget"&&!r.url)r.url="";let{userStore:t}=await Promise.resolve().then(() => (O(),ro)),n=t.getUser()?.preferences,e=this.state.gridColumns;if(!e||e<1){let p=n?.widget_min_width||140,d=16,c=document.querySelector("bookmark-grid"),l=this.state.availableWidth||c?.clientWidth||window.innerWidth;e=Math.floor((l+16)/(p+16))}if(e<1)e=1;if(e>24)e=24;if(!r.x||!r.y){let{collisionService:p}=await Promise.resolve().then(() => (U(),T)),d=p.findFirstAvailableSlot(r.w||1,r.h||1,this.state.items,e);r.x=d.x,r.y=d.y}let s=await G.createItem(r);return this.state.isOffline=!1,this.state.items.push(s),this.saveToLocalStorage(),this.notify(),s}catch(r){console.error("[DashboardStore] Failed to add item to backend",r);return}}catch(r){console.error("[DashboardStore] Error adding item",r);return}}async deleteItem(o){if(this.isDemo()){this.state.items=this.state.items.filter((r)=>r.id!==o),await Q.deleteItem(o),this.notify();return}try{this.ensureItemsIsArray();let r=this.state.items.findIndex((i)=>i.id===o);if(r===-1){console.warn("[DashboardStore] Item not found for deletion:",o);return}let t=this.state.items[r];this.state.items.splice(r,1),this.saveToLocalStorage(),this.notify();try{await G.deleteItem(o)}catch(i){console.error("[DashboardStore] Failed to delete item, rolling back",i),this.state.items.push(t),this.saveToLocalStorage(),this.notify()}}catch(r){console.error("[DashboardStore] Error deleting item",r)}}getState(){return this.ensureItemsIsArray(),{...this.state,items:[...this.state.items]}}}var lt,g;var j=q(()=>{ho();oo();lt=[{id:1,type:"bookmark",x:1,y:1,w:1,h:1,content:{label:"CodigoSH",url:"https://github.com/CodigoSH/Lastboard",icon:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/git.webp",iconName:"git"}}];g=new Ko});var wo={};Y(wo,{eventBus:()=>E,EVENTS:()=>N});var N,qr,E;var to=q(()=>{N={SHOW_CONFIRMATION:"lastboard:show-confirmation",SHOW_PASSWORD_CONFIRM:"lastboard:show-password-confirm",SHOW_WIDGET_CONFIG:"lastboard:show-widget-config",NOTIFY:"lastboard:notify"};qr=class qr extends EventTarget{emit(o,r){this.dispatchEvent(new CustomEvent(o,{detail:r}))}on(o,r){this.addEventListener(o,r)}off(o,r){this.removeEventListener(o,r)}};E=new qr});O();j();j();ho();class Xo{interval=null;checkFrequency=300000;start(){if(this.interval)return;setTimeout(()=>this.checkAll(),2000),this.interval=window.setInterval(()=>{this.checkAll()},this.checkFrequency)}stop(){if(this.interval)clearInterval(this.interval),this.interval=null}async checkAll(){let r=g.getState().items.filter((s)=>{if(s.type!=="bookmark")return!1;let p=s.content;if(typeof p==="string")try{p=JSON.parse(p)}catch(d){return!1}return p&&p.statusCheck===!0});r.forEach((s)=>this.updateUIStatus(s.id,"pending"));let t=5,i=[...r],n=async()=>{while(i.length>0){let s=i.shift();if(s)await this.checkItem(s)}},e=Array(Math.min(r.length,t)).fill(null).map(()=>n());await Promise.all(e)}async checkItem(o){let r=o.content;if(typeof r==="string")try{r=JSON.parse(r)}catch(i){return}let t=r.url;if(!t||t==="#"||t.startsWith("javascript:"))return;try{if((await G.checkHealth(t)).status==="up")this.updateUIStatus(o.id,"up");else this.updateUIStatus(o.id,"down")}catch(i){console.warn(`[StatusService] ${t} health check failed:`,i),this.updateUIStatus(o.id,"down")}}updateUIStatus(o,r){g.setItemStatus(o,r)}}var I=new Xo;class M{static STORAGE_KEY="lastboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,r,t){let i="";if(t){let n=new Date;n.setTime(n.getTime()+t*24*60*60*1000),i="; expires="+n.toUTCString()}document.cookie=o+"="+(r||"")+i+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let r=await o.json();if(r.theme==="dark")this.enableDark();else if(r.theme==="light")this.enableLight()}}catch(o){}}}f();var Oo=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var Uo=`:host {
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
}`;class No extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${Uo}</style>
            ${Oo()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",No);var Eo=`:host {
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
}`;f();class Vo extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(o){if(this.getAttribute("type")==="submit"){let r=this.closest("form");if(r)if(r.requestSubmit)r.requestSubmit();else r.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(o){this._loading=o,this.render()}get loading(){return this._loading}render(){let o=this.getAttribute("variant")||"ghost",r=this._loading?a.t("general.loading"):"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${Eo}</style>
            <button class="btn btn--${o}" ${this._loading?"disabled":""}>
                ${r}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",Vo);var To=({src:o,initials:r,alt:t})=>`
    <div class="avatar" title="${t}">
        ${o?`<img src="${o}" alt="${t}" class="avatar__img">`:`<span class="avatar__initials">${r}</span>`}
    </div>
`;var Do=`:host {
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
}`;f();class Co extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(o,r,t){if(r!==t)this.render()}render(){let o=this.getAttribute("src"),r=this.getAttribute("initials")||"??",t=this.getAttribute("alt")||a.t("general.user_avatar");this.shadowRoot.innerHTML=`
            <style>${Do}</style>
            ${To({src:o||void 0,initials:r,alt:t})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",Co);f();O();bo();f();var Po=(o)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.profile")}</div>
            <div class="settings-content__profile-header">
                <div class="settings-content__avatar-container" style="cursor: pointer;" onclick="this.nextElementSibling.click()">
                    <app-avatar initials="${o.initials||"??"}" src="${o.avatar_url||""}" style="width: 80px; height: 80px; font-size: 32px;"></app-avatar>
                    <div class="settings-content__edit-overlay">${a.t("action.change_image")}</div>
                </div>
                <input type="file" id="avatar-upload" style="display: none;" accept="image/*" onchange="this.getRootNode().host.handleAvatarChange(event)">
                <div class="settings-content__profile-info">
                    <span class="settings-content__profile-name">${o.username||a.t("settings.default_user")}</span>
                    <span class="mono-tag">
                        ${(()=>{let r=(o.role||"").toLowerCase();if(o.is_superadmin)return a.t("settings.role_super_admin");if(r==="admin"||r==="administrator")return a.t("settings.role_admin");if(r==="user")return a.t("settings.role_user");return o.role||a.t("settings.default_role")})()}
                    </span>
                </div>
            </div>
            
            <div class="settings-content__form-container" style="margin-top: 32px;">
                <div class="settings-content__form-group">
                    <label class="settings-content__label">${a.t("settings.display_username")}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="username-input" class="settings-content__input" value="${o.username||""}" placeholder="${a.t("settings.display_username")}">
                        <app-button variant="primary" onclick="this.getRootNode().host.updateUsername(this.getRootNode().getElementById('username-input').value)">${a.t("action.update")}</app-button>
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
`,Wo=(o,r,t)=>`
    <div class="bento-grid">
        <div class="bento-card">
             <div class="mono-tag" style="margin-bottom: 8px;">${a.t("settings.appearance")}</div>
             <h3 class="settings-content__title">${a.t("settings.studio_accent")}</h3>
             <div class="settings-content__color-grid">
                ${t.map((i)=>`
                    <div class="settings-content__color-swatch ${o.accent_color===i?"settings-content__color-swatch--active":""}" 
                         style="background-color: ${r[i]}"
                         onclick="this.getRootNode().host.savePrefs({accent_color: '${i}'})">
                         ${o.accent_color===i?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>':""}
                    </div>
                `).join("")}
                <div class="settings-content__color-swatch settings-content__color-swatch--custom ${o.accent_color.startsWith("#")?"settings-content__color-swatch--active":""}" 
                     style="background-color: ${o.accent_color.startsWith("#")?o.accent_color:"transparent"}">
                     <svg viewBox="0 0 24 24" style="z-index: 5; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                        <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                     </svg>
                     <app-color-picker class="settings-content__swatch-picker" trigger-opacity="0" value="${o.accent_color.startsWith("#")?o.accent_color:"#0078D4"}" 
                            onchange="this.getRootNode().host.savePrefs({accent_color: this.value})"></app-color-picker>
                </div>
             </div>
        </div>

        <div class="bento-card">
            <div class="mono-tag settings-content__section-spacer" style="margin-bottom: 8px;">${a.t("settings.system_locale")}</div>
            <h3 class="settings-content__title">${a.t("settings.localization")}</h3>

            <div class="settings-content__form-group">
                <label class="settings-content__label">${a.t("settings.language")}</label>
                <app-select id="language-select" value="${o.language}"></app-select>
            </div>

            <div class="settings-content__form-group">
                <label class="settings-content__label">${a.t("settings.theme_mode")}</label>
                <div class="settings-content__segmented-control">
                    <button class="settings-content__segment ${!o.theme||o.theme==="system"||o.theme==="dark"?"active":""}"
                            onclick="this.getRootNode().host.savePrefs({theme: 'dark'})">
                        \uD83C\uDF19 ${a.t("settings.dark")}
                    </button>
                    <button class="settings-content__segment ${o.theme==="light"?"active":""}"
                            onclick="this.getRootNode().host.savePrefs({theme: 'light'})">
                        ☀️ ${a.t("settings.light")}
                    </button>
                </div>
            </div>
        </div>
    </div>
`,Io=(o)=>`
    <div class="bento-grid">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.fluid_grid_architecture")}</div>
            
            <!-- Project Name -->
            <div class="settings-content__form-group" style="margin-bottom: 24px;">
                <label class="settings-content__label">${a.t("settings.project_name")}</label>
                <div style="display: flex; gap: 8px;">
                     <input type="text" 
                            id="project-name-input"
                            class="settings-content__input" 
                            value="${o.project_name||"Lastboard"}" 
                            placeholder="Lastboard">
                     <app-button variant="primary" onclick="this.getRootNode().host.savePrefs({project_name: this.getRootNode().getElementById('project-name-input').value})">${a.t("action.update")}</app-button>
                </div>
            </div>

            <div class="settings-content__personalization-grid">
                <div class="settings-content__slider-group">
                    <div class="settings-content__slider-header">
                        <label class="settings-content__slider-label">${a.t("settings.grid_columns")}</label>
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
                ${a.t("settings.density_desc")}
            </p>
        </div>
    </div>
`,So=(o)=>`
    <div class="bento-grid" style="grid-template-columns: 1fr;">
        <div class="bento-card">
            <div class="mono-tag" style="margin-bottom: 12px;">${a.t("settings.admin_section")}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 class="settings-content__title" style="margin: 0;">${a.t("settings.user_management")}</h3>
                <app-button variant="primary" onclick="this.getRootNode().host.openAddUserModal()" style="width: auto; padding: 0 16px;">+ ${a.t("action.add_user")}</app-button>
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
                                    ${(()=>{let t=(r.role||"").toLowerCase();if(r.is_superadmin)return a.t("settings.role_super_admin");if(t==="admin"||t==="administrator")return a.t("settings.role_admin");if(t==="user")return a.t("settings.role_user");return r.role})()}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                             <app-button variant="ghost" onclick="this.getRootNode().host.openEditUserModal(${r.id}, '${r.username}', '${r.role}')">${a.t("general.edit")}</app-button>
                            <app-button variant="ghost" onclick="this.getRootNode().host.deleteUser(${r.id})">${a.t("general.delete")}</app-button>
                        </div>
                    </div>
                `).join("")}
            </div>
             ${(o||[]).length===0?`<p class="settings-content__text-dim">${a.t("settings.no_users")}</p>`:""}
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
`,or=()=>`
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
             <app-button onclick="this.getRootNode().host.executeFactoryReset()" style="border-color: var(--danger-color); color: var(--danger-color); background: transparent; transition: all 0.2s;">
                ${a.t("action.reset_system")}
             </app-button>
        </div>
    </div>


`,bt=(o,r)=>{if(!o)return"";if(!r)return"";if(r.is_docker)return`
            <div style="background: rgba(var(--info-rgb), 0.1); border: 1px solid rgba(var(--info-rgb), 0.3); padding: 16px; border-radius: var(--radius); width: 100%; text-align: left;">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: var(--accent); flex-shrink: 0;"><path d="M21 12l-4.37-6.16c-.37-.52-.98-.84-1.63-.84h-3V4c0-1.1-.9-2-2-2s-2 .9-2 2v1H5c-.65 0-1.26.32-1.63.84L-1 12v3h2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h2v-3zm-11 7H7v-3h3v3zm-5 0H2v-3h3v3zm12 0h-3v-3h3v3z"/></svg>
                    <div>
                        <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-main);">${a.t("settings.docker_mode")}</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-dim);">
                            ${a.t("settings.docker_desc")}<br>
                            ${r.available?`<strong style="color: var(--accent);">${a.t("settings.new_version_notif")} (${r.latest_version})</strong>`:a.t("settings.up_to_date_docker_msg")}
                        </p>
                    </div>
                    </div>
            </div>
        `;if(r.available)return`
            <div class="update-modal">
                <div class="update-modal__glow"></div>
                
                <div class="update-modal__content">
                    <div class="update-modal__header">
                        <div class="update-modal__badge">${a.t("settings.update_available")}</div>
                        <h3 class="update-modal__version">${r.latest_version}</h3>
                    </div>
                    
                    <div class="update-modal__footer">
                        <app-button variant="primary" id="btn-update-now" style="flex: 1; justify-content: center;" onclick="this.getRootNode().host.performUpdate('${r.asset_url}')">
                            ${a.t("action.download_install")}
                        </app-button>
                        <a href="https://github.com/CodigoSH/Lastboard/releases" target="_blank" style="text-decoration: none;">
                            <app-button variant="ghost" style="height: 100%;">${a.t("general.changelog")}</app-button>
                        </a>
                    </div>
                    <div id="update-status" style="display: none; margin-top: 12px; padding: 12px; background: rgba(var(--accent-rgb), 0.1); border: 1px solid rgba(var(--accent-rgb), 0.3); border-radius: 8px; text-align: center;">
                        <p style="margin: 0; font-size: 13px; color: var(--accent); font-weight: 500;">${a.t("notifier.downloading_secure")}</p>
                    </div>
                </div>
            </div>
        `;return`
        <div style="color: var(--success-color); font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500;">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <span>${a.t("settings.up_to_date")}</span>
        </div>
    `},_o=(o,r,t)=>{return`
        <div id="update-status-container" style="display: inline-flex; flex-direction: column; gap: 16px; align-items: center; width: 100%; max-width: 400px; min-height: 48px;">
            ${bt(o,r)}
        </div>

        ${o?`
        <div style="margin-top: 16px;">
            <app-button variant="ghost" 
                        id="btn-check-updates"
                        ?loading="${t}"
                        onclick="this.getRootNode().host.handleManualCheckUpdates()">
                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; margin-right: 8px; fill: currentColor;"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                ${a.t("action.check_updates")}
            </app-button>
        </div>
        `:""}
    `},rr=(o,r,t,i,n)=>{let e=t?.toLowerCase()==="admin"||t?.toLowerCase()==="administrator";return`
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
                <p class="settings-content__text-dim" style="margin: 0;">${o}</p>
            </div>

              <div id="update-zone-wrapper" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                ${_o(e,r,n)}
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
        `};var mo=`:host {
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
}`;class tr extends HTMLElement{_options=[];_value="";isOpen=!1;_boundOutsideClick;dropdownEl=null;_boundScroll;_boundResize;isInsideDialog=!1;static get observedAttributes(){return["value"]}constructor(){super();this.attachShadow({mode:"open"}),this._boundOutsideClick=this.handleOutsideClick.bind(this),this._boundScroll=(o)=>{if(this.dropdownEl&&this.dropdownEl.contains(o.target))return;this.close()},this._boundResize=this.close.bind(this)}connectedCallback(){this.ensureGlobalStyles(),this.render(),this.isInsideDialog=!!this.closest("dialog"),document.addEventListener("click",this._boundOutsideClick,!0),window.addEventListener("scroll",this._boundScroll,!0),window.addEventListener("resize",this._boundResize)}disconnectedCallback(){this.close(),document.removeEventListener("click",this._boundOutsideClick,!0),window.removeEventListener("scroll",this._boundScroll,!0),window.removeEventListener("resize",this._boundResize)}ensureGlobalStyles(){if(!document.getElementById("app-select-portal-css")){let o=document.createElement("style");o.id="app-select-portal-css",o.textContent=mo,document.head.appendChild(o)}}get value(){return this._value}set value(o){if(this._value!==o)this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay()}set options(o){this._options=o,this.updateTriggerDisplay()}attributeChangedCallback(o,r,t){if(o==="value"&&r!==t)this._value=t,this.updateTriggerDisplay()}updateTriggerDisplay(){if(!this.shadowRoot)return;let o=this.shadowRoot.querySelector(".select-value");if(o){let r=this._options.find((t)=>t.value===this._value)||this._options[0];o.textContent=r?r.label:"Select..."}}toggle(){if(this.isOpen)this.close();else this.open()}open(){if(this.isOpen)return;if(this.close(),this.isOpen=!0,this.setAttribute("open",""),this.dropdownEl=document.createElement("div"),this.dropdownEl.className="select-dropdown",this.dropdownEl.innerHTML=this._options.map((o)=>`
            <div class="select-option ${o.value===this._value?"selected":""}" 
                 data-value="${o.value}">
                 ${o.label}
            </div>
        `).join(""),this.dropdownEl.querySelectorAll(".select-option").forEach((o)=>{o.addEventListener("click",(r)=>{r.stopPropagation();let t=r.currentTarget.dataset.value;if(t)this.selectOption(t)})}),this.isInsideDialog)this.dropdownEl.style.position="absolute",this.dropdownEl.style.left="0",this.dropdownEl.style.right="0",this.dropdownEl.style.top="100%",this.dropdownEl.style.marginTop="6px",this.shadowRoot.appendChild(this.dropdownEl);else{let o=this.shadowRoot.getElementById("trigger");if(o){let r=o.getBoundingClientRect();this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${r.bottom+6}px`,this.dropdownEl.style.left=`${r.left}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}document.body.appendChild(this.dropdownEl)}requestAnimationFrame(()=>{if(this.dropdownEl)this.dropdownEl.classList.add("open")})}positionPortal(){if(!this.dropdownEl||!this.shadowRoot)return;let o=this.shadowRoot.getElementById("trigger");if(!o)return;let r=o.getBoundingClientRect(),t=r.bottom+6,i=r.left,n=300;if(t+n>window.innerHeight&&r.top-n>0)t=r.top-6-n;this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${t}px`,this.dropdownEl.style.left=`${i}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}close(){if(this.dropdownEl)this.dropdownEl.remove(),this.dropdownEl=null;this.isOpen=!1,this.removeAttribute("open")}handleOutsideClick(o){if(!this.isOpen)return;let r=o.composedPath();if(r.includes(this))return;if(this.dropdownEl&&r.includes(this.dropdownEl))return;this.close()}selectOption(o){this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay(),this.dispatchEvent(new CustomEvent("change",{detail:o,bubbles:!0})),this.close()}render(){if(!this.shadowRoot)return;let o=this._options.find((t)=>t.value===this._value)||this._options[0],r=o?o.label:"Select...";this.shadowRoot.innerHTML=`
            <style>${mo}</style>
            <div class="select-wrapper">
                <div class="select-trigger" id="trigger">
                    <div class="select-value">
                        ${r}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `,this.shadowRoot.getElementById("trigger")?.addEventListener("click",(t)=>{t.stopPropagation(),this.toggle()})}}if(!customElements.get("app-select"))customElements.define("app-select",tr);var yo=`:host {
    display: inline-block;
    position: relative;
    width: 100%;
    height: 100%;
}

/* Trigger Button */
.color-trigger {
    width: 100%;
    height: 100%;
    border-radius: 4px;
    /* Matches swatch radius */
    cursor: pointer;
    border: none;
    padding: 0;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}

/* Popover Dialog */
.popover {
    position: fixed;
    background: #1e1e23;
    background: var(--surface-solid, #1e1e23);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    border-radius: 12px;
    padding: 12px;
    width: 240px;
    margin: 0;
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    flex-direction: column;
    gap: 12px;
}

.popover[open] {
    display: flex;
}

.popover.visible {
    opacity: 1;
    transform: translateY(0);
}

.popover::backdrop {
    background: transparent;
    backdrop-filter: none;
}

/* Saturation/Brightness Area */
.saturation-area {
    width: 100%;
    height: 160px;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    cursor: crosshair;
    /* Base color set via inline style background-color */
    background-image:
        linear-gradient(to top, #000, 0% 1000px, transparent),
        linear-gradient(to right, #fff, 0% 1000px, transparent);
    /* Note: The order matters. White horizontal, Black vertical. */
    background-blend-mode: normal, normal;
    /* Default behavior */
}

/* CSS Gradients for Saturation/Value */
.saturation-white {
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, #fff, rgba(255, 255, 255, 0));
}

.saturation-black {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, #000, rgba(0, 0, 0, 0));
}

.saturation-cursor {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

/* Hue Slider */
.hue-slider {
    width: 100%;
    height: 12px;
    position: relative;
    border-radius: 6px;
    background: linear-gradient(to right,
            #f00 0%, #ff0 17%, #0f0 33%,
            #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
    cursor: pointer;
}

.hue-cursor {
    position: absolute;
    top: 50%;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    transform: translate(-50%, -50%);
    pointer-events: none;
    border: 2px solid white;
    /* Make it look like a handle */
}

/* Controls Row */
.controls {
    display: flex;
    gap: 8px;
    align-items: center;
}

.color-preview {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid var(--border);
    flex-shrink: 0;
}

.hex-input {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--text-main);
    padding: 6px 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 13px;
    text-transform: uppercase;
    outline: none;
    text-align: center;
}

.hex-input:focus {
    border-color: var(--accent);
    background: var(--input-bg);
}

`;class ir extends HTMLElement{static get observedAttributes(){return["value","trigger-opacity"]}_value="#0078D4";_h=210;_s=100;_v=83;_popover=null;_satArea=null;_satCursor=null;_hueSlider=null;_hueCursor=null;_hexInput=null;_preview=null;_isDraggingSat=!1;_isDraggingHue=!1;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.bindEvents(),this.hexToHsv(this._value),this.updateUI()}disconnectedCallback(){window.removeEventListener("resize",this.updatePositionRef),window.removeEventListener("scroll",this.updatePositionRef,!0),window.removeEventListener("mousemove",this.onMouseMoveSat),window.removeEventListener("mouseup",this.onMouseUpSat),window.removeEventListener("mousemove",this.onMouseMoveHue),window.removeEventListener("mouseup",this.onMouseUpHue)}get value(){return this._value}set value(o){if(this._value!==o){if(this._value=o,this.hexToHsv(o),this.updateUI(),this._hexInput)this._hexInput.value=o}}attributeChangedCallback(o,r,t){if(o==="value"&&r!==t)this.value=t;else if(o==="trigger-opacity"&&r!==t)this.updateTriggerOpacity(t)}updateTriggerOpacity(o){if(this.shadowRoot){let r=this.shadowRoot.getElementById("trigger");if(r)r.style.opacity=o}}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
            <style>${yo}</style>

            <button class="color-trigger" id="trigger">
                <slot></slot>
            </button>

            <dialog class="popover" id="popover">
                <style>${yo}</style>
                <div class="saturation-area" id="sat-area">
                    <div class="saturation-white"></div>
                    <div class="saturation-black"></div>
                    <div class="saturation-cursor" id="sat-cursor"></div>
                </div>

                <div class="hue-slider" id="hue-slider">
                    <div class="hue-cursor" id="hue-cursor"></div>
                </div>

                <div class="controls">
                    <div class="color-preview" id="preview"></div>
                    <input type="text" class="hex-input" id="hex-input" value="${this._value}" maxlength="7">
                </div>
            </dialog>
        `,this._popover=this.shadowRoot.querySelector("#popover"),this._satArea=this.shadowRoot.querySelector("#sat-area"),this._satCursor=this.shadowRoot.querySelector("#sat-cursor"),this._hueSlider=this.shadowRoot.querySelector("#hue-slider"),this._hueCursor=this.shadowRoot.querySelector("#hue-cursor"),this._hexInput=this.shadowRoot.querySelector("#hex-input"),this._preview=this.shadowRoot.querySelector("#preview")}bindEvents(){this.shadowRoot?.querySelector("#trigger")?.addEventListener("click",(r)=>{r.stopPropagation(),this.togglePicker()}),this._popover?.addEventListener("click",(r)=>{if(r.target===this._popover)this.closePopover()}),this._satArea?.addEventListener("mousedown",(r)=>{this._isDraggingSat=!0,this.handleSatDrag(r),window.addEventListener("mousemove",this.onMouseMoveSat),window.addEventListener("mouseup",this.onMouseUpSat)}),this._hueSlider?.addEventListener("mousedown",(r)=>{this._isDraggingHue=!0,this.handleHueDrag(r),window.addEventListener("mousemove",this.onMouseMoveHue),window.addEventListener("mouseup",this.onMouseUpHue)}),this._hexInput?.addEventListener("input",(r)=>{let t=r.target.value;if(/^#[0-9A-Fa-f]{6}$/.test(t))this.value=t,this.emitChange(),setTimeout(()=>this.closePopover(),300)})}onMouseMoveSat=(o)=>{if(this._isDraggingSat)this.handleSatDrag(o)};onMouseUpSat=()=>{this._isDraggingSat=!1,window.removeEventListener("mousemove",this.onMouseMoveSat),window.removeEventListener("mouseup",this.onMouseUpSat),this.emitChange(),setTimeout(()=>this.closePopover(),150)};onMouseMoveHue=(o)=>{if(this._isDraggingHue)this.handleHueDrag(o)};onMouseUpHue=()=>{this._isDraggingHue=!1,window.removeEventListener("mousemove",this.onMouseMoveHue),window.removeEventListener("mouseup",this.onMouseUpHue),this.emitChange(),setTimeout(()=>this.closePopover(),150)};handleSatDrag(o){if(!this._satArea)return;let r=this._satArea.getBoundingClientRect(),t=o.clientX-r.left,i=o.clientY-r.top;t=Math.max(0,Math.min(t,r.width)),i=Math.max(0,Math.min(i,r.height)),this._s=t/r.width*100,this._v=100-i/r.height*100,this.updateColorFromHsv(),this.updateUI()}handleHueDrag(o){if(!this._hueSlider)return;let r=this._hueSlider.getBoundingClientRect(),t=o.clientX-r.left;t=Math.max(0,Math.min(t,r.width)),this._h=t/r.width*360,this.updateColorFromHsv(),this.updateUI()}togglePicker(){if(this._popover?.classList.contains("visible"))this.closePopover();else this.openPopover()}openPopover(){if(!this._popover||!this.shadowRoot)return;let o=this._popover;try{o.showModal()}catch(r){console.error("Failed to show color picker dialog:",r);return}this._popover.classList.add("visible"),requestAnimationFrame(()=>{this.updatePosition()}),this.hexToHsv(this._value),this.updateUI(),window.addEventListener("resize",this.updatePositionRef),window.addEventListener("scroll",this.updatePositionRef,!0)}updatePositionRef=()=>{if(this._popover?.classList.contains("visible"))this.updatePosition()};updatePosition(){if(!this._popover)return;let o=this.getBoundingClientRect(),r=this._popover.getBoundingClientRect(),t=o.bottom+8;if(t+300>window.innerHeight)t=o.top-8-(r.height||310);let i=o.left+o.width/2-120,n=window.innerWidth-240-8;i=Math.max(8,Math.min(i,n)),this._popover.style.top=`${t}px`,this._popover.style.left=`${i}px`}closePopover(){if(!this._popover)return;let o=this._popover;this._popover.classList.remove("visible");let r=()=>{if(!this._popover)return;o.close()};this._popover.addEventListener("transitionend",r,{once:!0}),window.removeEventListener("resize",this.updatePositionRef),window.removeEventListener("scroll",this.updatePositionRef,!0)}emitChange(){this.dispatchEvent(new CustomEvent("input",{detail:{value:this._value},bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0,composed:!0}))}updateColorFromHsv(){this._value=this.hsvToHex(this._h,this._s,this._v)}updateUI(){if(!this._satCursor||!this._hueCursor||!this._hexInput||!this._preview||!this._satArea)return;this._satCursor.style.left=`${this._s}%`,this._satCursor.style.top=`${100-this._v}%`,this._hueCursor.style.left=`${this._h/360*100}%`;let o=this.hsvToHex(this._h,100,100);this._satArea.style.backgroundColor=o,this._hexInput.value=this._value,this._preview.style.backgroundColor=this._value}hexToHsv(o){let r=/^#?([a-f\d])([a-f\d])([a-f\d])$/i;o=o.replace(r,(u,v,y,_)=>v+v+y+y+_+_);let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(o);if(!t)return;let i=parseInt(t[1],16)/255,n=parseInt(t[2],16)/255,e=parseInt(t[3],16)/255,s=Math.max(i,n,e),p=Math.min(i,n,e),d=0,c,l=s,x=s-p;if(c=s===0?0:x/s,s===p)d=0;else{switch(s){case i:d=(n-e)/x+(n<e?6:0);break;case n:d=(e-i)/x+2;break;case e:d=(i-n)/x+4;break}d/=6}this._h=d*360,this._s=c*100,this._v=l*100}hsvToHex(o,r,t){r/=100,t/=100;let i=Math.floor(o/60),n=o/60-i,e=t*(1-r),s=t*(1-n*r),p=t*(1-(1-n)*r),d=0,c=0,l=0;switch(i%6){case 0:d=t,c=p,l=e;break;case 1:d=s,c=t,l=e;break;case 2:d=e,c=t,l=p;break;case 3:d=e,c=s,l=t;break;case 4:d=p,c=e,l=t;break;case 5:d=t,c=e,l=s;break}let x=(u)=>{let v=Math.round(u*255).toString(16);return v.length===1?"0"+v:v};return`#${x(d)}${x(c)}${x(l)}`}}customElements.define("app-color-picker",ir);var ar=`:host {
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
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
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
    background: conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red);
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-content__color-swatch--custom.settings-content__color-swatch--active {
    opacity: 1;
    background-image: none;
    border-color: #fff;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
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
    will-change: transform, opacity;
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
    will-change: transform;
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
@media (max-width: 900px) {
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
}`;class nr extends HTMLElement{prefs;users=[];getCsrfToken(){let o=document.cookie.split("; ").find((r)=>r.startsWith("csrf_token="));return o?decodeURIComponent(o.split("=")[1]):""}static get observedAttributes(){return["section"]}constructor(){super();this.attachShadow({mode:"open"}),this.prefs={accent_color:"#0078D4",language:"en",widget_min_width:140,beta_updates:!1}}unsubscribe=null;_renderPending=!1;connectedCallback(){this.unsubscribe=w.subscribe((r)=>{if(r&&r.preferences)this.prefs={...r.preferences,project_name:r.project_name||r.preferences.project_name||"Lastboard"},this.render()}),this.fetchPrefs();let o=this.getAttribute("section");if(o==="users")this.fetchUsers();this.render()}disconnectedCallback(){if(this.unsubscribe)this.unsubscribe(),this.unsubscribe=null}async fetchPrefs(){let o=w.getUser();if(o&&o.preferences)this.prefs={...o.preferences,project_name:o.project_name||o.preferences.project_name||"Lastboard"},this.render()}async fetchUsers(){try{this.users=await F.getUsers(),this.render()}catch(o){console.error("Failed to fetch users",o)}}attributeChangedCallback(o,r,t){if(o==="section"&&r!==t){if(t==="users")this.fetchUsers();this.render()}}async savePrefs(o){let r={...this.prefs};if(this.prefs={...this.prefs,...o},o.accent_color)this.applyAccent(o.accent_color);if(o.language)a.setLanguage(o.language);if(o.theme)if(o.theme==="dark")M.enableDark();else M.enableLight();try{await w.updatePreferences(o)}catch{if(this.prefs=r,o.language&&r.language)a.setLanguage(r.language)}this.render()}applyAccent(o){let r=o,t={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"};if(!o.startsWith("#"))r=t[o]||"#0078D4";document.documentElement.style.setProperty("--accent",r);let i=parseInt(r.slice(1,3),16),n=parseInt(r.slice(3,5),16),e=parseInt(r.slice(5,7),16);if(!isNaN(i)&&!isNaN(n)&&!isNaN(e))document.documentElement.style.setProperty("--accent-rgb",`${i}, ${n}, ${e}`)}async handleBetaToggle(o){this.savePrefs({beta_updates:o}),this.render()}updateDensity(o){let r=this.shadowRoot.getElementById("val-widget_min_width");if(r)r.textContent=o+"px";document.documentElement.style.setProperty("--widget-min-size",o+"px")}commitDensity(o){let r=parseInt(o);w.updatePreferences({widget_min_width:r})}updateColumns(o){let r=this.shadowRoot.getElementById("val-grid_columns");if(r)r.textContent=o;document.documentElement.style.setProperty("--user-preferred-columns",o)}commitColumns(o){let r=parseInt(o);w.updatePreferences({grid_columns:r})}async updateUsername(o){let r=w.getUser();if(!r)return;if(await w.updateProfile({username:o,avatar_url:this.prefs.avatar_url||r.avatar_url}),window.notifier)window.notifier.show(a.t("notifier.username_updated"))}async updatePassword(){let o=this.shadowRoot.getElementById("current-password")?.value,r=this.shadowRoot.getElementById("new-password")?.value,t=this.shadowRoot.getElementById("confirm-password")?.value;if(!o){if(window.notifier)window.notifier.show(a.t("notifier.password_required"),"error");return}if(r!==t){if(window.notifier)window.notifier.show(a.t("notifier.password_mismatch"),"error");return}if(!r){if(window.notifier)window.notifier.show(a.t("notifier.password_empty"),"error");return}try{let i=await w.changePassword({current_password:o,new_password:r});if(this.shadowRoot.getElementById("current-password").value="",this.shadowRoot.getElementById("new-password").value="",this.shadowRoot.getElementById("confirm-password").value="",window.notifier)window.notifier.show(a.t("notifier.password_changed_relogin"));setTimeout(()=>{localStorage.removeItem("lastboard_user_cache"),document.body.style.opacity="0",window.location.href="/login"},2000)}catch(i){if(window.notifier)window.notifier.show(a.t("notifier.password_incorrect"),"error")}}async handleAvatarChange(o){let r=o.target.files?.[0];if(!r)return;if(!r.type.startsWith("image/")){if(window.notifier)window.notifier.show(a.t("notifier.invalid_image_type"),"error");return}try{let t=await this.resizeImage(r,256,256),i=w.getUser();if(!i)return;if(this.prefs.avatar_url=t,await w.updateProfile({username:i.username,avatar_url:t}),this.render(),window.notifier)window.notifier.show(a.t("notifier.avatar_updated"))}catch(t){if(console.error("Resize failed",t),window.notifier)window.notifier.show(a.t("notifier.avatar_error"),"error")}}resizeImage(o,r,t){return new Promise((i,n)=>{let e=new FileReader;e.onload=(s)=>{let p=new Image;p.onload=()=>{let d=document.createElement("canvas"),c=p.width,l=p.height;if(c>l){if(c>r)l=Math.round(l*r/c),c=r}else if(l>t)c=Math.round(c*t/l),l=t;d.width=c,d.height=l;let x=d.getContext("2d");if(!x){n(Error("Canvas context not available"));return}x.drawImage(p,0,0,c,l),i(d.toDataURL("image/jpeg",0.8))},p.onerror=(d)=>n(d),p.src=s.target?.result},e.onerror=(s)=>n(s),e.readAsDataURL(o)})}openAddUserModal(){let o=this.shadowRoot.getElementById("add-user-modal");if(o){o.showModal();let r=this.shadowRoot.getElementById("new-user-role");if(r)r.options=[{value:"user",label:a.t("settings.role_user")},{value:"admin",label:a.t("settings.role_admin")}]}}async createUser(){let o=this.shadowRoot.getElementById("new-user-username").value,r=this.shadowRoot.getElementById("new-user-password").value,t=this.shadowRoot.getElementById("new-user-role").value;if(!o||!r){if(window.notifier)window.notifier.show(a.t("notifier.fields_required"),"error");return}try{if(await F.createUser({username:o,password:r,role:t}),window.notifier)window.notifier.show(a.t("notifier.user_created"));let i=this.shadowRoot.getElementById("add-user-modal");if(i)i.close();this.fetchUsers()}catch(i){if(window.notifier)window.notifier.show(a.t("notifier.user_create_error"),"error")}}openEditUserModal(o,r,t){let i=this.shadowRoot.getElementById("edit-user-modal");if(i){this.shadowRoot.getElementById("edit-user-id").value=o.toString(),this.shadowRoot.getElementById("edit-user-username").value=r,this.shadowRoot.getElementById("edit-user-password").value="",i.showModal();let n=this.shadowRoot.getElementById("edit-user-role");if(n)n.options=[{value:"user",label:a.t("settings.role_user")},{value:"admin",label:a.t("settings.role_admin")}],n.value=t}}async updateAdminUser(){let o=parseInt(this.shadowRoot.getElementById("edit-user-id").value),r=this.shadowRoot.getElementById("edit-user-username").value,t=this.shadowRoot.getElementById("edit-user-password").value,i=this.shadowRoot.getElementById("edit-user-role").value;if(!r){if(window.notifier)window.notifier.show(a.t("notifier.username_required"),"error");return}try{if(await F.adminUpdateUser({id:o,username:r,role:i,password:t||void 0}),window.notifier)window.notifier.show(a.t("notifier.user_updated"));let n=this.shadowRoot.getElementById("edit-user-modal");if(n)n.close();this.fetchUsers()}catch(n){if(window.notifier)window.notifier.show(a.t("notifier.user_update_error"),"error")}}async deleteUser(o){let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(a.t("general.delete"),a.t("notifier.user_delete_confirm")))return}let t=document.querySelector("password-confirm-modal");if(t){let i=await t.prompt(a.t("general.delete"),a.t("notifier.user_delete_confirm"));if(!i)return;try{let n=[...this.users];if(this.users=this.users.filter((e)=>e.id!==o),this.render(),await F.deleteUser(o,i),window.notifier)window.notifier.show(a.t("notifier.user_deleted"));this.fetchUsers()}catch(n){this.fetchUsers();let e=a.t("notifier.user_delete_error");if(n.message&&n.message.includes("error.cannot_delete_superadmin"))e=a.t("notifier.user_delete_superadmin");else if(n.status===401)e=a.t("notifier.password_incorrect");if(window.notifier)window.notifier.show(e,"error")}}}getContent(o){let r=w.getUser()||{username:"Guest",initials:"??",role:a.t("role.view_only"),avatar_url:"",accent_color:"#0078D4",language:"en",preferences:{}};switch(o){case"account":return Po(r);case"theme":{let t={blue:"#228be6",indigo:"#4c6ef5",cyan:"#15aabf",teal:"#12b886",orange:"#fd7e14",red:"#fa5252",grape:"#be4bdb"},i=Object.keys(t);return Wo(this.prefs,t,i)}case"personalization":return Io(this.prefs);case"advanced":return or();case"users":return So(this.users);case"about":return rr(this.version,this.updateInfo,r.role||"user",r.preferences?.beta_updates||!1,this.isCheckingUpdates);default:return`<div class="bento-card"><h3>${o}</h3><p class="settings-content__text-dim">${a.t("settings.default_module_desc")}</p></div>`}}version="v1.3.2-Beta.14";updateInfo=null;checkUpdatesPromise=null;isCheckingUpdates=!1;async handleManualCheckUpdates(){if(this.isCheckingUpdates)return;this.isCheckingUpdates=!0,this.updateUpdateUI();try{if(await this.checkForUpdates(),this.updateInfo&&!this.updateInfo.available){if(window.notifier)window.notifier.show(a.t("settings.up_to_date"))}}finally{this.isCheckingUpdates=!1,this.updateUpdateUI()}}async checkForUpdates(){if(this.checkUpdatesPromise)return this.checkUpdatesPromise;return this.checkUpdatesPromise=(async()=>{try{let{updateService:o}=await Promise.resolve().then(() => (uo(),vo)),r=this.prefs.beta_updates||!1;if(this.updateInfo=await o.check(r),this.updateInfo)this.version=this.updateInfo.current_version,this.updateUpdateUI()}catch(o){console.error("Check update failed",o)}finally{this.checkUpdatesPromise=null}})(),this.checkUpdatesPromise}async performUpdate(o){let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(a.t("settings.update_available"),a.t("notifier.update_start_confirm")))return}let t=this.shadowRoot.getElementById("btn-update-now"),i=this.shadowRoot.getElementById("update-status");if(t)t.loading=!0;if(i){i.style.display="block";let n=i.querySelector("p");if(n)n.textContent=a.t("notifier.update_downloading")}try{let n=await fetch("/api/system/update/perform",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":this.getCsrfToken()},body:JSON.stringify({asset_url:o})});if(n.ok){if(i){let e=i.querySelector("p");if(e)e.textContent=a.t("notifier.update_verified")}setTimeout(()=>{window.location.reload()},5000)}else{let e=await n.text();if(i){i.style.background="rgba(var(--danger-rgb), 0.1)",i.style.borderColor="rgba(var(--danger-rgb), 0.3)";let s=i.querySelector("p");if(s)s.style.color="var(--danger-color)",s.textContent=a.t("notifier.update_failed")+": "+e}if(t)t.loading=!1}}catch(n){if(console.error("Update failed",n),i){i.style.background="rgba(var(--danger-rgb), 0.1)",i.style.borderColor="rgba(var(--danger-rgb), 0.3)";let e=i.querySelector("p");if(e)e.style.color="var(--danger-color)",e.textContent=a.t("notifier.update_error")}if(t)t.loading=!1}}downloadBackup(){window.location.href="/api/system/backup"}async restoreBackup(o){if(!o)return;let r=document.querySelector("confirmation-modal");if(r){if(!await r.confirm(a.t("general.restore"),a.t("notifier.restore_confirm")))return}let t=new FormData;t.append("backup_file",o);try{if((await fetch("/api/system/restore",{method:"POST",headers:{"X-CSRF-Token":this.getCsrfToken()},body:t})).ok){if(window.notifier)window.notifier.show(a.t("notifier.restore_success"));setTimeout(()=>window.location.reload(),2000)}else if(window.notifier)window.notifier.show(a.t("notifier.restore_failed"),"error")}catch(i){if(console.error("Restore error",i),window.notifier)window.notifier.show(a.t("notifier.restore_failed"),"error")}}async executeFactoryReset(){let o=document.querySelector("password-confirm-modal");if(!o)return;let r=await o.prompt(a.t("settings.factory_reset"),a.t("settings.confirm_reset_msg"));if(!r)return;let t=this.shadowRoot.getElementById("btn-reset-confirm");try{if(t)t.disabled=!0,t.textContent=a.t("settings.restoring")||"Restoring...";if((await fetch("/api/system/reset",{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":this.getCsrfToken()},body:JSON.stringify({password:r})})).ok){let n=document.createElement("div");Object.assign(n.style,{position:"fixed",top:"0",left:"0",width:"100%",height:"100%",backgroundColor:"rgba(0,0,0,0.9)",zIndex:"9999",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"var(--font-main, sans-serif)"}),n.innerHTML=`
                    <div style="border: 4px solid #333; border-top: 4px solid var(--accent, #0078d4); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 24px;"></div>
                    <h2 style="margin: 0; font-weight: 500;">${a.t("notifier.system_restarting")}</h2>
                    <p style="opacity: 0.7; margin-top: 8px;">${a.t("notifier.please_wait")}</p>
                    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                `,document.body.appendChild(n);let e=0,s=async()=>{e++;try{if((await fetch("/",{method:"HEAD",cache:"no-store"})).ok){window.location.href="/setup";return}}catch(p){}if(e<60)setTimeout(s,1000);else window.location.href="/setup"};setTimeout(s,2000)}else if(window.notifier)window.notifier.show(a.t("notifier.reset_failed"),"error")}catch(i){if(console.error("Reset error",i),window.notifier)window.notifier.show(a.t("notifier.reset_error"),"error")}}render(){if(this._renderPending)return;this._renderPending=!0,requestAnimationFrame(()=>{this._renderPending=!1,this._doRender()})}_doRender(){if(this.shadowRoot.innerHTML=`
            <style>${ar}</style>
            <div class="fade-in">
                ${this.getContent(this.getAttribute("section")||"account")}
            </div>
        `,this.shadowRoot.querySelectorAll(".settings-content__checkbox").forEach((o)=>{o.addEventListener("click",()=>o.classList.toggle("settings-content__checkbox--checked"))}),this.initSelects(),this.getAttribute("section")==="about")this.updateBetaBadgeVisuals()}initSelects(){let o=this.shadowRoot.getElementById("language-select");if(o){let n=a.getAvailableLocales();o.options=n.map((e)=>({value:e.code,label:`${e.flag} ${e.name}`})),o.addEventListener("change",(e)=>{this.savePrefs({language:e.detail})})}let r=[{value:"user",label:a.t("settings.role_user")},{value:"admin",label:a.t("settings.role_admin")}],t=this.shadowRoot.getElementById("new-user-role");if(t)t.options=r;let i=this.shadowRoot.getElementById("edit-user-role");if(i)i.options=r}updateBetaBadgeVisuals(){setTimeout(()=>{let o=this.shadowRoot.getElementById("beta-updates-toggle-badge");if(o)o.checked=this.prefs.beta_updates||!1},0)}updateUpdateUI(){let o=this.shadowRoot.getElementById("update-zone-wrapper");if(o){let r=w.getUser(),t=r?.role?.toLowerCase()==="admin"||r?.role?.toLowerCase()==="administrator";o.innerHTML=_o(t,this.updateInfo,this.isCheckingUpdates)}}}if(!customElements.get("settings-content"))customElements.define("settings-content",nr);O();f();var er=({user:o,isOpen:r,selectedSection:t,updateAvailable:i})=>`
    <div class="right-drawer__overlay"></div>
    
    <div class="right-drawer__content-panel ${t?"":"right-drawer__content-panel--closed"}">
        <div class="right-drawer__content-body">
            ${t?`<settings-content section="${t}"></settings-content>`:""}
        </div>
    </div>

    <div class="right-drawer__panel">
        <div class="right-drawer__header">
            <app-avatar class="right-drawer__avatar" initials="${o.initials}" src="${o.avatar_url||""}"></app-avatar>
            <div class="right-drawer__user-info">
                <span class="right-drawer__username">${o.username}</span>
                ${o.role?.toLowerCase()==="admin"||o.role?.toLowerCase()==="administrator"?`<span class="right-drawer__role">
                    ${(()=>{let n=(o.role||"").toLowerCase();if(o.is_superadmin)return a.t("settings.role_super_admin");if(n==="admin"||n==="administrator")return a.t("settings.role_admin");if(n==="user")return a.t("settings.role_user");return o.role||a.t("settings.default_role")})()}
                </span>`:""}
            </div>
        </div>
        
        <div class="right-drawer__body">
            <div class="right-drawer__section-label">${a.t("settings.title")}</div>
            <nav class="right-drawer__menu">
                <div class="right-drawer__menu-item ${t==="account"?"right-drawer__menu-item--active":""}" data-section="account">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
                    <span>${a.t("settings.profile")}</span>
                </div>
                <div class="right-drawer__menu-item ${t==="theme"?"right-drawer__menu-item--active":""}" data-section="theme">
                    <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"/></svg>
                    <span>${a.t("settings.theme")}</span>
                </div>
                <div class="right-drawer__menu-item ${t==="personalization"?"right-drawer__menu-item--active":""}" data-section="personalization">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    <span>${a.t("settings.personalization")}</span>
                </div>

                ${o.role?.toLowerCase()==="admin"||o.role==="Administrator"?`
                    <div class="right-drawer__menu-item ${t==="users"?"right-drawer__menu-item--active":""}" data-section="users">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        <span>${a.t("settings.users")}</span>
                    </div>

                    <div class="right-drawer__menu-item ${t==="advanced"?"right-drawer__menu-item--active":""}" data-section="advanced">
                        <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                        <span>${a.t("settings.advanced")}</span>
                    </div>
                `:""}
                <div class="right-drawer__menu-item ${t==="about"?"right-drawer__menu-item--active":""}" data-section="about" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <span>${a.t("settings.about")}</span>
                    </div>
                    ${i&&(o.role?.toLowerCase()==="admin"||o.role==="Administrator")?`
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
`;f();var sr=`:host {
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
}`;class pr extends HTMLElement{isOpen;selectedSection;_unsubscribe;_unsubscribeI18n;_keydownHandler;updateAvailable;_unsubscribeDashboard;constructor(){super();this.attachShadow({mode:"open"}),this.isOpen=!1,this.selectedSection=null,this.updateAvailable=!1}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribe=w.subscribe((o)=>{if(this.isOpen)this.render()}),Promise.resolve().then(() => (j(),Yo)).then(({dashboardStore:o})=>{this._unsubscribeDashboard=o.subscribe((r)=>{if(this.updateAvailable!==r.updateAvailable)this.updateAvailable=r.updateAvailable,this.render()})}),this._unsubscribeI18n=a.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._keydownHandler)window.removeEventListener("keydown",this._keydownHandler)}open(){this.isOpen=!0,this.setAttribute("open",""),this.render(),document.body.style.overflow="hidden",this.dispatchEvent(new CustomEvent("drawer-open",{bubbles:!0,composed:!0}))}close(){this.isOpen=!1,this.removeAttribute("open"),this.selectedSection=null,this.render(),document.body.style.overflow="",this.dispatchEvent(new CustomEvent("drawer-close",{bubbles:!0,composed:!0}))}selectSection(o){if(this.selectedSection===o)this.selectedSection=null;else this.selectedSection=o;this.render()}async performLogout(){let o=document.cookie.split("; ").find((t)=>t.startsWith("csrf_token=")),r=o?decodeURIComponent(o.split("=")[1]):"";try{await fetch("/logout",{method:"POST",headers:{"X-CSRF-Token":r}})}catch(t){}document.body.style.opacity="0",window.location.href="/login"}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target;if(r.classList.contains("right-drawer__overlay"))this.close();if(r.closest("#logout-btn")){o.preventDefault(),this.performLogout();return}let t=r.closest(".right-drawer__menu-item");if(t&&t.dataset.section)o.preventDefault(),this.selectSection(t.dataset.section)}),this._keydownHandler=(o)=>{if(o.key==="Escape"&&this.isOpen)this.close()},window.addEventListener("keydown",this._keydownHandler)}render(){let o=w.getUser()||{username:"Guest",initials:"??",role:"Viewer"};this.shadowRoot.innerHTML=`
            <style>${sr}</style>
            ${er({user:o,isOpen:this.isOpen,selectedSection:this.selectedSection,updateAvailable:this.updateAvailable})}
        `}}if(!customElements.get("app-right-drawer"))customElements.define("app-right-drawer",pr);f();var dr=({title:o,editMode:r,searchActive:t,addMenuActive:i,drawerOpen:n,searchQuery:e,user:s,updateAvailable:p,isDemo:d})=>{return`
    <div class="top-bar">
        <div style="display: flex; align-items: center;">
            <div class="top-bar__title">${o}</div>
            ${d?`<div class="top-bar__demo-badge">${a.t("general.demo_mode")}</div>`:""}
        </div>
        <div class="top-bar__actions">
            <!-- Offline Indicator -->
            <offline-badge></offline-badge>

            <!-- Search Bar -->
            <div id="search-wrapper" class="search-wrapper ${t?"search-wrapper--active":""}">
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
                 style="${r?"display: flex;":"display: none;"} margin-right: -6px;">
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
            <div id="drawer-toggle" class="top-bar__toggle" style="position: relative;" title="${a.t("topbar.drawer_tooltip")}">
                ${p?'<div class="notification-dot"></div>':""}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" />
                    <rect class="top-bar__indicator ${n?"top-bar__indicator--active":""}" 
                          x="15" y="3" width="6" height="18" fill="white" />
                    <path d="M15 3V21" stroke-width="1.5" />
                </svg>
            </div>
        </div>
    </div>
`};j();f();var lr=`:host {
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
    margin-right: 8px;
}

.top-bar__demo-badge {
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(var(--accent-rgb, 0, 122, 255), 0.1);
    border: 1px solid var(--accent);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-family: var(--font-mono);
    box-shadow: 0 0 10px rgba(var(--accent-rgb, 0, 122, 255), 0.2);
    margin-right: 16px;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
}

.top-bar__demo-badge::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    box-shadow: 0 0 12px rgba(var(--accent-rgb, 0, 122, 255), 0.5);
    opacity: 0;
    animation: demo-glow-gpu 2s infinite alternate cubic-bezier(0.4, 0, 0.2, 1);
    z-index: -1;
    pointer-events: none;
    will-change: opacity;
}

.top-bar__demo-badge::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
}

@keyframes demo-glow-gpu {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
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
    will-change: opacity, transform;
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
}`;class cr extends HTMLElement{state;_unsubscribeDashboard;_unsubscribeI18n;_windowClickHandler;static get observedAttributes(){return["title"]}constructor(){super();this.attachShadow({mode:"open"}),this.state={editMode:!1,searchActive:!1,addMenuActive:!1,drawerOpen:!1,searchQuery:"",isDemo:window.LASTBOARD_CONFIG?.demo_mode||!1}}attributeChangedCallback(o,r,t){if(o==="title"&&r!==t)this.render()}connectedCallback(){this.render(),this.setupListeners(),this._unsubscribeDashboard=g.subscribe((o)=>{if(this.state.editMode!==o.isEditing||this.state.updateAvailable!==o.updateAvailable)this.setState({editMode:o.isEditing,updateAvailable:o.updateAvailable})}),this._unsubscribeI18n=a.subscribe(()=>{this.render()})}disconnectedCallback(){if(this._unsubscribeDashboard)this._unsubscribeDashboard();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._windowClickHandler)window.removeEventListener("click",this._windowClickHandler)}setState(o){let r=this.state.editMode;if(this.state={...this.state,...o},this.render(),o.editMode!==void 0&&o.editMode!==r)this.dispatchEvent(new CustomEvent("edit-mode-change",{detail:{active:this.state.editMode},bubbles:!0,composed:!0}))}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target;if(r.closest("#search-clear")){o.stopPropagation(),this.state.searchQuery="";let d=this.shadowRoot.getElementById("search-input");if(d)d.value="",d.focus();this.render(),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0}));return}if(r.closest("#search-wrapper")&&!this.state.searchActive)o.stopPropagation(),this.setState({searchActive:!0}),this.shadowRoot.getElementById("search-input")?.focus();if(r.closest("#edit-toggle"))g.toggleEditMode();if(r.closest("#add-toggle"))o.stopPropagation(),this.setState({addMenuActive:!this.state.addMenuActive});let s=r.closest(".add-menu-item");if(s){let d=s.dataset.action;if(d)this.setState({addMenuActive:!1}),this.dispatchEvent(new CustomEvent("add-item",{detail:{action:d},bubbles:!0,composed:!0}));return}if(r.closest("#drawer-toggle")){let d=this.state.drawerOpen?"close":"open";this.dispatchEvent(new CustomEvent("drawer-toggle",{detail:{action:d},bubbles:!0,composed:!0}));return}}),this.shadowRoot.addEventListener("input",(o)=>{let r=o.target;if(r.id==="search-input"){let t=r.value;this.state.searchQuery=t;let i=this.shadowRoot.getElementById("search-clear");if(i)i.style.display=t?"flex":"none";this.dispatchEvent(new CustomEvent("search-input",{detail:{query:t},bubbles:!0,composed:!0}))}}),this.shadowRoot.addEventListener("keydown",(o)=>{let r=o.target,t=o;if(r.id==="search-input"&&t.key==="Escape")r.value="",this.setState({searchActive:!1}),this.dispatchEvent(new CustomEvent("search-input",{detail:{query:""},bubbles:!0,composed:!0})),r.blur()}),this._windowClickHandler=(o)=>{if(this.state.addMenuActive)this.setState({addMenuActive:!1});let r=o.composedPath(),t=this.shadowRoot.getElementById("search-wrapper");if(this.state.searchActive&&t&&!r.includes(t)){let i=this.shadowRoot.getElementById("search-input");if(i&&i.value==="")this.setState({searchActive:!1})}},window.addEventListener("click",this._windowClickHandler)}render(){let o=this.getAttribute("title")||"Lastboard";this.shadowRoot.innerHTML=`
            <style>${lr}</style>
            ${dr({title:o,editMode:this.state.editMode,searchActive:this.state.searchActive,addMenuActive:this.state.addMenuActive,drawerOpen:this.state.drawerOpen,searchQuery:this.state.searchQuery,user:this.state.user,updateAvailable:this.state.updateAvailable,isDemo:this.state.isDemo})}
        `}}if(!customElements.get("app-topbar"))customElements.define("app-topbar",cr);f();var gr=()=>`
    <div class="dot"></div>
    <span class="text">${a.t("status.offline")}</span>
`;var xr=`:host {
    display: none;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(var(--danger-rgb), 0.15);
    border: 1px solid rgba(var(--danger-rgb), 0.3);
    border-radius: 4px;
    margin-right: 12px;
}

:host(.visible) {
    display: flex;
    animation: fadeIn 0.3s ease;
}

.dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--danger-color);
    box-shadow: 0 0 4px rgba(var(--danger-rgb), 0.6);
}

.text {
    font-size: 11px;
    font-weight: 600;
    color: var(--danger-color);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: var(--font-mono, monospace);
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-2px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}`;j();class br extends HTMLElement{unsubscribe=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.unsubscribe=g.subscribe((o)=>{if(o.isOffline)this.classList.add("visible");else this.classList.remove("visible")})}disconnectedCallback(){if(this.unsubscribe)this.unsubscribe()}render(){this.shadowRoot.innerHTML=`
            <style>${xr}</style>
            ${gr()}
        `}}if(!customElements.get("offline-badge"))customElements.define("offline-badge",br);f();var hr=({title:o,dropdownOpen:r})=>`
    <header class="header">
        <div class="header__left">
            ${o}
        </div>

        <div class="header__group">
            <button class="header__btn-changelog">
                <span>${a.t("header.view_changelog")}</span>
                <svg class="header__icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <div class="header__action" title="${a.t("general.layouts")}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
            </div>

            <div class="header__action" title="${a.t("general.search")}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>

            <div class="header__separator"></div>

            <div class="header__action" title="${a.t("general.chrome")}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="4"></circle>
                    <line x1="21.17" y1="8" x2="12" y2="8"></line>
                    <line x1="3.95" y1="6.06" x2="8.54" y2="14"></line>
                    <line x1="10.88" y1="21.94" x2="15.46" y2="14"></line>
                </svg>
            </div>

            <div class="header__action" title="${a.t("header.preferences")}">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
            </div>

            <div class="header__profile-container">
                <div class="header__action" id="profile-trigger" title="${a.t("general.profile")}">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <div class="header__dropdown ${r?"header__dropdown--active":""}" id="profile-dropdown">
                    <div class="header__dropdown-item">${a.t("header.view_profile")}</div>
                    <div class="header__dropdown-item">${a.t("header.preferences")}</div>
                    <div class="header__dropdown-item" style="border-top: 1px solid var(--border-color); color: var(--danger-color);">${a.t("auth.sign_out")}</div>
                </div>
            </div>
        </div>
    </header>
`;var fr=`.header {
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
}`;class vr extends HTMLElement{dropdownOpen;_boundWindowClick;constructor(){super();this.attachShadow({mode:"open"}),this.dropdownOpen=!1}connectedCallback(){this.render(),this.setupListeners()}disconnectedCallback(){if(this._boundWindowClick)window.removeEventListener("click",this._boundWindowClick)}toggleDropdown(o){this.dropdownOpen=typeof o==="boolean"?o:!this.dropdownOpen,this.render()}setupListeners(){this.shadowRoot.addEventListener("click",(o)=>{let r=o.target,t=r.closest(".header__btn-changelog");if(t)t.style.display="none";if(r.closest("#profile-trigger"))o.stopPropagation(),this.toggleDropdown()}),this._boundWindowClick=()=>{if(this.dropdownOpen)this.toggleDropdown(!1)},window.addEventListener("click",this._boundWindowClick)}render(){let o=this.getAttribute("title")||"Task";this.shadowRoot.innerHTML=`
            <style>${fr}</style>
            ${hr({title:o,dropdownOpen:this.dropdownOpen})}
        `}}if(!customElements.get("app-header"))customElements.define("app-header",vr);f();var D=(o)=>String(o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),kt=(o)=>{if(!o)return"#";let r=o.trim().toLowerCase();if(r.startsWith("http://")||r.startsWith("https://")||r==="#")return D(o);return"#"},ur=({bookmarks:o,isEditing:r,isLoading:t,isSearching:i,isTouchDevice:n,maxCols:e=12})=>{let s=Array.isArray(o)?o:[];if(t&&s.length===0)return zt(e);let p=(c)=>s.filter((l)=>l.parent_id===c);return`
    ${(n?s:i?s:s.filter((c)=>!c.parent_id)).map((c)=>{let l={};try{l=typeof c.content==="string"?JSON.parse(c.content):c.content}catch(_){console.error("Failed to parse content for item",c.id,_)}let x=c.type==="section",u={x:c.x||1,y:c.y||1},v=Math.min(c.w||1,e),y=c.h||1;if(x){let _=p(c.id),k=(l.title||"").trim(),b=l.borderColor&&!r?`border-color: ${l.borderColor} !important;`:"",H=!r?`border-width: ${l.borderWidth||1}px !important;`:"";return`
            <fieldset class="bookmark-grid__section"
               data-id="${c.id}"
               data-orig-x="${c.x}" data-orig-y="${c.y}"
               draggable="${r}"
               style="--x: ${u.x}; --y: ${u.y}; --w: ${v}; --h: ${y}; ${b} ${H}">
               ${k?`<legend class="section-title">${D(k)}</legend>`:""}
               <div class="bookmark-grid__nested-content" style="width: 100%; height: 100%;">
                   ${wt(_,r,!0,v,n)}
               </div>
               ${r?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
                <div class="resize-handle"></div>
               `:""}
            </fieldset>`}return _r(c,l,r,u,v,y,n)}).join("")}

    <div id="ghost-element" class="bookmark-grid__ghost" style="display: none;"></div>
    `};function _r(o,r,t,i,n,e=0,s=!1){let p=e||o.h||1;if(o.type==="widget"){let _=r.widgetId,b={clock:"widget-clock",notepad:"widget-notepad",telemetry:"widget-telemetry",weather:"widget-weather",markdown:"widget-markdown"}[_]||"div",A=(r.text||"").replace(/"/g,"&quot;"),h=r.borderColor&&!t?`border-color: ${r.borderColor} !important;`:"",B=!t?`border-width: ${r.borderWidth||1}px !important;`:"";return`
        <div class="bookmark-grid__card"
            draggable="${t}"
            data-id="${o.id}"
            data-type="${o.type}"
            data-orig-x="${o.x}" data-orig-y="${o.y}"
            ${!s?`style="--x: ${i.x}; --y: ${i.y}; --w: ${n}; --h: ${p}; ${h} ${B}"`:""}>

            <${b}
                item-id="${o.id}"
                data-editing="${t}"
                ${_==="notepad"?`content="${A}"`:""}
            ></${b}>

            ${t?`
            <div class="bookmark-actions">
                 ${["clock","telemetry","weather","notepad","markdown"].includes(_)?`<button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>`:""}
                 <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
            </div>
            ${["clock","telemetry"].includes(_)?"":'<div class="resize-handle"></div>'}
            `:""}
        </div>
    `}let d=r.icon||"",l=d.startsWith("http")||d.startsWith("/")||d.startsWith("data:")?`<img src="${D(d)}" alt="${D(r.label)}" class="bookmark-grid__icon-img" draggable="false" />`:d?D(d):'<svg class="bookmark-grid__icon-svg" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>',x=t?'role="button"':`href="${kt(r.url)}" target="_blank"`,u=!s?`--x: ${i.x}; --y: ${i.y}; --w: ${n}; --h: ${p};`:"",v=r.borderColor&&!t?`border-color: ${r.borderColor} !important;`:"",y=r.labelPos==="top"?"label-top":r.labelPos==="section"?"label-section":r.labelPos==="off"?"label-off":"";return`
        <a ${x} class="bookmark-grid__card ${y}"
           draggable="${t}"
           data-id="${o.id}"
           data-type="${o.type}"
           data-orig-x="${o.x}" data-orig-y="${o.y}"
           style="${u} ${v} ${!t?`border-width: ${r.borderWidth||1}px !important;`:""}">
            
            ${t?`
                <div class="bookmark-actions">
                    <button class="action-btn btn-edit" title="${a.t("general.edit")}">✎</button>
                    <button class="action-btn btn-delete" title="${a.t("general.delete")}">\uD83D\uDDD1</button>
                </div>
            `:""}

            <div class="bookmark-grid__icon-container">
                ${l}
            </div>
            <span class="bookmark-grid__label">${D(r.label)||"Bookmark"}</span>
            
            ${t&&o.type==="section"?'<div class="resize-handle"></div>':""}
            
            ${r.statusCheck?`
                <div class="status-indicator ${o.status?`status-${o.status}`:""} ${r.statusPos?`status-pos-${r.statusPos}`:""}" 
                     title="${o.status==="up"?a.t("status.online"):o.status==="down"?a.t("status.unreachable"):o.status==="pending"?a.t("status.checking"):a.t("general.pinging")}">
                </div>
            `:""}
        </a>
    `}function wt(o,r,t=!1,i=12,n=!1){return o.map((e)=>{let s={};try{s=typeof e.content==="string"?JSON.parse(e.content):e.content}catch(l){console.error("Failed to parse content for item (nested)",e.id,l)}let p={x:e.x||1,y:e.y||1},d=e.h||1,c=Math.min(e.w||1,i);return _r(e,s,r,p,c,d,n)}).join("")}function zt(o){return`
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
        ${Array(8).fill(null).map((t,i)=>`
            <div class="bookmark-grid__card skeleton" style="--x: ${i%o+1}; --y: ${Math.floor(i/o)+1}; --w: 1; --h: 1;">
                <div class="skeleton-icon"></div>
                <div class="skeleton-text"></div>
            </div>
        `).join("")}
    `}j();U();f();f();j();class mr extends HTMLElement{timer;timeEl=null;dateEl=null;_unsubscribe=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}isEditing=!1;configMode=!1;_config={timezone:"local",hour12:!1,showDate:!0,showSeconds:!1};_itemId=0;static get observedAttributes(){return["item-id","content","mode"]}attributeChangedCallback(o,r,t){if(o==="item-id")this._itemId=parseInt(t);if(o==="content")try{let i=typeof t==="string"?JSON.parse(t):t;if(i&&typeof i==="object")this._config={...this._config,...i},this.updateTime()}catch(i){}}connectedCallback(){this.render(),this.updateTime(),this.timer=setInterval(()=>{this.updateTime()},1000),this._unsubscribe=g.subscribe((o)=>{if(this.isEditing!==o.isEditing)this.isEditing=o.isEditing,this.render();if(this._itemId){let r=o.items.find((t)=>t.id===this._itemId);if(r&&r.content)try{let t=typeof r.content==="string"?JSON.parse(r.content):r.content;if(t.widgetId==="clock")this._config={...this._config,...t},this.updateTime()}catch(t){}}}),this._unsubscribeI18n=a.subscribe(()=>{this.updateTime()})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this.timer)clearInterval(this.timer)}_lastTimeHTML="";_lastDateStr="";updateTime(){if(!this.timeEl||!this.dateEl)return;let o=new Date,r={hour:"2-digit",minute:"2-digit",hour12:this._config.hour12};if(this._config.showSeconds!==!1)r.second="2-digit";let t=void 0;if(this._config.timezone&&this._config.timezone!=="local")t=this._config.timezone;let i=a.getLocale().code;try{let s=new Intl.DateTimeFormat(i,{...r,timeZone:t}).formatToParts(o).map((p)=>{if(p.type==="dayPeriod")return`<span class="ampm">${p.value.toUpperCase().replace(/\./g,"").trim()}</span>`;return p.value}).join("");if(this._lastTimeHTML!==s)this.timeEl.innerHTML=s,this._lastTimeHTML=s}catch(n){let e=o.toLocaleTimeString();if(this._lastTimeHTML!==e)this.timeEl.textContent=e,this._lastTimeHTML=e}if(this._config.showDate){let n={weekday:"long",day:"numeric",month:"long",timeZone:t},e=o.toLocaleDateString(i,n);if(this._lastDateStr!==e)this.dateEl.textContent=e,this._lastDateStr=e;this.dateEl.style.display="block"}else this.dateEl.style.display="none"}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
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
        `,this.timeEl=this.shadowRoot.querySelector(".time"),this.dateEl=this.shadowRoot.querySelector(".date"),this._lastTimeHTML="",this._lastDateStr="",this.updateTime()}}customElements.define("widget-clock",mr);j();f();class R{static parse(o){try{if(typeof o==="object"&&o!==null)return o;if(typeof o==="string"){let r=JSON.parse(o);if(typeof r==="object"&&r!==null)return r}return{widgetId:"unknown"}}catch(r){return console.warn("[WidgetContentHelper] Failed to parse content:",r),{widgetId:"unknown"}}}static serialize(o){try{return JSON.stringify(o)}catch(r){return console.error("[WidgetContentHelper] Failed to serialize content:",r),"{}"}}static getNotepadText(o){return this.parse(o).text||""}static setNotepadText(o,r){let i={...this.parse(o),widgetId:"notepad",text:r};return this.serialize(i)}static merge(o,r){let i={...this.parse(o),...r};return this.serialize(i)}static validate(o,r){return this.parse(o).widgetId===r}static getMarkdownText(o){return this.parse(o).text||""}static setMarkdownText(o,r){let i={...this.parse(o),widgetId:"markdown",text:r};return this.serialize(i)}}var m={undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M5 12l6-6"/><path d="M5 12l6 6"/></svg>',redo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M19 12l-6-6"/><path d="M19 12l-6 6"/></svg>',h1:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M19 18V6l-2 2"/></svg>',h2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-5 4-8a2 2 0 0 0-4 0"/></svg>',h3:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 18a2.5 2.5 0 0 0 0-5 2.5 2.5 0 0 0 0-5H20"/></svg>',bold:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>',italic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',underline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',strike:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.3 19c-1.4 1.4-3.5 1.4-5.2-.2-1.9-1.9-1.9-5.2 0-7.2l.6-.6c2.2-2.2 6.6-2.2 9.1.5"/><line x1="4" y1="12" x2="20" y2="12"/><path d="M10.2 6c1.6-1.5 3.9-1.5 5.5.1"/></svg>',color:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',alignLeft:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',alignCenter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>',alignRight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',alignJustify:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',link:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',image:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',ordered:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 12l2 2 4-4"/></svg>',quote:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>',code:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',eraser_clean:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16C2 15 2 13 3 12L13 2L22 11L20 20Z"/><path d="M11 3L20 12"/></svg>',lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',unlock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',resize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 9V6a2 2 0 0 0-2-2h-3"/><path d="M3 15v3a2 2 0 0 0 2 2h3"/><path d="M16 20h3a2 2 0 0 0 2-2v-3"/><path d="M8 4H5a2 2 0 0 0-2 2v3"/></svg>'},$t=`
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
`;class yr extends HTMLElement{_itemId=0;_content="";_isDirty=!1;_isLocked=!0;_isSaving=!1;_lastLockTime=0;_editor=null;_syncStatus=null;_dock=null;_editorContainer=null;_modal=null;_imgResizer=null;_activeImage=null;_pendingAction=null;_boundBeforeUnload;_unsubscribeI18n;static get observedAttributes(){return["item-id"]}constructor(){super();this.attachShadow({mode:"open"}),this._boundBeforeUnload=this.handleBeforeUnload.bind(this)}connectedCallback(){this.render(),this.loadContent(),window.addEventListener("beforeunload",this._boundBeforeUnload),this._unsubscribeI18n=a.subscribe(()=>{if(this._editor)this._editor.dataset.placeholder=a.t("widget.notepad.placeholder")})}disconnectedCallback(){if(window.removeEventListener("beforeunload",this._boundBeforeUnload),this._unsubscribeI18n)this._unsubscribeI18n()}attributeChangedCallback(o,r,t){if(o==="item-id")this._itemId=parseInt(t),this.loadContent()}handleBeforeUnload(o){if(this._isDirty)o.preventDefault(),o.returnValue=""}render(){if(!this.shadowRoot)return;let o=this._isLocked?"locked":"unlocked",r=this._isLocked?"locked":"",t=this._isLocked?"hidden":"";this.shadowRoot.innerHTML=`
            <style>
                ${$t}
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

                /* Hide Lock Button in Edit Mode (Grid Editing) */
                :host([data-editing="true"]) .top-lock-btn {
                    display: none !important;
                }
            </style>
            
             <button class="top-lock-btn ${o}" id="lock-btn" title="${this._isLocked?a.t("widget.notepad.tool.unlock"):a.t("widget.notepad.tool.lock")}">
                ${this._isLocked?m.lock:m.unlock}
            </button>

            <div class="editor-container ${r}">
                <div class="editor" contenteditable="${!this._isLocked}" data-placeholder="${a.t("widget.notepad.placeholder")}"></div>
            </div>

            <div class="glass-dock ${t}" id="glass-dock">
                <div class="dock-group">
                    <button class="dock-btn" data-fmt="undo" title="${a.t("widget.notepad.tool.undo")}">${m.undo}</button>
                    <button class="dock-btn" data-fmt="redo" title="${a.t("widget.notepad.tool.redo")}">${m.redo}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="formatBlock:H1" title="${a.t("widget.notepad.tool.h1")}" style="width:30px;">${m.h1}</button>
                    <button class="dock-btn" data-fmt="formatBlock:H2" title="${a.t("widget.notepad.tool.h2")}" style="width:30px;">${m.h2}</button>
                    <button class="dock-btn" data-fmt="formatBlock:H3" title="${a.t("widget.notepad.tool.h3")}" style="width:30px;">${m.h3}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="bold" title="${a.t("widget.notepad.tool.bold")}">${m.bold}</button>
                    <button class="dock-btn" data-fmt="italic" title="${a.t("widget.notepad.tool.italic")}">${m.italic}</button>
                    <button class="dock-btn" data-fmt="underline" title="${a.t("widget.notepad.tool.underline")}">${m.underline}</button>
                    <button class="dock-btn" data-fmt="strikeThrough" title="${a.t("widget.notepad.tool.strike")}">${m.strike}</button>
                    <button class="dock-btn" title="${a.t("widget.notepad.tool.color")}">
                        ${m.color}
                        <input type="color" id="color-picker">
                    </button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="justifyLeft" title="${a.t("widget.notepad.tool.left")}">${m.alignLeft}</button>
                    <button class="dock-btn" data-fmt="justifyCenter" title="${a.t("widget.notepad.tool.center")}">${m.alignCenter}</button>
                    <button class="dock-btn" data-fmt="justifyRight" title="${a.t("widget.notepad.tool.right")}">${m.alignRight}</button>
                    <button class="dock-btn" data-fmt="justifyFull" title="${a.t("widget.notepad.tool.justify")}">${m.alignJustify}</button>
                </div>

                <div class="dock-group">
                     <button class="dock-btn" id="btn-link" title="${a.t("widget.notepad.tool.link")}">${m.link}</button>
                     <button class="dock-btn" id="btn-image" title="${a.t("widget.notepad.tool.image")}">${m.image}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="insertUnorderedList" title="${a.t("widget.notepad.tool.bullet")}">${m.list}</button>
                    <button class="dock-btn" data-fmt="insertOrderedList" title="${a.t("widget.notepad.tool.number")}">${m.ordered}</button>
                    <button class="dock-btn" data-fmt="insertChecklist" title="${a.t("widget.notepad.tool.check")}">${m.check}</button>
                </div>

                <div class="dock-group">
                    <button class="dock-btn" data-fmt="formatBlock:BLOCKQUOTE" title="${a.t("widget.notepad.tool.quote")}">${m.quote}</button>
                     <button class="dock-btn" data-fmt="formatBlock:PRE" title="${a.t("widget.notepad.tool.code")}">${m.code}</button>
                    <button class="dock-btn" data-fmt="removeFormat" title="${a.t("widget.notepad.tool.clear")}">${m.eraser_clean}</button>
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
                ${m.resize}
             </button>
        `,this._editor=this.shadowRoot.querySelector(".editor"),this._editorContainer=this.shadowRoot.querySelector(".editor-container"),this._syncStatus=this.shadowRoot.querySelector("#sync-status"),this._dock=this.shadowRoot.querySelector("#glass-dock"),this._modal=this.shadowRoot.querySelector("#glass-modal"),this._imgResizer=this.shadowRoot.querySelector("#img-resizer"),this.bindEvents()}bindEvents(){if(!this._editor)return;this._editor.addEventListener("input",(t)=>this.handleInput(t)),this._editor.addEventListener("keydown",(t)=>this.handleKeydown(t)),this._editor.addEventListener("paste",(t)=>this.handlePaste(t)),this._editor.addEventListener("click",(t)=>this.handleEditorClick(t));let o=this.shadowRoot?.querySelector("#lock-btn");if(o)o.addEventListener("click",(t)=>{t.preventDefault(),t.stopImmediatePropagation();let i=Date.now();if(i-this._lastLockTime<300)return;this._lastLockTime=i,this.toggleLock()}),o.addEventListener("mousedown",(t)=>t.stopPropagation());this.shadowRoot?.querySelectorAll(".dock-btn[data-fmt]").forEach((t)=>{t.addEventListener("mousedown",(i)=>{if(i.preventDefault(),this._isLocked)return;let n=i.currentTarget.dataset.fmt;if(n)if(n.includes(":")){let[e,s]=n.split(":");this.executeFormat(e,s)}else this.executeFormat(n)})});let r=this.shadowRoot?.querySelector("#color-picker");if(r)r.addEventListener("input",(t)=>{let i=t.target.value;this.executeFormat("foreColor",i)});this.shadowRoot?.querySelector("#btn-link")?.addEventListener("click",()=>this.openModal("link")),this.shadowRoot?.querySelector("#btn-image")?.addEventListener("click",()=>this.openModal("image")),this.shadowRoot?.querySelector("#modal-cancel")?.addEventListener("click",()=>this.closeModal()),this.shadowRoot?.querySelector("#modal-confirm")?.addEventListener("click",()=>this.handleModalConfirm()),this._imgResizer?.addEventListener("click",()=>this.openModal("image-edit")),this._editorContainer?.addEventListener("scroll",()=>this.hideResizer())}openModal(o){if(!this._modal||this._isLocked)return;this._pendingAction=o;let r=this.shadowRoot?.querySelector("#modal-title"),t=this.shadowRoot?.querySelector("#modal-input-1"),i=this.shadowRoot?.querySelector("#modal-input-2");if(t)t.value="";if(i)i.value="";if(o==="link"){if(r)r.textContent=a.t("widget.notepad.modal.link_title");if(t)t.placeholder=a.t("widget.notepad.modal.placeholder_url");if(i)i.style.display="none"}else if(o==="image"){if(r)r.textContent=a.t("widget.notepad.modal.image_title");if(t)t.placeholder=a.t("widget.notepad.modal.placeholder_img");if(i)i.style.display="block",i.placeholder=a.t("widget.notepad.modal.placeholder_width")}else if(o==="image-edit"&&this._activeImage){if(r)r.textContent=a.t("widget.notepad.modal.image_edit_title");if(t)t.placeholder=a.t("widget.notepad.modal.placeholder_img"),t.value=this._activeImage.src;if(i)i.style.display="block",i.placeholder=a.t("widget.notepad.modal.placeholder_width"),i.value=this._activeImage.style.width||""}this._modal.classList.add("visible"),setTimeout(()=>t?.focus(),50)}closeModal(){if(this._modal)this._modal.classList.remove("visible");this._pendingAction=null,this._editor?.focus()}handleModalConfirm(){let o=this.shadowRoot?.querySelector("#modal-input-1"),r=this.shadowRoot?.querySelector("#modal-input-2"),t=o?.value,i=r?.value;if(!t){this.closeModal();return}if(this._editor?.focus(),this._pendingAction==="link")document.execCommand("createLink",!1,t);else if(this._pendingAction==="image"){let n=i?` style="width:${i}; max-width:100%;"`:' style="max-width:100%;"',e=`<img src="${t}"${n} />`;document.execCommand("insertHTML",!1,e)}else if(this._pendingAction==="image-edit"&&this._activeImage){if(this._activeImage.src=t,i)this._activeImage.style.width=i;else this._activeImage.style.width="";this._isDirty=!0,this.setStatus("dirty")}this.closeModal(),this.hideResizer()}executeFormat(o,r){if(this._editor?.focus(),o==="insertChecklist")document.execCommand("insertHTML",!1,'<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;');else if(o==="removeFormat")document.execCommand("removeFormat"),document.execCommand("formatBlock",!1,"p"),document.execCommand("unlink");else document.execCommand(o,!1,r)}toggleLock(){if(this._isLocked=!this._isLocked,this.updateLockState(),this._isLocked&&this._isDirty)this.save()}updateLockState(){if(this._editor)this._editor.contentEditable=this._isLocked?"false":"true";let o=this.shadowRoot?.querySelector("#lock-btn");if(o)o.classList.toggle("locked",this._isLocked),o.innerHTML=this._isLocked?m.lock:m.unlock,o.setAttribute("title",this._isLocked?a.t("widget.notepad.tool.unlock"):a.t("widget.notepad.tool.lock"));if(this._dock)if(this._isLocked)this._dock.classList.add("hidden");else this._dock.classList.remove("hidden");if(this._editorContainer)this._editorContainer.classList.toggle("locked",this._isLocked);if(!this._isLocked&&this._editor)setTimeout(()=>{this._editor?.focus()},10)}handleInput(o){if(this._isLocked)return;this.hideResizer(),this.checkPlaceholder(),this._isDirty=!0,this.setStatus("dirty"),this.checkInputRules()}handleEditorClick(o){if(this._isLocked)return;let r=o.target;if(r instanceof HTMLImageElement){this._activeImage=r,this.showResizer(r);return}else if(!r.closest("#img-resizer"))this.hideResizer(),this._activeImage=null;if(r.classList.contains("checkbox-char")){if(o.preventDefault(),o.stopPropagation(),r.textContent==="☐")r.textContent="☑",r.classList.add("checked");else r.textContent="☐",r.classList.remove("checked");this._isDirty=!0,this.setStatus("dirty")}}showResizer(o){if(!this._imgResizer)return;let r=o.getBoundingClientRect(),t=this.getBoundingClientRect(),i=r.top-t.top,n=r.right-t.left;this._imgResizer.style.top=`${i+8}px`,this._imgResizer.style.left=`${n-36}px`,this._imgResizer.classList.add("visible")}hideResizer(){this._imgResizer?.classList.remove("visible")}handleKeydown(o){if(this._isLocked)return;if(o.key==="Tab")o.preventDefault(),document.execCommand("insertText",!1,"  ");let r=(i)=>/^[☐☑]/.test(i.trim()),t=(i)=>i.replace(/[☐☑\s\u00A0\u200B]/g,"").length===0;if(o.key==="Enter"){let i=this.getSelection();if(i&&i.anchorNode){let n=i.anchorNode,e=n.nodeType===Node.TEXT_NODE?n.parentElement:n,s=e?.textContent||"";if(r(s)){if(t(s))if(o.preventDefault(),document.execCommand("delete"),e.tagName==="DIV"||e.tagName==="P")e.innerHTML="<br>";else document.execCommand("insertHTML",!1,"<br>");else{o.preventDefault();let p=e;while(p&&p!==this._editor&&p.tagName!=="DIV"&&p.tagName!=="P")p=p.parentElement;if(!p||p===this._editor)document.execCommand("insertHTML",!1,'<br><span class="checkbox-char" contenteditable="false">☐</span>&nbsp;');else{let d=document.createElement(p.tagName);if(p instanceof HTMLElement)d.style.textAlign=p.style.textAlign;if(d.innerHTML='<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;',p.nextSibling)p.parentNode?.insertBefore(d,p.nextSibling);else p.parentNode?.appendChild(d);let c=document.createRange();c.selectNodeContents(d),c.collapse(!1);let l=this.getSelection();l.removeAllRanges(),l.addRange(c)}}return}}}if(o.key==="Backspace"){let i=this.getSelection();if(i&&i.isCollapsed&&i.anchorNode){let n=i.anchorNode,e=n.nodeType===Node.TEXT_NODE?n.parentElement:n,s=e?.textContent||"";if(r(s)&&t(s)){if(o.preventDefault(),e.tagName==="DIV"||e.tagName==="P")e.innerHTML="<br>";else document.execCommand("delete");return}if(i.anchorOffset===0){if(n.nodeType===Node.TEXT_NODE){let p=n.previousSibling;if(p&&p.nodeType===Node.ELEMENT_NODE&&p.classList.contains("checkbox-char")){o.preventDefault(),p.remove();return}}}if(n.nodeType===Node.ELEMENT_NODE&&i.anchorOffset>0){let p=n.childNodes[i.anchorOffset-1];if(p&&p.nodeType===Node.ELEMENT_NODE&&p.classList.contains("checkbox-char")){o.preventDefault(),p.remove();return}}}}if((o.ctrlKey||o.metaKey)&&o.key==="s")o.preventDefault(),this.save()}handlePaste(o){if(this._isLocked)return;o.preventDefault();let r=o.clipboardData?.getData("text/plain")??"";document.execCommand("insertText",!1,r)}checkInputRules(){let o=this.getSelection();if(!o||!o.isCollapsed)return;let r=o.anchorNode;if(!r||r.nodeType!==Node.TEXT_NODE)return;let t=r.textContent||"",i=o.anchorOffset,n=t.slice(0,i),e=[{match:/^#\s$/,cmd:"formatBlock",val:"H1"},{match:/^##\s$/,cmd:"formatBlock",val:"H2"},{match:/^###\s$/,cmd:"formatBlock",val:"H3"},{match:/^>\s$/,cmd:"formatBlock",val:"BLOCKQUOTE"},{match:/^-\s$/,cmd:"insertUnorderedList",val:null},{match:/^\*\s$/,cmd:"insertUnorderedList",val:null},{match:/^1\.\s$/,cmd:"insertOrderedList",val:null},{match:/^\[\]\s$/,cmd:"insertChecklist",val:null},{match:/^---\s$/,cmd:"insertHorizontalRule",val:null}];for(let s of e)if(s.match.test(n)){let p=document.createRange();if(p.setStart(r,0),p.setEnd(r,i),p.deleteContents(),s.cmd==="insertChecklist")document.execCommand("insertHTML",!1,'<span class="checkbox-char" contenteditable="false">☐</span>&nbsp;');else if(s.cmd==="insertHorizontalRule")document.execCommand("insertHorizontalRule");else document.execCommand(s.cmd,!1,s.val);return}}checkPlaceholder(){if(!this._editor)return;if(this._editor.innerText.trim()===""&&this._editor.querySelectorAll("img").length===0)this._editor.classList.add("is-empty");else this._editor.classList.remove("is-empty")}async loadContent(){if(!this._itemId)return;let r=g.getState().items.find((t)=>t.id===this._itemId);if(r){let i=R.parse(r.content).text||"";if(this._editor&&this._editor.innerHTML!==i)this._editor.innerHTML=i;this._content=i,this.checkPlaceholder()}}async save(o=!1){if(!this._itemId||!this._editor)return;let r=this._editor.innerHTML;this._isSaving=!0,this.setStatus("saving");try{let i=g.getState().items.find((n)=>n.id===this._itemId);if(i){let n=R.setNotepadText(i.content,r);g.updateItem({...i,content:n}).then(()=>{this._isDirty=!1,this.setStatus("saved")})}}catch(t){console.error(t),this.setStatus("error")}finally{this._isSaving=!1}}setStatus(o){if(!this._syncStatus)return;switch(this._syncStatus.className="sync-status",this._syncStatus.classList.add("visible"),o){case"saving":this._syncStatus.classList.add("saving");break;case"saved":this._syncStatus.classList.add("saved"),setTimeout(()=>{this._syncStatus?.classList.remove("visible")},2000);break;case"dirty":this._syncStatus.classList.add("dirty");break;case"error":this._syncStatus.classList.add("error");break;case"idle":this._syncStatus.classList.remove("visible");break}}getSelection(){let o=this.shadowRoot;return o.getSelection?o.getSelection():document.getSelection()}}customElements.define("widget-notepad",yr);f();j();class kr extends HTMLElement{cpuBar=null;ramBar=null;tempBar=null;cpuText=null;ramText=null;tempText=null;_unsubscribe;_unsubscribeI18n;_itemId=0;_interval=5000;lastUpdate=0;static get observedAttributes(){return["item-id","content"]}attributeChangedCallback(o,r,t){if(o==="item-id")this._itemId=parseInt(t);if(o==="content")try{let i=typeof t==="string"?JSON.parse(t):t;if(i&&i.interval)this._interval=parseInt(i.interval)}catch(i){}}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){if(!this.shadowRoot)this.attachShadow({mode:"open"});if(!this.cpuBar)this.render();if(this._unsubscribe)return;if(this._unsubscribe=g.subscribe((o)=>{if(this._itemId){let t=(Array.isArray(o.items)?o.items:[]).find((i)=>i.id===this._itemId);if(t&&t.content)try{let i=typeof t.content==="string"?JSON.parse(t.content):t.content;if(i.interval&&i.interval!==this._interval)this._interval=parseInt(i.interval)}catch(i){}}if(o.stats)this.update(o.stats)}),!this._unsubscribeI18n)this._unsubscribeI18n=a.subscribe(()=>{this.render();let o=g.getState();if(o.stats)this.update(o.stats)})}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n()}lastKnownStats={cpu_usage:0,ram_usage:0,temperature:0};_lastRendered={cpu:-1,ram:-1,temp:-1};update(o){if(!this.shadowRoot)return;let r=Date.now(),t=100;if(r-this.lastUpdate<this._interval-t)return;if(this.lastUpdate=r,typeof o.cpu_usage==="number")this.lastKnownStats.cpu_usage=o.cpu_usage;if(typeof o.ram_usage==="number")this.lastKnownStats.ram_usage=o.ram_usage;if(typeof o.temperature==="number")this.lastKnownStats.temperature=o.temperature;let i=typeof o.cpu_usage==="number"?o.cpu_usage:this.lastKnownStats.cpu_usage,n=typeof o.ram_usage==="number"?o.ram_usage:this.lastKnownStats.ram_usage,e=typeof o.temperature==="number"?o.temperature:this.lastKnownStats.temperature,s=Math.min(100,Math.max(0,Math.round(i))),p=Math.min(100,Math.max(0,Math.round(n))),d=Math.round(e),c=Math.min(100,Math.max(0,d));if(this._lastRendered.cpu===s&&this._lastRendered.ram===p&&this._lastRendered.temp===d)return;this._lastRendered={cpu:s,ram:p,temp:d},requestAnimationFrame(()=>{if(this.cpuBar)this.cpuBar.style.strokeDasharray=`${s}, 100`;if(this.cpuText)this.cpuText.textContent=`${s}%`;if(this.ramBar)this.ramBar.style.strokeDasharray=`${p}, 100`;if(this.ramText)this.ramText.textContent=`${p}%`;if(this.tempBar)this.tempBar.style.strokeDasharray=`${c}, 100`;if(this.tempText)this.tempText.textContent=`${d}°C`})}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
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
        `,this.cpuBar=this.shadowRoot.querySelector(".cpu-bar"),this.ramBar=this.shadowRoot.querySelector(".ram-bar"),this.tempBar=this.shadowRoot.querySelector(".temp-bar"),this.cpuText=this.shadowRoot.querySelector(".cpu-text"),this.ramText=this.shadowRoot.querySelector(".ram-text"),this.tempText=this.shadowRoot.querySelector(".temp-text"),this._lastRendered={cpu:-1,ram:-1,temp:-1},this.lastUpdate=0;let o=g.getState();if(o.stats)this.update(o.stats)}}customElements.define("widget-telemetry",kr);f();j();var wr=new Map,$r=900000,zr={widgetId:"weather",latitude:0,longitude:0,city:"",unit:"celsius",showForecast:!1,forecastDays:5};function C(o){if(o===0)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="32" cy="32" r="11"/>
            <line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/>
            <line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/>
            <line x1="13.6" y1="13.6" x2="19.3" y2="19.3"/><line x1="44.7" y1="44.7" x2="50.4" y2="50.4"/>
            <line x1="13.6" y1="50.4" x2="19.3" y2="44.7"/><line x1="44.7" y1="19.3" x2="50.4" y2="13.6"/>
        </svg>`;if(o<=2)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <circle cx="24" cy="20" r="8"/>
            <line x1="24" y1="5" x2="24" y2="9"/><line x1="9" y1="20" x2="13" y2="20"/>
            <line x1="13.3" y1="9.3" x2="16.2" y2="12.2"/><line x1="34.7" y1="9.3" x2="31.8" y2="12.2"/>
            <line x1="13.3" y1="30.7" x2="16.2" y2="27.8"/>
            <path d="M22 46 Q22 38 30 38 Q30 30 40 30 Q50 30 50 38 Q56 38 56 44 Q56 50 50 50 L26 50 Q22 50 22 46Z"/>
        </svg>`;if(o===3)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 42 Q14 34 22 34 Q22 24 34 24 Q46 24 46 34 Q54 34 54 42 Q54 48 46 48 L20 48 Q14 48 14 42Z"/>
            <path d="M10 36 Q10 30 16 30 Q16 24 24 24" opacity="0.35"/>
        </svg>`;if(o===45||o===48)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M16 30 Q16 22 24 22 Q24 14 36 14 Q48 14 48 22 Q54 22 54 30 Q54 36 48 36 L22 36 Q16 36 16 30Z"/>
            <line x1="14" y1="42" x2="50" y2="42" opacity="0.5"/>
            <line x1="18" y1="48" x2="46" y2="48" opacity="0.35"/>
            <line x1="22" y1="54" x2="42" y2="54" opacity="0.2"/>
        </svg>`;if(o>=51&&o<=57)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 34 Q14 26 22 26 Q22 18 34 18 Q46 18 46 26 Q54 26 54 34 Q54 40 46 40 L20 40 Q14 40 14 34Z"/>
            <line x1="24" y1="46" x2="22" y2="52" opacity="0.6"/><line x1="34" y1="46" x2="32" y2="52" opacity="0.6"/>
            <line x1="44" y1="46" x2="42" y2="52" opacity="0.6"/>
        </svg>`;if(o>=61&&o<=67||o>=80&&o<=82)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 32 Q14 24 22 24 Q22 16 34 16 Q46 16 46 24 Q54 24 54 32 Q54 38 46 38 L20 38 Q14 38 14 32Z"/>
            <line x1="22" y1="44" x2="18" y2="54"/><line x1="32" y1="44" x2="28" y2="54"/>
            <line x1="42" y1="44" x2="38" y2="54"/><line x1="50" y1="44" x2="48" y2="50" opacity="0.5"/>
        </svg>`;if(o>=71&&o<=77||o>=85&&o<=86)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M14 32 Q14 24 22 24 Q22 16 34 16 Q46 16 46 24 Q54 24 54 32 Q54 38 46 38 L20 38 Q14 38 14 32Z"/>
            <circle cx="24" cy="48" r="2" fill="currentColor" stroke="none"/>
            <circle cx="34" cy="46" r="2" fill="currentColor" stroke="none"/>
            <circle cx="44" cy="50" r="2" fill="currentColor" stroke="none"/>
            <circle cx="30" cy="54" r="2" fill="currentColor" stroke="none"/>
        </svg>`;if(o>=95)return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 30 Q14 22 22 22 Q22 14 34 14 Q46 14 46 22 Q54 22 54 30 Q54 36 46 36 L20 36 Q14 36 14 30Z"/>
            <polyline points="35,38 28,48 36,48 29,58" stroke-width="2.5"/>
        </svg>`;return`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <path d="M14 40 Q14 32 22 32 Q22 22 34 22 Q46 22 46 32 Q54 32 54 40 Q54 46 46 46 L20 46 Q14 46 14 40Z"/>
    </svg>`}function ko(o){let r={0:"clear_sky",1:"mainly_clear",2:"partly_cloudy",3:"overcast",45:"fog",48:"fog",51:"light_drizzle",53:"drizzle",55:"heavy_drizzle",56:"freezing_drizzle",57:"freezing_drizzle",61:"light_rain",63:"rain",65:"heavy_rain",66:"freezing_rain",67:"freezing_rain",71:"light_snow",73:"snow",75:"heavy_snow",77:"snow_grains",80:"light_showers",81:"showers",82:"heavy_showers",85:"snow_showers",86:"heavy_snow_showers",95:"thunderstorm",96:"thunderstorm_hail",99:"thunderstorm_hail"};return a.t(`widget.weather.${r[o]||"unknown"}`)}function Z(o,r){if(r==="fahrenheit")return`${Math.round(o*9/5+32)}°F`;return`${Math.round(o)}°C`}async function jt(o,r){let t=`${o.toFixed(2)},${r.toFixed(2)}`,i=wr.get(t);if(i&&Date.now()-i.timestamp<$r)return i.data;let n=`https://api.open-meteo.com/v1/forecast?latitude=${o}&longitude=${r}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max&timezone=auto&forecast_days=7`,e=await fetch(n);if(!e.ok)throw Error("Weather API error");let s=await e.json();return wr.set(t,{data:s,timestamp:Date.now()}),s}class jr extends HTMLElement{_config={...zr};_itemId=0;_unsubscribe=null;_unsubscribeI18n;_weatherData=null;_refreshTimer=null;_loading=!1;_error=!1;constructor(){super();this.attachShadow({mode:"open"})}static get observedAttributes(){return["item-id"]}attributeChangedCallback(o,r,t){if(o==="item-id")this._itemId=parseInt(t)}connectedCallback(){this.render(),this.loadWeather(),this._refreshTimer=setInterval(()=>this.loadWeather(),$r),this._unsubscribe=g.subscribe((o)=>{if(!this._itemId)return;let r=o.items.find((t)=>t.id===this._itemId);if(!r?.content)return;try{let t=typeof r.content==="string"?JSON.parse(r.content):r.content;if(t.widgetId!=="weather")return;let i=this._config.latitude,n=this._config.longitude;if(this._config={...zr,...t},i!==this._config.latitude||n!==this._config.longitude)this.loadWeather();else this.updateDisplay()}catch(t){}}),this._unsubscribeI18n=a.subscribe(()=>this.updateDisplay())}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._refreshTimer)clearInterval(this._refreshTimer)}async loadWeather(){if(!this._config.latitude&&!this._config.longitude){this._loading=!1,this._error=!1,this.updateDisplay();return}this._loading=!0,this._error=!1,this.updateDisplay();try{this._weatherData=await jt(this._config.latitude,this._config.longitude),this._loading=!1}catch(o){this._loading=!1,this._error=!0}this.updateDisplay()}updateDisplay(){let o=this.shadowRoot?.querySelector(".weather-body");if(!o){this.render();return}if(!this._config.latitude&&!this._config.longitude){o.innerHTML=this.emptyState(C(0),a.t("widget.weather.no_location"));return}if(this._loading){o.innerHTML=this.emptyState(C(3),a.t("general.loading"),!0);return}if(this._error||!this._weatherData){o.innerHTML=this.emptyState(C(-1),a.t("general.error"));return}let r=this._weatherData.current_weather,t=this._weatherData.daily,i=this._config.unit||"celsius";if(this._config.showForecast&&t)o.innerHTML=this.forecastView(r,t,i);else o.innerHTML=this.simpleView(r,t,i)}emptyState(o,r,t=!1){return`<div class="state"><div class="state-icon${t?" pulse":""}">${o}</div><span class="state-text">${r}</span></div>`}simpleView(o,r,t){return`
            <div class="icon-main">${C(o.weathercode)}</div>
            <div class="temp-main">${Z(o.temperature,t)}</div>
            <div class="desc">${ko(o.weathercode)}</div>
            ${r?`<div class="minmax"><span class="hi">${Z(r.temperature_2m_max[0],t)}</span><span class="lo">${Z(r.temperature_2m_min[0],t)}</span></div>`:""}
            ${this._config.city?`<div class="city">${this._config.city}</div>`:""}
        `}forecastView(o,r,t){let i=a.getLocale().code,n=Math.min(this._config.forecastDays||5,r.time.length-1),e="";for(let s=1;s<=n;s++){let p=new Date(r.time[s]+"T00:00:00"),d=p.toLocaleDateString(i,{weekday:"short"}),c=p.toLocaleDateString(i,{weekday:"long",day:"numeric",month:"long"}),l=ko(r.weathercode[s]),x=Z(r.temperature_2m_max[s],t),u=Z(r.temperature_2m_min[s],t),v=r.sunrise?.[s]?.split("T")[1]||"",y=r.sunset?.[s]?.split("T")[1]||"",_=r.wind_speed_10m_max?.[s]!=null?`${Math.round(r.wind_speed_10m_max[s])} km/h`:"";e+=`<div class="fc-day">
                <span class="fc-name">${d}</span>
                <span class="fc-icon">${C(r.weathercode[s])}</span>
                <span class="fc-temp">${x}</span>
                <div class="fc-tooltip">
                    <div class="tt-date">${c}</div>
                    <div class="tt-desc">${l}</div>
                    <div class="tt-row"><span class="tt-label">${a.t("widget.weather.max_min")}</span><span>${x} / ${u}</span></div>
                    ${v?`<div class="tt-row"><span class="tt-label">${a.t("widget.weather.sunrise")}</span><span>${v}</span></div>`:""}
                    ${y?`<div class="tt-row"><span class="tt-label">${a.t("widget.weather.sunset")}</span><span>${y}</span></div>`:""}
                    ${_?`<div class="tt-row"><span class="tt-label">${a.t("widget.weather.wind")}</span><span>${_}</span></div>`:""}
                </div>
            </div>`}return`
            <div class="fc-header">
                <div class="fc-h-icon">${C(o.weathercode)}</div>
                <div class="fc-h-info">
                    <div class="fc-h-temp">${Z(o.temperature,t)}</div>
                    <div class="fc-h-desc">${ko(o.weathercode)}</div>
                </div>
                ${this._config.city?`<div class="fc-h-city">${this._config.city}</div>`:""}
            </div>
            <div class="minmax compact"><span class="hi">${Z(r.temperature_2m_max[0],t)}</span><span class="lo">${Z(r.temperature_2m_min[0],t)}</span></div>
            <div class="fc-row">${e}</div>
        `}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`<style>${Lt}</style><div class="weather-body"></div>`,this.updateDisplay()}}var Lt=`
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
`;customElements.define("widget-weather",jr);var Lr=`:host {
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
    justify-content: flex-start;
    /* Start from top, let flex-1 push down */
    gap: 0;

    /* Default: Icon Top, Label Bottom */
    flex-direction: column;
    align-items: center;

    text-decoration: none;
    color: var(--text-main);
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
    box-sizing: border-box;
    overflow: hidden;
    container-type: inline-size;
    z-index: 10;
}

/* Label Position: Top */
.bookmark-grid__card.label-top {
    flex-direction: column-reverse;
    justify-content: flex-end;
}

/* Label Position: Section Style (Pill on Top Border) */
.bookmark-grid__card.label-section {
    position: relative;
    padding-top: 12px !important;
    /* Make room for the pill */
    overflow: visible;
    /* Allow pill to sit on border */
    display: flex;
    flex-direction: column;
    justify-content: center;
    /* Center icon vertically */
    align-items: center;
}

.bookmark-grid__card.label-section .bookmark-grid__label {
    position: absolute;
    top: 0;
    transform: translateY(calc(-50% - 1px));
    /* EXACT MATCH */
    left: 12px;
    right: 12px;
    width: fit-content;
    /* EXACT MATCH */
    max-width: calc(100% - 24px);
    /* EXACT MATCH */

    /* Pill Style (Borrowed from .section-title) */
    background: var(--surface-solid);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2px 8px;
    /* EXACT MATCH */

    font-size: 0.65rem;
    /* EXACT MATCH */
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    /* EXACT MATCH */
    color: var(--text-dim);
    line-height: 1.4;
    /* EXACT MATCH */

    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    /* EXACT MATCH */
    z-index: 5;

    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    margin: 0;
    font-family: var(--font-mono, monospace);
    /* EXACT MATCH */
    box-sizing: border-box;
}

.bookmark-grid__card.label-section .bookmark-grid__icon-container {
    /* Icon takes full space, label is absolute */
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
}

.bookmark-grid__card.label-section:hover .bookmark-grid__label {
    border-color: var(--accent);
    color: var(--accent);
}

/* Label Position: Off (Hidden) */
.bookmark-grid__card.label-off .bookmark-grid__label {
    display: none;
}

.bookmark-grid__card.label-off .bookmark-grid__icon-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
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
    /* Default Position (Top-Right) - Overridden by specific classes below */
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

/* Status Positions */
.status-indicator.status-pos-top-right {
    top: clamp(6px, 6cqi, 12px);
    right: clamp(6px, 6cqi, 12px);
    bottom: auto;
    left: auto;
}

.status-indicator.status-pos-top-left {
    top: clamp(6px, 6cqi, 12px);
    left: clamp(6px, 6cqi, 12px);
    bottom: auto;
    right: auto;
}

.status-indicator.status-pos-bottom-right {
    bottom: clamp(6px, 6cqi, 12px);
    right: clamp(6px, 6cqi, 12px);
    top: auto;
    left: auto;
}

.status-indicator.status-pos-bottom-left {
    bottom: clamp(6px, 6cqi, 12px);
    left: clamp(6px, 6cqi, 12px);
    top: auto;
    right: auto;
}

.status-up {
    background-color: #2ecc71;
}

.status-down {
    background-color: #e74c3c;
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
    border: 2px dashed var(--accent) !important;
    background: rgba(var(--accent-rgb), 0.15) !important;
    /* Increased opacity and forced priority */
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
    /* Pill padding */
    font-family: var(--font-mono, monospace);

    /* Premium "Button/Pill" Look */
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2px 8px;
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
}

/* Status Positions */
.status-indicator.status-pos-top-right {
    top: clamp(6px, 6cqi, 12px);
    right: clamp(6px, 6cqi, 12px);
    bottom: auto;
    left: auto;
}

.status-indicator.status-pos-top-left {
    top: clamp(6px, 6cqi, 12px);
    left: clamp(6px, 6cqi, 12px);
    bottom: auto;
    right: auto;
}

.status-indicator.status-pos-bottom-right {
    bottom: clamp(6px, 6cqi, 12px);
    right: clamp(6px, 6cqi, 12px);
    top: auto;
    left: auto;
}

.status-indicator.status-pos-bottom-left {
    bottom: clamp(6px, 6cqi, 12px);
    left: clamp(6px, 6cqi, 12px);
    top: auto;
    right: auto;
}`;class Hr extends HTMLElement{bookmarks=[];allItems=[];isEditing=!1;isLoading=!0;searchQuery="";_unsubscribe;_unsubscribeI18n;_resizeObserver;_resizeDebounce=null;dragTargetId=null;ghostEl=null;dragOffsetX=0;dragOffsetY=0;isResizing=!1;resizeTargetId=null;initialResizeX=0;initialResizeY=0;initialResizeW=0;initialResizeH=0;currentColWidth=0;currentGridCols=12;isTouchDevice=!1;constructor(){super();this.attachShadow({mode:"open"})}_widgetModal;_boundActionClick=this.handleActionClick.bind(this);_boundMouseMove=this.handleWindowMouseMove.bind(this);_boundMouseUp=this.handleWindowMouseUp.bind(this);_boundUpdateTouchState=()=>{};applyFilters(){let o=this.isTouchDevice,r=!!this.searchQuery;if(r&&!o)this.classList.add("search-active");else this.classList.remove("search-active");if(o||r)this.bookmarks=this.allItems.filter((t)=>{let i=t.content;if(typeof t.content==="string")try{i=JSON.parse(t.content)}catch{return!1}if(o&&t.type!=="bookmark")return!1;if(o&&i.visibleTouch===!1)return!1;if(r)return(i.label||"").toLowerCase().includes(this.searchQuery);return!0});else this.bookmarks=this.allItems}connectedCallback(){let o=()=>{let r=window.innerWidth<768,t=window.matchMedia("(pointer: coarse)").matches||"ontouchstart"in window||navigator.maxTouchPoints>0;return r&&t};if(this._boundUpdateTouchState=()=>{let r=o();if(this.isTouchDevice!==r){if(this.isTouchDevice=r,r)this.classList.add("touch-mode");else this.classList.remove("touch-mode");this.applyFilters(),this.render()}},window.addEventListener("resize",this._boundUpdateTouchState),window.addEventListener("orientationchange",this._boundUpdateTouchState),this.isTouchDevice=o(),this.isTouchDevice)this.classList.add("touch-mode");this.applyFilters(),this.render(),this.updateGridMetrics(),this._resizeObserver=new ResizeObserver(()=>{if(this._resizeDebounce)return;this._resizeDebounce=setTimeout(()=>{this._resizeDebounce=null,this.updateGridMetrics();let r=this.getBoundingClientRect();g.setGridMetrics(r.width,this.currentGridCols),this.applyFilters(),this.render()},16)}),this._resizeObserver.observe(this),this._unsubscribe=g.subscribe((r)=>{let t=!1;if(this.isEditing!==r.isEditing)this.isEditing=r.isEditing,t=!0;if(this.isLoading!==r.loading)this.isLoading=r.loading,t=!0;if(this.searchQuery!==r.searchQuery)this.searchQuery=r.searchQuery,t=!0;let i=Array.isArray(r.items)?r.items:[],n=!1,e=!1;if(this.allItems.length!==i.length)n=!0;else for(let s=0;s<i.length;s++){let p=this.allItems[s],d=i[s];if(p.id!==d.id||p.x!==d.x||p.y!==d.y||p.w!==d.w||p.h!==d.h||p.parent_id!==d.parent_id||p.content!==d.content){n=!0;break}if(p.status!==d.status)e=!0}if(n||t)this.allItems=i,this.applyFilters(),this.render();else if(e)this.updateStatusIndicators(this.allItems,i),this.allItems=i,this.applyFilters()}),this.setupDragListeners(),this.setupResizeListeners(),this.setupActionListeners(),I.start(),this._unsubscribeI18n=a.subscribe(()=>this.render()),Promise.resolve().then(() => (O(),ro)).then(({userStore:r})=>{this._unsubscribeUser=r.subscribe(()=>{requestAnimationFrame(()=>{this.updateGridMetrics(),this.render()})})})}updateStatusIndicators(o,r){if(!this.shadowRoot)return;for(let t=0;t<r.length;t++){let i=o[t],n=r[t];if(i.id===n.id&&i.status!==n.status){let e=this.shadowRoot.querySelector(`[data-id="${n.id}"]`);if(e){let s=e.querySelector(".status-indicator");if(s){if(s.classList.remove("status-up","status-down","status-pending"),n.status)s.classList.add(`status-${n.status}`);let p=a.t("general.pinging");if(n.status==="up")p=a.t("status.online");else if(n.status==="down")p=a.t("status.unreachable");else if(n.status==="pending")p=a.t("status.checking");s.setAttribute("title",p)}}}}}_unsubscribeUser=null;setupActionListeners(){let o=this.shadowRoot;o.removeEventListener("click",this._boundActionClick),o.addEventListener("click",this._boundActionClick)}async handleActionClick(o){if(!this.isEditing)return;let r=o.target;if(!r)return;let t=r.closest(".btn-delete"),i=r.closest(".btn-edit");if(t||i)o.preventDefault(),o.stopPropagation();else if(r.closest("a"))o.preventDefault();if(t){let n=t.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!n)return;let e=parseInt(n.dataset.id||"0"),s=this.allItems.find((l)=>l.id===e);if(!s)return;let p=s.type==="section"?a.t("type.section"):s.type==="widget"?a.t("type.widget"):a.t("type.bookmark"),{eventBus:d,EVENTS:c}=await Promise.resolve().then(() => (to(),wo));d.emit(c.SHOW_CONFIRMATION,{title:`${a.t("general.delete")} ${p}`,message:a.t("bookmark.delete_confirm_message"),onConfirm:()=>{g.deleteItem(e)}});return}if(i){let n=i.closest(".bookmark-grid__card, .bookmark-grid__group, .bookmark-grid__section");if(!n)return;let e=parseInt(n.dataset.id||"0"),s=this.allItems.find((p)=>p.id===e);if(s){let{eventBus:p,EVENTS:d}=await Promise.resolve().then(() => (to(),wo));if(s.type==="widget")p.emit(d.SHOW_WIDGET_CONFIG,{item:s,type:"widget"});else if(s.type==="section")p.emit(d.SHOW_WIDGET_CONFIG,{item:s,type:"section"});else p.emit(d.SHOW_WIDGET_CONFIG,{item:s,type:"bookmark"})}return}}disconnectedCallback(){if(this._unsubscribe)this._unsubscribe();if(this._unsubscribeI18n)this._unsubscribeI18n();if(this._unsubscribeUser)this._unsubscribeUser();if(this._resizeObserver)this._resizeObserver.disconnect();if(this._resizeDebounce)clearTimeout(this._resizeDebounce);if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout);window.removeEventListener("mousemove",this._boundMouseMove),window.removeEventListener("mouseup",this._boundMouseUp),window.removeEventListener("resize",this._boundUpdateTouchState),window.removeEventListener("orientationchange",this._boundUpdateTouchState),I.stop()}updateGridMetrics(){let o=this.getBoundingClientRect(),r=getComputedStyle(this),t=r.getPropertyValue("--grid-cols").trim(),i=parseInt(t)||12,n=r.columnGap||r.gap||"16px",e=parseFloat(n)||16;if(o.width<=0){this.currentGridCols=i,this.currentColWidth=100,this.style.setProperty("--current-grid-cols",i.toString()),this.style.setProperty("--row-height","100px");return}let s=(i-1)*e,p=(o.width-s)/i;if(p<10)p=10;this.currentGridCols=i,this.currentColWidth=p,this.style.setProperty("--current-grid-cols",String(i)),this.style.setProperty("--row-height",`${p}px`),this.ensureGridBuffer()}ensureGridBuffer(){if(this.isTouchDevice){this.style.minHeight="";return}let o=0;this.bookmarks.forEach((s)=>{let p=(s.y||1)+(s.h||1);if(p>o)o=p});let t=o+1,i=this.currentColWidth||100,n=16,e=t*i+(t-1)*n;this.style.minHeight=`${e}px`}setupResizeListeners(){window.addEventListener("mousemove",this._boundMouseMove),window.addEventListener("mouseup",this._boundMouseUp),this.shadowRoot.addEventListener("mousedown",(o)=>{let r=o;if(!this.isEditing)return;let t=r.target;if(t.classList.contains("resize-handle")){r.preventDefault(),r.stopPropagation();let i=t.closest(".bookmark-grid__card, .bookmark-grid__section");if(!i||!i.dataset.id)return;let n=parseInt(i.dataset.id),e=this.bookmarks.find((v)=>v.id===n);if(!e)return;this.isResizing=!0,this.resizeTargetId=n,this.initialResizeX=r.clientX,this.initialResizeY=r.clientY,this.initialResizeW=e.w,this.initialResizeH=e.h;let s=this,p=s.getBoundingClientRect(),c=getComputedStyle(s).getPropertyValue("--current-grid-cols").trim(),l=c?parseInt(c,10):9,x=isNaN(l)?9:l,u=16;this.currentColWidth=(p.width-(x-1)*u)/x,this.updateGhost({x:e.x,y:e.y,w:e.w,h:e.h},!0)}})}_updateGhostTimeout=null;handleWindowMouseMove(o){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)return;this._updateGhostTimeout=setTimeout(()=>{this._updateGhostTimeout=null,this.processResizeMove(o)},16)}processResizeMove(o){if(!this.isResizing||!this.resizeTargetId)return;let r=o.clientX-this.initialResizeX,t=o.clientY-this.initialResizeY,i=Math.round(r/(this.currentColWidth+16)),n=Math.round(t/(this.currentColWidth+16)),e=this.initialResizeW+i,s=this.initialResizeH+n,p=this.bookmarks.find((d)=>d.id===this.resizeTargetId);if(p){let d=this.applyResizeConstraints(e,s,p),c={x:p.x,y:p.y,w:d.w,h:d.h,id:p.id,parent_id:p.parent_id},l=J.calculateDropValidity(c,this.bookmarks,this.currentGridCols);this.updateGhost(c,l.valid)}}applyResizeConstraints(o,r,t){let i=1,n=1;if(t.type==="widget"){let e=t.content;if(typeof t.content==="string")try{e=JSON.parse(t.content)}catch{return{w:Math.max(1,Math.min(12,o)),h:Math.max(1,Math.min(12,r))}}let s=(e.widgetId||"").toLowerCase();if(s==="notepad")i=2,n=2;else if(s==="clock")return{w:2,h:1};else if(s==="telemetry")return{w:2,h:1};let p=Math.max(i,Math.min(12,o)),d=Math.max(n,Math.min(12,r));return{w:p,h:d}}else if(t.type==="section"){let e=Math.max(1,Math.min(12,o)),s=Math.max(1,Math.min(12,r));return{w:e,h:s}}else{let e=Math.max(1,Math.min(2,o)),s=Math.max(1,Math.min(2,r));return{w:e,h:s}}}async handleWindowMouseUp(o){if(!this.isResizing||!this.resizeTargetId)return;if(this._updateGhostTimeout)clearTimeout(this._updateGhostTimeout),this._updateGhostTimeout=null;let r=o.clientX-this.initialResizeX,t=o.clientY-this.initialResizeY,i=Math.round(r/(this.currentColWidth+16)),n=Math.round(t/(this.currentColWidth+16)),e=this.initialResizeW+i,s=this.initialResizeH+n,p=this.bookmarks.find((x)=>x.id===this.resizeTargetId);if(!p)return;let d=this.applyResizeConstraints(e,s,p);e=d.w,s=d.h;let c={x:p.x,y:p.y,w:e,h:s,id:p.id,parent_id:p.parent_id};if(J.calculateDropValidity(c,this.bookmarks,this.currentGridCols).valid&&(p.w!==e||p.h!==s)){if(p.type==="section"){let x=e*s,u=this.bookmarks.filter((v)=>v.parent_id===p.id);if(u.sort((v,y)=>v.y-y.y||v.x-y.x),u.length>x){let v=u.slice(x),y=[...this.bookmarks],_=v.map((k)=>{let b=J.findFirstAvailableSlot(k.w,k.h,y,this.currentGridCols);return y.push({...k,x:b.x,y:b.y,parent_id:void 0}),{id:k.id,x:b.x,y:b.y,parent_id:void 0}});await Promise.all(_.map((k)=>g.updateItem(k)))}}await g.resizeItem(p.id,e,s)}if(this.isResizing=!1,this.resizeTargetId=null,this.ghostEl)this.ghostEl.style.display="none"}setupDragListeners(){let o=this.shadowRoot,r=this;o.addEventListener("dragstart",(i)=>{let n=i;if(!this.isEditing){n.preventDefault();return}let e=n.target.closest('[draggable="true"]');if(e&&e.dataset.id){this.dragTargetId=parseInt(e.dataset.id),n.dataTransfer.effectAllowed="move",e.style.opacity="0.5";let s=e.getBoundingClientRect();if(this.dragOffsetX=n.clientX-s.left,this.dragOffsetY=n.clientY-s.top,n.dataTransfer)n.dataTransfer.setDragImage(e,this.dragOffsetX,this.dragOffsetY)}}),o.addEventListener("dragend",(i)=>{let n=i.target.closest('[draggable="true"]');if(n)n.style.opacity="1";if(this.dragTargetId=null,this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((s)=>s.classList.remove("drop-target"))});let t=null;r.addEventListener("dragover",(i)=>{let n=i;if(!this.isEditing||!this.dragTargetId)return;if(n.preventDefault(),n.dataTransfer.dropEffect="move",t)return;t=setTimeout(()=>{t=null,this.processDragOver(n,r)},16)}),r.addEventListener("drop",async(i)=>{let n=i;if(t)clearTimeout(t),t=null;await this.handleDrop(n,r)})}processDragOver(o,r){let n=document.querySelector(".main-content");if(n){let z=n.getBoundingClientRect(),W=o.clientY;if(W>z.bottom-100)n.scrollBy(0,15);else if(W<z.top+100)n.scrollBy(0,-15)}let e=r.getBoundingClientRect(),s=this.currentGridCols||12,p=e.width,d=16,c=(p-(s-1)*d)/s,l=this.bookmarks.find((z)=>z.id===this.dragTargetId);if(!l)return;let x=o.clientX-this.dragOffsetX,u=o.clientY-this.dragOffsetY,v=x-e.left,y=u-e.top,_=Math.floor(v/(c+d)),k=Math.floor(y/(c+d)),b=Math.max(1,Math.min(s-l.w+1,_+1)),H=Math.max(1,k+1),A={x:b,y:H,w:l.w,h:l.h,id:l.id,parent_id:l.parent_id},h=J.calculateDropValidity(A,this.bookmarks,s),K=!this.bookmarks.some((z)=>{if(z.id===l.id)return!1;if(z.parent_id!==l.parent_id&&!h.targetGroup)return!1;let W=z.x||1,qo=z.y||1,at=z.w||1,nt=z.h||1;if(h.targetGroup&&z.id===h.targetGroup.id)return!1;return b<W+at&&b+l.w>W&&H<qo+nt&&H+l.h>qo})&&h.valid;if(this.updateGhost(A,K),this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((z)=>z.classList.remove("drop-target")),h.targetGroup&&K){let z=this.shadowRoot.querySelector(`.bookmark-grid__section[data-id="${h.targetGroup.id}"]`);if(z)z.classList.add("drop-target")}}async handleDrop(o,r){if(!this.isEditing||!this.dragTargetId)return;o.preventDefault();let t=this.bookmarks.find((h)=>h.id===this.dragTargetId);if(!t)return;let i=r.getBoundingClientRect(),n=this.currentGridCols||12,e=i.width,s=16,p=(e-(n-1)*s)/n,d=o.clientX-this.dragOffsetX,c=o.clientY-this.dragOffsetY,l=d-i.left,x=c-i.top,u=Math.floor(l/(p+s)),v=Math.floor(x/(p+s)),y=Math.max(1,Math.min(n-t.w+1,u+1)),_=Math.max(1,v+1),k={x:y,y:_,w:t.w,h:t.h,id:t.id,parent_id:t.parent_id},b=J.calculateDropValidity(k,this.bookmarks,n);if(this.bookmarks.some((h)=>{if(h.id===t.id)return!1;if(h.parent_id!==t.parent_id&&!b.targetGroup)return!1;let B=h.x||1,K=h.y||1,Lo=h.w||1,z=h.h||1;if(b.targetGroup&&h.id===b.targetGroup.id)return!1;return y<B+Lo&&y+t.w>B&&_<K+z&&_+t.h>K})&&!b.targetGroup){if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".drop-target").forEach((h)=>h.classList.remove("drop-target"));return}if(b.valid){let h={id:t.id,x:b.x,y:b.y};if(b.targetGroup)h.parent_id=b.targetGroup.id,h.x=b.x-b.targetGroup.x+1,h.y=b.y-b.targetGroup.y+1;else h.parent_id=void 0;await g.updateItem(h)}if(this.ghostEl)this.ghostEl.style.display="none";this.shadowRoot.querySelectorAll(".bookmark-grid__section").forEach((h)=>h.classList.remove("drop-target"))}updateGhost(o,r){if(!this.ghostEl)this.ghostEl=this.shadowRoot.getElementById("ghost-element");if(!this.ghostEl)return;if(this.ghostEl.style.display="block",this.ghostEl.style.setProperty("--ghost-x",String(o.x)),this.ghostEl.style.setProperty("--ghost-y",String(o.y)),this.ghostEl.style.setProperty("--ghost-w",String(o.w)),this.ghostEl.style.setProperty("--ghost-h",String(o.h)),r)this.ghostEl.classList.remove("invalid");else this.ghostEl.classList.add("invalid")}render(){if(this.isEditing)this.classList.add("edit-mode");else this.classList.remove("edit-mode");this.shadowRoot.innerHTML=`
            <style>${Lr}</style>
            ${ur({bookmarks:this.bookmarks,isEditing:this.isEditing,isLoading:this.isLoading,isSearching:!!this.searchQuery,isTouchDevice:this.isTouchDevice,maxCols:this.currentGridCols})}
        `,this.setupActionListeners(),this.ghostEl=this.shadowRoot.getElementById("ghost-element")}}if(!customElements.get("bookmark-grid"))customElements.define("bookmark-grid",Hr);var Ar=()=>`
    <div class="toast-container"></div>
`;var Fr=`.toast-container {
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
}`;class Mr extends HTMLElement{_boundOpen;_boundClose;constructor(){super();this.attachShadow({mode:"open"}),this._boundOpen=()=>this.shift(!0),this._boundClose=()=>this.shift(!1)}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",this._boundOpen),window.addEventListener("drawer-close",this._boundClose)}disconnectedCallback(){window.removeEventListener("drawer-open",this._boundOpen),window.removeEventListener("drawer-close",this._boundClose)}shift(o){let r=this.shadowRoot.querySelector(".toast-container");if(r)if(o)r.classList.add("toast-container--shifted");else r.classList.remove("toast-container--shifted")}show(o,r="success"){let t=this.shadowRoot.querySelector(".toast-container");if(!t)return;let i=document.createElement("div");i.className=`toast toast--${r}`,i.textContent=o,t.appendChild(i),requestAnimationFrame(()=>{i.style.opacity="1",i.style.transform="translateY(0)"}),setTimeout(()=>{i.style.opacity="0",i.style.transform="translateY(20px)",setTimeout(()=>i.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${Fr}</style>
            ${Ar()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",Mr);f();f();var Qr=()=>`
    <div class="icon-picker">
        <div class="icon-picker__header">
            <div class="icon-picker__search">
                <div class="icon-picker__search-container">
                    <div class="icon-picker__search-preview" id="icon-preview">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dim);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <input type="text"
                           id="icon-search"
                           class="icon-picker__search-input"
                           placeholder="URL del icono *" />
                </div>
                <button class="icon-picker__upload-btn" id="icon-upload-btn" title="Subir icono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </button>
                <input type="file" id="icon-upload-input" accept="image/*" style="display: none;" />
            </div>
        </div>

        <div id="grid-container" class="icon-picker__grid"></div>
    </div>
`,Gr=(o,r,t)=>{if(t)return`<div class="icon-picker__loading">${a.t("general.loading")}</div>`;if(o.length===0)return`<div class="icon-picker__empty">${a.t("general.no_icons")}</div>`;let i=o.reduce((e,s)=>{if(!e[s.provider])e[s.provider]=[];return e[s.provider].push(s),e},{}),n="";for(let[e,s]of Object.entries(i))n+=`
            <div class="icon-picker__group">
                <div class="icon-picker__group-header">${e}</div>
                <div class="icon-picker__group-grid">
                    ${s.map((p)=>`
                        <div class="icon-picker__item ${r===p.url?"icon-picker__item--selected":""}"
                             data-iconurl="${p.url}"
                             data-iconname="${p.name}"
                             title="${p.name}">
                            ${p.format==="svg"?'<span class="icon-picker__badge badge-svg">SVG</span>':""}
                            ${p.format==="webp"?'<span class="icon-picker__badge badge-webp">WEBP</span>':""}
                            <img src="${p.url}" alt="${p.name}" loading="lazy" />
                        </div>
                    `).join("")}
                </div>
            </div>
        `;return n};class Jr{icons=[];loaded=!1;loading=!1;BASE_URL="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";FALLBACK_URL="https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main";PROVIDERS=[{id:"homarr",name:"homarr-labs/dashboard-icons",url:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/tree.json",prefix:"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/",format:"webp",parser:(o,r,t)=>{return(Array.isArray(o)?o:o.webp||o.png||[]).filter((n)=>n.endsWith(".webp")||n.endsWith(".svg")||n.endsWith(".png")).map((n)=>({name:n.replace(/\.(webp|png|svg)$/,""),url:`${r}${n.replace(/\.(png|svg)$/,".webp")}`,provider:t,format:"webp"}))}},{id:"selfhst",name:"selfhst/icons",url:"https://cdn.jsdelivr.net/gh/selfhst/icons@main/index.json",prefix:"https://cdn.jsdelivr.net/gh/selfhst/icons@main/webp/",format:"webp",parser:(o,r,t)=>{return(Array.isArray(o)?o:[]).map((n)=>({name:n.Name||n.Reference,url:`${r}${n.Reference}.webp`,provider:t,format:"webp"}))}},{id:"loganmarchione",name:"loganmarchione/homelab-svg-assets",url:"https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets@main/icons.json",prefix:"https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets@main/",format:"svg",parser:(o,r,t)=>{return(o.icons||[]).map((n)=>({name:n.name,url:`${r}${n.path.replace("./","")}`,provider:t,format:"svg"}))}},{id:"simple-icons",name:"simple-icons/simple-icons",url:"https://unpkg.com/simple-icons@14.0.0/_data/simple-icons.json",prefix:"https://cdn.jsdelivr.net/npm/simple-icons@14.0.0/icons/",format:"svg",parser:(o,r,t)=>{let i=(e)=>{return e.toLowerCase().replace(/\+/g,"plus").replace(/^\./,"dot-").replace(/\./g,"dot").replace(/&/g,"and").replace(/đ/g,"d").replace(/ħ/g,"h").replace(/ı/g,"i").replace(/ĸ/g,"k").replace(/ŀ/g,"l").replace(/ł/g,"l").replace(/ß/g,"ss").replace(/ŧ/g,"t").replace(/[^a-z0-9]/g,"")};return(Array.isArray(o)?o:o.icons||[]).map((e)=>{let s=e.slug||i(e.title);return{name:e.title,url:`${r}${s}.svg`,provider:t,format:"svg"}})}},{id:"papirus",name:"PapirusDevelopmentTeam/papirus-icon-theme",url:"https://api.github.com/repos/PapirusDevelopmentTeam/papirus-icon-theme/git/trees/master:Papirus/64x64/apps",prefix:"https://cdn.jsdelivr.net/gh/PapirusDevelopmentTeam/papirus-icon-theme@master/Papirus/64x64/apps/",format:"svg",parser:(o,r,t)=>{return(o.tree?o.tree:[]).filter((n)=>n.path&&n.path.endsWith(".svg")&&n.mode!=="120000").map((n)=>({name:n.path.replace(/\.svg$/,""),url:`${r}${n.path}`,provider:t,format:"svg"}))}}];async loadIcons(){if(this.loaded)return this.icons;if(this.loading)return await new Promise((o)=>setTimeout(o,100)),this.loadIcons();this.loading=!0;try{let o=this.PROVIDERS.map(async(i)=>{try{let n=await fetch(i.url);if(!n.ok)throw Error(`HTTP ${n.status}`);let e=await n.json();return i.parser(e,i.prefix,i.name)}catch(n){return console.error(`[IconService] Failed to load provider ${i.name}`,n),[]}}),t=(await Promise.all(o)).flat();if(t.length===0)t=this.getFallbackIcons();return this.icons=t,this.loaded=!0,this.loading=!1,this.icons}catch(o){return console.error("[IconService] Global failure loading icons:",o),this.loading=!1,this.icons=this.getFallbackIcons(),this.loaded=!0,this.icons}}getFallbackIcons(){return["github","gitlab","docker","proxmox","truenas","plex","jellyfin","nextcloud","cloudflare","nginx","traefik"].map((r)=>({name:r,url:`${this.BASE_URL}/webp/${r}.webp`,provider:"homarr-labs/dashboard-icons",format:"webp"}))}searchIcons(o,r=12){let i=(o.trim()?this.icons.filter((e)=>e.name.toLowerCase().includes(o.toLowerCase().trim())):this.icons).reduce((e,s)=>{if(!e[s.provider])e[s.provider]=[];return e[s.provider].push(s),e},{}),n=[];for(let e of Object.values(i))n.push(...e.slice(0,r));return n}getIconUrl(o){return`${this.BASE_URL}/webp/${o}.webp`}}var io=new Jr;var Rr=`:host {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}

.icon-picker {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: 12px;
}

.icon-picker__header {
    display: flex;
    flex-direction: column;
}


.icon-picker__search {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    /* Grow to fill space */
}

.icon-picker__search-container {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    transition: all 0.2s;
    height: 42px;
    box-sizing: border-box;
}

.icon-picker__search-container:focus-within {
    border-color: var(--input-focus-border);
    box-shadow: var(--input-focus-shadow);
}

.icon-picker__search-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 100%;
}

.icon-picker__search-preview img {
    width: 20px;
    height: 20px;
    object-fit: contain;
}

.icon-picker__search-input {
    flex: 1;
    box-sizing: border-box;
    background: transparent;
    border: none;
    padding: 0 12px 0 0;
    /* Use height + line-height for perfect vertical centering */
    color: var(--text-main);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 42px;
    transition: border-color 0.2s;
    height: 42px;
}

.icon-picker__search-input:focus {
    outline: none;
    border-color: var(--accent);
}

.icon-picker__upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    box-sizing: border-box;
    padding: 0;
}

.icon-picker__upload-btn:hover {
    border-color: var(--accent);
    color: var(--text-main);
}

.icon-picker__grid {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin: 0;
    box-sizing: border-box;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
}

.icon-picker__group {
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: transparent;
    overflow: hidden;
}

.icon-picker__group-header {
    background: rgba(255, 255, 255, 0.02);
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-dim);
    border-bottom: 1px solid var(--border);
    margin-bottom: 0;
}

.icon-picker__group-grid {
    display: grid;
    /* Forces exactly 12 columns instead of auto-fill, preventing overflow wrap */
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 8px;
    padding: 8px;
}


.icon-picker__item {
    position: relative;
    aspect-ratio: 1;
    padding: 6px;
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

.icon-picker__badge {
    position: absolute;
    top: -4px;
    right: -4px;
    font-size: 7px;
    font-weight: 700;
    padding: 1px 3px;
    border-radius: 3px;
    color: #fff;
    z-index: 2;
}

.badge-svg {
    background-color: #ef4444;
    /* red */
}

.badge-webp {
    background-color: #64748b;
    /* slate/grey */
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
    will-change: opacity;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 0.5;
    }

    50% {
        opacity: 1;
    }
}`;class Zr extends HTMLElement{icons=[];filteredIcons=[];selectedIcon="";searchQuery="";isLoading=!0;debounceTimer=null;inputElement=null;previewElement=null;uploadBtn=null;fileInput=null;customUrl=null;constructor(){super();this.attachShadow({mode:"open"})}async connectedCallback(){if(this.shadowRoot.childElementCount>0)return;if(this.renderBase(),this.setupListeners(),this.icons.length===0)await this.loadIcons()}async loadIcons(){try{this.icons=await io.loadIcons(),this.filteredIcons=io.searchIcons("",12),this.isLoading=!1,this.updateGrid()}catch(o){console.error("[IconPicker] Failed to load icons",o),this.isLoading=!1,this.updateGrid()}}setupListeners(){let o=this.shadowRoot;this.inputElement=o.getElementById("icon-search"),this.previewElement=o.getElementById("icon-preview"),this.uploadBtn=o.getElementById("icon-upload-btn"),this.fileInput=o.getElementById("icon-upload-input"),this.inputElement?.addEventListener("input",(t)=>{let i=t.target;if(this.searchQuery=i.value,this.searchQuery.startsWith("http://")||this.searchQuery.startsWith("https://")||this.searchQuery.startsWith("data:image/")){if(this.customUrl=this.searchQuery,this.previewElement)this.previewElement.innerHTML=`<img src="${this.customUrl}" alt="preview" />`;this.filteredIcons=[],this.updateGrid()}else{if(this.customUrl=null,this.previewElement)this.previewElement.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dim);"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';if(this.debounceTimer)window.clearTimeout(this.debounceTimer);this.debounceTimer=window.setTimeout(()=>{this.performSearch()},100)}}),this.uploadBtn?.addEventListener("click",()=>{this.fileInput?.click()}),this.fileInput?.addEventListener("change",(t)=>{let i=t.target;if(i.files&&i.files.length>0){let n=i.files[0],e=new FileReader;e.onload=(s)=>{if(s.target&&typeof s.target.result==="string"){let p=s.target.result;this.selectedIcon=p,this.dispatchEvent(new CustomEvent("icon-selected",{detail:{iconName:p},bubbles:!0,composed:!0}))}},e.readAsDataURL(n)}}),o.getElementById("grid-container")?.addEventListener("click",(t)=>{let n=t.target.closest(".icon-picker__item");if(n&&n.dataset.icon)this.selectedIcon=n.dataset.icon,this.updateGrid(),this.dispatchEvent(new CustomEvent("icon-selected",{detail:{iconName:this.selectedIcon},bubbles:!0,composed:!0}));else if(n&&n.dataset.iconurl)this.selectedIcon=n.dataset.iconurl,this.updateGrid(),this.dispatchEvent(new CustomEvent("icon-selected",{detail:{iconName:n.dataset.iconurl},bubbles:!0,composed:!0}))})}performSearch(){this.filteredIcons=io.searchIcons(this.searchQuery,12),this.updateGrid()}getSelectedIcon(){return this.selectedIcon}setSelectedIcon(o){this.selectedIcon=o,this.updateGrid()}renderBase(){this.shadowRoot.innerHTML=`
            <style>${Rr}</style>
            ${Qr()}
        `}updateGrid(){let o=this.shadowRoot.getElementById("grid-container");if(o){if(o.style.display="block",!this.searchQuery.trim()&&!this.isLoading){o.innerHTML=`<div class="icon-picker__empty">${a.t("general.search_icons")}</div>`;return}if(this.customUrl){o.innerHTML=`
                    <div class="icon-picker__group">
                        <div class="icon-picker__group-header">${a.t("general.custom_url")}</div>
                        <div class="icon-picker__group-grid" style="grid-template-columns: repeat(4, 1fr);">
                            <div class="icon-picker__item" style="grid-column: span 4; display: flex; gap: 12px; padding: 12px;" data-icon="${this.customUrl}">
                                <img src="${this.customUrl}" alt="Custom Icon" style="width: 32px; height: 32px;" />
                                <span style="font-size: 13px; color: var(--text-main); word-break: break-all;">${a.t("general.click_to_use_url")}</span>
                            </div>
                        </div>
                    </div>
                `;return}o.innerHTML=Gr(this.filteredIcons,this.selectedIcon,this.isLoading)}}disconnectedCallback(){if(this.debounceTimer)window.clearTimeout(this.debounceTimer)}}if(!customElements.get("icon-picker"))customElements.define("icon-picker",Zr);f();var Br=["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#64748b","#f8fafc","#1e293b","#333333"],Ft=(o)=>{if(!o)return'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';return`<img src="${o.startsWith("http")||o.startsWith("/")||o.startsWith("data:")?o:`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/${o}.webp`}" alt="icon" style="width: 36px; height: 36px; object-fit: contain;">`},Mt=(o,r)=>{let t=!Br.includes(o)&&o!=="";return`
    <div class="form-group" style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 0;">
        <label>${a.t("bookmark.border_color")||"Border Color"}</label>
        <div class="premium-color-grid">
            ${Br.map((i)=>`
                <div class="premium-color-swatch ${o===i?"active":""}" 
                     style="background-color: ${i}"
                     data-color="${i}">
                     ${o===i?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>':""}
                </div>
            `).join("")}
            
             <div class="premium-color-swatch premium-color-swatch--custom ${t?"active":""}" 
                 style="background-color: ${t?o:"transparent"}">
                 <svg viewBox="0 0 24 24" style="z-index: 5; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                 </svg>
                 <app-color-picker class="premium-swatch-picker" id="bookmark-borderColor" trigger-opacity="0" value="${t?o:"#0078D4"}"></app-color-picker>
            </div>
        </div>
    </div>

    <div class="form-group">
        <label>${a.t("bookmark.border_width")||"Border Width"}</label>
        <div class="segmented-control">
            <button type="button" class="border-width-btn ${r===1?"active":""}" data-width="1">
                <div style="height: 1px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                <span>${a.t("general.thin")||"Thin"}</span>
            </button>
            <button type="button" class="border-width-btn ${r===2?"active":""}" data-width="2">
                <div style="height: 2px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                <span>${a.t("general.regular")||"Regular"}</span>
            </button>
            <button type="button" class="border-width-btn ${r===3?"active":""}" data-width="3">
                <div style="height: 3px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                <span>${a.t("general.thick")||"Thick"}</span>
            </button>
        </div>
    </div>
    `},Kr=({isOpen:o,isEditMode:r,title:t,url:i,protocol:n,selectedIcon:e,color:s,statusPosition:p,checkStatus:d,labelPosition:c,visibleTouch:l,borderWidth:x})=>`
    <dialog id="modal">
        <div class="modal-header">
            <div class="integrated-tabs">
                <button class="tab-btn active" data-tab="general">${a.t("general.general")}</button>
                <button class="tab-btn" data-tab="customization">${a.t("general.customization")}</button>
            </div>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        
        <div class="tab-container">
            <form class="modal-form" id="bookmark-form">
                <!-- TAB: GENERAL -->
                <div id="tab-general" class="tab-content active">
                    <div class="form-row" style="display: flex; gap: 12px; align-items: flex-end;">
                        <!-- Icon Box (Independent) -->
                        <div class="form-group" style="width: 52px;">
                            <button type="button" class="independent-icon-btn" id="icon-trigger-btn" title="${a.t("bookmark.icon")}">
                                ${Ft(e)}
                            </button>
                        </div>

                        <!-- Title Field -->
                        <div class="form-group" style="flex: 1;">
                            <label for="bookmark-label">${a.t("bookmark.label")}</label>
                            <div class="input-group">
                                <!-- Label Position Dropdown -->
                                <div class="icon-dropdown">
                                    <button type="button" class="icon-dropdown-btn" id="label-pos-btn" title="${a.t("bookmark.label_position")}" style="position: relative;">
                                        ${c==="top"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 8 h8" /><path d="M12 13 v2" /></svg>':c==="section"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M7 4 h10" stroke-width="4" /></svg>':c==="off"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 16 h8" /><path d="M12 9 v2" /></svg>'}
                                        <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                                            <path d="M7 10l5 5 5-5z" />
                                        </svg>
                                    </button>
                                    <input type="hidden" name="labelPos" id="bookmark-labelPos" value="${c}">
                                </div>
                                <input type="text" id="bookmark-label" name="label" placeholder="${a.t("bookmark.placeholder_label")}" value="${t}" required />
                            </div>
                        </div>
                    </div>

                    <!-- URL Field -->
                    <div class="form-group" style="margin-top: 12px;">
                        <label for="bookmark-url">${a.t("bookmark.url")}</label>
                        <div class="input-group">
                            <!-- Status Monitor Dropdown -->
                            <div class="icon-dropdown">
                                <button type="button" class="icon-dropdown-btn" id="status-pos-btn" title="${a.t("bookmark.status_position")}" style="position: relative;">
                                    ${d?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" />
                                         ${p.includes("top")?'<circle cx="16" cy="8" r="2" fill="currentColor"/>':'<circle cx="16" cy="16" r="2" fill="currentColor"/>'}
                                         </svg>`:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /></svg>'}
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                                        <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                </button>
                                <input type="hidden" name="statusPos" id="bookmark-statusPos" value="${d?p:"off"}">
                            </div>

                            <!-- Protocol Dropdown -->
                            <div class="icon-dropdown protocol-dropdown">
                                <button type="button" class="icon-dropdown-btn" id="protocol-btn" title="${a.t("bookmark.protocol")}" style="position: relative; justify-content: space-between; padding: 0 8px;">
                                    <span id="protocol-text" style="font-size: 13px; font-weight: 500;">${n}</span>
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="opacity: 0.7;">
                                        <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                </button>
                                <input type="hidden" name="protocol" id="bookmark-protocol" value="${n}">
                            </div>

                            <input type="text" id="bookmark-url" name="url" placeholder="google.com" value="${i}" required />
                        </div>
                    </div>
                    
                    <!-- Touch Visibility -->
                    <div class="form-group" style="margin-top: 12px;">
                        <div class="input-group">
                            <div class="icon-dropdown">
                                <button type="button" class="icon-dropdown-btn" id="touch-pos-btn" style="position: relative;">
                                    ${l?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /><path d="M5 5l14 14" opacity="0.7" /></svg>'}
                                    <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                                        <path d="M7 10l5 5 5-5z" />
                                    </svg>
                                </button>
                                <input type="hidden" name="visibleTouch" id="bookmark-visibleTouch" value="${l?"on":"off"}">
                            </div>
                            <div class="fake-input" style="flex: 1; padding: 0 14px;">
                                ${a.t("bookmark.visible_touch")}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TAB: CUSTOMIZATION -->
                <div id="tab-customization" class="tab-content">
                    <!-- Appearance Controls -->
                    ${Mt(s,x)}
                </div>

                <div class="actions">
                    <app-button variant="primary" type="submit">${a.t("general.save")}</app-button>
                </div>
            </form>
        </div>
        
        <icon-selection-modal id="icon-modal-component"></icon-selection-modal>

        <!-- Dropdown Menu Overlay -->
        <div id="menu-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;">
            <!-- Label Position Menu -->
            <div class="dropdown-menu" id="label-pos-menu">
                <div class="dropdown-item ${c==="bottom"?"selected":""}" data-pos="bottom" title="${a.t("bookmark.label_bottom")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 16 h8" /><path d="M12 9 v2" /></svg>
                </div>
                <div class="dropdown-item ${c==="top"?"selected":""}" data-pos="top" title="${a.t("bookmark.label_top")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="16" height="14" rx="2" stroke-opacity="0.5" /><path d="M8 8 h8" /><path d="M12 13 v2" /></svg>
                </div>
                <div class="dropdown-item ${c==="section"?"selected":""}" data-pos="section" title="${a.t("bookmark.label_section")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M7 4 h10" stroke-width="4" /></svg>
                </div>
                <div class="dropdown-item ${c==="off"?"selected":""}" data-pos="off" title="${a.t("bookmark.label_hidden")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>
                </div>
            </div>

            <!-- Status Position Menu -->
            <div class="dropdown-menu" id="status-pos-menu">
                <div class="dropdown-item ${!d?"selected":""}" data-status-pos="off" title="${a.t("bookmark.status_off")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /></svg>
                </div>
                <div class="dropdown-item ${d&&p==="top-left"?"selected":""}" data-status-pos="top-left" title="${a.t("bookmark.pos_top_left")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
                </div>
                <div class="dropdown-item ${d&&p==="top-right"?"selected":""}" data-status-pos="top-right" title="${a.t("bookmark.pos_top_right")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="16" cy="8" r="2" fill="currentColor"/></svg>
                </div>
                <div class="dropdown-item ${d&&p==="bottom-left"?"selected":""}" data-status-pos="bottom-left" title="${a.t("bookmark.pos_bottom_left")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="8" cy="16" r="2" fill="currentColor"/></svg>
                </div>
                <div class="dropdown-item ${d&&p==="bottom-right"?"selected":""}" data-status-pos="bottom-right" title="${a.t("bookmark.pos_bottom_right")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="16" cy="16" r="2" fill="currentColor"/></svg>
                </div>
            </div>

            <!-- Protocol Menu -->
            <div class="dropdown-menu" id="protocol-menu" style="width: 85px;">
                <div class="dropdown-item ${n==="http://"?"selected":""}" data-protocol="http://" title="${a.t("bookmark.protocol")} HTTP">
                    <span style="font-size: 13px;">http://</span>
                </div>
                <div class="dropdown-item ${n==="https://"?"selected":""}" data-protocol="https://" title="${a.t("bookmark.protocol")} HTTPS">
                    <span style="font-size: 13px;">https://</span>
                </div>
            </div>

            <!-- Touch Visibility Menu -->
            <div class="dropdown-menu" id="touch-pos-menu">
                <div class="dropdown-item ${l?"selected":""}" data-touch="on" title="${a.t("bookmark.visible")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /></svg>
                </div>
                <div class="dropdown-item ${!l?"selected":""}" data-touch="off" title="${a.t("bookmark.hidden")}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /><path d="M5 5l14 14" opacity="0.7" /></svg>
                </div>
            </div>


        </div>
    </dialog>
`;j();f();f();var Yr=()=>`
<dialog id="icon-modal">
    <div class="modal-header">
        <h3 class="modal-title">${a.t("general.select_icon")}</h3>
        <button class="modal-close" id="close-btn" aria-label="${a.t("general.close")}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    </div>
    <div class="modal-body">
        <icon-picker id="icon-picker-component"></icon-picker>
    </div>
</dialog>
`;var Xr=`:host {
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
    max-width: 720px;
    height: 460px;
    /* Fixed boundaries tuned for 3 providers */
    margin: auto;
    display: none;
    flex-direction: column;
    box-shadow: var(--paper-shadow);
    overflow: hidden;
    color: var(--text-main);
}

dialog[open] {
    display: flex;
    animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

dialog::backdrop {
    background: var(--overlay-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
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
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 24px;
    background: transparent;
    height: 56px;
    border-radius: var(--radius) var(--radius) 0 0;
    flex-shrink: 0;
}

.modal-title {
    font-size: 16px;
    font-weight: 600;
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

.modal-body {
    padding: 24px;
    background: transparent;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}

icon-picker {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
}`;class Or extends HTMLElement{dialog=null;resolvePromise=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.setupHandlers()}render(){this.shadowRoot.innerHTML=`
            <style>${Xr}</style>
            ${Yr()}
        `,this.dialog=this.shadowRoot.getElementById("icon-modal")}setupHandlers(){this.shadowRoot.getElementById("close-btn")?.addEventListener("click",()=>this.close(null)),this.shadowRoot.addEventListener("icon-selected",(r)=>{let t=r;this.close(t.detail.iconName)})}async open(){if(!this.dialog)return null;this.dialog.showModal();let o=this.shadowRoot.querySelector("icon-picker");return new Promise((r)=>{this.resolvePromise=r})}close(o){if(this.dialog&&this.dialog.open)this.dialog.close();if(this.resolvePromise)this.resolvePromise(o),this.resolvePromise=null}}if(!customElements.get("icon-selection-modal"))customElements.define("icon-selection-modal",Or);var Ur=`:host {
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
    display: none;
    flex-direction: column;
}

dialog[open] {
    display: flex;
    /* Visible when open */
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

/* --- Header --- */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 24px;
    background: transparent;
    height: 56px;
    border-radius: var(--radius) var(--radius) 0 0;
    flex-shrink: 0;
}

.modal-title {
    display: none;
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

/* --- Main Layout --- */
.tab-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
}

.modal-form {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.tab-content {
    flex: 1;
    overflow-y: auto;
    display: none;
    animation: fadeIn 0.15s ease-out;
    padding: 24px;
}

.tab-content.active {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.tab-content::-webkit-scrollbar {
    width: 4px;
}

.tab-content::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 4px;
}

/* --- Sticky Footer --- */
.actions {
    padding: 16px 24px 24px 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

/* --- COMPONENT STYLES (Restored) --- */

/* Form Groups */
.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
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
    padding: 10px 14px;
    color: var(--input-text);
    font-family: var(--font-sans);
    font-size: 14px;
    transition: all 0.2s;
    outline: none;
    height: 42px;
    box-sizing: border-box;
    width: 100%;
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
    min-height: 80px;
    height: auto;
}

/* Tabs */
.integrated-tabs {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 0 8px;
    height: 100%;
}

.tab-btn {
    position: relative;
    background: transparent;
    border: none;
    padding: 12px 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s;
    opacity: 0.7;
    letter-spacing: 0.02em;
}

.tab-btn:hover {
    color: var(--text-main);
    opacity: 1;
}

.tab-btn.active {
    color: var(--accent);
    font-weight: 600;
    opacity: 1;
}

.tab-btn.active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--accent);
    box-shadow: 0 -2px 10px rgba(var(--accent-rgb), 0.5);
    border-radius: 2px 2px 0 0;
    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
    from {
        transform: scaleX(0);
        opacity: 0;
    }

    to {
        transform: scaleX(1);
        opacity: 1;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(2px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Input Group & Dropdowns */
.input-group {
    display: flex;
    gap: 0;
    width: 100%;
}

/* Generic Icon Dropdown Wrapper */
.icon-dropdown {
    position: relative;
    width: 42px;
    /* Default width for icons */
    flex-shrink: 0;
    z-index: 1;
    /* Base z-index */
}

.icon-dropdown.protocol-dropdown {
    width: 85px;
    /* Wider for protocol text */
}

/* Base Styles for Inputs and Buttons */
.icon-dropdown-btn,
.input-group input,
.icon-dropdown .fake-input,
.input-group .fake-input {
    height: 46px;
    box-sizing: border-box;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--text-dim);
    transition: all 0.2s;
    width: 100%;
    margin: 0;
}

.icon-dropdown-btn,
.icon-dropdown .fake-input,
.input-group .fake-input {
    display: flex;
    align-items: center;
}

.input-group .fake-input {
    padding: 0 14px;
    font-size: 14px;
}

.icon-dropdown-btn {
    justify-content: center;
    cursor: pointer;
    padding: 0;
}

.input-group input {
    color: var(--input-text);
    padding: 12px 14px;
    line-height: 1.4;
    flex: 1;
    min-width: 0;
    z-index: 1;
    overflow: visible;
}

/* --- Chaining Logic (Seamless Integration) --- */

/* 1. Base State: All items in group are flex items */
/* 1. Base State: All items in group are flex items */
.input-group>*,
.input-group>input {
    margin: 0;
    border-radius: 0;
    /* Reset radius by default */
}

/* 2. Radius Logic: Only corners of the group get radius */
.input-group>*:first-child,
.input-group>*:first-child .icon-dropdown-btn,
.input-group>*:first-child input,
.input-group>*:first-child .fake-input,
.input-group>input:first-child {
    border-top-left-radius: var(--radius);
    border-bottom-left-radius: var(--radius);
}

.input-group>*:last-child,
.input-group>*:last-child .icon-dropdown-btn,
.input-group>*:last-child input,
.input-group>*:last-child .fake-input,
.input-group>input:last-child {
    border-top-right-radius: var(--radius);
    border-bottom-right-radius: var(--radius);
}

/* 3. Border Logic: Merge borders by removing right border of all but last item */
.input-group>*:not(:last-child),
.input-group>*:not(:last-child) .icon-dropdown-btn,
.input-group>*:not(:last-child) input,
.input-group>*:not(:last-child) .fake-input,
.input-group>input:not(:last-child) {
    border-right: none;
}

/* 4. Fix for nested elements (like dropdown buttons inside divs) */
.input-group>.icon-dropdown {
    background: transparent;
    border: none;
}

.input-group>.icon-dropdown>.icon-dropdown-btn {
    border: 1px solid var(--input-border);
    /* Restore full border first */
    width: 100%;
}

.input-group>.icon-dropdown:not(:last-child)>.icon-dropdown-btn {
    border-right: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.input-group>.icon-dropdown:not(:first-child)>.icon-dropdown-btn {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

/* 5. Hover/Focus Z-Index Management */
.input-group>*:hover,
.input-group>*:focus-within {
    z-index: 5;
}

.icon-dropdown-btn svg {
    width: 20px;
    height: 20px;
    opacity: 0.8;
}

/* Dropdown Menu */
.dropdown-menu {
    position: absolute;
    /* top and left will be set via JS relative to render overlay */
    background: var(--surface-solid);
    /* Revert to solid surface for readability per user request */
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    display: none;
    flex-direction: column;
    z-index: 9999;
    /* Ensure it's on top of everything */
    min-width: 50px;
    padding: 4px;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    pointer-events: auto;
    /* Re-enable pointer events since parent has none */
}

.dropdown-menu.show {
    display: flex;
    animation: fadeIn 0.1s ease-out;
}

.dropdown-item {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    cursor: pointer;
    border-radius: var(--radius);
    color: var(--text-dim);
    transition: all 0.2s;
}

.dropdown-item:hover {
    background: var(--surface-hover);
    color: var(--text-main);
}

.dropdown-item.selected {
    background: rgba(var(--accent-rgb), 0.1);
    color: var(--accent);
}

.dropdown-item svg {
    width: 20px;
    height: 20px;
}

/* --- Independent Icon Button --- */
.independent-icon-btn {
    width: 52px;
    height: 52px;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-dim);
    padding: 0;
    transition: all 0.2s;
    flex-shrink: 0;
}

.independent-icon-btn:hover {
    border-color: var(--accent);
    color: var(--text-main);
}

.independent-icon-btn img {
    border-radius: 4px;
}

/* --- Buttons (Local definition for Shadow DOM) --- */
.btn {
    height: 38px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    outline: none;
    box-sizing: border-box;
    padding: 0 24px;
    border: none;
}

.btn-primary {
    background: transparent;
    color: var(--accent);
    border: 2px solid var(--accent);
}

.btn-primary:hover {
    background: rgba(var(--accent-rgb), 0.1);
}

.btn:active {
    transform: translateY(1px);
}

/* --- Color Picker Styles --- */
.color-menu {
    border-radius: var(--radius);
    overflow: visible;
}

.color-preset {
    position: relative;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-preset:hover {
    transform: scale(1.15);
    z-index: 2;
    border-color: var(--accent) !important;
}

.color-preset.selected::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    pointer-events: none;
}

/* Force dark check for light presets */
.color-preset.selected[data-color="#f8fafc"]::after {
    color: #333;
    text-shadow: none;
}

.custom-color-item:hover {
    color: var(--accent);
    background: rgba(var(--accent-rgb), 0.1);
}

/* Premium Color Grid */
.premium-color-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding: 4px;
}

.premium-color-swatch {
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

.premium-color-swatch:hover {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.2);
    z-index: 2;
}

.premium-color-swatch.active {
    border-color: #fff;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
}

.premium-color-swatch svg {
    width: 18px;
    height: 18px;
    fill: #fff;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.premium-color-swatch--custom {
    background: conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red);
    overflow: visible;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.premium-color-swatch--custom.active {
    opacity: 1;
    background-image: none;
    border-color: #fff;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
}

.premium-swatch-picker {
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

/* --- Segmented Control (Border Width) --- */
.segmented-control {
    display: flex;
    background: var(--segmented-bg);
    padding: 4px;
    border-radius: 8px;
    margin-top: 8px;
    gap: 4px;
    border: 1px solid var(--border);
}

.border-width-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s ease;
}

.border-width-btn:hover {
    background: var(--surface-hover);
    color: var(--text-main);
}

.border-width-btn.active {
    background: var(--surface-active);
    color: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.1);
}

.border-width-btn span {
    font-size: 11px;
    font-weight: 500;
}

/* Rainbow swatch correction */
.premium-color-swatch--custom {
    background: conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red);
    overflow: visible;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Ensure hidden input covers the whole area for clicking */
.premium-swatch-picker {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
    z-index: 10;
    /* Ensure it's on top */
}`;var Jt=["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#64748b","#f8fafc","#1e293b","#333333"];class Nr extends HTMLElement{dialog=null;isEditMode=!1;currentItemId=null;bookmarkTitle="";url="";protocol="http://";selectedIconName=null;color="#333333";statusPosition="top-right";checkStatus=!1;labelPosition="bottom";visibleTouch=!0;borderWidth=1;_unsubscribeI18n;clickHandler=null;submitHandler=null;escapeHandler=null;inputHandler=null;constructor(){super();this.attachShadow({mode:"open"}),this.setupHandlers()}setupHandlers(){this.clickHandler=async(o)=>{let r=o.target;if(r.closest("#modal-close")){o.preventDefault(),this.close();return}if(r.classList.contains("tab-btn")){o.preventDefault();let e=r.dataset.tab;this.switchTab(e)}if(r.closest("#icon-trigger-btn")){o.preventDefault();let e=this.shadowRoot.getElementById("icon-modal-component");if(e){let s=await e.open();if(s)this.selectedIconName=s,this.updateIconPreview()}}if(r.closest("#label-pos-btn"))o.preventDefault(),o.stopPropagation(),this.toggleDropdown("label-pos-menu",r.closest("#label-pos-btn"));else if(r.closest("#status-pos-btn"))o.preventDefault(),o.stopPropagation(),this.toggleDropdown("status-pos-menu",r.closest("#status-pos-btn"));else if(r.closest("#touch-pos-btn"))o.preventDefault(),o.stopPropagation(),this.toggleDropdown("touch-pos-menu",r.closest("#touch-pos-btn"));else if(r.closest("#protocol-btn"))o.preventDefault(),o.stopPropagation(),this.toggleDropdown("protocol-menu",r.closest("#protocol-btn"));else this.closeAllDropdowns();let t=r.closest(".premium-color-swatch");if(t&&!t.classList.contains("premium-color-swatch--custom")){o.preventDefault(),this.color=t.dataset.color,this.updateTriggers();return}let i=r.closest(".border-width-btn");if(i){o.preventDefault(),this.borderWidth=parseInt(i.dataset.width),this.updateTriggers();return}let n=r.closest(".dropdown-item");if(n){o.preventDefault(),o.stopPropagation();let e=n;if(e.dataset.pos)this.labelPosition=e.dataset.pos,this.updateTriggers();if(e.dataset.statusPos){let s=e.dataset.statusPos;if(s==="off")this.checkStatus=!1;else this.checkStatus=!0,this.statusPosition=s;this.updateTriggers()}if(e.dataset.touch)this.visibleTouch=e.dataset.touch==="on",this.updateTriggers();if(e.dataset.protocol)this.protocol=e.dataset.protocol,this.updateTriggers()}},this.inputHandler=(o)=>{let r=o.target;if(r.id==="bookmark-label")this.bookmarkTitle=r.value;if(r.id==="bookmark-url")this.url=r.value;if(r.id==="bookmark-borderColor")this.color=r.value,this.updateTriggers()},this.submitHandler=async(o)=>{o.preventDefault();let r=this.selectedIconName&&(this.selectedIconName.startsWith("http")||this.selectedIconName.startsWith("/")||this.selectedIconName.startsWith("data:")),t=this.selectedIconName?r?this.selectedIconName:`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/${this.selectedIconName}.webp`:"",i=JSON.stringify({label:this.bookmarkTitle,url:this.protocol+this.url.replace(/^https?:\/\//,""),description:"",icon:t,iconName:this.selectedIconName,statusCheck:this.checkStatus,statusPos:this.checkStatus?this.statusPosition:"off",visibleTouch:this.visibleTouch,openInNewTab:!0,labelPos:this.labelPosition,borderColor:this.color,borderWidth:this.borderWidth});try{if(this.isEditMode&&this.currentItemId){if(await g.updateItem({id:this.currentItemId,content:i}),window.notifier)window.notifier.show(a.t("notifier.bookmark_updated"))}else{let{collisionService:n}=await Promise.resolve().then(() => (U(),T)),e=g.getState(),s=Array.isArray(e.items)?e.items:[],p=n.findFirstAvailableSlot(1,1,s);if(await g.addItem({type:"bookmark",x:p.x,y:p.y,w:1,h:1,content:i}),window.notifier)window.notifier.show(a.t("notifier.bookmark_added"))}this.close()}catch(n){if(console.error("[Modal] Error:",n),window.notifier)window.notifier.show(a.t("notifier.bookmark_error"),"error")}},this.escapeHandler=(o)=>{if(o.key==="Escape"){let r=this.shadowRoot.querySelector("icon-selection-modal");if(this.dialog?.open)this.close()}}}updateTriggers(){let o=this.shadowRoot,r=o.getElementById("label-pos-btn");if(r){r.innerHTML=`
                ${this.labelPosition==="top"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 8 h8" /><path d="M12 13 v2" /></svg>':this.labelPosition==="section"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M7 4 h10" stroke-width="4" /></svg>':this.labelPosition==="off"?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /><path d="M8 16 h8" /><path d="M12 9 v2" /></svg>'}
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            `;let e=o.getElementById("bookmark-labelPos");if(e)e.value=this.labelPosition;o.querySelectorAll("#label-pos-menu .dropdown-item").forEach((s)=>{s.classList.toggle("selected",s.dataset.pos===this.labelPosition)})}let t=o.getElementById("status-pos-btn");if(t){t.innerHTML=`
                ${this.checkStatus?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" />
                        <circle cx="${this.statusPosition.includes("left")?"8":"16"}" cy="${this.statusPosition.includes("top")?"8":"16"}" r="2" fill="currentColor"/>
                    </svg>`:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" stroke-opacity="0.5" /></svg>'}
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            `;let e=o.getElementById("bookmark-statusPos");if(e)e.value=this.checkStatus?this.statusPosition:"off";o.querySelectorAll("#status-pos-menu .dropdown-item").forEach((s)=>{let p=s.dataset.statusPos,d=p==="off"?!this.checkStatus:this.checkStatus&&p===this.statusPosition;s.classList.toggle("selected",d)})}let i=o.getElementById("protocol-text");if(i){i.textContent=this.protocol;let e=o.getElementById("bookmark-protocol");if(e)e.value=this.protocol;o.querySelectorAll("#protocol-menu .dropdown-item").forEach((s)=>{s.classList.toggle("selected",s.dataset.protocol===this.protocol)})}let n=o.getElementById("touch-pos-btn");if(n){n.innerHTML=`
                ${this.visibleTouch?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2" stroke-opacity="0.5" /><path d="M12 18h.01" stroke-width="3" stroke-linecap="round" /><path d="M5 5l14 14" opacity="0.7" /></svg>'}
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" style="position: absolute; bottom: 1px; right: 1px; opacity: 0.7;">
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            `;let e=o.getElementById("bookmark-visibleTouch");if(e)e.value=this.visibleTouch?"on":"off";o.querySelectorAll("#touch-pos-menu .dropdown-item").forEach((s)=>{let p=s.dataset.touch;s.classList.toggle("selected",p==="on"&&this.visibleTouch||p==="off"&&!this.visibleTouch)})}o.querySelectorAll(".border-width-btn").forEach((e)=>{let s=parseInt(e.dataset.width);e.classList.toggle("active",s===this.borderWidth)}),o.querySelectorAll(".premium-color-swatch").forEach((e)=>{let s=e,p=s.dataset.color;if(p)if(p===this.color){if(s.classList.add("active"),!s.querySelector("svg"))s.innerHTML+='<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>'}else{s.classList.remove("active");let d=s.querySelector("svg");if(d)d.remove()}else if(s.classList.contains("premium-color-swatch--custom")){let d=!Jt.includes(this.color)&&this.color!=="";s.classList.toggle("active",d);let c=s.querySelector("svg");if(c)c.style.fill=d?"#fff":"rgba(255,255,255,0.4)";let l=o.getElementById("bookmark-borderColor");if(l&&d)l.value=this.color;if(d)s.style.backgroundColor=this.color;else s.style.backgroundColor="#333"}})}updateIconPreview(){let r=this.shadowRoot.getElementById("icon-trigger-btn");if(r)if(this.selectedIconName){let t=this.selectedIconName.startsWith("http")||this.selectedIconName.startsWith("/")||this.selectedIconName.startsWith("data:"),i="";if(t)i=this.selectedIconName;else i=`https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/${this.selectedIconName}.webp`;r.innerHTML=`<img src="${i}" alt="icon" style="width: 24px; height: 24px; object-fit: contain;">`}else r.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'}toggleDropdown(o,r){this.closeAllDropdowns(o);let t=this.shadowRoot.getElementById(o);if(!t)return;if(t.classList.toggle("show"))requestAnimationFrame(()=>{let n=this.dialog.getBoundingClientRect(),e=r.getBoundingClientRect(),s=e.left-n.left,p=e.bottom-n.top+4;t.style.left=`${s}px`,t.style.top=`${p}px`,t.style.minWidth=`${e.width}px`})}closeAllDropdowns(o=null){["label-pos-menu","status-pos-menu","touch-pos-menu","protocol-menu","color-menu"].forEach((t)=>{if(t!==o)this.shadowRoot.getElementById(t)?.classList.remove("show")})}switchTab(o){let r=this.shadowRoot;r.querySelectorAll(".tab-btn").forEach((t)=>{t.classList.toggle("active",t.dataset.tab===o)}),r.querySelectorAll(".tab-content").forEach((t)=>{t.classList.toggle("active",t.id===`tab-${o}`)})}connectedCallback(){this.render(),this._unsubscribeI18n=a.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n();let o=this.shadowRoot;if(this.clickHandler)o.removeEventListener("click",this.clickHandler);if(this.submitHandler)o.removeEventListener("submit",this.submitHandler);if(this.inputHandler)o.removeEventListener("input",this.inputHandler);if(this.escapeHandler)document.removeEventListener("keydown",this.escapeHandler)}render(){let o=this.dialog?.open;this.shadowRoot.innerHTML=`
            <style>${Ur}</style>
            ${Kr({isOpen:!0,isEditMode:this.isEditMode,title:this.bookmarkTitle,url:this.url,protocol:this.protocol,selectedIcon:this.selectedIconName,color:this.color,statusPosition:this.statusPosition,checkStatus:this.checkStatus,labelPosition:this.labelPosition,visibleTouch:this.visibleTouch,borderWidth:this.borderWidth})}
        `,this.dialog=this.shadowRoot.getElementById("modal");let r=this.shadowRoot;if(r.addEventListener("click",this.clickHandler),r.addEventListener("submit",this.submitHandler),r.addEventListener("input",this.inputHandler),o)this.dialog?.showModal()}open(){this.resetState(),this.isEditMode=!1,this.render(),this.dialog?.showModal()}openForEdit(o){this.isEditMode=!0,this.currentItemId=o.id;let r=o.content;if(typeof r==="string")try{r=JSON.parse(r)}catch(i){console.error(i)}this.bookmarkTitle=r.label||"",this.selectedIconName=r.iconName||"",this.color=r.borderColor||"#333333",this.labelPosition=r.labelPos||"bottom",this.visibleTouch=r.visibleTouch!==!1,this.borderWidth=r.borderWidth||1;let t=r.url||"";if(t.startsWith("https://"))this.protocol="https://",this.url=t.substring(8);else if(t.startsWith("http://"))this.protocol="http://",this.url=t.substring(7);else this.protocol="http://",this.url=t;if(r.statusPos&&r.statusPos!=="off")this.checkStatus=!0,this.statusPosition=r.statusPos;else this.checkStatus=!1,this.statusPosition="top-right";this.render(),this.dialog?.showModal()}close(){this.dialog?.close(),this.resetState()}resetState(){this.bookmarkTitle="",this.url="",this.protocol="http://",this.selectedIconName=null,this.color="#333333",this.statusPosition="top-right",this.checkStatus=!1,this.labelPosition="bottom",this.visibleTouch=!0,this.borderWidth=1,this.currentItemId=null}}if(!customElements.get("add-bookmark-modal"))customElements.define("add-bookmark-modal",Nr);f();f();var zo=[{id:"clock",get name(){return a.t("widget.clock.name")},icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',get description(){return a.t("widget.clock.description")},defaultW:2,defaultH:1,componentTag:"widget-clock"},{id:"notepad",get name(){return a.t("widget.notepad.name")},icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',get description(){return a.t("widget.notepad.description")},defaultW:2,defaultH:2,componentTag:"widget-notepad"},{id:"telemetry",get name(){return a.t("widget.telemetry.name")},icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><circle cx="6" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="6" cy="17.5" r="1" fill="currentColor" stroke="none"/><line x1="10" y1="6.5" x2="18" y2="6.5"/><line x1="10" y1="17.5" x2="18" y2="17.5"/></svg>',get description(){return a.t("widget.telemetry.description")},defaultW:2,defaultH:1,componentTag:"widget-telemetry"},{id:"weather",get name(){return a.t("widget.weather.name")},icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="4"/><line x1="9" y1="1" x2="9" y2="3"/><line x1="1" y1="9" x2="3" y2="9"/><line x1="3.3" y1="3.3" x2="4.7" y2="4.7"/><line x1="14.7" y1="3.3" x2="13.3" y2="4.7"/><line x1="3.3" y1="14.7" x2="4.7" y2="13.3"/><path d="M10 19 Q10 15 14 15 Q14 11 18 11 Q22 11 22 15 Q24 15 24 18 Q24 21 21 21 L12 21 Q10 21 10 19Z"/></svg>',get description(){return a.t("widget.weather.description")},defaultW:2,defaultH:2,componentTag:"widget-weather"},{id:"markdown",get name(){return a.t("widget.markdown.name")},icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',get description(){return a.t("widget.markdown.description")},defaultW:2,defaultH:2,componentTag:"widget-markdown"}];class Er extends HTMLElement{dialog=null;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}open(){if(this.dialog)this.dialog.showModal()}close(){if(this.dialog)this.dialog.close()}selectWidget(o){this.dispatchEvent(new CustomEvent("widget-selected",{detail:o,bubbles:!0,composed:!0})),this.close()}render(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`
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
                    ${zo.map((o)=>`
                        <div class="card" data-id="${o.id}">
                            <div class="icon-container">${o.icon}</div>
                            <div class="name">${a.t(`widget.${o.id}.name`)||o.name}</div>
                            <div class="desc">${a.t(`widget.${o.id}.description`)||o.description}</div>
                        </div>
                    `).join("")}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog"),this.shadowRoot.querySelectorAll(".card").forEach((o)=>{o.addEventListener("click",()=>{let r=o.getAttribute("data-id"),t=zo.find((i)=>i.id===r);if(t)this.selectWidget(t)})})}}customElements.define("add-widget-modal",Er);j();f();var Vr=`:host {
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
    align-items: flex-end;
    /* Align tabs to bottom */
    margin-bottom: 0;
    border-bottom: 1px solid var(--border);
    padding: 12px 24px 0 24px;
    background: var(--modal-header-bg);
    border-radius: var(--radius) var(--radius) 0 0;
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

.tab-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: visible;
}

.tab-content {
    display: none;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
}

.tab-content.active {
    display: flex;
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
    padding: 0 16px;
    height: 46px;
    border-radius: var(--radius);
    box-sizing: border-box;
    margin-top: 12px;
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
    overflow: visible;
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
}

/* --- Integrated Tabs (Modern Minimalist) --- */
.integrated-tabs {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 0 8px;
    height: 100%;
}

/* Base Tab Button (Text Only) */
.tab-btn {
    position: relative;
    background: transparent;
    border: none;
    padding: 12px 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0.7;
    letter-spacing: 0.02em;
}

/* Hover State */
.tab-btn:hover {
    color: var(--text-main);
    opacity: 1;
}

/* Active State */
.tab-btn.active {
    color: var(--accent);
    font-weight: 600;
    opacity: 1;
}

/* The Glowing Underline */
.tab-btn.active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background: var(--accent);
    box-shadow: 0 -2px 10px rgba(var(--accent-rgb), 0.5);
    border-radius: 2px 2px 0 0;
    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
    from {
        transform: scaleX(0);
        opacity: 0;
    }

    to {
        transform: scaleX(1);
        opacity: 1;
    }
}

/* Content Area - Clean */
.tab-container {
    background: transparent;
    padding: 0;
    border: none;
    border-radius: 0;
}

/* Header Adjustments */
.modal-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 24px;
    background: transparent;
    height: 56px;
    /* Slightly compact */
    align-items: center;
}

/* Remove old styles */
.tab-header {
    display: none;
}

.tab-content {
    display: none;
    animation: fadeContent 0.3s ease;
}

.tab-content.active {
    display: block;
}

@keyframes fadeContent {
    from {
        opacity: 0;
        transform: translateY(5px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* --- Premium Color Picker --- */
.premium-color-grid {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding: 4px;
    margin-top: 8px;
}

.premium-color-swatch {
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

.premium-color-swatch:hover {
    transform: scale(1.1);
    z-index: 2;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.premium-color-swatch.active {
    transform: scale(1.05);
    box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--text-main);
}

.premium-color-swatch svg {
    width: 20px;
    height: 20px;
    fill: #fff;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.premium-color-swatch--custom {
    background: conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red);
    overflow: visible;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.premium-swatch-picker {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}

@keyframes popIn {
    from {
        opacity: 0;
        transform: scale(0.5);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

/* --- Segmented Control --- */
.segmented-control {
    display: flex;
    background: var(--segmented-bg);
    padding: 4px;
    border-radius: 8px;
    margin-top: 8px;
    gap: 4px;
    border: 1px solid var(--border);
}

.border-width-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--text-dim);
    cursor: pointer;
    transition: all 0.2s ease;
}

.border-width-btn:hover {
    background: var(--surface-hover);
    color: var(--text-main);
}

.border-width-btn.active {
    background: var(--surface-active);
    color: var(--accent);
    border-color: var(--accent);
    box-shadow: 0 0 10px rgba(var(--accent-rgb), 0.1);
}

.border-width-btn span {
    font-size: 11px;
    font-weight: 500;
}`;var $o=new Map;async function Tr(o,r){try{let t=await fetch(`https://timeapi.io/api/timezone/coordinate?latitude=${o}&longitude=${r}`);if(!t.ok)throw Error("TimeAPI failed");return(await t.json()).timeZone||"local"}catch(t){return console.error("[Timezone] TimeAPI error:",t),"local"}}async function Zt(o){if(!o||o.trim()==="")return"local";let r=o.toLowerCase().trim();if($o.has(r))return $o.get(r);try{let t=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(o)}&limit=1`,i=await fetch(t,{headers:{"User-Agent":"Lastboard/1.0"}});if(!i.ok)throw Error("Geocoding failed");let n=await i.json();if(n.length===0)return"local";let{lat:e,lon:s}=n[0],p=await Tr(parseFloat(e),parseFloat(s));return $o.set(r,p),p}catch(t){return console.error("[Timezone] Error resolving city:",o,t),"local"}}class Dr extends HTMLElement{dialog=null;currentItem=null;_clockSelectedLat=null;_clockSelectedLon=null;_selectedColor="#333333";_selectedBorderWidth=1;premiumColors=["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#64748b","#f8fafc","#1e293b","#333333"];constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.setupEventListeners()}open(o){this.currentItem=o;let r={};try{r=typeof o.content==="string"?JSON.parse(o.content):o.content}catch(t){console.error("Failed to parse content",t)}if(this._selectedColor=r.borderColor||"#333333",this._selectedBorderWidth=r.borderWidth||1,this.render(),this.setupEventListeners(),this.dialog)this.dialog.showModal(),this.switchTab("general")}close(){if(this.dialog)this.dialog.close();this.currentItem=null}setupEventListeners(){if(!this.shadowRoot)return;if(this.shadowRoot.querySelectorAll(".tab-btn").forEach((r)=>{r.addEventListener("click",(t)=>{t.preventDefault();let i=t.currentTarget.dataset.tab;if(i)this.switchTab(i)})}),this.shadowRoot.getElementById("close-btn")?.addEventListener("click",()=>this.close()),this.shadowRoot.getElementById("save-btn")?.addEventListener("click",()=>this.save()),this.currentItem){let t=(typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content).widgetId;if(t==="clock"){let i=this.shadowRoot.getElementById("clock-search-btn");if(i)i.addEventListener("click",()=>this.searchClockCity())}else if(t==="weather"){let i=this.shadowRoot.getElementById("weather-search-btn");if(i)i.addEventListener("click",()=>this.searchWeatherCity());let n=this.shadowRoot.getElementById("weather-forecast"),e=this.shadowRoot.getElementById("weather-days-row");if(n&&e)n.addEventListener("change",()=>{e.style.display=n.checked?"":"none"});let s=this.shadowRoot.getElementById("weather-days"),p=this.shadowRoot.getElementById("weather-days-dec"),d=this.shadowRoot.getElementById("weather-days-inc");if(s&&p&&d)p.addEventListener("click",()=>{let c=parseInt(s.value)||1;if(c>1)s.value=String(c-1)}),d.addEventListener("click",()=>{let c=parseInt(s.value)||1;if(c<6)s.value=String(c+1)})}}this.shadowRoot.querySelectorAll(".premium-color-swatch").forEach((r)=>{r.addEventListener("click",(t)=>{let i=t.currentTarget;if(i.classList.contains("premium-color-swatch--custom"))return;this._selectedColor=i.dataset.color,this.updateAppearanceUI()})});let o=this.shadowRoot.getElementById("widget-borderColor");if(o)o.addEventListener("input",(r)=>{this._selectedColor=r.target.value,this.updateAppearanceUI()});this.shadowRoot.querySelectorAll(".border-width-btn").forEach((r)=>{r.addEventListener("click",(t)=>{let i=t.currentTarget;this._selectedBorderWidth=parseInt(i.dataset.width),this.updateAppearanceUI()})})}updateAppearanceUI(){if(!this.shadowRoot)return;this.shadowRoot.querySelectorAll(".premium-color-swatch").forEach((o)=>{let r=o,t=r.dataset.color,i=r.classList.contains("premium-color-swatch--custom");if(t)if(t===this._selectedColor){if(r.classList.add("active"),!r.querySelector("svg"))r.innerHTML+='<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>'}else{r.classList.remove("active");let n=r.querySelector("svg");if(n)n.remove()}else if(i){let n=!this.premiumColors.includes(this._selectedColor)&&this._selectedColor!=="";r.classList.toggle("active",n);let e=r.querySelector("svg");if(e)e.style.fill=n?"#fff":"rgba(255,255,255,0.4)";let s=this.shadowRoot?.getElementById("widget-borderColor");if(s&&n)s.value=this._selectedColor;if(n)r.style.backgroundColor=this._selectedColor;else r.style.backgroundColor="#333"}}),this.shadowRoot.querySelectorAll(".border-width-btn").forEach((o)=>{let r=parseInt(o.dataset.width);o.classList.toggle("active",r===this._selectedBorderWidth)})}switchTab(o){if(!this.shadowRoot)return;this.shadowRoot.querySelectorAll(".tab-btn").forEach((r)=>{r.classList.toggle("active",r.dataset.tab===o)}),this.shadowRoot.querySelectorAll(".tab-content").forEach((r)=>{r.classList.toggle("active",r.id===`tab-${o}`)})}async save(){if(!this.currentItem)return;let o=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,r=o.widgetId,t={...o};if(r==="clock"){let i=this.shadowRoot?.getElementById("clock-city"),n=this.shadowRoot?.getElementById("clock-12h"),e=this.shadowRoot?.getElementById("clock-date"),s=this.shadowRoot?.getElementById("save-btn"),p=i?.value||"";if(s)s.disabled=!0,s.textContent=a.t("general.loading");let d="local";if(this._clockSelectedLat!=null&&this._clockSelectedLon!=null)d=await Tr(this._clockSelectedLat,this._clockSelectedLon);else if(p)d=await Zt(p);if(t.city=p,t.timezone=d,t.hour12=n?.checked||!1,t.showDate=e?.checked||!1,t.showSeconds=this.shadowRoot?.getElementById("clock-seconds")?.checked??!0,this._clockSelectedLat=null,this._clockSelectedLon=null,s)s.disabled=!1,s.textContent=a.t("general.save")}else if(r==="weather"){let i=this.shadowRoot?.getElementById("weather-city"),n=this.shadowRoot?.getElementById("weather-lat"),e=this.shadowRoot?.getElementById("weather-lon"),s=this.shadowRoot?.getElementById("weather-fahrenheit"),p=this.shadowRoot?.getElementById("weather-forecast"),d=this.shadowRoot?.getElementById("weather-days");t.city=i?.value||"",t.latitude=parseFloat(n?.value)||0,t.longitude=parseFloat(e?.value)||0,t.unit=s?.checked?"fahrenheit":"celsius",t.showForecast=p?.checked||!1,t.forecastDays=parseInt(d?.value)||5}else if(r==="notepad"){let i=this.shadowRoot?.getElementById("notepad-text");t.text=i?i.value:""}else if(r==="markdown"){let i=this.shadowRoot?.getElementById("markdown-text");t.text=i?i.value:""}else if(r==="telemetry"){let i=this.shadowRoot?.getElementById("telemetry-interval");t.interval=i?parseInt(i.value):1000}if(this.currentItem.type==="section"){let i=this.shadowRoot?.getElementById("section-title");t.title=i?i.value:"",delete t.name}t.borderColor=this._selectedColor,t.borderWidth=this._selectedBorderWidth,await g.updateItem({id:this.currentItem.id,content:JSON.stringify(t)}),this.close()}render(){if(!this.shadowRoot)return;let o={},r="";if(this.currentItem)o=typeof this.currentItem.content==="string"?JSON.parse(this.currentItem.content):this.currentItem.content,r=o.widgetId;let t=(p)=>String(p).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),i=()=>{let p=()=>{let d=this._selectedColor,c=this._selectedBorderWidth,l=!this.premiumColors.includes(d)&&d!=="";return`
                <div class="field-group" style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 16px;">
                    <label>${a.t("bookmark.border_color")||"Border Color"}</label>
                    <div class="premium-color-grid">
                        ${this.premiumColors.map((x)=>`
                            <div class="premium-color-swatch ${d===x?"active":""}" 
                                style="background-color: ${x}"
                                data-color="${x}">
                                ${d===x?'<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.42L9 19 21 7l-1.42-1.42z"/></svg>':""}
                            </div>
                        `).join("")}
                        
                        <div class="premium-color-swatch premium-color-swatch--custom ${l?"active":""}" 
                            style="background-color: ${l?d:"transparent"}">
                            <svg viewBox="0 0 24 24" style="z-index: 5; fill: white; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); pointer-events: none;">
                                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm3 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                            </svg>
                            <app-color-picker class="premium-swatch-picker" id="widget-borderColor" trigger-opacity="0" value="${l?d:"#0078D4"}"></app-color-picker>
                        </div>
                    </div>
                </div>

                <div class="field-group" style="margin-top: 20px;">
                    <label>${a.t("bookmark.border_width")||"Border Width"}</label>
                    <div class="segmented-control">
                        <button type="button" class="border-width-btn ${c===1?"active":""}" data-width="1">
                            <div style="height: 1px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                            <span>${a.t("general.thin")||"Thin"}</span>
                        </button>
                        <button type="button" class="border-width-btn ${c===2?"active":""}" data-width="2">
                            <div style="height: 2px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                            <span>${a.t("general.regular")||"Regular"}</span>
                        </button>
                        <button type="button" class="border-width-btn ${c===3?"active":""}" data-width="3">
                            <div style="height: 3px; width: 24px; background: currentColor; opacity: 0.8;"></div>
                            <span>${a.t("general.thick")||"Thick"}</span>
                        </button>
                    </div>
                </div>
                `};if(!this.currentItem)return{general:"",customization:""};if(r==="clock"){let d=o.city||"",c=o.hour12||!1,l=o.showDate!==!1,x=`
                    <div class="field-group">
                        <label>${a.t("widget.clock.city")}</label>
                        <div class="input-row">
                            <input type="text" id="clock-city" value="${t(d)}" placeholder="${a.t("widget.clock.city_placeholder")}"/>
                            <app-button variant="ghost" id="clock-search-btn">${a.t("widget.weather.search")}</app-button>
                        </div>
                        <small>${a.t("widget.clock.city_desc")}</small>
                    </div>

                    <div class="field-group" id="clock-results-container" style="display:none;">
                        <label>${a.t("widget.weather.results")}</label>
                        <div id="clock-results" class="weather-results"></div>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-12h" ${c?"checked":""} />
                        <label for="clock-12h">${a.t("widget.clock.use_12h")}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-date" ${l?"checked":""} />
                        <label for="clock-date">${a.t("widget.clock.show_date")}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="clock-seconds" ${o.showSeconds===!0?"checked":""} />
                        <label for="clock-seconds">${a.t("widget.clock.show_seconds")}</label>
                    </div>
                `,u="";return{general:x,customization:""+p()}}else if(r==="weather"){let d=o.city||"",c=o.latitude||"",l=o.longitude||"",x=o.unit==="fahrenheit",u=o.showForecast||!1,v=o.forecastDays||5,y=`
                    <div class="field-group">
                        <label>${a.t("widget.weather.city")}</label>
                        <div class="input-row">
                            <input type="text" id="weather-city" value="${t(d)}" placeholder="${a.t("widget.weather.city_placeholder")}"/>
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
                            <input type="number" id="weather-lat" value="${c}" placeholder="${a.t("general.latitude")}" step="0.0001" />
                            <input type="number" id="weather-lon" value="${l}" placeholder="${a.t("general.longitude")}" step="0.0001" />
                        </div>
                    </div>

                    <div class="field-group check-row" style="margin-top: 16px;">
                        <input type="checkbox" id="weather-fahrenheit" ${x?"checked":""} />
                        <label for="weather-fahrenheit">${a.t("widget.weather.use_fahrenheit")}</label>
                    </div>

                    <div class="field-group check-row">
                        <input type="checkbox" id="weather-forecast" ${u?"checked":""} />
                        <label for="weather-forecast">${a.t("widget.weather.show_forecast")}</label>
                    </div>

                    <div class="field-group row-aligned" id="weather-days-row" ${!u?'style="display:none;"':""}>
                        <label>${a.t("widget.weather.forecast_days")}</label>
                        <div class="stepper-wrap">
                            <button type="button" class="stepper-btn" id="weather-days-dec">&minus;</button>
                            <input type="number" id="weather-days" value="${v}" min="1" max="6" />
                            <button type="button" class="stepper-btn" id="weather-days-inc">+</button>
                        </div>
                    </div>
                `,_="";return{general:y,customization:""+p()}}else if(r==="telemetry"){let d=o.interval||5000,c=`
                    <div class="field-group row-aligned">
                        <label>${a.t("widget.telemetry.update_interval")}</label>
                        <app-select id="telemetry-interval" value="${d}"></app-select>
                    </div>
                `,l="";return{general:c,customization:""+p()}}else if(r==="notepad"){let d=o.text||"",c=`
                    < div style = "text-align: center; padding: 32px 20px; color: var(--text-dim);" >
                        <p>${a.t("widget.config.check_personalize")} </p>
                            </div>
                                `,l="";return{general:c,customization:""+p()}}else if(r==="markdown"){let d=o.text||"",c=`
                    <div style="text-align: center; padding: 32px 20px; color: var(--text-dim);">
                        <p>${a.t("widget.config.check_personalize")}</p>
                    </div>
                `,l="";return{general:c,customization:""+p()}}else if(this.currentItem.type==="section"){let d=o.title||"",c=`
                    <div class="field-group">
                        <label>${a.t("bookmark.label")}</label>
                        <div class="input-row">
                            <input type="text" id="section-title" value="${t(d)}" placeholder="${a.t("section.placeholder_title")}" />
                        </div>
                        <small>${a.t("section.leave_empty")}</small>
                    </div>
                `,l="";return{general:c,customization:""+p()}}return{general:`<p>${a.t("widget.config.no_config")}</p>`,customization:""}},n=()=>{if(this.currentItem?.type==="section")return a.t("section.edit_title");return a.t("widget.config.title")},e=i();this.shadowRoot.innerHTML=`
            <style>${Vr}</style>
            <dialog id="modal">
                <div class="modal-header">
                    <div class="integrated-tabs">
                        <button class="tab-btn active" data-tab="general">${a.t("general.general")}</button>
                        <button class="tab-btn" data-tab="customization">${a.t("general.customization")}</button>
                    </div>
                    <button class="modal-close" id="close-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                
                <div class="tab-container">
                    <div class="content">
                         <!-- TAB: GENERAL -->
                        <div id="tab-general" class="tab-content active">
                            ${e.general}
                        </div>

                         <!-- TAB: CUSTOMIZATION -->
                        <div id="tab-customization" class="tab-content">
                            ${e.customization}
                        </div>
                    </div>
                </div>

                <div class="actions">
                    ${["clock","telemetry","weather","notepad","markdown"].includes(r)||this.currentItem?.type==="section"?`<app-button variant="primary" id="save-btn">${a.t("general.save")}</app-button>`:""}
                </div>
            </dialog>
        `,this.dialog=this.shadowRoot.querySelector("dialog");let s=this.shadowRoot.getElementById("telemetry-interval");if(s)s.options=[{value:"1000",label:"1s"},{value:"2000",label:"2s"},{value:"5000",label:"5s"},{value:"10000",label:"10s"}]}async searchClockCity(){let o=this.shadowRoot?.getElementById("clock-city"),r=this.shadowRoot?.getElementById("clock-results-container"),t=this.shadowRoot?.getElementById("clock-results");if(!o||!r||!t)return;let i=o.value.trim();if(!i)return;t.innerHTML=`<div class="search-loading">${a.t("general.loading")}</div>`,r.style.display="";try{let e=await(await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(i)}&count=5&language=${a.getLocale().code}`)).json();if(!e.results||e.results.length===0){t.innerHTML=`<div class="search-empty">${a.t("general.no_icons")}</div>`;return}t.innerHTML=e.results.map((s)=>`
                <button class="city-result" data-lat="${s.latitude}" data-lon="${s.longitude}" data-name="${s.name}">
                    <span class="city-name">${s.name}</span>
                    <span class="city-detail">${[s.admin1,s.country].filter(Boolean).join(", ")}</span>
                </button>
            `).join(""),t.querySelectorAll(".city-result").forEach((s)=>{s.addEventListener("click",()=>{let p=parseFloat(s.getAttribute("data-lat")||"0"),d=parseFloat(s.getAttribute("data-lon")||"0"),c=s.getAttribute("data-name")||"";(this.shadowRoot?.getElementById("clock-city")).value=c,this._clockSelectedLat=p,this._clockSelectedLon=d,r.style.display="none"})})}catch(n){t.innerHTML=`<div class="search-empty">${a.t("general.error")}</div>`}}async searchWeatherCity(){let o=this.shadowRoot?.getElementById("weather-city"),r=this.shadowRoot?.getElementById("weather-results-container"),t=this.shadowRoot?.getElementById("weather-results");if(!o||!r||!t)return;let i=o.value.trim();if(!i)return;t.innerHTML=`<div class="search-loading">${a.t("general.loading")}</div>`,r.style.display="";try{let e=await(await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(i)}&count=5&language=${a.getLocale().code}`)).json();if(!e.results||e.results.length===0){t.innerHTML=`<div class="search-empty">${a.t("general.no_icons")}</div>`;return}t.innerHTML=e.results.map((s)=>`
                <button class="city-result" data-lat="${s.latitude}" data-lon="${s.longitude}" data-name="${s.name}">
                    <span class="city-name">${s.name}</span>
                    <span class="city-detail">${[s.admin1,s.country].filter(Boolean).join(", ")}</span>
                </button>
            `).join(""),t.querySelectorAll(".city-result").forEach((s)=>{s.addEventListener("click",()=>{let p=parseFloat(s.getAttribute("data-lat")||"0"),d=parseFloat(s.getAttribute("data-lon")||"0"),c=s.getAttribute("data-name")||"";(this.shadowRoot?.getElementById("weather-lat")).value=p.toString(),(this.shadowRoot?.getElementById("weather-lon")).value=d.toString(),(this.shadowRoot?.getElementById("weather-city")).value=c,r.style.display="none"})})}catch(n){t.innerHTML=`<div class="search-empty">${a.t("general.error")}</div>`}}}customElements.define("widget-config-modal",Dr);f();var Cr=({isOpen:o,title:r,message:t})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h3 class="modal-title">${r}</h3>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="modal-message">${t}</p>
        <div class="modal-actions">
            <app-button variant="danger" id="btn-confirm">${a.t("general.confirm")}</app-button>
        </div>
    </dialog>
`;f();var Pr=`:host {
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
}`;class Wr extends HTMLElement{dialog=null;titleText=a.t("general.confirm_action");messageText=a.t("general.are_you_sure");resolvePromise=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this._unsubscribeI18n=a.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n()}setupDynamicListeners(){let o=this.shadowRoot.getElementById("modal-close"),r=this.shadowRoot.getElementById("btn-confirm");this.dialog=this.shadowRoot.getElementById("modal");let t=(i)=>{if(this.resolvePromise)this.resolvePromise(i),this.resolvePromise=null;this.dialog?.close()};if(o)o.onclick=()=>t(!1);if(r)r.onclick=()=>t(!0);if(this.dialog)this.dialog.onclick=(i)=>{if(i.target===this.dialog)t(!1)}}async confirm(o,r){return this.titleText=o,this.messageText=r,this.render(),this.dialog?.showModal(),new Promise((t)=>{this.resolvePromise=t})}render(){this.shadowRoot.innerHTML=`
            <style>${Pr}</style>
            ${Cr({isOpen:!0,title:this.titleText,message:this.messageText})}
        `,this.setupDynamicListeners()}}if(!customElements.get("confirmation-modal"))customElements.define("confirmation-modal",Wr);f();var Ir=({title:o,message:r})=>`
    <dialog id="modal">
        <div class="modal-header">
            <h3 class="modal-title">${o}</h3>
            <button class="modal-close" id="modal-close">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <p class="modal-message">${r}</p>
        
        <div class="password-input-group">
            <label for="password-confirm">${a.t("auth.password")}</label>
            <input type="password" id="password-confirm" class="password-input" placeholder="••••••••" autocomplete="current-password">
        </div>

        <div class="modal-actions">
            <app-button variant="danger" id="btn-confirm">${a.t("general.confirm")}</app-button>
        </div>
    </dialog>
`;f();var Sr=`:host {
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
    margin: 0 0 20px 0;
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.6;
}

.password-input-group {
    margin-bottom: 24px;
}

.password-input-group label {
    display: block;
    font-size: 12px;
    color: var(--text-dim);
    margin-bottom: 8px;
    font-weight: 500;
}

.password-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    color: var(--text-main);
    font-family: inherit;
    font-size: 14px;
    box-sizing: border-box;
}

.password-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.2);
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.shake {
    animation: shake 0.4s ease-in-out;
}

@keyframes shake {

    0%,
    100% {
        transform: translateX(0);
    }

    20%,
    60% {
        transform: translateX(-5px);
    }

    40%,
    80% {
        transform: translateX(5px);
    }
}`;class ot extends HTMLElement{dialog=null;titleText=a.t("general.confirm");messageText=a.t("general.please_enter_password");resolvePromise=null;_unsubscribeI18n;constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this._unsubscribeI18n=a.subscribe(()=>{if(this.dialog?.open)this.render()})}disconnectedCallback(){if(this._unsubscribeI18n)this._unsubscribeI18n()}setupDynamicListeners(){let o=this.shadowRoot.getElementById("modal-close"),r=this.shadowRoot.getElementById("btn-confirm"),t=this.shadowRoot.getElementById("password-confirm"),i=this.shadowRoot.querySelector(".password-input-group");this.dialog=this.shadowRoot.getElementById("modal");let n=(s)=>{if(this.resolvePromise)this.resolvePromise(s),this.resolvePromise=null;if(this.dialog?.close(),t)t.value=""},e=()=>{let s=t?.value||"";if(s.trim()===""){if(window.notifier)window.notifier.show(a.t("notifier.password_required"),"error");if(i)i.classList.remove("shake"),i.offsetWidth,i.classList.add("shake");t?.focus();return}n(s)};if(o)o.onclick=()=>n(null);if(r)r.onclick=()=>e();if(t)t.onkeydown=(s)=>{if(s.key==="Enter")s.preventDefault(),e()},t.oninput=()=>{if(i)i.classList.remove("shake")};if(this.dialog)this.dialog.onclick=(s)=>{if(s.target===this.dialog)n(null)}}async prompt(o,r){this.titleText=o,this.messageText=r,this.render(),this.dialog?.showModal();let t=this.shadowRoot.getElementById("password-confirm");if(t)t.value="",setTimeout(()=>t.focus(),50);return new Promise((i)=>{this.resolvePromise=i})}render(){this.shadowRoot.innerHTML=`
            <style>${Sr}</style>
            ${Ir({title:this.titleText,message:this.messageText})}
        `,this.setupDynamicListeners()}}if(!customElements.get("password-confirm-modal"))customElements.define("password-confirm-modal",ot);j();class jo{static parse(o){if(!o)return"";let r=o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");return r=r.replace(/```(\w+)?\n([\s\S]*?)```/g,'<pre><code class="language-$1">$2</code></pre>'),r=r.replace(/^> (.*$)/gim,"<blockquote>$1</blockquote>"),r=r.replace(/^### (.*$)/gim,"<h3>$1</h3>"),r=r.replace(/^## (.*$)/gim,"<h2>$1</h2>"),r=r.replace(/^# (.*$)/gim,"<h1>$1</h1>"),r=r.replace(/^---$/gim,"<hr />"),r=r.replace(/^\s*[-*]\s+(.*$)/gim,"<ul><li>$1</li></ul>"),r=r.replace(/<\/ul>\s*<ul>/gim,""),r=r.replace(/^\s*\d+\.\s+(.*$)/gim,"<ol><li>$1</li></ol>"),r=r.replace(/<\/ol>\s*<ol>/gim,""),r=r.replace(/^\s*\[ \]\s+(.*$)/gim,'<div class="checklist-item"><input type="checkbox" disabled> $1</div>'),r=r.replace(/^\s*\[x\]\s+(.*$)/gim,'<div class="checklist-item"><input type="checkbox" checked disabled> $1</div>'),r=r.replace(/`([^`]+)`/gim,"<code>$1</code>"),r=r.replace(/!\[([^\]]+)\]\(([^)]+)\)/gim,'<img src="$2" alt="$1" style="max-width:100%"/>'),r=r.replace(/\[([^\]]+)\]\(([^)]+)\)/gim,'<a href="$2" target="_blank">$1</a>'),r=r.replace(/\*\*([^*]+)\*\*/gim,"<strong>$1</strong>"),r=r.replace(/__([^_]+)__/gim,"<strong>$1</strong>"),r=r.replace(/\*([^*]+)\*/gim,"<em>$1</em>"),r=r.replace(/_([^_]+)_/gim,"<em>$1</em>"),r=r.replace(/\n\n/gim,"<br><br>"),r=r.replace(/\n/gim,"<br>"),r}}f();var S={lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',unlock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',preview:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'};class rt extends HTMLElement{_itemId=0;_content="";_isPreviewMode=!1;_isLocked=!0;_isDirty=!1;_isSaving=!1;_editor=null;_preview=null;_headerActions=null;_lockBtn=null;_togglePreviewBtn=null;static get observedAttributes(){return["item-id"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.loadContent()}attributeChangedCallback(o,r,t){if(o==="item-id"&&r!==t)this._itemId=parseInt(t,10),this.loadContent()}render(){if(!this.shadowRoot)return;let o=this._isLocked?"locked":"unlocked";this.shadowRoot.innerHTML=`
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

                /* Hide Lock Button in Edit Mode (Grid Editing) */
                :host([data-editing="true"]) .action-btn.lock-btn {
                    display: none !important;
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
                    ${S.preview}
                </button>
                <button class="action-btn lock-btn ${o}" title="${this._isLocked?a.t("widget.markdown.tool.unlock"):a.t("widget.markdown.tool.lock")}">
                    ${this._isLocked?S.lock:S.unlock}
                </button>
            </div>

            <div class="editor-container">
                <textarea class="editor" placeholder="${a.t("widget.markdown.placeholder")}" style="${this._isLocked?"display:none":""}"></textarea>
                <div class="preview ${this._isLocked?"visible":""}"></div>
            </div>
        `,this._editor=this.shadowRoot.querySelector(".editor"),this._preview=this.shadowRoot.querySelector(".preview"),this._headerActions=this.shadowRoot.querySelector(".header-actions"),this._lockBtn=this.shadowRoot.querySelector(".lock-btn"),this._togglePreviewBtn=this.shadowRoot.querySelector(".toggle-preview"),this.bindEvents()}bindEvents(){this._editor?.addEventListener("input",()=>this.handleInput()),this._editor?.addEventListener("keydown",(o)=>this.handleKeydown(o)),this._headerActions?.addEventListener("click",(o)=>{let r=o.target.closest(".action-btn");if(!r)return;if(r.classList.contains("toggle-preview"))this.togglePreview();else if(r.classList.contains("lock-btn"))this.toggleLock()})}handleInput(){if(this._isLocked)return;if(this._isDirty=!0,this._isPreviewMode)this.updatePreview()}handleKeydown(o){if(this._isLocked)return;if(o.key==="Tab")o.preventDefault(),this.insertText("  ");if((o.ctrlKey||o.metaKey)&&o.key==="s")o.preventDefault(),this.save()}insertText(o){if(!this._editor)return;let r=this._editor.selectionStart,t=this._editor.selectionEnd,i=this._editor.value;this._editor.value=i.substring(0,r)+o+i.substring(t),this._editor.selectionStart=this._editor.selectionEnd=r+o.length,this.handleInput()}togglePreview(){if(this._isPreviewMode=!this._isPreviewMode,this._togglePreviewBtn)this._togglePreviewBtn.classList.toggle("active",this._isPreviewMode);this.applyViewState()}updatePreview(){if(this._editor&&this._preview)try{this._preview.innerHTML=jo.parse(this._editor.value)}catch(o){console.error("Markdown parsing failed",o),this._preview.innerHTML=`<div class="error">${a.t("widget.markdown.error.preview")}</div>`}}applyViewState(){if(this._isPreviewMode){if(this.updatePreview(),this._preview)this._preview.classList.add("visible"),this._preview.style.display="block";if(this._editor)this._editor.style.display="none",this._editor.style.visibility="hidden"}else{if(this._preview)this._preview.classList.remove("visible"),this._preview.style.display="none";if(this._editor)this._editor.style.display="block",this._editor.style.visibility="visible"}}toggleLock(){if(this._isLocked=!this._isLocked,this._editor)this._editor.disabled=this._isLocked;if(this._lockBtn)if(this._lockBtn.innerHTML=this._isLocked?S.lock:S.unlock,this._lockBtn.title=this._isLocked?a.t("widget.markdown.tool.unlock"):a.t("widget.markdown.tool.lock"),this._isLocked)this._lockBtn.classList.add("locked"),this._lockBtn.classList.remove("unlocked");else this._lockBtn.classList.remove("locked"),this._lockBtn.classList.add("unlocked");if(this._isLocked){if(this._isPreviewMode=!0,this._togglePreviewBtn)this._togglePreviewBtn.style.display="none"}else{if(this._isPreviewMode=!1,this._togglePreviewBtn)this._togglePreviewBtn.style.display="flex",this._togglePreviewBtn.classList.remove("active");this._editor?.focus()}if(this.applyViewState(),this._isLocked&&this._isDirty)this.save()}async loadContent(){if(!this._itemId)return;let r=g.getState().items.find((t)=>t.id===this._itemId);if(r){let t=R.getMarkdownText(r.content);if(this._content=t,this._editor)this._editor.value=t;if(this._isLocked)this.updatePreview()}}async save(){if(!this._itemId||!this._editor)return;this._isSaving=!0;let o=this._editor.value;this._content=o;try{let t=g.getState().items.find((i)=>i.id===this._itemId);if(t){let i=R.setMarkdownText(t.content,o);await g.updateItem({...t,content:i}),this._isDirty=!1}}catch(r){console.error(r)}finally{this._isSaving=!1}}}customElements.define("widget-markdown",rt);f();async function tt(o){try{await a.ensureInitialized(),await o()}catch(r){console.error("[Bootstrap] Critical failure:",r),document.body.innerHTML=`
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
                <h1 style="color: #fa5252;">${a.t("error.system_error")}</h1>
                <p>${a.t("error.init_failed")}</p>
                <p style="opacity: 0.7; font-size: 0.9em;">${a.t("error.check_console")}</p>
                <button onclick="window.location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #333;
                    color: white;
                    border: 1px solid #555;
                    cursor: pointer;
                    border-radius: 4px;
                ">${a.t("general.reload")}</button>
            </div>
        `}}to();var L=document.getElementById("main-topbar"),it=document.getElementById("right-drawer"),ao=document.getElementById("dashboard-root"),P,no,eo,so;tt(async()=>{M.init();let[o,r]=await Promise.all([w.fetchUser(),g.fetchItems()]),t=w.getUser();if(t){if(t.language)await a.setLanguage(t.language);if(t.preferences&&t.preferences.grid_columns)document.documentElement.style.setProperty("--user-preferred-columns",t.preferences.grid_columns.toString());if(t.theme==="dark")M.enableDark();else if(t.theme==="light")M.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)M.enableDark();else M.enableLight();if(t.id)g.setUserId(t.id)}if(L){if(L.setState({user:t}),t&&t.project_name)L.setAttribute("title",t.project_name);w.subscribe((n)=>{if(n){if(L.setState({user:n}),n.project_name)L.setAttribute("title",n.project_name)}})}Yt(),I.start(),P=document.createElement("add-bookmark-modal"),document.body.appendChild(P),no=document.createElement("add-widget-modal"),document.body.appendChild(no),eo=document.createElement("confirmation-modal"),document.body.appendChild(eo),so=document.createElement("password-confirm-modal"),document.body.appendChild(so);let i=document.createElement("widget-config-modal");document.body.appendChild(i)});E.on(N.SHOW_CONFIRMATION,async(o)=>{let{title:r,message:t,onConfirm:i}=o.detail;if(eo){if(await eo.confirm(r,t)&&i)i()}});E.on(N.SHOW_PASSWORD_CONFIRM,async(o)=>{let{title:r,message:t,onConfirm:i}=o.detail;if(so){let n=await so.prompt(r,t);if(n!==null&&i)i(n)}});E.on(N.SHOW_WIDGET_CONFIG,(o)=>{let{item:r,type:t}=o.detail;if(t==="bookmark"){if(P)P.openForEdit(r)}else{let i=document.querySelector("widget-config-modal");if(i)i.open(r)}});E.on(N.NOTIFY,(o)=>{let r=document.querySelector("app-notifier");if(r)r.show(o.detail.message,o.detail.type)});if(L)L.addEventListener("drawer-toggle",(o)=>{if(o.detail.action==="open")it.open(),L.setState({drawerOpen:!0});else it.close(),L.setState({drawerOpen:!1})}),L.addEventListener("edit-mode-change",(o)=>{let r=o.detail.active;if(ao.classList.toggle("edit-mode",r),!r)window.location.reload()}),L.addEventListener("search-input",(o)=>{let r=o.detail.query;g.setSearchQuery(r)}),L.addEventListener("add-item",async(o)=>{let r=o.detail.action;if(r==="add-bookmark"){if(P)P.open()}else if(r==="add-widget"){if(no)no.open()}else if(r==="add-section"){let i=g.getState().items||[],{collisionService:n}=await Promise.resolve().then(() => (U(),T)),e=n.findFirstAvailableSlot(1,1,i),s={type:"section",x:e.x,y:e.y,w:1,h:1,content:JSON.stringify({title:""})},p=await g.addItem(s);if(p)E.emit(N.SHOW_WIDGET_CONFIG,{item:p,type:"section"})}});window.addEventListener("widget-selected",async(o)=>{let t=o.detail,n=g.getState().items||[],{collisionService:e}=await Promise.resolve().then(() => (U(),T)),s=e.findFirstAvailableSlot(t.defaultW,t.defaultH,n),p={type:"widget",x:s.x,y:s.y,w:t.defaultW,h:t.defaultH,content:JSON.stringify({widgetId:t.id,text:t.id==="notepad"||t.id==="markdown"?"":void 0})};await g.addItem(p)});window.addEventListener("drawer-close",()=>{if(L)L.setState({drawerOpen:!1})});window.addEventListener("click",(o)=>{let r=o.target,t=document.getElementById("add-menu"),i=document.getElementById("add-toggle");if(t&&t.classList.contains("active")&&!t.contains(r)&&i&&!i.contains(r))t.classList.remove("active")});function Yt(){if(!ao)return;ao.innerHTML="";let o=document.createElement("bookmark-grid");ao.appendChild(o)}
