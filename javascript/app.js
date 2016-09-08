var app = function() {

  var
    DATA = [],
    ANCHOR_MAP    = $.uriAnchor.makeAnchorMap();

  /**
   * Name:        loadData
   * Description: loads data from the firebase database, triggering
   *              dataloaded event on each new set of data
   */
  function loadData () {
    var
      ref   = new Firebase("https://surgeal3rt.firebaseio.com/uber_surge_data"),
      limit = ( parseInt(ANCHOR_MAP['limit']) > 0 ) ? parseInt(ANCHOR_MAP['limit']) : 25,
      dataset;

    ref.orderByChild('time').limitToLast(limit).on("child_added", function(snapshot)
    {
      // Save Global lastElement for later use
      dataset = snapshot.val();

      // Push each newly received element into Global data array
      DATA.push(dataset);

      processData(dataset);
    });
  }

  /**
   * Name:          processData
   * Description:   Processes a single chunk of data (either from a data array or
   *                as a result of a new set coming from firebase)
   */
  function processData(dataset) {
    var
      serviceType = validateServiceType(ANCHOR_MAP['type']),
      surgeData;

    // Update serviceType to comply with new Uber API specs
    if (dataset.time >= 1473292800) {
      if (['uberSELECT', 'UberSUV', 'UberBLACK'].indexOf(serviceType) > -1){
        serviceType = serviceType.replace(/uber/gi, "");
      }
    }

    surgeData = getServiceTypeSurge(dataset.data, serviceType);
    formatAndOutput(dataset.time, surgeData, serviceType);
  }

  /**
   * Name:          validateServiceType
   * Description:   Checks if provided service type matches one of the service types specified by Uber API
   *                Sets Global SERVICE_TYPE variable to the proper case of the matched value
   * @param serviceType   - {string} service type in question
   * @returns {string}    - serviceType from the list of types specified by Uber API
   */
  function validateServiceType( serviceType ) {
    var
      validTypes = ['uberX', 'uberXL', 'uberWAV', 'uberSELECT', 'UberSUV', 'UberBLACK', 'ASSIST', 'SELECT', 'SUV', 'BLACK'],
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
    var
      newSet = $('<div class="aSet">'),
      timeObj = ( new Date(parseInt( time ) * 1000) ),
      time = timeObj.toLocaleTimeString() +' '+ timeObj.toLocaleDateString(),
      val;

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

  function onHashchange( event ) {

    var oldAnchorMap = ANCHOR_MAP;
    ANCHOR_MAP = $.uriAnchor.makeAnchorMap();

    // Clear the display
    $('.data').empty();

    // Populate the display with the data for a newly selected serviceType
    DATA.forEach(function(el) {
      processData(el);
    });
  }

  function onTypeChange( event ) {
    var
      newType = event.target.firstChild.data;

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