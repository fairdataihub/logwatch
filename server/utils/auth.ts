import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { GitHub } from "arctic";
import { PrismaClient } from "@prisma/client";
// import { webcrypto } from "node:crypto";

// If we are in a node 18 environment, we need to polyfill webcrypto
// if (process.version.startsWith("v18")) {
// @ts-ignore
// globalThis.crypto = webcrypto as Crypto;
// }

const client = new PrismaClient();

const adapter = new PrismaAdapter(client.session, client.user);

export const github = new GitHub(
  process.env.GH_CLIENT_ID!,
  process.env.GH_CLIENT_SECRET!,
);

export const lucia = new Lucia(adapter, {
  getUserAttributes: (attributes) => {
    return {
      username: attributes.username,
      githubId: attributes.github_id,
    };
  },
  sessionCookie: {
    attributes: {
      secure: !import.meta.dev,
    },
  },
});

interface DatabaseUserAttributes {
  github_id: number;
  username: string;
}

declare module "lucia" {
  interface Register {
    DatabaseUserAttributes: DatabaseUserAttributes;
    Lucia: typeof lucia;
  }
}
