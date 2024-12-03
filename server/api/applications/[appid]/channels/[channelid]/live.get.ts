import dayjs from "dayjs";
import { parse } from "vue/compiler-sfc";

export default defineEventHandler(async (event) => {
  const user = protectRoute(event);

  const { appid, channelid } = event.context.params as {
    appid: string;
    channelid: string;
  };

  const query = getQuery(event);

  const lastLogId = query.lastLogId as string;
  const currentTimestamp = dayjs().unix();

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

  const hasValidLastLogId = lastLogId && !isNaN(parseInt(lastLogId));

  const parsedLastLogId = hasValidLastLogId ? parseInt(lastLogId) : 0;
  const parsedLastLogTimestamp = dayjs.unix(currentTimestamp).toISOString();

  const logs = await prisma.log.findMany({
    where: {
      channel: {
        id: channelid,
      },
      ...(hasValidLastLogId
        ? {
            // Use lastLogId to filter logs
            id: {
              gt: parsedLastLogId,
            },
          }
        : {
            // Fallback to using lastLogTimestamp to filter logs
            created: {
              gt: parsedLastLogTimestamp,
            },
          }),
    },
    orderBy: {
      created: "desc",
    },
  });

  return {
    logs: logs.map((log) => ({
      id: log.id,
      created: log.created,
      level: log.level,
      thread: log.thread,
      type: log.type,
      message: log.message,
    })),
  };
});
