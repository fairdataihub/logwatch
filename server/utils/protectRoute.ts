import type { User, Session } from "lucia";

export default defineEventHandler((event) => {
  const user = event.context.user as User | null;
  const session = event.context.session as Session | null;

  if (!user || !session) {
    throw createError({
      statusCode: 401,
      statusMessage: "unauthorized",
    });
  }

  return user;
});
