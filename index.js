var _ = require('lodash');
var argv = require('yargs').argv;
var request = require('request');
var async = require('async');

var opts = {};
opts.type = argv.type || 'rus';
var allowedTypes = ['rus', 'sub'];
if (allowedTypes.indexOf(opts.type) === -1) {
  console.log('Type "%s" is not allowed. Use one of the following types: %s', opts.type, allowedTypes.join(', '));
  process.exit(1);
}
var fallbackMap = {
  rus: 'sub',
  sub: 'rus'
};
var maxTries = 5;

opts['downloads-dest'] = argv['downloads-dest'];

opts.action = argv.action || 'download';
var allowedActions = ['playlist', 'download'];
if (allowedActions.indexOf(opts.action) === -1) {
  console.log('Action "%s" is not allowed. Use one of the following actions: %s', opts.action, allowedActions.join(', '));
  process.exit(1);
}

var seriesId;
if (argv.id) {
  seriesId = argv.id;
} else if (argv.url) {
  var regExp = /animeonline\.su.*?\/(\d+)/;
  if (!regExp.test(argv.url)) {
    console.error('Looks like the specified URL is not URL contains anime series on animeonline.su');
    process.exit(1);
  }
  var matches = regExp.exec(argv.url);
  seriesId = matches[1];
} else {
  console.log('You must specify --id or --url parameter.');
  process.exit(1);
}

var seriesDataUrl = 'http://animeonline.su/zend/anime/one/data/?anime_id=' + seriesId;

console.log('Fetching anime data from %s', seriesDataUrl);
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
  console.log('Anime title: %s', animeData.anime.title);
  var episodesData = animeData.episodes.map(function onEpisode(episode, index) {
    var type = opts.type;
    var fallback = false;
    if (!episode[type]) {
      console.error('Type "%s" is not found in episode index %d. Fallback to another type.', opts.type, index);
      fallback = true;
      type = fallbackMap[type];
    }
    if (!episode[type]) {
      console.error('Type "%s" is not found in episode index %d. No way to workaround this. Exiting.', opts.type, index);
      process.exit(1);
    }
    return {
      index: index,
      url: episode[type].v,
      type: type,
      fallback: fallback,
      tries: 1
    };
  });
  async.eachLimit(episodesData, 1, function onEpisode(episode, nextEpisode) {
    request.get(episode.url, function(err, response, body) {
      if (err) {
        if (episode.tries < maxTries) {
          console.error('Error when trying fetch URL %s Will try again for %d time(s).', episode.url, maxTries - episode.tries);
          episodesData.push({
            index: episode.index,
            url: animeData.episodes[episode.index][episode.type].v,
            type: episode.type,
            fallback: episode.fallback,
            tries: 1 + episode.tries
          });
          return nextEpisode();
        }
        console.error('Error when trying fetch URL %s', episode.url);
        process.exit(1);
      }
      matches = /<param name="flashvars" value="([^"]*)"><\/param>/g.exec(body);
      if (!matches) {
        if (!episode.fallback) {
          console.error("Can't find flashvars for %s. Trying fallback to '%s' type.", episode.url, fallbackMap[opts.type]);
          episodesData.push({
            index: episode.index,
            url: animeData.episodes[episode.index][fallbackMap[episode.type]].v,
            type: fallbackMap[episode.type],
            fallback: true,
            tries: 1
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
        index: episode.index,
        url: size['url'],
        type: episode.type,
        fallback: episode.fallback,
        typeDescription: episode.fallback ? ' - ' + episode.type : ''
      };
      nextEpisode();
    })
  }, function(err) {
    if (err) {
      console.error('Error occurred when fetching videos URLs.');
      process.exit(1);
    }
    require('./action-' + opts.action)(animeData, resultSeriesData, opts, function () {
      console.log('Processing done.');
    });
  });
});
