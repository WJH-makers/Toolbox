import {defineEventHandler, setCookie} from 'h3';

export default defineEventHandler(async (event) => {
    try {
        setCookie(event, 'auth_token', '', { // 值设为空
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });
        event.node.res.statusCode = 200;
        return {success: true, message: '成功退出登录'};
    } catch (error) {
        event.node.res.statusCode = 500;
        return {success: false, message: '登出时发生服务器内部错误'};
    }
});