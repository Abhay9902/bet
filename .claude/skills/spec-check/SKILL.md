---
name: spec-check
description: Flag differences between the product spec/requirements and the current code, without modifying the spec.
disable-model-invocation: true
---

1. Read `PRODUCT_SPEC.md` and `REQUIREMENTS.md`.
2. Survey the code that exists (modules under `backend/src/`, routes under `frontend/src/app/`,
   Prisma schema). Use an Explore subagent if it's large.
3. Output three lists:
   - Built but not in the spec or requirements (possible scope creep or undocumented decisions).
   - In the spec/requirements but not built yet.
   - Built differently from what the spec says.
4. Suggest which `REQUIREMENTS.md` checkboxes could be ticked; ask before editing it.
5. DO NOT modify `PRODUCT_SPEC.md`.
