import dayjs from "dayjs";

export default defineEventHandler(async (event) => {
  const user = protectRoute(event);

  const { appid, channelid } = event.context.params as {
    appid: string;
    channelid: string;
  };

  const query = getQuery(event);

  const period = (query.period as number) || 300;

  const channel = await prisma.channel.findFirst({
    include: {
      application: true,
    },
    where: {
      id: channelid,
    },
  });

  const now = dayjs();
  const startTime = now.subtract(period, "seconds");

  if (!channel) {
    throw createError({
      message: "Channel not found",
      statusCode: 404,
    });
  }

  // hacky but works
  // Delete logs older than expiration
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

  const logs = await prisma.log.findMany({
    where: {
      channel: {
        id: channelid,
      },
      created: {
        gte: startTime.toDate(),
        lte: now.toDate(),
      },
    },
    orderBy: {
      created: "desc",
    },
  });

  return {
    channel: {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      expiration: channel.expiration,
    },
    application: {
      id: channel.application.id,
      name: channel.application.name,
    },
    logs: logs.map((log) => ({
      id: log.id,
      type: log.type,
      thread: log.thread,
      level: log.level,
      message: log.message,
      created: log.created,
    })),
  };
});
