export default defineAppConfig({
    ui: {
        input: {
            // 使用 CVA 形态：通过 slots 定义各插槽类名
            slots: {
                base: 'relative block w-full disabled:cursor-not-allowed disabled:opacity-75 focus:outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors duration-200 ease-in-out rounded-lg bg-[var(--color-input-bg)] hover:bg-[var(--color-input-bg-hover)] ring-1 ring-inset ring-[var(--color-border)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                leading: 'ps-3.5',
                trailing: 'pe-3.5',
                leadingIcon: 'text-[var(--color-text-muted)] h-5 w-5',
                trailingIcon: 'text-[var(--color-text-muted)] h-5 w-5',
            },
            // 如需尺寸/颜色等，可在此添加 variants 组：size / color ...
            // variants: { size: { xl: { base: 'text-base', } } }
        },
        button: {
            // 将基础类放入 slots.base
            slots: {
                base: 'font-semibold rounded-lg',
            },
            // 将样式选项挂到 variants 的某个组（如 variant）
            variants: {
                variant: {
                    solid: {
                        base: 'disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shadow-sm text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-[var(--color-primary)]',
                    },
                    outline: {
                        base: 'disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ring-1 ring-inset text-[var(--color-text-muted)] ring-[var(--color-border)] hover:bg-[var(--color-input-bg-hover)] hover:text-[var(--color-text)] focus-visible:outline-[var(--color-primary)]',
                    },
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