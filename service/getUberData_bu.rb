require 'uber'
require 'pry'
require 'firebase'

ENDPOINT_URL      = 'https://api.uber.com/v1/estimates/price'
UBER_SERVER_TOKEN = ''
FIREBASE          = 'https://surgeal3rt.firebaseio.com/'
END_LAT           = 37.7160869
END_LON           = -122.4975191

def getUberData

  #binding.pry

  client = Uber::Client.new do |config|
    config.server_token  = UBER_SERVER_TOKEN
  end

  collection = [
    {
      'name'        => 'Downtown',
      'coordinates' => {
        'lat' => 37.79323632,
        'lon' => -122.39782333
      }
    },
    {
      'name' => 'North Beach',
      'coordinates' => {
        'lat' => 37.80015423,
        'lon' => -122.41567612
      }
    },
    {
      'name' => 'Penhandle',
      'coordinates' => {
        'lat' => 37.77519247,
        'lon' => -122.44829178
      }
    },
    {
      'name' => 'Marina',
      'coordinates' => {
        'lat' => 37.79703447,
        'lon' => -122.43473053
      }
    },
    {
      'name' => 'Mission',
      'coordinates' => {
        'lat' => 37.75958709,
        'lon' => -122.42443085
      }
    },
    {
      'name' => 'Richmond',
      'coordinates' => {
        'lat' => 37.77831315,
        'lon' => -122.4659729
      }
    },
    {
      'name' => 'Sunset',
      'coordinates' => {
        'lat' => 37.76257272,
        'lon' => -122.46734619
      }
    }
    #,{
    #  'name' => 'Potrero',
    #  'coordinates' => {
    #    'lat' => 37.76148705,
    #    'lon' => -122.40022659
    #  }
    #}
  ]

  #binding.pry

  # set time of the request outside of location iterator to keep it the same for all requests for different locations
  time      = Time.now.to_i
  formatted_results = {}

  collection.each do |location|
    #puts "#{location['name']} #{location['coordinates']['lat']} #{location['coordinates']['lon']}"

    loc_name  = location['name']
    latitude  = location['coordinates']['lat']
    longitude = location['coordinates']['lon']

    results = client.price_estimations(
          start_latitude: latitude,
         start_longitude: longitude,
            end_latitude: END_LAT,
           end_longitude: END_LON
    )

    # Formatting of the results
    location_results = {}
    results.each do |result|
      location_results[result.display_name] = result.surge_multiplier
    end # END results.each
    formatted_results[loc_name] = location_results

  end # END collection.each

  # Saving data to the firebase database
  firebase = Firebase::Client.new(FIREBASE)

  firebase.push('uber_surge_data', {'time' => time, 'data' => formatted_results})

  # Debug output
  puts JSON.pretty_generate( JSON.parse( {"#{Time.at(time).to_datetime}" => formatted_results}.to_json ) )

end

getUberData