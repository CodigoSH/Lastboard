/**
 * SectionGroup Component Template
 */

export const template = ({ title }: { title: string }) => `
    <div class="section-group__header">
        <span class="section-group__title">${title}</span>
        <div class="section-group__line"></div>
    </div>
    <div class="section-group__content">
        <slot></slot>
    </div>
`;
