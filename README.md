# Anime playlists wizard for animeonline.su

This Node.js script which helps you to generate anime M3U playlist using popular russian anime website [http://animeonline.su/](http://animeonline.su/). You can use M3U playlist in your favorite video player.

**For now the only supported source is [vk.com](https://vk.com/) so processed links have to contain [vk.com](https://vk.com/) sources.**

## Usage

First of all you need to install NPM dependencies:

    npm install

Then generate your first playlist by specifying URL to any episode of anime you want:

    node index.js --url='http://animeonline.su/anime-sub/tv-sub/12159-volejbol-haikyuu.html#!/episode/1/myvi/sub'

Generated playlist will be placed in `playlists` folder.

### Generate playlist with subs

By default all playlists are generated with russian voices.
To generate playlist with subs you need to specify `type` parameter explicitly equals to `sub`. Allowed values for `type` are `sub` and `rus`.

    node index.js --url='http://animeonline.su/anime-sub/tv-sub/12159-volejbol-haikyuu.html#!/episode/1/myvi/sub' --type=sub

### Episodes fallback

If script can't find or parse video for some episode, it will try to fallback to another `type` and only if it fails again with another type, the episode will be skipped.
