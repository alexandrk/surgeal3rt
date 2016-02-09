'use strict';

const TIME_TIMESTAMPS = {
  today     : +new Date().setHours(0,0,0,0),
  msInDay   : 86400000,
  updateThreshold: 600000
};

const DATE_FORMAT = d3.time.format('%b %d, %Y');

/********************************************************************************************
 * * Function:    loadData
 * Description: loads data from external source or localStorage
 * @param settings {Hash}:
 *          liveData {boolean} - if true, data will be loaded from the server every set interval
 *          fromTime {Number} - timestamp in ms, to be used to retrieve data
 ********************************************************************************************/
function loadData(settings){

  var data,
      timeOfLastStoredItem,
      dateDifference,
      loadDataConfigObj = {
        spinnerDivID: 'loading-data'
      };

  // Check settings.fromTime for presence and validity (being in range)
  // If settings.fromTime is not specified, set to today's date, 12:00am
  var dateRange     = [+new Date('01/01/1999'), +new Date().setYear(new Date().getFullYear() + 1)];
  settings.fromTime = Number.parseInt(settings.fromTime);
  if (
    (Math.max(dateRange[0], settings.fromTime) === settings.fromTime) &&
    (Math.max(dateRange[1], settings.fromTime) === dateRange[1])
  ){
    loadDataConfigObj.fromTime = settings.fromTime / 1000;
  }
  else {
    loadDataConfigObj.fromTime = TIME_TIMESTAMPS.today / 1000;
  }

  // If settings.liveData is true or localStorage.surgeData is empty or corrupt
  // get new live data from the server. Else get data from localStorage
  if ( settings.liveData || localStorage.surgeData === undefined || localStorage.surgeData.length < 20 ){

    // Used to handle JSON.parse exceptions
    try {
      // if no surgeData in localStorage, generate a request for new data
      if (localStorage.surgeData === undefined || localStorage.surgeData.length < 20)
      {
        localStorage.surgeDataType = 'new';
        setAlert('Getting new data for: '+ DATE_FORMAT(new Date(loadDataConfigObj.fromTime * 1000)));
        FI.loadData(loadDataConfigObj, onDataLoaded);
        return;
      }

      // Get the timestamp of the last record from the localStorage.surgeData
      // and add records that come after it
      data = JSON.parse(localStorage.surgeData);
      timeOfLastStoredItem = Number.parseInt(data[data.length - 1].time) * 1000;


      // If settings.fromTime is with a range of today
      // Or time difference between last item in localStorage and requested date is more than a day
      if ( loadDataConfigObj.fromTime * 1000 < loadDataConfigObj.fromTime * 1000
        || Math.abs(timeOfLastStoredItem - loadDataConfigObj.fromTime * 1000) > TIME_TIMESTAMPS.msInDay ){
        setAlert('Getting new data for: '+ DATE_FORMAT(new Date(loadDataConfigObj.fromTime * 1000)));
        localStorage.surgeDataType = 'new';
        FI.loadData(loadDataConfigObj, onDataLoaded);
      }
      else {

        // Do not refresh data, use cached values, if selected date
        // is same as in the localStorage and is different from today
        if (Math.abs(loadDataConfigObj.fromTime * 1000 - TIME_TIMESTAMPS.today) > TIME_TIMESTAMPS.msInDay){
          setAlert('PICK A DIFFERENT DATE TO SEE NEW DATA');
          localStorage.surgeDataType = 'cached';
          onDataLoaded(data);
          return;
        }

        // If selected date is today's date, calculate time difference between last cached value and time now
        // Query only for new data, if time difference is greater TIME_TIMESTAMPS.updateThreshold
        dateDifference = +new Date() - timeOfLastStoredItem;

        // verify if 10 minutes passed since the last request
        if (dateDifference > TIME_TIMESTAMPS.updateThreshold) {
            loadDataConfigObj.fromTime = Number.parseInt(timeOfLastStoredItem / 1000);
            localStorage.surgeDataType = 'update';
            FI.loadData(loadDataConfigObj, onDataLoaded);
        }
        // If dateDifference is less than 10 minutes, show cached data
        else {
          setAlert('YOU CAN UPDATE TO NEW DATA IN: ' +
            Math.round((TIME_TIMESTAMPS.updateThreshold - dateDifference) / 1000 / 60) + ' minutes.');
          localStorage.surgeDataType = 'cached';
          onDataLoaded(data);
        }
      }
    }
    catch (e){
      console.log('LOCAL STORAGE DATA IS CORRUPT OR EMPTY, UPDATING DATA FROM LIVE');
      localStorage.surgeDataType = 'new';

      // Tested against a week worth of data (~9MB - doesn't fit into localStorage and slow on a mbp-15-retina 2013)
      //var todayTimestamp = (new Date().setHours(0,0,0,0) / 1000);
      //loadDataConfigObj.fromTime = todayTimestamp - 604800;
      //loadDataConfigObj.toTime   = todayTimestamp + 86400;

      FI.loadData(loadDataConfigObj, onDataLoaded);
    }
  }
  else {
    data = JSON.parse(localStorage.surgeData);
    localStorage.surgeDataType = 'cached';
    onDataLoaded(data);
  }

}

/****************************************************************************
 * Function:    onDataLoaded
 * Description: Callback for processing the data, after it is loaded on page
 * @param loadedData {object} - data to be processed
 ****************************************************************************/
function onDataLoaded(loadedData) {

  var currentData = loadedData;

  // Remove old graphs, if any are present
  d3.selectAll('svg').remove();

  // If no data, display a message and exit
  if(loadedData.length === 0){
    setAlert('No data found for the specified date.</br>Please select another one.');
    return;
  }

  // Save a copy of the data to localStorage
  if (localStorage.surgeDataType === 'new') {
    localStorage.surgeData = JSON.stringify(currentData);
  }
  else if (localStorage.surgeDataType === 'update') {
    currentData = JSON.parse(localStorage.surgeData);
    currentData = currentData.concat(loadedData);

    localStorage.surgeData = JSON.stringify(currentData);
  }
  else if (localStorage.surgeDataType === 'cached') {
    loadedData = [];
  }

  setAlert(currentData.length + ' records present. ' +
              'Data Type: ' + localStorage.surgeDataType.toUpperCase() + '. ' +
              'New Records: '+ loadedData.length +'.');

  // Check URL for valid parameters: [serviceArea, serviceType]
  var anchorMap = $.uriAnchor.makeAnchorMap(),
      settingsObj = {
        dataLength: currentData.length,
        serviceArea: 'Downtown'
      };

  // Ability to specify serviceType over the query string parameter
  var qsServiceType = validateServiceType(anchorMap.serviceType);

  if (Object.keys(currentData[0].data[settingsObj.serviceArea]).indexOf(qsServiceType) > -1) {
    settingsObj.serviceType = qsServiceType;
  }

  // Iterate over service areas and generate a graph for each
  Object.keys(currentData[0].data).forEach(function(serviceArea){

    settingsObj.serviceArea = serviceArea;
    var settings = InitializeGraph(settingsObj);

    drawGraph(currentData, settings);
  });
}

function drawGraph(loadedData, settings){

  // Setting a date for the graph (to be display on the graph for readability purposes)
  settings.forDate = DATE_FORMAT(new Date(Number.parseInt(loadedData[0].time) * 1000));

  // Settings up proper scale for x / y axis: {
  //   x - datetime scale (converting timestamp to timestamp in ms)
  //   y - surge multiplier
  // }
  var xScale = d3.time.scale()
        .range([0, settings.innerWidth])
        .domain(d3.extent(loadedData, function(d){ return d.time * 1000 })),
      yScale = d3.scale.linear()
        .range([settings.innerHeight, 0])
        .domain(d3.extent(loadedData, function(d){ return d.data[settings.serviceArea][settings.serviceType] }));

  // Setting up zoom behavior
  var zoom = d3.behavior.zoom()
    .x(xScale)
    //.y(yScale)
    .scaleExtent([1, 15])
    .on("zoom", zoomed);

  // Adding svg element to the page
  var svg = d3.select('body').append('svg')
    .call(zoom)
    .style({
      width: settings.outerWidth,
      height: settings.outerHeight
    });

  // Adding inner frame and axis to the svg
  var g = svg.append('g')
        .attr('transform', 'translate(' + settings.margin.left + ',' + settings.margin.top + ')'),
      xAxisG = g.append('g')
        .attr('transform', 'translate(0, ' + settings.innerHeight + ')')
        .attr('class', 'x axis'),
      yAxisG = g.append('g')
        .attr('class', 'y axis');

  var xAxis = d3.svg.axis()
        .scale(xScale)              // xScale is d3.time.scale()
        .orient('bottom')           // draw ticks below the axis
      //.ticks(24)                 // number of ticks

    ,yAxis = d3.svg.axis()
        .scale(yScale)              // yScale is d3.scale.linear()
        .orient('left');

  // Draw Axis
  xAxisG.call(xAxis);
  yAxisG.call(yAxis);

  doTickTransformation();

  // Required for graph to not go out-of-bound, when zooming
  var clipPathID = "clip"+ settings.serviceType,
      clipPath = svg.append("clipPath")
        .attr("id", clipPathID)
        .append("rect")
        .attr({
          width : settings.innerWidth,
          height: settings.innerHeight
        });

  // Creating bars for the chart based on data
  var rects = g.selectAll('rect')
    .append('rect')
    .data(loadedData);

  // Setting up bars properties
  rects.enter().append('rect')
    .attr({
      "clip-path": "url(#"+ clipPathID +")",
      x         : function(d, i){ return xScale(d.time * 1000); },
      y         : function(d, i){ return yScale(d.data[settings.serviceArea][settings.serviceType]) },
      width     : settings.gBarWidth,
      height    : function(d, i){
        return settings.innerHeight - yScale(d.data[settings.serviceArea][settings.serviceType]);
      }
    });

  // Append Graph label (service area)
  svg.append('text')
    .attr('transform', 'translate('+
    (settings.outerWidth / 2) +','+
    (25) + ')')
    .style("text-anchor", "middle")
    .attr('class', 'targetArea')
    .text(settings.serviceArea +' - '+ settings.serviceType + ' ('+ settings.forDate +')');

  //************************************************************
  // Zoom specific updates
  //************************************************************
    function zoomed() {
      //var svg = $(this);
      svg.select(".x.axis").call(xAxis);
      svg.select(".y.axis").call(yAxis);

      g.selectAll('rect', function(d){return d})
        .attr({
          x: function (d, i) {
            return xScale(d.time * 1000);
          },
          y: function (d, i) {
            return yScale(d.data[settings.serviceArea][settings.serviceType])
          },
          width: settings.gBarWidth,
          height: function (d, i) {
            var result = settings.innerHeight - yScale(d.data[settings.serviceArea][settings.serviceType]);
            return (result <= 0) ? 0 : result;
          }
        });

      doTickTransformation();
    }
}

function doTickTransformation(){
  // Ticks transformation
  d3.selectAll('.x.axis').selectAll('text')
    .style('text-anchor', 'end')
    .attr('dx', '-.8em')
    .attr('dy', '.15em')
    .attr('transform', 'rotate(-65)');
}

/*------------------------------------| Helper Functions |------------------------------------*/

/************************************
 * Function: validateServiceType
 * @param serviceType
 * @returns {string}
 ************************************/
function validateServiceType( serviceType ) {
  var
    validTypes = ['uberX', 'uberXL', 'uberWAV', 'uberSELECT', 'UberSUV', 'UberBLACK', 'ASSIST'],
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

function setAlert(message){
  var alert = $('<div class="message">').html(message);
  alert.appendTo($('body')).slideDown('slow');
}

/*--------------------------| Event Handlers |---------------------------*/
$(function(){
  $( "#DateOfInterest" ).datepicker({
    minDate: new Date(2015,12, 18),
    maxDate: new Date(),
    dateFormat: 'mm/dd/yy'
  });

  var sessionValue = sessionStorage.getItem('DateOfInterest'),
      defaultDate = (sessionValue) ? new Date(sessionValue) : new Date();

  $('#DateOfInterest').datepicker('setDate', defaultDate);

  $('#DateOfInterest').on('change', function(val){
    var startDate = new Date($('#DateOfInterest').val()).setHours(0,0,0,0);
    loadData({fromTime: startDate, liveData: true});
    sessionStorage.setItem('DateOfInterest', $('#DateOfInterest').val());
  });

  $('body').on('click', '.message', function(){
    $(this).slideUp('slow', function(el){
      $(this).remove();
    });
  });

  loadData({liveData: true, fromTime: +defaultDate});
});

