var
  data = [],
  uberX = [],
  lastElement;

function loadData() {
  var
    ref = new Firebase("https://surgeal3rt.firebaseio.com/uber_surge_data");

  ref.orderByChild('time').limitToLast(25).on("child_added", function(snapshot) {
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

function formatAndOutput( time, values ) {
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
  serviceType = "uberX";
  uberX = getServiceTypeSurge(lastElement.data, serviceType);

  formatAndOutput(lastElement.time, uberX);
});

loadData();

//K5h7xwrgQgoq-Kk54l5 firebase key where new data formatting starts