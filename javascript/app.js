var endpointURL,
    resultsList,
    coordsList,
    server_token;

endpointURL = 'https://api.uber.com/v1/estimates/price';
resultsList = [];
server_token = 'R6L9oIpQhY7nCvyQkuDGFMw4yZDDiyVn-pjsjx33';

coordsList = [
  {
    name: "Downtown",
    coords: {
      lat: 37.79323632,
      lon: -122.39782333
    }
  },
  {
    name: "North Beach",
    coords: {
      lat: 37.80015423,
      lon: -122.41567612
    }
  },
  {
    name: "Penhandle",
    coords: {
      lat: 37.77519247,
      lon: -122.44829178
    }
  },
  {
    name: "Marina",
    coords: {
      lat: 37.79703447,
      lon: -122.43473053
    }
  },
  {
    name: "Mission",
    coords: {
      lat: 37.75958709,
      lon: -122.42443085
    }
  },
  {
    name: "Richmond",
    coords: {
      lat: 37.77831315,
      lon: -122.4659729
    }
  },
  {
    name: "Sunset",
    coords: {
      lat: 37.76257272,
      lon: -122.46734619
    }
  },
  {
    name: "Potrero",
    coords: {
      lat: 37.76148705,
      lon: -122.40022659
    }
  }
];

function callUberAPI(){
  var timeOfRequest = Date.now();
  coordsList.forEach(function(item, index){
    $.ajax({
      url: endpointURL,
      headers: {
        Authorization: "Token " + server_token
      },
      locName: item.name,
      locNumber: index + 1,
      timeOfRequest: timeOfRequest,
      data: {
        'start_latitude': item.coords.lat,
        'start_longitude': item.coords.lon,
        'end_latitude': 37.7160869,
        'end_longitude': -122.4975191
      }
    }).done(processSurgeData);
  })
}

callUberAPI();
setInterval(callUberAPI, 30000);

var requestsNumbers = [];
function processSurgeData(data){
  var that = this;

  /* - Saves request number (used to determine if all the calls cameback) */
  requestsNumbers.push(that.locNumber);

  /* - Save data for all service types in the resultsList */
  data['prices'].forEach(function(item)
  {
    resultsList.push(that.locName +', '+ item.display_name +', '+ item.surge_multiplier +', '+ that.timeOfRequest);

    /* - if service type is 'uberx' append to unprepedData */
    if (item.display_name.toLowerCase() === 'uberx')
    {
      $('.unprepedData').append(
        '<div class="item">'+
          that.locNumber +','+
          that.locName +','+
          item.display_name +','+
          item.surge_multiplier +','+
          that.timeOfRequest +
        '</div>'
      );
    }
  });

  /* - If all request came back, continue processing */
  if (requestsNumbers.length === coordsList.length)
  {
    // Clear requestNumbers array (to be used by the next consequtive call)
    requestsNumbers = [];

    /**
     * 1. Split on comma
     * 2. Align
     * 3. Convert timestamp to date
     */
    var unprepedData = $('.unprepedData').find('.item');

    unprepedData.sort(function(a, b){
      a = a.innerHTML.split(',')[0];
      b = b.innerHTML.split(',')[0];
      return ((a > b) ? -1 : ((a < b) ? 1 : 0));
    });

    unprepedData.each(function(index, item)
    {
      var splitItem, locNumber, neigbourhood, surge, time;

      splitItem = item.innerHTML.replace(/\s/g, '').split(',');
         locNumber = splitItem[0];
      neigbourhood = splitItem[1];
             surge = splitItem[3];
              time = (new Date(parseInt(splitItem[4]))).toTimeString();

      $('.data').prepend(
        "<div class='neigbourhood'>"+ neigbourhood +"</div>" +
        "<div class='surge'>"+ surge +"</div>" +
        "<div calss='time'>"+ time +"</div>"
      );
    });
    $('.data').prepend('<hr />');
    $('.unprepedData').empty();

    localStorage['uber_surge_data'] = JSON.stringify(resultsList);
  }
}