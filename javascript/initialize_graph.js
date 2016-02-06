function InitializeGraph(newSettings){

  var prop;

  // INTERNAL SETTINGS OBJECT
  var settings = function(){
    var margin = { left: 50, top: 35, right: 30, bottom: 70},
        outerWidth  = Math.max(550, Number.parseInt(window.innerWidth * .8)),
        outerHeight = Math.max(300, Number.parseInt(window.innerHeight / 2 * .8)),
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
  settings.gBarWidth   = ((settings.innerWidth / settings.dataLength - settings.gBarPadding) <= 0)
                            ? 1
                            : settings.innerWidth / settings.dataLength - settings.gBarPadding;

  return settings;

}