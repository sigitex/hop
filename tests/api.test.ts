import { expect, test } from "bun:test"
import { api, HopError, operation } from "@sigitex/hop/api"
import { RouterError, type RequestContext } from "@sigitex/route"
import { type } from "arktype"

test("dispatches nested operations by path", async () => {
  const handler = operation(
    { input: type.string, output: type.string },
    async (input) => input.toUpperCase(),
  )
  const requestHandler = api({ nested: { uppercase: handler } })

  expect(await requestHandler(context("/nested/uppercase", "hop"))).toBe("HOP")
})

test("preserves undefined as fall-through", async () => {
  const requestHandler = api({ empty: operation({}, async () => {}) })

  expect(await requestHandler(context("/empty", null))).toBeUndefined()
  expect(await requestHandler(context("/missing", null))).toBeUndefined()
})

test("translates HopError for route", async () => {
  const requestHandler = api({
    conflict: operation({ input: type.null }, async () => {
      throw new HopError(409, "Conflict.")
    }),
  })

  await expect(requestHandler(context("/conflict", null))).rejects.toEqual(
    new RouterError(409, "Conflict."),
  )
})

function context(path: string, input: unknown): RequestContext {
  const request = new Request(`http://hop.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  const requestContext = {
    request,
    url: new URL(request.url),
  } as RequestContext
  return {
    ...requestContext,
    dispatch: async (handler) => {
      const result = await handler(requestContext)
      return result as never
    },
  } as RequestContext
}
