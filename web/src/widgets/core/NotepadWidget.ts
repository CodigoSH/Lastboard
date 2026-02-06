
import { LitElement, html, css, PropertyValueMap } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';

import { dashboardStore } from '../../store/dashboardStore';
import { i18n } from '../../services/i18n';
import { htmlSanitizer } from '../../services/htmlSanitizer';
import { WidgetContentHelper } from '../../services/widgetContentHelper';
import './ChecklistBlock';
import type { ChecklistItem } from './ChecklistBlock';

// --- Icons (Lucide-style) ---
const ICONS = {
    bold: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>`,
    italic: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
    underline: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,
    strike: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,
    h1: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,
    h2: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,
    list: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    listOrdered: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
    checklist: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`,
    link: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    image: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    color: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16"/><path d="m6 16 6-12 6 12"/><path d="M8 12h8"/></svg>`,
    undo: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>`,
    redo: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>`,
    alignLeft: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
    alignCenter: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="17" y1="12" x2="7" y2="12"/><line x1="19" y1="18" x2="5" y2="18"/></svg>`,
    alignRight: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
    alignJustify: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
    code: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    clear: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
    edit: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
    save: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
    loader: html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
};

// Maximum content size (50KB of HTML)
const MAX_CONTENT_SIZE = 50000;

// Autosave delay (10 seconds - silent background save without interrupting editing)
const AUTOSAVE_DELAY = 10000;

@customElement('widget-notepad')
export class NotepadWidget extends LitElement {

    // External Attributes
    @property({ type: Number, attribute: 'item-id' }) itemId: number = 0;
    @property({ type: String }) content: string = '';

    // Internal State
    @state() private isInternalEditing: boolean = false;
    @state() private isDashboardEditing: boolean = false;
    @state() private isSaving: boolean = false;
    @state() private characterCount: number = 0;
    @state() private hasUnsavedChanges: boolean = false;
    @state() private checklistBlocks: Array<{ id: string; items: ChecklistItem[] }> = [];

    // DOM Query
    @query('.content-area.editor') editorElement!: HTMLElement;

    // Subscriptions & Cleanup
    private _unsubscribe: (() => void) | undefined;
    private _autosaveTimeout: ReturnType<typeof setTimeout> | null = null;
    private _savePromise: Promise<void> | null = null;
    private _lastSavedContent: string = '';

    static styles = css`
        :host {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: var(--surface);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            overflow: hidden;
            color: var(--text-main);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            position: relative;
        }

        .container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            overflow-x: hidden;
            position: relative;
            width: 100%;
            height: 100%;
            /* Ocultar scrollbar pero mantener funcionalidad */
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
        }

        .container::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
        }

        /* Ocultar scrollbars en todos los elementos scrollables */
        * {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
        }

        *::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
        }

        /* Toolbar */
        .toolbar {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            overflow-x: auto;
            flex-shrink: 0;
            min-height: 44px;
            mask-image: linear-gradient(to right, black 92%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black 92%, transparent 100%);
            transition: background 0.2s ease;
        }
        .toolbar:hover {
            background: rgba(255, 255, 255, 0.06);
        }
        .toolbar::-webkit-scrollbar { height: 0px; }

        .group {
            display: flex;
            align-items: center;
            gap: 2px;
            padding-right: 6px;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            margin-right: 4px;
            flex-shrink: 0;
        }
        .group:last-child { border-right: none; }

        button {
            background: transparent;
            border: none;
            color: var(--text-dim);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            height: 24px;
            transition: all 0.15s ease;
        }
        button:hover:not(:disabled) {
            background: var(--surface-hover);
            color: var(--text-main);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        button svg { width: 16px; height: 16px; }
        button.text-icon { font-weight: 700; font-size: 11px; width: auto; padding: 0 6px;}

        .color-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }
        .color-input {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            opacity: 0;
            cursor: pointer;
        }

        /* Fixed Controls Container */
        .fixed-controls {
            position: absolute;
            bottom: 0;
            right: 0;
            pointer-events: none;
            z-index: 200;
        }

        .fixed-controls > * {
            pointer-events: auto;
        }

        /* Character Counter (bottom right, below FAB button) */
        .char-counter-bottom {
            position: absolute;
            bottom: 15px;
            right: 15px;
            font-size: 11px;
            color: var(--text-secondary);
            background: var(--surface);
            padding: 4px 10px;
            border-radius: 12px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            opacity: 0.7;
            transition: opacity 0.2s;
            z-index: 100;
        }
        .char-counter-bottom:hover {
            opacity: 1;
        }
        .char-counter-bottom.warning {
            color: #ffa500;
            font-weight: 600;
        }
        .char-counter-bottom.error {
            color: #ff4757;
            font-weight: 700;
            opacity: 1;
        }

        /* Autosave Indicator */
        .autosave-indicator {
            font-size: 10px;
            color: var(--text-dim);
            padding: 0 6px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        .autosave-indicator.visible {
            opacity: 1;
        }
        .autosave-indicator.saving {
            color: #ffa500;
        }
        .autosave-indicator.saved {
            color: #2ecc71;
        }

        /* Content Area */
        .content-area {
            flex: 1;
            padding: 16px;
            padding-bottom: 60px;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-main) !important;
            word-break: break-word;
            outline: none;
            display: block;
            width: 100%;
            height: 100%;
            min-height: 0;
        }

        .content-area:empty::before {
            content: attr(data-placeholder);
            color: rgba(255, 255, 255, 0.3);
            font-style: italic;
            pointer-events: none;
        }

        /* FABs */
        .fab-btn {
            position: absolute;
            bottom: 70px; /* Moved up to make space for counter below */
            right: 15px;
            z-index: 100;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--accent, #0078d4);
            color: #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.1);
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            opacity: 0;
            transform: translateY(10px);
        }

        :host(:hover) .fab-btn:not(:disabled),
        .fab-btn:focus-visible {
            opacity: 1;
            transform: translateY(0);
        }

        .fab-btn:hover:not(:disabled) {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            filter: brightness(1.1);
        }

        .fab-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .edit-btn {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(4px);
            color: rgba(255,255,255,0.8);
        }
        .edit-btn:hover { background: var(--accent, #ff4757); color: white; }

        .save-btn {
            background: var(--accent, #ff4757);
            color: white;
        }
        .save-btn:hover:not(:disabled) { background: #ff6b81; }

        /* Spinner Animation */
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .fab-btn.saving svg {
            animation: spin 1s linear infinite;
        }

        /* Typography Styles */
        h1 { font-size: 1.6em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.2em; margin-top:0;}
        h2 { font-size: 1.4em; margin-top:0.5em;}
        a { color: var(--accent, #ff4757); }
        blockquote { border-left: 3px solid var(--accent, #ff4757); padding-left: 1em; color: rgba(255,255,255,0.6); }
        img { max-width: 100%; border-radius: 8px; }

        /* Code Block Styles */
        pre {
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 4px;
            font-family: monospace;
            margin: 8px 0;
            width: fit-content;
            max-width: 100%;
            overflow-x: auto;
            display: block;
        }
        pre code {
            background: transparent;
            padding: 0;
            display: block;
            width: fit-content;
        }

        /* Checklist Styles */
        .content-area input[type="checkbox"] {
            cursor: pointer;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }
        .content-area label {
            flex: 1;
            min-width: 0;
        }

        /* Error State */
        .error-state {
            padding: 20px;
            color: var(--text-main);
            text-align: center;
        }
        .error-state h3 {
            color: #ff4757;
            margin-top: 0;
        }
        .error-state button {
            margin-top: 16px;
            padding: 8px 16px;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            min-width: auto;
            height: auto;
        }
        .error-state details {
            margin-top: 16px;
            text-align: left;
        }
        .error-state pre {
            background: rgba(0,0,0,0.3);
            padding: 8px;
            border-radius: 4px;
            overflow: auto;
            font-size: 11px;
        }

        /* Checklist Block Wrapper */
        .checklist-block-wrapper {
            position: relative;
            width: 85%;
            margin: 12px 0;
            padding: 0 8px;
        }

        .delete-block-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s, background 0.2s;
            font-size: 20px;
            line-height: 1;
            z-index: 10;
        }

        .checklist-block-wrapper:hover .delete-block-btn {
            opacity: 1;
        }

        .delete-block-btn:hover {
            background: var(--error);
            color: white;
        }
    `;

    connectedCallback() {
        super.connectedCallback();

        // Subscribe to store
        this._unsubscribe = dashboardStore.subscribe((state) => {
            const wasEditing = this.isDashboardEditing;
            this.isDashboardEditing = state.isEditing || false;

            if (wasEditing !== this.isDashboardEditing) {
                if (this.isDashboardEditing) {
                    // Dashboard entering edit mode
                    if (this.hasUnsavedChanges && this.isInternalEditing) {
                        // Warn user about unsaved changes
                        const confirmDiscard = confirm(i18n.t('widget.notepad.confirm_discard'));
                        if (confirmDiscard) {
                            this.isInternalEditing = false;
                            this.hasUnsavedChanges = false;
                            this.cancelAutosave();
                            this.requestUpdate();
                        } else {
                            // Cancel dashboard edit mode
                            setTimeout(() => dashboardStore.toggleEditMode(), 0);
                        }
                    } else {
                        // Just exit internal edit mode
                        this.isInternalEditing = false;
                        this.cancelAutosave();
                        this.requestUpdate();
                    }
                } else {
                    // Dashboard exiting edit mode - reload content
                    this.loadFromStore();
                }
            }
        });

        // Initial Load
        const state = dashboardStore.getState();
        this.isDashboardEditing = state.isEditing || false;
        this.loadFromStore();
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        // Cleanup subscriptions
        if (this._unsubscribe) {
            this._unsubscribe();
        }

        // Cleanup timers
        this.cancelAutosave();
    }

    updated(changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>) {
        super.updated(changedProperties);

        // Sync external content prop to editor
        if (changedProperties.has('content') && !this.isInternalEditing && this.editorElement) {
            const sanitized = htmlSanitizer.sanitize(this.content);
            if (this.editorElement.innerHTML !== sanitized) {
                this.editorElement.innerHTML = sanitized;
            }
        }
    }

    private loadFromStore() {
        if (!this.itemId) return;

        const state = dashboardStore.getState();
        const item = state.items.find((i: any) => i.id === this.itemId);

        if (item) {
            // Parse content - supports both old format (string) and new format (object with html + checklists)
            const rawContent = WidgetContentHelper.getNotepadText(item.content);

            try {
                // Try to parse as new format (JSON with html + checklists)
                const parsed = JSON.parse(rawContent);
                if (parsed && typeof parsed === 'object' && 'html' in parsed) {
                    this.content = parsed.html || '';
                    this.checklistBlocks = parsed.checklists || [];
                } else {
                    // Old format - just HTML string
                    this.content = rawContent;
                    this.checklistBlocks = [];
                }
            } catch {
                // Not JSON - treat as plain HTML (old format)
                this.content = rawContent;
                this.checklistBlocks = [];
            }

            this.characterCount = this.content.length;
            this._lastSavedContent = rawContent;
        }
    }

    /**
     * Native execCommand wrapper
     * NOTE: execCommand is deprecated but still widely supported.
     * Migration to native Selection API would require significant refactoring.
     * Keeping this for now as it's the most practical solution for rich text editing.
     * TODO: Consider migrating to a native contenteditable solution in the future.
     */
    private exec(cmd: string, val?: string) {
        document.execCommand(cmd, false, val);
        if (this.editorElement) {
            this.editorElement.focus();
        }
    }

    private cancelAutosave() {
        if (this._autosaveTimeout) {
            clearTimeout(this._autosaveTimeout);
            this._autosaveTimeout = null;
        }
    }

    private async saveContent(silent: boolean = false) {
        // Prevent concurrent saves
        if (this._savePromise) {
            await this._savePromise;
            return;
        }

        try {
            const editor = this.shadowRoot?.querySelector('.editor') || this.shadowRoot?.querySelector('[contenteditable]');
            if (!editor) {
                throw new Error("Critical: Editor element missing");
            }

            const rawContent = (editor as HTMLElement).innerHTML;

            // Validate content size
            if (rawContent.length > MAX_CONTENT_SIZE) {
                alert(i18n.t('widget.notepad.error.too_large'));
                return;
            }

            // Sanitize HTML before saving
            const sanitizedHTML = htmlSanitizer.sanitize(rawContent);

            // Create combined content: HTML + Checklists
            const combinedContent = JSON.stringify({
                html: sanitizedHTML,
                checklists: this.checklistBlocks
            });

            // Update local state ONLY if not silent (to avoid re-renders during editing)
            if (!silent) {
                this.content = sanitizedHTML;
                this.characterCount = sanitizedHTML.length;
                this.isInternalEditing = false;
                this.hasUnsavedChanges = false;
                this.requestUpdate();
            }

            // Persist to backend
            this._savePromise = (async () => {
                if (!this.itemId) return;

                // Show saving indicator (causes minimal re-render)
                if (!silent) {
                    this.isSaving = true;
                    this.requestUpdate();
                }

                try {
                    const currentItem = dashboardStore.getState().items.find((i: any) => i.id === this.itemId);

                    if (!currentItem) {
                        console.warn('[NotepadWidget] Item no longer exists');
                        return;
                    }

                    // Use helper to preserve other properties
                    const updatedContent = WidgetContentHelper.setNotepadText(currentItem.content, combinedContent);

                    await dashboardStore.updateItem({
                        id: this.itemId,
                        content: updatedContent
                    });

                    this._lastSavedContent = combinedContent;

                    if (silent) {
                        // Silent save: just mark as saved, no UI updates
                        this.hasUnsavedChanges = false;
                    }

                } catch (err) {
                    console.error('[NotepadWidget] Save failed:', err);
                    if (!silent) {
                        alert(i18n.t('widget.notepad.error.save') + err);
                    }
                } finally {
                    if (!silent) {
                        this.isSaving = false;
                        this.requestUpdate();
                    }
                }
            })();

            await this._savePromise;

        } catch (err) {
            console.error('[NotepadWidget] Save error:', err);
            if (!silent) {
                alert(i18n.t('widget.notepad.error.save') + err);
            }
        } finally {
            this._savePromise = null;
        }
    }

    private startEditing() {
        if (this.isDashboardEditing) return; // Locked during dashboard edit mode

        this.isInternalEditing = true;

        // Focus editor next tick
        setTimeout(() => {
            if (this.editorElement) {
                this.editorElement.focus();

                // Ensure content is synced
                const sanitized = htmlSanitizer.sanitize(this.content);
                if (this.editorElement.innerHTML !== sanitized) {
                    this.editorElement.innerHTML = sanitized;
                }

                // Move cursor to end
                this.focusEditor(true);
            }
        }, 0);
    }

    private focusEditor(atEnd: boolean = true) {
        if (!this.editorElement) return;

        this.editorElement.focus();

        if (atEnd) {
            const selection = window.getSelection();
            if (selection) {
                const range = document.createRange();
                range.selectNodeContents(this.editorElement);
                range.collapse(false); // Collapse to end
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    private handleColor(e: Event) {
        const input = e.target as HTMLInputElement;
        this.exec('foreColor', input.value);
    }

    private handleToolbarWheel(e: WheelEvent) {
        e.preventDefault();
        const toolbar = e.currentTarget as HTMLElement;
        toolbar.scrollLeft += e.deltaY;
    }

    /**
     * Insert a new checklist block
     */
    private insertChecklist() {
        const blockId = 'block-' + Math.random().toString(36).substring(2, 11);

        // Create new checklist block with one empty item
        const newBlock = {
            id: blockId,
            items: [{
                id: 'item-' + Math.random().toString(36).substring(2, 11),
                checked: false,
                text: ''
            }]
        };

        this.checklistBlocks = [...this.checklistBlocks, newBlock];
        this.hasUnsavedChanges = true;
        this.scheduleAutosave();

        // Focus the first item in the new block
        this.updateComplete.then(() => {
            const block = this.shadowRoot?.querySelector(`checklist-block[block-id="${blockId}"]`);
            const firstInput = block?.shadowRoot?.querySelector('input[type="text"]') as HTMLInputElement;
            firstInput?.focus();
        });
    }

    private insertCode() {
        const defaultCode = i18n.t('widget.notepad.prompt.code_block');
        const html = `<pre><code>${defaultCode}</code></pre><p><br></p>`;
        this.exec('insertHTML', html);

        // Focus and select the code content
        setTimeout(() => {
            const selection = window.getSelection();
            if (selection && this.editorElement) {
                const codeElements = this.editorElement.querySelectorAll('code');
                const lastCode = codeElements[codeElements.length - 1];
                if (lastCode) {
                    const range = document.createRange();
                    range.selectNodeContents(lastCode);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }, 0);
    }

    /**
     * Handle checklist block changes
     */
    private handleChecklistChange(e: CustomEvent) {
        const { blockId, items } = e.detail;

        this.checklistBlocks = this.checklistBlocks.map(block =>
            block.id === blockId
                ? { ...block, items }
                : block
        );

        this.hasUnsavedChanges = true;
        this.scheduleAutosave();
    }

    /**
     * Delete a checklist block
     */
    private deleteChecklistBlock(blockId: string) {
        this.checklistBlocks = this.checklistBlocks.filter(block => block.id !== blockId);
        this.hasUnsavedChanges = true;
        this.scheduleAutosave();
    }

    private handleEditorInput(e: Event) {
        const editor = e.target as HTMLElement;

        // Update character count
        this.characterCount = editor.innerHTML.length;

        // Mark as having unsaved changes
        this.hasUnsavedChanges = editor.innerHTML !== this._lastSavedContent;

        // Cancel previous autosave timer
        this.cancelAutosave();

        // Schedule new autosave (only if enabled)
        if (AUTOSAVE_DELAY > 0) {
            this._autosaveTimeout = setTimeout(() => {
                if (this.hasUnsavedChanges) {
                    this.saveContent(true); // Silent save
                }
            }, AUTOSAVE_DELAY);
        }
    }

    private handleEditorKeydown(e: KeyboardEvent) {
        // Keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    this.exec('bold');
                    return;
                case 'i':
                    e.preventDefault();
                    this.exec('italic');
                    return;
                case 's':
                    e.preventDefault();
                    this.saveContent(false); // Explicit save
                    return;
                case 'z':
                    if (e.shiftKey) {
                        e.preventDefault();
                        this.exec('redo');
                    } else {
                        e.preventDefault();
                        this.exec('undo');
                    }
                    return;
                case 'k':
                    e.preventDefault();
                    const url = prompt(i18n.t('widget.notepad.prompt.url'));
                    if (url) this.exec('createLink', url);
                    return;
            }
        }

        // Note: Checklist Enter handling is now managed by ChecklistBlock component
        // No custom Enter logic needed here anymore
    }

    private handlePaste(e: ClipboardEvent) {
        const items = e.clipboardData?.items;
        if (!items) return;

        // Check for images in clipboard
        for (const item of Array.from(items)) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();

                const blob = item.getAsFile();
                if (!blob) continue;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;

                    // Validate size (limit to 1MB for base64 images)
                    if (base64.length > 1000000) {
                        alert(i18n.t('widget.notepad.error.image_too_large'));
                        return;
                    }

                    this.exec('insertImage', base64);
                };
                reader.readAsDataURL(blob);

                return; // Only handle first image
            }
        }
    }

    render() {
        try {
            // --- VIEW MODE ---
            if (!this.isInternalEditing) {
                const sanitizedContent = htmlSanitizer.sanitize(this.content);
                const displayContent = sanitizedContent ||
                    `<span style='opacity:0.5; font-style:italic; color: var(--text-dim);'>${i18n.t('widget.notepad.placeholder')}</span>`;

                return html`
                    <div style="flex: 1; width: 100%; height: 100%; min-height: 100px; overflow-y: auto; display: flex; flex-direction: column;">
                        <div
                            class="viewer"
                            style="padding: 16px; color: var(--text-main) !important; word-wrap: break-word;"
                            .innerHTML="${displayContent}"
                        ></div>

                        <!-- Render checklist blocks in view mode (read-only) -->
                        ${this.checklistBlocks.map(block => html`
                            <div class="checklist-block-wrapper">
                                <checklist-block
                                    .blockId="${block.id}"
                                    .items="${block.items}"
                                    .readonly="${true}"
                                    @checklist-change="${() => {}}"
                                ></checklist-block>
                            </div>
                        `)}
                    </div>

                    <button
                        class="fab-btn edit-btn"
                        @click="${this.startEditing}"
                        ?disabled="${this.isDashboardEditing}"
                        title="${i18n.t('widget.notepad.tool.edit')}"
                    >
                        ${ICONS.edit}
                    </button>
                `;
            }

            // --- EDIT MODE ---
            const charWarning = this.characterCount > MAX_CONTENT_SIZE * 0.9;
            const charError = this.characterCount > MAX_CONTENT_SIZE;

            return html`
                <div class="container">
                    <div class="toolbar" @wheel="${this.handleToolbarWheel}" title="${i18n.t('widget.notepad.tool.scroll_hint')}">
                        <!-- History Group -->
                        <div class="group">
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('undo'); }}" title="${i18n.t('widget.notepad.tool.undo')} (Ctrl+Z)">${ICONS.undo}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('redo'); }}" title="${i18n.t('widget.notepad.tool.redo')} (Ctrl+Shift+Z)">${ICONS.redo}</button>
                        </div>

                        <!-- Text Group -->
                        <div class="group">
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('formatBlock', 'H1'); }}" title="${i18n.t('widget.notepad.tool.h1')}">${ICONS.h1}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('formatBlock', 'H2'); }}" title="${i18n.t('widget.notepad.tool.h2')}">${ICONS.h2}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('bold'); }}" title="${i18n.t('widget.notepad.tool.bold')} (Ctrl+B)">${ICONS.bold}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('italic'); }}" title="${i18n.t('widget.notepad.tool.italic')} (Ctrl+I)">${ICONS.italic}</button>

                            <!-- Color Picker -->
                            <div class="color-wrapper">
                                <button title="${i18n.t('widget.notepad.tool.color')}">${ICONS.color}</button>
                                <input type="color" class="color-input" @change="${this.handleColor}" title="${i18n.t('widget.notepad.tool.color')}" />
                            </div>
                        </div>

                        <!-- Paragraph Group -->
                        <div class="group">
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('justifyLeft'); }}" title="${i18n.t('widget.notepad.tool.align_left')}">${ICONS.alignLeft}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('justifyCenter'); }}" title="${i18n.t('widget.notepad.tool.align_center')}">${ICONS.alignCenter}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('justifyRight'); }}" title="${i18n.t('widget.notepad.tool.align_right')}">${ICONS.alignRight}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('justifyFull'); }}" title="${i18n.t('widget.notepad.tool.align_justify')}">${ICONS.alignJustify}</button>
                        </div>

                        <div class="group">
                            <button @click="${(e: Event) => { e.preventDefault(); this.insertChecklist(); }}" title="${i18n.t('widget.notepad.tool.checklist')}">${ICONS.checklist}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('insertUnorderedList'); }}" title="${i18n.t('widget.notepad.tool.list_bullet')}">${ICONS.list}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); this.exec('insertOrderedList'); }}" title="${i18n.t('widget.notepad.tool.list_ordered')}">${ICONS.listOrdered}</button>
                        </div>

                        <!-- Insert Group -->
                        <div class="group">
                            <button @click="${(e: Event) => { e.preventDefault(); this.insertCode(); }}" title="${i18n.t('widget.notepad.tool.code')}">${ICONS.code}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); const u = prompt(i18n.t('widget.notepad.prompt.url')); if (u) this.exec('createLink', u); }}" title="${i18n.t('widget.notepad.tool.link')} (Ctrl+K)">${ICONS.link}</button>
                            <button @click="${(e: Event) => { e.preventDefault(); const u = prompt(i18n.t('widget.notepad.prompt.image_url')); if (u) this.exec('insertImage', u); }}" title="${i18n.t('widget.notepad.tool.image')}">${ICONS.image}</button>
                             <button @click="${(e: Event) => { e.preventDefault(); this.exec('removeFormat'); }}" title="${i18n.t('widget.notepad.tool.clear_format')}">${ICONS.clear}</button>
                        </div>

                        <!-- Status Group -->
                        <div class="autosave-indicator ${this.isSaving ? 'visible saving' : ''}">
                            ${this.isSaving ? i18n.t('widget.notepad.status.saving') : ''}
                        </div>
                    </div>

                    <div class="content-area editor"
                         contenteditable="true"
                         spellcheck="false"
                         data-placeholder="${i18n.t('widget.notepad.placeholder')}"
                         @keydown="${this.handleEditorKeydown}"
                         @input="${this.handleEditorInput}"
                         @paste="${this.handlePaste}"
                         .innerHTML="${htmlSanitizer.sanitize(this.content)}">
                    </div>

                    <!-- Checklist Blocks (independent from contenteditable) -->
                    ${this.checklistBlocks.map(block => html`
                        <div class="checklist-block-wrapper">
                            <checklist-block
                                .blockId="${block.id}"
                                .items="${block.items}"
                                @checklist-change="${this.handleChecklistChange}"
                            ></checklist-block>
                            <button
                                class="delete-block-btn"
                                @click="${() => this.deleteChecklistBlock(block.id)}"
                                title="${i18n.t('widget.notepad.checklist.delete_block')}"
                            >
                                ×
                            </button>
                        </div>
                    `)}
                </div>

                <!-- Fixed Controls (outside scrollable container) -->
                <div class="fixed-controls">
                    <button
                        class="fab-btn save-btn ${this.isSaving ? 'saving' : ''}"
                        @click="${() => this.saveContent(false)}"
                        ?disabled="${this.isSaving || charError}"
                        title="${i18n.t('widget.notepad.tool.save')} (Ctrl+S)"
                    >
                        ${this.isSaving ? ICONS.loader : ICONS.save}
                    </button>

                    <!-- Character Counter (bottom right, below save button) -->
                    <div class="char-counter-bottom ${charWarning ? 'warning' : ''} ${charError ? 'error' : ''}">
                        ${this.characterCount} / ${MAX_CONTENT_SIZE}
                    </div>
                </div>
            `;
        } catch (e: any) {
            console.error('[NotepadWidget] Render error:', e);

            // Log to backend (fire and forget)
            fetch('/api/log-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    component: 'NotepadWidget',
                    error: e.toString(),
                    stack: e.stack,
                    itemId: this.itemId
                })
            }).catch(() => {});

            return html`
                <div class="error-state">
                    <h3>${i18n.t('general.error')}</h3>
                    <p>${i18n.t('widget.notepad.error.render')}</p>
                    <button @click="${() => this.loadFromStore()}">
                        ${i18n.t('general.restore')}
                    </button>
                    <details>
                        <summary>Technical Details</summary>
                        <pre>${e.toString()}\n${e.stack}</pre>
                    </details>
                </div>
            `;
        }
    }
}
