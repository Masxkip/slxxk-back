// admin.js

import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import mongoose from 'mongoose';

import User from './models/user.js';
import Post from './models/Post.js';

AdminJS.registerAdapter(AdminJSMongoose);

const adminJs = new AdminJS({
  rootPath: '/admin',
  databases: [mongoose],
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

          // 💬 Show Comments + Replies in Show View
          'comments': {
            isVisible: { list: false, show: true, edit: false },
          },
          'comments.text': { isVisible: false },
          'comments.author': { isVisible: false },
          'comments.replies': { isVisible: false },
        },
        showProperties: ['title', 'author', 'category', 'content', 'image', 'music', 'comments'],
      },
    },
  ],
  branding: {
    companyName: 'SLXXK Blog Admin',
    logo: false,
    softwareBrothers: false,
  },
});

// ✅ Admin Auth (from .env)
const ADMIN = {
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
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
