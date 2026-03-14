import { autumnHandler } from "autumn-js/next";

import { auth } from "~/auth/server";

const handler = autumnHandler({
  identify: async (request: Request) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      console.warn("[autumn] identify: no session found for request");
      return null;
    }
    return {
      customerId: session.user.id,
      customerData: {
        name: session.user.name,
        email: session.user.email,
      },
    };
  },
});

export const GET = handler.GET;
export const POST = handler.POST;
export const DELETE = handler.DELETE;
