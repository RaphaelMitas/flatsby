import type { Locale } from "@flatsby/i18n/locale";
import { Context } from "effect";

export class CurrentRequest extends Context.Service<
  CurrentRequest,
  {
    readonly user: { readonly id: string };
    readonly locale: Locale;
    readonly path: string;
    readonly requestId: string;
  }
>()("@flatsby/api/effect/services/CurrentRequest") {}
