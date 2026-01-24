/**
 * Button Component Template
 */

export const template = ({ variant }: { variant: string }) => `
    <button class="btn btn--${variant}">
        <slot></slot>
    </button>
`;
