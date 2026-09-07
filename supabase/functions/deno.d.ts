// Minimal ambient declarations for the Deno globals used by these Edge
// Functions. Supabase runs these files on Deno at deploy time regardless
// of what any editor/tsc thinks -- this file has zero effect on runtime
// behavior. It exists only so editors without the Deno extension (and
// TypeScript's per-file "inferred project" fallback, since
// supabase/functions is excluded from tsconfig.json) can resolve `Deno`
// instead of reporting "Cannot find name 'Deno'".
//
// Referenced via `/// <reference path="../deno.d.ts" />` at the top of
// each function's index.ts.

declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  const env: {
    get(key: string): string | undefined;
  };
}
