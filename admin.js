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
          'comments': {
            type: 'mixed',
            isArray: true,
            isVisible: { list: false, filter: false, show: true, edit: true },
          },
          'comments.text': { type: 'textarea', isVisible: true },
          'comments.author': {
            isVisible: true,
            components: {
              show: AdminJS.bundle('./components/UserRef.jsx'), // shows username
            },
          },
          'comments.createdAt': { isVisible: true },
           // ✅ REPLIES section
      'comments.replies': {
        type: 'mixed',
        isArray: true,
        isVisible: { list: false, filter: false, show: true, edit: true },
      },
      'comments.replies.text': { type: 'textarea', isVisible: true },
      'comments.replies.author': {
        isVisible: true,
        components: {
          show: AdminJS.bundle('./components/UserRef.jsx'),
        },
      },
      'comments.replies.createdAt': { isVisible: true },
      showProperties: [
        'title', 'author', 'category', 'content', 'image', 'music',
        'comments', 'comments.text', 'comments.author', 'comments.createdAt',
        'comments.replies', 'comments.replies.text', 'comments.replies.author', 'comments.replies.createdAt'
      ],
      editProperties: [
        'title', 'category', 'content', 'image', 'music',
        'comments', 'comments.text', 'comments.author',
        'comments.replies', 'comments.replies.text', 'comments.replies.author'
      ],
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
