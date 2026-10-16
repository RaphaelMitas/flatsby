import { INVITE_PATH } from "@flatsby/validators/invite";

export const dynamic = "force-static";

export function GET() {
  return Response.json({
    applinks: {
      details: [
        {
          appIDs: ["52U823A4VX.com.flatcove.app.v2"],
          components: [{ "/": `${INVITE_PATH}/*` }],
        },
      ],
    },
  });
}
