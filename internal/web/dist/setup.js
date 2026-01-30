var V=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var $=`:host {
    display: block;
}

.paper {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: var(--spacing-md);
    color: var(--text-main);
    box-sizing: border-box;
}`;class q extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${$}</style>
            ${V()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",q);var G=`:host {
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
}`;class J extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(d){if(this.getAttribute("type")==="submit"){let r=this.closest("form");if(r)if(r.requestSubmit)r.requestSubmit();else r.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(d){this._loading=d,this.render()}get loading(){return this._loading}render(){let d=this.getAttribute("variant")||"ghost",r=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${G}</style>
            <button class="btn btn--${d}" ${this._loading?"disabled":""}>
                ${r}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",J);var g=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class i{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let d=localStorage.getItem("csh_lang"),r=navigator.language.split("-")[0],p="en";if(d&&g.find((x)=>x.code===d))p=d;else if(g.find((x)=>x.code===r))p=r;if(p!=="en")await this.loadLocale(p);this.currentLanguage=p,this.notifyListeners()}static getInstance(){if(!i.instance)i.instance=new i;return i.instance}getLocale(){return{...g.find((r)=>r.code===this.currentLanguage)||g[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){return g}async loadLocale(d){if(this.cache.has(d))return;try{let r=await fetch(`/locales/${d}.json?v=${new Date().getTime()}`);if(!r.ok)throw Error(`Failed to load locale ${d}`);let p=await r.json();this.cache.set(d,p)}catch(r){console.error(r)}}async setLanguage(d){if(g.find((r)=>r.code===d))await this.loadLocale(d),this.currentLanguage=d,localStorage.setItem("csh_lang",d),this.notifyListeners();else console.warn(`[I18n] Language ${d} not supported`)}t(d,r){let p=this.cache.get(this.currentLanguage),x=this.cache.get("en"),o=p?.[d];if(!o&&x)o=x[d];if(!o)return d;if(r)Object.keys(r).forEach((m)=>{o=o.replace(`{${m}}`,r[m])});return o}subscribe(d){return this.listeners.push(d),d(this.getLocale()),()=>{this.listeners=this.listeners.filter((r)=>r!==d)}}notifyListeners(){let d=this.getLocale();this.listeners.forEach((r)=>r(d))}async ensureInitialized(){return this.initialized}}var h=i.getInstance();async function K(d){try{await h.ensureInitialized(),await d()}catch(r){console.error("[Bootstrap] Critical failure:",r),document.body.innerHTML=`
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
        `}}K(async()=>{let d=document.getElementById("setupForm"),r=document.getElementById("submitBtn"),p=document.getElementById("username"),x=document.getElementById("password"),o=document.getElementById("language"),m=document.getElementById("feedback");if(!d||!r)return;let z=h.getAvailableLocales(),D=navigator.language.split("-")[0],M="en";if(z.find((f)=>f.code===D))M=D;if(o)z.forEach((f)=>{let a=document.createElement("option");if(a.value=f.code,a.textContent=`${f.flag} ${f.name}`,f.code===M)a.selected=!0;o.appendChild(a)}),h.setLanguage(M),o.addEventListener("change",(f)=>{let T=f.target.value;h.setLanguage(T),y()});let y=()=>{document.querySelector("h1").textContent=h.t("app.title"),document.querySelector(".subtitle").textContent=h.t("setup.subtitle"),document.querySelector('label[for="username"]').textContent=h.t("setup.root_user"),document.querySelector('label[for="password"]').textContent=h.t("setup.passkey");let f=document.querySelector('label[for="language"]');if(f)f.textContent=h.t("settings.language")||"Language";if(r)r.textContent=h.t("setup.create_admin")};h.subscribe(()=>{y();let f=document.querySelector(".setup-container");if(f)requestAnimationFrame(()=>f.style.opacity="1")}),y(),d.addEventListener("keydown",(f)=>{if(f.key==="Enter")if(f.preventDefault(),d.requestSubmit)d.requestSubmit();else d.submit()}),d.addEventListener("submit",async(f)=>{f.preventDefault(),m.style.display="none",m.textContent="",r.textContent=h.t("setup.creating"),r.setAttribute("disabled","true");let a=p.value.trim(),T=x.value,H=o?o.value:M;if(a.length<3){b(h.t("setup.error_username")),u();return}if(T.length<8){b(h.t("setup.error_password")),u();return}try{let j=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:a,password:T,language:H})});if(j.ok)localStorage.setItem("csh_lang",H),r.textContent=h.t("setup.welcome_admin"),r.style.backgroundColor="var(--accent-alt, #00f5a0)",setTimeout(()=>{window.location.href="/"},1000);else{let N=await j.text();b(`${h.t("setup.failed")}: ${N}`),u()}}catch(j){console.error(j),b(h.t("setup.error_connection")),u()}});function b(f){m.style.display="block",m.textContent=f,m.style.color="#ff6b6b"}function u(){r.textContent=h.t("setup.create_admin"),r.removeAttribute("disabled")}});
