'use strict';

var TIME_TIMESTAMPS = {
  today     : +new Date().setHours(0,0,0,0),
  msInDay   : 86400000,
  updateThreshold: 600000
};

var DATE_FORMAT = d3.time.format('%b %d, %Y');

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
  settings.fromTime = parseInt(settings.fromTime);
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
        setAlert('Getting new data for: '+ DATE_FORMAT(new Date(loadDataConfigObj.fromTime * 1000)), 2000);
        FI.loadData(loadDataConfigObj, onDataLoaded);
        return;
      }

      // Get the timestamp of the last record from the localStorage.surgeData
      // and add records that come after it
      data = JSON.parse(localStorage.surgeData);
      timeOfLastStoredItem = parseInt(data[data.length - 1].time) * 1000;


      // If settings.fromTime is with a range of today
      // Or time difference between last item in localStorage and requested date is more than a day
      if ( loadDataConfigObj.fromTime * 1000 < loadDataConfigObj.fromTime * 1000
        || Math.abs(timeOfLastStoredItem - loadDataConfigObj.fromTime * 1000) > TIME_TIMESTAMPS.msInDay ){
        setAlert('Getting new data for: '+ DATE_FORMAT(new Date(loadDataConfigObj.fromTime * 1000)), 2000);
        localStorage.surgeDataType = 'new';
        FI.loadData(loadDataConfigObj, onDataLoaded);
      }
      else {

        // Do not refresh data, use cached values, if selected date
        // is same as in the localStorage and is different from today
        if (Math.abs(loadDataConfigObj.fromTime * 1000 - TIME_TIMESTAMPS.today) > TIME_TIMESTAMPS.msInDay){
          setAlert('PICK A DIFFERENT DATE TO SEE NEW DATA', 4000);
          localStorage.surgeDataType = 'cached';
          onDataLoaded(data);
          return;
        }

        // If selected date is today's date, calculate time difference between last cached value and time now
        // Query only for new data, if time difference is greater TIME_TIMESTAMPS.updateThreshold
        dateDifference = +new Date() - timeOfLastStoredItem;

        // verify if 10 minutes passed since the last request
        if (dateDifference > TIME_TIMESTAMPS.updateThreshold) {
            loadDataConfigObj.fromTime = parseInt(timeOfLastStoredItem / 1000);
            localStorage.surgeDataType = 'update';
            FI.loadData(loadDataConfigObj, onDataLoaded);
        }
        // If dateDifference is less than 10 minutes, show cached data
        else {
          setAlert('UPDATE TO NEW DATA IN: ' +
            Math.ceil((TIME_TIMESTAMPS.updateThreshold - dateDifference) / 1000 / 60) + ' minutes', 4000);
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

  //// Remove old graphs, if any are present
  d3.selectAll('svg').remove();

  // If no data, display a message and exit
  if(loadedData.length === 0){
    setAlert('NO DATA FOUND FOR THE SPECIFED DATE.<br />PLEASE SELECT ANOTHER DATE');
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

  if (window.innerWidth < 400){
    setAlert(currentData.length + ' RECORDS; ' +
      'TYPE: ' + localStorage.surgeDataType.toUpperCase() + '; ' +
      'NEW: '+ loadedData.length, 2000);
  }
  else{
    setAlert(currentData.length + ' RECORDS PRESENT; ' +
      'DATA TYPE: ' + localStorage.surgeDataType.toUpperCase() + '; ' +
      'NEW RECORDS: '+ loadedData.length, 2000);
  }

  // Check URL for valid parameters: [serviceArea, serviceType]
  var anchorMap = $.uriAnchor.makeAnchorMap(),
      settingsObj = {
        dataLength: currentData.length,
        serviceArea: 'Downtown'
      };

  // Ability to specify serviceType over the query string parameter
  var qsServiceType = validateServiceType(anchorMap.serviceType);

  // Update the default service type to match the new return value from Uber API (since June 6th, 2018)
  if (currentData && currentData[0].time > 1528311600) {
   settingsObj.serviceType = "UberX" 
  }
  
  if (
    currentData[0].data[settingsObj.serviceArea] &&
    Object.keys(currentData[0].data[settingsObj.serviceArea]).indexOf(qsServiceType) > -1
  ) {
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

  //loadedData = loadedData.slice(loadedData.length * 0.6);

  // Setting a date for the graph (to be display on the graph for readability purposes)
  settings.forDate = DATE_FORMAT(new Date(parseInt(loadedData[0].time) * 1000));

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
    .style({
      width: settings.outerWidth,
      height: settings.outerHeight
    });

  var g = svg.append('g')
        .attr('transform', 'translate(' + settings.margin.left + ',' + settings.margin.top + ')');

  // Required for graph to not go out-of-bound, when zooming
  var clipPathID = "clip"+ settings.serviceType,
      plotArea = g.append("g").attr({
        'clip-path': 'url(#'+ clipPathID +')'
      });

  plotArea
    .append('clipPath')
      .attr("id", clipPathID)
      .append("rect")
        .attr({
          width : settings.innerWidth,
          height: settings.innerHeight
        });

  plotArea.append('rect')
    .attr({
      class: 'zoom-pane',
      width : settings.innerWidth,
      height: settings.innerHeight,
      fill: '#e1ceb1'
    })
    .call(zoom);

  // Adding inner frame and axis to the svg
  var xAxisG = g.append('g')
        .attr('transform', 'translate(0, ' + settings.innerHeight + ')')
        .attr('class', 'x axis'),
      yAxisG = g.append('g')
        .attr('class', 'y axis');

  var xAxis = d3.svg.axis()
        .scale(xScale)              // xScale is d3.time.scale()
        .orient('bottom')           // draw ticks below the axis
      //.ticks(24)                 // number of ticks
        .innerTickSize(-settings.innerHeight)
        .outerTickSize(0)

    ,yAxis = d3.svg.axis()
        .scale(yScale)              // yScale is d3.scale.linear()
        .orient('left')
        .innerTickSize(-settings.innerWidth)
        .outerTickSize(0);

  // Draw Axis
  xAxisG.call(xAxis);
  yAxisG.call(yAxis);

  doTickTransformation();


  // Creating bars for the chart based on data
  var wrapper = plotArea.append('g').attr({
    class: 'barChartWrapper'
  });
  var rects = wrapper.selectAll('rect')
    .append('rect')
    .data(loadedData);

  // Setting up bars properties
  rects.enter().append('rect')
    .attr({
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
      var svg = d3.select(this.closest('svg'));

      var filteredData  = [],
          domain        = xScale.domain();

      for (var i = 0; i < loadedData.length; i += 1) {
        var dataTime = (+loadedData[i].time * 1000);
        if ((+domain[0] <= dataTime) && (dataTime <= +domain[1])) {
          filteredData.push(loadedData[i]);
        }
      }
      console.log('loaded data: '+ loadedData.length +'; filtered data: '+ filteredData.length);

      yScale.domain(d3.extent(filteredData, function(d){ return d.data[settings.serviceArea][settings.serviceType] }));

      //svg.select(".x.axis").call(xAxis);
      ////svg.select(".y.axis").call(yAxis);
      //
      //svg.select('.barChartWrapper').attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ', 1)');

      svg.select('.barChartWrapper').selectAll('rect', function(d){return d})
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

      svg.select(".x.axis").call(xAxis);
      svg.select(".y.axis").call(yAxis);

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

function setAlert(message, delay){
  var alert = $('<div class="message">').html(message);

  if (delay > 0){
    alert.appendTo($('body')).slideDown('slow').delay(delay).slideUp('slow');
  }
  else {
    alert.appendTo($('body')).slideDown('slow');
  }
}

function mobileAndTabletcheck() {
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}

/*--------------------------| Event Handlers |---------------------------*/
$(function(){
  var eventType;

  $( "#DateOfInterest" ).datepicker({
    minDate: new Date(2015,11,18),
    maxDate: new Date(),
    dateFormat: 'mm/dd/yy',
    onSelect: datePickerCallback
  });

  var sessionValue = sessionStorage.getItem('DateOfInterest'),
      defaultDate = (sessionValue) ? new Date(sessionValue) : new Date().setHours(0,0,0,0);
  $('#DateOfInterest').datepicker('setDate', defaultDate);


  // Fallback, if datepicker is not working
  if ($('#ui-datepicker-div').length === 0) {
    eventType = (mobileAndTabletcheck()) ? 'blur' : 'change';
    $('#DateOfInterest').on(eventType, datePickerCallback);
  }

  function datePickerCallback(val){
    var startDate = new Date($('#DateOfInterest').val()).setHours(0,0,0,0);
    if (startDate !== new Date(sessionStorage.getItem('DateOfInterest')).setHours(0,0,0,0)){
      // save new date to the session variable
      sessionStorage.setItem('DateOfInterest', $('#DateOfInterest').val());
      // load data for date selected
      loadData({fromTime: startDate, liveData: true});
    }
  }

  if ( mobileAndTabletcheck() ) {
    $('body').append('<div id="scrollHelper">' +
      '<div class="wrapper">' +
        '<div class="letter">S</div>'+
        '<div class="letter">C</div>'+
        '<div class="letter">R</div>'+
        '<div class="letter">O</div>'+
        '<div class="letter">L</div>'+
        '<div class="letter">L</div>'+
        '<div class="letter">&nbsp;</div>'+
        '<div class="letter">H</div>'+
        '<div class="letter">E</div>'+
        '<div class="letter">R</div>'+
        '<div class="letter">E</div>'+
      '</div>'+
    '</div>')
  }

  $('body').on('click', '.message', function(){
    $(this).slideUp('slow', function(el){
      $(this).remove();
    });
  });

  // Used in onResize handler to prevent data reloading on minor
  // window dimensions changes (e.g. browser navigation bar show/hide)
  var previousWidth   = $(window).width();

  /***************************************************
   * Function: onResize Handler
   * Description: redraws graphs on window resize
   ***************************************************/
  $(window).on('resize', function(){
      var currentWidth  = $(window).width(),
          sessionValue = sessionStorage.getItem('DateOfInterest'),
          defaultDate = (sessionValue) ? new Date(sessionValue) : new Date().setHours(0,0,0,0);

    if ( (Math.max(currentWidth, previousWidth) / Math.min(currentWidth, previousWidth)) > 1.3) {
      loadData({liveData: true, fromTime: +defaultDate});
      previousWidth = currentWidth;
    }

  });

  //var ref = new Firebase("https://surgeal3rt.firebaseio.com");
  //ref.authWithOAuthRedirect("facebook", function(error, authData) {
  //  if (error) {
  //    console.log("Login Failed!", error);
  //  } else {
  //    console.log("Authenticated successfully with payload:", authData);
      loadData({liveData: false, fromTime: +defaultDate});
  //  }
  //});
});

