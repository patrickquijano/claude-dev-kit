# Draft

Step 4 detail.

Build the `Dockerfile` from practices.md: syntax line, image `ARG`s with tag and digest (resolve each tag, then look up its digest, per practices.md; never guess; a failed lookup is asked once under the step 3 cap (devcontainer target: stop, never ask; review mode: only report)), build stages, runtime stage, cache mounts for the detected package manager, unversioned package installs plus system and package-manager upgrades and same-layer cleanup, trusted-tool stages with `COPY --link --from`, explicit `COPY` of needed paths only (when chosen), user and group from `ARG`s (when chosen), heredoc multi-line `RUN`s, merged `RUN`s, `.dockerignore` entries for the stack. Update mode → keep its intent (stages, args, labels, entrypoint), fix only what breaks a practice; list each change with its reason.
