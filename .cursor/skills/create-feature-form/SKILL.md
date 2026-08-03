---
name: create-feature-form
description:
  Scaffold an FSD feature with React Hook Form, Zod schema, antd UI, and SCSS Modules. Use when
  creating a feature form, login/create/edit flow, or wiring form submit to an entity API/payload.
---

# Create Feature Form

## When to use

User asks for a new feature form, create/edit flow, or RHF + Zod feature under `src/features`.

## Workflow

```
Feature Form Progress:
- [ ] 1. Domain action + fields confirmed
- [ ] 2. Feature slice folders
- [ ] 3. Zod schema + form types
- [ ] 4. model (provider/hook/submit mapper)
- [ ] 5. ui (antd + SCSS Modules) if needed
- [ ] 6. Public index + page/widget wiring
```

### 1. Confirm

Need: domain (`repair-order`, `auth`, …), action (`create`, `login`, …), fields, submit target
(entity API / navigate / toast).

### 2. Slice layout

```
src/features/<domain>/<action>/
  model/
    types.ts
    schema.ts
    use<Feature>.ts          # or <Feature>Provider.tsx + context
  ui/<FeatureForm>.tsx       # optional if page/widget owns markup
  ui/<FeatureForm>.module.scss
  index.ts
```

Prefer `features/<domain>/<action>` like `features/repair-order/create`.

### 3. Schema + types

```ts
// model/schema.ts
import { z } from 'zod';

export const featureFormSchema = z.object({
  // fields
});

export type FeatureFormValues = z.infer<typeof featureFormSchema>;
```

Keep entity payload types in `entities`; map form → payload in the feature.

### 4. Form model (RHF)

- `useForm<FeatureFormValues>({ resolver: zodResolver(featureFormSchema), defaultValues })`.
- Complex multi-step / shared step state → Provider + context (see `RepairCreateProvider`).
- Simple forms → one hook returning
  `{ control, errors, handleSubmit, onSubmit, isSubmitting, setValue, reset }`.
- Do **not** use `register` with antd — always `Controller` + `control` + `name`.
- `onSubmit` maps form values → entity payload, then calls entity API.
- `useWatch({ control, name })` for reactive derived UI; `useFieldArray` for lists.
- No `any`. No inline styles.

### 5. UI (RHF + antd)

```tsx
<Form.Item
  label="..."
  help={errors.fieldName?.message}
  validateStatus={getAntdValidateStatus(Boolean(errors.fieldName))}
>
  <Controller
    control={control}
    name="fieldName"
    render={({ field }) => <Input {...field} size="large" />}
  />
</Form.Item>
```

- Import `getAntdValidateStatus` from `@/shared/lib/antd`.
- SCSS Modules colocated with the component.
- Reuse widgets for composed blocks; keep scenario logic in the feature.

### 6. Public API

```ts
export { FeatureProvider } from './model/FeatureProvider';
export { useFeatureContext } from './model/useFeatureContext';
// or: export { useFeatureForm } from './model/useFeatureForm';
export type { FeatureContextValue } from './model/types';
```

Page owns route composition; feature owns form behavior.

### 7. Done criteria

- Feature does not import other features
- Entity used via `@/entities/...` public API
- Zod validates submit path
- Styles via `.module.scss` only

## References

- `src/features/repair-order/create`
- `src/pages/RepairCreatePage`
- Entity payloads: `src/entities/repair-order/model/types.ts`
