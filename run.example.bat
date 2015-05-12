REM This is an example file, please copy it to run.bat file. Then make changes there.

REM This example shows how to generate the playlist for specified anime by id.
node index.js --id=14373 --type=sub --action=playlist

REM This example shows how to download all episodes for specified anime by id.
REM Existing episodes will be skipped.
REM Interrupted downloads will be resumed.
node index.js --id=14373 --type=sub --downloads-dest=%UserProfile%\Downloads\Anime
