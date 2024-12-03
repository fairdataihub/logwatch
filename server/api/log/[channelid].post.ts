import { z } from "zod";
import dayjs from "dayjs";

export default defineEventHandler(async (event) => {
  const { channelid } = event.context.params as { channelid: string };

  const bodySchema = z
    .object({
      level: z.union([
        z.literal("info"),
        z.literal("warn"),
        z.literal("error"),
        z.literal("debug"),
        z.literal("fatal"),
        z.literal("trace"),
        z.literal("time"),
      ]),
      message: z.string().optional(),
      type: z.union([z.literal("json"), z.literal("text")]).optional(),
      thread: z.number().optional(),
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
      message: `The provided parameters are invalid: ${parsedBody.error.issues
        .map((issue) => issue.message)
        .join(", ")}`,
      statusCode: 400,
    });
  }

  const log = await prisma.log.create({
    data: {
      level: parsedBody.data.level || "info",
      message: parsedBody.data.message || "",
      type: parsedBody.data.type || "text",
      thread: parsedBody.data.thread || -1,
      channel_id: channelid,
    },
  });

  if (!log) {
    throw createError({
      message: "An error occurred while creating the log",
      statusCode: 500,
    });
  }

  // hacks
  // Delete expired logs. Only run with a random chance of 5%
  if (Math.random() < 0.05) {
    const channel = await prisma.channel.findFirst({
      include: {
        application: true,
      },
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

    const now = dayjs();
    const { expiration } = channel; // in mins

    const expirationTime = now.subtract(expiration, "minutes");

    await prisma.log.deleteMany({
      where: {
        channel: {
          id: channelid,
        },
        created: {
          lte: expirationTime.toDate(),
        },
      },
    });
  }

  // Return a 201 status code
  return {
    statusCode: 201,
  };
});
