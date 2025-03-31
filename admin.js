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
        actions: {
          delete: {
            isVisible: true,
            handler: async (request, response, context) => {
              const { record } = context;
    
              const user = await User.findById(record.params._id);
              if (user) await user.remove(); // ✅ This triggers your pre('remove') hook              
    
              return {
                record: record.toJSON(),
                redirectUrl: context.h.resourceUrl(),
                notice: {
                  message: 'User and related posts deleted',
                  type: 'success',
                },
              };
            },
          },
        },
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
          // ✅ Comment setup
      'comments': { isVisible: true },
      'comments.text': { isVisible: true },
      'comments.author': {
        isVisible: true,
        reference: 'User', // 💡 This enables AdminJS's auto-populate
      },
      
          'comments.createdAt': { isVisible: true },

           // ✅ Replies setup
      'comments.replies': { isVisible: true },
      'comments.replies.text': { isVisible: true },
      'comments.replies.author': {
        isVisible: true,
        reference: 'User', // 💡 Populate reply author as well
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
