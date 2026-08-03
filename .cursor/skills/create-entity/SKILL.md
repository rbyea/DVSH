---
name: create-entity
description:
  Scaffold a Feature-Sliced Design entity slice with model types, API (mock or RTK Query), and
  public index exports. Use when creating a new entity, domain model, or entity API for vehicles,
  repair orders, clients, or similar domain objects.
---

# Create Entity

## When to use

User asks to add a new domain entity, entity types, or entity API in `src/entities`.

## Workflow

Copy and track:

```
Entity Progress:
- [ ] 1. Name + fields confirmed
- [ ] 2. Folder + model types
- [ ] 3. API (mock and/or RTK Query)
- [ ] 4. Public index exports
- [ ] 5. Wire consumers if requested
```

### 1. Confirm shape

Need: entity name (kebab-case), main type fields, and whether API is mock-only or RTK Query on
`baseApi`.

### 2. Create slice

```
src/entities/<entity-name>/
  model/types.ts
  api/<entityName>Api.ts   # or mock<Entity>.ts
  index.ts
```

Optional `ui/` only if there is reusable entity-presentational UI with no feature logic.

### 3. Model

- Put domain types in `model/types.ts`.
- No `any`. Prefer string unions for statuses.
- Keep form-only fields out of the entity (those belong in feature/page).

### 4. API

**Mock (current pattern):** functions in `api/mock*.ts`, exported from `index.ts`.  
Reference: `src/entities/repair-order/api/mockRepairOrders.ts`.

**RTK Query (preferred for real backend):**

```ts
import { baseApi } from '@/shared/api';

export const <entity>Api = baseApi.injectEndpoints({
  endpoints: (build) => ({
    get<Entity>: build.query<EntityDto, string>({
      query: (id) => `/<entities>/${id}`,
    }),
  }),
});

export const { useGet<Entity>Query } = <entity>Api;
```

Export hooks/types from `index.ts`. Do not create a second `createApi`.

### 5. Public API

`index.ts` exports only what other layers need:

```ts
export type { EntityName } from './model/types';
export {} from /* api fns or hooks */ './api/...';
```

### 6. Done criteria

- Slice lives under `src/entities/<name>`
- Imports use `@/entities/<name>`
- No upward imports from pages/features/widgets
- Types are explicit; mocks or endpoints are typed

## References

- `src/entities/repair-order`
- `src/entities/vehicle`
- `src/shared/api/rtk/baseApi.ts`
