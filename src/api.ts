// oxlint-disable typescript/no-explicit-any
import {
  HTTP,
  MethodNotAllowed,
  RouterError,
  type RequestContext,
  type RequestHandler,
} from "@sigitex/route"
import { HopError } from "./HopError"
import type { OperationHandler, Operations } from "./operation"

export { HopError } from "./HopError"
export {
  operation,
  type OperationCheck,
  type OperationHandler,
  type OperationParams,
  type Operations,
} from "./operation"

type Table = Map<string, OperationHandler<any, any>>

export function api(operations: Operations): RequestHandler {
  const table: Table = new Map()
  walk([], operations, table)
  return async (context: RequestContext) => {
    if (context.request.method !== HTTP.method.POST) {
      throw new MethodNotAllowed()
    }
    const handler = table.get(context.url.pathname)
    if (!handler) {
      return
    }
    try {
      return await context.dispatch(handler, [])
    } catch (error) {
      if (error instanceof HopError) {
        throw new RouterError(error.status, error.message)
      }
      throw error
    }
  }
}

function walk(ancestors: string[], operations: Operations, table: Table) {
  for (const [name, operation] of Object.entries(operations)) {
    if (typeof operation === "function") {
      table.set(`/${[...ancestors, name].join("/")}`, operation)
    } else {
      walk([...ancestors, name], operation, table)
    }
  }
}
