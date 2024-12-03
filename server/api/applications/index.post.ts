import { z } from "zod";

export default defineEventHandler(async (event) => {
  const user = protectRoute(event);

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

  const application = await prisma.application.create({
    data: {
      name: parsedBody.data.name,
      description: parsedBody.data.description || "",
      user_id: user.id,
    },
  });

  if (!application) {
    throw createError({
      message: "An error occurred while creating the application",
      statusCode: 500,
    });
  }

  return {
    statusCode: 201,
    application: {
      id: application.id,
      name: application.name,
      description: application.description,
    },
  };
});
