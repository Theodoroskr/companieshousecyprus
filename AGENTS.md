<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Weekly editorial guides are database-backed, public only after explicit admin publication; keep public reads RLS-filtered and drafts admin-only.
- Scheduled AI work acknowledges immediately and registers its promise on the request-scoped Worker execution context; database leases and weekly uniqueness prevent concurrent or repeated generation.
- Formation editorial facts come from the shared formation source so prices and quotation caveats cannot diverge from the formation page.
- Purpose-made social preview images and optional MP4 previews belong on leaf-route metadata only, using absolute HTTPS asset URLs; keep the still image alongside video for non-video clients and never add previews to the root because they would override page-specific previews.
- The Stripe mode (live/test) is chosen only on the server from the request host (`src/lib/stripe-env-policy.ts`), and test-mode payments never mark orders paid — why: a browser-chosen test mode let fake payments complete live orders.
- Placing and paying for orders requires a signed-in account with a confirmed email; orders are always tied to that account's email — why: guest checkout let anyone place orders under other people's addresses.
