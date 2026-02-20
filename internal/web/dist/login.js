class w{static STORAGE_KEY="lastboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,d,f){let t="";if(f){let a=new Date;a.setTime(a.getTime()+f*24*60*60*1000),t="; expires="+a.toUTCString()}document.cookie=o+"="+(d||"")+t+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let d=await o.json();if(d.theme==="dark")this.enableDark();else if(d.theme==="light")this.enableLight()}}catch(o){}}}var p=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class l{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("lastboard_lang"),d=navigator.language.split("-")[0],f="en";if(o&&p.find((t)=>t.code===o))f=o;else if(p.find((t)=>t.code===d))f=d;if(f!=="en")await this.loadLocale(f);this.currentLanguage=f,this.notifyListeners()}static getInstance(){if(!l.instance)l.instance=new l;return l.instance}getLocale(){return{...p.find((d)=>d.code===this.currentLanguage)||p[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let o=(f)=>/^[a-zA-Z]/.test(f);return[...p].sort((f,t)=>{let a=o(f.name),e=o(t.name);if(a&&!e)return-1;if(!a&&e)return 1;return f.name.localeCompare(t.name,void 0,{sensitivity:"base"})})}async loadLocale(o){if(this.cache.has(o))return;try{let d=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!d.ok)throw Error(`Failed to load locale ${o}`);let f=await d.json();this.cache.set(o,f)}catch(d){console.error(d)}}async setLanguage(o){if(p.find((d)=>d.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("lastboard_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,d){let f=this.cache.get(this.currentLanguage),t=this.cache.get("en"),a=f?.[o];if(!a&&t)a=t[o];if(!a)return o;if(d)Object.keys(d).forEach((e)=>{a=a.replace(`{${e}}`,d[e])});return a}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((d)=>d!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((d)=>d(o))}async ensureInitialized(){return this.initialized}}var s=l.getInstance();async function x(o){try{await s.ensureInitialized(),await o()}catch(d){console.error("[Bootstrap] Critical failure:",d),document.body.innerHTML=`
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
                <h1 style="color: #fa5252;">${s.t("error.system_error")}</h1>
                <p>${s.t("error.init_failed")}</p>
                <p style="opacity: 0.7; font-size: 0.9em;">${s.t("error.check_console")}</p>
                <button onclick="window.location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #333;
                    color: white;
                    border: 1px solid #555;
                    cursor: pointer;
                    border-radius: 4px;
                ">${s.t("general.reload")}</button>
            </div>
        `}}var i=()=>`
    <div class="toast-container"></div>
`;var u=`.toast-container {
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
}`;class m extends HTMLElement{_boundOpen;_boundClose;constructor(){super();this.attachShadow({mode:"open"}),this._boundOpen=()=>this.shift(!0),this._boundClose=()=>this.shift(!1)}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",this._boundOpen),window.addEventListener("drawer-close",this._boundClose)}disconnectedCallback(){window.removeEventListener("drawer-open",this._boundOpen),window.removeEventListener("drawer-close",this._boundClose)}shift(o){let d=this.shadowRoot.querySelector(".toast-container");if(d)if(o)d.classList.add("toast-container--shifted");else d.classList.remove("toast-container--shifted")}show(o,d="success"){let f=this.shadowRoot.querySelector(".toast-container");if(!f)return;let t=document.createElement("div");t.className=`toast toast--${d}`,t.textContent=o,f.appendChild(t),requestAnimationFrame(()=>{t.style.opacity="1",t.style.transform="translateY(0)"}),setTimeout(()=>{t.style.opacity="0",t.style.transform="translateY(20px)",setTimeout(()=>t.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${u}</style>
            ${i()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",m);x(async()=>{let o=document.getElementById("loginForm"),d=document.getElementById("submitBtn");function f(h,c="success"){if(window.notifier)window.notifier.show(h,c);else console.log(`[${c}] ${h}`)}let t=document.querySelector(".setup-container");if(t)t.style.opacity="0",t.style.transition="opacity 0.3s ease";if(!o)return;w.init();let a=document.getElementById("demoBtn");if(a)a.addEventListener("click",()=>{window.location.href="/demo"});(()=>{let h=document.querySelector(".auth-title"),c=document.querySelector(".auth-subtitle"),g=document.querySelector('label[for="username"]'),n=document.querySelector('label[for="password"]');if(h)h.textContent=s.t("auth.welcome");if(c)c.textContent=s.t("auth.subtitle");if(g)g.textContent=s.t("auth.username");if(n)n.textContent=s.t("auth.password");let r=document.getElementById("rememberMeText");if(r)r.textContent=s.t("auth.remember_me");if(d)d.textContent=s.t("auth.sign_in");requestAnimationFrame(()=>{if(t)t.style.opacity="1"})})(),o.addEventListener("keydown",(h)=>{if(h.key==="Enter");}),o.addEventListener("submit",async(h)=>{if(h.preventDefault(),d){d.disabled=!0;let n=d.textContent;d.textContent=s.t("general.pinging")||"Signing in..."}let c=new FormData(o),g=Object.fromEntries(c.entries());g.remember_me=c.get("remember_me")==="on";try{let n=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(g)});if(n.ok)f(s.t("auth.welcome"),"success"),setTimeout(()=>window.location.href="/",500);else{let r=(await n.text()).trim(),_=s.t(r)||s.t("auth.invalid_credentials");if(f(_,"error"),d)d.disabled=!1,d.textContent=s.t("auth.sign_in");if(t)t.classList.remove("shake"),t.offsetWidth,t.classList.add("shake"),setTimeout(()=>t.classList.remove("shake"),500)}}catch(n){if(console.error("Login error:",n),f(s.t("auth.connection_error"),"error"),d)d.disabled=!1,d.textContent=s.t("auth.sign_in")}})});
