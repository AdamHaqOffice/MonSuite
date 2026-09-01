# AbateBot brain update note

The live AbateBot UI imports and uses:

- `src/data/chatbotBrain.json`

When updating AbateBot, overwrite that same file in the same location so the app uses the new brain automatically.

The plain text mirror is optional/reference-only and should also be overwritten in place if maintained:

- `public/knowledge/monsuite-chatbot-brain-v1.txt`

Do not create versioned source brain text files unless they are intentionally needed for an archive.
