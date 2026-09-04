import { HopError } from "./HopError"

export { HopError } from "./HopError"

export function proxy<Operations>(base: string) {
  return createProxy(base, []) as Calls<Operations>
}

export type Calls<Operations> = {
  [Name in keyof Operations]: Operations[Name] extends {
    input: { infer: infer Input }
    output: { infer: infer Output }
  }
    ? (
        ...args: Input extends undefined ? [] : [input: Input]
      ) => Promise<Output>
    : Calls<Operations[Name]>
}

function createProxy(base: string, ancestors: string[]): unknown {
  return new Proxy(() => {}, {
    get(_target, name) {
      if (typeof name !== "string") {
        return
      }
      return createProxy(base, [...ancestors, name])
    },
    async apply(_target, _this, args) {
      const url = [base, ...ancestors].join("/")
      return send(url, args[0])
    },
  })
}

async function send(url: string, args: unknown) {
  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args ?? null),
      signal: AbortSignal.timeout(5000),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Request timed out.", { cause: error })
    }
    throw error instanceof Error ? error : new Error(String(error))
  }
  const result: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : response.statusText
    throw new HopError(response.status, message)
  }
  return result
}