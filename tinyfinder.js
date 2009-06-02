/*
	@author: Scott Robbin
	@url: http://srobbin.com
	@title: TinyFinder
	@description: Locate rev=canonical links within a page, so that people can use the preferred tiny url. If it doesn't exists, uses tr.im to create one.
	@license: MPL
*/

var _domLink = null; // Global access to the DOM element where the link is displayed
var _domProgress = null; // Global access to the DOM element for the progress bar
var _defaultMessage = "Click to make a tiny link"; // Default message shown in statusbar
var _width = 175; // Width of widget
var _interval = null; // Used in setTimeout for the progress bar
var _links = []; // A temporary array for the links we've already fetched from tr.im

// Jetpack Statusbar Code
jetpack.statusBar.append({
  url: "statusbar.html",
  width: _width,
  onReady: function(widget){
    // Set the global variable
    _domLink = $("#tiny", widget);
    _domProgress = $("#progress", widget);

    // We should call the _findCanonical function on ready and focus
    jetpack.tabs.onReady( _findCanonical );
    jetpack.tabs.onFocus( _findCanonical );

    // Action to perform when user clicks the statusbar element
    $(widget).click(function(message){
        // Get the tiny url, copy to clipboard, then notify
        _getTinyLink(function(message) {
          if(_copyToClipboard(message))
            jetpack.notifications.show({title: "Copied link to clipboard:", body: message});
          else
            jetpack.notifications.show("Failed to create or copy tiny link.");
        });
    });
  }
});

/*******************************
  PRIVATE, HELPER FUNCTIONS
*******************************/

/* Try to find the rev=canonical or rel=shorturl link in the page content */
function _findCanonical() {
  var tiny, link, doc;
  doc = jetpack.tabs.focused.contentDocument;
  if(tiny = $("link[rev='canonical']", doc).attr("href"))
    link = tiny;
  else if(tiny = $("link[rel='shorturl']", doc).attr("href"))
    link = tiny;
  else if(_links[jetpack.tabs.focused.url])
    link = _links[jetpack.tabs.focused.url]; // We've already fetched this url once
  else
    link = _defaultMessage;

  $(_domLink).text(link);
}

/* Fetch the tr.im URL, if necessary, then execute the callback */
function _getTinyLink(callback) {
  var message = $(_domLink).text();
  
  // We may already know the tiny url from the canonical link.
  // If not, then we need to get a tiny url from tr.im  
  if(message == _defaultMessage) {
    $(_domLink).text("Making tiny link...");
    _startProgressBar();
    $.getJSON("http://tr.im/api/trim_url.json", {url: jetpack.tabs.focused.url}, function(result) {
      // If the result is good, then update the dom
      if(result.status.code == "200") {
        $(_domLink).text(result.url);
        // Add this link to the temporary array of ones that we've retrieved
        _links[jetpack.tabs.focused.url] = result.url;
      } else {
        $(_domLink).text(_defaultMessage);
      }
      callback(result.url);
      _stopProgressBar();
    });
  } else {
    callback(message);
  } 
}

/* Copy text to the user's clipboard */
function _copyToClipboard(copytext) {
  var str = Components.classes["@mozilla.org/supports-string;1"].
                      createInstance(Components.interfaces.nsISupportsString);
  if (!str || !copytext) return false;

  str.data = copytext;

  var trans = Components.classes["@mozilla.org/widget/transferable;1"].
  createInstance(Components.interfaces.nsITransferable);
  if (!trans) return false;

  trans.addDataFlavor("text/unicode");
  trans.setTransferData("text/unicode", str, copytext.length * 2);

  var clipid = Components.interfaces.nsIClipboard;
  var clip = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
  if (!clip) return false;

  clip.setData(trans, null, clipid.kGlobalClipboard);
  return true;
}

/* Progress bar when fetching tr.im url */
function _startProgressBar() {
  _interval = setInterval(function() {
    var pWidth = $(_domProgress).width() + 10;
    if(pWidth >= _width) pWidth = 0;
    $(_domProgress).width(pWidth);
  }, 50);
}

function _stopProgressBar() {
  clearInterval(_interval);
  $(_domProgress).width(0);
}