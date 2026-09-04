# @sigitex/hop

Tiny typed operations over HTTP, using `@sigitex/route` and Arktype. Stop-gap until more impressive library is finished.

## API

```ts
import { api, HopError, operation } from "@sigitex/hop/api"
import { prefix } from "@sigitex/route"
import { type } from "arktype"

export const operations = {
  greeting: operation(
    { input: type({ name: "string" }), output: type.string },
    async ({ name }) => `Hello, ${name}.`,
  ),
}

const handler = prefix("/api", api(operations))
```

Operations without an input accept JSON `null` on the wire and receive
`undefined`. Operations returning `undefined` fall through to the next route
handler.

## Proxy

```ts
import { proxy } from "@sigitex/hop/proxy"
import type { operations } from "./operations"

export const api = proxy<typeof operations>("/api")

await api.greeting({ name: "Toad" })
```

Failed responses throw `HopError` with the response status and message.
