import dotenv from 'dotenv';
dotenv.config();

import { Lucia } from "lucia";
import { Mysql2Adapter } from "@lucia-auth/adapter-mysql";
import { createPool } from "mysql2/promise";

const DATABASE_URL = "mysql://root:WriKIrvuNTqyWuNeoIwAIYDgZdMvZlif@interchange.proxy.rlwy.net:36698/railway";

export const db = createPool({
  host: 'interchange.proxy.rlwy.net',
  port: 36698,
  user: 'root',
  password: 'WriKIrvuNTqyWuNeoIwAIYDgZdMvZlif',
  database: 'railway',
  ssl: { rejectUnauthorized: false },
  connectionLimit: 5,
  connectTimeout: 30000,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

export const auth = new Lucia(
  new Mysql2Adapter(db, {
    user: "auth_user",
    session: "auth_session"
  }),
  {
    getUserAttributes: (attributes) => ({
      email: attributes.email,
      name: attributes.name
    })
  }
);
