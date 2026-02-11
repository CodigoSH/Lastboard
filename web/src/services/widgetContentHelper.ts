/**
 * Widget Content Helper
 *
 * Centralizes parsing and serialization of widget content.
 * All widgets store content as JSON with a common structure.
 */

export interface BaseWidgetContent {
    widgetId: string;
    [key: string]: any;
}

export interface NotepadWidgetContent extends BaseWidgetContent {
    widgetId: 'notepad';
    text: string;
}

export interface ClockWidgetContent extends BaseWidgetContent {
    widgetId: 'clock';
    timezone?: string;
    use12h?: boolean;
    showDate?: boolean;
}

export interface TelemetryWidgetContent extends BaseWidgetContent {
    widgetId: 'telemetry';
    updateInterval?: number;
}

export interface MarkdownWidgetContent extends BaseWidgetContent {
    widgetId: 'markdown';
    text: string;
}

export type WidgetContent = NotepadWidgetContent | ClockWidgetContent | TelemetryWidgetContent | MarkdownWidgetContent;

export class WidgetContentHelper {
    /**
     * Parse raw content (string or object) into structured object
     */
    static parse(raw: any): BaseWidgetContent {
        try {
            // Already an object
            if (typeof raw === 'object' && raw !== null) {
                return raw;
            }

            // Try to parse as JSON string
            if (typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                if (typeof parsed === 'object' && parsed !== null) {
                    return parsed;
                }
            }

            // Fallback to empty object
            return { widgetId: 'unknown' };
        } catch (error) {
            console.warn('[WidgetContentHelper] Failed to parse content:', error);
            return { widgetId: 'unknown' };
        }
    }

    /**
     * Serialize content to JSON string
     */
    static serialize(content: BaseWidgetContent): string {
        try {
            return JSON.stringify(content);
        } catch (error) {
            console.error('[WidgetContentHelper] Failed to serialize content:', error);
            return '{}';
        }
    }

    /**
     * Get text content from notepad widget
     */
    static getNotepadText(raw: any): string {
        const content = this.parse(raw) as NotepadWidgetContent;
        return content.text || '';
    }

    /**
     * Set text content for notepad widget, preserving other properties
     */
    static setNotepadText(raw: any, newText: string): string {
        const content = this.parse(raw);
        const updated: NotepadWidgetContent = {
            ...content,
            widgetId: 'notepad',
            text: newText
        };
        return this.serialize(updated);
    }

    /**
     * Merge partial updates into existing content
     */
    static merge(raw: any, updates: Partial<BaseWidgetContent>): string {
        const content = this.parse(raw);
        const merged = { ...content, ...updates };
        return this.serialize(merged);
    }

    /**
     * Validate widget content structure
     */
    static validate(raw: any, expectedWidgetId: string): boolean {
        const content = this.parse(raw);
        return content.widgetId === expectedWidgetId;
    }

    /**
     * Get text content from markdown widget
     */
    static getMarkdownText(raw: any): string {
        const content = this.parse(raw) as MarkdownWidgetContent;
        return content.text || '';
    }

    /**
     * Set text content for markdown widget, preserving other properties
     */
    static setMarkdownText(raw: any, newText: string): string {
        const content = this.parse(raw);
        const updated: MarkdownWidgetContent = {
            ...content,
            widgetId: 'markdown',
            text: newText
        };
        return this.serialize(updated);
    }
}
