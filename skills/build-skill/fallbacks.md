# Fallbacks

Shared by every `cdk:` skill that asks the user or writes files.

- AskUserQuestion or Write unavailable → still ask: end the turn with the step's question and its options as plain text, and take the user's next message as the answer. Never print finished files or a final result in place of the question, so the user approves before anything is written.
