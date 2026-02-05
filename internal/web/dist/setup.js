var Y=()=>`
    <div class="paper">
        <slot></slot>
    </div>
`;var _=`:host {
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
            <style>${_}</style>
            ${Y()}
        `}}if(!customElements.get("app-paper"))customElements.define("app-paper",D);var H=`:host {
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
}`;class q extends HTMLElement{static get observedAttributes(){return["variant"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),this.addEventListener("click",this.handleClick.bind(this))}handleClick(o){if(this.getAttribute("type")==="submit"){let r=this.closest("form");if(r)if(r.requestSubmit)r.requestSubmit();else r.submit()}}attributeChangedCallback(){this.render()}_loading=!1;set loading(o){this._loading=o,this.render()}get loading(){return this._loading}render(){let o=this.getAttribute("variant")||"ghost",r=this._loading?"Loading...":"<slot></slot>";this.shadowRoot.innerHTML=`
            <style>${H}</style>
            <button class="btn btn--${o}" ${this._loading?"disabled":""}>
                ${r}
            </button>
        `}}if(!customElements.get("app-button"))customElements.define("app-button",q);var R=({src:o,initials:r,alt:a})=>`
    <div class="avatar" title="${a}">
        ${o?`<img src="${o}" alt="${a}" class="avatar__img">`:`<span class="avatar__initials">${r}</span>`}
    </div>
`;var G=`:host {
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
}`;class N extends HTMLElement{static get observedAttributes(){return["src","alt","initials"]}constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render()}attributeChangedCallback(o,r,a){if(r!==a)this.render()}render(){let o=this.getAttribute("src"),r=this.getAttribute("initials")||"??",a=this.getAttribute("alt")||"User Avatar";this.shadowRoot.innerHTML=`
            <style>${G}</style>
            ${R({src:o||void 0,initials:r,alt:a})}
        `}}if(!customElements.get("app-avatar"))customElements.define("app-avatar",N);var J=()=>`
    <div class="toast-container"></div>
`;var Q=`.toast-container {
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
}`;class U extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"})}connectedCallback(){this.render(),window.notifier=this,window.addEventListener("drawer-open",()=>this.shift(!0)),window.addEventListener("drawer-close",()=>this.shift(!1))}shift(o){let r=this.shadowRoot.querySelector(".toast-container");if(r)if(o)r.classList.add("toast-container--shifted");else r.classList.remove("toast-container--shifted")}show(o,r="success"){let a=this.shadowRoot.querySelector(".toast-container");if(!a)return;let d=document.createElement("div");d.className=`toast toast--${r}`,d.textContent=o,a.appendChild(d),requestAnimationFrame(()=>{d.style.opacity="1",d.style.transform="translateY(0)"}),setTimeout(()=>{d.style.opacity="0",d.style.transform="translateY(20px)",setTimeout(()=>d.remove(),300)},3000)}render(){this.shadowRoot.innerHTML=`
            <style>${Q}</style>
            ${J()}
        `}}if(!customElements.get("app-notifier"))customElements.define("app-notifier",U);var k=`:host {
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
}`;class X extends HTMLElement{_options=[];_value="";isOpen=!1;_boundOutsideClick;dropdownEl=null;_boundScroll;_boundResize;isInsideDialog=!1;static get observedAttributes(){return["value"]}constructor(){super();this.attachShadow({mode:"open"}),this._boundOutsideClick=this.handleOutsideClick.bind(this),this._boundScroll=(o)=>{if(this.dropdownEl&&this.dropdownEl.contains(o.target))return;this.close()},this._boundResize=this.close.bind(this)}connectedCallback(){this.ensureGlobalStyles(),this.render(),this.isInsideDialog=!!this.closest("dialog"),document.addEventListener("click",this._boundOutsideClick,!0),window.addEventListener("scroll",this._boundScroll,!0),window.addEventListener("resize",this._boundResize)}disconnectedCallback(){this.close(),document.removeEventListener("click",this._boundOutsideClick,!0),window.removeEventListener("scroll",this._boundScroll,!0),window.removeEventListener("resize",this._boundResize)}ensureGlobalStyles(){if(!document.getElementById("app-select-portal-css")){let o=document.createElement("style");o.id="app-select-portal-css",o.textContent=k,document.head.appendChild(o)}}get value(){return this._value}set value(o){if(this._value!==o)this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay()}set options(o){this._options=o,this.updateTriggerDisplay()}attributeChangedCallback(o,r,a){if(o==="value"&&r!==a)this._value=a,this.updateTriggerDisplay()}updateTriggerDisplay(){if(!this.shadowRoot)return;let o=this.shadowRoot.querySelector(".select-value");if(o){let r=this._options.find((a)=>a.value===this._value)||this._options[0];o.textContent=r?r.label:"Select..."}}toggle(){if(this.isOpen)this.close();else this.open()}open(){if(this.isOpen)return;if(this.close(),this.isOpen=!0,this.setAttribute("open",""),this.dropdownEl=document.createElement("div"),this.dropdownEl.className="select-dropdown",this.dropdownEl.innerHTML=this._options.map((o)=>`
            <div class="select-option ${o.value===this._value?"selected":""}" 
                 data-value="${o.value}">
                 ${o.label}
            </div>
        `).join(""),this.dropdownEl.querySelectorAll(".select-option").forEach((o)=>{o.addEventListener("click",(r)=>{r.stopPropagation();let a=r.currentTarget.dataset.value;if(a)this.selectOption(a)})}),this.isInsideDialog)this.dropdownEl.style.position="absolute",this.dropdownEl.style.left="0",this.dropdownEl.style.right="0",this.dropdownEl.style.top="100%",this.dropdownEl.style.marginTop="6px",this.shadowRoot.appendChild(this.dropdownEl);else{let o=this.shadowRoot.getElementById("trigger");if(o){let r=o.getBoundingClientRect();this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${r.bottom+6}px`,this.dropdownEl.style.left=`${r.left}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}document.body.appendChild(this.dropdownEl)}requestAnimationFrame(()=>{if(this.dropdownEl)this.dropdownEl.classList.add("open")})}positionPortal(){if(!this.dropdownEl||!this.shadowRoot)return;let o=this.shadowRoot.getElementById("trigger");if(!o)return;let r=o.getBoundingClientRect(),a=r.bottom+6,d=r.left,l=300;if(a+l>window.innerHeight&&r.top-l>0)a=r.top-6-l;this.dropdownEl.style.position="fixed",this.dropdownEl.style.top=`${a}px`,this.dropdownEl.style.left=`${d}px`,this.dropdownEl.style.width=`${r.width}px`,this.dropdownEl.style.zIndex="99999"}close(){if(this.dropdownEl)this.dropdownEl.remove(),this.dropdownEl=null;this.isOpen=!1,this.removeAttribute("open")}handleOutsideClick(o){if(!this.isOpen)return;let r=o.composedPath();if(r.includes(this))return;if(this.dropdownEl&&r.includes(this.dropdownEl))return;this.close()}selectOption(o){this._value=o,this.setAttribute("value",o),this.updateTriggerDisplay(),this.dispatchEvent(new CustomEvent("change",{detail:o,bubbles:!0})),this.close()}render(){if(!this.shadowRoot)return;let o=this._options.find((a)=>a.value===this._value)||this._options[0],r=o?o.label:"Select...";this.shadowRoot.innerHTML=`
            <style>${k}</style>
            <div class="select-wrapper">
                <div class="select-trigger" id="trigger">
                    <div class="select-value">
                        ${r}
                    </div>
                    <svg class="select-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
            </div>
        `,this.shadowRoot.getElementById("trigger")?.addEventListener("click",(a)=>{a.stopPropagation(),this.toggle()})}}if(!customElements.get("app-select"))customElements.define("app-select",X);var p=[{code:"en",name:"English",flag:"\uD83C\uDDFA\uD83C\uDDF8"},{code:"zh",name:"简体中文",flag:"\uD83C\uDDE8\uD83C\uDDF3"},{code:"hi",name:"हिन्दी",flag:"\uD83C\uDDEE\uD83C\uDDF3"},{code:"es",name:"Español",flag:"\uD83C\uDDEA\uD83C\uDDF8"},{code:"ar",name:"العربية",flag:"\uD83C\uDDF8\uD83C\uDDE6"},{code:"fr",name:"Français",flag:"\uD83C\uDDEB\uD83C\uDDF7"},{code:"bn",name:"Bengali",flag:"\uD83C\uDDE7\uD83C\uDDE9"},{code:"pt",name:"Português",flag:"\uD83C\uDDF5\uD83C\uDDF9"},{code:"ru",name:"Русский",flag:"\uD83C\uDDF7\uD83C\uDDFA"},{code:"de",name:"Deutsch",flag:"\uD83C\uDDE9\uD83C\uDDEA"},{code:"ja",name:"日本語",flag:"\uD83C\uDDEF\uD83C\uDDF5"},{code:"it",name:"Italiano",flag:"\uD83C\uDDEE\uD83C\uDDF9"},{code:"tr",name:"Turkish",flag:"\uD83C\uDDF9\uD83C\uDDF7"},{code:"ko",name:"한국어",flag:"\uD83C\uDDF0\uD83C\uDDF7"},{code:"id",name:"Indonesian",flag:"\uD83C\uDDEE\uD83C\uDDE9"},{code:"pl",name:"Polski",flag:"\uD83C\uDDF5\uD83C\uDDF1"},{code:"ur",name:"Urdu",flag:"\uD83C\uDDF5\uD83C\uDDF0"},{code:"nl",name:"Nederlands",flag:"\uD83C\uDDF3\uD83C\uDDF1"},{code:"fa",name:"Persian",flag:"\uD83C\uDDEE\uD83C\uDDF7"},{code:"el",name:"Greek",flag:"\uD83C\uDDEC\uD83C\uDDF7"}];class x{currentLanguage="en";cache=new Map;listeners=[];static instance;initialized;constructor(){this.initialized=this.init()}async init(){await this.loadLocale("en");let o=localStorage.getItem("kashboard_lang"),r=navigator.language.split("-")[0],a="en";if(o&&p.find((d)=>d.code===o))a=o;else if(p.find((d)=>d.code===r))a=r;if(a!=="en")await this.loadLocale(a);this.currentLanguage=a,this.notifyListeners()}static getInstance(){if(!x.instance)x.instance=new x;return x.instance}getLocale(){return{...p.find((r)=>r.code===this.currentLanguage)||p[0],translations:this.cache.get(this.currentLanguage)||{}}}getAvailableLocales(){let o=(a)=>/^[a-zA-Z]/.test(a);return[...p].sort((a,d)=>{let l=o(a.name),c=o(d.name);if(l&&!c)return-1;if(!l&&c)return 1;return a.name.localeCompare(d.name,void 0,{sensitivity:"base"})})}async loadLocale(o){if(this.cache.has(o))return;try{let r=await fetch(`/locales/${o}.json?v=${new Date().getTime()}`);if(!r.ok)throw Error(`Failed to load locale ${o}`);let a=await r.json();this.cache.set(o,a)}catch(r){console.error(r)}}async setLanguage(o){if(p.find((r)=>r.code===o))await this.loadLocale(o),this.currentLanguage=o,localStorage.setItem("kashboard_lang",o),this.notifyListeners();else console.warn(`[I18n] Language ${o} not supported`)}t(o,r){let a=this.cache.get(this.currentLanguage),d=this.cache.get("en"),l=a?.[o];if(!l&&d)l=d[o];if(!l)return o;if(r)Object.keys(r).forEach((c)=>{l=l.replace(`{${c}}`,r[c])});return l}subscribe(o){return this.listeners.push(o),o(this.getLocale()),()=>{this.listeners=this.listeners.filter((r)=>r!==o)}}notifyListeners(){let o=this.getLocale();this.listeners.forEach((r)=>r(o))}async ensureInitialized(){return this.initialized}}var n=x.getInstance();async function Z(o){try{await n.ensureInitialized(),await o()}catch(r){console.error("[Bootstrap] Critical failure:",r),document.body.innerHTML=`
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
        `}}class m{static STORAGE_KEY="kashboard_theme";static CLASS_NAME="dark-mode";static init(){let o=localStorage.getItem(this.STORAGE_KEY);if(o==="dark")this.enableDark();else if(o==="light")this.enableLight();else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)this.enableDark();else this.enableLight()}static enableDark(){document.documentElement.classList.add(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"dark"),this.setCookie(this.STORAGE_KEY,"dark",365)}static enableLight(){document.documentElement.classList.remove(this.CLASS_NAME),localStorage.setItem(this.STORAGE_KEY,"light"),this.setCookie(this.STORAGE_KEY,"light",365)}static toggle(){if(document.documentElement.classList.contains(this.CLASS_NAME))this.enableLight();else this.enableDark()}static isDark(){return document.documentElement.classList.contains(this.CLASS_NAME)}static setCookie(o,r,a){let d="";if(a){let l=new Date;l.setTime(l.getTime()+a*24*60*60*1000),d="; expires="+l.toUTCString()}document.cookie=o+"="+(r||"")+d+"; path=/"}static async sync(){try{let o=await fetch("/api/me");if(o.ok){let r=await o.json();if(r.theme==="dark")this.enableDark();else if(r.theme==="light")this.enableLight()}}catch(o){}}}Z(async()=>{let o=1,r=3,a="/images/default-avatar.svg",d=document.querySelector(".setup-container"),l=document.getElementById("setupForm"),c=document.getElementById("nextBtn"),h=document.getElementById("backBtn"),w=document.getElementById("feedback"),u=document.getElementById("language"),z=document.getElementById("username"),M=document.getElementById("password"),F=document.getElementById("confirmPassword"),g={light:document.getElementById("themeLight"),dark:document.getElementById("themeDark")},C=n.getAvailableLocales(),v=navigator.language.split("-")[0];if(!C.find((t)=>t.code===v))v="en";if(u){let t=u;t.options=C.map((s)=>({value:s.code,label:`${s.flag} ${s.name}`})),t.value=v,n.setLanguage(v),u.addEventListener("change",(s)=>{let i=s.target.value;n.setLanguage(i),y()})}if(m.init(),m.isDark())g.dark?.classList.add("selected"),g.light?.classList.remove("selected");else g.light?.classList.add("selected"),g.dark?.classList.remove("selected");function A(t){if(Object.entries(g).forEach(([s,i])=>{if(i)s===t?i.classList.add("selected"):i.classList.remove("selected")}),t==="dark")m.enableDark();else m.enableLight()}Object.entries(g).forEach(([t,s])=>{if(s)s.addEventListener("click",()=>A(t))});let S=["https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/proxmox.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/pi-hole.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png","https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/docker.png"],$=document.getElementById("avatarInput"),E=document.getElementById("avatarTrigger"),K=document.getElementById("avatarPreview"),P=document.getElementById("avatarUrl");if(E&&$)E.addEventListener("click",()=>$.click()),$.addEventListener("change",(t)=>{let s=t.target.files?.[0];if(s){let i=new FileReader;i.onload=(f)=>{let b=f.target?.result;if(b)K.setAttribute("src",b),P.value=b,a=b},i.readAsDataURL(s)}});let y=()=>{let t=(i,f)=>{let b=document.getElementById(i);if(b)b.textContent=n.t(f)};t("pageSubtitle","setup.subtitle");let s=(i,f)=>{let b=document.querySelector(`label[for="${i}"]`);if(b)b.textContent=n.t(f)};if(s("language","settings.language"),s("username","setup.root_user"),s("password","settings.new_password"),s("confirmPassword","settings.confirm_password"),t("lblInterfaceTheme","setup.interface_theme"),t("lblThemeLight","settings.light"),t("lblThemeDark","settings.dark"),t("summaryKeyLang","settings.language"),t("summaryKeyTheme","settings.theme"),t("summaryKeyAdmin","setup.summary_admin"),o===3)c.textContent=n.t("setup.create_admin");else c.textContent=n.t("general.next");if(h)h.textContent=n.t("general.back");t("changeImageText","action.change_image"),t("readyMsg","setup.ready_msg")};n.subscribe(y),y();function j(){let t=document.getElementById("progressFill");if(t)t.style.width=`${(o-1)/(r-1)*100}%`;if(document.querySelectorAll(".step-dot").forEach((i)=>{let f=parseInt(i.getAttribute("data-step")||"0");if(i.classList.remove("active","completed"),f===o)i.classList.add("active");if(f<o)i.classList.add("completed")}),document.querySelectorAll(".wizard-step").forEach((i)=>i.classList.remove("active")),document.getElementById(`step${o}`)?.classList.add("active"),h)h.style.display=o===1?"none":"block";h.textContent=n.t("general.back");let s=n.t("general.next");if(c.textContent=o===r?n.t("setup.create_admin"):s,o===3)try{let i=n.getLocale();if(i)document.getElementById("summaryLang").textContent=`${i.flag} ${i.name}`;let f=n.t("settings.system");if(g.light?.classList.contains("selected"))f=n.t("settings.light");if(g.dark?.classList.contains("selected"))f=n.t("settings.dark");document.getElementById("summaryTheme").textContent=f,document.getElementById("summaryUser").textContent=z.value||"admin"}catch(i){console.error("Error updating summary:",i)}w.style.display="none",c.removeAttribute("disabled")}function W(){if(w.style.display="none",o===1)return!0;if(o===2){let t=z.value.trim(),s=M.value,i=F.value;if(t.length<2)return e(n.t("setup.error_username"),"error"),!1;if(s.length<4)return e(n.t("setup.error_password"),"error"),!1;if(s!==i)return e(n.t("notifier.password_mismatch")||"Passwords do not match","error"),!1;return!0}return!0}function oo(t){w.style.display="block",w.textContent=t}c.addEventListener("click",async()=>{if(!W())return;if(o<r)o++,j();else await V()}),h.addEventListener("click",()=>{if(o>1)o--,j()}),document.addEventListener("keydown",(t)=>{if(t.key==="Enter")t.preventDefault(),c.click()});function e(t,s="success"){if(window.notifier)window.notifier.show(t,s);else console.log(`[${s}] ${t}`)}async function V(){c.textContent=n.t("setup.creating"),c.setAttribute("disabled","true");let t="dark";if(g.light?.classList.contains("selected"))t="light";if(g.dark?.classList.contains("selected"))t="dark";let s={username:z.value.trim(),password:M.value,language:u.value,theme:t,avatar_url:a};try{let i=await fetch("/api/setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(i.ok)localStorage.setItem("kashboard_lang",s.language),c.textContent=n.t("setup.welcome_admin"),c.style.backgroundColor="var(--accent-alt, #00f5a0)",e(n.t("setup.welcome_admin"),"success"),setTimeout(()=>window.location.href="/",1000);else{let f=(await i.text()).trim();e(`${n.t("setup.failed")}: ${n.t(f)||f}`,"error"),c.removeAttribute("disabled"),c.textContent=n.t("setup.create_admin")}}catch(i){console.error(i),e(n.t("setup.error_connection"),"error"),c.removeAttribute("disabled")}}requestAnimationFrame(()=>d.style.opacity="1")});
