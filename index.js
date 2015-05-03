var _ = require('lodash');
var argv = require('yargs').argv;
var request = require('request');
var async = require('async');
var fs = require('fs');
var path = require('path');

if (!argv.url) {
  console.log('You must specify --url parameter. For example: --url=http://animeonline.su/anime-sub/tv-sub/12159-volejbol-haikyuu.html#!/episode/10/vk/sub');
  process.exit(1);
}

var opts = {};
opts.type = argv.type || 'rus';
var allowedTypes = ['rus', 'sub'];
if (allowedTypes.indexOf(opts.type) === -1) {
  console.log('Type ' + opts.type + ' is not allowed. Use one of the following type: ', allowedTypes.join(', '));
  process.exit(1);
}
var fallbackMap = {
  rus: 'sub',
  sub: 'rus'
};

var regExp = /animeonline\.su.*?\/(\d+)/;
if (!regExp.test(argv.url)) {
  console.error('Looks like the specified URL is not URL contains anime series on animeonline.su');
  process.exit(1);
}

var matches = regExp.exec(argv.url);
var seriesDataUrl = 'http://animeonline.su/zend/anime/one/data/?anime_id=' + matches[1];
var resultSeriesData = [];
request.get(seriesDataUrl, function(err, response, body) {
  if (err) {
    console.error('Error when trying fetch URL %s', seriesDataUrl);
    process.exit(1);
  }
  var animeData = JSON.parse(body);
  if (!animeData.episodes) {
    console.error('No episodes are found in fetched data.');
    process.exit(1);
  }
  var episodesData = animeData.episodes.map(function onEpisode(episode, index) {
    if (!episode[opts.type]) {
      console.error('Type ' + opts.type + ' is not found in episode. You can try another video type.');
      process.exit(1);
    }
    return {
      index: index,
      url: episode[opts.type].v,
      type: opts.type,
      fallback: false
    };
  });
  async.eachLimit(episodesData, 1, function onEpisode(episode, nextEpisode) {
    request.get(episode.url, function(err, response, body) {
      if (err) {
        console.error('Error when trying fetch URL %s', episode.url);
        process.exit(1);
      }
      matches = /<param name="flashvars" value="([^"]*)"><\/param>/g.exec(body);
      if (!matches) {
        if (!episode.fallback) {
          console.error("Can't find flashvars for %s. Trying fallback to '%s' type.", episode.url, fallbackMap[opts.type]);
          episodesData.push({
            index: episode.index,
            url: animeData.episodes[episode.index][fallbackMap[opts.type]].v,
            type: fallbackMap[opts.type],
            fallback: true
          });
        } else {
          console.error("Can't find flashvars for %s. Episode %d will be skipped.", episode.url, episode.index + 1);
        }
        return nextEpisode();
      }
      var splitParams = matches[1].split(';');
      var params = [];
      splitParams.forEach(function(param) {
        var parts = param.split('=');
        if (/^url\d+$/.test(parts[0])) {
          params.push({
            url: parts[1],
            size: parts[0].replace('url', '')
          });
        }
      });
      var size = _.sortByOrder(params, ['size'], [false])[0];
      if (episode.fallback) {
        console.log('Found fallback URL for episode %d at %dp', episode.index + 1, size['size']);
      } else {
        console.log('Found URL for episode %d at %dp', episode.index + 1, size['size']);
      }
      resultSeriesData[episode.index] = {
        url: size['url'],
        type: episode.type,
        fallback: episode.fallback
      };
      nextEpisode();
    })
  }, function(err) {
    if (err) {
      console.error('Error occurred when fetching videos URLs.');
      process.exit(1);
    }
    var m3uFileData = '';
    m3uFileData += '#EXTM3U\n\n';
    for (var i = 0; i < resultSeriesData.length; i += 1) {
      var typeDescription = '';
      if (resultSeriesData[i].fallback) {
        typeDescription = ' - ' + resultSeriesData[i].type;
      }
      m3uFileData += '#EXTINF:,' + animeData.anime.title + ' - Episode ' + _.padLeft(i + 1, resultSeriesData.length.toString().length, '0') + typeDescription + '\n';
      m3uFileData += resultSeriesData[i].url + '\n\n';
    }
    var titleForFilename = animeData.anime.title.replace(/[\/\\:\*\?"<>\|]/g, '-');
    var filename = titleForFilename + ' - ' + opts.type + '.m3u';
    var filePath = path.join(__dirname, 'playlists', filename);
    fs.writeFile(filePath, m3uFileData, function(err) {
      if (err) {
        console.error("Can't write file %s", filename);
        process.exit(1);
      }
      console.log('Playlist "%s" was generated.', filename);
    });
  });
});
