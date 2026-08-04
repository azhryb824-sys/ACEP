@echo off
REM ACEP Server Startup (with log files)
REM Set your API keys in .env or as environment variables before running
if not defined HF_TOKEN (
  if exist .env (
    for /f "tokens=*" %%a in (.env) do set %%a
  )
)
set PORT=3000
node server.js > server_out.txt 2> server_err.txt