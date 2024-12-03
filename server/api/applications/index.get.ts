export default defineEventHandler(async (event) => {
  const user = protectRoute(event);

  // Get the user's applications
  const applications = await prisma.application.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      channels: true,
    },
    // where: {
    //   user_id: user.id,
    // },
  });

  return applications || [];
});
