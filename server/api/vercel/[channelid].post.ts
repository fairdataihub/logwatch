import { z } from "zod";
import dayjs from "dayjs";

export default defineEventHandler(async (event) => {
  const { channelid } = event.context.params as { channelid: string };

  const bodySchema = z.array(
    z.object({
      id: z.string(),
      deploymentId: z.string(),
      source: z.string(),
      host: z.string(),
      timestamp: z.number(),
      projectId: z.string(),
      level: z.string(),
      message: z.string().optional(),
      buildId: z.string().optional(),
      entrypoint: z.string().optional(),
      destination: z.string().optional(),
      path: z.string().optional(),
      type: z.string().optional(),
      statusCode: z.number().optional(),
      requestId: z.string().optional(),
      environment: z.string().optional(),
      branch: z.string().optional(),
      ja3Digest: z.string().optional(),
      ja4Digest: z.string().optional(),
      edgeType: z.string().optional(),
      projectName: z.string().optional(),
      executionRegion: z.string().optional(),
      traceId: z.string().optional(),
      spanId: z.string().optional(),
      proxy: z
        .object({
          timestamp: z.number(),
          method: z.string(),
          host: z.string(),
          path: z.string(),
          userAgent: z.array(z.string()),
          region: z.string(),
          referer: z.string().optional(),
          statusCode: z.number().optional(),
          clientIp: z.string().optional(),
          scheme: z.string().optional(),
          responseByteSize: z.number().optional(),
          cacheId: z.string().optional(),
          pathType: z.string().optional(),
          pathTypeVariant: z.string().optional(),
          vercelId: z.string().optional(),
          vercelCache: z.string().optional(),
          lambdaRegion: z.string().optional(),
          wafAction: z.string().optional(),
          wafRuleId: z.string().optional(),
        })
        .optional(),
    }),
  );

  const body = await readBody(event);

  // Check if the body is present
  if (!body) {
    throw createError({
      message: "Missing required fields",
      statusCode: 400,
    });
  }

  console.log("Body:", JSON.stringify(body, null, 2));

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

  const logs = parsedBody.data.map(async (l) => {
    const level = l.level || "info";
    const message = JSON.stringify(l) || "{}";

    const log = await prisma.log.create({
      data: {
        level,
        message,
        type: "json",
        thread: -1,
        channel_id: channelid,
      },
    });

    if (!log) {
      throw createError({
        message: "An error occurred while creating the log",
        statusCode: 500,
      });
    }
  });

  console.log("Created logs:", logs.length);

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
