import { INVITE_PATH } from "@flatsby/validators/invite";

export const dynamic = "force-static";

const APP_ID = "52U823A4VX.com.flatcove.app.v2";

export function GET() {
  return Response.json({
    applinks: {
      details: [
        {
          appIDs: [APP_ID],
          components: [{ "/": `${INVITE_PATH}/*` }],
        },
      ],
    },
    webcredentials: { apps: [APP_ID] },
  });
}
