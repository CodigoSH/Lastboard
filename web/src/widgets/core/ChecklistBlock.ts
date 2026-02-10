/**
 * ChecklistBlock Component
 *
 * A robust, standalone checklist component with native inputs.
 * Each item is a separate input field (NOT contenteditable).
 * Enter key creates new items reliably.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { i18n } from '../../services/i18n';

export interface ChecklistItem {
    id: string;
    checked: boolean;
    text: string;
}

@customElement('checklist-block')
export class ChecklistBlock extends LitElement {
    @property({ type: String }) blockId: string = '';
    @property({ type: Array }) items: ChecklistItem[] = [];
    @property({ type: Boolean }) readonly: boolean = false;

    @state() private focusedItemId: string | null = null;

    static styles = css`
        :host {
            display: block;
            background: var(--surface);
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
            position: relative;
            isolation: isolate;
            z-index: 1;
        }

        /* Reset all potential inherited styles */
        * {
            box-sizing: border-box;
        }

        .checklist-items {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .checklist-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
        }

        .checklist-item input[type="checkbox"] {
            flex-shrink: 0;
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--accent);
        }

        .checklist-item input[type="text"] {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: var(--text);
            font-size: 14px;
            font-family: inherit;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .checklist-item input[type="text"]:focus {
            background: var(--surface-hover);
        }

        .checklist-item input[type="text"].checked {
            text-decoration: line-through;
            opacity: 0.6;
        }

        .checklist-item .delete-btn {
            flex-shrink: 0;
            background: transparent;
            border: none;
            color: var(--error, #ff4757);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.2s, background 0.2s;
            font-size: 16px;
            line-height: 1;
        }

        .checklist-item:hover .delete-btn {
            opacity: 1;
        }

        .checklist-item .delete-btn:hover {
            background: var(--error);
            color: white;
        }

        .add-item-btn {
            all: unset;
            display: block;
            box-sizing: border-box;
            background: transparent;
            border: 1px dashed var(--border);
            color: var(--text-secondary);
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
            margin-top: 8px;
            transition: all 0.2s;
            width: 100%;
            text-align: left;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            position: relative;
            z-index: 2;
            isolation: isolate;
        }

        .add-item-btn::before,
        .add-item-btn::after {
            content: none;
        }

        .add-item-btn:hover {
            background: var(--surface-hover);
            border-color: var(--accent);
            color: var(--accent);
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .add-item-btn:active {
            transform: scale(0.98);
        }

        .empty-state {
            text-align: center;
            color: var(--text-secondary);
            font-size: 13px;
            padding: 20px;
        }
    `;

    /**
     * Generate unique ID for new items
     */
    private generateId(): string {
        return 'item-' + Math.random().toString(36).substring(2, 11);
    }

    /**
     * Add a new item at the end
     */
    addItem() {
        const newItem: ChecklistItem = {
            id: this.generateId(),
            checked: false,
            text: ''
        };

        this.items = [...this.items, newItem];
        this.focusedItemId = newItem.id;

        // Notify parent of change
        this.dispatchChangeEvent();

        // Focus the new item
        this.updateComplete.then(() => {
            const input = this.shadowRoot?.querySelector(`input[data-item-id="${newItem.id}"]`) as HTMLInputElement;
            input?.focus();
        });
    }

    /**
     * Add a new item after a specific item
     */
    addItemAfter(afterId: string) {
        const index = this.items.findIndex(item => item.id === afterId);
        if (index === -1) return;

        const newItem: ChecklistItem = {
            id: this.generateId(),
            checked: false,
            text: ''
        };

        const newItems = [...this.items];
        newItems.splice(index + 1, 0, newItem);
        this.items = newItems;
        this.focusedItemId = newItem.id;

        this.dispatchChangeEvent();

        // Focus the new item
        this.updateComplete.then(() => {
            const input = this.shadowRoot?.querySelector(`input[data-item-id="${newItem.id}"]`) as HTMLInputElement;
            input?.focus();
        });
    }

    /**
     * Delete an item
     */
    deleteItem(itemId: string) {
        // Don't delete if it's the only item - just clear it
        if (this.items.length === 1) {
            this.updateItemText(itemId, '');
            return;
        }

        const index = this.items.findIndex(item => item.id === itemId);
        if (index === -1) return;

        // Focus previous or next item
        const focusIndex = index > 0 ? index - 1 : index + 1;
        const focusItemId = this.items[focusIndex]?.id;

        this.items = this.items.filter(item => item.id !== itemId);
        this.dispatchChangeEvent();

        // Focus adjacent item
        if (focusItemId) {
            this.updateComplete.then(() => {
                const input = this.shadowRoot?.querySelector(`input[data-item-id="${focusItemId}"]`) as HTMLInputElement;
                input?.focus();
            });
        }
    }

    /**
     * Toggle checkbox
     */
    toggleItem(itemId: string) {
        this.items = this.items.map(item =>
            item.id === itemId
                ? { ...item, checked: !item.checked }
                : item
        );
        this.dispatchChangeEvent();
    }

    /**
     * Update item text
     */
    updateItemText(itemId: string, text: string) {
        this.items = this.items.map(item =>
            item.id === itemId
                ? { ...item, text }
                : item
        );
        this.dispatchChangeEvent();
    }

    /**
     * Handle keydown in text input
     */
    handleItemKeydown(e: KeyboardEvent, itemId: string) {
        const input = e.target as HTMLInputElement;
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (e.key === 'Enter') {
            e.preventDefault();

            // If current item is empty, don't create new one
            if (!item.text.trim()) {
                return;
            }

            // Create new item after current
            this.addItemAfter(itemId);
        } else if (e.key === 'Backspace' && input.selectionStart === 0 && input.selectionEnd === 0) {
            // Backspace at start of input - delete if empty
            if (!item.text.trim()) {
                e.preventDefault();
                this.deleteItem(itemId);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const index = this.items.findIndex(i => i.id === itemId);
            if (index > 0) {
                const prevId = this.items[index - 1].id;
                const prevInput = this.shadowRoot?.querySelector(`input[data-item-id="${prevId}"]`) as HTMLInputElement;
                prevInput?.focus();
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const index = this.items.findIndex(i => i.id === itemId);
            if (index < this.items.length - 1) {
                const nextId = this.items[index + 1].id;
                const nextInput = this.shadowRoot?.querySelector(`input[data-item-id="${nextId}"]`) as HTMLInputElement;
                nextInput?.focus();
            }
        }
    }

    /**
     * Dispatch change event to parent
     */
    private dispatchChangeEvent() {
        this.dispatchEvent(new CustomEvent('checklist-change', {
            detail: {
                blockId: this.blockId,
                items: this.items
            },
            bubbles: true,
            composed: true
        }));
    }

    render() {
        if (this.items.length === 0) {
            return html`
                <div class="empty-state">
                    ${i18n.t('widget.notepad.checklist.empty')}
                </div>
                ${!this.readonly ? html`
                    <button class="add-item-btn" @click="${() => this.addItem()}">
                        + ${i18n.t('widget.notepad.checklist.add_first')}
                    </button>
                ` : ''}
            `;
        }

        return html`
            <div class="checklist-items">
                ${this.items.map(item => html`
                    <div class="checklist-item">
                        <input
                            type="checkbox"
                            .checked="${item.checked}"
                            @change="${() => this.toggleItem(item.id)}"
                        />
                        <input
                            type="text"
                            class="${item.checked ? 'checked' : ''}"
                            .value="${item.text}"
                            data-item-id="${item.id}"
                            placeholder="${i18n.t('widget.notepad.checklist.placeholder')}"
                            ?readonly="${this.readonly}"
                            @input="${(e: InputEvent) => this.updateItemText(item.id, (e.target as HTMLInputElement).value)}"
                            @keydown="${(e: KeyboardEvent) => this.handleItemKeydown(e, item.id)}"
                        />
                        ${!this.readonly ? html`
                            <button
                                class="delete-btn"
                                @click="${() => this.deleteItem(item.id)}"
                                title="${i18n.t('widget.notepad.checklist.delete_item')}"
                            >
                                ×
                            </button>
                        ` : ''}
                    </div>
                `)}
            </div>
            ${!this.readonly ? html`
                <button class="add-item-btn" @click="${() => this.addItem()}">
                    + ${i18n.t('widget.notepad.checklist.add_item')}
                </button>
            ` : ''}
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'checklist-block': ChecklistBlock;
    }
}
