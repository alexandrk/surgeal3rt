var
  data = [],
  lastElement,
  queryDict = {},
  validTypes = ['uberX', 'uberXL', 'uberWAV', 'uberSELECT', 'UberSUV', 'UberBLACK', 'ASSIST'];

// Helper, populates queryDict with key-value pairs
location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});

function loadData() {
  var
    ref = new Firebase("https://surgeal3rt.firebaseio.com/uber_surge_data"),
    limit = ( queryDict['limit'] && parseInt(queryDict['limit']) > 0 ) ? parseInt(queryDict['limit']) : 25;

  ref.orderByChild('time').limitToLast(limit).on("child_added", function(snapshot) {
    lastElement = snapshot.val();
    data.push(lastElement);
    $(document).trigger('dataLoaded');
  });
}

function getServiceTypeSurge(surgeData, serviceType) {
  var results = [];

  for ( loc in surgeData ) {
    results[loc] = surgeData[loc][serviceType];
  }

  return results;
}

function formatAndOutput( time, values, serviceType ) {
  var
    newSet = $('<div class="aSet">'),
    timeObj = ( new Date(parseInt( time ) * 1000) ),
    time = timeObj.toLocaleTimeString() +' '+ timeObj.toLocaleDateString();

  newSet.hide();

  // iterate over neighbourhood in a set to display the surge
  for (val in values) {
    newSet.append(
      "<div class='row'>" +
        "<div class='neighbourhood'>" + val + "</div>" +
        "<div class='surge'>" + values[val] + "</div>" +
      "</div>"
    );
  }

  newSet.prepend(
    "<div class='row header'>" +
    "<div class='serviceType'>" + serviceType + "</div>" +
    "<div class='time'>" + time + "</div>" +
    "</div>"
  );

  //$('.data').prepend(newSet);
  newSet.prependTo('.data').show('slow');
}

$(document).on('dataLoaded', function(){
  var
    serviceType = ( (validTypes.indexOf(queryDict['type']) > 0) ? queryDict['type'] : 'uberX' ),
    surgeData;

  surgeData = getServiceTypeSurge(lastElement.data, serviceType);

  formatAndOutput(lastElement.time, surgeData, serviceType);
});

loadData();

//K5h7xwrgQgoq-Kk54l5 firebase key where new data formatting starts