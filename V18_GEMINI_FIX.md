# V18 Gemini Fix

Render:
1. Open Service → Environment.
2. Keep `GEMINI_API_KEY` secret.
3. Set `GEMINI_MODEL=gemini-2.5-flash` only if that model is available to the API key's Google AI project.
4. Redeploy.
5. Open `/api/health`; confirm `model` is the expected value and `status` is `online`.

If the API still reports that the model cannot be found, the model name must be changed to a model actually returned by the Google AI project's model list. Do not guess a model name.
