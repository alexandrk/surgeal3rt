'use strict';


/****************************************************************************
 * Function:    loadData
 * Description: loads data from external source or localStorage
 * @param liveData {boolean} - if true, data will be loaded from the server every 5 minutes
 ****************************************************************************/
function loadData(liveData){

  var data,
      dateDifference,
      loadDataConfigObj = {
        spinnerDivID: 'loading-data'
      };

  // If liveData is set to false OR undefined OR last LIVE graph was generated
  // less than five minutes ago, use data from localStorage
  if ( liveData ){

    try {
      data = JSON.parse(localStorage.surgeData);
      dateDifference = new Date().getTime() - Number.parseInt(data[data.length - 1].time) * 1000;

      // verify if 5 minutes passed since the last request
      if (dateDifference > 600000){
        FI.loadData(loadDataConfigObj, onDataLoaded);

        // Used to track, if we need to serialize and save the data back to the localStorage
        localStorage.newSurgeData = true;
      }
      else {
        console.log('YOU CAN UPDATE TO NEW DATA IN: ' + dateDifference / 1000 + ' seconds');
        localStorage.newSurgeData = false;
        onDataLoaded(data);
      }
    }
    catch (e){
      console.log('LOCAL STORAGE DATA IS CORRUPT, UPDATING DATA FROM LIVE');
      FI.loadData(loadDataConfigObj, onDataLoaded);
      localStorage.newSurgeData = true;
    }
  }
  else {
    data = JSON.parse(localStorage.surgeData);
    localStorage.newSurgeData = false;
    onDataLoaded(data);
  }

}

/****************************************************************************
 * Function:    onDataLoaded
 * Description: Callback for processing the data, after it is loaded on page
 * @param loadedData {object} - data to be processed
 ****************************************************************************/
function onDataLoaded(loadedData){

  // Save a copy of the data to localStorage
  if (localStorage.newSurgeData || localStorage.surgeData === undefined) {
    localStorage.surgeData = JSON.stringify(loadedData);
  }
  console.log(loadedData.length + ' records loaded. New data loaded: '+ localStorage.newSurgeData);

  // Check URL for valid parameters: [serviceArea, serviceType]
  var anchorMap = $.uriAnchor.makeAnchorMap(),
      settingsObj = {
        dataLength  : loadedData.length,
        serviceArea : 'Downtown'
      };


  if (Object.keys(loadedData[0].data).indexOf(anchorMap.serviceArea) > -1){
    settingsObj.serviceArea = anchorMap.serviceArea;
  }

  /************************
   * Start of SVG section
   ************************/
  var settings = InitializeGraph(settingsObj);

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
    //.scaleExtent([1, 10])
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
            //x     : settings.margin.left,
            //y     : settings.margin.top
          });

  // Creating bars for the chart based on data
  var rects = g.selectAll('rect')
               .append('rect')
               .data(loadedData);

  // Setting up bars properties
  rects.enter().append('rect')
    //.attr("clip-path", )
    .attr({
     "clip-path": "url(#"+ clipPathID +")",
      x         : function(d, i){ return xScale(d.time * 1000); },
      y         : function(d, i){ return yScale(d.data[settings.serviceArea][settings.serviceType]) },
      width     : settings.gBarWidth,
      height    : function(d, i){
        return settings.innerHeight - yScale(d.data[settings.serviceArea][settings.serviceType]);
      }
    });

  // Append Graph label (target area)
  svg.append('text')
    .attr('transform', 'translate('+
      (settings.outerWidth / 2)
      +','+
      (settings.outerHeight - 5) + ')')
    .style("text-anchor", "middle")
    .attr('class', 'targetArea')
    .text(settings.serviceArea);

  function doTickTransformation(){
    // Ticks transformation
    d3.selectAll('.x.axis').selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-65)');
  }

  //************************************************************
  // Zoom specific updates
  //************************************************************
  function zoomed() {
    svg.select(".x.axis").call(xAxis);
    svg.select(".y.axis").call(yAxis);
    console.log('here');

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

loadData(true);