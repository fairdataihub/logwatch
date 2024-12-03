export default defineEventHandler(async (event) => {
  const user = protectRoute(event);

  const { appid } = event.context.params as { appid: string };

  const application = await prisma.application.findUnique({
    include: {
      channels: {
        orderBy: {
          created: "desc",
        },
      },
    },
    where: { id: appid },
  });

  if (!application) {
    throw createError({
      message: "Application not found",
      statusCode: 404,
    });
  }

  return {
    id: application.id,
    name: application.name,
    description: application.description,
    channels: application.channels,
  };
});
