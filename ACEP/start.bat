@echo off
REM ACEP Server Startup
REM Set your API keys in .env or as environment variables before running
if not defined HF_TOKEN (
  if exist .env (
    for /f "tokens=*" %%a in (.env) do set %%a
  )
)
set PORT=3000
node server.js