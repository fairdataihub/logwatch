import { z } from "zod";

export default defineEventHandler(async (event) => {
  const user = protectRoute(event);

  const { appid, channelid } = event.context.params as {
    appid: string;
    channelid: string;
  };

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

  const channel = await prisma.channel.findFirst({
    where: {
      id: channelid,
    },
  });

  if (!channel) {
    throw createError({
      message: "Channel not found",
      statusCode: 404,
    });
  }

  const updatedChannel = await prisma.channel.update({
    where: {
      id: channelid,
    },
    data: {
      name: parsedBody.data.name,
      description: parsedBody.data.description || "",
    },
  });

  return {
    statusCode: 201,
    channel,
  };
});
