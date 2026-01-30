var x=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var i=`:host {
    display: block;
}

.paper {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--spacing-md);
    color: var(--text-main);
    box-sizing: border-box;
}`;class m extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${i}</style>
            ${x()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",m);var b=`:host {
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
}`;class s extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(a){if(this.getAttribute("type")==="submit"){let d=this.closest("form");if(d)if(d.requestSubmit)d.requestSubmit();else d.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(a){this._loading=a,this.render()}get loading(){return this._loading}render(){let a=this.getAttribute("variant")||"ghost",d=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${b}</style>
            <button class="btn btn--${a}" ${this._loading?"disabled":""}>
                ${d}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",s);var h=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class n{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let a=localStorage.getItem("csh_lang"),d=navigator.language.split("-")[0],o="en";if(a&&h.find((r)=>r.code===a))o=a;else if(h.find((r)=>r.code===d))o=d;if(o!=="en")await this.loadLocale(o);this.currentLanguage=o,this.notifyListeners()}static getInstance(){if(!n.instance)n.instance=new n;return n.instance}getLocale(){return{...h.find((d)=>d.code===this.currentLanguage)||h[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){return h}async loadLocale(a){if(this.cache.has(a))return;try{let d=await fetch(`/locales/${a}.json?v=${new Date().getTime()}`);if(!d.ok)throw Error(`Failed to load locale ${a}`);let o=await d.json();this.cache.set(a,o)}catch(d){console.error(d)}}async setLanguage(a){if(h.find((d)=>d.code===a))await this.loadLocale(a),this.currentLanguage=a,localStorage.setItem("csh_lang",a),this.notifyListeners();else console.warn(`[I18n] Language ${a} not supported`)}t(a,d){let o=this.cache.get(this.currentLanguage),r=this.cache.get("en"),p=o?.[a];if(!p&&r)p=r[a];if(!p)return a;if(d)Object.keys(d).forEach((l)=>{p=p.replace(`{${l}}`,d[l])});return p}subscribe(a){return this.listeners.push(a),a(this.getLocale()),()=>{this.listeners=this.listeners.filter((d)=>d!==a)}}notifyListeners(){let a=this.getLocale();this.listeners.forEach((d)=>d(a))}async ensureInitialized(){return this.initialized}}var g=n.getInstance();async function u(a){try{await g.ensureInitialized(),await a()}catch(d){console.error("[Bootstrap] Critical failure:",d),document.body.innerHTML=`
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
        `}}u(async()=>{let a=document.getElementById("loginForm"),d=document.getElementById("feedback"),o=document.getElementById("submitBtn"),r=document.querySelector(".login-container, .setup-container");if(r)r.style.opacity="0",r.style.transition="opacity 0.3s ease";if(!a)return;(()=>{if(document.querySelector("h1").textContent=g.t("auth.welcome"),document.querySelector(".subtitle").textContent=g.t("auth.subtitle"),document.querySelector('label[for="username"]').textContent=g.t("auth.username"),document.querySelector('label[for="password"]').textContent=g.t("auth.password"),o)o.textContent=g.t("auth.sign_in");requestAnimationFrame(()=>{if(r)r.style.opacity="1"})})(),a.addEventListener("keydown",(l)=>{if(l.key==="Enter")if(l.preventDefault(),a.requestSubmit)a.requestSubmit();else a.submit()}),a.addEventListener("submit",async(l)=>{if(l.preventDefault(),d.style.display="none",d.textContent="",o)o.loading=!0;let c=new FormData(a),z=Object.fromEntries(c.entries());try{let f=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(z)});if(f.ok)window.location.href="/";else{let E=await f.text();if(d.textContent=E||g.t("auth.invalid_credentials"),d.style.display="block",o)o.loading=!1;document.querySelector(".setup-container").animate([{transform:"translateX(0)"},{transform:"translateX(-10px)"},{transform:"translateX(10px)"},{transform:"translateX(-10px)"},{transform:"translateX(0)"}],{duration:400,easing:"ease-in-out"})}}catch(f){if(console.error("Login error:",f),d.textContent=g.t("auth.connection_error"),d.style.display="block",o)o.loading=!1}})});
