# Fallbacks

Shared by every `cdk:` skill that asks the user or writes files.

- AskUserQuestion or Write unavailable → ask the step's pending question as plain text with its options, end the turn, and take the user's next message as the answer. Never print finished files or a final result in place of a pending question.
