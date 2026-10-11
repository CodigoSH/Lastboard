import { dashboardStore } from '../../../store/dashboardStore';
import { eventBus, EVENTS } from '../../../services/EventBus';
import { i18n } from '../../../services/i18n';

/** What renaming and deleting a dashboard do, from wherever they are asked for. */

export function renameDashboard(id: number, name: string) {
    const modal = document.createElement('rename-dashboard-modal') as HTMLElement;
    modal.dataset.id = String(id);
    modal.dataset.name = name;
    document.body.appendChild(modal);
    modal.addEventListener('modal-close', () => modal.remove(), { once: true });
}

export function deleteDashboard(id: number) {
    eventBus.emit(EVENTS.SHOW_CONFIRMATION, {
        title: i18n.t('dashboard.delete'),
        message: i18n.t('bookmark.delete_confirm_message'),
        onConfirm: () => dashboardStore.deleteDashboard(id),
    });
}
