// admin.js

import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose'; // ✅ fixed
import mongoose from 'mongoose';
import User from './models/user.js';
import Post from './models/Post.js';

AdminJS.registerAdapter(AdminJSMongoose);

// ✅ Configure AdminJS
const adminJs = new AdminJS({
  databases: [mongoose], // You can also list models separately
  rootPath: '/admin',
  resources: [
    {
      resource: User,
      options: {
        properties: {
          password: { isVisible: false },
          resetPasswordToken: { isVisible: false },
          resetPasswordExpires: { isVisible: false },
          confirmationCode: { isVisible: false },
          confirmationCodeExpires: { isVisible: false },
        },
      },
    },
    {
      resource: Post,
      options: {
        properties: {
          content: { type: 'richtext' },
          image: {
            isVisible: {
              list: true,
              filter: false,
              show: true,
              edit: false,
            },
          },
          music: {
            isVisible: {
              list: false,
              filter: false,
              show: true,
              edit: false,
            },
          },
        },
      },
    },
  ],
  branding: {
    companyName: 'SLXXK Blog Admin',
    logo: false,
    softwareBrothers: false,
  },
});

// ✅ Admin Auth - Basic login setup
const ADMIN = {
  email: 'admin@slxxk.com',
  password: 'admin123', // You can load this securely from .env later
};

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate: async (email, password) => {
    if (email === ADMIN.email && password === ADMIN.password) {
      return ADMIN;
    }
    return null;
  },
  cookieName: 'adminjs',
  cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'supersecret',
});

export { adminJs, adminRouter };
