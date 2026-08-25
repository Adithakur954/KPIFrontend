# Frontend Structure

```txt
src/
  app/        App shell and provider composition
  pages/      Route-level screens used by the sidebar/router
  routes/     Route declarations and route guards
  shared/     Reusable API, context, layout, and common UI
  features/   Business feature components, services, utils, and workers
  styles/     Global styles and theme setup
  assets/     Static images and SVGs
```

Keep route-level screens in `src/pages/`. Feature folders should keep their own `components/`, `services/`, `utils/`, and `workers/` as needed. Use the `@/` import alias for internal imports.
