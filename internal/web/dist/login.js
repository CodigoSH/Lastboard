class m{static STORAGE_KEY="lastboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,t,f){let d="";if(f){let h=new Date;h.setTime(h.getTime()+f*24*60*60*1000),d="; expires="+h.toUTCString()}document.cookie=o+"="+(t||"")+d+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let t=await o.json();if(t.theme==="dark")this.enableDark();else if(t.theme==="light")this.enableLight()}}catch(o){}}}var p=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class g{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("lastboard_lang"),t=navigator.language.split("-")[0],f="en";if(o&&p.find((d)=>d.code===o))f=o;else if(p.find((d)=>d.code===t))f=t;if(f!=="en")await this.loadLocale(f);this.currentLanguage=f,this.notifyListeners()}static getInstance(){if(!g.instance)g.instance=new g;return g.instance}getLocale(){return{...p.find((t)=>t.code===this.currentLanguage)||p[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let o=(f)=>/^[a-zA-Z]/.test(f);return[...p].sort((f,d)=>{let h=o(f.name),c=o(d.name);if(h&&!c)return-1;if(!h&&c)return 1;return f.name.localeCompare(d.name,void 0,{sensitivity:"base"})})}async loadLocale(o){if(this.cache.has(o))return;try{let t=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!t.ok)throw Error(`Failed to load locale ${o}`);let f=await t.json();this.cache.set(o,f)}catch(t){console.error(t)}}async setLanguage(o){if(p.find((t)=>t.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("lastboard_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,t){let f=this.cache.get(this.currentLanguage),d=this.cache.get("en"),h=f?.[o];if(!h&&d)h=d[o];if(!h)return o;if(t)Object.keys(t).forEach((c)=>{h=h.replace(`{${c}}`,t[c])});return h}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((t)=>t!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((t)=>t(o))}async ensureInitialized(){return this.initialized}}var a=g.getInstance();async function w(o){try{await a.ensureInitialized(),await o()}catch(t){console.error("[Bootstrap] Critical failure:",t),document.body.innerHTML=`
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
}`;class E extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",()=>this.shift(!0)),window.addEventListener("drawer-close",()=>this.shift(!1))}shift(o){let t=this.shadowRoot.querySelector(".toast-container");if(t)if(o)t.classList.add("toast-container--shifted");else t.classList.remove("toast-container--shifted")}show(o,t="success"){let f=this.shadowRoot.querySelector(".toast-container");if(!f)return;let d=document.createElement("div");d.className=`toast toast--${t}`,d.textContent=o,f.appendChild(d),requestAnimationFrame(()=>{d.style.opacity="1",d.style.transform="translateY(0)"}),setTimeout(()=>{d.style.opacity="0",d.style.transform="translateY(20px)",setTimeout(()=>d.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${z}</style>
            ${r()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",E);w(async()=>{let o=document.getElementById("loginForm"),t=document.getElementById("submitBtn");function f(c,s="success"){if(window.notifier)window.notifier.show(c,s);else console.log(`[${s}] ${c}`)}let d=document.querySelector(".setup-container");if(d)d.style.opacity="0",d.style.transition="opacity 0.3s ease";if(!o)return;m.init(),(()=>{let c=document.querySelector(".auth-title"),s=document.querySelector(".auth-subtitle"),l=document.querySelector('label[for="username"]'),n=document.querySelector('label[for="password"]');if(c)c.textContent=a.t("auth.welcome");if(s)s.textContent=a.t("auth.subtitle");if(l)l.textContent=a.t("auth.username");if(n)n.textContent=a.t("auth.password");let x=document.getElementById("rememberMeText");if(x)x.textContent=a.t("auth.remember_me");if(t)t.textContent=a.t("auth.sign_in");requestAnimationFrame(()=>{if(d)d.style.opacity="1"})})(),o.addEventListener("keydown",(c)=>{if(c.key==="Enter");}),o.addEventListener("submit",async(c)=>{if(c.preventDefault(),t){t.disabled=!0;let n=t.textContent;t.textContent=a.t("general.pinging")||"Signing in..."}let s=new FormData(o),l=Object.fromEntries(s.entries());l.remember_me=s.get("remember_me")==="on";try{let n=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)});if(n.ok)f(a.t("auth.welcome"),"success"),setTimeout(()=>window.location.href="/",500);else{let x=(await n.text()).trim(),M=a.t(x)||a.t("auth.invalid_credentials");if(f(M,"error"),t)t.disabled=!1,t.textContent=a.t("auth.sign_in");if(d)d.animate([{transform:"translateX(0)"},{transform:"translateX(-10px)"},{transform:"translateX(10px)"},{transform:"translateX(-10px)"},{transform:"translateX(0)"}],{duration:400,easing:"ease-in-out"})}}catch(n){if(console.error("Login error:",n),f(a.t("auth.connection_error"),"error"),t)t.disabled=!1,t.textContent=a.t("auth.sign_in")}})});
