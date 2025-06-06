const {PrismaClient} = require('@prisma/client/edge');
const {withAccelerate} = require('@prisma/extension-accelerate');

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient().$extends(withAccelerate());
} else {
    if (!global.__prisma) {
        global.__prisma = new PrismaClient().$extends(withAccelerate());
    }
    prisma = global.__prisma;
}

module.exports = prisma;