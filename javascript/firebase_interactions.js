var FI = (function firebase_interactions(){

  /**
   * Name:        loadData
   * Description: loads data from the firebase database, triggering
   *              dataloaded event on each new set of data
   * @param configObj - {
   *  spinnerDivID: //id of the element used for the spinner (while data is loading from the server),
   *  fromTime {Number} - timestamp in ms for the beginning of the dataset,
   *  toTime {Number} - timestamp in ms for the end of the dataset
   * }
   * @param callback  // function to be executed, when data is finished loading
   */
  function loadData(configObj, callback)
  {
    var allData = [];

    // NOTE: timestamp saved in the firebase db is in seconds, so we need to divide ours by 1000
    //var ref = new Firebase("https://surgeal3rt.firebaseio.com/uber_surge_data");
    var ref = new Firebase("https://surgeal3rtp2.firebaseio.com/uber_surge_data");    

    // Setting fromTime to beginning of current day, if undefined
    if (configObj.fromTime === undefined ){
      configObj.fromTime = new Date().setHours(0,0,0,0) / 1000
    }

    // default to a day worth of data
    if (configObj.toTime === undefined ){
      configObj.toTime = configObj.fromTime + 86400;
    }

    // Add preloader / spinner
    if (configObj.spinnerDivID) {
      d3.selectAll('svg').remove();
      $('body').append('<div id="'+ configObj.spinnerDivID +'">Loading...</div>');
    }
    ref
      .orderByChild('time')
      .startAt(configObj.fromTime)
      .endAt(configObj.toTime)
      .once("value", function (snapshot) {
        var records = snapshot.val(),
            record;

        // Remove preloader / spinner
        if (configObj.spinnerDivID) { $('#' + configObj.spinnerDivID).remove(); }

        for (record in records) {
          if (records.hasOwnProperty(record)) {
            allData.push(records[record]);
          }
        }

        // Trigger an event
        $('body').trigger('firebase:data-loaded');


        callback(allData);
      });
  }

  return {
    loadData: loadData
  };

})();

//TODO: Move timestamp conversion from ms to s from all the js files into firebase_interactions.js