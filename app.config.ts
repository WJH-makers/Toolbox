export default defineAppConfig({
    ui: {
        input: {
            default: {
                size: 'xl',
                color: 'white',
                variant: 'outline',
                loadingIcon: 'i-heroicons-arrow-path-20-solid',
            },
            base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors duration-200 ease-in-out',
            rounded: 'rounded-lg',
            background: 'bg-[var(--color-input-bg)] hover:bg-[var(--color-input-bg-hover)]',
            ring: 'ring-1 ring-inset ring-[var(--color-border)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
            icon: {
                base: 'text-[var(--color-text-muted)]',
                size: {'xl': 'h-5 w-5'},
                leading: {padding: {xl: 'ps-3.5'}},
                trailing: {padding: {xl: 'pe-3.5'}}
            },
        },
        button: {
            default: {
                size: 'xl',
                color: 'primary',
                variant: 'solid',
                loadingIcon: 'i-heroicons-arrow-path-20-solid',
            },
            font: 'font-semibold',
            rounded: 'rounded-lg',
            variants: {
                solid: (props: { color: string }) => {
                    const baseStyle = 'disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shadow-sm';
                    let colorStyle = '';
                    if (props.color === 'primary') {
                        colorStyle = `text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-[var(--color-primary)]`;
                    } else {
                        colorStyle = `text-[var(--color-text)] bg-slate-700 hover:bg-slate-600 focus-visible:outline-slate-500`;
                    }
                    return `${baseStyle} ${colorStyle}`;
                },
                outline: (props: { color: string }) => {
                    const baseStyle = 'disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-inset';
                    let colorStyle = '';
                    if (props.color === 'primary') {
                        colorStyle = `text-[var(--color-primary)] ring-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline-[var(--color-primary)]`;
                    } else {
                        colorStyle = `text-[var(--color-text-muted)] ring-slate-600 hover:bg-slate-700 hover:text-[var(--color-text)] focus-visible:outline-slate-600`;
                    }
                    return `${baseStyle} ${colorStyle}`;
                },
            },
        },
        formGroup: {
            label: {
                base: 'block text-sm font-medium text-[var(--color-text-muted)] mb-1',
            },
            error: 'mt-1 text-sm text-red-400',
        },
    },
});