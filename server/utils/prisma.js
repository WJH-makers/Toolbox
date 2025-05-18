// server/utils/prisma.js
import {PrismaClient} from '@prisma/client';

// eslint-disable-next-line import/no-mutable-exports
let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    if (!global.__prisma) {
        global.__prisma = new PrismaClient();
    }
    prisma = global.__prisma;
}

export default prisma;