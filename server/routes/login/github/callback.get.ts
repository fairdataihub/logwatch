import { OAuth2RequestError } from "arctic";
import { generateIdFromEntropySize } from "lucia";
import { github } from "~/server/utils/auth";

interface GitHubUser {
  id: string;
  login: string;
}

if (!process.env.GH_ALLOWED_ORGS && !process.env.GITHUB_ALLOWED_USERS) {
  throw new Error(
    "GH_ALLOWED_ORGS or GITHUB_ALLOWED_USERS must be provided in the environment",
  );
}

const GH_ALLOWED_ORGS = process.env.GH_ALLOWED_ORGS?.split(",") ?? [];
const GITHUB_ALLOWED_USERS = process.env.GITHUB_ALLOWED_USERS?.split(",") ?? [];

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const code = query.code?.toString() ?? null;
  const state = query.state?.toString() ?? null;

  const storedState = getCookie(event, "github_oauth_state") ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    throw createError({
      status: 400,
    });
  }

  try {
    const tokens = await github.validateAuthorizationCode(code);

    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    const githubUser: GitHubUser = await githubUserResponse.json();

    /**
     * Check if the user is in the allowed orgs or users
     * If allowed orgs are provided, the allowed users are ignored
     * If no allowed orgs are provided, the allowed users are used
     * If no allowed orgs or users are provided, all users are allowed
     */

    if (GH_ALLOWED_ORGS.length > 0) {
      const orgsResponse = await fetch(
        `https://api.github.com/users/${githubUser.login}/orgs`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        },
      );

      const orgs = await orgsResponse.json();

      const allowedOrgs = GH_ALLOWED_ORGS;

      const userOrgs = orgs.map((org: any) => org.login);

      if (!userOrgs.some((org: any) => allowedOrgs.includes(org))) {
        throw createError({
          status: 403,
          statusMessage: "User is not authorized to access this platform",
        });
      }

      // User is in an allowed org
    } else if (GITHUB_ALLOWED_USERS.length > 0) {
      const allowedUsers = GITHUB_ALLOWED_USERS;

      if (!allowedUsers.includes(githubUser.login)) {
        throw createError({
          status: 403,
          statusMessage: "User is not authorized to access this platform",
        });
      }

      // User is in allowed users
    } else {
      // All users are allowed
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        github_id: parseInt(githubUser.id),
      },
    });

    if (existingUser) {
      const { id } = existingUser;

      const session = await lucia.createSession(id, {});

      appendHeader(
        event,
        "Set-Cookie",
        lucia.createSessionCookie(session.id).serialize(),
      );

      return sendRedirect(event, "/");
    }

    const userId = generateIdFromEntropySize(10); // 16 characters long

    await prisma.user.create({
      data: {
        id: userId,
        github_id: parseInt(githubUser.id),
        username: githubUser.login,
      },
    });

    const session = await lucia.createSession(userId, {});

    appendHeader(
      event,
      "Set-Cookie",
      lucia.createSessionCookie(session.id).serialize(),
    );
    return sendRedirect(event, "/");
  } catch (e) {
    if (e === "User is not authorized to access this platform") {
      throw createError({
        status: 403,
        statusMessage: "User is not authorized to access this platform",
      });
    }

    // the specific error message depends on the provider
    if (e instanceof OAuth2RequestError) {
      // invalid code
      throw createError({
        status: 400,
      });
    }

    throw createError({
      message: (e as any) ?? "An error occurred",
      status: 500,
    });
  }
});
