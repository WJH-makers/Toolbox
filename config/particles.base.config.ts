import type {ISourceOptions} from 'tsparticles-engine';

export const baseParticlesOptions: ISourceOptions = {
    autoPlay: true,
    background: {
        color: {value: 'transparent'}, // 背景透明，由CSS控制页面背景
        opacity: 0,
    },
    fullScreen: {enable: true, zIndex: -1}, // 粒子效果作为全屏背景，位于最底层
    particles: {
        number: {value: 80, density: {enable: true, value_area: 800}}, // 粒子数量和密度
        color: {value: '#ccc'}, // 粒子颜色 - 会被主题动态覆盖
        shape: {type: 'circle'}, // 粒子形状
        opacity: {
            value: {min: 0.3, max: 0.8}, // 粒子透明度范围
            animation: {enable: true, speed: 1, minimumValue: 0.1, sync: false} // 透明度动画
        },
        size: {
            value: {min: 1, max: 3}, // 粒子大小范围
            animation: {enable: true, speed: 2, minimumValue: 0.1, sync: false} // 大小动画
        },
        links: {
            distance: 150, // 粒子间连接线的最大距离
            enable: true,  // 启用粒子间的连接线
            width: 1,      // 连接线的宽度
            color: '#ccc',   // 连接线颜色 - 会被主题动态覆盖
            opacity: 0.4,  // 连接线透明度 - 会被主题动态覆盖
        },
        move: {
            direction: 'none',    // 移动方向
            enable: true,         // 启用粒子移动
            outModes: {default: 'bounce'}, // 粒子移出边界时的行为：反弹
            random: false,        // 非随机移动（如果 direction 不是 'none'，则按指定方向）
            speed: 2,             // 移动速度
            straight: false       // 非直线移动（路径会略微弯曲）
        },
    },
    interactivity: {
        detectsOn: 'canvas', // 在画布区域检测交互事件
        events: {
            onHover: {
                enable: true,
                mode: ['grab', 'bubble'] // 修改处：同时启用 grab 和 bubble 模式
            },
            onClick: {
                enable: true,
                mode: 'push' // 点击时 PUSH 新粒子
            },
            resize: {
                 delay: 0.5, // 调整窗口大小时的延迟（秒）
                 enable: true // 响应窗口大小调整
            }
        },
        modes: {
            grab: {
                distance: 140,    // 抓取模式的互动距离
                links: {
                    opacity: 1    // 抓取时连接线的透明度 - 会被主题动态覆盖
                }
            },
            bubble: { // 气泡模式的配置
                distance: 250, // 气泡模式的互动距离（比之前略小，避免与grab冲突过大）
                size: 30,      // 粒子变大的尺寸
                duration: 2,   // 气泡效果的持续时间（秒）
                opacity: 0.8   // 气泡状态下的透明度
            },
            repulse: { // 排斥模式的配置
                distance: 200,
                duration: 0.4
            },
            push: { // 推入新粒子的配置
                quantity: 4
            },
            remove: { // 移除粒子的配置
                quantity: 2
            },
        },
    },
    detectRetina: true, // 启用Retina屏幕检测，使粒子在高清屏上更清晰
};