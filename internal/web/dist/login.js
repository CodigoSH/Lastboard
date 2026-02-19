class m{static STORAGE_KEY="lastboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,d,t){let f="";if(t){let h=new Date;h.setTime(h.getTime()+t*24*60*60*1000),f="; expires="+h.toUTCString()}document.cookie=o+"="+(d||"")+f+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let d=await o.json();if(d.theme==="dark")this.enableDark();else if(d.theme==="light")this.enableLight()}}catch(o){}}}var g=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class l{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("lastboard_lang"),d=navigator.language.split("-")[0],t="en";if(o&&g.find((f)=>f.code===o))t=o;else if(g.find((f)=>f.code===d))t=d;if(t!=="en")await this.loadLocale(t);this.currentLanguage=t,this.notifyListeners()}static getInstance(){if(!l.instance)l.instance=new l;return l.instance}getLocale(){return{...g.find((d)=>d.code===this.currentLanguage)||g[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let o=(t)=>/^[a-zA-Z]/.test(t);return[...g].sort((t,f)=>{let h=o(t.name),c=o(f.name);if(h&&!c)return-1;if(!h&&c)return 1;return t.name.localeCompare(f.name,void 0,{sensitivity:"base"})})}async loadLocale(o){if(this.cache.has(o))return;try{let d=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!d.ok)throw Error(`Failed to load locale ${o}`);let t=await d.json();this.cache.set(o,t)}catch(d){console.error(d)}}async setLanguage(o){if(g.find((d)=>d.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("lastboard_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,d){let t=this.cache.get(this.currentLanguage),f=this.cache.get("en"),h=t?.[o];if(!h&&f)h=f[o];if(!h)return o;if(d)Object.keys(d).forEach((c)=>{h=h.replace(`{${c}}`,d[c])});return h}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((d)=>d!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((d)=>d(o))}async ensureInitialized(){return this.initialized}}var a=l.getInstance();async function w(o){try{await a.ensureInitialized(),await o()}catch(d){console.error("[Bootstrap] Critical failure:",d),document.body.innerHTML=`
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
        `}}var r=()=>`
    <div class="toast-container"></div>
`;var z=`.toast-container {
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
}`;class E extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",()=>this.shift(!0)),window.addEventListener("drawer-close",()=>this.shift(!1))}shift(o){let d=this.shadowRoot.querySelector(".toast-container");if(d)if(o)d.classList.add("toast-container--shifted");else d.classList.remove("toast-container--shifted")}show(o,d="success"){let t=this.shadowRoot.querySelector(".toast-container");if(!t)return;let f=document.createElement("div");f.className=`toast toast--${d}`,f.textContent=o,t.appendChild(f),requestAnimationFrame(()=>{f.style.opacity="1",f.style.transform="translateY(0)"}),setTimeout(()=>{f.style.opacity="0",f.style.transform="translateY(20px)",setTimeout(()=>f.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${z}</style>
            ${r()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",E);w(async()=>{let o=document.getElementById("loginForm"),d=document.getElementById("submitBtn");function t(c,s="success"){if(window.notifier)window.notifier.show(c,s);else console.log(`[${s}] ${c}`)}let f=document.querySelector(".setup-container");if(f)f.style.opacity="0",f.style.transition="opacity 0.3s ease";if(!o)return;m.init(),(()=>{let c=document.querySelector(".auth-title"),s=document.querySelector(".auth-subtitle"),n=document.querySelector('label[for="username"]'),p=document.querySelector('label[for="password"]');if(c)c.textContent=a.t("auth.welcome");if(s)s.textContent=a.t("auth.subtitle");if(n)n.textContent=a.t("auth.username");if(p)p.textContent=a.t("auth.password");let x=document.getElementById("rememberMeText");if(x)x.textContent=a.t("auth.remember_me");if(d)d.textContent=a.t("auth.sign_in");requestAnimationFrame(()=>{if(f)f.style.opacity="1"})})(),o.addEventListener("keydown",(c)=>{if(c.key==="Enter");}),o.addEventListener("submit",async(c)=>{if(c.preventDefault(),d){d.disabled=!0;let p=d.textContent;d.textContent=a.t("general.pinging")||"Signing in..."}let s=new FormData(o),n=Object.fromEntries(s.entries());n.remember_me=s.get("remember_me")==="on";try{let p=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(p.ok)t(a.t("auth.welcome"),"success"),setTimeout(()=>window.location.href="/",500);else{let x=(await p.text()).trim(),M=a.t(x)||a.t("auth.invalid_credentials");if(t(M,"error"),d)d.disabled=!1,d.textContent=a.t("auth.sign_in");if(f)f.classList.remove("shake"),f.offsetWidth,f.classList.add("shake"),setTimeout(()=>f.classList.remove("shake"),500)}}catch(p){if(console.error("Login error:",p),t(a.t("auth.connection_error"),"error"),d)d.disabled=!1,d.textContent=a.t("auth.sign_in")}})});
