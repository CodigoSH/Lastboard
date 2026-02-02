var R=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var q=`:host {
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
}`;class D extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}render(){this.shadowRoot.innerHTML=`
            <style>${q}</style>
            ${R()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",D);var G=`:host {
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
}`;class V extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(o){if(this.getAttribute("type")==="submit"){let a=this.closest("form");if(a)if(a.requestSubmit)a.requestSubmit();else a.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(o){this._loading=o,this.render()}get loading(){return this._loading}render(){let o=this.getAttribute("variant")||"ghost",a=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${G}</style>
            <button class="btn btn--${o}" ${this._loading?"disabled":""}>
                ${a}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",V);var y=({src:o,initials:a,alt:d})=>`
    <div class="avatar" title="${d}">
        ${o?`<img src="${o}" alt="${d}" class="avatar__img">`:`<span class="avatar__initials">${a}</span>`}
    </div>
`;var N=`:host {
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
}`;class U extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(o,a,d){if(a!==d)this.render()}render(){let o=this.getAttribute("src"),a=this.getAttribute("initials")||"??",d=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${N}</style>
            ${y({src:o||void 0,initials:a,alt:d})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",U);var A=()=>`
    <div class="toast-container"></div>
`;var F=`.toast-container {
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
}`;class J extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this}show(o,a="success"){let d=this.shadowRoot.querySelector(".toast-container");if(!d)return;let f=document.createElement("div");f.className=`toast toast--${a}`,f.textContent=o,d.appendChild(f),requestAnimationFrame(()=>{f.style.opacity="1",f.style.transform="translateY(0)"}),setTimeout(()=>{f.style.opacity="0",f.style.transform="translateY(20px)",setTimeout(()=>f.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${F}</style>
            ${A()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",J);var g=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class ${currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("csh_lang"),a=navigator.language.split("-")[0],d="en";if(o&&g.find((f)=>f.code===o))d=o;else if(g.find((f)=>f.code===a))d=a;if(d!=="en")await this.loadLocale(d);this.currentLanguage=d,this.notifyListeners()}static getInstance(){if(!$.instance)$.instance=new $;return $.instance}getLocale(){return{...g.find((a)=>a.code===this.currentLanguage)||g[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){return g}async loadLocale(o){if(this.cache.has(o))return;try{let a=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!a.ok)throw Error(`Failed to load locale ${o}`);let d=await a.json();this.cache.set(o,d)}catch(a){console.error(a)}}async setLanguage(o){if(g.find((a)=>a.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("csh_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,a){let d=this.cache.get(this.currentLanguage),f=this.cache.get("en"),n=d?.[o];if(!n&&f)n=f[o];if(!n)return o;if(a)Object.keys(a).forEach((c)=>{n=n.replace(`{${c}}`,a[c])});return n}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((a)=>a!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((a)=>a(o))}async ensureInitialized(){return this.initialized}}var t=$.getInstance();async function K(o){try{await t.ensureInitialized(),await o()}catch(a){console.error("[Bootstrap] Critical failure:",a),document.body.innerHTML=`
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
        `}}class u{static STORAGE_KEY="kashboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,a,d){let f="";if(d){let n=new Date;n.setTime(n.getTime()+d*24*60*60*1000),f="; expires="+n.toUTCString()}document.cookie=o+"="+(a||"")+f+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let a=await o.json();if(a.theme==="dark")this.enableDark();else if(a.theme==="light")this.enableLight()}}catch(o){}}}K(async()=>{let o=1,a=3,d="/images/default-avatar.svg",f=document.querySelector(".setup-container"),n=document.getElementById("setupForm"),c=document.getElementById("nextBtn"),p=document.getElementById("backBtn"),E=document.getElementById("feedback"),b=document.getElementById("language"),w=document.getElementById("username"),z=document.getElementById("password"),Q=document.getElementById("confirmPassword"),l={light:document.getElementById("themeLight"),dark:document.getElementById("themeDark")},_=t.getAvailableLocales(),M=navigator.language.split("-")[0];if(!_.find((r)=>r.code===M))M="en";if(b)_.forEach((r)=>{let i=document.createElement("option");if(i.value=r.code,i.textContent=`${r.flag} ${r.name}`,r.code===M)i.selected=!0;b.appendChild(i)}),t.setLanguage(M),b.addEventListener("change",(r)=>{let i=r.target.value;t.setLanguage(i),H()});if(u.init(),u.isDark())l.dark?.classList.add("selected"),l.light?.classList.remove("selected");else l.light?.classList.add("selected"),l.dark?.classList.remove("selected");function X(r){if(Object.entries(l).forEach(([i,s])=>{if(s)i===r?s.classList.add("selected"):s.classList.remove("selected")}),r==="dark")u.enableDark();else u.enableLight()}Object.entries(l).forEach(([r,i])=>{if(i)i.addEventListener("click",()=>X(r))});let I=["https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/pi-hole.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png"],C=document.getElementById("avatarInput"),j=document.getElementById("avatarTrigger"),Z=document.getElementById("avatarPreview"),P=document.getElementById("avatarUrl");if(j&&C)j.addEventListener("click",()=>C.click()),C.addEventListener("change",(r)=>{let i=r.target.files?.[0];if(i){let s=new FileReader;s.onload=(h)=>{let m=h.target?.result;if(m)Z.setAttribute("src",m),P.value=m,d=m},s.readAsDataURL(i)}});let H=()=>{let r=(s,h)=>{let m=document.getElementById(s);if(m)m.textContent=t.t(h)};r("pageSubtitle","setup.subtitle");let i=(s,h)=>{let m=document.querySelector(`label[for="${s}"]`);if(m)m.textContent=t.t(h)};if(i("language","settings.language"),i("username","setup.root_user"),i("password","settings.new_password"),i("confirmPassword","settings.confirm_password"),r("lblInterfaceTheme","setup.interface_theme"),r("lblThemeLight","settings.light"),r("lblThemeDark","settings.dark"),r("summaryKeyLang","settings.language"),r("summaryKeyTheme","settings.theme"),r("summaryKeyAdmin","setup.summary_admin"),o===3)c.textContent=t.t("setup.create_admin");else c.textContent=t.t("general.next");if(p)p.textContent=t.t("general.back");r("changeImageText","action.change_image"),r("readyMsg","setup.ready_msg")};t.subscribe(H),H();function Y(){let r=document.getElementById("progressFill");if(r)r.style.width=`${(o-1)/(a-1)*100}%`;if(document.querySelectorAll(".step-dot").forEach((s)=>{let h=parseInt(s.getAttribute("data-step")||"0");if(s.classList.remove("active","completed"),h===o)s.classList.add("active");if(h<o)s.classList.add("completed")}),document.querySelectorAll(".wizard-step").forEach((s)=>s.classList.remove("active")),document.getElementById(`step${o}`)?.classList.add("active"),p)p.style.display=o===1?"none":"block";p.textContent=t.t("general.back");let i=t.t("general.next");if(c.textContent=o===a?t.t("setup.create_admin"):i,o===3){document.getElementById("summaryLang").textContent=b.options[b.selectedIndex].text;let s=t.t("settings.system")||"System";if(l.light?.classList.contains("selected"))s=t.t("settings.light");if(l.dark?.classList.contains("selected"))s=t.t("settings.dark");document.getElementById("summaryTheme").textContent=s,document.getElementById("summaryUser").textContent=w.value}E.style.display="none",c.removeAttribute("disabled")}function W(){if(E.style.display="none",o===1)return!0;if(o===2){let r=w.value.trim(),i=z.value,s=Q.value;if(r.length<3)return x(t.t("setup.error_username"),"error"),!1;if(i.length<8)return x(t.t("setup.error_password"),"error"),!1;if(i!==s)return x(t.t("notifier.password_mismatch")||"Passwords do not match","error"),!1;return!0}return!0}function B(r){E.style.display="block",E.textContent=r}c.addEventListener("click",async()=>{if(!W())return;if(o<a)o++,Y();else await O()}),p.addEventListener("click",()=>{if(o>1)o--,Y()}),document.addEventListener("keydown",(r)=>{if(r.key==="Enter")r.preventDefault(),c.click()});function x(r,i="success"){if(window.notifier)window.notifier.show(r,i);else console.log(`[${i}] ${r}`)}async function O(){c.textContent=t.t("setup.creating"),c.setAttribute("disabled","true");let r="dark";if(l.light?.classList.contains("selected"))r="light";if(l.dark?.classList.contains("selected"))r="dark";let i={username:w.value.trim(),password:z.value,language:b.value,theme:r,avatar_url:d};try{let s=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(s.ok)localStorage.setItem("csh_lang",i.language),c.textContent=t.t("setup.welcome_admin"),c.style.backgroundColor="var(--accent-alt, #00f5a0)",x(t.t("setup.welcome_admin"),"success"),setTimeout(()=>window.location.href="/",1000);else{let h=await s.text();x(`${t.t("setup.failed")}: ${h}`,"error"),c.removeAttribute("disabled"),c.textContent=t.t("setup.create_admin")}}catch(s){console.error(s),x(t.t("setup.error_connection"),"error"),c.removeAttribute("disabled")}}requestAnimationFrame(()=>f.style.opacity="1")});
