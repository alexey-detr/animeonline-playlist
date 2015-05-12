var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var async = require('async');
var mkdirp = require('mkdirp');
var childProcess = require('child_process');
var util = require('util');
var sha1 = require('sha1');

module.exports = function(animeData, episodesData, opts, callback) {
  async.eachSeries(episodesData, function onEpisode(episode, nextEpisode) {
    var titleForFilename = animeData.anime.title;
    titleForFilename = titleForFilename.split('/').pop();
    titleForFilename = _.trim(titleForFilename);
    titleForFilename = titleForFilename.replace(/[\/\\:\*\?"<>\|]/g, '-');
    var fileName = titleForFilename + ' - ' + _.padLeft(episode.index + 1, 3, '0') + episode.typeDescription + '.mp4';
    var destDir = path.join(__dirname, 'downloads');
    if (opts['downloads-dest']) {
      destDir = opts['downloads-dest'];
    }
    var filePath = path.join(destDir, titleForFilename);
    if (!fs.existsSync(filePath)) {
      mkdirp.sync(filePath);
    }
    if (fs.existsSync(path.join(filePath, fileName))) {
      console.log('Episode %d exists, skipping...', episode.index + 1);
      return nextEpisode();
    }
    console.log('Downloading episode %d...', episode.index + 1);
    var tempFileName = sha1(fileName);
    var axel = childProcess.spawn('axel', ['-a', '-n 8', '-o' + tempFileName, episode.url], {cwd: filePath});
    axel.stdout.on('data', function(data) {
      process.stdout.write(data);
    });
    axel.stderr.on('data', function(data) {
      console.error(data);
    });
    axel.on('error', function(err) {
      console.error('Error while downloading episode %d: %s', episode.index + 1, err.message);
      process.exit(1);
    });
    axel.on('close', function(code) {
      if (code) {
        console.error('Error while downloading episode %d.', episode.index + 1);
        process.exit(1);
      }
      console.log('Episode %d download done.', episode.index + 1);
      fs.rename(path.join(filePath, tempFileName), path.join(filePath, fileName));
      nextEpisode();
    });

    //var len;
    //var cur = 0;
    //var downloadStatus = _.throttle(function() {
    //  process.stdout.write("Downloading episode " + (episode.index + 1).toString() + " - " + (100.0 * cur / len).toFixed(2) + "% - " + filesize(cur).human() + "          \r");
    //}, 300);
    //request(episode.url)
    //  .on('response', function(response) {
    //    len = parseInt(response.headers['content-length'], 10);
    //  })
    //  .on('data', function(chunk) {
    //    cur += chunk.length;
    //    downloadStatus();
    //  })
    //  .on('end', function() {
    //    console.log('\nEpisode %d download done.', episode.index + 1);
    //    nextEpisode();
    //  })
    //  .on('error', function (err) {
    //    console.log('\nError when downloading file %s: %s', episode.url, err.message);
    //    process.exit(1);
    //  })
    //  .pipe(fs.createWriteStream(path.join(filePath, fileName)));

  }, callback);
};