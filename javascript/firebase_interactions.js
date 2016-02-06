var FI = (function firebase_interactions(){

  /**
   * Name:        loadData
   * Description: loads data from the firebase database, triggering
   *              dataloaded event on each new set of data
   * @param configObj - {
   *  spinnerDivID: //id of the element used for the spinner (while data is loading from the server)
   * }
   * @param callback  // function to be executed, when data is finished loading
   */
  function loadData(configObj, callback)
  {
    var allData = [];

    // NOTE: timestamp saved in the firebase db is in seconds, so we need to divide ours by 1000
    // day    - 86400000    - 86400
    // week   - 604800000   - 13192
    // month  - 18144000000 - 19557
    var ref = new Firebase("https://surgeal3rt.firebaseio.com/uber_surge_data"),
        fromTime = new Date().setHours(0,0,0,0) / 1000, //(new Date((new Date).setHours(0,0,0,0) - 86400000)).getTime() / 1000,
        toTime = fromTime + 86400;

    // Add preloader / spinner
    if (configObj.spinnerDivID) {
      $('body').prepend('<div id="'+ configObj.spinnerDivID +'">Loading...</div>');
    }
    ref
      .orderByChild('time')
      .startAt(fromTime)
      .endAt(toTime)
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