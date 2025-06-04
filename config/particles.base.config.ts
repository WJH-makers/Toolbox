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
            random: true,        // 修改处：让粒子初始移动更随机一些
            speed: 1.5,             // 修改处：稍微降低基础速度，让交互更明显
            straight: false,       // 非直线移动（路径会略微弯曲）
            trail: { // 新增：为移动的粒子添加轻微拖尾效果
                enable: false, // 按需开启，可能会影响性能
                fill: {color: '#000000'}, // 拖尾颜色
                length: 5, // 拖尾长度
            }
        },
    },
    interactivity: {
        detectsOn: 'canvas', // 在画布区域检测交互事件
        events: {
            onHover: {
                enable: true,
                mode: ['grab', 'bubble', 'repulse'], // 修改处：同时启用 grab, bubble 和 repulse 模式
                parallax: { // 新增：启用鼠标悬停时的视差效果
                    enable: true,
                    force: 30, // 视差强度，数值越大效果越明显
                    smooth: 10 // 视差平滑度
                }
            },
            onClick: {
                enable: true,
                mode: 'push' // 点击时 PUSH 新粒子
            },
            resize: {
                delay: 0.5,
                enable: true
            }
        },
        modes: {
            grab: {
                distance: 140,
                links: {
                    opacity: 0.8 // 修改处：稍微调高抓取时连接线的透明度
                }
            },
            bubble: {
                distance: 200, // 修改处：调整互动距离
                size: 20,      // 修改处：调整粒子变大的尺寸
                duration: 0.4, // 修改处：调整气泡效果的持续时间
                opacity: 0.8
            },
            repulse: { // 排斥模式的配置 (之前已定义，现在在onHover中启用)
                distance: 100, // 修改处：调整排斥距离
                duration: 0.4,
                factor: 100, // 排斥强度
                speed: 1, // 排斥速度
                maxSpeed: 50, // 排斥时最大速度
                easing: 'ease-out-quad', // 排斥动画缓动效果
            },
            push: {
                quantity: 4
            },
            remove: {
                quantity: 2
            },
            attract: { // 新增：如果需要吸引效果，可以取消注释并配置
                distance: 200,
                duration: 0.4,
                factor: 5, // 吸引强度
                speed: 1,
                maxSpeed: 50,
                easing: 'ease-out-quad'
            }
        },
    },
    detectRetina: true,
};

