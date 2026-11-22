import { i18n } from '../../../services/i18n';
import { escapeHtml as esc } from '../../../services/escape';
import { telemetryInterval } from '../../../widgets/core/telemetryInterval';
import { telemetrySourceTemplate } from './TelemetrySourceForm';

/**
 * The General tab of each widget whose form is plain markup: one function per
 * widget, from the widget's saved content to its HTML. The forms that load
 * hosts or machines before they can draw (Docker, Proxmox, Monitoring) stay on
 * the modal, which owns that loading.
 *
 * Depends on i18n, so it is checked in the browser rather than by snapshot.
 */

/** Any value that ends up inside an attribute, escaped as text. */
const attr = (v: unknown): string => esc(String(v));

export function clockForm(content: any): string {
    const city = content.city || '';
    const h12 = content.hour12 || false;
    const showDate = content.showDate !== false;
    const showCity = content.showCity !== false;
    return `
        <div class="field-group">
            <label>${i18n.t('widget.clock.city')}</label>
            <div class="input-row">
                <input type="text" id="clock-city" value="${esc(city)}" placeholder="${i18n.t('widget.clock.city_placeholder')}"/>
                <app-button variant="ghost" id="clock-search-btn">${i18n.t('widget.weather.search')}</app-button>
            </div>
            <small>${i18n.t('widget.clock.city_desc')}</small>
        </div>

        <div class="field-group" id="clock-results-container" style="display:none;">
            <label>${i18n.t('widget.weather.results')}</label>
            <div id="clock-results" class="weather-results"></div>
        </div>

        <div class="field-group check-row">
            <input type="checkbox" id="clock-12h" ${h12 ? 'checked' : ''} />
            <label for="clock-12h">${i18n.t('widget.clock.use_12h')}</label>
        </div>

        <div class="field-group check-row">
            <input type="checkbox" id="clock-date" ${showDate ? 'checked' : ''} />
            <label for="clock-date">${i18n.t('widget.clock.show_date')}</label>
        </div>

        <div class="field-group check-row">
            <input type="checkbox" id="clock-show-city" ${showCity ? 'checked' : ''} />
            <label for="clock-show-city">${i18n.t('widget.clock.show_city')}</label>
        </div>

        <div class="field-group check-row">
            <input type="checkbox" id="clock-seconds" ${content.showSeconds === true ? 'checked' : ''} />
            <label for="clock-seconds">${i18n.t('widget.clock.show_seconds')}</label>
        </div>
    `;
}

export function weatherForm(content: any): string {
    const city = content.city || '';
    const lat = content.latitude || '';
    const lon = content.longitude || '';
    const showForecast = content.showForecast || false;
    const forecastDays = content.forecastDays || 5;
    return `
        <div class="field-group">
            <label>${i18n.t('widget.weather.city')}</label>
            <div class="input-row">
                <input type="text" id="weather-city" value="${esc(city)}" placeholder="${i18n.t('widget.weather.city_placeholder')}"/>
                <app-button variant="ghost" id="weather-search-btn">${i18n.t('widget.weather.search')}</app-button>
            </div>
            <small>${i18n.t('widget.weather.city_desc')}</small>
        </div>

        <div class="field-group" id="weather-results-container" style="display:none;">
            <label>${i18n.t('widget.weather.results')}</label>
            <div id="weather-results" class="weather-results"></div>
        </div>

        <div class="field-group">
            <label>${i18n.t('widget.weather.coordinates')}</label>
            <div class="input-row">
                <input type="number" id="weather-lat" value="${attr(lat)}" placeholder="${i18n.t('general.latitude')}" step="0.0001" />
                <input type="number" id="weather-lon" value="${attr(lon)}" placeholder="${i18n.t('general.longitude')}" step="0.0001" />
            </div>
        </div>

        <div class="field-group check-row" style="margin-top: 16px;">
            <input type="checkbox" id="weather-forecast" ${showForecast ? 'checked' : ''} />
            <label for="weather-forecast">${i18n.t('widget.weather.show_forecast')}</label>
        </div>

        <div class="field-group row-aligned" id="weather-days-row" ${!showForecast ? 'style="display:none; margin-top: 16px;"' : 'style="margin-top: 16px;"'}>
            <label>${i18n.t('widget.weather.forecast_days')}</label>
            <div class="stepper-wrap">
                <button type="button" class="stepper-btn" id="weather-days-dec">&minus;</button>
                <input type="number" id="weather-days" value="${attr(forecastDays)}" min="1" max="6" />
                <button type="button" class="stepper-btn" id="weather-days-inc">+</button>
            </div>
        </div>
    `;
}

const TELEMETRY_METRICS = [
    { key: 'cpu', label: 'widget.telemetry.cpu', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>` },
    { key: 'ram', label: 'widget.telemetry.ram', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="2" y="7" width="20" height="10" rx="1"/><line x1="6" y1="17" x2="6" y2="20"/><line x1="10" y1="17" x2="10" y2="20"/><line x1="14" y1="17" x2="14" y2="20"/><line x1="18" y1="17" x2="18" y2="20"/><line x1="5" y1="10" x2="5" y2="14"/><line x1="9" y1="10" x2="9" y2="14"/><line x1="13" y1="10" x2="13" y2="14"/></svg>` },
    { key: 'temp', label: 'widget.telemetry.temp', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>` },
];

export function telemetryForm(content: any): string {
    const interval = telemetryInterval(content.interval);
    const active: string[] = Array.isArray(content.metrics) ? content.metrics : ['cpu', 'ram', 'temp'];
    const rows = TELEMETRY_METRICS.map(m => `
        <div class="metric-toggle-row">
            <span class="metric-toggle-icon">${m.icon}</span>
            <span class="metric-toggle-label">${i18n.t(m.label)}</span>
            <label class="toggle-switch">
                <input type="checkbox" class="metric-toggle" id="metric-${m.key}" ${active.includes(m.key) ? 'checked' : ''} data-metric="${m.key}" />
                <span class="toggle-slider"></span>
            </label>
        </div>
    `).join('');
    return `
        ${telemetrySourceTemplate(content)}
        <div class="field-group">
            <label>${i18n.t('widget.telemetry.metrics') || 'Metrics'}</label>
            <div class="metric-toggles">${rows}</div>
            <small>${i18n.t('widget.telemetry.metrics_hint') || 'At least one metric must remain active.'}</small>
        </div>
        <div class="field-group row-aligned">
            <label>${i18n.t('widget.telemetry.update_interval')}</label>
            <app-select id="telemetry-interval" value="${attr(interval)}"></app-select>
        </div>
    `;
}

/** Notepad and Markdown are written in the widget itself: their General tab only points the way. */
export function writtenInPlaceForm(): string {
    return `
        <div style="text-align: center; padding: 32px 20px; color: var(--text-dim);">
            <p>${i18n.t('widget.config.check_personalize')}</p>
        </div>
    `;
}

export function apiForm(content: any): string {
    const url = content.url || '';
    const method = content.method || 'GET';
    const refreshSec = content.refreshSec || 60;
    const arrayPath = content.arrayPath || '';
    // Widgets saved before the view was an explicit choice inferred it
    // from arrayPath; keep showing them the mode they actually get.
    const viewMode = content.viewMode || (arrayPath ? 'list' : 'metrics');
    const preset = content.preset || '';
    const baseUrl = content.baseUrl || '';
    const apiExtra = content.apiExtra || '';
    const headerNames: string[] = Array.isArray(content.secret_headers) ? content.secret_headers : [];
    const headerRows = Array.from({ length: Math.max(3, headerNames.length) }, (_, n) => `
        <div class="header-row">
            <input type="text" class="api-header-name" value="${esc(headerNames[n] || '')}" placeholder="X-Api-Key" spellcheck="false" autocomplete="off" aria-label="${i18n.t('widget.api.header_name')}" />
            <input type="password" class="api-header-value" value="" spellcheck="false" autocomplete="new-password" data-secret aria-label="${i18n.t('widget.api.header_value')}" />
        </div>`).join('');
    const fieldsText = (Array.isArray(content.mappings) ? content.mappings : [])
        .map((m: any) => `${m.label || ''} = ${m.path || ''}${m.format ? ' | ' + m.format : ''}`).join('\n');

    return `
        <div class="field-group row-aligned">
            <label>${i18n.t('widget.api.preset_label') || 'Service'}</label>
            <app-select id="api-preset" value="${esc(preset)}"></app-select>
        </div>

        <div id="api-simple" style="display:${preset ? 'block' : 'none'}">
            <div class="field-group">
                <label>${i18n.t('widget.api.base_url_label') || 'Base URL'}</label>
                <input type="text" id="api-baseurl" value="${esc(baseUrl)}" placeholder="http://10.0.0.5:8080" />
                <small>${i18n.t('widget.api.base_url_hint') || 'Just the address of the service — the rest is filled in for you.'}</small>
            </div>
            <div class="field-group" id="api-key-group">
                <label id="api-key-label">${i18n.t('widget.api.key_apikey') || 'API Key'}</label>
                <input type="password" id="api-key" value="" spellcheck="false" autocomplete="new-password" data-secret />
                <small id="api-key-hint"></small>
            </div>
            <div class="field-group" id="api-extra-group" style="display:none">
                <label id="api-extra-label"></label>
                <input type="text" id="api-extra" value="${esc(apiExtra)}" spellcheck="false" placeholder="" />
                <small id="api-extra-hint"></small>
            </div>
        </div>

        <div id="api-advanced" class="field-grid" style="display:${preset ? 'none' : 'grid'}">
            <div class="field-group field-span">
                <label>${i18n.t('widget.api.url_label') || 'Endpoint URL'}</label>
                <input type="text" id="api-url" value="${esc(url)}" placeholder="http://10.0.0.5/admin/api.php?summary" />
                <small>${i18n.t('widget.api.url_hint') || 'The server fetches this JSON URL for you (reaches private IPs, no CORS).'}</small>
            </div>
            <div class="field-group row-aligned">
                <label>${i18n.t('widget.api.method_label') || 'Method'}</label>
                <app-select id="api-method" value="${attr(method)}"></app-select>
            </div>
            <div class="field-group row-aligned">
                <label>${i18n.t('widget.api.view_label') || 'View'}</label>
                <app-select id="api-view" value="${attr(viewMode)}"></app-select>
            </div>
            <div class="field-group">
                <label>${i18n.t('widget.api.headers_label') || 'Headers'}</label>
                <div id="api-header-rows" class="header-rows">${headerRows}</div>
                <small>${i18n.t('widget.api.headers_hint')}</small>
            </div>
            <div class="field-group">
                <label>${i18n.t('widget.api.fields_label') || 'Fields'}</label>
                <textarea class="field-textarea" id="api-fields" rows="4" spellcheck="false" placeholder="Queries = dns_queries_today | number&#10;Blocked = ads_percentage_today | percent">${esc(fieldsText)}</textarea>
                <small>${i18n.t('widget.api.fields_hint') || 'One per line: "Label = path". Path is dot/bracket (a.b[0].c). Optional "| number|bytes|percent".'}</small>
            </div>
            <div class="field-group field-span" id="api-array-group" style="display:${viewMode === 'list' ? 'flex' : 'none'}">
                <label>${i18n.t('widget.api.array_label') || 'List array'}</label>
                <input type="text" id="api-array" value="${esc(arrayPath)}" placeholder="queue.records" />
                <small>${i18n.t('widget.api.array_hint_list') || 'Path to the array to list. The fields below are then relative to each item.'}</small>
            </div>
            <div class="field-group row-aligned field-span">
                <label>${i18n.t('widget.api.refresh_label') || 'Refresh'}</label>
                <app-select id="api-refresh" value="${attr(refreshSec)}"></app-select>
            </div>
        </div>
    `;
}

export function sectionForm(content: any): string {
    return `
        <div class="field-group">
            <label>${i18n.t('bookmark.label')}</label>
            <div class="input-row">
                <input type="text" id="section-title" value="${esc(content.title || '')}" placeholder="${i18n.t('section.placeholder_title')}" />
            </div>
            <small>${i18n.t('section.leave_empty')}</small>
        </div>
    `;
}

/** The widgets whose General tab is one of the forms above, by widget id. */
export const PLAIN_FORMS: ReadonlyMap<string, (content: any) => string> = new Map([
    ['clock', clockForm],
    ['weather', weatherForm],
    ['telemetry', telemetryForm],
    ['notepad', writtenInPlaceForm],
    ['markdown', writtenInPlaceForm],
    ['api', apiForm],
]);
