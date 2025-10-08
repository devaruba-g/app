import { Lucia } from "lucia";
import { Mysql2Adapter } from "@lucia-auth/adapter-mysql";
import { createPool } from "mysql2/promise";
import "dotenv/config";


const DATABASE_URL = "mysql://root:WriKIrvuNTqyWuNeoIwAIYDgZdMvZlif@interchange.proxy.rlwy.net:36698/railway";
export const db = createPool({
  uri: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const auth = new Lucia(
  new Mysql2Adapter(db, {
    user: "auth_user",
    session: "auth_session"
  }), {
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      name: attributes.name
    };
  }
}
);
