import { i18n } from '../../../services/i18n';
import { WIDGET_REGISTRY } from '../../../widgets/registry';

/**
 * Markup for the "Add widget" modal. The stylesheet is injected by the caller.
 * Depends on i18n / the widget registry, so it is verified visually rather than
 * via snapshot (i18n is a singleton that needs a browser environment).
 */
export const addWidgetTemplate = (css: string): string => `
            <style>${css}</style>
            <dialog id="modal" aria-labelledby="add-widget-title">
                <div class="header">
                    <div class="title-group">
                        <h3 id="add-widget-title">${i18n.t('widget.add_title') || 'Add Widget'}</h3>
                        <p>${i18n.t('widget.add_subtitle') || 'Enhance your dashboard with dynamic components'}</p>
                    </div>
                    <button class="close-btn" id="close-btn" aria-label="${i18n.t('general.close')}">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>

                <div class="grid">
                    ${WIDGET_REGISTRY.map(w => `
                        <div class="card" data-id="${w.id}">
                            <div class="icon-container">${w.icon}</div>
                            <div class="name">${i18n.t(`widget.${w.id}.name`) || w.name}</div>
                            <div class="desc">${i18n.t(`widget.${w.id}.description`) || w.description}</div>
                        </div>
                    `).join('')}
                </div>
            </dialog>
        `;
