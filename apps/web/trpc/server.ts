import type { ServerRouter } from "@repo/trpc/client";
import { createTRPCProxyClient } from "@repo/trpc/client";
import { headers } from "next/headers";
import { createTRPCHttpBatchClientClient } from "~/trpc/create-client";

export async function getServerApi() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  return createTRPCProxyClient<ServerRouter>({
    links: [
      createTRPCHttpBatchClientClient({
        headers: cookie ? { cookie } : undefined,
      }),
    ],
  });
}

export async function getServerStreamingApi() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  return createTRPCProxyClient<ServerRouter>({
    links: [
      createTRPCHttpBatchClientClient({
        enableStreaming: true,
        headers: cookie ? { cookie } : undefined,
      }),
    ],
  });
}
