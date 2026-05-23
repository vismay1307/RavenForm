import { createTRPCReact } from "@trpc/react-query";
import type { ServerRouter, RouterInputs, RouterOutputs } from "@repo/trpc/client";

export const trpc = createTRPCReact<ServerRouter>();

export type { ServerRouter, RouterInputs, RouterOutputs };