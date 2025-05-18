// ~/composables/useDynamicParticles.ts
import {computed} from 'vue';
import type {ISourceOptions, Container} from 'tsparticles-engine';
import {baseParticlesOptions} from '~/config/particles.base.config';
import type {Ref} from 'vue';

const darkThemeParticleColors: Partial<ISourceOptions> = {
    background: { // 新增/修改：深色主题时，粒子画布背景为深色 (例如黑色)
        color: {value: '#000000'}, // 或者一个深灰色，如 '#1f2937'
        opacity: 1,
    },
    particles: {
        color: {value: ['#FFFFFF', '#B0E0E6', '#ADD8E6']}, // 浅色粒子
        links: {color: '#FFFFFF', opacity: 0.4}
    },
    interactivity: {modes: {grab: {links: {opacity: 0.7}}}}
};

const lightThemeParticleColors: Partial<ISourceOptions> = {
    background: { // 新增/修改：浅色主题时，粒子画布背景为白色
        color: {value: '#FFFFFF'},
        opacity: 1,
    },
    particles: {
        color: {value: ['#2A303C', '#575F6B', '#3D4451']}, // 深色粒子
        links: {color: '#575F6B', opacity: 0.3}
    },
    interactivity: {modes: {grab: {links: {opacity: 0.9}}}}
};

export function useDynamicParticles(currentTheme: Ref<'light' | 'night'>) {
    const currentParticlesOptions = computed<ISourceOptions>(() => {
        const themeColorsToApply = currentTheme.value === 'light' ? lightThemeParticleColors : darkThemeParticleColors;

        // 深拷贝基础配置
        const finalOptions: ISourceOptions = JSON.parse(JSON.stringify(baseParticlesOptions));

        // 1. 合并主题特定的背景配置
        if (themeColorsToApply.background) {
            finalOptions.background = {
                // 如果基础配置中 background 有其他你想保留的属性，可以先展开
                // ...(finalOptions.background || {}),
                // 但通常我们希望主题配置完全覆盖背景颜色和透明度
                ...themeColorsToApply.background,
            };
        }

        // 2. 合并 particles 部分 (确保结构完整性)
        if (themeColorsToApply.particles) {
            if (!finalOptions.particles) {
                finalOptions.particles = {}; // 如果 base 中没有 particles, 初始化
            }
            if (themeColorsToApply.particles.color && finalOptions.particles) {
                finalOptions.particles.color = themeColorsToApply.particles.color;
            }
            if (themeColorsToApply.particles.links && finalOptions.particles) {
                finalOptions.particles.links = {
                    ...(finalOptions.particles.links || {enable: true}), // 保留基础 links 的属性
                    ...themeColorsToApply.particles.links, // 应用主题的 color 和 opacity
                };
            }
        } else if (finalOptions.particles && baseParticlesOptions.particles) {
            // 如果主题没有提供 particles 配置，确保使用基础配置（通常 JSON.parse 已处理）
            // 但如果只想确保颜色和链接颜色重置回基础配置的占位符（如果主题切换逻辑复杂）
            // finalOptions.particles.color = baseParticlesOptions.particles.color;
            // finalOptions.particles.links = { ...baseParticlesOptions.particles.links };
        }


        // 3. 合并 interactivity.modes.grab.links.opacity 部分
        const opacityToApply = themeColorsToApply.interactivity?.modes?.grab?.links?.opacity;
        const distanceToApply = themeColorsToApply.interactivity?.modes?.grab?.distance;

        if (opacityToApply !== undefined || distanceToApply !== undefined) {
            // 确保路径存在并正确更新
            if (!finalOptions.interactivity) finalOptions.interactivity = {};
            if (!finalOptions.interactivity.modes) finalOptions.interactivity.modes = {};
            if (!finalOptions.interactivity.modes.grab) finalOptions.interactivity.modes.grab = {};

            const baseGrabConfig = baseParticlesOptions.interactivity?.modes?.grab;
            const currentGrabConfig = finalOptions.interactivity.modes.grab;

            finalOptions.interactivity.modes.grab = {
                ...baseGrabConfig, // 先从基础配置获取 grab 的所有设置 (如 distance)
                ...currentGrabConfig, // 再覆盖当前 finalOptions 中已有的 grab 设置 (如果有的话)
                ...themeColorsToApply.interactivity?.modes?.grab, // 应用主题中的整个 grab 配置 (如果存在)
                links: { // 精细控制 links
                    ...(baseGrabConfig?.links || {}),
                    ...(currentGrabConfig?.links || {}),
                    ...(themeColorsToApply.interactivity?.modes?.grab?.links || {}),
                },
            };
            // 单独设置，确保覆盖
            if (opacityToApply !== undefined && finalOptions.interactivity.modes.grab.links) {
                finalOptions.interactivity.modes.grab.links.opacity = opacityToApply;
            }
            if (distanceToApply !== undefined) { // 如果主题也想改变 distance
                finalOptions.interactivity.modes.grab.distance = distanceToApply;
            }
        }

        return finalOptions;
    });

    const onParticlesLoaded = (container?: Container): void => {
        console.log('Particles loaded with theme:', currentTheme.value, container?.id);
    };

    return {
        currentParticlesOptions,
        onParticlesLoaded,
    };
}