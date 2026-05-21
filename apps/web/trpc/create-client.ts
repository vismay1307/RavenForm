import { httpLink, httpBatchStreamLink } from "@repo/trpc/client";
import { env } from "~/env.js";

interface CreateTRPCHttpBatchClientClientOpts {
  enableStreaming?: boolean;
  headers?: HeadersInit;
}

export const createTRPCHttpBatchClientClient = (opts?: CreateTRPCHttpBatchClientClientOpts) => {
  const c = opts?.enableStreaming ? httpBatchStreamLink : httpLink;
  const apiBaseUrl = env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const url = apiBaseUrl.endsWith("/trpc") ? apiBaseUrl : `${apiBaseUrl}/trpc`;

  return c({
    url,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          ...options?.headers,
          ...opts?.headers,
        },
      });
    },
  });
};
