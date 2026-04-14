# discordAIchatbot

A simple Discord bot that sends command text to Google Gemini and returns the response into the Discord channel.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

3. Edit `.env` and set your values:

- `DISCORD_TOKEN` — your Discord bot token
- `GEMINI_API_KEY` — your Google Gemini API key
- `GEMINI_MODEL` — optional Gemini model name, e.g. `gemini-1.0`
- `COMMAND_PREFIX` — optional command prefix (default is `!`)

4. Start the bot:

```bash
npm start
```

## Usage

In Discord, use either:

```text
!ask <your question>
```
or
```text
!gemini <your question>
```

The bot will forward your prompt to Google Gemini and reply with the generated answer.

## Notes

- Make sure your bot has the `Message Content Intent` enabled in the Discord developer portal.
- Invite the bot to your server with the correct permissions for reading and sending messages.
- Do not commit `.env` to source control.
