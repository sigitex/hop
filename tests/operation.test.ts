import { expect, test } from "bun:test"
import { HopError, operation } from "@sigitex/hop/api"
import { type } from "arktype"

test("validates input and output", async () => {
  const handler = operation(
    { input: type({ name: "string" }), output: type.string },
    async ({ name }) => name.toUpperCase(),
  )

  expect(await handler(context({ name: "hop" }))).toBe("HOP")
  await expect(handler(context({ name: 1 }))).rejects.toEqual(
    new HopError(400, "Invalid parameters."),
  )
})

test("uses null on the wire for an operation without input", async () => {
  let received: unknown = "not called"
  const handler = operation({}, async (input) => {
    received = input
  })

  expect(await handler(context(null))).toBeUndefined()
  expect(received).toBeUndefined()
  await expect(handler(context({}))).rejects.toEqual(
    new HopError(400, "Invalid parameters."),
  )
})

test("rejects invalid output", async () => {
  const handler = operation(
    { input: type.null, output: type.string },
    async () => 1 as never,
  )

  await expect(handler(context(null))).rejects.toEqual(
    new HopError(500, "Operation returned an invalid response."),
  )
})

function context(input: unknown) {
  return {
    request: new Request("http://hop.test/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  } as never
}
