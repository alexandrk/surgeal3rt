'use strict';
//var app = function() {

  var DATA = [],
      ANCHOR_MAP = $.uriAnchor.makeAnchorMap(),
      TEST_DATA = false;

  /**
   * Name:        loadData
   * Description: loads data from the firebase database, triggering
   *              dataloaded event on each new set of data
   */
  function loadData() {

    if ( TEST_DATA === true ){
      DATA = JSON.parse(localStorage.surgeData);
      console.log(DATA.length + ' records loaded');
      $('body').trigger('dataLoaded');
    }
    else {
      var ref = new Firebase("https://surgeal3rt.firebaseio.com/uber_surge_data");

      // NOTE: timestamp saved in the firebase db is in seconds, so we need to divide ours by 1000
      // day    - 86400000    -
      // week   - 604800000   - 13192
      // month  - 18144000000 - 19557

      var fromTime = new Date().setHours(0,0,0,0) / 1000, //(new Date((new Date).setHours(0,0,0,0) - 86400000)).getTime() / 1000,
          toTime = fromTime + 86400;

      ref
        .orderByChild('time')
        .startAt(fromTime)
        .endAt(toTime)
        .once("value", function (snapshot) {
          var records = snapshot.val(),
              record;
          for (record in records) {
            if (records.hasOwnProperty(record)) {
              DATA.push(records[record]);
            }
          }
          console.log(DATA.length + ' records loaded');
          $('body').trigger('dataLoaded');
        })
      ;
    }
  }

loadData();

function getServiceTypeSurge( surgeData, serviceType ) {
  var results = {},
      loc;

  for ( loc in surgeData ) {
    if (surgeData.hasOwnProperty(loc)) {
      results[loc] = surgeData[loc][serviceType];
    }
  }

  return results;
}

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

function createServiceCollection( surgeData, serviceType ) {
  var arr = [];

  serviceType = validateServiceType(serviceType);
  surgeData.forEach(function(el) {
    var obj = getServiceTypeSurge( el.data, serviceType );
    obj.time = el.time;
    arr.push(obj);
  });
  return arr;
}

//  return {
//    init: loadData,
//    constructSVG: constructSVG
//  }
//}();

function GraphData() {

  /******************************************************************************************
   * Function: setupGraph
   * Desc: initializes an object that keeps references to a graph and all the graph related variables
   * @returns {{graphSVG: *, xAxisG: *, yAxisG: *, xScale: *, yScale: *, xAxis: *, yAxis: *}}
   *******************************************************************************************/
  function setupGraph(targetArea) {
    //min width / height: 635 / 380
    var outerWidth  = Math.max(620, Number.parseInt(window.innerWidth / 2 * .8)),
        outerHeight = Math.max(330, Number.parseInt(window.innerHeight / 2 * .8)),
        margin      = {left: 50, top: 35, right: 30, bottom: 70},
        innerWidth  = outerWidth - margin.left - margin.right,
        innerHeight = outerHeight - margin.top - margin.bottom,
        xColumn     = 'time',
        color = d3.scale.ordinal().range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);


    var svg = d3
      .select('body')
      .append('svg')
      .attr('width',  outerWidth)
      .attr('height', outerHeight)
      .attr('label',  targetArea)
      .attr('class',  'areaGraph');

    // group element that allows us to add margin and axises to the chart
    var g = svg.append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')'),
        xAxisG = g.append('g')
          .attr('transform', 'translate(0, ' + innerHeight + ')')
          .attr('class', 'x axis'),
        yAxisG = g.append('g')
          .attr('class', 'y axis');


    var xScale = d3.time.scale().range([0, innerWidth]),
        yScale = d3.scale.linear().range([innerHeight, 0]);

    var xAxis = d3.svg.axis()
          .scale(xScale)              // xScale is d3.time.scale()
          .orient('bottom')           // draw ticks below the axis
          .ticks(24),                 // number of ticks

        yAxis = d3.svg.axis()
          .scale(yScale)              // yScale is d3.scale.linear()
          .orient('left');

    return {
      graphSVG: svg,
        graphG: g,
    graphWidth: outerWidth,
   graphHeight: outerHeight,
        xAxisG: xAxisG,
        yAxisG: yAxisG,
        xScale: xScale,
        yScale: yScale,
         xAxis: xAxis,
         yAxis: yAxis,
       xColumn: xColumn,
         color: color
    }
  }

  function render(inputData) {

    // Gets all area names from DATA collection
    var targetAreas = Object.keys(inputData[0].data);

    // NOTE:
    // The domain is in the data space, so its units are your source units.
    // The range is in screen space (pixels).

    /**
    // Loop through 'target areas' to generate a graph for each
    */
    targetAreas.forEach(function(targetArea)
    {
      // Create new Graph for each 'target area'
      var graph = setupGraph(targetArea);
      /**
      // Loop through all the 'service types' to create a line per type
      */
      // NOTE: opted for fixed serviceTypes instead of all (automated)
      var serviceTypes = ['uberX', 'uberXL', 'uberSELECT', 'UberBLACK', 'UberSUV'],   //Object.keys(inputData[0].data[targetArea]),
          lSpace = graph.graphWidth / serviceTypes.length,  // define the length of legend section
          colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'];

      serviceTypes.forEach(function(serviceType, index)
      {
        var path = graph.graphG.append('path').attr('label', serviceType),
            line = d3.svg.line()
              .x(function (d) {
                return graph.xScale(d[graph.xColumn] * 1000);
              })
              .y(function (d) {
                return graph.yScale( (d.data[targetArea][serviceType]) ? d.data[targetArea][serviceType] : 1 );
              });

        // Figuring out max / min values on both Axis
        graph.xScale.domain( d3.extent(inputData, function (d){ return d[graph.xColumn] * 1000; }));
        graph.yScale.domain( d3.extent(inputData, function (d){
          var serviceSurge = [];

          for (var prop in d.data[targetArea]){
            if (d.data[targetArea].hasOwnProperty(prop)){
              serviceSurge.push(d.data[targetArea][prop]);
            }
          }
          return Math.max.apply(null, serviceSurge);
        }) );

        var id = (serviceType).replace(/\s+/g, '');
        path.attr('d', line(inputData))
          .attr('stroke', colors.shift())
          .attr('stroke-width', 3)
          .attr('fill', 'none')
          .attr('class', 'dataLine')
          .attr('class', 'line-'+ id);

        // Append history name and data to Graph
        graph.graphSVG.append('text')
          .attr('x', (lSpace / 3) + index * lSpace)
          .attr('y', 20)
          .attr('fill', path.attr('stroke'))
          .attr('class', 'legend')
          .on("click", function(){
            // Determine if current line is visible
            var active = path.active ? false : true,
                newOpacity = active ? 0 : 1;
            // Hide or show the elements based on the ID
            d3.selectAll('.' + path.attr('class'))
              .transition().duration(100)
              .style("opacity", newOpacity);
            // Update whether or not the elements are active
            path.active = active;
          })
          .text(serviceType);

      });

      // Append Graph label (target area)
      graph.graphSVG.append('text')
        .attr('x', graph.graphWidth / 2)
        .attr('y', graph.graphHeight - 10)
        .style("text-anchor", "middle")
        .attr('class', 'targetArea')
        .text(targetArea);

      // Draw Axis
      graph.xAxisG.call(graph.xAxis);
      graph.yAxisG.call(graph.yAxis);



    });

    d3.selectAll('.x.axis').selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-65)');

  }

  function clearAll(){
    var dataLines = d3.select('body').selectAll('path.dataLine');
    dataLines.remove();
  }

  return {
    graphRender : render,
    clear       : clearAll
  }
}


function generateGraphs(){
  // Initialize graphing module
  var a = SetupGraph();
  //var serviceCollection = createServiceCollection(, 'uberX');
  a.graphRender(denseArray(), 'Downtown');
}

function denseArray() {
  var groupTime,
      prevElementData,
      dense = [];

  DATA.forEach(function (el) {
    var lastElementOfArray = {},
      elementStringified = JSON.stringify(el.data);

    // if current element being processed is different from previous element or a set time interval had passed
    // add it to the filtered collection
    if ((el.time - groupTime > 180) || elementStringified !== prevElementData) {

      // Seconds in time of an 'el' are zeroed out for better graphing
      el.time = new Date(el.time * 1000).setSeconds(0) / 1000;

      // Add the previous element with the timestamp of the current one to a filtered list
      // in order to have a broken line chart instead of a path chart
      if (typeof prevElementData !== 'undefined'){
        lastElementOfArray.data = JSON.parse(prevElementData);
        lastElementOfArray.time = el.time;
        dense.push(lastElementOfArray);
      }

      // Update previous element and group time with data from the current element
      prevElementData = elementStringified;
      groupTime = el.time;

      // Save current element to a filtered collection
      dense.push(el);
    }
  });

  return dense;
}

$('body').on('dataLoaded', function(){
  var a = GraphData();
  a.graphRender(denseArray());
});

//render( createServiceCollection(DATA, 'uberX') );