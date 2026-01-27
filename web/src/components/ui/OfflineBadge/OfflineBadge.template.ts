import { i18n } from '../../../services/i18n';

export const template = () => `
    <div class="dot"></div>
    <span class="text">${i18n.t('status.offline')}</span>
`;
