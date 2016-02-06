function InitializeGraph(newSettings){

  var prop;

  // INTERNAL SETTINGS OBJECT
  var settings = function(){
    var margin = { left: 30, top: 35, right: 10, bottom: 50},
        outerWidth  = Math.max(250, Number.parseInt(window.innerWidth * .9)),
        outerHeight = (window.outerHeight < window.outerWidth)
                        ? Number.parseInt(window.innerHeight * .9)
                        : Math.max(280, Number.parseInt(window.innerHeight / 2 * .9)),
        innerWidth  = outerWidth - margin.left - margin.right,
        innerHeight = outerHeight - margin.top - margin.bottom,
        dataLength  = 0,
        color       = d3.scale.ordinal().range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]),
        xColumn     = 'time',
        serviceArea = 'Marina',
        serviceType = 'uberX';

    return {
      margin      : margin,
      outerWidth  : outerWidth,
      outerHeight : outerHeight,
      innerWidth  : innerWidth,
      innerHeight : innerHeight,
      dataLength  : dataLength,
      color       : color,
      xColumn     : xColumn,
      serviceType : serviceType,
      serviceArea : serviceArea
    }
  }();

  // ASSIGN NEW VALUES TO THE INTERNAL SETTINGS
  if (typeof newSettings === 'object'){
    for (prop in newSettings){
      if (newSettings.hasOwnProperty(prop)) {
        settings[prop] = newSettings[prop];
      }
    }
  }

  settings.gBarPadding = 0;
  settings.gBarWidth   = 5;

  return settings;

}