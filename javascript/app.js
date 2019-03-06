var app = function() {

  var recordCount = 0;
  var anchorMap = $.uriAnchor.makeAnchorMap();

  /**
   * Name:        loadData
   * Description: loads data from the firebase database, triggering
   *              dataloaded event on each new set of data
   */
  function loadData () {
    var limit = ( parseInt(anchorMap['limit']) > 0 ) ? parseInt(anchorMap['limit']) : 25;
        forebaseRef = firebase.database().ref('uber_surge_data');

    // Continuous retrieval of new data
    forebaseRef.limitToLast(limit).on("child_added", function(snapshot) {
      recordCount += 1;
      $('#statusConsole').html("");
      $('#statusConsole').append("<div>Total number of recordsets: "+ recordCount +"</div>");
      processData(snapshot.val());
    });
  }

  /**
   * Name:          processData
   * Description:   Processes a single chunk of data (either from a data array or
   *                as a result of a new set coming from firebase)
   */
  function processData(firebaseData) {

    //$('#statusConsole').append("<div>Processing data.</div>");

    var serviceType = validateServiceType(anchorMap['type']),
        surgeData;

    // Update serviceType to comply with new Uber API specs
    if (firebaseData.time >= 1473292800) {
      if (['uberSELECT', 'UberSUV', 'UberBLACK'].indexOf(serviceType) > -1){
        serviceType = serviceType.replace(/uber/gi, "");
      }
    }

    //for (key in dataset) {
    //surgeData = getServiceTypeSurge(dataset[key].data, serviceType);
    //formatAndOutput(dataset[key].time, surgeData, serviceType);
    //}
    surgeData = getServiceTypeSurge(firebaseData.data, serviceType);
    formatAndOutput(firebaseData.time, surgeData, serviceType);
  }

  /**
   * Name:          validateServiceType
   * Description:   Checks if provided service type matches one of the service types specified by Uber API
   *                Sets Global SERVICE_TYPE variable to the proper case of the matched value
   * @param serviceType   - {string} service type in question
   * @returns {string}    - serviceType from the list of types specified by Uber API
   */
  function validateServiceType( serviceType ) {
    var validTypes = ['UberX', 'UberXL', 'WAV', 'Select', 'Black SUV', 'Black', 'Assist'],
        index = -1,
        matchFound;

    // Lowercase the type in question
    serviceType = ( typeof serviceType === 'string' ) ? serviceType.toLowerCase() : '';

    // Case insensitive match of the provided value vs values approved by Uber API
    matchFound = validTypes.some( function( element, i ) {
      if ( element.toLowerCase() === serviceType ) {
        index = i;
        serviceType = validTypes[index];
        return true;
      }
    });
    return ( matchFound ) ? serviceType : validTypes[0];
  }

  /**
   * Name:              getServiceTypeSurge()
   * Description:       Creates an array of objects, that represent surge in a specific area
   * @param surgeData   {object} - contains surge data for all of the service_types
   * @param serviceType {string} - serviceType to get the data for
   * @returns {object}
   */
  function getServiceTypeSurge( surgeData, serviceType ) {
    var results = {},
        loc;


    for ( loc in surgeData ) {
      results[loc] = surgeData[loc][serviceType];
    }

    return results;
  }

  /**
   * Name:              formatAndOutput
   * Description:       formats the results and appends them to the page
   * @param time        {unixtimestamp} - time, when the set was requested from Uber API
   * @param values      {object} of surgeData
   * @param serviceType {string} - service type of the current set
   */
  function formatAndOutput( time, values, serviceType ) {
    
    //$('#statusConsole').append("<div>Formatting Output.</div>");
    
    var newSet = $('<div class="aSet">'),
        timeObj = ( new Date(parseInt( time ) * 1000) ),
        time = timeObj.toLocaleTimeString() +' '+ timeObj.toLocaleDateString(),
        val;

    newSet.hide();

    // Generating a sorted array of values (based on surge price)
    var arrOfValues = [{location: "----------------------------------------", surge: 1}];
    for (loc in values){
      var surge = parseFloat(values[loc]),
          obj = {location: loc, surge: surge};

      if (surge > 1){
        // insert new value to the front of the array, since
        // it's surge is greater than that of the first element of the array
        if (surge >= arrOfValues[0].surge){
          arrOfValues.unshift(obj);
        }
        else {
          // go from second element to end of array to see where the item with given surge belongs
          for (var i = 1; i < arrOfValues.length; i++) {
            if (surge >= arrOfValues[i].surge) {
              arrOfValues.splice(i, 0, obj);
              break;
            }
          }
        }
      }
      else {
        // if surge is 1 add to the end of array (standard behaviour)
        //arrOfValues.push(obj);
      }
    }

    // iterate over neighbourhood in a set to display the surge
    arrOfValues.forEach(function(el, index){
      newSet.append(
        "<div class='row'>" +
          "<div class='neighbourhood'>" + el.location + "</div>" +
          "<div class='surge'>" + el.surge + "</div>" +
        "</div>"
      );
    });

    newSet.prepend(
      "<div class='row header'>" +
      "<div class='serviceType'>" + serviceType + "</div>" +
      "<div class='time'>" + time + "</div>" +
      "</div>"
    );

    newSet.prependTo('.data').show();
  }

  function onHashchange( event ) {

    var oldAnchorMap = anchorMap;
    anchorMap = $.uriAnchor.makeAnchorMap();

    // Clear the display
    $('.data').empty();

    // Populate the display with the data for a newly selected serviceType
    DATA.forEach(function(el) {
      processData(el);
    });
  }

  function onTypeChange( event ) {
    var newType = event.target.firstChild.data;

    anchorMap = {type: newType};
    $.uriAnchor.setAnchor( anchorMap );

  }

  $(window)
    .bind( 'hashchange', onHashchange );

  $('.controls').find('button').bind( 'click', onTypeChange );

  return {
    run: loadData
  }

}();

app.run();
//K5h7xwrgQgoq-Kk54l5 firebase key where new data formatting starts
