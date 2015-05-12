var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

module.exports = function(animeData, episodesData, opts, callback) {
  var m3uFileData = '';
  m3uFileData += '#EXTM3U\n';
  for (var i = 0; i < episodesData.length; i += 1) {
    m3uFileData += '#EXTINF:-1,' + animeData.anime.title + ' - Episode ' + _.padLeft(i + 1, episodesData.length.toString().length, '0') + episodesData[i].typeDescription + '\n';
    m3uFileData += episodesData[i].url + '\n';
  }
  var titleForFilename = animeData.anime.title.replace(/[\/\\:\*\?"<>\|]/g, '-');
  var filename = titleForFilename + ' - ' + opts.type + '.m3u';
  var filePath = path.join(__dirname, 'playlists');
  if (!fs.existsSync(filePath)) {
    mkdirp.sync(filePath);
  }
  fs.writeFile(path.join(filePath, filename), m3uFileData, function(err) {
    if (err) {
      console.error("Can't write file %s", filename);
      process.exit(1);
    }
    console.log('Playlist "%s" was generated.', filename);
    callback();
  });
};