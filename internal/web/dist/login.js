class T{static STORAGE_KEY="kashboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,f,a){let d="";if(a){let m=new Date;m.setTime(m.getTime()+a*24*60*60*1000),d="; expires="+m.toUTCString()}document.cookie=o+"="+(f||"")+d+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let f=await o.json();if(f.theme==="dark")this.enableDark();else if(f.theme==="light")this.enableLight()}}catch(o){}}}var g=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class h{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("csh_lang"),f=navigator.language.split("-")[0],a="en";if(o&&g.find((d)=>d.code===o))a=o;else if(g.find((d)=>d.code===f))a=f;if(a!=="en")await this.loadLocale(a);this.currentLanguage=a,this.notifyListeners()}static getInstance(){if(!h.instance)h.instance=new h;return h.instance}getLocale(){return{...g.find((f)=>f.code===this.currentLanguage)||g[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){return g}async loadLocale(o){if(this.cache.has(o))return;try{let f=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!f.ok)throw Error(`Failed to load locale ${o}`);let a=await f.json();this.cache.set(o,a)}catch(f){console.error(f)}}async setLanguage(o){if(g.find((f)=>f.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("csh_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,f){let a=this.cache.get(this.currentLanguage),d=this.cache.get("en"),m=a?.[o];if(!m&&d)m=d[o];if(!m)return o;if(f)Object.keys(f).forEach((p)=>{m=m.replace(`{${p}}`,f[p])});return m}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((f)=>f!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((f)=>f(o))}async ensureInitialized(){return this.initialized}}var t=h.getInstance();async function l(o){try{await t.ensureInitialized(),await o()}catch(f){console.error("[Bootstrap] Critical failure:",f),document.body.innerHTML=`
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
        `}}var M=()=>`
    <div class="toast-container"></div>
`;var z=`.toast-container {
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
}`;class Y extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this}show(o,f="success"){let a=this.shadowRoot.querySelector(".toast-container");if(!a)return;let d=document.createElement("div");d.className=`toast toast--${f}`,d.textContent=o,a.appendChild(d),requestAnimationFrame(()=>{d.style.opacity="1",d.style.transform="translateY(0)"}),setTimeout(()=>{d.style.opacity="0",d.style.transform="translateY(20px)",setTimeout(()=>d.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${z}</style>
            ${M()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",Y);l(async()=>{let o=document.getElementById("loginForm"),f=document.getElementById("submitBtn");function a(p,c="success"){if(window.notifier)window.notifier.show(p,c);else console.log(`[${c}] ${p}`)}let d=document.querySelector(".setup-container");if(d)d.style.opacity="0",d.style.transition="opacity 0.3s ease";if(!o)return;T.init(),(()=>{let p=document.querySelector(".auth-title"),c=document.querySelector(".auth-subtitle"),n=document.querySelector('label[for="username"]'),x=document.querySelector('label[for="password"]');if(p)p.textContent=t.t("auth.welcome");if(c)c.textContent=t.t("auth.subtitle");if(n)n.textContent=t.t("auth.username");if(x)x.textContent=t.t("auth.password");if(f)f.textContent=t.t("auth.sign_in");requestAnimationFrame(()=>{if(d)d.style.opacity="1"})})(),o.addEventListener("keydown",(p)=>{if(p.key==="Enter");}),o.addEventListener("submit",async(p)=>{if(p.preventDefault(),f){f.disabled=!0;let x=f.textContent;f.textContent=t.t("general.pinging")||"Signing in..."}let c=new FormData(o),n=Object.fromEntries(c.entries());try{let x=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(x.ok)a(t.t("auth.welcome"),"success"),setTimeout(()=>window.location.href="/",500);else{let $=await x.text()||t.t("auth.invalid_credentials");if(a($,"error"),f)f.disabled=!1,f.textContent=t.t("auth.sign_in");if(d)d.animate([{transform:"translateX(0)"},{transform:"translateX(-10px)"},{transform:"translateX(10px)"},{transform:"translateX(-10px)"},{transform:"translateX(0)"}],{duration:400,easing:"ease-in-out"})}}catch(x){if(console.error("Login error:",x),a(t.t("auth.connection_error"),"error"),f)f.disabled=!1,f.textContent=t.t("auth.sign_in")}})});
