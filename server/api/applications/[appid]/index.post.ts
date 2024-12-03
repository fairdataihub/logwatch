import { z } from "zod";

export default defineEventHandler(async (event) => {
  const user = protectRoute(event);

  const { appid } = event.context.params as { appid: string };

  const bodySchema = z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
    })
    .strict();

  const body = await readBody(event);

  // Check if the body is present
  if (!body) {
    throw createError({
      message: "Missing required fields",
      statusCode: 400,
    });
  }

  // Check if the body is valid
  const parsedBody = bodySchema.safeParse(body);

  if (!parsedBody.success) {
    console.log(parsedBody.error);

    throw createError({
      message: "The provided parameters are invalid",
      statusCode: 400,
    });
  }

  const channel = await prisma.channel.create({
    data: {
      name: parsedBody.data.name,
      description: parsedBody.data.description || "",
      application_id: appid,
      expiration: 1440, // 24 hours
    },
  });

  if (!channel) {
    throw createError({
      message: "An error occurred while creating the channel",
      statusCode: 500,
    });
  }

  return {
    statusCode: 201,
    channel,
  };
});
