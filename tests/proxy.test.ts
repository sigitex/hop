import { afterEach, expect, mock, test } from "bun:test"
import { proxy, HopError } from "../src/proxy"
import type { operation } from "@sigitex/hop/api"
import { type } from "arktype"

type Operations = {
  nested: {
    uppercase: ReturnType<
      typeof operation<typeof type.string, typeof type.string>
    >
  }
  ping: ReturnType<typeof operation<undefined, typeof type.string>>
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("calls a nested operation", async () => {
  const fetch = mock(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json("HOP"),
  )
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch
  const client = proxy<Operations>("/api")

  expect(await client.nested.uppercase("hop")).toBe("HOP")
  expect(fetch).toHaveBeenCalledTimes(1)
  const [url, init] = fetch.mock.calls[0]
  expect(url).toBe("/api/nested/uppercase")
  expect(init?.body).toBe('"hop"')
})

test("sends null for an operation without input", async () => {
  const fetch = mock(async (_input: RequestInfo | URL, _init?: RequestInit) =>
    Response.json("pong"),
  )
  globalThis.fetch = fetch as unknown as typeof globalThis.fetch
  const client = proxy<Operations>("/api")

  expect(await client.ping()).toBe("pong")
  expect(fetch.mock.calls[0][1]?.body).toBe("null")
})

test("throws HopError with response status", async () => {
  globalThis.fetch = mock(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ error: "Conflict." }, { status: 409 }),
  ) as unknown as typeof globalThis.fetch
  const client = proxy<Operations>("/api")

  await expect(client.ping()).rejects.toEqual(new HopError(409, "Conflict."))
})
