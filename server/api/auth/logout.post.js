import {defineEventHandler, setCookie} from 'h3';

export default defineEventHandler(async (event) => {
    try {
        // 清除名为 'auth_token' 的 cookie
        // 通过将其 MaxAge 设置为 0 或一个过去的 Expires 日期来实现
        setCookie(event, 'auth_token', '', { // 值设为空
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0, // 立即过期
            path: '/',   // 确保 path 与登录时设置的 path 一致
        });

        // 你也可以清除其他与会话相关的cookie（如果有的话）

        event.node.res.statusCode = 200;
        return {success: true, message: '成功退出登录'};

    } catch (error) {
        console.error('登出时发生错误:', error);
        event.node.res.statusCode = 500;
        return {success: false, message: '登出时发生服务器内部错误'};
    }
});