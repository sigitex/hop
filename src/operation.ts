// oxlint-disable typescript/no-explicit-any
import type { RequestHandler } from "@sigitex/route"
import { type, type Type } from "arktype"
import { HopError } from "./HopError"

type Undefined = typeof type.undefined

export function operation<
  Input extends Type | undefined,
  Output extends Type | undefined,
>(
  { checks, input, output }: OperationParams<Input, Output>,
  execute: (
    input: Input extends Type ? Input["infer"] : undefined,
    context: any,
  ) => Promise<Output extends Type ? Output["infer"] : undefined>,
): OperationHandler<
  Input extends Type ? Input : Undefined,
  Output extends Type ? Output : Undefined
> {
  const handler = async (context: any) => {
    const raw = await parseInput(context.request)
    const valid = validateInput(input, raw)
    for (const check of checks ?? []) {
      await check(context)
    }
    const result = await execute(valid as any, context)
    if (!output) {
      return result
    }
    const validOutput = output(result)
    if (validOutput instanceof type.errors) {
      throw new HopError(500, "Operation returned an invalid response.")
    }
    return validOutput
  }
  handler.input = input ?? type.undefined
  handler.output = output ?? type.undefined
  return handler as OperationHandler<
    Input extends Type ? Input : Undefined,
    Output extends Type ? Output : Undefined
  >
}

export type Operations = {
  [key: string]: OperationHandler<Type, Type> | Operations
}

export type OperationCheck = (context: any) => void | Promise<void>

export type OperationParams<
  Input extends Type | undefined,
  Output extends Type | undefined,
> = {
  checks?: readonly OperationCheck[]
  input?: Input
  output?: Output
}

export type OperationHandler<
  Input extends Type,
  Output extends Type,
> = RequestHandler & {
  input: Input
  output: Output
}

async function parseInput(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new HopError(400, "Invalid JSON body.")
  }
}

function validateInput(input: Type | undefined, raw: unknown): unknown {
  if (!input) {
    if (raw !== null) {
      throw new HopError(400, "Invalid parameters.")
    }
    return undefined
  }
  const valid = input(raw)
  if (valid instanceof type.errors) {
    throw new HopError(400, "Invalid parameters.")
  }
  return valid
}
